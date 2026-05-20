const TIMELINE_COLS = [
  { id: 'right', label: 'Started right after', mult: 0.8 },
  { id: 'days', label: 'Started week(s) after', mult: 0.4 },
  { id: 'worse', label: 'Worsened (same)', mult: 0.0 },
  { id: 'faster', label: 'Worsened (faster)', mult: 0.4 },
];
const timelineColsWithDays = (days) =>
  TIMELINE_COLS.map((c) => (c.id === 'days' ? { ...c, mult: days } : c));

window.DATA = {
  stages: [
    { id: 1, label: 'Symptoms' },
    { id: 2, label: 'Timeline' },
    { id: 3, label: 'Tests' },
  ],
  system: {
    zoneFlow: '~2 m³/h',
    waterSource: 'Well pump',
  },
  equipmentDefaults: {
    pump: '2023-01-01',
    valves: '2026-05-01',
    relay: '2020-08-01',
    ctrl: '2020-08-01',
    rotor: '2020-08-01',
    mainHose: '2020-08-01',
    hose: '2020-08-01',
  },

  sliderCurves: {
    standard: [-0.2, 0, 0.2, 0.4],
    fast: [-0.2, 0.2, 0.2, 0.4],
  },
  causes: [
    { id: 'R11', parent: 'R1', baseline: 1.2, label: 'Misconfiguration' },
    { id: 'R12', parent: 'R1', baseline: 1.2, label: 'App failure (bug, etc)' },
    { id: 'R13', parent: 'R1', baseline: 1.2, label: 'Connectivity (wifi)' },
    { id: 'R22', parent: 'R2', baseline: 1.2, label: 'Controller hardware failure' },
    { id: 'R23', parent: 'R2', baseline: 1.2, label: 'Controller firmware / config' },
    { id: 'R31', parent: 'R3', baseline: 1.2, label: 'Relay wiring fault' },
    { id: 'R41', parent: 'R4', baseline: 1.2, label: 'Pump suction-side fault' },
    { id: 'R42', parent: 'R4', baseline: 1.0, label: 'Pump hardware failure' },
    { id: 'R51', parent: 'R5', baseline: 0.8, label: 'Main hose 32mm leak / break' },
    { id: 'R52', parent: 'R5', baseline: 1.0, label: 'Main hose 32mm air / debris clog' },
    { id: 'R61', parent: 'R6', baseline: 1.0, label: 'Per-zone hot conductor fault' },
    { id: 'R62', parent: 'R6', baseline: 0.8, label: 'Common wire fault' },
    { id: 'R63', parent: 'R6', baseline: 0.8, label: 'Wire-to-triac connection fault' },
    { id: 'R71', parent: 'R7', baseline: 1.0, label: 'Solenoid failure' },
    { id: 'R72', parent: 'R7', baseline: 1.2, label: 'Diaphragm failure' },
    { id: 'R73', parent: 'R7', baseline: 0.8, label: 'Valve body / seal failure' },
    { id: 'R74', parent: 'R7', baseline: 1.0, label: 'Valve misconfiguration' },
    { id: 'R81', parent: 'R8', baseline: 0.8, label: 'Hoses 25mm / fitting damage' },
    { id: 'R82', parent: 'R8', baseline: 0.8, label: 'Hoses 25mm air / debris clog' },
    { id: 'R91', parent: 'R9', baseline: 1.2, label: 'Rotor debris / nozzle' },
    { id: 'R92', parent: 'R9', baseline: 1.2, label: 'Rotor misconfigured' },
  ],
  questions: [
    /* --- STAGE 1: SYMPTOMS --- */
    {
      id: 'Q1',
      stage: 1,
      text: 'Scope of failure?',
      highlight: ['rotor', 'valves'],
      options: [
        {
          label: 'All zones fail',
          icon: 'scope-all',
          effects: { R1: 0.2, R2: 0.2, R31: 0.2, R4: 0.4, R5: 0.4, R62: 0.2 },
        },
        {
          label: 'Multiple zones (not all)',
          icon: 'scope-multi',
          effects: { R4: 0.2, R5: 0.2, R62: 0.2 },
        },
        {
          label: 'Single zone',
          icon: 'scope-single',
          effects: { R61: 0.2, R63: 0.2, R7: 0.2, R8: 0.2 },
        },
        {
          label: 'One rotor',
          icon: 'scope-one',
          effects: { R9: 1.6 },
        },
      ],
    },
    {
      id: 'Q2',
      stage: 1,
      text: 'Same issue when starting via app vs controller?',
      highlight: ['sw', 'ctrl'],
      options: [
        {
          label: 'Only app has issues',
          effects: { R1: 1.6 },
        },
        {
          label: 'Yes — nothing starts at all',
          effects: { R2: 0.2, R31: 0.2, R63: 0.2 },
        },
        {
          label: 'Yes — both start something',
          effects: { R4: 0.2, R5: 0.2, R7: 0.2, R8: 0.2, R9: 0.2 },
        },
      ],
    },
    {
      id: 'Q3',
      stage: 1,
      text: 'How does the pump behave when turned on?',
      highlight: ['pump'],
      options: [
        {
          label: 'Runs smoothly',
          effects: { R4: -0.4, R5: 0.2, R6: 0.2, R7: 0.2, R8: 0.2, R9: 0.4 },
        },
        {
          label: 'Hums, trips breaker',
          effects: { R31: 1.0, R42: 1.0 },
        },
        {
          label: 'silent',
          effects: { R1: 0.6, R2: 1.0, R31: 0.6, R42: 0.6 },
        },
        {
          label: 'Short-cycles / No pressure',
          effects: { R4: 0.6, R51: 0.4 },
        },
      ],
    },
    {
      id: 'Q4',
      stage: 1,
      text: 'How does water leave rotor(s)?',
      highlight: ['rotor'],
      options: [
        {
          label: 'No water at all',
          icon: 'flow-none',
          effects: { R1: 0.6, R2: 0.6, R31: 0.6, R41: 0.4, R42: 0.6, R5: 0.4, R6: 0.4, R71: 0.4 },
        },
        {
          label: 'Weak',
          icon: 'flow-weak',
          effects: { R4: 0.2, R52: 0.2, R6: 0.2, R72: 0.2, R74: 0.2, R8: 0.2, R9: 0.4 },
        },
        {
          label: 'Strong, then weak',
          icon: 'flow-decline',
          effects: { R4: 0.6, R52: 0.4, R82: 0.4 },
        },
        {
          label: 'Weak, then strong',
          icon: 'flow-rise',
          effects: { R41: 0.4},
        },
        {
          label: 'Fluctuating / erratic',
          icon: 'pat-noise',
          effects: { R1: 0.4, R23: 0.4, R4: 0.4, R52: 0.2, R6: 0.4, R71: 0.2 },
        },
        {
          label: 'Leaks when system is off',
          icon: 'flow-leak',
          effects: {  R72: 0.4, R73: 0.4, R74: 0.4 },
        },
        {
          label: 'Geyser-like pressure',
          icon: 'flow-geyser',
          effects: { R51: 0.4, R81: 0.4, R91: 0.6 },
        },
        {
          label: 'Normal',
          icon: 'flow-normal',
          effects: { R1: 0.6, R4: -0.4, R5: -0.4, R6: -0.4, R7: -0.4, R8: -0.4, R9: -0.4 },
        },
      ],
    },

    {
      id: 'Q5',
      stage: 1,
      text: 'How is the flow at the manual hose?',
      highlight: ['pump'],
      options: [
        {
          label: 'Strong, steady',
          effects: { R4: -0.6, R5: -1, R6: 0.2, R7: 0.4, R8: 0.4, R9: 0.4 },
        },
        {
          label: 'Weak / sputtering',
          effects: { R41: 0.6, R42: 0.4, R5: 0.6 },
        },
        {
          label: 'None at all',
          effects: { R4: 1.0, R5: 0.4 },
        },
      ],
    },

    {
      id: 'Q6',
      stage: 1,
      text: 'What do you hear when valve activates?',
      highlight: ['valves', 'ctrl'],
      options: [
        {
          label: 'Clear click',
          effects: { R71: -0.6, R72: 0.4, R73: 0.4, R8: 0.4, R9: 0.6 },
        },
        {
          label: 'Buzz / hum',
          effects: { R6: 1, R71: 0.4 },
        },
        {
          label: 'Weak click',
          effects: { R6: 0.2, R71: 0.2 },
        },
        {
          label: 'Silent / No click',
          effects: { R6: 0.4, R71: 0.6 },
        },
      ],
    },
    {
      id: 'Q7',
      stage: 1,
      text: 'Did restarting anything help?',
      highlight: ['ctrl', 'sw', 'pump', 'relay'],
      options: [
        {
          label: 'Controller restart briefly fixed it',
          effects: { R12: 0.6, R13: 0.6, R23: 1.0 },
        },
        {
          label: 'Pump restart briefly fixed it',
          effects: { R31: 0.4, R42: 0.4 },
        },
        {
          label: 'Tried, no effect',
          effects: {},
        },
      ],
    },

    /* --- STAGE 2: TIMELINE --- */
    {
      id: 'Q8',
      stage: 2,
      text: 'How did the problem progress?',
      options: [
        {
          label: 'Sudden',
          icon: 'pat-sudden',
          effects: { R22: 0.4, R31: 0.2, R51: 0.2, R63: 0.2, R71: 0.2, R9: 0.4 },
        },
        {
          label: 'Gradual',
          icon: 'pat-gradual-all',
          effects: { R4: 0.4, R52: 0.4, R72: 0.4, R73: 0.4, R91: 0.4 },
        },
        {
          label: 'Intermittent',
          icon: 'pat-gradual-int',
          effects: { R11: 0.2, R13: 0.2, R4: 0.2, R6: 0.2, R7: 0.2 },
        },
        {
          label: 'No pattern',
          icon: 'pat-noise',
          effects: { R13: 0.2, R42: 0.2, R61: 0.4, R62: 0.4 },
        },
      ],
    },
    {
      id: 'Q9',
      stage: 2,
      type: 'ages',
      text: 'Do these dates still reflect the latest replacements?',
      highlight: ['pump', 'valves', 'relay', 'ctrl', 'rotor'],
      stepLabels: ['—', '0–4 yrs', '4–8 yrs', '8–12 yrs', '12+ yrs'],
      ageBuckets: [4, 8, 12],
      rows: [
        {
          id: 'pump',
          label: 'Pump',
          model: 'Well pump',
          curve: 'standard',
          causes: ['R41', 'R42'],
        },
        {
          id: 'valves',
          label: 'Valves',
          model: 'Hunter PGV-101G',
          curve: 'fast',
          causes: ['R71', 'R72', 'R73'],
        },
        {
          id: 'relay',
          label: 'Start-Relay',
          model: 'Hunter',
          curve: 'standard',
          causes: ['R31'],
        },
        {
          id: 'ctrl',
          label: 'Controller',
          model: 'RainMachine HD-16 Touch',
          curve: 'standard',
          causes: ['R12', 'R22', 'R23'],
        },
        {
          id: 'rotor',
          label: 'Rotors',
          model: 'Hunter I-20 + MP rotators',
          curve: 'standard',
          causes: ['R91'],
        },
        {
          id: 'mainHose',
          label: 'Main hose',
          model: 'PE 32 mm (pump → valve box)',
          curve: 'standard',
          causes: ['R51'],
        },
        {
          id: 'hose',
          label: 'Hose',
          model: 'PE 25 mm (zones)',
          curve: 'standard',
          causes: ['R81'],
        },
      ],
    },
    {
      id: 'Q10',
      stage: 2,
      type: 'matrix',
      text: 'Recent service or work — relation to issue?',
      columns: TIMELINE_COLS,
      rows: [
        { id: 'pump', label: 'Pump', effects: { R41: 0.4, R42: 1.0 } },
        { id: 'relay', label: 'Start-Relay', effects: { R31: 1, R6: 0.6 } },
        { id: 'ctrl', label: 'Controller', effects: { R11: 1, R22: 1, R6: 0.6} },
        { id: 'valves', label: 'Valves', effects: { R7: 1, R6: 0.6 } },
        { id: 'rotor', label: 'Rotors', effects: { R91: 0.6, R92: 1.0 } },
        { id: 'hose', label: 'Hoses', effects: { R8: 1, R5: 1 } },
        { id: 'wiring', label: 'Wiring', effects: { R6: 1 } },
      ],
    },
    {
      id: 'Q11',
      stage: 2,
      type: 'matrix',
      text: 'External events — relation to issue?',
      columns: timelineColsWithDays(0.6),
      rows: [
        { id: 'storm', label: 'Storm / lightning', effects: { R22: 1, R6: 1, R13: 1 } },
        { id: 'freeze', label: 'Freeze', effects: { R51: 1, R73: 1, R81: 1 } },
        { id: 'heat', label: 'Heatwave / drought', effects: { R41: 1 } },
        { id: 'outage', label: 'Power outage', effects: { R13: 1, R23: 1 } },
        { id: 'pests', label: 'Pests / rodents', effects: { R51: 1, R81: 1, R6: 1 } },
        { id: 'dig', label: 'Digging / vehicle', effects: { R51: 1, R61: 1, R62: 1, R81: 1 } },
      ],
    },

    /* --- STAGE 3: TESTS --- */
    {
      id: 'Q12',
      stage: 3,
      text: 'Manual open valve solenoid / bleed screw, runs?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes, zone runs',
          effects: { R6: 0.6, R71: 0.6 },
        },
        {
          label: 'Nothing',
          effects: { R5: 1.0, R72: 1.0, R73: 1.0, R8: 1.0 },
        },
      ],
    },
    {
      id: 'Q13',
      stage: 3,
      text: 'Controller voltage during call (~24 VAC)?',
      highlight: ['ctrl', 'valves'],
      options: [
        {
          label: '~24 VAC present',
          effects: { R11: -0.4, R12: -0.4, R22: -0.2, R63: -0.4, R71: 0.4 },
        },
        { label: '0 V', effects: { R11: 0.6, R22: 1.6, R63: 0.6, R7: -0.4 } },
        { label: 'Low / fluctuating', effects: { R61: 0.6, R62: 0.6 } },
      ],
    },
    {
      id: 'Q14',
      stage: 3,
      text: 'Resistance common wire slot and zone in controller?',
      highlight: ['ctrl', 'valves'],
      options: [
        { label: 'Continuous, low resistance', effects: { R62: -0.4 } },
        { label: 'Open or high resistance', effects: { R62: 1.6 } },
        { label: 'Intermittent when wiggled', effects: { R62: 0.6 } },
      ],
    },
    {
      id: 'Q15',
      stage: 3,
      text: 'Solenoid coil resistance (typical 20–60 Ω)?',
      highlight: ['valves'],
      options: [
        { label: 'In range', effects: { R71: -1.0 } },
        { label: 'Open / infinite', effects: { R71: 1.6, R62: 0.6 } },
        { label: 'Near zero / very low', effects: { R71: 1.6 } },
        { label: 'OK at coil, bad at controller', effects: { R61: 1.6 } },
      ],
    },
    {
      id: 'Q16',
      stage: 3,
      text: 'Swap valve with known-good — issue stays with zone?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes (stays with zone)',
          effects: { R6: 0.6, R7: -0.6, R8: 0.6 },
        },
        { label: 'No (follows the valve)', effects: { R7: 1.6 } },
      ],
    },
    {
      id: 'Q17',
      stage: 3,
      text: 'Open each valve and inspect internals?',
      highlight: ['valves'],
      options: [
        { label: 'Intact, no debris', effects: { R72: -0.4, R73: -0.4 } },
        { label: 'Damaged or debris', effects: { R72: 1, R73: 0.6 } },
      ],
    },
    {
      id: 'QX1',
      optional: true,
      text: 'Do you see water / wet ground?',
      highlight: ['valves'],
      options: [
        {
          label: 'Along the main line route',
          effects: { R51: 1.6 },
        },
        {
          label: 'In / around valve box',
          effects: { R73: 1.6, R74: 1.6 },
        },
        {
          label: 'Along zone lines',
          effects: { R81: 1.6 },
        },
        {
          label: 'Nothing visible',
          effects: { R51: -0.2, R73: -0.2, R74: -0.2, R81: -0.2 },
        },
      ],
    },
    {
      id: 'QX2',
      optional: true,
      text: 'Dig & inspect hoses for damage?',
      highlight: [],
      options: [
        { label: 'Damage found', effects: { R51: 1.6, R81: 1.6 } },
        { label: 'No damage', effects: { R51: -0.4, R81: -0.4 } },
      ],
    },

    {
      id: 'QX3',
      optional: true,
      text: 'Flow meter reads 1.0–3.0?',
      highlight: ['pump'],
      options: [
        { label: 'Yes (in range)', effects: { R4: -0.4, R5: -0.4 } },
        { label: 'No (out of range)', effects: { R4: 0.4, R5: 0.6 } },
      ],
    },
  ],
};
