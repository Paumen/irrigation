# High level spec — V2

## Goal

Guide homeowners through fixing their irrigation system with a
live, ranked list of likely causes — like a working diagnostic bench. The map reacts to states and progress. Using app is more intuitive via interactions, visualization, feedback, progressive disclosure. An assistant helps the user proactively.

## Core Objectives

- **Redesigned and integrated Map** Typed connection lines (Wi-Fi, water, 24V, 230V) and
  per-node health indicators turn the schematic from decoration into a navigation
  surface that mirrors the Causes ranking.
- **Redesigned Questionare layout and interaction** Improved interaction and experience. User can swipe trough questions and intuitively knows progress and possible interactions that spatially make sense. At any moment, the user knows in which stage, which question,
  and which parts of the system the current question is about. 
- Integrated bot proactive support and llm provides analysis upon request.
  
## Layout Changes

- **Questionaire, stages, progress feel as one piece** 
- Causes, Equipment, and Suggested next become one tabbed card. Causes shown by default.
- **Illustrations and help text.** Questions that benefit from visual context —
  most importantly the multimeter probe-placement tests — gain inline
  illustrations or short help text. Added per-question, not globally. 

## Map

- **connection lines.** are distinqtuive and clear and animated when active:
  - Wi-F
  - Water 
  - 24V control cable
  - 230V mains
- **Node status indicator.** Each node signals a status
  reflecting the aggregated likelihood score of the causes attached to that node
  (derived from the same `severityT` used in the
  Causes list).
- **Node click → sub-causes.** Clicking a node reveals 
  causes attached to it, each with its current rank and percentage. The popover
  links back to the Causes panel.
- **Active-question emphasis.** When a question is active, the nodes and lines
  that contribute to its scoring are focussef/highlighted/animated; while others dim or neutral.

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
