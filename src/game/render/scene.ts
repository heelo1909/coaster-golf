// Draws the level and the track. Everything here is in world units; positions go through
// camera.ts to become pixels, and colours and widths come from theme.ts.

import { CART_RADIUS, JUMP_THRESHOLD, MAX_SLOPE } from '../../core';
import type { Level, Obstacle } from '../../core';
import { toScreenX, toScreenY, visibleWorld } from './camera';
import type { Camera } from './camera';
import type { ConfettiPiece } from './confetti';
import type { CartPose } from './ride';
import { MAJOR_EVERY, STATION_LEG, STATION_PLATFORM, theme } from './theme';

export type Track = (x: number) => number;

// One unbroken run of the track, as world points.
export interface Polyline {
  xs: number[];
  ys: number[];
}

// Samples f from `from` to `to` every `step` world units (both ends included) and splits it
// into polylines wherever the curve is undefined or jumps, so a gap is never bridged by a
// vertical line. A rise steeper than MAX_SLOPE over one step counts as a jump, matching what
// the simulation calls a wall. Heights are clamped to ±yLimit so a curve shooting off to huge
// values still draws a sane line off the edge of the canvas.
export function trackPolylines(
  f: Track,
  from: number,
  to: number,
  step: number,
  yLimit: number,
): Polyline[] {
  const lines: Polyline[] = [];
  if (!(to > from) || !(step > 0)) return lines;
  const n = Math.ceil((to - from) / step);
  const maxJump = Math.max(JUMP_THRESHOLD, MAX_SLOPE * step);
  let line: Polyline | null = null;
  let prevY = NaN;
  for (let i = 0; i <= n; i++) {
    const x = i === n ? to : from + i * step;
    const y = f(x);
    if (!Number.isFinite(y)) {
      line = null;
      prevY = NaN;
      continue;
    }
    if (line === null || Math.abs(y - prevY) > maxJump) {
      line = { xs: [], ys: [] };
      lines.push(line);
    }
    line.xs.push(x);
    line.ys.push(Math.max(-yLimit, Math.min(yLimit, y)));
    prevY = y;
  }
  return lines;
}

// The static layer: paper, grid, axes, title block, obstacles and stations. Cached by the
// renderer, so it is drawn only on resize or level change.
// `number` replaces the level's own number in the title (the daily shows "#12").
export function drawStatic(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  level: Level,
  number?: string,
): void {
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, cam.width, cam.height);
  drawGrid(ctx, cam);
  drawTitle(ctx, cam, level, number);
  drawObstacles(ctx, cam, level.obstacles);
  drawStations(ctx, cam, level);
}

