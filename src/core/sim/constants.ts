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
