import DATA from './data.json';
import ICONS from './icons.js';

const { useState, useMemo, useEffect, useRef } = React;

const RC = Object.fromEntries(DATA.causes.map((c) => [c.id, c]));
const ALL_IDS = Object.keys(RC);
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

const BOX_W = 130,
  BOX_H = 72;
const FOOTER_TOP = 46;

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

const CONN_PIPS = [
  { rcId: 'R5.1', x: 487, y: 145 },
  { rcId: 'R5.2', x: 461, y: 145 },
  { rcId: 'R6.1', x: 241, y: 145 },
  { rcId: 'R6.2', x: 267, y: 145 },
  { rcId: 'R6.3', x: 293, y: 145 },
  { rcId: 'R8.1', x: 180, y: 290 },
  { rcId: 'R8.2', x: 206, y: 290 },
  { rcId: 'R8.1', x: 286, y: 305 },
  { rcId: 'R8.2', x: 312, y: 305 },
  { rcId: 'R8.1', x: 393, y: 305 },
  { rcId: 'R8.2', x: 419, y: 305 },
  { rcId: 'R8.1', x: 500, y: 290 },
  { rcId: 'R8.2', x: 526, y: 290 },
];

const severityLevel = (pct) => {
  if (pct < 4) return 0;
  if (pct < 8) return 1;
  if (pct < 15) return 2;
  return 3;
};

function Icon({ name, cx, cy, size }) {
  const def = ICONS[name];
  if (!def) return null;
  const [minX, minY, vw, vh] = def.vb;
  const scale = size / Math.max(vw, vh);
  const tx = cx - (minX + vw / 2) * scale;
  const ty = cy - (minY + vh / 2) * scale;
  return (
    <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
      <path d={def.d} fill="currentColor" />
    </g>
  );
}

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

function LineLabel({ icon, text, x, y, flow, size = 11, gap = 2 }) {
  return (
    <g data-flow={flow}>
      <Icon name={icon} cx={x - size / 2 - gap} cy={y - 3} size={size} />
      <text x={x} y={y} textAnchor="start" className="ln-lbl">
        {text}
      </text>
    </g>
  );
}

function Pip({ rcId, x, y, w, h, variant, sev, isActive, onPick }) {
  const onActivate = () => onPick && onPick(rcId);
  const bgCls = variant === 'connector' ? 'pip-fill connector' : 'pip-fill';
  return (
    <g
      role="button"
      tabIndex="0"
      aria-label={`Root cause ${rcId}: ${RC[rcId].label}`}
      data-sev={sev}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={variant === 'connector' ? 1.5 : undefined}
        className={`${bgCls}${isActive ? ' active' : ''}`}
      />
      <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle" className="pip">
        {rcId.replace('R', '')}
      </text>
      {variant === 'node' && isActive && (
        <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} className="node-active" />
      )}
    </g>
  );
}

function NodeBox({ box, icons, label, severityPct, activeRC, onPickRC }) {
  const cx = box.x + box.w / 2;
  const pips = box.pips || [];
  const fy = box.y + FOOTER_TOP;
  const fh = box.h - FOOTER_TOP;
  const cw = pips.length ? box.w / pips.length : 0;
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} className="node-box" />
      <NodeIcons icons={icons} cx={cx} cy={box.y + 16} />
      {label && (
        <text x={cx} y={box.y + 38} textAnchor="middle" className="lbl">
          {label}
        </text>
      )}
      {pips.map((rcId, i) => (
        <Pip
          key={`p-${rcId}-${i}`}
          rcId={rcId}
          x={box.x + i * cw}
          y={fy}
          w={cw}
          h={fh}
          variant="node"
          sev={severityLevel(severityPct[rcId] || 0)}
          isActive={activeRC === rcId}
          onPick={onPickRC}
        />
      ))}
      {pips.length > 0 && (
        <>
          <line x1={box.x} y1={fy} x2={box.x + box.w} y2={fy} className="node-divider" />
          {pips.slice(1).map((_, i) => {
            const x = box.x + (i + 1) * cw;
            return <line key={`d-${i}`} x1={x} y1={fy} x2={x} y2={fy + fh} className="node-divider" />;
          })}
        </>
      )}
    </g>
  );
}

