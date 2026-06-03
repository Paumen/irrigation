"""Fault simulator for graph.yaml.

Given a fault set + commanded zones, predict per-head behaviour
(full / weak / won't-pop / dead), where water leaks, and which valves the
controller actually energised.

The one rule (see the prompt that ships with graph.yaml): connectivity in
graph.yaml IS the propagation. Every consequence here falls out of (graph
structure) + (the physical meaning of a condition on a node). There is no
per-fault symptom table and no F-codes. The only place a "physical meaning" is
written down is CONDITION EFFECTS below: a small, explicit mapping from
(part kind, condition) to a structural effect (sever / leak / added-loss /
de-regulate / scale-discharge), keyed to each kind's role in the graph. It is
deliberately auditable -- a wrong claim there contradicts the graph rather than
hiding in prose.

Three solves, in order:
  Piece 2  _resolve_electrical   -- reachability over `circuit`; coils + pump.
  Piece 1  _resolve_valves       -- the pilot loop, by reachability over each
                                    valve's own sub-parts + coil energisation.
  Piece 3  _solve_hydraulic      -- collapse valves, insert leak sinks, then a
                                    generalized (non-tree) flow accumulation +
                                    coupled pressure<->flow Picard, reusing the
                                    physics in hydraulics.py.

Library + stdin/stdout CLI (mirrors hydraulics.py / diagnose.py):
    echo '{"commanded_zones":[1,2],"conditions":{"Z1.hose1":"broken"}}' \\
        | python3 simulate.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import faults
from hydraulics import (DEFAULT_PUMP, G, I20_OP_RANGE_BAR, M_PER_BAR,
                        MP_REG_BAR, MP_REG_MIN_INLET_BAR, PUMP_CURVES,
                        SOLVE_TOL, free_discharge_m3h, hazen_williams_m,
                        hose_inner_d_m, i20_flow_m3h, mp_flow_m3h,
                        pump_head_m, valve_loss_bar)

GRAPH = Path(__file__).resolve().parent.parent / "graph.yaml"

# ---- tunables (all explicit; no magic scattered through the code) ----------
HW_C_OK = 150.0
HW_C_CLOGGED = 90.0          # a fouled hose: lower Hazen-Williams roughness C
VALVE_CV = 7.0
VALVE_LOSS_CLOGGED_BAR = 0.4  # seat clogged: added throttling loss
WEEP_D = 0.003               # a weeping valve passes a ~3 mm trickle, no more
SUCTION_EXTRA_LOSS_M = 1.0
SUCTION_CLOG_LOSS_M = 6.0    # clogged foot valve / suction: big extra lift loss
SJ_LOSS_BAR = 0.05           # swing joint minor loss

LEAK_D_HOSE = {"hose.32": hose_inner_d_m("hose.32"),
               "hose.25": hose_inner_d_m("hose.25"),
               "hose.16": hose_inner_d_m("hose.16")}
LEAK_D_SMALL = 0.006         # joint / tee / swing / thread split (~6 mm)
LEAK_D_SEAL = 0.008          # manifold seal / valve body / cap blow-out (~8 mm)
LEAK_D_CHECK = 0.004         # check-valve back-drain orifice (~4 mm, small)

NOZZLE_CLOG_SCALE = 0.25     # clogged nozzle/filter still dribbles
NOZZLE_MISCONFIG_SCALE = 1.6  # wrong (oversized) nozzle -> over-flows

# grading
POP_BAR = I20_OP_RANGE_BAR[0]   # 1.7 bar -- rotors won't pop/rotate below this
REG_MIN = MP_REG_MIN_INLET_BAR  # 3.5 bar -- MP under-regulates below this
DEAD_Q = 0.02                   # m3/h below which a head is doing nothing
WEAK_FRAC = 0.75

# Picard
MAX_ITERS = 600
RELAX = 0.5

ZONES = (1, 2, 3, 4)            # automatic (solenoid) zones
MANUAL_ZONE = 5


# ============================================================================
# CONDITION EFFECTS -- the only "physics in prose", kept minimal and auditable.
# Each entry says what a condition does to a part, given that part's role in the
# graph (conduit / sealing dead-end / regulator / control orifice / driver).
# ============================================================================
def _effect(kind: str, cond: str) -> dict:
    """Structural effect of `cond` on a flow part of `kind`.

    Returns any of: sever(bool), leak(orifice d_m), add_loss_bar, hw_c,
    deregulate(bool), scale(discharge multiplier). Absent keys = no effect.
    """
    if cond == "ok":
        return {}

    # --- conduits: carry main flow; a rupture leaks but still passes some ---
    if kind.startswith("hose."):
        if cond == "broken":
            return {"leak": LEAK_D_HOSE[kind]}        # rupture: leak, keep passing
        if cond == "clogged":
            return {"hw_c": HW_C_CLOGGED}             # fouled bore: more friction
    if kind in ("joint", "tee", "swing", "supply"):
        if cond == "broken":
            return {"leak": LEAK_D_SMALL}
        if cond == "misconfigured":                   # loose/cross-fit fitting
            return {"leak": LEAK_D_SMALL}
        if cond == "clogged":                         # silted supply line
            return {"add_loss_m": SUCTION_CLOG_LOSS_M}

    # --- sealing / capping dead-ends: their whole job is to hold; broken=hole -
    if kind in ("cap",):
        if cond == "broken":
            return {"leak": LEAK_D_SEAL}
    if kind in ("inlet_seal", "port_seal", "body"):   # manifold / valve body
        if cond == "broken":
            return {"leak": LEAK_D_SEAL}
        if cond == "misconfigured":
            return {"leak": LEAK_D_SMALL}
    if kind in ("inlet_thread", "outlet_nut"):        # threaded unions
        if cond == "broken":
            return {"sever": True, "leak": LEAK_D_SEAL}   # snapped off -> dumps
        if cond == "misconfigured":
            return {"leak": LEAK_D_SMALL}                 # weeps at the thread
    if kind == "check_valve":                         # head/pump back-drain
        if cond == "broken":
            return {"leak": LEAK_D_CHECK}

    # --- regulator: modulates pressure, does NOT block flow; broken = no reg --
    if kind == "regulator":
        if cond == "broken":
            return {"deregulate": True}

    # --- nozzle / filter: meter the discharge ------------------------------
    if kind in ("nozzle", "nozzle.stream", "filter"):
        if cond == "clogged":
            return {"scale": NOZZLE_CLOG_SCALE}
        if cond == "misconfigured":
            return {"scale": NOZZLE_MISCONFIG_SCALE}

    # everything else (gears, springs, seals acting via `acts`, arc, etc.) has
    # no first-order flow effect here; it is reported as a flag, not asserted.
    return {}


# ============================================================================
# Ingestion
# ============================================================================
def _load_and_expand(conditions: dict, graph_path: Path):
    graph = faults.load(graph_path)
    nodes, axis = faults.expand(graph)
    faults.apply_conditions(nodes, axis, conditions or {})
    return graph, nodes, axis


def _cond(nodes, nid):
    n = nodes.get(nid)
    return n["condition"] if n else "ok"


def _intact(nodes, nid):
    return _cond(nodes, nid) != "broken"


def _is_component(kdef):
    return isinstance(kdef, dict) and "parts" in kdef


# ============================================================================
# Piece 2 -- electrical pass
# ============================================================================
def _resolve_electrical(graph, nodes, commanded):
    """Reachability over `circuit`. A node is live iff an intact, un-gated path
    runs source(mains) -> node -> return(ctrl.psu). Returns coils + pump."""
    # The coil nodes are dual-referenced (flow + circuit); expand() merges them
    # and keeps domain='flow', so pull them in explicitly alongside the circuit.
    circ_ids = {nid for nid, n in nodes.items() if n["domain"] == "circuit"}
    for z in ZONES:
        circ_ids.add(f"Z{z}.valve.coil")
    to = {nid: [t for t in nodes[nid]["to"] if t in circ_ids] for nid in circ_ids}
    # reverse adjacency for the return walk
    rev: dict[str, list[str]] = {nid: [] for nid in circ_ids}
    for nid, outs in to.items():
        for t in outs:
            rev[t].append(nid)

    # Gating: a zone tap conducts only when its zone is commanded; the pump-start
    # tap conducts when any zone is commanded. Tracked separately from faults so
    # "off because not commanded" != "off because broken".
    gated = set()
    for z in ZONES:
        if z not in commanded:
            gated.add(f"ctrl.tr{z}")
    if not commanded:
        gated.add("ctrl.trpmv")

    def passable(nid):
        return _intact(nodes, nid) and nid not in gated

    def bfs(starts, adj):
        seen, stack = set(), [s for s in starts if passable(s)]
        seen.update(stack)
        while stack:
            cur = stack.pop()
            for nxt in adj.get(cur, []):
                if nxt not in seen and passable(nxt):
                    seen.add(nxt)
                    stack.append(nxt)
        return seen

    from_source = bfs(["mains"], to)                 # fed from mains
    to_return = bfs(["ctrl.psu"], rev)               # can reach the PSU return

    def live(nid):
        return passable(nid) and nid in from_source and nid in to_return

    coils, coil_reasons = {}, {}
    for z in ZONES:
        cid = f"Z{z}.valve.coil"
        coils[z] = live(cid)
        coil_reasons[z] = _coil_reason(nodes, z, cid, from_source, to_return,
                                       commanded, gated)

    # pump-start relay + 230 V power path (acts-gated, so checked explicitly)
    relay_coil_live = live("relay.coil")
    contactor_ok = _intact(nodes, "relay.contactor")
    line_ok = _intact(nodes, "relay.line")
    motor_ok = _intact(nodes, "pump.motor")
    cap_ok = _intact(nodes, "pump.capacitor")
    pump_running = (relay_coil_live and contactor_ok and line_ok
                    and motor_ok and cap_ok)
    pump_reason = _pump_reason(relay_coil_live, contactor_ok, line_ok,
                               motor_ok, cap_ok, bool(commanded))

    return {"coils": coils, "coil_reasons": coil_reasons,
            "pump_running": pump_running, "pump_reason": pump_reason}


def _coil_reason(nodes, z, cid, from_source, to_return, commanded, gated):
    if not _intact(nodes, cid):
        return "coil broken"
    if z not in commanded:
        return "not commanded"
    if cid not in from_source:
        return "open feed (controller/splice broken)"
    if cid not in to_return:
        return "open return (cond.common broken)"
    return "energised"


def _pump_reason(relay_coil_live, contactor_ok, line_ok, motor_ok, cap_ok, any_cmd):
    if not any_cmd:
        return "no zone commanded"
    if not relay_coil_live:
        return "relay coil not energised"
    if not line_ok:
        return "relay line broken"
    if not contactor_ok:
        return "contactor broken"
    if not cap_ok:
        return "start capacitor broken"
    if not motor_ok:
        return "motor broken"
    return "running"


# ============================================================================
# Piece 1 -- valve pilot-loop resolution (reachability, not a fault table)
# ============================================================================
def _path_passable(nodes, chain):
    """True iff every node in `chain` exists and is intact, and clogging does
    not block a single-purpose control orifice on the path."""
    for nid in chain:
        if nid not in nodes:
            return False
        c = nodes[nid]["condition"]
        if c == "broken":
            return False
        if c == "clogged":
            # a clogged control orifice (metering port, solenoid throat,
            # plunger seat) blocks its path -- its sole job is to pass that flow
            return False
    return True


def _resolve_valves(graph, nodes, elec, commanded):
    """Resolve each automatic valve to {open, shut, weeping} from its own
    sub-part connectivity + coil energisation; the manual valve from command."""
    out = {}
    for z in ZONES:
        v = f"Z{z}.valve"
        coil_on = elec["coils"][z]

        fill_ok = _path_passable(nodes, [f"{v}.metering_port", f"{v}.chamber"])
        # also dead if the chamber/bonnet can't hold pressure
        if _cond(nodes, f"{v}.bonnet") == "broken":
            fill_ok = False

        bleed_solenoid = coil_on and _path_passable(
            nodes, [f"{v}.solenoid_entry", f"{v}.plunger", f"{v}.solenoid_exhaust"])
        bleed_screw = _cond(nodes, f"{v}.bleed_screw") in ("broken", "misconfigured")
        bleed_open = bleed_solenoid or bleed_screw

        diaphragm_intact = _cond(nodes, f"{v}.diaphragm") != "broken"
        seat_cond = _cond(nodes, f"{v}.seat")
        seat_seals = seat_cond != "broken"

        state, reason = _valve_state(diaphragm_intact, seat_seals,
                                     fill_ok, bleed_open, coil_on)
        out[f"Z{z}"] = {
            "state": state, "reason": reason, "coil_energised": coil_on,
            "fill_ok": fill_ok, "bleed_open": bleed_open,
            "diaphragm_intact": diaphragm_intact, "seat_seals": seat_seals,
            "seat_clogged": seat_cond == "clogged",
        }

    # manual zone: commanding it means the user opened the handle
    mv = f"Z{MANUAL_ZONE}.valve"
    seat_cond = _cond(nodes, f"{mv}.seat")
    commanded_open = MANUAL_ZONE in commanded
    if seat_cond == "broken":
        state, reason = "open" if commanded_open else "weeping", "seat won't seal"
    elif commanded_open:
        state, reason = "open", "handle open"
    else:
        state, reason = "shut", "handle closed"
    out[f"Z{MANUAL_ZONE}"] = {"state": state, "reason": reason,
                              "coil_energised": None,
                              "seat_clogged": seat_cond == "clogged"}
    return out


def _valve_state(diaphragm_intact, seat_seals, fill_ok, bleed_open, coil_on):
    if not diaphragm_intact:
        return "open", "diaphragm can't seat (uncommanded flow)"
    if not seat_seals:
        return ("open", "seat won't seal; energised") if bleed_open \
            else ("weeping", "seat won't seal when shut")
    if not fill_ok:
        # chamber never pressurises -> diaphragm never seats -> won't shut off
        return "open", "chamber can't fill (won't shut off)"
    if bleed_open:
        return "open", "energised, chamber bled"
    # chamber holds, diaphragm seats: shut
    if coil_on:
        return "shut", "commanded but can't bleed chamber (stuck shut)"
    return "shut", "de-energised, held shut"


# ============================================================================
# Piece 3 -- collapse + generalized (non-tree) flow solve
# ============================================================================
class Flow:
    """Active flow graph: a single-parent tree-with-internal-sinks built from
    the expanded sub-part nodes, after collapsing each valve to one edge."""

    def __init__(self, graph, nodes, valve_states, pump_head_ok):
        self.graph = graph
        self.nodes = nodes
        self.valve_states = valve_states
        self.pump_head_ok = pump_head_ok
        self.to: dict[str, list[str]] = {}
        self.parent: dict[str, str] = {}
        self.height: dict[str, float] = {}
        self.leaks: dict[str, float] = {}      # node -> leak orifice d_m
        self.hwc: dict[str, float] = {}        # hose node -> Hazen-Williams C
        self.add_loss_m: dict[str, float] = {}  # node -> extra inflow head loss
        self.nozzles: dict[str, dict] = {}     # nozzle-leaf -> head spec
        self.severed: set[str] = set()
        self._build()

    # -- component helpers ---------------------------------------------------
    def _kdef(self, comp):
        inst = self.graph["flow"].get(comp)
        return self.graph["kinds"].get(inst["kind"]) if inst else None

    def _build(self):
        flow = self.graph["flow"]
        kinds = self.graph["kinds"]

        # 1. raw sub-part flow adjacency from the expanded nodes
        for nid, n in self.nodes.items():
            if n["domain"] == "flow":
                self.to[nid] = [t for t in n["to"] if t in self.nodes]

        # 2. collapse every valve: drop interior, wire inlet->outlet per state
        for comp, inst in flow.items():
            kdef = kinds.get(inst["kind"])
            if not _is_component(kdef):
                continue
            if inst["kind"] in ("valve.auto", "valve.manual"):
                self._collapse_valve(comp, kdef)

        # 3. condition effects (leak / hw_c / sever / add_loss) on every part
        for nid, n in self.nodes.items():
            if n["domain"] != "flow":
                continue
            eff = _effect(n["kind"], n["condition"])
            if "leak" in eff:
                self.leaks[nid] = eff["leak"]
            if "hw_c" in eff:
                self.hwc[nid] = eff["hw_c"]
            if "add_loss_m" in eff:
                self.add_loss_m[nid] = eff.get("add_loss_m", 0.0)
            if eff.get("sever"):
                self.severed.add(nid)

        # 4. classify nozzle leaves (discharge points) with their head spec
        for comp, inst in flow.items():
            kind = inst["kind"]
            if kind in ("head.rotor", "head.spray"):
                self._register_head(comp, kind, kinds[kind])
            elif kind == "nozzle.stream":            # Z5 open-end leaf
                self.nozzles[comp] = {"type": "stream", "comp": comp,
                                      "d_m": LEAK_D_HOSE["hose.16"]}

        # 5. root the active graph at pump.outlet; compute parent + height
        self._root_and_height()

    def _collapse_valve(self, comp, kdef):
        in_p, out_p = f"{comp}.{kdef['in']}", f"{comp}.{kdef['out']}"
        interior = [f"{comp}.{p}" for p in kdef["parts"]
                    if p not in (kdef["in"], kdef["out"])]
        # detach interior from the active flow adjacency
        for nid in interior:
            self.to.pop(nid, None)
        self.to[in_p] = []
        state = self.valve_states[comp.split(".")[0]]["state"]
        if state == "open":
            self.to[in_p] = [out_p]                  # pass (loss applied later)
        elif state == "weeping":
            # not-quite-sealing: no real supply downstream, just a trickle that
            # escapes at the valve -- a small leak sink fed off the live inlet.
            self.leaks[in_p] = WEEP_D
        # state == "shut": no edge, no leak -> outlet + downstream get no supply

    def _register_head(self, comp, kind, kdef):
        inlet = f"{comp}.{kdef['in']}"
        p = self.nodes[inlet]["params"]
        nz = f"{comp}.nozzle"
        spec = {"comp": comp, "inlet": inlet,
                "nozzle": str(p.get("nozzle", "")),
                "arc": float(p.get("arc", 180)),
                "deregulate": _cond(self.nodes, f"{comp}.regulator") == "broken"}
        if kind == "head.rotor":
            spec["type"] = "rotor"
            spec["num"] = spec["nozzle"].split()[0] if spec["nozzle"] else "3.0"
            spec["scale"] = self._nozzle_scale(comp, rotor=True)
        else:
            spec["type"] = "spray"
            spec["model"] = spec["nozzle"] or "MP2000"
            spec["scale"] = self._nozzle_scale(comp, rotor=False)
        # a broken thread/body upstream is a `sever` (see _effect): the BFS stops
        # there, so the nozzle simply never becomes reachable -> graded dead.
        self.nozzles[nz] = spec

    def _nozzle_scale(self, comp, rotor):
        s = 1.0
        ne = _effect("nozzle", _cond(self.nodes, f"{comp}.nozzle"))
        s *= ne.get("scale", 1.0)
        if rotor:                                    # rotor filter restricts too
            fe = _effect("filter", _cond(self.nodes, f"{comp}.filter"))
            s *= fe.get("scale", 1.0)
        return s

    def _root_and_height(self):
        root = "pump.outlet"
        # BFS from the pump discharge over active edges, recording one parent
        self.parent = {root: None}
        order = [root]
        i = 0
        while i < len(order):
            cur = order[i]
            i += 1
            if cur in self.severed:    # snapped union: stays live (leaks) but
                continue               # carries no flow past itself
            for c in self.to.get(cur, []):
                if c not in self.parent:
                    self.parent[c] = cur
                    order.append(c)
                elif self.parent[c] != cur:
                    raise ValueError(
                        f"collapsed flow graph is not single-parent at {c!r} "
                        f"({self.parent[c]!r} and {cur!r}); a network solver "
                        f"would be required")
        self.order = order                           # topological (BFS) order
        self.active = set(order)

        # heights: inherit down the tree; a node's own h_m wins
        z_pump = self.nodes["pump.foot_valve"]["params"].get("h_m", 7.2)
        self.height[root] = z_pump
        for nid in order:
            if nid == root:
                continue
            h = self.nodes[nid]["params"].get("h_m")
            self.height[nid] = h if h is not None else self.height[self.parent[nid]]
        self.z_pump = z_pump

    # -- per-leaf discharge from local pressure ------------------------------
    def discharge(self, nid, p_bar):
        if nid in self.nozzles:
            return self._nozzle_q(self.nozzles[nid], p_bar)
        if nid in self.leaks:                        # leak sink: free discharge
            return free_discharge_m3h(self.leaks[nid], max(p_bar, 0.0))
        return 0.0

    def _nozzle_q(self, spec, p_bar):
        p = max(p_bar, 0.0)
        t = spec["type"]
        if t == "rotor":
            q = i20_flow_m3h(spec["num"], p)[0]
        elif t == "spray":
            if spec["deregulate"]:                   # no regulation: q ~ sqrt(p)
                from hydraulics import _mp_arc_flow_m3h
                base = _mp_arc_flow_m3h(spec["model"], spec["arc"])
                q = base * math.sqrt(p / MP_REG_BAR) if p > 0 else 0.0
            else:
                q = mp_flow_m3h(spec["model"], spec["arc"], p)[0]
        else:                                        # stream (Z5)
            q = free_discharge_m3h(spec["d_m"], p)
        return q * spec.get("scale", 1.0)

    def is_sink(self, nid):
        return nid in self.nozzles or nid in self.leaks


def _pick_pump(nodes):
    """Nearest JET curve to the pump's rated bar (mirrors hydraulics)."""
    bar = nodes.get("pump.foot_valve", {}).get("params", {}).get("bar")
    if not bar:
        return DEFAULT_PUMP
    target = bar * M_PER_BAR
    return min(PUMP_CURVES, key=lambda m: abs(PUMP_CURVES[m]["h"][0] - target))


