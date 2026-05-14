const RC = Object.fromEntries(window.DATA.causes.map((c) => [c.id, c]));
const ALL_IDS = Object.keys(RC);

const RC_CHILDREN = (() => {
  const m = {};
  for (const c of window.DATA.causes) (m[c.parent] ||= []).push(c.id);
  return m;
})();

// Effects may use a parent id (e.g. R7) as a broadcast for all its children;
// per-child entries override the broadcast value.
function expandEffects(effects) {
  if (!effects) return effects;
  const out = {};
  for (const [k, v] of Object.entries(effects)) {
    if (RC_CHILDREN[k]) for (const child of RC_CHILDREN[k]) out[child] = v;
  }
  for (const [k, v] of Object.entries(effects)) {
    if (!RC_CHILDREN[k]) out[k] = v;
  }
  return out;
}

function expandSliderRows(q) {
  const curves = window.DATA.sliderCurves || {};
  const labels = q.stepLabels || [];
  return q.rows.map((row) => {
    if (row.steps) return row;
    const curve = curves[row.curve] || [];
    const causes = row.causes || [];
    return {
      ...row,
      steps: labels.map((label, i) => ({
        label,
        effects: i === 0 ? {} : Object.fromEntries(causes.map((rc) => [rc, curve[i - 1] ?? 0])),
      })),
    };
  });
}

const QUESTIONS = window.DATA.questions.map((q) => {
  const next = { ...q, type: q.type || 'options' };
  if (next.type === 'matrix') {
    next.colMul = Object.fromEntries(next.columns.map((c) => [c.id, c.mult]));
    next.rows = next.rows.map((r) => ({ ...r, effects: expandEffects(r.effects) }));
  } else if (next.type === 'sliders') {
    next.rows = expandSliderRows(next).map((r) => ({
      ...r,
      steps: r.steps.map((s) => ({ ...s, effects: expandEffects(s.effects) })),
    }));
  } else {
    next.options = next.options.map((o) => ({ ...o, effects: expandEffects(o.effects) }));
  }
  return next;
});

const TYPE_HANDLERS = {
  options: {
    score(q, ans, s) {
      const opt = q.options[ans];
      if (!opt) return;
      for (const [rc, delta] of Object.entries(opt.effects)) {
        s[rc] = (s[rc] || 0) + delta;
      }
    },
    discriminator(q, t5) {
      let D = 0;
      for (const rcId of t5) {
        const deltas = q.options.map((o) => o.effects[rcId] || 0);
        D += Math.max(...deltas) - Math.min(...deltas);
      }
      return D;
    },
    isAnswered() {
      return true;
    },
  },
  matrix: {
    score(q, ans, s) {
      const colMul = q.colMul;
      for (const row of q.rows) {
        const m = colMul[ans[row.id] || 'no'] || 0;
        if (m === 0) continue;
        for (const [rc, delta] of Object.entries(row.effects)) {
          s[rc] = (s[rc] || 0) + delta * m;
        }
      }
    },
    discriminator(q, t5) {
      const mults = q.columns.map((c) => c.mult);
      const spread = Math.max(...mults) - Math.min(...mults);
      let D = 0;
      for (const row of q.rows) {
        for (const rcId of t5) D += Math.abs(row.effects[rcId] || 0) * spread;
      }
      return D;
    },
    isAnswered(_q, ans) {
      return Object.keys(ans).length > 0;
    },
  },
  sliders: {
    score(q, ans, s) {
      for (const row of q.rows) {
        const idx = ans[row.id];
        if (idx === undefined || idx === null) continue;
        const step = row.steps[idx];
        if (!step) continue;
        for (const [rc, delta] of Object.entries(step.effects)) {
          s[rc] = (s[rc] || 0) + delta;
        }
      }
    },
    discriminator(q, t5) {
      let D = 0;
      for (const row of q.rows) {
        for (const rcId of t5) {
          const deltas = row.steps.map((st) => st.effects[rcId] || 0);
          D += Math.max(...deltas) - Math.min(...deltas);
        }
      }
      return D;
    },
    isAnswered(_q, ans) {
      return Object.values(ans).some((v) => Number(v) > 0);
    },
  },
};

