const fs = require('fs');
const path = require('path');
const contentMarkup = require('./lib/content');
const { getBackend } = require('./lib/backend');
const { guestReviewsMarkup } = require('./lib/reviews');
const { tripAdvisorMarkup } = require('./lib/tripadvisor');
const { getSiteAdmin } = require('./lib/site-admin');
const cheerio = require('cheerio');
const ROOT_DIR = process.cwd();

function readHotelData() {
  return getSiteAdmin().read().hotelData;
}

const pageInfo = {
  home: { path: '/', title: 'Hotel Ganesh Himal | Lukla, Nepal', description: 'A warm mountain stay in Lukla. Explore our rooms, hotel spaces, and local hospitality at the gateway to Everest.' },
  story: { path: '/our-story', title: 'Our Story', eyebrow: 'A mountain home, a personal welcome', heading: 'A little closer to <em>feeling at home.</em>', description: 'Get to know Hotel Ganesh Himal, your welcoming base before and after a journey into the Everest region.', image: 'full%20hotel%20photo.jpg', section: 'story' },
  rooms: { path: '/rooms', title: 'Rooms & Stays', eyebrow: 'Unpack. Unwind. Start again.', heading: 'Find your own <em>mountain pause.</em>', description: 'Choose a Normal, Deluxe, or Super Deluxe room for your Lukla stay, with room rates of $25, $35, and $50 USD. Speak directly with our team to confirm availability.', image: 'maindeluxe50dollar.jpg', section: 'rooms' },
  lukla: { path: '/lukla', title: 'Explore Lukla', description: 'Discover Lukla’s airport, town, and trail connections. Plan your arrival and find a warm base at Hotel Ganesh Himal.' },
  amenities: { path: '/amenities', title: 'Amenities & Dining', eyebrow: 'The comforts that count', heading: 'A little warmth. <em>A lot of welcome.</em>', description: 'From hot meals to helpful local guidance, discover the simple comforts that make a mountain stay feel easier.', image: 'dining-enhanced.webp', section: 'amenities' },
  gallery: { path: '/gallery', title: 'Hotel Gallery', eyebrow: 'Look around before you arrive', heading: 'Our mountain home, <em>in the frame.</em>', description: 'Explore photographs of Hotel Ganesh Himal, its rooms, dining areas, and shared spaces. Open any photograph for the full view.', image: 'full%20hotel%20photo.jpg', section: 'gallery' },
  contact: { path: '/contact', title: 'Contact & Booking', eyebrow: 'Let’s start a conversation', heading: 'Your next stay <em>starts with hello.</em>', description: 'Call or WhatsApp our hotel team, find us in Lukla, or share private feedback about your stay.', image: 'lukla-airport.jpg', section: 'booking' },
  credits: { path: '/photo-credits', title: 'Photo Credits', description: 'Photographic sources, creator credits, and image licence information for Hotel Ganesh Himal Lukla.' },
  privacy: { path: '/privacy', title: 'Privacy & Guest Data', description: 'How Hotel Ganesh Himal Lukla handles reservation requests, guest feedback, newsletter subscriptions, and administrator access.' }
};

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function pageHero(info, currentPath) {
  return `<section class="page-hero"><div class="page-hero-copy"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span>${currentPath.startsWith('/rooms/') ? '<a href="/rooms">Rooms</a><span aria-hidden="true">/</span>' : ''}<span aria-current="page">${escapeHtml(info.title)}</span></nav><p class="eyebrow light">${escapeHtml(info.eyebrow)}</p><h1>${info.heading}</h1><p>${escapeHtml(info.description)}</p></div><div class="page-hero-photo"><img src="/images/${info.image}" alt="${escapeHtml(info.title)} at Hotel Ganesh Himal"><span>Hotel Ganesh Himal · Lukla, Nepal</span></div></section>`;
}

function callToAction() {
  return `<section class="page-cta section"><div><p class="eyebrow">Make yourself at home</p><h2>Ready for your <em>Lukla chapter?</em></h2><p>Tell us your dates and group size. Our team will help you plan your stay.</p></div><a class="button button-dark" href="/contact#booking">Talk to our team <span>↗</span></a></section>`;
}

