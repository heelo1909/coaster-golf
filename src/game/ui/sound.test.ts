import { describe, expect, it } from 'vitest';
import type { FailReason } from '../../core';
import { createSound, cueFor, rollAt } from './sound';

const reasons: FailReason[] = [
  'MISSED_START',
  'MISSED_END',
  'BROKEN_TRACK',
  'HIT_OBSTACLE',
  'FLEW_OFF',
  'STALLED',
  'TIMEOUT',
];

describe('what a ride sounds like at the end', () => {
  it('a win chimes upwards, with one note higher at or under par', () => {
    const plain = cueFor({ win: true, star: false });
    const star = cueFor({ win: true, star: true });
    expect(plain).toHaveLength(3);
    expect(star).toHaveLength(4);
    const pitches = star.map((b) => b.from);
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
    expect(star.at(-1)!.from).toBeGreaterThan(plain.at(-1)!.from);
  });

  it('every fail has a sound, and the three with an effect each sound different', () => {
    for (const reason of [...reasons, undefined]) {
      expect(cueFor({ win: false, reason }).length).toBeGreaterThan(0);
    }
    const crash = cueFor({ win: false, reason: 'HIT_OBSTACLE' });
    expect(crash.some((b) => b.kind === 'noise')).toBe(true);
    const flew = cueFor({ win: false, reason: 'FLEW_OFF' });
    expect(flew[0]!.to).toBeLessThan(flew[0]!.from); // a falling whistle
    expect(cueFor({ win: false, reason: 'STALLED' })).not.toEqual(flew);
  });

  it('a fail never sounds like a win: it ends lower than it starts', () => {
    for (const reason of reasons) {
      const cue = cueFor({ win: false, reason });
      const last = cue.at(-1)!;
      expect(last.to).toBeLessThanOrEqual(cue[0]!.from);
    }
  });

  it('every sound is audible, short, and has a valid pitch', () => {
    for (const cue of [
      cueFor({ win: true, star: true }),
      ...reasons.map((reason) => cueFor({ win: false, reason })),
    ]) {
      for (const b of cue) {
        expect(b.gain).toBeGreaterThan(0);
        expect(b.gain).toBeLessThanOrEqual(1);
        expect(b.at + b.dur).toBeLessThan(1.5);
        expect(Math.min(b.from, b.to)).toBeGreaterThan(20);
      }
    }
  });
});

describe('the rolling rumble follows the cart speed', () => {
  it('is silent when the cart is still, and for nonsense speeds', () => {
    expect(rollAt(0).gain).toBe(0);
    expect(rollAt(-3).gain).toBe(0);
    expect(rollAt(NaN).gain).toBe(0);
    expect(rollAt(Infinity).gain).toBe(0);
  });

  it('gets louder and brighter as the cart speeds up, then levels off', () => {
    const slow = rollAt(1);
    const fast = rollAt(8);
    expect(fast.gain).toBeGreaterThan(slow.gain);
    expect(fast.freq).toBeGreaterThan(slow.freq);
    expect(rollAt(50)).toEqual(rollAt(500));
    expect(rollAt(500).gain).toBeLessThanOrEqual(0.4);
  });
});

// A stand-in AudioContext that records which sounds start and stop.
function fakeContext() {
  const log: string[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    setTargetAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    cancelScheduledValues: () => undefined,
  });
  const node = (name: string) => {
    const n = {
      context: ctx,
      gain: param(),
      frequency: param(),
      Q: param(),
      type: '',
      buffer: null,
      loop: false,
      connect: (to: unknown) => to,
      start: () => log.push(`start ${name}`),
      stop: () => log.push(`stop ${name}`),
    };
    return n;
  };
  const ctx = {
    state: 'running',
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createGain: () => node('gain'),
    createBiquadFilter: () => node('filter'),
    createOscillator: () => node('tone'),
    createBufferSource: () => node('noise'),
    createBuffer: (_c: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    resume: () => Promise.resolve(),
  };
  return { ctx: ctx as unknown as AudioContext, log };
}

describe('sound on and off', () => {
  it('muted, no audio is ever set up', () => {
    let made = 0;
    const sound = createSound(true, () => {
      made++;
      return fakeContext().ctx;
    });
    sound.roll(5);
    sound.play({ win: true, star: true });
    expect(made).toBe(0);
  });

  it('on, a ride rumbles through one looping sound and a win plays its notes', () => {
    const { ctx, log } = fakeContext();
    let made = 0;
    const sound = createSound(false, () => {
      made++;
      return ctx;
    });
    sound.roll(3);
    sound.roll(6);
    sound.stopRoll();
    sound.play({ win: true, star: false });
    expect(made).toBe(1);
    expect(log.filter((l) => l === 'start noise')).toHaveLength(1);
    expect(log).toContain('stop noise');
    expect(log.filter((l) => l === 'start tone')).toHaveLength(3);
  });

  it('muting mid-ride stops the rumble at once', () => {
    const { ctx, log } = fakeContext();
    const sound = createSound(false, () => ctx);
    sound.roll(4);
    sound.setMuted(true);
    expect(sound.muted).toBe(true);
    expect(log).toContain('stop noise');
    sound.roll(4);
    expect(log.filter((l) => l === 'start noise')).toHaveLength(1);
  });

  it('a browser without Web Audio, or one that refuses it, plays nothing and never throws', () => {
    const none = createSound(false, () => null);
    const refuses = createSound(false, () => {
      throw new Error('not allowed');
    });
    for (const sound of [none, refuses]) {
      expect(() => {
        sound.roll(5);
        sound.stopRoll();
        sound.play({ win: false, reason: 'HIT_OBSTACLE' });
      }).not.toThrow();
    }
  });
});
