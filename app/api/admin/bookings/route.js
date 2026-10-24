import reservations from '../../../../lib/reservations.js';
import backend from '../../../../lib/backend.js';
import guard from '../../../../lib/admin-api.js';
import scope from '../../../../lib/route-storage.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  const rejection=guard.denied(request);if(rejection)return rejection;
  return scope.read(()=>Response.json(reservations.getReservationStore().adminSnapshot(),{headers:{'Cache-Control':'no-store'}}));
}
export async function POST(request) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const body=await backend.receiveJson(request);const response=await scope.write(()=>Response.json({booking:reservations.getReservationStore().create(body,true)},{status:201,headers:{'Cache-Control':'no-store'}}));if(response.status===201)scope.emailAfterResponse();return response;}catch(error){return guard.errorResponse(error);}
}
export async function PUT(request) {
  const rejection=guard.denied(request,true);if(rejection)return rejection;
  try{const body=await backend.receiveJson(request);return scope.write(()=>Response.json(reservations.getReservationStore().saveAvailability(body),{headers:{'Cache-Control':'no-store'}}));}catch(error){return guard.errorResponse(error);}
}
