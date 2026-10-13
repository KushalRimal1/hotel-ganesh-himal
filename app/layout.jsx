import { headers } from 'next/headers';
import { getSitePage } from '../lib/site';
import welcomePolicy from '../lib/welcome-policy.js';
import management from '../lib/site-admin.js';

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#123b36' };

// Run before the first paint: internal Home navigation must never flash the intro.
const welcomeNavigationGuard = welcomePolicy.navigationScript();

export default async function RootLayout({ children }) {
  const pathname = (await headers()).get('x-hotel-pathname') || '/';
  const page = getSitePage(pathname);
  const home = page?.key === 'home' && management.getSiteAdmin().read().settings.welcomeEnabled;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script id="welcome-navigation-guard" dangerouslySetInnerHTML={{ __html: welcomeNavigationGuard }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/styles.css?v=next-13" />
        <link rel="stylesheet" href="/themes.css?v=next-20" />
        <link rel="stylesheet" href="/animations.css?v=next-8" />
      </head>
      <body className={home ? 'welcome-active home-page' : 'inner-page'} data-page={page?.activeKey || 'home'}>
        {children}
      </body>
    </html>
  );
}
