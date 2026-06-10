export const M_PER_BAR = 10.197; // metres of water head per bar

export const ALPHA = 0.5; // demand damping: q_set = q_prev + ALPHA*(q_target - q_prev)
export const ALPHA_MIN = 0.05; // floor for the per-flip halved step
// Emitters fade out linearly below this; EPANET emitters suck water IN at negative p.
export const EMITTER_GATE_BAR = 0.02;
export const P_TOL_BAR = 1e-3;
export const Q_TOL_M3H = 1e-4;
export const MAX_ITERS = 60;
export const STABLE_ITERS = 2; // consecutive within-tolerance iterations required

// The wide lift/stay asymmetry is physical: a diaphragm valve needs min_operating_bar
// to lift, but the drained chamber holds it open far lower until it nears zero. Do not
// collapse the two thresholds.
export const VALVE_OPEN_BAR = 1.5; // lift threshold; fallback when graph.yaml has no min_operating_bar
export const VALVE_STAY_BAR = 0.3; // stay open while inlet stays above this
// Freeze valve states for the last iters so the demand fixed point can settle.
export const VALVE_FREEZE_TAIL = 12;

export const SPRAY_CLAMP_BAR = 2.76; // MP-rotator built-in regulator clamp

// Flow-control screw opening fraction; at or below this the valve is treated as shut
// (also keeps the 1/t² loss scaling finite).
export const THROTTLE_MIN = 0.05;

// Swing joints modelled as a short pipe carrying their k_minor; friction negligible.
export const SWING_LEN_M = 0.3;

export const G = 9.81; // m/s^2, for the orifice discharge law

// EPANET [OPTIONS]
export const EPANET_TRIALS = 200;
export const EPANET_ACCURACY = 0.001;

// Synthetic connector pipes inserted where two flow nodes touch with no hose between.
export const CONNECTOR_LEN_M = 0.1;
export const CONNECTOR_DIAM_MM = 25;
export const DEFAULT_ROUGHNESS_MM = 0.0015;

// Clog severity is the blocked area fraction; at/above CLOG_FULL the line is sealed.
export const CLOG_FULL = 0.99;
// Below this a clogged pilot port only slows actuation, not the settled state.
export const PILOT_CLOG_BLOCKS = 0.5;
// Pump-path clog head scale = 1 - PUMP_CLOG_LOSS * severity.
export const PUMP_CLOG_LOSS = 0.6;
// Escape orifices (break gushes, seal weeps), solved as emitters at nearest junction.
export const LEAK_BORE_MM = 6;
export const DRIP_BORE_MM = 2;
export const LEAK_CD = 0.62;
// Spray head with flush plug left in (no nozzle), dumps as an open orifice.
export const FLUSH_BORE_MM = 5;
export const FLUSH_CD = 0.8;
export const WRONG_STREAM_BORE_SCALE = 0.6;
