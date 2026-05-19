# High level spec — V2

## Goal

Guide homeowners through fixing their irrigation system with a
live, ranked list of likely causes — and make the experience feel less like a form
and more like a working diagnostic bench. The map becomes a real wiring diagram
that reacts to the active question; the questionnaire gains finer-grained control
over answers and stages; and an assistant helps the user proactively.

## Core Objectives

- **Map as wiring diagram.** Typed connection lines (Wi-Fi, water, 24V, 230V) and
  per-node health indicators turn the schematic from decoration into a navigation
  surface that mirrors the Causes ranking.
- **Active context.** At any moment, the user can see which stage, which question,
  and which parts of the system the current question is about. Stage, question,
  and map highlight as one piece.
- **Reversible answers.** Users can deselect a single answer or reset a single
  stage without losing the rest of their progress.
- Integrated bot proactive support and llm analysis.
  
## Layout Changes

- **Stage / question fusion.** The active stage in the stage nav visually
  continues into the question card (shared border or fill) so the user reads
  stage + question as a single unit.
- Causes, Equipment, and Suggested next become one tabbed card. Causes shown by default.
- **Illustrations and help text.** Questions that benefit from visual context —
  most importantly the multimeter probe-placement tests — gain inline
  illustrations or short help text. Added per-question, not globally. 

## Map

- **Typed connection lines.** Lines between nodes are drawn with distinct visual
  styles per connection type:
  - Wi-F
  - Water: 
  - 24V control cable
  - 230V mains
    
- **Node status indicator.** Each node carries a small status badge whose colour
  reflects the aggregated likelihood score of the causes attached to that node
  (derived from the same `severityT` used in the
  Causes list).
- **Node click → sub-causes.** Clicking a node opens a small popover listing the
  causes attached to it, each with its current rank and percentage. The popover
  links back to the Causes panel — clicking a cause in the popover 
  highlights it in the main ranking.
- **Active-question emphasis.** When a question is active, the nodes and lines
  that contribute to its scoring are highlighted/animated; everything else dims. The
  emphasis is purely visual — no state changes.

## Robby (assistant character)

A retro robot character with **proactive guidance and support** 

- Surfaces the top suggested question proactive or when clicked.
- Comments when the top cause changes or when confidence crosses a threshold.
- Cheers on stage completion.
- On-demand "ask Robby" mode: the user can ask for additional insights,
  input, or context at any time and Robby responds in-character.
- Expands or explains the active question on request — restating it in
  plainer language, clarifying what's being asked, and why it matters
  for the current ranking.
- LLM triggered by an explicit button. Sends the answered-question
  payload and the current ranking to an LLM and shows a plain-language
  summary of the top causes and recommended next steps.
