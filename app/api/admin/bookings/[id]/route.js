import reservations from '../../../../../lib/reservations.js';
import backend from '../../../../../lib/backend.js';
import guard from '../../../../../lib/admin-api.js';
import scope from '../../../../../lib/route-storage.js';
export const runtime = 'nodejs';
export async function PATCH(request,{params}) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const {id}=await params,body=await backend.receiveJson(request);const response=await scope.write(()=>Response.json({booking:reservations.getReservationStore().update(id,body)},{headers:{'Cache-Control':'no-store'}}));if(response.ok)scope.emailAfterResponse();return response;}catch(error){return guard.errorResponse(error);}
}
export async function DELETE(request,{params}) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const {id}=await params;const {revision}=await backend.receiveJson(request);return scope.write(()=>Response.json(reservations.getReservationStore().remove(id,revision),{headers:{'Cache-Control':'no-store'}}));}catch(error){return guard.errorResponse(error);}
}
