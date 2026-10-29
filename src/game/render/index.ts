// The renderer the UI talks to. It owns one canvas, keeps the static layer (paper, grid,
// obstacles, stations) cached offscreen, and redraws only the track on top of it.

import type { Level } from '../../core';
import { fitCamera } from './camera';
import type { Camera } from './camera';
import { drawStatic, drawTrack } from './scene';
import type { Track } from './scene';
import { theme } from './theme';

export type { Camera } from './camera';
export type { Track } from './scene';

export interface Renderer {
  setLevel(level: Level): void;
  setTrack(f: Track | null): void; // null clears the track
  resize(): void; // call when the canvas's CSS size or devicePixelRatio changes
}

export function createRenderer(canvas: HTMLCanvasElement, level: Level): Renderer {
  const ctx = canvas.getContext('2d');
  const staticLayer = document.createElement('canvas');
  const staticCtx = staticLayer.getContext('2d');
  if (!ctx || !staticCtx) throw new Error('2d canvas not supported');

  let current = level;
  let track: Track | null = null;
  let cam: Camera = layout();

  function layout(): Camera {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const c of [canvas, staticLayer]) {
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
    }
    const camera = fitCamera(current.bounds, w, h, theme.padding, dpr);
    staticCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStatic(staticCtx!, camera, current);
    return camera;
  }

  function frame(): void {
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.drawImage(staticLayer, 0, 0);
    if (track) {
      ctx!.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
      drawTrack(ctx!, cam, current, track);
    }
  }

  frame();
  return {
    setLevel(next) {
      current = next;
      cam = layout();
      frame();
    },
    setTrack(f) {
      track = f;
      frame();
    },
    resize() {
      cam = layout();
      frame();
    },
  };
}
