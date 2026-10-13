const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shouldShowWelcome } = require('../lib/welcome-policy');

const fresh = { pathname: '/', navigationType: 'navigate', forced: false, welcomeSeen: false, previousPage: null, intent: null, now: 100000, historyLength: 1, storageAvailable: true, internalReferrer: false };

test('fresh mobile openings show welcome, including history-restored first visits', () => {
  assert.equal(shouldShowWelcome(fresh), true);
  assert.equal(shouldShowWelcome({ ...fresh, navigationType: 'back_forward' }), true);
  assert.equal(shouldShowWelcome({ ...fresh, navigationType: 'back_forward', welcomeSeen: true, previousPage: { pathname: '/' } }), true);
});

test('an explicit internal Home click skips the intro before first paint', () => {
  assert.equal(shouldShowWelcome({ ...fresh, intent: { destination: '/', from: '/rooms', at: 99500 } }), false);
  assert.equal(shouldShowWelcome({ ...fresh, intent: { destination: '/', from: '/rooms', at: 70000 } }), true);
});

test('real internal browser Back skips welcome, while unrelated history restoration does not', () => {
  assert.equal(shouldShowWelcome({ ...fresh, navigationType: 'back_forward', welcomeSeen: true, historyLength: 3, previousPage: { pathname: '/gallery' } }), false);
  assert.equal(shouldShowWelcome({ ...fresh, navigationType: 'back_forward', historyLength: 3, previousPage: { pathname: '/gallery' } }), true);
  assert.equal(shouldShowWelcome({ ...fresh, navigationType: 'back_forward', homeVisited: true, historyLength: 3, previousPage: { pathname: '/rooms' } }), false);
});

test('reload and explicit replay always show the welcome', () => {
  const internal = { ...fresh, intent: { destination: '/', from: '/rooms', at: 99500 } };
  assert.equal(shouldShowWelcome({ ...internal, forced: true }), true);
  assert.equal(shouldShowWelcome({ ...internal, navigationType: 'reload' }), true);
});

test('same-origin referrers alone do not suppress a new-tab intro', () => {
  assert.equal(shouldShowWelcome({ ...fresh, internalReferrer: true, welcomeSeen: true, previousPage: { pathname: '/rooms' } }), true);
  assert.equal(shouldShowWelcome({ ...fresh, internalReferrer: true, storageAvailable: false, historyLength: 3 }), false);
});
