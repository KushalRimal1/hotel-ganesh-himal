import parse from 'html-react-parser';
import { notFound } from 'next/navigation';
import { getSitePage, siteUrl, structuredData, serializeJson } from '../../lib/site';
import SiteScripts from '../../components/SiteScripts';

export const dynamic = 'force-dynamic';

async function currentPage(params) {
  const { slug = [] } = await params;
  return getSitePage('/' + slug.join('/'));
}

export async function generateMetadata({ params }) {
  const page = await currentPage(params);
  if (!page) return { title: 'Page not found | Hotel Ganesh Himal', robots: { index: false, follow: false } };
  const origin = await siteUrl();
  const url = new URL(page.pathname, origin).href;
    const image = new URL(page.info.image ? (page.info.image.startsWith('/') ? page.info.image : `/images/${page.info.image}`) : '/images/full%20hotel%20photo.jpg', origin).href;
  return {
    metadataBase: origin,
    title: page.title,
    description: page.info.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.info.description, url, type: 'website', siteName: 'Hotel Ganesh Himal Lukla', locale: 'en_US', images: [{ url: image, alt: page.info.title }] },
    twitter: { card: 'summary_large_image', title: page.title, description: page.info.description, images: [image] },
    robots: { index: true, follow: true }
  };
}

export default async function HotelPage({ params }) {
  const page = await currentPage(params);
  if (!page) notFound();
  const origin = await siteUrl();
  return (
    <>
      {parse(page.body)}
      <script id="hotel-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJson(structuredData(page, origin)) }} />
      <noscript><style>{'.welcome-screen {display:none!important} body.welcome-active {overflow:auto} .reveal {opacity:1!important;transform:none!important}'}</style></noscript>
      <SiteScripts />
    </>
  );
}
