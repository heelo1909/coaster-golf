// One level on screen: the canvas on top, then the result panel, the equation box and the
// Ride button. A ride is judged by judge(), played back from its recorded path, and then the
// result panel says how it went.

import { judge } from '../../core';
import type { Level } from '../../core';
import { createRenderer } from '../render';
import type { Track } from '../render';
import { attachGestures } from './CanvasGestures';
import { createEquationInput } from './EquationInput';
import { messages } from './messages';
import { createResultPanel, resultOf } from './ResultPanel';
import type { ResultView } from './ResultPanel';

export interface PlayScreen {
  unmount(): void;
  redraw(): void; // after a theme change
}

// `onNext` is left out on the last level.
export function mountPlayScreen(root: HTMLElement, level: Level, onNext?: () => void): PlayScreen {
  const canvas = document.createElement('canvas');
  canvas.className = 'play-canvas';
  canvas.dataset.testid = 'game-canvas';

  const panel = document.createElement('div');
  panel.className = 'play-panel';

  root.replaceChildren(canvas, panel);
  const renderer = createRenderer(canvas, level);

  const panelView = createResultPanel({
    onNext,
    onTryShorter: editAgain,
    onTryAgain: editAgain,
  });

  // Both close the panel and put the player back in the box with their equation kept, the
  // cursor at the end. The marker stays on the track until they change it.
  function editAgain(): void {
    result.hide();
    input.focus();
  }

  // Opening or closing the panel changes the canvas height, so the canvas is resized right
  // away (the ResizeObserver below only runs while the page is rendering).
  const result = {
    element: panelView.element,
    show(view: ResultView): void {
      panelView.show(view);
      renderer.resize();
    },
    hide(): void {
      if (!panelView.element.hasChildNodes()) return;
      panelView.hide();
      renderer.resize();
    },
  };

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
  renderer.resize(); // the panel now takes its height, so measure the canvas again

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

  // Pinch, scroll and drag move the camera; a tap during a ride skips to the end.
  attachGestures(canvas, {
    zoomAt: (factor, sx, sy) => renderer.zoomAt(factor, sx, sy),
    panBy: (dx, dy) => renderer.panBy(dx, dy),
    tap: () => {
      if (riding) renderer.skipRide();
    },
    reset: () => renderer.resetView(),
  });

  // The canvas changes size with the window and also when the result panel opens or closes,
  // so watch the canvas itself; the window event still catches devicePixelRatio changes.
  const onResize = (): void => renderer.resize();
  const observer = new ResizeObserver(onResize);
  observer.observe(canvas);
  window.addEventListener('resize', onResize);
  return {
    unmount: () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    },
    redraw: () => renderer.restyle(),
  };
}