export function drawGrid(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const view = visibleWorld(cam);
  const x0 = Math.ceil(view.xMin);
  const x1 = Math.floor(view.xMax);
  const y0 = Math.ceil(view.yMin);
  const y1 = Math.floor(view.yMax);

  if (theme.style === 'minimal') {
    // A quiet dot at every whole-number point instead of lines.
    ctx.fillStyle = theme.gridMinor;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const sx = toScreenX(cam, x);
        const sy = toScreenY(cam, y);
        ctx.moveTo(sx + theme.gridDot, sy);
        ctx.arc(sx, sy, theme.gridDot, 0, 2 * Math.PI);
      }
    }
    ctx.fill();
  } else {
    for (let x = x0; x <= x1; x++) {
      if (x === 0) continue;
      gridLine(ctx, cam, x, view.yMin, x, view.yMax, x % MAJOR_EVERY === 0);
    }
    for (let y = y0; y <= y1; y++) {
      if (y === 0) continue;
      gridLine(ctx, cam, view.xMin, y, view.xMax, y, y % MAJOR_EVERY === 0);
    }
  }

  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = theme.style === 'minimal' ? 1 : theme.axisWidth;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(toScreenX(cam, view.xMin), toScreenY(cam, 0));
  ctx.lineTo(toScreenX(cam, view.xMax), toScreenY(cam, 0));
  ctx.moveTo(toScreenX(cam, 0), toScreenY(cam, view.yMin));
  ctx.lineTo(toScreenX(cam, 0), toScreenY(cam, view.yMax));
  ctx.stroke();

  // Axis numbers, thinned out when grid squares are too small to fit them.
  const every = cam.scale >= 28 ? 1 : cam.scale >= 14 ? 2 : 5;
  ctx.fillStyle = theme.label;
  ctx.font = `${theme.labelSize}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let x = x0; x <= x1; x++) {
    if (x !== 0 && x % every === 0) {
      ctx.fillText(String(x), toScreenX(cam, x), toScreenY(cam, 0) + 3);
    }
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = y0; y <= y1; y++) {
    if (y !== 0 && y % every === 0) {
      ctx.fillText(String(y), toScreenX(cam, 0) - 4, toScreenY(cam, y));
    }
  }
}

function gridLine(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  xa: number,
  ya: number,
  xb: number,
  yb: number,
  major: boolean,
): void {
  ctx.strokeStyle = major ? theme.gridMajor : theme.gridMinor;
  ctx.lineWidth = major ? theme.gridMajorWidth : theme.gridMinorWidth;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(toScreenX(cam, xa), toScreenY(cam, ya));
  ctx.lineTo(toScreenX(cam, xb), toScreenY(cam, yb));
  ctx.stroke();
}

// Where the minimal title's text starts: the "‹ Levels" button (ui/BackButton.ts) sits left
// of it, on the same block of paper.
const TITLE_LEFT = 104;

// The level's number and name. Minimal: "04  The dip" near the top-left corner. Blueprint:
// "FIG. 4 — THE DIP" along the bottom edge, like a drawing's title block.
function drawTitle(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  level: Level,
  number?: string,
): void {
  const fig = Number.parseInt(level.id.slice(1), 10);
  const num = number ?? (Number.isFinite(fig) ? String(fig).padStart(2, '0') : level.id);
  ctx.fillStyle = theme.label;
  ctx.font = `${theme.titleSize}px ${theme.font}`;
  if (theme.style === 'minimal') {
    // On a small block of paper, so it stays readable over the axis numbers behind it.
    const text = `${num}  ${level.name}`;
    const w = ctx.measureText(text).width;
    ctx.fillStyle = theme.paper;
    ctx.fillRect(8, 8, TITLE_LEFT + w, theme.titleSize + 14);
    ctx.fillStyle = theme.label;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, TITLE_LEFT, 15);
    return;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const fignum = number ?? (Number.isFinite(fig) ? String(fig) : level.id);
  ctx.fillText(`FIG. ${fignum} — ${level.name.toUpperCase()}`, cam.width / 2, cam.height - 6);
}

// Outlines filled with a soft tint (minimal) or diagonal hatching, the drafting sign for
// solid material (blueprint).
export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  obstacles: readonly Obstacle[],
): void {
  for (const o of obstacles) {
    // A Path2D, because hatch() builds its own path and would replace the shape's.
    const shape = new Path2D();
    if (o.kind === 'rect') {
      const left = toScreenX(cam, o.x);
      const top = toScreenY(cam, o.y + o.h);
      shape.rect(left, top, o.w * cam.scale, o.h * cam.scale);
    } else {
      shape.arc(toScreenX(cam, o.x), toScreenY(cam, o.y), o.r * cam.scale, 0, Math.PI * 2);
    }

    if (theme.style === 'minimal') {
      ctx.fillStyle = theme.obstacleFill;
      ctx.fill(shape);
    } else {
      ctx.save();
      ctx.clip(shape);
      hatch(ctx, cam);
      ctx.restore();
    }

    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = theme.obstacleWidth;
    ctx.setLineDash([]);
    ctx.stroke(shape);
  }
}

// Diagonal lines across the whole canvas; callers clip them to a shape first.
function hatch(ctx: CanvasRenderingContext2D, cam: Camera): void {
  ctx.strokeStyle = theme.obstacleFill;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let d = -cam.height; d < cam.width; d += theme.hatchGap) {
    ctx.moveTo(d, cam.height);
    ctx.lineTo(d + cam.height, 0);
  }
  ctx.stroke();
}

// Each station is a small platform on two legs, reaching away from the track (left of the
// start, right of the end), with its label above.
export function drawStations(ctx: CanvasRenderingContext2D, cam: Camera, level: Level): void {
  station(ctx, cam, level.start.x, level.start.y, -1, 'START');
  station(ctx, cam, level.end.x, level.end.y, 1, 'END');
}

function station(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number,
  side: -1 | 1,
  label: string,
): void {
  const far = x + side * STATION_PLATFORM;
  const legA = x + side * STATION_PLATFORM * 0.2;
  const legB = x + side * STATION_PLATFORM * 0.8;
  ctx.strokeStyle = theme.mark;
  ctx.lineWidth = theme.stationWidth;
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(toScreenX(cam, x), toScreenY(cam, y));
  ctx.lineTo(toScreenX(cam, far), toScreenY(cam, y));
  // The minimal themes keep just the platform; the blueprint adds legs.
  if (theme.style === 'blueprint') {
    ctx.moveTo(toScreenX(cam, legA), toScreenY(cam, y));
    ctx.lineTo(toScreenX(cam, legA), toScreenY(cam, y - STATION_LEG));
    ctx.moveTo(toScreenX(cam, legB), toScreenY(cam, y));
    ctx.lineTo(toScreenX(cam, legB), toScreenY(cam, y - STATION_LEG));
  }
  ctx.stroke();
  ctx.lineCap = 'butt';

  const minimal = theme.style === 'minimal';
  ctx.fillStyle = minimal ? theme.label : theme.mark;
  ctx.font = `${theme.labelSize}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const text = minimal ? label.charAt(0) + label.slice(1).toLowerCase() : label;
  ctx.fillText(text, toScreenX(cam, (x + far) / 2), toScreenY(cam, y) - 6);
}

