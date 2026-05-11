const RC = Object.fromEntries(window.DATA.causes.map((c) => [c.id, c]));
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

const QUESTIONS = window.DATA.questions.map((q) => {
  if (q.type === 'matrix') {
    return {
      ...q,
      colMul: Object.fromEntries(q.columns.map((c) => [c.id, c.mult])),
      rows: q.rows.map((r) => ({ ...r, effects: eff(r.effects || {}) })),
    };
  }
  return {
    ...q,
    options: q.options.map((o) => ({ ...o, effects: eff(o.effects || {}) })),
  };
});

const BOX_W = 130;
const BOX_H = 72;
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
    pips: ['R11', 'R12', 'R13'],
  },
  {
    key: 'ctrl',
    x: 202,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'CONTROLLER',
    icons: ['mdi:view-gallery-outline'],
    pips: ['R22', 'R23'],
  },
  {
    key: 'relay',
    x: 368,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'RELAY',
    icons: ['mdi:electric-switch'],
    pips: ['R31'],
  },
  {
    key: 'pump',
    x: 534,
    y: 20,
    w: BOX_W,
    h: BOX_H,
    label: 'PUMP',
    icons: ['mdi:water-pump', 'mdi:water-well'],
    pips: ['R41', 'R42'],
  },
  {
    key: 'valves',
    x: 285,
    y: 170,
    w: BOX_W,
    h: BOX_H,
    label: 'VALVES',
    icons: ['ms:valve', 'ms:valve', 'ms:valve', 'ms:valve'],
    pips: ['R71', 'R72', 'R73', 'R74'],
  },
  {
    key: 'sp1',
    x: 20,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler', 'ms:sprinkler', 'ms:sprinkler'],
    pips: ['R91', 'R92'],
  },
  {
    key: 'sp2',
    x: 200,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler', 'mdi:sprinkler'],
    pips: ['R91', 'R92'],
  },
  {
    key: 'sp3',
    x: 380,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler', 'mdi:sprinkler'],
    pips: ['R91', 'R92'],
  },
  {
    key: 'sp4',
    x: 560,
    y: 340,
    w: BOX_W,
    h: BOX_H,
    label: 'SPRINKLER',
    icons: ['ms:sprinkler', 'ms:sprinkler', 'ms:sprinkler'],
    pips: ['R91', 'R92'],
  },
];

const CONN_PIPS = [
  { rcId: 'R51', x: 487, y: 145 },
  { rcId: 'R52', x: 461, y: 145 },
  { rcId: 'R61', x: 241, y: 145 },
  { rcId: 'R62', x: 267, y: 145 },
  { rcId: 'R63', x: 293, y: 145 },
  { rcId: 'R81', x: 180, y: 290 },
  { rcId: 'R82', x: 206, y: 290 },
  { rcId: 'R81', x: 286, y: 305 },
  { rcId: 'R82', x: 312, y: 305 },
  { rcId: 'R81', x: 393, y: 305 },
  { rcId: 'R82', x: 419, y: 305 },
  { rcId: 'R81', x: 500, y: 290 },
  { rcId: 'R82', x: 526, y: 290 },
];

const NODE_ICON_LAYOUT = {
  1: { size: 26, gap: 0 },
  2: { size: 24, gap: 30 },
  3: { size: 20, gap: 26 },
  4: { size: 18, gap: 24 },
};

const STAGE_LABELS = ['', 'Ages', 'Symptoms', 'Events', 'Tests'];

function severityLevel(pct) {
  if (pct < 4) return 0;
  if (pct < 8) return 1;
  if (pct < 15) return 2;
  return 3;
}

function iconTransform(name, cx, cy, size) {
  const def = window.ICONS[name];
  if (!def) return '';
  const [minX, minY, vw, vh] = def.vb;
  const scale = size / Math.max(vw, vh);
  const tx = cx - (minX + vw / 2) * scale;
  const ty = cy - (minY + vh / 2) * scale;
  return `translate(${tx} ${ty}) scale(${scale})`;
}

function nodeIconLayout(n) {
  return NODE_ICON_LAYOUT[n] || NODE_ICON_LAYOUT[4];
}

