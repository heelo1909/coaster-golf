// Every tuning number for the simulation lives here (see sim/CLAUDE.md). Any change after
// playtesting gets a line in progress.md, because it changes which equations win.

// Distance in x between track samples, in world units (1 grid square = 1 unit).
export const SAMPLE_STEP = 0.01;

// Step for the central differences that give the track's slope and curvature.
export const DERIVATIVE_STEP = 1e-4;

// Gravity, in units per second squared, pulling the cart along the slope.
export const G = 9.81;

// Linear drag: the cart loses DRAG·v of speed per second, a small steady friction.
export const DRAG = 0.02;

// Fixed physics timestep in seconds. Never vary it: the result must not depend on frame rate.
export const DT = 1 / 240;

// A run that hasn't reached the end station after this many seconds is a TIMEOUT.
export const MAX_TIME = 30;

// How far, in y, the track may pass from a station and still count as passing through it.
export const STATION_TOLERANCE = 0.25;

// |f'(x)| above this is a vertical wall, which counts as BROKEN_TRACK.
export const MAX_SLOPE = 20;

// |Δy| between two neighboring samples above this is a gap in the track (BROKEN_TRACK).
export const JUMP_THRESHOLD = 0.5;

// The cart is a circle of this radius sitting on top of the track, used for obstacle hits.
export const CART_RADIUS = 0.2;
