/* Soil-Balance — renders the soil-cross-section graph (the centrepiece) and
   drives the status from the same data. Ported from docs/mockups/soil-balance.html,
   adapted to inject into the freeform graph slot and the composed status card.
   Sample data for now; live weather + soil.js compute() get wired next. */
(function () {
  const TANK = 39, DOSE = 3.78, START = 39, TODAY = "2026-06-24";
  const REFILL = TANK * 0.5;
  const SVGMONO = "ui-monospace,Menlo,Consolas,monospace";

  // [_, date, weekday, tempMax, et0, rain] — two weeks back + forecast.
  const RAW = [
    [0, "2026-06-11", "Thu", 16.6, 2.53, 5.3], [1, "2026-06-12", "Fri", 19.2, 0.85, 5.1],
    [2, "2026-06-13", "Sat", 17.4, 2.69, 0.3], [3, "2026-06-14", "Sun", 17.6, 3.60, 0.2],
    [4, "2026-06-15", "Mon", 19.0, 3.19, 0.0], [5, "2026-06-16", "Tue", 23.5, 4.24, 0.1],
    [6, "2026-06-17", "Wed", 23.8, 2.90, 0.2], [7, "2026-06-18", "Thu", 29.2, 5.50, 0.0],
    [8, "2026-06-19", "Fri", 33.7, 5.62, 3.4], [9, "2026-06-20", "Sat", 28.9, 5.62, 3.4],
    [10, "2026-06-21", "Sun", 29.7, 5.39, 0.0], [11, "2026-06-22", "Mon", 30.4, 6.44, 0.0],
    [12, "2026-06-23", "Tue", 27.2, 5.62, 0.0], [13, "2026-06-24", "Wed", 31.7, 5.78, 0.0],
    [14, "2026-06-25", "Thu", 33.5, 6.42, 0.0], [15, "2026-06-26", "Fri", 36.0, 6.66, 0.0],
    [16, "2026-06-27", "Sat", 31.4, 5.65, 1.8], [17, "2026-06-28", "Sun", 29.0, 5.85, 0.0],
    [18, "2026-06-29", "Mon", 32.6, 5.89, 3.6], [19, "2026-06-30", "Tue", 24.6, 2.80, 10.5],
    [20, "2026-07-01", "Wed", 18.1, 1.42, 18.3], [21, "2026-07-02", "Thu", 20.8, 4.06, 1.8],
    [22, "2026-07-03", "Fri", 19.8, 3.66, 2.4], [23, "2026-07-04", "Sat", 19.4, 2.97, 3.0],
    [24, "2026-07-05", "Sun", 29.2, 5.98, 0.0],
  ];
  const plan = { 7: 60, 11: 60 };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

  function computeData() {
    let prev = START;
    return RAW.map((r, idx) => {
      const [, date, wd, tmax, et0, rain] = r;
      const loss = 0.9 * et0, gain = 0.8 * rain, mins = plan[idx] || 0, appMm = (mins / 60) * DOSE;
      const level = clamp(prev - loss + gain + appMm, 0, TANK);
      prev = level;
      return { idx, date, wd, tmax, et0, rain, loss, gain, mins, appMm, level };
    });
  }
  let DATA = computeData();

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hxc(c) { c = c.replace("#", ""); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function hexLerp(a, b, t) { const A = hxc(a), B = hxc(b); const m = (i) => Math.round(lerp(A[i], B[i], clamp(t, 0, 1))); return `rgb(${m(0)},${m(1)},${m(2)})`; }
  function ramp(stops, v) { v = clamp(v, 0, 1); for (let i = 0; i < stops.length - 1; i++) { const [p0, c0] = stops[i], [p1, c1] = stops[i + 1]; if (v <= p1) { const t = (v - p0) / ((p1 - p0) || 1); return hexLerp(c0, c1, t); } } return stops[stops.length - 1][1]; }
  const rootColor = (v) => ramp([[0, "#2A2620"], [0.10, "#56422E"], [0.30, "#8A6A3E"], [0.60, "#7E8A3E"], [1, "#4F7F4A"]], v);
  const plantColor = (v) => ramp([[0, "#3A352C"], [0.10, "#9A7A3C"], [0.25, "#7E8A3E"], [0.55, "#4F7F4A"], [1, "#3F7A3B"]], v);
  const leafColor = (v) => ramp([[0, "#67563C"], [0.25, "#9C8A45"], [0.6, "#6FA06A"], [1, "#5F9A5A"]], v);
  const sunCore = (h) => ramp([[0, "#E2965A"], [0.5, "#C25A2A"], [1, "#9E3712"]], h);
  function smooth(pts) { if (pts.length < 2) return ""; let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6; const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6; d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`; } return d; }
  function jag(pts) { let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`; for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`; return d; }

  const H = 380, SKY_TOP = 20, SURF = 160, SOIL_BOT = 344, SOIL_D = SOIL_BOT - SURF;
  const AX = 0, PADR = 12;
  function shade(hex, f) { const [r, g, b] = hxc(hex), m = (v) => clamp(Math.round(v * f), 0, 255).toString(16).padStart(2, "0"); return `#${m(r)}${m(g)}${m(b)}`; }
  const HORIZ = [
    { y0: 0, y1: 12, fill: "#67563C", spn: 0.9, peb: 0 },
    { y0: 12, y1: 60, fill: "#AC8856", spn: 0.7, peb: 0 },
    { y0: 60, y1: 128, fill: "#8C5E3C", spn: 0.55, peb: 0.05 },
    { y0: 128, y1: SOIL_D, fill: "#C6B488", spn: 0.42, peb: 0.12 },
  ];
  HORIZ.forEach((h) => { h.edge = shade(h.fill, 0.70); h.sp = shade(h.fill, 0.82); });

  function dropIcon(cx, cy, r) {
    const topY = cy - 2.1 * r;
    const d = `M ${cx.toFixed(1)} ${topY.toFixed(1)} `
      + `C ${(cx + 0.62 * r).toFixed(1)} ${(cy - 1.35 * r).toFixed(1)} ${(cx + r).toFixed(1)} ${(cy - 0.55 * r).toFixed(1)} ${(cx + r).toFixed(1)} ${cy.toFixed(1)} `
      + `A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx - r).toFixed(1)} ${cy.toFixed(1)} `
      + `C ${(cx - r).toFixed(1)} ${(cy - 0.55 * r).toFixed(1)} ${(cx - 0.62 * r).toFixed(1)} ${(cy - 1.35 * r).toFixed(1)} ${cx.toFixed(1)} ${topY.toFixed(1)} Z`;
    return `<path d="${d}" fill="#34BCD2" stroke="#1FA6BE" stroke-width="1.3" stroke-linejoin="round"/>`
      + `<ellipse cx="${(cx - r * 0.34).toFixed(1)}" cy="${(cy + r * 0.02).toFixed(1)}" rx="${(r * 0.2).toFixed(1)}" ry="${(r * 0.42).toFixed(1)}" fill="#E8FAFD" opacity="0.8"/>`;
  }
  function wetCol(x0, w, sY) {
    return `<rect x="${x0.toFixed(1)}" y="${sY.toFixed(1)}" width="${w.toFixed(1)}" height="160" fill="url(#wetE)"/>`
      + `<rect x="${x0.toFixed(1)}" y="${sY.toFixed(1)}" width="${w.toFixed(1)}" height="3" fill="#34BCD2" opacity="0.34"/>`;
  }

  function plant(x, sY, v, rng) {
    const h = ease(clamp((v - 0.08) / 0.44, 0, 1));
    if (h < 0.07) { const c = "#3A352C";
      return `<path d="M ${x} ${sY} L ${(x - 2).toFixed(1)} ${(sY - 9)}" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`
        + `<path d="M ${(x - 1).toFixed(1)} ${(sY - 6)} L ${(x + 3).toFixed(1)} ${(sY - 12)}" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>`; }
    const hgt = lerp(8, 54, h), droop = clamp((0.45 - h) / 0.45, 0, 1);
    const tipX = x + lerp(0, 16, droop) * (rng() < 0.5 ? -1 : 1) * 0.6, tipY = sY - hgt + lerp(0, hgt * 0.5, droop);
    const ctrlX = x + lerp(0, 10, droop), ctrlY = sY - hgt * 0.55, pc = plantColor(h), lc = leafColor(h);
    let s = `<path d="M ${x} ${sY} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}" fill="none" stroke="${pc}" stroke-width="${lerp(1.2, 2.6, h).toFixed(2)}" stroke-linecap="round"/>`;
    const nl = Math.round(lerp(0, 5, h));
    for (let k = 0; k < nl; k++) {
      if (nl === 5 && k === 4) continue;
      const t = lerp(0.28, 0.92, (k + 0.5) / Math.max(nl, 1)), lx = lerp(x, tipX, t), ly = lerp(sY, tipY, t), side = (k % 2 === 0) ? 1 : -1, ll = lerp(5, 11, h);
      const mxp = lx + side * ll * 0.5, myp = ly + droop * ll * 0.4;
      s += `<ellipse cx="${mxp.toFixed(1)}" cy="${myp.toFixed(1)}" rx="${(ll * 0.6).toFixed(1)}" ry="${(ll * 0.32).toFixed(1)}" fill="${lc}" transform="rotate(${(side * lerp(18, 40, h) + droop * 20).toFixed(0)} ${mxp.toFixed(1)} ${myp.toFixed(1)})"/>`;
    }
    if (h > 0.62) { const fx = tipX, fy = tipY - 1; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; s += `<circle cx="${(fx + Math.cos(a) * 3.9).toFixed(1)}" cy="${(fy + Math.sin(a) * 3.9).toFixed(1)}" r="2.6" fill="#FBFAF6" stroke="#8A8270" stroke-width="0.6"/>`; } s += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="2.1" fill="#AF6E4B"/>`; }
    else if (h > 0.42) { s += `<ellipse cx="${tipX.toFixed(1)}" cy="${(tipY - 1).toFixed(1)}" rx="2.8" ry="3.9" fill="${hexLerp("#9C8A45", "#FBFAF6", (h - 0.42) / 0.2)}"/>`; }
    return s;
  }

  function roots(x, sY, v, rng) {
    const h = ease(clamp((v - 0.08) / 0.44, 0, 1));
    const dead = h < 0.08;
    let depthFrac = lerp(0.18, 0.50, v);
    if (dead) depthFrac = Math.min(depthFrac, 0.16 + 0.05 * rng());
    const depth = SOIL_D * depthFrac + (rng() - 0.5) * 8;
    const col = rootColor(h), wMain = lerp(0.8, 2.8, h);
    let pts = [{ x, y: sY }]; const segs = 5;
    for (let k = 1; k <= segs; k++) { const t = k / segs; pts.push({ x: x + (rng() - 0.5) * (dead ? 8 : 4), y: sY + depth * t }); }
    let s = `<path d="${dead ? jag(pts) : smooth(pts)}" fill="none" stroke="${col}" stroke-width="${wMain.toFixed(2)}" stroke-linecap="round" opacity="${dead ? 0.85 : 1}"/>`;
    const nl = Math.round(lerp(1, 5, h));
    const lats = [];
    for (let k = 0; k < nl; k++) { const startT = lerp(0.18, 0.82, (k + 0.4) / nl), sx = x + (rng() - 0.5) * 4, sy0 = sY + depth * startT, dir = (rng() < 0.5 ? -1 : 1);
      const ex = sx + dir * lerp(7, 16, rng()), ey = sy0 + lerp(8, 22, rng()), mx = (sx + ex) / 2 + dir * 4, my = (sy0 + ey) / 2;
      lats.push({ sx, sy0, ex, ey, mx, my, dir });
      if (dead) s += `<path d="M ${sx.toFixed(1)} ${sy0.toFixed(1)} L ${mx.toFixed(1)} ${my.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(wMain * 0.5).toFixed(2)}" stroke-linecap="round" opacity="0.8"/>`;
      else s += `<path d="M ${sx.toFixed(1)} ${sy0.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${(wMain * 0.55).toFixed(2)}" stroke-linecap="round"/>`; }
    if (h > 0.2) {
      const hairC = rootColor(clamp(h + 0.05, 0, 1)), nh = Math.round(lerp(0, 5, h));
      pts.slice(1).forEach((p) => { for (let k = 0; k < nh; k++) { if (rng() > 0.6) continue; const side = rng() < 0.5 ? -1 : 1, hl = lerp(2, 5, h);
        s += `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${(p.x + side * hl).toFixed(1)}" y2="${(p.y + lerp(1, 4, rng())).toFixed(1)}" stroke="${hairC}" stroke-width="0.5" opacity="${(0.4 + 0.3 * h).toFixed(2)}"/>`; } });
      lats.forEach((L) => { for (let k = 0; k < nh; k++) { if (rng() > 0.55) continue; const t = rng(), hx2 = lerp(L.sx, L.ex, t), hy2 = lerp(L.sy0, L.ey, t), hl = lerp(1.5, 4, h);
        s += `<line x1="${hx2.toFixed(1)}" y1="${hy2.toFixed(1)}" x2="${(hx2 + L.dir * hl).toFixed(1)}" y2="${(hy2 + lerp(0.5, 2.5, rng())).toFixed(1)}" stroke="${hairC}" stroke-width="0.45" opacity="${(0.35 + 0.3 * h).toFixed(2)}"/>`; } });
    }
    return s;
  }

  function build() {
    const vw = Math.min(window.innerWidth, 920);
    const dayW = clamp((vw - AX - PADR) / 9, 36, 94);
    const N = DATA.length, W = AX + N * dayW + PADR;
    const cx = (i) => AX + dayW * (i + 0.5);
    const tableY = (lv) => SOIL_BOT - (clamp(lv, 0, TANK) / TANK) * SOIL_D;
    const todayIdx = DATA.findIndex((d) => d.date === TODAY);
    const R = (W - PADR);
    const refillY = tableY(REFILL);

    const defs = `
      <linearGradient id="aqua" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#34BCD2" stop-opacity=".55"/>
        <stop offset="1" stop-color="#0C6478" stop-opacity=".82"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#E0A074" stop-opacity=".85"/>
        <stop offset="1" stop-color="#E0A074" stop-opacity="0"/></radialGradient>
      <linearGradient id="wetE" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#34BCD2" stop-opacity=".34"/>
        <stop offset="0.55" stop-color="#34BCD2" stop-opacity=".2"/>
        <stop offset="1" stop-color="#34BCD2" stop-opacity=".06"/></linearGradient>`;

    let sky = "", weather = "";
    DATA.forEach((d) => {
      const x0 = cx(d.idx) - dayW / 2, heat = clamp((d.tmax - 15) / (36 - 15), 0, 1);
      sky += `<rect x="${x0.toFixed(1)}" y="${SKY_TOP}" width="${dayW.toFixed(1)}" height="${SURF - SKY_TOP}" fill="var(--neutral)"/>`;
      if (heat > 0.78) {
        const sc = hexLerp("#B5471F", "#C25A2A", 0.5);
        for (let s = 0; s < 3; s++) { const yy = SKY_TOP + 40 + s * 7; let p = `M ${x0 + dayW * 0.16} ${yy}`; for (let k = 1; k <= 5; k++) { p += ` Q ${(x0 + dayW * (0.16 + 0.14 * k) - dayW * 0.07).toFixed(1)} ${(yy + (k % 2 ? -2.4 : 2.4)).toFixed(1)} ${(x0 + dayW * (0.16 + 0.14 * k)).toFixed(1)} ${yy}`; }
          weather += `<path d="${p}" fill="none" stroke="${sc}" stroke-width="0.7" opacity="${(0.16 - s * 0.04).toFixed(2)}"/>`; }
      }
      const si = clamp((d.et0 - 1) / (6.5 - 1), 0, 1);
      if (si > 0.04) {
        const sx = x0 + dayW * 0.5, sy = SKY_TOP + 24, rad = lerp(2.5, 7.5, si), core = sunCore(heat);
        const gw = rad * lerp(2.1, 3.4, heat);
        let rays = ""; const nr = Math.round(lerp(4, 10, si));
        for (let k = 0; k < nr; k++) { const a = k / nr * Math.PI * 2, r1 = rad + 2, r2 = rad + lerp(2, 9.5, si);
          rays += `<line x1="${(sx + Math.cos(a) * r1).toFixed(1)}" y1="${(sy + Math.sin(a) * r1).toFixed(1)}" x2="${(sx + Math.cos(a) * r2).toFixed(1)}" y2="${(sy + Math.sin(a) * r2).toFixed(1)}" stroke="${core}" stroke-width="${lerp(0.7, 1.7, si).toFixed(2)}" stroke-linecap="round"/>`; }
        weather += `<g opacity="0.92">`
          + `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${gw.toFixed(1)}" fill="url(#glow)" opacity="${(0.2 + heat * 0.34).toFixed(2)}"/>`
          + rays
          + `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${rad.toFixed(1)}" fill="${core}" stroke="#9E3712" stroke-width="0.8"/></g>`;
      }
      if (d.rain > 0.05) {
        const rng = mulberry32(900 + d.idx), strands = Math.round(clamp(d.rain / 1.0, 3, 16));
        let rg = "";
        for (let k = 0; k < strands; k++) { const rx = x0 + lerp(dayW * 0.06, dayW * 0.72, rng()), ry = SKY_TOP + lerp(26, 165, rng());
          const len = lerp(10, 22, Math.sqrt(clamp(d.rain / 18, 0, 1))) * (0.7 + rng() * 0.6);
          rg += `<line x1="${rx.toFixed(1)}" y1="${ry.toFixed(1)}" x2="${(rx - 2.5).toFixed(1)}" y2="${(ry + len).toFixed(1)}" stroke="#3F7FA0" stroke-width="1.5" stroke-linecap="round" opacity="${(0.5 + 0.4 * clamp(d.rain / 12, 0, 1)).toFixed(2)}"/>`; }
        weather += `<g>${rg}</g>`;
      }
      if (d.mins > 0) {
        const dx = cx(d.idx), dy = SURF - 72, dr = clamp(dayW * 0.15, 6, 9);
        weather += `<g>${dropIcon(dx, dy, dr)}</g>`;
      }
    });

    let soil = `<rect x="${AX}" y="${SURF}" width="${(R - AX).toFixed(1)}" height="${SOIL_D}" fill="${HORIZ[1].fill}"/>`;
    HORIZ.forEach((h, hi) => {
      soil += `<rect x="${AX}" y="${(SURF + h.y0).toFixed(1)}" width="${(R - AX).toFixed(1)}" height="${(h.y1 - h.y0).toFixed(1)}" fill="${h.fill}"/>`;
      soil += `<line x1="${AX}" y1="${(SURF + h.y0).toFixed(1)}" x2="${R.toFixed(1)}" y2="${(SURF + h.y0).toFixed(1)}" stroke="${h.edge}" stroke-width="0.6" opacity=".5"/>`;
      const rng = mulberry32(40 + hi), band = h.y1 - h.y0, step = 14;
      for (let x = AX + 4; x < R - 2; x += step) {
        if (rng() > h.spn) continue;
        const px = x + (rng() - 0.5) * step, py = SURF + h.y0 + rng() * band, r = lerp(0.5, 1.4, rng());
        soil += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${h.sp}" opacity="${(0.18 + rng() * 0.22).toFixed(2)}"/>`;
      }
      if (h.peb > 0) { for (let x = AX + 6; x < R - 4; x += 26) { if (rng() > h.peb * 8) continue; const px = x + (rng() - 0.5) * 20, py = SURF + h.y0 + lerp(0.2, 0.8, rng()) * band, rr = lerp(1.6, 3.2, rng());
        soil += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * 0.7).toFixed(1)}" fill="${h.sp}" opacity=".5"/><ellipse cx="${(px - rr * 0.3).toFixed(1)}" cy="${(py - rr * 0.3).toFixed(1)}" rx="${(rr * 0.4).toFixed(1)}" ry="${(rr * 0.28).toFixed(1)}" fill="#FBFAF6" opacity=".12"/>`; } }
    });

    const tablePts = [{ x: AX, y: tableY(DATA[0].level) }];
    DATA.forEach((d) => tablePts.push({ x: cx(d.idx), y: tableY(d.level) }));
    tablePts.push({ x: R, y: tableY(DATA[N - 1].level) });
    const tline = smooth(tablePts);
    const aqua = `${tline} L ${R.toFixed(1)} ${SOIL_BOT} L ${AX} ${SOIL_BOT} Z`;
    soil += `<path d="${aqua}" fill="url(#aqua)"/>`;
    DATA.forEach((d) => { if (d.mins > 0) soil += wetCol(cx(d.idx) - dayW / 2, dayW, SURF); });
    soil += `<path d="${tline}" fill="none" stroke="#1FA6BE" stroke-width="2.2"/>`
      + `<path d="${tline}" fill="none" stroke="#BDEAF1" stroke-width="0.8" opacity=".6"/>`;
    const surfPts = [{ x: AX, y: SURF }]; DATA.forEach((d) => { const j = (mulberry32(7 + d.idx)() - 0.5) * 2.6; surfPts.push({ x: cx(d.idx), y: SURF + j }); }); surfPts.push({ x: R, y: SURF });
    soil += `<path d="${smooth(surfPts)}" fill="none" stroke="#5A4A33" stroke-width="2.4"/>`
      + `<line x1="${AX}" y1="${refillY.toFixed(1)}" x2="${R.toFixed(1)}" y2="${refillY.toFixed(1)}" stroke="#FBFAF6" stroke-width="4.6" opacity="0.5"/>`
      + `<line x1="${AX}" y1="${refillY.toFixed(1)}" x2="${R.toFixed(1)}" y2="${refillY.toFixed(1)}" stroke="#B5471F" stroke-width="2.8" stroke-dasharray="8 5"/>`;

    let cracks = "";
    DATA.forEach((d) => { if (d.level > 3) return; const rng = mulberry32(31 + d.idx), x0 = cx(d.idx) - dayW / 2, dry = 1 - clamp(d.level / 3, 0, 1);
      const nc = Math.round(lerp(2, 4, dry));
      for (let k = 0; k < nc; k++) { let px = x0 + lerp(dayW * 0.15, dayW * 0.85, rng()), py = SURF + 2, seg = `M ${px.toFixed(1)} ${py.toFixed(1)}`; const steps = 3 + Math.floor(rng() * 3);
        for (let s = 0; s < steps; s++) { px += (rng() - 0.5) * 8; py += lerp(5, 13, rng()); seg += ` L ${px.toFixed(1)} ${py.toFixed(1)}`; }
        cracks += `<path d="${seg}" fill="none" stroke="#5A4A33" stroke-width="0.8" opacity="${(0.16 + 0.22 * dry).toFixed(2)}"/>`; } });

    let flora = "";
    DATA.forEach((d) => { const x = cx(d.idx), sY = SURF + (mulberry32(7 + d.idx)() - 0.5) * 2.6, v = clamp(d.level / TANK, 0, 1), rng = mulberry32(101 + d.idx);
      flora += `<g>` + roots(x, sY, v, rng) + plant(x, sY, v, rng) + `</g>`; });

    let ticks = "";
    DATA.forEach((d) => { const x = cx(d.idx), isT = d.idx === todayIdx;
      const dc = isT ? "#4F6B4A" : "#3A352C", bold = isT ? ' font-weight="700"' : "";
      ticks += `<text x="${x.toFixed(1)}" y="${SOIL_BOT + 17}" text-anchor="middle" font-family="${SVGMONO}" font-size="12"${bold} fill="${dc}">${d.date.slice(8)}</text>`
        + `<text x="${x.toFixed(1)}" y="${SOIL_BOT + 30}" text-anchor="middle" font-family="${SVGMONO}" font-size="12"${bold} fill="${dc}">${d.wd}</text>`; });

    const tx = cx(todayIdx);
    const NOW = "#4F6B4A", fw = 44, fh = 15, fy = 3;
    const today =
      `<rect x="${(tx - dayW / 2).toFixed(1)}" y="${SKY_TOP}" width="${dayW.toFixed(1)}" height="${(SOIL_BOT - SKY_TOP).toFixed(1)}" fill="${NOW}" opacity="0.08"/>`
      + `<rect x="${(tx - dayW / 2).toFixed(1)}" y="${SKY_TOP}" width="${dayW.toFixed(1)}" height="${(SOIL_BOT - SKY_TOP).toFixed(1)}" fill="none" stroke="${NOW}" stroke-width="1" stroke-dasharray="3 4" opacity="0.35"/>`
      + `<rect x="${(tx - fw / 2).toFixed(1)}" y="${fy}" width="${fw}" height="${fh}" rx="7.5" fill="${NOW}"/>`
      + `<text x="${tx.toFixed(1)}" y="${(fy + fh / 2).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="${SVGMONO}" font-size="10" font-weight="700" fill="#FBFAF6" letter-spacing=".1em">TODAY</text>`;

    const svg = `<svg viewBox="0 0 ${W.toFixed(0)} ${H}" width="${W.toFixed(0)}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="ui-sans-serif,system-ui,sans-serif">`
      + `<defs>${defs}</defs>${sky}${weather}${soil}${cracks}${flora}${ticks}${today}</svg>`;
    return { svg, W, dayW, todayIdx, cx, tableY };
  }

  const graph = document.querySelector('article[data-skin~="freeform"]');
  const status = document.querySelector("article:has(meter)");
  let G;

  function renderStatus() {
    const ti = DATA.findIndex((d) => d.date === TODAY), tl = DATA[ti].level, N = DATA.length;
    let firstBelow = -1; for (let k = ti; k < N; k++) { if (DATA[k].level < REFILL) { firstBelow = k; break; } }
    let word, tone;
    if (tl <= 0.05) { word = "Water today"; tone = "error"; }
    else if (tl < REFILL) { word = "Water now"; tone = "error"; }
    else { let dd, plus = ""; if (firstBelow >= 0) dd = firstBelow - ti; else { dd = (N - 1) - ti; plus = "+"; }
      word = dd === 1 ? "Water tomorrow" : `Water in ${dd}${plus} days`;
      tone = dd >= 2 ? "success" : "warn"; }

    const verdict = status.querySelector("p");
    verdict.removeAttribute("data-state");
    verdict.removeAttribute("data-skin");
    if (tone === "warn") verdict.setAttribute("data-skin", "warn");
    else verdict.setAttribute("data-state", tone);
    verdict.querySelector("strong").textContent = word;

    const meter = status.querySelector("meter");
    meter.max = TANK; meter.value = tl;
    meter.setAttribute("low", REFILL.toFixed(1));
    meter.setAttribute("high", (TANK * 0.7).toFixed(1));
    meter.setAttribute("optimum", String(TANK));

    status.querySelector("small").textContent =
      `${Math.round(tl)} / ${TANK} mm held · ${tl < REFILL ? "below" : "above"} refill point`;
  }

  function wireScroll(view) {
    const bar = graph.querySelector("p:has(> button)");
    const thumb = bar.querySelector("button");
    function syncBar() {
      const cw = view.clientWidth, sw = view.scrollWidth, tw = bar.clientWidth;
      if (sw <= cw + 1) { bar.style.visibility = "hidden"; return; }
      bar.style.visibility = "visible";
      const thumbW = Math.max(28, tw * cw / sw), maxLeft = tw - thumbW, maxScroll = sw - cw;
      thumb.style.width = thumbW + "px";
      thumb.style.left = (maxScroll > 0 ? (view.scrollLeft / maxScroll) * maxLeft : 0) + "px";
    }
    view.addEventListener("scroll", syncBar, { passive: true });
    let drag = false, x0 = 0, l0 = 0;
    thumb.addEventListener("pointerdown", (e) => { drag = true; x0 = e.clientX; l0 = parseFloat(thumb.style.left) || 0; thumb.setPointerCapture(e.pointerId); e.preventDefault(); });
    thumb.addEventListener("pointermove", (e) => { if (!drag) return;
      const tw = bar.clientWidth, thumbW = thumb.offsetWidth, maxLeft = tw - thumbW, maxScroll = view.scrollWidth - view.clientWidth;
      view.scrollLeft = maxLeft > 0 ? (clamp(l0 + (e.clientX - x0), 0, maxLeft) / maxLeft) * maxScroll : 0; });
    thumb.addEventListener("pointerup", () => { drag = false; });
    requestAnimationFrame(syncBar);
  }

  function render() {
    G = build();
    graph.removeAttribute("data-state");
    graph.innerHTML = `<p>${G.svg}</p><p><button type="button" aria-label="Scroll the timeline"></button></p>`;
    const view = graph.querySelector("p:has(> svg)");
    renderStatus();
    wireScroll(view);
    view.scrollLeft = Math.max(0, G.cx(G.todayIdx) - G.dayW * 1.4 - AX);
  }

  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 180); });
  render();
})();
