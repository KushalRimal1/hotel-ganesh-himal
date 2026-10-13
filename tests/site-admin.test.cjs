const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSiteAdmin } = require('../lib/site-admin');
const { createBackend } = require('../lib/backend');
const { fileType } = require('../lib/media');

function fixture(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hotel-admin-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  return { dataDir, manager: createSiteAdmin({ dataDir }) };
}
test('website content, copy, and photos persist across service instances; stale saves cannot overwrite changes', t => {
  const { manager, dataDir } = fixture(t);
  const input = manager.snapshot();
  const stale = structuredClone(input);
  input.hotelData.rooms[0].price = '$29 USD';
  input.hotelData.hotel.phones = ['+977 9800000000'];
  input.hotelData.gallery.push('/media/00000000-0000-0000-0000-000000000000.jpg');
  const field = input.templates[0].fields.find(field => field.original.includes('There is a special feeling'));
  input.copy[field.id] = '<script>alert(1)</script> & a warmer welcome';
  const picture = input.templates[0].pictures[0];
  input.images[picture.id] = '/images/normal25dollar.jpg';
  input.settings.newsletterEnabled = false;
  const saved = manager.save(input);
  assert.notEqual(saved.version, stale.version);
  const fresh = createSiteAdmin({ dataDir }).snapshot();
  assert.equal(fresh.hotelData.rooms[0].price, '$29 USD');
  assert.equal(fresh.hotelData.hotel.phone, '+977 9800000000');
  assert.equal(fresh.settings.newsletterEnabled, false);
  const html = manager.template('site').html;
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.throws(() => manager.save(stale), error => error.status === 409);
});
test('content validation rejects duplicate room URLs, unsupported links, unsafe photos, and unknown copy keys', t => {
  const { manager } = fixture(t);
  for (const mutate of [
    input => { input.hotelData.rooms[1].id = input.hotelData.rooms[0].id; },
    input => { input.settings.tripadvisorUrl = 'https://tripadvisor.com.evil.example/'; },
    input => { input.settings.mapsEmbedUrl = 'javascript:alert(1)'; },
    input => { input.hotelData.rooms[0].image = '/images/../secret'; },
    input => { input.images[input.templates[0].pictures[0].id] = '/media/%2e%2e/secret'; },
    input => { input.copy.unknown = 'arbitrary content'; },
    input => { input.hotelData.hotel.phones = ['invalid']; }
  ]) {
    const input = manager.snapshot(); mutate(input);
    assert.throws(() => manager.save(input), error => error.status === 400);
  }
});
test('public room rendering reflects saved edits and has no admin links; paused features disappear', t => {
  const { manager, dataDir } = fixture(t);
  const oldDirectory = process.env.HOTEL_DATA_DIR;
  process.env.HOTEL_DATA_DIR = dataDir;
  t.after(() => { if (oldDirectory === undefined) delete process.env.HOTEL_DATA_DIR; else process.env.HOTEL_DATA_DIR = oldDirectory; });
  const input = manager.snapshot();
  input.hotelData.rooms[0].name = 'Updated Mountain Room';
  input.hotelData.rooms[0].price = '$31 USD';
  input.hotelData.rooms[0].id = 'updated-mountain-room';
  input.settings.newsletterEnabled = false;
  input.settings.welcomeEnabled = false;
  input.settings.weatherEnabled = false;
  manager.save(input);
  const site = require('../pages');
  const rooms = site.renderPage('/rooms');
  assert.ok(rooms.includes('Updated Mountain Room'));
  assert.ok(rooms.includes('$31 USD'));
  assert.ok(rooms.includes('data-room-filter="updated-mountain-room"'));
  assert.ok(site.renderPage('/rooms/updated-mountain-room'));
  assert.equal(site.renderPage('/rooms/normal-room'), null);
  const home = site.renderPage('/');
  assert.ok(!home.includes('id="newsletter-form"'));
  assert.ok(!home.includes('id="welcome-screen"'));
  assert.ok(!home.includes('id="lukla-weather"'));
  for (const url of site.getPagePaths()) assert.ok(!site.renderPage(url).includes('href="/admin'), url);
});
test('subscribers can be managed and exported without exposing server credentials', async t => {
  const { dataDir } = fixture(t);
  const backend = createBackend({ dataDir, smtp: {} }); t.after(() => backend.close());
  await backend.subscribe(new Request('http://hotel.example/api/subscribers', { method: 'POST', body: JSON.stringify({ email: 'guest@example.com' }) }));
  assert.equal(backend.getAdminSubscribers()[0].email, 'guest@example.com');
  assert.equal(backend.getAdminStatus().subscriberCount, 1);
  assert.equal(backend.getAdminStatus().emailConfigured, false);
  assert.deepEqual(Object.keys(backend.exportAdminData()).sort(), ['feedback', 'reservations', 'subscribers']);
  backend.deleteAdminSubscriber('guest@example.com');
  assert.equal(backend.getAdminSubscribers().length, 0);
  assert.throws(() => backend.deleteAdminSubscriber('guest@example.com'), error => error.status === 404);
});
test('photo uploads use file signatures and reject HTML/SVG content', () => {
  assert.equal(fileType(Buffer.from([255,216,255, ...Array(20).fill(0)])), 'jpg');
  assert.equal(fileType(Buffer.from([137,80,78,71,13,10,26,10, ...Array(20).fill(0)])), 'png');
  assert.equal(fileType(Buffer.from('RIFF0000WEBP0000')), 'webp');
  assert.throws(() => fileType(Buffer.from('<svg onload="alert(1)"></svg>')), error => error.status === 400);
});
