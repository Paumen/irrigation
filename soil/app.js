import {
  compute,
  fetchWeather,
  PLANTINGS,
  SOILS,
  SUN_EXPOSURES,
  DEFAULTS,
} from "./soil.js";

// ── State ──────────────────────────────────────────────────────────────
// Nothing is persisted (SCO-3): controls live here and reset on reload.
const state = {
  planting: DEFAULTS.planting,
  soil: DEFAULTS.soil,
  sun: DEFAULTS.sun,
  wateringMinutes: DEFAULTS.wateringMinutes,
  watered: new Set(),
};

// Display-only refill point (CTR/SCO-1): water-now guidance threshold, as a
// fraction of the tank. It does not change the balance (LOG-2: no stress
// throttle) — it only drives the verdict card.
const REFILL_FRACTION = 0.5;

let weather = null;

const el = (name) => document.querySelector(`[data-el="${name}"]`);
const refs = {
  head: el("subtitle"),
  card: el("card"),
  refillText: el("refillText"),
  dot: el("dot"),
  verdict: el("verdict"),
  moisture: el("moisture"),
  bar: el("bar"),
  status: el("status"),
  graph: el("graph"),
  planting: el("planting"),
  soil: el("soil"),
  sun: el("sun"),
  durOut: el("durOut"),
  durMinus: el("durMinus"),
  durPlus: el("durPlus"),
  reset: el("reset"),
};

// ── Earthy palette ─────────────────────────────────────────────────────
const C = {
  sky: "#f3ecdd",
  soil: ["#5a4126", "#6e4d2f", "#876039", "#a67e4f"],
  water: "#2f9aa0",
  waterEdge: "#27c0cf",
  refill: "#b5532e",
  sun: "#c2643a",
  shimmer: "#b58a5f",
  rain: "#3f7fae",
  watering: "#1fb6c9",
  stemWet: "#557d33",
  stemDry: "#856a45",
  leaf: "#5d9440",
  bloom: "#cf6f96",
  bloomEye: "#e8c64b",
  rootWet: "#52662f",
  rootDry: "#5a4326",
  text: "#5b5340",
  today: "#46703a",
};

// ── Display rounding (UIX-6) ───────────────────────────────────────────
const mm = (x) => Math.round(x);
const deg = (t) => (t == null ? "–" : `${Math.round(t)}°`);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

function lerpColor(a, b, t) {
  const ch = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const out = [1, 3, 5]
    .map((i) => {
      const v = Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * clamp01(t));
      return v.toString(16).padStart(2, "0");
    })
    .join("");
  return `#${out}`;
}

// ── Controls ───────────────────────────────────────────────────────────
function buildToggle(node, name, keys, selected) {
  node.replaceChildren();
  keys.forEach((key, i) => {
    const id = `${name}-${i}`;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.id = id;
    input.value = key;
    if (key === selected) input.checked = true;
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.textContent = key;
    node.append(input, label);
  });
}

function initControls() {
  buildToggle(refs.planting, "planting", Object.keys(PLANTINGS), state.planting);
  buildToggle(refs.soil, "soil", Object.keys(SOILS), state.soil);
  buildToggle(refs.sun, "sun", Object.keys(SUN_EXPOSURES), state.sun);
  refs.durOut.textContent = `${state.wateringMinutes} min`;

  const onPick = (e) => {
    const input = e.target.closest("input[type='radio']");
    if (!input) return;
    state[input.name] = input.value;
    render();
  };
  for (const f of [refs.planting, refs.soil, refs.sun]) {
    f.addEventListener("change", onPick);
  }

  const step = (delta) => {
    state.wateringMinutes = Math.min(
      600,
      Math.max(0, state.wateringMinutes + delta),
    );
    refs.durOut.textContent = `${state.wateringMinutes} min`;
    render();
  };
  refs.durMinus.addEventListener("click", () => step(-5));
  refs.durPlus.addEventListener("click", () => step(5));

  refs.reset.addEventListener("click", () => {
    state.watered.clear();
    render();
  });

  // Tap a day, past or future, to toggle a watering — instant, reversible
  // (CTR-1).
  refs.graph.addEventListener("click", (e) => {
    const col = e.target.closest("[data-day]");
    if (col) toggleDay(Number(col.dataset.day));
  });
  refs.graph.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const col = e.target.closest("[data-day]");
    if (col) {
      e.preventDefault();
      toggleDay(Number(col.dataset.day));
    }
  });
}

function toggleDay(i) {
  if (state.watered.has(i)) state.watered.delete(i);
  else state.watered.add(i);
  render();
}

