#!/usr/bin/env python3
"""Render docs/bom.generated.md to track docs/bom.md (the hand BOM target).

Data lives in graph.yaml + context.yaml; *layout* (the presentational grouping
the BOM adds on top of the flow graph — sections, assemblies, zones, pipework /
riser bundles) lives in LAYOUT below. For each instance we pull its part subtree
from items:, its length/nozzle/arc from water:/electrical:, its price from
context.yaml, and emit markers (💧 wet · 🌐 230 V · 💡 24 V).

Usage:  python tools/render_bom.py            # write docs/bom.generated.md
        python tools/render_bom.py --check     # exit 1 if stale
"""
import sys, os, re
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = yaml.safe_load(open(os.path.join(ROOT, "graph.yaml")))
CTX = yaml.safe_load(open(os.path.join(ROOT, "context.yaml")))
EQUIP = CTX.get("equipment", {})
PDEF = CTX.get("price_defaults", {})


# ---- type library (flattened: dotted type name -> def, wherever it nests) ----
def flatten(node, acc):
    for k, v in node.items():
        if "." in k:
            acc[k] = v
        elif isinstance(v, dict) and "items" in v:
            flatten(v["items"], acc)
    return acc

TYPES = flatten(G["items"], {})


# ------------------------------- instances -----------------------------------
def base_type(inst):
    t = inst.split("_", 1)[1] if "_" in inst else inst
    return re.sub(r"_\d+$", "", t)

def tgt_inst(ref):
    return ref.split("/", 1)[0]

INST = {}   # id -> {type, attrs, edges:[ids]}
for sec in ("water", "electrical"):
    for k, v in G[sec].items():
        v = v if isinstance(v, dict) else {}
        edges = []
        to = v.get("to")
        if isinstance(to, list):
            edges = [tgt_inst(x) for x in to]
        elif isinstance(to, dict):
            for port in to.values():
                edges += [tgt_inst(x) for x in port]
        rec = INST.setdefault(k, {"type": base_type(k), "attrs": {}, "edges": []})
        rec["edges"] += edges
        for a in ("l_m", "nozzle", "arc"):
            if a in v:
                rec["attrs"][a] = v[a]
INST.setdefault("V1_enclosure.valvebox", {"type": "enclosure.valvebox", "attrs": {}, "edges": []})

PRED = {}   # id -> [predecessor ids]
for k, r in INST.items():
    for e in r["edges"]:
        PRED.setdefault(e, []).append(k)


# -------------------------------- labels -------------------------------------
GSIZE = {"G1": 'G1″', "G3/4": 'G¾″', "G1/2": 'G½″'}

def conn_token(c):
    if not c:
        return ""
    s = c.get("size", "")
    if isinstance(s, str) and s.startswith("∅"):
        return s
    base = GSIZE.get(s, s)
    if c.get("joint") == "swivel-union" or str(c.get("gender", "")).startswith("swivel"):
        return f"swivel-{base}"
    g = {"M": "M", "F": "F"}.get(c.get("gender", ""), "")
    return base + g

TYPE_NAME = {
    "source.well": "Well water source", "pump.jet": "Jet pump",
    "valve.foot": "Foot valve", "valve.manual": "Manual valve",
    "valve.auto": "Zone valve", "fitting.strainer_basket": "Strainer basket",
    "fitting.hosetail_brass": "Hose-tail, brass", "fitting.hosetail_plastic": "Hose-tail, plastic",
    "fitting.manifold": "Manifold body", "fitting.tee": "Tee", "fitting.cap": "End cap",
    "emitter.rotor": "Rotor", "emitter.spray": "Spray", "emitter.stream": "Stream emitter",
    "relay.pumpstart": "Pump-start relay", "source.socket": "Socket",
    "control.controller": "Controller", "enclosure.valvebox": "Box housing",
    "wiring.230v": "230 V cable", "wiring.24v": "24 V wire", "wiring.splice": "Waterproof wire connector",
}
HOSE_DIA = {"hose.ldpe32": "∅32", "hose.ldpe25": "∅25", "hose.ldpe16": "∅16"}

