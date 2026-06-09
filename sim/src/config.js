// Tunable constants for the hydraulic core. Pure data, no imports.

export const M_PER_BAR = 10.197; // metres of water head per bar

// Outer fixed-point demand loop (solver.js).
export const ALPHA = 0.5; // demand damping: q_set = q_prev + ALPHA*(q_target - q_prev)
export const P_TOL_BAR = 1e-3; // convergence: max |Δpressure| over filled nodes
export const Q_TOL_M3H = 1e-4; // convergence: max |Δdemand| over outlets
export const MAX_ITERS = 60;
export const STABLE_ITERS = 2; // consecutive within-tolerance iterations required

// Auto-valve actuation. A diaphragm valve needs at least min_operating_bar at its
// inlet to LIFT even when energised — but once lifted, the drained control chamber
// holds the diaphragm open at much lower inlet pressure; the spring only re-seats it
// near zero (or when de-energised). The wide lift/stay asymmetry is therefore physical,
// and it is also what keeps the fixed point from flapping when several open zones pull
// the manifold down close to the lift threshold.
export const VALVE_OPEN_BAR = 1.5; // lift threshold; fallback when graph.yaml has no min_operating_bar
export const VALVE_STAY_BAR = 0.3; // stay open while inlet stays above this
// Safety net against actuation flapping: in the last iterations of the outer loop the
// valve states are frozen so the demand fixed point can settle (build plan: "freeze
// valve states for the last few iters"). Rarely engages; result.valvesFrozen reports it.
export const VALVE_FREEZE_TAIL = 12;

// MP-rotator spray heads have a built-in pressure regulator.
export const SPRAY_CLAMP_BAR = 2.76;

// Swing joints are modelled as a very short pipe carrying their k_minor; the
// length is physical-ish (riser height) and small enough that friction is negligible.
export const SWING_LEN_M = 0.3;

export const G = 9.81; // m/s^2, for the orifice discharge law

// EPANET [OPTIONS]
export const EPANET_TRIALS = 200;
export const EPANET_ACCURACY = 0.001;

// Defaults for synthetic connector pipes inserted where two flow nodes touch
// directly (e.g. manifold -> zone joint) with no hose between them.
export const CONNECTOR_LEN_M = 0.1;
export const CONNECTOR_DIAM_MM = 25;
export const DEFAULT_ROUGHNESS_MM = 0.0015;
