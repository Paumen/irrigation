---
subject: Controller (RainMachine HD-16 TOUCH)
root_cause_area: R2
serves: [troubleshooting, test]
coverage: partial
summary: Partial — only the voltage-at-terminals test so far; no local RainMachine HD-16 detail yet.
read_when: checking whether the controller outputs 24–28 VAC on a station; isolating controller vs downstream. For firmware, cloud, config, or hardware faults, fall to sources.md (RainMachine support, then web).
contents:
  - coverage note (what's missing)
  - testing voltage at controller terminals (24–28 VAC, probe placement)
  - interpretation (present / 0 V / low-fluctuating)
  - controller-vs-wire swap check
---

# Controller — RainMachine HD-16 TOUCH

**Coverage note.** The only controller content sourced so far is the voltage-at-terminals test
below (carried in from the valve material). There is no local detail yet on the RainMachine HD-16
itself — firmware, config, cloud/Wi-Fi, hardware/power faults. For those, fall back per `sources.md`:
RainMachine support (https://support.rainmachine.com/) first, then web. Treat this file as a stub
that will grow when those sources are ingested.

## Testing voltage at the controller terminals

![Multimeter at controller reading ~26 VAC](media/24 VAC_Showing 26VAC.png)

![Probes on the C and station terminals at the controller](media/pgv_not_opening_2.png)

Irrigation valves are driven by a 24 VAC signal from the controller. Although it is low voltage,
Hunter still recommends a trained person perform these tests.

Method (AC-voltage setting):
- Activate the station you want to test.
- Touch one probe to that **station terminal** and the other to the **C / COM** terminal.
- Polarity does not matter for AC; for consistency, use the black probe on C and the red probe on
  the station terminal.
- Expect **24–28 VAC** with the station active. (~26 VAC, as shown, is normal.)

Interpretation:
- **24–28 VAC present** → controller is delivering signal; move downstream (wiring, then solenoid).
- **0 V** → no controller output on that station (controller hardware/config, or no power).
- **Low / fluctuating** → suspect the conductor or a poor connection on that run (`wiring.md`).

A quick cross-check: swap the suspect station's wire to a known-good terminal at the controller. If
the problem follows the wire, it is downstream; if it stays on the terminal, it is the controller.

## See also
- `wiring.md` — conductor runs, continuity, swap-wire test.
- `valve-solenoid.md` — voltage and resistance at the valve end.