// ── Today (Europe/Amsterdam), locale-independent YYYY-MM-DD ────────────
function todayIso() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// ── Verdict card (SCO-1) ───────────────────────────────────────────────
function renderCard(result, todayIndex) {
  const tank = result.tankSize;
  const cur = result.series[todayIndex];
  const frac = clamp01(cur.level / tank);
  const pct = Math.round(frac * 100);
  const below = frac < REFILL_FRACTION;
  const tone = below ? C.refill : C.today;

  refs.card.dataset.mood = below ? "dry" : "ok";
  refs.refillText.textContent = below ? "Below refill point" : "Above refill point";
  refs.dot.setAttribute("fill", tone);
  refs.verdict.textContent = below ? "Water now" : "Looking good";
  refs.moisture.innerHTML =
    `<b>${pct}%</b> ${mm(cur.level)} / ${mm(tank)} mm held`;

  const fillW = pct;
  const markX = Math.round(REFILL_FRACTION * 100);
  refs.bar.innerHTML =
    `<svg width="100%" height="14" viewBox="0 0 100 6" ` +
    `preserveAspectRatio="none" role="img" ` +
    `aria-label="${pct}% of capacity, refill point at ${markX}%">` +
    `<rect x="0" y="1" width="100" height="4" rx="2" fill="${C.sky}" ` +
    `stroke="#0000001f"/>` +
    `<rect x="0" y="1" width="${fillW}" height="4" rx="2" fill="${tone}"/>` +
    `<line x1="${markX}" y1="0" x2="${markX}" y2="6" ` +
    `stroke="${C.text}" stroke-width="0.8"/></svg>`;
  refs.card.hidden = false;
}

