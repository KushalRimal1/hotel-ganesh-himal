const iconMap = {
  bed: '<path d="M6 39V18M42 39V25a6 6 0 0 0-6-6H21v13M6 32h36M9 23h9v9H9Z"/><path class="icon-accent-stroke" d="M6 36h36M12 16h5"/>',
  wifi: '<path class="icon-wave wave-outer" d="M6 18a28 28 0 0 1 36 0"/><path class="icon-wave wave-middle" d="M12 25a19 19 0 0 1 24 0"/><path class="icon-wave wave-inner" d="M18 32a9 9 0 0 1 12 0"/><circle class="icon-accent-fill" cx="24" cy="39" r="2.4"/>',
  coffee: '<path class="icon-steam steam-one" d="M17 14c-5-5 5-5 0-10"/><path class="icon-steam steam-two" d="M25 14c-5-5 5-5 0-10"/><path d="M10 20h25v10a11 11 0 0 1-11 11h-3a11 11 0 0 1-11-11Z"/><path class="icon-accent-stroke" d="M35 23h3a5 5 0 0 1 0 10h-3"/><path d="M7 44h33"/>',
  meals: '<circle cx="24" cy="26" r="10"/><circle class="icon-accent-stroke" cx="24" cy="26" r="5.5"/><path d="M7 12v11a3 3 0 0 0 6 0V12M10 12v29M39 12c-5 5-6 12 0 15v14M39 12v15"/>',
  helipad: '<circle class="icon-pad-ring" cx="24" cy="28" r="15"/><path class="icon-accent-stroke" d="M19 20v16M29 20v16M19 28h10"/><path class="icon-rotor" d="M10 7h28M24 4v6"/>',
  booking: '<path d="M41 23a17 17 0 0 1-17 17c-3 0-6-1-9-2l-8 4 3-9a17 17 0 1 1 31-10Z"/><g transform="translate(12 10)"><path class="icon-accent-stroke" d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3c-1 5-4 5-8 3C6 17 2 11 3 7c0-2 2-4 4-4Z"/></g>',
  shower: '<path d="M9 39V12a7 7 0 0 1 12-5l7 7"/><path class="icon-accent-stroke" d="m23 19 7-7 8 8-7 7Z"/><path class="icon-drop drop-one" d="m23 29-3 4"/><path class="icon-drop drop-two" d="m30 32-3 4"/><path class="icon-drop drop-three" d="m37 30-3 4"/><path d="M5 42h10"/>',
  bag: '<g class="icon-suitcase"><rect x="11" y="13" width="26" height="29" rx="5"/><path d="M19 13V8a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v5"/><path class="icon-accent-stroke" d="M18 22v11M30 22v11"/><path d="M17 42v3M31 42v3"/></g>',
  plane: '<path class="icon-flight-trail" d="M4 37h12M7 42h6"/><g class="icon-airplane"><path d="m8 24 13 2L34 9c2-3 6-5 7-4 2 2 0 5-2 8L27 29l4 12-4 3-8-12-8 2-4-5Z"/><path class="icon-accent-stroke" d="m21 26 6 3"/></g>',
  info: '<circle cx="24" cy="25" r="18"/><path d="M24 3v4M24 43v3M2 25h4M42 25h4"/><g class="icon-compass-needle"><path class="icon-accent-fill" d="m31 16-4 12-10 6 4-12Z"/><path d="m21 22 6 6"/></g>'
};

const amenityActions = { wifi: 'Ask about connectivity', coffee: 'Explore meal choices', meals: 'Explore the daily menu', helipad: 'Ask about the helipad', booking: 'Plan your stay', shower: 'Ask about facilities', bag: 'Arrange luggage support', plane: 'Plan your arrival', info: 'Get local advice' };

const state = { data: null, reviewIndex: 0 };
let activeGalleryPhotos = [];
let activeGalleryIndex = null;

