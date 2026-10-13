import backend from '../../../lib/backend.js';
import management from '../../../lib/site-admin.js';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!management.getSiteAdmin().read().settings.newsletterEnabled) return Response.json({ error: 'Newsletter signups are currently paused.' }, { status: 503 });
  return backend.getBackend().subscribe(request);
}
