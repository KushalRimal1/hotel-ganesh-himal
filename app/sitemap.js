import site from '../pages.js';
import { siteUrl } from '../lib/site';
import storage from '../lib/storage.js';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const origin = await siteUrl();
  return storage.read(()=>site.getPagePaths().map(path => ({ url: new URL(path, origin).href })));
}
