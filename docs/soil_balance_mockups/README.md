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

SVG sources live in `svg/`; rendered PNGs sit at this directory's root.
Regenerate with `python3 gen.py` (`pip install cairosvg`).