def _edge_loss_m(fl: Flow, child: str, q_m3h: float) -> float:
    """Head loss on the edge feeding `child`: elevation + friction + valve +
    minor + any condition-added loss."""
    parent = fl.parent[child]
    loss = fl.height[child] - fl.height[parent]      # elevation rise
    n = fl.nodes[child]
    kind = n["kind"]
    if kind.startswith("hose."):
        c = fl.hwc.get(child, HW_C_OK)
        loss += hazen_williams_m(q_m3h, hose_inner_d_m(kind),
                                 float(n["params"].get("len_m", 0.0)), c)
    if kind == "swing":
        loss += SJ_LOSS_BAR * M_PER_BAR
    # collapsed valve edge: inlet->outlet (open valve) carries the valve loss
    if child.endswith(".outlet") and _is_valve_outlet(fl, child):
        comp = child.rsplit(".", 1)[0]
        vs = fl.valve_states[comp.split(".")[0]]
        loss += valve_loss_bar(q_m3h, VALVE_CV) * M_PER_BAR
        if vs.get("seat_clogged"):
            loss += VALVE_LOSS_CLOGGED_BAR * M_PER_BAR
    loss += fl.add_loss_m.get(child, 0.0)
    return loss


def _is_valve_outlet(fl, nid):
    comp = nid.rsplit(".", 1)[0]
    inst = fl.graph["flow"].get(comp)
    return bool(inst) and inst["kind"] in ("valve.auto", "valve.manual")


