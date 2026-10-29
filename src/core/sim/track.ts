import { DERIVATIVE_STEP, SAMPLE_STEP } from './constants';

// The track as the cart sees it: f sampled once, from the start station to the end station.
// Plain typed arrays (one entry per sample) so the step loop can read them without allocating.
export interface Track {
  count: number;
  x: Float64Array;
  y: Float64Array;
  slope: Float64Array; // f'(x)
  curvature: Float64Array; // signed: f'' / (1 + f'^2)^1.5, positive in a valley
}

// Samples f at from, from + step, from + 2·step, … and always exactly at `to`, so the end
// station is on the track even when the range isn't a whole number of steps. Each x is
// from + i·step (never a running sum), so rounding can't drift along a long track.
// A NaN from f stays NaN in y, slope and curvature; spotting broken track is the caller's job.
export function sampleTrack(
  f: (x: number) => number,
  from: number,
  to: number,
  step: number = SAMPLE_STEP,
): Track {
  if (!Number.isFinite(from) || !Number.isFinite(to) || !(from < to)) {
    throw new RangeError(`sampleTrack needs finite from < to, got ${from} and ${to}`);
  }
  if (!Number.isFinite(step) || !(step > 0)) {
    throw new RangeError(`sampleTrack needs a positive step, got ${step}`);
  }

  // The small allowance stops (3 - 0) / 0.01 = 300.00000000000006 from adding a sliver step.
  const intervals = Math.max(1, Math.ceil((to - from) / step - 1e-9));
  const count = intervals + 1;
  const track: Track = {
    count,
    x: new Float64Array(count),
    y: new Float64Array(count),
    slope: new Float64Array(count),
    curvature: new Float64Array(count),
  };

  const h = DERIVATIVE_STEP;
  for (let i = 0; i < count; i++) {
    const x = i === intervals ? to : from + i * step;
    const y = f(x);
    const before = f(x - h);
    const after = f(x + h);
    const slope = (after - before) / (2 * h);
    const second = (after - 2 * y + before) / (h * h);
    track.x[i] = x;
    track.y[i] = y;
    track.slope[i] = slope;
    track.curvature[i] = second / (1 + slope * slope) ** 1.5;
  }
  return track;
}
