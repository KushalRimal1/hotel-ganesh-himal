import backend from '../../../../lib/backend.js';
import management from '../../../../lib/site-admin.js';
import guard from '../../../../lib/admin-api.js';
import scope from '../../../../lib/route-storage.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  const rejection = guard.denied(request); if (rejection) return rejection;
  try {
    return scope.read(()=>{const store = backend.getBackend();
    if (new URL(request.url).searchParams.get('export') === '1') return Response.json({ exportedAt: new Date().toISOString(), site: management.getSiteAdmin().read(), ...store.exportAdminData() }, { headers: { 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="hotel-website-backup.json"' } });
    return Response.json({ subscribers: store.getAdminSubscribers(), status: store.getAdminStatus() }, { headers: { 'Cache-Control': 'no-store' } });});
  } catch (error) { return guard.errorResponse(error); }
}
export async function POST(request) {
  const rejection = guard.denied(request, true); if (rejection) return rejection;
  try { const body = await backend.receiveJson(request); if (body.action !== 'retry-email') return Response.json({ error: 'Unknown operation.' }, { status: 400 }); await backend.getBackend().deliverFeedback(); return scope.read(()=>Response.json(backend.getBackend().getAdminStatus(), { headers: { 'Cache-Control': 'no-store' } })); }
  catch (error) { return guard.errorResponse(error); }
}
export async function DELETE(request) {
  const rejection = guard.denied(request, true); if (rejection) return rejection;
  try { const { email } = await backend.receiveJson(request); return scope.write(()=>Response.json(backend.getBackend().deleteAdminSubscriber(email), { headers: { 'Cache-Control': 'no-store' } })); }
  catch (error) { return guard.errorResponse(error); }
}
