import DATA from './data.json';

const { useState, useMemo, useEffect, useRef } = React;

// ============ ROOT CAUSES ============
const RC = Object.fromEntries(DATA.causes.map((c) => [c.id, c]));
const ALL_IDS = Object.keys(RC);
// targetId → [leaf ids]; built once so eff() is a plain lookup for both leaf and group targets.
const TARGETS = {};
ALL_IDS.forEach((id) => {
  TARGETS[id] = [id];
  const p = RC[id].parent;
  if (p) (TARGETS[p] ||= []).push(id);
});
const eff = (m) => {
  const r = {};
  Object.entries(m).forEach(([t, d]) => {
    (TARGETS[t] || []).forEach((rc) => {
      r[rc] = (r[rc] || 0) + d;
    });
  });
  return r;
};

// ============ QUESTIONS ============
const QUESTIONS = DATA.questions.map((q) => {
  if (q.type === 'matrix') {
    return {
      ...q,
      rows: q.rows.map((r) => ({ ...r, effects: eff(r.effects || {}) })),
    };
  }
  return {
    ...q,
    options: q.options.map((o) => ({ ...o, effects: eff(o.effects || {}) })),
  };
});

// ============ DIAGRAM (engineering blueprint style) ============
const BOX_W = 130,
  BOX_H = 72;
const FOOTER_TOP = 46;

// Row 1: SOFTWARE → CONTROLLER → RELAY → PUMP across the top.
// Row 2: VALVES central below. Row 3: four SPRINKLER zones evenly spread.
// Per-zone sprinkler icons reflect hardware mix from the spec:
//   Z1 i20+MP+MP, Z2 i20+i20, Z3 i20+i20, Z4 MP+MP+MP.
// One icon per head: mdi:sprinkler = Hunter I-20 rotor, ms:sprinkler = MP rotator.
const NODES = [
  {
    key: 'sw',
    x: 36,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'SOFTWARE',
    icons: ['mdi:cellphone'],
    pips: ['R1.1', 'R1.2', 'R1.3'],
  },
  {
    key: 'ctrl',
    x: 202,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'CONTROLLER',
    icons: ['mdi:view-gallery-outline'],
    pips: ['R2.2', 'R2.3'],
  },
  {
    key: 'relay',
    x: 368,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'RELAY',
    icons: ['mdi:electric-switch'],
    pips: ['R3.1'],
  },
  {
    key: 'pump',
    x: 534,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'PUMP',
    icons: ['mdi:water-pump', 'mdi:water-well'],
    pips: ['R4.1', 'R4.2'],
  },
  {
    key: 'valves',
    x: 285,
    y: 170,
    w: BOX_W,
    h: BOX_H,
    label: 'VALVES',
    icons: ['ms:valve', 'ms:valve', 'ms:valve', 'ms:valve'],
    pips: ['R7.1', 'R7.2', 'R7.3', 'R7.4'],
  },
  {
    key: 'sp1',
    x: 20,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler', 'ms:sprinkler', 'ms:sprinkler'],
    pips: ['R9.1', 'R9.2'],
  },
  {
    key: 'sp2',
    x: 200,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler', 'mdi:sprinkler'],
    pips: ['R9.1', 'R9.2'],
  },
  {
    key: 'sp3',
    x: 380,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler', 'mdi:sprinkler'],
    pips: ['R9.1', 'R9.2'],
  },
  {
    key: 'sp4',
    x: 560,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['ms:sprinkler', 'ms:sprinkler', 'ms:sprinkler'],
    pips: ['R9.1', 'R9.2'],
  },
];

// Connector pips ride on line segments. An rcId can appear more than once —
// each entry is a separate clickable jump to the same cause.
const CONN_PIPS = [
  // Water main horizontal from pump down/across to valves (y=145)
  { rcId: 'R5.1', x: 487, y: 145 },
  { rcId: 'R5.2', x: 461, y: 145 },
  // 24 V control wire — three pips clustered horizontally on the wire
  { rcId: 'R6.1', x: 241, y: 145 },
  { rcId: 'R6.2', x: 267, y: 145 },
  { rcId: 'R6.3', x: 293, y: 145 },
  // Lateral hoses — each lateral carries both R8.1 and R8.2 adjacent
  { rcId: 'R8.1', x: 180, y: 290 },
  { rcId: 'R8.2', x: 206, y: 290 },
  { rcId: 'R8.1', x: 286, y: 305 },
  { rcId: 'R8.2', x: 312, y: 305 },
  { rcId: 'R8.1', x: 393, y: 305 },
  { rcId: 'R8.2', x: 419, y: 305 },
  { rcId: 'R8.1', x: 500, y: 290 },
  { rcId: 'R8.2', x: 526, y: 290 },
];

