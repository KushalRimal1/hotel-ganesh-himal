import media from '../../../lib/media.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  const { name } = await params;
  const image = media.readImage(name);
  if (!image) return new Response('Photo not found.', { status: 404 });
  return new Response(image.body, { headers: { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