function SystemDiagram({ severityPct, activeRC, onPickRC }) {
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
          <path d="M0,0 L10,5 L0,10 z" className="arr" data-flow="water" />
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
          <path d="M0,0 L10,5 L0,10 z" className="arr" data-flow="ctrl" />
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
          <path d="M0,0 L10,5 L0,10 z" className="arr" data-flow="mains" />
        </marker>
      </defs>

      <g data-flow="wifi">
        <line x1="166" y1="36" x2="202" y2="36" className="line" />
        <Icon name="ms:wifi" cx={184} cy={26} size={14} />
      </g>

      <g data-flow="ctrl">
        <line x1="332" y1="36" x2="368" y2="36" className="line" markerEnd="url(#arr-ctrl)" />
        <path d="M 267 92 V 200 H 285" className="line" markerEnd="url(#arr-ctrl)" />
      </g>
      <LineLabel
        icon="mdi:lightning-bolt-outline"
        text="24 V"
        x={346}
        y={30}
        size={10}
        flow="ctrl"
      />
      <LineLabel
        icon="mdi:lightning-bolt-outline"
        text="24 V"
        x={250}
        y={108}
        size={10}
        flow="ctrl"
      />

      <g data-flow="mains">
        <line x1="498" y1="36" x2="534" y2="36" className="line" markerEnd="url(#arr-mains)" />
      </g>
      <LineLabel icon="ms:bolt" text="230 V" x={510} y={30} flow="mains" />

      <g data-flow="water">
        <path d="M 599 92 V 145 H 350 V 170" className="line" markerEnd="url(#arr-water)" />
      </g>
      <LineLabel icon="mdi:water-outline" text="H₂O" x={370} y={142} flow="water" />

      <g data-flow="lateral">
        <path d="M 300 242 V 290 H 85 V 340" className="line" markerEnd="url(#arr-water)" />
        <path d="M 333 242 V 305 H 265 V 340" className="line" markerEnd="url(#arr-water)" />
        <path d="M 367 242 V 305 H 445 V 340" className="line" markerEnd="url(#arr-water)" />
        <path d="M 400 242 V 290 H 625 V 340" className="line" markerEnd="url(#arr-water)" />
      </g>

      {NODES.map((b) => (
        <NodeBox
          key={b.key}
          box={b}
          icons={b.icons}
          label={b.label}
          severityPct={severityPct}
          activeRC={activeRC}
          onPickRC={onPickRC}
        />
      ))}

      {CONN_PIPS.map((p, i) => (
        <Pip
          key={`cp-${i}`}
          rcId={p.rcId}
          x={p.x - 13}
          y={p.y - 13}
          w={26}
          h={26}
          variant="connector"
          sev={severityLevel(severityPct[p.rcId] || 0)}
          isActive={activeRC === p.rcId}
          onPick={onPickRC}
        />
      ))}
    </svg>
  );
}

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
              <span className="ct">
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

