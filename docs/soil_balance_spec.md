# Soil-Balance webapp

## 1. scope

- **SCO-1** The user can tell when the garden needs water with enough confidence to act on it, instead of guessing.
- **SCO-2** The user can test a watering plan and see its effect before committing to it.
- **SCO-3** One user, one zone, one built-in site (Vormersesluisweg 3A, Wijchen; 51.79733 °N, 5.70643 °E).
- **SCO-4** No build step, framework (unless buildless like Alpine.js), server, or water-flow maths in the browser (the sprinkler rate is precomputed). Deployable to GitHub Pages. Nothing is saved; all settings reset on reload.
- **SCO-5** Mobile-first; light colour theme.

## 2. data

- **DAT-1** Weather from Open-Meteo's Forecast API (`api.open-meteo.com/v1/forecast`) in a single request — `past_days=14`, `forecast_days=14`, `timezone=Europe/Amsterdam` — giving 14 past days + today + 13 forecast days. Daily variables: `precipitation_sum` (rain), `temperature_2m_max` (°), `et0_fao_evapotranspiration` (reference water loss, fetched ready-made — never computed in the browser). Each day's weekday is derived from its date string for display labels.
- **DAT-2** Sprinkler rate, 0.063 mm/min (3.78 mm/hr gross), from BL4.0 / 180° nozzle (Hunter I-20).
- **DAT-3** If the weather request fails, the screen shows a clear unavailable/error state rather than estimated, stale, or zero-filled data — no silent fallback.

## 3. logic

- **LOG-1** Daily: tank level = previous level + gains − losses. Tank size = water the soil holds per metre of depth × root depth. All levels are tracked as plant-available water. Any control change re-runs the whole balance.
- **LOG-2** Losses = reference evapotranspiration × crop coefficient (no water-stress throttle — losses do not slow as the soil dries). Total available water TAW = tank size (LOG-1).
- **LOG-3** Gains = rainfall × effectiveness (0.8) + applied watering × efficiency (0.9).

## 4. controls

- **CTR-1** The user can record or plan a watering on each day, past or future, as one instant, fast, obvious, and reversible action on phone, so what-if exploration isn't a chore. Watering duration (minutes, default is 60).
- **CTR-3** Planting type → preset crop coefficient, root depth. Presets: Turf (Kc 0.85, 0.15 m) · Flower bed (0.90, 0.30 m) · Shrubs (0.70, 0.50 m). Kc is a single constant per planting.
- **CTR-4** Soil type → plant-available water held per metre (field capacity − wilting point). Presets: Sand 60 · Sandy loam 130 · Loam 170 · Clay 190 mm·m⁻¹.
- **CTR-5** On load the screen defaults to planting = Flower bed, soil = Sandy loam.

## 5. ux/ui

- **UIX-1** The user can grasp the soil-moisture trend across the most relevant window at a glance, without reading individual day values.
- **UIX-2** The user can clearly see why the level changes, not just that it changes, in the same glance, without reading individual day values.
- **UIX-3** Aesthetic: Calm & natural — soft greens/blues/earth tones, friendly, reassuring.
- **UIX-4** Soil Cross-Section — the chart is a soil column: water held inside a soil block with a surface line. Distinctive metaphor. Rain as rain etc.
- **UIX-5** Display rounding (display only — the balance computes at full precision): temperature as an integer °C, and water depths (dose, rain, ET) to 1 decimal mm.
