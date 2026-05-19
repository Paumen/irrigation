# High level spec — V2

## Goal

Keep the V1 goal — guide homeowners through fixing their irrigation system with a
live, ranked list of likely causes — and make the experience feel less like a form
and more like a working diagnostic bench. The map becomes a real wiring diagram
that reacts to the active question; the questionnaire gains finer-grained control
over answers and stages; and an optional assistant can summarise the user's result
at the end.

## Core Objectives

- **Map as wiring diagram.** Typed connection lines (Wi-Fi, water, 24V, 230V) and
  per-node health indicators turn the schematic from decoration into a navigation
  surface that mirrors the Causes ranking.
- **Active context.** At any moment, the user can see which stage, which question,
  and which parts of the system the current question is about. Stage, question,
  and map highlight as one piece.
- **Reversible answers.** Users can deselect a single answer or reset a single
  stage without losing the rest of their progress.
- **Optional explanation.** An opt-in, end-of-questionnaire LLM summary that
  explains the top causes in plain language. The deterministic ranking stays the
  source of truth.

## Layout Changes

- **Stage / question fusion.** The active stage in the stage nav visually
  continues into the question card (shared border or fill) so the user reads
  stage + question as a single unit.
- **Causes stays primary.** Causes is the headline output and remains visible at
  all times. It is not tabbed away behind another card.
- **Equipment restyled.** Replace the nested-table look with a borderless grid:
  one row per equipment item, whitespace gutters instead of cell borders. The
  card may collapse, but its internal layout no longer uses border-in-border
  styling.
- **"Suggested next" expands.** The "See more" affordance reveals all suggested
  questions, not just the top few.

## Map

- **Typed connection lines.** Lines between nodes are drawn with distinct visual
  styles per connection type:
  - Wi-Fi: dotted, blue
  - Water: solid, cyan, thicker stroke
  - 24V control cable: dashed, amber
  - 230V mains: solid, red
  Styles are defined as CSS custom properties / classes so the legend and the
  diagram share a single source of truth.
- **Node status indicator.** Each node carries a small status badge whose colour
  reflects the aggregated likelihood score of the causes attached to that node
  (e.g. green / amber / red bands derived from the same `severityT` used in the
  Causes list).
- **Node click → sub-causes.** Clicking a node opens a small popover listing the
  causes attached to it, each with its current rank and percentage. The popover
  links back to the Causes panel — clicking a cause in the popover scrolls /
  highlights it in the main ranking.
- **Active-question emphasis.** When a question is active, the nodes and lines
  that contribute to its scoring are highlighted; everything else dims. The
  emphasis is purely visual — no state changes.

## Questionnaire

- **Deselect an answer.** Each answered question shows an explicit "Clear
  answer" affordance. Clearing an answer removes its score contribution and
  returns the question to the unanswered state.
- **Reset a single stage.** The Reset dialog offers two scopes: reset this
  stage, or reset everything. Per-stage reset clears only the answers in that
  stage and recomputes ranking and progress.
- **Illustrations and help text.** Questions that benefit from visual context —
  most importantly the multimeter probe-placement tests — gain inline
  illustrations or short help text. Added per-question, not globally.

## Robby (assistant character)

A small retro robot character with a single role: **proactive nudges when the
ranking is uncertain or shifts meaningfully.** Scope is deliberately narrow to
avoid duplicating the Causes and Suggested-next panels.

- Surfaces the top suggested question when clicked.
- Comments when the top cause changes or when confidence crosses a threshold.
- Cheers on stage completion.

Robby is presentation only. He reads from the same state the rest of the UI
reads from and does not introduce new scoring logic.

## LLM explanation (opt-in)

- Triggered by an explicit button, available once the user has answered enough
  questions for the ranking to be meaningful.
- Sends the answered-question payload and the current ranking to an LLM and
  shows a plain-language summary of the top causes and recommended next steps.
- Advisory only. The deterministic rule-based ranking remains the source of
  truth; the LLM cannot reorder or override causes.
- No data leaves the page unless the user clicks the button.

## Information Tracking

Existing V1 state is preserved (`answers`, `activeQuestion`, `stageProgress`).
V2 adds:

- `activeNodeId` — the map node currently focused (for popover and emphasis).
- `relevantNodes(activeQuestionId)` / `relevantLines(activeQuestionId)` —
  derived getters used to drive active-question emphasis on the map.
- `nodeHealth(nodeId)` — derived from the causes attached to the node and their
  current percentages.

Equipment dates, models, and zone flow remain as in V1.

## Rules & Mechanics

- **Scoring System.** Unchanged. Every answer adds or subtracts points from the
  possible causes; percentages recalculate instantly.
- **Recommendations.** Unchanged in algorithm; the UI now exposes all
  suggestions through "See more" instead of capping the list.
- **Map ↔ Causes link.** Node health, node popovers, and active-question
  emphasis are pure projections of the existing answers and causes state. The
  map never holds authoritative state of its own.
- **LLM output.** Treated as commentary on the ranking, not as input to it.
