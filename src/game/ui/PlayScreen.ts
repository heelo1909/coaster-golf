// One level on screen: the canvas on top, then the equation box and the Ride button. A ride
// is judged by judge() and played back from its recorded path; the result panel joins later
// in Section 5.

import { judge } from '../../core';
import type { Level } from '../../core';
import { createRenderer } from '../render';
import type { Track } from '../render';
import { createEquationInput } from './EquationInput';
import { messages } from './messages';

export function mountPlayScreen(root: HTMLElement, level: Level): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'play-canvas';
  canvas.dataset.testid = 'game-canvas';

  const panel = document.createElement('div');
  panel.className = 'play-panel';

  root.replaceChildren(canvas, panel);
  const renderer = createRenderer(canvas, level);

  let lastGood: Track | null = null;
  let riding = false;
  const input = createEquationInput(
    level.par,
    (preview) => {
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

  panel.append(input.element, rideButton);

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
    const judged = judge(level, input.value());
    if (!judged.ok) return; // the inline error already shows what's wrong
    setRiding(true);
    await renderer.playRide(judged.result);
    setRiding(false);
  }

  // Tapping the canvas during a ride skips to the end.
  canvas.addEventListener('pointerdown', () => {
    if (riding) renderer.skipRide();
  });

  window.addEventListener('resize', () => renderer.resize());
}
