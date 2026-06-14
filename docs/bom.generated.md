# Irrigation system — Bill of Materials (generated)

GENERATED from graph.yaml + context.yaml by tools/render_bom.py — tracks docs/bom.md.
Legend: 💧 wetted · 🌐 230 V mains · 💡 24 V control · `[ … ]` = flow feature, not a part.

```
IRRIGATION SYSTEM
├─ 1. SUPPLY ASSY   (well → pump → tank → pressure to the supply line)
│   ├─ Well water source 💧
│   ├─ Jet pump — DAB AQUAJET 132 M 💧
│   │   ├─ Tank hose
│   │   ├─ Tank — DAB 20 L diaphragm tank
│   │   │   ├─ Shell
│   │   │   ├─ Bladder
│   │   │   ├─ Pre charge
│   │   │   ├─ [air charge]
│   │   │   └─ [draw down]
│   │   ├─ Body
│   │   │   ├─ Venturi
│   │   │   ├─ Impeller
│   │   │   ├─ Diffuser
│   │   │   ├─ Mech seal
│   │   │   ├─ Body O-ring
│   │   │   ├─ Priming cap
│   │   │   ├─ Priming cap O-ring
│   │   │   ├─ [venturi throat]
│   │   │   ├─ [recirculation passage]
│   │   │   └─ [priming chamber]
│   │   └─ Motor
│   │       ├─ Line
│   │       ├─ Winding
│   │       ├─ Capacitor
│   │       ├─ Thermal protector
│   │       ├─ Neutral
│   │       └─ Earth
│   ├─ Suction assembly
│   │   ├─ Foot-valve assembly 💧
│   │   │   ├─ Foot valve 💧
│   │   │   │   ├─ Body
│   │   │   │   ├─ Disc
│   │   │   │   ├─ Spring
│   │   │   │   └─ Seat seal
│   │   │   ├─ Strainer basket 💧
│   │   │   │   ├─ Mesh
│   │   │   │   └─ Body
│   │   │   └─ Hose-tail, brass 💧
│   │   │       ├─ Inlet thread
│   │   │       ├─ Barb
│   │   │       └─ Body
│   │   ├─ Suction hose — PVC ∅25, 4.5 m 💧
│   │   │   └─ Clamp ×2
│   │   └─ Hose-tail, plastic 💧
│   │       ├─ Barb
│   │       ├─ Outlet thread
│   │       └─ Body
│   ├─ Pump discharge
│   │   ├─ Coupling G1″M→∅32 💧
│   │   │   ├─ Inlet thread
│   │   │   ├─ Body
│   │   │   ├─ Outlet O-ring
│   │   │   ├─ Outlet grip
│   │   │   └─ Outlet nut
│   │   ├─ Hose LDPE ∅32, 1 m 💧
│   │   └─ Coupling ∅32→∅32 💧
│   │       ├─ Inlet nut
│   │       ├─ Inlet grip
│   │       ├─ Inlet O-ring
│   │       ├─ Body
│   │       ├─ Outlet O-ring
│   │       ├─ Outlet grip
│   │       └─ Outlet nut
│   └─ Pump power assembly
│       ├─ Pump-start relay — Hunter PSR-22 💡🌐
│       │   ├─ Coil in
│       │   ├─ Coil
│       │   ├─ Coil common
│       │   ├─ Contact
│       │   ├─ Line
│       │   ├─ Load outlet
│       │   ├─ Neutral
│       │   └─ Earth
│       ├─ Relay supply socket 🌐
│       │   ├─ Line
│       │   ├─ Neutral
│       │   └─ Earth
│       ├─ Pump socket (switched) 🌐
│       │   ├─ Line
│       │   ├─ Neutral
│       │   └─ Earth
│       ├─ Cable 230 V: mains → relay 🌐
│       │   ├─ Line
│       │   ├─ Neutral
│       │   └─ Earth
│       ├─ Cable 230 V: relay → pump socket 🌐
│       │   ├─ Line
│       │   ├─ Neutral
│       │   └─ Earth
│       ├─ Cable 24 V: controller → relay coil 💡
│       └─ Cable 24 V: relay coil → controller common 💡
├─ 2. DISTRIBUTE ASSY   (manifold + supply line + harness; zone valves under their zones)
│   ├─ Supply line — Hose LDPE ∅32, 20 m 💧
│   ├─ Box housing — valve box XL
│   │   ├─ Enclosure
│   │   └─ Lid
│   ├─ Manifold assembly 💧
│   │   ├─ Manifold body — LEV 6-way distributor 💧
│   │   │   ├─ Inlet washer
│   │   │   ├─ Outlet washer ×6
│   │   │   ├─ Body
│   │   │   └─ [distribution gallery]
│   │   ├─ Inlet coupling ∅32→swivel-G1″ 💧
│   │   │   ├─ Inlet nut
│   │   │   ├─ Inlet grip
│   │   │   ├─ Inlet O-ring
│   │   │   ├─ Body
│   │   │   └─ Outlet swivel nut
│   │   └─ End cap (outlet 6) 💧
│   │       ├─ Inlet swivel nut
│   │       └─ Body
│   └─ Solenoid wiring 💡
│       ├─ Waterproof wire connector ×8 💡
│       └─ Common jumper wire ×3 💡
├─ 3. DELIVER ASSY   (zone piping → risers → emitters)
│   ├─ Zone 1 — stream / bubbler (manual)
│   │   ├─ Coupling swivel-G1″→∅16 💧
│   │   │   ├─ Inlet swivel nut
│   │   │   ├─ Body
│   │   │   ├─ Outlet O-ring
│   │   │   ├─ Outlet grip
│   │   │   └─ Outlet nut
│   │   ├─ Pipework
│   │   │   ├─ Hose LDPE ∅16, 10 m 💧
│   │   │   ├─ Coupling ∅16→∅16 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅16, 10 m 💧
│   │   │   └─ Hose LDPE ∅16, 10 m 💧
│   │   ├─ Manual valve 💧
│   │   │   └─ Body
│   │   │       ├─ Seat
│   │   │       ├─ Ball
│   │   │       ├─ Stem
│   │   │       ├─ Stem O-ring
│   │   │       ├─ Handle
│   │   │       ├─ Inlet thread
│   │   │       └─ [through bore]
│   │   └─ Stream emitter 💧
│   ├─ Zone 2 — 1 rotor + 2 sprays
│   │   ├─ Zone valve — Hunter PGV-101G 💧💡
│   │   │   ├─ Inlet coupling
│   │   │   │   ├─ Inlet swivel nut
│   │   │   │   ├─ Body
│   │   │   │   └─ Outlet thread
│   │   │   ├─ Body
│   │   │   │   ├─ Seat
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ [inlet chamber]
│   │   │   │   └─ [outlet chamber]
│   │   │   ├─ Diaphragm
│   │   │   │   ├─ Spring
│   │   │   │   └─ [metering port]
│   │   │   ├─ Bonnet
│   │   │   │   ├─ [chamber]
│   │   │   │   ├─ Bleed screw
│   │   │   │   ├─ Flow control
│   │   │   │   ├─ Bonnet cap
│   │   │   │   └─ Bonnet screws
│   │   │   └─ Solenoid — Hunter 458200 (24 VAC)
│   │   │       ├─ [entry]
│   │   │       ├─ Plunger
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot seat]
│   │   │       ├─ Lead wire
│   │   │       ├─ Coil
│   │   │       ├─ Lead wire
│   │   │       ├─ Plunger spring
│   │   │       └─ Solenoid O-ring
│   │   ├─ Pipework
│   │   │   ├─ Coupling G1″M→∅25 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 8 m 💧
│   │   │   ├─ Tee 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 7 m 💧
│   │   │   ├─ Hose LDPE ∅25, 3 m 💧
│   │   │   ├─ Tee 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   └─ Hose LDPE ∅25, 17 m 💧
│   │   ├─ Rotor riser — 4.0 blue 170° 💧
│   │   │   ├─ Swing-joint riser ¾×¾ — Hunter sj 3/4x3/4 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet thread
│   │   │   │   └─ Body
│   │   │   └─ Rotor — Hunter I-20-04-SS 💧
│   │   │       ├─ Inlet thread
│   │   │       └─ Body
│   │   │           ├─ Check valve
│   │   │           ├─ Riser
│   │   │           ├─ Riser seal
│   │   │           ├─ Retract spring
│   │   │           ├─ Gear
│   │   │           ├─ Filter
│   │   │           ├─ Nozzle
│   │   │           ├─ Arc
│   │   │           └─ Flo stop
│   │   ├─ Spray riser — MP2000 180° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   └─ Outlet thread
│   │   │   ├─ Swing-joint riser ¾×½ — Hunter sj 3/4x1/2 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet thread
│   │   │   │   └─ Body
│   │   │   └─ Spray — Hunter Pro-Spray PRS40 💧
│   │   │       ├─ Inlet thread
│   │   │       └─ Body
│   │   │           ├─ Cap
│   │   │           ├─ Check valve
│   │   │           ├─ Regulator
│   │   │           ├─ Riser
│   │   │           ├─ Wiper seal
│   │   │           ├─ Retract spring
│   │   │           ├─ Flush plug
│   │   │           └─ Nozzle
│   │   └─ Spray riser — MP3000 270° 💧
│   │       ├─ Coupling ∅25→G¾″F 💧
│   │       │   ├─ Inlet nut
│   │       │   ├─ Inlet grip
│   │       │   ├─ Inlet O-ring
│   │       │   ├─ Body
│   │       │   └─ Outlet thread
│   │       ├─ Swing-joint riser ¾×½ — Hunter sj 3/4x1/2 💧
│   │       │   ├─ Inlet thread
│   │       │   ├─ Outlet thread
│   │       │   └─ Body
│   │       └─ Spray — Hunter Pro-Spray PRS40 💧
│   │           ├─ Inlet thread
│   │           └─ Body
│   │               ├─ Cap
│   │               ├─ Check valve
│   │               ├─ Regulator
│   │               ├─ Riser
│   │               ├─ Wiper seal
│   │               ├─ Retract spring
│   │               ├─ Flush plug
│   │               └─ Nozzle
│   ├─ Zone 3 — 2 rotors
│   │   ├─ Zone valve — Hunter PGV-101G 💧💡
│   │   │   ├─ Inlet coupling
│   │   │   │   ├─ Inlet swivel nut
│   │   │   │   ├─ Body
│   │   │   │   └─ Outlet thread
│   │   │   ├─ Body
│   │   │   │   ├─ Seat
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ [inlet chamber]
│   │   │   │   └─ [outlet chamber]
│   │   │   ├─ Diaphragm
│   │   │   │   ├─ Spring
│   │   │   │   └─ [metering port]
│   │   │   ├─ Bonnet
│   │   │   │   ├─ [chamber]
│   │   │   │   ├─ Bleed screw
│   │   │   │   ├─ Flow control
│   │   │   │   ├─ Bonnet cap
│   │   │   │   └─ Bonnet screws
│   │   │   └─ Solenoid — Hunter 458200 (24 VAC)
│   │   │       ├─ [entry]
│   │   │       ├─ Plunger
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot seat]
│   │   │       ├─ Lead wire
│   │   │       ├─ Coil
│   │   │       ├─ Lead wire
│   │   │       ├─ Plunger spring
│   │   │       └─ Solenoid O-ring
│   │   ├─ Pipework
│   │   │   ├─ Coupling G1″M→∅25 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 2 m 💧
│   │   │   ├─ Tee 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 1 m 💧
│   │   │   └─ Hose LDPE ∅25, 9 m 💧
│   │   ├─ Rotor riser — 5.0 blue 270° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   └─ Outlet thread
│   │   │   ├─ Swing-joint riser ¾×¾ — Hunter sj 3/4x3/4 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet thread
│   │   │   │   └─ Body
│   │   │   └─ Rotor — Hunter I-20-04-SS 💧
│   │   │       ├─ Inlet thread
│   │   │       └─ Body
│   │   │           ├─ Check valve
│   │   │           ├─ Riser
│   │   │           ├─ Riser seal
│   │   │           ├─ Retract spring
│   │   │           ├─ Gear
│   │   │           ├─ Filter
│   │   │           ├─ Nozzle
│   │   │           ├─ Arc
│   │   │           └─ Flo stop
│   │   └─ Rotor riser — 2.5 blue 150° 💧
│   │       ├─ Coupling ∅25→G¾″F 💧
│   │       │   ├─ Inlet nut
│   │       │   ├─ Inlet grip
│   │       │   ├─ Inlet O-ring
│   │       │   ├─ Body
│   │       │   └─ Outlet thread
│   │       ├─ Swing-joint riser ¾×¾ — Hunter sj 3/4x3/4 💧
│   │       │   ├─ Inlet thread
│   │       │   ├─ Outlet thread
│   │       │   └─ Body
│   │       └─ Rotor — Hunter I-20-04-SS 💧
│   │           ├─ Inlet thread
│   │           └─ Body
│   │               ├─ Check valve
│   │               ├─ Riser
│   │               ├─ Riser seal
│   │               ├─ Retract spring
│   │               ├─ Gear
│   │               ├─ Filter
│   │               ├─ Nozzle
│   │               ├─ Arc
│   │               └─ Flo stop
│   ├─ Zone 4 — 4 sprays
│   │   ├─ Zone valve — Hunter PGV-101G 💧💡
│   │   │   ├─ Inlet coupling
│   │   │   │   ├─ Inlet swivel nut
│   │   │   │   ├─ Body
│   │   │   │   └─ Outlet thread
│   │   │   ├─ Body
│   │   │   │   ├─ Seat
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ [inlet chamber]
│   │   │   │   └─ [outlet chamber]
│   │   │   ├─ Diaphragm
│   │   │   │   ├─ Spring
│   │   │   │   └─ [metering port]
│   │   │   ├─ Bonnet
│   │   │   │   ├─ [chamber]
│   │   │   │   ├─ Bleed screw
│   │   │   │   ├─ Flow control
│   │   │   │   ├─ Bonnet cap
│   │   │   │   └─ Bonnet screws
│   │   │   └─ Solenoid — Hunter 458200 (24 VAC)
│   │   │       ├─ [entry]
│   │   │       ├─ Plunger
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot seat]
│   │   │       ├─ Lead wire
│   │   │       ├─ Coil
│   │   │       ├─ Lead wire
│   │   │       ├─ Plunger spring
│   │   │       └─ Solenoid O-ring
│   │   ├─ Pipework
│   │   │   ├─ Coupling G1″M→∅25 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 9 m 💧
│   │   │   ├─ Tee 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 2 m 💧
│   │   │   ├─ Hose LDPE ∅25, 8 m 💧
│   │   │   ├─ Tee 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   ├─ Hose LDPE ∅25, 6 m 💧
│   │   │   ├─ Hose LDPE ∅25, 19 m 💧
│   │   │   ├─ Tee 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   ├─ Outlet nut
│   │   │   │   ├─ Outlet O-ring
│   │   │   │   ├─ Outlet grip
│   │   │   │   └─ Outlet nut
│   │   │   └─ Hose LDPE ∅25, 5 m 💧
│   │   ├─ Spray riser — MP1000 210° 💧
│   │   │   ├─ Swing-joint riser ¾×½ — Hunter sj 3/4x1/2 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet thread
│   │   │   │   └─ Body
│   │   │   └─ Spray — Hunter Pro-Spray PRS40 💧
│   │   │       ├─ Inlet thread
│   │   │       └─ Body
│   │   │           ├─ Cap
│   │   │           ├─ Check valve
│   │   │           ├─ Regulator
│   │   │           ├─ Riser
│   │   │           ├─ Wiper seal
│   │   │           ├─ Retract spring
│   │   │           ├─ Flush plug
│   │   │           └─ Nozzle
│   │   ├─ Spray riser — MP2000 180° 💧
│   │   │   ├─ Swing-joint riser ¾×½ — Hunter sj 3/4x1/2 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet thread
│   │   │   │   └─ Body
│   │   │   └─ Spray — Hunter Pro-Spray PRS40 💧
│   │   │       ├─ Inlet thread
│   │   │       └─ Body
│   │   │           ├─ Cap
│   │   │           ├─ Check valve
│   │   │           ├─ Regulator
│   │   │           ├─ Riser
│   │   │           ├─ Wiper seal
│   │   │           ├─ Retract spring
│   │   │           ├─ Flush plug
│   │   │           └─ Nozzle
│   │   ├─ Spray riser — MP2000 270° 💧
│   │   │   ├─ Coupling ∅25→G¾″F 💧
│   │   │   │   ├─ Inlet nut
│   │   │   │   ├─ Inlet grip
│   │   │   │   ├─ Inlet O-ring
│   │   │   │   ├─ Body
│   │   │   │   └─ Outlet thread
│   │   │   ├─ Swing-joint riser ¾×½ — Hunter sj 3/4x1/2 💧
│   │   │   │   ├─ Inlet thread
│   │   │   │   ├─ Outlet thread
│   │   │   │   └─ Body
│   │   │   └─ Spray — Hunter Pro-Spray PRS40 💧
│   │   │       ├─ Inlet thread
│   │   │       └─ Body
│   │   │           ├─ Cap
│   │   │           ├─ Check valve
│   │   │           ├─ Regulator
│   │   │           ├─ Riser
│   │   │           ├─ Wiper seal
│   │   │           ├─ Retract spring
│   │   │           ├─ Flush plug
│   │   │           └─ Nozzle
│   │   └─ Spray riser — MP3000 270° 💧
│   │       ├─ Coupling ∅25→G¾″F 💧
│   │       │   ├─ Inlet nut
│   │       │   ├─ Inlet grip
│   │       │   ├─ Inlet O-ring
│   │       │   ├─ Body
│   │       │   └─ Outlet thread
│   │       ├─ Swing-joint riser ¾×½ — Hunter sj 3/4x1/2 💧
│   │       │   ├─ Inlet thread
│   │       │   ├─ Outlet thread
│   │       │   └─ Body
│   │       └─ Spray — Hunter Pro-Spray PRS40 💧
│   │           ├─ Inlet thread
│   │           └─ Body
│   │               ├─ Cap
│   │               ├─ Check valve
│   │               ├─ Regulator
│   │               ├─ Riser
│   │               ├─ Wiper seal
│   │               ├─ Retract spring
│   │               ├─ Flush plug
│   │               └─ Nozzle
│   └─ Zone 5 — 2 rotors
│       ├─ Zone valve — Hunter PGV-101G 💧💡
│       │   ├─ Inlet coupling
│       │   │   ├─ Inlet swivel nut
│       │   │   ├─ Body
│       │   │   └─ Outlet thread
│       │   ├─ Body
│       │   │   ├─ Seat
│       │   │   ├─ Inlet thread
│       │   │   ├─ Outlet nut
│       │   │   ├─ [inlet chamber]
│       │   │   └─ [outlet chamber]
│       │   ├─ Diaphragm
│       │   │   ├─ Spring
│       │   │   └─ [metering port]
│       │   ├─ Bonnet
│       │   │   ├─ [chamber]
│       │   │   ├─ Bleed screw
│       │   │   ├─ Flow control
│       │   │   ├─ Bonnet cap
│       │   │   └─ Bonnet screws
│       │   └─ Solenoid — Hunter 458200 (24 VAC)
│       │       ├─ [entry]
│       │       ├─ Plunger
│       │       ├─ [exhaust]
│       │       ├─ [pilot seat]
│       │       ├─ Lead wire
│       │       ├─ Coil
│       │       ├─ Lead wire
│       │       ├─ Plunger spring
│       │       └─ Solenoid O-ring
│       ├─ Pipework
│       │   ├─ Coupling G1″M→∅25 💧
│       │   │   ├─ Inlet thread
│       │   │   ├─ Body
│       │   │   ├─ Outlet O-ring
│       │   │   ├─ Outlet grip
│       │   │   └─ Outlet nut
│       │   ├─ Hose LDPE ∅25, 20 m 💧
│       │   ├─ Tee 💧
│       │   │   ├─ Inlet nut
│       │   │   ├─ Inlet grip
│       │   │   ├─ Inlet O-ring
│       │   │   ├─ Body
│       │   │   ├─ Outlet O-ring
│       │   │   ├─ Outlet grip
│       │   │   ├─ Outlet nut
│       │   │   ├─ Outlet O-ring
│       │   │   ├─ Outlet grip
│       │   │   └─ Outlet nut
│       │   ├─ Hose LDPE ∅25, 3 m 💧
│       │   └─ Hose LDPE ∅25, 12 m 💧
│       ├─ Rotor riser — 5.0 blue 270° 💧
│       │   ├─ Coupling ∅25→G¾″F 💧
│       │   │   ├─ Inlet nut
│       │   │   ├─ Inlet grip
│       │   │   ├─ Inlet O-ring
│       │   │   ├─ Body
│       │   │   └─ Outlet thread
│       │   ├─ Swing-joint riser ¾×¾ — Hunter sj 3/4x3/4 💧
│       │   │   ├─ Inlet thread
│       │   │   ├─ Outlet thread
│       │   │   └─ Body
│       │   └─ Rotor — Hunter I-20-04-SS 💧
│       │       ├─ Inlet thread
│       │       └─ Body
│       │           ├─ Check valve
│       │           ├─ Riser
│       │           ├─ Riser seal
│       │           ├─ Retract spring
│       │           ├─ Gear
│       │           ├─ Filter
│       │           ├─ Nozzle
│       │           ├─ Arc
│       │           └─ Flo stop
│       └─ Rotor riser — 2.5 blue 180° 💧
│           ├─ Coupling ∅25→G¾″F 💧
│           │   ├─ Inlet nut
│           │   ├─ Inlet grip
│           │   ├─ Inlet O-ring
│           │   ├─ Body
│           │   └─ Outlet thread
│           ├─ Swing-joint riser ¾×¾ — Hunter sj 3/4x3/4 💧
│           │   ├─ Inlet thread
│           │   ├─ Outlet thread
│           │   └─ Body
│           └─ Rotor — Hunter I-20-04-SS 💧
│               ├─ Inlet thread
│               └─ Body
│                   ├─ Check valve
│                   ├─ Riser
│                   ├─ Riser seal
│                   ├─ Retract spring
│                   ├─ Gear
│                   ├─ Filter
│                   ├─ Nozzle
│                   ├─ Arc
│                   └─ Flo stop
└─ 4. ORCHESTRATE ASSY   (controller + 24 V harness — schedules and drives the zones)
    ├─ House socket (controller supply) 🌐
    │   ├─ Line
    │   ├─ Neutral
    │   └─ Earth
    ├─ Mains lead 230 V: socket → controller 🌐
    │   ├─ Line
    │   ├─ Neutral
    │   └─ Earth
    ├─ Controller — RainMachine HD-12 TOUCH 🌐💡
    │   ├─ Line
    │   ├─ Neutral
    │   ├─ Screen
    │   ├─ Transformer
    │   │   ├─ Line
    │   │   ├─ Neutral
    │   │   └─ Winding
    │   └─ Terminal-board
    │       ├─ AC line ×2
    │       └─ Common ×2
    └─ Zone valve cable assembly (controller → valve box, in conduit) 💡
        ├─ Zone 2 conductor 💡
        ├─ Zone 3 conductor 💡
        ├─ Zone 4 conductor 💡
        ├─ Zone 5 conductor 💡
        └─ Common conductor 💡
```
