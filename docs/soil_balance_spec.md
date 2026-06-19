# Soil-Balance Tool — Requirements

A single-screen tool that judges irrigation need for one fixed location by
modelling soil moisture against recent and forecast weather, and watering.

Requirements have a stable ID + one plain sentence. IDs are permanent: a
removed requirement's ID is retired (never reused), and nothing is renumbered.

## 1. Purpose & context

- **PUR-1** Offer a single-screen tool that *helps the user judge* irrigation need visually (no automated verdict) for one fixed location, by modelling soil moisture against recent and forecast weather, and watering.
- **PUR-2** Let the user try "what-if" watering on any day and see the soil response immediately.
- **PUR-3** Replace gut-feel scheduling with a grounded, tunable estimate that is realistic by default rather than optimistic. *(inferred)*
- **PUR-4** One user, one watering zone, one built-in site (Vormersesluisweg 3A, Wijchen).

## 2. Data & time window

- **DAT-1** All weather comes from a single daily Open-Meteo forecast, in local (Amsterdam) time.
- **DAT-2** It uses rainfall, temperature, and reference evapotranspiration.
- **DAT-3** Each load fetches 32 days before today plus 16 forecast days, live in the browser.
- **DAT-4** The chart shows 18 days by default: the last 9, today, and the next 8.
- **DAT-5** Fetched days that fall before the shown window act as a run-up to settle the soil estimate.

## 3. Soil model & watering rate (Logic)

- **MOD-1** Each day the reservoir is updated as previous level + the day's gains − the day's losses, then clamped between empty and full.
- **MOD-2** Gains are rainfall at 90% effectiveness plus applied watering reduced by the watering-efficiency factor.
- **MOD-3** Losses are reference evapotranspiration scaled by growth thirstiness (the crop coefficient, set by the planting type — UI-9).
- **MOD-4** *(retired from Logic; relocated to UX — see §4.)*
- **MOD-5** Applied watering in mm equals the day's watering minutes × a fixed precipitation-rate constant, baked in from one offline `sim/` run for the installed head (not computed in the page).
- **MOD-6** Below the stress threshold the daily loss tapers as the soil dries (the FAO-56 stress coefficient Ks), so demand eases under stress.
- **MOD-7** Reservoir size equals the soil's water-held-per-depth (UI-5) × the plant's root depth (UI-9); changing either updates it.

## 4. Display & interaction (UX)

- **UI-1** Soil moisture is the main line across the window; the daily water balance is shown as a waterfall chart; mean temperature appears as a number per day, not a line.
- **UI-2** Clicking a day toggles watering: first click applies the dose, second click cancels it.
- **UI-3** Watering can be set on past as well as future days.
- **UI-4** The amount added per click is set by the watering-duration control (in minutes).
- **UI-5** The soil-type control sets the soil's water-held-per-depth.
- **MOD-4** Each day's level is shown as a percentage of reservoir capacity. *(display rule; ID retained from its original home in §3.)*
- **UI-6** The chart can scroll/pan beyond the default 18-day window into the fetched-but-hidden forecast days.
- **UI-7** A horizontal marker line is drawn at the stress threshold — a visual reference only; it drives nothing.
- **UI-8** *(retired — there is no standalone growth-thirstiness control; the planting type owns it, UI-9.)*
- **UI-9** The planting-type control sets a preset for the plant's water draw (crop coefficient), root depth, and stress threshold; default is turf.

## 5. Defaults & build

Default settings (realism built in):

| Setting | Default | Source |
|---|---|---|
| Planting type | turf → crop coefficient ≈ 0.9, shallow root depth, stress threshold 50% depletion | UI-9 preset (FAO-56 turf figures) |
| Soil type | sandy → low water-held-per-depth | UI-5 |
| Reservoir size | ≈ 25 mm usable (= sandy water-per-depth × shallow turf root) | derived, MOD-7 |
| Watering efficiency | 75% | evaporation, drift, run-off on sand |
| Rainfall effectiveness | 90% | owned by MOD-2 |
| Precipitation rate | 0.063 mm/min (3.78 mm/hr gross) | sim run, see provenance below (MOD-5) |
| Default watering dose | 60 min (~2.8 mm net) | practical single rotor run; adjustable via UI-4 |
| Nozzle / arc | BL4.0 / 180° (Hunter I-20) | the installed head; basis for the precip rate |

**Precipitation-rate provenance (MOD-5).** Produced by one offline `sim/`
solve of the Z2 zone with the rotor set to BL4.0 / 180°: inlet 2.83 bar →
14.5 L/min, 12.1 m throw → 3.78 mm/hr gross over the wetted sector =
**0.063 mm/min**. After the 75% efficiency that is 0.047 mm/min net into the
soil. Re-run `sim/` and update this constant if the head changes.

- **BLD-1** A single self-contained web page — no build step, framework, server, or local computation; deployable as a static page (GitHub Pages). The precipitation rate is precomputed (MOD-5), so no hydraulics run in the browser.
- **BLD-2** Nothing is saved; all settings reset on reload.

## Non-goals

- No automated water/skip verdict — the tool supports a *visual* judgment only (PUR-1).
- No persistence — settings reset on reload (BLD-2), to keep it a zero-backend static page.
- One user / one zone / one site (PUR-4); no location picker and no multi-zone scheduling.
- No live in-browser hydraulics — the precipitation rate is baked in from the sim (MOD-5, BLD-1).
- No fault/failure modelling — healthy system only.

## Open

- None blocking. The default watering dose (UI-4, 60 min) is a soft default and may be revisited; it is freely adjustable and locks nothing.
