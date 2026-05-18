const EVENT_COLS = [
  { id: 'right', label: 'Started right after', mult: 0.8 },
  { id: 'days', label: 'Started week(s) after', mult: 0.4 },
  { id: 'worse', label: 'Worsened (same)', mult: 0.0 },
  { id: 'faster', label: 'Worsened (faster)', mult: 0.4 },
];
const eventColsWithDays = (days) =>
  EVENT_COLS.map((c) => (c.id === 'days' ? { ...c, mult: days } : c));

window.DATA = {
  stages: [
    { id: 1, label: 'Symptoms' },
    { id: 2, label: 'Events' },
    { id: 3, label: 'Tests' },
  ],
  system: {
    installedISO: '2020-08-01',
    installedLabel: 'August 2020',
    zoneFlow: '~2 m³/h',
    waterSource: 'Well pump',
    mainHose: 'PE 32 mm (pump → valve box)',
    zoneHose: 'PE 25 mm (zones)',
  },
  hwDefaults: {
    pump: '2023-01-01',
    valves: '2026-05-01',
    relay: '2020-08-01',
    ctrl: '2020-08-01',
    spr: '2020-08-01',
    mainHose: '2020-08-01',
    zoneHose: '2020-08-01',
  },
  
  sliderCurves: {
    standard: [-0.2, 0, 0.2, 0.4],
    fast: [-0.2, 0.2, 0.2, 0.4],
  },
  causes: [
    { id: 'R11', parent: 'R1', baseline: 0.8, label: 'Misconfiguration' },
    { id: 'R12', parent: 'R1', baseline: 0.9, label: 'App failure (bug, corruption)' },
    { id: 'R13', parent: 'R1', baseline: 0.8, label: 'Connectivity (wifi)' },
    { id: 'R22', parent: 'R2', baseline: 0.9, label: 'Controller hardware failure' },
    { id: 'R23', parent: 'R2', baseline: 0.8, label: 'Controller firmware / config' },
    { id: 'R31', parent: 'R3', baseline: 1.2, label: 'Relay wiring fault' },
    { id: 'R41', parent: 'R4', baseline: 1.3, label: 'Pump suction-side fault' },
    { id: 'R42', parent: 'R4', baseline: 1.1, label: 'Pump hardware failure' },
    { id: 'R51', parent: 'R5', baseline: 1.2, label: 'Main hose 32mm leak / break' },
    { id: 'R52', parent: 'R5', baseline: 0.8, label: 'Main hose 32mm air / debris clog' },
    { id: 'R61', parent: 'R6', baseline: 1.2, label: 'Per-zone hot conductor fault' },
    { id: 'R62', parent: 'R6', baseline: 1.4, label: 'Common wire fault' },
    { id: 'R63', parent: 'R6', baseline: 0.8, label: 'Wire-to-triac connection fault' },
    { id: 'R71', parent: 'R7', baseline: 1.2, label: 'Solenoid failure' },
    { id: 'R72', parent: 'R7', baseline: 1.4, label: 'Diaphragm failure' },
    { id: 'R73', parent: 'R7', baseline: 0.7, label: 'Valve body / seal failure' },
    { id: 'R74', parent: 'R7', baseline: 0.8, label: 'Valve misconfiguration' },
    { id: 'R81', parent: 'R8', baseline: 1.1, label: 'Zone hoses 25mm / fitting damage' },
    { id: 'R82', parent: 'R8', baseline: 0.9, label: 'Zone hoses 25mm air / debris clog' },
    { id: 'R91', parent: 'R9', baseline: 1.1, label: 'Rotor debris / nozzle' },
    { id: 'R92', parent: 'R9', baseline: 1.0, label: 'Rotor misconfigured' },
  ],
  questions: [
    /* --- STAGE 1: SYMPTOMS --- */
    {
      id: 'Q1',
      stage: 1,
      group: 'Symptoms',
      text: 'Scope of failure?',
      highlight: ['sp4', 'valves'],
      options: [
        {
          label: 'All zones fail',
          icon: 'scope-all',
          effects: { R1: 0.2, R2: 0.2, R31: 0.2, R4: 0.2, R5: 0.2 },
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
          effects: { R9: 2 },
        },
      ],
    },
    {
      id: 'Q2',
      stage: 1,
      group: 'Symptoms',
      text: 'Same issue when starting via app vs controller?',
      highlight: ['sw', 'ctrl', 'wifi'],
      options: [
        {
          label: 'Only app has issues',
          effects: { R11: 1.6, R13: 1.6 },
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
      group: 'Symptoms',
      text: 'How does the pump behave when turned on?',
      highlight: ['pump'],
      options: [
        {
          label: 'Runs smoothly',
          effects: { R41: 0.2, R42: -0.3, R5: 0.2, R6: 0.2, R7: 0.2, R8: 0.2, R9: 0.2 },
        },
        {
          label: 'Hums, trips breaker, or silent',
          effects: { R1: 1, R2: 1, R31: 1, R42: 1 },
        },
        {
          label: 'Short-cycles / No pressure',
          effects: { R4: 0.4, R51: 0.4 },
        },
      ],
    },
    {
      id: 'Q4',
      stage: 1,
      group: 'Symptoms',
      text: 'How does water leave rotors?',
      highlight: ['sp4', 'lateral'],
      options: [
        {
          label: 'No water at all',
          icon: 'flow-none',
          effects: { R1: 0.6, R2: 0.6, R31: 0.6, R42: 0.6, R6: 0.6, R71: 0.6 },
        },
        {
          label: 'Weak',
          icon: 'flow-weak',
          effects: { R4: 0.2, R52: 0.2, R6: 0.2, R72: 0.2, R74: 0.2, R8: 0.2, R9: 0.2 },
        },
        {
          label: 'Strong, then weak',
          icon: 'flow-decline',
          effects: { R4: 0.6, R52: 0.4, R71: 0.2, R82: 0.4 },
        },
        {
          label: 'Weak, then strong',
          icon: 'flow-rise',
          effects: { R41: 0.4, R52: 0.4, R82: 0.4 },
        },
        {
          label: 'Fluctuating / erratic',
          icon: 'pat-noise',
          effects: { R1: 0.4, R23: 0.4, R4: 0.2, R52: 0.2, R6: 0.4, R71: 0.4 },
        },
        {
          label: 'Leaks when system is off',
          icon: 'flow-leak',
          effects: { R51: 0.4, R72: 0.4, R73: 0.4, R74: 0.4, R81: 0.4 },
        },
        {
          label: 'Geyser-like pressure',
          icon: 'flow-geyser',
          effects: { R51: 0.4, R81: 0.4, R91: 0.4 },
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
      group: 'Symptoms',
      text: 'How is the flow at the manual hose?',
      highlight: ['pump', 'water'],
      options: [
        {
          label: 'Strong, steady',
          effects: { R5: 0.4, R6: 0.4, R7: 0.4, R8: 0.4, R9: 0.4 },
        },
        {
          label: 'Weak / sputtering',
          effects: { R41: 0.2, R5: 0.2 },
        },
        {
          label: 'None at all',
          effects: { R4: 0.6 },
        },
      ],
    },

    {
      id: 'Q6',
      stage: 1,
      group: 'Symptoms',
      text: 'What do you hear when valve activates?',
      highlight: ['valves', 'ctrl'],
      options: [
        {
          label: 'Clear click',
          effects: { R72: 0.4, R8: 0.4, R91: 0.4, R92: 0.6 },
        },
        {
          label: 'Buzz / hum, no click',
          effects: { R6: 1, R71: 1 },
        },
        {
          label: 'Weak click',
          effects: { R6: 0.2, R71: 0.2 },
        },
        {
          label: 'Silent',
          effects: { R6: 1, R71: 1 },
        },
      ],
    },
    {
      id: 'Q7',
      stage: 1,
      group: 'Symptoms',
      text: 'Did restarting anything help?',
      highlight: ['ctrl', 'sw', 'pump', 'relay'],
      options: [
        {
          label: 'Controller restart briefly fixed it',
          effects: { R12: 0.6, R13: 0.6, R23: 0.6 },
        },
        {
          label: 'Pump restart briefly fixed it',
          effects: { R31: 0.4, R42: 0.4 },
        },
        {
          label: 'Tried, no effect',
          effects: { R1: -0.2, R2: -0.2, R42: -0.2 },
        },
        {
          label: "Haven't tried",
          effects: {},
        },
      ],
    },

    /* --- STAGE 2: EVENTS --- */
    {
      id: 'E1',
      stage: 2,
      group: 'Events',
      text: 'How did the problem progress?',
      options: [
        {
          label: 'Sudden',
          icon: 'pat-sudden',
          effects: { R22: 0.2, R31: 0.2, R51: 0.2, R63: 0.2, R71: 0.2, R92: 0.3 },
        },
        {
          label: 'Gradual',
          icon: 'pat-gradual-all',
          effects: { R4: 0.4, R52: 0.4, R72: 0.4, R73: 0.4, R91: 0.4, R92: 0.1 },
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
      id: 'E2',
      stage: 2,
      type: 'dates',
      group: 'Events',
      text: 'Do these dates still reflect the latest replacements?',
      highlight: ['pump', 'valves', 'relay', 'ctrl', 'wifi', 'sp4'],
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
          id: 'spr',
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
          id: 'zoneHose',
          label: 'Zone hose',
          model: 'PE 25 mm (zones)',
          curve: 'standard',
          causes: ['R81'],
        },
      ],
    },
    {
      id: 'E3',
      stage: 2,
      type: 'matrix',
      group: 'Events',
      text: 'Recent service or work — relation to issue?',
      columns: EVENT_COLS,
      rows: [
        { id: 'pump', label: 'Pump', effects: { R4: 1 } },
        { id: 'relay', label: 'Start-Relay', effects: { R31: 1, R6: 0.6 } },
        { id: 'ctrl', label: 'Controller', effects: { R11: 1, R22: 1, R6: 0.8 } },
        { id: 'valves', label: 'Valves', effects: { R7: 1, R6: 0.8 } },
        { id: 'spr', label: 'Rotors', effects: { R91: 0.6, R92: 1.0 } },
        { id: 'zhose', label: 'Hoses', effects: { R8: 1, R5: 1 } },
        { id: 'wiring', label: 'Wiring', effects: { R6: 1 } },
      ],
    },
    {
      id: 'E4',
      stage: 2,
      type: 'matrix',
      group: 'Events',
      text: 'External events — relation to issue?',
      columns: eventColsWithDays(0.6),
      rows: [
        { id: 'storm', label: 'Storm / lightning', effects: { R22: 1, R6: 1, R12: 1 } },
        { id: 'freeze', label: 'Freeze', effects: { R51: 1, R73: 1, R81: 1 } },
        { id: 'heat', label: 'Heatwave / drought', effects: { R41: 1 } },
        { id: 'outage', label: 'Power outage', effects: { R12: 1, R23: 1 } },
        { id: 'pests', label: 'Pests / rodents', effects: { R51: 1, R81: 1, R6: 1 } },
        { id: 'dig', label: 'Digging / vehicle', effects: { R51: 1, R61: 1, R62: 1, R81: 1 } },
      ],
    },

    /* --- STAGE 3: TESTS --- */
    {
      id: 'D1',
      stage: 3,
      group: 'Tests',
      text: 'Manual open valve solenoid / bleed screw, runs?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes, zone runs',
          effects: { R6: 0.6, R71: 0.6 },
        },
        {
          label: 'Nothing',
          effects: { R5: 0.6, R72: 0.6, R73: 0.6, R8: 0.6 },
        },
      ],
    },
    {
      id: 'D2',
      stage: 3,
      group: 'Tests',
      text: 'Controller voltage during call (~24 VAC)?',
      highlight: ['ctrl', 'valves'],
      options: [
        {
          label: '~24 VAC present',
          effects: { R22: -0.4, R6: -0.4, R7: 0.4 },
        },
        { label: '0 V', effects: { R11: 0.6, R22: 0.6, R63: 0.6 } },
        { label: 'Low / fluctuating', effects: { R61: 0.6, R62: 0.6 } },
      ],
    },
    {
      id: 'D3',
      stage: 3,
      group: 'Tests',
      text: '24 VAC at controller pump start-relay during call?',
      highlight: ['ctrl', 'relay'],
      options: [
        { label: "24V present, relay won't pull", effects: { R31: 0.6 } },
        { label: '0 V', effects: { R11: 0.6, R22: 0.6 } },
        { label: '24V in, clicks, no 230V out', effects: { R31: 0.6 } },
      ],
    },
    {
      id: 'D4',
      stage: 3,
      group: 'Tests',
      text: 'Resistance common wire slot and zone in controller?',
      highlight: ['ctrl', 'valves'],
      options: [
        { label: 'Continuous, low resistance', effects: { R62: -0.4 } },
        { label: 'Open or high resistance', effects: { R62: 1.6 } },
        { label: 'Intermittent when wiggled', effects: { R62: 0.6 } },
      ],
    },
    {
      id: 'D5',
      stage: 3,
      group: 'Tests',
      text: 'Solenoid coil resistance (typical 20–60 Ω)?',
      highlight: ['valves'],
      options: [
        { label: 'In range', effects: { R7: 0.2, R71: -0.4 } },
        { label: 'Open / infinite', effects: { R71: 1.6 } },
        { label: 'Near zero / very low', effects: { R71: 1.6 } },
        { label: 'OK at coil, bad at controller', effects: { R61: 1.6 } },
      ],
    },
    {
      id: 'D6',
      stage: 3,
      group: 'Tests',
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
      id: 'D7',
      stage: 3,
      group: 'Tests',
      text: 'Open each valve and inspect internals?',
      highlight: ['valves'],
      options: [
        { label: 'Intact, no debris', effects: { R72: -0.4, R73: -0.4 } },
        { label: 'Damaged or debris', effects: { R72: 1, R73: 0.6 } },
      ],
    },
    {
      id: 'Extra1',
      optional: true,
      group: 'Extra',
      text: 'Do you see water / wet ground?',
      highlight: ['water', 'lateral', 'valves'],
      options: [
        {
          label: 'Along the main line route',
          effects: { R51: 2 },
        },
        {
          label: 'In / around valve box',
          effects: { R73: 1.6, R74: 1.6 },
        },
        {
          label: 'Along zone lines',
          effects: { R81: 2 },
        },
        {
          label: 'Nothing visible',
          effects: { R51: -0.4, R73: -0.4, R74: -0.4, R81: -0.4 },
        },
      ],
    },
    {
      id: 'extra2',
      optional: true,
      group: 'Extra',
      text: 'Dig & inspect hoses for damage?',
      highlight: ['water', 'lateral'],
      options: [
        { label: 'Damage found', effects: { R51: 1, R81: 1 } },
        { label: 'No damage', effects: { R51: -0.4, R81: -0.4 } },
      ],
    },

    {
      id: 'extra3',
      optional: true,
      group: 'Extra',
      text: 'Flow meter reads 1.0–3.0?',
      highlight: ['pump', 'water'],
      options: [
        { label: 'Yes (in range)', effects: { R4: -0.4, R5: -0.4 } },
        { label: 'No (out of range)', effects: { R4: 0.2, R5: 0.2 } },
      ],
    },
  ],
};
