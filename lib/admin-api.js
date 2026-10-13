const { getAdminAuth } = require('./admin-auth');
function denied(request, write = false) {
  const admin = getAdminAuth();
  if (!admin.authenticated(request)) return Response.json({ error: 'Administrator sign-in required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (write && !admin.sameOrigin(request)) return Response.json({ error: 'This management request is not allowed.' }, { status: 403 });
  return null;
}
function errorResponse(error) { const status = error.status || (error.message === 'Invalid JSON request.' ? 400 : error.message === 'Request is too large.' ? 413 : 500); return Response.json({ error: status < 500 ? error.message : 'Could not complete this operation. Please try again.' }, { status, headers: { 'Cache-Control': 'no-store' } }); }
module.exports = { denied, errorResponse };
