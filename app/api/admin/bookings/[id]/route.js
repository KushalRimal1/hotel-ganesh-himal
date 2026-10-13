import reservations from '../../../../../lib/reservations.js';
import backend from '../../../../../lib/backend.js';
import guard from '../../../../../lib/admin-api.js';
export const runtime = 'nodejs';
export async function PATCH(request,{params}) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const {id}=await params;const booking=reservations.getReservationStore().update(id,await backend.receiveJson(request));void backend.getBackend().deliverFeedback();return Response.json({booking},{headers:{'Cache-Control':'no-store'}});}catch(error){return guard.errorResponse(error);}
}
export async function DELETE(request,{params}) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const {id}=await params;const {revision}=await backend.receiveJson(request);return Response.json(reservations.getReservationStore().remove(id,revision),{headers:{'Cache-Control':'no-store'}});}catch(error){return guard.errorResponse(error);}
}