function homeExplore(data) {
  const cards = [
    ['rooms', 'normal25dollar.jpg', '01', 'A restful night', `${data.rooms.map(room => `${room.name}: ${room.price}`).join(' · ')}.`, 'Explore rooms'],
    ['story', 'full%20hotel%20photo.jpg', '02', 'A mountain welcome', 'Meet your home at the Everest gateway.', 'Our story'],
    ['amenities', 'dining-card-refined.webp', '03', 'Simple comforts', 'Warm meals, shared spaces, and local advice.', 'Amenities & dining'],
    ['lukla', 'lukla-airport.jpg', '04', 'Beyond our doorstep', 'Get to know the starting point of your trek.', 'Explore Lukla']
  ];
  return `<section class="home-explore section" id="explore"><div class="section-heading"><div><p class="eyebrow">A stay with more to discover</p><h2>Find your <em>way here.</em></h2></div><p>Take a closer look at our rooms, our mountain home, and the adventures around us.</p></div><div class="explore-grid">${cards.map(([key, image, number, title, text, label]) => `<a class="explore-card" href="${pageInfo[key].path}"><div class="explore-image"><img src="/images/${image}" alt="${escapeHtml(title)}" loading="lazy"><span>${number}</span></div><div class="explore-body"><h3>${title}</h3><p>${text}</p><span>${label}<i>↗</i></span></div></a>`).join('')}</div><a class="text-link" href="/gallery">See the hotel gallery <span>↗</span></a></section>`;
}

function stayGuide(data) {
  const room = data.rooms.find(room => room.id === 'super-deluxe') || data.rooms.find(room => /\$\s*50\b/.test(room.price)) || data.rooms[data.rooms.length - 1];
  const featured = room ? `<article class="stay-guide-featured"><span>01</span>${room.image ? `<img class="stay-guide-room-photo" src="${escapeHtml(room.image)}" alt="${escapeHtml(room.name)} at ${escapeHtml(data.hotel.name)}" loading="lazy" width="800" height="600">` : ''}<h3>${escapeHtml(room.name)}</h3><strong class="stay-guide-room-price">${escapeHtml(room.price)}</strong><p>${escapeHtml(room.occupancy)} · ${escapeHtml(room.beds)}<br>${escapeHtml(room.size)}</p><a class="text-link" href="/rooms/${encodeURIComponent(room.id)}">Explore this room <span aria-hidden="true">↗</span></a></article>` : '';
  return `<section class="stay-guide section"><div><p class="eyebrow">Find your mountain comfort</p><h2>A stay made <em>simple.</em></h2></div><div class="stay-guide-grid">${featured}<article><span>02</span><h3>Rates & availability</h3><p>Rates and room availability are confirmed directly with the hotel. Share your dates and number of guests by phone or WhatsApp.</p></article><article><span>03</span><h3>Your group, your stay</h3><p>Travelling with family or trekking partners? Tell us your room preferences so we can help you plan.</p></article></div></section>`;
}

function roomComparison(rooms) {
  return `<section class="room-comparison section" id="compare-rooms" aria-labelledby="room-comparison-title"><div class="section-heading"><div><p class="eyebrow">Choose your mountain comfort</p><h2 id="room-comparison-title">Compare our <em>rooms.</em></h2></div><p>Compare room features and listed prices. Our hotel team confirms the final rate, availability, and arrangements for your stay.</p></div><div class="room-comparison-scroll" role="region" aria-label="Room comparison table" tabindex="0"><table><caption class="sr-only">Room features and listed prices</caption><thead><tr><th scope="col">Room</th><th scope="col">Listed price</th><th scope="col">Guests</th><th scope="col">Beds</th><th scope="col">Room style</th><th scope="col">Enquire</th></tr></thead><tbody>${rooms.map(room=>`<tr><th scope="row">${escapeHtml(room.name)}</th><td>${escapeHtml(room.price)}</td><td>${escapeHtml(room.occupancy)}</td><td>${escapeHtml(room.beds)}</td><td>${escapeHtml(room.size)}</td><td><a href="/contact?room=${encodeURIComponent(room.id)}#reservation-requests">Request this room ↗</a></td></tr>`).join('')}</tbody></table></div></section>`;
}

