// Node-side YAML loader for the headless harness. The browser loads the same root
// YAMLs via fetch; here we read them off disk. Keeps model.js pure (it only ever sees
// already-parsed objects).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", ".."); // sim/test -> repo root

function load(name) {
  return yaml.load(readFileSync(resolve(repoRoot, name), "utf8"));
}

export function loadGraph() {
  return load("graph.yaml");
}

export function loadCatalog() {
  return load("catalog.yaml");
}
