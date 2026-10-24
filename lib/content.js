// Shared server-rendered content retains the original markup and CSS classes.
const { photoLabel } = require('../public/gallery-policy');
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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function whatsappUrl(phone, message = 'Namaste! I would like to enquire about a stay at Hotel Ganesh Himal. My dates and group size are: ') {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
function imageOrPlaceholder(image, label) {
  return image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(label)}" data-fallback-label="${escapeHtml(label)}" loading="lazy">` : `<div class="photo-placeholder "><span>Photo on request</span><small>${escapeHtml(label)}</small></div>`;
}
function roomsMarkup(rooms, phone) {
  return rooms.map((room, index) => `<article class="room-card reveal" data-room-capacity="${room.occupancy === '2 guests' ? 'two' : 'group'}" data-room-category="${escapeHtml(room.id)}"><div class="room-image">${imageOrPlaceholder(room.image, room.name)}<span class="room-tag">Room ${String(index + 1).padStart(2, '0')}</span></div><div class="room-body"><h3>${escapeHtml(room.name)}</h3><p>${escapeHtml(room.description)}</p><div class="room-meta"><span>♙ ${escapeHtml(room.occupancy)}</span><span>▱ ${escapeHtml(room.beds)}</span><span>◇ ${escapeHtml(room.size)}</span></div><div class="room-footer"><strong>${escapeHtml(room.price)}</strong><a href="/rooms/${encodeURIComponent(room.id)}">View room ↗</a></div><a class="room-enquire" href="${escapeHtml(whatsappUrl(phone, `Namaste! I am interested in the ${room.name} at Hotel Ganesh Himal. My dates and group size are: `))}" target="_blank" rel="noreferrer">Enquire on WhatsApp ↗</a></div></article>`).join('');
}
function amenitiesMarkup(amenities, phone) {
  return amenities.map((item, index) => `<article class="amenity reveal" data-amenity="${escapeHtml(item.icon)}"><div class="amenity-card-top"><span class="amenity-icon"><svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${iconMap[item.icon] || iconMap.info}</svg></span><span class="amenity-number">${String(index + 1).padStart(2, '0')}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p>${item.icon === 'bed' ? '<a class="amenity-enquiry" href="/rooms">Explore our rooms<span aria-hidden="true">↗</span></a>' : `<a class="amenity-enquiry" href="${escapeHtml(whatsappUrl(phone, `Namaste! I would like to ask about ${item.title} at Hotel Ganesh Himal. My question is: `))}" target="_blank" rel="noreferrer">${amenityActions[item.icon] || 'Ask our team'}<span aria-hidden="true">↗</span></a>`}</article>`).join('');
}
function galleryMarkup(gallery) {
  return gallery.map((image, index) => {
    const label = escapeHtml(photoLabel(image, index));
    return `<button type="button" class="gallery-item${/washroom(?:-clean)?\./i.test(image) ? ' washroom-photo' : ''}${/\/helipad\.jpg(?:[?#]|$)/i.test(image) ? ' helipad-photo' : ''}" data-gallery-index="${index}" data-gallery-label="${label}" aria-label="View full photograph: ${label}"><div class="gallery-frame">${imageOrPlaceholder(image, photoLabel(image, index))}</div><span>${label} <i>↗</i></span></button>`;
  }).join('');
}

module.exports = { roomsMarkup, amenitiesMarkup, galleryMarkup, whatsappUrl, escapeHtml };
