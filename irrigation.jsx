import DATA from "./data.json";

const { useState, useMemo, useEffect } = React;

// ============ ROOT CAUSES ============
const RC = Object.fromEntries(DATA.causes.map(c => [c.id, c]));
const ALL_IDS = Object.keys(RC);
// targetId → [leaf ids]; built once so eff() is a plain lookup for both leaf and group targets.
const TARGETS = {};
ALL_IDS.forEach(id => {
  TARGETS[id] = [id];
  const p = RC[id].parent;
  if (p) (TARGETS[p] ||= []).push(id);
});
const eff = (m) => {
  const r = {};
  Object.entries(m).forEach(([t,d]) => {
    (TARGETS[t] || []).forEach(rc => { r[rc] = (r[rc]||0) + d; });
  });
  return r;
};

// ============ QUESTIONS ============
const QUESTIONS = DATA.questions.map(q => ({
  ...q,
  options: q.options.map(o => ({ ...o, effects: eff(o.effects || {}) })),
}));

// ============ DIAGRAM (engineering blueprint style) ============
const BOX_W = 130, BOX_H = 72;
// Footer strip inside every node: indicator cells share the box outline.
const FOOTER_TOP = 46;        // y-offset within box where footer divider sits
// Row 1: SOFTWARE → CONTROLLER → RELAY → PUMP  (evenly spread across full viewport)
// Row 2: VALVES directly below PUMP (water flows straight down)
// Row 3: three SPRINKLER zones spread below
const NODES = [
  {key:'sw',     x:  36, y: 20, w: BOX_W, h: BOX_H, label:'SOFTWARE',   icon:'sw',     pips:['R1.1','R1.2','R1.3']},
  {key:'ctrl',   x: 202, y: 20, w: BOX_W, h: BOX_H, label:'CONTROLLER', icon:'ctrl',   pips:['R2.2','R2.3']},
  {key:'relay',  x: 368, y: 20, w: BOX_W, h: BOX_H, label:'RELAY',      icon:'relay',  pips:['R3.1']},
  {key:'pump',   x: 534, y: 20, w: BOX_W, h: BOX_H, label:'PUMP',       icon:'pump',   pips:['R4.1','R4.2']},
  {key:'valves', x: 534, y:170, w: BOX_W, h: BOX_H, label:'VALVES',     icon:'valves', pips:['R7.1','R7.2','R7.3','R7.4']},
  {key:'sp1',    x:  20, y:340, w: BOX_W, h: BOX_H, label:'SPRINKLER',  icon:'sprk',   pips: []},
  {key:'sp2',    x: 285, y:340, w: BOX_W, h: BOX_H, label:'SPRINKLER',  icon:'sprk',   pips:['R9.1']},
  {key:'sp3',    x: 550, y:340, w: BOX_W, h: BOX_H, label:'SPRINKLER',  icon:'sprk',   pips: []},
];
// Connector pip positions — only those that ride on the line segments
// (node-attached pips are now footer cells inside their box)
const CONN_R = {
  // Main water vertical x=599, y 92→170
  'R5.1':{x: 599, y: 115}, 'R5.2':{x: 599, y: 145},
  // Control wire horizontal y=130, x 267→520
  'R6.1':{x: 330, y: 130}, 'R6.2':{x: 400, y: 130}, 'R6.3':{x: 470, y: 130},
  // Lateral hoses
  'R8.1':{x: 300, y: 290}, 'R8.2':{x: 633, y: 265},
};

// severity color → rust gradient stops, mapped from irrits.html scale
const sevColor = (t) => {
  // 0 → calm green, .5 → paper, 1 → rust deep
  const tt = Math.max(0, Math.min(1, t));
  if (tt < 0.18) return '#cfd6b8';                 // dim
  if (tt < 0.36) return '#dcd3ba';                 // paper-3
  if (tt < 0.55) return '#ecc8b1';                 // rust-soft
  if (tt < 0.78) return '#c47554';                 // rust-mid
  return '#7a2f15';                                // rust-deep
};
const sevText = (t) => (t >= 0.55 ? '#efe8d8' : '#1a2238');

