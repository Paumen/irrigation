const TIMELINE_COLS = [
  { id: 'right', label: 'Started right after', mult: 0.8 },
  { id: 'days', label: 'Started weeks after', mult: 0.4 },
  { id: 'worse', label: 'Worsened — same rate', mult: 0.0 },
  { id: 'faster', label: 'Worsened — faster', mult: 0.4 },
];
const timelineColsWithDays = (days) =>
  TIMELINE_COLS.map((c) => (c.id === 'days' ? { ...c, mult: days } : c));

// Shared physical setup a question belongs to. Questions with the same
// context can be batched into one prompt and answered in a single trip.
const CONTEXT = {
  APP_RUN: 'app-run', // run a zone from the app and observe (heads / yard / pump sound)
  RECALL: 'recall', // answer from memory: timeline, dates, past events
  CONTROLLER: 'controller', // at the controller / app
  PUMP: 'pump', // at the pump
  VALVE_BOX: 'valve-box', // open / inspect the valve box and its contents
  METER: 'meter', // electrical measurements with a multimeter
  WALK: 'walk', // walk the system looking for surface water
  INSTALL: 'install', // install hardware to measure
};

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
  // The score D has three terms — spread, breadth (BREADTH_WEIGHT 1.0), and
  // effort (level * effortWeight). effortWeight 3.0 weights effort above the
  // two cause terms, so the engine leans toward quick, low-effort questions
  // (and questions in the same `context` can be batched and answered together).
  effortWeight: 3.0,

  // Cause taxonomy: dotted F-codes per docs/fcode_spec.md.
  // F<component>.<mode>[.<instance>]. Parent is always flat at the
  // component level (e.g. parent: 'F7' for both F7.1.1 and F7.4).
  causes: [
    { id: 'F1.5',   parent: 'F1', baseline: 1.2, label: 'App software error (bug)' },
    { id: 'F1.8',   parent: 'F1', baseline: 1.2, label: 'App external fault (no wifi / cloud connectivity)' },

    { id: 'F2.1',   parent: 'F2', baseline: 0.8, label: 'Controller physical defect (unit, incl. touchscreen)' },
    { id: 'F2.5',   parent: 'F2', baseline: 0.6, label: 'Controller software error (firmware)' },
    { id: 'F2.6',   parent: 'F2', baseline: 1.8, label: 'Controller settings (schedule, zone map, master-valve / pump-start)' },
    { id: 'F2.8',   parent: 'F2', baseline: 0.4, label: 'Controller external fault (no supply power — socket / plug / breaker)' },

    { id: 'F3.1.1', parent: 'F3', baseline: 1.0, label: 'Wiring zone conductor (break / cut)' },
    { id: 'F3.1.2', parent: 'F3', baseline: 0.8, label: 'Wiring common wire (break / cut)' },
    { id: 'F3.1.3', parent: 'F3', baseline: 0.8, label: 'Wiring splice (corroded → open / intermittent)' },
    { id: 'F3.4',   parent: 'F3', baseline: 0,   label: 'Wiring install error (loose / not isolated)' },

    { id: 'F4.1',   parent: 'F4', baseline: 1.2, label: 'Relay physical defect' },
    { id: 'F4.4',   parent: 'F4', baseline: 0,   label: 'Relay install error' },

    { id: 'F5.1',   parent: 'F5', baseline: 1.0, label: 'Pump physical defect (motor, cap, impeller)' },
    { id: 'F5.3',   parent: 'F5', baseline: 1.2, label: 'Pump suction-side obstruction (lost prime / foot-valve clog)' },
    { id: 'F5.8',   parent: 'F5', baseline: 0,   label: 'Pump external fault (low well level)' },

    { id: 'F6.1',   parent: 'F6', baseline: 0.8, label: 'Main hose 32mm physical defect (leak / break)' },
    { id: 'F6.3',   parent: 'F6', baseline: 1.0, label: 'Main hose 32mm obstruction (air / debris)' },

    { id: 'F7.1.1', parent: 'F7', baseline: 0.5, label: 'Solenoid coil (open / shorted)' },
    { id: 'F7.1.2', parent: 'F7', baseline: 0.7, label: 'Valve diaphragm (tear / perished)' },
    { id: 'F7.1.3', parent: 'F7', baseline: 0.8, label: 'Valve body / seat damage' },
    { id: 'F7.3.1', parent: 'F7', baseline: 0.5, label: 'Solenoid plunger stuck / port clog' },
    { id: 'F7.3.2', parent: 'F7', baseline: 0.5, label: 'Diaphragm metering port / screen debris' },
    { id: 'F7.4',   parent: 'F7', baseline: 1.0, label: 'Valve install error (mis-set / assembly fault)' },

    { id: 'F8.1',   parent: 'F8', baseline: 0.8, label: 'Zone hose 25mm physical defect (leak / break)' },
    { id: 'F8.3',   parent: 'F8', baseline: 0.8, label: 'Zone hose 25mm obstruction (air / debris)' },

    { id: 'F9.1.1', parent: 'F9', baseline: 0.6, label: 'Head pressure regulator (PRS40)' },
    { id: 'F9.1.2', parent: 'F9', baseline: 0.4, label: 'Head gear-drive seized (rotor stuck; weak spring)' },
    { id: 'F9.3',   parent: 'F9', baseline: 0.6, label: 'Head obstruction (debris / filter / nozzle clog)' },
    { id: 'F9.4',   parent: 'F9', baseline: 0.8, label: 'Head install error (arc / range mis-set, nozzle mismatch)' },
  ],
  questions: [
    /* --- STAGE 1: SYMPTOMS --- */
    {
      id: 'Q1',
      context: CONTEXT.APP_RUN,
      effort: 6, // they already know which zones fail
      stage: 1,
      text: 'Run the system from the app and watch the heads. What happens?',
      highlight: ['rotor', 'valves'],
      options: [
        {
          label: 'All 4 zones fail',
          icon: 'scope-all',
          effects: { 'F1': 0.2, 'F2': 0.2, 'F4.1': 0.2, 'F5': 0.4, 'F6': 0.4, 'F3.1.2': 0.2 },
        },
        {
          label: '2–3 zones fail',
          icon: 'scope-multi',
          effects: { 'F5': 0.2, 'F6': 0.2, 'F3.1.2': 0.2 },
        },
        {
          label: 'One zone fails',
          icon: 'scope-single',
          effects: { 'F3.1.1': 0.2, 'F3.1.2': -2.0, 'F3.1.3': 0.2, 'F7': 0.2, 'F8': 0.2 },
        },
        {
          label: 'One rotor fails',
          icon: 'scope-one',
          effects: { 'F3.1.2': -2.0, 'F9': 1.6 },
        },
      ],
    },
        {
      id: 'Q2',
      context: CONTEXT.APP_RUN,
      effort: 5, // walk-observe: start a zone and look around at the heads
      stage: 1,
      text: 'Start one zone from the app and walk the yard. Where does water actually come out?',
      highlight: ['rotor', 'valves', 'ctrl'],
      options: [
        {
          label: 'At the selected zone (correct)',
          icon: 'flow-normal',
          effects: { 'F3': -0.4, 'F7.4': -0.4, 'F2.6': -0.4, 'F2.5': -0.2, 'F7.1.1': -0.2, 'F7.3.1': -0.2, 'F3.1.3': -0.2 },
        },
        {
          label: 'At a different zone',
          icon: 'scope-one',
          effects: { 'F3.1.1': 0.6, 'F3.1.3': 0.4, 'F7.4': 0.4, 'F2.6': 0.4, 'F7.1.2': 0.2, 'F7.3.2': 0.2 },
        },
        {
          label: 'At several zones at once',
          icon: 'scope-multi',
          effects: { 'F7.1.2': 0.6, 'F7.3.2': 0.6, 'F3.1.2': 0.4, 'F7.4': 0.4, 'F2.5': 0.2, 'F2.6': 0.4, 'F3': 0.4, 'F5': 0.2 },
        },
        {
          label: 'No water anywhere',
          icon: 'flow-none',
          effects: { 'F1': 0.6, 'F2': 0.6, 'F4.1': 0.6, 'F5.3': 0.4, 'F5.1': 0.6, 'F6': 0.4, 'F3': 0.4, 'F7.1.1': 0.4, 'F7.3.1': 0.4 },
        },
      ],
    },
    {
      id: 'Q2q',
      context: CONTEXT.APP_RUN,
      effort: 5, // continue walk-observe at the working zone
      stage: 1,
      requires: { Q2: [0] },
      text: 'With the pump up to pressure, how does the flow at that zone look?',
      highlight: ['rotor'],
      options: [
        {
          label: 'Normal and steady',
          icon: 'flow-normal',
          effects: { 'F1': 0.6, 'F5': -0.4, 'F6': -0.4, 'F3': -0.4, 'F7': -0.4, 'F8': -0.4, 'F9': -0.4, 'F2.6': 0.6 },
        },
        {
          label: 'Weak throughout',
          icon: 'flow-weak',
          effects: { 'F5': 0.2, 'F6.3': 0.2, 'F3': 0.2, 'F7.1.2': 0.2, 'F7.3.2': 0.2, 'F7.4': 0.2, 'F8': 0.2, 'F9': 0.4 },
        },
        {
          label: 'Ramps up or down during the run',
          icon: 'flow-decline',
          effects: { 'F5': 0.6, 'F5.3': 0.4, 'F6.3': 0.4, 'F8.3': 0.4 },
        },
        {
          label: 'Erratic — random surges or drops',
          icon: 'pat-noise',
          effects: { 'F1': 0.4, 'F2.5': 0.4, 'F2.6': 0.6, 'F5': 0.4, 'F6.1': 0.4, 'F6.3': 0.2, 'F3': 0.4, 'F7.1.1': 0.2, 'F7.3.1': 0.2, 'F8.1': 0.4, 'F9.1.1': 0.2, 'F9.3': 0.6 },
        },
      ],
    },

    {
      id: 'Q3',
      context: CONTEXT.APP_RUN,
      effort: 5, // listen at the pump while running
      stage: 1,
      text: 'Start a zone from the app and listen at the pump. What does it do?',
      highlight: ['pump'],
      options: [
        {
          label: 'Runs smoothly',
          effects: { 'F5': -0.4, 'F6': 0.2, 'F3': 0.2, 'F7': 0.2, 'F8': 0.2, 'F9': 0.4 },
        },
        {
          label: 'Hums and trips the breaker',
          effects: { 'F4.1': 1.0, 'F5.1': 1.0 },
        },
        {
          label: 'Stays silent',
          // §5.5 parent-broadcast asymmetry: drop F2 broadcast, hit F2.1/F2.8 only.
          effects: { 'F1': 0.4, 'F2.1': 1.0, 'F2.8': 1.0, 'F4.1': 0.6, 'F5.1': 0.6 },
        },
        {
          label: 'Short-cycles or makes no pressure',
          effects: { 'F5': 0.6, 'F6.1': 0.4 },
        },
      ],
    },
    {
      id: 'Q4', context: CONTEXT.CONTROLLER, effort: 3, stage: 1,
      text: 'Try starting a zone three ways: the touchscreen, the app on home Wi-Fi, and the app on cellular only. What works?',
      highlight: ['sw', 'ctrl'],
      options: [
        { label: 'All three behave the same', effects: { 'F2.6': -0.2, 'F1.5': -0.6, 'F1.8': -0.6 } },
        { label: 'Touchscreen OK, app fails both networks', effects: { 'F1.5': 1.0, 'F1.8': 0.4 } },
        { label: 'App OK on Wi-Fi, fails on cellular', effects: { 'F1.8': 1.6, 'F1.5': -0.4 } },
        { label: 'Nothing works on any path', effects: { 'F2': 0.4, 'F2.6': 0.2, 'F1.5': -0.4, 'F1.8': -0.4 } },
      ],
    },

    {
      id: 'Q5',
      context: CONTEXT.PUMP,
      effort: 4, // open the manual hose at the pump and look
      stage: 1,
      text: 'Open the manual hose — how is the flow?',
      highlight: ['pump'],
      options: [
        {
          label: 'Strong and steady',
          effects: { 'F5': -0.6, 'F6': -1, 'F3': 0.2, 'F7': 0.4, 'F8': 0.4, 'F9': 0.4 },
        },
        {
          label: 'Weak or sputtering',
          effects: { 'F5.3': 0.6, 'F5.1': 0.4, 'F6': 0.6 },
        },
        {
          label: 'None at all',
          effects: { 'F5': 1.0, 'F6': 0.4 },
        },
      ],
    },

    {
      id: 'Q6',
      context: CONTEXT.VALVE_BOX,
      effort: 4, // stand at the valve box during a cycle
      stage: 1,
      text: 'Start a zone from the app and stand at the valve box. What do you hear?',
      highlight: ['valves', 'ctrl'],
      options: [
        {
          label: 'Clear click',
          effects: { 'F7.1.1': -0.6, 'F7.3.1': -0.6, 'F7.1.2': 0.4, 'F7.3.2': 0.4, 'F7.1.3': 0.4, 'F8': 0.4, 'F9': 0.6 },
        },
        {
          label: 'Buzz or hum',
          effects: { 'F3': 1, 'F7.3.1': 0.4 },
        },
        {
          label: 'Weak click',
          effects: { 'F3': 0.2, 'F7.1.1': 0.2, 'F7.3.1': 0.2 },
        },
        {
          label: 'Silent — no click',
          effects: { 'F3': 0.4, 'F7.1.1': 0.6, 'F7.3.1': 0.2 },
        },
      ],
    },
    {
      id: 'Q7',
      context: CONTEXT.CONTROLLER,
      effort: 3, // if not tried, requires power-cycling and a test run
      stage: 1,
      text: 'Did a restart help?',
      highlight: ['ctrl', 'sw', 'pump', 'relay'],
      options: [
        {
          label: 'Controller restart briefly fixed it',
          effects: { 'F1.5': 0.6, 'F1.8': 0.6, 'F2.5': 1.0 },
        },
        {
          label: 'Pump restart briefly fixed it',
          effects: { 'F4.1': 0.4, 'F5.1': 0.4 },
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
      context: CONTEXT.RECALL,
      effort: 6, // recall how the issue started
      stage: 2,
      text: 'How did the problem progress?',
      options: [
        {
          label: 'Sudden',
          icon: 'pat-sudden',
          effects: { 'F2.1': 0.4, 'F2.8': 0.4, 'F4.1': 0.2, 'F6.1': 0.2, 'F3.1.3': 0.2, 'F7.1.1': 0.2, 'F7.3.1': 0.2, 'F9': 0.4 },
        },
        {
          label: 'Gradual',
          icon: 'pat-gradual-all',
          effects: { 'F5': 0.4, 'F6.3': 0.4, 'F7.1.2': 0.2, 'F7.3.2': 0.4, 'F7.1.3': 0.4, 'F9.1.1': 0.4, 'F9.3': 0.4 },
        },
        {
          label: 'Intermittent',
          icon: 'pat-gradual-int',
          effects: { 'F2.6': 0.2, 'F1.8': 0.2, 'F5': 0.2, 'F3': 0.2, 'F7': 0.2 },
        },
        {
          label: 'No clear pattern',
          icon: 'pat-noise',
          effects: { 'F1.8': 0.2, 'F5.1': 0.2, 'F3.1.1': 0.4, 'F3.1.2': 0.4 },
        },
      ],
    },
    {
      id: 'Q9',
      context: CONTEXT.RECALL,
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
          causes: ['F5.3', 'F5.1'],
        },
        {
          id: 'valves',
          label: 'Valves',
          model: 'Hunter PGV-101G',
          curve: 'fast',
          causes: ['F7.1.1', 'F7.3.1', 'F7.1.2', 'F7.3.2', 'F7.1.3'],
        },
        {
          id: 'relay',
          label: 'Start-Relay',
          model: 'Hunter',
          curve: 'standard',
          causes: ['F4.1'],
        },
        {
          id: 'ctrl',
          label: 'Controller',
          model: 'RainMachine HD-16 Touch',
          curve: 'standard',
          causes: ['F2.1', 'F2.5'],
        },
        {
          id: 'rotor',
          label: 'Rotors',
          model: 'Hunter I-20 + MP rotators',
          curve: 'standard',
          // §5.5 downstream cleanup: drop F9.3 — debris not age-correlated.
          causes: ['F9.1.1'],
        },
        {
          id: 'mainHose',
          label: 'Main hose',
          model: 'PE 32 mm (pump → valve box)',
          curve: 'standard',
          causes: ['F6.1'],
        },
        {
          id: 'hose',
          label: 'Zone hose',
          model: 'PE 25 mm (zones)',
          curve: 'standard',
          causes: ['F8.1'],
        },
      ],
    },
    {
      id: 'Q10',
      context: CONTEXT.RECALL,
      effort: 4, // recall a distant one-off; reason before vs after
      stage: 2,
      type: 'matrix',
      text: 'Recent hydraulic work — how does it relate to the issue? (leave blank if not applicable)',
      columns: TIMELINE_COLS,
      rows: [
        { id: 'pump', label: 'Pump', effects: { 'F5.3': 0.4, 'F5.1': 1.0 } },
        { id: 'valves', label: 'Valves', effects: { 'F7': 1, 'F3': 0.6 } },
        { id: 'rotor', label: 'Rotors', effects: { 'F9.1.1': 0.4, 'F9.3': 0.6, 'F9.1.2': 0.2, 'F9.4': 1.0 } },
        { id: 'hose', label: 'Hoses', effects: { 'F8': 1, 'F6': 1 } },
      ],
    },
    {
      id: 'Q10b',
      context: CONTEXT.RECALL,
      effort: 4,
      stage: 2,
      type: 'matrix',
      text: 'Recent electrical/control work — how does it relate to the issue? (leave blank if not applicable)',
      columns: TIMELINE_COLS,
      rows: [
        { id: 'ctrl', label: 'Controller', effects: { 'F2.6': 1, 'F2.1': 1.0, 'F2.8': 0.4, 'F3': 0.6 } },
        { id: 'relay', label: 'Start-Relay', effects: { 'F4.1': 1, 'F3': 0.6 } },
        { id: 'wiring', label: 'Wiring', effects: { 'F3': 1 } },
      ],
    },
    {
      id: 'Q11',
      context: CONTEXT.RECALL,
      effort: 4, // recall a distant one-off; reason before vs after
      stage: 2,
      type: 'matrix',
      text: 'Weather events — how do they relate to the issue? (leave blank if not applicable)',
      columns: timelineColsWithDays(0.6),
      rows: [
        { id: 'storm', label: 'Storm or lightning', effects: { 'F2.1': 0.2, 'F2.8': 1.0, 'F3': 1, 'F1.8': 1 } },
        { id: 'freeze', label: 'Freeze', effects: { 'F6.1': 1, 'F7.1.3': 1, 'F8.1': 1 } },
        { id: 'heat', label: 'Heatwave or drought', effects: { 'F5.3': 1 } },
      ],
    },
    {
      id: 'Q11b',
      context: CONTEXT.RECALL,
      effort: 4,
      stage: 2,
      type: 'matrix',
      text: 'Other external events — how do they relate to the issue? (leave blank if not applicable)',
      columns: timelineColsWithDays(0.6),
      rows: [
        { id: 'outage', label: 'Power outage', effects: { 'F1.8': 1, 'F2.5': 1.0, 'F2.6': 0.2 } },
        { id: 'pests', label: 'Pests or rodents', effects: { 'F6.1': 1, 'F8.1': 1, 'F3': 1 } },
        { id: 'dig', label: 'Digging or vehicle', effects: { 'F6.1': 1, 'F3.1.1': 1, 'F3.1.2': 1, 'F8.1': 1 } },
      ],
    },

    /* --- STAGE 3: TESTS --- */
    {
      id: 'Q12',
      context: CONTEXT.VALVE_BOX,
      effort: 3, // open valve box, turn the solenoid
      stage: 3,
      text: 'Open the valve manually with the bleed screw — does the zone run?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes — zone runs',
          // §5.5 parent-broadcast asymmetry: drop F7 broadcast, hit hydraulic faults only.
          effects: { 'F3': 0.6, 'F7.1.1': 0.6, 'F7.3.1': 0.6, 'F7.1.2': -1.4, 'F7.1.3': -1.4, 'F7.3.2': -1.4, 'F7.4': -1.4, 'F8': -1.8, 'F9': -1.8 },
        },
        {
          label: 'Partial — weak flow',
          effects: { 'F3': 0.2, 'F7.1.1': 0.2, 'F7.3.1': 0.2, 'F7.1.2': 0.6, 'F7.3.2': 0.6, 'F7.1.3': 0.4, 'F5': 0.4, 'F6.3': 0.4, 'F8.3': 0.4, 'F9': 0.4 },
        },
        {
          label: 'No — nothing happens',
          effects: { 'F6': 1.0, 'F7.1.2': 1.0, 'F7.3.2': 1.0, 'F7.1.3': 1.0, 'F8': 1.0 },
        },
      ],
    },
    {
      id: 'Q13',
      context: CONTEXT.METER,
      effort: 2, // multimeter at terminals
      stage: 3,
      text: 'Press "start zone" on the controller itself. At the zone terminal with a multimeter, what do you read?',
      highlight: ['ctrl', 'valves'],
      options: [
        {
          label: '~24 VAC present',
          effects: { 'F2.6': -0.4, 'F1.5': -0.4, 'F2.1': -0.2, 'F2.8': -0.2, 'F3.1.3': -0.4, 'F7.1.1': 0.2, 'F7.3.1': 0.4 },
        },
        {
          label: '0 V',
          effects: { 'F2.6': 0.6, 'F2.1': 1.6, 'F3.1.3': 0.6, 'F7': -0.4 },
        },
        { label: 'Low or fluctuating', effects: { 'F3.1.1': 0.6, 'F3.1.2': 0.6 } },
      ],
    },
    {
      id: 'Q14',
      context: CONTEXT.METER,
      effort: 2, // multimeter at terminals
      stage: 3,
      text: 'Field-wire resistance at the controller terminals?',
      highlight: ['ctrl', 'valves'],
      options: [
        { label: 'Low and continuous', effects: { 'F3': -0.4 } },
        { label: 'Open or high', effects: { 'F3': 1.6 } },
        { label: 'Intermittent when wiggled', effects: { 'F3': 0.6 } },
      ],
    },
    {
      id: 'Q15',
      context: CONTEXT.METER,
      effort: 2, // multimeter at the solenoid
      stage: 3,
      text: 'Solenoid coil resistance (typically 20–60 Ω)?',
      highlight: ['valves'],
      options: [
        { label: 'In range', effects: { 'F7.1.1': -1.0 } },
        { label: 'Open or infinite', effects: { 'F7.1.1': 1.6, 'F3.1.2': 0.6 } },
        { label: 'Near zero / very low', effects: { 'F7.1.1': 1.6 } },
        { label: 'OK at coil, bad at controller', effects: { 'F3.1.1': 1.6 } },
      ],
    },
    {
      id: 'Q16',
      context: CONTEXT.VALVE_BOX,
      effort: 1, // requires a spare valve and plumbing
      stage: 3,
      text: 'Swap in a known-good valve — does the issue stay with the zone?',
      highlight: ['valves'],
      options: [
        {
          label: 'Yes — stays with the zone',
          effects: { 'F3': 0.6, 'F7': -0.6, 'F8': 0.6 },
        },
        { label: 'No — follows the valve', effects: { 'F7': 1.6 } },
      ],
    },
    {
      id: 'Q17',
      context: CONTEXT.VALVE_BOX,
      effort: 2, // disassembly, no plumbing change
      stage: 3,
      text: 'Open each valve and inspect the internals — what do you find?',
      highlight: ['valves'],
      options: [
        { label: 'Intact, no debris', effects: { 'F7.1.2': -0.4, 'F7.3.2': -0.4, 'F7.1.3': -0.4 } },
        { label: 'Damage or debris present', effects: { 'F7.1.2': 0.6, 'F7.3.2': 0.4, 'F7.1.3': 0.6 } },
      ],
    },
    {
      id: 'Q18',
      context: CONTEXT.WALK,
      effort: 5, // walk the route and look
      optional: true,
      text: 'Walk the system — do you see water or wet ground?',
      highlight: ['valves'],
      options: [
        {
          label: 'Along the main-line route',
          effects: { 'F6.1': 1.6 },
        },
        {
          label: 'At the valve box, or drips from the heads when off',
          effects: { 'F7.1.2': 0.4, 'F7.3.2': 0.2, 'F7.1.3': 1.6, 'F7.4': 1.6 },
        },
        {
          label: 'Along the zone lines',
          effects: { 'F8.1': 1.6 },
        },
        {
          label: 'Nothing visible',
          effects: { 'F6.1': -0.2, 'F7.1.2': -0.2, 'F7.3.2': -0.2, 'F7.1.3': -0.2, 'F7.4': -0.2, 'F8.1': -0.2 },
        },
      ],
    },

    {
      id: 'Q19',
      context: CONTEXT.INSTALL,
      effort: 1, // no flow meter installed; would need to install one
      optional: true,
      text: 'Install flow meter, run a zone, does the flow meter read 1.0–3.0 m³/h?',
      highlight: ['pump'],
      options: [
        { label: 'Yes — in range', effects: { 'F5': -0.4, 'F6': -0.4 } },
        { label: 'No — out of range', effects: { 'F5': 0.4, 'F6': 0.6 } },
      ],
    },
    {
      id: 'Q20', context: CONTEXT.METER, effort: 2, stage: 1,
      text: 'Press start on a zone and go to the pump-start relay. Does it switch, and is 230 V reaching the pump?',
      highlight: ['relay', 'pump'],
      options: [
        { label: 'Clicks, 230 V at output', effects: { 'F4.1': -1.2, 'F5.1': 0.6, 'F5.3': 0.4, 'F3.1.3': -0.4, 'F2.1': -0.2, 'F2.8': -0.4 } },
        { label: 'Clicks, but no 230 V out', effects: { 'F4.1': 1.6, 'F5.1': -0.4 } },
        { label: 'Clicks, but breaker trips', effects: { 'F4.1': 1.0, 'F5.1': 1.0 } },
        { label: 'Silent — no click', effects: { 'F4.1': 0.6, 'F2.1': 0.4, 'F2.8': 0.6, 'F3.1.3': 0.6, 'F2.5': 0.4, 'F2.6': 0.4 } },
      ],
    },
    {
      id: 'Q21', context: CONTEXT.VALVE_BOX, effort: 2, stage: 1,
      text: 'Open the valve box and inspect the wire splices to each solenoid. What do they look like?',
      highlight: ['valves'],
      options: [
        { label: 'Clean, dry, sealed connectors', effects: { 'F3.1.3': -0.2 } },
        { label: 'Corroded, green, or wet', effects: { 'F3.1.3': 1.6, 'F3.1.2': 0.4 } },
        { label: 'Loose, backed-out, or twisted bare', effects: { 'F3.1.3': 1.0, 'F3.1.1': 0.4 } },
      ],
    },
    {
      id: 'Q22', context: CONTEXT.VALVE_BOX, effort: 5, stage: 1,
      text: 'Run a zone, open valve box, look at valves and heads?',
      multiselect: true,
      highlight: ['valves', 'rotor'],
      options: [
        { label: "water coming out of a zone you didn't activate", effects: { 'F3.1.1': 1.0, 'F3.1.3': 0.4, 'F7.4': 1.0, 'F7.1.2': 0.6, 'F7.3.2': 0.6, 'F7.1.3': 0.4, 'F5': -0.2, 'F6': -0.2 } },
        { label: 'water coming out of valve', effects: { 'F7.1.3': 1.0, 'F7.1.2': 0.2, 'F7.3.2': 0.2 } },
        { label: 'water coming out of activated zone', effects: { 'F4.1': -0.2, 'F2.1': -0.2, 'F2.8': -0.2, 'F3.1.1': -0.2, 'F3.1.3': -0.2, 'F7.1.1': -0.2, 'F7.3.1': -0.2, 'F5': -0.2, 'F6': -0.2 } },
      ],
    }
  ]
};
