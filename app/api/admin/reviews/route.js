import auth from '../../../../lib/admin-auth.js';
import backend from '../../../../lib/backend.js';
import scope from '../../../../lib/route-storage.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  if (!auth.getAdminAuth().authenticated(request)) return Response.json({ error: 'Administrator sign-in required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return scope.read(()=>Response.json({ reviews: backend.getBackend().getAdminReviews() }, { headers: { 'Cache-Control': 'no-store' } }));
}
