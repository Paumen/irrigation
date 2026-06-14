// M8 (the full role x failtype dispatch, listFaults, and SPECIAL overrides) is out of scope
// for this milestone. The solver still imports `emptyEffects` for its no-fault baseline, so
// this stub provides that plus a no-op `compileFaults`. The effect channels here are exactly
// what solveSteady / network.js / electrical.js read.

export function emptyEffects() {
  return {
    pumpDisabled: false, // motor dead despite power
    pumpHeadScale: 1, // weak-pump head multiplier
    closedLinks: new Set(), // links sealed shut (full clog)
    linkK: new Map(), // extra minor loss folded onto a link (partial clog)
    valveDisabled: new Set(), // valve cannot actuate
    valveForcedOpen: new Set(), // valve stuck/forced open
    valveLossScale: new Map(), // seat-clog scaling of a valve's loss curve
    bleedForcedOpen: new Set(), // bleed screw stuck open -> opens without command
    leaks: new Map(), // nodeId -> emitter coeff (orifice escape)
    outletMods: new Map(), // outletId -> {nozzle/arc override, flowScale, zeroFlow, ...}
    elecBlocked: new Set(), // electrical ports severed
  };
}

// No faults are injected this milestone; compiling any active set is deferred to M8.
export function compileFaults(_model, _active = {}) {
  return emptyEffects();
}
