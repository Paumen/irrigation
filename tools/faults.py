#!/usr/bin/env python3
"""Per-node fault state for graph.yaml.

Expands the compact kinds+instances graph into the full flat node set -- every
component AND every sub-part (e.g. Z1.valve.metering_port, Z1.valve.coil) -- and
applies/validates a single condition per node against that node's own declared
fail axis.

This is STATE ONLY. It produces the settable node graph and records a condition
on each node. It does NOT compute what a condition does to flow or signal -- that
is the simulation's job (see the prompt that ships alongside this file).

Layout: drop this in tools/ next to hydraulics.py; it reads ../graph.yaml,
mirroring how hydraulics.py finds ../setup.yaml. Override with graph_path.

Usage:
    python3 faults.py --list                 # every settable node + allowed conditions
    echo '{"conditions": {"Z1.valve.metering_port": "clogged",
                          "cond.common": "broken"}}' | python3 faults.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

GRAPH = Path(__file__).resolve().parent.parent / "graph.yaml"

# instance/kind/part keys that are physical parameters, carried as metadata
PARAM_KEYS = ("ohm", "volt", "reg_bar", "h_m", "len_m", "max_m3h", "bar", "nozzle", "arc")


def load(path: Path = GRAPH) -> dict:
    with open(path) as fh:
        return yaml.safe_load(fh)


def _is_component(kind_def) -> bool:
    return isinstance(kind_def, dict) and "parts" in kind_def


def _params(d: dict) -> dict:
    return {k: d[k] for k in PARAM_KEYS if k in d}


def expand(graph: dict):
    """Return (nodes, fail_axis).

    nodes: {node_id: {domain, kind, fail_allowed, condition, to, acts, params}}
      - flow component instances are exploded into their parts (id.partname)
      - internal part refs are prefixed with the instance id
      - external instance edges hang off the component's out-port node
      - coil nodes referenced in both flow and circuit are MERGED, not replaced
    """
    kinds = graph.get("kinds", {})
    axis = graph.get("fail_axis", [])
    flow = graph.get("flow") or {}
    circuit = graph.get("circuit") or {}
    nodes: dict[str, dict] = {}

    def entry_of(target_id: str) -> str:
        """The node that actually receives flow/current at target_id."""
        inst = flow.get(target_id) or circuit.get(target_id)
        if inst:
            kd = kinds.get(inst.get("kind"))
            if _is_component(kd) and "in" in kd:
                return f"{target_id}.{kd['in']}"
        return target_id

    def put(nid, domain, kind, fail, to=None, acts=None, params=None):
        """Create node, or merge into an existing one (coil dual-reference)."""
        if nid in nodes:
            n = nodes[nid]
            n["to"].extend(to or [])
            n["acts"].extend(acts or [])
            n["params"].update(params or {})
            # keep fail_allowed / kind / domain from the first (component) definition
            if not n["fail_allowed"] and fail:
                n["fail_allowed"] = list(fail)
            return
        nodes[nid] = {
            "domain": domain,
            "kind": kind,
            "fail_allowed": list(fail or []),
            "condition": "ok",
            "to": list(to or []),
            "acts": list(acts or []),
            "params": params or {},
        }

    for domain, section in (("flow", flow), ("circuit", circuit)):
        for gid, inst in section.items():
            inst = inst or {}
            kind_name = inst.get("kind")
            kdef = kinds.get(kind_name)

            if _is_component(kdef):
                in_port = kdef.get("in")
                out_port = kdef.get("out")
                comp_params = {**_params(kdef), **_params(inst)}  # kind + instance params
                for pname, pv in kdef["parts"].items():
                    pv = pv or {}
                    pid = f"{gid}.{pname}"
                    pp = dict(_params(pv))
                    if pname == in_port:
                        pp = {**comp_params, **pp}  # representative node carries comp params
                    put(
                        pid, domain, pname, pv.get("fail"),
                        to=[f"{gid}.{t}" for t in (pv.get("to") or [])],
                        acts=[f"{gid}.{t}" for t in (pv.get("acts") or [])],
                        params=pp,
                    )
                # external edges leave from the component's out port
                if out_port:
                    ext = [entry_of(t) for t in (inst.get("to") or [])]
                    nodes[f"{gid}.{out_port}"]["to"].extend(ext)
            else:
                # atomic instance: fail from kind if defined, else inline on the node
                if isinstance(kdef, dict) and "fail" in kdef:
                    fail = kdef["fail"]
                else:
                    fail = inst.get("fail")
                put(
                    gid, domain, kind_name or "inline", fail,
                    to=[entry_of(t) for t in (inst.get("to") or [])],
                    acts=list(inst.get("acts") or []),  # circuit acts are absolute ids
                    params=_params(inst),
                )

    return nodes, axis


def settable(nodes: dict) -> dict:
    """{node_id: allowed_conditions} for every node that can fail."""
    return {nid: n["fail_allowed"] for nid, n in nodes.items() if n["fail_allowed"]}


def apply_conditions(nodes: dict, axis: list, conditions: dict) -> dict:
    """Set node['condition'] for each entry. Raise ValueError listing every problem."""
    errs = []
    for nid, cond in conditions.items():
        if nid not in nodes:
            errs.append(f"{nid!r}: no such node")
            continue
        if cond not in axis:
            errs.append(f"{nid}: condition {cond!r} not in fail_axis {axis}")
            continue
        allowed = nodes[nid]["fail_allowed"]
        if cond not in allowed:
            shown = allowed or "(none -- this node cannot fail)"
            errs.append(f"{nid}: cannot be {cond!r}; allowed: {shown}")
            continue
        nodes[nid]["condition"] = cond
    if errs:
        raise ValueError("invalid conditions:\n  " + "\n  ".join(errs))
    return nodes


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    graph = load()
    nodes, axis = expand(graph)

    if "--list" in argv:
        s = settable(nodes)
        json.dump(
            {"fail_axis": axis, "settable_count": len(s),
             "settable": {k: s[k] for k in sorted(s)}},
            sys.stdout, indent=2,
        )
        print()
        return 0

    payload = {}
    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            payload = json.loads(raw)

    try:
        apply_conditions(nodes, axis, payload.get("conditions", {}))
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1

    out = {
        "fail_axis": axis,
        "node_count": len(nodes),
        "settable_count": len(settable(nodes)),
        "active_faults": {nid: n["condition"]
                          for nid, n in nodes.items() if n["condition"] != "ok"},
        "nodes": nodes,
    }
    json.dump(out, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
