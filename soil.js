'use strict';

// Soil-water "checkbook" for the irrigation system — mockup.
// Tracks root-zone depletion day by day and decides when/how much to water.
// Model and API are pinned in soil_balance_spec.md.

// Volumetric water fractions (mm water / mm soil). Illustrative, mockup-grade.
const SOIL_PRESETS = {
  sand: { fieldCapacity: 0.12, wiltingPoint: 0.04 },
  loam: { fieldCapacity: 0.28, wiltingPoint: 0.12 },
  clay: { fieldCapacity: 0.38, wiltingPoint: 0.24 },
};

const DEFAULTS = {
  mad: 0.5,
  rainCaptureFraction: 0.85,
  mode: 'auto',
  initialDepletionMm: 0,
};

function resolveSoil(soil) {
  if (typeof soil === 'string') {
    const preset = SOIL_PRESETS[soil];
    if (!preset) throw new Error(`unknown soil preset: ${soil}`);
    return preset;
  }
  if (soil && soil.fieldCapacity != null && soil.wiltingPoint != null) return soil;
  throw new Error('soil must be a preset name or { fieldCapacity, wiltingPoint }');
}

// Available water capacity per mm of soil (mm/mm).
function awc(soil) {
  const s = resolveSoil(soil);
  return s.fieldCapacity - s.wiltingPoint;
}

// Total available water over the root zone (mm).
function taw(soil, rootDepthMm) {
  return awc(soil) * rootDepthMm;
}

// Readily available water — the irrigation trigger threshold (mm).
function raw(totalAvailableWater, mad) {
  return mad * totalAvailableWater;
}

// Crop evapotranspiration for the day (mm).
function etc(et0, kc) {
  return et0 * kc;
}

// Advance the balance one day. Returns { state, record }.
// state is { depletion } in mm below field capacity.
function step(state, day, params) {
  const { TAW, RAW, kc, captureFraction, mode } = params;
  let depletion = state.depletion;

  // 1. Decide irrigation.
  let irrigation;
  if (mode === 'auto') {
    irrigation = depletion >= RAW ? depletion : 0; // refill to field capacity
  } else {
    irrigation = day.irrigation || 0;
  }

  // 2. Credit gains; overflow past field capacity is lost.
  const effectiveRain = (day.rain || 0) * captureFraction;
  depletion -= irrigation + effectiveRain;
  let loss = 0;
  if (depletion < 0) {
    loss = -depletion;
    depletion = 0;
  }

  // 3. Debit the day's water use (no clamp — soil can dry past wilting point).
  const use = etc(day.et0, kc);
  depletion += use;

  // 4. Flag stress.
  const stressed = depletion > RAW;

  const record = {
    etc: round(use),
    rain: round(day.rain || 0),
    effectiveRain: round(effectiveRain),
    irrigation: round(irrigation),
    loss: round(loss),
    depletion: round(depletion),
    percentDepleted: round((depletion / TAW) * 100),
    stressed,
  };
  return { state: { depletion }, record };
}

function simulate(days, config) {
  const cfg = { ...DEFAULTS, ...config };
  const TAW = taw(cfg.soil, cfg.rootDepthMm);
  const RAW = raw(TAW, cfg.mad);
  const params = {
    TAW,
    RAW,
    kc: cfg.kc,
    captureFraction: cfg.rainCaptureFraction,
    mode: cfg.mode,
  };

  let state = { depletion: cfg.initialDepletionMm };
  const records = [];
  for (let i = 0; i < days.length; i++) {
    const out = step(state, days[i], params);
    state = out.state;
    records.push({ day: i + 1, ...out.record });
  }

  const sum = (key) => records.reduce((a, r) => a + r[key], 0);
  const summary = {
    totalIrrigation: round(sum('irrigation')),
    totalEffectiveRain: round(sum('effectiveRain')),
    totalEt: round(sum('etc')),
    totalLoss: round(sum('loss')),
    irrigationEvents: records.filter((r) => r.irrigation > 0).length,
    stressedDays: records.filter((r) => r.stressed).length,
  };

  return { days: records, summary, params: { taw: round(TAW), raw: round(RAW) } };
}

function round(x) {
  return Math.round(x * 100) / 100;
}

module.exports = { SOIL_PRESETS, awc, taw, raw, etc, step, simulate };

// Demo: a dry two-week stretch on loam with one rainy day.
if (require.main === module) {
  const days = Array.from({ length: 14 }, (_, i) => ({
    et0: 5 + (i % 3), // 5–7 mm/day
    rain: i === 6 ? 18 : 0, // one storm mid-stretch
  }));
  const result = simulate(days, { soil: 'loam', rootDepthMm: 300, kc: 0.9 });

  console.log(`TAW ${result.params.taw} mm   RAW ${result.params.raw} mm\n`);
  console.log('day  ET0c  rain  irrig   loss   depl   %depl  stress');
  for (const r of result.days) {
    console.log(
      String(r.day).padStart(3),
      String(r.etc).padStart(5),
      String(r.rain).padStart(5),
      String(r.irrigation).padStart(6),
      String(r.loss).padStart(6),
      String(r.depletion).padStart(6),
      String(r.percentDepleted).padStart(6),
      r.stressed ? '  YES' : ''
    );
  }
  console.log('\nsummary', result.summary);
}
