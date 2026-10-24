const fs = require('fs');
const path = require('path');
const { randomUUID, createHash } = require('crypto');
const storage = require('./storage');
const mailTransport = require('./mail-transport');
const { createReservationStore } = require('./reservations');
const { deliveryError, isConnectionError, isOwnerNotification } = require('./mail-status');

const MAX_BODY_SIZE = 100_000;
const WINDOW_MS = 15 * 60 * 1000;
const singletonKey = Symbol.for('hotel-ganesh-himal.backend');
const configurationKey = Symbol.for('hotel-ganesh-himal.backend-configuration');

function json(status, payload) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } });
}
function clean(value, maxLength = 250) {
  return String(value || '').trim().slice(0, maxLength);
}
function hasPublicationConsent(record) {
  return record?.publishReview === true && typeof record.publicationConsentedAt === 'string' && Number.isFinite(Date.parse(record.publicationConsentedAt));
}
function reviewStatus(record) {
  if (!hasPublicationConsent(record)) return 'private';
  return ['pending', 'published', 'hidden'].includes(record.reviewStatus) ? record.reviewStatus : 'published';
}
async function receiveJson(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_SIZE) throw new Error('Request is too large.');
  const reader = request.body?.getReader();
  let body = '';
  let size = 0;
  const decoder = new TextDecoder();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_SIZE) { await reader.cancel(); throw new Error('Request is too large.'); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
  }
  try {
    const result = JSON.parse(body || '{}');
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Invalid JSON request.');
    return result;
  } catch { throw new Error('Invalid JSON request.'); }
}

