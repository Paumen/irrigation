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

// An auto-valve's flow-control screw scales its effective opening: 1 = factory-open,
// smaller = throttled. At or below this fraction the screw is seated and the valve is
// mechanically shut (and the 1/t² loss scaling stays finite).
export const THROTTLE_MIN = 0.05;

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

// --- schematic display (layout.js / scene.js) ---

// Pressure color scale tops out near the pump's dead-head (48.3 m ~ 4.7 bar), so the
// red end of the ramp means "as high as this system can go".
export const P_COLOR_MAX_BAR = 5.0;
// Stroke width ramps from idle to the pump curve's last point (its max flow), so the
// boldest line means "everything the pump can deliver runs through here".
export const Q_STROKE_MAX_M3H = 4.8;
export const STROKE_MIN_PX = 1.5;
export const STROKE_MAX_PX = 8;
// The electrical schematic is laid out independently and drawn in a reserved band
// this far below the hydraulic schematic.
export const CIRCUIT_BAND_GAP = 60;
// Unfilled (dead-branch) and idle elements render in this grey, dashed.
export const DEAD_COLOR = "#9aa0a6";

// Control panel changes re-solve after this quiet period, so a slider drag coalesces
// into one solve instead of one per tick (app.js).
export const DEBOUNCE_MS = 150;
