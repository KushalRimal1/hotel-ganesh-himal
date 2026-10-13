import reservations from '../../../../lib/reservations.js';
import backend from '../../../../lib/backend.js';
import guard from '../../../../lib/admin-api.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  const rejection=guard.denied(request);if(rejection)return rejection;
  try{return Response.json(reservations.getReservationStore().adminSnapshot(),{headers:{'Cache-Control':'no-store'}});}catch(error){return guard.errorResponse(error);}
}
export async function POST(request) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const booking=reservations.getReservationStore().create(await backend.receiveJson(request),true);void backend.getBackend().deliverFeedback();return Response.json({booking},{status:201,headers:{'Cache-Control':'no-store'}});}catch(error){return guard.errorResponse(error);}
}
export async function PUT(request) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{return Response.json(reservations.getReservationStore().saveAvailability(await backend.receiveJson(request)),{headers:{'Cache-Control':'no-store'}});}catch(error){return guard.errorResponse(error);}
}
