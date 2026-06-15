# Irrigation system — Bill of Materials (generated)

GENERATED from system.yaml by tools/render_bom.py. Lines are raw graph keys.
Sections + zone(Z#) are prefix buckets; assemblies/parts come from the items: tree.

```
IRRIGATION SYSTEM
├─ 1. SUPPLY
│   ├─ source.well
│   ├─ hose.ldpe32  (2 m)
│   ├─ pump.jet  (DAB AQUAJET 132 M)
│   │   ├─ tank_hose
│   │   ├─ tank  (DAB 20 L diaphragm tank)
│   │   │   ├─ shell
│   │   │   ├─ bladder
│   │   │   ├─ pre_charge
│   │   │   ├─ [air_charge]
│   │   │   └─ [draw_down]
│   │   ├─ body
│   │   │   ├─ venturi
│   │   │   ├─ impeller
│   │   │   ├─ diffuser
│   │   │   ├─ mech_seal
│   │   │   ├─ body_oring
│   │   │   ├─ priming_cap
│   │   │   ├─ priming_cap_oring
│   │   │   ├─ [throat]
│   │   │   ├─ [recirculation_passage]
│   │   │   └─ [priming_chamber]
│   │   └─ motor
│   │       ├─ line
│   │       ├─ winding
│   │       ├─ capacitor
│   │       ├─ thermal_protector
│   │       ├─ neutral
│   │       └─ earth
│   ├─ source.socket
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ wiring.230v
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ wiring.230v
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ source.socket
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ suction_assy
│   │   ├─ foot_valve_assy
│   │   │   ├─ valve.foot
│   │   │   │   ├─ body
│   │   │   │   ├─ disc
│   │   │   │   ├─ spring
│   │   │   │   └─ seat_seal
│   │   │   ├─ joint.strainer
│   │   │   │   └─ mesh
│   │   │   └─ joint.hosetail_brass
│   │   │       ├─ thread
│   │   │       ├─ barb
│   │   │       └─ body
│   │   ├─ hose.suction  (4 m)
│   │   │   ├─ tube
│   │   │   └─ clamp ×2
│   │   └─ joint.hosetail_plastic
│   │       ├─ barb
│   │       ├─ thread
│   │       └─ body
│   ├─ pump_discharge
│   │   ├─ joint.bm1c32
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   └─ joint.c32c32
│   │       ├─ body
│   │       ├─ oring ×2
│   │       ├─ grip ×2
│   │       └─ nut ×2
│   └─ pump_power_assy
│       └─ relay.pumpstart  (Hunter PSR-22)
│           ├─ coil_in
│           ├─ coil
│           ├─ coil_common
│           ├─ contact
│           ├─ line
│           ├─ load
│           ├─ neutral
│           └─ earth
├─ 2. DISTRIBUTE
│   ├─ hose.ldpe32  (20 m)
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ wiring.common
│   │   └─ common
│   ├─ wiring.common
│   │   └─ common
│   ├─ wiring.common
│   │   └─ common
│   ├─ enclosure.valvebox  (valve box jumbo)
│   │   ├─ enclosure
│   │   └─ lid
│   └─ manifold_assy
│       ├─ joint.manifold  (LEV 6-way distributor)
│       │   ├─ washer ×7
│       │   └─ body
│       ├─ joint.c32sm1
│       │   ├─ nut
│       │   ├─ grip
│       │   ├─ oring
│       │   ├─ body
│       │   └─ swivel_nut
│       └─ joint.cap
├─ 3. DELIVER
│   ├─ Z1
│   │   ├─ joint.sm1c16
│   │   │   ├─ swivel_nut
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe16  (10 m)
│   │   ├─ joint.c16c16
│   │   │   ├─ body
│   │   │   ├─ oring ×2
│   │   │   ├─ grip ×2
│   │   │   └─ nut ×2
│   │   ├─ hose.ldpe16  (10 m)
│   │   └─ valve.manual
│   │       └─ body
│   │           ├─ seat
│   │           ├─ ball
│   │           ├─ stem
│   │           ├─ stem_oring
│   │           └─ handle
│   ├─ Z2
│   │   ├─ joint.sm1bm1
│   │   │   ├─ swivel_nut
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
│   │   │   │   ├─ thread
│   │   │   │   ├─ nut
│   │   │   │   ├─ [upstream_chamber]
│   │   │   │   └─ [downstream_chamber]
│   │   │   ├─ diaphragm
│   │   │   │   ├─ spring
│   │   │   │   └─ [metering_port]
│   │   │   ├─ bonnet
│   │   │   │   ├─ [chamber]
│   │   │   │   ├─ bleed_screw
│   │   │   │   ├─ flow_control
│   │   │   │   ├─ bonnet_cap
│   │   │   │   └─ bonnet_screws
│   │   │   └─ solenoid  (Hunter 458200 (24 VAC))
│   │   │       ├─ [entry]
│   │   │       ├─ plunger
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot_seat]
│   │   │       ├─ 24v_1
│   │   │       ├─ coil
│   │   │       ├─ 24v_2
│   │   │       ├─ plunger_spring
│   │   │       └─ solenoid_oring
│   │   ├─ joint.bm1c25
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ joint.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ joint.c25bf34
│   │   │   ├─ nut
│   │   │   ├─ grip
│   │   │   ├─ oring
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   ├─ head.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (4 m)
│   │   ├─ joint.tee_c25bf34
│   │   │   ├─ nut ×2
│   │   │   ├─ grip ×2
│   │   │   ├─ oring ×2
│   │   │   ├─ thread
│   │   │   └─ body
│   │   ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│   │   ├─ head.rotor  (BL4.0, 170°)  (Hunter I-20-04-SS)
│   │   │   ├─ thread
│   │   │   └─ body
│   │   │       ├─ check_valve
│   │   │       ├─ riser
│   │   │       ├─ riser_seal
│   │   │       ├─ retract_spring
│   │   │       ├─ gear
│   │   │       ├─ filter
│   │   │       ├─ nozzle
│   │   │       ├─ arc
│   │   │       └─ flo_stop
│   │   ├─ hose.ldpe25  (18 m)
│   │   ├─ joint.c25bf34
│   │   │   ├─ nut
│   │   │   ├─ grip
│   │   │   ├─ oring
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   └─ head.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
│   │       ├─ thread
│   │       └─ body
│   │           ├─ cap
│   │           ├─ check_valve
│   │           ├─ regulator
│   │           ├─ riser
│   │           ├─ wiper_seal
│   │           ├─ spring
│   │           ├─ flush_plug
│   │           └─ nozzle
│   ├─ Z3
│   │   ├─ joint.sm1bm1
│   │   │   ├─ swivel_nut
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
│   │   │   │   ├─ thread
│   │   │   │   ├─ nut
│   │   │   │   ├─ [upstream_chamber]
│   │   │   │   └─ [downstream_chamber]
│   │   │   ├─ diaphragm
│   │   │   │   ├─ spring
│   │   │   │   └─ [metering_port]
│   │   │   ├─ bonnet
│   │   │   │   ├─ [chamber]
│   │   │   │   ├─ bleed_screw
│   │   │   │   ├─ flow_control
│   │   │   │   ├─ bonnet_cap
│   │   │   │   └─ bonnet_screws
│   │   │   └─ solenoid  (Hunter 458200 (24 VAC))
│   │   │       ├─ [entry]
│   │   │       ├─ plunger
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot_seat]
│   │   │       ├─ 24v_1
│   │   │       ├─ coil
│   │   │       ├─ 24v_2
│   │   │       ├─ plunger_spring
│   │   │       └─ solenoid_oring
│   │   ├─ joint.bm1c25
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ joint.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ joint.c25bf34
│   │   │   ├─ nut
│   │   │   ├─ grip
│   │   │   ├─ oring
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│   │   ├─ head.rotor  (BL2.5, 150°)  (Hunter I-20-04-SS)
│   │   │   ├─ thread
│   │   │   └─ body
│   │   │       ├─ check_valve
│   │   │       ├─ riser
│   │   │       ├─ riser_seal
│   │   │       ├─ retract_spring
│   │   │       ├─ gear
│   │   │       ├─ filter
│   │   │       ├─ nozzle
│   │   │       ├─ arc
│   │   │       └─ flo_stop
│   │   ├─ hose.ldpe25  (10 m)
│   │   ├─ joint.c25bf34
│   │   │   ├─ nut
│   │   │   ├─ grip
│   │   │   ├─ oring
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│   │   └─ head.rotor  (BL5.0, 270°)  (Hunter I-20-04-SS)
│   │       ├─ thread
│   │       └─ body
│   │           ├─ check_valve
│   │           ├─ riser
│   │           ├─ riser_seal
│   │           ├─ retract_spring
│   │           ├─ gear
│   │           ├─ filter
│   │           ├─ nozzle
│   │           ├─ arc
│   │           └─ flo_stop
│   ├─ Z4
│   │   ├─ joint.sm1bm1
│   │   │   ├─ swivel_nut
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
│   │   │   │   ├─ thread
│   │   │   │   ├─ nut
│   │   │   │   ├─ [upstream_chamber]
│   │   │   │   └─ [downstream_chamber]
│   │   │   ├─ diaphragm
│   │   │   │   ├─ spring
│   │   │   │   └─ [metering_port]
│   │   │   ├─ bonnet
│   │   │   │   ├─ [chamber]
│   │   │   │   ├─ bleed_screw
│   │   │   │   ├─ flow_control
│   │   │   │   ├─ bonnet_cap
│   │   │   │   └─ bonnet_screws
│   │   │   └─ solenoid  (Hunter 458200 (24 VAC))
│   │   │       ├─ [entry]
│   │   │       ├─ plunger
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot_seat]
│   │   │       ├─ 24v_1
│   │   │       ├─ coil
│   │   │       ├─ 24v_2
│   │   │       ├─ plunger_spring
│   │   │       └─ solenoid_oring
│   │   ├─ joint.bm1c25
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe25  (10 m)
│   │   ├─ joint.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ joint.c25bf34
│   │   │   ├─ nut
│   │   │   ├─ grip
│   │   │   ├─ oring
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   ├─ head.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ joint.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (6 m)
│   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   ├─ head.spray  (MP1000, 210°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (20 m)
│   │   ├─ joint.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ joint.c25bf34
│   │   │   ├─ nut
│   │   │   ├─ grip
│   │   │   ├─ oring
│   │   │   ├─ body
│   │   │   └─ thread
│   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   ├─ head.spray  (MP2000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (6 m)
│   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   └─ head.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
│   │       ├─ thread
│   │       └─ body
│   │           ├─ cap
│   │           ├─ check_valve
│   │           ├─ regulator
│   │           ├─ riser
│   │           ├─ wiper_seal
│   │           ├─ spring
│   │           ├─ flush_plug
│   │           └─ nozzle
│   └─ Z5
│       ├─ joint.sm1bm1
│       │   ├─ swivel_nut
│       │   ├─ body
│       │   └─ thread
│       ├─ valve.auto  (Hunter PGV-101G)
│       │   ├─ body
│       │   │   ├─ seat
│       │   │   ├─ thread
│       │   │   ├─ nut
│       │   │   ├─ [upstream_chamber]
│       │   │   └─ [downstream_chamber]
│       │   ├─ diaphragm
│       │   │   ├─ spring
│       │   │   └─ [metering_port]
│       │   ├─ bonnet
│       │   │   ├─ [chamber]
│       │   │   ├─ bleed_screw
│       │   │   ├─ flow_control
│       │   │   ├─ bonnet_cap
│       │   │   └─ bonnet_screws
│       │   └─ solenoid  (Hunter 458200 (24 VAC))
│       │       ├─ [entry]
│       │       ├─ plunger
│       │       ├─ [exhaust]
│       │       ├─ [pilot_seat]
│       │       ├─ 24v_1
│       │       ├─ coil
│       │       ├─ 24v_2
│       │       ├─ plunger_spring
│       │       └─ solenoid_oring
│       ├─ joint.bm1c25
│       │   ├─ thread
│       │   ├─ body
│       │   ├─ oring
│       │   ├─ grip
│       │   └─ nut
│       ├─ hose.ldpe25  (20 m)
│       ├─ joint.tee
│       │   ├─ nut ×3
│       │   ├─ grip ×3
│       │   ├─ oring ×3
│       │   └─ body
│       ├─ hose.ldpe25  (4 m)
│       ├─ joint.c25bf34
│       │   ├─ nut
│       │   ├─ grip
│       │   ├─ oring
│       │   ├─ body
│       │   └─ thread
│       ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│       ├─ head.rotor  (BL5.0, 270°)  (Hunter I-20-04-SS)
│       │   ├─ thread
│       │   └─ body
│       │       ├─ check_valve
│       │       ├─ riser
│       │       ├─ riser_seal
│       │       ├─ retract_spring
│       │       ├─ gear
│       │       ├─ filter
│       │       ├─ nozzle
│       │       ├─ arc
│       │       └─ flo_stop
│       ├─ hose.ldpe25  (12 m)
│       ├─ joint.c25bf34
│       │   ├─ nut
│       │   ├─ grip
│       │   ├─ oring
│       │   ├─ body
│       │   └─ thread
│       ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│       └─ head.rotor  (BL2.5, 180°)  (Hunter I-20-04-SS)
│           ├─ thread
│           └─ body
│               ├─ check_valve
│               ├─ riser
│               ├─ riser_seal
│               ├─ retract_spring
│               ├─ gear
│               ├─ filter
│               ├─ nozzle
│               ├─ arc
│               └─ flo_stop
└─ 4. ORCHESTRATE
    ├─ source.socket
    │   ├─ line
    │   ├─ neutral
    │   └─ earth
    ├─ wiring.230v
    │   ├─ line
    │   ├─ neutral
    │   └─ earth
    ├─ control.controller  (RainMachine HD-12 TOUCH)
    │   ├─ line
    │   ├─ neutral
    │   ├─ screen
    │   ├─ transformer
    │   │   ├─ line
    │   │   ├─ neutral
    │   │   └─ winding
    │   └─ terminals
    │       ├─ ac_line ×2
    │       ├─ common ×2
    │       └─ port ×12
    └─ solenoid_wiring
        ├─ wiring.splice
        │   └─ splice
        ├─ wiring.splice
        │   └─ splice
        ├─ wiring.splice
        │   └─ splice
        ├─ wiring.splice
        │   └─ splice
        ├─ wiring.splice
        │   └─ splice
        ├─ wiring.splice
        │   └─ splice
        ├─ wiring.splice
        │   └─ splice
        └─ wiring.splice
            └─ splice
```
