# Sources for the irrigation-troubleshoot skill

Use these in this priority order. Prefer local PDFs over web fetches whenever a component matches.

## Local vendor documentation (read directly with the Read tool)

PDFs and `.doc` files in `media/` cover most of the installed hardware. The Read tool handles PDFs natively; for `.doc` you may need to fall back to the PDF equivalent listed in the same row.

| Component (per `system.yaml`) | Primary | Also |
|---|---|---|
| Hunter PGV-101G zone valves | `media/PGV101G.pdf` | — |
| Hunter PSR 52 pump start relay | `media/PSR52.pdf` | — |
| Hunter I-20-04-SS rotors | `media/I20.pdf` | `media/hi-045-ss-written_specs-i-20_rotor_final_0.doc` |
| Hunter Pro-Spray PRS40 spray bodies | `media/ProSpraytm PRS40.pdf` | `media/WS_ProSprayPRS40.doc` |
| Hunter MP Rotator nozzles | `media/Standard MP Rotator Nozzle.pdf` | `media/RC-219-MP820-IR-MP-Rotator-Nozzle-Written-Specifications-FINAL-100924.pdf` |

## Components without local docs (WebFetch when needed)

- **RainMachine HD-16 TOUCH controller** — start at https://support.rainmachine.com/ ; locate the HD-16 product page and pull the specific manual or troubleshooting article.
- **DAB Jet well pump** — start at https://www.dabpumps.com/ ; locate the Jet series datasheet for flow / pressure / electrical specs.

## Trusted reference sites (WebSearch first, then WebFetch the specific page)

Use only when the engine catalogue has no leverage and the local PDFs don't cover the symptom.

- **Hunter Industries support** — https://www.hunterindustries.com/support — vendor-authored troubleshooting for valves, rotors, controllers, sensors.
- **Rain Bird support** — https://www.rainbird.com/support — adjacent vendor, useful for general valve / solenoid / hydraulic concepts.
- **IrrigationTutorials.com** — articles by Jess Stryker (irrigation engineer); strong on design, hydraulics, and common-failure patterns.

## What not to cite

- Homeowner Q&A threads (Reddit, garden forums, generic DIY sites) — anecdote, not evidence. Read for ideas, don't quote as authority.
- Vendor brochures that promise outcomes without procedure — useless for diagnosis.
- Search results older than ~10 years for products still on the market — vendor docs supersede them.
