// Node-side YAML loader for the headless harness: reads the repo-root system.yaml
// off disk and parses it. Keeps model.js pure (it only ever sees parsed objects).
//
// graph.yaml + catalog.yaml + context.yaml were merged into system.yaml; the graph
// and catalog top-level keys now live side by side in one document, so both loaders
// return the same parsed object (buildModel reads graph keys off one, catalog off the other).

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
  return load("system.yaml");
}

export function loadCatalog() {
  return load("system.yaml");
}
