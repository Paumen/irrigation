import {
  compute,
  fetchWeather,
  PLANTINGS,
  SOILS,
  SUN_EXPOSURES,
  DEFAULTS,
} from "./soil.js";

// ── State ──────────────────────────────────────────────────────────────
// Nothing is persisted (SCO-3): every control lives here and resets on
// reload. `watered` is a Set of day indices into the weather series.
const state = {
  planting: DEFAULTS.planting,
  soil: DEFAULTS.soil,
  sun: DEFAULTS.sun,
  wateringMinutes: DEFAULTS.wateringMinutes,
  watered: new Set(),
};

let weather = null;

const el = (name) => document.querySelector(`[data-el="${name}"]`);
const refs = {
  status: el("status"),
  graph: el("graph"),
  planting: el("planting"),
  soil: el("soil"),
  sun: el("sun"),
  minutes: el("minutes"),
  dose: el("dose"),
  reset: el("reset"),
};

// ── Display rounding (UIX-6) ───────────────────────────────────────────
const mm = (x) => `${Math.round(x)} mm`;
const deg = (t) => (t == null ? "–" : `${Math.round(t)}°`);

// ── Colour helpers (calm / natural palette, UIX-1) ─────────────────────
const SOIL = { sun: "#f3b94d", rain: "#6db4e6", water: "#5aa9d6" };

function lerpColor(a, b, t) {
  const ch = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const pa = [ch(a, 1), ch(a, 3), ch(a, 5)];
  const pb = [ch(b, 1), ch(b, 3), ch(b, 5)];
  const hex = pa
    .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ── Controls ───────────────────────────────────────────────────────────
function fillSelect(node, keys, selected) {
  node.replaceChildren();
  for (const k of keys) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    if (k === selected) opt.selected = true;
    node.append(opt);
  }
}

function initControls() {
  fillSelect(refs.planting, Object.keys(PLANTINGS), state.planting);
  fillSelect(refs.soil, Object.keys(SOILS), state.soil);
  fillSelect(refs.sun, Object.keys(SUN_EXPOSURES), state.sun);
  refs.minutes.value = String(state.wateringMinutes);

  refs.planting.addEventListener("change", (e) => {
    state.planting = e.target.value;
    render();
  });
  refs.soil.addEventListener("change", (e) => {
    state.soil = e.target.value;
    render();
  });
  refs.sun.addEventListener("change", (e) => {
    state.sun = e.target.value;
    render();
  });
  refs.minutes.addEventListener("input", (e) => {
    const v = Number.parseInt(e.target.value, 10);
    state.wateringMinutes = Number.isFinite(v) && v >= 0 ? v : 0;
    render();
  });
  refs.reset.addEventListener("click", () => {
    state.watered.clear();
    render();
  });

  // Toggle a watering on the tapped day (CTR-1): one instant, reversible act.
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

// ── Today (Europe/Amsterdam) ───────────────────────────────────────────
function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
}

