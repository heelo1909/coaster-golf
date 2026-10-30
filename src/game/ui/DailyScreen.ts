// Today's daily: the play screen for the day's level, with a line on top saying which daily it
// is, how long until the next one, and the streak. When the day rolls over mid-game, the line
// offers the new daily instead of swapping the level out from under the player.

import { dailyNumber, liveStreak, msUntilNextDaily } from '../../core';
import type { Level } from '../../core';
import type { DailySave } from '../storage';
import { messages } from './messages';
import { mountPlayScreen } from './PlayScreen';
import type { PlayScreen } from './PlayScreen';

// "05:12:09": hours, minutes and seconds left, rounded up so it never shows 00:00:00 early.
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((p) => String(p).padStart(2, '0')).join(':');
}

export interface DailyActions {
  save: DailySave;
  onWin: (score: number, equation: string) => DailySave; // saves, returns the new state
  onBack: () => void;
  onNewDay: () => void; // the player taps "New daily" after the rollover
  now?: () => Date; // the clock; tests and the e2e pass their own
}

export function mountDailyScreen(
  root: HTMLElement,
  level: Level,
  n: number,
  actions: DailyActions,
): PlayScreen {
  const now = actions.now ?? (() => new Date());
  let save = actions.save;

  const bar = document.createElement('div');
  bar.className = 'daily-bar';
  bar.dataset.testid = 'daily-bar';
  const title = document.createElement('span');
  title.className = 'daily-title';
  title.textContent = messages.dailyTitle(n);
  const countdown = document.createElement('span');
  countdown.className = 'daily-next';
  countdown.dataset.testid = 'daily-countdown';
  const streak = document.createElement('span');
  streak.className = 'daily-streak';
  streak.dataset.testid = 'daily-streak';
  bar.append(title, countdown, streak);

  function showStreak(): void {
    const days = liveStreak(save.streak, n);
    streak.textContent = days > 0 ? messages.streak(days) : '';
  }

  // Once the day has rolled over, the countdown becomes a button to the new daily.
  let timer: ReturnType<typeof setInterval> | undefined;
  function tick(): void {
    const date = now();
    if (dailyNumber(date) === n) {
      countdown.textContent = messages.nextDaily(formatCountdown(msUntilNextDaily(date)));
      return;
    }
    clearInterval(timer);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'daily-new';
    b.dataset.testid = 'daily-new';
    b.textContent = messages.newDaily;
    b.addEventListener('click', () => actions.onNewDay());
    countdown.replaceChildren(b);
  }

  showStreak();
  tick();
  if (countdown.firstChild?.nodeType === Node.TEXT_NODE) timer = setInterval(tick, 1000);

  const screen = mountPlayScreen(root, level, {
    best: save.best[n],
    number: `#${n}`,
    bar,
    onWin: (score, equation) => {
      save = actions.onWin(score, equation);
      showStreak();
      return save.best[n];
    },
    onBack: actions.onBack,
  });
  return {
    unmount: () => {
      clearInterval(timer);
      screen.unmount();
    },
    redraw: () => screen.redraw(),
  };
}
