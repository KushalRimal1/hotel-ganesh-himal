import auth from '../../../../../lib/admin-auth.js';
import backend from '../../../../../lib/backend.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function denied(request) {
  const admin = auth.getAdminAuth();
  if (!admin.authenticated(request)) return Response.json({ error: 'Administrator sign-in required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  if (!admin.sameOrigin(request)) return Response.json({ error: 'This review-management request is not allowed.' }, { status: 403 });
  return null;
}
function errorResponse(error) { return Response.json({ error: error.status ? error.message : 'Could not update feedback. Please try again.' }, { status: error.status || 500, headers: { 'Cache-Control': 'no-store' } }); }
export async function PATCH(request, { params }) {
  const rejection = denied(request); if (rejection) return rejection;
  try { const { id } = await params; return Response.json(backend.getBackend().updateAdminReview(id, await backend.receiveJson(request)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function DELETE(request, { params }) {
  const rejection = denied(request); if (rejection) return rejection;
  try { const { id } = await params; return Response.json(backend.getBackend().deleteAdminReview(id), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return errorResponse(error); }
}
