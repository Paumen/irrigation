import React, { useState, useMemo, useEffect, useRef } from 'react';

// ============ THEME ============
const T = {
  bg:           'oklch(0.985 0.003 240)',
  panel:        '#ffffff',
  panelMuted:   'oklch(0.97 0.005 240)',
  border:       'oklch(0.90 0.006 240)',
  borderStrong: 'oklch(0.78 0.010 240)',
  text:         'oklch(0.22 0.012 240)',
  textMuted:    'oklch(0.45 0.012 240)',
  textFaint:    'oklch(0.60 0.010 240)',
  accent:       'oklch(0.62 0.18 50)',
  accentBg:     'oklch(0.95 0.06 75)',
  accentBorder: 'oklch(0.74 0.14 75)',
  accentText:   'oklch(0.42 0.16 50)',
  positive:     'oklch(0.50 0.16 145)',
  negative:     'oklch(0.55 0.20 25)',
  water:        'oklch(0.55 0.14 230)',
  v230:         'oklch(0.55 0.20 25)',
  v24:          'oklch(0.65 0.16 75)',
  signal:       'oklch(0.60 0.10 220)',
  rowActive:    'oklch(0.94 0.008 240)',
};

// ============ ROOT CAUSES ============
const ROOT_CAUSES_DATA = [
  ['R1.1','R1',0.8,'Misconfiguration'],
  ['R1.2','R1',0.9,'App failure (bug, corruption)'],
  ['R1.3','R1',0.8,'Connectivity (wifi)'],
  ['R2.1','R2',0.9,'Mains supply / GFCI tripped'],
  ['R2.2','R2',0.9,'Controller hardware failure'],
  ['R2.3','R2',0.8,'Controller fw / config corruption'],
  ['R3.1','R3',1.2,'Relay / 24V or 230V wiring fault'],
  ['R4.1','R4',1.3,'Pump suction-side fault'],
  ['R4.2','R4',1.1,'Pump internal failure'],
  ['R5.1','R5',1.2,'Main line leak / break'],
  ['R5.2','R5',0.8,'Main line air lock / clog'],
  ['R6.1','R6',1.2,'Per-zone hot conductor fault'],
  ['R6.2','R6',1.4,'Shared common / neutral fault'],
  ['R6.3','R6',0.8,'Wire-to-triac connection fault'],
  ['R7.1','R7',1.2,'Solenoid failure'],
  ['R7.2','R7',1.4,'Diaphragm failure'],
  ['R7.3','R7',0.7,'Valve body / seal failure'],
  ['R7.4','R7',0.8,'Valve manual misconfiguration'],
  ['R8.1','R8',1.1,'Lateral hose damage'],
  ['R8.2','R8',0.9,'Air in hose / debris clog'],
  ['R8.3','R8',0.9,'Fitting damage'],
  ['R9.1','R9',1.1,'Sprinkler issue (debris, nozzle, pop-up)'],
];
const RC = {};
ROOT_CAUSES_DATA.forEach(([id,parent,baseline,label])=>{ RC[id]={id,parent,baseline,label}; });
const ALL_IDS = Object.keys(RC);
const expand = (t) => RC[t] ? [t] : ALL_IDS.filter(id => RC[id].parent === t);
const eff = (m) => {
  const r = {};
  Object.entries(m).forEach(([t,d]) => expand(t).forEach(rc => { r[rc] = (r[rc]||0) + d; }));
  return r;
};

