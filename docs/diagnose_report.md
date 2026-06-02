# Diagnostic questionnaire — analysis report

*29 fault modes · 18 questions deep.* How reliably the engine walks to the true failure mode, and where it struggles.

| | Score | |
|---|:--:|---|
| 🧭 Finds the right component | **28/29** | median 6 questions to lead & hold |
| 🎯 Locks the specific failure mode into top-3 | **29/29** | median 6, range 1–17 |
| 🥇 Lands it at #1 outright | **16/29** | |
| 🛡️ Survives a 1-in-5 user error | **18/29** | stays top-3 in ≥80% of noisy runs (median 84%) |

**Questions to lock a fault into the top-3** — median **6** · mean **7.2**

| Questions | Faults | |
|:--:|:--:|---|
| 1–4 | 7 | ██████ |
| 5–8 | 14 | ████████████ |
| 9–12 | 4 | ███ |
| 13–16 | 3 | ███ |
| 17–18 | 1 | █ |

## Per-fault diagnosis

Every fault's rank as the engine asks questions — the **clean** run over the median path under **1-in-5 user errors**.

Rank each step: ✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+.

The ● after each fault is its **recovery tier** — how robust it is to answer errors: 🟢 ≥80% of noisy runs still end top-3 · 🟡 50–79% · 🟠 30–49% · 🔴 <30% (the exact `recover` % follows). `lock` = questions to pin top-3 (clean→noisy) · `behind ⚠️` = a *different* component still outranking it at the end — a triage gap (same-family siblings in front are expected and not shown).

