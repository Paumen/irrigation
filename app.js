const ENGINE = window.createEngine(window.DATA, window.EFFORT);
const {
  CAUSES,
  QUESTIONS,
  MAIN_QUESTIONS,
  OPTIONAL_QUESTIONS,
  AGES_Q,
  Q_BY_ID,
  STAGES,
  STAGE_LABELS,
} = ENGINE;

const DATE_FMT = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short' });

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
    resetScope: 'all',
    resultsTab: 'causes',
    resultsTabIndex: { causes: 0, next: 1, equipment: 2 },

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
      this.$watch('activeQuestionId', () => this._persist());
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
      return ENGINE.isCompleted(qid, this.answers, this.skipped);
    },

    get hasAnswers() {
      return Object.keys(this.answers).length > 0 || Object.keys(this.skipped).length > 0;
    },

    get ranked() {
      return ENGINE.rank(this.answers);
    },

    get _disc() {
      return ENGINE.discriminators(this.answers, this.skipped);
    },

    relevancyLevel(qid) {
      return ENGINE.relevancyLevel(qid, this.answers, this.skipped);
    },

    get recommendations() {
      return ENGINE.recommendations(this.answers, this.skipped);
    },

    get stageProgress() {
      return ENGINE.stageProgress(this.answers, this.skipped);
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
      return ENGINE.isAnswered(qid, this.answers[qid]);
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
      const qid = this.activeQuestionId;
      const cur = this.answers[qid]?.[rowId];
      if (cur === colId) {
        this.clearAnswer(qid, rowId);
        return;
      }
      const prev = this.answers[qid] || {};
      this.setAnswer({ ...prev, [rowId]: colId });
    },

    handleAnswer(i) {
      const qid = this.activeQuestionId;
      if (this.activeAnswer === i) {
        this.clearAnswer(qid);
        return;
      }
      this.setAnswer(i);
      setTimeout(() => {
        if (this.activeQuestionId !== qid) return;
        this.moveBy(1);
      }, 600);
    },

    clearAnswer(qid, key) {
      withTransition(() => {
        if (key === undefined) {
          const { [qid]: _drop, ...rest } = this.answers;
          this.answers = rest;
        } else {
          const { [key]: _drop, ...rest } = this.answers[qid] || {};
          this.answers = { ...this.answers, [qid]: rest };
        }
        if (this.skipped[qid]) {
          const { [qid]: _s, ...sk } = this.skipped;
          this.skipped = sk;
        }
      });
    },

    resetStage(s) {
      const ids = new Set(ENGINE.STAGE_QS[s].map((q) => q.id));
      const drop = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => !ids.has(k)));
      withTransition(() => {
        this.answers = drop(this.answers);
        this.skipped = drop(this.skipped);
      });
    },

    openReset() {
      this.resetScope = 'all';
      this.$refs.reset.showModal();
    },

    applyReset() {
      if (this.resetScope === 'all') this.doReset();
      else this.resetStage(this.resetScope);
      this.$refs.reset.close();
    },

    get equipmentRows() {
      return AGES_Q ? AGES_Q.rows : [];
    },

    get todayISO() {
      return new Date().toISOString().slice(0, 10);
    },

    equipmentDateLabel(rowId) {
      const d = window.parseDate(this.equipmentDates[rowId]);
      return d ? DATE_FMT.format(d) : 'not set';
    },

    equipmentBucketLabel(rowId) {
      if (!AGES_Q) return '';
      const idx = window.ageStepIndex(window.ageYears(this.equipmentDates[rowId]), AGES_Q.ageBuckets);
      return AGES_Q.stepLabels[idx] || '';
    },

    equipmentAgeYearsLabel(rowId) {
      const y = window.ageYears(this.equipmentDates[rowId]);
      return y === null ? '—' : `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}`;
    },

    _agesAnswer() {
      if (!AGES_Q) return {};
      return Object.fromEntries(
        AGES_Q.rows.map((row) => [
          row.id,
          window.ageStepIndex(window.ageYears(this.equipmentDates[row.id]), AGES_Q.ageBuckets),
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
      this.resultsTab = 'equipment';
      const el = document.querySelector('[data-card="results"]');
      if (!el) return;
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
      const qs = ENGINE.STAGE_QS[s] || [];
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