const fallbackData = {
  hotel: {
    name: 'Hotel Ganesh Himal',
    description: 'A warm mountain stay in Lukla for trekkers, families, and travellers beginning or ending their Himalayan journey.',
    phone: '+977 9841425409',
    phones: ['+977 9841425409', '+977 9851039770'],
    email: 'hello@hotelganeshhimallukla.com',
    address: 'Lukla, Khumbu Pasang Lhamu, Solukhumbu, Nepal'
  },
  rooms: [
    { id: 'normal-room', name: 'Normal Room', description: 'A welcoming twin room with warm wood finishes, soft bedding, and a curtained window. A comfortable, budget-friendly base to rest before the trail or unwind after a day in the Khumbu.', occupancy: '2 guests', beds: '2 single beds', size: 'Simple comfort', price: '$25 USD', image: '/images/normal25dollar.jpg' },
    { id: 'deluxe-room', name: 'Deluxe Room', description: 'A cosy twin room with wood-panelled detailing, patterned walls, bedside lighting, and a bright, curtained window. Thoughtful finishing touches create a relaxed setting for a restful stay in Lukla.', occupancy: '2 guests', beds: '2 single beds', size: 'Deluxe comfort', price: '$35 USD', image: '/images/35dollardeluxe.jpg' },
    { id: 'super-deluxe', name: 'Super Deluxe Room', description: 'Wake up to a mountain outlook in a beautifully wood-lined twin room. Soft bedding, warm bedside lighting, and a colourful traditional rug make this an inviting place to slow down and enjoy your Himalayan stay.', occupancy: '2 guests', beds: '2 single beds', size: 'Mountain outlook', price: '$50 USD', image: '/images/maindeluxe50dollar.jpg' }
  ],
  amenities: [
    { icon: 'wifi', title: 'Reliable Wi-Fi', text: 'Stay connected and plan the next part of your journey.' },
    { icon: 'meals', title: 'Delicious Breakfast, Lunch & Dinner', text: 'Enjoy delicious breakfast, lunch, and dinner in our welcoming dining hall. Ask our team about the daily menu.' },
    { icon: 'shower', title: 'Hot Showers', text: 'A welcome refresh after a long day on the trail.' },
    { icon: 'bag', title: 'Luggage Support', text: 'Ask our team about safe short-term luggage storage.' },
    { icon: 'plane', title: 'Airport Nearby', text: 'Conveniently located for Lukla airport arrivals and departures.' },
    { icon: 'helipad', title: 'Nearby Helipad', text: 'Convenient access to a nearby helipad. Ask our team for directions and local arrival information.' },
    { icon: 'info', title: 'Local Guidance', text: 'Practical help for weather, routes, porters, and onward plans.' },
    { icon: 'bed', title: 'Comfortable Twin Rooms', text: 'Rest in welcoming wood-lined rooms with twin beds and soft bedding before or after your journey through the Khumbu.' }
  ],
  experiences: [
    { number: '01', title: 'Land in Lukla', text: 'Arrive, settle in, and take a breath before the trail begins.' },
    { number: '02', title: 'Walk the Khumbu', text: 'Set out toward Phakding and the legendary Everest region.' },
    { number: '03', title: 'Return & Restore', text: 'Come back to a hot meal, warm welcome, and a comfortable bed.' }
  ],
  testimonials: [],
  gallery: ['/images/dining-enhanced.webp', '/images/maindeluxe50dollar.jpg', '/images/washroom-clean.webp', '/images/fulldining-enhanced.webp', '/images/entryyy.jpeg']
};

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = String(value || '');
  return element.innerHTML;
}

const welcomeScreen = document.querySelector('#welcome-screen');
if (welcomeScreen) {
  try {
    const skip = window.HotelWelcomeNavigation?.decision.show === false;
    if (skip) {
      welcomeScreen.classList.add('is-hidden');
      document.body.classList.remove('welcome-active');
      document.documentElement.classList.remove('welcome-returning');
      document.dispatchEvent(new CustomEvent('hotel:welcome-closed'));
    }
  } catch { /* A fresh welcome still works if navigation information is unavailable. */ }
  if (new URLSearchParams(location.search).get('welcome') === '1') {
    const url = new URL(location.href);
    url.searchParams.delete('welcome');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
}

let welcomeRun = 0;
async function prepareWelcome() {
  if (!welcomeScreen || welcomeScreen.classList.contains('is-hidden')) return;
  const run = ++welcomeRun;
  const enter = welcomeScreen.querySelector('.welcome-enter');
  enter.disabled = true;
  const photo = new Image();
  const photoReady = new Promise(resolve => {
    photo.onload = photo.onerror = resolve;
    photo.src = welcomeScreen.querySelector('[data-welcome-image]')?.dataset.welcomeImage || '/images/full%20hotel%20photo.jpg';
    if (photo.complete && photo.naturalWidth) resolve();
  });
  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load('400 48px "Newsreader"'), document.fonts.load('500 16px "DM Sans"')]).catch(() => {})
    : Promise.resolve();
  let timeout;
  await Promise.race([Promise.all([photoReady, fontsReady]), new Promise(resolve => { timeout = setTimeout(resolve, 2500); })]);
  clearTimeout(timeout);
  if (document.hidden) await new Promise(resolve => {
    function onVisible() { if (!document.hidden) { document.removeEventListener('visibilitychange', onVisible); resolve(); } }
    document.addEventListener('visibilitychange', onVisible);
  });
  if (run !== welcomeRun || welcomeScreen.classList.contains('is-hidden') || welcomeScreen.classList.contains('is-leaving')) return;
  welcomeScreen.classList.add('is-ready');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) enter.disabled = false;
}

