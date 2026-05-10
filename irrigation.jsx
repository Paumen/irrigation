const { useState, useMemo, useEffect, useRef } = React;

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

// ============ DIAGRAM (engineering blueprint style) ============
const BOX_W = 120, BOX_H = 54;
// Row 1: SOFTWARE → CONTROLLER → RELAY → PUMP  (left to right)
// Row 2: VALVES directly below PUMP (water flows straight down)
// Row 3: three SPRINKLER zones spread below
const BOXES = [
  {key:'sw',     x:  15, y:20, w: BOX_W, h: BOX_H, label:'SOFTWARE'},
  {key:'ctrl',   x: 165, y:20, w: BOX_W, h: BOX_H, label:'CONTROLLER'},
  {key:'relay',  x: 315, y:20, w: BOX_W, h: BOX_H, label:'RELAY'},
  {key:'pump',   x: 465, y:20, w: BOX_W, h: BOX_H, label:'PUMP'},
  {key:'valves', x: 465, y:175, w: BOX_W, h: BOX_H, label:'VALVES'},
];
const SPRK = [
  {x: 185, y: 340, w: BOX_W, h: BOX_H},
  {x: 375, y: 340, w: BOX_W, h: BOX_H},
  {x: 565, y: 340, w: BOX_W, h: BOX_H},
];
// R-pip positions — on bottom borders of boxes and on line segments
const R_POS = {
  // SOFTWARE bottom border (y=74), center x=75
  'R1.1':{x:  47, y: 74}, 'R1.2':{x:  75, y: 74}, 'R1.3':{x: 103, y: 74},
  // CONTROLLER bottom border (y=74), center x=225, control wire exits at center
  'R2.1':{x: 185, y: 74}, 'R2.2':{x: 208, y: 74}, 'R2.3':{x: 258, y: 74},
  // RELAY bottom border (y=74)
  'R3.1':{x: 375, y: 74},
  // PUMP bottom border (y=74), water exits at center x=525
  'R4.1':{x: 497, y: 74}, 'R4.2':{x: 553, y: 74},
  // Main water vertical segment x=525, y 74→175
  'R5.1':{x: 525, y: 108}, 'R5.2':{x: 525, y: 148},
  // Control wire horizontal segment y=140, x 225→445
  'R6.1':{x: 285, y: 140}, 'R6.2':{x: 332, y: 140}, 'R6.3':{x: 380, y: 140},
  // VALVES bottom border (y=229), laterals exit at x=490,525,562
  'R7.1':{x: 477, y: 229}, 'R7.2':{x: 501, y: 229},
  'R7.3':{x: 549, y: 229}, 'R7.4':{x: 573, y: 229},
  // Lateral hoses — on horizontal segments where they exist
  'R8.1':{x: 368, y: 295}, 'R8.2':{x: 525, y: 268}, 'R8.3':{x: 594, y: 295},
  // SPRK2 bottom border (y=394)
  'R9.1':{x: 435, y: 394},
};

// severity color → rust gradient stops, mapped from irrits.html scale
const sevColor = (t) => {
  // 0 → calm green, .5 → paper, 1 → rust deep
  const tt = Math.max(0, Math.min(1, t));
  if (tt < 0.18) return '#cfd6b8';                 // dim
  if (tt < 0.36) return '#dcd3ba';                 // paper-3
  if (tt < 0.55) return '#ecc8b1';                 // rust-soft
  if (tt < 0.78) return '#c47554';                 // rust-mid
  return '#7a2f15';                                // rust-deep
};
const sevText = (t) => (t >= 0.55 ? '#efe8d8' : '#1a2238');

