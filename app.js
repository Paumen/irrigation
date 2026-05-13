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

const BOX_W = 110;
const BOX_H = 110;
const PIP_SIZE = 30;

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
    label: 'SPRINKLER',
    icons: ['mdi:sprinkler'],
    pips: ['R91', 'R92'],
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
  },
];

const CONN_PIPS = [
  { rcId: 'R51', x: 455, y: 265 },
  { rcId: 'R52', x: 490, y: 265 },
  { rcId: 'R61', x: 332, y: 155 },
  { rcId: 'R62', x: 362, y: 155 },
  { rcId: 'R63', x: 392, y: 155 },
  { rcId: 'R81', x: 183, y: 265 },
  { rcId: 'R82', x: 218, y: 265 },
];

const NODE_ICON_LAYOUT = {
  1: { size: 26, gap: 0 },
  2: { size: 24, gap: 30 },
  3: { size: 20, gap: 26 },
  4: { size: 18, gap: 24 },
};

const STAGE_LABELS = ['', 'Ages', 'Symptoms', 'Events', 'Tests'];

function severityT(pct) {
  return Math.max(0, Math.min(1, pct / 20));
}

function severityTFg(pct) {
  return Math.max(0, Math.min(1, (pct - 6.5) / 3));
}

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
    STAGES: [1, 2, 3, 4],
    STAGE_LABELS,

    answers: {},
    activeQuestionId: QUESTIONS[0].id,
    activeRC: null,
    recentRC: null,

    iconTransform,
    nodeIconCx,
    severityT,
    severityTFg,

    get scores() {
      const s = {};
      ALL_IDS.forEach((id) => {
        s[id] = RC[id].baseline;
      });
      QUESTIONS.forEach((q) => {
        const ans = this.answers[q.id];
        if (ans === undefined || ans === null) return;
        if (q.type === 'matrix') {
          const colMul = q.colMul;
          q.rows.forEach((row) => {
            const colId = ans[row.id] || 'no';
            const m = colMul[colId] || 0;
            if (m === 0) return;
            Object.entries(row.effects).forEach(([rc, delta]) => {
              s[rc] = (s[rc] || 0) + delta * m;
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

    get recommendations() {
      const t5 = this.ranked.slice(0, 5).map((r) => r.id);
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
        .slice(0, 3);
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
    get rankedRest() {
      return this.ranked.slice(4);
    },

    sevT(rcId) {
      return severityT(this.severityPct[rcId] || 0);
    },
    sevTFg(rcId) {
      return severityTFg(this.severityPct[rcId] || 0);
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
      if (q?.type === 'matrix') return Object.keys(a).length > 0;
      return true;
    },

    rowAns(rowId) {
      return this.activeAnswer?.[rowId] || 'no';
    },

    setMatrixCell(rowId, colId) {
      const qid = this.activeQuestionId;
      withTransition(() => {
        this.answers = {
          ...this.answers,
          [qid]: { ...(this.answers[qid] || {}), [rowId]: colId },
        };
      });
    },

    handleAnswer(i) {
      const cur = this.activeQuestionId;
      withTransition(() => {
        this.answers = { ...this.answers, [cur]: i };
        const idx = QUESTIONS.findIndex((q) => q.id === cur);
        if (idx >= 0 && idx < QUESTIONS.length - 1) {
          this.activeQuestionId = QUESTIONS[idx + 1].id;
        }
      });
    },

    moveBy(d) {
      const idx = QUESTIONS.findIndex((q) => q.id === this.activeQuestionId);
      const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + d))];
      withTransition(() => {
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
      let s = '';
      for (const b of NODES) {
        const pipsCount = b.pips.length;
        const groupW = pipsCount * PIP_SIZE;
        const groupX = b.x + (b.w - groupW) / 2;
        const fy = b.y + b.h - PIP_SIZE;

        const isHigh = highlights.includes(b.key);
        const nodeCls = isHigh ? 'node-group highlight' : 'node-group';
        s += `<g data-node="${b.key}" class="${nodeCls}">`;
        s += `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" class="node-box"/>`;

        const layout = nodeIconLayout(b.icons.length);
        const isFlipped = b.key === 'pump' || b.key === 'sp4';
        const iconSizeScale = b.key === 'pump' ? 0.65 : 1.0;
        for (let i = 0; i < b.icons.length; i++) {
          const name = b.icons[i];
          const iconCx = nodeIconCx(b, i, b.icons.length);
          const tr = iconTransform(name, iconCx, b.y + (BOX_H - PIP_SIZE) / 2, layout.size * iconSizeScale, isFlipped);
          s += `<g transform="${tr}"><path d="${ICONS[name].d}" fill="currentColor"/></g>`;
        }

        for (let i = 0; i < pipsCount; i++) {
          const rcId = b.pips[i];
          const cx = groupX + i * PIP_SIZE + PIP_SIZE / 2;
          const cy = fy + PIP_SIZE / 2;
          const tBg = this.sevT(rcId).toFixed(3);
          const tFg = this.sevTFg(rcId).toFixed(3);
          const isActive = this.activeRC === rcId;
          const justActive = this.recentRC === rcId;
          const gCls =
            (isActive ? 'pip-group active' : 'pip-group') + (justActive ? ' pip-pop' : '');
          const cls = isActive ? 'pip-background active' : 'pip-background';
          const style = `--sev-t:${tBg};--sev-t-fg:${tFg}`;
          s += `<g role="button" tabindex="0" class="${gCls}" style="${style}" data-rc="${rcId}" aria-label="Root cause ${rcId}: ${escapeAttr(RC[rcId].label)}">`;
          s += `<circle cx="${cx}" cy="${cy}" r="${PIP_SIZE / 2}" class="${cls}"/>`;
          s += `<text x="${cx}" y="${cy}" dy=".35em" text-anchor="middle" class="pip">${rcId.replace(/^R/, '')}</text>`;
          if (isActive) {
            s += `<circle cx="${cx}" cy="${cy}" r="${PIP_SIZE / 2 - 2}" class="node-active"/>`;
          }
          s += `</g>`;
        }
        s += `</g>`;
      }

      for (let i = 0; i < CONN_PIPS.length; i++) {
        const p = CONN_PIPS[i];
        const tBg = this.sevT(p.rcId).toFixed(3);
        const tFg = this.sevTFg(p.rcId).toFixed(3);
        const isActive = this.activeRC === p.rcId;
        const justActive = this.recentRC === p.rcId;
        const gCls =
          (isActive ? 'pip-group active' : 'pip-group') + (justActive ? ' pip-pop' : '');
        const cls = isActive
          ? 'pip-background pip-background--connector active'
          : 'pip-background pip-background--connector';
        const style = `--sev-t:${tBg};--sev-t-fg:${tFg}`;
        s += `<g role="button" tabindex="0" class="${gCls}" style="${style}" data-rc="${p.rcId}" aria-label="Root cause ${p.rcId}: ${escapeAttr(RC[p.rcId].label)}">`;
        s += `<circle cx="${p.x}" cy="${p.y}" r="${PIP_SIZE / 2}" class="${cls}"/>`;
        s += `<text x="${p.x}" y="${p.y}" dy=".35em" text-anchor="middle" class="pip">${p.rcId.replace(/^R/, '')}</text>`;
        if (isActive) {
          s += `<circle cx="${p.x}" cy="${p.y}" r="${PIP_SIZE / 2 - 2}" class="node-active"/>`;
        }
        s += `</g>`;
      }
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

document.addEventListener('alpine:init', () => Alpine.data('app', app));
