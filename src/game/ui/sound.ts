// Sound effects, made on the spot with Web Audio (no audio files): a rolling rumble that
// follows the cart's speed during a ride, a short rising chime on a win (one note higher at
// or under par) and a fail sound that matches what went wrong. A mute toggle sits next to the
// theme picker, and the choice is remembered on this device (storage/profile.ts).
//
// The audio context is only made the first time a sound plays unmuted, which is always after a
// tap on Ride, so browsers allow it. Nothing here throws: no Web Audio means no sound.

import type { FailReason } from '../../core';
import { loadProfile, saveProfile } from '../storage';
import { messages } from './messages';

// One sound in a cue: a tone gliding from one pitch to another, or a burst of noise through a
// band-pass filter centred on `from` (gliding to `to`). Times are in seconds from the cue's
// start; gain is the peak loudness (0–1) before the master volume.
export interface Blip {
  kind: 'tone' | 'noise';
  wave?: OscillatorType; // tones only; sine when left out
  from: number; // Hz
  to: number; // Hz
  at: number;
  dur: number;
  gain: number;
}

export type Outcome = { win: true; star: boolean } | { win: false; reason: FailReason | undefined };

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

// What plays when a ride ends.
export function cueFor(outcome: Outcome): Blip[] {
  if (outcome.win) {
    const notes = outcome.star ? [C5, E5, G5, C6] : [C5, E5, G5];
    return notes.map((f, i) => ({
      kind: 'tone',
      wave: 'triangle',
      from: f,
      to: f,
      at: i * 0.09,
      dur: i === notes.length - 1 ? 0.45 : 0.16,
      gain: 0.5,
    }));
  }
  switch (outcome.reason) {
    case 'HIT_OBSTACLE': // a crunch and a thud
      return [
        { kind: 'noise', from: 1800, to: 400, at: 0, dur: 0.28, gain: 0.9 },
        { kind: 'tone', from: 140, to: 50, at: 0, dur: 0.25, gain: 0.7 },
      ];
    case 'FLEW_OFF': // a falling whistle
      return [{ kind: 'tone', from: 880, to: 180, at: 0, dur: 0.8, gain: 0.35 }];
    case 'STALLED': // a deflated "wah-wah"
      return [
        { kind: 'tone', wave: 'triangle', from: 330, to: 300, at: 0, dur: 0.22, gain: 0.45 },
        { kind: 'tone', wave: 'triangle', from: 294, to: 220, at: 0.24, dur: 0.4, gain: 0.45 },
      ];
    default: // the track itself was the problem: a short low buzz
      return [{ kind: 'tone', wave: 'square', from: 110, to: 98, at: 0, dur: 0.3, gain: 0.18 }];
  }
}

// The rolling rumble at a given cart speed (world units per second): silent when (nearly)
// still, then louder and brighter as the cart speeds up, levelling off when it's flying.
export function rollAt(speed: number): { gain: number; freq: number } {
  const s = Number.isFinite(speed) ? Math.max(speed, 0) : 0;
  if (s < 0.05) return { gain: 0, freq: 180 };
  const k = Math.min(s / 12, 1);
  return { gain: 0.08 + 0.32 * k, freq: 180 + 900 * k };
}

const MASTER_GAIN = 0.25;

export interface Sound {
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  roll(speed: number): void; // during a ride, every frame
  stopRoll(): void;
  play(outcome: Outcome): void;
}

