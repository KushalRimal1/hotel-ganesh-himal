import reservations from '../../../lib/reservations.js';
import backend from '../../../lib/backend.js';
import guard from '../../../lib/admin-api.js';
export const runtime = 'nodejs';
export async function POST(request) {
  if (reservations.rateLimited(request,'submit')) return Response.json({ error:'Please wait 15 minutes before sending more requests.' },{status:429});
  try { const booking=reservations.getReservationStore().create(await backend.receiveJson(request)); void backend.getBackend().deliverFeedback(); return Response.json({ booking, message:'Request saved. Your reservation is pending hotel confirmation.' },{status:201,headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return guard.errorResponse(error); }
}
