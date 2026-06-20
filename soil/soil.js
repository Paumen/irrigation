export const SITE = {
  name: "Vormersesluisweg 3A, Wijchen",
  lat: 51.79733,
  lon: 5.70643,
};

export const API = {
  base: "https://api.open-meteo.com/v1/forecast",
  daily: "precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration",
  timezone: "Europe/Amsterdam",
  pastDays: 24,
  forecastDays: 16,
};

// Fixed; never derived from the device clock.
export const TODAY_INDEX = 24;

export const SPRINKLER_RATE = 0.063; // mm/min gross
export const RAIN_EFFECTIVENESS = 0.8;
export const WATERING_EFFICIENCY = 0.9;

export const PROJECTION_DAYS = 14;

export const MIN_DAYS = TODAY_INDEX + PROJECTION_DAYS + 1;

export const VIEW = {
  start: TODAY_INDEX - 8,
  length: 16,
};

export const PLANTINGS = {
  "Turf": { kc: 0.85, rootDepth: 0.15, p: 0.45 },
  "Flower bed": { kc: 0.90, rootDepth: 0.30, p: 0.45 },
  "Shrubs": { kc: 0.70, rootDepth: 0.50, p: 0.50 },
};

// Plant-available water per metre of depth (field capacity − wilting), mm/m.
export const SOILS = {
  "Sand": 60,
  "Sandy loam": 130,
  "Loam": 170,
  "Clay": 190,
};

export const DEFAULTS = {
  planting: "Flower bed",
  soil: "Sandy loam",
  wateringMinutes: 60,
  watered: [], // absolute day indices into the series
};

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
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

