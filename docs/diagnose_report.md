# Diagnostic questionnaire — analysis report

29 fault modes · 18 questions · raw numbers in `--json`, gate in `test_diagnose.py`.

```
component leads & holds   28/29   median 6 q
sub-cause into top-3      29/29   median 6 q, slowest 17
lands at #1               16/29
survives 1-in-5 errors    18/29   median 84% stay top-3
```

## Convergence

Rank of the true cause after each answered question — 🟥 #8+ 🟧 #6–7 🟨 #4–5 🟩 #2–3 ✅ #1. **fam/top3** = questions to lock the component / exact cause · **noise** = % still top-3 under 1-in-5 errors · **vs** = who else leads (⚠ = a different component). Worst-first.

```
fault  fam top3 noise vs       → converges
F4.4   6   17     28%  ⚠ F5.1   🟥🟥🟥🟧🟥🟧🟨🟨🟧🟧🟨🟨🟨🟨🟨🟨🟩🟩
F5.8   1   13     32%  F5.3     🟥🟥🟩🟩🟩🟨🟩🟨🟨🟨🟨🟨🟩🟩
F2.5   9   16     52%  F2.1     🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥🟨🟨🟨🟨🟩🟩🟩
F9.3   1   12     54%  F9.4     🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩
F1.8   12  12     56%  F1.5     🟩🟩🟨🟩✅✅✅✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
F1.5   11  11     62%           🟩✅🟨🟨🟩🟩🟩🟩🟨🟧✅✅✅✅✅✅✅✅
F2.8   8   8      68%  F2.1     🟥🟥🟧🟩🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F9.1.2 1   1      72%  F9.1.1   🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F9.4   1   1      76%           ✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
F9.1.1 1   1      78%           🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
F2.1   10  8      78%           🟥🟥✅🟩🟨🟨🟨🟩🟩✅✅✅✅✅✅✅✅✅
F8.3   8   7      80%           🟥🟥🟥🟧🟥🟥🟩🟩🟩🟩🟩✅✅✅✅✅✅✅
F2.6   —   14     82%           🟨✅🟧🟧🟧🟥🟥🟧🟧🟨🟨🟨🟨🟩🟩🟩🟩🟩
F4.1   6   6      84%           🟨🟨🟩🟨🟨✅✅✅✅✅✅✅✅✅✅✅✅✅
F7.3.1 6   6      84%           🟥🟥🟥🟥🟨🟩🟩✅✅✅✅✅✅✅✅✅✅✅
F6.3   11  3      86%           🟧🟧✅✅✅✅✅✅✅🟩✅✅✅✅✅✅✅✅
F7.3.2 6   8      90%           🟥🟥🟥🟥🟥🟧🟧🟩🟩🟩🟩✅✅✅✅✅✅✅
F5.3   3   3      94%           ✅🟧🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅
F7.1.1 6   5      94%           🟥🟥🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅✅✅
F3.1.2 6   6      94%  F3.1.1   🟥🟥🟥🟥🟧✅✅🟩🟩🟩✅🟩🟩🟩🟩🟩🟩
F3.4   2   6      94%  F3.1.1   🟥🟥🟥🟥🟥🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F7.1.2 6   6      96%  F7.1.3   🟥🟥🟨🟨🟧✅✅🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F6.1   14  5      98%           🟥🟧🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩✅✅✅✅
F3.1.3 2   6      98%  F3.1.1   🟥🟧🟨🟨🟨🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
F3.1.1 2   2     100%           🟨✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
F5.1   4   3     100%           🟧🟨🟩✅✅✅✅✅✅✅✅✅✅✅✅
F7.1.3 6   5     100%           🟥🟥🟧🟥🟩🟩🟩✅✅✅✅✅✅✅✅✅✅✅
F8.1   8   7     100%           🟥🟥🟧🟨🟥🟥🟩✅✅✅✅✅✅✅✅✅✅✅
F7.4   7   11    100%  F7.1.3   🟧🟩✅✅🟨🟩✅🟩🟨🟨🟩🟩🟩🟩🟩🟩🟩
```

## Questions

**work** = mean rank-gain it earns the true cause (bar). **carry** = does the triage · **edged** = helps one fault, hurts another · **late** = fires after the ranking settled · **idle** = rarely decisive.

```
q      work               ask  tag
Q1     +5.9 ████████████ 100%  carry
Q3     +2.2 ████         100%  carry
Q16    +2.0 ████          83%  carry
Q2     +1.2 ██           100%  carry
Q10b   +1.0 ██            10%
Q5     +1.0 ██           100%
Q4     +0.7 █             83%
Q11b   +0.6 █             17%
Q20    +0.5 █             69%
Q25    +0.3 █             10%
Q12b   +0.3 █             34%
Q11    +0.3 █             24%
Q9     +0.3 █             38%
Q7     +0.2               59%
Q18    +0.2               69%
Q10    +0.2               17%
Q14    +0.1               72%
Q13    +0.1               83%
Q23    +0.0               79%  idle
Q22    +0.0               72%  idle
Q12    +0.0               97%  idle
Q21    +0.0               69%  idle
Q2q    +0.0               41%  idle
Q24    +0.0                7%  idle
Q15    -0.1               52%  late
Q6     -0.1               86%  late
Q8     -0.1              100%  edged
Q17    -0.1               24%  late
Q19    -0.2               52%  late
```

_edged: Q8 helps F7.1.3 +9, hurts F7.3.2 -3 — isolate its weights if retuned._