// ============ QUESTIONS ============
const QUESTIONS = [];
const ageOpts = (t) => [
  { label:'0–4 yrs',  effects: eff({[t]:-0.2}) },
  { label:'4–8 yrs',  effects: {} },
  { label:'8–12 yrs', effects: eff({[t]: 0.2}) },
  { label:'12+ yrs',  effects: eff({[t]: 0.4}) },
];
QUESTIONS.push(
  {id:'A_pump',  stage:1,group:'Component ages',text:'Age of pump',options:ageOpts('R4')},
  {id:'A_valves',stage:1,group:'Component ages',text:'Age of valves (no diaphragm/solenoid replacement)',options:[
    {label:'0–4 yrs', effects: eff({'R7.1':-0.2,'R7.2':-0.2,'R7.3':-0.2})},
    {label:'4–8 yrs', effects: eff({'R7.1': 0.2,'R7.2': 0.2,'R7.3': 0.2})},
    {label:'8–12 yrs',effects: eff({'R7.1': 0.2,'R7.2': 0.2,'R7.3': 0.2})},
    {label:'12+ yrs', effects: eff({'R7.1': 0.4,'R7.2': 0.4,'R7.3': 0.4})},
  ]},
  {id:'A_relay', stage:1,group:'Component ages',text:'Age of pump start relay',options:ageOpts('R3')},
  {id:'A_ctrl',  stage:1,group:'Component ages',text:'Age of controller',options:[
    {label:'0–4 yrs', effects: eff({'R1.2':-0.2,'R2.2':-0.2,'R2.3':-0.2})},
    {label:'4–8 yrs', effects: {}},
    {label:'8–12 yrs',effects: eff({'R1.2': 0.2,'R2.2': 0.2,'R2.3': 0.2})},
    {label:'12+ yrs', effects: eff({'R1.2': 0.4,'R2.2': 0.4,'R2.3': 0.4})},
  ]},
  {id:'A_rotors',stage:1,group:'Component ages',text:'Age of rotors / sprinklers',options:ageOpts('R9')},

  {id:'Q1',stage:2,group:'Symptoms',text:'Q1. Scope of failure?',options:[
    {label:'All zones fail',                  effects: eff({R1:0.2,R2:0.2,R3:0.2,R4:0.2,R5:0.2})},
    {label:'Multiple zones (not all)',        effects: eff({R5:0.2,'R6.2':0.2,R4:0.2})},
    {label:'Single zone',                     effects: eff({'R6.1':0.2,'R6.3':0.2,R7:0.2,R8:0.2})},
    {label:'One sprinkler in working zone',   effects: eff({R9:2})},
  ]},
  {id:'Q2',stage:2,group:'Symptoms',text:'Q2. Same interface, same issue?',options:[
    {label:'Manual works, app has issues',    effects: eff({'R1.1':2,'R1.3':2})},
    {label:'Yes — nothing starts at all',     effects: eff({R2:0.2,R3:0.2,'R6.3':0.2})},
    {label:'Yes — both start something',      effects: eff({R4:0.2,R5:0.2,R7:0.2,R8:0.2,R9:0.2})},
  ]},
  {id:'Q3',stage:2,group:'Symptoms',text:'Q3. How does water come out of the sprinklers?',options:[
    {label:'No water',                        effects: eff({R1:0.6,R2:0.6,'R3.1':0.6,'R4.2':0.6,R6:0.6,'R7.1':0.6})},
    {label:'Weak',                            effects: eff({'R4.1':0.2,'R4.2':0.2,'R5.2':0.2,R6:0.2,'R7.2':0.2,'R7.4':0.2,'R8.2':0.2,'R9.1':0.2})},
    {label:'Strong, then weak',               effects: eff({'R4.1':0.6,'R4.2':0.6})},
    {label:'Weak, then strong',               effects: eff({'R5.2':0.4,'R8.2':0.4,'R4.1':0.4})},
    {label:'Pressure fluctuates',             effects: eff({'R4.1':0.2,'R4.2':0.2,'R5.2':0.2})},
    {label:'Erratic, no pattern',             effects: eff({'R1.1':0.4,'R1.2':0.4,'R1.3':0.4,'R2.3':0.4,'R6.1':0.4,'R6.2':0.4,'R6.3':0.4,'R7.1':0.4})},
    {label:'Leaks when system is off',        effects: eff({'R7.2':0.4,'R7.3':0.4,'R7.4':0.4,'R5.1':0.4,'R8.1':0.4,'R8.3':0.4})},
    {label:'Geyser-like pressure',            effects: eff({'R5.1':0.4,'R8.1':0.4,'R8.3':0.4,'R9.1':0.4})},
    {label:'Normal',                          effects: {...eff({R4:-0.4,R5:-0.4,R6:-0.4,R7:-0.4,R8:-0.4,R9:-0.4}),...eff({R1:0.6})}},
  ]},
  {id:'Q4',stage:2,group:'Symptoms',text:'Q4. When a zone is called, do you hear the pump start?',options:[
    {label:'Pump runs',                       effects: eff({R4:0.2,R5:0.2,R6:0.2,R7:0.2,R8:0.2,R9:0.2})},
    {label:'Pump silent / hums',              effects: eff({'R3.1':1,'R4.2':1,R1:1,R2:1})},
  ]},
  {id:'Q5',stage:2,group:'Symptoms',text:'Q5. If pump runs, does manual hose work?',options:[
    {label:'Strong, steady',                  effects: eff({R5:0.4,R6:0.4,R7:0.4,R8:0.4,R9:0.4})},
    {label:'Weak / sputtering / air-laden',   effects: eff({'R4.1':0.2})},
    {label:'None at all',                     effects: eff({'R4.1':0.6,'R4.2':0.6})},
  ]},
  {id:'Q6',stage:2,group:'Symptoms',text:'Q6. Pump behavior on start?',options:[
    {label:'Starts smoothly, builds pressure',effects: eff({'R4.2':-0.5})},
    {label:"Starts but won't build pressure", effects: eff({'R4.1':0.6,'R5.1':0.6,'R4.2':0.6})},
    {label:"Hums / trips / won't start",      effects: eff({'R4.2':1,'R3.1':1})},
    {label:'Short-cycles on/off',             effects: eff({'R5.1':0.4,'R4.1':0.4,'R4.2':0.4})},
  ]},
  {id:'Q7',stage:2,group:'Symptoms',text:'Q7. Do you see water / wet ground?',options:[
    {label:'Along the main line route',       effects: eff({'R5.1':2})},
    {label:'Around a valve box',              effects: eff({'R7.3':2,'R7.4':2})},
    {label:'Along zone lines',                effects: eff({'R8.1':2,'R8.3':2})},
    {label:'Nothing visible',                 effects: eff({'R5.1':-0.6,'R7.3':-0.6,'R7.4':-0.6,'R8.1':-0.6,'R8.3':-0.6})},
  ]},
  {id:'Q8',stage:2,group:'Symptoms',text:'Q8. At affected valve — what do you hear when zone activates?',options:[
    {label:'Clear click',                     effects: eff({'R7.2':0.4,R8:0.4,R9:0.4})},
    {label:'Buzz / hum, no click',            effects: eff({'R7.1':1,R6:1})},
    {label:'Weak click',                      effects: eff({'R6.1':0.2,'R6.2':0.2,'R6.3':0.2,'R7.1':0.2})},
    {label:'Silent',                          effects: eff({'R6.1':1,'R6.2':1,'R6.3':1,'R7.1':1})},
  ]},
  {id:'Q9',stage:2,group:'Symptoms',text:'Q9. Manually open valve at solenoid — does the system run correctly?',options:[
    {label:'Yes, zone runs',                  effects: eff({R6:0.6,'R7.1':0.6})},
    {label:'No flow even manually',           effects: eff({'R7.2':0.6,'R7.3':0.6,R8:0.6,R5:0.6})},
  ]},
  {id:'Q11',stage:2,group:'Symptoms',text:'Q11. How did the problem appear, and how often now?',options:[
    {label:'Sudden, every time since',        effects: eff({'R2.1':0.2,'R2.2':0.2,'R3.1':0.2,'R5.1':0.2,'R6.3':0.2,'R7.1':0.2})},
    {label:'Sudden, intermittent since',      effects: eff({'R1.3':0.2,'R6.1':0.2,'R6.2':0.2,'R7.1':0.2})},
    {label:'Gradual, now every time',         effects: eff({R4:0.4,'R7.2':0.4,'R7.3':0.4,'R9.1':0.4,'R5.2':0.4})},
    {label:'Gradual, still intermittent',     effects: eff({R4:0.2,R7:0.2,R6:0.2})},
    {label:'Intermittent from start',         effects: eff({'R1.1':0.2,R6:0.2})},
    {label:'Sometimes, no pattern',           effects: eff({'R1.3':0.2,'R6.1':0.2,'R6.2':0.2,'R4.2':0.2})},
  ]},
  {id:'Q12',stage:2,group:'Symptoms',text:'Q12. Zone behavior over the run cycle?',options:[
    {label:'Strong at start, fades',          effects: eff({'R5.2':0.4,'R8.2':0.4,'R4.1':0.4})},
    {label:'Weak start to finish',            effects: eff({R4:0.2,'R7.2':0.2,'R8.1':0.2})},
    {label:'Fine until late, then drops',     effects: eff({'R4.2':0.4,'R7.1':0.4})},
    {label:'Surges / hammers',                effects: eff({'R5.2':0.4})},
    {label:'Same level throughout',           effects: {}},
  ]},
  {id:'Q13a',stage:2,group:'Symptoms',text:'Q13a. Did power-cycling the controller help?',options:[
    {label:'Briefly fixed', effects: eff({'R1.2':0.6,'R1.3':0.6,'R2.3':0.6})},
    {label:'No effect',     effects: eff({R1:-0.2,R2:-0.2})},
  ]},
  {id:'Q13b',stage:2,group:'Symptoms',text:'Q13b. Did power-cycling the pump help?',options:[
    {label:'Briefly fixed', effects: eff({'R4.2':0.4,'R3.1':0.4})},
    {label:'No effect',     effects: eff({'R4.2':-0.2})},
  ]},
  {id:'Q13c',stage:2,group:'Symptoms',text:'Q13c. Did power-cycling both help?',options:[
    {label:'Briefly fixed', effects: eff({R1:0.4,'R2.3':0.4})},
    {label:'No effect',     effects: eff({R1:-0.2,R2:-0.2})},
  ]},
);