// ── SVG cross-section (UIX-2/3/4) ──────────────────────────────────────
// The graph is a soil column: a brown earth block whose blue fill is the
// plant-available water held. Above the surface a sun (drying), rain,
// watering and a flower explain *why* the level moves; below it roots
// reach ~half the soil depth, strong when wet and weak when dry.
function renderGraph(result, todayIndex) {
  const series = result.series;
  const tank = result.tankSize;
  const n = series.length;

  // ~10 days fill the viewport, then scroll (UIX-5). Floor a legible width.
  const colW = Math.max(58, Math.floor(window.innerWidth / 10));
  const H = 360;
  const W = n * colW;
  const k = colW / 72; // icon scale

  const surfaceY = 150;
  const labelH = 46;
  const soilBottom = H - labelH;
  const soilTop = surfaceY;
  const soilDepth = soilBottom - soilTop;
  const rootBottom = soilTop + soilDepth * 0.5;

  const maxEt0 = Math.max(0.1, ...series.map((d) => d.loss));
  const maxRain = Math.max(0.1, ...series.map((d) => d.rain));

  const p = [];
  p.push(
    `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
      `role="img" aria-label="Soil-moisture cross-section over ${n} days">`,
  );
  p.push(
    `<defs>` +
      `<linearGradient id="g-soil" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#a07f5e"/>` +
      `<stop offset="1" stop-color="#6b4f37"/></linearGradient>` +
      `<linearGradient id="g-water" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#7cc0e3"/>` +
      `<stop offset="1" stop-color="#4f96c4"/></linearGradient>` +
      `</defs>`,
  );
  // Sky wash.
  p.push(`<rect x="0" y="0" width="${W}" height="${surfaceY}" fill="#eaf4f7"/>`);

  for (let i = 0; i < n; i++) {
    const d = series[i];
    const x = i * colW;
    const cx = x + colW / 2;
    const vigor = clamp01(d.level / tank);

    // Today: highlight band behind the column.
    if (i === todayIndex) {
      p.push(
        `<rect x="${x}" y="0" width="${colW}" height="${H}" ` +
          `fill="#3f7d3a" opacity="0.08"/>`,
      );
    }

    // Soil block + thin separator.
    p.push(
      `<rect x="${x}" y="${soilTop}" width="${colW}" height="${soilDepth}" ` +
        `fill="url(#g-soil)"/>`,
    );
    p.push(
      `<line x1="${x}" y1="${soilTop}" x2="${x}" y2="${soilBottom}" ` +
        `stroke="#000000" stroke-opacity="0.06"/>`,
    );

    // Water held — the fill height is the moisture trend at a glance.
    const waterTop = soilBottom - vigor * soilDepth;
    const waterH = soilBottom - waterTop;
    if (waterH > 0.5) {
      p.push(
        `<rect x="${x}" y="${waterTop}" width="${colW}" height="${waterH}" ` +
          `fill="url(#g-water)" opacity="0.85"/>`,
      );
      p.push(
        `<line x1="${x}" y1="${waterTop}" x2="${x + colW}" y2="${waterTop}" ` +
          `stroke="#2f6f97" stroke-width="1.5"/>`,
      );
    }

    // Roots — colour brown→green and thicken with vigour.
    const rootColor = lerpColor("#9a7d52", "#3f8f46", vigor);
    const rootW = (1.4 + vigor * 2.2) * k;
    const rb = rootBottom;
    p.push(
      `<path d="M${cx} ${soilTop} L${cx} ${rb} ` +
        `M${cx} ${soilTop + (rb - soilTop) * 0.4} L${cx - 12 * k} ${rb - 4} ` +
        `M${cx} ${soilTop + (rb - soilTop) * 0.6} L${cx + 12 * k} ${rb}" ` +
        `fill="none" stroke="${rootColor}" stroke-width="${rootW}" ` +
        `stroke-linecap="round" opacity="${0.45 + vigor * 0.5}"/>`,
    );

    // Surface / grass line.
    p.push(
      `<line x1="${x}" y1="${surfaceY}" x2="${x + colW}" y2="${surfaceY}" ` +
        `stroke="#3f7d3a" stroke-width="2.5"/>`,
    );

    // Flower — droops and desaturates as the soil dries.
    const droop = (1 - vigor) * 16 * k;
    const stemTop = surfaceY - 64 * k;
    const bloomY = stemTop + droop;
    const bloomColor = lerpColor("#b39169", "#e0668a", vigor);
    p.push(
      `<path d="M${cx} ${surfaceY} Q${cx + droop * 0.6} ` +
        `${(surfaceY + stemTop) / 2} ${cx} ${stemTop}" ` +
        `fill="none" stroke="#4f8f4a" stroke-width="${2 * k}" ` +
        `stroke-linecap="round"/>`,
    );
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      const px = cx + Math.cos(ang) * 6 * k;
      const py = bloomY + Math.sin(ang) * 6 * k;
      p.push(
        `<circle cx="${px}" cy="${py}" r="${4 * k}" fill="${bloomColor}" ` +
          `opacity="${0.5 + vigor * 0.5}"/>`,
      );
    }
    p.push(`<circle cx="${cx}" cy="${bloomY}" r="${3.5 * k}" fill="#f3d34d"/>`);

    // Sun — bigger when the day's drying loss is larger.
    const sunR = (4 + (d.loss / maxEt0) * 7) * k;
    const sx = x + colW * 0.26;
    const sy = 30;
    for (let r = 0; r < 8; r++) {
      const ang = (r / 8) * Math.PI * 2;
      p.push(
        `<line x1="${sx + Math.cos(ang) * sunR * 1.2}" ` +
          `y1="${sy + Math.sin(ang) * sunR * 1.2}" ` +
          `x2="${sx + Math.cos(ang) * sunR * 1.7}" ` +
          `y2="${sy + Math.sin(ang) * sunR * 1.7}" ` +
          `stroke="${SOIL.sun}" stroke-width="${1.5 * k}" ` +
          `stroke-linecap="round"/>`,
      );
    }
    p.push(`<circle cx="${sx}" cy="${sy}" r="${sunR}" fill="${SOIL.sun}"/>`);

    // Rain — droplets sized by the day's rainfall.
    if (d.rain > 0.05) {
      const intensity = clamp01(d.rain / maxRain);
      const drops = 1 + Math.round(intensity * 3);
      const rx = x + colW * 0.66;
      for (let r = 0; r < drops; r++) {
        const dy = 48 + r * 16 * k;
        const dxo = (r % 2 === 0 ? -1 : 1) * 5 * k;
        p.push(
          `<path d="M${rx + dxo} ${dy} c${3.5 * k} ${5 * k} ${3.5 * k} ` +
            `${8 * k} 0 ${9 * k} c${-3.5 * k} ${-1 * k} ${-3.5 * k} ` +
            `${-4 * k} 0 ${-9 * k} Z" fill="${SOIL.rain}"/>`,
        );
      }
    }

    // Watering marker — clear, distinct droplet ring when the user watered.
    if (d.applied > 0) {
      const wy = surfaceY - 24 * k;
      p.push(
        `<circle cx="${cx}" cy="${wy}" r="${11 * k}" fill="none" ` +
          `stroke="#2f7fb0" stroke-width="${1.4 * k}" opacity="0.7"/>`,
      );
      p.push(
        `<path d="M${cx} ${wy - 8 * k} c${5 * k} ${7 * k} ${5 * k} ` +
          `${11 * k} 0 ${12 * k} c${-5 * k} ${-1 * k} ${-5 * k} ` +
          `${-5 * k} 0 ${-12 * k} Z" fill="#2f7fb0"/>`,
      );
    }

    // Labels: weekday + max temperature (UIX-6 rounding).
    p.push(
      `<text x="${cx}" y="${soilBottom + 18}" text-anchor="middle" ` +
        `font-size="${12}" fill="#4a4a4a" ` +
        `font-family="Nunito, sans-serif">${d.weekday.slice(0, 3)}</text>`,
    );
    p.push(
      `<text x="${cx}" y="${soilBottom + 36}" text-anchor="middle" ` +
        `font-size="${13}" font-weight="700" fill="#2f6f97" ` +
        `font-family="Nunito, sans-serif">${deg(d.tempMax)}</text>`,
    );

    if (i === todayIndex) {
      p.push(
        `<text x="${cx}" y="14" text-anchor="middle" font-size="11" ` +
          `font-weight="700" fill="#3f7d3a" ` +
          `font-family="Nunito, sans-serif">TODAY</text>`,
      );
    }

    // Clickable / focusable overlay with native tooltip (values on demand).
    const moist = Math.round(vigor * 100);
    const watered = d.applied > 0 ? `, watered ${mm(d.applied)}` : "";
    const tip =
      `${d.weekday} ${d.date} — moisture ${moist}% (${mm(d.level)} of ` +
      `${mm(tank)}), rain ${mm(d.rain)}, loss ${mm(d.loss)}${watered}`;
    p.push(
      `<rect data-day="${i}" x="${x}" y="0" width="${colW}" height="${H}" ` +
        `fill="#000000" fill-opacity="0" tabindex="0" role="button" ` +
        `aria-label="${tip}. Tap to toggle watering.">` +
        `<title>${tip}</title></rect>`,
    );
  }

  p.push(`</svg>`);
  refs.graph.innerHTML = p.join("");
  refs.graph.hidden = false;

  // Bring today into view on first paint.
  if (todayIndex >= 0 && !refs.graph.dataset.scrolled) {
    refs.graph.scrollLeft = Math.max(0, todayIndex * colW - colW * 2);
    refs.graph.dataset.scrolled = "1";
  }
}

// ── Render pipeline ────────────────────────────────────────────────────
function render() {
  if (!weather) return;
  const result = compute({ ...state, watered: [...state.watered] }, weather);
  refs.dose.textContent = `Each watering adds ≈ ${mm(result.dose)}.`;

  const today = todayIso();
  let todayIndex = result.series.findIndex((d) => d.date === today);
  if (todayIndex < 0) todayIndex = Math.min(10, result.series.length - 1);

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
