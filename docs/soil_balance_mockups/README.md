# Soil-Balance mockups

UI interpretation partials for the Soil-Balance Tool spec (`docs/soil_balance_spec.md`).
Not the app — each sheet checks the look of specific UI requirements.

- `UI1-UI7-screen` — main single screen: root-zone saturation cross-section
  (UI-1) with planting + roots (UI-12), daily-balance bars split into decline /
  rain / watering (UI-10), per-day daily-max-temp numbers (UI-11), rain/watering
  droplets (UI-13), today's % callout (UI-14), stress-threshold marker (UI-7),
  click-to-water dose (UI-2/UI-4), soil/planting presets with the derived
  reservoir readout (UI-5/UI-9), 18-day window with pan hint (DAT-4/UI-6).
  Data is illustrative.
- `UI2-UI3-whatif` — the what-if interaction as a before&#8594;after pair:
  clicking a future day that has dipped below the stress line applies a 60-min
  dose, and the soil response is shown immediately (PUR-2) — the day lifts back
  over the line and every day after rides higher in a shaded band that fades as
  the soil dries again. Checks UI-2 (click toggles watering), UI-3 (works on a
  future day), UI-4 (dose from the duration control), MOD-1 (reservoir re-rolled
  forward), MOD-6 (loss eases under stress, so the lines re-converge), UI-7
  (stress threshold). Data is illustrative.

SVG sources live in `svg/`; rendered PNGs sit at this directory's root.
Regenerate with `python3 gen.py` and `python3 gen_whatif.py` (one sheet each;
`pip install cairosvg`).