const TIMING = (targets) => [
  {label:"Didn't happen / N/A",          effects:{}},
  {label:'Started right after',          effects: eff(Object.fromEntries(targets.map(t=>[t,1])))},
  {label:'Started days/weeks after',     effects: eff(Object.fromEntries(targets.map(t=>[t,0.6])))},
  {label:'Worsened (same speed)',        effects:{}},
  {label:'Worsened (faster)',            effects: eff(Object.fromEntries(targets.map(t=>[t,0.4])))},
  {label:'Briefly fixed, returned',      effects: eff(Object.fromEntries(targets.map(t=>[t,0.2])))},
  {label:"Don't know",                   effects:{}},
];
[
  ['E_pump',  'Recent pump service / replacement',     ['R4']],
  ['E_relay', 'Recent pump-start-relay service',       ['R3']],
  ['E_ctrl',  'Recent controller service / replacement',['R1.1','R2.2']],
  ['E_app',   'Recent app / wifi / settings change',   ['R1']],
  ['E_valves','Recent valve service / replacement',    ['R7']],
  ['E_spr',   'Recent sprinkler service / replacement',['R9']],
  ['E_zhose', 'Recent zone hose / fittings work',      ['R8','R5']],
  ['E_wiring','Recent system wiring work',             ['R6']],
  ['E_storm', 'Storm / lightning',                     ['R2.2','R6','R1.2']],
  ['E_freeze','Freeze (toggle drained → halve effect)',['R5.1','R7.3','R8.1']],
  ['E_heat',  'Heatwave / drought',                    ['R4.1']],
  ['E_outage','Power outage',                          ['R1.2','R2.3']],
  ['E_pests', 'Pests / rodents',                       ['R5.1','R8.1','R6']],
  ['E_dig',   'Digging / landscaping / vehicle',       ['R5.1','R6.1','R6.2','R8.1']],
].forEach(([id,label,targets]) => {
  QUESTIONS.push({id,stage:3,group:'Events',text:label,options:TIMING(targets)});
});

