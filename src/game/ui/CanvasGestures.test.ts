import { describe, expect, it } from 'vitest';
import { pinchStep, wheelFactor } from './CanvasGestures';

describe('wheelFactor: scrolling zooms the track', () => {
  it('scrolling up zooms in, down zooms out, by the same amount either way', () => {
    expect(wheelFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0, false)).toBeLessThan(1);
    expect(wheelFactor(-100, 0, false) * wheelFactor(100, 0, false)).toBeCloseTo(1);
  });

  it('a trackpad pinch (ctrlKey, small deltas) zooms about as much as a mouse notch', () => {
    const notch = wheelFactor(-100, 0, false);
    const pinch = wheelFactor(-15, 0, true);
    expect(pinch).toBeGreaterThan(1);
    expect(Math.abs(Math.log(pinch) - Math.log(notch))).toBeLessThan(0.05);
  });

  it('line-based scrolling counts each line as about 16 px', () => {
    expect(wheelFactor(-3, 1, false)).toBeCloseTo(wheelFactor(-48, 0, false));
  });
});

describe('pinchStep: two fingers zoom and pan', () => {
  it('spreading the fingers to twice the distance zooms in 2× about their midpoint', () => {
    const step = pinchStep(
      [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
      ],
      [
        { x: 50, y: 200 },
        { x: 250, y: 200 },
      ],
    );
    expect(step.factor).toBeCloseTo(2);
    expect(step.at).toEqual({ x: 150, y: 200 });
    expect([step.dx, step.dy]).toEqual([0, 0]);
  });

  it('moving both fingers together pans without zooming', () => {
    const step = pinchStep(
      [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
      [
        { x: 130, y: 90 },
        { x: 230, y: 90 },
      ],
    );
    expect(step.factor).toBeCloseTo(1);
    expect([step.dx, step.dy]).toEqual([30, -10]);
  });

  it('two fingers on the same spot never divide by zero', () => {
    const p = { x: 5, y: 5 };
    expect(pinchStep([p, p], [p, { x: 9, y: 5 }]).factor).toBe(1);
  });
});