def inst_label(inst, override=None):
    if override:
        return override
    t = INST[inst]["type"]
    a = INST[inst]["attrs"]
    d = TYPES.get(t, {})
    model = d.get("model")
    if t.startswith("fitting.coupling"):
        lab = f"Coupling {conn_token(d.get('inlet_conn'))}→{conn_token(d.get('outlet_conn'))}"
    elif t.startswith("fitting.sj"):
        m = re.search(r"(\d)x(\d)", t)
        lab = f"Swing-joint riser ¾×{'¾' if t.endswith('34') else '½'}"
    elif t == "hose.suction":
        lab = f"Suction hose — PVC ∅25"
    elif t.startswith("hose.ldpe"):
        lab = f"Hose LDPE {HOSE_DIA.get(t,'')}"
    else:
        lab = TYPE_NAME.get(t, t)
    if a.get("l_m") is not None:
        lab += f", {a['l_m']} m"
    # nozzle/arc ride on the riser-bundle label, not the emitter itself
    if model:
        lab += f" — {model}"
    return lab + marker(t)


# -------------------------------- markers ------------------------------------
MARK = {
    "pump.jet": " 💧", "valve.auto": " 💧💡", "valve.foot": " 💧", "valve.manual": " 💧",
    "fitting.cap": " 💧", "fitting.manifold": " 💧", "fitting.tee": " 💧",
    "emitter.rotor": " 💧", "emitter.spray": " 💧", "emitter.stream": " 💧",
    "source.well": " 💧", "relay.pumpstart": " 💡🌐", "source.socket": " 🌐",
    "control.controller": " 🌐💡", "wiring.230v": " 🌐", "wiring.24v": " 💡",
    "wiring.splice": " 💡",
}
def marker(t):
    if t.startswith(("fitting.", "hose.")):
        return " 💧"
    return MARK.get(t, "")


# ----------------------------- part subtree ----------------------------------
PORT_EXACT = {"inlet", "outlet", "suction", "inlet_tank", "sol_port"}
NO_EXPAND = {"wiring.24v", "wiring.splice"}   # match target: shown as single line
PART_SUBS = [("oring", "O-ring"), ("ac line", "AC line"), ("24v", "lead wire")]

def is_port(k):
    return (k in PORT_EXACT or re.match(r"^(inlet|outlet)_\d+$", k)
            or re.match(r"^port_\d+$", k))

def norm(k):
    return re.sub(r"_\d+(_|$)", r"\1", k)

def part_label(k, v):
    nm = norm(k).replace("_", " ").strip()
    for a, b in PART_SUBS:
        nm = nm.replace(a, b)
    if v.get("feature"):
        return f"[{nm}]"
    nm = nm[:1].upper() + nm[1:]
    if v.get("model"):
        nm += f" — {v['model']}"
    return nm

def render_parts(typedef, prefix, out):
    items = typedef.get("items", {}) if isinstance(typedef, dict) else {}
    ents = [(k, v if isinstance(v, dict) else {}) for k, v in items.items() if not is_port(k)]
    coll, i = [], 0
    while i < len(ents):
        k, v = ents[i]
        cnt, j = 1, i + 1
        while (j < len(ents) and norm(ents[j][0]) == norm(k)
               and not v.get("items") and not ents[j][1].get("items")):
            cnt += 1; j += 1
        coll.append((k, v, cnt)); i = j
    for idx, (k, v, cnt) in enumerate(coll):
        last = idx == len(coll) - 1
        lab = part_label(k, v) + (f" ×{cnt}" if cnt > 1 else "")
        out.append(prefix + ("└─ " if last else "├─ ") + lab)
        render_parts(v, prefix + ("    " if last else "│   "), out)


