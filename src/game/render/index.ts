// The renderer the UI talks to. It owns one canvas, keeps the static layer (paper, grid,
// obstacles, stations) cached offscreen, and redraws only the track and the cart on top of it.

import type { Level, SimResult } from '../../core';
import { fitCamera } from './camera';
import type { Camera } from './camera';
import { FAIL_EFFECT_SECONDS, REDUCED_MOTION_SPEED, failPose, hasFailEffect, poseAt } from './ride';
import type { CartPose } from './ride';
import { drawCart, drawFailMarker, drawStatic, drawTrack } from './scene';
import type { Track } from './scene';
import { theme } from './theme';

export type { Camera } from './camera';
export type { Track } from './scene';
export type { CartPose } from './ride';

export interface Renderer {
  setLevel(level: Level): void;
  // null clears the track; faded draws it dimmed (the last good track while the equation has
  // an error).
  setTrack(f: Track | null, faded?: boolean): void;
  resize(): void; // call when the canvas's CSS size or devicePixelRatio changes
  // Plays a judged ride back from its recorded path, then the fail effect if it failed. The
  // promise resolves when it ends, is skipped, or is cancelled by setTrack/setLevel. The cart,
  // and on a failed ride a marker where it failed, stay drawn until the track changes.
  playRide(result: SimResult): Promise<void>;
  skipRide(): void; // jumps straight to the end of the ride playing now
}

export function createRenderer(canvas: HTMLCanvasElement, level: Level): Renderer {
  const ctx = canvas.getContext('2d');
  const staticLayer = document.createElement('canvas');
  const staticCtx = staticLayer.getContext('2d');
  if (!ctx || !staticCtx) throw new Error('2d canvas not supported');

  let current = level;
  let track: Track | null = null;
  let trackFaded = false;
  let cart: CartPose | null = null;
  let failMark: { x: number; y: number } | null = null;
  let ride: { result: SimResult; done: () => void; frame: number } | null = null;
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
      ctx!.globalAlpha = trackFaded ? theme.trackFadedAlpha : 1;
      drawTrack(ctx!, cam, current, track);
      ctx!.globalAlpha = 1;
    }
    ctx!.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    if (failMark) drawFailMarker(ctx!, cam, failMark.x, failMark.y);
    if (cart) drawCart(ctx!, cam, cart);
  }

  // The last frame of a ride: the end of the path, plus the end of the fail effect.
  function finalPose(result: SimResult): CartPose | null {
    return result.success ? poseAt(result.path, Infinity) : failPose(result.path, result.reason, 1);
  }

  // Ends the ride playing now, leaving the cart at `pose`.
  function endRide(pose: CartPose | null): void {
    if (!ride) return;
    cancelAnimationFrame(ride.frame);
    const { done, result } = ride;
    ride = null;
    cart = pose;
    failMark = result.failAt ?? null;
    frame();
    done();
  }

  function clearCart(): void {
    endRide(null);
    cart = null;
    failMark = null;
  }

  frame();
  return {
    setLevel(next) {
      clearCart();
      current = next;
      cam = layout();
      frame();
    },
    setTrack(f, faded = false) {
      if (f !== track) clearCart();
      track = f;
      trackFaded = faded;
      frame();
    },
    resize() {
      cam = layout();
      frame();
    },
    playRide(result) {
      clearCart();
      if (result.path.length === 0) {
        // Failed before the cart moved: there's only the marker to show.
        failMark = result.failAt ?? null;
        frame();
        return Promise.resolve();
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const speed = reduced ? REDUCED_MOTION_SPEED : 1;
      const end = result.path.at(-1)!.t;
      const effect = !result.success && !reduced && hasFailEffect(result.reason);
      return new Promise((resolve) => {
        let started: number | undefined;
        const tick = (now: number): void => {
          if (!ride) return;
          started ??= now;
          const t = ((now - started) / 1000) * speed;
          if (t < end) {
            cart = poseAt(result.path, t);
          } else if (effect && t < end + FAIL_EFFECT_SECONDS) {
            cart = failPose(result.path, result.reason, (t - end) / FAIL_EFFECT_SECONDS);
          } else {
            endRide(finalPose(result));
            return;
          }
          frame();
          ride.frame = requestAnimationFrame(tick);
        };
        ride = { result, done: resolve, frame: requestAnimationFrame(tick) };
      });
    },
    skipRide() {
      if (ride) endRide(finalPose(ride.result));
    },
  };
}
