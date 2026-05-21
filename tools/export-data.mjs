import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const ctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(root, 'data.js'), 'utf-8'), ctx);

const out = join(root, 'data.json');
writeFileSync(out, JSON.stringify(ctx.window.DATA, null, 2) + '\n');
console.log(`Wrote ${out}`);
