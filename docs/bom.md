# Irrigation system — Bill of Materials

Physical-items view. `system.yaml` is authoritative for anything hydraulic or
electrical, but it is a **flow graph**, not a BOM, so the two deliberately do
**not** match 1:1:

- system.yaml carries non-BOM nodes — ports (`inlet`, `outlet`, `sol_port`) and
  internal flow passages (`entry`, `exhaust`, `metering_port`, `chamber`,
  `air_charge`). Those appear here only as `[bracketed notes]`, not as parts.
- This BOM adds presentational grouping nodes (e.g. `Wet end`, `Pipework`,
  `Terminal block`, the riser bundles, `Diaphragm assembly`) that have no single
  graph part.
- Non-functional structure (the valve **Box housing / Enclosure / Lid**) is
  modeled in system.yaml as `enclosure.valvebox` — a structural component with no
  water/electrical routing — and priced via `system.yaml`'s `enclosure.valvebox`.

Every part in system.yaml appears here (directly or as a bracketed note), and
every physical BOM item maps to a graph component; fix system.yaml first, then
re-render.

Legend: 💧 wetted / hydraulic · 🌐 230 V mains · 💡 24 V control ·
`[ … ]` = functional note / flow feature (not a discrete part).

```
IRRIGATION SYSTEM
├─ 1. SUPPLY ASSY   (well → pump → tank → pressure to the supply line)
│   ├─ Well water source 💧                 [aquifer — source.well]
│   ├─ Jet pump — DAB AQUAJET 132 M           [AQUAJET = JET 132 M pump + pressure tank + tank hose]
│   │   ├─ Wet end 💧                          [the JET 132 M pump proper]
│   │   │   ├─ Pump body 💧             [volute / suction chamber]
│   │   │   ├─ Venturi nozzle 💧         [jet nozzle — drives suction]
│   │   │   ├─ Impeller 💧               [adds head]
│   │   │   ├─ Diffuser 💧               [velocity → pressure recovery]
│   │   │   ├─ Mechanical seal           [shaft seal — water/air boundary]
│   │   │   ├─ Body O-ring               [casing joint seal]
│   │   │   ├─ Priming cap
│   │   │   ├─ Priming cap O-ring
│   │   │   ├─ [venturi throat — low-pressure suction zone]
│   │   │   ├─ [recirculation passage — diffuser → venturi nozzle (self-prime loop)]
│   │   │   └─ [priming chamber — fill volume held in by the foot valve]
│   │   ├─ Motor 🌐
│   │   │   ├─ Stator winding 🌐
│   │   │   ├─ Run capacitor
│   │   │   ├─ Thermal protector
│   │   │   └─ Terminal block 🌐
│   │   │       ├─ Line terminal 🌐
│   │   │       ├─ Neutral terminal 🌐
│   │   │       └─ Earth terminal
│   │   ├─ Pressure tank — DAB 20 L diaphragm
│   │   │   ├─ Steel shell 💧
│   │   │   ├─ Bladder 💧                    [separates pre-charge air from water]
│   │   │   ├─ Air valve                     [Schrader — sets pre-charge pressure]
│   │   │   ├─ [air pre-charge volume — cushion above the bladder]
│   │   │   └─ [draw-down volume — water stored between pump cut-in / cut-out]
│   │   └─ Tank hose (stainless) 💧
│   ├─ Suction assembly
│   │   ├─ Foot-valve assembly 💧
│   │   │   ├─ Foot valve 💧                [non-return — holds the suction-line prime]
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Disc                       [check disc — seals on reverse flow]
│   │   │   │   ├─ Spring
│   │   │   │   └─ Seat seal                  [sealing face when pump is off]
│   │   │   ├─ Strainer basket 💧             [inlet debris screen]
│   │   │   │   ├─ Mesh screen 💧            [clogs]
│   │   │   │   └─ Body 💧
│   │   │   └─ Hose-tail, brass 💧
│   │   │       ├─ Body 💧
│   │   │       ├─ G1″ male thread (PTFE)     [to foot valve]
│   │   │       └─ Barb ∅25                   [hose-over-barb — clamp on hose]
│   │   ├─ Suction hose — PVC ∅25, 4.5 m 💧
│   │   │   └─ Hose clamp ×2
│   │   └─ Hose-tail, plastic 💧
│   │       ├─ Body 💧
│   │       ├─ Barb ∅25                       [hose-over-barb — clamp on hose]
│   │       └─ G1″ male thread (PTFE)         [to pump suction]
│   ├─ Pump discharge
│   │   ├─ Coupling G1″M→∅32 💧
│   │   │   ├─ Body 💧
│   │   │   ├─ G1″ male thread (PTFE)
│   │   │   ├─ Compression nut ∅32
│   │   │   ├─ Grip ring ∅32 (white)
│   │   │   └─ O-ring ∅32 💧
│   │   ├─ Hose LDPE ∅32, 1 m 💧
│   │   └─ Coupling ∅32→∅32 💧
│   │       ├─ Body 💧
│   │       ├─ Compression nut ∅32 ×2
│   │       ├─ Grip ring ∅32 ×2 (white)
│   │       └─ O-ring ∅32 ×2 💧
│   └─ Pump power assembly
│       ├─ Pump-start relay — Hunter PSR-22 💡🌐   [24 V coil switches 230 V mains to the pump]
│       │   ├─ Coil 💡                 [24 VAC pull-in from controller]
│       │   ├─ Contact 🌐              [N/O — closes to power the pump]
│       │   └─ Terminals
│       │       ├─ Coil in 💡
│       │       ├─ Coil common 💡
│       │       ├─ Line 🌐
│       │       ├─ Load out 🌐
│       │       ├─ Neutral 🌐
│       │       └─ Earth
│       ├─ Relay supply socket 🌐
│       │   ├─ Line 🌐
│       │   ├─ Neutral 🌐
│       │   └─ Earth
│       ├─ Pump socket (switched) 🌐
│       │   ├─ Line 🌐
│       │   ├─ Neutral 🌐
│       │   └─ Earth
│       ├─ Cable 230 V: mains → relay 🌐
│       │   ├─ Line 🌐
│       │   ├─ Neutral 🌐
│       │   └─ Earth
│       ├─ Cable 230 V: relay → pump socket 🌐
│       │   ├─ Line 🌐
│       │   ├─ Neutral 🌐
│       │   └─ Earth
│       ├─ Cable 24 V: controller → relay coil 💡
│       └─ Cable 24 V: relay coil → controller common 💡
│
├─ 2. DISTRIBUTE ASSY   (manifold + supply line + harness; zone valves under their zones)
│   ├─ Supply line — Hose LDPE ∅32, 20 m 💧
│   ├─ Box housing — valve box XL              [enclosure.valvebox — structural, no flow]
│   │   ├─ Enclosure
│   │   └─ Lid
│   ├─ Manifold assembly 💧
│   │   ├─ Manifold body — LEV 6-way distributor 💧   [1 inlet → 6 parallel outlets]
│   │   │   ├─ Inlet swivel washer
│   │   │   ├─ Outlet swivel washer ×6
│   │   │   └─ [distribution gallery — common header feeding all six outlets]
│   │   ├─ Inlet coupling ∅32→swivel-G1″ 💧
│   │   │   ├─ Body 💧
│   │   │   ├─ Compression nut ∅32
│   │   │   ├─ Grip ring ∅32 (white)
│   │   │   ├─ O-ring ∅32 💧
│   │   │   └─ Swivel nut G1″ (washer on manifold)
│   │   └─ End cap (outlet 6) 💧
│   │       ├─ Body 💧
│   │       └─ Swivel nut G1″ (washer on manifold)
│   └─ Solenoid wiring 💡
│       ├─ Waterproof wire connector ×8 💡   [4 zone-side + 4 common-side splices]
│       └─ Common jumper wire ×3 💡          [bond the 4 valve commons in-box; home run is in §4]
│
├─ 3. DELIVER ASSY   (zone piping → risers → emitters)
│   │
│   ├─ Zone 1 — stream / bubbler (manual)
│   │   ├─ Tap coupling swivel-G1″→∅16 (manifold outlet 5) 💧
│   │   │   ├─ Body 💧
│   │   │   ├─ Swivel nut G1″ (washer on manifold)
│   │   │   ├─ Compression nut ∅16
│   │   │   ├─ Grip ring ∅16 (white)
│   │   │   └─ O-ring ∅16 💧
│   │   ├─ Pipework
│   │   │   ├─ Hose LDPE ∅16, 10 m 💧
│   │   │   ├─ Coupling ∅16→∅16 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅16 ×2
│   │   │   │   ├─ Grip ring ∅16 ×2 (white)
│   │   │   │   └─ O-ring ∅16 ×2 💧
│   │   │   ├─ Hose LDPE ∅16, 10 m 💧
│   │   │   └─ Hose LDPE ∅16, 10 m 💧
│   │   ├─ Manual valve 💧                  [ball valve — manual on/off]
│   │   │   ├─ Body 💧
│   │   │   ├─ Seat 💧                        [bore seat]
│   │   │   ├─ Ball                           [bore — open / closed]
│   │   │   ├─ Stem
│   │   │   ├─ Stem O-ring
│   │   │   ├─ Handle
│   │   │   ├─ Inlet thread (PTFE)
│   │   │   └─ [through-bore port — flow path when open]
│   │   └─ Stream emitter ∅12 💧             [fixed orifice — stream / bubbler flow]
│   │
│   ├─ Zone 2 — 1 rotor + 2 sprays
│   │   ├─ Zone valve — Hunter PGV-101G (manifold outlet 1) 💧💡   [pilot-operated, normally-closed diaphragm valve]
│   │   │   ├─ Inlet coupling swivel-G1″→G1″M 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Swivel nut G1″ (washer on manifold)
│   │   │   │   └─ G1″ male thread (PTFE)
│   │   │   ├─ Body 💧
│   │   │   │   ├─ Seat 💧                    [diaphragm seals here when closed]
│   │   │   │   ├─ Inlet thread 💧
│   │   │   │   ├─ Outlet nut 💧
│   │   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   │   ├─ Bonnet
│   │   │   │   ├─ Bonnet cap
│   │   │   │   ├─ Bonnet screw ×4
│   │   │   │   ├─ Bleed screw                [manual bleed: control chamber → outlet (opens valve by hand)]
│   │   │   │   ├─ Flow-control stem          [screws down to cap diaphragm lift → throttles flow]
│   │   │   │   └─ [bonnet / control chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ Diaphragm assembly
│   │   │   │   ├─ Diaphragm
│   │   │   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   │   │   └─ Diaphragm spring
│   │   │   ├─ Solenoid — Hunter 458200 💡
│   │   │   │   ├─ Coil 💡
│   │   │   │   ├─ Plunger
│   │   │   │   ├─ Plunger spring
│   │   │   │   ├─ Solenoid O-ring
│   │   │   │   ├─ Lead wire ×2 💡
│   │   │   │   ├─ [pilot seat — plunger seals it when de-energized]
│   │   │   │   ├─ [entry port — control chamber → solenoid]
│   │   │   │   └─ [exhaust port — solenoid → valve outlet]
│   │   │   └─ [operation — energizing the coil (or opening the bleed screw) vents the control
│   │   │       chamber downstream faster than the metering port refills it, so inlet pressure
│   │   │       lifts the diaphragm off the seat and the zone flows]
│   │   ├─ Pipework
│   │   │   ├─ Coupling G1″M→∅25 (valve → zone) 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G1″ male thread (PTFE)
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   └─ O-ring ∅25 💧
│   │   │   ├─ Hose LDPE ∅25, 8 m 💧
│   │   │   ├─ Tee ∅25 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25 ×3
│   │   │   │   ├─ Grip ring ∅25 ×3 (white)
│   │   │   │   └─ O-ring ∅25 ×3 💧
│   │   │   ├─ Hose LDPE ∅25, 7 m 💧
│   │   │   ├─ Hose LDPE ∅25, 3 m 💧
│   │   │   ├─ Tee ∅25 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25 ×3
│   │   │   │   ├─ Grip ring ∅25 ×3 (white)
│   │   │   │   └─ O-ring ∅25 ×3 💧
│   │   │   └─ Hose LDPE ∅25, 17 m 💧
│   │   ├─ Spray riser — MP3000 270° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   ├─ O-ring ∅25 💧
│   │   │   │   └─ G¾″ female thread (PTFE)
│   │   │   ├─ Swing-joint riser ¾×½ 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G¾″ male thread (PTFE)
│   │   │   │   └─ G½″ male thread (PTFE)
│   │   │   └─ Spray — Hunter PRS40 💧
│   │   │       ├─ Cap
│   │   │       ├─ Check valve              [drain-check — stops low-head puddling]
│   │   │       ├─ Pressure regulator       [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │   │       ├─ Riser 💧
│   │   │       ├─ Wiper seal
│   │   │       ├─ Retract spring
│   │   │       ├─ Flush plug
│   │   │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │   ├─ Rotor riser — 4.0 blue 170° 💧
│   │   │   ├─ Swing-joint riser ¾×¾ 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G¾″ male thread (PTFE)
│   │   │   │   └─ G¾″ male thread (PTFE)
│   │   │   └─ Rotor — Hunter I-20 💧
│   │   │       ├─ Check valve              [drain-check — stops low-head puddling]
│   │   │       ├─ Riser 💧
│   │   │       ├─ Riser seal
│   │   │       ├─ Retract spring
│   │   │       ├─ Drive gear               [water-driven gear train → rotation]
│   │   │       ├─ Filter screen            [inlet debris screen]
│   │   │       ├─ Arc adjustment           [sets the sweep arc]
│   │   │       ├─ Flo-stop                 [pull-up shut-off for servicing]
│   │   │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │   └─ Spray riser — MP2000 180° 💧
│   │       ├─ Coupling ∅25→G¾″F 💧
│   │       │   ├─ Body 💧
│   │       │   ├─ Compression nut ∅25
│   │       │   ├─ Grip ring ∅25 (white)
│   │       │   ├─ O-ring ∅25 💧
│   │       │   └─ G¾″ female thread (PTFE)
│   │       ├─ Swing-joint riser ¾×½ 💧
│   │       │   ├─ Body 💧
│   │       │   ├─ G¾″ male thread (PTFE)
│   │       │   └─ G½″ male thread (PTFE)
│   │       └─ Spray — Hunter PRS40 💧
│   │           ├─ Cap
│   │           ├─ Check valve              [drain-check — stops low-head puddling]
│   │           ├─ Pressure regulator       [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │           ├─ Riser 💧
│   │           ├─ Wiper seal
│   │           ├─ Retract spring
│   │           ├─ Flush plug
│   │           └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │
│   ├─ Zone 3 — 2 rotors
│   │   ├─ Zone valve — Hunter PGV-101G (manifold outlet 2) 💧💡   [pilot-operated, normally-closed diaphragm valve]
│   │   │   ├─ Inlet coupling swivel-G1″→G1″M 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Swivel nut G1″ (washer on manifold)
│   │   │   │   └─ G1″ male thread (PTFE)
│   │   │   ├─ Body 💧
│   │   │   │   ├─ Seat 💧                    [diaphragm seals here when closed]
│   │   │   │   ├─ Inlet thread 💧
│   │   │   │   ├─ Outlet nut 💧
│   │   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   │   ├─ Bonnet
│   │   │   │   ├─ Bonnet cap
│   │   │   │   ├─ Bonnet screw ×4
│   │   │   │   ├─ Bleed screw                [manual bleed: control chamber → outlet (opens valve by hand)]
│   │   │   │   ├─ Flow-control stem          [screws down to cap diaphragm lift → throttles flow]
│   │   │   │   └─ [bonnet / control chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ Diaphragm assembly
│   │   │   │   ├─ Diaphragm
│   │   │   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   │   │   └─ Diaphragm spring
│   │   │   ├─ Solenoid — Hunter 458200 💡
│   │   │   │   ├─ Coil 💡
│   │   │   │   ├─ Plunger
│   │   │   │   ├─ Plunger spring
│   │   │   │   ├─ Solenoid O-ring
│   │   │   │   ├─ Lead wire ×2 💡
│   │   │   │   ├─ [pilot seat — plunger seals it when de-energized]
│   │   │   │   ├─ [entry port — control chamber → solenoid]
│   │   │   │   └─ [exhaust port — solenoid → valve outlet]
│   │   │   └─ [operation — energizing the coil (or opening the bleed screw) vents the control
│   │   │       chamber downstream faster than the metering port refills it, so inlet pressure
│   │   │       lifts the diaphragm off the seat and the zone flows]
│   │   ├─ Pipework
│   │   │   ├─ Coupling G1″M→∅25 (valve → zone) 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G1″ male thread (PTFE)
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   └─ O-ring ∅25 💧
│   │   │   ├─ Hose LDPE ∅25, 2 m 💧
│   │   │   ├─ Tee ∅25 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25 ×3
│   │   │   │   ├─ Grip ring ∅25 ×3 (white)
│   │   │   │   └─ O-ring ∅25 ×3 💧
│   │   │   ├─ Hose LDPE ∅25, 1 m 💧
│   │   │   └─ Hose LDPE ∅25, 9 m 💧
│   │   ├─ Rotor riser — 2.5 blue 150° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   ├─ O-ring ∅25 💧
│   │   │   │   └─ G¾″ female thread (PTFE)
│   │   │   ├─ Swing-joint riser ¾×¾ 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G¾″ male thread (PTFE)
│   │   │   │   └─ G¾″ male thread (PTFE)
│   │   │   └─ Rotor — Hunter I-20 💧
│   │   │       ├─ Check valve              [drain-check — stops low-head puddling]
│   │   │       ├─ Riser 💧
│   │   │       ├─ Riser seal
│   │   │       ├─ Retract spring
│   │   │       ├─ Drive gear               [water-driven gear train → rotation]
│   │   │       ├─ Filter screen            [inlet debris screen]
│   │   │       ├─ Arc adjustment           [sets the sweep arc]
│   │   │       ├─ Flo-stop                 [pull-up shut-off for servicing]
│   │   │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │   └─ Rotor riser — 5.0 blue 270° 💧
│   │       ├─ Coupling ∅25→G¾″F 💧
│   │       │   ├─ Body 💧
│   │       │   ├─ Compression nut ∅25
│   │       │   ├─ Grip ring ∅25 (white)
│   │       │   ├─ O-ring ∅25 💧
│   │       │   └─ G¾″ female thread (PTFE)
│   │       ├─ Swing-joint riser ¾×¾ 💧
│   │       │   ├─ Body 💧
│   │       │   ├─ G¾″ male thread (PTFE)
│   │       │   └─ G¾″ male thread (PTFE)
│   │       └─ Rotor — Hunter I-20 💧
│   │           ├─ Check valve              [drain-check — stops low-head puddling]
│   │           ├─ Riser 💧
│   │           ├─ Riser seal
│   │           ├─ Retract spring
│   │           ├─ Drive gear               [water-driven gear train → rotation]
│   │           ├─ Filter screen            [inlet debris screen]
│   │           ├─ Arc adjustment           [sets the sweep arc]
│   │           ├─ Flo-stop                 [pull-up shut-off for servicing]
│   │           └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │
│   ├─ Zone 4 — 4 sprays
│   │   ├─ Zone valve — Hunter PGV-101G (manifold outlet 4) 💧💡   [pilot-operated, normally-closed diaphragm valve]
│   │   │   ├─ Inlet coupling swivel-G1″→G1″M 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Swivel nut G1″ (washer on manifold)
│   │   │   │   └─ G1″ male thread (PTFE)
│   │   │   ├─ Body 💧
│   │   │   │   ├─ Seat 💧                    [diaphragm seals here when closed]
│   │   │   │   ├─ Inlet thread 💧
│   │   │   │   ├─ Outlet nut 💧
│   │   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   │   ├─ Bonnet
│   │   │   │   ├─ Bonnet cap
│   │   │   │   ├─ Bonnet screw ×4
│   │   │   │   ├─ Bleed screw                [manual bleed: control chamber → outlet (opens valve by hand)]
│   │   │   │   ├─ Flow-control stem          [screws down to cap diaphragm lift → throttles flow]
│   │   │   │   └─ [bonnet / control chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ Diaphragm assembly
│   │   │   │   ├─ Diaphragm
│   │   │   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   │   │   └─ Diaphragm spring
│   │   │   ├─ Solenoid — Hunter 458200 💡
│   │   │   │   ├─ Coil 💡
│   │   │   │   ├─ Plunger
│   │   │   │   ├─ Plunger spring
│   │   │   │   ├─ Solenoid O-ring
│   │   │   │   ├─ Lead wire ×2 💡
│   │   │   │   ├─ [pilot seat — plunger seals it when de-energized]
│   │   │   │   ├─ [entry port — control chamber → solenoid]
│   │   │   │   └─ [exhaust port — solenoid → valve outlet]
│   │   │   └─ [operation — energizing the coil (or opening the bleed screw) vents the control
│   │   │       chamber downstream faster than the metering port refills it, so inlet pressure
│   │   │       lifts the diaphragm off the seat and the zone flows]
│   │   ├─ Pipework
│   │   │   ├─ Coupling G1″M→∅25 (valve → zone) 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G1″ male thread (PTFE)
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   └─ O-ring ∅25 💧
│   │   │   ├─ Hose LDPE ∅25, 9 m 💧
│   │   │   ├─ Tee ∅25 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25 ×3
│   │   │   │   ├─ Grip ring ∅25 ×3 (white)
│   │   │   │   └─ O-ring ∅25 ×3 💧
│   │   │   ├─ Hose LDPE ∅25, 2 m 💧
│   │   │   ├─ Hose LDPE ∅25, 8 m 💧
│   │   │   ├─ Tee ∅25 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25 ×3
│   │   │   │   ├─ Grip ring ∅25 ×3 (white)
│   │   │   │   └─ O-ring ∅25 ×3 💧
│   │   │   ├─ Hose LDPE ∅25, 6 m 💧
│   │   │   ├─ Hose LDPE ∅25, 19 m 💧
│   │   │   ├─ Tee ∅25 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25 ×3
│   │   │   │   ├─ Grip ring ∅25 ×3 (white)
│   │   │   │   └─ O-ring ∅25 ×3 💧
│   │   │   └─ Hose LDPE ∅25, 5 m 💧
│   │   ├─ Spray riser — MP3000 270° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   ├─ O-ring ∅25 💧
│   │   │   │   └─ G¾″ female thread (PTFE)
│   │   │   ├─ Swing-joint riser ¾×½ 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G¾″ male thread (PTFE)
│   │   │   │   └─ G½″ male thread (PTFE)
│   │   │   └─ Spray — Hunter PRS40 💧
│   │   │       ├─ Cap
│   │   │       ├─ Check valve              [drain-check — stops low-head puddling]
│   │   │       ├─ Pressure regulator       [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │   │       ├─ Riser 💧
│   │   │       ├─ Wiper seal
│   │   │       ├─ Retract spring
│   │   │       ├─ Flush plug
│   │   │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │   ├─ Spray riser — MP1000 210° 💧
│   │   │   ├─ Swing-joint riser ¾×½ 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G¾″ male thread (PTFE)
│   │   │   │   └─ G½″ male thread (PTFE)
│   │   │   └─ Spray — Hunter PRS40 💧
│   │   │       ├─ Cap
│   │   │       ├─ Check valve              [drain-check — stops low-head puddling]
│   │   │       ├─ Pressure regulator       [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │   │       ├─ Riser 💧
│   │   │       ├─ Wiper seal
│   │   │       ├─ Retract spring
│   │   │       ├─ Flush plug
│   │   │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │   ├─ Spray riser — MP2000 270° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ Compression nut ∅25
│   │   │   │   ├─ Grip ring ∅25 (white)
│   │   │   │   ├─ O-ring ∅25 💧
│   │   │   │   └─ G¾″ female thread (PTFE)
│   │   │   ├─ Swing-joint riser ¾×½ 💧
│   │   │   │   ├─ Body 💧
│   │   │   │   ├─ G¾″ male thread (PTFE)
│   │   │   │   └─ G½″ male thread (PTFE)
│   │   │   └─ Spray — Hunter PRS40 💧
│   │   │       ├─ Cap
│   │   │       ├─ Check valve              [drain-check — stops low-head puddling]
│   │   │       ├─ Pressure regulator       [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │   │       ├─ Riser 💧
│   │   │       ├─ Wiper seal
│   │   │       ├─ Retract spring
│   │   │       ├─ Flush plug
│   │   │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │   └─ Spray riser — MP2000 180° 💧
│   │       ├─ Swing-joint riser ¾×½ 💧
│   │       │   ├─ Body 💧
│   │       │   ├─ G¾″ male thread (PTFE)
│   │       │   └─ G½″ male thread (PTFE)
│   │       └─ Spray — Hunter PRS40 💧
│   │           ├─ Cap
│   │           ├─ Check valve              [drain-check — stops low-head puddling]
│   │           ├─ Pressure regulator       [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │           ├─ Riser 💧
│   │           ├─ Wiper seal
│   │           ├─ Retract spring
│   │           ├─ Flush plug
│   │           └─ Nozzle 💧                 [orifice — sets radius / flow]
│   │
│   └─ Zone 5 — 2 rotors
│       ├─ Zone valve — Hunter PGV-101G (manifold outlet 3) 💧💡   [pilot-operated, normally-closed diaphragm valve]
│       │   ├─ Inlet coupling swivel-G1″→G1″M 💧
│       │   │   ├─ Body 💧
│       │   │   ├─ Swivel nut G1″ (washer on manifold)
│       │   │   └─ G1″ male thread (PTFE)
│       │   ├─ Body 💧
│       │   │   ├─ Seat 💧                    [diaphragm seals here when closed]
│       │   │   ├─ Inlet thread 💧
│       │   │   ├─ Outlet nut 💧
│       │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│       │   │   └─ [outlet chamber — downstream of seat, to the zone]
│       │   ├─ Bonnet
│       │   │   ├─ Bonnet cap
│       │   │   ├─ Bonnet screw ×4
│       │   │   ├─ Bleed screw                [manual bleed: control chamber → outlet (opens valve by hand)]
│       │   │   ├─ Flow-control stem          [screws down to cap diaphragm lift → throttles flow]
│       │   │   └─ [bonnet / control chamber — volume above diaphragm; pressure here holds it shut]
│       │   ├─ Diaphragm assembly
│       │   │   ├─ Diaphragm
│       │   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│       │   │   └─ Diaphragm spring
│       │   ├─ Solenoid — Hunter 458200 💡
│       │   │   ├─ Coil 💡
│       │   │   ├─ Plunger
│       │   │   ├─ Plunger spring
│       │   │   ├─ Solenoid O-ring
│       │   │   ├─ Lead wire ×2 💡
│       │   │   ├─ [pilot seat — plunger seals it when de-energized]
│       │   │   ├─ [entry port — control chamber → solenoid]
│       │   │   └─ [exhaust port — solenoid → valve outlet]
│       │   └─ [operation — energizing the coil (or opening the bleed screw) vents the control
│       │       chamber downstream faster than the metering port refills it, so inlet pressure
│       │       lifts the diaphragm off the seat and the zone flows]
│       ├─ Pipework
│       │   ├─ Coupling G1″M→∅25 (valve → zone) 💧
│       │   │   ├─ Body 💧
│       │   │   ├─ G1″ male thread (PTFE)
│       │   │   ├─ Compression nut ∅25
│       │   │   ├─ Grip ring ∅25 (white)
│       │   │   └─ O-ring ∅25 💧
│       │   ├─ Hose LDPE ∅25, 20 m 💧
│       │   ├─ Tee ∅25 💧
│       │   │   ├─ Body 💧
│       │   │   ├─ Compression nut ∅25 ×3
│       │   │   ├─ Grip ring ∅25 ×3 (white)
│       │   │   └─ O-ring ∅25 ×3 💧
│       │   ├─ Hose LDPE ∅25, 3 m 💧
│       │   └─ Hose LDPE ∅25, 12 m 💧
│       ├─ Rotor riser — 5.0 blue 270° 💧
│       │   ├─ Coupling ∅25→G¾″F 💧
│       │   │   ├─ Body 💧
│       │   │   ├─ Compression nut ∅25
│       │   │   ├─ Grip ring ∅25 (white)
│       │   │   ├─ O-ring ∅25 💧
│       │   │   └─ G¾″ female thread (PTFE)
│       │   ├─ Swing-joint riser ¾×¾ 💧
│       │   │   ├─ Body 💧
│       │   │   ├─ G¾″ male thread (PTFE)
│       │   │   └─ G¾″ male thread (PTFE)
│       │   └─ Rotor — Hunter I-20 💧
│       │       ├─ Check valve              [drain-check — stops low-head puddling]
│       │       ├─ Riser 💧
│       │       ├─ Riser seal
│       │       ├─ Retract spring
│       │       ├─ Drive gear               [water-driven gear train → rotation]
│       │       ├─ Filter screen            [inlet debris screen]
│       │       ├─ Arc adjustment           [sets the sweep arc]
│       │       ├─ Flo-stop                 [pull-up shut-off for servicing]
│       │       └─ Nozzle 💧                 [orifice — sets radius / flow]
│       └─ Rotor riser — 2.5 blue 180° 💧
│           ├─ Coupling ∅25→G¾″F 💧
│           │   ├─ Body 💧
│           │   ├─ Compression nut ∅25
│           │   ├─ Grip ring ∅25 (white)
│           │   ├─ O-ring ∅25 💧
│           │   └─ G¾″ female thread (PTFE)
│           ├─ Swing-joint riser ¾×¾ 💧
│           │   ├─ Body 💧
│           │   ├─ G¾″ male thread (PTFE)
│           │   └─ G¾″ male thread (PTFE)
│           └─ Rotor — Hunter I-20 💧
│               ├─ Check valve              [drain-check — stops low-head puddling]
│               ├─ Riser 💧
│               ├─ Riser seal
│               ├─ Retract spring
│               ├─ Drive gear               [water-driven gear train → rotation]
│               ├─ Filter screen            [inlet debris screen]
│               ├─ Arc adjustment           [sets the sweep arc]
│               ├─ Flo-stop                 [pull-up shut-off for servicing]
│               └─ Nozzle 💧                 [orifice — sets radius / flow]
│
└─ 4. ORCHESTRATE ASSY   (controller + 24 V harness — schedules and drives the zones)
    ├─ House socket (controller supply) 🌐   [line, neutral — class-II, earth unused]
    │   ├─ Line 🌐
    │   └─ Neutral 🌐
    ├─ Mains lead 230 V: socket → controller 🌐
    │   ├─ Line 🌐
    │   └─ Neutral 🌐
    ├─ Controller — RainMachine HD-12 TOUCH 🌐💡
    │   ├─ Touchscreen
    │   ├─ Mains input (line / neutral) 🌐    [primary feed pins → transformer]
    │   ├─ Transformer 230→24 VAC 🌐💡        [step-down: mains → 24 VAC control]
    │   │   ├─ Primary winding 🌐
    │   │   └─ Secondary rail ×2 💡           [→ board 24 VAC inputs]
    │   └─ Terminal board 💡
    │       ├─ 24 VAC input ×2 💡             [transformer secondary → board]
    │       ├─ Master / pump-start terminal — station 1 💡
    │       ├─ Zone 2 terminal — station 7 💡
    │       ├─ Zone 3 terminal — station 8 💡
    │       ├─ Zone 4 terminal — station 10 💡
    │       ├─ Zone 5 terminal — station 9 💡
    │       ├─ Spare station terminal ×7 💡   [stations 2–6, 11–12 — HD-12 is a 12-zone board]
    │       └─ Common terminal ×2 💡
    └─ Zone valve cable assembly (controller → valve box, in conduit) 💡
        ├─ Zone 2 conductor 💡
        ├─ Zone 3 conductor 💡
        ├─ Zone 4 conductor 💡
        ├─ Zone 5 conductor 💡
        └─ Common conductor 💡               [home run; bonded to the in-box common jumpers in §2]
```
