// One level on screen: the canvas on top and the equation box under it. The Ride button and
// result panel join later in Section 5.

import type { Level } from '../../core';
import { createRenderer } from '../render';
import type { Track } from '../render';
import { createEquationInput } from './EquationInput';

export function mountPlayScreen(root: HTMLElement, level: Level): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'play-canvas';
  canvas.dataset.testid = 'game-canvas';

  const panel = document.createElement('div');
  panel.className = 'play-panel';

  root.replaceChildren(canvas, panel);
  const renderer = createRenderer(canvas, level);

  let lastGood: Track | null = null;
  const input = createEquationInput(level.par, (preview) => {
    if (preview.kind === 'track') lastGood = preview.track;
    if (preview.kind === 'empty') lastGood = null;
    renderer.setTrack(lastGood, preview.kind === 'error');
  });
  panel.append(input.element);

  window.addEventListener('resize', () => renderer.resize());
}