// Null rules: rain → 0, et0 → previous day's value (0 would be wrong; first-day
// null → 0), temperature → null. Throws on a malformed/short response.
export function normalizeWeather(json) {
  const daily = json && json.daily;
  if (!daily || !Array.isArray(daily.time)) {
    throw new Error("Malformed weather response: missing daily.time");
  }

  const time = daily.time;
  const n = time.length;
  if (n < MIN_DAYS) {
    throw new Error(
      `Malformed weather response: expected at least ${MIN_DAYS} days, got ${n}`,
    );
  }

  // rain/et0 must fail loudly, never zero-fill; temperature degrades to blanks.
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

  return { time, rain, et0, tempMax };
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

// threshold = TAW − RAW = (1−p)·TAW.
export function deriveParams(controls) {
  const planting = PLANTINGS[controls.planting];
  const soilAW = SOILS[controls.soil];
  if (!planting) throw new Error(`Unknown planting: ${controls.planting}`);
  if (soilAW == null) throw new Error(`Unknown soil: ${controls.soil}`);

  const tankSize = soilAW * planting.rootDepth;
  const raw = planting.p * tankSize;
  const threshold = tankSize - raw;

  return {
    kc: planting.kc,
    rootDepth: planting.rootDepth,
    p: planting.p,
    soilAW,
    tankSize,
    raw,
    threshold,
  };
}

export function ks(stored, threshold) {
  if (threshold <= 0) return 1;
  if (stored >= threshold) return 1;
  return clamp(stored / threshold, 0, 1);
}

// Seed full at field capacity on day 0; overflow above full is discarded. Ks
// uses the previous day's closing level. `dose` is gross mm on watered days.
export function runBalance(weather, params, wateredSet, dose) {
  const { tankSize, threshold, kc } = params;
  const n = weather.et0.length;
  const series = [];
  let prev = tankSize;

  for (let i = 0; i < n; i++) {
    const start = prev;
    const k = ks(start, threshold);
    const loss = weather.et0[i] * kc * k;
    const applied = wateredSet.has(i) ? dose : 0;
    const gain =
      weather.rain[i] * RAIN_EFFECTIVENESS + applied * WATERING_EFFICIENCY;
    const level = clamp(start + gain - loss, 0, tankSize);

    series.push({
      index: i,
      start,
      ks: k,
      et0: weather.et0[i],
      loss,
      rain: weather.rain[i],
      applied,
      gain,
      level,
    });
    prev = level;
  }

  return series;
}

export function projectNextWatering(series, threshold) {
  if (!Array.isArray(series) || series.length <= TODAY_INDEX) {
    throw new Error(`Invalid series: expected more than ${TODAY_INDEX} days`);
  }
  if (series[TODAY_INDEX].level <= threshold) {
    return { days: 0, beyondHorizon: false };
  }
  const end = Math.min(TODAY_INDEX + PROJECTION_DAYS, series.length - 1);
  for (let j = TODAY_INDEX + 1; j <= end; j++) {
    if (series[j].level <= threshold) {
      return { days: j - TODAY_INDEX, beyondHorizon: false };
    }
  }
  return { days: null, beyondHorizon: true };
}

export function buildWindow(series, weather, wateredSet, tankSize, start, length) {
  const fraction = (mm) => (tankSize > 0 ? mm / tankSize : 0);
  const days = [];

  for (let w = 0; w < length; w++) {
    const i = start + w;
    const rec = series[i];
    if (!rec) continue;

    days.push({
      index: i,
      date: weather.time[i],
      levelMm: rec.level,
      levelFraction: fraction(rec.level),
      et: rec.loss, // et0·kc·Ks
      ks: rec.ks,
      rain: rec.rain, // gross
      watering: rec.applied, // gross dose, or 0
      watered: wateredSet.has(i),
      tempMax: weather.tempMax[i],
      isToday: i === TODAY_INDEX,
    });
  }

  return days;
}

export function compute(controls, weather, view = VIEW) {
  if (
    !weather ||
    !Array.isArray(weather.time) ||
    !Array.isArray(weather.rain) ||
    !Array.isArray(weather.et0) ||
    !Array.isArray(weather.tempMax) ||
    weather.et0.length < MIN_DAYS
  ) {
    throw new Error(
      "Invalid weather: expected a normalized object from normalizeWeather/fetchWeather",
    );
  }

  const merged = { ...DEFAULTS, ...controls };
  if (!Array.isArray(merged.watered)) {
    throw new Error("Invalid controls: watered must be an array of day indices");
  }
  const params = deriveParams(merged);
  const dose = SPRINKLER_RATE * merged.wateringMinutes; // gross mm
  const wateredSet = new Set(merged.watered);
  const series = runBalance(weather, params, wateredSet, dose);

  const fraction = (mm) => (params.tankSize > 0 ? mm / params.tankSize : 0);

  const days = buildWindow(
    series,
    weather,
    wateredSet,
    params.tankSize,
    view.start,
    view.length,
  );

  const todayRec = series[TODAY_INDEX];
  const today = {
    index: TODAY_INDEX,
    date: weather.time[TODAY_INDEX],
    levelMm: todayRec.level,
    levelFraction: fraction(todayRec.level),
    tempMax: weather.tempMax[TODAY_INDEX],
  };

  return {
    site: SITE,
    ...params,
    dose,
    thresholdFraction: fraction(params.threshold),
    todayIndex: TODAY_INDEX,
    series,
    wateredSet,
    weather,
    view,
    days,
    today,
    nextWatering: projectNextWatering(series, params.threshold),
  };
}
  "Sandy loam": 130,
  "Loam": 170,
  "Clay": 190,
};

export const DEFAULTS = {
  planting: "Flower bed",
  soil: "Sandy loam",
  wateringMinutes: 60,
  watered: [], // absolute day indices into the series
};

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
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

