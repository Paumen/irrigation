// Verification cases (settled states fed through the electrical solve, then the
// hydraulic outer loop). Each case carries:
//   commands : controller outputs { mv, zones:{1..4} } -> solveElectrical
//   state    : mechanical inputs { manualOpen, bleedOpen, floStop, throttle } -> solveSteady
//   blocked  : optional Set of open-circuit port ids / wire names (electrical faults)
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
    name: "pump on + Z1 commanded",
    kind: "z1",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
  },
  {
    name: "all four zones commanded (heaviest healthy state)",
    kind: "allzones",
    commands: { mv: true, zones: { 1: true, 2: true, 3: true, 4: true } },
    state: { manualOpen: {} },
  },
  {
    name: "zone 1 commanded with pump off (valve cannot lift)",
    kind: "notopening",
    commands: { mv: false, zones: { 1: true } },
    state: { manualOpen: {} },
  },
  {
    name: "pump on + Z5 manual handle open",
    kind: "z5",
    commands: { mv: true, zones: {} },
    state: { manualOpen: { "Z5.valve": true } },
  },
  {
    name: "all zones commanded, broken shared common return",
    kind: "electrical",
    commands: { mv: true, zones: { 1: true, 2: true, 3: true, 4: true } },
    state: { manualOpen: {} },
    blocked: new Set(["common_return"]),
    expect: { zonesOpen: [], zonesClosed: [1, 2, 3, 4], pump: true },
  },
  {
    name: "all zones commanded, broken signal_2 wire",
    kind: "electrical",
    commands: { mv: true, zones: { 1: true, 2: true, 3: true, 4: true } },
    state: { manualOpen: {} },
    blocked: new Set(["signal_2"]),
    expect: { zonesOpen: [1, 3, 4], zonesClosed: [2], pump: true },
  },
  // Mechanical inputs (flo-stop, flow-control screw) — these three reuse the pump+Z1
  // state and are compared against the stashed plain-Z1 result, so they must run
  // after the "z1" case.
  {
    name: "pump on + Z1 with Z1.head2 flo-stop closed",
    kind: "flostop",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {}, floStop: { "Z1.head2": true } },
  },
  {
    name: "pump on + Z1 with Z1.valve flow control at 40%",
    kind: "throttle",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {}, throttle: { "Z1.valve": 0.4 } },
  },
  {
    name: "pump on + Z1 with Z1.valve flow control fully seated",
    kind: "throttle0",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {}, throttle: { "Z1.valve": 0 } },
  },
  // M8 faults — injected via compileFaults. Several compare against the stashed
  // plain-Z1 result, so they must run after the "z1" case.
  {
    name: "pump on + Z1 with Z1.hose1 fully clogged",
    kind: "clogfull",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "Z1.hose1:clogged": 1 },
  },
  {
    name: "pump on + Z1 with Z1.hose1 80% clogged",
    kind: "clogpartial",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "Z1.hose1:clogged": 0.8 },
  },
  {
    name: "pump on + Z1 with Z1.valve seat 60% clogged",
    kind: "seatclog",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "Z1.valve.seat:clogged": 0.6 },
  },
  {
    name: "pump on + Z1 with Z1.valve seat fully packed",
    kind: "seatfull",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "Z1.valve.seat:clogged": 1 },
  },
  {
    name: "pump on + Z1 with Z1.hose2 burst (leak)",
    kind: "leak",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "Z1.hose2:broken": true },
  },
  {
    name: "all zones commanded, Z2 solenoid coil broken (fault key)",
    kind: "electrical",
    commands: { mv: true, zones: { 1: true, 2: true, 3: true, 4: true } },
    state: { manualOpen: {} },
    faults: { "Z2.valve.coil:broken": true },
    expect: { zonesOpen: [1, 3, 4], zonesClosed: [2], pump: true },
  },
  {
    name: "pump on, no zone commanded, Z1 bleed screw stuck open",
    kind: "bleedstuck",
    commands: { mv: true, zones: {} },
    state: { manualOpen: {} },
    faults: { "Z1.valve.bleed_screw:misconfigured": true },
  },
  {
    name: "pump on + Z1 with a half-clogged impeller (weak pump)",
    kind: "weakpump",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "pump.impeller:clogged": 0.5 },
  },
  {
    name: "pump and Z1 commanded but the pump motor is broken",
    kind: "pumpdead",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "pump.motor:broken": true },
  },
  {
    name: "pump on + Z1 with Z1.head1's pressure regulator broken",
    kind: "noclamp",
    commands: { mv: true, zones: { 1: true } },
    state: { manualOpen: {} },
    faults: { "Z1.head1.regulator:broken": true },
  },
];
