import backend from '../../../lib/backend.js';
import management from '../../../lib/site-admin.js';
import scope from '../../../lib/route-storage.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return scope.read(()=>Response.json(management.getSiteAdmin().read().settings.reviewsEnabled ? backend.getBackend().getPublicReviews() : { reviews: [], totalCount: 0 }, { headers: { 'Cache-Control': 'no-store' } }));
}