const STAGES = window.DATA.stages.map((s) => s.id);
const STAGE_LABELS = Object.fromEntries(window.DATA.stages.map((s) => [s.id, s.label]));
const STORAGE_KEY = 'irrigation:v1';
const SEVERITY_FULL_PCT = 18;

const BOX_W = 100;
const BOX_H = 80;
const PIP_SIZE = 28;
const PIP_GAP = 6;

const NODES = [
  {
    key: 'sw',
    x: 22,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'SOFTWARE',
    icons: ['mdi:cellphone'],
    pips: ['R11', 'R12', 'R13'],
  },
  {
    key: 'ctrl',
    x: 295,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'CONTROLLER',
    icons: ['mdi:view-gallery-outline'],
    pips: ['R22', 'R23'],
  },
  {
    key: 'relay',
    x: 568,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'RELAY',
    icons: ['mdi:electric-switch'],
    pips: ['R31'],
  },
  {
    key: 'sp4',
    x: 22,
    y: 180,
    w: BOX_W,
    h: BOX_H,
    label: 'ROTOR',
    icons: ['mdi:rotor'],
    pips: ['R91', 'R92'],
    flipX: true,
  },
  {
    key: 'valves',
    x: 295,
    y: 180,
    w: BOX_W,
    h: BOX_H,
    label: 'VALVES',
    icons: ['ms:valve'],
    pips: ['R71', 'R72', 'R73', 'R74'],
  },
  {
    key: 'pump',
    x: 568,
    y: 180,
    w: BOX_W,
    h: BOX_H,
    label: 'PUMP',
    icons: ['mdi:water-pump'],
    pips: ['R41', 'R42'],
    flipX: true,
    iconScale: 0.65,
  },
];

const CONN_PIPS = [
  { rcId: 'R51', x: 455, y: 280 },
  { rcId: 'R52', x: 490, y: 280 },
  { rcId: 'R61', x: 327, y: 155 },
  { rcId: 'R62', x: 357, y: 155 },
  { rcId: 'R63', x: 387, y: 155 },
  { rcId: 'R81', x: 183, y: 280 },
  { rcId: 'R82', x: 218, y: 280 },
];

function severityT(pct) {
  const t = Math.max(0, Math.min(1, pct / SEVERITY_FULL_PCT));
  return Math.sqrt(t);
}

function severityTFg(pct) {
  return Math.max(0, Math.min(1, (pct - 3) / 3));
}

// Animate state mutations with the View Transitions API. No-op if the browser
// lacks support or the user prefers reduced motion. All mutations that affect
// ranking order or the active question go through this.
function withTransition(fn) {
  const reduce =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce) {
    fn();
    return;
  }
  document.startViewTransition(fn);
}

function iconTransform(name, cx, cy, size, flipX = false) {
  const def = window.ICONS[name];
  if (!def) return '';
  const [minX, minY, vw, vh] = def.vb;
  const scale = size / Math.max(vw, vh);
  const ty = cy - (minY + vh / 2) * scale;
  if (flipX) {
    const tx2 = cx + (minX + vw / 2) * scale;
    return `translate(${tx2} ${ty}) scale(${-scale}, ${scale})`;
  }
  const tx = cx - (minX + vw / 2) * scale;
  return `translate(${tx} ${ty}) scale(${scale})`;
}

function nodeIconLayout(n) {
  return {
    size: Math.max(24, 44 - 8 * (n - 1)),
    gap: n <= 1 ? 0 : Math.max(26, 38 - 8 * (n - 2)),
  };
}

function nodeIconCx(box, i, n) {
  const { gap } = nodeIconLayout(n);
  const cx = box.x + box.w / 2;
  const start = -((n - 1) / 2) * gap;
  return cx + start + i * gap;
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return null;
    migrateLegacyIds(saved);
    return saved;
  } catch {
    return null;
  }
}