// `makeContext` is there for tests; the default finds the browser's AudioContext, if any.
export function createSound(
  muted: boolean,
  makeContext: () => AudioContext | null = browserContext,
): Sound {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let rolling: { source: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null =
    null;
  let tried = false;

  // The context, made on first use (null when muted or there's no Web Audio).
  function audio(): AudioContext | null {
    if (muted) return null;
    if (!tried) {
      tried = true;
      try {
        ctx = makeContext();
        if (ctx) {
          master = ctx.createGain();
          master.gain.value = MASTER_GAIN;
          master.connect(ctx.destination);
          noise = noiseBuffer(ctx);
        }
      } catch {
        ctx = null;
      }
    }
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
    return ctx;
  }

  function stopRoll(): void {
    if (!rolling) return;
    const { source, gain } = rolling;
    rolling = null;
    try {
      const now = gain.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.03);
      source.stop(now + 0.2);
    } catch {
      // already stopped
    }
  }

  return {
    get muted() {
      return muted;
    },
    setMuted(next) {
      muted = next;
      if (muted) stopRoll();
    },
    roll(speed) {
      const ac = audio();
      if (!ac || !master || !noise) return;
      try {
        if (!rolling) {
          const source = ac.createBufferSource();
          source.buffer = noise;
          source.loop = true;
          const filter = ac.createBiquadFilter();
          filter.type = 'bandpass';
          filter.Q.value = 0.8;
          const gain = ac.createGain();
          gain.gain.value = 0;
          source.connect(filter).connect(gain).connect(master);
          source.start();
          rolling = { source, filter, gain };
        }
        const { gain, freq } = rollAt(speed);
        rolling.gain.gain.setTargetAtTime(gain, ac.currentTime, 0.05);
        rolling.filter.frequency.setTargetAtTime(freq, ac.currentTime, 0.05);
      } catch {
        rolling = null;
      }
    },
    stopRoll,
    play(outcome) {
      const ac = audio();
      if (!ac || !master || !noise) return;
      try {
        const start = ac.currentTime + 0.01;
        for (const blip of cueFor(outcome)) playBlip(ac, master, noise, blip, start);
      } catch {
        // no sound this time
      }
    },
  };
}

function playBlip(
  ac: AudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  blip: Blip,
  start: number,
): void {
  const t0 = start + blip.at;
  const t1 = t0 + blip.dur;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(blip.gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t1);
  env.connect(out);

  let source: AudioScheduledSourceNode;
  if (blip.kind === 'tone') {
    const osc = ac.createOscillator();
    osc.type = blip.wave ?? 'sine';
    osc.frequency.setValueAtTime(blip.from, t0);
    osc.frequency.exponentialRampToValueAtTime(blip.to, t1);
    osc.connect(env);
    source = osc;
  } else {
    const buffer = ac.createBufferSource();
    buffer.buffer = noise;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(blip.from, t0);
    filter.frequency.exponentialRampToValueAtTime(blip.to, t1);
    buffer.connect(filter).connect(env);
    source = buffer;
  }
  source.start(t0);
  source.stop(t1 + 0.05);
}

// One second of white noise, looped for the rumble and cut short for crashes. A fixed
// generator, not Math.random, so it sounds the same every visit.
function noiseBuffer(ac: AudioContext): AudioBuffer {
  const buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x2545f491;
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    data[i] = ((seed >>> 0) / 0xffffffff) * 2 - 1;
  }
  return buffer;
}

function browserContext(): AudioContext | null {
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  return Ctor ? new Ctor() : null;
}

// Sound is on unless the player muted it on this device.
export function savedMuted(): boolean {
  return loadProfile().muted === true;
}

let shared: Sound | null = null;

// The one Sound the whole game shares (the play screens and the mute toggle).
export function gameSound(): Sound {
  shared ??= createSound(savedMuted());
  return shared;
}

// The mute toggle: a small round speaker button left of the theme picker. Its pressed state
// means muted, and its label says what a tap does.
export function createMuteToggle(sound: Sound): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mute-toggle';
  button.dataset.testid = 'mute-toggle';
  const speaker =
    '<path d="M2.5 6h2.5L8.5 3v10L5 10H2.5z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>';
  const waves =
    '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.75 3.5a6.25 6.25 0 0 1 0 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
  const cross =
    '<path d="m11 6 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';

  function show(): void {
    const muted = sound.muted;
    button.setAttribute('aria-pressed', String(muted));
    button.setAttribute('aria-label', muted ? messages.unmute : messages.mute);
    button.title = muted ? messages.unmute : messages.mute;
    button.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${speaker}${muted ? cross : waves}</svg>`;
  }

  button.addEventListener('click', () => {
    sound.setMuted(!sound.muted);
    saveProfile({ ...loadProfile(), muted: sound.muted });
    show();
  });
  show();
  return button;
}
