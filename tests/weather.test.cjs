const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normaliseWeather, getLuklaWeather } = require('../lib/weather');

const sample = { current_units: { temperature_2m: '°C' }, current: { time: '2026-10-11T20:30', temperature_2m: 7.4, weather_code: 2, is_day: 0 } };

test('weather retains provider temperature and converts Nepal update time to an unambiguous timestamp', () => {
  const result = normaliseWeather(sample);
  assert.equal(result.temperature, 7.4);
  assert.equal(result.unit, '°C');
  assert.equal(result.observedAt, '2026-10-11T14:45:00.000Z');
  assert.equal(result.label, 'Partly cloudy');
  assert.equal(result.source.name, 'Open-Meteo');
});

test('zero Celsius is valid, while invalid units, temperatures, and dates are not substituted with fake values', () => {
  const result = normaliseWeather({ ...sample, current: { ...sample.current, temperature_2m: 0, weather_code: 0 } });
  assert.equal(result.temperature, 0);
  assert.equal(result.icon, '☾');
  assert.throws(() => normaliseWeather({ ...sample, current_units: { temperature_2m: '°F' } }));
  assert.throws(() => normaliseWeather({ ...sample, current: { ...sample.current, temperature_2m: null } }));
  assert.throws(() => normaliseWeather({ ...sample, current: { ...sample.current, time: 'not-a-date' } }));
});

test('fetch requests Lukla coordinates/elevation, caches updates, and propagates upstream failures', async () => {
  const result = await getLuklaWeather(async (url, options) => {
    const target = new URL(url);
    assert.equal(target.searchParams.get('latitude'), '27.6881593');
    assert.equal(target.searchParams.get('longitude'), '86.7294441');
    assert.equal(target.searchParams.get('elevation'), '2860');
    assert.equal(options.next.revalidate, 600);
    return Response.json(sample);
  });
  assert.equal(result.temperature, 7.4);
  await assert.rejects(getLuklaWeather(async () => new Response('', { status: 503 })));
});
