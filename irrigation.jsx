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
const NODES = [
  {
    key: 'sw',
    x: 36,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'SOFTWARE',
    icon: 'sw',
    pips: ['R1.1', 'R1.2', 'R1.3'],
  },
  {
    key: 'ctrl',
    x: 202,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'CONTROLLER',
    icon: 'ctrl',
    pips: ['R2.2', 'R2.3'],
  },
  {
    key: 'relay',
    x: 368,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'RELAY',
    icon: 'relay',
    pips: ['R3.1'],
  },
  {
    key: 'pump',
    x: 534,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'PUMP',
    icon: 'pump',
    pips: ['R4.1', 'R4.2'],
  },
  {
    key: 'valves',
    x: 285,
    y: 170,
    w: BOX_W,
    h: BOX_H,
    label: 'VALVES',
    icon: 'valves',
    pips: ['R7.1', 'R7.2', 'R7.3', 'R7.4'],
  },
  {
    key: 'sp1',
    x: 20,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icon: 'sprk',
    pips: ['R9.1', 'R9.2'],
  },
  {
    key: 'sp2',
    x: 200,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icon: 'sprk',
    pips: ['R9.1', 'R9.2'],
  },
  {
    key: 'sp3',
    x: 380,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icon: 'sprk',
    pips: ['R9.1', 'R9.2'],
  },
  {
    key: 'sp4',
    x: 560,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icon: 'sprk',
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

function NodeIcon({ kind, cx, cy }) {
  const s = '#1a2238';
  if (kind === 'sw')
    return (
      <g
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={s}
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <rect x="-13" y="-9" width="26" height="18" rx="2" />
        <line x1="-13" y1="-4" x2="13" y2="-4" />
        <circle cx="-10" cy="-6.5" r="0.9" fill={s} stroke="none" />
        <circle cx="-7" cy="-6.5" r="0.9" fill={s} stroke="none" />
        <circle cx="-4" cy="-6.5" r="0.9" fill={s} stroke="none" />
        <line x1="-8" y1="0" x2="9" y2="0" />
        <line x1="-8" y1="3.5" x2="6" y2="3.5" />
        <line x1="-8" y1="7" x2="3" y2="7" />
      </g>
    );
  if (kind === 'ctrl')
    return (
      <g
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={s}
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <rect x="-13" y="-9" width="26" height="18" rx="2" />
        <circle cx="-5" cy="0" r="4.5" />
        <line x1="-5" y1="0" x2="-2.5" y2="-2.5" />
        <circle cx="-5" cy="-5.5" r="0.6" fill={s} stroke="none" />
        <circle cx="-5" cy="5.5" r="0.6" fill={s} stroke="none" />
        <rect x="3" y="-6" width="9" height="3.5" />
        <rect x="3" y="2" width="9" height="3.5" fill={s} />
      </g>
    );
  if (kind === 'relay')
    return (
      <g
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={s}
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <rect x="-13" y="-9" width="26" height="18" rx="2" />
        <line x1="-9" y1="4" x2="-3" y2="4" />
        <line x1="-3" y1="4" x2="6" y2="-3" />
        <line x1="6" y1="4" x2="9" y2="4" />
        <circle cx="-3" cy="4" r="1.3" fill={s} />
        <circle cx="6" cy="4" r="1.3" fill={s} />
        <line x1="-7" y1="-5" x2="7" y2="-5" strokeDasharray="1.6 1.4" />
      </g>
    );
  if (kind === 'pump')
    return (
      <g
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={s}
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <circle r="10" />
        <path d="M -7 1 q 3.5 -6 7 0 t 7 0" />
        <path d="M -7 5 q 3.5 -6 7 0 t 7 0" />
      </g>
    );
  if (kind === 'valves')
    return (
      <g
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={s}
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <line x1="-15" y1="3" x2="15" y2="3" strokeWidth="2" />
        <path d="M -10 -2 L -6 3 L -10 8 Z" />
        <path d="M -2 -2 L -6 3 L -2 8 Z" />
        <line x1="-6" y1="-2" x2="-6" y2="-7" />
        <line x1="-9" y1="-7" x2="-3" y2="-7" />
        <path d="M 2 -2 L 6 3 L 2 8 Z" />
        <path d="M 10 -2 L 6 3 L 10 8 Z" />
        <line x1="6" y1="-2" x2="6" y2="-7" />
        <line x1="3" y1="-7" x2="9" y2="-7" />
      </g>
    );
  if (kind === 'sprk')
    return (
      <g
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={s}
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <path d="M -12 5 Q 0 -11 12 5" />
        <circle cx="-9" cy="3.5" r="0.9" fill={s} stroke="none" />
        <circle cx="-5" cy="-1.5" r="0.9" fill={s} stroke="none" />
        <circle cx="0" cy="-4" r="0.9" fill={s} stroke="none" />
        <circle cx="5" cy="-1.5" r="0.9" fill={s} stroke="none" />
        <circle cx="9" cy="3.5" r="0.9" fill={s} stroke="none" />
        <line x1="0" y1="5" x2="0" y2="9" />
        <line x1="-3" y1="9" x2="3" y2="9" />
      </g>
    );
  return null;
}

function NodeBox({ box, iconKind, label, severityT, severityPct, activeRC, onPickRC }) {
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

      {iconKind && <NodeIcon kind={iconKind} cx={cx} cy={box.y + 16} />}
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
            style={{ cursor: 'pointer' }}
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
      style={{ cursor: 'pointer' }}
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
          <path d="M0,0 L10,5 L0,10 z" fill="#5a6a85" />
        </marker>
      </defs>
      <style>{`
        .lbl{font-family:'Nunito Sans',sans-serif;font-weight:800;font-size:12px;fill:#1a2238;letter-spacing:.05em}
        .pip{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:9px;pointer-events:none}
        .ln-lbl{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:8.5px;pointer-events:none;letter-spacing:.06em}
      `}</style>

      {/* ── Wi-Fi link SOFTWARE ↔ CONTROLLER (slate dotted, no arrow — bidirectional) ── */}
      <line
        x1="166"
        y1="36"
        x2="202"
        y2="36"
        stroke="#4a5878"
        strokeWidth="1.2"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      {/* Wi-Fi arc glyph centred on the link */}
      <g
        transform="translate(184, 24)"
        stroke="#4a5878"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M -5 0 A 5 5 0 0 1 5 0" />
        <path d="M -3 1.5 A 3 3 0 0 1 3 1.5" />
        <circle cx="0" cy="3" r="0.9" fill="#4a5878" stroke="none" />
      </g>

      {/* ── 24 V control wires (rust dashed) ── */}
      <g fill="none" stroke="#b14a26" strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round">
        <line x1="332" y1="36" x2="368" y2="36" markerEnd="url(#arr-ctrl)" />
        {/* CTRL → VALVES: drop down from controller bottom, then over to valves left side */}
        <path d="M 267 92 V 200 H 285" markerEnd="url(#arr-ctrl)" />
      </g>
      <text x="350" y="30" textAnchor="middle" className="ln-lbl" fill="#b14a26">
        24 V
      </text>
      <text x="252" y="108" textAnchor="end" className="ln-lbl" fill="#b14a26">
        24 V
      </text>

      {/* ── 230 V mains (slate solid + ⚡) RELAY → PUMP ── */}
      <line
        x1="498"
        y1="36"
        x2="534"
        y2="36"
        stroke="#5a6a85"
        strokeWidth="2.5"
        markerEnd="url(#arr-mains)"
      />
      <text x="516" y="30" textAnchor="middle" className="ln-lbl" fill="#5a6a85">
        ⚡ 230 V
      </text>

      {/* ── Main water line: PUMP down then across to VALVES top ── */}
      <path
        d="M 599 92 V 145 H 350 V 170"
        stroke="#1a4a7a"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        markerEnd="url(#arr-water)"
      />
      <text x="370" y="142" textAnchor="middle" className="ln-lbl" fill="#1a4a7a">
        H₂O
      </text>

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
          iconKind={b.icon}
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
            className={active ? 'active' : ''}
          >
            <span className="label">
              <span className="nm">{labels[s]}</span>
              <span className="ct mono">
                {sp.answered}/{sp.total}
              </span>
            </span>
            <span className="fill" style={{ width: pct + '%' }} />
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
        <div className="matrix-cell matrix-head matrix-corner" />
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
                      className={`matrix-radio ${checked ? 'checked' : ''}`}
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
        <div className="qtitle" style={{ flex: 1, margin: 0 }}>
          {question.text}
        </div>
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
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNext}
              disabled={isLast}
            >
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
                className={`opt ${selected ? 'selected' : ''}`}
                onClick={() => onAnswer(i)}
              >
                <span className="dot">{selected ? '●' : '○'}</span>
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
              className={`rank-row ${active ? 'active' : ''}`}
              onClick={() => onPickRC(r.id)}
            >
              <span className="id mono">{r.id}</span>
              <div style={{ minWidth: 0 }}>
                <div className="label">{meta.label}</div>
                <div className="bar">
                  <div style={{ width: r.pct + '%', background: colour }} />
                </div>
              </div>
              <span className="pct mono" style={{ color: colour }}>
                {pct}%
              </span>
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
          <div className="top">
            <span className="id">{q.id}</span>
            <span className="stg">S{q.stage}</span>
            <span className="d">D = {D.toFixed(2)}</span>
          </div>
          <div className="qq">{q.text}</div>
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
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
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
              <span className="swatch water" /> water
            </span>
            <span>
              <span className="swatch mains" /> 230 V mains
            </span>
            <span>
              <span className="swatch ctrl" /> 24 V control
            </span>
            <span>
              <span className="swatch wifi" /> Wi-Fi
            </span>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="work">
          <main className="panel panel-question">
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

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
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