// The player's track: solid between the stations, faint and dashed beyond them, sampled once
// per CSS pixel across the visible width.
export function drawTrack(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  level: Level,
  f: Track,
): void {
  const view = visibleWorld(cam);
  const step = 1 / cam.scale;
  const yLimit = Math.max(Math.abs(view.yMin), Math.abs(view.yMax)) * 4;
  const left = Math.min(level.start.x, level.end.x);
  const right = Math.max(level.start.x, level.end.x);

  ctx.lineJoin = 'round';
  ctx.strokeStyle = theme.inkFaint;
  ctx.lineWidth = theme.trackFaintWidth;
  ctx.setLineDash(theme.trackFaintDash);
  strokeLines(ctx, cam, trackPolylines(f, view.xMin, left, step, yLimit));
  strokeLines(ctx, cam, trackPolylines(f, right, view.xMax, step, yLimit));

  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = theme.trackWidth;
  ctx.setLineDash([]);
  strokeLines(ctx, cam, trackPolylines(f, left, right, step, yLimit));
}

function strokeLines(ctx: CanvasRenderingContext2D, cam: Camera, lines: Polyline[]): void {
  ctx.beginPath();
  for (const { xs, ys } of lines) {
    for (let i = 0; i < xs.length; i++) {
      const sx = toScreenX(cam, xs[i] ?? 0);
      const sy = toScreenY(cam, ys[i] ?? 0);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
  }
  ctx.stroke();
}

// The cart: an amber drafting mark sitting on the track, the size of the circle the
// simulation collides with (CART_RADIUS along the track's upward normal), tilted with the
// slope. A crash adds a spark of short rays around it.
export function drawCart(ctx: CanvasRenderingContext2D, cam: Camera, pose: CartPose): void {
  const r = Math.max(CART_RADIUS * cam.scale, theme.cartMinRadius);
  // Screen y points down, so the world angle turns the other way.
  const a = -pose.angle;
  ctx.save();
  ctx.translate(toScreenX(cam, pose.x), toScreenY(cam, pose.y));
  ctx.rotate(a);
  const solid = theme.style === 'minimal';
  ctx.strokeStyle = theme.mark;
  ctx.fillStyle = theme.paper;
  ctx.lineWidth = theme.cartWidth;
  ctx.setLineDash([]);
  // Body: a box from the wheels up to twice the radius (solid accent in the minimal themes,
  // an outline on the blueprint), then two wheels on the rail.
  ctx.beginPath();
  if (solid) {
    ctx.roundRect(-r, -2 * r, 2 * r, 1.4 * r, r * 0.35);
    ctx.fillStyle = theme.mark;
    ctx.fill();
    ctx.fillStyle = theme.paper;
  } else {
    ctx.rect(-r, -2 * r, 2 * r, 1.4 * r);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  for (const wx of [-r * 0.55, r * 0.55]) {
    ctx.moveTo(wx + r * 0.3, -r * 0.3);
    ctx.arc(wx, -r * 0.3, r * 0.3, 0, 2 * Math.PI);
  }
  ctx.fill();
  ctx.stroke();

  if (pose.spark > 0) {
    const s = pose.spark;
    ctx.globalAlpha = 1 - s;
    ctx.beginPath();
    for (let i = 0; i < theme.sparkRays; i++) {
      const ray = (i / theme.sparkRays) * 2 * Math.PI;
      const inner = r * 1.2 + s * theme.sparkLength * 0.5;
      const outer = r * 1.2 + s * theme.sparkLength * 1.5;
      ctx.moveTo(Math.cos(ray) * inner, -r + Math.sin(ray) * inner);
      ctx.lineTo(Math.cos(ray) * outer, -r + Math.sin(ray) * outer);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Where a ride failed: a ✕ in a ring at the fail point, with a faint drop line to the x-axis
// so the player can read off the x the result panel names.
export function drawFailMarker(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  y: number,
): void {
  const sx = toScreenX(cam, x);
  const sy = toScreenY(cam, y);
  const s = theme.failMarkSize;
  ctx.strokeStyle = theme.error;
  ctx.lineWidth = 1;
  ctx.setLineDash(theme.trackFaintDash);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, toScreenY(cam, 0));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = theme.failMarkWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx - s, sy - s);
  ctx.lineTo(sx + s, sy + s);
  ctx.moveTo(sx + s, sy - s);
  ctx.lineTo(sx - s, sy + s);
  ctx.moveTo(sx + s * 1.7, sy);
  ctx.arc(sx, sy, s * 1.7, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

// The confetti burst for a win at or under par: small spinning slips in the accent, the ink
// and the label colour. Sizes are in px, positions in world units.
export function drawConfetti(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  pieces: readonly ConfettiPiece[],
): void {
  const colours = [theme.mark, theme.ink, theme.label];
  const w = theme.confettiSize;
  ctx.save();
  for (const p of pieces) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = colours[p.colour]!;
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.translate(toScreenX(cam, p.x), toScreenY(cam, p.y));
    ctx.rotate(p.spin);
    // Squashing one side with the spin makes a flat slip look like it's flipping over.
    ctx.fillRect(-w / 2, (-w / 4) * Math.cos(p.spin * 1.7), w, (w / 2) * Math.cos(p.spin * 1.7));
  }
  ctx.restore();
}
