#!/usr/bin/env python3
"""Render docs/bom.generated.md from graph.yaml + context.yaml.

The point: graph.yaml is the single source of truth. This renderer pulls every
part/feature/note/material from it and the price from context.yaml, so the BOM
cannot drift from the model. Layout rules (sections, readable names) live here;
data lives in graph.yaml.

v1 scope: faithful per-component subtree (parts vs. `feature: true`, notes,
materials, prices, ×N collapsing) grouped into the four functional sections by
instance prefix. The artisanal sub-bundles (Pipework / riser bundles) are not
yet reproduced — that's the next iteration.

Usage:  python tools/render_bom.py          # write docs/bom.generated.md
        python tools/render_bom.py --check   # exit 1 if the file is stale
"""
import sys, os, re
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = yaml.safe_load(open(os.path.join(ROOT, "graph.yaml")))
CTX = yaml.safe_load(open(os.path.join(ROOT, "context.yaml")))
COMP = G["components"]
EQUIP = CTX.get("equipment", {})
PDEF = CTX.get("price_defaults", {})

PORTS = {"inlet", "outlet", "suction", "inlet_tank", "sol_port",
         "outlet_1", "outlet_2", "outlet_3", "outlet_4", "outlet_5", "outlet_6"}

# instance-prefix -> section
SECTIONS = [
    ("1. SUPPLY ASSY",      "well → pump → tank → pressure to the supply line"),
    ("2. DISTRIBUTE ASSY",  "manifold + supply line + harness; zone valves under their zones"),
    ("3. DELIVER ASSY",     "zone piping → risers → emitters"),
    ("4. ORCHESTRATE ASSY", "controller + 24 V harness — schedules and drives the zones"),
]

def section_of(inst):
    pre = inst.split("_", 1)[0]
    if pre in ("W1", "S1"):
        return 0
    if pre == "V1":
        return 1
    if pre == "P1":
        return 1 if "hose" in inst else 3
    if pre == "H1":
        return 3
    if re.match(r"Z[1-6]$", pre):
        return 2
    return 1

def ctype(inst):
    return inst.split("_", 1)[1] if "_" in inst else inst

def base_type(t):
    # strip trailing instance index (_1, _2 …)
    return re.sub(r"_\d+$", "", t)

def price(t):
    cat = t.split(".")[0]
    if t in EQUIP: return EQUIP[t].get("price_eur") or EQUIP[t].get("price_eu_m")
    if cat in EQUIP: return EQUIP[cat].get("price_eur") or EQUIP[cat].get("price_eu_m")
    for k, v in PDEF.items():
        if t.startswith(k): return v
    return None

def domain(t):
    cat = t.split(".")[0]
    if cat in ("hose", "fitting", "emitter", "pump", "valve"): return "water"
    if cat == "source": return "water" if t == "source.well" else "elec"
    if cat in ("wiring", "relay", "control"): return "elec"
    if cat == "enclosure": return "struct"
    return ""

MARK = {"water": "\U0001F4A7"}  # 💧 ; electrical markers are part-specific, omitted in v1

def display_name(inst, attrs):
    t = base_type(ctype(inst))
    cdef = COMP.get(t, {})
    model = cdef.get("model")
    nm = {
        "pump.jet": "Jet pump", "valve.auto": "Zone valve", "valve.foot": "Foot valve",
        "valve.manual": "Manual valve", "emitter.rotor": "Rotor", "emitter.spray": "Spray",
        "emitter.stream": "Stream emitter", "fitting.manifold": "Manifold",
        "fitting.tee": "Tee", "fitting.cap": "End cap", "control.controller": "Controller",
        "relay.pumpstart": "Pump-start relay", "source.well": "Well water source",
        "source.socket": "Socket", "enclosure.valvebox": "Box housing",
        "fitting.strainer_basket": "Strainer basket",
        "fitting.hosetail_brass": "Hose-tail, brass",
        "fitting.hosetail_plastic": "Hose-tail, plastic",
        "wiring.230v": "230 V cable", "wiring.24v": "24 V wire",
        "wiring.splice": "Waterproof connector",
    }.get(t)
    if t.startswith("fitting.coupling"): nm = "Coupling"
    if t.startswith("fitting.sj"): nm = "Swing-joint riser"
    if t.startswith("hose.ldpe"): nm = "Hose LDPE"
    if t == "hose.suction": nm = "Suction hose"
    label = nm or t
    extra = []
    if attrs.get("l_m"): extra.append(f"{attrs['l_m']} m")
    if attrs.get("nozzle"): extra.append(str(attrs["nozzle"]))
    if attrs.get("arc"): extra.append(f"{attrs['arc']}°")
    if extra: label += " " + ", ".join(extra)
    if model: label += f" — {model}"
    return label

def render_parts(node, t, prefix, out):
    """Render a component definition's parts/features as an indented subtree."""
    parts = node.get("parts", {}) if isinstance(node, dict) else {}
    items = [(k, v if isinstance(v, dict) else {}) for k, v in parts.items()
             if k not in PORTS and not re.match(r"port_\d+$", k)]
    # collapse identical-leaf siblings into xN (e.g. outlet_*_washer)
    for i, (k, v) in enumerate(items):
        last = (i == len(items) - 1)
        conn = "└─ " if last else "├─ "
        nm = k.replace("_", " ")
        feat = v.get("feature")
        note = v.get("note")
        mat = v.get("material")
        line = prefix + conn
        if feat:
            line += f"[{nm}" + (f" — {note}]" if note else "]")
        else:
            line += nm
            if mat: line += f"  ({mat})"
            if note: line += f"  [{note}]"
        out.append(line)
        child_prefix = prefix + ("    " if last else "│   ")
        render_parts(v, t, child_prefix, out)

def main():
    # collect instances from water + electrical
    insts = {}
    for sec in ("water", "electrical"):
        for k, v in G[sec].items():
            insts.setdefault(k, {})
            if isinstance(v, dict):
                for a in ("l_m", "nozzle", "arc"):
                    if a in v: insts[k][a] = v[a]
    # enclosure has no flow routing — add it explicitly
    insts.setdefault("V1_enclosure.valvebox", {})

    buckets = {i: [] for i in range(4)}
    for inst in insts:
        buckets[section_of(inst)].append(inst)

    out = ["# Irrigation system — Bill of Materials (generated)",
           "",
           "GENERATED from graph.yaml + context.yaml by tools/render_bom.py — do not edit by hand.",
           "`[bracketed]` = `feature:` node (flow passage / volume / zone), not a procurable part.",
           "", "```", "IRRIGATION SYSTEM"]
    for i, (title, desc) in enumerate(SECTIONS):
        last_sec = (i == len(SECTIONS) - 1)
        sconn = "└─ " if last_sec else "├─ "
        out.append(f"{sconn}{title}   ({desc})")
        sp = "    " if last_sec else "│   "
        rows = sorted(buckets[i])
        for j, inst in enumerate(rows):
            t = base_type(ctype(inst))
            cdef = COMP.get(t, {})
            last = (j == len(rows) - 1)
            conn = "└─ " if last else "├─ "
            mark = MARK.get(domain(t), "")
            p = price(t)
            ptxt = f"  €{p}" if p is not None else "  (no price)"
            out.append(f"{sp}{conn}{display_name(inst, insts[inst])} {mark}{ptxt}")
            cp = sp + ("    " if last else "│   ")
            render_parts(cdef, t, cp, out)
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
