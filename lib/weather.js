const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=27.6881593&longitude=86.7294441&elevation=2860&current=temperature_2m,weather_code,is_day&temperature_unit=celsius&timezone=Asia%2FKathmandu';

function weatherCondition(code, isDay) {
  if (code === 0) return { label: 'Clear skies', icon: isDay ? '☀' : '☾' };
  if (code === 1) return { label: 'Mostly clear', icon: isDay ? '☀' : '☾' };
  if (code === 2) return { label: 'Partly cloudy', icon: '☁' };
  if (code === 3) return { label: 'Overcast', icon: '☁' };
  if ([45, 48].includes(code)) return { label: 'Foggy', icon: '☁' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', icon: '☂' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', icon: '☂' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', icon: '❄' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorms', icon: 'ϟ' };
  return { label: 'Weather update', icon: '☁' };
}

function normaliseWeather(payload) {
  const current = payload.current;
  if (!current || !Number.isFinite(current.temperature_2m) || payload.current_units?.temperature_2m !== '°C') throw new Error('Weather temperature unavailable.');
  if (typeof current.time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(current.time)) throw new Error('Weather timestamp unavailable.');
  const observedAt = new Date(`${current.time}+05:45`);
  if (!Number.isFinite(observedAt.getTime())) throw new Error('Invalid weather timestamp.');
  return {
    location: 'Lukla', temperature: current.temperature_2m, unit: '°C',
    ...weatherCondition(current.weather_code, current.is_day === 1),
    observedAt: observedAt.toISOString(), timezone: 'Asia/Kathmandu',
    source: { name: 'Open-Meteo', url: 'https://open-meteo.com/' }
  };
}

async function getLuklaWeather(fetcher = fetch) {
  const response = await fetcher(WEATHER_URL, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Weather provider unavailable.');
  return normaliseWeather(await response.json());
}

module.exports = { getLuklaWeather, normaliseWeather, weatherCondition };
