// One level on screen: the canvas on top, then the result panel, the equation box and the
// Ride button. A ride is judged by judge(), played back from its recorded path, and then the
// result panel says how it went.

import { judge } from '../../core';
import type { Level } from '../../core';
import { createRenderer } from '../render';
import type { Track } from '../render';
import { createEquationInput } from './EquationInput';
import { messages } from './messages';
import { createResultPanel, resultOf } from './ResultPanel';

// Returns a function that unmounts the screen. `onNext` is left out on the last level.
export function mountPlayScreen(root: HTMLElement, level: Level, onNext?: () => void): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'play-canvas';
  canvas.dataset.testid = 'game-canvas';

  const panel = document.createElement('div');
  panel.className = 'play-panel';

  root.replaceChildren(canvas, panel);
  const renderer = createRenderer(canvas, level);

  const result = createResultPanel({
    onNext,
    onTryShorter: () => {
      result.hide();
      input.focus();
    },
  });

  let lastGood: Track | null = null;
  let riding = false;
  let failedRides = 0;
  const input = createEquationInput(
    level.par,
    (preview) => {
      result.hide(); // the result belongs to the equation that was ridden
      if (preview.kind === 'track') lastGood = preview.track;
      if (preview.kind === 'empty') lastGood = null;
      renderer.setTrack(lastGood, preview.kind === 'error');
    },
    () => rideOrSkip(),
  );

  const rideButton = document.createElement('button');
  rideButton.type = 'button';
  rideButton.className = 'ride-btn';
  rideButton.dataset.testid = 'ride-button';
  rideButton.textContent = messages.ride;
  rideButton.addEventListener('click', () => rideOrSkip());

  panel.append(result.element, input.element, rideButton);

  function setRiding(on: boolean): void {
    riding = on;
    rideButton.textContent = on ? messages.skip : messages.ride;
    canvas.toggleAttribute('data-riding', on);
  }

  async function rideOrSkip(): Promise<void> {
    if (riding) {
      renderer.skipRide();
      return;
    }
    if (input.value().trim() === '') return;
    input.flush(); // draw exactly the track that's about to be ridden
    const text = input.value();
    const judged = judge(level, text);
    if (!judged.ok) return; // the inline error already shows what's wrong
    result.hide();
    setRiding(true);
    await renderer.playRide(judged.result);
    setRiding(false);
    if (input.value() !== text) return; // edited mid-ride: that ride no longer counts
    if (!judged.result.success) failedRides++;
    result.show(resultOf(judged.result, judged.score, level, failedRides));
  }

  // Tapping the canvas during a ride skips to the end.
  canvas.addEventListener('pointerdown', () => {
    if (riding) renderer.skipRide();
  });

  const onResize = (): void => renderer.resize();
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
