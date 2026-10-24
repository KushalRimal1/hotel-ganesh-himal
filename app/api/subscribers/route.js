import backend from '../../../lib/backend.js';
import management from '../../../lib/site-admin.js';
import scope from '../../../lib/route-storage.js';
import guard from '../../../lib/admin-api.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const limit=await scope.limit(request,'subscribe',10);if(limit)return limit;
  try{const body=await backend.receiveJson(request);return scope.write(()=>management.getSiteAdmin().read().settings.newsletterEnabled?backend.getBackend().subscribe(request,body):Response.json({error:'Newsletter signups are currently paused.'},{status:503}));}catch(error){return guard.errorResponse(error);}
}
