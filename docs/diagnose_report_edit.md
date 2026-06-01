
# Diagnostic questionnaire — analysis report

29 fault modes · 18 questions deep

@@@ below is too verbose@@@
```
Finds the right component        28/29   median 6 questions to lead & hold
Locks the sub-cause into top-3   29/29   median 6, range 1–17 (3 documented misses)
Lands it at #1 outright          16/29
Recovers from a user error       18/29   ≥80% of the time under 1-in-5 errors (wrong answer / skip; median 84%)
```

## Rank trajectory

@@@ below is too verbose@@@
One square per question the engine *asks*: the true fault's rank after an answer — ✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+ — or ⬜ when this fault's profile leaves it unanswered (a skip; rank unchanged). **fam** / **top3** count *answered* questions: until the right *component* leads (#1) and stays / until the exact cause locks into the top-3.

A run ends at 18 answers, or when no remaining question separates the contending causes (the engine's done signal) — whichever comes first.

```
fault  fam  top3  trajectory →
F1.5   11   11    🟩✅🟨🟨🟩🟩🟩🟩🟨🟨✅✅✅✅✅⬜✅⬜⬜⬜✅⬜✅
F1.8   12   12    🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩⬜⬜🟩⬜⬜🟩
F2.1   10   8     🟧🟧✅🟩⬜🟨🟨🟨🟩🟩✅✅✅⬜✅✅✅⬜✅✅⬜✅
F2.5   9    16    🟥🟥🟥🟥⬜🟥🟥🟥🟧⬜🟧🟧🟧🟨🟨⬜⬜🟨🟨🟩⬜🟩🟩
F2.6   —    14    🟨✅🟧🟧🟨🟧🟧🟧🟧🟨🟨🟨⬜🟨⬜🟩🟩🟩🟩🟩
F2.8   8    8     🟥🟥🟨🟩🟨⬜🟨🟨🟩⬜🟩🟩🟩🟩🟩⬜🟩⬜⬜🟩🟩🟩🟩
F3.1.1 2    2     🟨✅✅✅✅✅✅✅✅✅✅✅⬜✅⬜✅⬜⬜✅✅⬜
F3.1.2 6    6     🟥🟥🟥🟥⬜🟧✅✅🟩🟩🟩⬜✅🟩🟩⬜🟩🟩⬜⬜🟩🟩⬜
F3.1.3 2    6     🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩⬜🟩⬜⬜🟩🟩⬜🟩⬜🟩
F3.4   2    6     🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜🟩🟩⬜
F4.1   6    6     🟨🟨🟩🟨⬜🟨✅✅✅✅✅✅✅✅⬜✅⬜✅✅⬜✅✅
F4.4   6    17    🟥🟥🟧🟧🟧⬜🟨🟨🟨⬜⬜🟧🟧🟨🟨🟨⬜🟨⬜🟨🟨🟩🟩
F5.1   4    3     🟨🟨🟩✅✅✅✅✅⬜✅✅✅✅✅⬜✅⬜⬜✅⬜
F5.3   3    3     ✅🟨🟩🟩🟩🟩🟩🟩⬜🟩🟩🟩🟩🟩🟩🟩✅⬜⬜⬜✅✅
F5.8   1    13    🟥🟧🟩🟩🟩🟨🟩🟨🟨⬜🟨🟨⬜🟨🟩⬜⬜⬜🟩
F6.1   14   5     🟧🟧🟨🟨🟩🟩🟩⬜🟩🟩🟩🟩🟩🟩✅✅✅✅⬜⬜
F6.3   11   3     🟧🟨✅✅✅✅✅✅✅🟩✅⬜✅✅✅✅✅✅✅
F7.1.1 6    5     🟥🟥🟧🟧🟩✅✅✅✅✅✅⬜✅✅✅✅✅✅✅
F7.1.2 6    6     🟥🟧🟨🟨🟨✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜
F7.1.3 6    5     🟥🟧🟨🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅⬜⬜✅
F7.3.1 6    6     🟥🟥🟧🟥🟨🟩🟩✅✅✅✅✅⬜⬜✅✅✅✅✅⬜✅
F7.3.2 6    8     🟥🟥🟥🟥🟥🟨🟨🟩🟩🟩🟩✅✅⬜⬜✅✅✅✅✅
F7.4   7    11    🟧🟩✅✅🟨🟩✅🟩🟨🟨⬜🟩🟩⬜⬜🟩🟩🟩🟩🟩⬜
F8.1   8    7     🟥🟥🟧🟨🟧🟧🟩✅✅✅✅✅✅✅✅⬜⬜✅✅⬜✅
F8.3   8    7     🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩🟩⬜✅✅✅✅⬜✅✅✅
F9.1.1 1    1     🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅⬜⬜✅✅✅✅✅✅
F9.1.2 1    1     🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜🟩🟩
F9.3   1    12    🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨⬜⬜🟩🟩🟩🟩🟩🟩🟩
F9.4   1    1     ✅✅✅✅✅✅✅✅✅✅✅⬜⬜✅✅✅✅✅✅✅
```

## Family confusion

Only the **1** faults that miss the top-3 need attention; the other 11 reach the top-3 with the true cause at #2–3. (`#n` = where the true fault ends · `←` = who outranks it.)

🟥 **Cross-family** — a *different* component wins (triage gap):
```
F4.4    #3  ←  F5.1   (+ sibling F4.1)
```

## Lock-in speed

Questions needed to lock a fault into the top-3 and hold it. median **6** · mean **7.2**.

```
01–04 ██████ 7
05–08 ████████████ 14
09–12 ███ 4
13–16 ███ 3
17–18 █ 1
never  0
```

## Question scorecard

@@@ below is too verbose@@@
What each question *did* across the 29 runs. **work** = average rank-improvement it gives the true fault (+ = toward #1; the median is 0 for most, since rank rarely moves on a single step) — 🟩 ≥1.0 strong · 🟨 ≥0.1 helps · ⬜ idle · 🟥 hurts. **when** = median position. _Caveat: Q1 always goes first, so its work also credits unwinding the no-answer prior (an a-priori-unlikely fault jumps a long way on Q1); read early-position work as partly triage, not pure discrimination._

```
   q    asked              when  work
🟩 Q1   100% █████████        1  +5.9
🟩 Q3   100% █████████        2  +2.2
🟩 Q16   83% ███████          7  +2.0
🟩 Q2   100% █████████        3  +1.2
🟩 Q10b  10% █               17  +1.0
🟨 Q5   100% █████████        5  +1.0
🟨 Q4    83% ███████          9  +0.7
🟨 Q11b  17% ██              15  +0.6
🟨 Q20   69% ██████           8  +0.5
🟨 Q25   10% █               15  +0.3
🟨 Q12b  34% ███             12  +0.3
🟨 Q11   24% ██              16  +0.3
🟨 Q9    38% ███             12  +0.3
🟨 Q7    59% █████           13  +0.2
🟨 Q18   69% ██████          14  +0.2
🟨 Q10   17% ██              16  +0.2
🟨 Q14   72% ███████         11  +0.1
🟨 Q13   83% ███████         14  +0.1
⬜ Q23   79% ███████         15  +0.0
⬜ Q22   72% ███████          7  +0.0
⬜ Q12   97% █████████        9  +0.0
⬜ Q21   69% ██████          16  +0.0
⬜ Q2q   41% ████             4  +0.0
⬜ Q24    7% █               14  +0.0
🟥 Q15   52% █████           14  -0.1
🟥 Q6    86% ████████         9  -0.1
🟥 Q8   100% █████████        4  -0.1
🟥 Q17   24% ██              17  -0.1
🟥 Q19   52% █████           14  -0.2
```

@@@ below is too verbose@@@
**Questions that don't pull their weight**
- 🟥 _cost rank on average_ — Q19, Q17, Q8, Q6, Q15: asked ~pos 12, after the ranking has usually settled, so a stray answer here mostly reshuffles ties the wrong way.
- ⬜ _≈ no movement_ — Q21, Q23, Q24, Q12, Q22, Q2q: their answer rarely separates the causes still live at that point (redundant with earlier questions, or too narrow to matter).

## Question character

@@@ below is too verbose@@@
A structural read of each question from its effect weights (no simulation). **scope** = families it can move · **force** = strongest single push (hard ≥1.5 · firm ≥0.9 · nudge else) · **rule-out** = share of evidence that *subtracts* to exonerate a cause vs only adds · **shape** = how its weight spreads across answers (decisive = one loud answer · even = graded across all).

Bars scale each axis for scanning (more filled = broader / harder / more rule-out / more decisive).

@@@ bars are not the right visual here below, at least not for all at once, it's too much bars to scan, try alternatives @@@
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
Q22    ███·· 6 ███·· firm  ████· 44% ██··· graded
Q11b   ███·· 5 ██··· nudge   ····· 0% █···· graded
Q12b   ██··· 4 █████ hard  ████· 41%  █···· even
Q16    ██··· 4 █████ hard  ████· 37% ███·· decisive
Q20    ██··· 4 █████ hard  ███·· 28%  ····· even
Q6     ██··· 4 ███·· firm  █···· 14% █···· graded
Q7     ██··· 4 ███·· firm   ····· 0% ███·· decisive
Q23    ██··· 4 ███·· firm  █···· 11% ██··· graded
Q25    ██··· 4 ███·· firm  ████· 38% ██··· decisive
Q19    ██··· 4 ██··· nudge  █████ 46% ██··· graded
Q18    ██··· 3 █████ hard  █···· 12%  █···· even
Q13    ██··· 3 ███·· firm  ████· 40% ████· decisive
Q24    ██··· 3 ███·· firm  ███·· 34% ███·· decisive
Q10b   ██··· 3 ██··· nudge   ····· 0%  █···· even
Q4     █···· 2 █████ hard  ████· 41%  ····· even
Q15    █···· 2 █████ hard  ███·· 34%  ····· even
Q14    █···· 1 █████ hard  ██··· 15% ███·· decisive
Q21    █···· 1 █████ hard  █···· 14% █···· graded
Q17    █···· 1 ██··· nudge  █████ 50% ██··· graded
```
@@@ below is too Verbose @@@
Several independent axes — examples, not an exhaustive taxonomy:
- **scope** — triage across families (≥6): Q1, Q3, Q2, Q2q, Q8, Q5, Q22, Q12 …; narrows within one (≤2): Q4, Q14, Q15, Q21, Q17
- **force** — pushes hard (±1.5+): Q1, Q12b, Q14, Q15, Q16, Q18, Q20, Q21 …; only nudges (≤±0.6): Q17, Q19, Q2, Q2q, Q8, Q9
- **direction** — pure rule-in / only adds: Q10, Q10b, Q11, Q11b, Q7, Q8; also punishes / rules-out (≥35%): Q12, Q17, Q19, Q22, Q1, Q4, Q12b, Q13 …
- **shape** — decisive, one loud answer (≥55%): Q12, Q13, Q16, Q11, Q24, Q14, Q7, Q25; even / graded across answers (≤40%): Q1, Q10b, Q12b, Q15, Q18, Q20, Q2q, Q3 …

Triage questions sit early in the funnel and the single-family confirmers come last — the intended broad-to-narrow shape.

_Note: scope/force/shape describe a question's **potential**; the scorecard's `work` is what it **actually** delivered in the sims. A high-force question that lands late (e.g. Q15, Q16, Q20) shows little work simply because the ranking has usually settled before it._

## Robustness to answer errors
@@@ below is too verbose@@@
Each fault's **clean** rank path vs its path under **1-in-5 user errors** — a wrong answer, or occasionally an accidental skip / a guessed answer where they'd normally skip — the **noise** row is the median rank at each answered step over 50 trials (same scale: ✅ #1 · 🟩 #2–3 · 🟨 #4–6 · 🟧 #7–9 · 🟥 #10+). The header gives how often the noisy run still ends in the top-3 / at #1, and the lock-in clean→noisy.

**18/29** faults recover to the top-3 ≥80% of the time (median recovery 84%). Sorted worst-first.

@@@ wjT are the squares before each F code trying to say, it's very confusing, some of the trajectory bars are identical, ye lock in front is yellow or orange. also how is it different except from the noise part from section earlier this report @@@
```
🟥 F4.4    top-3  28%  #1   0%  lock 17→·
   clean 🟥🟥🟧🟧🟧🟨🟨🟨🟧🟧🟨🟨🟨🟨🟨🟨🟩🟩
   noise 🟥🟥🟧🟧🟧🟧🟨🟨🟧🟧🟧🟧🟧🟨🟨🟨🟨🟨
🟧 F5.8    top-3  32%  #1   0%  lock 13→·
   clean 🟥🟧🟩🟩🟩🟨🟩🟨🟨🟨🟨🟨🟩🟩
   noise 🟥🟧🟩🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨
🟨 F2.5    top-3  52%  #1  14%  lock 16→15
   clean 🟥🟥🟥🟥🟥🟥🟥🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩
   noise 🟥🟥🟥🟥🟥🟥🟥🟧🟧🟥🟧🟨🟨🟨🟨🟨🟨🟩
🟨 F9.3    top-3  54%  #1   4%  lock 12→13
   clean 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩
   noise 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩
🟨 F1.8    top-3  56%  #1   8%  lock 12→13
   clean 🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
   noise 🟩🟩🟨🟩✅✅🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩
🟨 F1.5    top-3  62%  #1  28%  lock 11→11
   clean 🟩✅🟨🟨🟩🟩🟩🟩🟨🟨✅✅✅✅✅✅✅✅
   noise 🟩✅🟨🟨🟩🟩🟩🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩
🟨 F2.8    top-3  68%  #1  12%  lock 8→8
   clean 🟥🟥🟨🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟥🟨🟩🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟨 F9.1.2  top-3  72%  #1   0%  lock 1→1
   clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟨 F9.4    top-3  76%  #1  60%  lock 1→1
   clean ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
🟨 F2.1    top-3  78%  #1  54%  lock 8→8
   clean 🟧🟧✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅
   noise 🟧🟧✅🟩🟨🟨🟨🟩🟩🟩✅✅✅✅✅✅✅✅
🟨 F9.1.1  top-3  78%  #1  46%  lock 1→1
   clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
   noise 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅🟩🟩🟩
🟩 F8.3    top-3  80%  #1  54%  lock 7→8
   clean 🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
   noise 🟥🟥🟧🟨🟧🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅
🟩 F2.6    top-3  82%  #1  14%  lock 14→14
   clean 🟨✅🟧🟧🟨🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩
   noise 🟨✅🟧🟧🟨🟧🟧🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩
🟩 F4.1    top-3  84%  #1  70%  lock 6→6
   clean 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F7.3.1  top-3  84%  #1  74%  lock 6→7
   clean 🟥🟥🟧🟥🟨🟩🟩✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟧🟥🟧🟨🟩✅✅✅✅✅✅✅✅✅✅✅
🟩 F6.3    top-3  86%  #1  52%  lock 3→6
   clean 🟧🟨✅✅✅✅✅✅✅🟩✅✅✅✅✅✅✅✅
   noise 🟧🟨✅✅✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅
🟩 F7.3.2  top-3  90%  #1  48%  lock 8→11
   clean 🟥🟥🟥🟥🟥🟨🟨🟩🟩🟩🟩✅✅✅✅✅✅✅
   noise 🟥🟥🟥🟥🟥🟨🟨🟨🟩🟨🟩🟩✅🟩✅✅✅🟩
🟩 F3.1.2  top-3  94%  #1  10%  lock 6→6
   clean 🟥🟥🟥🟥🟧✅✅🟩🟩🟩✅🟩🟩🟩🟩🟩🟩
   noise 🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F3.4    top-3  94%  #1   0%  lock 6→6
   clean 🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟥🟥🟥🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F5.3    top-3  94%  #1  46%  lock 3→3
   clean ✅🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅
   noise ✅🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F7.1.1  top-3  94%  #1  70%  lock 5→7
   clean 🟥🟥🟧🟧🟩✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟥🟧🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F7.1.2  top-3  96%  #1   4%  lock 6→6
   clean 🟥🟧🟨🟨🟨✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟥🟧🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F3.1.3  top-3  98%  #1  16%  lock 6→6
   clean 🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
   noise 🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F6.1    top-3  98%  #1  96%  lock 5→9
   clean 🟧🟧🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
   noise 🟧🟧🟨🟨🟩🟩🟩🟨🟩🟩🟩🟩🟩✅✅✅✅✅
🟩 F3.1.1  top-3 100%  #1  98%  lock 2→2
   clean 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F5.1    top-3 100%  #1  98%  lock 3→3
   clean 🟨🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅
   noise 🟨🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
🟩 F7.1.3  top-3 100%  #1  98%  lock 5→5
   clean 🟥🟧🟨🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟧🟨🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅
🟩 F7.4    top-3 100%  #1  20%  lock 11→11
   clean 🟧🟩✅✅🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
   noise 🟧🟩✅🟩🟨🟩🟩🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩
🟩 F8.1    top-3 100%  #1  92%  lock 7→7
   clean 🟥🟥🟧🟨🟧🟧🟩✅✅✅✅✅✅✅✅✅✅✅
   noise 🟥🟥🟧🟨🟧🟧🟩✅✅✅✅✅✅✅✅✅✅✅
```

_Read the **noise** row against **clean**: robust faults (🟩) track their clean path and end green; the degeneracies (F7.3.2 / F4.4 / F7.4 / F2.5) stay orange/red throughout — a single wrong answer is enough to keep them behind a sibling._