def _solve_hydraulic(fl: Flow, pump_model, env):
    """Coupled pressure<->flow Picard over the active graph. Returns
    (q_leaf, p_node, dem, pump_head_m, converged, head_ok). All sinks share the
    pump curve + main line, so a leak on any branch draws the rest down.

    Chart heads (rotor/spray) use under-relaxed Picard; free-discharge sinks
    (open stream + leaks) are solved by bisection each pass -- their q~sqrt(p)
    response makes the plain fixed-point oscillate, but the available-vs-
    required head balance is monotonic in q, so bisection is stable."""
    z_well = env.get("well_water_level_m_asl", fl.z_pump)
    suction = env.get("suction_extra_loss_m", SUCTION_EXTRA_LOSS_M)
    for nid in ("pump.foot_valve", "pump.suction"):
        if _cond(fl.nodes, nid) == "clogged":
            suction += SUCTION_CLOG_LOSS_M
    head_ok = (fl.pump_head_ok
               and _cond(fl.nodes, "pump.impeller") != "broken"
               and _cond(fl.nodes, "pump.mech_seal") != "broken"
               and _cond(fl.nodes, "pump.foot_valve") != "broken")

    sinks = [nid for nid in fl.order if fl.is_sink(nid)]
    chart = [s for s in sinks if s in fl.nozzles
             and fl.nozzles[s]["type"] != "stream"]
    free = [s for s in sinks if s not in chart]   # streams + leaks
    q = {nid: 0.3 for nid in sinks}

    def pressures(qmap):
        dem = {}
        for nid in reversed(fl.order):
            d = qmap.get(nid, 0.0)
            for c in fl.to.get(nid, []):
                if fl.parent.get(c) == nid and c in fl.active:
                    d += dem.get(c, 0.0)
            dem[nid] = d
        total = dem.get("pump.outlet", 0.0)
        ph = pump_head_m(pump_model, total) if head_ok else 0.0
        p = {"pump.outlet": ph - (fl.z_pump - z_well) - suction}
        for nid in fl.order:
            if nid != "pump.outlet":
                p[nid] = p[fl.parent[nid]] - _edge_loss_m(fl, nid, dem.get(nid, 0.0))
        return p, dem, ph

    def solve_free(sink):
        """Exact free-discharge q holding all other sinks fixed (bisection)."""
        d_m = fl.leaks.get(sink) or fl.nozzles[sink]["d_m"]
        area = math.pi * (d_m / 2.0) ** 2
        cd = 0.97

        def resid(qx):
            trial = dict(q)
            trial[sink] = qx
            p, _, _ = pressures(trial)
            avail = max(p.get(sink, 0.0), 0.0)               # m head available
            v = (qx / 3600.0) / (cd * area) if area > 0 else 0.0
            return avail - v * v / (2.0 * G)                 # - required
        if resid(0.0) <= 0.0:
            return 0.0
        hi = 1.0
        while resid(hi) > 0.0 and hi < 60.0:
            hi *= 1.5
        lo = 0.0
        for _ in range(60):
            mid = 0.5 * (lo + hi)
            if resid(mid) > 0.0:
                lo = mid
            else:
                hi = mid
        return 0.5 * (lo + hi)

    converged = False
    for _ in range(MAX_ITERS):
        p, dem, ph = pressures(q)
        max_d = 0.0
        for nid in chart:
            p_bar = max(p.get(nid, 0.0), 0.0) / M_PER_BAR
            q_new = fl.discharge(nid, p_bar)
            relaxed = (1 - RELAX) * q[nid] + RELAX * q_new
            max_d = max(max_d, abs(relaxed - q[nid]))
            q[nid] = relaxed
        for nid in free:
            q_new = solve_free(nid)
            max_d = max(max_d, abs(q_new - q[nid]))
            q[nid] = q_new
        if max_d < SOLVE_TOL:
            converged = True
            break

    p, dem, ph = pressures(q)
    return q, p, dem, ph, converged, head_ok


