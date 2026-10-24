import management from '../../../../lib/site-admin.js';
import backend from '../../../../lib/backend.js';
import guard from '../../../../lib/admin-api.js';
import site from '../../../../pages.js';
import scope from '../../../../lib/route-storage.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  const rejection = guard.denied(request); if (rejection) return rejection;
  try { return scope.read(()=>Response.json({ ...management.getSiteAdmin().snapshot(), pageDefaults: site.pageInfo }, { headers: { 'Cache-Control': 'no-store' } })); }
  catch (error) { return guard.errorResponse(error); }
}
export async function PUT(request) {
  const rejection = guard.denied(request, true); if (rejection) return rejection;
  try { const body=await backend.receiveJson(request);return scope.write(()=>Response.json({ ...management.getSiteAdmin().save(body), pageDefaults: site.pageInfo }, { headers: { 'Cache-Control': 'no-store' } })); }
  catch (error) { return guard.errorResponse(error); }
}
