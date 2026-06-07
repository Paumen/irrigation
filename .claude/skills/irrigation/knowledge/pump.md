---
subject: Pump
failure_mode_area: F5
serves: [troubleshooting, install, maintain, how-it-works, capacity]
summary: DAB AquaJet / AquaJet-INOX self-priming automatic booster set reference — what it is, technical/electrical data per model, head-vs-flow curves, install, electrical connection, start-up & priming, operating precautions, maintenance, cable replacement, pressure-switch & tank pre-charge setup, and a full troubleshooting table. This system's pump is the AquaJet 132 M.
read_when: engine points at the pump (F5); pump won't start / hums / won't prime / won't build pressure; short-cycling or won't stop; setting pressure-switch cut-in/cut-out or tank pre-charge; replacing the power cable; sizing/choosing an AquaJet model; winterising (drain the pump body). For the relay that switches mains to the pump → relay.md (F4). For the 24 V control path → controller.md (F2).
contents:
  - what the AquaJet / AquaJet-INOX booster set is (Jet pump + 20 L tank + pressure switch)
  - technical data range and per-model electrical data (P1/P2, current, run capacitor µF/V)
  - head-vs-flow performance table for the whole AquaJet family
  - materials (AquaJet cast iron vs AquaJet-INOX stainless)
  - pre-checks, installation, electrical connection
  - start-up & priming (never run dry), operating precautions (20 starts/hour, frost drain)
  - maintenance & cleaning, spare parts, replacing the supply cable
  - pressure-switch & tank pre-charge setup (cut-in/cut-out, pre-charge 0.2 bar below cut-in)
  - the two DAB FAQ items (3-phase rotation; cable replacement)
  - full troubleshooting table (won't start / hums / won't prime / low flow / vibration / won't stop / short-cycles)
  - quick reference card
---

# DAB AquaJet / AquaJet‑INOX — Service & Reference Guide

> **What this is.** A consolidated, single‑file reference for the DAB **AquaJet** and **AquaJet‑INOX** self‑priming automatic booster sets: what they are, how to install and start them, routine maintenance, pressure‑switch setup, and a full troubleshooting table. Compiled from the DAB FAQ, the DAB **Jet / K / KM** installation & maintenance manual (the AquaJet is a Jet pump pre‑assembled with accessories, so DAB refers you to that manual), the DAB pressure‑switch instruction sheet, and the AquaJet technical datasheet. Units are metric. See **Sources** at the end.

> ⚠️ **Safety first.** Installation, electrical work and servicing must be done by competent people following the safety rules in force in your country (in NL: the relevant NEN/IEC electrical regulations). Always isolate the pump from the mains before any work. Never run the pump dry. Ignoring the safety rules can injure people, damage the unit, and void the warranty.

---

## 1. What the AquaJet is

The AquaJet and AquaJet‑INOX are **pre‑assembled, automatic pressurisation (booster) sets** for domestic water supply, small‑scale agriculture and garden/irrigation use. Each set is shipped ready to install and combines:

- a **self‑priming Jet centrifugal pump** (cast‑iron body on AquaJet; stainless‑steel body on AquaJet‑INOX),
- a **20‑litre diaphragm expansion (pressure) vessel**,
- a **pressure switch** for fully automatic start/stop,
- a **pressure gauge**, and
- a **power cable with plug**, plus the **fittings kit** between pump and tank.

Because the wet end is a standard **Jet** pump, the underlying installation, start‑up, maintenance and troubleshooting procedures are exactly those of the DAB Jet pump — that is what this guide reproduces, adapted to the AquaJet package.

**Key characteristics**

- Self‑priming, and tolerant of some entrained air (and minor sandy impurities in the INOX version).
- Designed for **clean water**, free of explosive substances, solids, abrasives and fibres, and chemically non‑aggressive liquids.
- Must be installed **horizontally** in a dry, ventilated, frost‑protected location.

---

## 2. Technical data (range)

| Parameter | Value |
|---|---|
| Supply voltage (M models) | 1 × 220–240 V, 50 Hz (single‑phase) |
| Motor protection | Built‑in thermal overload with automatic reset (single‑phase) |
| Insulation / motor class | F |
| Pumped liquid temperature | 0 °C to +35 °C |
| Max. ambient temperature | +40 °C |
| Max. operating pressure (booster set) | 8 bar (800 kPa) — individual Jet pump body rated 6 bar |
| Operating range (whole AquaJet family) | up to ≈ 5.4 m³/h, head up to ≈ 61 m |
| Expansion vessel | 20 L, butyl diaphragm |
| Suction / delivery connections (DNA / DNM) | 1″ GAS / 1″ GAS |
| Max. relative air humidity (storage) | 95 % |
| Storage temperature | within the +40 °C ambient limit; protect from frost |

> The "M" suffix = single‑phase motor. The whole AquaJet **M** range is single‑phase; there is no three‑phase AquaJet booster set in this family (relevant to the three‑phase rotation question in §13).

### 2.1 Electrical data per model

| Model | Voltage (50 Hz) | P1 max (kW) | P2 nominal (kW) | P2 (HP) | In (A) | Run capacitor (µF / V) |
|---|---|---|---|---|---|---|
| AquaJet 82 M  | 1×220–240 V | 0.85 | 0.60 | 0.80 | 3.8 | 12.5 / 450 |
| AquaJet 92 M  | 1×220–240 V | 0.94 | 0.75 | 1.00 | 4.2 | 14 / 450 |
| AquaJet 102 M | 1×220–240 V | 1.13 | 0.75 | 1.00 | 5.1 | 16 / 450 |
| AquaJet 112 M | 1×220–240 V | 1.40 | 1.00 | 1.36 | 6.2 | 25 / 450 |
| AquaJet 132 M | 1×220–240 V | 1.49 | 1.00 | 1.36 | 6.6 | 25 / 450 |

*AquaJet‑INOX models share the same motor/electrical data as the matching AquaJet model; only the wet‑end materials and weights differ.*

### 2.2 Approximate weights

| Model | AquaJet (cast iron) | AquaJet‑INOX (stainless) |
|---|---|---|
| 82 M  | ~18.2 kg | ~15.3 kg |
| 92 M  | ~19.2 kg | — |
| 102 M | ~20.0 kg | ~17.1 kg |
| 112 M | ~21.0 kg | — |
| 132 M | ~21.0 kg | — |

---

## 3. Performance (head H vs. flow Q)

Approximate delivery head in metres at the listed flow. Use it to confirm a model will reach your required pressure at your required flow (1 bar ≈ 10.2 m of head).

| Flow Q (m³/h) → | 0.6 | 1.2 | 1.8 | 2.4 | 3.0 | 3.6 | 4.2 | 4.8 |
|---|---|---|---|---|---|---|---|---|
| **(l/min)** | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 |
| AquaJet 82 M  | 47   | 40   | 34   | 30   | 26.2 | 23.5 | 20.3 | — |
| AquaJet 92 M  | 36.2 | 33.5 | 31   | 28.4 | 26   | 24   | 21.8 | 17.5 |
| AquaJet 102 M | 53.8 | 47   | 41   | 36.3 | 32.4 | 28.8 | 25.8 | — |
| AquaJet 112 M | 61   | 54   | 47.8 | 42.8 | 38.8 | 34.8 | 22   | — |
| AquaJet 132 M | 48.3 | 45.6 | 42.8 | 40   | 37.6 | 35   | 32.5 | 27.2 |

(AquaJet‑INOX head figures are effectively identical to the AquaJet equivalents.)

**Reading it for irrigation:** the **82/102/112** are higher‑head / lower‑flow (good when you need pressure for rotors/sprays but lower total flow); the **92/132** push more flow at moderate head (good for higher‑flow zones). Pick the model whose head at your *peak zone flow* still exceeds your required operating pressure plus pipe and elevation losses.

---

## 4. Materials

| Part | AquaJet | AquaJet‑INOX |
|---|---|---|
| Pump body | Cast iron | Stainless steel |
| Impeller / diffuser | Technopolymer | Technopolymer |
| Motor bracket / housing | Die‑cast aluminium | Die‑cast aluminium |
| Mechanical seal | Carbon / ceramic | Carbon / ceramic |
| Tank diaphragm | Butyl | Butyl |
| Tank internal capsule | Polypropylene | Polypropylene |

---

## 5. Before you start — pre‑checks

1. **Read the rating plate.** Confirm the supply voltage matches the motor plate value.
2. **Check the shaft turns freely.** With the unit unpowered, pop off the fan cowl at the rear of the motor and turn the shaft slot with a screwdriver (the cooling‑fan side). If it's stiff or seized, gently tap the screwdriver with a hammer to free it before going further. A blocked shaft will trip the motor on start.
3. **Inspect for transport damage** and confirm the tank pre‑charge valve cap is in place.
4. **Plan the location:** dry, well ventilated, **frost‑free**, ambient ≤ 40 °C, on a firm level base.

---

## 6. Installation

1. **Mount horizontally** on a solid, level surface and **anchor it down** — firm anchoring damps the vibration the pump produces and keeps noise down.
2. **Keep the pump as close to the water source as practical.** The shorter and straighter the suction run, the better the priming and the lower the losses.
3. **Pipe sizing:** suction and delivery pipe internal diameters must be **at least** as large as the pump ports (1″). For suction lifts over ~**4 m**, or long horizontal suction runs, use a **larger‑diameter suction pipe** than the port.
4. **Suction slope:** run the suction line with a slight, continuous **upward slope toward the pump** so air can't collect in pockets along it. Any downward dip will trap air and stop the pump priming.
5. **Foot valve:** fit a **foot valve (non‑return) at the suction inlet**. It holds the prime and keeps grit out. On a deep well it should sit well above the bottom so it doesn't draw sand/mud.
6. **Don't let the pipework load the pump ports.** Support metal pipe independently so its weight/thermal movement can't deform or crack the pump connections.
7. **Flexible suction hose:** if you use rubber/flexible hose on suction, use the **reinforced type** so suction vacuum can't collapse it.
8. The well or source must reliably supply enough water; if the water level can draw down below the pump's rated suction depth you'll lose prime and risk damage.

---

## 7. Electrical connection

> ⚠️ **Electric shock can be fatal.** Have all electrical work done by a qualified electrician, to the current national/local wiring rules. A faulty motor or winding can make the pump body or surrounding water live.

1. **Verify mains voltage = motor‑plate voltage** before connecting.
2. **Earth/ground the pump** properly to the supply earth terminal — this is mandatory. Above‑ground metal plumbing should also be bonded as required by local code.
3. **Fixed installations** require an **isolating switch with a fuse base** (or equivalent), so the pump can be fully disconnected.
4. **Single‑phase (M) motors** have built‑in thermal overload protection (auto‑reset) and connect directly to the mains.
5. If the unit is **plug‑connected** and the circuit uses an RCD/earth‑leakage breaker as additional protection, that device must be of the correct, properly marked type and **correctly sized**. Where the supply is hard‑wired without a plug, a disconnecting device must be built into the fixed wiring with contact separation of at least **3 mm per pole**.
6. **Follow the wiring diagram** printed inside the pressure‑switch / terminal box.

---

## 8. Start‑up & priming

> 🚫 **Never start the pump unless its body is completely full of water.** Dry running destroys the mechanical seal — quickly and irreversibly.

1. Remove the **filler/priming cap** on the pump body.
2. **Fill the pump body completely with clean water** (and, on a suction lift, fill the suction line too if it isn't self‑holding). This lubricates the mechanical seal and lets the pump start working straight away.
3. Refit and **tighten the filler cap** carefully.
4. Energise the pump. It should prime within a short time. If it runs but doesn't pick up water, stop and check for a suction‑side air leak, a wrong (downward) suction slope, or an empty/blocked foot valve, then re‑prime.
5. **After any long shutdown**, repeat the fill‑and‑prime steps before restarting.

---

## 9. Operating precautions

- **Start frequency:** don't exceed **20 starts per hour** — more than that thermally stresses the motor. On a booster set, frequent short‑cycling usually means a pressure‑switch / tank pre‑charge problem (see §10 and §12).
- **Frost risk (important in NL winters):** if the pump will sit idle below **0 °C**, **drain the pump body** via the drain cap to prevent the hydraulic parts cracking. Draining is also wise for any long idle period even at normal temperatures.
- **Operate within the plate data.** Running past the rated head/flow causes vibration, cavitation and premature wear.

---

## 10. Maintenance & cleaning

In normal service the pump needs **no specific maintenance**. Beyond that:

- **When performance drops**, the hydraulic parts (impeller, diffuser, foot valve) may need cleaning. The pump should only be dismantled by qualified personnel.
- **Always disconnect from the mains** before any repair or maintenance.
- **Routine sensible checks** (do with power off): keep the suction inlet/strainer and foot valve clean; check and re‑tighten pipe and fitting connections; look for leaks at the mechanical seal / tank flange; clear any debris around the motor fan cowl so cooling isn't blocked.
- **Tank (expansion vessel):** periodically verify the air pre‑charge (see §12.2). A waterlogged or wrongly charged tank is the most common cause of rapid cycling.
- **Capacitor:** a motor that hums but won't start, or starts very slowly, often has a failed run capacitor — see the per‑model µF/V rating in §2.1.

---

## 11. Spare parts & replacing the power cable

- Use **original spare parts** and **DAB‑approved accessories** only; unauthorised modifications void the manufacturer's responsibility.

### 11.1 Replacing the supply cable

> ⚠️ Confirm the pump is **disconnected from the mains** first.

1. Unscrew and remove the **pressure‑switch cover**.
2. Release the conductors from their terminals: the **yellow‑green (earth)** at the earth screw, then the **blue** and **brown** at their side terminals.
3. Loosen the **cable clamp/gland** screws and withdraw the freed cable.
4. **Fit the replacement** — it must be the **same type with the same terminations** — by reversing the steps.
5. For plug‑fitted cables, ensure a mains‑disconnecting device (e.g. a thermal‑magnetic switch) with **≥ 3 mm contact separation per pole** is present in the installation.

---

## 12. Pressure‑switch & tank setup (booster operation)

The pressure switch starts the pump at a low (**cut‑in**) pressure and stops it at a high (**cut‑out**) pressure. The 20 L tank stores pressurised water so the pump isn't triggered by every small draw.

### 12.1 Setting procedure

1. Decide the **minimum delivery pressure** you want (the cut‑in / start pressure at the pump outlet).
2. Set the **tank air pre‑charge** to **0.2 bar below** that cut‑in pressure (see 12.2 for how).
3. Calibrate the switch's start and stop values following the diagram/label inside the pressure box, **checking against the gauge** as you go. Make sure the cut‑out you choose is within what the pump can actually deliver (suction + delivery head), or the pump will never stop.

> Note: some English‑translated DAB manuals print this offset as "42 psi," which is a unit‑conversion artifact. The correct DAB figure is **0.2 bar** below cut‑in (≈ 3 psi). General good practice is anywhere from 0.15–0.3 bar / 2–5 psi below cut‑in.

### 12.2 Checking / setting the tank air pre‑charge

1. **Switch off and isolate** the pump.
2. **Drain all water out of the tank** (open a tap/drain until pressure reads zero) — the pre‑charge can only be measured/set on an **empty** tank.
3. With a tyre‑type gauge, read the air pressure at the tank's Schrader (car‑type) valve.
4. Add or release air until it sits **0.2 bar below your cut‑in pressure**.
5. Refit the valve cap, restore water and power, and watch a couple of cycles on the gauge to confirm clean start/stop.

**Worked example:** want water available down to **2.0 bar** → set cut‑in ≈ 2.0 bar, cut‑out ≈ 3.5–4.0 bar (within pump capability), tank pre‑charge ≈ **1.8 bar** (empty tank).

---

## 13. The two FAQ questions, answered

**"How do I check the direction of rotation of a three‑phase AquaJet motor?"**
The AquaJet/AquaJet‑INOX **M** range is **single‑phase**, so rotation direction is fixed and not user‑settable — this question only applies to three‑phase **Jet** variants (not the M booster sets). On a genuine three‑phase pump, wrong rotation shows up as poor pressure/flow; you reverse it by **swapping any two of the three supply phases** at the terminal board (power off). Before first install on any version, also confirm the shaft turns freely by hand via the fan‑cover slot (§5, step 2).

**"Can I replace the power supply cable?"**
Yes — see **§11.1**. Disconnect from mains, open the pressure‑switch cover, release earth/blue/brown and the cable clamp, and fit a same‑type cable with the same terminations in reverse order.

---

## 14. Troubleshooting

Work top‑down: each fault lists the things to check (likely cause) and the fix. **Isolate the pump before touching anything electrical or mechanical.**

### 14.1 Motor doesn't start, no sound
| Check (likely cause) | Remedy |
|---|---|
| Electrical connections | Re‑make any loose/incorrect connections |
| Motor actually energised | Restore supply to the motor |
| Protection fuses | Replace if blown — *if they blow again immediately, the motor is shorting; stop and have it checked* |
| Pressure switch energised | Restore supply to the switch |
| Tank pre‑charge higher than the switch's cut‑in | Drop pre‑charge to **0.2 bar below** cut‑in |

### 14.2 Motor doesn't start but hums/makes noise
| Check (likely cause) | Remedy |
|---|---|
| Mains voltage vs. plate value | Correct the supply |
| Connections wired correctly | Fix wiring errors |
| (3‑phase only) all phases present at terminal board | Restore the missing phase |
| Pump or motor blocked / shaft seized | Clear the blockage / free the shaft (§5) |
| Run capacitor failed | Replace with correct µF/V (§2.1) |

### 14.3 Motor turns with difficulty
| Check | Remedy |
|---|---|
| Supply voltage too low | Correct the supply / wiring |
| Rotating parts rubbing on fixed parts | Find and eliminate the source of the rubbing |

### 14.4 Pump doesn't deliver
| Check | Remedy |
|---|---|
| Not primed correctly | Re‑prime (§8) |
| Suction pipe diameter too small | Fit a larger‑diameter suction pipe |
| Foot valve blocked | Clean the foot valve |

### 14.5 Pump won't prime
| Check | Remedy |
|---|---|
| Suction pipe or foot valve drawing in air | Find and seal the air leak, then re‑prime |
| Suction line slopes downward (air pockets form) | Re‑lay the suction line with a slight upward slope to the pump |
| Pump body not filled | Fill the pump body fully and re‑prime |

### 14.6 Flow is insufficient
| Check | Remedy |
|---|---|
| Foot valve blocked | Clean it |
| Impeller worn or blocked | Clear obstructions or replace worn parts |
| Suction pipe diameter too small | Fit a larger‑diameter suction pipe |

### 14.7 Pump vibrates / runs noisily
| Check | Remedy |
|---|---|
| Pump or pipes not firmly anchored | Re‑secure loose parts |
| Cavitation (demand exceeds what the pump can draw) | Reduce suction lift / check for suction‑side losses |
| Running above the plate characteristics | Throttle the delivery to limit flow |

### 14.8 Motor won't stop after demand ends
| Check | Remedy |
|---|---|
| Switch cut‑out set higher than the pump can reach (suction + delivery) | Lower the cut‑out setting |
| Pressure‑switch contacts sticking | Replace the pressure switch |

### 14.9 Pressure switch starts/stops rapidly (short‑cycling) during normal draw
| Check | Remedy |
|---|---|
| Switch differential set too low | Raise the settings until it stops cycling; then re‑set the minimum (cut‑in) pressure |
| Tank diaphragm ruptured / tank pre‑charge wrong | Re‑set pre‑charge (§12.2); if the diaphragm is torn, replace the tank/bladder |

> **Sensitive‑topic note:** none here — but if you ever smell burning, see scorched plastic, pitted/melted contacts, or a fuse that re‑blows instantly, **stop using it and have it inspected**; those point to a short or failed switch rather than something to keep adjusting.

---

## 15. Quick reference card

| Item | Value / action |
|---|---|
| Supply (M range) | 1×220–240 V, 50 Hz, single‑phase, earthed |
| Connections | 1″ GAS suction & delivery |
| Tank | 20 L, butyl diaphragm |
| Max operating pressure | 8 bar (set) / 6 bar (pump body) |
| Liquid temp | 0–35 °C; ambient ≤ 40 °C |
| Max starts/hour | 20 |
| Suction lift hint | use larger suction pipe over ~4 m lift |
| Before start | fill pump body completely — never run dry |
| Tank pre‑charge | 0.2 bar **below** cut‑in, tank **empty** |
| Frost | drain the pump body if idle below 0 °C |
| Any service | isolate from mains first |

---

## Sources

- DAB **Jet / K / KM** *Instructions for Installation and Maintenance* (DAB Pumps, doc. 001360032) — installation, electrical connection, start‑up/priming, precautions, maintenance, cable replacement, pressure‑switch setting, full troubleshooting table.
- DAB **AquaJet / AquaJet‑INOX** technical datasheets (DAB Pumps) — models, electrical data, performance curves, dimensions, materials, weights.
- DAB **Pressure Switch** instruction sheet (DAB Pumps) — pre‑charge = 0.2 bar below minimum (cut‑in) pressure, tank drained.
- DAB product page, *Aquajet, Aquajet Inox* — booster‑set composition, 20 L vessel, operating range (≈ 5.4 m³/h / 61 m), max pressure 8 bar.
- DAB **D.Service** FAQ, *AquaJet, AquaJet‑INOX troubleshooting* — the FAQ items reproduced and expanded here.

*General pressure‑switch / pre‑charge practice cross‑checked against independent pump‑service references. Figures are nominal and DAB may revise specifications without notice — always defer to the rating plate and the manual shipped with your unit.*
