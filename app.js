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
    const kids = RC_CHILDREN[k];
    if (!kids) {
      out[k] = v;
      continue;
    }
    for (const id of kids) if (!(id in effects)) out[id] = v;
  }
  return out;
}

function expandStepRows(q) {
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

const QUESTIONS = window.DATA.questions
  .map((q) => {
    const next = { ...q, type: q.type || 'options' };
    if (next.type === 'matrix') {
      next.colMul = Object.fromEntries(next.columns.map((c) => [c.id, c.mult]));
      next.rows = next.rows.map((r) => ({ ...r, effects: expandEffects(r.effects) }));
    } else if (next.type === 'dates') {
      next.rows = expandStepRows(next).map((r) => ({
        ...r,
        steps: r.steps.map((s) => ({ ...s, effects: expandEffects(s.effects) })),
      }));
    } else {
      next.options = next.options.map((o) => ({ ...o, effects: expandEffects(o.effects) }));
    }
    return next;
  })
  .sort((a, b) => (a.stage ?? Infinity) - (b.stage ?? Infinity));

const MAIN_QUESTIONS = QUESTIONS.filter((q) => !q.optional);
const OPTIONAL_QUESTIONS = QUESTIONS.filter((q) => q.optional);

const DATES_Q = QUESTIONS.find((q) => q.type === 'dates') || null;

const Q_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

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
  dates: {
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
      return !!ans && typeof ans === 'object';
    },
  },
};

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
const DATE_FMT = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short' });

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function ageYears(dateStr) {
  const d = parseDate(dateStr);
  return d ? (Date.now() - d.getTime()) / MS_PER_YEAR : null;
}

function dateStepIndex(years, buckets) {
  if (years === null) return 0;
  for (let i = 0; i < buckets.length; i++) if (years < buckets[i]) return i + 1;
  return buckets.length + 1;
}

const STAGES = window.DATA.stages.map((s) => s.id);
const STAGE_LABELS = Object.fromEntries(window.DATA.stages.map((s) => [s.id, s.label]));
const STAGE_QS = Object.fromEntries(STAGES.map((s) => [s, QUESTIONS.filter((q) => q.stage === s)]));
const STORAGE_KEY = 'irrigation:v1';
const SEVERITY_FULL_PCT = 18;

const BOX_W = 120;
const BOX_H = 100;
const NODE_ICON_SIZE = 92;
const ICON_INSET_X = (BOX_W - NODE_ICON_SIZE) / 2;
const ICON_INSET_Y = (BOX_H - NODE_ICON_SIZE) / 2;

const NODES = [
  { key: 'sw', x: 12, y: 10, image: 'media/software.png' },
  { key: 'ctrl', x: 285, y: 10, image: 'media/controller.png' },
  { key: 'relay', x: 558, y: 10, image: 'media/relay.png' },
  { key: 'sp4', x: 12, y: 170, image: 'media/rotor.png' },
  { key: 'valves', x: 285, y: 170, image: 'media/valves.png' },
  { key: 'pump', x: 558, y: 170, image: 'media/pump.png' },
].map((n) => ({ ...n, w: BOX_W, h: BOX_H, iconX: n.x + ICON_INSET_X, iconY: n.y + ICON_INSET_Y }));

function severityT(pct) {
  const t = Math.max(0, Math.min(1, pct / SEVERITY_FULL_PCT));
  return Math.sqrt(t);
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

function iconTransform(name, cx, cy, size) {
  const def = window.ICONS[name];
  if (!def) return '';
  const [minX, minY, vw, vh] = def.vb;
  const scale = size / Math.max(vw, vh);
  const ty = cy - (minY + vh / 2) * scale;
  const tx = cx - (minX + vw / 2) * scale;
  return `translate(${tx} ${ty}) scale(${scale})`;
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return null;
    migrateLegacyIds(saved);
    pruneUnknownIds(saved);
    return saved;
  } catch {
    return null;
  }
}