# ============================================================================
# Grading + report
# ============================================================================
def _grade(spec, p_bar, q, baseline, commanded, severed, pump_running, valve_state):
    """Grade a head against its own healthy-baseline flow (a separate engine
    solve of the same commanded set with no faults) -- so cross-zone draw-down
    shows up as 'weak vs its healthy self', and streams (legitimately near-
    atmospheric at the open end) grade on flow, not nozzle pressure."""
    if not pump_running:
        return "dead", "pump not running"
    if valve_state in ("shut", "weeping"):
        return "dead", f"valve {valve_state}"
    if severed:
        return "dead", "supply line broken"
    if q <= DEAD_Q:
        return "dead", "no flow"
    if spec["type"] == "rotor" and p_bar < POP_BAR:
        return "won't-pop", f"below pop pressure {POP_BAR} bar"
    if not commanded:
        return "full", "uncommanded (valve stuck open)"
    if baseline > DEAD_Q and q < WEAK_FRAC * baseline:
        if spec["type"] == "spray" and p_bar < REG_MIN:
            return "weak", "under-regulated (below 3.5 bar)"
        return "weak", "flow below healthy baseline"
    return "full", "ok"


def _zone_of(nid):
    return nid.split(".")[0]


def _solve_pipeline(commanded, conditions, concurrent, graph_path, env):
    graph, nodes, axis = _load_and_expand(conditions, graph_path)
    elec = _resolve_electrical(graph, nodes, commanded)
    valve_states = _resolve_valves(graph, nodes, elec, commanded)
    fl = Flow(graph, nodes, valve_states, elec["pump_running"])
    pump_model = _pick_pump(nodes)
    q, p, dem, pump_h, converged, head_ok = _solve_hydraulic(fl, pump_model, env)
    return {"graph": graph, "nodes": nodes, "elec": elec,
            "valve_states": valve_states, "fl": fl, "pump_model": pump_model,
            "q": q, "p": p, "dem": dem, "pump_h": pump_h,
            "converged": converged, "head_ok": head_ok}