# ---------------------------- instance render --------------------------------
def render_inst(inst, prefix, out, override=None, extra_children=()):
    t = INST[inst]["type"]
    child_prefix = prefix
    td = {} if t in NO_EXPAND else TYPES.get(t, {})
    # extra (pseudo) children first (e.g. inlet coupling under a zone valve)
    kids = list(extra_children)
    part_items = [(k, v) for k, v in (td.get("items", {}) or {}).items() if not is_port(k)]
    n = len(kids) + len(part_items)
    # extra children
    for i, (cinst, cover) in enumerate(kids):
        last = (i == n - 1)
        out.append(child_prefix + ("└─ " if last else "├─ ") + inst_label(cinst, cover))
        render_inst_children(cinst, child_prefix + ("    " if last else "│   "), out)
    # part children (collapsed)
    base = len(kids)
    coll, i = [], 0
    while i < len(part_items):
        k, v = part_items[i]
        v = v if isinstance(v, dict) else {}
        cnt, j = 1, i + 1
        while (j < len(part_items) and norm(part_items[j][0]) == norm(k)
               and not v.get("items") and not (part_items[j][1] or {}).get("items")):
            cnt += 1; j += 1
        coll.append((k, v, cnt)); i = j
    for idx, (k, v, cnt) in enumerate(coll):
        last = (base + idx == n - 1)
        lab = part_label(k, v) + (f" ×{cnt}" if cnt > 1 else "")
        out.append(child_prefix + ("└─ " if last else "├─ ") + lab)
        render_parts(v, child_prefix + ("    " if last else "│   "), out)

def render_inst_children(inst, prefix, out):
    t = INST[inst]["type"]
    td = {} if t in NO_EXPAND else TYPES.get(t, {})
    render_parts(td, prefix, out)


# ------------------------------- zones ---------------------------------------
RISER_KIND = re.compile(r"fitting\.(sj|coupling_c25bf34)")

def zone_instances(z):
    return [k for k in INST if k.startswith(z + "_")
            and not INST[k]["type"].startswith("wiring.")]

def render_zone(z, prefix, out):
    members = set(zone_instances(z))
    emitters = [k for k in members if INST[k]["type"].startswith("emitter.")]
    valves = [k for k in members if INST[k]["type"] in ("valve.auto", "valve.manual")]
    # riser bundles: walk back from each emitter through riser-kind fittings
    risers = {}
    claimed = set()
    for e in emitters:
        chain = [e]; cur = e
        while True:
            preds = [p for p in PRED.get(cur, []) if p in members]
            if preds and RISER_KIND.search(INST[preds[0]]["type"]):
                cur = preds[0]; chain.append(cur)
            else:
                break
        chain = list(reversed(chain))
        risers[e] = chain
        claimed.update(chain)
    # drop stream emitters from riser handling — they render standalone
    streams = [e for e in emitters if INST[e]["type"] == "emitter.stream"]
    risers = {e: c for e, c in risers.items() if INST[e]["type"] != "emitter.stream"}
    for e in streams:
        claimed.discard(e)
    valve = valves[0] if valves else None
    auto = valve and INST[valve]["type"] == "valve.auto"

    rows = []
    if auto:
        preds = [p for p in PRED.get(valve, []) if p in members]
        inlet_coupling = preds[0] if preds else None
        if inlet_coupling:
            claimed.add(inlet_coupling)
        claimed.add(valve)
        rows.append(("valve", valve, inlet_coupling))
        pipework = flow_order([k for k in members if k not in claimed], members)
        if pipework:
            rows.append(("pipework", pipework, None))
        for e in emitters:
            if e in risers:
                rows.append(("riser", risers[e], None))
    else:
        # manual / stream zone: tap coupling, pipework, manual valve, emitter(s)
        if valve:
            claimed.add(valve)
        claimed.update(streams)
        rest = flow_order([k for k in members if k not in claimed], members)
        tap = rest[0] if rest else None
        pipework = rest[1:] if rest else []
        if tap:
            rows.append(("inst", tap, "Tap coupling " + inst_label(tap).split(" ", 1)[1]))
        if pipework:
            rows.append(("pipework", pipework, None))
        if valve:
            rows.append(("inst", valve, None))
        for e in streams:
            rows.append(("inst", e, None))

    for idx, row in enumerate(rows):
        last = idx == len(rows) - 1
        conn = "└─ " if last else "├─ "
        cp = prefix + ("    " if last else "│   ")
        kind = row[0]
        if kind == "inst":
            out.append(prefix + conn + inst_label(row[1]))
            render_inst_children(row[1], cp, out)
        elif kind == "valve":
            out.append(prefix + conn + inst_label(row[1]))
            extra = [(row[2], "Inlet coupling")] if row[2] else []
            render_inst(row[1], cp, out, extra_children=extra)
        elif kind == "pipework":
            out.append(prefix + conn + "Pipework")
            seq = row[1]
            for j, p in enumerate(seq):
                l2 = j == len(seq) - 1
                out.append(cp + ("└─ " if l2 else "├─ ") + inst_label(p))
                render_inst_children(p, cp + ("    " if l2 else "│   "), out)
        elif kind == "riser":
            chain = row[1]
            emitter = chain[-1]
            a = INST[emitter]["attrs"]
            tag = []
            if a.get("nozzle"): tag.append(str(a["nozzle"]))
            if a.get("arc"): tag.append(f"{a['arc']}°")
            kind_nm = "Rotor riser" if INST[emitter]["type"] == "emitter.rotor" else (
                "Spray riser" if INST[emitter]["type"] == "emitter.spray" else "Riser")
            out.append(prefix + conn + f"{kind_nm} — {' '.join(tag)} 💧")
            for j, p in enumerate(chain):
                l2 = j == len(chain) - 1
                out.append(cp + ("└─ " if l2 else "├─ ") + inst_label(p))
                render_inst_children(p, cp + ("    " if l2 else "│   "), out)