QUESTIONS.push(
  {id:'D1',stage:4,group:'Hard tests',text:'D1. Flow meter reads 1.0–3.0?',options:[
    {label:'Yes (in range)',     effects: eff({R4:-0.4,R5:-0.4})},
    {label:'No (out of range)',  effects: eff({R4: 0.2,R5: 0.2})},
  ]},
  {id:'D2',stage:4,group:'Hard tests',text:'D2. Multimeter at zone terminal during call (~24 VAC zone-to-common)?',options:[
    {label:'~24 VAC present',          effects: eff({R7:0.4,'R2.2':-0.4,R6:-0.4})},
    {label:'0 V',                      effects: eff({'R2.2':0.6,'R6.3':0.6,'R1.1':0.6})},
    {label:'Low / fluctuating',        effects: eff({'R6.1':0.6,'R6.2':0.6})},
  ]},
  {id:'D3',stage:4,group:'Hard tests',text:'D3. Mains voltage at controller outlet?',options:[
    {label:'Normal (~230 VAC)',                effects: eff({'R2.1':-0.4})},
    {label:'Low or absent',                    effects: eff({'R2.1':1.6})},
    {label:'Present but controller dead',      effects: eff({'R2.2':1.6})},
  ]},
  {id:'D4',stage:4,group:'Hard tests',text:'D4. Solenoid coil resistance (typical 20–60 Ω)?',options:[
    {label:'In range',                         effects: eff({'R7.1':-0.4,'R7.2':0.2,'R7.3':0.2,'R7.4':0.2})},
    {label:'Open / infinite',                  effects: eff({'R7.1':1.6})},
    {label:'Near zero / very low',             effects: eff({'R7.1':1.6})},
    {label:'Fine at coil, bad at controller',  effects: eff({'R6.1':1.6})},
  ]},
  {id:'D5',stage:4,group:'Hard tests',text:'D5. Common-wire continuity controller→valves?',options:[
    {label:'Continuous, low resistance',       effects: eff({'R6.2':-0.4})},
    {label:'Open or high resistance',          effects: eff({'R6.2':1.6})},
    {label:'Intermittent when wiggled',        effects: eff({'R6.2':0.6})},
  ]},
  {id:'D6',stage:4,group:'Hard tests',text:'D6. 24 VAC at controller pump/master terminal during call?',options:[
    {label:'~24 VAC, relay does not pull in',  effects: eff({'R3.1':0.6})},
    {label:'0 V',                              effects: eff({'R2.2':0.6,'R1.1':0.6})},
    {label:'Voltage present, relay clicks, no 230V', effects: eff({'R3.1':0.6})},
  ]},
  {id:'D7',stage:4,group:'Hard tests',text:'D7. Controller board visual check?',options:[
    {label:'Looks fine',                       effects: eff({'R2.2':-0.2})},
    {label:'Not fine (corrosion, burn marks)', effects: eff({'R2.2':1})},
  ]},
  {id:'D8',stage:4,group:'Hard tests',text:'D8. Dig & inspect hoses for damage?',options:[
    {label:'Damage found',                     effects: eff({'R5.1':1,'R8.1':1,'R8.3':1})},
    {label:'No damage',                        effects: eff({'R5.1':-0.4,'R8.1':-0.4,'R8.3':-0.4})},
  ]},
  {id:'D9',stage:4,group:'Hard tests',text:'D9. Open each valve and inspect internals?',options:[
    {label:'Intact, no debris',                effects: eff({'R7.2':-0.4,'R7.3':-0.4})},
    {label:'Damaged or debris',                effects: eff({'R7.2':1,'R7.3':0.6})},
  ]},
  {id:'D10',stage:4,group:'Hard tests',text:'D10. Swap suspect valve with known-good — does problem stay with the zone?',options:[
    {label:'Yes (stays with zone)',            effects: eff({R7:-0.6,R6:0.6,R8:0.6})},
    {label:'No (follows the valve)',           effects: eff({R7:1.6})},
  ]},
);

// ============ DIAGRAM (DESKTOP) ============
const BOXES = [
  {key:'app',    x: 10, y: 26, w:42, h:22, label:'APP'},
  {key:'pwr230', x: 60, y:  4, w:60, h:18, label:'230 V'},
  {key:'ctrl',   x: 60, y: 26, w:60, h:22, label:'CONTROLLER'},
  {key:'relay',  x:130, y: 26, w:44, h:22, label:'RELAY'},
  {key:'pump',   x:184, y: 26, w:42, h:22, label:'PUMP'},
  {key:'valves', x: 72, y:212, w:80, h:24, label:'VALVE BOX'},
  {key:'sprink', x:194, y:212, w:66, h:24, label:'SPRINKLERS'},
];
const R_POS = {
  'R1.1':{x: 31, y: 62}, 'R1.2':{x: 31, y: 86}, 'R1.3':{x: 31, y:110},
  'R2.1':{x: 90, y: 62}, 'R2.2':{x: 90, y: 86}, 'R2.3':{x: 90, y:110},
  'R3.1':{x:152, y: 62},
  'R4.1':{x:205, y: 62}, 'R4.2':{x:205, y: 86},
  'R5.1':{x:285, y: 90}, 'R5.2':{x:285, y:170},
  'R6.1':{x: 12, y:165}, 'R6.2':{x: 12, y:192}, 'R6.3':{x: 12, y:219},
  'R7.1':{x: 90, y:250}, 'R7.2':{x:132, y:250}, 'R7.3':{x: 90, y:274}, 'R7.4':{x:132, y:274},
  'R8.1':{x:173, y:224}, 'R8.2':{x:173, y:250}, 'R8.3':{x:173, y:276},
  'R9.1':{x:227, y:250},
};