function createBackend({ dataDir = process.env.HOTEL_DATA_DIR || path.join(process.cwd(), 'data'), smtp = process.env, transport } = {}) {
  const attempts = new Map();
  const reservations = createReservationStore({ dataDir, environment: smtp });
  let processing = false;
  let retryTimer;
  const mailer = transport || mailTransport.createMailTransport(smtp);
  const mailReady = Boolean(mailer);

  function readJson(filename) {
    return storage.readJSON(filename, dataDir, []);
  }
  function saveJson(filename, records) {
    storage.writeJSON(filename, dataDir, records);
  }
  async function deliverFeedback({ bookingId } = {}) {
    if (!mailer || processing) return;
    processing = true;
    try {
      const started = Date.now();
      const pending = await storage.read(() => bookingId ? [] : readJson('feedback.json').filter(record => record.delivery !== 'sent'));
      for (const record of pending) {
        if (storage.isCloud() && Date.now()-started>9000) break;
        const lease = await claim('feedback.json', record.id);
        if (!lease) continue;
        try {
          const result = await mailer.sendMail({
            from: smtp.SMTP_FROM, to: smtp.FEEDBACK_TO,
            idempotencyKey: `hotel-feedback-${record.id}`,
            replyTo: { name: record.name, address: record.email },
            subject: `Hotel Ganesh Himal feedback: ${record.topic} (${record.rating}/5)`,
            text: `Guest: ${record.name}\nEmail: ${record.email}\nTopic: ${record.topic}\nRating: ${record.rating}/5\nReceived: ${record.createdAt}\nReference: ${record.id}\nPublic review consent: ${record.publishReview === true ? 'Yes' : 'No (private feedback)'}\nPublication status: ${reviewStatus(record)}\n\n${record.message}`
          });
          await finish('feedback.json', record.id, lease, null, result?.messageId);
        } catch (error) {
          await finish('feedback.json', record.id, lease, error);
          console.error(`Feedback delivery pending (${record.id}): ${error.code || 'mail delivery error'}`, error.responseCode || '', error.providerError || '');
          if (isConnectionError(error)) break;
        }
      }
      const notifications = await storage.read(() => reservations.pendingNotifications().filter(item => !bookingId || item.bookingId === bookingId).sort((a, b) => Number(isOwnerNotification(b)) - Number(isOwnerNotification(a))));
      for (const notification of notifications) {
        if (storage.isCloud() && Date.now()-started>9000) break;
        const lease = await claim('reservations.json', notification.id);
        if (!lease) continue;
        try {
          const result = await mailer.sendMail({ from: smtp.SMTP_FROM, to: isOwnerNotification(notification) ? smtp.FEEDBACK_TO || notification.to : notification.to, replyTo: notification.replyTo, subject: notification.subject, text: notification.text, idempotencyKey:`hotel-reservation-${notification.id}` });
          if (Array.isArray(result?.accepted) && result.accepted.length === 0) throw Object.assign(new Error('Recipient not accepted.'), { code: 'EENVELOPE', command: 'RCPT TO' });
          await finish('reservations.json',notification.id,lease,null,result?.messageId);
        } catch (error) { await finish('reservations.json',notification.id,lease,error); console.error(`Reservation email pending (${notification.id}): ${error.code || 'mail delivery error'}`); if (isConnectionError(error)) break; }
      }
    } catch (error) { console.error('Could not process feedback queue:', error.message); }
    finally { processing = false; }
  }
  function collection(filename) { return filename==='feedback.json' ? readJson(filename) : reservations.exportData(); }
  function entries(filename,value) { return filename==='feedback.json' ? value : value.notifications; }
  async function claim(filename,id) {
    return storage.write(()=>{
      const value=collection(filename),record=entries(filename,value).find(item=>item.id===id),now=Date.now();
      if(!record||record.delivery==='sent'||record.leaseUntil>now||(storage.isCloud()&&record.retryAt>now))return null;
      const token=randomUUID();record.leaseToken=token;record.leaseUntil=now+120000;storage.writeJSON(filename,dataDir,value);return token;
    });
  }
  async function finish(filename,id,token,error,messageId) {
    return storage.write(()=>{
      const value=collection(filename),record=entries(filename,value).find(item=>item.id===id);
      if(!record||record.leaseToken!==token)return;
      delete record.leaseToken;delete record.leaseUntil;
      if(error){record.lastError=deliveryError(error);record.attempts=(record.attempts||0)+1;record.retryAt=Date.now()+(error.code==='EMAIL_RATE_LIMIT'?3600000:Math.min(3600000,60000*2**Math.min(record.attempts,5)));}
      else{record.delivery='sent';record.sentAt=new Date().toISOString();if(messageId)record.providerMessageId=String(messageId).slice(0,500);delete record.lastError;delete record.retryAt;}
      storage.writeJSON(filename,dataDir,value);
    });
  }
  function initialize() {
    if (storage.isCloud()) return;
    if (retryTimer) return;
    readJson('feedback.json');
    retryTimer = setInterval(() => {
      const cutoff = Date.now() - WINDOW_MS;
      for (const [ip, attempt] of attempts) if (attempt.startedAt < cutoff) attempts.delete(ip);
      void deliverFeedback();
    }, 60000);
    retryTimer.unref();
    void deliverFeedback();
  }
  async function submitFeedback(request, suppliedBody) {
    initialize();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    const attempt = attempts.get(ip) || { count: 0, startedAt: Date.now() };
    if (Date.now() - attempt.startedAt > WINDOW_MS) { attempt.count = 0; attempt.startedAt = Date.now(); }
    attempt.count += 1;
    attempts.set(ip, attempt);
    if (!storage.isCloud() && attempt.count > 5) return json(429, { error: 'Please wait a few minutes before sending more feedback.' });
    try {
      const body = suppliedBody || await receiveJson(request);
      if (body.website) return json(400, { error: 'Could not submit this feedback.' });
      const name = clean(body.name, 100);
      const email = clean(body.email, 150).toLowerCase();
      const topic = clean(body.topic, 40);
      const rating = Number(body.rating);
      const message = clean(body.message, 4000);
      if (!name || /[\r\n]/.test(name) || !/^\S+@\S+\.\S+$/.test(email) || !['Hotel stay', 'Website', 'Suggestion'].includes(topic) || !Number.isInteger(rating) || rating < 1 || rating > 5 || message.length < 10) {
        return json(400, { error: 'Please provide your name, a valid email, topic, rating, and at least 10 characters of feedback.' });
      }
      const publishReview = body.publishReview === true || body.publishReview === 'yes';
      const createdAt = new Date().toISOString();
      const record = { id: randomUUID(), name, email, topic, rating, message, createdAt, delivery: 'pending', publishReview, reviewStatus: publishReview ? 'pending' : 'private', ...(publishReview ? { publicationConsentedAt: createdAt } : {}) };
      const records = readJson('feedback.json');
      records.push(record);
      saveJson('feedback.json', records);
      if(!storage.isCloud()) void deliverFeedback();
      return json(202, { message: publishReview ? 'Thank you! Your visitor review has been submitted for the hotel team to approve before publication.' : 'Thank you! Your feedback has been saved for our hotel team.', reference: record.id, reviewShared: false, reviewPending: publishReview });
    } catch (error) {
      if (['Invalid JSON request.', 'Request is too large.'].includes(error.message)) return json(400, { error: 'Please send a valid feedback form.' });
      console.error('Could not save feedback:', error.message);
      return json(500, { error: 'We could not save your feedback. Please try again.' });
    }
  }
  async function subscribe(request, suppliedBody) {
    try {
      const body = suppliedBody || await receiveJson(request);
      const email = clean(body.email, 150).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Please enter a valid email address.' });
      const records = readJson('subscribers.json');
      if (!records.some(item => item.email === email)) {
        records.push({ email, createdAt: new Date().toISOString() });
        saveJson('subscribers.json', records);
      }
      return json(201, { message: 'You are on the list.' });
    } catch (error) {
      if (['Invalid JSON request.', 'Request is too large.'].includes(error.message)) return json(400, { error: error.message });
      console.error('Could not subscribe:', error.message);
      return json(500, { error: 'Could not subscribe. Please try again.' });
    }
  }
  function close() { if (retryTimer) clearInterval(retryTimer); mailer?.close?.(); }
  function getPublicReviews() {
    const eligible = readJson('feedback.json').filter(record =>
      record && typeof record === 'object' && hasPublicationConsent(record) && reviewStatus(record) === 'published' &&
      typeof record.id === 'string' && typeof record.name === 'string' && record.name.trim() &&
      typeof record.message === 'string' && record.message.length >= 10 &&
      Number.isInteger(record.rating) && record.rating >= 1 && record.rating <= 5 &&
      ['Hotel stay', 'Website', 'Suggestion'].includes(record.topic) && Number.isFinite(Date.parse(record.createdAt))
    ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return {
      totalCount: eligible.length,
      reviews: eligible.slice(0, 6).map(({ id, name, rating, topic, message, publicMessage, createdAt }) => ({ id, name, rating, topic, message: publicMessage || message, createdAt, ...(publicMessage && publicMessage !== message ? { edited: true } : {}) }))
    };
  }
  function getAdminReviews() {
    return readJson('feedback.json').filter(record => record && typeof record.id === 'string').sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(record => ({
      id: record.id, name: record.name, email: record.email, topic: record.topic, rating: record.rating,
      message: record.message, publicMessage: record.publicMessage || record.message, createdAt: record.createdAt,
      status: reviewStatus(record), consent: hasPublicationConsent(record), delivery: record.delivery,
      edited: Boolean(record.publicMessage && record.publicMessage !== record.message)
    }));
  }
  function updateAdminReview(id, changes) {
    const allowed = ['action', 'publicMessage'];
    if (!changes || typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).some(key => !allowed.includes(key))) throw Object.assign(new Error('Only publication controls and displayed review text can be edited.'), { status: 400 });
    const records = readJson('feedback.json');
    const record = records.find(item => item?.id === id);
    if (!record) throw Object.assign(new Error('Feedback not found.'), { status: 404 });
    if (changes.action && !['publish', 'hide', 'pending'].includes(changes.action)) throw Object.assign(new Error('Unknown review action.'), { status: 400 });
    if (changes.action === 'publish' && !hasPublicationConsent(record)) throw Object.assign(new Error('This visitor has not given permission for public publication.'), { status: 409 });
    if (changes.publicMessage !== undefined) {
      if (typeof changes.publicMessage !== 'string' || changes.publicMessage.trim().length < 10 || changes.publicMessage.length > 4000) throw Object.assign(new Error('Displayed review text must contain 10–4,000 characters.'), { status: 400 });
      const message = changes.publicMessage.trim();
      if (message === record.message) { delete record.publicMessage; delete record.publicEditedAt; }
      else { record.publicMessage = message; record.publicEditedAt = new Date().toISOString(); }
    }
    if (changes.action) record.reviewStatus = changes.action === 'publish' ? 'published' : changes.action === 'hide' ? 'hidden' : 'pending';
    record.moderatedAt = new Date().toISOString();
    saveJson('feedback.json', records);
    return { ok: true };
  }
  function deleteAdminReview(id) {
    const records = readJson('feedback.json');
    if (!records.some(record => record?.id === id)) throw Object.assign(new Error('Feedback not found.'), { status: 404 });
    saveJson('feedback.json', records.filter(record => record?.id !== id));
    return { ok: true };
  }
  function getAdminSubscribers() { return readJson('subscribers.json').slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)); }
  function deleteAdminSubscriber(email) {
    const records = readJson('subscribers.json');
    if (!records.some(record => record.email === email)) throw Object.assign(new Error('Subscriber not found.'), { status: 404 });
    saveJson('subscribers.json', records.filter(record => record.email !== email));
    return { ok: true };
  }
  function getAdminStatus() {
    const feedback = readJson('feedback.json');
    return { emailConfigured: mailReady, emailProvider:mailer?.provider || (mailer?'test':'unconfigured'), storageProvider:storage.isCloud()?'Netlify Blobs':'Local JSON', pendingEmails: feedback.filter(record => record.delivery !== 'sent').length, pendingReservationEmails: reservations.pendingNotifications().length, reservationCount: reservations.adminSnapshot().bookings.length, feedbackCount: feedback.length, subscriberCount: readJson('subscribers.json').length, persistentDirectoryConfigured: storage.isCloud() || Boolean(process.env.HOTEL_DATA_DIR) };
  }
  function exportAdminData() { return { feedback: readJson('feedback.json'), subscribers: readJson('subscribers.json'), reservations: reservations.exportData() }; }
  return { initialize, submitFeedback, subscribe, deliverFeedback, getPublicReviews, getAdminReviews, updateAdminReview, deleteAdminReview, getAdminSubscribers, deleteAdminSubscriber, getAdminStatus, exportAdminData, close };
}

function getBackend() {
  // Refresh legacy workers during Next.js hot reload, and replace transports when
  // environment settings change. Keep the instance shape compatible with old imports.
  const configuration = createHash('sha256').update(JSON.stringify(['netlify-storage-worker-v4', storage.isCloud(), process.cwd(), ...['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','SMTP_FROM','FEEDBACK_TO','HOTEL_DATA_DIR','RESEND_API_KEY','EMAIL_FROM'].map(key => process.env[key] || '')])).digest('hex');
  if (!globalThis[singletonKey] || globalThis[configurationKey] !== configuration) {
    globalThis[singletonKey]?.close?.();
    globalThis[singletonKey] = createBackend();
    globalThis[configurationKey] = configuration;
    globalThis[singletonKey].initialize();
  }
  return globalThis[singletonKey];
}

module.exports = { createBackend, getBackend, receiveJson };
