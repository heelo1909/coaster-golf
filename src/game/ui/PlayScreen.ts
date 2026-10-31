// One level on screen: the canvas on top, then the result panel, the equation box and the
// Ride button. A ride is judged by judge(), played back from its recorded path, and then the
// result panel says how it went.

import { judge } from '../../core';
import type { Level } from '../../core';
import { createRenderer } from '../render';
import type { Best } from '../storage';
import type { Track } from '../render';
import { createBackButton } from './BackButton';
import { attachGestures } from './CanvasGestures';
import { createEquationInput } from './EquationInput';
import { messages } from './messages';
import { createResultPanel, resultOf } from './ResultPanel';
import { gameSound } from './sound';
import type { Outcome } from './sound';
import type { ResultView } from './ResultPanel';

export interface PlayScreen {
  unmount(): void;
  redraw(): void; // after a theme change
}

export interface PlayActions {
  best?: Best | undefined; // this level's saved best, shown under the box
  number?: string; // replaces the level's number in the canvas title (the daily's "#12")
  bar?: HTMLElement; // an info line at the top of the panel (the daily's countdown)
  shareText?: () => string; // the daily: Share on the win panel
  onLeaderboard?: ((equation: string) => void) | undefined; // after a win, with its equation
  // Before the panel shows, to save the win; returns the best as it now stands.
  onWin: (score: number, equation: string) => Best | undefined;
  onBack: () => void; // to level select
  onNext?: (() => void) | undefined; // left out on the last level
}

export function mountPlayScreen(root: HTMLElement, level: Level, actions: PlayActions): PlayScreen {
  const canvas = document.createElement('canvas');
  canvas.className = 'play-canvas';
  canvas.dataset.testid = 'game-canvas';

  const panel = document.createElement('div');
  panel.className = 'play-panel';

  // Top-left, mirroring the theme picker top-right; the canvas keeps that corner clear.
  const back = createBackButton('back-to-levels', () => actions.onBack());

  root.replaceChildren(canvas, back, panel);
  const renderer = createRenderer(canvas, level, actions.number);

  const panelView = createResultPanel({
    onNext: actions.onNext,
    shareText: actions.shareText,
    onLeaderboard: actions.onLeaderboard && (() => actions.onLeaderboard?.(lastWin)),
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
      showNext();
      renderer.resize();
    },
    hide(): void {
      if (!panelView.element.hasChildNodes()) return;
      panelView.hide();
      showNext();
      renderer.resize();
    },
  };

  let lastGood: Track | null = null;
  let lastWin = ''; // the equation of the latest win, for the leaderboard
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

  // Once the level is beaten, Next level stays beside Ride, so the player can move on whenever
  // they're done refining. Hidden while the result panel is open (it has its own Next).
  let beaten = actions.best !== undefined;
  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'result-btn next-btn';
  nextButton.dataset.testid = 'next-button';
  nextButton.textContent = messages.nextLevelArrow;
  nextButton.addEventListener('click', () => actions.onNext?.());
  function showNext(): void {
    nextButton.hidden = !beaten || !actions.onNext || panelView.element.hasChildNodes();
  }
  const actionsRow = document.createElement('div');
  actionsRow.className = 'play-actions';
  actionsRow.append(nextButton, rideButton);

  // The saved best, quietly under the box, so there's always a number to beat.
  const bestLine = document.createElement('div');
  bestLine.className = 'best-line';
  bestLine.dataset.testid = 'best-line';
  function showBest(best: Best | undefined): void {
    bestLine.replaceChildren();
    if (!best) return;
    const equation = document.createElement('code');
    equation.textContent = best.equation;
    bestLine.append(messages.yourBest, equation, messages.bestChars(best.score));
  }
  showBest(actions.best);

  if (actions.bar) panel.append(actions.bar);
  panel.append(result.element, input.element, bestLine, actionsRow);
  showNext();
  // A level already beaten opens with the best equation in the box, ready to shorten.
  if (actions.best) input.setValue(actions.best.equation);
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
    // The rumble follows the cart; the win or fail sound plays as the path ends, or on a skip.
    const sound = gameSound();
    const outcome: Outcome = judged.result.success
      ? { win: true, star: judged.score <= level.par }
      : { win: false, reason: judged.result.reason };
    let sounded = false;
    const finish = (): void => {
      sound.stopRoll();
      if (!sounded) sound.play(outcome);
      sounded = true;
    };
    await renderer.playRide(judged.result, (speed, ended) => {
      if (ended) finish();
      else sound.roll(speed);
    });
    if (input.value() === text) finish();
    else sound.stopRoll(); // cancelled by an edit: no verdict to sound
    setRiding(false);
    if (input.value() !== text) return; // edited mid-ride: that ride no longer counts
    if (judged.result.success) {
      if (outcome.win && outcome.star) renderer.celebrate();
      lastWin = text;
      beaten = true;
      showBest(actions.onWin(judged.score, text));
    } else failedRides++;
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
      gameSound().stopRoll();
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    },
    redraw: () => renderer.restyle(),
  };
}
