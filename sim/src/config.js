export const M_PER_BAR = 10.197;

export const ALPHA = 0.5;
export const ALPHA_MIN = 0.05;
// Gate emitters off below this; EPANET emitters suck water IN at negative p.
export const EMITTER_GATE_BAR = 0.02;
export const P_TOL_BAR = 1e-3;
export const Q_TOL_M3H = 1e-4;
export const MAX_ITERS = 60;
export const STABLE_ITERS = 2;

// Lift/stay asymmetry is physical (diaphragm lifts at min_operating_bar, drained chamber
// holds open far lower). Do not collapse the two thresholds.
export const VALVE_OPEN_BAR = 1.5; // fallback when system.yaml has no min_operating_bar
export const VALVE_STAY_BAR = 0.3;
// Freeze valve states for the last iters so the demand fixed point can settle.
export const VALVE_FREEZE_TAIL = 12;

export const SPRAY_CLAMP_BAR = 2.76; // MP-rotator built-in regulator setpoint

// At or below this the throttle valve is treated as shut; also keeps the 1/t² loss scaling finite.
export const THROTTLE_MIN = 0.05;

export const SWING_LEN_M = 0.3;

export const G = 9.81;

export const EPANET_TRIALS = 200;
export const EPANET_ACCURACY = 0.001;

export const CONNECTOR_LEN_M = 0.1;
export const CONNECTOR_DIAM_MM = 25;
export const DEFAULT_ROUGHNESS_MM = 0.0015;

// Clog severity is blocked-area fraction; at/above this the line is sealed.
export const CLOG_FULL = 0.99;
// Below this a clogged pilot port only slows actuation, not the settled state.
export const PILOT_CLOG_BLOCKS = 0.5;
// Pump-path clog head scale = 1 - PUMP_CLOG_LOSS * severity.
export const PUMP_CLOG_LOSS = 0.6;
export const LEAK_BORE_MM = 6;
export const DRIP_BORE_MM = 2;
export const LEAK_CD = 0.62;
export const FLUSH_BORE_MM = 5;
export const FLUSH_CD = 0.8;
export const WRONG_STREAM_BORE_SCALE = 0.6;
