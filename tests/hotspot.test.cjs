const { test } = require('node:test');
const assert = require('node:assert/strict');
const { projectImagePoint } = require('../public/hotspot');

const image = { imageWidth: 1920, imageHeight: 897, imageX: 1515 / 1920, imageY: 397 / 897 };
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 0.001, `${actual} should equal ${expected}`); }

test('uncropped photo preserves the building’s original image coordinates', () => {
  const point = projectImagePoint({ ...image, width: 1920, height: 897 });
  near(point.x, 1515);
  near(point.y, 397);
});

test('wide desktop cropping changes the vertical offset, not the target building', () => {
  const point = projectImagePoint({ ...image, width: 1920, height: 760 });
  near(point.x, 1515);
  near(point.y, 328.5);
  const ultrawide = projectImagePoint({ ...image, width: 2560, height: 800 });
  near(ultrawide.x, 2020);
  near(ultrawide.y, 331.3333333333);
});

test('mobile cover sizing respects the actual 80% background crop position', () => {
  const point = projectImagePoint({ ...image, width: 390, height: 650, positionX: '80%', positionY: '50%' });
  const scale = 650 / 897;
  near(point.x, 1515 * scale + (390 - 1920 * scale) * 0.8);
  near(point.y, 397 * scale);
  assert.ok(point.x >= 0 && point.x <= 390);
});

test('tablet crop and pixel background offsets are projected correctly', () => {
  const point = projectImagePoint({ ...image, width: 768, height: 910, positionX: '82%', positionY: '50%' });
  const scale = 910 / 897;
  near(point.x, 1515 * scale + (768 - 1920 * scale) * .82);
  const offset = projectImagePoint({ ...image, width: 1920, height: 760, positionX: '0px', positionY: '-40px' });
  near(offset.x, 1515);
  near(offset.y, 357);
});
