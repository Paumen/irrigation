window.DATA = {
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
    { id: 'R91', parent: 'R9', baseline: 1.1, label: 'Sprinkler debris / nozzle' },
    { id: 'R92', parent: 'R9', baseline: 1.0, label: 'Sprinkler misconfigured (manual shutoff, arc/radius)' },
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
          effects: {
            R11: 0.2, R12: 0.2, R13: 0.2,
            R22: 0.2, R23: 0.2,
            R31: 0.2,
            R41: 0.2, R42: 0.2,
            R51: 0.2, R52: 0.2,
          },
        },
        {
          label: 'Multiple zones (not all)',
          icon: 'scope-multi',
          effects: {
            R41: 0.2, R42: 0.2,
            R51: 0.2, R52: 0.2,
            R62: 0.2,
          },
        },
        {
          label: 'Single zone',
          icon: 'scope-single',
          effects: {
            R61: 0.2, R63: 0.2,
            R71: 0.2, R72: 0.2, R73: 0.2, R74: 0.2,
            R81: 0.2, R82: 0.2,
          },
        },
        {
          label: 'One sprinkler',
          icon: 'scope-one',
          effects: {
            R91: 2, R92: 2,
          },
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
          label: 'Manual works, app has issues',
          effects: {
            R11: 1.6, R13: 1.6,
          },
        },
        {
          label: 'Yes — nothing starts at all',
          effects: {
            R22: 0.2, R23: 0.2,
            R31: 0.2,
            R63: 0.2,
          },
        },
        {
          label: 'Yes — both start something',
          effects: {
            R41: 0.2, R42: 0.2,
            R51: 0.2, R52: 0.2,
            R71: 0.2, R72: 0.2, R73: 0.2, R74: 0.2,
            R81: 0.2, R82: 0.2,
            R91: 0.2, R92: 0.2,
          },
        },
      ],
    },
    {
      id: 'Q3',
      stage: 1,
      group: 'Symptoms',
      text: 'How does water leave rotors?',
      highlight: ['sp4', 'lateral'],
      options: [
        {
          label: 'No water',
          icon: 'flow-none',
          effects: {
            R11: 0.6, R12: 0.6, R13: 0.6,
            R22: 0.6, R23: 0.6,
            R31: 0.6,
            R42: 0.6,
            R61: 0.6, R62: 0.6, R63: 0.6,
            R71: 0.6,
          },
        },
        {
          label: 'Weak',
          icon: 'flow-weak',
          effects: {
            R41: 0.2, R42: 0.2,
            R52: 0.2,
            R61: 0.2, R62: 0.2, R63: 0.2,
            R72: 0.2, R74: 0.2,
            R82: 0.2,
            R91: 0.2, R92: 0.2,
          },
        },
        {
          label: 'Strong, then weak',
          icon: 'flow-decline',
          effects: {
            R41: 0.6, R42: 0.6,
          },
        },
        {
          label: 'Weak, then strong',
          icon: 'flow-rise',
          effects: {
            R41: 0.4,
            R52: 0.4,
            R82: 0.4,
          },
        },
        {
          label: 'Pressure fluctuates',
          icon: 'flow-fluct',
          effects: {
            R41: 0.2, R42: 0.2,
            R52: 0.2,
          },
        },
        {
          label: 'Erratic, no pattern',
          icon: 'pat-noise',
          effects: {
            R11: 0.4, R12: 0.4, R13: 0.4,
            R23: 0.4,
            R61: 0.4, R62: 0.4, R63: 0.4,
            R71: 0.4,
          },
        },
        {
          label: 'Leaks when system is off',
          icon: 'flow-leak',
          effects: {
            R51: 0.4,
            R72: 0.4, R73: 0.4, R74: 0.4,
            R81: 0.4,
          },
        },
        {
          label: 'Geyser-like pressure',
          icon: 'flow-geyser',
          effects: {
            R51: 0.4,
            R81: 0.4,
            R91: 0.4,
          },
        },
        {
          label: 'Normal',
          icon: 'flow-normal',
          effects: {
            R11: 0.6, R12: 0.6, R13: 0.6,
            R41: -0.4, R42: -0.4,
            R51: -0.4, R52: -0.4,
            R61: -0.4, R62: -0.4, R63: -0.4,
            R71: -0.4, R72: -0.4, R73: -0.4, R74: -0.4,
            R81: -0.4, R82: -0.4,
            R91: -0.4, R92: -0.4,
          },
        },
      ],
    },
    {
      id: 'Q4',
      stage: 1,
      group: 'Symptoms',
      text: 'How does the pump behave when turned on?',
      highlight: ['pump'],
      options: [
        {
          label: 'Runs smoothly / builds pressure',
          effects: {
            R41: 0.2, R42: -0.3,
            R51: 0.2, R52: 0.2,
            R61: 0.2, R62: 0.2, R63: 0.2,
            R71: 0.2, R72: 0.2, R73: 0.2, R74: 0.2,
            R81: 0.2, R82: 0.2,
            R91: 0.2, R92: 0.2,
          },
        },
        {
          label: 'Hums, trips breaker, or silent',
          effects: {
            R11: 1, R12: 1, R13: 1,
            R22: 1, R23: 1,
            R31: 1,
            R42: 1,
          },
        },
        {
          label: "Starts but won't build pressure",
          effects: {
            R41: 0.6, R42: 0.6,
            R51: 0.6,
          },
        },
        {
          label: 'Short-cycles on/off',
          effects: {
            R41: 0.4, R42: 0.4,
            R51: 0.4,
          },
        },
      ],
    },
    {
      id: 'Q5',
      stage: 1,
      group: 'Symptoms',
      text: 'How did the problem progress?',
      options: [
        {
          label: 'Sudden',
          icon: 'pat-sudden',
          effects: {
            R22: 0.2,
            R31: 0.2,
            R51: 0.2,
            R63: 0.2,
            R71: 0.2,
            R92: 0.3,
          },
        },
        {
          label: 'Gradual',
          icon: 'pat-gradual-all',
          effects: {
            R41: 0.4, R42: 0.4,
            R52: 0.4,
            R72: 0.4, R73: 0.4,
            R91: 0.4, R92: 0.1,
          },
        },
        {
          label: 'Intermittent',
          icon: 'pat-gradual-int',
          effects: {
            R11: 0.2, R13: 0.2,
            R41: 0.2, R42: 0.2,
            R61: 0.2, R62: 0.2, R63: 0.2,
            R71: 0.2, R72: 0.2, R73: 0.2, R74: 0.2,
          },
        },
        
        {
          label: 'Sometimes, no pattern',
          icon: 'pat-noise',
          effects: {
            R13: 0.2,
            R42: 0.2,
            R61: 0.2, R62: 0.2,
          },
        },
      ],
    },
    {
      id: 'Q6',
      stage: 1,
      group: 'Symptoms',
      text: 'How is the flow at the manual hose?',
      highlight: ['pump', 'water'],
      options: [
        {
          label: 'Strong, steady',
          effects: {
            R51: 0.4, R52: 0.4,
            R61: 0.4, R62: 0.4, R63: 0.4,
            R71: 0.4, R72: 0.4, R73: 0.4, R74: 0.4,
            R81: 0.4, R82: 0.4,
            R91: 0.4, R92: 0.4,
          },
        },
        {
          label: 'Weak / sputtering / air-laden',
          effects: {
            R41: 0.2,
            R51: 0.2, R52: 0.2,
          },
        },
        {
          label: 'None at all',
          effects: {
            R41: 0.6, R42: 0.6,
          },
        },
      ],
    },
    {
      id: 'Q7',
      stage: 1,
      group: 'Symptoms',
      text: 'Do you see water / wet ground?',
      highlight: ['water', 'lateral', 'valves'],
      options: [
        {
          label: 'Along the main line route',
          effects: {
            R51: 2,
          },
        },
        {
          label: 'Around a valve box',
          effects: {
            R73: 2, R74: 2,
          },
        },
        {
          label: 'Along zone lines',
          effects: {
            R81: 2,
          },
        },
        {
          label: 'Nothing visible',
          effects: {
            R51: -0.6,
            R73: -0.6, R74: -0.6,
            R81: -0.6,
          },
        },
      ],
    },
    {
      id: 'Q8',
      stage: 1,
      group: 'Symptoms',
      text: 'What do you hear when valve activates?',
      highlight: ['valves', 'ctrl'],
      options: [
        {
          label: 'Clear click',
          effects: {
            R72: 0.4,
            R81: 0.4, R82: 0.4,
            R91: 0.4, R92: 0.6,
          },
        },
        {
          label: 'Buzz / hum, no click',
          effects: {
            R61: 1, R62: 1, R63: 1,
            R71: 1,
          },
        },
        {
          label: 'Weak click',
          effects: {
            R61: 0.2, R62: 0.2, R63: 0.2,
            R71: 0.2,
          },
        },
        {
          label: 'Silent',
          effects: {
            R61: 1, R62: 1, R63: 1,
            R71: 1,
          },
        },
      ],
    },
    {
      id: 'Q9',
      stage: 1,
      group: 'Symptoms',
      text: 'Manual solenoid bleed — zone runs?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes, zone runs',
          effects: {
            R61: 0.6, R62: 0.6, R63: 0.6,
            R71: 0.6,
          },
        },
        {
          label: 'No flow even manually',
          effects: {
            R51: 0.6, R52: 0.6,
            R72: 0.6, R73: 0.6,
            R81: 0.6, R82: 0.6,
          },
        },
      ],
    },
    {
      id: 'Q10',
      stage: 1,
      group: 'Symptoms',
      text: 'Zone behavior over the run cycle?',
      highlight: ['valves', 'sp4', 'lateral'],
      options: [
        {
          label: 'Strong at start, fades',
          icon: 'flow-decline',
          effects: {
            R41: 0.4,
            R52: 0.4,
            R82: 0.4,
          },
        },
        {
          label: 'Weak start to finish',
          icon: 'flow-weak',
          effects: {
            R41: 0.2, R42: 0.2,
            R72: 0.2,
            R81: 0.2,
          },
        },
        {
          label: 'Fine until late, then drops',
          icon: 'flow-late-drop',
          effects: {
            R42: 0.4,
            R71: 0.4,
          },
        },
        {
          label: 'Surges / hammers',
          icon: 'flow-surge',
          effects: {
            R52: 0.4,
          },
        },
        {
          label: 'Same level throughout',
          icon: 'flow-normal',
          effects: {},
        },
      ],
    },
    {
      id: 'Q11a',
      stage: 1,
      group: 'Symptoms',
      text: 'Did restarting the controller help?',
      highlight: ['ctrl', 'sw'],
      options: [
        {
          label: 'Briefly fixed',
          effects: {
            R12: 0.6, R13: 0.6,
            R23: 0.6,
          },
        },
        {
          label: 'No effect',
          effects: {
            R11: -0.2, R12: -0.2, R13: -0.2,
            R22: -0.2, R23: -0.2,
          },
        },
      ],
    },
    {
      id: 'Q11b',
      stage: 1,
      group: 'Symptoms',
      text: 'Did restarting the pump help?',
      highlight: ['pump', 'relay'],
      options: [
        {
          label: 'Briefly fixed',
          effects: {
            R31: 0.4,
            R42: 0.4,
          },
        },
        {
          label: 'No effect',
          effects: {
            R42: -0.2,
          },
        },
      ],
    },

    /* --- STAGE 2: EVENTS --- */
    {
      id: 'AGES',
      stage: 2,
      type: 'sliders',
      group: 'Events',
      text: 'How old is each component?',
      highlight: ['pump', 'valves', 'relay', 'ctrl', 'wifi', 'sp4'],
      rows: [
        {
          id: 'pump',
          label: 'Pump',
          steps: [
            { label: '—', effects: {} },
            { label: '0–4 yrs', effects: { R41: -0.2, R42: -0.2 } },
            { label: '4–8 yrs', effects: {} },
            { label: '8–12 yrs', effects: { R41: 0.2, R42: 0.2 } },
            { label: '12+ yrs', effects: { R41: 0.4, R42: 0.4 } },
          ],
        },
        {
          id: 'valves',
          label: 'Valves',
          steps: [
            { label: '—', effects: {} },
            { label: '0–4 yrs', effects: { R71: -0.2, R72: -0.2, R73: -0.2 } },
            { label: '4–8 yrs', effects: { R71: 0.2, R72: 0.2, R73: 0.2 } },
            { label: '8–12 yrs', effects: { R71: 0.2, R72: 0.2, R73: 0.2 } },
            { label: '12+ yrs', effects: { R71: 0.4, R72: 0.4, R73: 0.4 } },
          ],
        },
        {
          id: 'relay',
          label: 'Pump-start relay',
          steps: [
            { label: '—', effects: {} },
            { label: '0–4 yrs', effects: { R31: -0.2 } },
            { label: '4–8 yrs', effects: {} },
            { label: '8–12 yrs', effects: { R31: 0.2 } },
            { label: '12+ yrs', effects: { R31: 0.4 } },
          ],
        },
        {
          id: 'ctrl',
          label: 'Controller',
          steps: [
            { label: '—', effects: {} },
            { label: '0–4 yrs', effects: { R12: -0.2, R22: -0.2, R23: -0.2 } },
            { label: '4–8 yrs', effects: {} },
            { label: '8–12 yrs', effects: { R12: 0.2, R22: 0.2, R23: 0.2 } },
            { label: '12+ yrs', effects: { R12: 0.4, R22: 0.4, R23: 0.4 } },
          ],
        },
        {
          id: 'spr',
          label: 'Rotors',
          steps: [
            { label: '—', effects: {} },
            { label: '0–4 yrs', effects: { R91: -0.2 } },
            { label: '4–8 yrs', effects: {} },
            { label: '8–12 yrs', effects: { R91: 0.2 } },
            { label: '12+ yrs', effects: { R91: 0.4 } },
          ],
        },
      ],
    },
    {
      id: 'E1',
      stage: 2,
      type: 'matrix',
      group: 'Events',
      text: 'Recent service or work — relation to issue?',
      columns: [
        { id: 'no', label: 'N/A', mult: 0.0 },
        { id: 'right', label: 'Started right after', mult: 1.0 },
        { id: 'days', label: 'Started week(s) after', mult: 0.6 },
        { id: 'worse', label: 'Worsened (same)', mult: 0.0 },
        { id: 'faster', label: 'Worsened (faster)', mult: 0.4 },
        { id: 'briefly', label: 'Briefly fixed, returned', mult: 0.2 },
      ],
      rows: [
        { id: 'pump', label: 'Pump ', effects: { R41: 1, R42: 1 } },
        { id: 'relay', label: 'Pump-start-relay ', effects: { R31: 1 } },
        { id: 'ctrl', label: 'Controller ', effects: { R11: 1, R22: 1 } },
        { id: 'app', label: 'App / wifi / settings', effects: { R11: 1, R12: 1, R13: 1 } },
        { id: 'valves', label: 'Valve ', effects: { R71: 1, R72: 1, R73: 1, R74: 1 } },
        { id: 'spr', label: 'Sprinkler ', effects: { R91: 0.6, R92: 1.0 } },
        { id: 'zhose', label: 'Zone hose / fittings ', effects: { R81: 1, R82: 1, R51: 1, R52: 1 } },
        { id: 'wiring', label: 'System wiring ', effects: { R61: 1, R62: 1, R63: 1 } },
      ],
    },
    {
      id: 'E2',
      stage: 2,
      type: 'matrix',
      group: 'Events',
      text: 'External events — relation to issue?',
      columns: [
        { id: 'no', label: 'N/A', mult: 0.0 },
        { id: 'right', label: 'Started right after', mult: 1.0 },
        { id: 'days', label: 'Started week(s) after', mult: 0.6 },
        { id: 'worse', label: 'Worsened (same)', mult: 0.0 },
        { id: 'faster', label: 'Worsened (faster)', mult: 0.4 },
        { id: 'briefly', label: 'Briefly fixed, returned', mult: 0.2 },
      ],
      rows: [
        { id: 'storm', label: 'Storm / lightning', effects: { R22: 1, R61: 1, R62: 1, R63: 1, R12: 1 } },
        { id: 'freeze', label: 'Freeze', effects: { R51: 1, R73: 1, R81: 1 } },
        { id: 'heat', label: 'Heatwave / drought', effects: { R41: 1 } },
        { id: 'outage', label: 'Power outage', effects: { R12: 1, R23: 1 } },
        { id: 'pests', label: 'Pests / rodents', effects: { R51: 1, R81: 1, R61: 1, R62: 1, R63: 1 } },
        { id: 'dig', label: 'Digging / vehicle', effects: { R51: 1, R61: 1, R62: 1, R81: 1 } },
      ],
    },

    /* --- STAGE 3: HARD TESTS --- */
    {
      id: 'D1',
      stage: 3,
      group: 'Hard tests',
      text: 'Zone terminal voltage during call (~24 VAC)?',
      highlight: ['ctrl', 'valves'],
      options: [
        {
          label: '~24 VAC present',
          effects: {
            R22: -0.4,
            R61: -0.4, R62: -0.4, R63: -0.4,
            R71: 0.4, R72: 0.4, R73: 0.4, R74: 0.4,
          },
        },
        { label: '0 V', effects: { R11: 0.6, R22: 0.6, R63: 0.6 } },
        { label: 'Low / fluctuating', effects: { R61: 0.6, R62: 0.6 } },
      ],
    },
    {
      id: 'D2',
      stage: 3,
      group: 'Hard tests',
      text: '24 VAC at controller pump/master terminal during call?',
      highlight: ['ctrl', 'relay'],
      options: [
        { label: "24V present, relay won't pull", effects: { R31: 0.6 } },
        { label: '0 V', effects: { R11: 0.6, R22: 0.6 } },
        { label: '24V in, clicks, no 230V out', effects: { R31: 0.6 } },
      ],
    },
    {
      id: 'D3',
      stage: 3,
      group: 'Hard tests',
      text: 'Common-wire continuity controller→valves?',
      highlight: ['ctrl', 'valves'],
      options: [
        { label: 'Continuous, low resistance', effects: { R62: -0.4 } },
        { label: 'Open or high resistance', effects: { R62: 1.6 } },
        { label: 'Intermittent when wiggled', effects: { R62: 0.6 } },
      ],
    },
    {
      id: 'D4',
      stage: 3,
      group: 'Hard tests',
      text: 'Solenoid coil resistance (typical 20–60 Ω)?',
      highlight: ['valves'],
      options: [
        { label: 'In range', effects: { R71: -0.4, R72: 0.2, R73: 0.2, R74: 0.2 } },
        { label: 'Open / infinite', effects: { R71: 1.6 } },
        { label: 'Near zero / very low', effects: { R71: 1.6 } },
        { label: 'OK at coil, bad at controller', effects: { R61: 1.6 } },
      ],
    },
    {
      id: 'D5',
      stage: 3,
      group: 'Hard tests',
      text: 'Swap valve with known-good — issue stays with zone?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes (stays with zone)',
          effects: {
            R61: 0.6, R62: 0.6, R63: 0.6,
            R71: -0.6, R72: -0.6, R73: -0.6, R74: -0.6,
            R81: 0.6, R82: 0.6,
          },
        },
        { label: 'No (follows the valve)', effects: { R71: 1.6, R72: 1.6, R73: 1.6, R74: 1.6 } },
      ],
    },
    {
      id: 'D6',
      stage: 3,
      group: 'Hard tests',
      text: 'Controller board visual check?',
      highlight: ['ctrl'],
      options: [
        { label: 'Looks fine', effects: { R22: -0.2 } },
        { label: 'Corrosion / burn marks', effects: { R22: 1 } },
      ],
    },
    {
      id: 'D7',
      stage: 3,
      group: 'Hard tests',
      text: 'Open each valve and inspect internals?',
      highlight: ['valves'],
      options: [
        { label: 'Intact, no debris', effects: { R72: -0.4, R73: -0.4 } },
        { label: 'Damaged or debris', effects: { R72: 1, R73: 0.6 } },
      ],
    },
    {
      id: 'D8',
      stage: 3,
      group: 'Hard tests',
      text: 'Dig & inspect hoses for damage?',
      highlight: ['water', 'lateral'],
      options: [
        { label: 'Damage found', effects: { R51: 1, R81: 1 } },
        { label: 'No damage', effects: { R51: -0.4, R81: -0.4 } },
      ],
    },
    {
      id: 'D9',
      stage: 3,
      group: 'Hard tests',
      text: 'Mains voltage at controller outlet?',
      highlight: ['ctrl', 'mains'],
      options: [
        { label: 'Normal (~230 VAC)', effects: { R22: -0.4 } },
        { label: 'Low or absent', effects: { R22: 1.6 } },
        { label: 'Present but controller dead', effects: { R22: 1.6 } },
      ],
    },
    {
      id: 'D10',
      stage: 3,
      group: 'Hard tests',
      text: 'Flow meter reads 1.0–3.0?',
      highlight: ['pump', 'water'],
      options: [
        { label: 'Yes (in range)', effects: { R41: -0.4, R42: -0.4, R51: -0.4, R52: -0.4 } },
        { label: 'No (out of range)', effects: { R41: 0.2, R42: 0.2, R51: 0.2, R52: 0.2 } },
      ],
    },
  ],
};
