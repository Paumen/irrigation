# Irrigation system — Bill of Materials (generated)

GENERATED from graph.yaml by tools/render_bom.py. Lines are raw graph keys.
Sections + zone(Z#) are prefix buckets; assemblies/parts come from the items: tree.

```
IRRIGATION SYSTEM
├─ 1. SUPPLY
│   ├─ source.well
│   ├─ hose.ldpe32  (1 m)
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
│   │   │   ├─ fitting.strainer_basket
│   │   │   │   ├─ mesh
│   │   │   │   └─ body
│   │   │   └─ fitting.hosetail_brass
│   │   │       ├─ inlet_thread
│   │   │       ├─ barb
│   │   │       └─ body
│   │   ├─ hose.suction  (4.5 m)
│   │   │   └─ clamp ×2
│   │   └─ fitting.hosetail_plastic
│   │       ├─ barb
│   │       ├─ outlet_thread
│   │       └─ body
│   ├─ pump_discharge
│   │   ├─ fitting.coupling_bm1c32
│   │   │   ├─ inlet_thread
│   │   │   ├─ body
│   │   │   ├─ outlet_oring
│   │   │   ├─ outlet_grip
│   │   │   └─ outlet_nut
│   │   └─ fitting.coupling_c32c32
│   │       ├─ inlet_nut
│   │       ├─ inlet_grip
│   │       ├─ inlet_oring
│   │       ├─ body
│   │       ├─ outlet_oring
│   │       ├─ outlet_grip
│   │       └─ outlet_nut
│   └─ pump_power_assembly
│       └─ relay.pumpstart  (Hunter PSR-22)
│           ├─ coil_in
│           ├─ coil
│           ├─ coil_common
│           ├─ contact
│           ├─ line
│           ├─ load_outlet
│           ├─ neutral
│           └─ earth
├─ 2. DISTRIBUTE
│   ├─ hose.ldpe32  (20 m)
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
│   ├─ enclosure.valvebox  (valve box XL)
│   │   ├─ enclosure
│   │   └─ lid
│   └─ manifold_assembly
│       ├─ fitting.manifold  (LEV 6-way distributor)
│       │   ├─ inlet_washer
│       │   ├─ outlet_washer ×6
│       │   ├─ body
│       │   └─ [distribution_gallery]
│       ├─ fitting.coupling_c32sm1
│       │   ├─ inlet_nut
│       │   ├─ inlet_grip
│       │   ├─ inlet_oring
│       │   ├─ body
│       │   └─ outlet_swivel_nut
│       └─ fitting.cap
│           ├─ inlet_swivel_nut
│           └─ body
├─ 3. DELIVER
│   ├─ solenoid_wiring
│   │   ├─ wiring.splice
│   │   ├─ wiring.splice
│   │   ├─ wiring.splice
│   │   ├─ wiring.splice
│   │   ├─ wiring.splice
│   │   ├─ wiring.splice
│   │   ├─ wiring.splice
│   │   └─ wiring.splice
│   ├─ Z1
│   │   ├─ fitting.coupling_sm1c16
│   │   │   ├─ inlet_swivel_nut
│   │   │   ├─ body
│   │   │   ├─ outlet_oring
│   │   │   ├─ outlet_grip
│   │   │   └─ outlet_nut
│   │   ├─ hose.ldpe16  (10 m)
│   │   ├─ fitting.coupling_c16c16
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_oring
│   │   │   ├─ outlet_grip
│   │   │   └─ outlet_nut
│   │   ├─ hose.ldpe16  (10 m)
│   │   ├─ valve.manual
│   │   │   └─ body
│   │   │       ├─ seat
│   │   │       ├─ ball
│   │   │       ├─ stem
│   │   │       ├─ stem_oring
│   │   │       ├─ handle
│   │   │       ├─ inlet_thread
│   │   │       └─ [through_bore]
│   │   ├─ hose.ldpe16  (10 m)
│   │   └─ emitter.stream
│   ├─ Z2
│   │   ├─ fitting.coupling_sm1bm1
│   │   │   ├─ inlet_swivel_nut
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
│   │   │   │   ├─ inlet_thread
│   │   │   │   ├─ outlet_nut
│   │   │   │   ├─ [inlet_chamber]
│   │   │   │   └─ [outlet_chamber]
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
│   │   ├─ fitting.coupling_bm1c25
│   │   │   ├─ inlet_thread
│   │   │   ├─ body
│   │   │   ├─ outlet_oring
│   │   │   ├─ outlet_grip
│   │   │   └─ outlet_nut
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ fitting.tee
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_1_oring
│   │   │   ├─ outlet_1_grip
│   │   │   ├─ outlet_1_nut
│   │   │   ├─ outlet_2_oring
│   │   │   ├─ outlet_2_grip
│   │   │   └─ outlet_2_nut
│   │   ├─ hose.ldpe25  (7 m)
│   │   ├─ fitting.coupling_c25bf34
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   ├─ emitter.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ inlet_thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ retract_spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (3 m)
│   │   ├─ fitting.tee
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_1_oring
│   │   │   ├─ outlet_1_grip
│   │   │   ├─ outlet_1_nut
│   │   │   ├─ outlet_2_oring
│   │   │   ├─ outlet_2_grip
│   │   │   └─ outlet_2_nut
│   │   ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   ├─ emitter.rotor  (4.0 blue, 170°)  (Hunter I-20-04-SS)
│   │   │   ├─ inlet_thread
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
│   │   ├─ hose.ldpe25  (17 m)
│   │   ├─ fitting.coupling_c25bf34
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   └─ emitter.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
│   │       ├─ inlet_thread
│   │       └─ body
│   │           ├─ cap
│   │           ├─ check_valve
│   │           ├─ regulator
│   │           ├─ riser
│   │           ├─ wiper_seal
│   │           ├─ retract_spring
│   │           ├─ flush_plug
│   │           └─ nozzle
│   ├─ Z3
│   │   ├─ fitting.coupling_sm1bm1
│   │   │   ├─ inlet_swivel_nut
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
│   │   │   │   ├─ inlet_thread
│   │   │   │   ├─ outlet_nut
│   │   │   │   ├─ [inlet_chamber]
│   │   │   │   └─ [outlet_chamber]
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
│   │   ├─ fitting.coupling_bm1c25
│   │   │   ├─ inlet_thread
│   │   │   ├─ body
│   │   │   ├─ outlet_oring
│   │   │   ├─ outlet_grip
│   │   │   └─ outlet_nut
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ fitting.tee
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_1_oring
│   │   │   ├─ outlet_1_grip
│   │   │   ├─ outlet_1_nut
│   │   │   ├─ outlet_2_oring
│   │   │   ├─ outlet_2_grip
│   │   │   └─ outlet_2_nut
│   │   ├─ hose.ldpe25  (1 m)
│   │   ├─ fitting.coupling_c25bf34
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   ├─ emitter.rotor  (2.5 blue, 150°)  (Hunter I-20-04-SS)
│   │   │   ├─ inlet_thread
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
│   │   ├─ hose.ldpe25  (9 m)
│   │   ├─ fitting.coupling_c25bf34
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   └─ emitter.rotor  (5.0 blue, 270°)  (Hunter I-20-04-SS)
│   │       ├─ inlet_thread
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
│   │   ├─ fitting.coupling_sm1bm1
│   │   │   ├─ inlet_swivel_nut
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
│   │   │   │   ├─ inlet_thread
│   │   │   │   ├─ outlet_nut
│   │   │   │   ├─ [inlet_chamber]
│   │   │   │   └─ [outlet_chamber]
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
│   │   ├─ fitting.coupling_bm1c25
│   │   │   ├─ inlet_thread
│   │   │   ├─ body
│   │   │   ├─ outlet_oring
│   │   │   ├─ outlet_grip
│   │   │   └─ outlet_nut
│   │   ├─ hose.ldpe25  (9 m)
│   │   ├─ fitting.tee
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_1_oring
│   │   │   ├─ outlet_1_grip
│   │   │   ├─ outlet_1_nut
│   │   │   ├─ outlet_2_oring
│   │   │   ├─ outlet_2_grip
│   │   │   └─ outlet_2_nut
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ fitting.coupling_c25bf34
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   ├─ emitter.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ inlet_thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ retract_spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ fitting.tee
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_1_oring
│   │   │   ├─ outlet_1_grip
│   │   │   ├─ outlet_1_nut
│   │   │   ├─ outlet_2_oring
│   │   │   ├─ outlet_2_grip
│   │   │   └─ outlet_2_nut
│   │   ├─ hose.ldpe25  (6 m)
│   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   ├─ emitter.spray  (MP1000, 210°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ inlet_thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ retract_spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (19 m)
│   │   ├─ fitting.tee
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   ├─ outlet_1_oring
│   │   │   ├─ outlet_1_grip
│   │   │   ├─ outlet_1_nut
│   │   │   ├─ outlet_2_oring
│   │   │   ├─ outlet_2_grip
│   │   │   └─ outlet_2_nut
│   │   ├─ fitting.coupling_c25bf34
│   │   │   ├─ inlet_nut
│   │   │   ├─ inlet_grip
│   │   │   ├─ inlet_oring
│   │   │   ├─ body
│   │   │   └─ outlet_thread
│   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   ├─ emitter.spray  (MP2000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │   ├─ inlet_thread
│   │   │   └─ body
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ retract_spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (5 m)
│   │   ├─ fitting.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   ├─ inlet_thread
│   │   │   ├─ outlet_thread
│   │   │   └─ body
│   │   └─ emitter.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
│   │       ├─ inlet_thread
│   │       └─ body
│   │           ├─ cap
│   │           ├─ check_valve
│   │           ├─ regulator
│   │           ├─ riser
│   │           ├─ wiper_seal
│   │           ├─ retract_spring
│   │           ├─ flush_plug
│   │           └─ nozzle
│   └─ Z5
│       ├─ fitting.coupling_sm1bm1
│       │   ├─ inlet_swivel_nut
│       │   ├─ body
│       │   └─ outlet_thread
│       ├─ valve.auto  (Hunter PGV-101G)
│       │   ├─ body
│       │   │   ├─ seat
│       │   │   ├─ inlet_thread
│       │   │   ├─ outlet_nut
│       │   │   ├─ [inlet_chamber]
│       │   │   └─ [outlet_chamber]
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
│       ├─ fitting.coupling_bm1c25
│       │   ├─ inlet_thread
│       │   ├─ body
│       │   ├─ outlet_oring
│       │   ├─ outlet_grip
│       │   └─ outlet_nut
│       ├─ hose.ldpe25  (20 m)
│       ├─ fitting.tee
│       │   ├─ inlet_nut
│       │   ├─ inlet_grip
│       │   ├─ inlet_oring
│       │   ├─ body
│       │   ├─ outlet_1_oring
│       │   ├─ outlet_1_grip
│       │   ├─ outlet_1_nut
│       │   ├─ outlet_2_oring
│       │   ├─ outlet_2_grip
│       │   └─ outlet_2_nut
│       ├─ hose.ldpe25  (3 m)
│       ├─ fitting.coupling_c25bf34
│       │   ├─ inlet_nut
│       │   ├─ inlet_grip
│       │   ├─ inlet_oring
│       │   ├─ body
│       │   └─ outlet_thread
│       ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│       │   ├─ inlet_thread
│       │   ├─ outlet_thread
│       │   └─ body
│       ├─ emitter.rotor  (5.0 blue, 270°)  (Hunter I-20-04-SS)
│       │   ├─ inlet_thread
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
│       ├─ fitting.coupling_c25bf34
│       │   ├─ inlet_nut
│       │   ├─ inlet_grip
│       │   ├─ inlet_oring
│       │   ├─ body
│       │   └─ outlet_thread
│       ├─ fitting.sj34x34  (Hunter sj 3/4x3/4)
│       │   ├─ inlet_thread
│       │   ├─ outlet_thread
│       │   └─ body
│       └─ emitter.rotor  (2.5 blue, 180°)  (Hunter I-20-04-SS)
│           ├─ inlet_thread
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
    │   └─ terminal-board
    │       ├─ ac_line ×2
    │       ├─ common_1
    │       ├─ port ×6
    │       ├─ common_2
    │       └─ port ×6
    └─ wiring.24v
        └─ tube
            ├─ common
            └─ signal ×4
```
