const { test } = require('node:test');
const assert = require('node:assert/strict');
const { photoLabel, nextIndex } = require('../public/gallery-policy');
const { galleryMarkup } = require('../lib/content');

test('gallery captions follow their photograph after removal or reordering', () => {
  const gallery = ['/images/dining-enhanced.webp', '/images/normal25dollar.jpg', '/images/washroom-clean.webp'];
  assert.equal(photoLabel(gallery[0], 0), 'The dining room');
  assert.equal(photoLabel(gallery[2], 0), 'The washroom');
  assert.equal(photoLabel('/images/full%20hotel%20photo.jpg'), 'Hotel Ganesh Himal Lukla exterior');
  assert.equal(photoLabel('/media/upload.jpg', 3), 'Hotel photograph 4');
  const html = galleryMarkup([gallery[2], gallery[0]]);
  assert.ok(html.includes('data-gallery-index="0" data-gallery-label="The washroom"'));
  assert.ok(html.includes('alt="The washroom"'));
  assert.ok(html.includes('data-gallery-index="1" data-gallery-label="The dining room"'));
});
test('photo browsing wraps at both ends and handles empty/single-photo galleries', () => {
  assert.equal(nextIndex(0, -1, 5), 4);
  assert.equal(nextIndex(4, 1, 5), 0);
  assert.equal(nextIndex(2, 1, 5), 3);
  assert.equal(nextIndex(0, 1, 1), 0);
  assert.equal(nextIndex(0, 1, 0), null);
});
