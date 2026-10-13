import reservations from '../../../lib/reservations.js';
import guard from '../../../lib/admin-api.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request) {
  try { const query=new URL(request.url).searchParams; return Response.json(reservations.getReservationStore().availability(query.get('checkIn'),query.get('checkOut'),query.get('rooms') || 1),{headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return guard.errorResponse(error); }
}
