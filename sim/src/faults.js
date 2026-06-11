import {
  CLOG_FULL,
  PILOT_CLOG_BLOCKS,
  PUMP_CLOG_LOSS,
  LEAK_BORE_MM,
  DRIP_BORE_MM,
  LEAK_CD,
  FLUSH_BORE_MM,
  FLUSH_CD,
  WRONG_STREAM_BORE_SCALE,
} from "./config.js";
import { streamEmitterCoeff } from "./outlets.js";

const NODE_ROLES = new Set(["reservoir", "junction", "cap", "outlet"]);

// UI metadata: `inert` = declared but no steady-state effect; `threshold` = severities
// below it leave the settled state unchanged. Derived from SPECIAL/RULES so the UI never
// duplicates rule knowledge.
const specialKeyOf = (node, sub, type) =>
  sub ? `${node.kind}.${sub}:${type}` : `${node.kind}:${type}`;

function metaOf(node, sub, type) {
  const specialKey = specialKeyOf(node, sub, type);
  if (SPECIAL[specialKey]) return INERT_SPECIALS.has(specialKey) ? { inert: true } : {};
  const cell = `${groupOf(node, sub)}:${type}`;
  if (!RULES[cell]) return { inert: true };
  return cell in THRESHOLDS ? { threshold: THRESHOLDS[cell] } : {};
}

// Walk a `parts:` tree depth-first, yielding every sub-node by its dotted path. A
// sub-assembly node is its own component (may carry `fail:`) AND nests further parts.
function walkParts(parts, prefix, cb) {
  for (const [name, def] of Object.entries(parts || {})) {
    if (def === null || typeof def !== "object" || Array.isArray(def)) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    cb(path, def);
    if (def.parts) walkParts(def.parts, path, cb);
  }
}

// A part can appear on both flow and circuit sides (e.g. the pump motor); first wins.
export function listFaults(model) {
  const out = [];
  const seen = new Set();
  const push = (f) => {
    if (seen.has(f.key)) return;
    seen.add(f.key);
    f.severity = f.type === "clogged";
    out.push(f);
  };

  for (const n of model.flowNodes.values()) {
    const kindDef = model.kinds[n.kind];
    if (!kindDef) continue;
    for (const t of kindDef.fail || []) {
      push({ key: `${n.id}:${t}`, target: n.id, sub: null, type: t, side: "flow", ...metaOf(n, null, t) });
    }
    walkParts(kindDef.parts, "", (sub, def) => {
      for (const t of def.fail || []) {
        push({ key: `${n.id}.${sub}:${t}`, target: n.id, sub, type: t, side: "flow", ...metaOf(n, sub, t) });
      }
    });
  }

  const circuit = model.circuit || {};
  for (const [partName, part] of Object.entries(circuit.parts || {})) {
    if (part && part.kind) {
      // a circuit component defined by a kind: expand that kind's parts
      walkParts(model.kinds[part.kind]?.parts, "", (sub, def) => {
        for (const t of def.fail || []) {
          push({ key: `${partName}.${sub}:${t}`, target: partName, sub, type: t, side: "circuit" });
        }
      });
    } else if (part && typeof part === "object") {
      // inline terminal block (the common-return splice)
      walkParts(part, "", (sub, def) => {
        for (const t of def.fail || []) {
          push({ key: `${partName}.${sub}:${t}`, target: partName, sub, type: t, side: "circuit" });
        }
      });
    }
  }
  // each named cable is its own open-circuit fault, blocked by wire name
  for (const wireName of Object.keys(circuit.wires || {})) {
    push({ key: `${wireName}:broken`, target: wireName, sub: null, type: "broken", side: "wire" });
  }
  return out;
}

export function emptyEffects() {
  return {
    pumpDisabled: false,
    pumpHeadScale: 1,
    closedLinks: new Set(),
    linkK: new Map(),
    valveDisabled: new Set(),
    valveForcedOpen: new Set(),
    valveLossScale: new Map(),
    bleedForcedOpen: new Set(),
    leaks: new Map(),
    outletMods: new Map(),
    elecBlocked: new Set(),
  };
}

// Sharp-orifice minor-loss K on the full pipe velocity; a = open-area fraction.
function clogK(sev) {
  const a = 1 - sev;
  return (1 / (a * a) - 1) ** 2;
}

// First real (EPANET-junction) vertex downstream of a faulted element, where its
// escaping water is injected. Crossing the pump means a suction-side fault, which
// loses prime instead of leaking: return {suction:true}.
function anchorDownstream(model, id) {
  let n = model.flowNodes.get(id);
  while (n && !NODE_ROLES.has(n.role)) {
    if (n.role === "pump" && n.id !== id) return { suction: true };
    n = model.flowNodes.get(n.to[0]);
  }
  return n ? { node: n.id } : null;
}

