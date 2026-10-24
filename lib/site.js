import { cache } from 'react';
import { headers } from 'next/headers';
import site from '../pages.js';
import storage from './storage.js';
import management from './site-admin.js';

export const getSitePage = cache(async (pathname) => {
  if (!Object.values(site.pageInfo).some(page=>page.path===pathname) && !pathname.startsWith('/rooms/')) return null;
  return storage.read(() => {
  const details = site.getPageDetails(pathname);
  if (!details) return null;
  const document = site.renderPage(pathname);
  const body = document.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  return { ...details, body, settings: management.getSiteAdmin().read().settings };
  });
});

export async function siteUrl() {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL);
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host')?.split(',')[0].trim() || requestHeaders.get('host') || 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim() || (host.includes('localhost') ? 'http' : 'https');
  return new URL(`${protocol}://${host}`);
}

export function structuredData(page, origin) {
  const { hotel } = page.data;
  const hotelId = new URL('/#hotel', origin).href;
  const hotelSchema = {
    '@context': 'https://schema.org', '@type': 'Hotel', '@id': hotelId,
    name: hotel.name, description: hotel.description,
    url: new URL('/', origin).href,
    telephone: hotel.phones || [hotel.phone],
    image: new URL('/images/full%20hotel%20photo.jpg', origin).href,
    address: { '@type': 'PostalAddress', addressLocality: 'Lukla', addressRegion: 'Solukhumbu', addressCountry: 'NP', streetAddress: hotel.address },
    geo: { '@type': 'GeoCoordinates', latitude: 27.6881593, longitude: 86.7294441 }
  };
  const schemas = [hotelSchema];
  if (page.key !== 'home') {
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: new URL('/', origin).href }];
    if (page.room) items.push({ '@type': 'ListItem', position: 2, name: 'Rooms', item: new URL('/rooms', origin).href });
    items.push({ '@type': 'ListItem', position: items.length + 1, name: page.info.title, item: new URL(page.pathname, origin).href });
    schemas.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items });
  }
  if (page.room) schemas.push({ '@context': 'https://schema.org', '@type': 'HotelRoom', name: page.room.name, description: page.room.description, containedInPlace: { '@id': hotelId }, url: new URL(page.pathname, origin).href });
  return schemas;
}

export function serializeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
