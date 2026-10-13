const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { getSiteAdmin } = require('./site-admin');
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const types = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
function directory() { return path.join(/* turbopackIgnore: true */ getSiteAdmin().dataDir, 'uploads'); }
function fileType(buffer) {
  if (buffer.length >= 12 && buffer.subarray(0, 3).equals(Buffer.from([255,216,255]))) return 'jpg';
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.length >= 16 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'webp';
  throw Object.assign(new Error('Upload a JPEG, PNG, or WebP photograph.'), { status: 400 });
}
function saveImage(buffer) {
  if (buffer.length > MAX_IMAGE_SIZE) throw Object.assign(new Error('Photos must be 10 MB or smaller.'), { status: 413 });
  const extension = fileType(buffer), name = `${randomUUID()}.${extension}`;
  const dir = directory(); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(/* turbopackIgnore: true */ dir, name), buffer, { flag: 'wx' });
  return { url: `/media/${name}` };
}
function listImages() {
  const dir = directory();
  const uploaded = fs.existsSync(/* turbopackIgnore: true */ dir) ? fs.readdirSync(/* turbopackIgnore: true */ dir).filter(name => /^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)).map(name => `/media/${name}`) : [];
  const publicDir = path.join(process.cwd(), 'public', 'images');
  const existing = fs.readdirSync(publicDir).filter(name => /\.(jpe?g|png|webp)$/i.test(name)).map(name => `/images/${encodeURIComponent(name)}`);
  return [...uploaded, ...existing];
}
function readImage(name) {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) return null;
  const file = path.join(/* turbopackIgnore: true */ directory(), name);
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  return { body: fs.readFileSync(/* turbopackIgnore: true */ file), type: types[name.split('.').pop()] };
}
module.exports = { MAX_IMAGE_SIZE, saveImage, listImages, readImage, fileType };
