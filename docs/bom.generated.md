# Irrigation system — Bill of Materials (generated)

GENERATED from system.yaml by tools/render_bom.py. Lines are raw graph keys.
Sections + zone(Z#) are prefix buckets; assemblies/parts come from the items: tree.

```
IRRIGATION SYSTEM
├─ 1. SUPPLY
│   ├─ source.well
│   ├─ joint.strainer
│   ├─ valve.foot
│   ├─ joint.hosetail_brass
│   ├─ hose.suction  (4 m)
│   ├─ joint.hosetail_plastic
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
│   │   │   ├─ priming_cap
│   │   │   ├─ [recirculation_passage]
│   │   │   └─ [priming_chamber]
│   │   └─ motor
│   │       ├─ line
│   │       ├─ winding
│   │       ├─ capacitor
│   │       ├─ thermal_protector
│   │       ├─ neutral
│   │       └─ earth
│   ├─ joint.bm1c32
│   ├─ joint.c32c32
│   ├─ source.socket
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ wiring.230v
│   │   ├─ line
│   │   ├─ neutral
│   │   └─ earth
│   ├─ relay.pumpstart  (Hunter PSR-22)
│   │   ├─ coil_in
│   │   ├─ coil
│   │   ├─ coil_common
│   │   ├─ contact
│   │   ├─ line
│   │   ├─ load
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
│   └─ wiring.24v
├─ 2. DISTRIBUTE
│   ├─ hose.ldpe32  (20 m)
│   ├─ joint.c32sm1
│   ├─ joint.manifold  (LEV 6-way distributor)
│   ├─ wiring.24v
│   └─ enclosure.valvebox  (valve box jumbo)
│       ├─ enclosure
│       └─ lid
├─ 3. DELIVER
│   ├─ joint.cap
│   ├─ Z1
│   │   ├─ joint.sm1c16
│   │   ├─ hose.ldpe16  (10 m)
│   │   ├─ joint.c16c16
│   │   ├─ hose.ldpe16  (10 m)
│   │   └─ valve.manual
│   │       ├─ seat
│   │       ├─ ball
│   │       ├─ stem
│   │       ├─ stem_oring
│   │       └─ handle
│   ├─ Z2
│   │   ├─ joint.sm1bm1
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
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
│   │   │       │   └─ spring
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot_seat]
│   │   │       ├─ 24v_1
│   │   │       ├─ coil
│   │   │       └─ 24v_2
│   │   ├─ joint.bm1c25
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ joint.tee
│   │   ├─ hose.ldpe25  (8 m)
│   │   ├─ riser_1
│   │   │   ├─ joint.c25bf34
│   │   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   └─ head.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
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
│   │   ├─ riser_2
│   │   │   ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   └─ head.rotor  (BL4.0, 170°, ~12.2 m throw @3 bar)  (Hunter I-20-04-SS)
│   │   │       ├─ check_valve
│   │   │       ├─ riser
│   │   │       ├─ riser_seal
│   │   │       ├─ spring
│   │   │       ├─ gear
│   │   │       ├─ filter
│   │   │       ├─ nozzle
│   │   │       ├─ arc
│   │   │       └─ flo_stop
│   │   ├─ hose.ldpe25  (18 m)
│   │   └─ riser_3
│   │       ├─ joint.c25bf34
│   │       ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │       └─ head.spray  (MP2000, 180°)  (Hunter Pro-Spray PRS40)
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
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
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
│   │   │       │   └─ spring
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot_seat]
│   │   │       ├─ 24v_1
│   │   │       ├─ coil
│   │   │       └─ 24v_2
│   │   ├─ joint.bm1c25
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ joint.tee
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ riser_1
│   │   │   ├─ joint.c25bf34
│   │   │   ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│   │   │   └─ head.rotor  (BL2.5, 150°, ~10.7 m throw @3 bar)  (Hunter I-20-04-SS)
│   │   │       ├─ check_valve
│   │   │       ├─ riser
│   │   │       ├─ riser_seal
│   │   │       ├─ spring
│   │   │       ├─ gear
│   │   │       ├─ filter
│   │   │       ├─ nozzle
│   │   │       ├─ arc
│   │   │       └─ flo_stop
│   │   ├─ hose.ldpe25  (10 m)
│   │   └─ riser_2
│   │       ├─ joint.c25bf34
│   │       ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│   │       └─ head.rotor  (BL5.0, 270°, ~12.8 m throw @3 bar)  (Hunter I-20-04-SS)
│   │           ├─ check_valve
│   │           ├─ riser
│   │           ├─ riser_seal
│   │           ├─ spring
│   │           ├─ gear
│   │           ├─ filter
│   │           ├─ nozzle
│   │           ├─ arc
│   │           └─ flo_stop
│   ├─ Z4
│   │   ├─ joint.sm1bm1
│   │   ├─ valve.auto  (Hunter PGV-101G)
│   │   │   ├─ body
│   │   │   │   ├─ seat
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
│   │   │       │   └─ spring
│   │   │       ├─ [exhaust]
│   │   │       ├─ [pilot_seat]
│   │   │       ├─ 24v_1
│   │   │       ├─ coil
│   │   │       └─ 24v_2
│   │   ├─ joint.bm1c25
│   │   ├─ hose.ldpe25  (10 m)
│   │   ├─ joint.tee
│   │   ├─ hose.ldpe25  (2 m)
│   │   ├─ riser_1
│   │   │   ├─ joint.c25bf34
│   │   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   └─ head.spray  (MP3000, 270°)  (Hunter Pro-Spray PRS40)
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
│   │   ├─ hose.ldpe25  (6 m)
│   │   ├─ riser_2
│   │   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   └─ head.spray  (MP1000, 210°)  (Hunter Pro-Spray PRS40)
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
│   │   ├─ riser_3
│   │   │   ├─ joint.c25bf34
│   │   │   ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │   │   └─ head.spray  (MP2000, 270°)  (Hunter Pro-Spray PRS40)
│   │   │       ├─ cap
│   │   │       ├─ check_valve
│   │   │       ├─ regulator
│   │   │       ├─ riser
│   │   │       ├─ wiper_seal
│   │   │       ├─ spring
│   │   │       ├─ flush_plug
│   │   │       └─ nozzle
│   │   ├─ hose.ldpe25  (6 m)
│   │   └─ riser_4
│   │       ├─ joint.sj34x12  (Hunter sj 3/4x1/2)
│   │       └─ head.spray  (MP3000, 180°)  (Hunter Pro-Spray PRS40)
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
│       ├─ valve.auto  (Hunter PGV-101G)
│       │   ├─ body
│       │   │   ├─ seat
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
│       │       │   └─ spring
│       │       ├─ [exhaust]
│       │       ├─ [pilot_seat]
│       │       ├─ 24v_1
│       │       ├─ coil
│       │       └─ 24v_2
│       ├─ joint.bm1c25
│       ├─ hose.ldpe25  (20 m)
│       ├─ joint.tee
│       ├─ hose.ldpe25  (4 m)
│       ├─ riser_1
│       │   ├─ joint.c25bf34
│       │   ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│       │   └─ head.rotor  (BL5.0, 270°, ~12.8 m throw @3 bar)  (Hunter I-20-04-SS)
│       │       ├─ check_valve
│       │       ├─ riser
│       │       ├─ riser_seal
│       │       ├─ spring
│       │       ├─ gear
│       │       ├─ filter
│       │       ├─ nozzle
│       │       ├─ arc
│       │       └─ flo_stop
│       ├─ hose.ldpe25  (12 m)
│       └─ riser_2
│           ├─ joint.c25bf34
│           ├─ joint.sj34x34  (Hunter sj 3/4x3/4)
│           └─ head.rotor  (BL2.5, 180°, ~10.7 m throw @3 bar)  (Hunter I-20-04-SS)
│               ├─ check_valve
│               ├─ riser
│               ├─ riser_seal
│               ├─ spring
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
    │   ├─ transformer
    │   │   ├─ line
    │   │   ├─ neutral
    │   │   └─ winding
    │   └─ terminals
    │       ├─ ac_line ×2
    │       ├─ common ×2
    │       └─ port ×12
    ├─ wiring.splice
    ├─ wiring.splice
    ├─ wiring.splice
    ├─ wiring.splice
    ├─ wiring.splice
    ├─ wiring.common
    ├─ wiring.splice
    ├─ wiring.common
    ├─ wiring.splice
    ├─ wiring.common
    └─ wiring.splice
```