```
F1.5   🟡  62%  lock 11→11   App software error
  clean 🟩✅🟨🟨🟩🟩🟩🟩🟨🟧✅✅✅✅✅✅✅✅
  noisy 🟩✅🟨🟨🟩🟩🟩🟩🟨🟧🟩🟩🟩🟩🟩🟩🟩🟩
F1.8   🟡  56%  lock 12→13   App external fault
  clean 🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
  noisy 🟩🟩🟨🟩✅✅🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩
F2.1   🟡  78%  lock 8→8   Controller physical defect
  clean 🟥🟥✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅
  noisy 🟥🟥✅🟩🟨🟨🟨🟩🟩🟩✅✅✅✅✅✅✅✅
F2.5   🟡  52%  lock 16→15   Controller software error
  clean 🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟨🟨🟨🟨🟩🟩🟩
  noisy 🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟧🟧🟨🟨🟨🟨🟩
F2.6   🟢  82%  lock 14→14  behind ⚠️ F3.1.3   Controller settings
  clean 🟨✅🟧🟧🟧🟥🟥🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩
  noisy 🟨✅🟧🟧🟧🟥🟥🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩
F2.8   🟡  68%  lock 8→8   Controller external fault
  clean 🟥🟥🟧🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
  noisy 🟥🟥🟧🟩🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F3.1.1 🟢 100%  lock 2→2   Wiring zone conductor
  clean 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
F3.1.2 🟢  94%  lock 6→6   Wiring common wire
  clean 🟥🟥🟥🟥🟧✅✅🟩🟩🟩✅🟩🟩🟩🟩🟩🟩
  noisy 🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F3.1.3 🟢  98%  lock 6→6   Wiring splice
  clean 🟥🟧🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
  noisy 🟥🟧🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F3.4   🟢  94%  lock 6→6   Wiring install error
  clean 🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
  noisy 🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F4.1   🟢  84%  lock 6→6   Relay physical defect
  clean 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
F4.4   🔴  28%  lock 17→·  behind ⚠️ F5.1   Relay install error
  clean 🟥🟥🟥🟧🟥🟧🟨🟨🟧🟧🟨🟨🟨🟨🟨🟨🟩🟩
  noisy 🟥🟥🟥🟥🟥🟥🟧🟧🟧🟧🟧🟥🟧🟧🟧🟨🟨🟨
F5.1   🟢 100%  lock 3→3   Pump physical defect
  clean 🟧🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟧🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
F5.3   🟢  94%  lock 3→3   Pump suction-side obstruction
  clean ✅🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅
  noisy ✅🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F5.8   🟠  32%  lock 13→·   Pump external fault
  clean 🟥🟥🟩🟩🟩🟨🟩🟨🟨🟨🟨🟨🟩🟩
  noisy 🟥🟥🟩🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟧
F6.1   🟢  98%  lock 5→9   Main hose 32mm defect
  clean 🟥🟧🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
  noisy 🟥🟧🟨🟨🟩🟩🟩🟨🟩🟩🟩🟩🟩✅✅✅✅✅
F6.3   🟢  86%  lock 3→6   Main hose 32mm obstruction
  clean 🟧🟧✅✅✅✅✅✅✅🟩✅✅✅✅✅✅✅✅
  noisy 🟧🟧✅✅✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅
F7.1.1 🟢  94%  lock 5→7   Solenoid coil
  clean 🟥🟥🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟥🟥🟥🟥🟧🟩✅✅✅✅✅✅✅✅✅✅✅✅
F7.1.2 🟢  96%  lock 6→6   Valve diaphragm
  clean 🟥🟥🟨🟨🟧✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
  noisy 🟥🟥🟨🟨🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F7.1.3 🟢 100%  lock 5→5   Valve body / seat damage
  clean 🟥🟥🟧🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟥🟥🟧🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅
F7.3.1 🟢  84%  lock 6→7   Solenoid plunger stuck / port clog
  clean 🟥🟥🟥🟥🟨🟩🟩✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟥🟥🟥🟥🟥🟨🟩✅✅✅✅✅✅✅✅✅✅✅
F7.3.2 🟢  90%  lock 8→11   Diaphragm metering port / screen debris
  clean 🟥🟥🟥🟥🟥🟧🟧🟩🟩🟩🟩✅✅✅✅✅✅✅
  noisy 🟥🟥🟥🟥🟥🟧🟨🟨🟩🟨🟩🟩✅🟩✅✅✅🟩
F7.4   🟢 100%  lock 11→11   Valve install error
  clean 🟧🟩✅✅🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
  noisy 🟧🟩✅🟩🟨🟩🟩🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩
F8.1   🟢 100%  lock 7→7   Zone hose 25mm defect
  clean 🟥🟥🟧🟨🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅
  noisy 🟥🟥🟧🟧🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅
F8.3   🟢  80%  lock 7→8   Zone hose 25mm obstruction
  clean 🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
  noisy 🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅
F9.1.1 🟡  78%  lock 1→1   Head pressure regulator
  clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
  noisy 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅🟩🟩🟩
F9.1.2 🟡  72%  lock 1→1   Head gear-drive seized
  clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
  noisy 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F9.3   🟡  54%  lock 12→13   Head obstruction
  clean 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩
  noisy 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩
F9.4   🟡  76%  lock 1→1   Head install error
  clean ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
  noisy ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
```

> **F2.6** never gets its *component* to lead and hold — a different family stays on top (the one true triage gap).  
> Most error-fragile: F4.4 (28%), F5.8 (32%) — one wrong answer keeps them behind a rival failure mode. Everything 🟩 tracks its clean path under noise.

## Questions

What each question **did** (work = avg rank-gain for the true fault · 🟩 ≥1.0 strong · 🟨 helps · ⬜ idle · 🟥 hurts) beside what it **can do** — **scope** ▆ families it moves · **force** ● strongest push · **rule-out** ➖ exonerates / ➕ only adds · **shape** ▁▄█ one loud answer vs graded. Sorted by work.

