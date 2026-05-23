const TIMELINE_COLS = [
  { id: 'right', label: 'Started right after', mult: 0.8 },
  { id: 'days', label: 'Started weeks after', mult: 0.4 },
  { id: 'worse', label: 'Worsened — same rate', mult: 0.0 },
  { id: 'faster', label: 'Worsened — faster', mult: 0.4 },
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

  // Effort scoring: per-question level (1..6) is set on each question
  // below. The engine adds `level * effortWeight` to the discriminator,
  // so higher level = lower homeowner effort = bigger D boost.
  //
  // Levels:
  //   6 easy-recollection    — recent / repeated / already on hand
  //   5 walk-observe         — easy visual or audible check while running
  //   4 observe-or-recall-hard — wait, compare, or recall a distant one-off
  //   3 minor-manual         — open box, manual cycle, bleed screw
  //   2 tools-or-disassembly — multimeter, valve internals
  //   1 significant-labor    — install missing hardware, swap parts, dig
  //
  // Weight 5.0 puts a level-6 question's effort term (30) on par with
  // the maximum breadth term (21 causes * 1.5).
  effortWeight: 5.0,

  causes: [
    { id: 'R11', parent: 'R1', baseline: 1.2, label: 'Misconfiguration' },
    { id: 'R12', parent: 'R1', baseline: 1.2, label: 'App failure (bug, etc)' },
    { id: 'R13', parent: 'R1', baseline: 1.2, label: 'Cloud / connectivity' },
    { id: 'R22', parent: 'R2', baseline: 1.2, label: 'Controller hardware or power failure' },
    { id: 'R23', parent: 'R2', baseline: 1.2, label: 'Controller firmware / config' },
    { id: 'R31', parent: 'R3', baseline: 1.2, label: 'Relay fault' },
    { id: 'R41', parent: 'R4', baseline: 1.2, label: 'Pump suction-side fault' },
    { id: 'R42', parent: 'R4', baseline: 1.0, label: 'Pump hardware failure' },
    { id: 'R51', parent: 'R5', baseline: 0.8, label: 'Main hose 32mm leak / break' },
    { id: 'R52', parent: 'R5', baseline: 1.0, label: 'Main hose 32mm air / debris clog' },
    { id: 'R61', parent: 'R6', baseline: 1.0, label: 'Per-zone hot conductor fault / miswire' },
    { id: 'R62', parent: 'R6', baseline: 0.8, label: 'Common wire fault' },
    { id: 'R63', parent: 'R6', baseline: 0.8, label: 'Connection / splice fault (corrosion, loose)' },
    { id: 'R71', parent: 'R7', baseline: 1.0, label: 'Solenoid failure' },
    { id: 'R72', parent: 'R7', baseline: 1.2, label: 'Diaphragm failure' },
    { id: 'R73', parent: 'R7', baseline: 0.8, label: 'Valve body / seal failure' },
    { id: 'R74', parent: 'R7', baseline: 1.0, label: 'Valve / manual-bleed misconfiguration' },
    { id: 'R81', parent: 'R8', baseline: 0.8, label: 'Hoses 25mm / fitting damage' },
    { id: 'R82', parent: 'R8', baseline: 0.8, label: 'Hoses 25mm air / debris clog' },
    { id: 'R91', parent: 'R9', baseline: 1.2, label: 'Rotor debris, nozzle, or pressure regulator' },
    { id: 'R92', parent: 'R9', baseline: 1.2, label: 'Rotor stuck / misconfigured' },
  ],
  questions: [
    /* --- STAGE 1: SYMPTOMS --- */
    {
      id: 'Q1',
      effort: 6, // they already know which zones fail
      stage: 1,
      text: 'Run the system from the app and watch the heads. What happens?',
      highlight: ['rotor', 'valves'],
      options: [
        {
          label: 'All 4 zones fail',
          icon: 'scope-all',
          effects: { R1: 0.2, R2: 0.2, R31: 0.2, R4: 0.4, R5: 0.4, R62: 0.2 },
        },
        {
          label: '2–3 zones fail',
          icon: 'scope-multi',
          effects: { R4: 0.2, R5: 0.2, R62: 0.2 },
        },
        {
          label: 'One zone fails',
          icon: 'scope-single',
          effects: { R61: 0.2, R62: -2.0, R63: 0.2, R7: 0.2, R8: 0.2 },
        },
        {
          label: 'One rotor fails',
          icon: 'scope-one',
          effects: { R62: -2.0, R9: 1.6 },
        },
      ],
    },
        {
      id: 'Q2',
      effort: 5, // walk-observe: start a zone and look around at the heads
      stage: 1,
      text: 'Start one zone from the app and walk the yard. Where does water actually come out?',
      highlight: ['rotor', 'valves', 'ctrl'],
      options: [
        {
          label: 'At the selected zone (correct)',
          icon: 'flow-normal',
          effects: { R6: -0.4, R74: -0.4, R11: -0.2, R23: -0.2, R71: -0.2, R63: -0.2 },
        },
        {
          label: 'At a different zone',
          icon: 'scope-one',
          effects: { R61: 0.6, R63: 0.4, R74: 0.4, R11: 0.4, R72: 0.2 },
        },
        {
          label: 'At several zones at once',
          icon: 'scope-multi',
          effects: { R72: 0.6, R62: 0.4, R74: 0.4, R23: 0.4, R6: 0.4, R4: 0.2 },
        },
        {
          label: 'No water anywhere',
          icon: 'flow-none',
          effects: { R1: 0.6, R2: 0.6, R31: 0.6, R41: 0.4, R42: 0.6, R5: 0.4, R6: 0.4, R71: 0.4 },
        },
      ],
    },
    {
      id: 'Q2q',
      effort: 5, // continue walk-observe at the working zone
      stage: 1,
      requires: { Q2: [0] },
      text: 'With the pump up to pressure, how does the flow at that zone look?',
      highlight: ['rotor'],
      options: [
        {
          label: 'Normal and steady',
          icon: 'flow-normal',
          effects: { R1: 0.6, R4: -0.4, R5: -0.4, R6: -0.4, R7: -0.4, R8: -0.4, R9: -0.4 },
        },
        {
          label: 'Weak throughout',
          icon: 'flow-weak',
          effects: { R4: 0.2, R52: 0.2, R6: 0.2, R72: 0.2, R74: 0.2, R8: 0.2, R9: 0.4 },
        },
        {
          label: 'Ramps up or down during the run',
          icon: 'flow-decline',
          effects: { R4: 0.6, R41: 0.4, R52: 0.4, R82: 0.4 },
        },
        {
          label: 'Erratic — random surges or drops',
          icon: 'pat-noise',
          effects: { R1: 0.4, R23: 0.4, R4: 0.4, R51: 0.4, R52: 0.2, R6: 0.4, R71: 0.2, R81: 0.4, R91: 0.6 },
        },
      ],
    },

    {
      id: 'Q3',
      effort: 5, // listen at the pump while running
      stage: 1,
      text: 'Start a zone from the app and listen at the pump. What does it do?',
      highlight: ['pump'],
      options: [
        {
          label: 'Runs smoothly',
          effects: { R4: -0.4, R5: 0.2, R6: 0.2, R7: 0.2, R8: 0.2, R9: 0.4 },
        },
        {
          label: 'Hums and trips the breaker',
          effects: { R31: 1.0, R42: 1.0 },
        },
        {
          label: 'Stays silent',
          effects: { R1: 0.4, R2: 1.0, R31: 0.6, R42: 0.6 },
        },
        {
          label: 'Short-cycles or makes no pressure',
          effects: { R4: 0.6, R51: 0.4 },
        },
      ],
    },
    {
  "id": "Q4", "effort": 3, "stage": 1,
  "text": "Try starting a zone three ways: the touchscreen, the app on home Wi-Fi, and the app on cellular only. What works?",
  "highlight": ["sw", "ctrl"],
  "options": [
    { "label": "All three behave the same", "effects": { "R11": -0.2, "R12": -0.6, "R13": -0.6 } },
    { "label": "Touchscreen OK, app fails both networks", "effects": { "R12": 1.0, "R13": 0.4 } },
    { "label": "App OK on Wi-Fi, fails on cellular", "effects": { "R13": 1.6, "R12": -0.4 } },
    { "label": "Nothing works on any path", "effects": { "R2": 0.4, "R11": 0.2, "R12": -0.4, "R13": -0.4 } }
  ]
    },

    {
      id: 'Q5',
      effort: 4, // open the manual hose at the pump and look
      stage: 1,
      text: 'Open the manual hose — how is the flow?',
      highlight: ['pump'],
      options: [
        {
          label: 'Strong and steady',
          effects: { R4: -0.6, R5: -1, R6: 0.2, R7: 0.4, R8: 0.4, R9: 0.4 },
        },
        {
          label: 'Weak or sputtering',
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
      effort: 4, // stand at the valve box during a cycle
      stage: 1,
      text: 'Start a zone from the app and stand at the valve box. What do you hear?',
      highlight: ['valves', 'ctrl'],
      options: [
        {
          label: 'Clear click',
          effects: { R71: -0.6, R72: 0.4, R73: 0.4, R8: 0.4, R9: 0.6 },
        },
        {
          label: 'Buzz or hum',
          effects: { R6: 1, R71: 0.4 },
        },
        {
          label: 'Weak click',
          effects: { R6: 0.2, R71: 0.2 },
        },
        {
          label: 'Silent — no click',
          effects: { R6: 0.4, R71: 0.6 },
        },
      ],
    },
    {
      id: 'Q7',
      effort: 3, // if not tried, requires power-cycling and a test run
      stage: 1,
      text: 'Did a restart help?',
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
          label: 'Tried — no effect',
          effects: {},
        },
        {
          label: "Haven't tried",
          effects: {},
        },
      ],
    },

    /* --- STAGE 2: TIMELINE --- */
    {
      id: 'Q8',
      effort: 6, // recall how the issue started
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
          label: 'No clear pattern',
          icon: 'pat-noise',
          effects: { R13: 0.2, R42: 0.2, R61: 0.4, R62: 0.4 },
        },
      ],
    },
    {
      id: 'Q9',
      effort: 6, // install dates already in setup.yaml; confirm from memory
      stage: 2,
      type: 'ages',
      text: 'Do these dates still reflect your latest replacements?',
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
          label: 'Zone hose',
          model: 'PE 25 mm (zones)',
          curve: 'standard',
          causes: ['R81'],
        },
      ],
    },
    {
      id: 'Q10',
      effort: 4, // recall a distant one-off; reason before vs after
      stage: 2,
      type: 'matrix',
      text: 'Recent service or work — how does it relate to the issue? (leave blank if not applicable)',
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
      effort: 4, // recall a distant one-off; reason before vs after
      stage: 2,
      type: 'matrix',
      text: 'Weather events — how do they relate to the issue? (leave blank if not applicable)',
      columns: timelineColsWithDays(0.6),
      rows: [
        { id: 'storm', label: 'Storm or lightning', effects: { R22: 1, R6: 1, R13: 1 } },
        { id: 'freeze', label: 'Freeze', effects: { R51: 1, R73: 1, R81: 1 } },
        { id: 'heat', label: 'Heatwave or drought', effects: { R41: 1 } },
        { id: 'outage', label: 'Power outage', effects: { R13: 1, R23: 1 } },
      ],
    },
    {
      id: 'Q11b',
      effort: 4,
      stage: 2,
      type: 'matrix',
      text: 'Other external events — how do they relate to the issue? (leave blank if not applicable)',
      columns: timelineColsWithDays(0.6),
      rows: [
        { id: 'pests', label: 'Pests or rodents', effects: { R51: 1, R81: 1, R6: 1 } },
        { id: 'dig', label: 'Digging or vehicle', effects: { R51: 1, R61: 1, R62: 1, R81: 1 } },
      ],
    },

    /* --- STAGE 3: TESTS --- */
    {
      id: 'Q12',
      effort: 3, // open valve box, turn the solenoid
      stage: 3,
      text: 'Open the valve manually with the bleed screw — does the zone run?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes — zone runs',
          effects: { R6: 0.6, R71: 0.6, R7: -1.4, R8: -1.8, R9: -1.8 },
        },
        {
          label: 'Partial — weak flow',
          effects: { R6: 0.2, R71: 0.2, R72: 0.6, R73: 0.4, R4: 0.4, R52: 0.4, R82: 0.4, R9: 0.4 },
        },
        {
          label: 'No — nothing happens',
          effects: { R5: 1.0, R72: 1.0, R73: 1.0, R8: 1.0 },
        },
      ],
    },
    {
      id: 'Q13',
      effort: 2, // multimeter at terminals
      stage: 3,
      text: 'Press "start zone" on the controller itself. At the zone terminal with a multimeter, what do you read?',
      highlight: ['ctrl', 'valves'],
      options: [
        {
          label: '~24 VAC present',
          effects: { R11: -0.4, R12: -0.4, R22: -0.2, R63: -0.4, R71: 0.4 },
        },
        { label: '0 V', effects: { R11: 0.6, R22: 1.6, R63: 0.6, R7: -0.4 } },
        { label: 'Low or fluctuating', effects: { R61: 0.6, R62: 0.6 } },
      ],
    },
    {
      id: 'Q14',
      effort: 2, // multimeter at terminals
      stage: 3,
      text: 'Field-wire resistance at the controller terminals?',
      highlight: ['ctrl', 'valves'],
      options: [
        { label: 'Low and continuous', effects: { R6: -0.4 } },
        { label: 'Open or high', effects: { R6: 1.6 } },
        { label: 'Intermittent when wiggled', effects: { R6: 0.6 } },
      ],
    },
    {
      id: 'Q15',
      effort: 2, // multimeter at the solenoid
      stage: 3,
      text: 'Solenoid coil resistance (typically 20–60 Ω)?',
      highlight: ['valves'],
      options: [
        { label: 'In range', effects: { R71: -1.0 } },
        { label: 'Open or infinite', effects: { R71: 1.6, R62: 0.6 } },
        { label: 'Near zero / very low', effects: { R71: 1.6 } },
        { label: 'OK at coil, bad at controller', effects: { R61: 1.6 } },
      ],
    },
    {
      id: 'Q16',
      effort: 1, // requires a spare valve and plumbing
      stage: 3,
      text: 'Swap in a known-good valve — does the issue stay with the zone?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes — stays with the zone',
          effects: { R6: 0.6, R7: -0.6, R8: 0.6 },
        },
        { label: 'No — follows the valve', effects: { R7: 1.6 } },
      ],
    },
    {
      id: 'Q17',
      effort: 2, // disassembly, no plumbing change
      stage: 3,
      text: 'Open each valve and inspect the internals — what do you find?',
      highlight: ['valves'],
      options: [
        { label: 'Intact, no debris', effects: { R72: -0.4, R73: -0.4 } },
        { label: 'Damage or debris present', effects: { R72: 1, R73: 0.6 } },
      ],
    },
    {
      id: 'Q18',
      effort: 5, // walk the route and look
      optional: true,
      text: 'Walk the system — do you see water or wet ground?',
      highlight: ['valves'],
      options: [
        {
          label: 'Along the main-line route',
          effects: { R51: 1.6 },
        },
        {
          label: 'At the valve box, or drips from the heads when off',
          effects: { R72: 0.4, R73: 1.6, R74: 1.6 },
        },
        {
          label: 'Along the zone lines',
          effects: { R81: 1.6 },
        },
        {
          label: 'Nothing visible',
          effects: { R51: -0.2, R72: -0.2, R73: -0.2, R74: -0.2, R81: -0.2 },
        },
      ],
    },
    
    {
      id: 'Q19',
      effort: 1, // no flow meter installed; would need to install one
      optional: true,
      text: 'Install flow meter, run a zone, does the flow meter read 1.0–3.0 m³/h?',
      highlight: ['pump'],
      options: [
        { label: 'Yes — in range', effects: { R4: -0.4, R5: -0.4 } },
        { label: 'No — out of range', effects: { R4: 0.4, R5: 0.6 } },
      ],
    },
    {
  "id": "Q20", "effort": 2, "stage": 1,
  "text": "Press start on a zone and go to the pump-start relay. Does it switch, and is 230 V reaching the pump?",
  "highlight": ["relay", "pump"],
  "options": [
    { "label": "Clicks, 230 V at output", "effects": { "R31": -1.2, "R42": 0.6, "R41": 0.4, "R63": -0.4, "R22": -0.2 } },
    { "label": "Clicks, but no 230 V out", "effects": { "R31": 1.6, "R42": -0.4 } },
    { "label": "Clicks, but breaker trips", "effects": { "R31": 1.0, "R42": 1.0 } },
    { "label": "Silent — no click", "effects": { "R31": 0.6, "R22": 0.6, "R63": 0.6, "R23": 0.4 } }
  ]
    },
    {
  "id": "Q21", "effort": 2, "stage": 1,
  "text": "Open the valve box and inspect the wire splices to each solenoid. What do they look like?",
  "highlight": ["valves"],
  "options": [
    { "label": "Clean, dry, sealed connectors", "effects": { "R63": -0.2 } },
    { "label": "Corroded, green, or wet", "effects": { "R63": 1.6, "R62": 0.4 } },
    { "label": "Loose, backed-out, or twisted bare", "effects": { "R63": 1.0, "R61": 0.4 } }
  ]
    },
    {
  id: 'Q22', effort: 5, stage: 1,
  text: 'Run a zone, open valve box, look at valves and heads?',
  multiselect: true,
  highlight: ['valves', 'rotor'],
  options: [
    { label: "water coming out of a zone you didn't activate", effects: { R61: 1.0, R63: 0.4, R74: 1.0, R72: 0.6, R73: 0.4, R4: -0.2, R5: -0.2 } },
    { label: 'water coming out of valve', effects: { R73: 1.0, R71: 0.4, R72: 0.2 } },
    { label: 'water coming out of activated zone', effects: { R31: -0.2, R22: -0.2, R61: -0.2, R63: -0.2, R71: -0.2, R4: -0.2, R5: -0.2 } },
  ],
    }
  ]
}; 