// ============ SEVERITY COLOURS ============
// Four-band gradient: dark green → light green → light rust → dark rust.
// Ranked rows additionally clamp to dark green when the displayed percent < 4.
const sevColor = (t) => {
  const tt = Math.max(0, Math.min(1, t));
  if (tt < 0.25) return '#3f6b2f';
  if (tt < 0.5) return '#9bbf6e';
  if (tt < 0.75) return '#d99a78';
  return '#7a2f15';
};
const sevText = (t) => {
  const tt = Math.max(0, Math.min(1, t));
  if (tt < 0.25) return '#efe8d8';
  if (tt >= 0.75) return '#efe8d8';
  return '#1a2238';
};
const pctColor = (pct, t) => (pct < 4 ? '#3f6b2f' : sevColor(t));
const pctText = (pct, t) => (pct < 4 ? '#efe8d8' : sevText(t));

// ============ ICONS (Material Design Icons + Material Symbols) ============
// Each entry: vb = [minX, minY, width, height] viewBox; d = SVG path data.
// MDI icons live on a 24×24 grid (filled glyphs). Material Symbols are 960×960
// drawn in negative-y space (viewBox "0 -960 960 960").
const ICONS = {
  'mdi:electric-switch': {
    vb: [0, 0, 24, 24],
    d: 'M1,11H3.17C3.58,9.83 4.69,9 6,9C6.65,9 7.25,9.21 7.74,9.56L14.44,4.87L15.58,6.5L8.89,11.2C8.96,11.45 9,11.72 9,12A3,3 0 0,1 6,15C4.69,15 3.58,14.17 3.17,13H1V11M23,11V13H20.83C20.42,14.17 19.31,15 18,15A3,3 0 0,1 15,12A3,3 0 0,1 18,9C19.31,9 20.42,9.83 20.83,11H23M6,11A1,1 0 0,0 5,12A1,1 0 0,0 6,13A1,1 0 0,0 7,12A1,1 0 0,0 6,11M18,11A1,1 0 0,0 17,12A1,1 0 0,0 18,13A1,1 0 0,0 19,12A1,1 0 0,0 18,11Z',
  },
  'mdi:water-pump': {
    vb: [0, 0, 24, 24],
    d: 'M19,14.5C19,14.5 21,16.67 21,18A2,2 0 0,1 19,20A2,2 0 0,1 17,18C17,16.67 19,14.5 19,14.5M5,18V9A2,2 0 0,1 3,7A2,2 0 0,1 5,5V4A2,2 0 0,1 7,2H9A2,2 0 0,1 11,4V5H19A2,2 0 0,1 21,7V9L21,11A1,1 0 0,1 22,12A1,1 0 0,1 21,13H17A1,1 0 0,1 16,12A1,1 0 0,1 17,11V9H11V18H12A2,2 0 0,1 14,20V22H2V20A2,2 0 0,1 4,18H5Z',
  },
  'mdi:water-well': {
    vb: [0, 0, 24, 24],
    d: 'M22 16H2V18H4V22H20V18H22V16M10.44 15C10.19 15 10 14.81 9.95 14.56L9.57 11.56C9.57 11.54 9.57 11.5 9.57 11.5C9.57 11.22 9.79 11 10.07 11H13.93C13.95 11 13.97 11 14 11C14.27 11.04 14.46 11.29 14.43 11.56L14.05 14.56C14 14.81 13.81 15 13.56 15H10.44M19 2L21.56 6.68C21.6 6.78 21.61 6.89 21.61 7C21.61 7.56 21.16 8 20.61 8H19V15H17V8H13V10H11V8H7V15H5V8H3.62C3.46 8 3.31 7.96 3.16 7.89C2.67 7.64 2.47 7.04 2.72 6.55L5 2H19Z',
  },
  'mdi:sprinkler': {
    vb: [0, 0, 24, 24],
    d: 'M11 7H13V9H11V7M5 22H9V10H5V22M14 11H16V9H14V11M17 10H19V8H17V10M17 5V7H19V5H17M14 8H16V6H14V8M17 13H19V11H17V13M5 7H5.33L6 9H8L8.67 7H9V6H5V7Z',
  },
  'mdi:cellphone': {
    vb: [0, 0, 24, 24],
    d: 'M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z',
  },
  'mdi:view-gallery-outline': {
    vb: [0, 0, 24, 24],
    d: 'M1 3V21H23V3H1M21 5V14H3V5H21M11 16V19H8V16H11M3 16H6V19H3V16M13 19V16H16V19H13M18 19V16H21V19H18Z',
  },
  'mdi:pipe': {
    vb: [0, 0, 24, 24],
    d: 'M22,14H20V16H14V13H16V11H14V6A2,2 0 0,0 12,4H4V2H2V10H4V8H10V11H8V13H10V18A2,2 0 0,0 12,20H20V22H22',
  },
  'mdi:lightning-bolt-outline': {
    vb: [0, 0, 24, 24],
    d: 'M11 9.47V11H14.76L13 14.53V13H9.24L11 9.47M13 1L6 15H11V23L18 9H13V1Z',
  },
  'mdi:water-outline': {
    vb: [0, 0, 24, 24],
    d: 'M12,3.77L11.25,4.61C11.25,4.61 9.97,6.06 8.68,7.94C7.39,9.82 6,12.07 6,14.23A6,6 0 0,0 12,20.23A6,6 0 0,0 18,14.23C18,12.07 16.61,9.82 15.32,7.94C14.03,6.06 12.75,4.61 12.75,4.61L12,3.77M12,6.9C12.44,7.42 12.84,7.85 13.68,9.07C14.89,10.83 16,13.07 16,14.23C16,16.45 14.22,18.23 12,18.23C9.78,18.23 8,16.45 8,14.23C8,13.07 9.11,10.83 10.32,9.07C11.16,7.85 11.56,7.42 12,6.9Z',
  },
  'ms:valve': {
    vb: [0, -960, 960, 960],
    d: 'M450-780H320q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h320q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H510v130q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-130ZM160-159v-232q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.7 8.5 8.69 8.5 21.54v.76h150v-140h-1q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h222q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.7 21.32-8.69 8.5-21.54 8.5H590v140h150v-1q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v232q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.7-8.5-8.69-8.5-21.54v-.76H220v.78q0 13.22-8.68 21.72-8.67 8.5-21.5 8.5-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37Zm60-61h520v-110H530v-200H430v200H220v110Zm260 0Z',
  },
  'ms:sprinkler': {
    vb: [0, -960, 960, 960],
    d: 'M451-490q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12Zm0-160q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12Zm0-160q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12Zm119 399q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12Zm113-114q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12Zm113-112q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12ZM332-411q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12ZM219-525q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12ZM106-637q-12-12-12-29t12-29q12-12 29-12t29 12q12 12 12 29t-12 29q-12 12-29 12t-29-12Zm344 387H320q-13 0-21.5-8.5T290-280q0-13 8.5-21.5T320-310h320q13 0 21.5 8.5T670-280q0 13-8.5 21.5T640-250H510v140q0 13-8.5 21.5T480-80q-13 0-21.5-8.5T450-110v-140Z',
  },
  'ms:bolt': {
    vb: [0, -960, 960, 960],
    d: 'm393-165 279-335H492l36-286-253 366h154l-36 255Zm-33-195H217q-18 0-26.5-16t2.5-31l338-488q8-11 20-15t24 1q12 5 19 16t5 24l-39 309h176q19 0 27 17t-4 32L388-66q-8 10-20.5 13T344-55q-11-5-17.5-16T322-95l38-265Zm113-115Z',
  },
  'ms:wifi': {
    vb: [0, -960, 960, 960],
    d: 'M417-154q-27-27-27-63t27-63q27-27 63-27t63 27q27 27 27 63t-27 63q-27 27-63 27t-63-27Zm209-378.5Q694-505 757-451q14 12 15 30.5T759-388q-14 14-32 13t-33-13q-53-44-106.5-63T480-470q-54 0-107.5 19T266-388q-15 12-33 13t-32-13q-14-14-13-32.5t15-30.5q63-54 131-81.5T480-560q78 0 146 27.5Zm95.5-219Q835-703 926-622q14 13 15.5 31.5T929-558q-14 14-33.5 13.5T861-558q-83-70-178-111t-203-41q-108 0-203 41T99-558q-15 13-34 13.5T32-558q-14-14-13-32.5T34-622q91-81 204.5-129.5T480-800q128 0 241.5 48.5Z',
  },
};