| Q | Work | Asked | Scope | Force | Rule-out | Shape |
|---|:--:|:--:|:--|:--|:--:|:--|
| Q1 | 🟩 +5.9 | 100% | █████ 9 | ●●● hard | ➖ 44% | ▆▆▆ even |
| Q3 | 🟩 +2.2 | 100% | █████ 9 | ●●○ firm | ± 14% | ▆▆▆ even |
| Q16 | 🟩 +2.0 | 83% | ██··· 4 | ●●● hard | ➖ 37% | ▁▁█ decisive |
| Q2 | 🟩 +1.2 | 100% | ████· 7 | ●○○ nudge | ± 14% | ▁▄█ graded |
| Q10b | 🟩 +1.0 | 10% | ██··· 3 | ●○○ nudge | ➕ 0% | ▆▆▆ even |
| Q5 | 🟨 +1.0 | 100% | ████· 7 | ●●○ firm | ± 29% | ▁▄█ graded |
| Q4 | 🟨 +0.7 | 83% | █···· 2 | ●●● hard | ➖ 41% | ▆▆▆ even |
| Q11b | 🟨 +0.6 | 17% | ███·· 5 | ●○○ nudge | ➕ 0% | ▁▄█ graded |
| Q20 | 🟨 +0.5 | 69% | ██··· 4 | ●●● hard | ± 28% | ▆▆▆ even |
| Q25 | 🟨 +0.3 | 10% | ██··· 4 | ●●○ firm | ➖ 38% | ▁▁█ decisive |
| Q12b | 🟨 +0.3 | 34% | ██··· 4 | ●●● hard | ➖ 41% | ▆▆▆ even |
| Q11 | 🟨 +0.3 | 24% | ████· 8 | ●○○ nudge | ➕ 0% | ▁▁█ decisive |
| Q9 | 🟨 +0.3 | 38% | ████· 7 | ●○○ nudge | ± 23% | ▆▆▆ even |
| Q7 | 🟨 +0.2 | 59% | ██··· 4 | ●●○ firm | ➕ 0% | ▁▁█ decisive |
| Q18 | 🟨 +0.2 | 69% | ██··· 3 | ●●● hard | ± 12% | ▆▆▆ even |
| Q10 | 🟨 +0.2 | 17% | ███·· 6 | ●●○ firm | ➕ 0% | ▁▄█ graded |
| Q14 | 🟨 +0.1 | 72% | █···· 1 | ●●● hard | ± 15% | ▁▁█ decisive |
| Q13 | 🟨 +0.1 | 83% | ██··· 3 | ●●○ firm | ➖ 40% | ▁▁█ decisive |
| Q23 | ⬜ +0.0 | 79% | ██··· 4 | ●●○ firm | ± 11% | ▁▄█ graded |
| Q22 | ⬜ +0.0 | 72% | ███·· 6 | ●●○ firm | ➖ 44% | ▁▄█ graded |
| Q12 | ⬜ +0.0 | 97% | ███·· 6 | ●●○ firm | ➖ 60% | ▁▁█ decisive |
| Q21 | ⬜ +0.0 | 69% | █···· 1 | ●●● hard | ± 14% | ▁▄█ graded |
| Q2q | ⬜ +0.0 | 41% | ████· 8 | ●○○ nudge | ± 31% | ▆▆▆ even |
| Q24 | ⬜ +0.0 | 7% | ██··· 3 | ●●○ firm | ± 34% | ▁▁█ decisive |
| Q15 | 🟥 -0.1 | 52% | █···· 2 | ●●● hard | ± 34% | ▆▆▆ even |
| Q6 | 🟥 -0.1 | 86% | ██··· 4 | ●●○ firm | ± 14% | ▁▄█ graded |
| Q8 | 🟥 -0.1 | 100% | ████· 8 | ●○○ nudge | ➕ 0% | ▆▆▆ even |
| Q17 | 🟥 -0.1 | 24% | █···· 1 | ●○○ nudge | ➖ 50% | ▁▄█ graded |
| Q19 | 🟥 -0.2 | 52% | ██··· 4 | ●○○ nudge | ➖ 46% | ▁▄█ graded |

**Not pulling their weight**
- 🟥 *cost rank* — Q19, Q17, Q8, Q6, Q15: asked late (~pos 12), so a stray answer mostly reshuffles already-settled ties.
- ⬜ *idle* — Q21, Q23, Q24, Q12, Q22, Q2q: rarely separate the failure modes still live by then (redundant or too narrow).

_Q1 always goes first, so its work also credits unwinding the no-answer prior. Triage (high-scope) questions sit early; single-family confirmers come last — the intended broad-to-narrow funnel._
