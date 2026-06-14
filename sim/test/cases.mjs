// Verification cases (settled states fed through the electrical solve, then the hydraulic
// outer loop). system.yaml's auto zones are Z2/Z3/Z4/Z5 (Z2 == the old Z1 head set: rotor +
// two sprays); Z1 is the manual hand-watering branch (stream nozzle). Each case carries:
//   commands : controller outputs { mv, zones:{2,3,4,5} } -> solveElectrical
//   state    : mechanical inputs { manualOpen, bleedOpen, floStop, throttle } -> solveSteady
//   blocked  : optional Set of open-circuit port / instance ids (electrical faults)
//   faults   : optional { faultKey: true|severity } -> compileFaults (M8)
//   kind     : which assertion block the harness runs
//   expect   : (electrical cases) which zones should be open/closed and pump state

export const cases = [
  {
    name: "idle (controller off, all valves shut)",
    kind: "idle",
    commands: { mv: false, zones: {} },
    state: { manualOpen: {} },
  },
  {
    name: "pump on + Z2 commanded",
    kind: "z1",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
  },
  {
    name: "all four zones commanded (heaviest healthy state)",
    kind: "allzones",
    commands: { mv: true, zones: { 2: true, 3: true, 4: true, 5: true } },
    state: { manualOpen: {} },
  },
  {
    name: "zone 2 commanded with pump off (valve cannot lift)",
    kind: "notopening",
    commands: { mv: false, zones: { 2: true } },
    state: { manualOpen: {} },
  },
  {
    name: "pump on + Z1 manual handle open",
    kind: "z5",
    commands: { mv: true, zones: {} },
    state: { manualOpen: { "Z1_valve.manual": true } },
  },
  {
    name: "all zones commanded, broken shared common return",
    kind: "electrical",
    commands: { mv: true, zones: { 2: true, 3: true, 4: true, 5: true } },
    state: { manualOpen: {} },
    blocked: new Set(["V1_wiring.24v_4"]),
    expect: { zonesOpen: [], zonesClosed: [2, 3, 4, 5], pump: true },
  },
  {
    name: "all zones commanded, broken Z3 signal lead",
    kind: "electrical",
    commands: { mv: true, zones: { 2: true, 3: true, 4: true, 5: true } },
    state: { manualOpen: {} },
    blocked: new Set(["P1_wiring.24v_2"]),
    expect: { zonesOpen: [2, 4, 5], zonesClosed: [3], pump: true },
  },
  // Mechanical inputs (flo-stop, flow-control screw) — these three reuse the pump+Z2
  // state and are compared against the stashed plain-Z2 result, so they must run
  // after the "z1" case.
  {
    name: "pump on + Z2 with the rotor flo-stop closed",
    kind: "flostop",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {}, floStop: { "Z2_emitter.rotor": true } },
  },
  {
    name: "pump on + Z2 with Z2 valve flow control at 40%",
    kind: "throttle",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {}, throttle: { "Z2_valve.auto": 0.4 } },
  },
  {
    name: "pump on + Z2 with Z2 valve flow control fully seated",
    kind: "throttle0",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {}, throttle: { "Z2_valve.auto": 0 } },
  },
  // M8 faults — injected via compileFaults. Several compare against the stashed
  // plain-Z2 result, so they must run after the "z1" case.
  {
    name: "pump on + Z2 with the first hose fully clogged",
    kind: "clogfull",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "Z2_hose.ldpe25_1:clogged": 1 },
  },
  {
    name: "pump on + Z2 with the first hose 80% clogged",
    kind: "clogpartial",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "Z2_hose.ldpe25_1:clogged": 0.8 },
  },
  {
    name: "pump on + Z2 with the valve seat 60% clogged",
    kind: "seatclog",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "Z2_valve.auto.body.seat:clogged": 0.6 },
  },
  {
    name: "pump on + Z2 with the valve seat fully packed",
    kind: "seatfull",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "Z2_valve.auto.body.seat:clogged": 1 },
  },
  {
    name: "pump on + Z2 with the second hose burst (leak)",
    kind: "leak",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "Z2_hose.ldpe25_2:broken": true },
  },
  {
    name: "all zones commanded, Z3 solenoid coil broken (fault key)",
    kind: "electrical",
    commands: { mv: true, zones: { 2: true, 3: true, 4: true, 5: true } },
    state: { manualOpen: {} },
    faults: { "Z3_valve.auto.solenoid.coil:broken": true },
    expect: { zonesOpen: [2, 4, 5], zonesClosed: [3], pump: true },
  },
  {
    name: "pump on, no zone commanded, Z2 bleed screw stuck open",
    kind: "bleedstuck",
    commands: { mv: true, zones: {} },
    state: { manualOpen: {} },
    faults: { "Z2_valve.auto.bonnet.bleed_screw:misconfigured": true },
  },
  {
    name: "pump on + Z2 with a half-clogged impeller (weak pump)",
    kind: "weakpump",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "W1_pump.jet.body.impeller:clogged": 0.5 },
  },
  {
    name: "pump and Z2 commanded but the pump motor is broken",
    kind: "pumpdead",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "W1_pump.jet.motor:broken": true },
  },
  {
    name: "pump on + Z2 with the first spray's pressure regulator broken",
    kind: "noclamp",
    commands: { mv: true, zones: { 2: true } },
    state: { manualOpen: {} },
    faults: { "Z2_emitter.spray_1.body.regulator:broken": true },
  },
];