function Icon({ name, cx, cy, size, fill = '#1a2238' }) {
  const def = ICONS[name];
  if (!def) return null;
  const [minX, minY, vw, vh] = def.vb;
  const scale = size / Math.max(vw, vh);
  const tx = cx - (minX + vw / 2) * scale;
  const ty = cy - (minY + vh / 2) * scale;
  return (
    <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
      <path d={def.d} fill={fill} />
    </g>
  );
}

// Lays a row of icons centred on (cx, cy). Sizes shrink as count grows so the
// 4-valve row stays inside the box. NODE_ICON_LAYOUT is keyed by icon count;
// >4 falls back to the 4-icon row.
const NODE_ICON_LAYOUT = {
  1: { size: 26, gap: 0 },
  2: { size: 24, gap: 30 },
  3: { size: 20, gap: 26 },
  4: { size: 18, gap: 24 },
};
function NodeIcons({ icons, cx, cy }) {
  if (!icons?.length) return null;
  const { size, gap } = NODE_ICON_LAYOUT[icons.length] || NODE_ICON_LAYOUT[4];
  const start = -((icons.length - 1) / 2) * gap;
  return (
    <>
      {icons.map((name, i) => (
        <Icon key={`${name}-${i}`} name={name} cx={cx + start + i * gap} cy={cy} size={size} />
      ))}
    </>
  );
}