const sevColor = (t) => {
  const tt = Math.max(0, Math.min(1, t));
  const hue = 145 - tt * 120;
  const L = 0.82 - tt * 0.18;
  const C = 0.10 + tt * 0.10;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${hue.toFixed(1)})`;
};

// ============ HOOKS ============
function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

// ============ COMPONENTS ============

function SystemDiagram({ severityT, activeRC, onPickRC }) {
  const SANS = "'IBM Plex Sans', sans-serif";
  const MONO = "'IBM Plex Mono', monospace";
  return (
    <svg viewBox="0 0 310 340" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* connection lines */}
      <g fill="none" strokeLinecap="round">
        {/* APP -> CTRL: wifi (dashed arc) */}
        <path d="M 52 37 Q 56 18 60 37" stroke={T.signal} strokeWidth="1.2" strokeDasharray="2.5,2.5" />
        {/* 230 V -> CTRL */}
        <line x1={90} y1={22} x2={90} y2={26} stroke={T.v230} strokeWidth="2" />
        {/* CTRL -> RELAY (24 V) */}
        <line x1={120} y1={37} x2={130} y2={37} stroke={T.v24} strokeWidth="2.2" />
        {/* RELAY -> PUMP (230 V) */}
        <line x1={174} y1={37} x2={184} y2={37} stroke={T.v230} strokeWidth="2.6" />
        {/* PUMP -> VALVE BOX: main hose (right then down then left) */}
        <path d="M 226 37 H 285 V 224 H 152" stroke={T.water} strokeWidth="3.5" />
        {/* VALVE BOX -> SPRINKLERS: zone hose */}
        <line x1={152} y1={224} x2={194} y2={224} stroke={T.water} strokeWidth="2.8" />
        {/* CTRL -> VALVE BOX: 24 V zone wires (down, far left, down, right) */}
        <path d="M 60 48 V 148 H 12 V 224 H 72" stroke={T.v24} strokeWidth="2" />
      </g>

      {/* line labels */}
      <g fontFamily={SANS} fontSize="7" fill={T.textMuted} textAnchor="middle"
         style={{ paintOrder: 'stroke', strokeLinejoin: 'round' }}>
        <text x={56}  y={14}  stroke={T.panel} strokeWidth="2.5">wifi</text>
        <text x={125} y={20}  stroke={T.panel} strokeWidth="2.5">24 V</text>
        <text x={179} y={20}  stroke={T.panel} strokeWidth="2.5">230 V</text>
        <text x={256} y={33}  stroke={T.panel} strokeWidth="2.5">main hose</text>
        <text x={173} y={220} stroke={T.panel} strokeWidth="2.5">zone hose</text>
        <text x={36}  y={144} stroke={T.panel} strokeWidth="2.5">24 V zone wires</text>
      </g>

      {/* boxes */}
      {BOXES.map(b => (
        <g key={b.key}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2.5"
                fill={T.panel} stroke={T.borderStrong} strokeWidth="1" />
          <text x={b.x + b.w/2} y={b.y + b.h/2 + 3} textAnchor="middle"
                fontSize="9" fontFamily={SANS} fontWeight="600" letterSpacing="0.4"
                fill={T.text}>
            {b.label}
          </text>
        </g>
      ))}

      {/* dashed tethers from station bottoms to first R-circle */}
      <g stroke={T.border} strokeWidth="0.6" strokeDasharray="1.5,1.5" fill="none">
        <line x1={31}  y1={48}  x2={31}  y2={52} />
        <line x1={90}  y1={48}  x2={90}  y2={52} />
        <line x1={152} y1={48}  x2={152} y2={52} />
        <line x1={205} y1={48}  x2={205} y2={52} />
        <line x1={111} y1={236} x2={111} y2={240} />
        <line x1={227} y1={236} x2={227} y2={240} />
      </g>

      {/* R-circles */}
      {ALL_IDS.map(rcId => {
        const pos = R_POS[rcId];
        if (!pos) return null;
        const fill = sevColor(severityT[rcId]);
        const isActive = activeRC === rcId;
        return (
          <g key={rcId} style={{ cursor: 'pointer' }} onClick={() => onPickRC && onPickRC(rcId)}>
            <circle cx={pos.x} cy={pos.y} r="11" fill={fill}
                    stroke={isActive ? T.text : T.borderStrong}
                    strokeWidth={isActive ? 1.5 : 0.8} />
            <text x={pos.x} y={pos.y + 3} textAnchor="middle"
                  fontSize="8" fontFamily={MONO} fontWeight="700"
                  fill={T.text} style={{ pointerEvents: 'none' }}>
              {rcId.replace('R','')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StageBar({ stages, activeStage, onPick }) {
  const labels = ['', 'Ages', 'Symptoms', 'Events', 'Tests'];
  return (
    <div className="stage-bar">
      {[1,2,3,4].map(s => {
        const sp = stages[s];
        const active = activeStage === s;
        const pct = sp.total ? (sp.answered / sp.total) * 100 : 0;
        return (
          <button key={s} type="button" onClick={() => onPick(s)}
            className="stage-pill"
            style={{
              background: T.panel,
              border: `1px solid ${active ? T.accentBorder : T.border}`,
              color: T.text,
            }}>
            <span className="stage-pill-fill" style={{
              width: `${pct}%`,
              background: active ? T.accentBg : T.panelMuted,
            }} />
            <span className="stage-pill-label">
              <span style={{ color: active ? T.accentText : T.text, fontWeight: 600, fontSize: '11px' }}>S{s}</span>
              <span className="stage-pill-name" style={{
                fontSize: '10px', color: T.textMuted,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
              }}>{labels[s]}</span>
              <span className="mono" style={{ color: T.textFaint, fontSize: '10px' }}>
                {sp.answered}/{sp.total}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function QuestionList({ questions, answers, activeId, onPick }) {
  return (
    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
      {questions.map(q => {
        const answered = answers[q.id] != null;
        const active = q.id === activeId;
        return (
          <button key={q.id} type="button" onClick={() => onPick(q.id)}
            style={{
              display: 'flex', width: '100%', alignItems: 'flex-start', gap: '8px',
              padding: '6px 8px',
              background: active ? T.rowActive : 'transparent',
              border: 0,
              borderLeft: `2px solid ${active ? T.accent : 'transparent'}`,
              textAlign: 'left',
            }}>
            <span className="mono" style={{
              fontSize: '10px', width: '46px', flexShrink: 0, paddingTop: '2px',
              color: answered ? T.positive : T.textFaint, fontWeight: answered ? 600 : 400,
            }}>
              {answered ? '●' : '○'} {q.id}
            </span>
            <span style={{ fontSize: '11px', lineHeight: 1.35, color: T.text }}>{q.text}</span>
          </button>
        );
      })}
    </div>
  );
}

const iconBtn = (disabled, color) => ({
  width: '28px', height: '26px', padding: 0,
  fontSize: '15px', lineHeight: '1',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: T.panel, color: color || (disabled ? T.textFaint : T.textMuted),
  border: `1px solid ${T.border}`, borderRadius: '3px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});

function QuestionPanel({ question, answer, onAnswer, onClear, freezeDrained, onToggleDrained, onNext, onPrev, isFirst, isLast }) {
  if (!question) return null;
  const isFreeze = question.id === 'E_freeze';
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: T.text }}>{question.id}</span>
          <span style={{
            fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '1px 5px', borderRadius: '3px',
            color: T.textMuted, background: T.panelMuted, border: `1px solid ${T.border}`,
          }}>
            S{question.stage} · {question.group}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
          <button type="button" onClick={onPrev} disabled={isFirst} title="Previous" style={iconBtn(isFirst)}>‹</button>
          <button type="button" onClick={onNext} disabled={isLast}  title="Next"     style={iconBtn(isLast)}>›</button>
          {answer != null && (
            <button type="button" onClick={onClear} title="Clear answer" style={iconBtn(false, T.negative)}>×</button>
          )}
        </div>
      </div>
      <h2 style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.3, color: T.text, margin: '0 0 12px 0' }}>
        {question.text}
      </h2>
      {isFreeze && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          cursor: 'pointer', fontSize: '11px', marginBottom: '12px',
          color: T.textMuted, userSelect: 'none',
        }}>
          <input type="checkbox" checked={freezeDrained} onChange={(e) => onToggleDrained(e.target.checked)} />
          System was drained for winter (halve effect)
        </label>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {question.options.map((opt, i) => {
          const selected = answer === i;
          return (
            <button key={i} type="button" onClick={() => onAnswer(i)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: '10px',
                textAlign: 'left',
                padding: '10px 12px', borderRadius: '4px',
                background: selected ? T.accentBg : T.panel,
                border: `1px solid ${selected ? T.accentBorder : T.border}`,
                cursor: 'pointer', transition: 'background 0.15s',
                minHeight: '40px',
              }}>
              <span className="mono" style={{
                fontSize: '13px', flexShrink: 0,
                color: selected ? T.accentText : T.textFaint, fontWeight: 700,
              }}>
                {selected ? '●' : '○'}
              </span>
              <span style={{ fontSize: '13px', lineHeight: 1.35, color: T.text }}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RankingPanel({ ranked, severityT, activeRC, onPickRC }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ranked : ranked.slice(0, 8);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textMuted, margin: 0, fontWeight: 600 }}>
          Root cause ranking
        </h3>
        <span className="mono" style={{ fontSize: '10px', color: T.textFaint }}>% · score</span>
      </div>
      <div>
        {visible.map((r, i) => {
          const meta = RC[r.id];
          const active = activeRC === r.id;
          return (
            <button key={r.id} type="button" onClick={() => onPickRC(r.id)}
              className="rank-row"
              style={{
                display: 'flex', width: '100%', alignItems: 'center', gap: '8px',
                padding: '6px',
                background: active ? T.rowActive : 'transparent',
                border: 0, borderRadius: '3px', textAlign: 'left', cursor: 'pointer',
              }}>
              <span className="mono" style={{ fontSize: '10px', width: '18px', textAlign: 'right', color: T.textFaint, flexShrink: 0 }}>{i + 1}</span>
              <span className="mono" style={{ fontSize: '11px', width: '44px', flexShrink: 0, color: T.text, fontWeight: 600 }}>{r.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="rank-label" style={{ fontSize: '11px', lineHeight: 1.3, color: T.textMuted }}>
                  {meta.label}
                </div>
                <div style={{ height: '4px', marginTop: '3px', background: T.panelMuted, borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: sevColor(severityT[r.id]), transition: 'width 0.3s' }} />
                </div>
              </div>
              <span className="mono" style={{ fontSize: '10px', width: '40px', textAlign: 'right', color: T.text, flexShrink: 0 }}>{r.pct.toFixed(1)}%</span>
              <span className="rank-score mono" style={{ fontSize: '10px', width: '36px', textAlign: 'right', color: T.textFaint, flexShrink: 0 }}>{r.score.toFixed(2)}</span>
            </button>
          );
        })}
      </div>
      {ranked.length > 8 && (
        <button type="button" onClick={() => setShowAll(s => !s)}
          style={{
            marginTop: '6px', fontSize: '10px', padding: '4px 8px',
            background: 'transparent', border: 0, color: T.textMuted, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
          }}>
          {showAll ? `Show top 8` : `Show all ${ranked.length}`}
        </button>
      )}
    </div>
  );
}

function RecommendationPanel({ recs, top5n, onSelect, max = 4 }) {
  const visible = recs.slice(0, max);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textMuted, margin: 0, fontWeight: 600 }}>
          Recommended next
        </h3>
        <span className="mono rec-subtitle" style={{ fontSize: '10px', color: T.textFaint, textAlign: 'right' }}>top differentiator vs top {top5n}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {visible.length === 0 && (
          <div style={{ fontSize: '11px', fontStyle: 'italic', padding: '4px', color: T.textFaint }}>
            No questions left to differentiate top suspects.
          </div>
        )}
        {visible.map(({ q, D }) => (
          <button key={q.id} type="button" onClick={() => onSelect(q.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 10px', borderRadius: '4px',
              background: T.panel, border: `1px solid ${T.border}`, cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '11px', color: T.accentText, fontWeight: 600 }}>{q.id}</span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textFaint }}>S{q.stage}</span>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: '10px', color: T.textMuted }}>D = {D.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.35, marginTop: '3px', color: T.text }}>{q.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ APP ============

export default function App() {
  const [answers, setAnswers] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(QUESTIONS[0].id);
  const [activeStage, setActiveStage] = useState(1);
  const [activeRC, setActiveRC] = useState(null);
  const [freezeDrained, setFreezeDrained] = useState(false);
  const isMobile = useIsMobile(720);
  const questionPanelRef = useRef(null);

  const scores = useMemo(() => {
    const s = {};
    ALL_IDS.forEach(id => { s[id] = RC[id].baseline; });
    Object.entries(answers).forEach(([qid, optIdx]) => {
      const q = QUESTIONS.find(qq => qq.id === qid);
      if (!q || optIdx == null) return;
      const opt = q.options[optIdx];
      const halve = (qid === 'E_freeze' && freezeDrained) ? 0.5 : 1;
      Object.entries(opt.effects).forEach(([rc, delta]) => {
        s[rc] = (s[rc] || 0) + delta * halve;
      });
    });
    return s;
  }, [answers, freezeDrained]);

  const ranked = useMemo(() => {
    const total = ALL_IDS.reduce((sum, id) => sum + Math.max(0, scores[id]), 0);
    return ALL_IDS
      .map(id => ({ id, score: scores[id], pct: total > 0 ? (Math.max(0, scores[id]) / total) * 100 : 0 }))
      .sort((a, b) => b.score - a.score);
  }, [scores]);

  const severityT = useMemo(() => {
    const max = Math.max(...ALL_IDS.map(id => scores[id]), 0.1);
    const t = {};
    ALL_IDS.forEach(id => { t[id] = Math.max(0, scores[id]) / max; });
    return t;
  }, [scores]);

  const top5 = useMemo(() => ranked.slice(0, 5).map(r => r.id), [ranked]);

  const recommendations = useMemo(() => {
    const unanswered = QUESTIONS.filter(q => answers[q.id] == null);
    const scored = unanswered.map(q => {
      let D = 0;
      top5.forEach(rcId => {
        const deltas = q.options.map(o => o.effects[rcId] || 0);
        D += Math.max(...deltas) - Math.min(...deltas);
      });
      return { q, D };
    });
    return scored.filter(r => r.D > 0).sort((a, b) => b.D - a.D).slice(0, 4);
  }, [answers, top5]);

  const stageProgress = useMemo(() => {
    const sp = { 1: { answered: 0, total: 0 }, 2: { answered: 0, total: 0 }, 3: { answered: 0, total: 0 }, 4: { answered: 0, total: 0 } };
    QUESTIONS.forEach(q => {
      sp[q.stage].total++;
      if (answers[q.id] != null) sp[q.stage].answered++;
    });
    return sp;
  }, [answers]);

  const activeQuestion = QUESTIONS.find(q => q.id === activeQuestionId);
  const stageQuestions = QUESTIONS.filter(q => q.stage === activeStage);
  const activeIdx = QUESTIONS.findIndex(q => q.id === activeQuestionId);
  const isFirst = activeIdx <= 0;
  const isLast  = activeIdx >= QUESTIONS.length - 1;

  const setAnswer = (qid, optIdx) => setAnswers(p => ({ ...p, [qid]: optIdx }));
  const clearAnswer = (qid) => setAnswers(p => { const n = { ...p }; delete n[qid]; return n; });

  const pickQuestion = (qid) => {
    setActiveQuestionId(qid);
    const q = QUESTIONS.find(qq => qq.id === qid);
    if (q) setActiveStage(q.stage);
  };

  const moveBy = (delta) => {
    const idx = QUESTIONS.findIndex(q => q.id === activeQuestionId);
    const next = QUESTIONS[Math.max(0, Math.min(QUESTIONS.length - 1, idx + delta))];
    pickQuestion(next.id);
  };

  // auto-advance + auto-scroll on mobile so the new question is visible
  const handleAnswer = (i) => {
    const currentId = activeQuestionId;
    setAnswer(currentId, i);
    setTimeout(() => {
      const idx = QUESTIONS.findIndex(q => q.id === currentId);
      if (idx >= 0 && idx < QUESTIONS.length - 1) {
        pickQuestion(QUESTIONS[idx + 1].id);
        if (window.innerWidth < 720 && questionPanelRef.current) {
          questionPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 180);
  };

  const reset = () => {
    if (window.confirm('Clear all answers?')) {
      setAnswers({}); setFreezeDrained(false); setActiveRC(null);
      setActiveQuestionId(QUESTIONS[0].id); setActiveStage(1);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        .root, .root * { font-family: 'IBM Plex Sans', system-ui, sans-serif; box-sizing: border-box; }
        .root .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
        .root button { appearance: none; -webkit-appearance: none; color: inherit; font: inherit; margin: 0; cursor: pointer; pointer-events: auto; }
        .root button:disabled { cursor: not-allowed; }
        .root button:not(:disabled):hover { filter: brightness(0.97); }
        .root input[type="checkbox"] { accent-color: ${T.accent}; width: 14px; height: 14px; }

        .root .stage-bar { display: flex; gap: 4px; flex-wrap: nowrap; }
        .root .stage-pill {
          flex: 1; min-width: 0;
          height: 32px; padding: 0; border-radius: 4px;
          position: relative; overflow: hidden;
        }
        .root .stage-pill-fill {
          position: absolute; left: 0; top: 0; bottom: 0; z-index: 0;
          transition: width 0.25s;
        }
        .root .stage-pill-label {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 5px;
          padding: 0 8px; height: 100%;
        }
        /* hide stage name on very narrow screens, keep S# and counter */
        @media (max-width: 380px) {
          .root .stage-pill-name { display: none; }
        }

        .root .diag-grid { display: flex; flex-direction: column; gap: 10px; }
        .root .diag-main { order: 1; }
        .root .diag-side-right { order: 2; }
        .root .diag-side-left { order: 3; }
        @media (min-width: 1100px) {
          .root .diag-grid {
            display: grid;
            grid-template-columns: minmax(220px, 1fr) minmax(0, 2.2fr) minmax(280px, 1.4fr);
          }
          .root .diag-side-left, .root .diag-main, .root .diag-side-right { order: 0; }
        }
        .root .right-cols { display: flex; flex-direction: column; gap: 10px; }
        @media (min-width: 600px) and (max-width: 1099px) {
          .root .right-cols { flex-direction: row; }
          .root .right-cols > * { flex: 1; min-width: 0; }
        }

        /* mobile: tighter padding, allow ranking labels to wrap */
        .root .diag-card { padding: 8px 10px; border-radius: 6px; background: ${T.panel}; border: 1px solid ${T.border}; }
        @media (min-width: 720px) {
          .root .diag-card { padding: 12px 14px; }
        }
        @media (max-width: 480px) {
          .root .rank-score { display: none; }
          .root .rank-label { white-space: normal; }
          .root .rec-subtitle { display: none; }
        }
        @media (min-width: 481px) {
          .root .rank-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        }

        .root ::-webkit-scrollbar { width: 8px; height: 8px; }
        .root ::-webkit-scrollbar-track { background: ${T.panelMuted}; }
        .root ::-webkit-scrollbar-thumb { background: ${T.borderStrong}; border-radius: 4px; }
        .root ::-webkit-scrollbar-thumb:hover { background: ${T.textFaint}; }
      `}</style>
      <div className="root" style={{ minHeight: '100vh', padding: isMobile ? '6px' : '10px', background: T.bg, color: T.text }}>
        {/* slim header — Reset only */}
        <header style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button type="button" onClick={reset}
            style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: '3px',
              color: T.textMuted, background: T.panel,
              border: `1px solid ${T.border}`, height: '24px',
            }}>
            Reset
          </button>
        </header>

        {/* system diagram */}
        <section className="diag-card" style={{ marginBottom: '10px' }}>
          <div style={{ maxWidth: '440px', margin: '0 auto' }}>
            <SystemDiagram severityT={severityT} activeRC={activeRC} onPickRC={setActiveRC} />
          </div>
        </section>

        <div className="diag-grid">
          {/* main column: question + stage bar below */}
          <section className="diag-main" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div ref={questionPanelRef} className="diag-card" style={{ scrollMarginTop: '8px' }}>
              <QuestionPanel
                question={activeQuestion}
                answer={answers[activeQuestionId]}
                onAnswer={handleAnswer}
                onClear={() => clearAnswer(activeQuestionId)}
                freezeDrained={freezeDrained}
                onToggleDrained={setFreezeDrained}
                onNext={() => moveBy(1)}
                onPrev={() => moveBy(-1)}
                isFirst={isFirst} isLast={isLast}
              />
            </div>
            <StageBar stages={stageProgress} activeStage={activeStage} onPick={setActiveStage} />
          </section>

          {/* right: recommendations + ranking */}
          <aside className="diag-side-right right-cols">
            <div className="diag-card">
              <RecommendationPanel recs={recommendations} top5n={top5.length} onSelect={pickQuestion} max={isMobile ? 3 : 4} />
            </div>
            <div className="diag-card">
              <RankingPanel ranked={ranked} severityT={severityT} activeRC={activeRC} onPickRC={setActiveRC} />
            </div>
          </aside>

          {/* left: question list (no header) */}
          <aside className="diag-side-left">
            <div style={{
              background: T.panel, border: `1px solid ${T.border}`, borderRadius: '6px',
              padding: '4px 0',
            }}>
              <QuestionList questions={stageQuestions} answers={answers} activeId={activeQuestionId} onPick={pickQuestion} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
 
