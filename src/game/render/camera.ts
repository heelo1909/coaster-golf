// World ↔ screen transform. The only file that knows about pixels (see render/CLAUDE.md).
// World units have y up; screen pixels (CSS px) have y down. The canvas backing store is
// devicePixelRatio times larger, which drawing code handles with ctx.setTransform(dpr, …).

import type { Level } from '../../core';

export interface Camera {
  scale: number; // CSS px per world unit, the same for x and y so circles stay round
  originX: number; // screen x of world x = 0
  originY: number; // screen y of world y = 0
  width: number; // canvas size in CSS px
  height: number;
  dpr: number;
}

// Fits the level's bounds into a width × height canvas with `padding` px around them, centred
// along whichever axis has room to spare.
export function fitCamera(
  bounds: Level['bounds'],
  width: number,
  height: number,
  padding: number,
  dpr = 1,
): Camera {
  const spanX = bounds.xMax - bounds.xMin;
  const spanY = bounds.yMax - bounds.yMin;
  const scale = Math.max(
    Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY),
    1e-6, // a canvas smaller than its padding still gets a usable, positive scale
  );
  const midX = (bounds.xMin + bounds.xMax) / 2;
  const midY = (bounds.yMin + bounds.yMax) / 2;
  return {
    scale,
    originX: width / 2 - midX * scale,
    originY: height / 2 + midY * scale,
    width,
    height,
    dpr,
  };
}

export function toScreenX(cam: Camera, x: number): number {
  return cam.originX + x * cam.scale;
}

export function toScreenY(cam: Camera, y: number): number {
  return cam.originY - y * cam.scale;
}

export function toWorldX(cam: Camera, sx: number): number {
  return (sx - cam.originX) / cam.scale;
}

export function toWorldY(cam: Camera, sy: number): number {
  return (cam.originY - sy) / cam.scale;
}

// The world rectangle the whole canvas shows: at least the level's bounds when fitted, less
// when zoomed in.
export function visibleWorld(cam: Camera): Level['bounds'] {
  return {
    xMin: toWorldX(cam, 0),
    xMax: toWorldX(cam, cam.width),
    yMin: toWorldY(cam, cam.height),
    yMax: toWorldY(cam, 0),
  };
}

// ── Zoom and pan ────────────────────────────────────────────────────────────────────────────
// A View is where the player is looking: a zoom relative to the fitted camera (1 = the whole
// level fits) and the world point at the centre of the canvas. The camera is rebuilt from it.

export interface View {
  zoom: number;
  cx: number;
  cy: number;
}

export const MIN_ZOOM = 1; // never smaller than the whole level
export const MAX_ZOOM = 8;

// The view that shows the whole level, as fitCamera does.
export function fitView(bounds: Level['bounds']): View {
  return { zoom: 1, cx: (bounds.xMin + bounds.xMax) / 2, cy: (bounds.yMin + bounds.yMax) / 2 };
}

// The camera for `view`: the fitted scale times the zoom, with (cx, cy) at the canvas centre.
export function viewCamera(
  bounds: Level['bounds'],
  width: number,
  height: number,
  padding: number,
  dpr: number,
  view: View,
): Camera {
  const fit = fitCamera(bounds, width, height, padding, dpr);
  const scale = fit.scale * view.zoom;
  return {
    scale,
    originX: width / 2 - view.cx * scale,
    originY: height / 2 + view.cy * scale,
    width,
    height,
    dpr,
  };
}

// Keeps the zoom within its limits and the centre inside the level, so the level can't be
// lost off-screen.
export function clampView(view: View, bounds: Level['bounds']): View {
  return {
    zoom: Math.min(Math.max(view.zoom, MIN_ZOOM), MAX_ZOOM),
    cx: Math.min(Math.max(view.cx, bounds.xMin), bounds.xMax),
    cy: Math.min(Math.max(view.cy, bounds.yMin), bounds.yMax),
  };
}

// Zooms by `factor` about the screen point (sx, sy): the world point under it stays put, so
// pinching or scrolling zooms toward the finger or cursor.
export function zoomViewAt(
  view: View,
  cam: Camera,
  bounds: Level['bounds'],
  factor: number,
  sx: number,
  sy: number,
): View {
  const zoom = Math.min(Math.max(view.zoom * factor, MIN_ZOOM), MAX_ZOOM);
  const scale = (cam.scale / view.zoom) * zoom;
  const wx = toWorldX(cam, sx);
  const wy = toWorldY(cam, sy);
  return clampView(
    { zoom, cx: wx - (sx - cam.width / 2) / scale, cy: wy + (sy - cam.height / 2) / scale },
    bounds,
  );
}

// Moves the view so the world follows a drag of (dx, dy) screen px.
export function panView(
  view: View,
  cam: Camera,
  bounds: Level['bounds'],
  dx: number,
  dy: number,
): View {
  return clampView({ ...view, cx: view.cx - dx / cam.scale, cy: view.cy + dy / cam.scale }, bounds);
}

// How far the camera may roam: the level's bounds, stretched up or down to take in the track
// between `from` and `to` (the stations). The track may leave the map (the ride ignores the
// bounds), so the follow camera and panning must be able to reach it. Undefined points are
// skipped.
export function extendBounds(
  bounds: Level['bounds'],
  f: ((x: number) => number) | null,
  from: number,
  to: number,
): Level['bounds'] {
  if (!f) return bounds;
  let { yMin, yMax } = bounds;
  const steps = 256;
  for (let i = 0; i <= steps; i++) {
    const y = f(from + ((to - from) * i) / steps);
    if (!Number.isFinite(y)) continue;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  return { ...bounds, yMin, yMax };
}

// Part of the way (k, 0–1) from a to b. Zoom moves in log space so it feels even.
export function lerpView(a: View, b: View, k: number): View {
  return {
    zoom: a.zoom * (b.zoom / a.zoom) ** k,
    cx: a.cx + (b.cx - a.cx) * k,
    cy: a.cy + (b.cy - a.cy) * k,
  };
}
