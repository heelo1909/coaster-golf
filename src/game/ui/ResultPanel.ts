// The panel after a ride: the score against par on a win, or why it failed in plain words.
// It only shows what judge() returned (see game/CLAUDE.md); resultOf picks the words and is
// kept pure so it can be tested without a DOM.

import type { Level, SimResult } from '../../core';
import { messages } from './messages';

// After this many failed rides on a level, the panel offers the level's hint.
export const HINT_AFTER_FAILS = 3;

export type ResultView =
  | { kind: 'won'; title: string; underPar: boolean }
  | { kind: 'failed'; title: string; hint?: string };

// `score` is judge()'s character count; `failedRides` counts this ride if it failed.
export function resultOf(
  result: SimResult,
  score: number,
  level: Pick<Level, 'par' | 'hint'>,
  failedRides: number,
): ResultView {
  if (result.success) {
    return { kind: 'won', title: messages.won(score, level.par), underPar: score <= level.par };
  }
  const title = messages.failed(result.reason ?? 'TIMEOUT', result.failAt?.x ?? 0);
  if (level.hint && failedRides >= HINT_AFTER_FAILS) {
    return { kind: 'failed', title, hint: messages.hint(level.hint) };
  }
  return { kind: 'failed', title };
}

export interface ResultPanel {
  readonly element: HTMLElement;
  show(view: ResultView): void;
  hide(): void;
}

// `onNext` is left out on the last level, so there's no Next level button there.
export function createResultPanel(actions: {
  onNext?: (() => void) | undefined;
  onTryShorter: () => void;
}): ResultPanel {
  // The live region stays in the page so screen readers announce each new result.
  const root = document.createElement('div');
  root.className = 'result';
  root.dataset.testid = 'result-panel';
  root.setAttribute('aria-live', 'polite');

  function button(label: string, testid: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'result-btn';
    b.dataset.testid = testid;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  return {
    element: root,
    show(view) {
      root.dataset.kind = view.kind;
      const title = document.createElement('div');
      title.className = 'result-title';
      title.dataset.testid = 'result-title';
      title.textContent = view.title;
      const parts: HTMLElement[] = [title];

      if (view.kind === 'won') {
        if (view.underPar) {
          const star = document.createElement('div');
          star.className = 'result-star';
          star.dataset.testid = 'par-star';
          star.textContent = messages.parStar;
          parts.push(star);
        }
        const row = document.createElement('div');
        row.className = 'result-actions';
        if (actions.onNext) row.append(button(messages.nextLevel, 'next-level', actions.onNext));
        row.append(button(messages.tryShorter, 'try-shorter', actions.onTryShorter));
        parts.push(row);
      } else if (view.hint) {
        const hint = document.createElement('div');
        hint.className = 'result-hint';
        hint.dataset.testid = 'result-hint';
        hint.textContent = view.hint;
        parts.push(hint);
      }
      root.replaceChildren(...parts);
    },
    hide() {
      delete root.dataset.kind;
      root.replaceChildren();
    },
  };
}
