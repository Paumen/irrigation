# Soil-Balance mockups

UI interpretation partials for the Soil-Balance Tool spec (`docs/soil_balance_spec.md`).
Not the app — each sheet checks the look of specific UI requirements.

- `UI1-UI7-screen` — main single screen: root-zone saturation cross-section
  with sun on top (UI-1), planting + roots (UI-12), daily-balance bars split into decline /
  rain / watering (UI-10), per-day daily-max-temp numbers (UI-11), rain/watering
  droplets (UI-13), today's % callout (UI-14), stress-threshold marker (UI-7),
  click-to-water dose (UI-2/UI-4), soil/planting presets with the derived
  reservoir readout (UI-5/UI-9), 18-day window with pan hint (DAT-4/UI-6).
  Data is illustrative.
- `UI2-UI4-watering-what-if` — the core "what-if" interaction (PUR-2) as a
  before/after pair: a future day un-watered (curve drying past the threshold,
  dashed "click to water" marker) vs. the same day toggled on (a 60-min dose
  lifts the estimate from that day, baseline kept as a ghost, the gain shaded).
  Checks click-to-toggle watering (UI-2), watering a future day (UI-3), the
  duration→dose control (UI-4), per-day % (UI-14), stress threshold (UI-7).
  Data is illustrative.

SVG sources live in `svg/`; rendered PNGs sit at this directory's root.
Regenerate with `python3 gen.py` (main screen) and `python3 gen_whatif.py`
(what-if), both needing `pip install cairosvg`.
