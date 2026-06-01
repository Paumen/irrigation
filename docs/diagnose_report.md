# Diagnostic questionnaire — analysis report

29 fault modes · 18 questions deep

```
Right component leads & holds  28/29   median 6 q
Sub-cause into top-3           29/29   median 6 q (range 1–17, 3 known misses)
Lands at #1 outright           16/29
Survives 1-in-5 user errors    18/29   stays top-3 ≥80% of trials (median 84%)
```

## Per-fault convergence

One row per fault. **ends** = clean final rank · **lock** = questions to lock the top-3 and hold (— = never) · **top-3 / #1** = share of 50 noisy runs (1-in-5 answers wrong/skipped) ending top-3 / at #1 · **confused by** = who outranks the true cause (⚠ = a different component, a triage gap). Worst-first.

```
fault    ends  lock  top-3    #1   confused by
F4.4       #3    17    28%    0%   F4.1, F5.1  ⚠
F5.8       #3    13    32%    0%   F5.3, F5.1
F2.5       #2    16    52%   14%   F2.1
F9.3       #3    12    54%    4%   F9.4, F9.1.1
F1.8       #2    12    56%    8%   F1.5
F1.5       #1    11    62%   28%
F2.8       #2     8    68%   12%   F2.1
F9.1.2     #2     1    72%    0%   F9.1.1
F9.4       #1     1    76%   60%
F2.1       #1     8    78%   54%
F9.1.1     #1     1    78%   46%
F8.3       #1     7    80%   54%
F2.6       #2    14    82%   14%
F4.1       #1     6    84%   70%
F7.3.1     #1     6    84%   74%
F6.3       #1     3    86%   52%
F7.3.2     #1     8    90%   48%
F3.4       #3     6    94%    0%   F3.1.1, F3.1.3
F3.1.2     #2     6    94%   10%   F3.1.1
F5.3       #1     3    94%   46%
F7.1.1     #1     5    94%   70%
F7.1.2     #2     6    96%    4%   F7.1.3
F3.1.3     #2     6    98%   16%   F3.1.1
F6.1       #1     5    98%   96%
F7.4       #2    11   100%   20%   F7.1.3
F3.1.1     #1     2   100%   98%
F5.1       #1     3   100%   98%
F7.1.3     #1     5   100%   98%
F8.1       #1     7   100%   92%
```

Lock-in: median **6**, mean **7.2** questions — 21/29 within 8, 4 need 13+.

**Fragile faults** (recover < 65%) — clean path vs the noise median, one square per answered question (✅ #1 · 🟩 #2–3 · 🟨 #4–5 · 🟧 #6–7 · 🟥 #8+):

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
```

## Per-question value

What each question delivered, next to its structural potential. **work** = mean rank gain for the true fault (🟩 ≥1.0 · 🟨 ≥0.1 · ⬜ idle · 🟥 hurts) · **when** = median position · **asked** = % of runs · **scope** = families it can move · **force** = strongest push · **rule** = weight spent exonerating · **shape** = decisive (one loud answer) vs even. Sorted by work.

```
   q     work when  asked   scope     force  rule  shape
🟩 Q1    +5.9    1   100%    9 triage hard   44%   even
🟩 Q3    +2.2    2   100%    9 triage firm   14%   even
🟩 Q16   +2.0    7    83%    4 mid    hard   37%   decisive
🟩 Q2    +1.2    3   100%    7 triage nudge  14%   graded
🟩 Q10b  +1.0   17    10%    3 mid    nudge  0%    even
🟨 Q5    +1.0    5   100%    7 triage firm   29%   graded
🟨 Q4    +0.7    9    83%    2 narrow hard   41%   even
🟨 Q11b  +0.6   15    17%    5 mid    nudge  0%    graded
🟨 Q20   +0.5    8    69%    4 mid    hard   28%   even
🟨 Q25   +0.3   15    10%    4 mid    firm   38%   decisive
🟨 Q12b  +0.3   12    34%    4 mid    hard   41%   even
🟨 Q11   +0.3   16    24%    8 triage nudge  0%    decisive
🟨 Q9    +0.3   12    38%    7 triage nudge  23%   even
🟨 Q7    +0.2   13    59%    4 mid    firm   0%    decisive
🟨 Q18   +0.2   14    69%    3 mid    hard   12%   even
🟨 Q10   +0.2   16    17%    6 triage firm   0%    graded
🟨 Q14   +0.1   11    72%    1 narrow hard   15%   decisive
🟨 Q13   +0.1   14    83%    3 mid    firm   40%   decisive
⬜ Q23   +0.0   15    79%    4 mid    firm   11%   graded
⬜ Q22   +0.0    7    72%    6 triage firm   44%   graded
⬜ Q12   +0.0    9    97%    6 triage firm   60%   decisive
⬜ Q21   +0.0   16    69%    1 narrow hard   14%   graded
⬜ Q2q   +0.0    4    41%    8 triage nudge  31%   even
⬜ Q24   +0.0   14     7%    3 mid    firm   34%   decisive
🟥 Q15   -0.1   14    52%    2 narrow hard   34%   even
🟥 Q6    -0.1    9    86%    4 mid    firm   14%   graded
🟥 Q8    -0.1    4   100%    8 triage nudge  0%    even
🟥 Q17   -0.1   17    24%    1 narrow nudge  50%   graded
🟥 Q19   -0.2   14    52%    4 mid    nudge  46%   graded
```

**Low-yield** (asked late, after the ranking has settled) — 🟥 _cost rank_: Q19, Q17, Q8, Q6, Q15 · ⬜ _idle_: Q21, Q23, Q24, Q12, Q22, Q2q.

_scope/force/shape are **potential**; `work` is what landed. High-force questions that arrive late (Q15, Q16, Q20) show little work because the ranking has usually settled by then._
