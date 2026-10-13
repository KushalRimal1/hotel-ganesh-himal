import reservations from '../../../../lib/reservations.js';
import backend from '../../../../lib/backend.js';
import guard from '../../../../lib/admin-api.js';
export const runtime = 'nodejs';
export async function POST(request) {
  if(reservations.rateLimited(request,'lookup')) return Response.json({error:'Please wait before trying more references.'},{status:429});
  try { const body=await backend.receiveJson(request); return Response.json({booking:reservations.getReservationStore().lookup(body.reference,body.email)},{headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return guard.errorResponse(error); }
}
