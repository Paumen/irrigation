# Soil-Balance mockups

UI interpretation partials for the Soil-Balance Tool spec (`docs/soil_balance_spec.md`).
Not the app — each sheet checks the look of specific UI requirements.

- `UI1-UI7-screen` — main single screen: soil-moisture line + daily-balance
  waterfall + per-day mean-temp numbers (UI-1), stress-threshold marker and
  band (UI-7), click-to-water dose (UI-2/UI-4), soil/planting presets with the
  derived reservoir readout (UI-5/UI-9), 18-day window with pan hint (DAT-4/UI-6).
  Data is illustrative.

SVG sources live in `svg/`; rendered PNGs sit at this directory's root.
Regenerate with `python3 gen.py` (`pip install cairosvg`).
