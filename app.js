const CAUSES = Object.fromEntries(window.DATA.causes.map((c) => [c.id, c]));
const ALL_IDS = Object.keys(CAUSES);

const CAUSE_CHILDREN = (() => {
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
    const kids = CAUSE_CHILDREN[k];
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
        effects: i === 0 ? {} : Object.fromEntries(causes.map((id) => [id, curve[i - 1] ?? 0])),
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
    } else if (next.type === 'ages') {
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

const AGES_Q = QUESTIONS.find((q) => q.type === 'ages') || null;

const Q_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

// Per-cause bonus added when a question touches a contending cause at all,
// regardless of how strong the effect is. Lets broad screening questions
// outscore narrow tests when many causes are still in play.
const BREADTH_WEIGHT = 1.5;

const TYPE_HANDLERS = {
  options: {
    score(q, ans, s) {
      const opt = q.options[ans];
      if (!opt) return;
      for (const [id, delta] of Object.entries(opt.effects)) {
        s[id] = (s[id] || 0) + delta;
      }
    },
    discriminator(q, ids) {
      let D = 0;
      let breadth = 0;
      for (const causeId of ids) {
        const deltas = q.options.map((o) => o.effects[causeId] || 0);
        const spread = Math.max(...deltas) - Math.min(...deltas);
        if (spread > 0) breadth++;
        D += spread;
      }
      return D + BREADTH_WEIGHT * breadth;
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
        for (const [id, delta] of Object.entries(row.effects)) {
          s[id] = (s[id] || 0) + delta * m;
        }
      }
    },
    discriminator(q, ids) {
      const mults = q.columns.map((c) => c.mult);
      const multSpread = Math.max(...mults) - Math.min(...mults);
      let D = 0;
      const affected = new Set();
      for (const row of q.rows) {
        for (const causeId of ids) {
          const e = Math.abs(row.effects[causeId] || 0);
          if (e > 0) {
            D += e * multSpread;
            affected.add(causeId);
          }
        }
      }
      return D + BREADTH_WEIGHT * affected.size;
    },
    isAnswered(_q, ans) {
      return Object.keys(ans).length > 0;
    },
  },
  ages: {
    score(q, ans, s) {
      for (const row of q.rows) {
        const idx = ans[row.id];
        if (idx === undefined || idx === null) continue;
        const step = row.steps[idx];
        if (!step) continue;
        for (const [id, delta] of Object.entries(step.effects)) {
          s[id] = (s[id] || 0) + delta;
        }
      }
    },
    discriminator(q, ids) {
      let D = 0;
      const affected = new Set();
      for (const row of q.rows) {
        for (const causeId of ids) {
          const deltas = row.steps.map((st) => st.effects[causeId] || 0);
          const spread = Math.max(...deltas) - Math.min(...deltas);
          if (spread > 0) {
            D += spread;
            affected.add(causeId);
          }
        }
      }
      return D + BREADTH_WEIGHT * affected.size;
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

function ageStepIndex(years, buckets) {
  if (years === null) return 0;
  for (let i = 0; i < buckets.length; i++) if (years < buckets[i]) return i + 1;
  return buckets.length + 1;
}

const STAGES = window.DATA.stages.map((s) => s.id);
const STAGE_LABELS = Object.fromEntries(window.DATA.stages.map((s) => [s.id, s.label]));
const STAGE_QS = Object.fromEntries(STAGES.map((s) => [s, QUESTIONS.filter((q) => q.stage === s)]));
const STORAGE_KEY = 'irrigation:v2';
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
  { key: 'rotor', x: 12, y: 170, image: 'media/rotor.png' },
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

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return null;
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

function app() {
  return {
    QUESTIONS,
    NODES,
    CAUSES,
    OPT_ICONS: window.OPT_ICONS,
    STAGES,
    STAGE_LABELS,
    SYSTEM: window.DATA.system || {},

    answers: {},
    skipped: {},
    equipmentDates: { ...(window.DATA.equipmentDefaults || {}) },
    equipmentModels: {},
    activeQuestionId: MAIN_QUESTIONS[0].id,

    severityT,

    init() {
      const saved = loadSaved();
      if (saved) {
        if (saved.answers && typeof saved.answers === 'object') this.answers = saved.answers;
        if (saved.skipped && typeof saved.skipped === 'object') this.skipped = saved.skipped;
        if (saved.equipmentDates && typeof saved.equipmentDates === 'object')
          this.equipmentDates = saved.equipmentDates;
        if (saved.equipmentModels && typeof saved.equipmentModels === 'object')
          this.equipmentModels = saved.equipmentModels;
        if (Q_BY_ID[saved.activeQuestionId]) this.activeQuestionId = saved.activeQuestionId;
      }
      this.$watch('answers', () => this._persist());
      this.$watch('skipped', () => this._persist());
      this.$watch('equipmentDates', () => this._persist());
      this.$watch('equipmentModels', () => this._persist());
      this.$watch('activeQuestionId', () => {
        this._persist();
        this._scrollPagerToActive();
      });
      this.$nextTick(() => this._scrollPagerToActive('auto'));
    },

    _scrollPagerToActive(behavior = 'smooth') {
      const pager = this.$refs.pager;
      if (!pager) return;
      const target = pager.querySelector(`[data-qid="${this.activeQuestionId}"]`);
      if (!target) return;
      const pagerRect = pager.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const delta = targetRect.left - pagerRect.left + targetRect.width / 2 - pagerRect.width / 2;
      if (Math.abs(delta) < 4) return;
      this._suppressPagerSync = true;
      pager.scrollBy({ left: delta, behavior });
      clearTimeout(this._pagerSyncTimer);
      this._pagerSyncTimer = setTimeout(() => {
        this._suppressPagerSync = false;
      }, 500);
    },

    syncActiveFromPager(event) {
      if (this._suppressPagerSync) return;
      const pager = event.currentTarget;
      const center = pager.scrollLeft + pager.clientWidth / 2;
      let best = null;
      let bestDist = Infinity;
      for (const el of pager.children) {
        if (!el.dataset || !el.dataset.qid) continue;
        const elCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(elCenter - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = el;
        }
      }
      if (best && best.dataset.qid !== this.activeQuestionId) {
        this._suppressPagerSync = true;
        this.activeQuestionId = best.dataset.qid;
        clearTimeout(this._pagerSyncTimer);
        this._pagerSyncTimer = setTimeout(() => {
          this._suppressPagerSync = false;
        }, 200);
      }
    },

    _persist() {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            answers: this.answers,
            skipped: this.skipped,
            equipmentDates: this.equipmentDates,
            equipmentModels: this.equipmentModels,
            activeQuestionId: this.activeQuestionId,
          })
        );
      } catch {}
    },

    equipmentModelLabel(rowId) {
      const row = AGES_Q?.rows.find((r) => r.id === rowId);
      return this.equipmentModels[rowId] ?? row?.model ?? '';
    },

    setEquipmentModel(rowId, value) {
      this.equipmentModels = { ...this.equipmentModels, [rowId]: value };
    },

    isCompleted(qid) {
      return this.isAnswered(qid) || !!this.skipped[qid];
    },

    get hasAnswers() {
      return Object.keys(this.answers).length > 0 || Object.keys(this.skipped).length > 0;
    },

    get ranked() {
      const s = {};
      for (const id of ALL_IDS) s[id] = CAUSES[id].baseline;
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

    // Causes still "in contention" — pct within a factor of the leader and
    // above an absolute floor. Wide & flat ranking → many causes; concentrated
    // ranking → only the leaders. Floor of 3 avoids degenerate single-cause
    // comparisons. This is what the discriminator scores against.
    get _contendingIds() {
      const ranked = this.ranked;
      if (ranked.length === 0) return [];
      const leader = ranked[0].pct;
      const cutoff = Math.max(2, leader * 0.3);
      const ids = ranked.filter((r) => r.pct >= cutoff).map((r) => r.id);
      return ids.length >= 3 ? ids : ranked.slice(0, 3).map((r) => r.id);
    },

    get _disc() {
      const ids = this._contendingIds;
      const map = {};
      let max = 0;
      for (const q of QUESTIONS) {
        if (this.isCompleted(q.id)) continue;
        const D = TYPE_HANDLERS[q.type].discriminator(q, ids);
        map[q.id] = D;
        if (D > max) max = D;
      }
      return { map, max };
    },

    relevancyLevel(qid) {
      const { map, max } = this._disc;
      const D = map[qid];
      if (D === undefined || D <= 0 || max <= 0) return null;
      const ratio = D / max;
      if (ratio >= 2 / 3) return 'high';
      if (ratio >= 1 / 3) return 'mid';
      return 'low';
    },

    get recommendations() {
      const { map } = this._disc;
      return Object.entries(map)
        .filter(([, D]) => D > 0)
        .map(([qid, D]) => ({ q: Q_BY_ID[qid], D }))
        .sort((a, b) => b.D - a.D);
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

    rowAns(qid, rowId) {
      return this.answers[qid]?.[rowId] || 'no';
    },

    setAnswer(value, { advance = false, qid = this.activeQuestionId } = {}) {
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

    setMatrixCell(qid, rowId, colId) {
      const prev = this.answers[qid] || {};
      this.setAnswer({ ...prev, [rowId]: colId }, { qid });
    },

    handleAnswer(qid, i) {
      this.setAnswer(i, { qid });
      setTimeout(() => {
        if (this.activeQuestionId !== qid) return;
        this.moveBy(1);
      }, 600);
    },

    get equipmentRows() {
      return AGES_Q ? AGES_Q.rows : [];
    },

    get todayISO() {
      return new Date().toISOString().slice(0, 10);
    },

    equipmentDateLabel(rowId) {
      const d = parseDate(this.equipmentDates[rowId]);
      return d ? DATE_FMT.format(d) : 'not set';
    },

    equipmentBucketLabel(rowId) {
      if (!AGES_Q) return '';
      const idx = ageStepIndex(ageYears(this.equipmentDates[rowId]), AGES_Q.ageBuckets);
      return AGES_Q.stepLabels[idx] || '';
    },

    equipmentAgeYearsLabel(rowId) {
      const y = ageYears(this.equipmentDates[rowId]);
      return y === null ? '—' : `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}`;
    },

    _agesAnswer() {
      if (!AGES_Q) return {};
      return Object.fromEntries(
        AGES_Q.rows.map((row) => [
          row.id,
          ageStepIndex(ageYears(this.equipmentDates[row.id]), AGES_Q.ageBuckets),
        ])
      );
    },

    setEquipmentDate(rowId, dateStr) {
      this.equipmentDates = { ...this.equipmentDates, [rowId]: dateStr };
      if (AGES_Q && this.answers[AGES_Q.id] !== undefined) {
        this.answers = { ...this.answers, [AGES_Q.id]: this._agesAnswer() };
      }
    },

    confirmAges() {
      this.setAnswer(this._agesAnswer(), { advance: true });
    },

    goToEquipment() {
      const el = document.querySelector('[data-card="equipment"]');
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

    renderMap() {
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
