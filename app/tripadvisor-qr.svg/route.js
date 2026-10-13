import tripAdvisor from '../../lib/tripadvisor.js';

export const runtime = 'nodejs';

export async function GET(request) {
  const download = new URL(request.url).searchParams.get('download') === '1';
  return new Response(await tripAdvisor.tripAdvisorQrSvg(), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="hotel-ganesh-himal-tripadvisor-qr.svg"`,
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
