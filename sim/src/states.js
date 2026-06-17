// Qualitative state layer (M5). The EPANET solve + solveElectrical stay the physics authority;
// this module *projects* each component's named `states:` (from system.yaml) onto a per-instance
// state vector and *evaluates* the remaining qualitative rules (the intermediate valve mechanism,
// the suction/prime chain) to a fixpoint over `needs`/`needs_any`. Where a state is both projected
// from the solve AND carries a rule, the two are cross-checked.
//
// Three buckets, mirroring docs/sim_build_plan.md:
//   - grounded by the solve  : electrical live/dead, valve open/closed, *.pressurised, head watering
//   - rule-evaluated         : diaphragm / bonnet-chamber / pilot_seat / plunger, valve open (cross),
//                              the suction wet/dry chain + pump prime (M5 uses an env default; M9
//                              makes the well-dry condition fault-injectable)
//   - leaf inputs            : control positions (flow_control / bleed_screw / handle / flo_stop)
//                              and the environment (well wet/dry, priming-chamber wet/dry)

import { typeOf } from "./model.js";
import { PRESSURISED_BAR } from "./config.js";

const epOf = (id) => id.replace(/\./g, "_");
const prefixOf = (id) => {
  const m = /^([A-Za-z]+\d+)_/.exec(id);
  return m ? m[1] : null;
};
const zoneOf = (id) => {
  const m = /^Z(\d+)_/.exec(id);
  return m ? Number(m[1]) : null;
};

// Every declared state variable is binary; these are the complementary value pairs, and POSITIVE
// names the member whose truth the engine tracks (its sibling is just the negation).
const COMPLEMENT = {
  wet: "dry", dry: "wet",
  live: "dead", dead: "live",
  primed: "unprimed", unprimed: "primed",
  pressurised: "unpressurised", unpressurised: "pressurised",
  open: "closed", closed: "open",
  up: "down", down: "up",
  watering: "off", off: "watering",
};
const POSITIVE = new Set(["wet", "live", "primed", "pressurised", "open", "up", "watering"]);

const hasRule = (def) => !!def && (Array.isArray(def.needs) || Array.isArray(def.needs_any));
// A top-level states entry is a sub-state GROUP (e.g. `diaphragm`, `bonnet/chamber`) when it is a
// non-empty object that is not itself a `needs`/`needs_any` rule; otherwise it is a primary value
// of the kind's own state (`primed`, `pressurised`, `wet`, …), which may be `{}` or a rule.
const isGroupDef = (def) =>
  def && typeof def === "object" && !("needs" in def) && !("needs_any" in def) && Object.keys(def).length > 0;

function axisOf(values) {
  if (values.length !== 2) {
    throw new Error(`states: expected a binary variable, got values [${values.join(", ")}]`);
  }
  const [a, b] = values;
  if (COMPLEMENT[a] !== b) throw new Error(`states: "${a}"/"${b}" are not a known complementary pair`);
  const pos = POSITIVE.has(a) ? a : b;
  return { pos, neg: COMPLEMENT[pos] };
}

// Parse a kind's `states:` block into binary variables. group "" is the kind's own (primary) state,
// which may carry more than one axis (pump.jet has both primed/unprimed and pressurised/unpressurised).
function parseKindStates(states) {
  const variables = []; // {key, group, pos, neg}
  const defs = new Map(); // `${group}\0${value}` -> value def
  const groupNames = new Set();
  const primaryNames = [];

  for (const [name, def] of Object.entries(states || {})) {
    if (isGroupDef(def)) {
      groupNames.add(name);
      const values = Object.keys(def);
      for (const [v, vd] of Object.entries(def)) defs.set(`${name}\0${v}`, vd);
      const { pos, neg } = axisOf(values);
      variables.push({ key: name, group: name, pos, neg });
    } else {
      primaryNames.push(name);
      defs.set(`\0${name}`, def);
    }
  }
  // Pair the primary values into one axis each.
  const used = new Set();
  for (const name of primaryNames) {
    if (used.has(name)) continue;
    const mate = COMPLEMENT[name];
    if (!mate || !primaryNames.includes(mate)) {
      throw new Error(`states: primary value "${name}" has no complementary value declared`);
    }
    used.add(name);
    used.add(mate);
    const pos = POSITIVE.has(name) ? name : mate;
    variables.push({ key: pos, group: "", pos, neg: COMPLEMENT[pos] });
  }

  const variableByKey = new Map(variables.map((v) => [v.key, v]));
  return { variables, variableByKey, groupNames, defOf: (group, value) => defs.get(`${group}\0${value}`) };
}

