import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const src = join(root, 'effort.yaml');
const cfg = yaml.load(readFileSync(src, 'utf-8'));

const jsonPath = join(root, 'effort.json');
writeFileSync(jsonPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`Wrote ${jsonPath}`);

const jsPath = join(root, 'effort.js');
const banner = '// Generated from effort.yaml by tools/export-effort.mjs. Do not edit by hand.\n';
const body = `window.EFFORT = ${JSON.stringify(cfg, null, 2)};\n`;
writeFileSync(jsPath, banner + body);
console.log(`Wrote ${jsPath}`);