function NodeIcon({ kind, cx, cy }) {
  const s = "#1a2238";
  if (kind === 'sw') return (
    <g transform={`translate(${cx},${cy})`} fill="none" stroke={s} strokeWidth="1.2" strokeLinecap="round">
      <rect x="-13" y="-9" width="26" height="18" rx="2"/>
      <line x1="-13" y1="-4" x2="13" y2="-4"/>
      <circle cx="-10" cy="-6.5" r="0.9" fill={s} stroke="none"/>
      <circle cx="-7" cy="-6.5" r="0.9" fill={s} stroke="none"/>
      <circle cx="-4" cy="-6.5" r="0.9" fill={s} stroke="none"/>
      <line x1="-8" y1="0" x2="9" y2="0"/>
      <line x1="-8" y1="3.5" x2="6" y2="3.5"/>
      <line x1="-8" y1="7" x2="3" y2="7"/>
    </g>
  );
  if (kind === 'ctrl') return (
    <g transform={`translate(${cx},${cy})`} fill="none" stroke={s} strokeWidth="1.2" strokeLinecap="round">
      <rect x="-13" y="-9" width="26" height="18" rx="2"/>
      <circle cx="-5" cy="0" r="4.5"/>
      <line x1="-5" y1="0" x2="-2.5" y2="-2.5"/>
      <circle cx="-5" cy="-5.5" r="0.6" fill={s} stroke="none"/>
      <circle cx="-5" cy="5.5" r="0.6" fill={s} stroke="none"/>
      <rect x="3" y="-6" width="9" height="3.5"/>
      <rect x="3" y="2" width="9" height="3.5" fill={s}/>
    </g>
  );
  if (kind === 'relay') return (
    <g transform={`translate(${cx},${cy})`} fill="none" stroke={s} strokeWidth="1.2" strokeLinecap="round">
      <rect x="-13" y="-9" width="26" height="18" rx="2"/>
      <line x1="-9" y1="4" x2="-3" y2="4"/>
      <line x1="-3" y1="4" x2="6" y2="-3"/>
      <line x1="6" y1="4" x2="9" y2="4"/>
      <circle cx="-3" cy="4" r="1.3" fill={s}/>
      <circle cx="6" cy="4" r="1.3" fill={s}/>
      <line x1="-7" y1="-5" x2="7" y2="-5" strokeDasharray="1.6 1.4"/>
    </g>
  );
  if (kind === 'pump') return (
    <g transform={`translate(${cx},${cy})`} fill="none" stroke={s} strokeWidth="1.2" strokeLinecap="round">
      <circle r="10"/>
      <path d="M -7 1 q 3.5 -6 7 0 t 7 0"/>
      <path d="M -7 5 q 3.5 -6 7 0 t 7 0"/>
    </g>
  );
  if (kind === 'valves') return (
    <g transform={`translate(${cx},${cy})`} fill="none" stroke={s} strokeWidth="1.2" strokeLinecap="round">
      <line x1="-15" y1="3" x2="15" y2="3" strokeWidth="2"/>
      <path d="M -10 -2 L -6 3 L -10 8 Z"/>
      <path d="M -2 -2 L -6 3 L -2 8 Z"/>
      <line x1="-6" y1="-2" x2="-6" y2="-7"/>
      <line x1="-9" y1="-7" x2="-3" y2="-7"/>
      <path d="M 2 -2 L 6 3 L 2 8 Z"/>
      <path d="M 10 -2 L 6 3 L 10 8 Z"/>
      <line x1="6" y1="-2" x2="6" y2="-7"/>
      <line x1="3" y1="-7" x2="9" y2="-7"/>
    </g>
  );
  if (kind === 'sprk') return (
    <g transform={`translate(${cx},${cy})`} fill="none" stroke={s} strokeWidth="1.2" strokeLinecap="round">
      <path d="M -12 5 Q 0 -11 12 5"/>
      <circle cx="-9" cy="3.5" r="0.9" fill={s} stroke="none"/>
      <circle cx="-5" cy="-1.5" r="0.9" fill={s} stroke="none"/>
      <circle cx="0" cy="-4" r="0.9" fill={s} stroke="none"/>
      <circle cx="5" cy="-1.5" r="0.9" fill={s} stroke="none"/>
      <circle cx="9" cy="3.5" r="0.9" fill={s} stroke="none"/>
      <line x1="0" y1="5" x2="0" y2="9"/>
      <line x1="-3" y1="9" x2="3" y2="9"/>
    </g>
  );
  return null;
}

