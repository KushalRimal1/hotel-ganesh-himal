import media from '../../../lib/media.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  const { name } = await params;
  let image;
  try{image=await media.readImage(name);}catch{return new Response('Photo storage is unavailable. Please retry.',{status:503});}
  if (!image) return new Response('Photo not found.', { status: 404 });
  return new Response(image.body, { headers: { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