def flow_order(subset, members):
    subset = set(subset)
    roots = [k for k in subset if not any(p in subset for p in PRED.get(k, []))]
    seen, order = set(), []
    def dfs(n):
        if n in seen or n not in subset:
            return
        seen.add(n); order.append(n)
        for e in INST[n]["edges"]:
            dfs(e)
    for r in sorted(roots):
        dfs(r)
    for k in subset:
        if k not in seen:
            order.append(k)
    return order


# ------------------------------- layout --------------------------------------
LAYOUT = [
    ("1. SUPPLY ASSY", "well → pump → tank → pressure to the supply line", [
        ("inst", "W1_source.well"),
        ("inst", "W1_pump.jet"),
        ("group", "Suction assembly", [
            ("group", "Foot-valve assembly 💧", [
                ("inst", "W1_valve.foot"), ("inst", "W1_fitting.strainer_basket"),
                ("inst", "W1_fitting.hosetail_brass")]),
            ("inst", "W1_hose.suction"), ("inst", "W1_fitting.hosetail_plastic")]),
        ("group", "Pump discharge", [
            ("inst", "W1_fitting.coupling_bm1c32"), ("inst", "W1_hose.ldpe32"),
            ("inst", "W1_fitting.coupling_c32c32")]),
        ("group", "Pump power assembly", [
            ("inst", "S1_relay.pumpstart"),
            ("inst", "S1_source.socket", "Relay supply socket 🌐"),
            ("inst", "W1_source.socket", "Pump socket (switched) 🌐"),
            ("inst", "S1_wiring.230v_1", "Cable 230 V: mains → relay 🌐"),
            ("inst", "S1_wiring.230v_2", "Cable 230 V: relay → pump socket 🌐"),
            ("inst", "S1_wiring.24v_1", "Cable 24 V: controller → relay coil 💡"),
            ("inst", "S1_wiring.24v_2", "Cable 24 V: relay coil → controller common 💡")]),
    ]),
    ("2. DISTRIBUTE ASSY", "manifold + supply line + harness; zone valves under their zones", [
        ("inst", "P1_hose.ldpe32", "Supply line — Hose LDPE ∅32, 20 m 💧"),
        ("inst", "V1_enclosure.valvebox"),
        ("group", "Manifold assembly 💧", [
            ("inst", "V1_fitting.manifold"), ("inst", "V1_fitting.coupling_c32sm1", "Inlet coupling ∅32→swivel-G1″ 💧"),
            ("inst", "Z6_fitting.cap", "End cap (outlet 6) 💧")]),
        ("solenoid_wiring", "Solenoid wiring 💡"),
    ]),
    ("3. DELIVER ASSY", "zone piping → risers → emitters", [
        ("zone", "Zone 1 — stream / bubbler (manual)", "Z1"),
        ("zone", "Zone 2 — 1 rotor + 2 sprays", "Z2"),
        ("zone", "Zone 3 — 2 rotors", "Z3"),
        ("zone", "Zone 4 — 4 sprays", "Z4"),
        ("zone", "Zone 5 — 2 rotors", "Z5"),
    ]),
    ("4. ORCHESTRATE ASSY", "controller + 24 V harness — schedules and drives the zones", [
        ("inst", "H1_source.socket", "House socket (controller supply) 🌐"),
        ("inst", "H1_wiring.230v_1", "Mains lead 230 V: socket → controller 🌐"),
        ("inst", "H1_control.controller"),
        ("group", "Zone valve cable assembly (controller → valve box, in conduit) 💡", [
            ("inst", "P1_wiring.24v_1", "Zone 2 conductor 💡"),
            ("inst", "P1_wiring.24v_2", "Zone 3 conductor 💡"),
            ("inst", "P1_wiring.24v_4", "Zone 4 conductor 💡"),
            ("inst", "P1_wiring.24v_3", "Zone 5 conductor 💡"),
            ("inst", "V1_wiring.24v_4", "Common conductor 💡")]),
    ]),
]