function NodeBox({ box, iconKind, label, severityT, activeRC, onPickRC }) {
  const cx = box.x + box.w/2;
  const pips = box.pips || [];
  const fy = box.y + FOOTER_TOP;
  const fh = box.h - FOOTER_TOP;
  const cw = pips.length ? box.w / pips.length : 0;
  return (
    <g>
      {/* outer node frame, paper-filled */}
      <rect x={box.x} y={box.y} width={box.w} height={box.h}
            fill="#f7f2e6" stroke="#1a2238" strokeWidth="1.5"/>

      {/* per-pip footer fills (overlay paper inside the outline) */}
      {pips.map((rcId, i) => (
        <rect key={`f-${rcId}`}
          x={box.x + i*cw} y={fy} width={cw} height={fh}
          fill={sevColor(severityT[rcId] || 0)} stroke="none"/>
      ))}

      {/* icon + label */}
      {iconKind && <NodeIcon kind={iconKind} cx={cx} cy={box.y + 16}/>}
      {label && <text x={cx} y={box.y + 38} textAnchor="middle" className="lbl">{label}</text>}

      {/* footer top divider + inter-cell dividers (part of the box outline) */}
      {pips.length > 0 && (
        <>
          <line x1={box.x} y1={fy} x2={box.x + box.w} y2={fy}
                stroke="#1a2238" strokeWidth="1.5"/>
          {pips.slice(1).map((_, i) => {
            const x = box.x + (i+1)*cw;
            return <line key={`d-${i}`} x1={x} y1={fy} x2={x} y2={fy + fh}
                         stroke="#1a2238" strokeWidth="1"/>;
          })}
        </>
      )}

      {/* pip ids + interaction targets */}
      {pips.map((rcId, i) => {
        const ccx = box.x + i*cw + cw/2;
        return (
          <g key={`l-${rcId}`} role="button" tabIndex="0"
             aria-label={`Root cause ${rcId}: ${RC[rcId].label}`}
             style={{cursor:'pointer'}}
             onClick={() => onPickRC && onPickRC(rcId)}
             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPickRC && onPickRC(rcId); } }}>
            <rect x={box.x + i*cw} y={fy} width={cw} height={fh} fill="transparent"/>
            <text x={ccx} y={fy + fh/2 + 3.5} textAnchor="middle" className="pip"
                  fill={sevText(severityT[rcId] || 0)}>
              {rcId.replace('R','')}
            </text>
          </g>
        );
      })}

      {/* active cell highlight (inset, stays inside the silhouette) */}
      {pips.map((rcId, i) => {
        if (activeRC !== rcId) return null;
        return (
          <rect key={`a-${rcId}`}
            x={box.x + i*cw + 1.5} y={fy + 1.5}
            width={cw - 3} height={fh - 3}
            fill="none" stroke="#1a2238" strokeWidth="2"
            pointerEvents="none"/>
        );
      })}
    </g>
  );
}

function ConnectorPip({ rcId, pos, severityT, activeRC, onPickRC }) {
  const t = severityT[rcId] || 0;
  const isActive = activeRC === rcId;
  const sz = isActive ? 18 : 16;
  return (
    <g role="button" tabIndex="0"
       aria-label={`Root cause ${rcId}: ${RC[rcId].label}`}
       style={{cursor:'pointer'}}
       onClick={() => onPickRC && onPickRC(rcId)}
       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPickRC && onPickRC(rcId); } }}>
      <rect x={pos.x - sz/2} y={pos.y - sz/2} width={sz} height={sz} rx="1.5"
            fill={sevColor(t)} stroke="#1a2238" strokeWidth={isActive ? 1.8 : 1.2}/>
      <text x={pos.x} y={pos.y + 3} textAnchor="middle" className="pip" fill={sevText(t)}>
        {rcId.replace('R','')}
      </text>
    </g>
  );
}