function SystemDiagram({ severityT, activeRC, onPickRC }) {
  return (
    <svg viewBox="0 0 700 415" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#1a2238"/>
        </marker>
        <marker id="arrR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#b14a26"/>
        </marker>
      </defs>
      <style>{`
        .lbl{font-family:'Nunito Sans',sans-serif;font-weight:800;font-size:12px;fill:#1a2238;letter-spacing:.05em}
        .pip{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:7px;pointer-events:none}
      `}</style>

      {/* ── control wires (rust dashed) ── */}
      <g fill="none" stroke="#b14a26" strokeWidth="1.5" strokeDasharray="6 3">
        {/* SW → CTRL */}
        <line x1="135" y1="47" x2="165" y2="47" markerEnd="url(#arrR)"/>
        {/* CTRL → RELAY */}
        <line x1="285" y1="47" x2="315" y2="47" markerEnd="url(#arrR)"/>
        {/* CTRL → VALVES: down, right across R6 pips at y=140, down, right into VALVES left */}
        <path d="M 225 74 V 140 H 445 V 202 H 465" markerEnd="url(#arrR)"/>
      </g>

      {/* ── 230 V power (dot-dash slate) ── */}
      <line x1="435" y1="47" x2="465" y2="47" stroke="#5a6a85" strokeWidth="2" strokeDasharray="4 2 1 2" markerEnd="url(#arr)"/>

      {/* ── main water line: straight down PUMP → VALVES ── */}
      <line x1="525" y1="74" x2="525" y2="175" stroke="#1a2238" strokeWidth="4" fill="none" markerEnd="url(#arr)"/>

      {/* ── lateral hoses VALVES → sprinklers ── */}
      <g stroke="#1a2238" strokeWidth="2.2" fill="none">
        {/* to SPRK1 (center 245): left from VALVES bottom-left */}
        <path d="M 490 229 V 295 H 245 V 340" markerEnd="url(#arr)"/>
        {/* to SPRK2 (center 435): straight-ish down then slight left */}
        <path d="M 525 229 V 310 H 435 V 340" markerEnd="url(#arr)"/>
        {/* to SPRK3 (center 625): right from VALVES bottom-right */}
        <path d="M 562 229 V 295 H 625 V 340" markerEnd="url(#arr)"/>
      </g>

      {/* ── boxes ── */}
      {BOXES.map(b => (
        <g key={b.key}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#f7f2e6" stroke="#1a2238" strokeWidth="1.5"/>
          <text x={b.x + b.w/2} y={b.y + b.h/2 + 4} textAnchor="middle" className="lbl">{b.label}</text>
        </g>
      ))}
      {SPRK.map((s,i) => (
        <g key={`sp${i}`}>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#f7f2e6" stroke="#1a2238" strokeWidth="1.5"/>
          <text x={s.x + s.w/2} y={s.y + s.h/2 + 4} textAnchor="middle" className="lbl">SPRINKLER</text>
        </g>
      ))}

      {/* ── R-squares with labels ── */}
      {ALL_IDS.map(rcId => {
        const pos = R_POS[rcId]; if (!pos) return null;
        const t = severityT[rcId] || 0;
        const fill = sevColor(t);
        const txtFill = sevText(t);
        const isActive = activeRC === rcId;
        const sz = isActive ? 16 : 14;
        return (
          <g key={rcId} style={{cursor:'pointer'}} onClick={() => onPickRC && onPickRC(rcId)}>
            <rect x={pos.x - sz/2} y={pos.y - sz/2} width={sz} height={sz}
                  fill={fill} stroke="#1a2238" strokeWidth={isActive ? 1.8 : 0.8}/>
            <text x={pos.x} y={pos.y + 3} textAnchor="middle" className="pip" fill={txtFill}>
              {rcId.replace('R','')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============ STAGE TABS ============
function StageBar({ stages, activeStage, onPick }) {
  const labels = ['', 'Ages', 'Symptoms', 'Events', 'Tests'];
  return (
    <div className="stages">
      {[1,2,3,4].map(s => {
        const sp = stages[s];
        const active = activeStage === s;
        const pct = sp.total ? (sp.answered / sp.total) * 100 : 0;
        return (
          <button key={s} type="button" onClick={() => onPick(s)} className={active ? 'active' : ''}>
            <span className="label">
              <span className="nm">{labels[s]}</span>
              <span className="ct mono">{sp.answered}/{sp.total}</span>
            </span>
            <span className="fill" style={{width: pct+'%'}}/>
          </button>
        );
      })}
    </div>
  );
}

// ============ QUESTION LIST ============
function QuestionList({ questions, answers, activeId, onPick }) {
  return (
    <div className="qlist">
      {questions.map(q => {
        const answered = answers[q.id] != null;
        const active = q.id === activeId;
        return (
          <button key={q.id} type="button"
            className={`qrow ${answered ? 'answered':''} ${active?'active':''}`}
            onClick={() => onPick(q.id)}>
            <span className="qid">{answered ? '●' : '○'} {q.id}</span>
            <span className="qtxt">{q.text}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============ QUESTION PANEL ============
function QuestionPanel({ question, answer, onAnswer, onClear, freezeDrained, onToggleDrained, onNext, onPrev, isFirst, isLast, onReset }) {
  if (!question) return null;
  const isFreeze = question.id === 'E_freeze';
  return (
    <div>
      <div className="qhead">
        <div className="qtitle" style={{flex:1, margin:0}}>{question.text}</div>
        <button className="btn danger" type="button" onClick={onReset}>Reset</button>
        <div className="qnav">
          <button type="button" onClick={onPrev} disabled={isFirst} title="Previous">‹</button>
          <button type="button" onClick={onNext} disabled={isLast}  title="Next">›</button>
        </div>
      </div>
      {isFreeze && (
        <label className="qfreeze">
          <input type="checkbox" checked={freezeDrained} onChange={(e)=>onToggleDrained(e.target.checked)} />
          System was drained for winter (halve effect)
        </label>
      )}
      <div className="opts">
        {question.options.map((opt,i) => {
          const selected = answer === i;
          return (
            <button key={i} type="button"
              className={`opt ${selected ? 'selected' : ''}`}
              onClick={() => onAnswer(i)}>
              <span className="dot">{selected ? '●' : '○'}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ RANK PANEL ============
function RankingPanel({ ranked, severityT, activeRC, onPickRC }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ranked : ranked.slice(0, 8);
  return (
    <div>
      <div className="rank">
        {visible.map((r, i) => {
          const meta = RC[r.id];
          const active = activeRC === r.id;
          return (
            <button key={r.id} type="button"
              className={`rank-row ${active?'active':''}`}
              onClick={() => onPickRC(r.id)}>
              <span className="id mono">{r.id}</span>
              <div style={{minWidth:0}}>
                <div className="label">{meta.label}</div>
                <div className="bar"><div style={{width: r.pct+'%', background: sevColor(severityT[r.id])}}/></div>
              </div>
              <span className="pct mono" style={{color: sevColor(Math.min(1, severityT[r.id]+.1))}}>{r.pct.toFixed(1)}%</span>
            </button>
          );
        })}
      </div>
      {ranked.length > 8 && (
        <button type="button" className="rank-more" onClick={() => setShowAll(s=>!s)}>
          {showAll ? '▲ collapse' : `▼ show all ${ranked.length}`}
        </button>
      )}
    </div>
  );
}

// ============ RECOMMENDATIONS ============
function RecommendationPanel({ recs, top5n, onSelect, max }) {
  const visible = recs.slice(0, max);
  return (
    <div className="recs">
      {visible.length === 0 && (
        <div className="rec empty">No questions left to differentiate top suspects.</div>
      )}
      {visible.map(({ q, D }) => (
        <button key={q.id} type="button" className="rec" onClick={() => onSelect(q.id)}>
          <div className="top">
            <span className="id">{q.id}</span>
            <span className="stg">S{q.stage}</span>
            <span className="d">D = {D.toFixed(2)}</span>
          </div>
          <div className="qq">{q.text}</div>
        </button>
      ))}
    </div>
  );
}

// ============ HOOK ============
function useIsMobile(breakpoint = 760) {
  const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const onR = () => setM(window.innerWidth < breakpoint);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [breakpoint]);
  return m;
}

// ============ APP ============
function App() {
  const [answers, setAnswers] = useState({});
  const [activeQuestionId, setActiveQuestionId] = useState(QUESTIONS[0].id);
  const [activeStage, setActiveStage] = useState(1);
  const [activeRC, setActiveRC] = useState(null);
  const [freezeDrained, setFreezeDrained] = useState(false);
  const isMobile = useIsMobile(760);
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

  const handleAnswer = (i) => {
    const currentId = activeQuestionId;
    setAnswer(currentId, i);
    setTimeout(() => {
      const idx = QUESTIONS.findIndex(q => q.id === currentId);
      if (idx >= 0 && idx < QUESTIONS.length - 1) {
        pickQuestion(QUESTIONS[idx + 1].id);
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
      {/* DIAGRAM SECTION (no title, no subtitle) */}
      <section className="sec">
        <div className="schem-wrap">
          <SystemDiagram severityT={severityT} activeRC={activeRC} onPickRC={setActiveRC} />
          <div className="schem-legend">
            <span><span className="swatch dashed"/> control signal</span>
            <span><span className="swatch dotted"/> 230 V power</span>
            <span><span className="swatch water"/> water flow</span>
          </div>
        </div>
      </section>

      {/* WORKBENCH */}
      <section className="sec">
        <div className="work">
          {/* LEFT COLUMN: question panel + stage bar */}
          <div style={{display:'flex', flexDirection:'column', gap:'6px', minWidth:0}}>
            <main className="panel" ref={questionPanelRef}>
              <div className="bd">
                <QuestionPanel
                  question={activeQuestion}
                  answer={answers[activeQuestionId]}
                  onAnswer={handleAnswer}
                  onClear={() => clearAnswer(activeQuestionId)}
                  onReset={reset}
                  freezeDrained={freezeDrained}
                  onToggleDrained={setFreezeDrained}
                  onNext={() => moveBy(1)}
                  onPrev={() => moveBy(-1)}
                  isFirst={isFirst} isLast={isLast}
                />
              </div>
            </main>
            <StageBar stages={stageProgress} activeStage={activeStage} onPick={setActiveStage}/>
          </div>

          {/* RIGHT COLUMN: ranking + recs */}
          <aside style={{display:'flex', flexDirection:'column', gap:'6px', minWidth:0}}>
            <div className="panel">
              <div className="hd">
                <span>Root-cause</span>
                <span className="meta">% · score</span>
              </div>
              <div className="bd">
                <RankingPanel ranked={ranked} severityT={severityT} activeRC={activeRC} onPickRC={setActiveRC}/>
              </div>
            </div>
            <div className="panel">
              <div className="hd">
                <span>Recommended Next</span>
              </div>
              <div className="bd">
                <RecommendationPanel recs={recommendations} top5n={top5.length} onSelect={pickQuestion} max={isMobile?3:4}/>
              </div>
            </div>
          </aside>
        </div>
      </section>


    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
