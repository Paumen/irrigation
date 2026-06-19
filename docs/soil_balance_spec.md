# Soil-Balance webapp

## 1. scope

- **SCO-1** Single-screen tool to judge irrigation need for one fixed site, replacing gut-feel scheduling with a grounded, soil-moisture estimate driven by recent + forecast weather and watering.
- **SCO-2** Let the user try "what-if" watering on any day and see the soil response immediately.
- **SCO-3** Scope: one user, one zone, one built-in site (Vormersesluisweg 3A, Wijchen; 51.79733 °N, 5.70643 °E).
- **SCO-4** No build step, framework (unless buildless like Alpine.js), server, or browser-side hydraulics (precipitation rate is precomputed). Deployable to GitHub Pages. Nothing persists; all settings reset on reload.
- **SCO-5** Mobile-first; light colour theme.

## 2. data

- **DAT-1** Weather from Open-Meteo's Forecast API (`api.open-meteo.com/v1/forecast`) in a single request — `past_days=24`, `forecast_days=16`, `timezone=Europe/Amsterdam` — yielding 24 past days + today + 15 forecast days as one gapless series anchored on the API's own "today" (never a client clock). Daily variables: `precipitation_sum` (rainfall), `temperature_2m_max` (display only), `et0_fao_evapotranspiration` (fetched precomputed — no browser-side ET); a null daily value is treated as 0 for that day.
- **DAT-2** Of the days fetched (DAT-1), the earliest — before the shown window — act as run-up to settle the soil estimate, seeded at field capacity on the first fetched day. The graph shows a 16-day window: last 8, today, next 7.
- **DAT-3** Precipitation rate, 0.063 mm/min (3.78 mm/hr gross), from BL4.0 / 180° nozzle (Hunter I-20).
- **DAT-4** If a weather fetch fails, the screen shows an explicit unavailable/error state rather than estimated, stale, or zero-filled data — no silent fallback.

## 3. logic

- **LOG-1** Daily: reservoir = previous level + gains − losses, then clamped between empty (wilting point) and full (field capacity); water above full is discarded that day. Reservoir size = soil water-held-per-depth × root depth. All levels are tracked as plant-available water (0 = wilting point, full = reservoir size); absolute field-capacity/wilting volumes are never needed. Any control change re-runs the whole balance from the field-capacity seed (DAT-2).
- **LOG-2** Losses = reference evapotranspiration × crop coefficient × Ks (FAO-56 water-stress coefficient). With total available water TAW = reservoir size (LOG-1) and readily-available water RAW = p × TAW (p set per planting), the watering threshold is the stored level TAW − RAW = (1 − p) × reservoir size, where stored = water held above wilting point; at or above the threshold Ks = 1, below it Ks falls linearly with the remaining stored water (Ks = stored ÷ threshold; if the threshold is 0, Ks = 1), reaching 0 at wilting point. Ks is evaluated from the stored level at the start of each day (the previous day's closing level), so the daily loss is not self-referential.
- **LOG-3** Gains = rainfall × effectiveness (0.8) + applied watering × efficiency (0.9).
- **LOG-4** Next-watering projection: step the reservoir forward over the next 14 days, honouring any toggled future watering, to find the first day it crosses the watering threshold; if today is already at or below the threshold, report "now" (+0); if none within 14 days, report ">14 days".

## 4. controls

- **CTR-1** Planting type → preset crop coefficient, root depth, watering threshold p. Presets: Turf (Kc 0.85, 0.15 m, p 0.45) · Flower bed (0.90, 0.30 m, 0.45) · Shrubs (0.70, 0.50 m, 0.50). Kc is a single constant per planting (no FAO-56 growth-stage curve).
- **CTR-2** Soil type → plant-available water-held-per-depth (field capacity − wilting point). Presets: Sand 60 · Sandy loam 130 · Loam 170 · Clay 190 mm·m⁻¹.
- **CTR-3** Watering duration (minutes, default 60) → dose applied to each watered day (CTR-4) = precipitation rate (DAT-3) × minutes (gross; efficiency applied in LOG-3).
- **CTR-4** Click a day to water, past or future — first click applies the dose, second cancels. Watered-day toggles are independent of the planting/soil presets and persist when presets change.
- **CTR-5** On load the screen defaults to planting = Flower bed, soil = Sandy loam, and no days watered (watering duration default in CTR-3).

## 5. ux/ui

- **UIX-1** Soil moisture across the window is a continuous stepped fill, there's no whitespace between days; water rises bottom-up to each day's level.
- **UIX-2** Planting with roots on the surface (turf / flowers / plants) and sun on top.
- **UIX-3** Per day: ET loss, rain in, and watering on graph; daily max temperature as a number.
- **UIX-4** Horizontal marker line at the watering threshold, which sits at (1 − p) × 100% of available water; today's level labelled as a percentage of available water (0% = wilting, 100% = field capacity).
- **UIX-5** 'Next watering in +N days' counter (uses LOG-4); ">14 days" when none within 14 days.
- **UIX-6** Display rounding (display only — the balance computes at full precision): stored level as an integer %, temperature as an integer °C, and water depths (dose, rain, ET) to 1 decimal mm.
- **UIX-7** Controls: planting type and soil type as segmented buttons (every option visible, single tap); watering duration as a +/− minute stepper.
