import site from '../../../pages.js';
import scope from '../../../lib/route-storage.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return scope.read(()=>Response.json(site.readHotelData(), { headers: { 'Cache-Control': 'no-store' } }));
}
