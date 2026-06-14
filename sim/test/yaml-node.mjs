import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

function load(name) {
  return yaml.load(readFileSync(resolve(repoRoot, name), "utf8"));
}

export function loadGraph() {
  return load("system.yaml");
}

export function loadCatalog() {
  return load("system.yaml");
}
