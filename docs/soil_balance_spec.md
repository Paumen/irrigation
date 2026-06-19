# Soil-Balance webapp

## 1. scope

- **SCO-1** Single-screen tool to judge irrigation need for one fixed site, replacing gut-feel scheduling with a grounded, soil-moisture estimate driven by recent + forecast weather and watering.
- **SCO-2** Let the user try "what-if" watering on any day and see the soil response immediately.
- **SCO-3** Scope: one user, one zone, one built-in site (Vormersesluisweg 3A, Wijchen).
- **SCO-4** No build step, framework (unless buildless like alpine), server, or browser-side hydraulics (precipitation rate is precomputed). Deployable to GitHub Pages. Nothing persists; all settings reset on reload.
- **SCO-5** Mobile first, light UI.

## 2. data

- **DAT-1** Weather from daily Open-Meteo forecast (local Amsterdam time) and Historical Forecast API: rainfall, daily temperature, evapotranspiration.
- **DAT-2** Each load fetches 16 days before today + 16 forecast days; the earliest fetched days (before the shown window) act as run-up to settle the soil estimate. The graph shows 16 days: last 8, today, next 7.
- **DAT-3** Precipitation rate, 0.063 mm/min (3.78 mm/hr gross), from BL4.0 / 180° nozzle (Hunter I-20).

## 3. logic

- **LOG-1** Daily: reservoir = previous level + gains − losses, clamped between empty and full. Reservoir size = soil water-held-per-depth × root depth.
- **LOG-2** Losses = reference evapotranspiration × crop coefficient. Below the watering threshold, daily loss tapers as the soil dries (FAO-56 stress coefficient Ks), easing demand.
- **LOG-3** Gains = rainfall × effectiveness + applied watering × efficiency.
- **LOG-4** Next-watering projection: step the reservoir forward over the forecast days, honouring any toggled future watering, to find the first day it crosses the watering threshold.

## 4. controls

- **CTR-1** Planting type → preset crop coefficient, root depth, watering threshold.
- **CTR-2** Soil type → water-held-per-depth.
- **CTR-3** Watering duration (minutes) → dose added per click.
- **CTR-6** Toggle per day / click day to water, past or future — first click applies the dose, second cancels (clear on/off).

## 5. ux/ui

- **UIX-1** Soil moisture across the window is a continuous stepped fill; water rises bottom-up to each day's level.
- **UIX-2** Planting with roots on the surface (turf / flowers / plants) and sun on top.
- **UIX-3** Per day: ET loss, rain in, and watering on graph; daily max temperature as a number.
- **UIX-4** Horizontal marker line at the watering threshold; today's level labelled as a percentage.
- **UIX-5** 'Next watering in +N days' counter (uses LOG-4).
