# Soil-Balance webapp

## 1. scope

- **SCO-1** The user can tell when the garden needs water with enough confidence to act on it, instead of guessing, and test a watering plan and see its effect before committing to it.
- **SCO-2** One user, one zone, one built-in site (Vormersesluisweg 3A, Wijchen; 51.79733 °N, 5.70643 °E).
- **SCO-3** No build step, framework (unless buildless like Alpine.js), server, or water-flow maths in the browser (the sprinkler rate is precomputed). Deployable to GitHub Pages. Nothing is saved; all settings reset on reload.
- **SCO-4** Mobile-first; light colour theme.

## 2. data

- **DAT-1** Weather from Open-Meteo's Forecast API (`api.open-meteo.com/v1/forecast`) in a single request — `past_days=10`, `forecast_days=15`, `timezone=Europe/Amsterdam` — giving 10 past days + today + 14 forecast days (25 days total). Daily variables: `precipitation_sum` (rain), `temperature_2m_max` (°), `et0_fao_evapotranspiration` (reference water loss, fetched ready-made — never computed in the browser). Each day's weekday is derived from its date string for display labels.
- **DAT-2** Sprinkler rate, 0.063 mm/min (3.78 mm/hr gross), from BL4.0 / 180° nozzle (Hunter I-20).
- **DAT-3** If the weather request fails, the screen shows a clear unavailable/error state rather than estimated, stale, or zero-filled data — no silent fallback.

## 3. logic

- **LOG-1** Daily: tank level = previous level + gains − losses. Tank size = water the soil holds per metre of depth × root depth. All levels are tracked as plant-available water. Any control change re-runs the whole balance.
- **LOG-2** Losses = reference evapotranspiration × crop coefficient × sun-exposure factor (no water-stress throttle — losses do not slow as the soil dries). Total available water TAW = tank size (LOG-1).
- **LOG-3** Gains = rainfall × effectiveness (0.8) + applied watering × efficiency (0.9).
- **LOG-4** Sun exposure scales losses by a single constant per setting (LOG-2): shaded soil dries slower, full sun fastest. Factors are a property of the selected sun-exposure preset (CTR-6).
- **LOG-5** Refill point = 50% of tank size (TAW): below it the soil should be watered. The soil is treated as effectively empty at 5% of tank size. These two thresholds drive the status verdict (UIX-7).

## 4. controls

- **CTR-1** The user can record or plan a watering on each day, past or future, as one instant, fast, obvious, and reversible action on phone, so what-if exploration isn't a chore. Watering duration (minutes, default 60), adjusted in ±15-minute steps over a 15–240 minute range.
- **CTR-3** Planting type → preset crop coefficient, root depth. Presets: Turf (Kc 0.85, 0.15 m) · Flower bed (0.90, 0.30 m) · Shrubs (0.70, 0.50 m). Kc is a single constant per planting.
- **CTR-4** Soil type → plant-available water held per metre (field capacity − wilting point). Presets: Sand 60 · Sandy loam 130 · Loam 170 · Clay 190 mm·m⁻¹.
- **CTR-5** On load the screen defaults to planting = Flower bed, soil = Sandy loam, sun exposure = Full sun.
- **CTR-6** Sun exposure → preset loss factor (LOG-4). Presets: Shade 0.5 · Half sun 0.75 · Full sun 1.0.

## 5. ux/ui

- **UIX-1** Aesthetic: Calm & natural — soft greens/blues/earth tones, friendly, reassuring.
- **UIX-2** The user can grasp the soil-moisture trend across the most relevant window at a glance, without reading individual day values.
- **UIX-3** The user can clearly see why the level changes, not just that it changed, in the same glance, without reading individual day values.
- **UIX-4** Soil Cross-Section — the graph is a soil column: water held inside an earth/soil block with a surface line. The drawn column spans only the planting's root zone (column depth = root depth), so each planting shows just the soil its roots draw from. The block is rendered as realistic O/A/B soil horizons, each soil type carrying its own colour and grain texture (speckle/pebble). Above the surface: sun, rain, watering, and flowers; below the surface, roots filling the column, shown strong or weak by soil moisture. Distinctive metaphor.
- **UIX-5** The graph is full viewport width and has horizontal scroll. It shows ~9 days without scrolling.
- **UIX-6** The balance computes at full precision; the cross-section conveys temperature, sun/ET, rain, and watering as glyphs rather than numbers (per UIX-2/UIX-3). The only on-screen numbers are today's status readout — fullness as an integer %, and water held / capacity as integer mm — display-rounded only.
- **UIX-7** Status verdict — one headline drives action (SCO-1), set by the LOG-5 thresholds: at/below the empty threshold → *Water today*; below the refill point → *Water now*; above the refill point → *Water tomorrow* (one day until the projected level first drops below the refill point) or *Water in N days* (N such days, capped at the window end with a `+`). Tone escalates calm → warn → urgent as the verdict sharpens (≥2 days = calm, tomorrow = warn, now/today = urgent). The headline pairs with the fullness % and the held / capacity mm readout (UIX-6).

## 6. non-goals

- **NON-1** Showing additional values and data specifically for today.
