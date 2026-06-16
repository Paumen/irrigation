#!/usr/bin/env python3
"""Render docs/bom.generated.md from system.yaml.

Design (per the answers in the build thread):
- NO renaming. Lines carry the raw graph keys: a component line is its type key
  (e.g. fitting.coupling_bm1c32), a part line is its items: key (e.g. outlet_nut),
  a zone is its instance prefix (Z2). Instance attrs (l_m/nozzle/arc) and ×N
  quantity are appended as data, not renamed labels.
- Grouping comes from graph, not a hardcoded layout: assemblies and their nesting
  are read straight from the items: tree (suction_assembly → foot_valve_assembly →
  valve.foot …). The renderer only supplies the 4 section buckets and zone
  detection, both keyed off the instance prefixes that already live in graph.
- Ports are no longer in items:, so there is nothing to filter — items: is parts.

Usage:  python tools/render_bom.py [--check]
"""
import sys, os, re, collections, copy
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = yaml.safe_load(open(os.path.join(ROOT, "system.yaml")))

# ---- fold in defaults (item_defaults by kind, part_defaults by part name) -----
# Both are lowest precedence: a component/part's own keys always win. This lets
# system.yaml omit the uniform/repeated fields that these tables supply.
ITEM_DEFAULTS = G.get("item_defaults", {})
PART_DEFAULTS = G.get("part_defaults", {})
def _apply_defaults(node):
    for k, v in node.items():
        if not isinstance(v, dict):
            continue
        if "." in k:                                   # component: defaults by kind
            for dk, dv in ITEM_DEFAULTS.get(k.split(".", 1)[0], {}).items():
                v.setdefault(dk, copy.deepcopy(dv))    # copy so parts don't share the default list
        else:                                          # part: defaults by base name
            for dk, dv in PART_DEFAULTS.get(re.sub(r"_\d+$", "", k), {}).items():
                v.setdefault(dk, copy.deepcopy(dv))
        if "items" in v and isinstance(v["items"], dict):
            _apply_defaults(v["items"])
_apply_defaults(G["items"])

# ---- type defs + the assembly path each type sits under in items: -----------
TYPES, TYPE_PATH = {}, {}
def walk(node, path):
    for k, v in node.items():
        if not isinstance(v, dict):
            continue
        if "." in k:
            TYPES[k] = v; TYPE_PATH[k] = path
        elif "items" in v:
            walk(v["items"], path + [k])
walk(G["items"], [])
ASSEMBLIES = [k for k, v in G["items"].items()
              if "." not in k and isinstance(v, dict) and "items" in v]

# ---- instances (from water + electrical) ------------------------------------
def base_type(inst):
    t = inst.split("_", 1)[1] if "_" in inst else inst
    return re.sub(r"_\d+$", "", t)

def tgt(ref):
    return ref.split("/", 1)[0]

INST = {}
for sec in ("water", "electrical"):
    for k, v in G[sec].items():
        v = v if isinstance(v, dict) else {}
        r = INST.setdefault(k, {"type": base_type(k), "attrs": {}, "edges": []})
        to = v.get("to")
        if isinstance(to, list):
            r["edges"] += [tgt(x) for x in to]
        elif isinstance(to, dict):
            for p in to.values():
                r["edges"] += [tgt(x) for x in p]
        for a in ("l_m", "nozzle", "arc"):
            if a in v:
                r["attrs"][a] = v[a]
        if v.get("gr"):
            r["group"] = v["gr"]
INST.setdefault("D1_enclosure.valvebox", {"type": "enclosure.valvebox", "attrs": {}, "edges": []})

TYPE_INST = collections.defaultdict(list)
for i, r in INST.items():
    TYPE_INST[r["type"]].append(i)
PRED = collections.defaultdict(list)
for i, r in INST.items():
    for e in r["edges"]:
        PRED[e].append(i)

# ---- section bucketing (by the prefix already in graph) ----------------------
SECTIONS = ["1. SUPPLY", "2. DISTRIBUTE", "3. DELIVER", "4. ORCHESTRATE"]
def prefix_section(inst):
    pre = inst.split("_", 1)[0]
    if pre in ("S1", "S2"):
        return 0
    if pre == "D1":
        return 1
    if pre == "O1":
        return 3
    if re.match(r"Z[1-6]$", pre):
        return 2
    return 1

