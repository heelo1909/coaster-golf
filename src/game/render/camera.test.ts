import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  fitCamera,
  fitView,
  lerpView,
  panView,
  toScreenX,
  toScreenY,
  toWorldX,
  toWorldY,
  viewCamera,
  visibleWorld,
  zoomViewAt,
} from './camera';
import type { View } from './camera';

const bounds = { xMin: -1, xMax: 9, yMin: -1, yMax: 7 }; // 10 wide, 8 tall

describe('fitCamera', () => {
  it('fits a wide canvas by height and centres the level horizontally', () => {
    const cam = fitCamera(bounds, 1280, 800, 20);
    expect(cam.scale).toBeCloseTo((800 - 40) / 8);
    expect(toScreenY(cam, bounds.yMax)).toBeCloseTo(20);
    expect(toScreenY(cam, bounds.yMin)).toBeCloseTo(780);
    const left = toScreenX(cam, bounds.xMin);
    const right = toScreenX(cam, bounds.xMax);
    expect(left).toBeCloseTo(1280 - right); // equal margins
    expect(left).toBeGreaterThan(20);
  });

  it('fits a phone-shaped canvas by width and centres the level vertically', () => {
    const cam = fitCamera(bounds, 375, 812, 24);
    expect(cam.scale).toBeCloseTo((375 - 48) / 10);
    expect(toScreenX(cam, bounds.xMin)).toBeCloseTo(24);
    expect(toScreenX(cam, bounds.xMax)).toBeCloseTo(351);
    const top = toScreenY(cam, bounds.yMax);
    const bottom = toScreenY(cam, bounds.yMin);
    expect(top).toBeCloseTo(812 - bottom);
  });

  it('uses the same scale on both axes, so a unit square stays square', () => {
    for (const [w, h] of [
      [375, 812],
      [1280, 800],
      [600, 600],
    ] as const) {
      const cam = fitCamera(bounds, w, h, 24);
      const dx = toScreenX(cam, 1) - toScreenX(cam, 0);
      const dy = toScreenY(cam, 0) - toScreenY(cam, 1);
      expect(dx).toBeCloseTo(dy);
    }
  });

  it('puts world y up and screen y down', () => {
    const cam = fitCamera(bounds, 400, 400, 0);
    expect(toScreenY(cam, 5)).toBeLessThan(toScreenY(cam, 0));
  });

  it('keeps a positive scale when the canvas is smaller than its padding', () => {
    const cam = fitCamera(bounds, 10, 10, 24);
    expect(cam.scale).toBeGreaterThan(0);
  });

  it('carries the device pixel ratio', () => {
    expect(fitCamera(bounds, 375, 812, 24, 3).dpr).toBe(3);
    expect(fitCamera(bounds, 375, 812, 24).dpr).toBe(1);
  });
});

describe('world ↔ screen', () => {
  it('round-trips world → screen → world at several aspect ratios', () => {
    for (const [w, h] of [
      [375, 812],
      [1280, 800],
      [320, 200],
    ] as const) {
      const cam = fitCamera(bounds, w, h, 24, 2);
      for (const [x, y] of [
        [0, 0],
        [-1, 7],
        [4.25, 2.2],
        [9, -1],
      ] as const) {
        expect(toWorldX(cam, toScreenX(cam, x))).toBeCloseTo(x, 9);
        expect(toWorldY(cam, toScreenY(cam, y))).toBeCloseTo(y, 9);
      }
    }
  });

  it('shows at least the whole level in the visible area', () => {
    for (const [w, h] of [
      [375, 812],
      [1280, 800],
    ] as const) {
      const view = visibleWorld(fitCamera(bounds, w, h, 24));
      expect(view.xMin).toBeLessThan(bounds.xMin);
      expect(view.xMax).toBeGreaterThan(bounds.xMax);
      expect(view.yMin).toBeLessThan(bounds.yMin);
      expect(view.yMax).toBeGreaterThan(bounds.yMax);
    }
  });
});

describe('zoom and pan: where the player is looking', () => {
  const W = 375;
  const H = 600;
  const cam = (v: View) => viewCamera(bounds, W, H, 24, 1, v);

  it('the fitted view is exactly the fitted camera', () => {
    const fitted = fitCamera(bounds, W, H, 24);
    const viewed = cam(fitView(bounds));
    expect(viewed.scale).toBeCloseTo(fitted.scale);
    expect(viewed.originX).toBeCloseTo(fitted.originX);
    expect(viewed.originY).toBeCloseTo(fitted.originY);
  });

  it('zooming toward a finger keeps the point under the finger in place', () => {
    const v0 = fitView(bounds);
    const c0 = cam(v0);
    const [sx, sy] = [100, 250];
    const wx = toWorldX(c0, sx);
    const wy = toWorldY(c0, sy);
    const v1 = zoomViewAt(v0, c0, bounds, 2, sx, sy);
    const c1 = cam(v1);
    expect(v1.zoom).toBe(2);
    expect(c1.scale).toBeCloseTo(c0.scale * 2);
    expect(toScreenX(c1, wx)).toBeCloseTo(sx);
    expect(toScreenY(c1, wy)).toBeCloseTo(sy);
  });

  it('zoom stops at the whole level and at 8×', () => {
    const v0 = fitView(bounds);
    expect(zoomViewAt(v0, cam(v0), bounds, 0.25, 200, 300).zoom).toBe(MIN_ZOOM);
    expect(zoomViewAt(v0, cam(v0), bounds, 100, 200, 300).zoom).toBe(MAX_ZOOM);
  });

  it('dragging moves the world with the finger, but never loses the level', () => {
    const v = { zoom: 2, cx: 4, cy: 3 };
    const c = cam(v);
    const moved = panView(v, c, bounds, 30, -15);
    expect(moved.cx).toBeCloseTo(4 - 30 / c.scale);
    expect(moved.cy).toBeCloseTo(3 - 15 / c.scale);
    const far = panView(v, c, bounds, -1e6, 1e6);
    expect(far.cx).toBe(bounds.xMax);
    expect(far.cy).toBe(bounds.yMax); // dragging down moves the view up
  });

  it('easing between views starts and ends exactly on them, zooming evenly', () => {
    const a = { zoom: 1, cx: 0, cy: 0 };
    const b = { zoom: 4, cx: 8, cy: 2 };
    expect(lerpView(a, b, 0)).toEqual(a);
    expect(lerpView(a, b, 1)).toEqual(b);
    expect(lerpView(a, b, 0.5).zoom).toBeCloseTo(2);
    expect(lerpView(a, b, 0.5).cx).toBeCloseTo(4);
  });
});
