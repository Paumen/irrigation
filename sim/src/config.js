// Tunable constants for the hydraulic core. Pure data, no imports.

export const M_PER_BAR = 10.197; // metres of water head per bar

// Outer fixed-point demand loop (solver.js).
export const ALPHA = 0.5; // demand damping: q_set = q_prev + ALPHA*(q_target - q_prev)
// When an outlet's update keeps flipping sign the local pressure->flow gain is too
// steep for ALPHA (e.g. behind a nearly-sealed clog): its step is halved per flip,
// down to this floor, and recovers gently while updates stay monotone.
export const ALPHA_MIN = 0.05;
// Starved-outlet and leak emitters fade out linearly below this pressure, so a point
// above the hydraulic grade line settles at zero flow instead of an unphysical
// negative emitter flow (EPANET emitters would suck water IN at negative pressure).
export const EMITTER_GATE_BAR = 0.02;
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

// --- fault model (faults.js) ---

// A clog's 0..1 severity is the blocked area fraction. At/above CLOG_FULL the line is
// sealed (closed link / dead pump); below, it becomes a sharp-orifice minor loss.
export const CLOG_FULL = 0.99;
// A clogged pilot port (metering port / solenoid path) only changes the settled state
// once it is substantially blocked — below this it merely slows actuation.
export const PILOT_CLOG_BLOCKS = 0.5;
// Pump-path clogs (suction/impeller/diffuser) scale the whole head curve down:
// scale = 1 - PUMP_CLOG_LOSS * severity (full clog kills the pump instead).
export const PUMP_CLOG_LOSS = 0.6;
// Representative escape orifices: a structural break gushes, a bad seal / loose
// thread weeps. Solved as EPANET emitters at the nearest real junction.
export const LEAK_BORE_MM = 6;
export const DRIP_BORE_MM = 2;
export const LEAK_CD = 0.62;
// A spray head with its flush plug left in (no nozzle) dumps as an open orifice.
export const FLUSH_BORE_MM = 5;
export const FLUSH_CD = 0.8;
// A mis-fitted stream nozzle: wrong (narrower) bore.
export const WRONG_STREAM_BORE_SCALE = 0.6;