function SystemDiagram({ severityT, activeRC, onPickRC }) {
  return (
    <svg viewBox="0 0 700 420" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#1a2238"/>
        </marker>
        <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#b14a26"/>
        </marker>
        <marker id="arrS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#5a6a85"/>
        </marker>
      </defs>
      <style>{`
        .lbl{font-family:'Nunito Sans',sans-serif;font-weight:800;font-size:12px;fill:#1a2238;letter-spacing:.05em}
        .pip{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:9px;pointer-events:none}
      `}</style>

      {/* ── control wires (rust dashed) ── */}
      <g fill="none" stroke="#b14a26" strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round">
        {/* SW → CTRL (icon-level horizontal) */}
        <line x1="166" y1="36" x2="202" y2="36" markerEnd="url(#arrR)"/>
        {/* CTRL → RELAY */}
        <line x1="332" y1="36" x2="368" y2="36" markerEnd="url(#arrR)"/>
        {/* CTRL → VALVES: down from CTRL bottom, right across (R6 pips), down, into VALVES left edge */}
        <path d="M 267 92 V 130 H 520 V 206 H 534" markerEnd="url(#arrR)"/>
      </g>

      {/* ── 230 V power (dot-dash slate): RELAY → PUMP ── */}
      <line x1="498" y1="36" x2="534" y2="36" stroke="#5a6a85" strokeWidth="2" strokeDasharray="4 2 1 2" markerEnd="url(#arrS)"/>

      {/* ── main water line: PUMP → VALVES (straight down center) ── */}
      <line x1="599" y1="92" x2="599" y2="170" stroke="#1a2238" strokeWidth="4" fill="none" markerEnd="url(#arr)"/>

      {/* ── lateral hoses VALVES → sprinklers ── */}
      <g stroke="#1a2238" strokeWidth="2.2" fill="none" strokeLinecap="round">
        {/* to SPRK1 (center 85) */}
        <path d="M 565 242 V 290 H 85 V 340" markerEnd="url(#arr)"/>
        {/* to SPRK2 (center 350) */}
        <path d="M 599 242 V 310 H 350 V 340" markerEnd="url(#arr)"/>
        {/* to SPRK3 (center 615) */}
        <path d="M 633 242 V 290 H 615 V 340" markerEnd="url(#arr)"/>
      </g>

      {/* ── nodes ── */}
      {NODES.map(b => (
        <NodeBox key={b.key} box={b} iconKind={b.icon} label={b.label}
                 severityT={severityT} activeRC={activeRC} onPickRC={onPickRC}/>
      ))}

      {/* ── connector pips ── */}
      {Object.entries(CONN_R).map(([rcId, pos]) => (
        <ConnectorPip key={rcId} rcId={rcId} pos={pos}
                      severityT={severityT} activeRC={activeRC} onPickRC={onPickRC}/>
      ))}
    </svg>
  );
}

// ============ STAGE TABS ============
function StageBar({ stages, activeStage, onPick }) {
  const labels = ['', 'Ages', 'Symptoms', 'Events', 'Tests'];
  return (
    <div className="stages">
      {[1,2,3,4].map(s => {
        const sp = stages[s];
        const active = activeStage === s;
        const pct = sp.total ? (sp.answered / sp.total) * 100 : 0;
        return (
          <button key={s} type="button" onClick={() => onPick(s)} className={active ? 'active' : ''}>
            <span className="label">
              <span className="nm">{labels[s]}</span>
              <span className="ct mono">{sp.answered}/{sp.total}</span>
            </span>
            <span className="fill" style={{width: pct+'%'}}/>
          </button>
        );
      })}
    </div>
  );
}

