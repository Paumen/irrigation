// Node-side YAML loader for the headless harness: reads the repo-root YAMLs off
// disk. Keeps model.js pure (it only ever sees already-parsed objects).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", ".."); // sim/test -> repo root

function load(name) {
  return yaml.load(readFileSync(resolve(repoRoot, name), "utf8"));
}

// graph.yaml + catalog.yaml + context.yaml were merged into system.yaml; the
// graph and catalog top-level keys now live side by side in the one document, so
// both loaders return the same parsed object.
export function loadGraph() {
  return load("system.yaml");
}

export function loadCatalog() {
  return load("system.yaml");
}
