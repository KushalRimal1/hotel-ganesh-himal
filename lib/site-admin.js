const fs = require('fs');
const path = require('path');
const { createHash, randomUUID } = require('crypto');
const cheerio = require('cheerio');
const datePolicy = require('../public/stay-enquiry');

const DEFAULT_TRIPADVISOR = 'https://www.tripadvisor.com/Hotel_Review-g1203015-d32710014-Reviews-Hotel_Ganesh_Himal_Lukla-Lukla_Sagarmatha_Zone_Eastern_Region.html';
const defaults = {
  tripadvisorUrl: DEFAULT_TRIPADVISOR,
  mapsUrl: 'https://www.google.com/maps/place/Hotel+Ganesh+Himal+Lukla/@27.6881593,86.7294441,17z',
  mapsEmbedUrl: 'https://www.google.com/maps?q=Hotel+Ganesh+Himal+Lukla&ll=27.6881593,86.7294441&z=17&output=embed',
  welcomeEnabled: true, newsletterEnabled: true, feedbackEnabled: true, reviewsEnabled: true, weatherEnabled: true,
  homeHeroImage: '/images/lukla-airport.jpg', welcomeImage: '/images/full%20hotel%20photo.jpg', pageMeta: {}
};
function failure(message, status = 400) { return Object.assign(new Error(message), { status }); }
function text(value, label, max = 4000, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw failure(`${label} is required and must be at most ${max} characters.`);
  return value.trim();
}
function imageUrl(value) {
  if (typeof value !== 'string' || value.length > 1000 || (value && !/^\/(?:images|media)\/[^\s<>"\\?#]+$/i.test(value)) || /(?:\.\.|%2e|%2f|%5c)/i.test(value)) throw failure('Choose a local image from /images/ or an uploaded /media/ image.');
  return value;
}
function externalUrl(value, hostPattern, label) {
  try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || !hostPattern.test(url.hostname)) throw new Error(); return url.href; }
  catch { throw failure(`${label} must be a valid HTTPS link to the expected website.`); }
}
function templateFields(source, name, copy = {}, images = {}) {
  const $ = cheerio.load(source, { decodeEntities: false });
  const fields = [], pictures = [], occurrences = new Map();
  function walk(node) {
    if (node.type === 'text' && node.data.trim() && /[a-zA-Z]/.test(node.data)) {
      const parent = $(node.parent);
      if (parent.closest('script,style,svg,title,option,[hidden]:not(#stay-enquiry-form),[aria-hidden="true"],[data-phone],[data-email],[data-address],[data-description],.weather-card').length) return;
      const original = node.data;
      const hash = createHash('sha256').update(original).digest('hex').slice(0, 16);
      const count = occurrences.get(hash) || 0; occurrences.set(hash, count + 1);
      const id = `${name}:${hash}:${count}`;
      fields.push({ id, label: parent.closest('section').attr('id') || parent.closest('section').attr('class') || (parent.closest('footer').length ? 'Footer' : 'Header / welcome'), original: original.trim(), value: copy[id] ?? original.trim() });
      if (copy[id] !== undefined) node.data = original.match(/^\s*/)[0] + copy[id] + original.match(/\s*$/)[0];
    } else if (node.children && !['script', 'style', 'svg'].includes(node.name)) node.children.forEach(walk);
  }
  $.root()[0].children.forEach(walk);
  $('img[src]').each((index, node) => {
    const original = $(node).attr('src');
    const id = `${name}:image:${index}`;
    pictures.push({ id, label: $(node).attr('alt') || `Photo ${index + 1}`, original: original.startsWith('/') ? original : '/' + original, value: images[id] || (original.startsWith('/') ? original : '/' + original) });
    if (images[id]) $(node).attr('src', images[id]);
  });
  return { html: $.html(), fields, pictures };
}

function createSiteAdmin({ root = process.cwd(), dataDir = process.env.HOTEL_DATA_DIR || path.join(root, 'data') } = {}) {
  const filename = path.join(/* turbopackIgnore: true */ dataDir, 'site-content.json');
  const baseline = () => JSON.parse(fs.readFileSync(path.join(root, 'data', 'hotel.json'), 'utf8'));
  function read() {
    const stored = fs.existsSync(/* turbopackIgnore: true */ filename) ? JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ filename, 'utf8')) : {};
    return { hotelData: stored.hotelData || baseline(), copy: stored.copy || {}, images: stored.images || {}, settings: { ...defaults, ...stored.settings } };
  }
  function version(data) { return createHash('sha256').update(JSON.stringify(data)).digest('hex'); }
  function template(name, data = read()) {
    return templateFields(fs.readFileSync(path.join(root, 'views', `${name}.html`), 'utf8'), name, data.copy, data.images);
  }
  function snapshot() {
    const data = read();
    return { ...data, version: version(data), templates: ['site', 'lukla', 'privacy'].map(name => ({ name, ...template(name, data), html: undefined })) };
  }
  function save(input) {
    const current = read();
    if (input.version !== version(current)) throw failure('Website content changed since you opened it. Reload the dashboard before saving.', 409);
    const data = input.hotelData;
    if (!data || !data.hotel || !Array.isArray(data.rooms) || !Array.isArray(data.amenities) || !Array.isArray(data.gallery) || !Array.isArray(data.experiences)) throw failure('Invalid website content.');
    const hotel = {};
    for (const key of ['name', 'shortName', 'location', 'tagline', 'description', 'phone', 'email', 'address', 'checkIn', 'checkOut']) hotel[key] = text(data.hotel[key], `Hotel ${key}`, key === 'description' ? 4000 : 250);
    if (!/^\S+@\S+\.\S+$/.test(hotel.email)) throw failure('Enter a valid hotel email.');
    if (!Array.isArray(data.hotel.phones) || data.hotel.phones.length < 1 || data.hotel.phones.length > 2) throw failure('Enter one or two hotel phone numbers.');
    hotel.phones = data.hotel.phones.map(phone => text(phone, 'Phone', 40));
    if (hotel.phones.some(phone => !/^\+?[\d ()-]{7,40}$/.test(phone))) throw failure('Enter valid phone numbers.');
    hotel.phone = hotel.phones[0];
    function list(items, maximum, fields) {
      if (items.length > maximum) throw failure(`Only ${maximum} items are allowed.`);
      return items.map(item => { const result = {}; for (const field of fields) result[field] = field === 'image' ? imageUrl(item[field]) : text(item[field], field, field === 'description' || field === 'text' ? 4000 : 250); return result; });
    }
    const rooms = list(data.rooms, 30, ['id', 'name', 'description', 'occupancy', 'beds', 'size', 'price', 'image']);
    if (!rooms.length || rooms.some(room => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(room.id)) || new Set(rooms.map(room => room.id)).size !== rooms.length) throw failure('Keep at least one room and use unique lowercase room URL IDs.');
    const reservationsFile = path.join(/* turbopackIgnore: true */ dataDir, 'reservations.json');
    if (fs.existsSync(/* turbopackIgnore: true */ reservationsFile)) {
      const records = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ reservationsFile, 'utf8')).bookings || [];
      if (records.some(booking => booking.status === 'confirmed' && booking.checkOut > datePolicy.todayInNepal() && !rooms.some(room => room.id === booking.roomId))) throw failure('A room category with an upcoming confirmed reservation cannot be removed or have its URL ID changed. Resolve those reservations first.', 409);
    }
    const amenities = list(data.amenities, 40, ['icon', 'title', 'text']);
    if (amenities.some(item => !['wifi','coffee','meals','helipad','booking','shower','bag','plane','info','bed'].includes(item.icon))) throw failure('Choose a supported amenity icon.');
    const experiences = list(data.experiences, 30, ['number', 'title', 'text']);
    if (data.gallery.length > 100) throw failure('Only 100 gallery photos are allowed.');
    const gallery = data.gallery.map(imageUrl);
    if (gallery.some(url => !url)) throw failure('Gallery images cannot be empty.');
    const settings = {};
    for (const key of ['welcomeEnabled','newsletterEnabled','feedbackEnabled','reviewsEnabled','weatherEnabled']) {
      if (typeof input.settings?.[key] !== 'boolean') throw failure(`Invalid ${key} setting.`);
      settings[key] = input.settings[key];
    }
    settings.tripadvisorUrl = externalUrl(input.settings.tripadvisorUrl, /(^|\.)tripadvisor\.com$/i, 'TripAdvisor');
    settings.mapsUrl = externalUrl(input.settings.mapsUrl, /(^|\.)google\.com$|^maps\.app\.goo\.gl$/i, 'Google Maps');
    settings.mapsEmbedUrl = externalUrl(input.settings.mapsEmbedUrl, /(^|\.)google\.com$/i, 'Embedded Google Maps');
    settings.homeHeroImage = imageUrl(input.settings.homeHeroImage);
    settings.welcomeImage = imageUrl(input.settings.welcomeImage);
    if (!settings.homeHeroImage || !settings.welcomeImage) throw failure('Choose home and welcome photographs.');
    settings.pageMeta = {};
    for (const [key, page] of Object.entries(input.settings.pageMeta || {})) {
      if (!['home','story','rooms','lukla','amenities','gallery','contact','credits','privacy'].includes(key) || !page || typeof page !== 'object') throw failure('Unknown page settings.');
      settings.pageMeta[key] = {};
      for (const [field, value] of Object.entries(page)) {
        if (!['title','description','eyebrow','heading','image'].includes(field)) throw failure('Unknown page field.');
        settings.pageMeta[key][field] = field === 'image' ? imageUrl(value) : text(value, `Page ${field}`, field === 'description' ? 4000 : 500, true);
      }
    }
    const allowedFields = new Set(), allowedPictures = new Set();
    for (const name of ['site','lukla','privacy']) { const t = template(name, current); t.fields.forEach(field => allowedFields.add(field.id)); t.pictures.forEach(image => allowedPictures.add(image.id)); }
    const copy = {}, images = {};
    if (!input.copy || !input.images || typeof input.copy !== 'object' || typeof input.images !== 'object') throw failure('Invalid page content.');
    for (const [id, value] of Object.entries(input.copy)) { if (!allowedFields.has(id)) throw failure('Unknown page text field.'); copy[id] = text(value, 'Page text', 6000, true); }
    for (const [id, value] of Object.entries(input.images)) { if (!allowedPictures.has(id)) throw failure('Unknown page image.'); images[id] = imageUrl(value); }
    const saved = { hotelData: { ...current.hotelData, hotel, rooms, amenities, experiences, gallery }, copy, images, settings };
    fs.mkdirSync(dataDir, { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(saved, null, 2) + '\n');
    fs.renameSync(temporary, filename);
    return snapshot();
  }
  return { read, template, snapshot, save, dataDir };
}
function getSiteAdmin() { return createSiteAdmin(); }
module.exports = { createSiteAdmin, getSiteAdmin, imageUrl, defaults };
