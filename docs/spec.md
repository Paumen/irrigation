# Diagnostic engine spec

## Goal

Guide a homeowner toward the broken part of their irrigation system by asking step-by-step questions and using the answers to maintain a live, ranked list of the most likely failure modes. Delivered to the user through the `irrigation` skill's `troubleshoot` playbook, which drives the engine over the `diagnose_irrigation` MCP tool.

## Core behaviour

- **Questionnaire:** Questions can be answered, changed, or skipped in any order. Each question has a shape (`options`, `multi`, `matrix`, `ages`), an effort cost, and a stage (Symptoms, Timeline, Tests).
- **Ranking:** Every answer adds to or subtracts from each suspect failure mode; the engine recomputes scores and percentages after each answer, sorted most- to least-likely.
- **Recommendations:** The engine scores the unanswered questions by how sharply they separate the contending failure modes (isolation + breadth, with effort as a tie-breaker) and surfaces the most informative next questions, each with a discriminator `D`; the loop's stop signal is an empty `next` (no question still separates the contending failure modes).

## State

The engine is pure and stateless; the caller owns the conversation state:

- `answers` — question id → answer (shape depends on the question `type`).
- `skipped` — question id → true for "I don't know" / skip.

Failure mode baselines, question effects, slider curves, and stage definitions live in `data.json` (the canonical record, scored by `tools/engine.py`). The failure mode taxonomy is documented in `fcode_spec.md`.