def render_list(entries, prefix, out):
    for idx, entry in enumerate(entries):
        last = idx == len(entries) - 1
        conn = "└─ " if last else "├─ "
        cp = prefix + ("    " if last else "│   ")
        kind = entry[0]
        if kind == "inst":
            inst = entry[1]
            over = entry[2] if len(entry) > 2 else None
            out.append(prefix + conn + inst_label(inst, over))
            render_inst_children(inst, cp, out)
        elif kind == "group":
            out.append(prefix + conn + entry[1])
            render_list(entry[2], cp, out)
        elif kind == "zone":
            out.append(prefix + conn + entry[1])
            render_zone(entry[2], cp, out)
        elif kind == "solenoid_wiring":
            out.append(prefix + conn + entry[1])
            splices = [k for k in INST if INST[k]["type"] == "wiring.splice"]
            jumpers = [k for k in INST if k.startswith("V1_wiring.24v_") and k != "V1_wiring.24v_4"]
            out.append(cp + f"├─ Waterproof wire connector ×{len(splices)} 💡")
            out.append(cp + f"└─ Common jumper wire ×{len(jumpers)} 💡")


def main():
    out = [
        "# Irrigation system — Bill of Materials (generated)",
        "",
        "GENERATED from graph.yaml + context.yaml by tools/render_bom.py — tracks docs/bom.md.",
        "Legend: 💧 wetted · 🌐 230 V mains · 💡 24 V control · `[ … ]` = flow feature, not a part.",
        "",
        "```",
        "IRRIGATION SYSTEM",
    ]
    for si, (title, desc, entries) in enumerate(LAYOUT):
        last = si == len(LAYOUT) - 1
        out.append(("└─ " if last else "├─ ") + f"{title}   ({desc})")
        render_list(entries, ("    " if last else "│   "), out)
    out.append("```")
    text = "\n".join(out) + "\n"

    path = os.path.join(ROOT, "docs", "bom.generated.md")
    if "--check" in sys.argv:
        cur = open(path).read() if os.path.exists(path) else ""
        if cur != text:
            print("STALE: docs/bom.generated.md differs; re-run tools/render_bom.py")
            sys.exit(1)
        print("OK: bom.generated.md is in sync")
        return
    open(path, "w").write(text)
    print(f"wrote {path} ({text.count(chr(10))} lines)")


if __name__ == "__main__":
    main()
