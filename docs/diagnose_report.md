# Diagnostic questionnaire — analysis report

29 fault modes · 18 questions deep

```
Right component leads & holds  28/29   median 6 q
Sub-cause into top-3           29/29   median 6 q (range 1–17, 3 known misses)
Lands at #1 outright           16/29
Survives 1-in-5 user errors    18/29   stays top-3 ≥80% of trials (median 84%)
```

## Rank trajectory

One square per question asked — the true fault's rank after that answer: ✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+ · ⬜ skip (rank unchanged). **fam** / **top3** = answered questions until the right *component* leads and holds / the exact cause locks into the top-3. A run stops at 18 answers, or earlier when no question still separates the leaders.

```
fault  fam  top3  trajectory →
F1.5   11   11    🟩✅🟨🟨🟩🟩🟩🟩🟨🟧✅✅✅✅✅⬜✅⬜⬜⬜✅⬜✅
F1.8   12   12    🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩⬜⬜🟩⬜⬜🟩
F2.1   10   8     🟥🟥✅🟩⬜🟨🟨🟨🟩🟩✅✅✅⬜✅✅✅⬜✅✅⬜✅
F2.5   9    16    🟥🟥🟥🟥⬜🟥🟥🟥🟥⬜🟥🟥🟥🟨🟨⬜⬜🟨🟨🟩⬜🟩🟩
F2.6   —    14    🟨✅🟧🟧🟧🟥🟥🟧🟧🟨🟨🟨⬜🟨⬜🟩🟩🟩🟩🟩
F2.8   8    8     🟥🟥🟧🟩🟨⬜🟨🟨🟩⬜🟩🟩🟩🟩🟩⬜🟩⬜⬜🟩🟩🟩🟩
F3.1.1 2    2     🟨✅✅✅✅✅✅✅✅✅✅✅⬜✅⬜✅⬜⬜✅✅⬜
F3.1.2 6    6     🟥🟥🟥🟥⬜🟧✅✅🟩🟩🟩⬜✅🟩🟩⬜🟩🟩⬜⬜🟩🟩⬜
F3.1.3 2    6     🟥🟧🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩⬜🟩⬜⬜🟩🟩⬜🟩⬜🟩
F3.4   2    6     🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜🟩🟩⬜
F4.1   6    6     🟨🟨🟩🟨⬜🟨✅✅✅✅✅✅✅✅⬜✅⬜✅✅⬜✅✅
F4.4   6    17    🟥🟥🟥🟧🟥⬜🟧🟨🟨⬜⬜🟧🟧🟨🟨🟨⬜🟨⬜🟨🟨🟩🟩
F5.1   4    3     🟧🟨🟩✅✅✅✅✅⬜✅✅✅✅✅⬜✅⬜⬜✅⬜
F5.3   3    3     ✅🟧🟩🟩🟩🟩🟩🟩⬜🟩🟩🟩🟩🟩🟩🟩✅⬜⬜⬜✅✅
F5.8   1    13    🟥🟥🟩🟩🟩🟨🟩🟨🟨⬜🟨🟨⬜🟨🟩⬜⬜⬜🟩
F6.1   14   5     🟥🟧🟨🟨🟩🟩🟩⬜🟩🟩🟩🟩🟩🟩✅✅✅✅⬜⬜
F6.3   11   3     🟧🟧✅✅✅✅✅✅✅🟩✅⬜✅✅✅✅✅✅✅
F7.1.1 6    5     🟥🟥🟥🟥🟩✅✅✅✅✅✅⬜✅✅✅✅✅✅✅
F7.1.2 6    6     🟥🟥🟨🟨🟧✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜
F7.1.3 6    5     🟥🟥🟧🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅⬜⬜✅
F7.3.1 6    6     🟥🟥🟥🟥🟨🟩🟩✅✅✅✅✅⬜⬜✅✅✅✅✅⬜✅
F7.3.2 6    8     🟥🟥🟥🟥🟥🟧🟧🟩🟩🟩🟩✅✅⬜⬜✅✅✅✅✅
F7.4   7    11    🟧🟩✅✅🟨🟩✅🟩🟨🟨⬜🟩🟩⬜⬜🟩🟩🟩🟩🟩⬜
F8.1   8    7     🟥🟥🟧🟨🟥🟥🟩✅✅✅✅✅✅✅✅⬜⬜✅✅⬜✅
F8.3   8    7     🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩⬜✅✅✅✅⬜✅✅✅
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

What each question *did* across the 29 runs. **work** = mean rank gain for the true fault (🟩 ≥1.0 · 🟨 ≥0.1 · ⬜ idle · 🟥 hurts) · **when** = median position asked. _Q1 always leads, so its work partly credits unwinding the cold-start prior, not pure discrimination._

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

**Low-yield questions** — 🟥 _cost rank_ (land ~pos 12, after the ranking has settled): Q19, Q17, Q8, Q6, Q15 · ⬜ _≈ idle_ (redundant or too narrow): Q21, Q23, Q24, Q12, Q22, Q2q.

## Question character

A structural read from each question's effect weights (no simulation). **scope** = families it can move · **force** = strongest single push (hard ≥1.5 · firm ≥0.9 · else nudge) · **rule-out** = share of weight that *subtracts* to exonerate a cause · **shape** = how the weight spreads across answers (decisive = one loud answer · even = graded). Sorted broad-to-narrow.

```
q     scope       force   rule-out  shape
Q1     9  triage  hard    44%       even
Q3     9  triage  firm    14%       even
Q11    8  triage  nudge   0%        decisive
Q2q    8  triage  nudge   31%       even
Q8     8  triage  nudge   0%        even
Q5     7  triage  firm    29%       graded
Q2     7  triage  nudge   14%       graded
Q9     7  triage  nudge   23%       even
Q10    6  triage  firm    0%        graded
Q12    6  triage  firm    60%       decisive
Q22    6  triage  firm    44%       graded
Q11b   5  mid     nudge   0%        graded
Q12b   4  mid     hard    41%       even
Q16    4  mid     hard    37%       decisive
Q20    4  mid     hard    28%       even
Q6     4  mid     firm    14%       graded
Q7     4  mid     firm    0%        decisive
Q23    4  mid     firm    11%       graded
Q25    4  mid     firm    38%       decisive
Q19    4  mid     nudge   46%       graded
Q18    3  mid     hard    12%       even
Q13    3  mid     firm    40%       decisive
Q24    3  mid     firm    34%       decisive
Q10b   3  mid     nudge   0%        even
Q4     2  narrow  hard    41%       even
Q15    2  narrow  hard    34%       even
Q14    1  narrow  hard    15%       decisive
Q21    1  narrow  hard    14%       graded
Q17    1  narrow  nudge   50%       graded
```

High-scope questions triage across families and sit early in the funnel (Q1, Q3, Q2, Q2q, Q8, Q5 …); low-scope confirmers settle a single family and land last (Q4, Q14, Q15, Q21, Q17) — the intended broad-to-narrow shape.

_scope/force/shape are a question's **potential**; the scorecard's `work` is what it **delivered**. A high-force question that lands late (Q15, Q16, Q20) shows little work because the ranking has usually settled before it._

## Robustness to answer errors

Each fault re-run 50× with **1 answer in 5 wrong or mis-skipped**. This is the noise view of §Rank trajectory: *recover* = trials still ending in the top-3, *#1* = trials ending at #1, *lock* = questions to lock the top-3 (clean → noisy median; · = never under noise).

**18/29** faults stay top-3 ≥80% of the time (median 84%). Worst-first:

```
fault    recover    #1   lock
F4.4         28%    0%   17 → ·
F5.8         32%    0%   13 → ·
F2.5         52%   14%   16 → 15
F9.3         54%    4%   12 → 13
F1.8         56%    8%   12 → 13
F1.5         62%   28%   11 → 11
F2.8         68%   12%   8 → 8
F9.1.2       72%    0%   1 → 1
F9.4         76%   60%   1 → 1
F2.1         78%   54%   8 → 8
F9.1.1       78%   46%   1 → 1
F8.3         80%   54%   7 → 8
F2.6         82%   14%   14 → 14
F4.1         84%   70%   6 → 6
F7.3.1       84%   74%   6 → 7
F6.3         86%   52%   3 → 6
F7.3.2       90%   48%   8 → 11
F3.1.2       94%   10%   6 → 6
F3.4         94%    0%   6 → 6
F5.3         94%   46%   3 → 3
F7.1.1       94%   70%   5 → 7
F7.1.2       96%    4%   6 → 6
F3.1.3       98%   16%   6 → 6
F6.1         98%   96%   5 → 9
F3.1.1      100%   98%   2 → 2
F5.1        100%   98%   3 → 3
F7.1.3      100%   98%   5 → 5
F7.4        100%   20%   11 → 11
F8.1        100%   92%   7 → 7
```

**Where the errors bite** — noise median rank vs the clean path, for the faults whose path actually shifts (rank scale as above):

```
F4.4    clean 🟥🟥🟥🟧🟥🟧🟨🟨🟧🟧🟨🟨🟨🟨🟨🟨🟩🟩
        noise 🟥🟥🟥🟥🟥🟥🟧🟧🟧🟧🟧🟥🟧🟧🟧🟨🟨🟨