// Null rules: rain → 0, et0 → previous day's value (0 would be wrong; first-day
// null → 0), temperature → null. Throws on a malformed/short response.
export function normalizeWeather(json) {
  const daily = json && json.daily;
  if (!daily || !Array.isArray(daily.time)) {
    throw new Error("Malformed weather response: missing daily.time");
  }

  const time = daily.time;
  const n = time.length;
  if (n < MIN_DAYS) {
    throw new Error(
      `Malformed weather response: expected at least ${MIN_DAYS} days, got ${n}`,
    );
  }

  // rain/et0 must fail loudly, never zero-fill; temperature degrades to blanks.
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

  return { time, rain, et0, tempMax };
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

// threshold = TAW − RAW = (1−p)·TAW.
export function deriveParams(controls) {
  const planting = PLANTINGS[controls.planting];
  const soilAW = SOILS[controls.soil];
  if (!planting) throw new Error(`Unknown planting: ${controls.planting}`);
  if (soilAW == null) throw new Error(`Unknown soil: ${controls.soil}`);

  const tankSize = soilAW * planting.rootDepth;
  const raw = planting.p * tankSize;
  const threshold = tankSize - raw;

  return {
    kc: planting.kc,
    rootDepth: planting.rootDepth,
    p: planting.p,
    soilAW,
    tankSize,
    raw,
    threshold,
  };
}

export function ks(stored, threshold) {
  if (threshold <= 0) return 1;
  if (stored >= threshold) return 1;
  return clamp(stored / threshold, 0, 1);
}

// Seed full at field capacity on day 0; overflow above full is discarded. Ks
// uses the previous day's closing level. `dose` is gross mm on watered days.
export function runBalance(weather, params, wateredSet, dose) {
  const { tankSize, threshold, kc } = params;
  const n = weather.et0.length;
  const series = [];
  let prev = tankSize;

  for (let i = 0; i < n; i++) {
    const start = prev;
    const k = ks(start, threshold);
    const loss = weather.et0[i] * kc * k;
    const applied = wateredSet.has(i) ? dose : 0;
    const gain =
      weather.rain[i] * RAIN_EFFECTIVENESS + applied * WATERING_EFFICIENCY;
    const level = clamp(start + gain - loss, 0, tankSize);

    series.push({
      index: i,
      start,
      ks: k,
      et0: weather.et0[i],
      loss,
      rain: weather.rain[i],
      applied,
      gain,
      level,
    });
    prev = level;
  }

  return series;
}

export function projectNextWatering(series, threshold) {
  if (!Array.isArray(series) || series.length <= TODAY_INDEX) {
    throw new Error(`Invalid series: expected more than ${TODAY_INDEX} days`);
  }
  if (series[TODAY_INDEX].level <= threshold) {
    return { days: 0, beyond14: false };
  }
  const end = Math.min(TODAY_INDEX + PROJECTION_DAYS, series.length - 1);
  for (let j = TODAY_INDEX + 1; j <= end; j++) {
    if (series[j].level <= threshold) {
      return { days: j - TODAY_INDEX, beyond14: false };
    }
  }
  return { days: null, beyond14: true };
}

export function compute(controls, weather) {
  if (
    !weather ||
    !Array.isArray(weather.time) ||
    !Array.isArray(weather.rain) ||
    !Array.isArray(weather.et0) ||
    !Array.isArray(weather.tempMax) ||
    weather.et0.length < MIN_DAYS
  ) {
    throw new Error(
      "Invalid weather: expected a normalized object from normalizeWeather/fetchWeather",
    );
  }

  const merged = { ...DEFAULTS, ...controls };
  if (!Array.isArray(merged.watered)) {
    throw new Error("Invalid controls: watered must be an array of day indices");
  }
  const params = deriveParams(merged);
  const dose = SPRINKLER_RATE * merged.wateringMinutes; // gross mm
  const wateredSet = new Set(merged.watered);
  const series = runBalance(weather, params, wateredSet, dose);

  const fraction = (mm) => (params.tankSize > 0 ? mm / params.tankSize : 0);

  const days = [];
  for (let w = 0; w < WINDOW_LENGTH; w++) {
    const i = WINDOW_START + w;
    const rec = series[i];
    days.push({
      index: i,
      date: weather.time[i],
      levelMm: rec.level,
      levelFraction: fraction(rec.level),
      et: rec.loss, // et0·kc·Ks
      rain: rec.rain, // gross
      watering: rec.applied, // gross dose, or 0
      watered: wateredSet.has(i),
      tempMax: weather.tempMax[i],
      isToday: i === TODAY_INDEX,
    });
  }

  const todayRec = series[TODAY_INDEX];
  const today = {
    index: TODAY_INDEX,
    date: weather.time[TODAY_INDEX],
    levelMm: todayRec.level,
    levelFraction: fraction(todayRec.level),
    tempMax: weather.tempMax[TODAY_INDEX],
  };

  return {
    site: SITE,
    ...params,
    dose,
    thresholdFraction: fraction(params.threshold),
    days,
    today,
    nextWatering: projectNextWatering(series, params.threshold),
    series,
  };
}
