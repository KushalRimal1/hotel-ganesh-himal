const { test } = require('node:test');
const assert = require('node:assert/strict');
const { todayInNepal, nextDay, prepare } = require('../public/stay-enquiry');
const hotel = { name: 'Hotel Ganesh Himal' };
const rooms = [{ id: 'normal-room', name: 'Normal Room', price: '$25 USD' }];
const now = new Date('2026-10-13T12:00:00Z');
const values = { checkIn: '2026-10-20', checkOut: '2026-10-23', guests: '3', room: 'normal-room', notes: 'Arriving by morning flight.' };
test('stay enquiry includes actual dates, calendar nights, party size, room, and notes without inventing a booking or rate total', () => {
  const enquiry = prepare(values, hotel, rooms, 'Rooms & rates', now);
  assert.equal(enquiry.nights, 3);
  assert.ok(enquiry.summary.includes('3 guests'));
  assert.ok(enquiry.message.includes('Arrival: 20 Oct 2026'));
  assert.ok(enquiry.message.includes('Departure: 23 Oct 2026'));
  assert.ok(enquiry.message.includes('Preferred room: Normal Room'));
  assert.ok(enquiry.message.includes('$25 USD (please confirm'));
  assert.ok(enquiry.message.includes(values.notes));
  assert.ok(enquiry.message.includes('Please confirm availability'));
  assert.ok(!enquiry.message.includes('$75'));
});
test('flexible-date enquiries and group/meals topics still produce usable messages', () => {
  const result = prepare({ guests: '1' }, hotel, rooms, 'Meals & arrival', now);
  assert.equal(result.nights, null);
  assert.ok(result.summary.includes('Flexible dates · 1 guest'));
  assert.ok(result.message.includes('Dates: Not decided yet'));
  assert.ok(result.message.includes('meals & arrival'));
  assert.ok(prepare(values, { name: 'Renamed Hotel' }, rooms, 'Group stay', now).message.includes('group stay at Renamed Hotel'));
});
test('date validation uses Nepal today, real dates, and departure after arrival', () => {
  assert.equal(todayInNepal(new Date('2026-10-13T18:30:00Z')), '2026-10-14');
  assert.equal(nextDay('2028-02-28'), '2028-02-29');
  assert.equal(nextDay('2026-12-31'), '2027-01-01');
  assert.equal(nextDay('2026-02-30'), '');
  for (const change of [
    { checkIn: '2026-10-12' }, { checkIn: '2026-02-30' }, { checkOut: '' },
    { checkIn: '', checkOut: '2026-10-23' }, { checkOut: '2026-10-20' }, { checkOut: '2026-10-19' }
  ]) assert.throws(() => prepare({ ...values, ...change }, hotel, rooms, undefined, now));
  assert.equal(prepare({ ...values, checkIn:'2026-10-13', checkOut:'2026-10-14' }, hotel, rooms, undefined, now).nights, 1);
});
test('invalid guest counts, obsolete rooms, and oversized notes are rejected', () => {
  for (const guests of ['', '0', '-1', '1.5', '101', 'NaN']) assert.throws(() => prepare({ ...values, guests }, hotel, rooms, undefined, now), error => error.field === 'guests');
  assert.throws(() => prepare({ ...values, room:'deleted-room' }, hotel, rooms, undefined, now), error => error.field === 'room');
  assert.throws(() => prepare({ ...values, notes:'x'.repeat(501) }, hotel, rooms, undefined, now), error => error.field === 'notes');
});
