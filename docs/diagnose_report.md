# Diagnostic questionnaire — analysis report

29 fault modes · 18 questions deep

```
Finds the right component        29/29   median 6 questions to lead & hold
Locks the sub-cause into top-3   29/29   median 6, range 1–16 (3 documented misses)
Lands it at #1 outright          16/29
Recovers from a wrong answer     22/29   ≥80% of the time under 1-in-5 random answers (median 86%)
```

## Rank trajectory

One square per question the engine *asks*: the true fault's rank after an answer — ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟧 #7–9 · 🟥 #10+ — or ⬜ when this fault's profile leaves it unanswered (a skip; rank unchanged). **fam** / **top3** count *answered* questions: until the right *component* leads (#1) and stays / until the exact cause locks into the top-3.

A run ends at 18 answers, or when no remaining question separates the contending causes (the engine's done signal) — whichever comes first.

```
fault  fam  top3  trajectory →
F1.5   11   11    🟩✅🟨🟨🟩🟩🟩🟩🟨🟨✅✅✅✅✅⬜✅⬜⬜⬜✅⬜⬜⬜⬜
F1.8   12   12    🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩⬜⬜🟩⬜⬜⬜⬜🟩
F2.1   10   8     🟧🟧✅🟩⬜🟨🟨🟨🟩🟩✅✅✅⬜✅✅✅⬜✅✅⬜✅
F2.5   9    16    🟥🟥🟥🟥⬜🟥🟥🟥🟧⬜🟧🟧🟧🟨🟨⬜⬜🟨🟨🟩⬜🟩⬜⬜⬜⬜
F2.6   18   14    🟨✅🟧🟧🟨🟧🟧🟧🟧🟨🟨🟨⬜🟨⬜🟩🟩🟩🟩⬜⬜✅
F2.8   8    8     🟥🟥🟨🟩🟨⬜🟨🟨🟩⬜🟩🟩🟩🟩🟩⬜🟩⬜⬜🟩🟩⬜⬜⬜🟩⬜
F3.1.1 2    2     🟨✅✅✅✅✅✅✅✅✅✅✅⬜✅⬜✅⬜⬜⬜✅⬜
F3.1.2 6    6     🟥🟥🟥🟥⬜🟧✅✅🟩🟩🟩⬜✅🟩🟩⬜🟩🟩⬜⬜⬜🟩⬜
F3.1.3 2    6     🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩⬜🟩⬜⬜🟩⬜⬜🟩⬜🟩
F3.4   2    6     🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜🟩⬜
F4.1   6    6     🟨🟨🟩🟨⬜🟨✅✅✅✅✅✅✅✅⬜✅⬜✅✅⬜✅✅
F4.4   6    15    🟥🟥🟧🟧🟧⬜🟨🟨🟨⬜⬜🟧🟧🟨🟨🟨⬜🟨⬜⬜🟩🟩⬜⬜🟩⬜
F5.1   4    3     🟨🟨🟩✅⬜✅✅✅⬜✅✅✅✅✅⬜⬜⬜⬜⬜⬜
F5.3   3    3     ✅🟨🟩🟩⬜🟩🟩🟩⬜🟩🟩🟩🟩🟩⬜⬜✅⬜⬜⬜✅✅✅⬜
F5.8   1    11    🟥🟧🟩🟩🟨🟩⬜⬜🟨🟨🟨🟨⬜⬜🟩⬜⬜⬜⬜
F6.1   13   5     🟧🟧🟨🟨🟩🟩🟩⬜🟩🟩🟩🟩🟩✅✅✅✅⬜⬜⬜
F6.3   11   3     🟧🟨✅✅✅✅✅✅✅🟩✅⬜✅✅✅⬜✅⬜✅⬜⬜✅✅
F7.1.1 6    5     🟥🟥🟧🟧🟩✅⬜✅✅✅⬜⬜✅✅✅✅✅✅⬜⬜⬜⬜⬜⬜✅✅
F7.1.2 6    6     🟥🟧🟨🟨🟨✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜
F7.1.3 6    5     🟥🟧🟨🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅⬜⬜✅
F7.3.1 6    6     🟥🟥🟧🟥🟨🟩⬜✅✅✅⬜✅⬜⬜✅✅⬜✅✅⬜✅⬜⬜⬜✅
F7.3.2 6    10    🟥🟥🟥🟥🟥🟨⬜🟨🟨🟨⬜⬜✅✅⬜⬜✅✅✅✅✅✅✅
F7.4   7    11    🟧🟩✅✅🟨🟩✅🟩🟨🟨⬜⬜⬜🟩⬜🟩🟩🟩🟩🟩⬜
F8.1   8    7     🟥🟥🟧🟨🟧🟧🟩✅✅✅✅⬜✅✅⬜⬜✅✅⬜✅✅✅
F8.3   8    7     🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩⬜⬜🟩⬜🟩🟩⬜🟩🟩🟩🟩⬜⬜⬜🟩
F9.1.1 1    1     🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅⬜⬜✅✅⬜✅✅✅⬜✅
F9.1.2 1    1     🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜🟩⬜⬜🟩⬜🟩
F9.3   1    12    🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨⬜⬜🟩🟩⬜🟩🟩🟩🟩⬜🟩
F9.4   1    1     ✅✅✅✅✅✅✅✅✅✅✅⬜⬜✅✅⬜✅✅✅✅⬜✅
```

## Family confusion

Only the **1** faults that miss the top-3 need attention; the other 12 reach the top-3 with the true cause at #2–3. (`#n` = where the true fault ends · `←` = who outranks it.)

🟥 **Cross-family** — a *different* component wins (triage gap):
```
F4.4    #3  ←  F5.1   (+ sibling F4.1)
```

🟦 **Within-family, still top-3** — true cause at #2–3, a sibling merely leads · 12: F1.8, F2.5, F2.8, F3.1.2, F3.1.3, F3.4, F5.8, F7.1.2, F7.4, F8.3, F9.1.2, F9.3

## Lock-in speed

Questions needed to lock a fault into the top-3 and hold it (🟩 fast → 🟥 slow · ⬛ never). median **6** · mean **7.1**.

```
🟩    1–4 ██████ 7
🟨    5–8 ████████████ 13
🟧   9–12 ██████ 6
🟥  13–16 ███ 3
🟥  17–18  0
⬛  never  0
```

## Question scorecard

What each question *did* across the 29 runs. **work** = average rank-improvement it gives the true fault (+ = toward #1; the median is 0 for most, since rank rarely moves on a single step) — 🟩 ≥1.0 strong · 🟨 ≥0.1 helps · ⬜ idle · 🟥 hurts. **when** = median position. _Caveat: Q1 always goes first, so its work also credits unwinding the no-answer prior (an a-priori-unlikely fault jumps a long way on Q1); read early-position work as partly triage, not pure discrimination._

```
   q    asked              when  work
🟩 Q1   100% █████████        1  +5.9
🟩 Q3   100% █████████        2  +2.2
🟩 Q16   90% ████████         7  +1.8
🟩 Q2   100% █████████        3  +1.2
🟩 Q10b  10% █               15  +1.0
🟨 Q5   100% █████████        5  +1.0
🟨 Q18   17% ██              13  +0.8
🟨 Q4    79% ███████          9  +0.7
🟨 Q11b  17% ██              15  +0.6
🟨 Q12b  34% ███             12  +0.4
🟨 Q20   83% ███████         10  +0.4
🟨 Q25   10% █               12  +0.3
🟨 Q11   24% ██              14  +0.3
🟨 Q9    38% ███             11  +0.3
🟨 Q7    69% ██████          14  +0.2
🟨 Q10   24% ██              15  +0.1
🟨 Q14   79% ███████         11  +0.1
🟨 Q13   90% ████████        13  +0.1
⬜ Q22   52% █████            8  +0.0
⬜ Q12   97% █████████        8  +0.0
⬜ Q15   55% █████           14  +0.0
⬜ Q21   69% ██████          16  +0.0
⬜ Q2q   41% ████             4  +0.0
⬜ Q23    7% █               10  +0.0
⬜ Q24    7% █               14  +0.0
🟥 Q17   28% ██              15  -0.1
🟥 Q8   100% █████████        4  -0.1
🟥 Q19   69% ██████          14  -0.1
🟥 Q6    86% ████████         9  -0.2
```

**Questions that don't pull their weight**
- 🟥 _cost rank on average_ — Q6, Q19, Q8, Q17: asked ~pos 11, after the ranking has usually settled, so a stray answer here mostly reshuffles ties the wrong way.
- ⬜ _≈ no movement_ — Q21, Q24, Q15, Q23, Q22, Q12, Q2q: their answer rarely separates the causes still live at that point (redundant with earlier questions, or too narrow to matter).

## Question character

A structural read of each question from its effect weights (no simulation). **scope** = families it can move · **force** = strongest single push (hard ≥1.5 · firm ≥0.9 · nudge else) · **rule-out** = share of evidence that *subtracts* to exonerate a cause vs only adds · **shape** = how its weight spreads across answers (decisive = one loud answer · even = graded across all).

Bars scale each axis for scanning (more filled = broader / harder / more rule-out / more decisive).

```
q        scope      force   rule-out       shape
Q1     █████ 9 █████ hard  ████· 44%  ····· even
Q3     █████ 9 ███·· firm  █···· 14%  █···· even
Q11    ████· 8 ██··· nudge   ····· 0% ███·· decisive
Q2q    ████· 8 ██··· nudge  ███·· 31%  █···· even
Q8     ████· 8 █···· nudge   ····· 0%  ····· even
Q5     ████· 7 ███·· firm  ███·· 29% ██··· graded
Q2     ████· 7 ██··· nudge  █···· 14% ██··· graded
Q9     ████· 7 █···· nudge  ██··· 23%  ····· even
Q10    ███·· 6 ███·· firm   ····· 0% ██··· graded
Q12    ███·· 6 ███·· firm  █████ 60% █████ decisive
Q22    ███·· 6 ███·· firm  ████· 39% ██··· decisive
Q11b   ███·· 5 ██··· nudge   ····· 0% █···· graded
Q12b   ██··· 4 █████ hard  ████· 41%  █···· even
Q16    ██··· 4 █████ hard  ████· 37% ███·· decisive
Q20    ██··· 4 █████ hard  ███·· 28%  ····· even
Q6     ██··· 4 ███·· firm  █···· 14% █···· graded
Q7     ██··· 4 ███·· firm   ····· 0% ███·· decisive
Q23    ██··· 4 ███·· firm   ····· 0% ██··· graded
Q25    ██··· 4 ███·· firm  ████· 38% ██··· decisive
Q19    ██··· 4 ██··· nudge  █████ 46% ██··· graded
Q18    ██··· 3 █████ hard   ····· 0% █···· graded
Q13    ██··· 3 ███·· firm  ████· 40% ████· decisive
Q24    ██··· 3 ███·· firm  ███·· 34% ███·· decisive
Q10b   ██··· 3 ██··· nudge   ····· 0%  █···· even
Q4     █···· 2 █████ hard  ████· 41%  ····· even
Q15    █···· 2 █████ hard  ███·· 34%  ····· even
Q14    █···· 1 █████ hard  ██··· 15% ███·· decisive
Q21    █···· 1 █████ hard  █···· 14% █···· graded
Q17    █···· 1 ██··· nudge  █████ 50% ██··· graded
```

Several independent axes — examples, not an exhaustive taxonomy:
- **scope** — triage across families (≥6): Q1, Q3, Q2, Q2q, Q8, Q5, Q12, Q22 …; narrows within one (≤2): Q4, Q14, Q15, Q17, Q21
- **force** — pushes hard (±1.5+): Q1, Q12b, Q14, Q15, Q16, Q18, Q20, Q21 …; only nudges (≤±0.6): Q17, Q19, Q2, Q2q, Q8, Q9
- **direction** — pure rule-in / only adds: Q10, Q10b, Q11, Q11b, Q18, Q23, Q7, Q8; also punishes / rules-out (≥35%): Q12, Q17, Q19, Q1, Q4, Q12b, Q13, Q22 …
- **shape** — decisive, one loud answer (≥55%): Q12, Q13, Q16, Q11, Q24, Q14, Q7, Q22 …; even / graded across answers (≤40%): Q1, Q10b, Q12b, Q15, Q20, Q2q, Q3, Q4 …

Triage questions sit early in the funnel and the single-family confirmers come last — the intended broad-to-narrow shape.

_Note: scope/force/shape describe a question's **potential**; the scorecard's `work` is what it **actually** delivered in the sims. A high-force question that lands late (e.g. Q15, Q16, Q20) shows little work simply because the ranking has usually settled before it._

## Robustness to answer errors

Each fault's **clean** rank path vs its path under **1 in 5** random answers — the **noise** row is the median rank at each answered step over 50 trials (same scale: ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟧 #7–9 · 🟥 #10+). The header gives how often the noisy run still ends in the top-3 / at #1, and the lock-in clean→noisy.

**22/29** faults recover to the top-3 ≥80% of the time (median recovery 86%). Sorted worst-first.

```
🟧 F4.4    top-3  30%  #1   0%  lock 15→·
   clean 🟥🟥🟧🟧🟧🟨🟨🟨🟧🟧🟨🟨🟨🟨🟩🟩🟩
   noise 🟥🟥🟧🟧🟧🟨🟨🟨🟧🟧🟧🟧🟧🟨🟨🟨🟨
🟨 F5.8    top-3  54%  #1   0%  lock 11→11
   clean 🟥🟧🟩🟩🟨🟩🟨🟨🟨🟨🟩
   noise 🟥🟧🟩🟩🟨🟨🟨🟨🟨🟨🟨
🟨 F2.8    top-3  60%  #1   4%  lock 8→8
   clean 🟥🟥🟨🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟥🟨🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟨 F2.5    top-3  62%  #1   8%  lock 16→16
   clean 🟥🟥🟥🟥🟥🟥🟥🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩
   noise 🟥🟥🟥🟥🟥🟥🟥🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩
🟨 F9.1.2  top-3  68%  #1   0%  lock 1→1
   clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟨 F9.3    top-3  68%  #1   0%  lock 12→15
   clean 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩
   noise 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩
🟨 F9.4    top-3  74%  #1  64%  lock 1→1
   clean ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F1.8    top-3  80%  #1   6%  lock 12→14
   clean 🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
   noise 🟩🟩🟨🟩✅✅🟩🟩🟨🟨🟨🟨🟨🟩🟨🟩🟩🟩
🟩 F9.1.1  top-3  80%  #1  62%  lock 1→1
   clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
   noise 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅
🟩 F1.5    top-3  82%  #1  42%  lock 11→11
   clean 🟩✅🟨🟨🟩🟩🟩🟩🟨🟨✅✅✅✅✅✅✅
   noise 🟩✅🟨🟨🟩🟩🟩🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
🟩 F2.6    top-3  82%  #1  26%  lock 14→14
   clean 🟨✅🟧🟧🟨🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩✅
   noise 🟨✅🟧🟧🟨🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩
🟩 F7.3.2  top-3  84%  #1  52%  lock 10→10
   clean 🟥🟥🟥🟥🟥🟨🟨🟨🟨✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟥🟥🟥🟨🟨🟨🟨✅✅✅✅✅✅✅✅✅
🟩 F2.1    top-3  86%  #1  62%  lock 8→8
   clean 🟧🟧✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅
   noise 🟧🟧✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅
🟩 F6.3    top-3  86%  #1  72%  lock 3→10
   clean 🟧🟨✅✅✅✅✅✅✅🟩✅✅✅✅✅✅✅✅
   noise 🟧🟨✅✅✅✅🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
🟩 F8.3    top-3  86%  #1   6%  lock 7→9
   clean 🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F7.1.1  top-3  88%  #1  76%  lock 5→6
   clean 🟥🟥🟧🟧🟩✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟧🟥🟧✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F7.4    top-3  90%  #1  12%  lock 11→11
   clean 🟧🟩✅✅🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩
   noise 🟧🟩✅🟩🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F3.4    top-3  92%  #1   0%  lock 6→6
   clean 🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F4.1    top-3  94%  #1  72%  lock 6→6
   clean 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F7.3.1  top-3  94%  #1  86%  lock 6→6
   clean 🟥🟥🟧🟥🟨🟩✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟧🟥🟨🟩✅✅✅✅✅✅✅✅✅✅✅
🟩 F3.1.2  top-3  98%  #1  18%  lock 6→6
   clean 🟥🟥🟥🟥🟧✅✅🟩🟩🟩✅🟩🟩🟩🟩🟩
   noise 🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F5.3    top-3  98%  #1  72%  lock 3→3
   clean ✅🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
   noise ✅🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅
🟩 F7.1.2  top-3  98%  #1   4%  lock 6→6
   clean 🟥🟧🟨🟨🟨✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟧🟨🟨🟨🟩✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F8.1    top-3  98%  #1  90%  lock 7→7
   clean 🟥🟥🟧🟨🟧🟧🟩✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩✅✅✅✅✅✅✅✅
🟩 F3.1.1  top-3 100%  #1  96%  lock 2→2
   clean 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F3.1.3  top-3 100%  #1  26%  lock 6→6
   clean 🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F5.1    top-3 100%  #1 100%  lock 3→3
   clean 🟨🟨🟩✅✅✅✅✅✅✅✅✅
   noise 🟨🟨🟩✅✅✅✅✅✅✅✅✅
🟩 F6.1    top-3 100%  #1  94%  lock 5→10
   clean 🟧🟧🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
   noise 🟧🟧🟨🟨🟨🟩🟨🟨🟨🟩🟩🟩✅✅✅✅✅✅
🟩 F7.1.3  top-3 100%  #1 100%  lock 5→6
   clean 🟥🟧🟨🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟧🟨🟥🟨🟩🟩✅✅✅✅✅✅✅✅✅✅✅
```

_Read the **noise** row against **clean**: robust faults (🟩) track their clean path and end green; the degeneracies (F7.3.2 / F4.4 / F7.4 / F2.5) stay orange/red throughout — a single wrong answer is enough to keep them behind a sibling._