// Inline icon + text token (e.g. ⚡ 230 V). (x, y) is the text baseline; the
// icon sits flush-left of x with a fixed gap so call-sites only think about
// where the text goes, not the icon's pixel offset.
function LineLabel({ icon, text, x, y, fill, size = 11, gap = 2 }) {
  return (
    <g>
      <Icon name={icon} cx={x - size / 2 - gap} cy={y - 3} size={size} fill={fill} />
      <text x={x} y={y} textAnchor="start" className="ln-lbl" fill={fill}>
        {text}
      </text>
    </g>
  );
}

function NodeBox({ box, icons, label, severityT, severityPct, activeRC, onPickRC }) {
  const cx = box.x + box.w / 2;
  const pips = box.pips || [];
  const fy = box.y + FOOTER_TOP;
  const fh = box.h - FOOTER_TOP;
  const cw = pips.length ? box.w / pips.length : 0;
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill="#f7f2e6"
        stroke="#1a2238"
        strokeWidth="1.5"
      />

      {pips.map((rcId, i) => (
        <rect
          key={`f-${rcId}-${i}`}
          x={box.x + i * cw}
          y={fy}
          width={cw}
          height={fh}
          fill={pctColor(severityPct[rcId] || 0, severityT[rcId] || 0)}
          stroke="none"
        />
      ))}

      <NodeIcons icons={icons} cx={cx} cy={box.y + 16} />
      {label && (
        <text x={cx} y={box.y + 38} textAnchor="middle" className="lbl">
          {label}
        </text>
      )}

      {pips.length > 0 && (
        <>
          <line x1={box.x} y1={fy} x2={box.x + box.w} y2={fy} stroke="#1a2238" strokeWidth="1.5" />
          {pips.slice(1).map((_, i) => {
            const x = box.x + (i + 1) * cw;
            return (
              <line
                key={`d-${i}`}
                x1={x}
                y1={fy}
                x2={x}
                y2={fy + fh}
                stroke="#1a2238"
                strokeWidth="1"
              />
            );
          })}
        </>
      )}

      {pips.map((rcId, i) => {
        const ccx = box.x + i * cw + cw / 2;
        const t = severityT[rcId] || 0;
        const p = severityPct[rcId] || 0;
        return (
          <g
            key={`l-${rcId}-${i}`}
            role="button"
            tabIndex="0"
            aria-label={`Root cause ${rcId}: ${RC[rcId].label}`}
            onClick={() => onPickRC && onPickRC(rcId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPickRC && onPickRC(rcId);
              }
            }}
          >
            <rect x={box.x + i * cw} y={fy} width={cw} height={fh} fill="transparent" />
            <text
              x={ccx}
              y={fy + fh / 2 + 3.5}
              textAnchor="middle"
              className="pip"
              fill={pctText(p, t)}
            >
              {rcId.replace('R', '')}
            </text>
          </g>
        );
      })}

      {pips.map((rcId, i) => {
        if (activeRC !== rcId) return null;
        return (
          <rect
            key={`a-${rcId}-${i}`}
            x={box.x + i * cw + 1.5}
            y={fy + 1.5}
            width={cw - 3}
            height={fh - 3}
            fill="none"
            stroke="#1a2238"
            strokeWidth="2"
            pointerEvents="none"
          />
        );
      })}
    </g>
  );
}

function ConnectorPip({ rcId, pos, severityT, severityPct, activeRC, onPickRC }) {
  const t = severityT[rcId] || 0;
  const p = severityPct[rcId] || 0;
  const isActive = activeRC === rcId;
  const sz = 26;
  return (
    <g
      role="button"
      tabIndex="0"
      aria-label={`Root cause ${rcId}: ${RC[rcId].label}`}
      onClick={() => onPickRC && onPickRC(rcId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPickRC && onPickRC(rcId);
        }
      }}
    >
      <rect
        x={pos.x - sz / 2}
        y={pos.y - sz / 2}
        width={sz}
        height={sz}
        rx="1.5"
        fill={pctColor(p, t)}
        stroke="#1a2238"
        strokeWidth={isActive ? 1.8 : 1.2}
      />
      <text x={pos.x} y={pos.y + 3} textAnchor="middle" className="pip" fill={pctText(p, t)}>
        {rcId.replace('R', '')}
      </text>
    </g>
  );
}

