---
subject: Heads (rotors, spray bodies, MP Rotator nozzles)
root_cause_area: F9
serves: [troubleshooting, replace, clean, maintain, how-it-works]
summary: Heads reference covering the three components on the head side — I-20 rotors, Pro-Spray PRS40 bodies, MP Rotator nozzles. Pressure/flow envelopes, common faults, the MP ↔ PRS40 pairing, and low-head drainage.
read_when: engine points at the heads area (F9); rotor won't pop up / won't rotate / wrong arc / wrong coverage; misting at a head; low-head drainage suspected at the lowest head; replacing a nozzle or a body.
contents:
  - I-20 rotor — features, operating envelope, common faults, nozzle racks
  - I-20 adjustment & service — arc/radius adjustment, Flo-Stop, filter cleaning, riser-seal replacement, drain check valve, shutoff/blank nozzle, capping off in-ground
  - Pro-Spray PRS40 body — 40 PSI regulation for MP, operating envelope, common faults
  - MP Rotator nozzle — operating envelope, model/colour map, common faults
  - Pairing (MP ↔ PRS40)
  - Low-head drainage (head-side vs valve-side)
---

# Heads — rotors, spray bodies, MP Rotator nozzles

The heads are the parts that actually throw water at the lawn. Three components (see `setup.yaml` for what is fitted per zone):

- **I-20 rotors** — pop-up rotors for the large open areas (long throw, slow rotation).
- **Pro-Spray PRS40 bodies** — pressure-regulated pop-up bodies (~2.8 bar / 40 PSI at the nozzle) that carry the MP nozzles.
- **MP Rotator nozzles** — multi-stream nozzles that screw into the PRS40 for tighter, slower coverage of flower beds and odd-shaped areas.

Read this when the engine narrows to F9 (rotor debris / nozzle / pressure regulator, or rotor stuck / misconfigured), when something looks wrong at one head, or when the homeowner is changing a nozzle or replacing a body. For weeping that *looks* like a head fault but might be the valve, see `valve.md` *Weeping when off* — the distinguishing test is below in *Low-head drainage*.

## I-20 rotor

![Hunter I-20 rotor — stainless riser, nozzle turret, and pop-up body.](media/rotor-i20-product.png)

Hunter's mid-range gear-drive rotor. The **I-20-04-SS** variant has a 4" pop-up height, stainless-steel riser, radius setscrew, and FloStop. The rotor's drive is non-strippable, meaning turning the turret backwards by hand will not damage internals.

### Operating envelope

- Radius: **5.2–14 m** (17–46 ft)
- Flow: **1.4–56 l/min** ≈ 0.08–3.4 m³/h (0.36–14.8 GPM)
- Recommended pressure: **1.7–4.8 bar** (25–70 PSI)
- Operating pressure: 1.4–6.9 bar (20–100 PSI)
- Precipitation rate: ~10 mm/hr (0.4 in/hr)
- Nozzle trajectory: standard 25°, low-angle 13°
- Drain check valve: holds back up to ~3 m (10 ft) of elevation
- Warranty: 5 years

![Trajectory geometry — A = angle, B = max height of spray, C = distance from head to max height](media/rotor-trajectory-chart.png)

Use the trajectory geometry to check clearance: a standard 25° nozzle at the I-20 envelope peaks around 3–4 m above grade at 6–10 m out, so a 2 m hedge or fence within ~8 m of the head will clip the stream. Switch to the grey low-angle (13°) nozzle for those spots — peaks at ~1–1.5 m height.

### Construction and variants

- Body and riser: corrosion- and impact-resistant ABS plastic; stainless-steel riser spring.
- Variants exist as shrub head, 4" plastic, **4" stainless-steel (-SS)**, 6" plastic, 6" SS, and 12" plastic. The number is the pop-up height in inches.
- Factory-installed rubber boot/cover protects the top of the body.

### Features