function MatrixQuestion({ question, answer, onSetCell, onToggleDrained }) {
  const cols = question.columns;
  const rowAns = answer?.rows || {};
  const drained = answer?.drained || {};
  return (
    <div className="matrix-scroll">
      <div className="matrix" style={{ '--sp-cols': cols.length }}>
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
                  <div key={c.id} className="matrix-cell">
                    <button
                      type="button"
                      className="matrix-radio"
                      aria-label={`${row.label}: ${c.label}`}
                      aria-pressed={checked}
                      onClick={() => onSetCell(row.id, c.id)}
                    />
                  </div>
                );
              })}
              {row.drainable && !isOff && (
                <label className="matrix-drained">
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
        <button
          type="button"
          className="btn btn-icon"
          onClick={onPrev}
          disabled={isFirst}
          title="Previous"
        >
          ‹
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={onNext}
          disabled={isLast}
          title="Next"
        >
          ›
        </button>
      </div>
      {isMatrix ? (
        <>
          <MatrixQuestion
            question={question}
            answer={answer}
            onSetCell={onSetCell}
            onToggleDrained={onToggleDrained}
          />
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onNext} disabled={isLast}>
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
                key={`${question.id}-${i}`}
                type="button"
                className="opt"
                aria-pressed={selected}
                onClick={() => onAnswer(i)}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RankingPanel({ ranked, activeRC, onPickRC }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ranked : ranked.slice(0, 5);
  return (
    <div>
      {visible.map((r) => {
        const meta = RC[r.id];
        const active = activeRC === r.id;
        const pct = Math.round(r.pct);
        return (
          <button
            key={r.id}
            type="button"
            className={`rank-row ${active ? 'active' : ''}`}
            data-sev={severityLevel(pct)}
            onClick={() => onPickRC(r.id)}
          >
            <span className="id">{r.id}</span>
            <div className="rank-row-body">
              <div className="label">{meta.label}</div>
              <div className="bar">
                <div style={{ width: Math.min(r.pct * 5, 100) + '%' }} />
              </div>
            </div>
            <span className="pct">{pct}%</span>
          </button>
        );
      })}
      {ranked.length > 5 && (
        <button type="button" className="rank-more" onClick={() => setShowAll((s) => !s)}>
          {showAll ? '▲ collapse' : `▼ show all ${ranked.length}`}
        </button>
      )}
    </div>
  );
}

function RecommendationPanel({ recs, onSelect }) {
  return (
    <div className="recs">
      {recs.length === 0 && (
        <div className="rec empty">No questions left to differentiate top suspects.</div>
      )}
      {recs.map(({ q, D }) => (
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
        <div className="actions">
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

function App() {
  const [answers, setAnswers] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(QUESTIONS[0].id);
  const [activeRC, setActiveRC] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);

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
      return !!(a.rows && Object.keys(a.rows).length > 0);
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
  const activeStage = activeQuestion?.stage ?? 1;
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

  const moveBy = (delta) => {
    const idx = QUESTIONS.findIndex((q) => q.id === activeQuestionId);
    const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + delta))];
    setActiveQuestionId(next.id);
  };

  const handleAnswer = (i) => {
    const currentId = activeQuestionId;
    setSingleAnswer(currentId, i);
    setTimeout(() => {
      const idx = QUESTIONS.findIndex((q) => q.id === currentId);
      if (idx >= 0 && idx < QUESTIONS.length - 1) {
        setActiveQuestionId(QUESTIONS[idx + 1].id);
      }
    }, 180);
  };

  const handleSetCell = (rowId, colId) => setMatrixCell(activeQuestionId, rowId, colId);
  const handleToggleDrained = (rowId, val) => setMatrixDrained(activeQuestionId, rowId, val);

  const doReset = () => {
    setAnswers({});
    setActiveRC(null);
    setActiveQuestionId(QUESTIONS[0].id);
    setResetOpen(false);
  };

  const onPickStage = (s) => {
    const first = QUESTIONS.find((q) => q.stage === s);
    if (first) setActiveQuestionId(first.id);
  };

  return (
    <>
      <section className="sec-diagram">
        <div className="schem-wrap">
          <SystemDiagram severityPct={severityPct} activeRC={activeRC} onPickRC={setActiveRC} />
          <div className="schem-legend">
            <span>
              <span className="swatch" data-flow="water" /> water
            </span>
            <span>
              <span className="swatch" data-flow="mains" /> 230 V mains
            </span>
            <span>
              <span className="swatch" data-flow="ctrl" /> 24 V control
            </span>
            <span>
              <span className="swatch" data-flow="wifi" /> Wi-Fi
            </span>
          </div>
        </div>
      </section>

      <section>
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
                <RankingPanel ranked={ranked} activeRC={activeRC} onPickRC={setActiveRC} />
              </div>
            </div>
            <div className="panel">
              <div className="hd">
                <span>Recommended Next</span>
              </div>
              <div className="bd">
                <RecommendationPanel recs={recommendations} onSelect={setActiveQuestionId} />
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