// Resolver: maps `<comp>[/sub] = <value>` references onto a concrete (instanceId, group). Scope is
// nearest-first: (1) the referencing instance's own sub-state group, (2) the same kind = self,
// (3) a single same-prefix instance of the kind, (4) the unique system-wide instance of the kind.
export function buildStateResolver(model) {
  const descCache = new Map();
  const descOf = (kind) => {
    if (!descCache.has(kind)) {
      const states = model.components?.[kind]?.states;
      descCache.set(kind, parseKindStates(states || {}));
    }
    return descCache.get(kind);
  };

  const instances = new Map(); // id -> {id, kind, prefix, desc}
  const byKind = new Map();
  const byPrefixKind = new Map();
  const register = (id) => {
    if (instances.has(id)) return;
    const node = model.flowNodes?.get(id);
    if (node?.synthetic) return;
    const kind = typeOf(id);
    const states = model.components?.[kind]?.states;
    if (!states || Object.keys(states).length === 0) return;
    const prefix = prefixOf(id);
    const inst = { id, kind, prefix, desc: descOf(kind) };
    instances.set(id, inst);
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(id);
    const pk = `${prefix}\0${kind}`;
    if (!byPrefixKind.has(pk)) byPrefixKind.set(pk, []);
    byPrefixKind.get(pk).push(id);
  };
  for (const id of model.flowNodes?.keys() || []) register(id);
  for (const id of Object.keys(model.electrical || {})) register(id);

  function resolveRef(fromId, token) {
    const from = instances.get(fromId);
    if (!from) throw new Error(`states: reference from unknown instance "${fromId}"`);
    // (1) a sub-state group of the referencing instance itself
    if (from.desc.groupNames.has(token)) return { id: fromId, group: token };
    const slash = token.indexOf("/");
    const kind = slash === -1 ? token : token.slice(0, slash);
    const group = slash === -1 ? "" : token.slice(slash + 1);
    // (2) same kind -> self (covers self-references even where a zone has several of the kind)
    if (kind === from.kind) return { id: fromId, group };
    // (3) a single instance sharing the referencing instance's prefix/scope
    const samePrefix = byPrefixKind.get(`${from.prefix}\0${kind}`) || [];
    if (samePrefix.length === 1) return { id: samePrefix[0], group };
    if (samePrefix.length > 1) {
      throw new Error(`states: "${token}" from ${fromId} is ambiguous (${samePrefix.join(", ")})`);
    }
    // (4) the unique system-wide instance of the kind
    const global = byKind.get(kind) || [];
    if (global.length === 1) return { id: global[0], group };
    if (global.length > 1) {
      throw new Error(`states: "${token}" from ${fromId} is ambiguous system-wide (${global.join(", ")})`);
    }
    throw new Error(`states: "${token}" from ${fromId} resolves to no instance of kind "${kind}"`);
  }

  return { instances, descOf, resolveRef };
}

// Build-time completeness check: every reference resolves unambiguously and names a declared value.
export function validateStateResolver(model, resolver = buildStateResolver(model)) {
  const errors = [];
  for (const inst of resolver.instances.values()) {
    for (const v of inst.desc.variables) {
      for (const value of [v.pos, v.neg]) {
        const def = inst.desc.defOf(v.group, value);
        const refs = [...(def?.needs || []), ...(def?.needs_any || [])];
        for (const ref of refs) {
          const [token, target] = ref.split("=").map((s) => s.trim());
          try {
            const t = resolver.resolveRef(inst.id, token);
            const tdesc = resolver.descOf(typeOf(t.id));
            const known = tdesc.variables.some((tv) => t.group === tv.group && (target === tv.pos || target === tv.neg));
            if (!known) errors.push(`${inst.id}: "${ref}" -> ${t.id} has no value "${target}" in group "${t.group}"`);
          } catch (e) {
            errors.push(`${inst.id}: ${e.message}`);
          }
        }
      }
    }
  }
  if (errors.length) throw new Error(`states: resolver validation failed:\n  ${errors.join("\n  ")}`);
  return resolver;
}

// Variables whose grounded projection is also derivable from the yaml rules, and where the rule is
// expected to be faithful (so a mismatch is a genuine model error). The electrical live/dead chain
// is deliberately excluded: its yaml rules are coarse (they cannot see wire-level breaks the
// electrical solve resolves), so projection — not the rule — is authoritative there.
const CROSSCHECK_KEYS = new Set(["open", "pressurised", "watering"]);

