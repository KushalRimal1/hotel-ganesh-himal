const fs = require('fs');
const path = require('path');
const { randomBytes, randomUUID, createHash } = require('crypto');
const { getSiteAdmin } = require('./site-admin');
const dates = require('../public/stay-enquiry');

function fail(message, status = 400) { return Object.assign(new Error(message), { status }); }
function field(value, label, max, optional = false) {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) throw fail(`Please provide ${label} (up to ${max} characters).`);
  return value.trim();
}
function nightsBetween(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '') || !dates.nextDay(start) || !dates.nextDay(end) || end <= start) throw fail('Choose valid arrival and departure dates, with departure after arrival.');
  const nights = (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000;
  if (nights > 90) throw fail('For stays longer than 90 nights, please contact the hotel directly.');
  return nights;
}
function days(start, end) { const result = []; for (let day = start; day < end; day = dates.nextDay(day)) result.push(day); return result; }
function createReservationStore({ dataDir = getSiteAdmin().dataDir, site = () => getSiteAdmin().read(), environment = process.env, clock = () => new Date() } = {}) {
  const filename = path.join(/* turbopackIgnore: true */ dataDir, 'reservations.json');
  const defaultData = () => ({ bookings: [], notifications: [], availability: { enabled: true, rooms: {} } });
  function read() { return fs.existsSync(/* turbopackIgnore: true */ filename) ? JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ filename, 'utf8')) : defaultData(); }
  function write(data) { fs.mkdirSync(dataDir, { recursive: true }); const temporary = `${filename}.${randomUUID()}.tmp`; fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n'); fs.renameSync(temporary, filename); }
  function version(config) { return createHash('sha256').update(JSON.stringify(config)).digest('hex'); }
  function roomConfig(data, id) { return { enabled: true, inventory: 0, blockedDates: [], ...data.availability.rooms[id] }; }
  function available(data, roomId, start, end, roomsNeeded, excludeId, ignorePause = false) {
    const config = roomConfig(data, roomId);
    if (!config.enabled && !ignorePause) throw fail('This room category is currently paused. Please choose another room.', 409);
    for (const day of days(start, end)) {
      if (config.blockedDates.includes(day)) throw fail('The selected room is closed on one or more requested dates. Please choose different dates or contact us.', 409);
      if (config.inventory > 0) {
        const occupied = data.bookings.filter(booking => booking.id !== excludeId && booking.status === 'confirmed' && booking.roomId === roomId && booking.checkIn <= day && booking.checkOut > day).reduce((sum, booking) => sum + booking.roomsNeeded, 0);
        if (occupied + roomsNeeded > config.inventory) throw fail('There are not enough rooms for these dates. Please choose another category or contact the hotel.', 409);
      }
    }
  }
  function publicRecord(booking) {
    const notifications = read().notifications.filter(item => item.bookingId === booking.id && (item.kind === 'guest' || (!item.kind && !item.subject?.includes(': new reservation request '))));
    const latest = notifications[notifications.length - 1];
    return { reference: booking.reference, status: booking.status, name: booking.name, roomName: booking.roomName, checkIn: booking.checkIn, checkOut: booking.checkOut, guests: booking.guests, roomsNeeded: booking.roomsNeeded, guestPhone: booking.phone || '', guestNotes: booking.notes || '', createdAt: booking.createdAt, updatedAt: booking.updatedAt, guestMessage: booking.guestMessage, agreedPrice: booking.agreedPrice, emailDelivery: latest?.delivery === 'sent' ? 'accepted' : latest?.lastError ? 'failed' : 'queued' };
  }
  function notify(data, booking, initial = false) {
    const hotel = site().hotelData.hotel;
    const statusText = { pending: 'Request received — awaiting hotel confirmation', confirmed: 'Reservation confirmed by the hotel', declined: 'The hotel could not confirm this request', cancelled: 'Reservation cancelled' }[booking.status];
    const details = `${statusText}\n\nReference: ${booking.reference}\nGuest: ${booking.name}\nRoom: ${booking.roomName}\nArrival: ${booking.checkIn}\nDeparture: ${booking.checkOut}\nGuests: ${booking.guests}\nRooms requested: ${booking.roomsNeeded}\n${booking.agreedPrice ? `Agreed price / terms: ${booking.agreedPrice}\n` : ''}${booking.guestMessage ? `Message from the hotel: ${booking.guestMessage}\n` : ''}\nContact: ${hotel.phone}\n${booking.status === 'pending' ? 'This is a request, not a confirmed reservation. Our team will contact you.' : ''}`;
    data.notifications.push({ id: randomUUID(), bookingId: booking.id, kind: 'guest', to: booking.email, subject: `${hotel.name}: ${statusText} (${booking.reference})`, text: details, delivery: 'pending' });
    if (initial) data.notifications.push({ id: randomUUID(), bookingId: booking.id, kind: 'owner', to: environment.FEEDBACK_TO || hotel.email, replyTo: booking.email, subject: `${hotel.name}: new reservation request ${booking.reference}`, text: `${details}\n\nEmail: ${booking.email}\nPhone: ${booking.phone || 'Not supplied'}\nGuest notes: ${booking.notes}\n\nManage this request in the private website dashboard.`, delivery: 'pending' });
  }
  function create(input, manual = false) {
    const data = read(), rooms = site().hotelData.rooms;
    if (!manual && !data.availability.enabled) throw fail('Online reservation requests are paused. Please call or WhatsApp the hotel.', 503);
    if (input.website) throw fail('Could not submit this request.');
    const name = field(input.name, 'your name', 100), email = field(input.email, 'your email', 150).toLowerCase();
    if (/[\r\n]/.test(name) || !/^\S+@\S+\.\S+$/.test(email)) throw fail('Enter a valid name and email address.');
    const room = rooms.find(room => room.id === input.roomId);
    if (!room) throw fail('Choose a current room category.');
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (input.checkIn < dates.todayInNepal(clock())) throw fail('Arrival cannot be in the past in Nepal.');
    const guests = Number(input.guests), roomsNeeded = Number(input.roomsNeeded);
    if (!Number.isInteger(guests) || guests < 1 || guests > 100 || !Number.isInteger(roomsNeeded) || roomsNeeded < 1 || roomsNeeded > 30) throw fail('Choose 1–100 guests and 1–30 rooms.');
    const phone = field(input.phone || '', 'a contact phone number', 40, true);
    if (phone && !/^\+?[\d ()-]{7,40}$/.test(phone)) throw fail('Enter a valid phone number or leave it blank.');
    const notes = field(input.notes || '', 'guest notes', 2000, true);
    if (!manual) {
      const existing = data.bookings.find(booking => booking.status === 'pending' && clock().getTime() - Date.parse(booking.createdAt) < 900000 && booking.email === email && booking.name === name && booking.roomId === room.id && booking.checkIn === input.checkIn && booking.checkOut === input.checkOut && booking.guests === guests && booking.roomsNeeded === roomsNeeded && booking.notes === notes && booking.phone === phone);
      if (existing) return publicRecord(existing);
    }
    available(data, room.id, input.checkIn, input.checkOut, roomsNeeded, undefined, manual);
    const now = clock().toISOString();
    const booking = { id: randomUUID(), reference: `GH-${randomBytes(10).toString('hex').toUpperCase()}`, name, email, phone, roomId: room.id, roomName: room.name, checkIn: input.checkIn, checkOut: input.checkOut, nights, guests, roomsNeeded, notes, status: 'pending', source: manual ? 'hotel' : 'website', guestMessage: '', adminNotes: '', agreedPrice: '', createdAt: now, updatedAt: now, revision: 1 };
    data.bookings.push(booking); notify(data, booking, true); write(data);
    return publicRecord(booking);
  }
  function update(id, changes) {
    const data = read(), booking = data.bookings.find(booking => booking.id === id);
    if (!booking) throw fail('Reservation request not found.', 404);
    if (changes.revision !== booking.revision) throw fail('This request changed in another session. Refresh before saving.', 409);
    if (Object.keys(changes).some(key => !['revision','status','guestMessage','adminNotes','agreedPrice'].includes(key))) throw fail('Unknown reservation field.');
    const status = changes.status || booking.status;
    if (!['pending','confirmed','declined','cancelled'].includes(status)) throw fail('Choose a valid reservation status.');
    if (status === 'confirmed' && booking.status !== 'confirmed') {
      if (!site().hotelData.rooms.some(room => room.id === booking.roomId)) throw fail('This room category was removed. Contact the guest before confirming.', 409);
      if (booking.checkOut <= dates.todayInNepal(clock())) throw fail('A stay that has ended cannot be confirmed.', 409);
      available(data, booking.roomId, booking.checkIn, booking.checkOut, booking.roomsNeeded, id, booking.source === 'hotel');
    }
    const previous = JSON.stringify([booking.status, booking.guestMessage, booking.agreedPrice]);
    for (const fieldName of ['guestMessage','adminNotes','agreedPrice']) if (changes[fieldName] !== undefined) booking[fieldName] = field(changes[fieldName], fieldName, fieldName === 'agreedPrice' ? 300 : 2000, true);
    booking.status = status; booking.updatedAt = clock().toISOString(); booking.revision += 1;
    if (previous !== JSON.stringify([booking.status, booking.guestMessage, booking.agreedPrice])) notify(data, booking);
    write(data); return booking;
  }
  function lookup(reference, email) {
    const booking = read().bookings.find(booking => booking.reference === String(reference || '').trim().toUpperCase() && booking.email === String(email || '').trim().toLowerCase());
    if (!booking) throw fail('No request matches that reference and email.', 404);
    return publicRecord(booking);
  }
  function remove(id, revision) {
    const data = read(), booking = data.bookings.find(item => item.id === id);
    if (!booking) throw fail('Reservation request not found.', 404);
    if (revision !== booking.revision) throw fail('This request changed. Refresh before deleting.', 409);
    if (booking.status === 'confirmed') throw fail('Cancel a confirmed reservation before deleting its saved record.', 409);
    data.bookings = data.bookings.filter(item => item.id !== id); data.notifications = data.notifications.filter(item => item.bookingId !== id); write(data); return { ok: true };
  }
  function availability(start, end, roomsNeeded = 1) {
    if (start || end) { nightsBetween(start, end); if (start < dates.todayInNepal(clock())) throw fail('Arrival cannot be in the past.'); }
    const count = Number(roomsNeeded); if (!Number.isInteger(count) || count < 1 || count > 30) throw fail('Choose 1–30 rooms.');
    const data = read();
    return { enabled: data.availability.enabled, rooms: site().hotelData.rooms.map(room => {
      const config = roomConfig(data, room.id); let accepting = config.enabled && data.availability.enabled, message = config.inventory ? 'Availability checked when dates are selected' : 'Availability confirmed by the hotel';
      if (!accepting) message = 'Online requests paused';
      else if (start && end) { try { available(data, room.id, start, end, count); message = config.inventory ? 'Space for a request — hotel confirmation required' : 'Dates open for a request — hotel confirmation required'; } catch (error) { accepting = false; message = error.message; } }
      return { id: room.id, name: room.name, accepting, message };
    }) };
  }
  function adminSnapshot() { const data = read(); return { bookings: data.bookings.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)), availability: data.availability, version: version(data.availability), rooms: site().hotelData.rooms.map(({ id,name }) => ({ id,name })), queuedEmails: data.notifications.filter(item => item.delivery !== 'sent').length, emailErrors: data.notifications.filter(item => item.delivery !== 'sent' && item.lastError).map(item => ({ id: item.id, reference: data.bookings.find(booking => booking.id === item.bookingId)?.reference, to: item.to, ...item.lastError })), emailConfigured: Boolean(environment.SMTP_HOST && environment.SMTP_FROM && environment.FEEDBACK_TO && (!environment.SMTP_USER || environment.SMTP_PASS)) }; }
  function saveAvailability(input) {
    const data = read(); if (input.version !== version(data.availability)) throw fail('Availability settings changed. Refresh before saving.', 409);
    if (typeof input.enabled !== 'boolean' || !input.rooms || typeof input.rooms !== 'object' || Array.isArray(input.rooms)) throw fail('Invalid availability settings.');
    const rooms = {};
    for (const [id, config] of Object.entries(input.rooms)) {
      if (!site().hotelData.rooms.some(room => room.id === id)) continue;
      const inventory = Number(config.inventory);
      if (typeof config.enabled !== 'boolean' || !Number.isInteger(inventory) || inventory < 0 || inventory > 100 || !Array.isArray(config.blockedDates) || config.blockedDates.length > 730 || config.blockedDates.some(day => typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !dates.nextDay(day))) throw fail('Use 0–100 rooms and valid blocked dates (YYYY-MM-DD).');
      rooms[id] = { enabled: config.enabled, inventory, blockedDates: [...new Set(config.blockedDates)].sort() };
    }
    // Inventory changes must still accommodate already confirmed stays.
    const proposed = { ...data, availability: { enabled: input.enabled, rooms } };
    for (const booking of data.bookings.filter(booking => booking.status === 'confirmed' && booking.checkOut > dates.todayInNepal(clock()))) {
      if (!site().hotelData.rooms.some(room => room.id === booking.roomId)) continue;
      available(proposed, booking.roomId, booking.checkIn < dates.todayInNepal(clock()) ? dates.todayInNepal(clock()) : booking.checkIn, booking.checkOut, booking.roomsNeeded, booking.id, true);
    }
    data.availability = proposed.availability; write(data); return adminSnapshot();
  }
  function pendingNotifications() { return read().notifications.filter(item => item.delivery !== 'sent'); }
  function markSent(id, messageId) { const data = read(), item = data.notifications.find(item => item.id === id); if (item) { item.delivery = 'sent'; item.sentAt = clock().toISOString(); if (messageId) item.providerMessageId = String(messageId).slice(0, 500); delete item.lastError; write(data); } }
  function markFailed(id, error) { const data = read(), item = data.notifications.find(item => item.id === id); if (item) { item.lastError = error; item.attempts = (item.attempts || 0) + 1; write(data); } }
  function exportData() { return read(); }
  return { create, update, remove, lookup, availability, adminSnapshot, saveAvailability, pendingNotifications, markSent, markFailed, exportData };
}
const key = Symbol.for('hotel.reservation-rate-limits');
function rateLimited(request, operation) {
  const map = globalThis[key] || (globalThis[key] = new Map()); const now = Date.now();
  for (const [id, record] of map) if (now - record.started >= 900000) map.delete(id);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const id = `${operation}:${ip}`, record = map.get(id) || { started: now, count: 0 }; record.count++; map.set(id,record);
  return record.count > (operation === 'submit' ? 5 : 30);
}
module.exports = { createReservationStore, getReservationStore: () => createReservationStore(), rateLimited };