// ── Smooth curve through points (Catmull-Rom → cubic Bézier) ───────────
function smoothPath(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ── Soil cross-section (UIX-2/3/4) ─────────────────────────────────────
// A layered earth block with a smooth water-table curve (the moisture trend
// at a glance). Above the surface: terracotta suns with heat shimmer, slanted
// rain and watering droplets explain *why* the level moves; the plants thrive
// when wet and wither to bare twigs when dry; a dashed refill line marks the
// water-now threshold.
function renderGraph(result, todayIndex) {
  const series = result.series;
  const tank = result.tankSize;
  const n = series.length;

  const colW = Math.max(64, Math.floor(window.innerWidth / 10));
  const H = 384;
  const W = n * colW;
  const k = colW / 72;

  const surfaceY = 150;
  const labelH = 52;
  const soilBottom = H - labelH;
  const soilTop = surfaceY;
  const soilDepth = soilBottom - soilTop;
  const refillY = soilBottom - REFILL_FRACTION * soilDepth;

  const maxLoss = Math.max(0.1, ...series.map((d) => d.loss));
  const maxRain = Math.max(0.1, ...series.map((d) => d.rain));
  const cx = (i) => i * colW + colW / 2;
  const waterY = (i) => soilBottom - clamp01(series[i].level / tank) * soilDepth;

  const p = [];
  p.push(
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
      `aria-label="Soil-moisture cross-section over ${n} days">`,
  );

  // Sky.
  p.push(`<rect x="0" y="0" width="${W}" height="${surfaceY}" fill="${C.sky}"/>`);

  // Layered soil bands.
  const bandH = soilDepth / C.soil.length;
  C.soil.forEach((fill, b) => {
    p.push(
      `<rect x="0" y="${soilTop + b * bandH}" width="${W}" ` +
        `height="${bandH + 1}" fill="${fill}"/>`,
    );
  });

  // Water table — smooth filled area + bright edge line (the trend).
  const pts = [[0, waterY(0)]];
  for (let i = 0; i < n; i++) pts.push([cx(i), waterY(i)]);
  pts.push([W, waterY(n - 1)]);
  const curve = smoothPath(pts);
  p.push(
    `<path d="${curve} L${W} ${soilBottom} L0 ${soilBottom} Z" ` +
      `fill="${C.water}" fill-opacity="0.55"/>`,
  );
  p.push(`<path d="${curve}" fill="none" stroke="${C.waterEdge}" stroke-width="2"/>`);

  // Refill-point line.
  p.push(
    `<line x1="0" y1="${refillY}" x2="${W}" y2="${refillY}" ` +
      `stroke="${C.refill}" stroke-width="1.6" stroke-dasharray="7 5" ` +
      `opacity="0.85"/>`,
  );

  // Surface line.
  p.push(
    `<line x1="0" y1="${surfaceY}" x2="${W}" y2="${surfaceY}" ` +
      `stroke="${C.soil[0]}" stroke-width="2"/>`,
  );

  for (let i = 0; i < n; i++) {
    const d = series[i];
    const x = i * colW;
    const c = cx(i);
    const v = clamp01(d.level / tank);

    // Today highlight band.
    if (i === todayIndex) {
      p.push(
        `<rect x="${x}" y="0" width="${colW}" height="${H}" ` +
          `fill="${C.today}" opacity="0.1"/>`,
      );
    }

    // Roots — wiry, longer/greener when wet.
    const rootColor = lerpColor(C.rootDry, C.rootWet, (v - 0.2) / 0.6);
    const rootLen = (0.3 + v * 0.5) * soilDepth;
    const rb = soilTop + rootLen;
    p.push(
      `<path d="M${c} ${soilTop} L${c} ${rb} ` +
        `M${c} ${soilTop + rootLen * 0.45} L${c - 9 * k} ${rb - 6} ` +
        `M${c} ${soilTop + rootLen * 0.65} L${c + 9 * k} ${rb}" ` +
        `fill="none" stroke="${rootColor}" stroke-width="${1.3 * k}" ` +
        `stroke-linecap="round" opacity="${0.5 + v * 0.4}"/>`,
    );

    // Plant — leafy bloom when wet, bare twig when dry.
    const stemColor = lerpColor(C.stemDry, C.stemWet, (v - 0.15) / 0.5);
    const stemH = (26 + v * 58) * k;
    const tipY = surfaceY - stemH;
    const bend = (1 - v) * 10 * k;
    p.push(
      `<path d="M${c} ${surfaceY} Q${c + bend} ${surfaceY - stemH * 0.55} ` +
        `${c + bend * 0.6} ${tipY}" fill="none" stroke="${stemColor}" ` +
        `stroke-width="${2 * k}" stroke-linecap="round"/>`,
    );
    const leaves = Math.round(v * 3);
    for (let l = 0; l < leaves; l++) {
      const ly = surfaceY - stemH * (0.3 + l * 0.22);
      const side = l % 2 === 0 ? 1 : -1;
      p.push(
        `<ellipse cx="${c + side * 6 * k}" cy="${ly}" rx="${5 * k}" ` +
          `ry="${2.6 * k}" fill="${C.leaf}" ` +
          `transform="rotate(${side * 30} ${c + side * 6 * k} ${ly})"/>`,
      );
    }
    if (v >= 0.42) {
      const bx = c + bend * 0.6;
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2;
        p.push(
          `<circle cx="${bx + Math.cos(ang) * 5 * k}" ` +
            `cy="${tipY + Math.sin(ang) * 5 * k}" r="${3.4 * k}" ` +
            `fill="${C.bloom}"/>`,
        );
      }
      p.push(`<circle cx="${bx}" cy="${tipY}" r="${3 * k}" fill="${C.bloomEye}"/>`);
    }

    // Sun — terracotta, larger when the day's drying loss is larger.
    const heat = d.loss / maxLoss;
    const sunR = (5 + heat * 7) * k;
    const sx = x + colW * 0.28;
    const sy = 32;
    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2;
      p.push(
        `<line x1="${sx + Math.cos(ang) * sunR * 1.25}" ` +
          `y1="${sy + Math.sin(ang) * sunR * 1.25}" ` +
          `x2="${sx + Math.cos(ang) * sunR * 1.75}" ` +
          `y2="${sy + Math.sin(ang) * sunR * 1.75}" stroke="${C.sun}" ` +
          `stroke-width="${1.4 * k}" stroke-linecap="round"/>`,
      );
    }
    p.push(`<circle cx="${sx}" cy="${sy}" r="${sunR}" fill="${C.sun}"/>`);

    // Heat shimmer under hot suns.
    if (heat > 0.55) {
      const wy = sy + sunR + 10 * k;
      const w = 9 * k;
      p.push(
        `<path d="M${sx - w} ${wy} q${w / 2} ${-4} ${w} 0 t${w} 0" ` +
          `fill="none" stroke="${C.shimmer}" stroke-width="${1.2 * k}" ` +
          `opacity="0.7"/>`,
      );
    }

    // Rain — slanted streaks, more for heavier rain.
    if (d.rain > 0.05) {
      const drops = 1 + Math.round(clamp01(d.rain / maxRain) * 3);
      const rx0 = x + colW * 0.62;
      for (let r = 0; r < drops; r++) {
        const rx = rx0 + (r % 2) * 8 * k;
        const ry = 60 + Math.floor(r / 2) * 16 * k;
        p.push(
          `<line x1="${rx}" y1="${ry}" x2="${rx - 5 * k}" y2="${ry + 12 * k}" ` +
            `stroke="${C.rain}" stroke-width="${1.6 * k}" ` +
            `stroke-linecap="round"/>`,
        );
      }
    }

    // Watering — bright cyan droplet when the user watered this day.
    if (d.applied > 0) {
      const wy = surfaceY - 96 * k;
      p.push(
        `<path d="M${c} ${wy} c${6 * k} ${8 * k} ${6 * k} ${13 * k} 0 ${14 * k} ` +
          `c${-6 * k} ${-1 * k} ${-6 * k} ${-6 * k} 0 ${-14 * k} Z" ` +
          `fill="${C.watering}"/>`,
      );
      p.push(
        `<circle cx="${c - 2 * k}" cy="${wy + 8 * k}" r="${1.6 * k}" ` +
          `fill="#ffffff" opacity="0.7"/>`,
      );
    }

    // Labels: day-of-month + weekday (today in green).
    const dom = String(Number(d.date.slice(8, 10)));
    const isToday = i === todayIndex;
    const labelColor = isToday ? C.today : C.text;
    const weight = isToday ? "700" : "400";
    p.push(
      `<text x="${c}" y="${soilBottom + 22}" text-anchor="middle" ` +
        `font-size="16" font-weight="${weight}" fill="${labelColor}" ` +
        `font-family="Nunito, sans-serif">${dom}</text>`,
    );
    p.push(
      `<text x="${c}" y="${soilBottom + 39}" text-anchor="middle" ` +
        `font-size="11" fill="${labelColor}" ` +
        `font-family="Nunito, sans-serif">${d.weekday.slice(0, 3)} · ${deg(d.tempMax)}</text>`,
    );

    if (isToday) {
      p.push(
        `<rect x="${c - 26}" y="6" width="52" height="18" rx="9" ` +
          `fill="${C.today}"/>`,
      );
      p.push(
        `<text x="${c}" y="19" text-anchor="middle" font-size="10" ` +
          `font-weight="700" fill="${C.sky}" ` +
          `font-family="Nunito, sans-serif">TODAY</text>`,
      );
    }

    // Clickable / focusable overlay with native tooltip (values on demand).
    const moist = Math.round(v * 100);
    const watered = d.applied > 0 ? `, watered ${mm(d.applied)} mm` : "";
    const tip =
      `${d.weekday} ${d.date} — moisture ${moist}% (${mm(d.level)} of ` +
      `${mm(tank)} mm), rain ${mm(d.rain)} mm, loss ${mm(d.loss)} mm${watered}`;
    p.push(
      `<rect data-day="${i}" x="${x}" y="0" width="${colW}" height="${H}" ` +
        `fill="#000000" fill-opacity="0" tabindex="0" role="button" ` +
        `aria-label="${tip}. Tap to toggle watering."><title>${tip}</title></rect>`,
    );
  }

  p.push(`</svg>`);
  refs.graph.innerHTML = p.join("");
  refs.graph.hidden = false;

  // Bring today into view on first paint (after layout).
  if (todayIndex >= 0 && !refs.graph.dataset.scrolled) {
    refs.graph.dataset.scrolled = "1";
    requestAnimationFrame(() => {
      refs.graph.scrollLeft = Math.max(0, todayIndex * colW - colW * 2);
    });
  }
}

// ── Render pipeline ────────────────────────────────────────────────────
function render() {
  if (!weather) return;
  const result = compute({ ...state, watered: [...state.watered] }, weather);
  refs.head.textContent = `${state.planting} · Wijchen`;

  const today = todayIso();
  let todayIndex = result.series.findIndex((d) => d.date === today);
  if (todayIndex < 0) todayIndex = Math.min(10, result.series.length - 1);

  renderCard(result, todayIndex);
  renderGraph(result, todayIndex);
}

// ── Boot ───────────────────────────────────────────────────────────────
async function boot() {
  initControls();
  try {
    weather = await fetchWeather();
    refs.status.hidden = true;
    refs.status.removeAttribute("data-state");
    render();
  } catch (err) {
    // No silent fallback (DAT-3): a clear unavailable state, never stale data.
    refs.card.hidden = true;
    refs.graph.hidden = true;
    refs.status.hidden = false;
    refs.status.dataset.state = "error";
    refs.status.textContent =
      `Weather is unavailable — ${err.message}. ` +
      `Reload to try again; no estimated data is shown.`;
  }
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});

boot();
