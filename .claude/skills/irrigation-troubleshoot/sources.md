# Sources for the irrigation-troubleshoot skill

Use these in this priority order. Prefer local PDFs over web fetches whenever a component matches.

## Local vendor documentation (read directly with the Read tool)

PDFs and `.doc` files in `media/` cover most of the installed hardware. The Read tool handles PDFs natively; for `.doc` you may need to fall back to the PDF equivalent listed in the same row.

| Component (per `setup.yaml`) | Primary | Also |
|---|---|---|
| Hunter PGV-101G zone valves | `media/PGV101G.pdf` | — |
| Hunter PSR 52 pump start relay | `media/PSR52.pdf` | — |
| Hunter I-20-04-SS rotors | `media/I20.pdf` | `media/hi-045-ss-written_specs-i-20_rotor_final_0.doc` |
| Hunter Pro-Spray PRS40 spray bodies | `media/ProSpraytm PRS40.pdf` | `media/WS_ProSprayPRS40.doc` |
| Hunter MP Rotator nozzles | `media/Standard MP Rotator Nozzle.pdf` | `media/RC-219-MP820-IR-MP-Rotator-Nozzle-Written-Specifications-FINAL-100924.pdf` |

## WebFetch / We Search when needed

Use only when the engine catalogue has no leverage and the local PDFs don't cover the symptom.

- **RainMachine HD-16 TOUCH controller** — start at https://support.rainmachine.com/.
- **Hunter Industries support** — https://www.hunterindustries.com/support — vendor-authored troubleshooting for valves, rotors, controllers, sensors.
- **IrrigationTutorials.com** — articles by Jess Stryker (irrigation engineer); strong on design, hydraulics, and common-failure patterns.

## What not to cite

- Search results older than ~10 years.
