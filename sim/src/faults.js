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

export function compileFaults(_model, _active = {}) {
  return emptyEffects();
}
