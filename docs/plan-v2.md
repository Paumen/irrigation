# V2 implementation plan

Companion to `docs/spec-v2.md`. Reads top-to-bottom; each phase is shippable
on its own and built on `claude/review-v2-design-Hlb0o` (or follow-up branches).

## Phases

### Phase 1 — Layout polish (no new state)

1. Stage / question fusion: shared border or fill between the active stage
   button (`index.html:189-201`) and the question card header.
2. Equipment card restyle: replace the nested `<dl>` + `<table>` with a single
   borderless grid (`index.html:275-313`).
3. Raise / remove the cap on "Suggested next" — extend `seeMore(2)` usage so
   the See-more button reveals all items, not just `recommendations.slice(0,5)`
   (`app.js:364-371`).

Ships independently. Pure CSS + small markup tweak.

### Phase 2 — Questionnaire reversibility

1. "Clear answer" affordance on each answered question. Mutates `answers` /
   `skipped` like `doReset` does but for a single id (`app.js:537-543`).
2. Per-stage reset: extend the existing reset dialog with a scope chooser
   (this stage vs everything). Clears `answers` + `skipped` filtered by stage.
3. Persist behaviour unchanged — both go through the existing `$watch`
   persistence layer (`app.js:272-292`).

Depends on Phase 1 only for visual placement of the new controls.

### Phase 3 — Map as wiring diagram

1. Add a `connections` array to `data.js`: `{from, to, type}` where `type` is
   `wifi | water | v24 | v230`. Define stroke styles per type as CSS vars.
2. Extend `renderMap()` (`app.js:552-562`) to draw the lines first, then the
   nodes on top. Add a tiny legend block inside the map card.
3. Node status badge: compute `nodeHealth(nodeId)` from causes attached to the
   node (via `CAUSES` `parent`/node mapping in `data.js`) and the current
   `ranked` percentages. Render as a small circle in the node corner; reuse
   `severityT` (`app.js:202-205`) for colour.
4. Active-question emphasis: derive `relevantNodes` / `relevantLines` from
   the active question's `highlight` field (already exists in data) plus a
   new `lines` field. Add classes in `renderMap()` and dim the rest in CSS.

Dependency: requires a small data-model addition (`connections`, per-node
cause mapping). No new persisted state.

### Phase 4 — Node interaction

1. Click handler on `.node-group` opens a popover listing causes attached to
   that node, each with current rank + percentage.
2. Add `activeNodeId` to component state (not persisted).
3. Clicking a cause inside the popover scrolls/highlights the corresponding
   row in the Causes panel (DOM scroll + transient class).

Dependency: Phase 3 (needs the node-to-cause mapping).

### Phase 5 — Probe-placement illustrations

1. Add an optional `illustration` field per question in `data.js`.
2. In `index.html` `type === 'options'` branch, render the image above the
   options when present. Same for `matrix` if needed.
3. Author images for the multimeter test questions only; other questions
   stay text-only.

Independent of phases 3–4.

### Phase 6 — Robby (scoped assistant)

1. Add a small character SVG in a fixed corner of the layout.
2. Local state machine: `idle | cheering | suggesting | commenting`.
3. Triggers (Alpine `$watch` on existing getters):
   - `stageProgress[s].answered === total` → `cheering`.
   - Top cause id changes vs previous tick → `commenting`.
   - User idle for N seconds with `recommendations[0]` available →
     `suggesting`.
4. Click Robby → focus the top recommendation (`goTo(rec.q.id)`).

Independent of phases 3–5 but reads from the same state.

### Phase 7 — Opt-in LLM explanation

1. Button on the Causes card: "Explain my result".
2. On click: gather answered questions + current ranking; POST to a chosen
   provider; render the response in a dialog.
3. No data leaves the page until the button is clicked. No effect on
   ranking.

Independent. Last, because it needs an API key / endpoint decision.

## Risks

- **Map redraw cost.** Adding lines + badges + emphasis classes runs through
  `renderMap()` which currently re-renders the full SVG string on every
  Alpine reactivity tick. If the diagram grows, this will jank. Mitigation:
  switch to declarative `<template x-for>` over nodes/lines instead of
  innerHTML.
- **Severity colour drift.** Reusing `severityT` for node badges means two
  visual surfaces now depend on the same threshold (`SEVERITY_FULL_PCT`).
  Changing it later moves both. Either accept or decouple early.
- **Data-model creep.** Phases 3–4 add a `connections` array and a
  node→causes mapping. If we encode the mapping in two places (data + map
  layout), drift is inevitable. Pick one source of truth.
- **Robby tone.** A character that comments on ranking shifts can become
  noisy and patronising. Needs a quiet-by-default mode and an off switch.
- **LLM cost / privacy.** Sending answers to a third party changes the
  privacy story of a static GitHub Pages app. Needs explicit user consent
  and a way to redact equipment models.
- **localStorage shape change.** Phases 2 and 4 don't change `STORAGE_KEY`
  (`app.js:184`) but any future state additions must keep
  `pruneUnknownIds` (`app.js:233-241`) safe.

## Effort vs benefit

| Item                               | Effort | Benefit               |
| ---------------------------------- | ------ | --------------------- |
| Stage / question fusion            | S      | High                  |
| Equipment restyle                  | S      | Mid                   |
| See-more uncap                     | XS     | Mid                   |
| Clear single answer                | S      | High                  |
| Per-stage reset                    | S      | Mid                   |
| Typed connection lines             | M      | High                  |
| Node status badges                 | M      | High                  |
| Active-question emphasis on map    | S      | High                  |
| Node click → popover → Causes link | M      | Mid-High              |
| Probe-placement illustrations      | M      | High (for test stage) |
| Robby (scoped)                     | M      | Mid                   |
| LLM explanation                    | M      | Mid                   |

XS ≈ <1h, S ≈ half-day, M ≈ 1–2 days.

## Dependencies

- Phases 3 → 4 (node popover needs the node↔cause map from Phase 3).
- Phase 6 (Robby) reads `recommendations` and top-cause changes — already
  exposed by `app.js`. No blocker.
- Phase 7 (LLM) needs an endpoint / provider choice (see decisions).
- Phases 1, 2, 5, 6, 7 are otherwise independent and can ship in any order.

## Decisions / input needed from you

1. **Tabbed combined card — in or out?** The review recommended keeping
   Causes always visible. Confirm we drop the "merge Causes/Next/Equipment
   into tabs" idea from the original V2 brief, or push back.
2. **Connection line palette.** Confirm the proposed mapping
   (Wi-Fi dotted blue / water solid cyan / 24V dashed amber / 230V solid
   red) or supply your own.
3. **Node → causes mapping.** Today causes have a `parent`. Is `parent`
   already the node id (e.g. `ctrl`, `valves`), or do we need a separate
   `node` field on each cause? I'll check, but please confirm intent.
4. **Robby scope.** OK with the narrow scope (cheer / comment on shift /
   surface top suggestion)? Or do you want the full set from the brief
   (explains active question, answers on request, etc.)?
5. **LLM provider.** Anthropic / OpenAI / user-supplied key in a settings
   field? And: do we ship a server proxy (rules out static hosting) or
   call directly from the browser with a user-provided key?
6. **Weather pull (Q11).** Park it for V2, or include in Phase 5?
7. **Branching.** Land all phases on `claude/review-v2-design-Hlb0o`, or
   one branch per phase for review?