function SystemDiagram({ severityT, severityPct, activeRC, onPickRC }) {
  return (
    <svg
      viewBox="0 0 700 420"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="arr-water"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#1a4a7a" />
        </marker>
        <marker
          id="arr-ctrl"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#b14a26" />
        </marker>
        <marker
          id="arr-mains"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="var(--c-fg-mute)" />
        </marker>
      </defs>

      {/* ── Wi-Fi link SOFTWARE ↔ CONTROLLER (slate dotted, no arrow — bidirectional) ── */}
      <line
        x1="166"
        y1="36"
        x2="202"
        y2="36"
        stroke="var(--c-fg-mute)"
        strokeWidth="1.2"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      {/* Wi-Fi glyph centred on the link */}
      <Icon name="ms:wifi" cx={184} cy={26} size={14} fill="var(--c-fg-mute)" />

      {/* ── 24 V control wires (rust dashed) ── */}
      <g fill="none" stroke="#b14a26" strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round">
        <line x1="332" y1="36" x2="368" y2="36" markerEnd="url(#arr-ctrl)" />
        {/* CTRL → VALVES: drop down from controller bottom, then over to valves left side */}
        <path d="M 267 92 V 200 H 285" markerEnd="url(#arr-ctrl)" />
      </g>
      <LineLabel
        icon="mdi:lightning-bolt-outline"
        text="24 V"
        x={346}
        y={30}
        size={10}
        fill="#b14a26"
      />
      <LineLabel
        icon="mdi:lightning-bolt-outline"
        text="24 V"
        x={250}
        y={108}
        size={10}
        fill="#b14a26"
      />

      {/* ── 230 V mains (slate solid + bolt) RELAY → PUMP ── */}
      <line
        x1="498"
        y1="36"
        x2="534"
        y2="36"
        stroke="var(--c-fg-mute)"
        strokeWidth="2.5"
        markerEnd="url(#arr-mains)"
      />
      <LineLabel icon="ms:bolt" text="230 V" x={510} y={30} fill="var(--c-fg-mute)" />

      {/* ── Main water line: PUMP down then across to VALVES top ── */}
      <path
        d="M 599 92 V 145 H 350 V 170"
        stroke="#1a4a7a"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        markerEnd="url(#arr-water)"
      />
      <LineLabel icon="mdi:water-outline" text="H₂O" x={370} y={142} fill="#1a4a7a" />

      {/* ── Lateral hoses VALVES → 4 sprinklers ── */}
      <g stroke="#1a4a7a" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M 300 242 V 290 H 85 V 340" markerEnd="url(#arr-water)" />
        <path d="M 333 242 V 305 H 265 V 340" markerEnd="url(#arr-water)" />
        <path d="M 367 242 V 305 H 445 V 340" markerEnd="url(#arr-water)" />
        <path d="M 400 242 V 290 H 625 V 340" markerEnd="url(#arr-water)" />
      </g>

      {/* ── nodes ── */}
      {NODES.map((b) => (
        <NodeBox
          key={b.key}
          box={b}
          icons={b.icons}
          label={b.label}
          severityT={severityT}
          severityPct={severityPct}
          activeRC={activeRC}
          onPickRC={onPickRC}
        />
      ))}

      {/* ── connector pips ── */}
      {CONN_PIPS.map((p, i) => (
        <ConnectorPip
          key={`cp-${i}`}
          rcId={p.rcId}
          pos={{ x: p.x, y: p.y }}
          severityT={severityT}
          severityPct={severityPct}
          activeRC={activeRC}
          onPickRC={onPickRC}
        />
      ))}
    </svg>
  );
}

// ============ STAGE TABS ============
function StageBar({ stages, activeStage, onPick }) {
  const labels = ['', 'Ages', 'Symptoms', 'Events', 'Tests'];
  return (
    <div className="stages">
      {[1, 2, 3, 4].map((s) => {
        const sp = stages[s];
        const active = activeStage === s;
        const pct = sp.total ? (sp.answered / sp.total) * 100 : 0;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className={`stage-btn${active ? ' on' : ''}`}
            style={{ '--sp-fill': pct + '%' }}
          >
            <span>
              <b>{labels[s]}</b>
              <small className="mono">
                {sp.answered}/{sp.total}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============ MATRIX QUESTION ============
function MatrixQuestion({ question, answer, onSetCell, onToggleDrained }) {
  const cols = question.columns;
  const rowAns = answer?.rows || {};
  const drained = answer?.drained || {};
  return (
    <div className="matrix-scroll">
      <div
        className="matrix"
        style={{
          gridTemplateColumns: `minmax(140px, 1.4fr) repeat(${cols.length}, minmax(54px, 1fr))`,
        }}
      >
        <div className="matrix-cell matrix-head" />
        {cols.map((c) => (
          <div key={c.id} className="matrix-cell matrix-head" title={c.label}>
            <span>{c.label}</span>
          </div>
        ))}
        {question.rows.map((row) => {
          const sel = rowAns[row.id] || 'no';
          const isOff = sel === 'no';
          return (
            <React.Fragment key={row.id}>
              <div className="matrix-cell matrix-row-label">{row.label}</div>
              {cols.map((c) => {
                const checked = sel === c.id;
                return (
                  <div key={c.id} className="matrix-cell matrix-radio-cell">
                    <button
                      type="button"
                      className={`matrix-radio${checked ? ' on' : ''}`}
                      aria-label={`${row.label}: ${c.label}`}
                      aria-pressed={checked}
                      onClick={() => onSetCell(row.id, c.id)}
                    />
                  </div>
                );
              })}
              {row.drainable && !isOff && (
                <label
                  className="matrix-drained"
                  style={{ gridColumn: `1 / span ${cols.length + 1}` }}
                >
                  <input
                    type="checkbox"
                    checked={!!drained[row.id]}
                    onChange={(e) => onToggleDrained(row.id, e.target.checked)}
                  />
                  System was drained for winter (halves effect)
                </label>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ============ QUESTION PANEL ============
function QuestionPanel({
  question,
  answer,
  onAnswer,
  onSetCell,
  onToggleDrained,
  onNext,
  onPrev,
  isFirst,
  isLast,
  onReset,
}) {
  if (!question) return null;
  const isMatrix = question.type === 'matrix';
  return (
    <div>
      <div className="qhead">
        <div className="qtitle">{question.text}</div>
        <button className="btn" type="button" onClick={onReset}>
          Reset
        </button>
        <div className="qnav">
          <button type="button" onClick={onPrev} disabled={isFirst} title="Previous">
            ‹
          </button>
          <button type="button" onClick={onNext} disabled={isLast} title="Next">
            ›
          </button>
        </div>
      </div>
      {isMatrix ? (
        <>
          <MatrixQuestion
            question={question}
            answer={answer}
            onSetCell={onSetCell}
            onToggleDrained={onToggleDrained}
          />
          <div className="matrix-actions">
            <button type="button" className="btn primary" onClick={onNext} disabled={isLast}>
              Next ›
            </button>
          </div>
        </>
      ) : (
        <div className="opts">
          {question.options.map((opt, i) => {
            const selected = answer === i;
            return (
              <button
                key={i}
                type="button"
                className={`opt${selected ? ' on' : ''}`}
                onClick={() => onAnswer(i)}
              >
                <b>{selected ? '●' : '○'}</b>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ RANK PANEL ============
function RankingPanel({ ranked, severityT, activeRC, onPickRC }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ranked : ranked.slice(0, 5);
  return (
    <div>
      <div className="rank">
        {visible.map((r) => {
          const meta = RC[r.id];
          const active = activeRC === r.id;
          const pct = Math.round(r.pct);
          const colour = pctColor(pct, severityT[r.id]);
          return (
            <button
              key={r.id}
              type="button"
              className={`rank-row${active ? ' on' : ''}`}
              onClick={() => onPickRC(r.id)}
            >
              <b className="mono">{r.id}</b>
              <aside>
                <strong>{meta.label}</strong>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(r.pct)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  style={{ '--sp-bar': r.pct + '%', '--c-bar': colour }}
                />
              </aside>
              <small className="mono" style={{ color: colour }}>
                {pct}%
              </small>
            </button>
          );
        })}
      </div>
      {ranked.length > 5 && (
        <button type="button" className="rank-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? '▲ collapse' : `▼ show all ${ranked.length}`}
        </button>
      )}
    </div>
  );
}

// ============ RECOMMENDATIONS ============
function RecommendationPanel({ recs, onSelect, max }) {
  const visible = recs.slice(0, max);
  return (
    <div className="recs">
      {visible.length === 0 && (
        <div className="rec empty">No questions left to differentiate top suspects.</div>
      )}
      {visible.map(({ q, D }) => (
        <button key={q.id} type="button" className="rec" onClick={() => onSelect(q.id)}>
          <header>
            <b>{q.id}</b>
            <i>S{q.stage}</i>
            <small>D = {D.toFixed(2)}</small>
          </header>
          <p>{q.text}</p>
        </button>
      ))}
    </div>
  );
}

// ============ RESET MODAL ============
function ResetModal({ onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current && cancelRef.current.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="reset-title">Start over?</h3>
        <p>
          This clears every answer and returns you to the first question. You can&rsquo;t undo this.
        </p>
        <div className="row">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
            Keep my answers
          </button>
          <button type="button" className="btn primary" onClick={onConfirm}>
            Reset everything
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ HOOK ============
function useIsMobile(breakpoint = 760) {
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onR = () => setM(window.innerWidth < breakpoint);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [breakpoint]);
  return m;
}

// ============ APP ============
function App() {
  const [answers, setAnswers] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(QUESTIONS[0].id);
  const [activeStage, setActiveStage] = useState(1);
  const [activeRC, setActiveRC] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const isMobile = useIsMobile(760);

  const scores = useMemo(() => {
    const s = {};
    ALL_IDS.forEach((id) => {
      s[id] = RC[id].baseline;
    });
    QUESTIONS.forEach((q) => {
      const ans = answers[q.id];
      if (ans === undefined || ans === null) return;
      if (q.type === 'matrix') {
        const rowAns = ans.rows || {};
        const drained = ans.drained || {};
        const colMul = Object.fromEntries(q.columns.map((c) => [c.id, c.mult]));
        q.rows.forEach((row) => {
          const colId = rowAns[row.id] || 'no';
          const m = colMul[colId] || 0;
          if (m === 0) return;
          const halve = row.drainable && drained[row.id] ? 0.5 : 1;
          Object.entries(row.effects).forEach(([rc, delta]) => {
            s[rc] = (s[rc] || 0) + delta * m * halve;
          });
        });
      } else {
        const opt = q.options[ans];
        if (!opt) return;
        Object.entries(opt.effects).forEach(([rc, delta]) => {
          s[rc] = (s[rc] || 0) + delta;
        });
      }
    });
    return s;
  }, [answers]);

  const ranked = useMemo(() => {
    const total = ALL_IDS.reduce((sum, id) => sum + Math.max(0, scores[id]), 0);
    return ALL_IDS.map((id) => ({
      id,
      score: scores[id],
      pct: total > 0 ? (Math.max(0, scores[id]) / total) * 100 : 0,
    })).sort((a, b) => b.score - a.score);
  }, [scores]);

  const severityT = useMemo(() => {
    const max = Math.max(...ALL_IDS.map((id) => scores[id]), 0.1);
    const t = {};
    ALL_IDS.forEach((id) => {
      t[id] = Math.max(0, scores[id]) / max;
    });
    return t;
  }, [scores]);

  const severityPct = useMemo(() => {
    const m = {};
    ranked.forEach((r) => {
      m[r.id] = r.pct;
    });
    return m;
  }, [ranked]);

  const top5 = useMemo(() => ranked.slice(0, 5).map((r) => r.id), [ranked]);

  const isAnswered = (qid) => {
    const a = answers[qid];
    if (a === undefined || a === null) return false;
    const q = QUESTIONS.find((qq) => qq.id === qid);
    if (q?.type === 'matrix') {
      return (a.rows && Object.keys(a.rows).length > 0) || a.acked === true;
    }
    return true;
  };

  const recommendations = useMemo(() => {
    const unanswered = QUESTIONS.filter((q) => !isAnswered(q.id));
    const scored = unanswered.map((q) => {
      let D = 0;
      if (q.type === 'matrix') {
        const mults = q.columns.map((c) => c.mult);
        const spread = Math.max(...mults) - Math.min(...mults);
        q.rows.forEach((row) => {
          top5.forEach((rcId) => {
            D += Math.abs(row.effects[rcId] || 0) * spread;
          });
        });
      } else {
        top5.forEach((rcId) => {
          const deltas = q.options.map((o) => o.effects[rcId] || 0);
          D += Math.max(...deltas) - Math.min(...deltas);
        });
      }
      return { q, D };
    });
    return scored
      .filter((r) => r.D > 0)
      .sort((a, b) => b.D - a.D)
      .slice(0, 4);
  }, [answers, top5]);

  const stageProgress = useMemo(() => {
    const sp = {
      1: { answered: 0, total: 0 },
      2: { answered: 0, total: 0 },
      3: { answered: 0, total: 0 },
      4: { answered: 0, total: 0 },
    };
    QUESTIONS.forEach((q) => {
      sp[q.stage].total++;
      if (isAnswered(q.id)) sp[q.stage].answered++;
    });
    return sp;
  }, [answers]);

  const activeQuestion = QUESTIONS.find((q) => q.id === activeQuestionId);
  const activeIdx = QUESTIONS.findIndex((q) => q.id === activeQuestionId);
  const isFirst = activeIdx <= 0;
  const isLast = activeIdx >= QUESTIONS.length - 1;

  const setSingleAnswer = (qid, optIdx) => setAnswers((p) => ({ ...p, [qid]: optIdx }));

  const setMatrixCell = (qid, rowId, colId) =>
    setAnswers((p) => {
      const prev = p[qid] || { rows: {}, drained: {} };
      return {
        ...p,
        [qid]: {
          ...prev,
          rows: { ...prev.rows, [rowId]: colId },
          drained: prev.drained || {},
        },
      };
    });

  const setMatrixDrained = (qid, rowId, val) =>
    setAnswers((p) => {
      const prev = p[qid] || { rows: {}, drained: {} };
      return {
        ...p,
        [qid]: {
          ...prev,
          rows: prev.rows || {},
          drained: { ...(prev.drained || {}), [rowId]: val },
        },
      };
    });

  const ackMatrix = (qid) =>
    setAnswers((p) => {
      const prev = p[qid] || { rows: {}, drained: {} };
      return { ...p, [qid]: { ...prev, acked: true } };
    });

  const pickQuestion = (qid) => {
    setActiveQuestionId(qid);
    const q = QUESTIONS.find((qq) => qq.id === qid);
    if (q) setActiveStage(q.stage);
  };

  const moveBy = (delta) => {
    const idx = QUESTIONS.findIndex((q) => q.id === activeQuestionId);
    if (delta > 0) {
      const cur = QUESTIONS[idx];
      if (cur?.type === 'matrix') ackMatrix(cur.id);
    }
    const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + delta))];
    pickQuestion(next.id);
  };

  const handleAnswer = (i) => {
    const currentId = activeQuestionId;
    setSingleAnswer(currentId, i);
    setTimeout(() => {
      const idx = QUESTIONS.findIndex((q) => q.id === currentId);
      if (idx >= 0 && idx < QUESTIONS.length - 1) {
        pickQuestion(QUESTIONS[idx + 1].id);
      }
    }, 180);
  };

  const handleSetCell = (rowId, colId) => setMatrixCell(activeQuestionId, rowId, colId);
  const handleToggleDrained = (rowId, val) => setMatrixDrained(activeQuestionId, rowId, val);

  const doReset = () => {
    setAnswers({});
    setActiveRC(null);
    setActiveQuestionId(QUESTIONS[0].id);
    setActiveStage(1);
    setResetOpen(false);
  };

  const onPickStage = (s) => {
    setActiveStage(s);
    const first = QUESTIONS.find((q) => q.stage === s);
    if (first) setActiveQuestionId(first.id);
  };

  return (
    <>
      <section className="sec sec-diagram">
        <div className="schem-wrap">
          <SystemDiagram
            severityT={severityT}
            severityPct={severityPct}
            activeRC={activeRC}
            onPickRC={setActiveRC}
          />
          <div className="schem-legend">
            <span>
              <span className="swatch" style={{ background: 'var(--c-water)' }} /> water
            </span>
            <span>
              <span className="swatch" style={{ background: 'var(--c-fg-mute)' }} /> 230 V mains
            </span>
            <span>
              <span
                className="swatch"
                style={{
                  background:
                    'repeating-linear-gradient(90deg, var(--c-accent) 0 50%, transparent 50% 100%)',
                  backgroundSize: '0.8em 100%',
                }}
              />{' '}
              24 V control
            </span>
            <span>
              <span
                className="swatch"
                style={{
                  background:
                    'repeating-linear-gradient(90deg, var(--c-fg-mute) 0 40%, transparent 40% 100%)',
                  backgroundSize: '0.5em 100%',
                }}
              />{' '}
              Wi-Fi
            </span>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="work">
          <main className="panel">
            <div className="bd">
              <QuestionPanel
                question={activeQuestion}
                answer={answers[activeQuestionId]}
                onAnswer={handleAnswer}
                onSetCell={handleSetCell}
                onToggleDrained={handleToggleDrained}
                onReset={() => setResetOpen(true)}
                onNext={() => moveBy(1)}
                onPrev={() => moveBy(-1)}
                isFirst={isFirst}
                isLast={isLast}
              />
            </div>
            <StageBar stages={stageProgress} activeStage={activeStage} onPick={onPickStage} />
          </main>

          <aside>
            <div className="panel">
              <div className="hd">
                <span>Root-cause</span>
              </div>
              <div className="bd">
                <RankingPanel
                  ranked={ranked}
                  severityT={severityT}
                  activeRC={activeRC}
                  onPickRC={setActiveRC}
                />
              </div>
            </div>
            <div className="panel">
              <div className="hd">
                <span>Recommended Next</span>
              </div>
              <div className="bd">
                <RecommendationPanel
                  recs={recommendations}
                  onSelect={pickQuestion}
                  max={isMobile ? 3 : 4}
                />
              </div>
            </div>
          </aside>
        </div>
      </section>

      {resetOpen && <ResetModal onCancel={() => setResetOpen(false)} onConfirm={doReset} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