function closeWelcome() {
  if (!welcomeScreen || welcomeScreen.classList.contains('is-leaving')) return;
  welcomeRun += 1;
  try { sessionStorage.setItem('hotel-welcome-seen', 'true'); } catch { /* Optional preference only. */ }
  welcomeScreen.classList.add('is-leaving');
  window.setTimeout(() => {
    welcomeScreen.classList.add('is-hidden');
    welcomeScreen.classList.remove('is-leaving');
    document.body.classList.remove('welcome-active');
    document.dispatchEvent(new CustomEvent('hotel:welcome-closed'));
  }, 900);
}

function replayWelcome() {
  if (!welcomeScreen) return;
  document.documentElement.classList.remove('welcome-returning');
  welcomeScreen.classList.add('is-resetting');
  welcomeScreen.classList.remove('is-hidden', 'is-leaving', 'is-ready', 'is-suspended');
  document.body.classList.add('welcome-active');
  void welcomeScreen.offsetWidth;
  welcomeScreen.classList.remove('is-resetting');
  welcomeScreen.querySelector('.welcome-skip').focus();
  void prepareWelcome();
}

welcomeScreen?.querySelector('.welcome-enter').addEventListener('animationend', event => {
  if (event.animationName === 'welcome-rise' && welcomeScreen.classList.contains('is-ready')) event.currentTarget.disabled = false;
});
if (welcomeScreen && !welcomeScreen.classList.contains('is-hidden')) void prepareWelcome();
document.addEventListener('visibilitychange', () => {
  if (welcomeScreen && !welcomeScreen.classList.contains('is-hidden')) welcomeScreen.classList.toggle('is-suspended', document.hidden);
});
document.addEventListener('hotel:welcome-restored', event => {
  if (!welcomeScreen) return;
  if (event.detail.show) replayWelcome();
  else {
    welcomeRun += 1;
    welcomeScreen.classList.add('is-hidden');
    document.body.classList.remove('welcome-active');
    document.documentElement.classList.remove('welcome-returning');
    document.dispatchEvent(new CustomEvent('hotel:welcome-closed'));
  }
});
document.querySelectorAll('[data-close-welcome]').forEach(button => button.addEventListener('click', closeWelcome));
document.querySelector('[data-replay-welcome]')?.addEventListener('click', replayWelcome);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && welcomeScreen && !welcomeScreen.classList.contains('is-hidden')) closeWelcome();
});

function imageOrPlaceholder(image, label, extraClass = '') {
  if (image) return `<img src="${escapeHtml(image)}" alt="${escapeHtml(label)}" data-fallback-label="${escapeHtml(label)}" loading="lazy">`;
  return `<div class="photo-placeholder ${extraClass}"><span>Photo on request</span><small>${escapeHtml(label)}</small></div>`;
}

function bindImageFallbacks() {
  document.querySelectorAll('img[data-fallback-label]').forEach(image => {
    image.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'photo-placeholder';
      placeholder.innerHTML = `<span>Photo on request</span><small>${escapeHtml(image.dataset.fallbackLabel)}</small>`;
      image.replaceWith(placeholder);
    }, { once: true });
  });
}

