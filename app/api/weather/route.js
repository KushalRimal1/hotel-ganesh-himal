import weather from '../../../lib/weather.js';

export const runtime = 'nodejs';
export const revalidate = 600;

export async function GET() {
  try {
    return Response.json(await weather.getLuklaWeather(), { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=300' } });
  } catch {
    return Response.json({ error: 'Lukla weather is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