F5.8    clean 🟥🟥🟩🟩🟩🟨🟩🟨🟨🟨🟨🟨🟩🟩
        noise 🟥🟥🟩🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟧
F2.5    clean 🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟨🟨🟨🟨🟩🟩🟩
        noise 🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟧🟧🟨🟨🟨🟨🟩
F9.3    clean 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩
        noise 🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩
F1.8    clean 🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
        noise 🟩🟩🟨🟩✅✅🟩🟩🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩
F1.5    clean 🟩✅🟨🟨🟩🟩🟩🟩🟨🟧✅✅✅✅✅✅✅✅
        noise 🟩✅🟨🟨🟩🟩🟩🟩🟨🟧🟩🟩🟩🟩🟩🟩🟩🟩
F2.8    clean 🟥🟥🟧🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
        noise 🟥🟥🟧🟩🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F2.1    clean 🟥🟥✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅
        noise 🟥🟥✅🟩🟨🟨🟨🟩🟩🟩✅✅✅✅✅✅✅✅
F9.1.1  clean 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
        noise 🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅🟩🟩🟩
F8.3    clean 🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
        noise 🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅
F7.3.1  clean 🟥🟥🟥🟥🟨🟩🟩✅✅✅✅✅✅✅✅✅✅✅
        noise 🟥🟥🟥🟥🟥🟨🟩✅✅✅✅✅✅✅✅✅✅✅