async function loadHotel() {
  try {
    const response = await fetch('/api/hotel');
    if (!response.ok) throw new Error('Could not load hotel details.');
    state.data = await response.json();
  } catch (error) {
    console.warn('Using built-in hotel details because the API is unavailable.', error);
    state.data = fallbackData;
  }
  const { hotel, rooms, amenities, experiences, testimonials, gallery } = state.data;

  const description = document.querySelector('[data-description]');
  if (description) description.textContent = hotel.description;
  document.querySelectorAll('[data-phone]').forEach(link => {
    const phone = (hotel.phones || [hotel.phone])[Number(link.dataset.phone) || 0];
    if (!phone) { link.remove(); return; }
    link.textContent = phone;
    link.href = `tel:${phone.replace(/\s/g, '')}`;
  });
  const phones = hotel.phones || [hotel.phone];
  const whatsappUrl = (phone, message = 'Namaste! I would like to enquire about a stay at Hotel Ganesh Himal. My dates and group size are: ') => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  document.querySelectorAll('[data-whatsapp]').forEach(link => { link.href = whatsappUrl(phones[0]); });
  document.querySelectorAll('[data-call]').forEach(link => { link.href = `tel:${phones[0].replace(/\s/g, '')}`; });
  document.querySelectorAll('#booking-contacts .contact-card').forEach((card, index) => {
    const phone = phones[index];
    if (!phone) { card.remove(); return; }
    card.querySelector('h4').textContent = phone;
    card.querySelector('.contact-call').href = `tel:${phone.replace(/\s/g, '')}`;
    card.querySelector('.copy-phone').dataset.copyPhone = phone;
    card.querySelector('.copy-phone').setAttribute('aria-label', `Copy ${phone}`);
  });
  updateBookingEnquiry();
  document.querySelectorAll('[data-email]').forEach(link => {
    link.textContent = link.closest('.topline') ? 'Email us' : hotel.email;
    link.href = `mailto:${hotel.email}`;
  });
  document.querySelectorAll('[data-address]').forEach(item => { item.textContent = hotel.address; });

  const roomGrid = document.querySelector('#room-grid');
  if (roomGrid && !roomGrid.hasAttribute('data-server-rendered')) roomGrid.innerHTML = rooms.map((room, index) => `
    <article class="room-card reveal" data-room-capacity="${room.occupancy === '2 guests' ? 'two' : 'group'}" data-room-category="${escapeHtml(room.id)}">
      <div class="room-image">${imageOrPlaceholder(room.image, room.name)}<span class="room-tag">Room ${String(index + 1).padStart(2, '0')}</span></div>
      <div class="room-body">
        <h3>${escapeHtml(room.name)}</h3>
        <p>${escapeHtml(room.description)}</p>
        <div class="room-meta"><span>♙ ${escapeHtml(room.occupancy)}</span><span>▱ ${escapeHtml(room.beds)}</span><span>◇ ${escapeHtml(room.size)}</span></div>
        <div class="room-footer"><strong>${escapeHtml(room.price)}</strong><a href="/rooms/${encodeURIComponent(room.id)}">View room ↗</a></div>
        <a class="room-enquire" href="${escapeHtml(whatsappUrl(phones[0], `Namaste! I am interested in the ${room.name} at Hotel Ganesh Himal. My dates and group size are: `))}" target="_blank" rel="noreferrer">Enquire on WhatsApp ↗</a>
      </div>
    </article>`).join('');

  const journeyList = document.querySelector('#journey-list');
  if (journeyList) journeyList.innerHTML = experiences.map(item => `<li><span class="num">${escapeHtml(item.number)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></div></li>`).join('');
  const amenityGrid = document.querySelector('#amenity-grid');
  if (amenityGrid && !amenityGrid.hasAttribute('data-server-rendered')) amenityGrid.innerHTML = amenities.map((item, index) => `<article class="amenity reveal" data-amenity="${escapeHtml(item.icon)}"><div class="amenity-card-top"><span class="amenity-icon"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${iconMap[item.icon] || iconMap.info}</svg></span><span class="amenity-number">${String(index + 1).padStart(2, '0')}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p>${item.icon === 'bed' ? '<a class="amenity-enquiry" href="/rooms">Explore our rooms<span aria-hidden="true">↗</span></a>' : `<a class="amenity-enquiry" href="${escapeHtml(whatsappUrl(phones[0], `Namaste! I would like to ask about ${item.title} at Hotel Ganesh Himal. My question is: `))}" target="_blank" rel="noreferrer">${amenityActions[item.icon] || 'Ask our team'}<span aria-hidden="true">↗</span></a>`}</article>`).join('');
  const photoLabel = (image, index) => window.HotelGalleryPolicy?.photoLabel(image, index) || `Hotel photograph ${index + 1}`;
  const galleryGrid = document.querySelector('#gallery-grid');
  if (galleryGrid && !galleryGrid.hasAttribute('data-server-rendered')) galleryGrid.innerHTML = gallery.map((image, index) => `<button type="button" class="gallery-item${/washroom(?:-clean)?\./i.test(image) ? ' washroom-photo' : ''}" data-gallery-index="${index}" data-gallery-label="${escapeHtml(photoLabel(image, index))}" aria-label="View full photograph: ${escapeHtml(photoLabel(image, index))}"><div class="gallery-frame">${imageOrPlaceholder(image, photoLabel(image, index))}</div><span>${escapeHtml(photoLabel(image, index))} <i>↗</i></span></button>`).join('');
  const galleryButtons = Array.from(document.querySelectorAll('[data-gallery-index]'));
  activeGalleryPhotos = galleryButtons.map((button, index) => ({ src: button.querySelector('img')?.getAttribute('src') || gallery[index], caption: button.dataset.galleryLabel || photoLabel(gallery[index], index) }));
  galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
    showGalleryPhoto(index);
    document.querySelector('#gallery-dialog').showModal();
  }));

  showReview(0);
  bindImageFallbacks();
  observeReveals();
}

