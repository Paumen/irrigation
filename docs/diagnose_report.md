# Diagnostic questionnaire — analysis report

*29 fault modes · 18 questions deep.* How reliably the engine walks to the true cause, and where it struggles.

| | Score | |
|---|:--:|---|
| 🧭 Finds the right component | **28/29** | median 6 questions to lead & hold |
| 🎯 Locks the sub-cause into top-3 | **29/29** | median 6, range 1–17 |
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

Each fault's rank as the engine asks questions — the **clean** run (top row) against the median path under **1-in-5 user errors** (bottom row). Sorted hardest-first.

Legend: ✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+ — top row clean · bottom row under errors (`·` = the error didn't change the rank). **Locks** = questions to pin the cause into the top-3, clean → under errors. **Blocked by** = the cause(s) still ahead when the walk ends (⚠️ = a *different* component, a triage gap).

| Fault | What | Locks | Recovers | Blocked by | clean · under errors |
|---|---|:--:|:--:|---|---|
| F4.4 | Relay install error | 17 → · | 🟥 28% | ⚠️ F4.1, F5.1 | 🟥🟥🟥🟧🟥🟧🟨🟨🟧🟧🟨🟨🟨🟨🟨🟨🟩🟩<br>···🟥·🟥🟧🟧··🟧🟥🟧🟧🟧·🟨🟨 |
| F5.8 | Pump external fault | 13 → · | 🟧 32% | F5.3, F5.1 | 🟥🟥🟩🟩🟩🟨🟩🟨🟨🟨🟨🟨🟩🟩<br>······🟨🟨🟨🟨🟨🟨🟨🟨 |
| F2.5 | Controller software error | 16 → 15 | 🟨 52% | F2.1 | 🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟨🟨🟨🟨🟩🟩🟩<br>·····🟥·🟥🟥🟥·🟧🟧·🟨🟨🟨🟩 |
| F9.3 | Head obstruction | 12 → 13 | 🟨 54% | F9.4, F9.1.1 | 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩<br>···········🟨🟨🟨🟨🟨🟨· |
| F1.8 | App external fault | 12 → 13 | 🟨 56% | F1.5 | 🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩<br>······🟩🟩🟨··🟨🟨🟨🟨🟨🟩🟩 |
| F1.5 | App software error | 11 → 11 | 🟨 62% | — | 🟩✅🟨🟨🟩🟩🟩🟩🟨🟧✅✅✅✅✅✅✅✅<br>·······🟩🟨·🟩🟩🟩🟩🟩🟩🟩🟩 |
| F2.8 | Controller external fault | 8 → 8 | 🟨 68% | F2.1 | 🟥🟥🟧🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩<br>·······🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩 |
| F9.1.2 | Head gear-drive seized | 1 → 1 | 🟨 72% | F9.1.1 | 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩<br>·················· |
| F9.4 | Head install error | 1 → 1 | 🟨 76% | — | ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅<br>·················· |
| F2.1 | Controller physical defect | 8 → 8 | 🟨 78% | — | 🟥🟥✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅<br>·······🟩·🟩········ |
| F9.1.1 | Head pressure regulator | 1 → 1 | 🟨 78% | — | 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅✅<br>···············🟩🟩🟩 |
| F8.3 | Zone hose 25mm obstruction | 7 → 8 | 🟩 80% | — | 🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩✅✅✅✅✅✅✅<br>···········🟩🟩🟩🟩🟩·· |
| F2.6 | Controller settings | 14 → 14 | 🟩 82% | ⚠️ F3.1.3 | 🟨✅🟧🟧🟧🟥🟥🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩<br>············🟨····· |
| F4.1 | Relay physical defect | 6 → 6 | 🟩 84% | — | 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅<br>·················· |
| F7.3.1 | Solenoid plunger stuck / port clog | 6 → 7 | 🟩 84% | — | 🟥🟥🟥🟥🟨🟩🟩✅✅✅✅✅✅✅✅✅✅✅<br>····🟥🟨············ |
| F6.3 | Main hose 32mm obstruction | 3 → 6 | 🟩 86% | — | 🟧🟧✅✅✅✅✅✅✅🟩✅✅✅✅✅✅✅✅<br>······🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩· |
| F7.3.2 | Diaphragm metering port / screen debris | 8 → 11 | 🟩 90% | — | 🟥🟥🟥🟥🟥🟧🟧🟩🟩🟩🟩✅✅✅✅✅✅✅<br>······🟨🟨·🟨·🟩·🟩···🟩 |
| F3.4 | Wiring install error | 6 → 6 | 🟩 94% | F3.1.1, F3.1.3 | 🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩<br>················· |
| F3.1.2 | Wiring common wire | 6 → 6 | 🟩 94% | F3.1.1 | 🟥🟥🟥🟥🟧✅✅🟩🟩🟩✅🟩🟩🟩🟩🟩🟩<br>····🟥🟩🟩🟩··🟩······ |
| F5.3 | Pump suction-side obstruction | 3 → 3 | 🟩 94% | — | ✅🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅<br>···············🟩🟩🟩 |
| F7.1.1 | Solenoid coil | 5 → 7 | 🟩 94% | — | 🟥🟥🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅✅✅<br>··🟥·🟧🟩············ |
| F7.1.2 | Valve diaphragm | 6 → 6 | 🟩 96% | F7.1.3 | 🟥🟥🟨🟨🟧✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩<br>·····🟩🟩·········· |
| F3.1.3 | Wiring splice | 6 → 6 | 🟩 98% | F3.1.1 | 🟥🟧🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩<br>················· |
| F6.1 | Main hose 32mm physical defect | 5 → 9 | 🟩 98% | — | 🟥🟧🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅<br>·······🟨···🟩🟩···· |
| F7.4 | Valve install error | 11 → 11 | 🟩 100% | F7.1.3 | 🟧🟩✅✅🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩<br>···🟩··🟩···🟩·🟩🟩··· |
| F3.1.1 | Wiring zone conductor | 2 → 2 | 🟩 100% | — | 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅<br>················ |
| F5.1 | Pump physical defect | 3 → 3 | 🟩 100% | — | 🟧🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅<br>··············· |
| F7.1.3 | Valve body / seat damage | 5 → 5 | 🟩 100% | — | 🟥🟥🟧🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅<br>·················· |
| F8.1 | Zone hose 25mm physical defect | 7 → 7 | 🟩 100% | — | 🟥🟥🟧🟨🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅<br>···🟧·············· |

> **F2.6** never gets its *component* to lead and hold — a different family stays on top (the one true triage gap).  
> Most error-fragile: F4.4 (28%), F5.8 (32%) — a single wrong answer keeps them behind a sibling. Everything marked 🟩 tracks its clean path under noise.

## Questions

What each question *did* across the 29 runs — **work** (avg rank-gain for the true fault: 🟩 ≥1.0 strong · 🟨 ≥0.1 helps · ⬜ idle · 🟥 hurts), **when** it tends to be asked, **asked** how often it comes up — beside what it *can* do structurally: **scope** (families it can move), **force** (strongest single push), **rule-out** (share of evidence that exonerates vs only adds), **shape** (one loud answer vs graded). Sorted by work.

_Q1 always goes first, so its work also credits unwinding the no-answer prior — read early-position work as partly triage, not pure discrimination._

| Q | Work | When | Asked | Scope | Force | Rule-out | Shape |
|---|:--:|:--:|:--:|---|:--:|:--:|:--:|
| Q1 | 🟩 +5.9 | 1 | 100% | █████ 9 | hard | rules-out 44% | even |
| Q3 | 🟩 +2.2 | 2 | 100% | █████ 9 | firm | mixed 14% | even |
| Q16 | 🟩 +2.0 | 7 | 83% | ██··· 4 | hard | rules-out 37% | decisive |
| Q2 | 🟩 +1.2 | 3 | 100% | ████· 7 | nudge | mixed 14% | graded |
| Q10b | 🟩 +1.0 | 17 | 10% | ██··· 3 | nudge | rules-in 0% | even |
| Q5 | 🟨 +1.0 | 5 | 100% | ████· 7 | firm | mixed 29% | graded |
| Q4 | 🟨 +0.7 | 9 | 83% | █···· 2 | hard | rules-out 41% | even |
| Q11b | 🟨 +0.6 | 15 | 17% | ███·· 5 | nudge | rules-in 0% | graded |
| Q20 | 🟨 +0.5 | 8 | 69% | ██··· 4 | hard | mixed 28% | even |
| Q25 | 🟨 +0.3 | 15 | 10% | ██··· 4 | firm | rules-out 38% | decisive |
| Q12b | 🟨 +0.3 | 12 | 34% | ██··· 4 | hard | rules-out 41% | even |
| Q11 | 🟨 +0.3 | 16 | 24% | ████· 8 | nudge | rules-in 0% | decisive |
| Q9 | 🟨 +0.3 | 12 | 38% | ████· 7 | nudge | mixed 23% | even |
| Q7 | 🟨 +0.2 | 13 | 59% | ██··· 4 | firm | rules-in 0% | decisive |
| Q18 | 🟨 +0.2 | 14 | 69% | ██··· 3 | hard | mixed 12% | even |
| Q10 | 🟨 +0.2 | 16 | 17% | ███·· 6 | firm | rules-in 0% | graded |
| Q14 | 🟨 +0.1 | 11 | 72% | █···· 1 | hard | mixed 15% | decisive |
| Q13 | 🟨 +0.1 | 14 | 83% | ██··· 3 | firm | rules-out 40% | decisive |
| Q23 | ⬜ +0.0 | 15 | 79% | ██··· 4 | firm | mixed 11% | graded |
| Q22 | ⬜ +0.0 | 7 | 72% | ███·· 6 | firm | rules-out 44% | graded |
| Q12 | ⬜ +0.0 | 9 | 97% | ███·· 6 | firm | rules-out 60% | decisive |
| Q21 | ⬜ +0.0 | 16 | 69% | █···· 1 | hard | mixed 14% | graded |
| Q2q | ⬜ +0.0 | 4 | 41% | ████· 8 | nudge | mixed 31% | even |
| Q24 | ⬜ +0.0 | 14 | 7% | ██··· 3 | firm | mixed 34% | decisive |
| Q15 | 🟥 -0.1 | 14 | 52% | █···· 2 | hard | mixed 34% | even |
| Q6 | 🟥 -0.1 | 9 | 86% | ██··· 4 | firm | mixed 14% | graded |
| Q8 | 🟥 -0.1 | 4 | 100% | ████· 8 | nudge | rules-in 0% | even |
| Q17 | 🟥 -0.1 | 17 | 24% | █···· 1 | nudge | rules-out 50% | graded |
| Q19 | 🟥 -0.2 | 14 | 52% | ██··· 4 | nudge | rules-out 46% | graded |

**Carrying their weight?**
- 🟥 *cost rank* — Q19, Q17, Q8, Q6, Q15: asked late (~pos 12), so a stray answer mostly reshuffles already-settled ties.
- ⬜ *idle* — Q21, Q23, Q24, Q12, Q22, Q2q: rarely separate the causes still live by then (redundant or too narrow).

Triage (high-scope) questions sit early and single-family confirmers come last — the intended broad-to-narrow funnel.
