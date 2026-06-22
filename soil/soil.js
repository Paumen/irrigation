export const SITE = {
  name: "Vormersesluisweg 3A, Wijchen",
  lat: 51.79733,
  lon: 5.70643,
};

export const API = {
  base: "https://api.open-meteo.com/v1/forecast",
  daily: "precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration",
  timezone: "Europe/Amsterdam",
  pastDays: 14,
  forecastDays: 14,
};

export const SPRINKLER_RATE = 0.063;
export const RAIN_EFFECTIVENESS = 0.8;
export const WATERING_EFFICIENCY = 0.9;

export const PLANTINGS = {
  "Turf": { kc: 0.85, rootDepth: 0.15 },
  "Flower bed": { kc: 0.90, rootDepth: 0.30 },
  "Shrubs": { kc: 0.70, rootDepth: 0.50 },
};

// Plant-available water (field capacity − wilting), mm/m.
export const SOILS = {
  "Sand": 60,
  "Sandy loam": 130,
  "Loam": 170,
  "Clay": 190,
};

// Sun-exposure loss factor: shaded soil dries slower, full sun fastest.
export const SUN_EXPOSURES = {
  "Shade": 0.5,
  "Half sun": 0.75,
  "Full sun": 1.0,
};

export const DEFAULTS = {
  planting: "Flower bed",
  soil: "Sandy loam",
  sun: "Full sun",
  wateringMinutes: 60,
  watered: [],
};

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

// Round to 5 decimal places, trimming floating-point noise (e.g.
// 3.7800000000000002 -> 3.78). Values already within 5 decimals are
// unchanged.
function round5(x) {
  return Math.round(x * 1e5) / 1e5;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Day of week for a "YYYY-MM-DD" date string. Parsed as UTC to avoid the
// local-timezone shift that bare Date string parsing would introduce.
export function dayOfWeek(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`Malformed weather response: invalid date "${dateStr}"`);
  }
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function buildUrl() {
  const params = new URLSearchParams({
    latitude: SITE.lat,
    longitude: SITE.lon,
    daily: API.daily,
    timezone: API.timezone,
    past_days: API.pastDays,
    forecast_days: API.forecastDays,
  });
  return `${API.base}?${params.toString()}`;
}

// Null fill: rain → 0, et0 → previous day's value (not 0), temperature → null.
export function normalizeWeather(json) {
  const daily = json && json.daily;
  if (!daily || !Array.isArray(daily.time)) {
    throw new Error("Malformed weather response: missing daily.time");
  }

  const time = daily.time;
  const n = time.length;
  const weekday = time.map(dayOfWeek);

  const rawRain = daily.precipitation_sum;
  const rawEt0 = daily.et0_fao_evapotranspiration;
  if (
    !Array.isArray(rawRain) || rawRain.length < n ||
    !Array.isArray(rawEt0) || rawEt0.length < n
  ) {
    throw new Error(
      "Malformed weather response: precipitation_sum / et0_fao_evapotranspiration missing or too short",
    );
  }
  const rawTemp = Array.isArray(daily.temperature_2m_max)
    ? daily.temperature_2m_max
    : [];

  const rain = [];
  const et0 = [];
  const tempMax = [];
  let lastEt0 = 0;

  for (let i = 0; i < n; i++) {
    rain.push(rawRain[i] == null ? 0 : rawRain[i]);

    const e = rawEt0[i];
    if (e == null) {
      et0.push(lastEt0);
    } else {
      et0.push(e);
      lastEt0 = e;
    }

    tempMax.push(rawTemp[i] == null ? null : rawTemp[i]);
  }

  return { time, weekday, rain, et0, tempMax };
}

export async function fetchWeather(signal) {
  let response;
  try {
    response = await fetch(buildUrl(), { signal });
  } catch (cause) {
    throw new Error("Weather request failed (network error)", { cause });
  }
  if (!response.ok) {
    throw new Error(`Weather request failed (HTTP ${response.status})`);
  }

  let json;
  try {
    json = await response.json();
  } catch (cause) {
    throw new Error("Weather response was not valid JSON", { cause });
  }

  return normalizeWeather(json);
}

export function deriveParams(controls) {
  const planting = PLANTINGS[controls.planting];
  const soilAW = SOILS[controls.soil];
  const sunFactor = SUN_EXPOSURES[controls.sun];
  if (!planting) throw new Error(`Unknown planting: ${controls.planting}`);
  if (soilAW == null) throw new Error(`Unknown soil: ${controls.soil}`);
  if (sunFactor == null) throw new Error(`Unknown sun exposure: ${controls.sun}`);

  const tankSize = soilAW * planting.rootDepth;

  return {
    kc: planting.kc,
    rootDepth: planting.rootDepth,
    soilAW,
    sunFactor,
    tankSize,
  };
}

export function runBalance(weather, params, wateredSet, dose) {
  const { tankSize, kc, sunFactor } = params;
  const n = weather.et0.length;
  const series = [];
  let prev = tankSize;

  for (let i = 0; i < n; i++) {
    const start = prev;
    const loss = weather.et0[i] * kc * sunFactor;
    const applied = wateredSet.has(i) ? dose : 0;
    const gain =
      weather.rain[i] * RAIN_EFFECTIVENESS + applied * WATERING_EFFICIENCY;
    const level = clamp(start + gain - loss, 0, tankSize);

    series.push({
      index: i,
      date: weather.time[i],
      weekday: weather.weekday[i],
      tempMax: weather.tempMax[i],
      start: round5(start),
      et0: weather.et0[i],
      loss: round5(loss),
      rain: weather.rain[i],
      applied: round5(applied),
      gain: round5(gain),
      level: round5(level),
    });
    prev = level;
  }

  return series;
}

export function compute(controls, weather) {
  const merged = { ...DEFAULTS, ...controls };
  const params = deriveParams(merged);
  const dose = round5(SPRINKLER_RATE * merged.wateringMinutes);
  const wateredSet = new Set(merged.watered);
  const series = runBalance(weather, params, wateredSet, dose);

  return {
    site: SITE,
    ...params,
    dose,
    series,
    wateredSet,
  };
}
