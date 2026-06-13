# Irrigation system — Bill of Materials (generated)

GENERATED from graph.yaml + context.yaml by tools/render_bom.py — do not edit by hand.
`[bracketed]` = `feature:` node (flow passage / volume / zone), not a procurable part.

```
IRRIGATION SYSTEM
├─ 1. SUPPLY ASSY   (well → pump → tank → pressure to the supply line)
│   ├─ Pump-start relay — Hunter PSR-22   €100
│   │   ├─ coil in
│   │   ├─ coil
│   │   ├─ coil common
│   │   ├─ contact
│   │   ├─ line
│   │   ├─ load outlet
│   │   ├─ neutral
│   │   └─ earth
│   ├─ Socket   €5
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ 230 V cable   €2
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ 230 V cable   €2
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ 24 V wire   €1.5
│   ├─ 24 V wire   €1.5
│   ├─ Coupling 💧  €5
│   │   ├─ inlet thread
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Hose-tail, brass 💧  €6
│   │   ├─ inlet thread
│   │   ├─ barb
│   │   └─ body
│   ├─ Hose-tail, plastic 💧  €3
│   │   ├─ barb
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Strainer basket 💧  €10
│   │   ├─ mesh
│   │   └─ body
│   ├─ Hose LDPE 1 m 💧  €2
│   ├─ Suction hose 4.5 m 💧  €4
│   │   ├─ clamp 1  (stainless steel)
│   │   └─ clamp 2  (stainless steel)
│   ├─ Jet pump — DAB AQUAJET 132 M 💧  €350
│   │   ├─ tank hose  (stainless steel)
│   │   ├─ tank
│   │   │   ├─ shell  (steel)
│   │   │   ├─ bladder  (rubber)  [separates pre-charge air from water]
│   │   │   ├─ pre charge  [Schrader — sets pre-charge pressure]
│   │   │   ├─ [air charge — air pre-charge cushion above the bladder]
│   │   │   └─ [draw down — water stored between pump cut-in / cut-out]
│   │   ├─ body  (plastic)
│   │   │   ├─ venturi  [jet nozzle — drives suction]
│   │   │   ├─ impeller  (plastic)  [adds head]
│   │   │   ├─ diffuser  (plastic)  [velocity → pressure recovery]
│   │   │   ├─ mech seal  (ceramic)  [shaft seal — water/air boundary]
│   │   │   ├─ body oring  (rubber)  [casing joint seal]
│   │   │   ├─ priming cap
│   │   │   ├─ priming cap oring  (rubber)
│   │   │   ├─ [venturi throat — low-pressure suction zone]
│   │   │   ├─ [recirculation passage — diffuser → venturi nozzle (self-prime loop)]
│   │   │   └─ [priming chamber — fill volume held in by the foot valve]
│   │   └─ motor
│   │       ├─ line
│   │       ├─ winding  (copper)
│   │       ├─ capacitor
│   │       ├─ thermal protector
│   │       ├─ neutral
│   │       └─ earth
│   ├─ Socket   €5
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ Well water source 💧  (no price)
│   └─ Foot valve 💧  €20
│       ├─ body
│       ├─ disc  [check disc — seals on reverse flow]
│       ├─ spring
│       └─ seat seal  (rubber)  [sealing face when pump is off]
├─ 2. DISTRIBUTE ASSY   (manifold + supply line + harness; zone valves under their zones)
│   ├─ Hose LDPE 20 m 💧  €2
│   ├─ Box housing — valve box XL   €150
│   │   ├─ enclosure
│   │   └─ lid
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet swivel nut
│   ├─ Manifold — LEV 6-way distributor 💧  €150
│   │   ├─ inlet washer  (rubber)
│   │   ├─ outlet 1 washer  (rubber)
│   │   ├─ outlet 2 washer  (rubber)
│   │   ├─ outlet 3 washer  (rubber)
│   │   ├─ outlet 4 washer  (rubber)
│   │   ├─ outlet 5 washer  (rubber)
│   │   ├─ outlet 6 washer  (rubber)
│   │   ├─ body
│   │   └─ [distribution gallery — common header feeding all six outlets]
│   ├─ 24 V wire   €1.5
│   ├─ 24 V wire   €1.5
│   ├─ 24 V wire   €1.5
│   ├─ 24 V wire   €1.5
│   ├─ Waterproof connector   €1
│   ├─ Waterproof connector   €1
│   ├─ Waterproof connector   €1
│   └─ Waterproof connector   €1
├─ 3. DELIVER ASSY   (zone piping → risers → emitters)
│   ├─ Stream emitter 💧  €5
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Coupling 💧  €5
│   │   ├─ inlet swivel nut
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Hose LDPE 10 m 💧  €2
│   ├─ Hose LDPE 10 m 💧  €2
│   ├─ Hose LDPE 10 m 💧  €2
│   ├─ Manual valve 💧  €5
│   │   └─ body
│   │       ├─ seat  [bore seat]
│   │       ├─ ball  [bore — open / closed]
│   │       ├─ stem
│   │       ├─ stem oring  (rubber)
│   │       ├─ handle
│   │       ├─ inlet thread
│   │       └─ [through bore — flow path when open]
│   ├─ Rotor 4.0 blue, 170° — Hunter I-20-04-SS 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ riser  (stainless steel)
│   │       ├─ riser seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ gear  (plastic)  [water-driven gear train → rotation]
│   │       ├─ filter  [inlet debris screen]
│   │       ├─ nozzle  (plastic)  [orifice — sets radius / flow]
│   │       ├─ arc  [sets the sweep arc]
│   │       └─ flo stop  [pull-up shut-off for servicing]
│   ├─ Spray MP3000, 270° — Hunter Pro-Spray PRS40 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ cap
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ regulator  [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │       ├─ riser
│   │       ├─ wiper seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ flush plug
│   │       └─ nozzle  (plastic)  [orifice — sets radius / flow]
│   ├─ Spray MP2000, 180° — Hunter Pro-Spray PRS40 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ cap
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ regulator  [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │       ├─ riser
│   │       ├─ wiper seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ flush plug
│   │       └─ nozzle  (plastic)  [orifice — sets radius / flow]
│   ├─ Coupling 💧  €5
│   │   ├─ inlet thread
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet swivel nut
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Swing-joint riser — Hunter sj 3/4x1/2 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x1/2 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x3/4 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Hose LDPE 8 m 💧  €2
│   ├─ Hose LDPE 7 m 💧  €2
│   ├─ Hose LDPE 3 m 💧  €2
│   ├─ Hose LDPE 17 m 💧  €2
│   ├─ Zone valve — Hunter PGV-101G 💧  €25
│   │   ├─ body  (plastic)
│   │   │   ├─ seat  [diaphragm seals here when closed]
│   │   │   ├─ inlet thread
│   │   │   ├─ outlet nut
│   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   ├─ diaphragm  (rubber)
│   │   │   ├─ spring  (stainless steel)
│   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   ├─ bonnet  (plastic)
│   │   │   ├─ [chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ bleed screw
│   │   │   ├─ flow control
│   │   │   ├─ bonnet cap
│   │   │   └─ bonnet screws
│   │   └─ solenoid
│   │       ├─ [entry — control chamber → solenoid]
│   │       ├─ plunger  (stainless steel)
│   │       ├─ [exhaust — solenoid → valve outlet]
│   │       ├─ [pilot seat — plunger seals it when de-energized]
│   │       ├─ 24v 1
│   │       ├─ coil  (copper)
│   │       ├─ 24v 2
│   │       ├─ plunger spring  (stainless steel)
│   │       └─ solenoid oring  (rubber)
│   ├─ Waterproof connector   €1
│   ├─ Rotor 2.5 blue, 150° — Hunter I-20-04-SS 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ riser  (stainless steel)
│   │       ├─ riser seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ gear  (plastic)  [water-driven gear train → rotation]
│   │       ├─ filter  [inlet debris screen]
│   │       ├─ nozzle  (plastic)  [orifice — sets radius / flow]
│   │       ├─ arc  [sets the sweep arc]
│   │       └─ flo stop  [pull-up shut-off for servicing]
│   ├─ Rotor 5.0 blue, 270° — Hunter I-20-04-SS 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ riser  (stainless steel)
│   │       ├─ riser seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ gear  (plastic)  [water-driven gear train → rotation]
│   │       ├─ filter  [inlet debris screen]
│   │       ├─ nozzle  (plastic)  [orifice — sets radius / flow]
│   │       ├─ arc  [sets the sweep arc]
│   │       └─ flo stop  [pull-up shut-off for servicing]
│   ├─ Coupling 💧  €5
│   │   ├─ inlet thread
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet swivel nut
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Swing-joint riser — Hunter sj 3/4x3/4 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x3/4 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Hose LDPE 2 m 💧  €2
│   ├─ Hose LDPE 1 m 💧  €2
│   ├─ Hose LDPE 9 m 💧  €2
│   ├─ Zone valve — Hunter PGV-101G 💧  €25
│   │   ├─ body  (plastic)
│   │   │   ├─ seat  [diaphragm seals here when closed]
│   │   │   ├─ inlet thread
│   │   │   ├─ outlet nut
│   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   ├─ diaphragm  (rubber)
│   │   │   ├─ spring  (stainless steel)
│   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   ├─ bonnet  (plastic)
│   │   │   ├─ [chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ bleed screw
│   │   │   ├─ flow control
│   │   │   ├─ bonnet cap
│   │   │   └─ bonnet screws
│   │   └─ solenoid
│   │       ├─ [entry — control chamber → solenoid]
│   │       ├─ plunger  (stainless steel)
│   │       ├─ [exhaust — solenoid → valve outlet]
│   │       ├─ [pilot seat — plunger seals it when de-energized]
│   │       ├─ 24v 1
│   │       ├─ coil  (copper)
│   │       ├─ 24v 2
│   │       ├─ plunger spring  (stainless steel)
│   │       └─ solenoid oring  (rubber)
│   ├─ Waterproof connector   €1
│   ├─ Spray MP3000, 270° — Hunter Pro-Spray PRS40 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ cap
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ regulator  [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │       ├─ riser
│   │       ├─ wiper seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ flush plug
│   │       └─ nozzle  (plastic)  [orifice — sets radius / flow]
│   ├─ Spray MP1000, 210° — Hunter Pro-Spray PRS40 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ cap
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ regulator  [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │       ├─ riser
│   │       ├─ wiper seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ flush plug
│   │       └─ nozzle  (plastic)  [orifice — sets radius / flow]
│   ├─ Spray MP2000, 270° — Hunter Pro-Spray PRS40 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ cap
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ regulator  [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │       ├─ riser
│   │       ├─ wiper seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ flush plug
│   │       └─ nozzle  (plastic)  [orifice — sets radius / flow]
│   ├─ Spray MP2000, 180° — Hunter Pro-Spray PRS40 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ cap
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ regulator  [PRS — regulates outlet to ~40 psi / 2.8 bar]
│   │       ├─ riser
│   │       ├─ wiper seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ flush plug
│   │       └─ nozzle  (plastic)  [orifice — sets radius / flow]
│   ├─ Coupling 💧  €5
│   │   ├─ inlet thread
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet swivel nut
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Swing-joint riser — Hunter sj 3/4x1/2 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x1/2 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x1/2 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x1/2 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Hose LDPE 9 m 💧  €2
│   ├─ Hose LDPE 2 m 💧  €2
│   ├─ Hose LDPE 8 m 💧  €2
│   ├─ Hose LDPE 6 m 💧  €2
│   ├─ Hose LDPE 19 m 💧  €2
│   ├─ Hose LDPE 5 m 💧  €2
│   ├─ Zone valve — Hunter PGV-101G 💧  €25
│   │   ├─ body  (plastic)
│   │   │   ├─ seat  [diaphragm seals here when closed]
│   │   │   ├─ inlet thread
│   │   │   ├─ outlet nut
│   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   ├─ diaphragm  (rubber)
│   │   │   ├─ spring  (stainless steel)
│   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   ├─ bonnet  (plastic)
│   │   │   ├─ [chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ bleed screw
│   │   │   ├─ flow control
│   │   │   ├─ bonnet cap
│   │   │   └─ bonnet screws
│   │   └─ solenoid
│   │       ├─ [entry — control chamber → solenoid]
│   │       ├─ plunger  (stainless steel)
│   │       ├─ [exhaust — solenoid → valve outlet]
│   │       ├─ [pilot seat — plunger seals it when de-energized]
│   │       ├─ 24v 1
│   │       ├─ coil  (copper)
│   │       ├─ 24v 2
│   │       ├─ plunger spring  (stainless steel)
│   │       └─ solenoid oring  (rubber)
│   ├─ Waterproof connector   €1
│   ├─ Rotor 5.0 blue, 270° — Hunter I-20-04-SS 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ riser  (stainless steel)
│   │       ├─ riser seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ gear  (plastic)  [water-driven gear train → rotation]
│   │       ├─ filter  [inlet debris screen]
│   │       ├─ nozzle  (plastic)  [orifice — sets radius / flow]
│   │       ├─ arc  [sets the sweep arc]
│   │       └─ flo stop  [pull-up shut-off for servicing]
│   ├─ Rotor 2.5 blue, 180° — Hunter I-20-04-SS 💧  €25
│   │   ├─ inlet thread
│   │   └─ body  (plastic)
│   │       ├─ check valve  [drain-check — stops low-head puddling]
│   │       ├─ riser  (stainless steel)
│   │       ├─ riser seal  (rubber)
│   │       ├─ retract spring  (stainless steel)
│   │       ├─ gear  (plastic)  [water-driven gear train → rotation]
│   │       ├─ filter  [inlet debris screen]
│   │       ├─ nozzle  (plastic)  [orifice — sets radius / flow]
│   │       ├─ arc  [sets the sweep arc]
│   │       └─ flo stop  [pull-up shut-off for servicing]
│   ├─ Coupling 💧  €5
│   │   ├─ inlet thread
│   │   ├─ body
│   │   ├─ outlet oring  (rubber)
│   │   ├─ outlet grip
│   │   └─ outlet nut
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Coupling 💧  €5
│   │   ├─ inlet swivel nut
│   │   ├─ body
│   │   └─ outlet thread
│   ├─ Swing-joint riser — Hunter sj 3/4x3/4 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Swing-joint riser — Hunter sj 3/4x3/4 💧  (no price)
│   │   ├─ inlet thread
│   │   ├─ outlet thread
│   │   └─ body
│   ├─ Tee 💧  €5
│   │   ├─ inlet nut
│   │   ├─ inlet grip
│   │   ├─ inlet oring  (rubber)
│   │   ├─ body
│   │   ├─ outlet 1 oring  (rubber)
│   │   ├─ outlet 1 grip
│   │   ├─ outlet 1 nut
│   │   ├─ outlet 2 oring  (rubber)
│   │   ├─ outlet 2 grip
│   │   └─ outlet 2 nut
│   ├─ Hose LDPE 20 m 💧  €2
│   ├─ Hose LDPE 3 m 💧  €2
│   ├─ Hose LDPE 12 m 💧  €2
│   ├─ Zone valve — Hunter PGV-101G 💧  €25
│   │   ├─ body  (plastic)
│   │   │   ├─ seat  [diaphragm seals here when closed]
│   │   │   ├─ inlet thread
│   │   │   ├─ outlet nut
│   │   │   ├─ [inlet chamber — upstream of seat, at line pressure]
│   │   │   └─ [outlet chamber — downstream of seat, to the zone]
│   │   ├─ diaphragm  (rubber)
│   │   │   ├─ spring  (stainless steel)
│   │   │   └─ [metering port — bleed orifice: inlet → control chamber]
│   │   ├─ bonnet  (plastic)
│   │   │   ├─ [chamber — volume above diaphragm; pressure here holds it shut]
│   │   │   ├─ bleed screw
│   │   │   ├─ flow control
│   │   │   ├─ bonnet cap
│   │   │   └─ bonnet screws
│   │   └─ solenoid
│   │       ├─ [entry — control chamber → solenoid]
│   │       ├─ plunger  (stainless steel)
│   │       ├─ [exhaust — solenoid → valve outlet]
│   │       ├─ [pilot seat — plunger seals it when de-energized]
│   │       ├─ 24v 1
│   │       ├─ coil  (copper)
│   │       ├─ 24v 2
│   │       ├─ plunger spring  (stainless steel)
│   │       └─ solenoid oring  (rubber)
│   ├─ Waterproof connector   €1
│   └─ End cap 💧  €2
│       ├─ inlet swivel nut
│       └─ body
└─ 4. ORCHESTRATE ASSY   (controller + 24 V harness — schedules and drives the zones)
    ├─ Controller — RainMachine HD-12 TOUCH   €200
    │   ├─ touchscreen
    │   ├─ line
    │   ├─ neutral
    │   ├─ transform
    │   │   ├─ line
    │   │   ├─ neutral
    │   │   └─ winding
    │   ├─ ac line 1
    │   ├─ ac line 2
    │   ├─ common 1
    │   └─ common 2
    ├─ Socket   €5
    │   ├─ line
    │   ├─ neutral
    │   └─ earth
    ├─ 230 V cable   €2
    │   ├─ line
    │   ├─ neutral
    │   └─ earth
    ├─ 24 V wire   €1.5
    ├─ 24 V wire   €1.5
    ├─ 24 V wire   €1.5
    └─ 24 V wire   €1.5
```
