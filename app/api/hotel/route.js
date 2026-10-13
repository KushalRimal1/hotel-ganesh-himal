import site from '../../../pages.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return Response.json(site.readHotelData(), { headers: { 'Cache-Control': 'no-store' } });
}