function roomDetail(room, hotel) {
  const phone = hotel.phone.replace(/\s/g, '');
  const whatsapp = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste! I would like to enquire about the ${room.name} at Hotel Ganesh Himal. My dates and group size are: `)}`;
  return `<section class="room-detail section"><div class="room-detail-visual">${room.image ? `<img src="${escapeHtml(room.image)}" alt="${escapeHtml(room.name)} at Hotel Ganesh Himal">` : `<div class="room-detail-note"><span>Hotel Ganesh Himal · Lukla</span><h2>Your room.<br>Your pace.<br><em>Your mountain pause.</em></h2><p>Ask our team for current photographs and room arrangements.</p></div>`}</div><div class="room-detail-copy"><p class="eyebrow">Rest before the next trail day</p><h2>${escapeHtml(room.name)}</h2><p>${escapeHtml(room.description)}</p><dl class="room-detail-specs"><div><dt>Guests</dt><dd>${escapeHtml(room.occupancy)}</dd></div><div><dt>Bedding</dt><dd>${escapeHtml(room.beds)}</dd></div><div><dt>Room style</dt><dd>${escapeHtml(room.size)}</dd></div><div><dt>Rate</dt><dd>${escapeHtml(room.price)}</dd></div></dl><p>Speak with our hotel team to confirm availability, rates, and room details for your dates.</p><div class="room-detail-actions"><a class="button button-dark" href="${escapeHtml(whatsapp)}" target="_blank" rel="noreferrer">Enquire on WhatsApp ↗</a><a class="button button-call-light" href="tel:${phone}">Call the hotel ↗</a></div><a class="text-link" href="/rooms">← All room options</a></div></section>`;
}

