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

// The world rectangle the whole canvas shows, which is at least the level's bounds.
export function visibleWorld(cam: Camera): Level['bounds'] {
  return {
    xMin: toWorldX(cam, 0),
    xMax: toWorldX(cam, cam.width),
    yMin: toWorldY(cam, cam.height),
    yMax: toWorldY(cam, 0),
  };
}