// One-shot rename: legacy AGES/E1/E2 → E1/E2/E3. Presence of AGES anywhere in
// saved state is the signal that the payload predates the rename.
function migrateLegacyIds(saved) {
  const hasLegacy =
    saved.answers?.AGES !== undefined ||
    saved.skipped?.AGES !== undefined ||
    saved.activeQuestionId === 'AGES';
  if (!hasLegacy) return;
  const map = { AGES: 'E1', E1: 'E2', E2: 'E3' };
  for (const dict of [saved.answers, saved.skipped]) {
    if (!dict) continue;
    const shifted = {};
    for (const [k, v] of Object.entries(dict)) shifted[map[k] || k] = v;
    Object.keys(dict).forEach((k) => delete dict[k]);
    Object.assign(dict, shifted);
  }
  if (map[saved.activeQuestionId]) saved.activeQuestionId = map[saved.activeQuestionId];
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function app() {
  return {
    QUESTIONS,
    NODES,
    CONN_PIPS,
    FLOWS: window.DATA.flows,
    RC,
    ICONS: window.ICONS,
    OPT_ICONS: window.OPT_ICONS,
    STAGES,
    STAGE_LABELS,

    answers: {},
    skipped: {},
    activeQuestionId: QUESTIONS[0].id,
    activeRC: null,
    recentRC: null,

    iconTransform,
    nodeIconCx,
    severityT,
    severityTFg,

    init() {
      const saved = loadSaved();
      if (saved) {
        if (saved.answers && typeof saved.answers === 'object') this.answers = saved.answers;
        if (saved.skipped && typeof saved.skipped === 'object') this.skipped = saved.skipped;
        if (QUESTIONS.some((q) => q.id === saved.activeQuestionId)) {
          this.activeQuestionId = saved.activeQuestionId;
        }
      }
      this.$watch('answers', () => this._persist());
      this.$watch('skipped', () => this._persist());
      this.$watch('activeQuestionId', () => this._persist());
    },

    _persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            answers: this.answers,
            skipped: this.skipped,
            activeQuestionId: this.activeQuestionId,
          })
        );
      } catch {}
    },

    isSkipped(qid) {
      return !!this.skipped[qid] && !this.isAnswered(qid);
    },

    isCompleted(qid) {
      return this.isAnswered(qid) || !!this.skipped[qid];
    },

    get scores() {
      const s = {};
      ALL_IDS.forEach((id) => {
        s[id] = RC[id].baseline;
      });
      for (const q of QUESTIONS) {
        const ans = this.answers[q.id];
        if (ans === undefined || ans === null) continue;
        TYPE_HANDLERS[q.type].score(q, ans, s);
      }
      return s;
    },

    get severityPct() {
      const s = this.scores;
      const total = ALL_IDS.reduce((sum, id) => sum + Math.max(0, s[id]), 0);
      const m = {};
      ALL_IDS.forEach((id) => {
        m[id] = total > 0 ? (Math.max(0, s[id]) / total) * 100 : 0;
      });
      return m;
    },

    get ranked() {
      const s = this.scores;
      const pct = this.severityPct;
      return ALL_IDS.map((id) => ({ id, score: s[id], pct: pct[id] })).sort(
        (a, b) => b.score - a.score
      );
    },

    get recommendations() {
      const t5 = this.ranked.slice(0, 5).map((r) => r.id);
      return QUESTIONS.filter((q) => !this.isCompleted(q.id))
        .map((q) => ({ q, D: TYPE_HANDLERS[q.type].discriminator(q, t5) }))
        .filter((r) => r.D > 0)
        .sort((a, b) => b.D - a.D)
        .slice(0, 5);
    },

    get stageProgress() {
      const sp = Object.fromEntries(STAGES.map((s) => [s, { answered: 0, total: 0 }]));
      QUESTIONS.forEach((q) => {
        sp[q.stage].total++;
        if (this.isCompleted(q.id)) sp[q.stage].answered++;
      });
      return sp;
    },

    isStageComplete(s) {
      const p = this.stageProgress[s];
      return p && p.total > 0 && p.answered === p.total;
    },

    get activePos() {
      const i = QUESTIONS.findIndex((q) => q.id === this.activeQuestionId);
      return { q: QUESTIONS[i], i };
    },
    get activeQuestion() {
      return this.activePos.q;
    },
    get activeIdx() {
      return this.activePos.i;
    },
    get activeStage() {
      return this.activeQuestion?.stage ?? 1;
    },
    get isFirst() {
      return this.activeIdx <= 0;
    },
    get isLast() {
      return this.activeIdx >= QUESTIONS.length - 1;
    },
    get activeAnswer() {
      return this.answers[this.activeQuestionId];
    },

    get activeHighlights() {
      return this.activeQuestion?.highlight || [];
    },

    isHighlighted(key) {
      return this.activeHighlights.includes(key);
    },

    isAnswered(qid) {
      const a = this.answers[qid];
      if (a === undefined || a === null) return false;
      const q = QUESTIONS.find((qq) => qq.id === qid);
      return TYPE_HANDLERS[q.type].isAnswered(q, a);
    },

    rowAns(rowId) {
      return this.activeAnswer?.[rowId] || 'no';
    },

    sliderVal(rowId) {
      const v = this.activeAnswer?.[rowId];
      return v === undefined || v === null ? 2 : Number(v);
    },

    // animate=false skips withTransition: slider drag fires many ticks per
    // gesture and animating each would be jarring.
    setAnswer(value, { advance = false, animate = true } = {}) {
      const qid = this.activeQuestionId;
      const { i: idx } = this.activePos;
      const write = () => {
        this.answers = { ...this.answers, [qid]: value };
        if (advance && idx >= 0 && idx < QUESTIONS.length - 1) {
          this.activeQuestionId = QUESTIONS[idx + 1].id;
        }
      };
      if (animate) withTransition(write);
      else write();
    },

    setMatrixCell(rowId, colId) {
      const prev = this.answers[this.activeQuestionId] || {};
      this.setAnswer({ ...prev, [rowId]: colId });
    },

    setSliderVal(rowId, val) {
      const prev = this.answers[this.activeQuestionId] || {};
      const v = parseInt(val, 10) || 0;
      this.setAnswer({ ...prev, [rowId]: v }, { animate: false });
    },

    handleAnswer(i) {
      this.setAnswer(i, { advance: true });
    },

    moveBy(d, opts = {}) {
      const { i: idx } = this.activePos;
      const curId = this.activeQuestionId;
      const curStage = this.activeStage;
      const wasAnswered = this.isAnswered(curId);
      const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + d))];
      withTransition(() => {
        if (d > 0 && opts.markComplete && curStage === 2 && !wasAnswered) {
          this.skipped = { ...this.skipped, [curId]: true };
        }
        this.activeQuestionId = next.id;
      });
    },

    pickStage(s) {
      const first = QUESTIONS.find((q) => q.stage === s);
      if (first)
        withTransition(() => {
          this.activeQuestionId = first.id;
        });
    },

    goTo(qid) {
      withTransition(() => {
        this.activeQuestionId = qid;
      });
    },

    doReset() {
      withTransition(() => {
        this.answers = {};
        this.skipped = {};
        this.activeRC = null;
        this.activeQuestionId = QUESTIONS[0].id;
      });
    },

    stagePct(s) {
      const sp = this.stageProgress[s];
      return sp.total ? (sp.answered / sp.total) * 100 : 0;
    },

    rankPct(r) {
      return Math.round(r.pct);
    },
    barWidth(r) {
      return Math.min(r.pct * 5, 100) + '%';
    },

    renderDiagram() {
      const ICONS = window.ICONS;
      const highlights = this.activeHighlights;
      const pips = [];
      let s = '';

      for (const b of NODES) {
        const isHigh = highlights.includes(b.key);
        const nodeCls = isHigh ? 'node-group highlight' : 'node-group';
        s += `<g data-node="${b.key}" class="${nodeCls}">`;
        s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" class="node-box"/>`;

        const layout = nodeIconLayout(b.icons.length);
        const isFlipped = !!b.flipX;
        const iconSizeScale = b.iconScale ?? 1.0;
        for (let i = 0; i < b.icons.length; i++) {
          const name = b.icons[i];
          const iconCx = nodeIconCx(b, i, b.icons.length);
          const tr = iconTransform(
            name,
            iconCx,
            b.y + b.h / 2,
            layout.size * iconSizeScale,
            isFlipped
          );
          s += `<g transform="${tr}"><path d="${ICONS[name].d}" fill="currentColor"/></g>`;
        }
        s += `</g>`;

        const pipsCount = b.pips.length;
        const groupW = pipsCount * PIP_SIZE;
        const groupX = b.x + (b.w - groupW) / 2;
        const cyPip = b.y < 150 ? b.y - PIP_GAP - PIP_SIZE / 2 : b.y + b.h + PIP_GAP + PIP_SIZE / 2;
        for (let i = 0; i < pipsCount; i++) {
          pips.push({
            rcId: b.pips[i],
            cx: groupX + i * PIP_SIZE + PIP_SIZE / 2,
            cy: cyPip,
            connector: false,
          });
        }
      }

      for (const p of CONN_PIPS) {
        pips.push({ rcId: p.rcId, cx: p.x, cy: p.y, connector: true });
      }

      for (const p of pips) s += this.renderPip(p);
      return s;
    },

    renderPip({ rcId, cx, cy, connector }) {
      const pct = this.severityPct[rcId] || 0;
      const tBg = severityT(pct).toFixed(3);
      const tFg = severityTFg(pct).toFixed(3);
      const isActive = this.activeRC === rcId;
      const justActive = this.recentRC === rcId;
      const gCls = (isActive ? 'pip-group active' : 'pip-group') + (justActive ? ' pip-pop' : '');
      const bgCls =
        'pip-background' +
        (connector ? ' pip-background--connector' : '') +
        (isActive ? ' active' : '');
      const style = `--c-sev-t:${tBg};--c-sev-t-fg:${tFg}`;
      let s = `<g role="button" tabindex="0" class="${gCls}" style="${style}" data-rc="${rcId}" aria-label="Root cause ${rcId}: ${escapeAttr(RC[rcId].label)}">`;
      s += `<circle cx="${cx}" cy="${cy}" r="${PIP_SIZE / 2}" class="${bgCls}"/>`;
      s += `<text x="${cx}" y="${cy}" dy=".35em" text-anchor="middle" class="pip">${rcId.replace(/^R/, '')}</text>`;
      if (isActive) {
        s += `<circle cx="${cx}" cy="${cy}" r="${PIP_SIZE / 2 - 2}" class="node-active"/>`;
      }
      s += `</g>`;
      return s;
    },

    pipFromEvent(e) {
      const el = e.target.closest && e.target.closest('[data-rc]');
      if (!el) return;
      const rcId = el.getAttribute('data-rc');
      if (!rcId) return;
      this.activeRC = rcId;
      this.recentRC = rcId;
      setTimeout(() => {
        if (this.recentRC === rcId) this.recentRC = null;
      }, 360);
    },
  };
}

document.addEventListener('alpine:init', () => {
  Alpine.data('app', app);
  Alpine.data('seeMore', (limit = 3) => ({
    open: false,
    limit,
    visible(i) {
      return this.open || i < this.limit;
    },
    toggle() {
      this.open = !this.open;
    },
    hasMore(total) {
      return total > this.limit;
    },
    label(total) {
      return this.open ? 'See fewer' : `See more (${total - this.limit})`;
    },
  }));
});
