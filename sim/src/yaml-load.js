// Browser-side loader for the three root YAMLs (the Node harness reads them off disk
// in test/yaml-node.mjs instead). The sim fetches the repo-root files directly —
// single source of truth, no copies.

import yaml from "js-yaml";

export async function loadYaml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return yaml.load(await res.text());
}

export async function loadInputs(base = "..") {
  const [graph, catalog, context] = await Promise.all([
    loadYaml(`${base}/graph.yaml`),
    loadYaml(`${base}/catalog.yaml`),
    loadYaml(`${base}/context.yaml`),
  ]);
  return { graph, catalog, context };
}
