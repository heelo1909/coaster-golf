import { describe, expect, it } from 'vitest';
import { judge } from '../../core';
import type { Level, PathPoint } from '../../core';
import { campaign } from '../../levels';
import { failPose, hasFailEffect, poseAt, speedAt } from './ride';

const path: PathPoint[] = [
  { t: 0, x: 0, y: 0, angle: 0 },
  { t: 1, x: 2, y: 1, angle: 0.5 },
  { t: 2, x: 4, y: 1, angle: 0 },
];

describe('poseAt: where the cart is drawn during a ride', () => {
  it('sits exactly on the recorded points at their times', () => {
    for (const p of path) {
      expect(poseAt(path, p.t)).toEqual({ x: p.x, y: p.y, angle: p.angle, spark: 0 });
    }
  });

  it('moves smoothly between recorded points', () => {
    const pose = poseAt(path, 0.5)!;
    expect(pose.x).toBeCloseTo(1);
    expect(pose.y).toBeCloseTo(0.5);
    expect(pose.angle).toBeCloseTo(0.25);
    expect(poseAt(path, 1.75)!.x).toBeCloseTo(3.5);
  });

  it('waits at the start before the ride and stays at the end after it', () => {
    expect(poseAt(path, -1)).toMatchObject({ x: 0, y: 0 });
    expect(poseAt(path, 99)).toMatchObject({ x: 4, y: 1 });
    expect(poseAt(path, Infinity)).toMatchObject({ x: 4, y: 1 });
  });

  it('has nothing to draw for a ride that failed before the cart moved', () => {
    expect(poseAt([], 0)).toBeNull();
    expect(failPose([], 'MISSED_START', 1)).toBeNull();
  });

  it('follows the real ride on level 1 from the start station to the end station', () => {
    const level = campaign[0] as Level;
    const judged = judge(level, '0');
    expect(judged.ok && judged.result.success).toBe(true);
    if (!judged.ok) return;
    const { path: ride } = judged.result;
    const start = poseAt(ride, 0)!;
    const end = poseAt(ride, Infinity)!;
    expect(start.x).toBeCloseTo(level.start.x);
    expect(end.x).toBeCloseTo(level.end.x, 1);
    // Halfway through the time the cart is somewhere between, still on the flat track.
    const mid = poseAt(ride, judged.result.duration / 2)!;
    expect(mid.x).toBeGreaterThan(level.start.x);
    expect(mid.x).toBeLessThan(level.end.x);
    expect(mid.y).toBeCloseTo(0);
  });
});

describe('failPose: the short effect after a failed ride', () => {
  it('a crash sparks in place, growing to full size', () => {
    expect(failPose(path, 'HIT_OBSTACLE', 0)).toEqual({ x: 4, y: 1, angle: 0, spark: 0 });
    expect(failPose(path, 'HIT_OBSTACLE', 1)).toEqual({ x: 4, y: 1, angle: 0, spark: 1 });
  });

  it('a cart that flew off keeps going the way it was heading, falls and tumbles', () => {
    const end = failPose(path, 'FLEW_OFF', 1)!;
    expect(end.x).toBeGreaterThan(4);
    expect(end.y).toBeLessThan(1);
    expect(end.angle).toBeCloseTo(-2 * Math.PI);
  });

  it('a stalled cart rocks back and comes to rest where it stopped', () => {
    const mid = failPose(path, 'STALLED', 0.2)!;
    expect(mid.x).not.toBeCloseTo(4);
    expect(failPose(path, 'STALLED', 1)).toMatchObject({ x: 4, y: 1 });
  });

  it('other fails just stop at the last point', () => {
    for (const reason of ['MISSED_END', 'OUT_OF_BOUNDS', 'BROKEN_TRACK', 'TIMEOUT'] as const) {
      expect(hasFailEffect(reason)).toBe(false);
      expect(failPose(path, reason, 0.5)).toEqual({ x: 4, y: 1, angle: 0, spark: 0 });
    }
    expect(hasFailEffect('FLEW_OFF')).toBe(true);
  });
});

describe('a crash on a real level replays the ride up to the rock', () => {
  it('c04: the V |x-4| rides into a rock, then sparks there', () => {
    const level = campaign.find((l) => l.id === 'c04') as Level;
    const judged = judge(level, '|x-4|');
    if (!judged.ok) throw new Error('expected |x-4| to parse');
    const { result } = judged;
    expect(result.reason).toBe('HIT_OBSTACLE');
    expect(result.path.length).toBeGreaterThan(1);
    const end = poseAt(result.path, Infinity)!;
    expect(end.x).toBeCloseTo(result.failAt!.x, 1);
    expect(failPose(result.path, result.reason, 1)).toMatchObject({ spark: 1 });
  });
});

describe('speedAt: how fast the cart goes, for the rolling sound', () => {
  it('is the distance over the recorded step around t', () => {
    expect(speedAt(path, 0.5)).toBeCloseTo(Math.hypot(2, 1));
    expect(speedAt(path, 1)).toBeCloseTo(Math.hypot(2, 1));
    expect(speedAt(path, 1.5)).toBeCloseTo(2);
  });

  it('is 0 before the ride and keeps the last speed after it', () => {
    expect(speedAt(path, -1)).toBe(0);
    expect(speedAt(path, 99)).toBeCloseTo(2);
  });

  it('is 0 with too few points to tell', () => {
    expect(speedAt([], 0)).toBe(0);
    expect(speedAt([path[0]!], 0)).toBe(0);
  });
});
