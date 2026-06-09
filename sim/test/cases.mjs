// M2 verification cases (settled states fed to solveSteady).

export const cases = [
  {
    name: "idle (pump off, all valves shut)",
    state: { pumpOn: false, valveCommanded: {}, manualOpen: {} },
  },
  {
    name: "pump on + Z1 commanded",
    state: {
      pumpOn: true,
      valveCommanded: { "Z1.valve": true },
      manualOpen: {},
    },
  },
];
