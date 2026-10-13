const QRCode = require('qrcode');
const { getSiteAdmin } = require('./site-admin');

const TRIPADVISOR_URL = 'https://www.tripadvisor.com/Hotel_Review-g1203015-d32710014-Reviews-Hotel_Ganesh_Himal_Lukla-Lukla_Sagarmatha_Zone_Eastern_Region.html';

function tripAdvisorQrSvg() {
  return QRCode.toString(getSiteAdmin().read().settings.tripadvisorUrl, {
    type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 320,
    color: { dark: '#000000', light: '#ffffff' }
  });
}

function tripAdvisorMarkup(TRIPADVISOR_URL = getSiteAdmin().read().settings.tripadvisorUrl) {
  return `<section class="tripadvisor-section section" id="tripadvisor" aria-labelledby="tripadvisor-title"><div class="tripadvisor-copy"><p class="eyebrow">Share your mountain stay</p><h2 id="tripadvisor-title">Find us on <em>TripAdvisor.</em></h2><p>Read traveller experiences or share your stay at Hotel Ganesh Himal Lukla. Scan the QR code with your phone camera to open our TripAdvisor hotel page directly.</p><a class="button button-dark" href="${TRIPADVISOR_URL}" target="_blank" rel="noopener noreferrer">Open TripAdvisor <span aria-hidden="true">↗</span></a><p class="tripadvisor-note">TripAdvisor reviews are submitted and managed on TripAdvisor.</p></div><figure class="tripadvisor-qr"><a href="${TRIPADVISOR_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open Hotel Ganesh Himal Lukla on TripAdvisor"><img src="/tripadvisor-qr.svg" width="320" height="320" alt="Scan to open Hotel Ganesh Himal Lukla on TripAdvisor" loading="lazy"></a><figcaption>Scan to visit TripAdvisor<br><span>Hotel Ganesh Himal · Lukla</span></figcaption><a class="text-link" href="/tripadvisor-qr.svg?download=1" download="hotel-ganesh-himal-tripadvisor-qr.svg">Download QR code <span aria-hidden="true">↓</span></a></figure></section>`;
}

module.exports = { TRIPADVISOR_URL, tripAdvisorQrSvg, tripAdvisorMarkup };
