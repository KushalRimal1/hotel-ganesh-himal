import { siteUrl } from '../lib/site';

export const dynamic = 'force-dynamic';

export default async function robots() {
  const origin = await siteUrl();
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] }, sitemap: new URL('/sitemap.xml', origin).href };
}
