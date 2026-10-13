const { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } = require('crypto');
const SESSION_COOKIE = 'hotel_review_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const key = Symbol.for('hotel-ganesh-himal.admin-auth');

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function equal(a, b) { return a.length === b.length && timingSafeEqual(a, b); }
function createAdminAuth(environment = process.env, clock = Date.now) {
  const secret = environment.ADMIN_SESSION_SECRET || '';
  const hash = environment.ADMIN_REVIEW_PASSWORD_HASH || '';
  const plain = environment.ADMIN_REVIEW_PASSWORD || '';
  const configured = secret.length >= 32 && (/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/i.test(hash) || (!hash && plain.length >= 12));
  const attempts = new Map();
  function verifyPassword(password) {
    try {
      if (hash) {
        const [algorithm, salt, expected] = hash.split(':');
        if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/i.test(expected)) return false;
        return equal(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
      }
      return equal(createHash('sha256').update(password).digest(), createHash('sha256').update(plain).digest());
    } catch { return false; }
  }
  function issueToken() {
    const payload = Buffer.from(JSON.stringify({ role: 'review-admin', exp: Math.floor(clock() / 1000) + SESSION_SECONDS, nonce: randomBytes(16).toString('hex') })).toString('base64url');
    return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
  }
  function validToken(token) {
    if (!configured || typeof token !== 'string' || token.length > 1000) return false;
    try {
      const [payload, signature, extra] = token.split('.');
      if (!payload || !signature || extra) return false;
      const expected = createHmac('sha256', secret).update(payload).digest();
      if (!equal(Buffer.from(signature, 'base64url'), expected)) return false;
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      return data.role === 'review-admin' && Number.isInteger(data.exp) && data.exp > Math.floor(clock() / 1000);
    } catch { return false; }
  }
  function cookieToken(request) {
    const cookies = request.headers.get('cookie') || '';
    return cookies.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  }
  function authenticated(request) { return validToken(cookieToken(request)); }
  function sameOrigin(request) {
    try {
      const origin = request.headers.get('origin');
      const url = new URL(request.url);
      const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || url.host;
      const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || url.protocol.replace(':', '');
      return origin === `${protocol}://${host}`;
    } catch { return false; }
  }
  function cookie(request, token, expired = false) {
    const secure = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() === 'https' || new URL(request.url).protocol === 'https:';
    return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${expired ? 0 : SESSION_SECONDS}${secure ? '; Secure' : ''}`;
  }
  async function login(request) {
    if (!sameOrigin(request)) return Response.json({ error: 'This sign-in request is not allowed.' }, { status: 403 });
    if (!configured) return Response.json({ error: 'The review manager needs its administrator password and session secret configured.' }, { status: 503 });
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    const now = clock();
    for (const [address, record] of attempts) if (now - record.startedAt >= 15 * 60 * 1000) attempts.delete(address);
    const record = attempts.get(ip) || { count: 0, startedAt: now };
    if (record.count >= 8) return Response.json({ error: 'Too many attempts. Please try again in 15 minutes.' }, { status: 429 });
    record.count += 1; attempts.set(ip, record);
    try {
      if (Number(request.headers.get('content-length')) > 4096) throw new Error('Invalid sign-in');
      const text = await request.text();
      if (text.length > 4096) throw new Error('Invalid sign-in');
      const { password } = JSON.parse(text);
      if (typeof password !== 'string' || password.length > 512 || !verifyPassword(password)) return Response.json({ error: 'The administrator password is incorrect.' }, { status: 401 });
      attempts.delete(ip);
      return Response.json({ authenticated: true }, { headers: { 'Set-Cookie': cookie(request, issueToken()), 'Cache-Control': 'no-store' } });
    } catch { return Response.json({ error: 'Please provide a valid administrator password.' }, { status: 400 }); }
  }
  function logout(request) {
    if (!sameOrigin(request)) return Response.json({ error: 'This request is not allowed.' }, { status: 403 });
    return Response.json({ authenticated: false }, { headers: { 'Set-Cookie': cookie(request, '', true), 'Cache-Control': 'no-store' } });
  }
  return { configured, authenticated, sameOrigin, login, logout, validToken };
}

function getAdminAuth() {
  if (!globalThis[key]) globalThis[key] = createAdminAuth();
  return globalThis[key];
}
module.exports = { getAdminAuth, createAdminAuth, hashPassword };
