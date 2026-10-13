const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createBackend } = require('../lib/backend');
const { guestReviewsMarkup } = require('../lib/reviews');

const feedback = { name: 'Test Guest', email: 'GUEST@example.com', topic: 'Website', rating: '5', message: 'The room pages and gallery are easy to explore.' };
function request(payload, ip = 'test-client') {
  return new Request('http://localhost/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(payload) });
}
function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(process.env.HOTEL_TEST_TEMP_DIR || os.tmpdir(), 'hotel-next-tests-'));
  const backend = createBackend({ dataDir: directory, smtp: {}, ...options });
  t.after(() => { backend.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  return { backend, directory, records: filename => JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8')) };
}

test('valid feedback is persisted before acknowledgement; invalid, spam, and oversized submissions are rejected', async t => {
  const { backend, records } = fixture(t);
  const result = await backend.submitFeedback(request(feedback));
  assert.equal(result.status, 202);
  const body = await result.json();
  const saved = records('feedback.json');
  assert.equal(saved[0].id, body.reference);
  assert.equal(saved[0].email, 'guest@example.com');
  assert.equal(saved[0].delivery, 'pending');
  assert.equal((await backend.submitFeedback(request({ ...feedback, rating: 6 }))).status, 400);
  assert.equal((await backend.submitFeedback(request({ ...feedback, website: 'spam' }))).status, 400);
  assert.equal((await backend.submitFeedback(request(null))).status, 400);
  assert.equal((await backend.submitFeedback(request({ ...feedback, message: 'x'.repeat(100001) }))).status, 400);
  assert.equal(records('feedback.json').length, 1);
  assert.equal((await backend.submitFeedback(request(feedback))).status, 429);
});

test('newsletter signups retain the existing message and deduplicate normalised emails', async t => {
  const { backend, records } = fixture(t);
  for (const email of ['Guest@example.com', 'guest@example.com']) {
    const result = await backend.subscribe(request({ email }));
    assert.equal(result.status, 201);
    assert.equal((await result.json()).message, 'You are on the list.');
  }
  assert.equal(records('subscribers.json').length, 1);
  assert.equal((await backend.subscribe(request({ email: 'not-an-email' }))).status, 400);
});

test('failed email remains queued, retry sends it once, and guest email is used only as reply-to', async t => {
  let fail = true;
  const messages = [];
  const { backend, records } = fixture(t, {
    smtp: { SMTP_FROM: 'hotel@example.com', FEEDBACK_TO: 'team@example.com' },
    transport: { async sendMail(message) { if (fail) throw new Error('Test mail server unavailable'); messages.push(message); } }
  });
  assert.equal((await backend.submitFeedback(request(feedback))).status, 202);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(records('feedback.json')[0].delivery, 'pending');
  fail = false;
  await backend.deliverFeedback();
  await backend.deliverFeedback();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'team@example.com');
  assert.equal(messages[0].replyTo.address, 'guest@example.com');
  assert.ok(messages[0].text.includes(feedback.message));
  assert.equal(records('feedback.json')[0].delivery, 'sent');
});

test('only explicitly consented reviews are public; legacy/private feedback and email fields stay private', async t => {
  const { backend, directory } = fixture(t);
  fs.writeFileSync(path.join(directory, 'feedback.json'), JSON.stringify([{ ...feedback, id: 'legacy', rating: 5, createdAt: new Date().toISOString(), delivery: 'sent' }]));
  await backend.submitFeedback(request(feedback));
  await backend.submitFeedback(request({ ...feedback, publishReview: 'false' }));
  assert.equal(backend.getPublicReviews().totalCount, 0);
  const publicResponse = await backend.submitFeedback(request({ ...feedback, publishReview: 'yes', rating: 1 }));
  const submitted = await publicResponse.json();
  assert.equal(submitted.reviewShared, false);
  assert.equal(submitted.reviewPending, true);
  assert.equal(backend.getPublicReviews().totalCount, 0);
  backend.updateAdminReview(submitted.reference, { action: 'publish' });
  const publicReviews = backend.getPublicReviews();
  assert.equal(publicReviews.totalCount, 1);
  assert.equal(publicReviews.reviews[0].rating, 1, 'Low ratings are published too');
  assert.deepEqual(Object.keys(publicReviews.reviews[0]).sort(), ['createdAt', 'id', 'message', 'name', 'rating', 'topic']);
  assert.equal(JSON.stringify(publicReviews).includes('guest@example.com'), false);
  assert.equal(JSON.stringify(publicReviews).includes('delivery'), false);
  const privateResponse = await backend.submitFeedback(request({ ...feedback, publishReview: false }));
  assert.equal((await privateResponse.json()).reviewShared, false);
  assert.equal(backend.getPublicReviews().totalCount, 1);
});

test('public reviews use real counts, are limited to six recent entries, and escape submitted markup', async t => {
  const { backend } = fixture(t);
  for (let index = 0; index < 7; index++) {
    const response = await backend.submitFeedback(request({ ...feedback, name: '<img src=x onerror=alert(1)>', message: 'Visitor feedback <script>alert(1)</script>', publishReview: true }, `visitor-${index}`));
    backend.updateAdminReview((await response.json()).reference, { action: 'publish' });
  }
  const publicReviews = backend.getPublicReviews();
  assert.equal(publicReviews.totalCount, 7);
  assert.equal(publicReviews.reviews.length, 6);
  const html = guestReviewsMarkup(publicReviews);
  assert.ok(html.includes('7 visitor reviews'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal(html.includes('<img src=x'), false);
  assert.equal(html.includes('<script>'), false);
});

test('review manager preserves originals, requires publication consent, and persists edits, hide and delete', async t => {
  const { backend, directory, records } = fixture(t);
  const privateResponse = await backend.submitFeedback(request(feedback));
  const privateId = (await privateResponse.json()).reference;
  assert.throws(() => backend.updateAdminReview(privateId, { action: 'publish' }), error => error.status === 409);
  const publicResponse = await backend.submitFeedback(request({ ...feedback, publishReview: true }));
  const id = (await publicResponse.json()).reference;
  backend.updateAdminReview(id, { action: 'publish', publicMessage: 'A corrected display version of this visitor feedback.' });
  const record = records('feedback.json').find(record => record.id === id);
  assert.equal(record.message, feedback.message);
  assert.equal(record.name, feedback.name);
  assert.equal(record.rating, 5);
  assert.equal(backend.getPublicReviews().reviews[0].edited, true);
  assert.equal(backend.getPublicReviews().reviews[0].message, record.publicMessage);
  assert.throws(() => backend.updateAdminReview(id, { rating: 1 }), error => error.status === 400);
  backend.updateAdminReview(id, { action: 'hide' });
  assert.equal(backend.getPublicReviews().totalCount, 0);
  const reopened = createBackend({ dataDir: directory, smtp: {} });
  t.after(() => reopened.close());
  assert.equal(reopened.getAdminReviews().find(review => review.id === id).status, 'hidden');
  reopened.updateAdminReview(id, { action: 'publish' });
  assert.equal(reopened.getPublicReviews().totalCount, 1);
  reopened.deleteAdminReview(id);
  assert.equal(reopened.getPublicReviews().totalCount, 0);
  assert.equal(reopened.getAdminReviews().some(review => review.id === id), false);
});