F6.3    clean 🟧🟧✅✅✅✅✅✅✅🟩✅✅✅✅✅✅✅✅
        noise 🟧🟧✅✅✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅
F7.3.2  clean 🟥🟥🟥🟥🟥🟧🟧🟩🟩🟩🟩✅✅✅✅✅✅✅
        noise 🟥🟥🟥🟥🟥🟧🟨🟨🟩🟨🟩🟩✅🟩✅✅✅🟩
F3.1.2  clean 🟥🟥🟥🟥🟧✅✅🟩🟩🟩✅🟩🟩🟩🟩🟩🟩
        noise 🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F5.3    clean ✅🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅
        noise ✅🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F7.1.1  clean 🟥🟥🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅✅✅
        noise 🟥🟥🟥🟥🟧🟩✅✅✅✅✅✅✅✅✅✅✅✅
F7.1.2  clean 🟥🟥🟨🟨🟧✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
        noise 🟥🟥🟨🟨🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F6.1    clean 🟥🟧🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
        noise 🟥🟧🟨🟨🟩🟩🟩🟨🟩🟩🟩🟩🟩✅✅✅✅✅
F7.4    clean 🟧🟩✅✅🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
        noise 🟧🟩✅🟩🟨🟩🟩🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩
F8.1    clean 🟥🟥🟧🟨🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅
        noise 🟥🟥🟧🟧🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅
```

_The remaining 9 track their clean path under noise: F2.6, F3.1.1, F3.1.3, F3.4, F4.1, F5.1, F7.1.3, F9.1.2, F9.4._

_The hardest cases (F4.4, F5.8, F2.5, F9.3) most often end outside the top-3 — one wrong answer is enough to keep them behind a sibling; the rest re-converge._
