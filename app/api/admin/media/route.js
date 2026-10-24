import media from '../../../../lib/media.js';
import guard from '../../../../lib/admin-api.js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  const rejection = guard.denied(request); if (rejection) return rejection;
  try { return Response.json({ images: await media.listImages(), maxUploadBytes:media.MAX_IMAGE_SIZE }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return guard.errorResponse(error); }
}
export async function POST(request) {
  const rejection = guard.denied(request, true); if (rejection) return rejection;
  try {
    if (Number(request.headers.get('content-length')) > media.MAX_IMAGE_SIZE) return Response.json({ error: 'This photo exceeds the host upload limit. Please use a smaller or optimised photo.' }, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: 'Choose a photograph to upload.' }, { status: 400 });
    const chunks = []; let size = 0;
    try {
      while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > media.MAX_IMAGE_SIZE) { await reader.cancel(); return Response.json({ error: 'This photo exceeds the host upload limit. Please use a smaller or optimised photo.' }, { status: 413 }); } chunks.push(Buffer.from(value)); }
    } finally { reader.releaseLock(); }
    return Response.json(await media.saveImage(Buffer.concat(chunks)), { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return guard.errorResponse(error); }
}
