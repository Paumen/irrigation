# Soil-Balance webapp

## 1. scope

- **SCO-1** Single-screen tool that judges watering need for one fixed garden by estimating soil moisture from recent + forecast weather and watering, instead of guessing.
- **SCO-2** Let the user try "what-if" watering on any day and see the soil respond immediately.
- **SCO-3** One user, one zone, one built-in site (Vormersesluisweg 3A, Wijchen; 51.79733 °N, 5.70643 °E).
- **SCO-4** No build step, framework (unless buildless like Alpine.js), server, or water-flow maths in the browser (the sprinkler rate is precomputed). Deployable to GitHub Pages. Nothing is saved; all settings reset on reload.
- **SCO-5** Mobile-first; light colour theme.

## 2. data

- **DAT-1** Weather from Open-Meteo's Forecast API (`api.open-meteo.com/v1/forecast`) in a single request — `past_days=14`, `forecast_days=14`, `timezone=Europe/Amsterdam` — giving 14 past days + today + 13 forecast days as one gapless series (today is at index 14; never work it out from the device clock). Daily variables: `precipitation_sum` (rain), `temperature_2m_max` (shown only, not used in maths), `et0_fao_evapotranspiration` (reference water loss, fetched ready-made — never computed in the browser). Missing (null) values: precipitation → 0, et0 → the previous day's value (0 would be wrong), temperature → shown blank. Each day's weekday is derived from its date string (parsed as UTC, to avoid a local-timezone day shift) for display labels.
- **DAT-2** Of the days fetched (DAT-1), the earliest ones — before the shown window — are run-up that settles the soil estimate; the tank starts full (field capacity) on the first fetched day. The graph shows a 16-day window: last 8 days, today, next 7.
- **DAT-3** Sprinkler rate, 0.063 mm/min (3.78 mm/hr gross), from BL4.0 / 180° nozzle (Hunter I-20).
- **DAT-4** If the weather request fails, the screen shows a clear unavailable/error state rather than estimated, stale, or zero-filled data — no silent fallback.

## 3. logic

- **LOG-1** Daily: tank level = previous level + gains − losses, then capped between empty (wilting point) and full (field capacity); water above full is discarded that day. Tank size = water the soil holds per metre of depth × root depth. All levels are tracked as plant-available water (0 = wilting point, full = tank size); absolute field-capacity/wilting volumes are never needed. Any control change re-runs the whole balance from the full (field-capacity) seed (DAT-2).
- **LOG-2** Losses = reference evapotranspiration × crop coefficient × Ks (FAO-56 water-stress coefficient — a dryness throttle). Define total available water TAW = tank size (LOG-1), readily-available water RAW = p × TAW (p set per planting), and the watering threshold = TAW − RAW = (1 − p) × tank size, where "stored" = water held above wilting point. Ks uses the stored level at the start of each day (the previous day's closing level): at or above the threshold Ks = 1; below it Ks drops in a straight line with the stored water (Ks = stored ÷ threshold; if the threshold is 0, Ks = 1), reaching 0 at wilting point.
- **LOG-3** Gains = rainfall × effectiveness (0.8) + applied watering × efficiency (0.9).

## 4. controls

- **CTR-1** Planting type → preset crop coefficient, root depth, depletion fraction p. Presets: Turf (Kc 0.85, 0.15 m, p 0.45) · Flower bed (0.90, 0.30 m, 0.45) · Shrubs (0.70, 0.50 m, 0.50). Kc is a single constant per planting (no FAO-56 growth-stage curve).
- **CTR-2** Soil type → plant-available water held per metre (field capacity − wilting point). Presets: Sand 60 · Sandy loam 130 · Loam 170 · Clay 190 mm·m⁻¹.
- **CTR-3** Watering duration (minutes, default 60) → dose applied to each watered day (CTR-4) = sprinkler rate (DAT-3) × minutes (gross; efficiency applied in LOG-3).
- **CTR-4** Click a day to water, past or future — first click applies the dose, second cancels. Watered-day toggles are independent of the planting/soil presets and persist when presets change.
- **CTR-5** On load the screen defaults to planting = Flower bed, soil = Sandy loam, and no days watered (watering duration default in CTR-3).

## 5. ux/ui

- **UIX-1** Soil moisture across the window is a continuous stepped fill, there's no whitespace between days; water rises bottom-up to each day's level.
- **UIX-2** Planting with roots on the surface (turf / flowers / plants) and sun on top.
- **UIX-3** Per day: ET loss, rain in, and watering on graph; daily max temperature as a number.
- **UIX-4** Horizontal marker line at the watering threshold; today's level labelled as a percentage of available water (0% = wilting, 100% = field capacity).
- **UIX-5** Display rounding (display only — the balance computes at full precision): stored level as an integer %, temperature as an integer °C, and water depths (dose, rain, ET) to 1 decimal mm.
- **UIX-6** Controls: planting type and soil type as segmented buttons (every option visible, single tap); watering duration as a +/− minute stepper.