function addLeak(fx, model, fromId, bore_mm) {
  const a = anchorDownstream(model, fromId);
  if (!a) return;
  if (a.suction) {
    fx.pumpDisabled = true;
    return;
  }
  const coeff = streamEmitterCoeff({ bore_mm, cd: LEAK_CD });
  fx.leaks.set(a.node, (fx.leaks.get(a.node) || 0) + coeff);
}

function restrictLink(fx, linkId, sev) {
  if (sev >= CLOG_FULL) fx.closedLinks.add(linkId);
  else fx.linkK.set(linkId, (fx.linkK.get(linkId) || 0) + clogK(sev));
}

function modOf(fx, outletId) {
  if (!fx.outletMods.has(outletId)) fx.outletMods.set(outletId, {});
  return fx.outletMods.get(outletId);
}

// Rotors swap to the largest other size; sprays to the first other family carrying
// the same arc (arc is fixed by install, so the swapped nozzle must keep it).
function wrongNozzle(fx, model, node) {
  const mod = modOf(fx, node.id);
  if (node.subkind === "rotor") {
    const cur = String(node.params.nozzle ?? "").match(/[\d.]+/)?.[0];
    const sizes = Object.keys(model.curves.nozzleI20.flow_m3h).sort((a, b) => a - b);
    mod.nozzle = [...sizes].reverse().find((s) => s !== cur) ?? cur;
  } else if (node.subkind === "spray") {
    const arc = String(node.params.arc);
    const families = Object.keys(model.curves.nozzleMp.flow_m3h_by_arc);
    const swap = families.find(
      (f) => f !== node.params.nozzle && model.curves.nozzleMp.flow_m3h_by_arc[f][arc],
    );
    if (swap) mod.nozzle = swap;
  }
}

// Maps (role, dotted sub) to the rule group. The leaf name carries the function; the
// path disambiguates only where a leaf repeats across sub-assemblies.
function groupOf(node, sub) {
  if (!sub) {
    if (node.role === "pipe") return "conduit";
    if (node.subkind === "stream") return "streamNozzle";
    return "fitting";
  }
  const leaf = sub.split(".").pop();
  if (node.role === "pump") {
    // venturi/impeller/diffuser all sit on the pumped path; a clog weakens the head curve
    if (["venturi", "impeller", "diffuser"].includes(leaf)) return "pumpPath";
    if (sub === "motor" || ["winding", "capacitor", "thermal_protector", "l", "n"].includes(leaf)) {
      return "pumpPower";
    }
    if (leaf === "mech_seal") return "shellSeal";
    if (leaf === "pe") return "cosmetic"; // motor earth: no functional effect
    return "fitting"; // hydraulic_end casing, priming_cap (SPECIAL)
  }
  if (node.role === "valve-auto" || node.role === "valve-manual") {
    if (["diaphragm", "seat", "spring"].includes(leaf)) return "valveSeal";
    if (leaf === "metering_port") return "pilotFill";
    if (["entry", "plunger", "exhaust"].includes(leaf)) return "pilotDrain";
    if (["coil", "lead_1", "lead_2"].includes(leaf)) return "valveElec";
    return "fitting";
  }
  if (node.role === "outlet") {
    if (["filter", "nozzle"].includes(leaf)) return "outletPath";
    if (["check_valve", "retract_spring", "gear", "arc"].includes(leaf)) return "cosmetic";
    if (["riser_seal", "wiper_seal"].includes(leaf)) return "shellSeal";
    return "fitting";
  }
  if (node.kind === "tank") {
    if (leaf === "shell") return "fitting"; // a split shell weeps -> leak
    return "cosmetic"; // bladder/pre_charge are cycling faults, inert at steady state
  }
  return "fitting";
}