function showReview(index) {
  const reviews = state.data?.testimonials || [];
  if (!reviews.length || !document.querySelector('#review-quote')) return;
  state.reviewIndex = (index + reviews.length) % reviews.length;
  const review = reviews[state.reviewIndex];
  document.querySelector('#review-quote').textContent = review.quote;
  document.querySelector('#review-name').textContent = review.name;
  document.querySelector('#review-source').textContent = review.source;
}

function observeReveals() {
  if (window.HotelMotion) { window.HotelMotion.refresh(); return; }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(element => observer.observe(element));
}

async function submitJson(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Something went wrong.');
    return result;
  } catch (error) {
    if (url === '/api/feedback') throw new Error(error instanceof TypeError ? 'Unable to reach the hotel. Please try again when connected.' : error.message);
    if (!(error instanceof TypeError)) throw error;
    const storageKey = url.includes('bookings') ? 'hotel-ganesh-himal-bookings' : 'hotel-ganesh-himal-subscribers';
    const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const reference = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.slice(-8).toUpperCase();
    records.push({ ...payload, reference, createdAt: new Date().toISOString() });
    localStorage.setItem(storageKey, JSON.stringify(records));
    return url.includes('bookings')
      ? { message: 'Your request was saved in this browser.', reference }
      : { message: 'Your email was saved in this browser.' };
  }
}

document.querySelector('.menu-toggle').addEventListener('click', event => {
  const button = event.currentTarget;
  const links = document.querySelector('#nav-links');
  const isOpen = links.classList.toggle('open');
  button.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
  document.querySelector('#nav-links').classList.remove('open');
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
}));

const hotelPhotoDialog = document.querySelector('#hotel-photo-dialog');
const hotelMarker = document.querySelector('.hotel-location-marker');
if (hotelMarker && window.HotelHotspot) window.HotelHotspot.attachImageHotspot(document.querySelector('.hero-art'), hotelMarker);
const galleryDialog = document.querySelector('#gallery-dialog');
function showGalleryPhoto(index) {
  const photo = activeGalleryPhotos[index];
  if (!photo) return;
  activeGalleryIndex = index;
  galleryDialog.querySelector('img').src = photo.src;
  galleryDialog.querySelector('img').alt = photo.caption;
  galleryDialog.querySelector('.gallery-caption').textContent = photo.caption;
  galleryDialog.setAttribute('aria-label', `${photo.caption} — photograph ${index + 1} of ${activeGalleryPhotos.length}`);
  galleryDialog.querySelector('.gallery-toolbar').hidden = false;
  galleryDialog.querySelector('[data-gallery-count]').textContent = `${index + 1} / ${activeGalleryPhotos.length}`;
  galleryDialog.querySelectorAll('[data-gallery-prev], [data-gallery-next]').forEach(button => { button.disabled = activeGalleryPhotos.length < 2; });
}
function stepGallery(direction) {
  if (activeGalleryIndex === null || !activeGalleryPhotos.length) return;
  showGalleryPhoto(window.HotelGalleryPolicy?.nextIndex(activeGalleryIndex, direction, activeGalleryPhotos.length) ?? ((activeGalleryIndex + direction + activeGalleryPhotos.length) % activeGalleryPhotos.length));
}
galleryDialog.querySelector('[data-gallery-prev]').addEventListener('click', () => stepGallery(-1));
galleryDialog.querySelector('[data-gallery-next]').addEventListener('click', () => stepGallery(1));
galleryDialog.addEventListener('keydown', event => {
  if (!galleryDialog.open || activeGalleryIndex === null || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); stepGallery(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); stepGallery(1); }
  if (event.key === 'Home') { event.preventDefault(); showGalleryPhoto(0); }
  if (event.key === 'End') { event.preventDefault(); showGalleryPhoto(activeGalleryPhotos.length - 1); }
});
function closePhotoDialog(dialog) {
  if (window.HotelMotion) window.HotelMotion.closeDialog(dialog);
  else dialog.close();
}
document.querySelector('.gallery-close').addEventListener('click', () => closePhotoDialog(galleryDialog));
document.querySelector('[data-lukla-photo]')?.addEventListener('click', event => {
  activeGalleryIndex = null;
  galleryDialog.querySelector('.gallery-toolbar').hidden = true;
  galleryDialog.setAttribute('aria-label', 'Full photograph of Lukla airport and town');
  const photo = event.currentTarget.querySelector('img');
  galleryDialog.querySelector('img').src = photo.src;
  galleryDialog.querySelector('img').alt = photo.alt;
  galleryDialog.querySelector('p').textContent = 'Tenzing-Hillary Airport · Lukla, Nepal';
  galleryDialog.showModal();
});
galleryDialog.addEventListener('click', event => { if (event.target === galleryDialog) closePhotoDialog(galleryDialog); });
document.querySelector('.hotel-location-marker')?.addEventListener('click', () => hotelPhotoDialog.showModal());
document.querySelector('.hotel-photo-close').addEventListener('click', () => closePhotoDialog(hotelPhotoDialog));
hotelPhotoDialog.addEventListener('click', event => {
  if (event.target === hotelPhotoDialog) closePhotoDialog(hotelPhotoDialog);
});
[hotelPhotoDialog, galleryDialog].forEach(dialog => dialog.addEventListener('cancel', event => {
  if (window.HotelMotion) { event.preventDefault(); closePhotoDialog(dialog); }
}));