// Drop answers, skipped entries, and an activeQuestionId that refer to
// question ids no longer present in data.js.
function pruneUnknownIds(saved) {
  const keep = (dict) =>
    dict ? Object.fromEntries(Object.entries(dict).filter(([k]) => Q_BY_ID[k])) : dict;
  saved.answers = keep(saved.answers);
  saved.skipped = keep(saved.skipped);
  if (saved.activeQuestionId && !Q_BY_ID[saved.activeQuestionId]) {
    delete saved.activeQuestionId;
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
  const remap = (dict) =>
    dict ? Object.fromEntries(Object.entries(dict).map(([k, v]) => [map[k] || k, v])) : dict;
  saved.answers = remap(saved.answers);
  saved.skipped = remap(saved.skipped);
  if (map[saved.activeQuestionId]) saved.activeQuestionId = map[saved.activeQuestionId];
}

function app() {
  return {
    QUESTIONS,
    NODES,
    RC,
    OPT_ICONS: window.OPT_ICONS,
    STAGES,
    STAGE_LABELS,
    SYSTEM: window.DATA.system || {},

    answers: {},
    skipped: {},
    hwDates: { ...(window.DATA.hwDefaults || {}) },
    hwModels: {},
    activeQuestionId: MAIN_QUESTIONS[0].id,

    severityT,

    init() {
      const saved = loadSaved();
      if (saved) {
        if (saved.answers && typeof saved.answers === 'object') this.answers = saved.answers;
        if (saved.skipped && typeof saved.skipped === 'object') this.skipped = saved.skipped;
        if (saved.hwDates && typeof saved.hwDates === 'object') this.hwDates = saved.hwDates;
        if (saved.hwModels && typeof saved.hwModels === 'object') this.hwModels = saved.hwModels;
        if (Q_BY_ID[saved.activeQuestionId]) this.activeQuestionId = saved.activeQuestionId;
      }
      this.$watch('answers', () => this._persist());
      this.$watch('skipped', () => this._persist());
      this.$watch('hwDates', () => this._persist());
      this.$watch('hwModels', () => this._persist());
      this.$watch('activeQuestionId', () => this._persist());
    },

    _persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            answers: this.answers,
            skipped: this.skipped,
            hwDates: this.hwDates,
            hwModels: this.hwModels,
            activeQuestionId: this.activeQuestionId,
          })
        );
      } catch {}
    },

    hwModelLabel(rowId) {
      const row = DATES_Q?.rows.find((r) => r.id === rowId);
      return this.hwModels[rowId] ?? row?.model ?? '';
    },

    setHwModel(rowId, value) {
      this.hwModels = { ...this.hwModels, [rowId]: value };
    },

    isCompleted(qid) {
      return this.isAnswered(qid) || !!this.skipped[qid];
    },

    get hasAnswers() {
      return Object.keys(this.answers).length > 0 || Object.keys(this.skipped).length > 0;
    },

    get ranked() {
      const s = {};
      for (const id of ALL_IDS) s[id] = RC[id].baseline;
      for (const q of QUESTIONS) {
        const ans = this.answers[q.id];
        if (ans === undefined || ans === null) continue;
        TYPE_HANDLERS[q.type].score(q, ans, s);
      }
      let posTotal = 0;
      for (const id of ALL_IDS) posTotal += Math.max(0, s[id]);
      return ALL_IDS.map((id) => ({
        id,
        score: s[id],
        pct: posTotal > 0 ? (Math.max(0, s[id]) / posTotal) * 100 : 0,
      })).sort((a, b) => b.score - a.score);
    },

    get recommendations() {
      const t5 = this.ranked.slice(0, 5).map((r) => r.id);
      return QUESTIONS.filter((q) => !this.isCompleted(q.id))
        .map((q) => ({ q, D: TYPE_HANDLERS[q.type].discriminator(q, t5) }))
        .filter((r) => r.D > 0)
        .sort((a, b) => b.D - a.D)
        .slice(0, 5);
    },

    get mainProgress() {
      const total = MAIN_QUESTIONS.length;
      const done = MAIN_QUESTIONS.reduce((n, q) => n + (this.isCompleted(q.id) ? 1 : 0), 0);
      return { total, done, pct: total ? done / total : 0 };
    },

    get optionalSuggestions() {
      if (OPTIONAL_QUESTIONS.length === 0) return [];
      const { pct } = this.mainProgress;
      let stuck = pct >= 0.7;
      if (!stuck && pct >= 0.4) {
        const r = this.ranked;
        if (r.length >= 2 && r[0].pct - r[1].pct < 3) stuck = true;
      }
      if (!stuck) return [];
      return OPTIONAL_QUESTIONS.filter((q) => !this.isCompleted(q.id));
    },

    get stageProgress() {
      const out = {};
      for (const s of STAGES) {
        const qs = STAGE_QS[s];
        out[s] = {
          total: qs.length,
          answered: qs.reduce((n, q) => n + (this.isCompleted(q.id) ? 1 : 0), 0),
        };
      }
      return out;
    },

    stagePct(s) {
      const p = this.stageProgress[s];
      return p.total ? (p.answered / p.total) * 100 : 0;
    },

    get activeQuestion() {
      return Q_BY_ID[this.activeQuestionId];
    },
    get activeStage() {
      return this.activeQuestion?.stage ?? 1;
    },
    get flowQuestions() {
      return this.activeQuestion?.optional ? OPTIONAL_QUESTIONS : MAIN_QUESTIONS;
    },
    get isFirst() {
      return this.activeQuestionId === this.flowQuestions[0]?.id;
    },
    get isLast() {
      return this.activeQuestionId === this.flowQuestions[this.flowQuestions.length - 1]?.id;
    },
    stageLabelFor(q) {
      return q?.optional ? 'Optional' : STAGE_LABELS[q?.stage];
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
      const q = Q_BY_ID[qid];
      return TYPE_HANDLERS[q.type].isAnswered(q, a);
    },

    rowAns(rowId) {
      return this.activeAnswer?.[rowId] || 'no';
    },

    setAnswer(value, { advance = false } = {}) {
      const qid = this.activeQuestionId;
      const list = this.flowQuestions;
      withTransition(() => {
        this.answers = { ...this.answers, [qid]: value };
        if (advance) {
          const idx = list.findIndex((q) => q.id === qid);
          const next = list[idx + 1];
          if (next) this.activeQuestionId = next.id;
        }
      });
    },

    setMatrixCell(rowId, colId) {
      const prev = this.answers[this.activeQuestionId] || {};
      this.setAnswer({ ...prev, [rowId]: colId });
    },

    handleAnswer(i) {
      const qid = this.activeQuestionId;
      this.setAnswer(i);
      setTimeout(() => {
        if (this.activeQuestionId !== qid) return;
        this.moveBy(1);
      }, 600);
    },

    get hwRows() {
      return DATES_Q ? DATES_Q.rows : [];
    },

    get todayISO() {
      return new Date().toISOString().slice(0, 10);
    },

    hwDateLabel(rowId) {
      const d = parseDate(this.hwDates[rowId]);
      return d ? DATE_FMT.format(d) : 'not set';
    },

    hwBucketLabel(rowId) {
      if (!DATES_Q) return '';
      const idx = dateStepIndex(ageYears(this.hwDates[rowId]), DATES_Q.ageBuckets);
      return DATES_Q.stepLabels[idx] || '';
    },

    hwAgeYearsLabel(rowId) {
      const y = ageYears(this.hwDates[rowId]);
      return y === null ? '—' : `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}`;
    },

    _datesAnswer() {
      if (!DATES_Q) return {};
      return Object.fromEntries(
        DATES_Q.rows.map((row) => [
          row.id,
          dateStepIndex(ageYears(this.hwDates[row.id]), DATES_Q.ageBuckets),
        ])
      );
    },

    setHwDate(rowId, dateStr) {
      this.hwDates = { ...this.hwDates, [rowId]: dateStr };
      if (DATES_Q && this.answers[DATES_Q.id] !== undefined) {
        this.answers = { ...this.answers, [DATES_Q.id]: this._datesAnswer() };
      }
    },

    confirmDates() {
      this.setAnswer(this._datesAnswer(), { advance: true });
    },

    goToSysInfo() {
      const el = document.querySelector('[data-card="sysinfo"]');
      if (!el) return;
      el.open = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    moveBy(d, opts = {}) {
      const curId = this.activeQuestionId;
      const list = this.flowQuestions;
      const idx = list.findIndex((q) => q.id === curId);
      const next = list[Math.max(0, Math.min(list.length - 1, idx + d))];
      const skipping =
        d > 0 && opts.markComplete && this.activeStage === 2 && !this.isAnswered(curId);
      withTransition(() => {
        if (skipping) this.skipped = { ...this.skipped, [curId]: true };
        this.activeQuestionId = next.id;
      });
    },

    pickStage(s) {
      const qs = STAGE_QS[s] || [];
      const target = qs.find((q) => !this.isCompleted(q.id)) || qs[0];
      if (target)
        withTransition(() => {
          this.activeQuestionId = target.id;
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
        this.activeQuestionId = MAIN_QUESTIONS[0].id;
      });
    },

    rankPct(r) {
      return Math.round(r.pct);
    },
    barWidth(r) {
      return Math.min(r.pct * 6.25, 100) + '%';
    },

    renderDiagram() {
      return NODES.map((b) => {
        const act = this.isHighlighted(b.key) ? ' aria-current="true"' : '';
        return (
          `<g class="node-group"${act}>` +
          `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" class="node-box"/>` +
          `<image href="${b.image}" x="${b.iconX}" y="${b.iconY}" width="${NODE_ICON_SIZE}" height="${NODE_ICON_SIZE}" preserveAspectRatio="xMidYMid meet"/>` +
          `</g>`
        );
      }).join('');
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