// A missing (group x failtype) cell is a declared-but-inert fault.
const RULES = {
  "conduit:clogged": ({ fx, node, sev }) => restrictLink(fx, node.id, sev),
  "conduit:broken": ({ fx, model, node }) => addLeak(fx, model, node.id, LEAK_BORE_MM),
  "fitting:broken": ({ fx, model, node }) => addLeak(fx, model, node.id, LEAK_BORE_MM),
  "fitting:misconfigured": ({ fx, model, node }) => addLeak(fx, model, node.id, DRIP_BORE_MM),
  "shellSeal:broken": ({ fx, model, node }) => addLeak(fx, model, node.id, DRIP_BORE_MM),
  "pumpPath:clogged": ({ fx, sev }) => {
    if (sev >= CLOG_FULL) fx.pumpDisabled = true;
    else fx.pumpHeadScale *= 1 - PUMP_CLOG_LOSS * sev;
  },
  "pumpPath:broken": ({ fx }) => {
    fx.pumpDisabled = true;
  },
  "pumpPower:broken": ({ fx }) => {
    fx.pumpDisabled = true;
  },
  "pumpPower:misconfigured": ({ fx }) => {
    fx.pumpDisabled = true;
  },
  "valveSeal:broken": ({ fx, node }) => fx.valveForcedOpen.add(node.id),
  "valveSeal:clogged": ({ fx, node, sev }) => {
    // EPANET ignores minor losses on GPVs, so scale the loss curve, not linkK.
    if (sev >= CLOG_FULL) {
      fx.closedLinks.add(node.id);
      fx.valveDisabled.add(node.id);
    } else {
      const a = 1 - sev;
      fx.valveLossScale.set(node.id, (fx.valveLossScale.get(node.id) ?? 1) / (a * a));
    }
  },
  "pilotFill:clogged": ({ fx, node, sev }) => {
    // chamber can't pressurise -> diaphragm can't be pushed shut
    if (sev >= PILOT_CLOG_BLOCKS) fx.valveForcedOpen.add(node.id);
  },
  "pilotDrain:clogged": ({ fx, node, sev }) => {
    // chamber can't drain -> diaphragm can't lift, so the valve stays shut
    if (sev >= PILOT_CLOG_BLOCKS) fx.valveDisabled.add(node.id);
  },
  "pilotDrain:broken": ({ fx, node }) => fx.valveDisabled.add(node.id),
  // a broken solenoid coil or lead is an open circuit on that port
  "valveElec:broken": ({ fx, node, sub }) => fx.elecBlocked.add(`${node.id}.${sub}`),
  "outletPath:clogged": ({ fx, node, sev }) => {
    const mod = modOf(fx, node.id);
    mod.flowScale = (mod.flowScale ?? 1) * (1 - sev);
  },
  "outletPath:misconfigured": ({ fx, model, node }) => wrongNozzle(fx, model, node),
  "streamNozzle:clogged": ({ fx, node, sev }) => {
    const mod = modOf(fx, node.id);
    mod.flowScale = (mod.flowScale ?? 1) * (1 - sev);
  },
  "streamNozzle:misconfigured": ({ fx, node }) => {
    modOf(fx, node.id).bore_mm = node.params.bore_mm * WRONG_STREAM_BORE_SCALE;
  },
};

// Severity steps below these only slow actuation; the settled state is unchanged.
const THRESHOLDS = {
  "pilotFill:clogged": PILOT_CLOG_BLOCKS,
  "pilotDrain:clogged": PILOT_CLOG_BLOCKS,
};

// SPECIAL entries that are deliberate steady-state no-ops.
const INERT_SPECIALS = new Set(["valve.auto.bonnet.flow_control:broken"]);

// Part-specific overrides, keyed `<kind>.<dotted-sub>:<type>`, consulted before the table.
const SPECIAL = {
  // bleeds the chamber but pressure gating still applies, hence bleedForcedOpen
  // (not valveForcedOpen)
  "valve.auto.bonnet.bleed_screw:misconfigured": ({ fx, node }) => fx.bleedForcedOpen.add(node.id),
  "valve.auto.bonnet.bleed_screw:broken": ({ fx, model, node }) => {
    fx.valveForcedOpen.add(node.id);
    addLeak(fx, model, node.id, DRIP_BORE_MM);
  },
  "valve.auto.bonnet.flow_control:misconfigured": ({ fx, node }) => fx.valveDisabled.add(node.id),
  // broken flow-control stem is inert at steady state
  "valve.auto.bonnet.flow_control:broken": () => {},
  "valve.manual.handle:misconfigured": ({ fx, node }) => fx.valveDisabled.add(node.id),
  "pump.hydraulic_end.priming_cap:broken": ({ fx }) => {
    fx.pumpDisabled = true;
  },
  "pump.hydraulic_end.priming_cap:misconfigured": ({ fx }) => {
    fx.pumpDisabled = true;
  },
  "head.spray.regulator:broken": ({ fx, node }) => {
    modOf(fx, node.id).noClamp = true;
  },
  "head.spray.flush_plug:misconfigured": ({ fx, node }) => {
    modOf(fx, node.id).asOrifice = { bore_mm: FLUSH_BORE_MM, cd: FLUSH_CD };
  },
};

// active = { faultKey: true | 0..1 }; falsy = healthy. Unknown keys throw.
export function compileFaults(model, active = {}) {
  const fx = emptyEffects();
  const byKey = new Map(listFaults(model).map((f) => [f.key, f]));
  for (const [key, value] of Object.entries(active)) {
    if (!value) continue;
    const f = byKey.get(key);
    if (!f) throw new Error(`faults: unknown fault key "${key}"`);
    const sev = f.severity ? Math.min(Number(value), 1) : 1;
    if (f.side === "wire") {
      fx.elecBlocked.add(f.target);
      continue;
    }
    if (f.side === "circuit") {
      fx.elecBlocked.add(`${f.target}.${f.sub}`);
      continue;
    }
    const node = model.flowNodes.get(f.target);
    const rule = SPECIAL[specialKeyOf(node, f.sub, f.type)] ?? RULES[`${groupOf(node, f.sub)}:${f.type}`];
    rule?.({ fx, model, node, sev, sub: f.sub });
  }
  return fx;
}
