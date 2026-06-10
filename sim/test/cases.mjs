// Verification cases (settled states fed through the electrical solve, then the
// hydraulic outer loop). Each case carries:
//   commands : controller outputs { mv, zones:{1..4} } -> solveElectrical
//   state    : mechanical inputs { manualOpen, bleedOpen, floStop, throttle } -> solveSteady
//   blocked  : optional Set of open-circuit port ids / wire names (electrical faults)
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
  // M6 mechanical controls — these three reuse the pump+Z1 state and are compared
  // against the stashed plain-Z1 result, so they must run after the "z1" case.
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
];
