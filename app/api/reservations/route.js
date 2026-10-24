import reservations from '../../../lib/reservations.js';
import backend from '../../../lib/backend.js';
import guard from '../../../lib/admin-api.js';
import scope from '../../../lib/route-storage.js';
export const runtime = 'nodejs';
export async function POST(request) {
  if (reservations.rateLimited(request,'submit')) return Response.json({ error:'Please wait 15 minutes before sending more requests.' },{status:429});
  const limit=await scope.limit(request,'reservation-submit',5);if(limit)return limit;
  try { const body=await backend.receiveJson(request);const response=await scope.write(()=>Response.json({ booking:reservations.getReservationStore().create(body), message:'Request saved. Your reservation is pending hotel confirmation.' },{status:201,headers:{'Cache-Control':'no-store'}}));if(response.status===201)scope.emailAfterResponse();return response; }
  catch(error) { return guard.errorResponse(error); }
}
