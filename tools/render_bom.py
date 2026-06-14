#!/usr/bin/env python3
"""Render docs/bom.generated.md straight from graph.yaml's items: tree.

graph.yaml is the single source of truth. The items: tree already carries the
full BOM depth — assemblies, sub-assemblies, components, parts — so this renderer
just walks it and prints it verbatim. No prefix-bucketing, no flattening: the
depth you see here is exactly the depth in graph.yaml.

Conventions read from the tree:
- `model:`        -> appended to the label ("— RainMachine HD-12 TOUCH")
- `feature: true` -> rendered as a [bracketed] flow/volume node, not a part
- `material:`     -> appended in parentheses
- nested `items:` -> children, rendered at the next depth

Usage:  python tools/render_bom.py            # write docs/bom.generated.md
        python tools/render_bom.py --check     # exit 1 if the file is stale
"""
import sys, os
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = yaml.safe_load(open(os.path.join(ROOT, "graph.yaml")))
ITEMS = G["items"]


def label(key, node):
    nm = key.replace("_", " ")
    if node.get("feature"):
        nm = f"[{nm}]"
    if node.get("model"):
        nm += f" — {node['model']}"
    if node.get("material"):
        nm += f"  ({node['material']})"
    return nm


def render(node, prefix, out):
    items = node.get("items", {}) if isinstance(node, dict) else {}
    keys = list(items)
    for i, k in enumerate(keys):
        v = items[k] if isinstance(items[k], dict) else {}
        last = i == len(keys) - 1
        out.append(prefix + ("└─ " if last else "├─ ") + label(k, v))
        render(v, prefix + ("    " if last else "│   "), out)


def main():
    out = [
        "# Irrigation system — Bill of Materials (generated)",
        "",
        "GENERATED from graph.yaml (items: tree) by tools/render_bom.py — do not edit by hand.",
        "`[bracketed]` = `feature:` node (flow passage / volume), not a procurable part.",
        "",
        "```",
        "IRRIGATION SYSTEM",
    ]
    render({"items": ITEMS}, "", out)
    out.append("```")
    text = "\n".join(out) + "\n"

    path = os.path.join(ROOT, "docs", "bom.generated.md")
    if "--check" in sys.argv:
        cur = open(path).read() if os.path.exists(path) else ""
        if cur != text:
            print("STALE: docs/bom.generated.md differs from graph.yaml; re-run tools/render_bom.py")
            sys.exit(1)
        print("OK: bom.generated.md is in sync")
        return
    open(path, "w").write(text)
    print(f"wrote {path} ({text.count(chr(10))} lines)")


if __name__ == "__main__":
    main()
