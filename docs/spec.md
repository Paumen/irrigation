# Spec

## Goal

Guide homeowners through fixing their irrigation system by asking step-by-step questions. Use their answers to build a live, ranked list of the most likely broken parts, and show this on an easy-to-understand system map.

## Core Objectives

- **Diagnosis:** A flexible questionnaire where users can skip, change, or answer questions in any order.
- **Ranking:** Real-time percentages showing the most likely causes, sorted from highest to lowest.
- **Map:** An interactive map of the irrigation system.
- **Look and Feel:** Designed to look like an "engineering worksheet" / "diagnostics tool" / "system status dashboard".

## Information Tracking

We save user answers in one main place. All other details (like progress bars and problem rankings) are calculated automatically from those answers.

- `answers` (stores the user's choice)
- `currentQuestion` (the question currently on the screen)
- `progressPercentage` (questions answered divided by total questions in that section)
- **Starting Information:** The list of possible causes, the layout of the system map, the questions (split into sections), and how much each answer changes the likelihood of a problem.

## Rules & Mechanics

- **Scoring System:** Every answer adds or subtracts points from the possible problems. The system instantly recalculates the percentages to show the most likely issues.
- **Recommendations:** Suggests the next most helpful questions to answer. 

