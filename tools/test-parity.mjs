// Parity test: run the same inputs through engine.js and tools/engine.py
// and assert the rankings match. Catches drift when one engine is tuned
// and the other isn't.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const ctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(root, 'data.js'), 'utf-8'), ctx);
vm.runInContext(readFileSync(join(root, 'effort.js'), 'utf-8'), ctx);
vm.runInContext(readFileSync(join(root, 'engine.js'), 'utf-8'), ctx);
const jsEngine = ctx.window.createEngine(ctx.window.DATA, ctx.window.EFFORT);

const onDisk = JSON.parse(readFileSync(join(root, 'data.json'), 'utf-8'));
if (JSON.stringify(ctx.window.DATA) !== JSON.stringify(onDisk)) {
  console.error('data.json is out of sync with data.js — run `npm run export-data`');
  process.exit(1);
}

const CASES = [
  {},
  { Q1: 0 },
  { Q1: 1 },
  { Q1: 2 },
  { Q1: 3 },
  { Q2: 0 },
  { Q2: 4 },
  { Q2: 7 },
  { Q1: 0, Q2: 0 },
  { Q1: 3, Q2: 6 },
  { Q1: 0, Q2: 0, Q3: 1, Q4: 0 },
  { Q5: 2, Q6: 3 },
  { Q10: { pump: 'right', valves: 'days' } },
  { Q11: { storm: 'right', freeze: 'worse' } },
  { Q9: { pump: 4, valves: 1, relay: 4, ctrl: 4, rotor: 4, mainHose: 4, hose: 4 } },
  { Q1: 0, Q9: { pump: 4, valves: 1 }, Q10: { pump: 'right' }, Q13: 1 },
  { Q18: 0, Q19: 1 },
];

const EPS = 1e-9;

function approxEq(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < EPS;
  return a === b;
}

function diffRanked(jsR, pyR) {
  if (jsR.length !== pyR.length) return `length mismatch: ${jsR.length} vs ${pyR.length}`;
  for (let i = 0; i < jsR.length; i++) {
    if (jsR[i].id !== pyR[i].id) return `[${i}] id ${jsR[i].id} vs ${pyR[i].id}`;
    if (!approxEq(jsR[i].score, pyR[i].score))
      return `[${i}] ${jsR[i].id} score ${jsR[i].score} vs ${pyR[i].score}`;
    if (!approxEq(jsR[i].pct, pyR[i].pct))
      return `[${i}] ${jsR[i].id} pct ${jsR[i].pct} vs ${pyR[i].pct}`;
  }
  return null;
}

function diffRecs(jsR, pyR) {
  if (jsR.length !== pyR.length) return `length mismatch: ${jsR.length} vs ${pyR.length}`;
  for (let i = 0; i < jsR.length; i++) {
    if (jsR[i].id !== pyR[i].id) return `[${i}] id ${jsR[i].id} vs ${pyR[i].id}`;
    if (!approxEq(jsR[i].D, pyR[i].D))
      return `[${i}] ${jsR[i].id} D ${jsR[i].D} vs ${pyR[i].D}`;
  }
  return null;
}

function pyRun(answers) {
  const code = `
import json, sys
sys.path.insert(0, "tools")
from engine import Engine
data = json.load(open("data.json"))
effort = json.load(open("effort.json"))
engine = Engine(data, effort)
answers = json.loads(sys.stdin.read())
print(json.dumps({
  "ranked": engine.rank(answers),
  "recs": [{"id": r["q"]["id"], "D": r["D"]} for r in engine.recommendations(answers, {})],
}))
`;
  const r = spawnSync('python3', ['-c', code], {
    input: JSON.stringify(answers),
    encoding: 'utf-8',
    cwd: root,
  });
  if (r.status !== 0) throw new Error(`python failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

let passed = 0;
let failed = 0;
const failures = [];

for (const answers of CASES) {
  const jsRanked = jsEngine.rank(answers);
  const jsRecs = jsEngine
    .recommendations(answers, {})
    .map((r) => ({ id: r.q.id, D: r.D }));
  const py = pyRun(answers);

  const r1 = diffRanked(jsRanked, py.ranked);
  const r2 = diffRecs(jsRecs, py.recs);
  if (r1 || r2) {
    failed++;
    failures.push({ answers, ranked: r1, recs: r2 });
  } else {
    passed++;
  }
}

console.log(`${passed} passed, ${failed} failed (${CASES.length} cases)`);
for (const f of failures) {
  console.error('FAIL', JSON.stringify(f.answers));
  if (f.ranked) console.error('  ranked:', f.ranked);
  if (f.recs) console.error('  recs:  ', f.recs);
}
process.exit(failed > 0 ? 1 : 0);
