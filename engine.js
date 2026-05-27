(function (global) {
  'use strict';

  const BREADTH_WEIGHT = 1.0;
  const MATRIX_EXPECTED_FILLED = 1;
  const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

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

  function createEngine(DATA) {
    const EFFORT_WEIGHT = typeof DATA.effortWeight === 'number' ? DATA.effortWeight : 0;
    function effortTerm(q) {
      return typeof q.effort === 'number' ? q.effort * EFFORT_WEIGHT : 0;
    }
    const CAUSES = Object.fromEntries(DATA.causes.map((c) => [c.id, c]));
    const ALL_IDS = Object.keys(CAUSES);

    const CAUSE_CHILDREN = (() => {
      const m = {};
      for (const c of DATA.causes) (m[c.parent] ||= []).push(c.id);
      return m;
    })();

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
      const curves = DATA.sliderCurves || {};
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

    const QUESTIONS = DATA.questions
      .map((q) => {
        const baseType = q.type || (q.multiselect ? 'multi' : 'options');
        const next = { ...q, type: baseType };
        if (next.type === 'matrix') {
          next.colMul = Object.fromEntries(next.columns.map((c) => [c.id, c.mult]));
          next.rows = next.rows.map((r) => ({ ...r, effects: expandEffects(r.effects) }));
        } else if (next.type === 'ages') {
          next.rows = expandStepRows(next).map((r) => ({
            ...r,
            steps: r.steps.map((s) => ({ ...s, effects: expandEffects(s.effects) })),
          }));
        } else {
          // 'options' and 'multi' share the same option shape
          next.options = next.options.map((o) => ({ ...o, effects: expandEffects(o.effects) }));
        }
        return next;
      })
      .sort((a, b) => (a.stage ?? Infinity) - (b.stage ?? Infinity));

    const MAIN_QUESTIONS = QUESTIONS.filter((q) => !q.optional);
    const OPTIONAL_QUESTIONS = QUESTIONS.filter((q) => q.optional);
    const AGES_Q = QUESTIONS.find((q) => q.type === 'ages') || null;
    const Q_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

    const TYPE_HANDLERS = {
      options: {
        score(q, ans, s) {
          const opt = q.options[ans];
          if (!opt) return;
          for (const [id, delta] of Object.entries(opt.effects)) {
            s[id] = (s[id] || 0) + delta;
          }
        },
        causeTerms(q, ids) {
          let isolation = 0;
          let breadth = 0;
          for (const causeId of ids) {
            const deltas = q.options.map((o) => o.effects[causeId] || 0);
            const spread = Math.max(...deltas) - Math.min(...deltas);
            if (spread > 0) breadth++;
            isolation += spread;
          }
          return { isolation, breadth: BREADTH_WEIGHT * breadth };
        },
        isAnswered() {
          return true;
        },
      },
      multi: {
        score(q, ans, s) {
          if (!Array.isArray(ans)) return;
          for (const i of ans) {
            const opt = q.options[i];
            if (!opt) continue;
            for (const [id, delta] of Object.entries(opt.effects)) {
              s[id] = (s[id] || 0) + delta;
            }
          }
        },
        // Multiselect isolation = sum of |effects| across options (max subset
        // sum minus min subset sum = sum of positives + |sum of negatives|).
        causeTerms(q, ids) {
          let isolation = 0;
          let breadth = 0;
          for (const causeId of ids) {
            let sumAbs = 0;
            for (const opt of q.options) sumAbs += Math.abs(opt.effects[causeId] || 0);
            if (sumAbs > 0) breadth++;
            isolation += sumAbs;
          }
          return { isolation, breadth: BREADTH_WEIGHT * breadth };
        },
        isAnswered(_q, ans) {
          return Array.isArray(ans) && ans.length > 0;
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
        causeTerms(q, ids) {
          const mults = q.columns.map((c) => c.mult);
          const multSpread = Math.max(...mults) - Math.min(...mults);
          const p = q.rows.length > 0 ? MATRIX_EXPECTED_FILLED / q.rows.length : 0;
          let isolation = 0;
          const rowsAffecting = {};
          for (const row of q.rows) {
            for (const causeId of ids) {
              const e = Math.abs(row.effects[causeId] || 0);
              if (e > 0) {
                isolation += e * multSpread * p;
                rowsAffecting[causeId] = (rowsAffecting[causeId] || 0) + 1;
              }
            }
          }
          let breadth = 0;
          for (const k of Object.values(rowsAffecting)) {
            breadth += 1 - Math.pow(1 - p, k);
          }
          return { isolation, breadth: BREADTH_WEIGHT * breadth };
        },
        isAnswered(_q, ans) {
          return !!ans && typeof ans === 'object';
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
        causeTerms(q, ids) {
          let isolation = 0;
          const affected = new Set();
          for (const row of q.rows) {
            for (const causeId of ids) {
              const deltas = row.steps.map((st) => st.effects[causeId] || 0);
              const spread = Math.max(...deltas) - Math.min(...deltas);
              if (spread > 0) {
                isolation += spread;
                affected.add(causeId);
              }
            }
          }
          return { isolation, breadth: BREADTH_WEIGHT * affected.size };
        },
        isAnswered(_q, ans) {
          return !!ans && typeof ans === 'object';
        },
      },
    };

    const STAGES = DATA.stages.map((s) => s.id);
    const STAGE_LABELS = Object.fromEntries(DATA.stages.map((s) => [s.id, s.label]));
    const STAGE_QS = Object.fromEntries(
      STAGES.map((s) => [s, QUESTIONS.filter((q) => q.stage === s)])
    );

    function isAnswered(qid, ans) {
      if (ans === undefined || ans === null) return false;
      const q = Q_BY_ID[qid];
      if (!q) return false;
      return TYPE_HANDLERS[q.type].isAnswered(q, ans);
    }

    function isCompleted(qid, answers, skipped) {
      return isAnswered(qid, answers && answers[qid]) || !!(skipped && skipped[qid]);
    }

    function rank(answers) {
      const s = {};
      for (const id of ALL_IDS) s[id] = CAUSES[id].baseline;
      for (const q of QUESTIONS) {
        const ans = answers && answers[q.id];
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
    }

    function contendingIds(answers) {
      const ranked = rank(answers);
      if (ranked.length === 0) return [];
      const leader = ranked[0].pct;
      const cutoff = Math.max(2, leader * 0.3);
      const ids = ranked.filter((r) => r.pct >= cutoff).map((r) => r.id);
      return ids.length >= 3 ? ids : ranked.slice(0, 3).map((r) => r.id);
    }

    function requiresMet(q, answers) {
      if (!q.requires) return true;
      for (const [depQid, allowed] of Object.entries(q.requires)) {
        const ans = answers && answers[depQid];
        if (typeof ans !== 'number') return false;
        if (!allowed.includes(ans)) return false;
      }
      return true;
    }

    function discriminators(answers, skipped) {
      const ids = contendingIds(answers);
      const map = {};
      let max = 0;
      for (const q of QUESTIONS) {
        if (isCompleted(q.id, answers, skipped)) continue;
        if (!requiresMet(q, answers)) continue;
        const { isolation, breadth } = TYPE_HANDLERS[q.type].causeTerms(q, ids);
        // Gate: only surface a question that actually discriminates a contending
        // cause. Without this, the constant effort term keeps every unanswered
        // question on the list, so a cheap-but-irrelevant question can outrank a
        // costly one that is the only thing bearing on the remaining causes.
        if (isolation + breadth <= 0) continue;
        const D = isolation + breadth + effortTerm(q);
        map[q.id] = D;
        if (D > max) max = D;
      }
      return { map, max };
    }

    function recommendations(answers, skipped) {
      const { map } = discriminators(answers, skipped);
      return Object.entries(map)
        .filter(([, D]) => D > 0)
        .map(([qid, D]) => ({ q: Q_BY_ID[qid], D }))
        .sort((a, b) => b.D - a.D);
    }

    function relevancyLevel(qid, answers, skipped) {
      const { map, max } = discriminators(answers, skipped);
      const D = map[qid];
      if (D === undefined || D <= 0 || max <= 0) return null;
      const ratio = D / max;
      if (ratio >= 2 / 3) return 'high';
      if (ratio >= 1 / 3) return 'mid';
      return 'low';
    }

    function stageProgress(answers, skipped) {
      const out = {};
      for (const s of STAGES) {
        const qs = STAGE_QS[s];
        out[s] = {
          total: qs.length,
          answered: qs.reduce((n, q) => n + (isCompleted(q.id, answers, skipped) ? 1 : 0), 0),
        };
      }
      return out;
    }

    return {
      CAUSES,
      ALL_IDS,
      QUESTIONS,
      MAIN_QUESTIONS,
      OPTIONAL_QUESTIONS,
      AGES_Q,
      Q_BY_ID,
      STAGES,
      STAGE_LABELS,
      STAGE_QS,
      TYPE_HANDLERS,
      isAnswered,
      isCompleted,
      rank,
      contendingIds,
      discriminators,
      recommendations,
      relevancyLevel,
      stageProgress,
    };
  }

  global.createEngine = createEngine;
  global.parseDate = parseDate;
  global.ageYears = ageYears;
  global.ageStepIndex = ageStepIndex;
})(typeof window !== 'undefined' ? window : globalThis);