def simulate(commanded_zones, conditions=None, concurrent_zones=None,
             graph_path=GRAPH, env_overrides=None):
    commanded = sorted(set(commanded_zones or []))
    env = dict(env_overrides or {})
    R = _solve_pipeline(commanded, conditions, concurrent_zones, graph_path, env)
    # healthy baseline (same commanded set, no faults) -> per-nozzle reference
    B = _solve_pipeline(commanded, {}, concurrent_zones, graph_path, env)
    baseline = {nz: B["q"].get(nz, 0.0) for nz in B["fl"].nozzles}

    return _build_report(R["graph"], R["nodes"], commanded, concurrent_zones,
                         R["elec"], R["valve_states"], R["fl"], R["q"], R["p"],
                         R["dem"], R["pump_h"], R["converged"], R["head_ok"],
                         R["pump_model"], baseline)


def _build_report(graph, nodes, commanded, concurrent, elec, valve_states, fl,
                  q, p, dem, pump_h, converged, head_ok, pump_model, baseline):
    pump_running = elec["pump_running"]
    total = dem.get("pump.outlet", 0.0)

    # per-zone, per-head
    zones_out = []
    zone_heads: dict[int, list] = {z: [] for z in list(ZONES) + [MANUAL_ZONE]}
    for nz, spec in fl.nozzles.items():
        z = int(_zone_of(spec["comp"])[1:])
        p_bar = max(p.get(nz, 0.0), 0.0) / M_PER_BAR
        flow = q.get(nz, 0.0)
        nominal = baseline.get(nz, 0.0)
        vs = valve_states[f"Z{z}"]["state"]
        severed = nz in fl.severed or nz not in fl.active
        grade, reason = _grade(spec, p_bar, flow, nominal, z in commanded,
                               severed, pump_running, vs)
        kind = {"rotor": "I-20", "spray": spec.get("model", "MP"),
                "stream": "stream"}[spec["type"]]
        zone_heads[z].append({
            "loc": spec["comp"], "kind": kind,
            "spec": spec.get("nozzle") or kind,
            "arc_deg": int(spec.get("arc", 0)) or None,
            "pressure_bar": round(p_bar, 3), "flow_m3h": round(flow, 4),
            "nominal_m3h": round(nominal, 4), "grade": grade, "reason": reason,
        })

    for z in list(ZONES) + [MANUAL_ZONE]:
        heads = sorted(zone_heads[z], key=lambda h: h["loc"])
        zflow = round(sum(h["flow_m3h"] for h in heads), 4)
        zones_out.append({
            "id": z, "commanded": z in commanded,
            "valve_state": valve_states[f"Z{z}"]["state"],
            "valve_reason": valve_states[f"Z{z}"]["reason"],
            "flow_m3h": zflow, "heads": heads,
        })

    # leaks
    leaks = []
    for nid in fl.leaks:
        if nid in fl.active and q.get(nid, 0.0) <= 0 and not fl.is_sink(nid):
            continue
        fq = fl.discharge(nid, max(p.get(nid, 0.0), 0.0) / M_PER_BAR) \
            if nid in fl.active else 0.0
        if nid in fl.active and fq > DEAD_Q:
            leaks.append({"loc": nid, "kind": _leak_kind(nodes, nid),
                          "flow_m3h": round(fq, 4),
                          "pressure_bar": round(max(p.get(nid, 0.0), 0.0) / M_PER_BAR, 3)})
    leaks.sort(key=lambda l: -l["flow_m3h"])

    headline = _headline(zones_out, leaks, elec, valve_states, commanded)
    return {
        "summary": {
            "commanded_zones": commanded,
            "concurrent_zones": sorted(set(concurrent)) if concurrent else commanded,
            "pump_running": pump_running, "total_flow_m3h": round(total, 4),
            "headline": headline, "converged": converged,
        },
        "electrical": {
            "coils": {z: elec["coils"][z] for z in ZONES},
            "coil_reasons": {z: elec["coil_reasons"][z] for z in ZONES},
            "pump_running": pump_running, "pump_reason": elec["pump_reason"],
            "pump_head_available": head_ok,
        },
        "valves": valve_states,
        "zones": zones_out,
        "leaks": leaks,
        "pump": {"running": pump_running, "model": pump_model,
                 "flow_m3h": round(total, 4), "head_m": round(pump_h, 2),
                 "head_bar": round(pump_h / M_PER_BAR, 3)},
        "node_pressures_bar": {
            "pump_discharge": round(max(p.get("pump.outlet", 0.0), 0.0) / M_PER_BAR, 3),
            "manifold_inlet": round(max(p.get("mani.inlet", 0.0), 0.0) / M_PER_BAR, 3),
        },
        "assumptions": {"pump_model": pump_model, "weep_orifice_m": WEEP_D,
                        "hw_c_clogged": HW_C_CLOGGED,
                        "grading": {"pop_bar": POP_BAR, "reg_min_bar": REG_MIN,
                                    "weak_frac": WEAK_FRAC}},
    }


