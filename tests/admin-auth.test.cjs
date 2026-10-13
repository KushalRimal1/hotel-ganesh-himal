const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAdminAuth, hashPassword } = require('../lib/admin-auth');
const password = 'test-only-strong-admin-password';
const environment = { ADMIN_REVIEW_PASSWORD_HASH: hashPassword(password), ADMIN_SESSION_SECRET: 'test-session-secret-'.repeat(3) };
function request(body, origin = 'https://hotel.example', cookie = '', ip = 'auth-test') {
  return new Request('https://hotel.example/api/admin/session', { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) });
}
test('signed administrator session is HttpOnly/Secure, expires, and rejects tampering', async () => {
  let now = Date.now();
  const auth = createAdminAuth(environment, () => now);
  const response = await auth.login(request({ password }));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.ok(cookie.includes('HttpOnly')); assert.ok(cookie.includes('Secure')); assert.ok(cookie.includes('SameSite=Strict'));
  const value = cookie.split(';')[0];
  assert.equal(auth.authenticated(request({}, 'https://hotel.example', value)), true);
  assert.equal(auth.authenticated(request({}, 'https://hotel.example', value + 'tampered')), false);
  now += 9 * 60 * 60 * 1000;
  assert.equal(auth.authenticated(request({}, 'https://hotel.example', value)), false);
});
test('wrong passwords, cross-origin sign-ins, missing setup, and repeated attempts are rejected', async () => {
  const auth = createAdminAuth(environment);
  assert.equal((await auth.login(request({ password }, 'https://evil.example'))).status, 403);
  for (let index = 0; index < 8; index++) assert.equal((await auth.login(request({ password: 'wrong' }))).status, 401);
  assert.equal((await auth.login(request({ password }))).status, 429);
  assert.equal((await createAdminAuth({}).login(request({ password }))).status, 503);
});
test('state-changing requests require the correct origin and sign-out expires the session cookie', () => {
  const auth = createAdminAuth(environment);
  assert.equal(auth.sameOrigin(request({})), true);
  assert.equal(auth.sameOrigin(request({}, 'https://evil.example')), false);
  assert.equal(auth.logout(request({}, 'https://evil.example')).status, 403);
  assert.ok(auth.logout(request({})).headers.get('set-cookie').includes('Max-Age=0'));
});
