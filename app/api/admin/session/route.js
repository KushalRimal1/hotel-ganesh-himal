import auth from '../../../../lib/admin-auth.js';
import scope from '../../../../lib/route-storage.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  const admin = auth.getAdminAuth();
  return Response.json({ authenticated: admin.authenticated(request), configured: admin.configured }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request) { if(!auth.getAdminAuth().sameOrigin(request))return auth.getAdminAuth().login(request);const limit=await scope.limit(request,'admin-login',8);return limit||auth.getAdminAuth().login(request); }
export function DELETE(request) { return auth.getAdminAuth().logout(request); }