- **Radius adjustment setscrew** — Hunter wrench or flat-blade screwdriver; turn down to reduce radius up to ~25%.
- **Patented automatic arc return** — if the turret gets vandalized or kicked, it returns to the original arc the next time the valve calls.
- **Arc adjustable 40°–360°** in a single model (part- and full-circle in one).
- **QuickCheck arc mechanism** — through-the-top arc adjustment for fast tweaks without pulling the rotor.
- **FloStop** — closes the flow at this individual head so you can change a nozzle or do a repair without shutting the zone.
- **Stainless steel riser** (the `-SS` designator).

### Nozzle racks

The I-20 ships with multiple nozzle sets, colour-coded by category:

- **Blue** (standard): 1.5 to 8.0 — the default rack, used at recommended pressure.
- **Grey** (low-angle, 13° trajectory): 2.0 to 4.5 — for windy spots or near walls where the standard 25° throws over the target.
- **Black** (short-radius): 0.50 to 3.0 — for tight zones below ~6 m.
- **Dark green** (high-flow): 6.0 to 13.0 — for long throws on high-flow zones.
- **MPR-25 / MPR-30 / MPR-35** — matched-precipitation rates at 7.6 / 9.1 / 10.7 m radii.

Mixing nozzle sizes within a zone is how installers balance differently-sized arcs so each head finishes the design radius at the design pressure.

### Common faults

- **Won't pop up.** Debris in the well, weak riser seal, body cracked. Most often: a pebble or twig in the well. Pull the cap and clear. Low system pressure is also a candidate — check pressure at the manifold while the zone runs. Note: a worn riser seal causes *flow-by* (water flushed out as the riser starts to rise) which bleeds the pressure needed to seat the riser; Hunter rotors are designed for zero flow-by, so visible flush during pop-up = replace the riser seal + spring seat. If the whole zone is weak (not just this head): a punctured hose after recent garden / fence / driveway work is the textbook cause — see `hoses.md` *Broken-hose signature*. Could also be a partly-stuck valve diaphragm restricting flow to the zone — see `valve-internals.md`.
- **Pops up but won't rotate.** Sand or grit in the drive, or the nozzle is too small for the available pressure (a gear-drive needs flow to drive). Pull the rotor, flush in clean water, reinstall. Persistent → replace the rotor. The bottom-of-internal-assembly **filter** is the most common culprit before the drive itself — pull it with needle-nose pliers and rinse before condemning the rotor (see *Adjustment & service procedures* below).
- **Wrong arc / always 360°.** The FloStop or arc adjustment is at end-stop. Reset per the Hunter wrench instructions. Auto arc return will bring the original arc back the next time the valve calls. Don't step on or kick rotors during mowing — the impact drifts the right stop, and auto arc return is the recovery, not a license to abuse the head.

