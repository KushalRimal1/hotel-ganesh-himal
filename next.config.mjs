import site from './pages.js';

const config = {
  poweredByHeader: false,
  experimental: { cpus: 1 },
  outputFileTracingIncludes: { '/*': ['./views/**/*.html', './data/hotel.json'] },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      ...Object.entries({ 'mountain-twin': 'normal-room', 'himalayan-double': 'deluxe-room', 'family-basecamp': 'super-deluxe' }).flatMap(([oldId, newId]) => [
        { source: `/rooms/${oldId}`, destination: `/rooms/${newId}`, permanent: true },
        { source: `/rooms/${oldId}.html`, destination: `/rooms/${newId}`, permanent: true }
      ]),
      ...site.getBuildPagePaths().filter(path => path !== '/').map(path => ({ source: `${path}.html`, destination: path, permanent: true }))
    ];
  },
  async headers() {
    return [
      ...['styles.css', 'themes.css', 'animations.css', 'admin.css', 'script.js', 'stay-enquiry.js', 'gallery-policy.js', 'hotspot.js', 'motion.js'].map(file => ({ source: `/${file}`, headers: [{ key: 'Cache-Control', value: 'no-cache' }] })),
      { source: '/admin/:path*', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" }, { key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'Vary', value: 'Cookie' }] }
    ];
  }
};

export default config;