def _leak_kind(nodes, nid):
    k = nodes[nid]["kind"]
    c = nodes[nid]["condition"]
    return f"{k} {c}"


def _headline(zones, leaks, elec, valve_states, commanded):
    if not commanded:
        return "no zones commanded"
    if not elec["pump_running"]:
        return f"pump not running ({elec['pump_reason']}) — nothing waters"
    cmd = [z for z in zones if z["commanded"]]
    weak = [z["id"] for z in cmd
            if any(h["grade"] in ("weak", "won't-pop") for h in z["heads"])]
    dead = [z["id"] for z in cmd
            if z["heads"] and all(h["grade"] == "dead" for h in z["heads"])]
    rogue = [z["id"] for z in zones
             if not z["commanded"] and z["flow_m3h"] > DEAD_Q]
    bits = []
    if dead:
        bits.append("zones " + ",".join(map(str, dead)) + " dead")
    if weak:
        bits.append("zones " + ",".join(map(str, weak)) + " weak")
    if rogue:
        bits.append("zones " + ",".join(map(str, rogue)) + " running while off")
    if leaks:
        bits.append(f"{len(leaks)} leak(s), biggest at {leaks[0]['loc']}")
    return "; ".join(bits) if bits else "all commanded zones full"


# ============================================================================
# CLI
# ============================================================================
def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    payload = {}
    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            payload = json.loads(raw)
    try:
        report = simulate(
            payload.get("commanded_zones", []),
            payload.get("conditions", {}),
            payload.get("concurrent_zones"),
            env_overrides=payload.get("env"),
        )
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 1
    json.dump(report, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
