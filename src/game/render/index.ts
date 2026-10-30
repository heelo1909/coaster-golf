// The renderer the UI talks to. It owns one canvas, keeps the static layer (paper, grid,
// obstacles, stations) cached offscreen, and redraws only the track and the cart on top of it.
// The player can zoom and pan (a View, see camera.ts); during a ride the camera zooms in and
// follows the cart, then eases back to the player's own view.

import type { Level, SimResult } from '../../core';
import { clampView, fitView, lerpView, panView, viewCamera, zoomViewAt } from './camera';
import type { Camera, View } from './camera';
import { FAIL_EFFECT_SECONDS, REDUCED_MOTION_SPEED, failPose, hasFailEffect, poseAt } from './ride';
import type { CartPose } from './ride';
import { drawCart, drawFailMarker, drawStatic, drawTrack } from './scene';
import type { Track } from './scene';
import { theme } from './theme';

export type { Camera, View } from './camera';
export type { Track } from './scene';
export type { CartPose } from './ride';
export {
  DEFAULT_THEME,
  THEME_IDS,
  cssVars,
  isThemeId,
  setTheme,
  theme,
  themeName,
  themeSwatch,
} from './theme';
export type { ThemeId } from './theme';

// The follow camera: how far it zooms in on the cart (never less than the player's own zoom),
// how quickly it catches up (per second), and how long it takes to ease back afterwards.
const FOLLOW_ZOOM = 2.5;
const FOLLOW_RATE = 5;
const EASE_BACK_MS = 600;

export interface Renderer {
  setLevel(level: Level): void;
  // null clears the track; faded draws it dimmed (the last good track while the equation has
  // an error).
  setTrack(f: Track | null, faded?: boolean): void;
  resize(): void; // call when the canvas's CSS size or devicePixelRatio may have changed
  restyle(): void; // call after a theme change
  // Plays a judged ride back from its recorded path, then the fail effect if it failed. The
  // promise resolves when it ends, is skipped, or is cancelled by setTrack/setLevel. The cart,
  // and on a failed ride a marker where it failed, stay drawn until the track changes.
  playRide(result: SimResult): Promise<void>;
  skipRide(): void; // jumps straight to the end of the ride playing now
  // Zoom by `factor` about (sx, sy), and pan by (dx, dy), in CSS px within the canvas. Either
  // one during a ride hands the camera back to the player.
  zoomAt(factor: number, sx: number, sy: number): void;
  panBy(dx: number, dy: number): void;
  resetView(): void; // eases back to the whole level
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
  let view: View = fitView(level.bounds);
  let userView: View = view; // where the player left the camera; rides return here
  let following = false;
  let easing = 0; // requestAnimationFrame id of the ease back, 0 when idle
  let cam = {} as Camera; // set by applyView(), called from resizeCanvas() just below
  resizeCanvas();

  function reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Matches the backing store to the canvas's CSS size × devicePixelRatio. Does nothing when
  // they already match, so it's cheap to call whenever the size might have changed.
  function resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h && cam.dpr === dpr) return;
    for (const c of [canvas, staticLayer]) {
      c.width = w;
      c.height = h;
    }
    applyView();
  }

  // Rebuilds the camera from `view` and redraws the cached static layer for it.
  function applyView(): void {
    const dpr = window.devicePixelRatio || 1;
    cam = viewCamera(
      current.bounds,
      canvas.clientWidth,
      canvas.clientHeight,
      theme.padding,
      dpr,
      view,
    );
    staticCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStatic(staticCtx!, cam, current);
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

  function stopEasing(): void {
    cancelAnimationFrame(easing);
    easing = 0;
  }

  // Eases the camera to `target` (smoothstep), or jumps there with reduced motion.
  function easeTo(target: View): void {
    stopEasing();
    if (reducedMotion()) {
      view = target;
      applyView();
      frame();
      return;
    }
    const from = view;
    let started: number | undefined;
    const tick = (now: number): void => {
      started ??= now;
      const k = Math.min((now - started) / EASE_BACK_MS, 1);
      view = lerpView(from, target, k * k * (3 - 2 * k));
      applyView();
      frame();
      easing = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    easing = requestAnimationFrame(tick);
  }

  // The player moved the camera: it's theirs now, also mid-ride.
  function takeOver(next: View): void {
    stopEasing();
    following = false;
    view = userView = next;
    applyView();
    frame();
  }

  // The last frame of a ride: the end of the path, plus the end of the fail effect.
  function finalPose(result: SimResult): CartPose | null {
    return result.success ? poseAt(result.path, Infinity) : failPose(result.path, result.reason, 1);
  }

  // Ends the ride playing now, leaving the cart at `pose`, and hands the camera back.
  function endRide(pose: CartPose | null): void {
    if (!ride) return;
    cancelAnimationFrame(ride.frame);
    const { done, result } = ride;
    ride = null;
    cart = pose;
    failMark = result.failAt ?? null;
    if (following) {
      following = false;
      easeTo(userView);
    }
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
      stopEasing();
      current = next;
      view = userView = fitView(next.bounds);
      applyView();
      frame();
    },
    setTrack(f, faded = false) {
      if (f !== track) clearCart();
      track = f;
      trackFaded = faded;
      frame();
    },
    resize() {
      resizeCanvas();
      frame();
    },
    restyle() {
      applyView();
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
      const reduced = reducedMotion();
      const speed = reduced ? REDUCED_MOTION_SPEED : 1;
      const end = result.path.at(-1)!.t;
      const effect = !result.success && !reduced && hasFailEffect(result.reason);
      stopEasing();
      following = !reduced;
      return new Promise((resolve) => {
        let started: number | undefined;
        let last: number | undefined;
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
          if (following && cart) {
            // Catch up a fixed share per second, whatever the frame rate.
            const dt = last === undefined ? 0 : (now - last) / 1000;
            const target = { zoom: Math.max(userView.zoom, FOLLOW_ZOOM), cx: cart.x, cy: cart.y };
            const k = 1 - Math.exp(-FOLLOW_RATE * dt);
            view = clampView(lerpView(view, target, k), current.bounds);
            applyView();
          }
          last = now;
          frame();
          ride.frame = requestAnimationFrame(tick);
        };
        ride = { result, done: resolve, frame: requestAnimationFrame(tick) };
      });
    },
    skipRide() {
      if (ride) endRide(finalPose(ride.result));
    },
    zoomAt(factor, sx, sy) {
      takeOver(zoomViewAt(view, cam, current.bounds, factor, sx, sy));
    },
    panBy(dx, dy) {
      takeOver(panView(view, cam, current.bounds, dx, dy));
    },
    resetView() {
      following = false;
      userView = fitView(current.bounds);
      easeTo(userView);
    },
  };
}
