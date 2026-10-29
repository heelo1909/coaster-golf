// The equation box: a plain text input with a live character counter, a debounced live
// preview of the track, and parse errors shown inline with the bad character underlined.
// It only parses for the preview; judging a ride is judge()'s job (see game/CLAUDE.md).

import { evaluate, parseEquation, scoreEquation } from '../../core';
import type { Track } from '../render';
import { messages } from './messages';

export const PREVIEW_DEBOUNCE_MS = 150;

// What the preview should show for the current text. On an error there's no new track to
// draw, so the caller keeps the last good one, faded.
export type Preview =
  | { kind: 'empty' }
  | { kind: 'track'; track: Track }
  | { kind: 'error'; message: string; position: number };

export function previewOf(text: string): Preview {
  if (text.trim() === '') return { kind: 'empty' };
  const parsed = parseEquation(text);
  if (!parsed.ok) return { kind: 'error', ...parsed.error };
  const expr = parsed.expr;
  return { kind: 'track', track: (x) => evaluate(expr, x) };
}

// Splits the text around the character at `position`, so the UI can underline it. The bad
// part is a whole code point (an emoji isn't split in half). At the end of the text it's a
// single space, so "nothing after ^" still has something to underline.
export function splitAtError(
  text: string,
  position: number,
): { before: string; bad: string; after: string } {
  const at = Math.min(Math.max(0, position), text.length);
  const cp = text.codePointAt(at);
  const bad = cp === undefined ? ' ' : String.fromCodePoint(cp);
  return {
    before: text.slice(0, at),
    bad,
    after: text.slice(at + (cp === undefined ? 0 : bad.length)),
  };
}

// The counter beside the box. It turns gold at or under par, but only for an equation that
// parses, so a half-typed "(x-" doesn't look like a winner.
export function counterOf(
  text: string,
  par: number,
  parses: boolean,
): { label: string; underPar: boolean } {
  const chars = scoreEquation(text);
  return { label: messages.counter(chars, par), underPar: parses && chars > 0 && chars <= par };
}

export interface EquationInput {
  readonly element: HTMLElement;
  setPar(par: number): void;
}

export function createEquationInput(
  par: number,
  onPreview: (preview: Preview) => void,
): EquationInput {
  const root = document.createElement('div');
  root.className = 'eq';

  const row = document.createElement('div');
  row.className = 'eq-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'eq-input';
  input.placeholder = messages.equationPlaceholder;
  input.setAttribute('aria-label', messages.equationLabel);
  input.dataset.testid = 'equation-input';
  // Phone keyboards would otherwise capitalise "X" or "correct" sin into a word.
  input.autocomplete = 'off';
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.spellcheck = false;

  const counter = document.createElement('span');
  counter.className = 'eq-counter';
  counter.dataset.testid = 'char-counter';

  const error = document.createElement('div');
  error.className = 'eq-error';
  error.dataset.testid = 'equation-error';
  error.setAttribute('aria-live', 'polite');
  input.setAttribute('aria-describedby', (error.id = 'eq-error'));

  row.append(input, counter);
  root.append(row, error);

  let currentPar = par;
  let parses = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function showCounter(): void {
    const { label, underPar } = counterOf(input.value, currentPar, parses);
    counter.textContent = label;
    counter.classList.toggle('under-par', underPar);
  }

  function showError(message: string, position: number): void {
    const { before, bad, after } = splitAtError(input.value, position);
    const text = document.createElement('div');
    text.textContent = message;
    const where = document.createElement('code');
    const mark = document.createElement('u');
    mark.textContent = bad;
    where.append(before, mark, after);
    error.replaceChildren(text, where);
  }

  function update(): void {
    const preview = previewOf(input.value);
    parses = preview.kind === 'track';
    input.toggleAttribute('aria-invalid', preview.kind === 'error');
    if (preview.kind === 'error') showError(preview.message, preview.position);
    else error.replaceChildren();
    showCounter();
    onPreview(preview);
  }

  input.addEventListener('input', () => {
    showCounter();
    clearTimeout(timer);
    timer = setTimeout(update, PREVIEW_DEBOUNCE_MS);
  });

  showCounter();
  return {
    element: root,
    setPar(next) {
      currentPar = next;
      showCounter();
    },
  };
}
