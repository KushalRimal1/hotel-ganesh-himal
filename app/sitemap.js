import site from '../pages.js';
import { siteUrl } from '../lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const origin = await siteUrl();
  return site.getPagePaths().map(path => ({ url: new URL(path, origin).href }));
}