# assembly -> section (majority of its member instances' prefixes)
ASM_SECTION = {}
for a in ASSEMBLIES:
    insts = [i for t, p in TYPE_PATH.items() if p and p[0] == a for i in TYPE_INST.get(t, [])]
    secs = [prefix_section(i) for i in insts]
    ASM_SECTION[a] = collections.Counter(secs).most_common(1)[0][0] if secs else 0

claimed = {i for t, p in TYPE_PATH.items() if p for i in TYPE_INST.get(t, [])}

# ---- attrs / quantity helpers ----------------------------------------------
# Nominal rotor throw at 3.0 bar from the catalog radius_m table (sprays have no
# modeled radius). Static figure for the parts list; the sim computes the actual
# throw from each head's solved inlet pressure.
_ROTOR_RADIUS = (G.get("head.rotor/nozzle") or {}).get("radius_m", {})
def nominal_throw_m(nozzle):
    row = _ROTOR_RADIUS.get(str(nozzle).split()[0])
    if not row:
        return None
    pressures = G["head.rotor/nozzle"]["pressure_bar"]
    return row[pressures.index(3.0)] if 3.0 in pressures else row[len(row) // 2]

def attr_suffix(inst):
    a = INST[inst]["attrs"]
    bits = []
    if a.get("l_m") is not None:
        bits.append(f"{a['l_m']} m")
    if a.get("nozzle"):
        bits.append(str(a["nozzle"]))
    if a.get("arc"):
        bits.append(f"{a['arc']}°")
    if a.get("nozzle"):
        t = nominal_throw_m(a["nozzle"])
        if t is not None:
            bits.append(f"~{t:g} m throw @3 bar")
    return f"  ({', '.join(bits)})" if bits else ""

def line(prefix, last, text, out):
    out.append(prefix + ("└─ " if last else "├─ ") + text)

# ---- part subtree (items: is parts-only now) --------------------------------
def render_parts(typedef, prefix, out):
    items = list((typedef.get("items", {}) or {}).items())
    coll, i = [], 0
    while i < len(items):
        k, v = items[i]
        v = v if isinstance(v, dict) else {}
        cnt, j = 1, i + 1
        while (j < len(items) and re.sub(r"_\d+(_|$)", r"\1", items[j][0]) == re.sub(r"_\d+(_|$)", r"\1", k)
               and not v.get("items") and not (items[j][1] or {}).get("items")):
            cnt += 1; j += 1
        coll.append((k, v, cnt)); i = j
    for idx, (k, v, cnt) in enumerate(coll):
        last = idx == len(coll) - 1
        # quantity = grouped repeats (numbered keys) × the part's own count: attr
        qty = cnt * int(v.get("count", 1) or 1)
        key = re.sub(r"_\d+(_|$)", r"\1", k) if cnt > 1 else k
        txt = f"[{key}]" if v.get("feature") else key
        if qty > 1:
            txt += f" ×{qty}"
        if v.get("model"):
            txt += f"  ({v['model']})"
        line(prefix, last, txt, out)
        render_parts(v, prefix + ("    " if last else "│   "), out)

# ---- assembly subtree (structure straight from items:) ----------------------
def render_assembly(name, node, prefix, out):
    entries = []
    for k, v in (node.get("items", {}) or {}).items():
        if "." in k:
            for inst in TYPE_INST.get(k, []):
                entries.append(("inst", inst, None))
        elif isinstance(v, dict) and "items" in v:
            entries.append(("asm", k, v))
    for idx, e in enumerate(entries):
        last = idx == len(entries) - 1
        cp = prefix + ("    " if last else "│   ")
        if e[0] == "inst":
            inst = e[1]; t = INST[inst]["type"]
            txt = t + attr_suffix(inst)
            if TYPES.get(t, {}).get("model"):
                txt += f"  ({TYPES[t]['model']})"
            line(prefix, last, txt, out)
            render_parts(TYPES.get(t, {}), cp, out)
        else:
            line(prefix, last, e[1], out)
            render_assembly(e[1], e[2], cp, out)

# ---- one component instance: its type line + part subtree -------------------
def render_component(inst, prefix, last, out):
    t = INST[inst]["type"]
    txt = t + attr_suffix(inst)
    if TYPES.get(t, {}).get("model"):
        txt += f"  ({TYPES[t]['model']})"
    line(prefix, last, txt, out)
    render_parts(TYPES.get(t, {}), prefix + ("    " if last else "│   "), out)

# ---- zones (instances by prefix, flow-ordered) ------------------------------
def flow_order(subset):
    s = set(subset)
    roots = [k for k in s if not any(p in s for p in PRED.get(k, []))]
    seen, order = set(), []
    def dfs(n):
        if n in seen or n not in s:
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

# ---- assemble ---------------------------------------------------------------
def main():
    out = [
        "# Irrigation system — Bill of Materials (generated)",
        "",
        "GENERATED from system.yaml by tools/render_bom.py. Lines are raw graph keys.",
        "Sections + zone(Z#) are prefix buckets; assemblies/parts come from the items: tree.",
        "",
        "```",
        "IRRIGATION SYSTEM",
    ]
    zones = sorted({i.split("_", 1)[0] for i in INST
                    if re.match(r"Z[1-5]$", i.split("_", 1)[0]) and i not in claimed})
    for si, sname in enumerate(SECTIONS):
        slast = si == len(SECTIONS) - 1
        line("", slast, sname, out)
        sp = ("    " if slast else "│   ")
        # standalone instances (no assembly, not a zone), in flow-ish (insertion) order
        standalone = [i for i in INST if i not in claimed
                      and prefix_section(i) == si and not re.match(r"Z[1-5]$", i.split("_", 1)[0])]
        asms = [a for a in ASSEMBLIES if ASM_SECTION[a] == si]
        znames = zones if si == 2 else []
        rows = [("inst", i) for i in standalone] + [("asm", a) for a in asms] + [("zone", z) for z in znames]
        for ri, row in enumerate(rows):
            last = ri == len(rows) - 1
            cp = sp + ("    " if last else "│   ")
            if row[0] == "inst":
                inst = row[1]; t = INST[inst]["type"]
                txt = t + attr_suffix(inst)
                if TYPES.get(t, {}).get("model"):
                    txt += f"  ({TYPES[t]['model']})"
                line(sp, last, txt, out)
                render_parts(TYPES.get(t, {}), cp, out)
            elif row[0] == "asm":
                line(sp, last, row[1], out)
                render_assembly(row[1], G["items"][row[1]], cp, out)
            else:
                z = row[1]
                line(sp, last, z, out)
                zinsts = flow_order([i for i in INST if i.startswith(z + "_") and i not in claimed
                                     and not INST[i]["type"].startswith("wiring.")])
                # fold grouped instances (risers) into one sub-node, placed at the
                # flow position of the group's first member
                zrows, buckets = [], {}
                for inst in zinsts:
                    g = INST[inst].get("group")
                    if not g:
                        zrows.append(("inst", inst))
                    else:
                        if g not in buckets:
                            buckets[g] = []
                            zrows.append(("grp", g))
                        buckets[g].append(inst)
                for zi, zr in enumerate(zrows):
                    zlast = zi == len(zrows) - 1
                    zcp = cp + ("    " if zlast else "│   ")
                    if zr[0] == "inst":
                        render_component(zr[1], cp, zlast, out)
                    else:
                        line(cp, zlast, zr[1], out)
                        mem = buckets[zr[1]]
                        for mi, inst in enumerate(mem):
                            render_component(inst, zcp, mi == len(mem) - 1, out)
    out.append("```")
    text = "\n".join(out) + "\n"

    path = os.path.join(ROOT, "docs", "bom.generated.md")
    if "--check" in sys.argv:
        cur = open(path).read() if os.path.exists(path) else ""
        if cur != text:
            print("STALE: re-run tools/render_bom.py"); sys.exit(1)
        print("OK"); return
    open(path, "w").write(text)
    print(f"wrote {path} ({text.count(chr(10))} lines)")


if __name__ == "__main__":
    main()
