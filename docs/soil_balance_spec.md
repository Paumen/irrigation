# Soil-Balance webapp

## 1. scope

- **SCO-1** Single-screen tool to judge irrigation need for one fixed site, replacing gut-feel scheduling with a grounded, soil-moisture estimate driven by recent + forecast weather and watering.
- **SCO-2** Let the user try "what-if" watering on any day and see the soil response immediately.
- **SCO-3** Scope: one user, one zone, one built-in site (Vormersesluisweg 3A, Wijchen; 51.79733 °N, 5.70643 °E).
- **SCO-4** No build step, framework (unless buildless like alpine), server, or browser-side hydraulics (precipitation rate is precomputed). Deployable to GitHub Pages. Nothing persists; all settings reset on reload.
- **SCO-5** Mobile first, light UI.

## 2. data

- **DAT-1** Weather from Open-Meteo, pinned to `timezone=Europe/Amsterdam`: past days from the Historical Forecast API, today + future days from the Forecast API (the seam at today belongs to the Forecast API). Daily variables: `precipitation_sum` (rainfall), `temperature_2m_max` (display only), `et0_fao_evapotranspiration` (fetched precomputed — no browser-side ET).
- **DAT-2** Each load fetches 24 days before today + 16 forecast days; the earliest fetched days (before the shown window) act as run-up to settle the soil estimate, seeded at field capacity on the first fetched day. The graph shows 16 days: last 8, today, next 7.
- **DAT-3** Precipitation rate, 0.063 mm/min (3.78 mm/hr gross), from BL4.0 / 180° nozzle (Hunter I-20).
- **DAT-4** If a weather fetch fails, the screen shows an explicit unavailable/error state rather than estimated, stale, or zero-filled data — no silent fallback.

## 3. logic

- **LOG-1** Daily: reservoir = previous level + gains − losses, then clamped between empty (wilting point) and full (field capacity); water above full is discarded that day. Reservoir size = soil water-held-per-depth × root depth.
- **LOG-2** Losses = reference evapotranspiration × crop coefficient × Ks (FAO-56 water-stress coefficient). With total available water TAW = reservoir size (LOG-1) and readily-available water RAW = p × TAW (p set per planting), the watering threshold is the stored level TAW − RAW = (1 − p) × reservoir size; at or above the threshold Ks = 1, below it Ks falls linearly with the remaining stored water (Ks = stored ÷ threshold), reaching 0 at wilting point — easing demand as the soil dries. As a percentage of available water (UIX-4), the threshold sits at (1 − p) × 100% (turf/flowers 55%, shrubs 50%).
- **LOG-3** Gains = rainfall × effectiveness (0.8) + applied watering × efficiency (0.9).
- **LOG-4** Next-watering projection: step the reservoir forward over all 16 forecast days, honouring any toggled future watering, to find the first day it crosses the watering threshold; if none, report ">16 days".

## 4. controls

- **CTR-1** Planting type → preset crop coefficient, root depth, watering threshold p. Presets (tunable): Turf (Kc 0.85, 0.15 m, p 0.45) · Flower bed (0.90, 0.30 m, 0.45) · Shrubs (0.70, 0.50 m, 0.50).
- **CTR-2** Soil type → plant-available water-held-per-depth (field capacity − wilting point). Presets: Sand 60 · Loam 170 · Clay 190 mm·m⁻¹.
- **CTR-3** Watering duration (minutes, default 60) → dose added per click = precipitation rate (DAT-3) × minutes (gross; efficiency applied in LOG-3).
- **CTR-4** Toggle per day / click day to water, past or future — first click applies the dose, second cancels (clear on/off).

## 5. ux/ui

- **UIX-1** Soil moisture across the window is a continuous stepped fill, there's no whitespace between days; water rises bottom-up to each day's level.
- **UIX-2** Planting with roots on the surface (turf / flowers / plants) and sun on top.
- **UIX-3** Per day: ET loss, rain in, and watering on graph; daily max temperature as a number.
- **UIX-4** Horizontal marker line at the watering threshold; today's level labelled as a percentage of available water (0% = wilting, 100% = field capacity).
- **UIX-5** 'Next watering in +N days' counter (uses LOG-4); ">16 days" when none within the window.