// ============ QUESTION PANEL ============
function QuestionPanel({ question, answer, onAnswer, freezeDrained, onToggleDrained, onNext, onPrev, isFirst, isLast, onReset }) {
  if (!question) return null;
  const isFreeze = question.id === 'E_freeze';
  return (
    <div>
      <div className="qhead">
        <div className="qtitle" style={{flex:1, margin:0}}>{question.text}</div>
        <button className="btn danger" type="button" onClick={onReset}>Reset</button>
        <div className="qnav">
          <button type="button" onClick={onPrev} disabled={isFirst} title="Previous">‹</button>
          <button type="button" onClick={onNext} disabled={isLast}  title="Next">›</button>
        </div>
      </div>
      {isFreeze && (
        <label className="qfreeze">
          <input type="checkbox" checked={freezeDrained} onChange={(e)=>onToggleDrained(e.target.checked)} />
          System was drained for winter (halve effect)
        </label>
      )}
      <div className="opts">
        {question.options.map((opt,i) => {
          const selected = answer === i;
          return (
            <button key={i} type="button"
              className={`opt ${selected ? 'selected' : ''}`}
              onClick={() => onAnswer(i)}>
              <span className="dot">{selected ? '●' : '○'}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ RANK PANEL ============
function RankingPanel({ ranked, severityT, activeRC, onPickRC }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ranked : ranked.slice(0, 8);
  return (
    <div>
      <div className="rank">
        {visible.map((r, i) => {
          const meta = RC[r.id];
          const active = activeRC === r.id;
          return (
            <button key={r.id} type="button"
              className={`rank-row ${active?'active':''}`}
              onClick={() => onPickRC(r.id)}>
              <span className="id mono">{r.id}</span>
              <div style={{minWidth:0}}>
                <div className="label">{meta.label}</div>
                <div className="bar"><div style={{width: r.pct+'%', background: sevColor(severityT[r.id])}}/></div>
              </div>
              <span className="pct mono" style={{color: sevColor(Math.min(1, severityT[r.id]+.1))}}>{r.pct.toFixed(1)}%</span>
            </button>
          );
        })}
      </div>
      {ranked.length > 8 && (
        <button type="button" className="rank-more" onClick={() => setShowAll(s=>!s)}>
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

// ============ HOOK ============
function useIsMobile(breakpoint = 760) {
  const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
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
  const [freezeDrained, setFreezeDrained] = useState(false);
  const isMobile = useIsMobile(760);

  const scores = useMemo(() => {
    const s = {};
    ALL_IDS.forEach(id => { s[id] = RC[id].baseline; });
    Object.entries(answers).forEach(([qid, optIdx]) => {
      const q = QUESTIONS.find(qq => qq.id === qid);
      if (!q || optIdx == null) return;
      const opt = q.options[optIdx];
      const halve = (qid === 'E_freeze' && freezeDrained) ? 0.5 : 1;
      Object.entries(opt.effects).forEach(([rc, delta]) => {
        s[rc] = (s[rc] || 0) + delta * halve;
      });
    });
    return s;
  }, [answers, freezeDrained]);

  const ranked = useMemo(() => {
    const total = ALL_IDS.reduce((sum, id) => sum + Math.max(0, scores[id]), 0);
    return ALL_IDS
      .map(id => ({ id, score: scores[id], pct: total > 0 ? (Math.max(0, scores[id]) / total) * 100 : 0 }))
      .sort((a, b) => b.score - a.score);
  }, [scores]);

  const severityT = useMemo(() => {
    const max = Math.max(...ALL_IDS.map(id => scores[id]), 0.1);
    const t = {};
    ALL_IDS.forEach(id => { t[id] = Math.max(0, scores[id]) / max; });
    return t;
  }, [scores]);

  const top5 = useMemo(() => ranked.slice(0, 5).map(r => r.id), [ranked]);

  const recommendations = useMemo(() => {
    const unanswered = QUESTIONS.filter(q => answers[q.id] == null);
    const scored = unanswered.map(q => {
      let D = 0;
      top5.forEach(rcId => {
        const deltas = q.options.map(o => o.effects[rcId] || 0);
        D += Math.max(...deltas) - Math.min(...deltas);
      });
      return { q, D };
    });
    return scored.filter(r => r.D > 0).sort((a, b) => b.D - a.D).slice(0, 4);
  }, [answers, top5]);

  const stageProgress = useMemo(() => {
    const sp = { 1: { answered: 0, total: 0 }, 2: { answered: 0, total: 0 }, 3: { answered: 0, total: 0 }, 4: { answered: 0, total: 0 } };
    QUESTIONS.forEach(q => {
      sp[q.stage].total++;
      if (answers[q.id] != null) sp[q.stage].answered++;
    });
    return sp;
  }, [answers]);

  const activeQuestion = QUESTIONS.find(q => q.id === activeQuestionId);
  const activeIdx = QUESTIONS.findIndex(q => q.id === activeQuestionId);
  const isFirst = activeIdx <= 0;
  const isLast  = activeIdx >= QUESTIONS.length - 1;

  const setAnswer = (qid, optIdx) => setAnswers(p => ({ ...p, [qid]: optIdx }));

  const pickQuestion = (qid) => {
    setActiveQuestionId(qid);
    const q = QUESTIONS.find(qq => qq.id === qid);
    if (q) setActiveStage(q.stage);
  };

  const moveBy = (delta) => {
    const idx = QUESTIONS.findIndex(q => q.id === activeQuestionId);
    const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + delta))];
    pickQuestion(next.id);
  };

  const handleAnswer = (i) => {
    const currentId = activeQuestionId;
    setAnswer(currentId, i);
    setTimeout(() => {
      const idx = QUESTIONS.findIndex(q => q.id === currentId);
      if (idx >= 0 && idx < QUESTIONS.length - 1) {
        pickQuestion(QUESTIONS[idx + 1].id);
      }
    }, 180);
  };

  const reset = () => {
    if (window.confirm('Clear all answers?')) {
      setAnswers({}); setFreezeDrained(false); setActiveRC(null);
      setActiveQuestionId(QUESTIONS[0].id); setActiveStage(1);
    }
  };

  return (
    <>
      {/* DIAGRAM SECTION (no title, no subtitle) */}
      <section className="sec">
        <div className="schem-wrap">
          <SystemDiagram severityT={severityT} activeRC={activeRC} onPickRC={setActiveRC} />
          <div className="schem-legend">
            <span><span className="swatch dashed"/> control signal</span>
            <span><span className="swatch dotted"/> 230 V power</span>
            <span><span className="swatch water"/> water flow</span>
          </div>
        </div>
      </section>

      {/* WORKBENCH */}
      <section className="sec">
        <div className="work">
          {/* LEFT COLUMN: question panel + stage bar */}
          <div style={{display:'flex', flexDirection:'column', gap:'6px', minWidth:0}}>
            <main className="panel">
              <div className="bd">
                <QuestionPanel
                  question={activeQuestion}
                  answer={answers[activeQuestionId]}
                  onAnswer={handleAnswer}
                  onReset={reset}
                  freezeDrained={freezeDrained}
                  onToggleDrained={setFreezeDrained}
                  onNext={() => moveBy(1)}
                  onPrev={() => moveBy(-1)}
                  isFirst={isFirst} isLast={isLast}
                />
              </div>
            </main>
            <StageBar stages={stageProgress} activeStage={activeStage} onPick={setActiveStage}/>
          </div>

          {/* RIGHT COLUMN: ranking + recs */}
          <aside style={{display:'flex', flexDirection:'column', gap:'6px', minWidth:0}}>
            <div className="panel">
              <div className="hd">
                <span>Root-cause</span>
                <span className="meta">% · score</span>
              </div>
              <div className="bd">
                <RankingPanel ranked={ranked} severityT={severityT} activeRC={activeRC} onPickRC={setActiveRC}/>
              </div>
            </div>
            <div className="panel">
              <div className="hd">
                <span>Recommended Next</span>
              </div>
              <div className="bd">
                <RecommendationPanel recs={recommendations} onSelect={pickQuestion} max={isMobile?3:4}/>
              </div>
            </div>
          </aside>
        </div>
      </section>


    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