document.querySelector('#newsletter-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector('.form-status');
  try {
    const result = await submitJson('/api/subscribers', Object.fromEntries(new FormData(form)));
    status.textContent = result.message;
    form.reset();
  } catch (error) {
    status.textContent = error.message;
  }
});

const stayPlanner = document.querySelector('#stay-enquiry-form');
const stayPlannerPolicy = window.HotelStayEnquiry;
if (stayPlanner && stayPlannerPolicy) {
  stayPlanner.hidden = false;
  const preferredRoom = new URLSearchParams(location.search).get('room');
  if (preferredRoom && Array.from(stayPlanner.elements.room.options).some(option => option.value === preferredRoom)) stayPlanner.elements.room.value = preferredRoom;
  stayPlanner.addEventListener('input', () => updateBookingEnquiry());
  stayPlanner.addEventListener('change', () => updateBookingEnquiry());
  stayPlanner.addEventListener('submit', event => {
    event.preventDefault();
    if (updateBookingEnquiry() && stayPlanner.reportValidity()) document.querySelector('[data-booking-whatsapp]')?.click();
    else stayPlanner.reportValidity();
  });
  stayPlanner.querySelector('[data-copy-enquiry]').addEventListener('click', async () => {
    if (!updateBookingEnquiry() || !stayPlanner.reportValidity()) { stayPlanner.reportValidity(); return; }
    const status = document.querySelector('#stay-plan-status');
    try {
      await navigator.clipboard.writeText(document.querySelector('#stay-enquiry-preview').textContent);
      status.textContent = 'Enquiry copied. You can paste it into a message to our hotel team.';
    } catch {
      stayPlanner.querySelector('details').open = true;
      status.textContent = 'Open the preview above to select and copy your enquiry.';
    }
  });
  document.querySelectorAll('[data-booking-whatsapp]').forEach(link => link.addEventListener('click', event => {
    if (!updateBookingEnquiry() || !stayPlanner.reportValidity()) { event.preventDefault(); stayPlanner.reportValidity(); }
  }));
} else if (stayPlanner) stayPlanner.hidden = true;

