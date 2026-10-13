(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HotelGalleryPolicy = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const labels = {
    'full hotel photo.jpg': 'Hotel Ganesh Himal Lukla exterior',
    'dining-enhanced.webp': 'The dining room',
    'dining-card-refined.webp': 'The dining room',
    'dining.jpg': 'The dining room',
    'normal25dollar.jpg': 'Normal Room',
    '35dollardeluxe.jpg': 'Deluxe Room',
    'maindeluxe50dollar.jpg': 'Super Deluxe Room',
    'washroom-clean.webp': 'The washroom',
    'washroom.jpg': 'The washroom',
    'fulldining-enhanced.webp': 'Shared dining spaces',
    'entryyy.jpeg': 'A warm welcome inside'
  };
  function photoLabel(image, index = 0) {
    let filename = String(image || '').split(/[?#]/)[0].split('/').pop();
    try { filename = decodeURIComponent(filename); } catch { /* Unknown file names use a neutral caption. */ }
    return labels[filename.toLowerCase()] || `Hotel photograph ${index + 1}`;
  }
  function nextIndex(index, direction, count) {
    if (!Number.isInteger(count) || count < 1) return null;
    return ((index + direction) % count + count) % count;
  }
  return { photoLabel, nextIndex };
});
