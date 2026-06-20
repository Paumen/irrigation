// Soil-Balance backend — data layer + balance logic for one fixed garden.
//
// Pure ES module: fetch weather, derive soil parameters from presets, run the
// FAO-56 daily water balance, and project the next watering. No DOM, no
// rounding/formatting (the UI rounds per UIX-6). Requirement IDs reference
// docs/soil_balance_spec.md.

// ── Site & API (SCO-3, DAT-1) ────────────────────────────────────────────────

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

// One gapless series of 40 days: 24 past + today + 15 forecast. Today is fixed
// at index 24 — never derived from the device clock (DAT-1).
export const TODAY_INDEX = 24;

// Shown window: last 8 days, today, next 7 (DAT-2). Days before it are run-up
// that settles the estimate from the full-tank seed.
export const WINDOW_START = TODAY_INDEX - 8; // 16
export const WINDOW_LENGTH = 16;

// ── Physical constants (DAT-3, LOG-3, LOG-4) ─────────────────────────────────

export const SPRINKLER_RATE = 0.063; // mm/min gross (BL4.0 / 180° I-20)
export const RAIN_EFFECTIVENESS = 0.8;
export const WATERING_EFFICIENCY = 0.9;
export const PROJECTION_DAYS = 14;

// Minimum gapless days the maths need: today (index 24) plus the 14-day
// projection horizon (index 38) → 39 days.
export const MIN_DAYS = TODAY_INDEX + PROJECTION_DAYS + 1;

// ── Presets & defaults (CTR-1, CTR-2, CTR-5) ─────────────────────────────────

export const PLANTINGS = {
  "Turf": { kc: 0.85, rootDepth: 0.15, p: 0.45 },
  "Flower bed": { kc: 0.90, rootDepth: 0.30, p: 0.45 },
  "Shrubs": { kc: 0.70, rootDepth: 0.50, p: 0.50 },
};

// Plant-available water held per metre of depth (field capacity − wilting), mm/m.
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
  watered: [], // absolute day indices into the 40-day series (CTR-4)
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

// ── Weather fetch & normalization (DAT-1, DAT-4) ─────────────────────────────

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

// Turn the raw Open-Meteo payload into parallel numeric arrays, applying the
// DAT-1 null rules: rain → 0, et0 → previous day's value (0 would be wrong;
// first-day null falls back to 0), temperature → null (shown blank, unused in
// maths). Throws on a malformed/short response so callers never use bad data.
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

  // Rain and et0 drive the maths: a missing/short array must fail loudly, never
  // silently zero-fill (DAT-4). Temperature is display-only, so a missing array
  // degrades to blanks per DAT-1 ("temperature → shown blank").
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
  let lastEt0 = 0; // forward-fill seed (first-day-null fallback)

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

// Live request. Throws a clear error on network failure, non-OK response, or
// malformed body — no silent fallback (DAT-4). The UI catches and shows the
// unavailable state. Returns the normalized weather on success.
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

// ── Soil parameters (LOG-1, LOG-2) ───────────────────────────────────────────

// Tank size = available water per metre × root depth (mm, plant-available).
// TAW = tank size; RAW = p × TAW; watering threshold = TAW − RAW = (1−p)·TAW.
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

// ── Daily water balance (LOG-1, LOG-2, LOG-3) ────────────────────────────────

// FAO-56 stress coefficient. Stored = water held above wilting at day start.
// At/above the threshold Ks = 1; below it Ks = stored/threshold (linear to 0 at
// wilting). Threshold 0 → Ks = 1.
export function ks(stored, threshold) {
  if (threshold <= 0) return 1;
  if (stored >= threshold) return 1;
  return clamp(stored / threshold, 0, 1);
}

// Run the balance over every fetched day. Seed full at field capacity on the
// first day (DAT-2); each day: level = clamp(start + gains − losses, 0, tank),
// with overflow above full discarded. Ks uses the previous day's closing level
// (the start-of-day stored water). `dose` is the gross mm applied on watered days.
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

// ── Next-watering projection (LOG-4) ─────────────────────────────────────────

// Walk closing levels forward from today over the next 14 days (toggled future
// watering is already baked into `series`). Today at/below threshold → now (+0);
// first day to/below threshold → +N; none within 14 days → >14.
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

// ── Orchestrator ─────────────────────────────────────────────────────────────

// Recompute everything from controls + normalized weather. Pure and seedless:
// any control change re-runs the whole balance from the full seed (LOG-1), so
// the caller just re-invokes this. Values are full precision (UI rounds, UIX-6).
//
//   controls = { planting, soil, wateringMinutes, watered }  (watered: abs indices)
//
// Returns the view-model: derived params, the dose, the 16-day window, today's
// entry, the next-watering projection, and the full per-day series.
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
  const dose = SPRINKLER_RATE * merged.wateringMinutes; // gross mm (CTR-3)
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
      et: rec.loss, // actual ET loss applied to the tank (et0·kc·Ks)
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
    thresholdFraction: fraction(params.threshold), // marker at (1−p) (UIX-4)
    days,
    today,
    nextWatering: projectNextWatering(series, params.threshold),
    series,
  };
}
