# Spec

## Goal

Guide homeowners through fixing their sprinkler system by asking step-by-step questions. Use their answers to build a live, ranked list of the most likely broken parts, and show this on an easy-to-understand system map.

## Core Objectives

- **Guided Diagnosis:** A flexible questionnaire where users can skip, change, or answer questions in any order.
- **Live Ranking:** Real-time percentages showing the most likely causes, sorted from highest to lowest.
- **Visual Map:** An interactive map of the sprinkler system that color-codes parts from healthy (green) to broken (red).
- **Look and Feel:** Designed to look like an "engineering worksheet" / "diagnostics tool" / "system status dashboard".

## Information Tracking

We save user answers in one main place. All other details (like progress bars and problem rankings) are calculated automatically from those answers.

- `answers` (stores the user's choice)
- `currentQuestion` (the question currently on the screen)
- `progressPercentage` (questions answered divided by total questions in that section)
- **Starting Information:** The list of possible causes, the layout of the system map, the questions (split into 4 sections), and how much each answer changes the likelihood of a problem.

## Rules & Mechanics

- **Question Sections:**
  1. Age of parts
  2. Symptoms
  3. Events
  4. Tests or checks
- **Scoring System:** Every answer adds or subtracts points from the possible problems. The system instantly recalculates the percentages to show the most likely issues.
- **Part Health Color:** Updates the color of parts on the system map based on how likely they are to be the source of the problem.
- **Smart Recommendations:** Suggests the next most helpful questions to answer (the ones that will eliminate the most incorrect options).

## Screen Layout & Design

- **Top Area (System Map):** Shows the layout and health colors of the system parts. Clicking a part filters the list of problems below it.
- **Middle Area (Active Question):** Shows the current question, sections progress bars, and buttons to go back, forward, or skip.
- **Lower-Middle (Rankings):** Shows the most likely problems as percentage bars. top 5 shown by default, remainder on show all expand.
- **Bottom Area (Recommendations):** Suggests the top 2-3 most helpful questions or tests to do next.
