import backend from '../../../lib/backend.js';
import management from '../../../lib/site-admin.js';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!management.getSiteAdmin().read().settings.feedbackEnabled) return Response.json({ error: 'Guest feedback is currently paused.' }, { status: 503 });
  return backend.getBackend().submitFeedback(request);
}