![Don't step on / kick the rotor — keep weight off the top](media/rotor-do-not-kick.png)
- **Right-side arc off (wet walkway / dry turf strip on one edge).** The fixed right stop has drifted. Reset by rotating the turret fully clockwise, then counterclockwise back to the right stop. If still misaligned, either rotate the whole body+fitting to the desired position, or unscrew the body cap, remove the internal assembly, rotate the turret to the right stop, and refit with the nozzle pointing at the start of the desired arc — then re-adjust the left arc. No need to dig the body out.
- **Uneven coverage / brown spots.** Nozzle mismatch, wrong radius set, or a downstream head is starving this one of pressure. Check pressure at the head while running.
- **Water draining from the lowest head when the system is off.** The drain check valve is missing or failed. See *Low-head drainage* below.
- **Riser stuck up after the zone shuts off.** Debris in the well or a fatigued retract spring. Clean the well; replace the spring if the body is old.
- **Leak around the riser stem (water seeping past the riser while the head runs).** Riser seal worn — common in sandy soil, sunken heads, or after extreme temperature cycles. Replaceable; see *Adjustment & service procedures*.

### Adjustment & service procedures

The I-20 carries four top callouts (visible after pulling the riser up by its lifting socket): **Lifting Socket**, **Arc Adjustment** (left dial), **Nozzle / Radius Adjustment Screw** (top centre), **Flo-Stop** (right dial). Adjustments may be made with water on or off; factory preset is ≈180°.

![I-20 top callouts — Lifting Socket, Arc Adjustment, Nozzle/Radius Adjustment Screw, Flo-Stop](media/heads_i20-callouts.png)

![Riser pulled up by the lifting socket to access the nozzle and dials in-place](media/rotor-lifting-socket.png)

**Hunter adjustment wrench.** The right tool is a Hunter wrench: a 3/32" Allen key on one end, plastic arc-adjustment key on the other, with two finger loops. A bare 3/32" Allen key works for radius adjustment only. The plastic-only consumer key (no Allen end) engages the same lifting / arc / flow-stop sockets and is fine for arc and lift work, but won't drive the radius screw.

![Plastic adjustment key — engages the lifting socket and the arc / flow-stop sockets; same slots as the metal Hunter wrench, consumer variant without the Allen end.](media/rotor-adjustment-key-plastic.jpg)

**Arc adjustment (40°–360°).**
1. Insert the plastic key end into the arc adjustment socket.
2. Hold the nozzle turret at the right stop.
3. Each full 360° turn of the wrench = 90° of arc change. Clockwise increases the arc; counterclockwise decreases it.
4. The wrench ratchets / stops at the 360° max and at the 40° min — don't force past either.

![Hunter wrench inserted into the arc adjustment socket](media/rotor-arc-wrench.png)

**Radius adjustment (up to −25%).**
1. Insert the 3/32" Allen end into the radius (retention) screw on top of the nozzle.
2. Clockwise into the stream = shorter throw; counterclockwise = longer throw. Best done with water on so you can see the change.
3. **Caution: more than five full clockwise turns can drop the screw out of the nozzle.** Replacement screw is sold separately if lost.

![Arc adjustment with the wrench (90° per full turn) and the radius/range screw above it](media/rotor-adjustment-arrows.png)

**Nozzle install / replacement.** Use Hunter's nozzle insertion collar (P/N **123200**) — a white plastic sleeve that clips around the riser body to hold it up while you work — plus the adjustment wrench. The slot layout on the I-20 cap matches the PGP shown in the callout below.

![Hunter nozzle insertion collar (P/N 123200) — slides over the riser body to hold the rotor cap open during nozzle install.](media/rotor-nozzle-insertion-collar.jpg)

![Hunter PGP rotor top callouts — same slot layout as the I-20: Lifting Socket (centre top), Adjustment Socket with +/− (left), Nozzle/Range Adjustment Screw (top right), Model Identification (right).](media/heads_pgp-rotor-cap-callouts.png)

1. Insert the plastic end of the adjustment wrench into the **lifting socket** on top of the cap and turn 90°. Pull the riser up — the nozzle port is now accessible. Slide the insertion collar over the riser body to hold it up.

   ![Step 1 — wrench in the lifting socket, pull the riser up; insertion collar holds it open.](media/rotor-nozzle-install-step-1.jpg)

2. Visually check the **nozzle / radius adjustment screw** isn't blocking the nozzle socket. Slip the nozzle in — the socket is angled up 25°. The triangle on the rubber cover marks the direction of water flow when the rotor is retracted, so it tells you which way the nozzle will throw.

   ![Step 2 — nozzle slipped into the 25°-angled socket; insertion collar still holding the riser.](media/rotor-nozzle-install-step-2.jpg)

3. Turn the **nozzle / radius adjustment screw** a **quarter turn clockwise** to lock the nozzle in place. More than a quarter turn starts to reduce the radius — don't over-turn.

   ![Step 3 — quarter-turn the radius reduction screw to lock the nozzle.](media/rotor-nozzle-install-step-3.jpg)

After install: cycle the head a couple of times to confirm the nozzle is locked and the rotor returns to its arc. Use Flo-Stop (below) if you don't want to run the whole zone for that check.

**Flo-Stop (shut off one rotor while the zone runs).** Insert the Hunter wrench into the centre hole of the rubber cover (the Flo-Stop port) and turn clockwise until flow at this head stops. Use this for nozzle swaps or quick service without shutting the whole zone. Turn counterclockwise to restore flow.

**Filter cleaning (when a rotor won't rotate).**
1. Unscrew the body cap counterclockwise. After a season or two it may need pliers to break free.
2. Lift the internal assembly out of the body.
3. The filter is the cylindrical screen at the very bottom of the internal assembly; pull it out with needle-nose pliers.
4. Rinse under clean water, refit, screw the assembly back in.
5. I-20 filter spec: **.050" (1.27 mm) square openings, ~14 mesh, ~1410 µm**. Replacement P/N **102600-SP** (same screen as PGP-ADJ / PGP Ultra).
6. If clean filter doesn't restore rotation, the gear drive is gone — replace the rotor.

![Lifting the internal assembly out of the rotor body once the cap is unscrewed](media/rotor-internal-assembly-removal.png)

![Body cap unscrewed and internal assembly fully separated from the body](media/rotor-cap-internals-separated.jpg)

![Internal assembly (1) with the cylindrical filter screen (2) at its base](media/rotor-filter-exploded.png)

**Riser seal replacement (P/N 181500; kit of 10 = 253400).** Worn seals show as water leaking around the riser stem during operation, or as flow-by that prevents pop-up.
1. Unthread the body cap and remove the internal assembly.
2. Stand the riser on a solid surface, grip the spring and riser body firmly.
3. With the other hand, snap the body cap off the top of the turret (palm on the logo cap, pull up with fingers).
4. While still gripping, remove the old rubber seal — the spring's tension releases when the seal comes off.
5. Remove the plastic spring seat (it may have already popped off).
6. To install the new seal: with the base on a solid surface, push the retraction spring down below the nozzle turret and hold it there. Drop the new rigid spring seat onto the riser grooved-side-down. Work the new flexible rubber seal (flat side up) onto the turret and then down onto the riser body — don't twist or deform it as it crosses the gap between turret and shaft. Snap the body cap back on (it slides freely once past the ring at the top of the turret). Release the spring.
7. Cycle the riser by hand several times to seat the parts so they don't stick.
8. Screw the internal assembly back into the body — **hand-tight only, no threads visible under the cap**. If threads can be felt, the seal isn't seated; redo it.
9. Re-check installation height (set to grade) before turning on for leak test.

![Grip the spring and riser body firmly while lifting the old rubber seal off — the spring tension releases as the seal comes off](media/rotor-riser-seal-grip.jpg)

**Drain check valve (low-head drainage at this rotor).** Hunter sells a screw-in check valve sub-assembly (P/N **142300**, Filter/Screen Check Valve combined). To fit: unthread the body cap, pull the internal assembly, flip upside-down, push the large irregular end of the check valve into the bottom of the riser (the small rubber tip stays outside the riser), refit the internal assembly.

**Temporary shutoff of one rotor (without removing the head).** Use the blank nozzle from the I-20 Low-Angle Nozzle Set (P/N **356605SP**) — it pops up with the zone but throws no water. **Temporary use only**: the riser still pops up, so this is not a permanent cap, and the blank must be removed before winterization. For a true permanent cap, see *Capping off a head in-ground* below. Note: I-20s with Flo-Stop can simply use Flo-Stop for temporary shutoff — the blank nozzle is mostly useful for flushing a hose during maintenance.

**Capping off an I-20 in-ground (permanent removal).** Two cases, both relevant wherever the system is winterized. The general dead-end-on-a-winterized-hose rule that drives this is in `hoses.md` *Dead-end winterization rule*; the same procedure is mirrored there so either doc can be read standalone.
- *Removing a head that is not at the end of its hose:* dig down to expose the threaded fitting under the rotor, unscrew the rotor (plus any riser nipple), thread on a same-size cap or plug with Teflon tape, turn the zone on briefly to check for leaks, then backfill.
- *Removing the last head on a hose (if this branch is winterized!):* never just cap the dead-end at the removed head — water trapped in the dead-end will freeze and split the pipe. Instead, dig up the *upstream* head's tee, cut the hose just past the tee leaving enough pipe to glue a slip cap, glue an end cap, and abandon the pipe to the removed head. Check for leaks before backfilling.

**Setting height to grade — swing joint vs hard riser.** When you replace a rotor, the new head should sit flush with the surrounding turf (top of cap just at grade, not proud, not sunk). A SCH80 nipple riser fixes the height at install — measure twice. A Hunter swing joint (flexible elbowed link between the hose and the rotor inlet) lets you adjust height after the head is installed and absorbs lateral shock from foot traffic or settling soil — the better choice on a sandy/settling site. The I-20 inlet is **¾" NPT**; use Teflon tape on the threads.

![Hunter swing joint between the hose and the rotor inlet](media/rotor-swing-joint.png)

## Pro-Spray PRS40 spray body

The PRS40 is a pressure-regulated pop-up body — it delivers 2.8 bar (40 PSI) at the nozzle regardless of inlet pressure up to ~6.9 bar (100 PSI). When every MP Rotator nozzle rides on a PRS40, MP performance stays consistent across zones even when supply pressure drifts.

### Operating envelope

- Inlet pressure: **1.0–7.0 bar** (15–100 PSI)
- Outlet pressure: regulated to **2.8 bar** (40 PSI) — the MP Rotator's nominal pressure
- **Regulator activation threshold:** the regulator needs a **0.7 bar (10 PSI) differential** to engage. For a PRS40 (2.8 bar outlet) that means inlet **≥ 3.5 bar (≈50 PSI)**, otherwise the regulator does nothing and the nozzle sees inlet pressure directly — which will mist an MP Rotator.
- Drain check valve (optional): holds up to ~4.3 m (14 ft) of elevation on the 4"/6"/12" bodies; ~3 m (10 ft) on the 3" body
- Warranty: 5 years

### Construction and identification

- Body and cap: UV-resistant ABS.
- Riser: ABS with a stainless-steel retraction spring and a two-piece ratchet for aligning the spray pattern after install.
- Pressure-activated wiper seal: chemical- and chlorine-resistant, cleans debris off the riser as it retracts; replaceable from the cap without pulling the body.
- Polyethylene flush plug with a pull-tab: keeps construction debris out of the riser during install, removed before fitting the nozzle.
- **Cap colour and stencil identify what's fitted, without disassembly:**
  - **Black** = standard, non-regulated.
  - **Brown** = PRS30 (regulated to 2.1 bar / 30 PSI).
  - **Gray** = **PRS40** (regulated to 2.8 bar / 40 PSI).
  - **Purple** = reclaimed-water identification.
  - "CHECK VALVE" stencilled on top → factory drain check valve is fitted.
  - "FLOGUARD" stencilled on top → factory FloGuard is fitted.

### Variants and dimensions

| Variant | Retracted height | Pop-up height | Inlet |
|---|---|---|---|
| PROS-00 (shrub, no regulator) | 4 cm | — | ½" |
| PROS-00-PRS30 / PRS40 (shrub, regulated) | 11 cm | — | ½" |
| PROS-02 | 10 cm | 5 cm | ½" |
| PROS-03 | 12.5 cm | 7.5 cm | ½" |
| **PROS-04** | **15.5 cm** | **10 cm** | ½" |
| PROS-06 | 22.5 cm | 15 cm | ½" |
| PROS-12 | 41 cm | 30 cm | ½" |

Exposed diameter (above ground) is 5.7 cm on all PROS-02 through PROS-12. A side-inlet `-SI` option exists on the 6" and 12" standard and PRS30 bodies — not on PRS40.

### Features

- **Industry-strongest body** — heavy-duty spring for consistent riser retraction.
- **Co-molded wiper seal** — chemical-/chlorine-resistant; keeps debris out of the body well.
- **Cap-to-body seal** — design tolerates a loose cap without leaking, so a *new* cap-to-body leak almost always means debris on the seal seat.
- **Check valve option** — eliminates low-head drainage within the elevations above.
- **FloGuard option** — reduces flow to a single ~3 m (10 ft) tall stream when the nozzle is missing. See the diagnostic note under *Common faults*.
- **Interchangeable components** — wiper seal, spring, cap, and check valve are all field-replaceable.

### Common faults

- **Cap-to-body leak.** Almost always debris on the seal seat, since the seal tolerates a loose cap by design. Pull the cap, rinse, refit.
- **Riser stuck up.** Weak spring or debris in the well; clean and rinse, replace the spring if visibly tired.
- **Misting from the MP on top.** Two possible causes — diagnose by checking inlet pressure:
  - Inlet < ~3.5 bar (50 PSI): the regulator can't engage (needs 0.7 bar differential above its 2.8 bar setpoint). The fix is upstream — pump weak, main-line restricted, or zone over-flowing. The PRS40 is not faulty.
  - Inlet ≥ 3.5 bar (50 PSI): the regulator itself is failing. Swap the body or fit a new internal seal kit.
- **Tall single stream of water (~3 m / 10 ft) from one head.** Not a fault — that's **FloGuard** signalling a missing or detached nozzle. Refit or replace the nozzle. Without FloGuard the body would fountain at full flow, soaking the area.
- **Leak at the threaded inlet (in-ground).** Over-torque on install. Same Teflon paste-or-tape rule as `valve.md` — never both.
- **Lowest head still wet after shut-off.** See *Low-head drainage* below.

### Useful part numbers (replacement)

- Drain check valve: **437400SP**
- Reclaimed-water ID cap: 458562SP
- Snap-on reclaimed cover: PROS-RC-CAP-SP
- Shutoff cap: 213600SP
- Shutoff nozzle: 916400SP

## MP Rotator nozzle

The MP Rotator is a multi-stream nozzle that screws into the top of the PRS40. It rotates slowly under a silicone-and-brass viscous drive, producing a fan of fine streams instead of a single sheet of mist. The result is a lower precipitation rate (~10 mm/hr) than a conventional spray nozzle — soil has time to absorb water before runoff starts, which matters on slopes and clay.

### Operating envelope

- Operating pressure: **2.1–3.8 bar** (30–55 PSI) at the nozzle; the PRS40 holds it at the recommended **2.8 bar** (40 PSI).
- Pop-up trigger pressure: **~1.0 bar** (15 PSI) at the body inlet — the riser extends first, then the MP itself pops up (the "double-pop" feature).
- Precipitation rate: **~10 mm/hr** (0.4 in/hr) for the standard line (black canister). The MP800 line (grey canister) is ~20 mm/hr.
- Radius reduction screw: up to ~25%, stainless steel. The screw has a slip clutch that prevents internal damage if you keep turning past the end-stop.
- Arc adjustment: only effective **while the nozzle is popped up** — adjusting a retracted nozzle does nothing. Ratchets at the limits.
- Filter screen: detachable polypropylene. Mesh size depends on the model — see below.
- Warranty: 3 years

### Filter screens (well water)

| Model | Mesh | Opening |
|---|---|---|
| MP-1000, MP-2000, MP-CORNER, MP-Strips | 40 | 420 µm |
| MP-3000, MP-3500 | 20 | 840 µm |

On well-fed systems, grit is a normal seasonal nuisance. The MP-3000/3500 use a coarser screen because the larger orifices tolerate (and pass) more debris, but a finer-screened MP-1000/2000 on a well will clog earlier — pull and rinse the screen first when the symptom is "MP not rotating".

### Model and colour map (standard models, black canister)

| Model | Radius | Arc / colour |
|---|---|---|
| MP-1000 | 2.5–4.5 m (8–15 ft) | maroon 90°–210° / lt. blue 210°–270° / olive 360° |
| MP-2000 | 4.0–6.4 m (13–21 ft) | black 90°–210° / green 210°–270° / red 360° |
| MP-3000 | 6.7–9.1 m (22–30 ft) | blue 90°–210° / yellow 210°–270° / grey 360° |
| MP-3500 | 9.4–10.7 m (31–35 ft) | tan 90°–210° (no full-circle) |
| MP-CORNER | 2.5–4.5 m (8–15 ft) | turquoise 45°–105° |

Quick read: the canister colour tells you the line (black = standard 10 mm/hr; grey = MP800 20 mm/hr), and the cap/retainer colour tells you the model and arc range.

### Thread

⅝"-27 UNS male on the standard MP-1000/2000/3000/3500/CORNER (fits a male-threaded pop-up stem like the PRS40). The "-HT" suffix denotes female-threaded variants.

### Common faults

- **Won't pop up at all.** Inlet pressure below ~1.0 bar (15 PSI). Confirm pump and main line — a weak pump or a clog upstream is the usual cause.
- **Pops up but won't rotate.** Filter screen clogged. Pull the nozzle from the body, lift the screen out, rinse, refit. The viscous drive (silicone chamber, brass stator) is sealed and rarely fails — suspect the screen first.
- **Misting / fine spray instead of distinct streams.** Pressure too high (>3.8 bar / 55 PSI at the nozzle). With a PRS40 body this should not happen; if it does, the PRS40 regulator is failing — swap the body or fit a seal kit.
- **Wrong arc / arc-adjustment turning does nothing.** You're adjusting while the head is retracted. Turn the zone on, adjust while popped up, then shut off.
- **Body popped up, no water at all, nozzle visible.** Broken or missing nozzle. With FloGuard the body will block flow; without it the body fountains.

## Pairing MP ↔ PRS40

- **PRS40** (2.8 bar / 40 PSI) — for **nominal** radius.
- **PRS30** (2.1 bar / 30 PSI) — for **minimum** radius settings only.
- **Unregulated body** (regular Pro-Spray, Rain Bird 1800-series without regulator, etc.) — will mist at typical pump pressure because the MP's misting threshold is ~3.8 bar (55 PSI). Always pair an MP with a regulated body.

## Low-head drainage (wet patch at the lowest head when the system is off)

Two distinct causes, with the same symptom:

1. **Drain check valve missing or failed at the head.** The cheap, common fix. Both the I-20 and the PRS40 have factory or user-installable drain check valves, rated to ~3 m and ~4.3 m of head-to-hose-high-point elevation respectively. If the hose has more elevation than the check valve holds, the water above the valve will still drain. Upgrade to a stronger check valve or install in-line check valves on the hose.
2. **Water passing through the zone valve when shut.** The valve itself is letting water trickle through after closing — see `valve.md` *Weeping when off*. The tell: drainage doesn't stop after the hose empties; it keeps going.

**Distinguishing test:** a check-valve issue **self-stops** once the pipe above empties (a finite puddle, then dry). A valve leak **does not self-stop** — it weeps continuously as long as the main line is pressurised. Do not assume the valve, and do not assume the head; let the symptom decide.

## See also

- `valve.md` — *Weeping when off* for the valve-side cause of low-head drainage; also for valve-side regulation when PRS40 isn't enough (Accusync).
- `valve-internals.md` — partly-stuck diaphragm restricting flow to a zone, an alternative cause when a whole zone is weak.
- `hoses.md` — *Broken-hose signature* and *Dead-end winterization rule* for the zone-wide-weakness case and for head removal/cap-off planning.
- `wiring.md` — heads are mechanical only; no wiring at the head.
- `setup.yaml` — per-zone head counts and types for this system.
