import backend from '../../../lib/backend.js';
import management from '../../../lib/site-admin.js';
import scope from '../../../lib/route-storage.js';
import guard from '../../../lib/admin-api.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const limit=await scope.limit(request,'feedback',5);if(limit)return limit;
  try{
    const body=await backend.receiveJson(request);
    const response=await scope.write(()=>management.getSiteAdmin().read().settings.feedbackEnabled?backend.getBackend().submitFeedback(request,body):Response.json({error:'Guest feedback is currently paused.'},{status:503}));
    if(response.status===202)scope.emailAfterResponse();
    return response;
  }catch(error){return guard.errorResponse(error);}
}
