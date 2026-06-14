# Irrigation system — Bill of Materials (generated)

GENERATED from system.yaml by tools/render_bom.py. Lines are raw graph keys.
Sections + zone(Z#) are prefix buckets; assemblies/parts come from the items: tree.

```
IRRIGATION SYSTEM
├─ 1. SUPPLY
│   ├─ source.well
│   ├─ hose.ldpe32  (2 m)
│   │   └─ tube
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
│   │   │   ├─ [venturi_throat]
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
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ suction_assembly
│   │   ├─ foot_valve_assembly
│   │   │   ├─ valve.foot
│   │   │   │   ├─ body
│   │   │   │   ├─ disc
│   │   │   │   ├─ spring
│   │   │   │   └─ seat_seal
│   │   │   ├─ fitting.strainer
│   │   │   │   └─ mesh
│   │   │   └─ fitting.hosetail_brass
│   │   │       ├─ thread
│   │   │       ├─ barb
│   │   │       └─ body
│   │   ├─ hose.suction  (4 m)
│   │   │   ├─ tube
│   │   │   └─ clamp ×2
│   │   └─ fitting.hosetail_plastic
│   │       ├─ barb
│   │       ├─ thread
│   │       └─ body
│   ├─ pump_discharge
│   │   ├─ fitting.bm1c32
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   └─ fitting.c32c32
│   │       ├─ body
│   │       ├─ oring ×2
│   │       ├─ grip ×2
│   │       └─ nut ×2
│   └─ pump_power_assembly
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
│   │   └─ tube
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ wiring.24v
│   │   └─ tube
│   │       ├─ common
│   │       └─ signal ×4
│   ├─ enclosure.valvebox  (valve box jumbo)
│   │   ├─ enclosure
│   │   └─ lid
│   └─ manifold_assembly
│       ├─ fitting.manifold  (LEV 6-way distributor)
│       │   ├─ washer ×7
│       │   ├─ body
│       │   └─ [distribution_gallery]
│       ├─ fitting.c32sm1
│       │   ├─ nut
│       │   ├─ grip
│       │   ├─ oring
│       │   ├─ body
│       │   └─ swivel_nut
│       └─ fitting.cap
│           ├─ swivel_nut
│           └─ body
├─ 3. DELIVER
│   ├─ solenoid_wiring
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   ├─ wiring.splice
│   │   │   └─ splice
│   │   └─ wiring.splice
│   │       └─ splice
│   ├─ Z1
│   │   ├─ fitting.sm1c16
│   │   │   ├─ swivel_nut
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe16  (10 m)
│   │   │   └─ tube
│   │   ├─ fitting.c16c16
│   │   │   ├─ body
│   │   │   ├─ oring ×2
│   │   │   ├─ grip ×2
│   │   │   └─ nut ×2
│   │   ├─ hose.ldpe16  (10 m)
│   │   │   └─ tube
│   │   └─ valve.manual
│   │       └─ body
│   │           ├─ seat
│   │           ├─ ball
│   │           ├─ stem
│   │           ├─ stem_oring
│   │           └─ handle
│   ├─ Z2
│   │   ├─ fitting.sm1bm1
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
│   │   ├─ fitting.bm1c25
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe25  (8 m)
│   │   │   └─ tube
│   │   ├─ fitting.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (8 m)
│   │   │   └─ tube
│   │   ├─ riser_1
│   │   │   ├─ fitting.c25bf34
│   │   │   │   ├─ nut
│   │   │   │   ├─ grip
│   │   │   │   ├─ oring
│   │   │   │   ├─ body
│   │   │   │   └─ thread
│   │   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   │   ├─ thread ×2
│   │   │   │   └─ body
│   │   │   └─ head.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │       ├─ thread
│   │   │       └─ body
│   │   │           ├─ cap
│   │   │           ├─ check_valve
│   │   │           ├─ regulator
│   │   │           ├─ riser
│   │   │           ├─ wiper_seal
│   │   │           ├─ spring
│   │   │           ├─ flush_plug
│   │   │           └─ nozzle
│   │   ├─ hose.ldpe25  (4 m)
│   │   │   └─ tube
│   │   ├─ fitting.tee_c25bf34
│   │   │   ├─ nut ×2
│   │   │   ├─ grip ×2
│   │   │   ├─ oring ×2
│   │   │   ├─ thread
│   │   │   └─ body
│   │   ├─ riser_2
│   │   │   ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   │   ├─ thread ×2
│   │   │   │   └─ body
│   │   │   └─ head.rotor  (BL4.0, 170°)  (Hunter I-20-04-SS)
│   │   │       ├─ thread
│   │   │       └─ body
│   │   │           ├─ check_valve
│   │   │           ├─ riser
│   │   │           ├─ riser_seal
│   │   │           ├─ retract_spring
│   │   │           ├─ gear
│   │   │           ├─ filter
│   │   │           ├─ nozzle
│   │   │           ├─ arc
│   │   │           └─ flo_stop
│   │   ├─ hose.ldpe25  (18 m)
│   │   │   └─ tube
│   │   └─ riser_3
│   │       ├─ fitting.c25bf34
│   │       │   ├─ nut
│   │       │   ├─ grip
│   │       │   ├─ oring
│   │       │   ├─ body
│   │       │   └─ thread
│   │       ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │       │   ├─ thread ×2
│   │       │   └─ body
│   │       └─ head.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
│   │           ├─ thread
│   │           └─ body
│   │               ├─ cap
│   │               ├─ check_valve
│   │               ├─ regulator
│   │               ├─ riser
│   │               ├─ wiper_seal
│   │               ├─ spring
│   │               ├─ flush_plug
│   │               └─ nozzle
│   ├─ Z3
│   │   ├─ fitting.sm1bm1
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
│   │   ├─ fitting.bm1c25
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe25  (2 m)
│   │   │   └─ tube
│   │   ├─ fitting.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (2 m)
│   │   │   └─ tube
│   │   ├─ riser_1
│   │   │   ├─ fitting.c25bf34
│   │   │   │   ├─ nut
│   │   │   │   ├─ grip
│   │   │   │   ├─ oring
│   │   │   │   ├─ body
│   │   │   │   └─ thread
│   │   │   ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   │   ├─ thread ×2
│   │   │   │   └─ body
│   │   │   └─ head.rotor  (BL2.5, 150°)  (Hunter I-20-04-SS)
│   │   │       ├─ thread
│   │   │       └─ body
│   │   │           ├─ check_valve
│   │   │           ├─ riser
│   │   │           ├─ riser_seal
│   │   │           ├─ retract_spring
│   │   │           ├─ gear
│   │   │           ├─ filter
│   │   │           ├─ nozzle
│   │   │           ├─ arc
│   │   │           └─ flo_stop
│   │   ├─ hose.ldpe25  (10 m)
│   │   │   └─ tube
│   │   └─ riser_2
│   │       ├─ fitting.c25bf34
│   │       │   ├─ nut
│   │       │   ├─ grip
│   │       │   ├─ oring
│   │       │   ├─ body
│   │       │   └─ thread
│   │       ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│   │       │   ├─ thread ×2
│   │       │   └─ body
│   │       └─ head.rotor  (BL5.0, 270°)  (Hunter I-20-04-SS)
│   │           ├─ thread
│   │           └─ body
│   │               ├─ check_valve
│   │               ├─ riser
│   │               ├─ riser_seal
│   │               ├─ retract_spring
│   │               ├─ gear
│   │               ├─ filter
│   │               ├─ nozzle
│   │               ├─ arc
│   │               └─ flo_stop
│   ├─ Z4
│   │   ├─ fitting.sm1bm1
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
│   │   ├─ fitting.bm1c25
│   │   │   ├─ thread
│   │   │   ├─ body
│   │   │   ├─ oring
│   │   │   ├─ grip
│   │   │   └─ nut
│   │   ├─ hose.ldpe25  (10 m)
│   │   │   └─ tube
│   │   ├─ fitting.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (2 m)
│   │   │   └─ tube
│   │   ├─ riser_1
│   │   │   ├─ fitting.c25bf34
│   │   │   │   ├─ nut
│   │   │   │   ├─ grip
│   │   │   │   ├─ oring
│   │   │   │   ├─ body
│   │   │   │   └─ thread
│   │   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   │   ├─ thread ×2
│   │   │   │   └─ body
│   │   │   └─ head.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │       ├─ thread
│   │   │       └─ body
│   │   │           ├─ cap
│   │   │           ├─ check_valve
│   │   │           ├─ regulator
│   │   │           ├─ riser
│   │   │           ├─ wiper_seal
│   │   │           ├─ spring
│   │   │           ├─ flush_plug
│   │   │           └─ nozzle
│   │   ├─ hose.ldpe25  (8 m)
│   │   │   └─ tube
│   │   ├─ fitting.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ hose.ldpe25  (6 m)
│   │   │   └─ tube
│   │   ├─ riser_2
│   │   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   │   ├─ thread ×2
│   │   │   │   └─ body
│   │   │   └─ head.spray  (MP1000, 210°)  (Hunter Pro-Spray PRS40)
│   │   │       ├─ thread
│   │   │       └─ body
│   │   │           ├─ cap
│   │   │           ├─ check_valve
│   │   │           ├─ regulator
│   │   │           ├─ riser
│   │   │           ├─ wiper_seal
│   │   │           ├─ spring
│   │   │           ├─ flush_plug
│   │   │           └─ nozzle
│   │   ├─ hose.ldpe25  (20 m)
│   │   │   └─ tube
│   │   ├─ fitting.tee
│   │   │   ├─ nut ×3
│   │   │   ├─ grip ×3
│   │   │   ├─ oring ×3
│   │   │   └─ body
│   │   ├─ riser_3
│   │   │   ├─ fitting.c25bf34
│   │   │   │   ├─ nut
│   │   │   │   ├─ grip
│   │   │   │   ├─ oring
│   │   │   │   ├─ body
│   │   │   │   └─ thread
│   │   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   │   ├─ thread ×2
│   │   │   │   └─ body
│   │   │   └─ head.spray  (MP2000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │       ├─ thread
│   │   │       └─ body
│   │   │           ├─ cap
│   │   │           ├─ check_valve
│   │   │           ├─ regulator
│   │   │           ├─ riser
│   │   │           ├─ wiper_seal
│   │   │           ├─ spring
│   │   │           ├─ flush_plug
│   │   │           └─ nozzle
│   │   ├─ hose.ldpe25  (6 m)
│   │   │   └─ tube
│   │   └─ riser_4
│   │       ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │       │   ├─ thread ×2
│   │       │   └─ body
│   │       └─ head.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
│   │           ├─ thread
│   │           └─ body
│   │               ├─ cap
│   │               ├─ check_valve
│   │               ├─ regulator
│   │               ├─ riser
│   │               ├─ wiper_seal
│   │               ├─ spring
│   │               ├─ flush_plug
│   │               └─ nozzle
│   └─ Z5
│       ├─ fitting.sm1bm1
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
│       ├─ fitting.bm1c25
│       │   ├─ thread
│       │   ├─ body
│       │   ├─ oring
│       │   ├─ grip
│       │   └─ nut
│       ├─ hose.ldpe25  (20 m)
│       │   └─ tube
│       ├─ fitting.tee
│       │   ├─ nut ×3
│       │   ├─ grip ×3
│       │   ├─ oring ×3
│       │   └─ body
│       ├─ hose.ldpe25  (4 m)
│       │   └─ tube
│       ├─ riser_1
│       │   ├─ fitting.c25bf34
│       │   │   ├─ nut
│       │   │   ├─ grip
│       │   │   ├─ oring
│       │   │   ├─ body
│       │   │   └─ thread
│       │   ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│       │   │   ├─ thread ×2
│       │   │   └─ body
│       │   └─ head.rotor  (BL5.0, 270°)  (Hunter I-20-04-SS)
│       │       ├─ thread
│       │       └─ body
│       │           ├─ check_valve
│       │           ├─ riser
│       │           ├─ riser_seal
│       │           ├─ retract_spring
│       │           ├─ gear
│       │           ├─ filter
│       │           ├─ nozzle
│       │           ├─ arc
│       │           └─ flo_stop
│       ├─ hose.ldpe25  (12 m)
│       │   └─ tube
│       └─ riser_2
│           ├─ fitting.c25bf34
│           │   ├─ nut
│           │   ├─ grip
│           │   ├─ oring
│           │   ├─ body
│           │   └─ thread
│           ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│           │   ├─ thread ×2
│           │   └─ body
│           └─ head.rotor  (BL2.5, 180°)  (Hunter I-20-04-SS)
│               ├─ thread
│               └─ body
│                   ├─ check_valve
│                   ├─ riser
│                   ├─ riser_seal
│                   ├─ retract_spring
│                   ├─ gear
│                   ├─ filter
│                   ├─ nozzle
│                   ├─ arc
│                   └─ flo_stop
└─ 4. ORCHESTRATE
    ├─ source.socket
    │   ├─ line
    │   ├─ neutral
    │   └─ earth
    ├─ wiring.230v
    │   ├─ line
    │   ├─ neutral
    │   └─ earth
    └─ control.controller  (RainMachine HD-12 TOUCH)
        ├─ line
        ├─ neutral
        ├─ screen
        ├─ transformer
        │   ├─ line
        │   ├─ neutral
        │   └─ winding
        └─ terminal-board
            ├─ ac_line ×2
            ├─ common ×2
            └─ port ×12
```