function nodeIconCx(box, i, n) {
  const { gap } = nodeIconLayout(n);
  const cx = box.x + box.w / 2;
  const start = -((n - 1) / 2) * gap;
  return cx + start + i * gap;
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
    RC,
    ICONS: window.ICONS,
    FOOTER_TOP,
    STAGES: [1, 2, 3, 4],
    STAGE_LABELS,

    answers: {},
    activeQuestionId: QUESTIONS[0].id,
    activeRC: null,
    resetOpen: false,

    iconTransform,
    nodeIconCx,
    severityLevel,

    nodeIconSize(n) {
      return nodeIconLayout(n).size;
    },

    get scores() {
      const s = {};
      ALL_IDS.forEach((id) => {
        s[id] = RC[id].baseline;
      });
      QUESTIONS.forEach((q) => {
        const ans = this.answers[q.id];
        if (ans === undefined || ans === null) return;
        if (q.type === 'matrix') {
          const rowAns = ans.rows || {};
          const drained = ans.drained || {};
          const colMul = q.colMul;
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
    },

    get ranked() {
      const s = this.scores;
      const total = ALL_IDS.reduce((sum, id) => sum + Math.max(0, s[id]), 0);
      return ALL_IDS.map((id) => ({
        id,
        score: s[id],
        pct: total > 0 ? (Math.max(0, s[id]) / total) * 100 : 0,
      })).sort((a, b) => b.score - a.score);
    },

    get severityPct() {
      const m = {};
      this.ranked.forEach((r) => {
        m[r.id] = r.pct;
      });
      return m;
    },

    get top5() {
      return this.ranked.slice(0, 5).map((r) => r.id);
    },

    get recommendations() {
      const t5 = this.top5;
      const unanswered = QUESTIONS.filter((q) => !this.isAnswered(q.id));
      const scored = unanswered.map((q) => {
        let D = 0;
        if (q.type === 'matrix') {
          const mults = q.columns.map((c) => c.mult);
          const spread = Math.max(...mults) - Math.min(...mults);
          q.rows.forEach((row) => {
            t5.forEach((rcId) => {
              D += Math.abs(row.effects[rcId] || 0) * spread;
            });
          });
        } else {
          t5.forEach((rcId) => {
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
    },

    get stageProgress() {
      const sp = {
        1: { answered: 0, total: 0 },
        2: { answered: 0, total: 0 },
        3: { answered: 0, total: 0 },
        4: { answered: 0, total: 0 },
      };
      QUESTIONS.forEach((q) => {
        sp[q.stage].total++;
        if (this.isAnswered(q.id)) sp[q.stage].answered++;
      });
      return sp;
    },

    get activeQuestion() {
      return QUESTIONS.find((q) => q.id === this.activeQuestionId);
    },
    get activeIdx() {
      return QUESTIONS.findIndex((q) => q.id === this.activeQuestionId);
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
    get rankedTop() {
      return this.ranked.slice(0, 5);
    },
    get rankedRest() {
      return this.ranked.slice(5);
    },

    sev(rcId) {
      return severityLevel(this.severityPct[rcId] || 0);
    },

    isAnswered(qid) {
      const a = this.answers[qid];
      if (a === undefined || a === null) return false;
      const q = QUESTIONS.find((qq) => qq.id === qid);
      if (q?.type === 'matrix') return !!(a.rows && Object.keys(a.rows).length > 0);
      return true;
    },

    rowAns(rowId) {
      return this.activeAnswer?.rows?.[rowId] || 'no';
    },
    rowDrained(rowId) {
      return !!this.activeAnswer?.drained?.[rowId];
    },

    setMatrixCell(rowId, colId) {
      const qid = this.activeQuestionId;
      const prev = this.answers[qid] || { rows: {}, drained: {} };
      this.answers = {
        ...this.answers,
        [qid]: {
          ...prev,
          rows: { ...prev.rows, [rowId]: colId },
          drained: prev.drained || {},
        },
      };
    },

    setMatrixDrained(rowId, val) {
      const qid = this.activeQuestionId;
      const prev = this.answers[qid] || { rows: {}, drained: {} };
      this.answers = {
        ...this.answers,
        [qid]: {
          ...prev,
          rows: prev.rows || {},
          drained: { ...(prev.drained || {}), [rowId]: val },
        },
      };
    },

    handleAnswer(i) {
      const cur = this.activeQuestionId;
      this.answers = { ...this.answers, [cur]: i };
      setTimeout(() => {
        if (this.activeQuestionId !== cur) return;
        const idx = QUESTIONS.findIndex((q) => q.id === cur);
        if (idx >= 0 && idx < QUESTIONS.length - 1) {
          this.activeQuestionId = QUESTIONS[idx + 1].id;
        }
      }, 180);
    },

    moveBy(d) {
      const idx = QUESTIONS.findIndex((q) => q.id === this.activeQuestionId);
      const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + d))];
      this.activeQuestionId = next.id;
    },

    pickStage(s) {
      const first = QUESTIONS.find((q) => q.stage === s);
      if (first) this.activeQuestionId = first.id;
    },

    doReset() {
      this.answers = {};
      this.activeRC = null;
      this.activeQuestionId = QUESTIONS[0].id;
      this.resetOpen = false;
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
      let s = '';
      for (const b of NODES) {
        const cx = b.x + b.w / 2;
        const pipsCount = b.pips.length;
        const cw = pipsCount ? b.w / pipsCount : 0;
        const fy = b.y + FOOTER_TOP;
        const fh = b.h - FOOTER_TOP;

        s += `<g>`;
        s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" class="node-box"/>`;

        const layout = nodeIconLayout(b.icons.length);
        for (let i = 0; i < b.icons.length; i++) {
          const name = b.icons[i];
          const iconCx = nodeIconCx(b, i, b.icons.length);
          const tr = iconTransform(name, iconCx, b.y + 16, layout.size);
          s += `<g transform="${tr}"><path d="${ICONS[name].d}" fill="currentColor"/></g>`;
        }

        s += `<text x="${cx}" y="${b.y + 38}" text-anchor="middle" class="lbl">${escapeAttr(b.label)}</text>`;

        for (let i = 0; i < pipsCount; i++) {
          const rcId = b.pips[i];
          const px = b.x + i * cw;
          const sv = this.sev(rcId);
          const isActive = this.activeRC === rcId;
          const cls = isActive ? 'pip-fill active' : 'pip-fill';
          s += `<g role="button" tabindex="0" data-rc="${rcId}" aria-label="Root cause ${rcId}: ${escapeAttr(RC[rcId].label)}" data-sev="${sv}">`;
          s += `<rect x="${px}" y="${fy}" width="${cw}" height="${fh}" class="${cls}"/>`;
          s += `<text x="${px + cw / 2}" y="${fy + fh / 2 + 3.5}" text-anchor="middle" class="pip">${rcId}</text>`;
          if (isActive) {
            s += `<rect x="${px + 1.5}" y="${fy + 1.5}" width="${cw - 3}" height="${fh - 3}" class="node-active"/>`;
          }
          s += `</g>`;
        }

        if (pipsCount > 0) {
          s += `<line x1="${b.x}" y1="${fy}" x2="${b.x + b.w}" y2="${fy}" class="node-divider"/>`;
          for (let i = 1; i < pipsCount; i++) {
            const x = b.x + i * cw;
            s += `<line x1="${x}" y1="${fy}" x2="${x}" y2="${b.y + b.h}" class="node-divider"/>`;
          }
        }
        s += `</g>`;
      }

      for (let i = 0; i < CONN_PIPS.length; i++) {
        const p = CONN_PIPS[i];
        const sv = this.sev(p.rcId);
        const isActive = this.activeRC === p.rcId;
        const cls = isActive ? 'pip-fill connector active' : 'pip-fill connector';
        s += `<g role="button" tabindex="0" data-rc="${p.rcId}" aria-label="Root cause ${p.rcId}: ${escapeAttr(RC[p.rcId].label)}" data-sev="${sv}">`;
        s += `<rect x="${p.x - 13}" y="${p.y - 13}" width="26" height="26" rx="1.5" class="${cls}"/>`;
        s += `<text x="${p.x}" y="${p.y + 3.5}" text-anchor="middle" class="pip">${p.rcId}</text>`;
        s += `</g>`;
      }
      return s;
    },

    pipFromEvent(e) {
      const el = e.target.closest && e.target.closest('[data-rc]');
      if (el) this.activeRC = el.dataset.rc;
    },

    modalClick(e, ref) {
      if (e.target !== ref) return;
      const r = ref.getBoundingClientRect();
      const outside =
        e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (outside) this.resetOpen = false;
    },
  };
}

document.addEventListener('alpine:init', () => Alpine.data('app', app));