export function computeStates(model, opts = {}) {
  const { elec = {}, hyd = {}, state = {}, env = {}, faults = null, resolver = buildStateResolver(model) } = opts;

  const pressureBar = hyd.pressureBar || {};
  const reachable = hyd.reachable || new Set();
  const demands = hyd.demands || new Map();
  const valveOpen = hyd.valveOpen || {};
  const pumpOn = hyd.pumpOn ?? !!(elec.pumpPowered && !(faults && faults.pumpDisabled));

  const zoneEnergised = elec.zoneEnergised || {};
  const socketLive = elec.socketLive || {};

  const manualOpen = state.manualOpen || {};
  const bleedOpen = state.bleedOpen || {};
  const throttle = state.throttle || {};
  const floStop = state.floStop || {};
  const solenoidBleed = state.solenoidBleed || {};
  const wellWet = env.wellWet ?? true;
  const primingChamberWet = env.primingChamberWet ?? true;
  const bleedForcedOpen = faults?.bleedForcedOpen || new Set();

  // EPANET reports gauge pressure on junctions only; pipes/swing-joints (link-role flow nodes) carry
  // no node pressure, so a reachable link is pressurised whenever the pump is driving the branch.
  const isLinkNode = (id) => {
    const role = model.flowNodes?.get(id)?.role;
    return role === "pipe" || role === "pump" || role === "valve-auto" || role === "valve-manual";
  };
  const isPressurised = (id) => {
    if (!reachable.has(id)) return false;
    if (isLinkNode(id)) return pumpOn;
    return Number.isFinite(pressureBar[epOf(id)]) && pressureBar[epOf(id)] >= PRESSURISED_BAR;
  };

  // Grounded truth of a variable's positive value, or undefined when the variable is rule-derived.
  function groundedPos(inst, v) {
    const { kind, id } = inst;
    if (v.key === "pressurised") return kind === "pump.jet" ? pumpOn : isPressurised(id);
    if (v.key === "watering") return (demands.get(id) || 0) > 0;
    if (kind === "source.socket" && v.key === "live") return !!socketLive[id];
    if (kind === "control.controller" && v.group.startsWith("transformer")) return !!elec.controllerPowered;
    if (kind === "control.controller" && v.group.startsWith("terminals")) return !!elec.controllerPowered;
    if (kind === "relay.pumpstart" && v.group === "coil") return !!elec.relayCoil;
    if (kind === "relay.pumpstart" && v.group === "load") return !!elec.pumpPowered;
    if (kind === "valve.auto" && v.group === "solenoid/coil") return !!zoneEnergised[zoneOf(id)];
    if ((kind === "valve.auto" || kind === "valve.manual") && v.key === "open") return !!valveOpen[id];
    if (v.group === "bonnet/flow_control") return (throttle[id] ?? 1) > 0;
    if (v.group === "bonnet/bleed_screw") return !!bleedOpen[id] || bleedForcedOpen.has(id);
    if (v.group === "solenoid/bleed") return !!solenoidBleed[id];
    if (v.group === "handle") return !!manualOpen[id];
    if (v.group === "flo_stop") return floStop[id] !== false;
    if (kind === "source.well" && v.key === "wet") return wellWet;
    if (v.group === "body/priming_chamber") return primingChamberWet;
    return undefined;
  }

  // Evaluate the positive value's rule (using the *grounded/derived* truth of its dependencies),
  // ignoring any direct grounding of the variable itself — this is what cross-check compares.
  const memo = new Map();
  function evalRulePos(inst, v) {
    const posDef = inst.desc.defOf(v.group, v.pos);
    if (hasRule(posDef)) return evalRule(inst, posDef);
    const negDef = inst.desc.defOf(v.group, v.neg);
    if (hasRule(negDef)) return !evalRule(inst, negDef);
    return null; // pure leaf, no rule to evaluate
  }

  // truth of the positive value, preferring the grounded projection, falling back to the rule.
  function truthPos(inst, v) {
    const key = `${inst.id}\0${v.key}`;
    if (memo.has(key)) {
      const m = memo.get(key);
      if (m === "PENDING") return false; // cycle guard — should not happen on the acyclic yaml
      return m;
    }
    memo.set(key, "PENDING");
    const g = groundedPos(inst, v);
    let result;
    if (g !== undefined) result = g;
    else {
      const r = evalRulePos(inst, v);
      result = r === null ? false : r;
    }
    memo.set(key, result);
    return result;
  }

  function evalRule(inst, def) {
    const refs = def.needs || def.needs_any;
    const all = !!def.needs;
    const test = (ref) => {
      const [token, target] = ref.split("=").map((s) => s.trim());
      const t = resolver.resolveRef(inst.id, token);
      const tInst = resolver.instances.get(t.id);
      const tv = tInst.desc.variables.find((x) => x.group === t.group && (x.pos === target || x.neg === target));
      const posTrue = truthPos(tInst, tv);
      return target === tv.pos ? posTrue : !posTrue;
    };
    return all ? refs.every(test) : refs.some(test);
  }

  // Project the per-instance state vector + run cross-checks.
  const states = {};
  const crossChecks = [];
  const mismatches = [];
  for (const inst of resolver.instances.values()) {
    const vec = {};
    for (const v of inst.desc.variables) {
      const g = groundedPos(inst, v);
      const posTrue = g !== undefined ? g : truthPos(inst, v);
      vec[v.key] = posTrue ? v.pos : v.neg;

      if (g !== undefined && CROSSCHECK_KEYS.has(v.key)) {
        const derived = evalRulePos(inst, v);
        if (derived !== null) {
          const projected = g;
          const ok = derived === projected;
          const record = {
            instance: inst.id,
            variable: v.key,
            projected: projected ? v.pos : v.neg,
            derived: derived ? v.pos : v.neg,
            ok,
          };
          crossChecks.push(record);
          if (!ok) mismatches.push(record);
        }
      }
    }
    states[inst.id] = vec;
  }

  return { states, crossChecks, mismatches };
}