function updateBookingEnquiry() {
  const selected = document.querySelector('[data-enquiry].is-selected');
  if (!selected) return true;
  const topic = selected.dataset.enquiry;
  const hotel = state.data?.hotel || { ...fallbackData.hotel, name: stayPlanner?.dataset.hotelName || fallbackData.hotel.name };
  const messages = {
    'Rooms & rates': `Namaste! I would like to ask about rooms and rates at ${hotel.name}. My dates and number of guests are: `,
    'Group stay': `Namaste! We are planning a group stay at ${hotel.name}. Our dates, group size, and room requirements are: `,
    'Meals & arrival': `Namaste! I would like to ask about meals and arrival arrangements at ${hotel.name}. My arrival date and questions are: `
  };
  let message = messages[topic], valid = true;
  if (stayPlanner && stayPlannerPolicy) {
    const fields = stayPlanner.elements;
    ['checkIn','checkOut','guests','room','notes'].forEach(name => fields[name].setCustomValidity(''));
    fields.checkIn.min = stayPlannerPolicy.todayInNepal();
    fields.checkOut.min = stayPlannerPolicy.nextDay(fields.checkIn.value) || stayPlannerPolicy.nextDay(fields.checkIn.min);
    const rooms = state.data?.rooms || Array.from(fields.room.options).filter(option => option.value).map(option => ({ id:option.value, name:option.dataset.roomName, price:option.dataset.roomPrice }));
    try {
      const enquiry = stayPlannerPolicy.prepare(Object.fromEntries(new FormData(stayPlanner)), hotel, rooms, topic);
      message = enquiry.message;
      document.querySelector('#stay-plan-summary').textContent = enquiry.summary;
      document.querySelector('#stay-enquiry-preview').textContent = message;
      document.querySelector('#stay-plan-status').textContent = '';
    } catch (error) {
      valid = false;
      fields[error.field || 'checkIn'].setCustomValidity(error.message);
      document.querySelector('#stay-plan-summary').textContent = 'Check your details before sending.';
      document.querySelector('#stay-enquiry-preview').textContent = 'Your enquiry preview will appear when these details are valid.';
      document.querySelector('#stay-plan-status').textContent = error.message;
    }
  }
  const phones = state.data?.hotel.phones || Array.from(document.querySelectorAll('#booking-contacts [data-copy-phone]')).map(button => button.dataset.copyPhone);
  document.querySelectorAll('[data-booking-whatsapp]').forEach((link, index) => {
    if (phones[index]) link.href = `https://wa.me/${phones[index].replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  });
  return valid;
}
updateBookingEnquiry();

document.querySelectorAll('[data-enquiry]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-enquiry]').forEach(option => {
    option.classList.toggle('is-selected', option === button);
    option.setAttribute('aria-pressed', String(option === button));
  });
  updateBookingEnquiry();
}));

document.querySelectorAll('[data-copy-phone]').forEach(button => button.addEventListener('click', async () => {
  const status = document.querySelector('#booking-status');
  try {
    await navigator.clipboard.writeText(button.dataset.copyPhone);
    button.textContent = 'Copied ✓';
    status.textContent = `${button.dataset.copyPhone} copied to clipboard.`;
    window.setTimeout(() => { button.textContent = 'Copy'; }, 2200);
  } catch {
    status.textContent = `Please copy this number: ${button.dataset.copyPhone}`;
    button.textContent = 'Try again';
  }
}));

const ratingStars = document.querySelector('.rating-stars');
const contactContexts = new Set();
const contactContextObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) contactContexts.add(entry.target.id);
    else contactContexts.delete(entry.target.id);
  });
  const hidden = contactContexts.size > 0;
  const quickContact = document.querySelector('.quick-contact');
  quickContact.classList.toggle('is-context-hidden', hidden);
  quickContact.inert = hidden;
});
document.querySelectorAll('#booking, #feedback').forEach(section => contactContextObserver.observe(section));
const ratingLabels = ['Tap a star to rate', 'Needs improvement', 'Could be better', 'Good', 'Very good', 'Excellent!'];
function paintRating(value) {
  ratingStars?.querySelectorAll('.star-choice').forEach((star, index) => star.classList.toggle('is-filled', index < value));
}
ratingStars?.addEventListener('change', event => {
  paintRating(Number(event.target.value));
  document.querySelector('#rating-description').textContent = ratingLabels[Number(event.target.value)];
});
ratingStars?.querySelectorAll('.star-choice').forEach((star, index) => star.addEventListener('pointerenter', () => paintRating(index + 1)));
ratingStars?.addEventListener('pointerleave', () => paintRating(Number(ratingStars.querySelector('input:checked')?.value || 0)));
document.querySelector('#feedback-message')?.addEventListener('input', event => {
  document.querySelector('#feedback-count').textContent = `${event.target.value.length.toLocaleString()} / 4,000`;
});
document.querySelector('#feedback-form')?.addEventListener('reset', () => {
  paintRating(0);
  document.querySelector('#rating-description').textContent = ratingLabels[0];
  document.querySelector('#feedback-count').textContent = '0 / 4,000';
});
document.querySelector('#feedback-again')?.addEventListener('click', () => {
  const form = document.querySelector('#feedback-form');
  form.querySelector('.feedback-success').hidden = true;
  form.querySelector('.feedback-fields').hidden = false;
  form.querySelector('.form-status').textContent = '';
  form.querySelector('input[name="rating"]').focus();
});

document.querySelector('#feedback-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');
  form.classList.remove('has-error');
  form.classList.add('is-sending');
  form.setAttribute('aria-busy', 'true');
  button.disabled = true;
  status.textContent = 'Sending your feedback…';
  try {
    const result = await submitJson('/api/feedback', Object.fromEntries(new FormData(form)));
    status.textContent = result.message;
    form.reset();
    form.querySelector('.feedback-fields').hidden = true;
    form.querySelector('.feedback-success').hidden = false;
    form.querySelector('.feedback-view-reviews').hidden = !result.reviewShared;
    form.querySelector('[data-feedback-success-message]').textContent = result.reviewShared
      ? 'Your visitor review is now shared on our website. Your email stays private. Thank you for helping shape the next welcome.'
      : result.reviewPending ? 'Your visitor review has been submitted for the hotel team to approve before publication. Your email stays private. Thank you for sharing your experience.'
      : 'Your feedback is saved privately for our team. Thank you for helping us make the next welcome even warmer.';
    document.querySelector('#feedback-again').focus({ preventScroll: true });
  } catch (error) {
    form.classList.add('has-error');
    status.textContent = error.message;
  } finally {
    form.classList.remove('is-sending');
    form.setAttribute('aria-busy', 'false');
    button.disabled = false;
  }
});

document.querySelectorAll('[data-room-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.roomFilter;
  document.querySelectorAll('[data-room-filter]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  let count = 0;
  document.querySelectorAll('[data-room-category]').forEach(card => {
    card.hidden = filter !== 'all' && card.dataset.roomCategory !== filter;
    if (!card.hidden) count += 1;
  });
  document.querySelector('#room-filter-status').textContent = `${count} room options shown.`;
  window.HotelMotion?.filterResults();
}));

document.querySelector('#review-prev')?.addEventListener('click', () => showReview(state.reviewIndex - 1));
document.querySelector('#review-next')?.addEventListener('click', () => showReview(state.reviewIndex + 1));
document.querySelector('#year').textContent = new Date().getFullYear();

const weatherCard = document.querySelector('#lukla-weather');
if (weatherCard) {
  let pending = false;
  let lastLoadedAt = 0;
  const retry = weatherCard.querySelector('[data-weather-retry]');
  async function loadWeather() {
    if (pending) return;
    pending = true;
    weatherCard.setAttribute('aria-busy', 'true');
    retry.disabled = true;
    try {
      const response = await fetch('/api/weather', { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Weather unavailable.');
      const weather = await response.json();
      if (!Number.isFinite(weather.temperature)) throw new Error('Weather unavailable.');
      weatherCard.querySelector('[data-weather-temperature]').textContent = `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(weather.temperature)}${weather.unit}`;
      weatherCard.querySelector('[data-weather-condition]').textContent = weather.label;
      weatherCard.querySelector('[data-weather-icon]').textContent = weather.icon;
      const update = weatherCard.querySelector('[data-weather-updated]');
      update.dateTime = weather.observedAt;
      update.textContent = `Updated ${new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', hour: 'numeric', minute: '2-digit' }).format(new Date(weather.observedAt))}`;
      weatherCard.classList.remove('weather-unavailable');
      retry.hidden = true;
      lastLoadedAt = Date.now();
      document.dispatchEvent(new CustomEvent('hotel:weather-updated'));
    } catch {
      weatherCard.querySelector('[data-weather-temperature]').textContent = 'Unavailable';
      weatherCard.querySelector('[data-weather-condition]').textContent = '';
      weatherCard.querySelector('[data-weather-updated]').textContent = '';
      weatherCard.classList.add('weather-unavailable');
      retry.hidden = false;
    } finally {
      pending = false;
      retry.disabled = false;
      weatherCard.setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', loadWeather);
  let refresh = 0;
  function startWeatherRefresh() {
    if (!refresh) refresh = setInterval(() => { if (!document.hidden) void loadWeather(); }, 10 * 60 * 1000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastLoadedAt >= 10 * 60 * 1000) void loadWeather(); });
  window.addEventListener('pagehide', () => { clearInterval(refresh); refresh = 0; });
  window.addEventListener('pageshow', event => { if (event.persisted) { startWeatherRefresh(); void loadWeather(); } });
  startWeatherRefresh();
  void loadWeather();
}

loadHotel();