function getPageDetails(pathname) {
  const key = Object.keys(pageInfo).find(name => pageInfo[name].path === pathname);
  if (!key && !pathname.startsWith('/rooms/')) return null;
  const data = readHotelData();
  const room = pathname.startsWith('/rooms/') ? data.rooms.find(item => `/rooms/${item.id}` === pathname) : null;
  if (!key && !room) return null;
  const activeKey = room ? 'rooms' : key;
  const info = room ? { ...pageInfo.rooms, title: room.name, heading: `${escapeHtml(room.name)}.<br><em>Rest, your way.</em>`, description: room.description, image: room.image ? room.image.replace(/^\/?images\//, '') : 'full%20hotel%20photo.jpg' } : { ...pageInfo[key] };
  if (key === 'rooms') info.description = `Explore ${data.rooms.map(item => `${item.name} (${item.price})`).join(', ')}. Speak directly with our team to confirm availability.`;
  if (key === 'home') { info.title = `${data.hotel.name} | ${data.hotel.location}`; info.description = data.hotel.description; }
  if (key) for (const [field, value] of Object.entries(getSiteAdmin().read().settings.pageMeta[key] || {})) if (value) info[field] = field === 'heading' ? escapeHtml(value) : field === 'image' ? value.replace(/^\/images\//, '') : value;
  return { key, data, room, activeKey, info, pathname, title: key === 'home' ? info.title : `${info.title} | Hotel Ganesh Himal Lukla` };
}

function renderPage(pathname) {
  const details = getPageDetails(pathname);
  if (!details) return null;
  const { key, data, room, activeKey, info } = details;
  const manager = getSiteAdmin();
  const settings = manager.read().settings;
  let html = manager.template('site').html;
  const sections = [...html.matchAll(/<section\b[\s\S]*?<\/section>/g)].map(match => match[0]);
  const section = name => sections.find(markup => new RegExp(`class="${name}(?: |")`).test(markup)) || '';
  let content;
  if (room) content = pageHero(info, pathname) + roomDetail(room, data.hotel) + stayGuide(data) + callToAction();
  else if (key === 'home') content = section('hero') + homeExplore(data) + callToAction() + section('newsletter');
  else if (key === 'lukla') content = manager.template('lukla').html.replace(/^[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '') + callToAction();
  else if (key === 'credits') content = fs.readFileSync(path.join(ROOT_DIR, 'views', 'photo-credits.html'), 'utf8');
  else if (key === 'privacy') content = manager.template('privacy').html.replace(/^[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '');
  else {
    content = pageHero(info, pathname) + section(info.section === 'booking' ? 'booking-section' : info.section);
    if (key === 'rooms') {
      const filters = `<div class="room-filters" role="group" aria-label="Filter room categories"><button type="button" data-room-filter="all" aria-pressed="true">All rooms</button>${data.rooms.map(room => `<button type="button" data-room-filter="${escapeHtml(room.id)}" aria-pressed="false">${escapeHtml(room.name)}</button>`).join('')}</div><p class="sr-only" id="room-filter-status" role="status"></p>`;
      content = content.replace('<div class="room-grid"', filters + '<div class="room-grid"');
      content += roomComparison(data.rooms) + stayGuide(data) + section('booking-faq');
    }
    if (key === 'amenities') content += section('food-banner');
    if (key === 'contact') content += section('booking-faq') + section('location-section') + (settings.feedbackEnabled ? section('feedback-section') : '') + tripAdvisorMarkup(settings.tripadvisorUrl) + (settings.reviewsEnabled ? guestReviewsMarkup(getBackend().getPublicReviews()) : '');
    else content += callToAction();
  }
  html = html.replace(/<main id="main">[\s\S]*?<\/main>/, `<main id="main">${content}</main>`);
  html = html.replace('<body class="welcome-active">', `<body class="${key === 'home' ? 'welcome-active home-page' : 'inner-page'}" data-page="${activeKey}">`);
  if (key !== 'home' || !settings.welcomeEnabled) {
    html = html.replace(/  <div class="welcome-screen"[\s\S]*?(?=  <a class="skip-link")/, '');
    html = html.replace('<button type="button" data-replay-welcome>Replay welcome</button>', '<a href="/?welcome=1">Hotel welcome</a>');
  }
  html = html.replace(/<title>.*?<\/title>/, `<title>${key === 'home' ? info.title : `${escapeHtml(info.title)} | Hotel Ganesh Himal Lukla`}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(info.description)}">`);
  html = html.replace(/src="images\//g, 'src="/images/');
  const destinations = { '#story': '/our-story', '#rooms': '/rooms', '#experience': '/lukla', '#amenities': '/amenities', '#gallery': '/gallery', '#contact': '/contact', '#booking': key === 'contact' ? '#booking' : '/contact#booking', '#feedback': key === 'contact' ? '#feedback' : '/contact#feedback' };
  html = html.replace(/href="(#[a-z-]+)"/g, (match, anchor) => destinations[anchor] ? `href="${destinations[anchor]}"` : match);
  html = html.replace(/(class="brand(?: brand-light)?" href=")[^"]*"/g, '$1/"');
  const links = [['home', 'Home'], ['story', 'Our Story'], ['rooms', 'Rooms'], ['lukla', 'Lukla'], ['amenities', 'Amenities'], ['gallery', 'Gallery'], ['contact', 'Contact']];
  html = html.replace(/<div class="nav-links" id="nav-links">[\s\S]*?<\/div>/, `<div class="nav-links" id="nav-links">${links.map(([name, label]) => `<a href="${pageInfo[name].path}"${activeKey === name ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</div>`);
  if (key === 'home') html = html.replace('class="scroll-cue" href="/our-story"', 'class="scroll-cue" href="#explore"');
  html = html.replace('<div class="room-grid" id="room-grid" aria-live="polite"></div>', `<div class="room-grid" id="room-grid" aria-live="polite" data-server-rendered>${contentMarkup.roomsMarkup(data.rooms, data.hotel.phone)}</div>`);
  html = html.replace('<div class="amenity-grid" id="amenity-grid"></div>', `<div class="amenity-grid" id="amenity-grid" data-server-rendered>${contentMarkup.amenitiesMarkup(data.amenities, data.hotel.phone)}</div>`);
  html = html.replace('<div class="gallery-grid" id="gallery-grid"></div>', `<div class="gallery-grid" id="gallery-grid" data-server-rendered>${contentMarkup.galleryMarkup(data.gallery)}</div>`);
  html = html.replace(/(<a\b[^>]*data-whatsapp[^>]*href=")[^"]*"/g, `$1${escapeHtml(contentMarkup.whatsappUrl(data.hotel.phone))}"`);
  html = html.replace('<span id="year"></span>', `<span id="year">${new Date().getFullYear()}</span>`);
  const $ = cheerio.load(html);
  $('[data-description]').text(data.hotel.description);
  $('[data-address]').text(data.hotel.address);
  $('[data-phone]').each((index, item) => { const phone = data.hotel.phones[Number($(item).attr('data-phone')) || 0]; if (!phone) { $(item).remove(); return; } $(item).text(phone).attr('href', `tel:${phone.replace(/\s/g, '')}`); });
  $('[data-call]').attr('href', `tel:${data.hotel.phone.replace(/\s/g, '')}`);
  $('[data-email]').each((index, item) => { $(item).attr('href', `mailto:${data.hotel.email}`); if (!$(item).closest('.topline').length) $(item).text(data.hotel.email); });
  $('.brand strong').text(data.hotel.shortName);
  $('#stay-enquiry-form').attr('data-hotel-name', data.hotel.name);
  for (const item of data.rooms) $('#stay-room').append($('<option>').attr('value', item.id).attr('data-room-name', item.name).attr('data-room-price', item.price).text(`${item.name} · ${item.price}`));
  $('.room-card').each((index, card) => { $(card).find('.room-enquire').attr('href',`/contact?room=${encodeURIComponent(data.rooms[index].id)}#booking`).removeAttr('target rel').text('Choose dates & enquire ↗'); });
  $('.room-comparison a').each((index, link) => { $(link).attr('href',`/contact?room=${encodeURIComponent(data.rooms[index].id)}#booking`).text('Enquire about this room ↗'); });
  if (room) $('.room-detail-actions').append($('<a>').addClass('button button-call-light').attr('href',`/contact?room=${encodeURIComponent(room.id)}#booking`).text('Plan dates for this room ↗'));
  if (key==='privacy') { $('[data-privacy-email]').attr('href',`mailto:${data.hotel.email}`).text(data.hotel.email); }
  $('.hero-art').css('background-image', `url("${settings.homeHeroImage}")`);
  $('.welcome-photo').css('background-image', `linear-gradient(rgba(9,37,32,.32), rgba(9,37,32,.52)), url("${settings.welcomeImage}")`).attr('data-welcome-image', settings.welcomeImage);
  if (settings.homeHeroImage !== '/images/lukla-airport.jpg') $('.hotel-hotspot').remove();
  $('#booking-contacts .contact-card').each((index, item) => { const phone = data.hotel.phones[index]; if (!phone) { $(item).remove(); return; } $(item).find('h4').text(phone); $(item).find('.contact-call').attr('href', `tel:${phone.replace(/\s/g, '')}`); $(item).find('.copy-phone').attr('data-copy-phone', phone).attr('aria-label', `Copy ${phone}`); $(item).find('[data-booking-whatsapp]').attr('href', contentMarkup.whatsappUrl(phone)); });
  if (room?.image?.startsWith('/media/')) $('.page-hero-photo img').attr('src', room.image);
  if (!settings.newsletterEnabled) $('.newsletter').remove();
  if (!settings.weatherEnabled) $('.weather-card').remove();
  if (!settings.welcomeEnabled) { $('body').removeClass('welcome-active'); $('[data-replay-welcome], a[href="/?welcome=1"]').remove(); }
  if (!settings.feedbackEnabled) $('a[href$="#feedback"]').remove();
  $('.location-copy a').attr('href', settings.mapsUrl);
  $('.location-map iframe').attr('src', settings.mapsEmbedUrl);
  return $.html();
}

function getPagePaths() {
  return [...Object.values(pageInfo).map(page => page.path), ...readHotelData().rooms.map(room => `/rooms/${room.id}`)];
}

module.exports = { renderPage, getPageDetails, getPagePaths, readHotelData, pageInfo };
