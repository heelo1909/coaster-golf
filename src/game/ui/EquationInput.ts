// The equation box: a plain text input with a live character counter, a debounced live
// preview of the track and of the pretty maths (KaTeX), and parse errors shown inline with
// the bad character underlined. Pasting and dropping text are blocked, with a short note. It
// only parses for the preview; judging a ride is judge()'s job (see game/CLAUDE.md).

import katex from 'katex';
import 'katex/dist/katex.min.css';
import { evaluate, parseEquation, scoreEquation, toLatex } from '../../core';
import type { Track } from '../render';
import { messages } from './messages';

export const PREVIEW_DEBOUNCE_MS = 150;

// What the preview should show for the current text. On an error there's no new track to
// draw, so the caller keeps the last good one, faded. `latex` is what KaTeX renders under
// the box; it comes from toLatex, never from the raw text.
export type Preview =
  | { kind: 'empty' }
  | { kind: 'track'; track: Track; latex: string }
  | { kind: 'error'; message: string; position: number };

export function previewOf(text: string): Preview {
  if (text.trim() === '') return { kind: 'empty' };
  const parsed = parseEquation(text);
  if (!parsed.ok) return { kind: 'error', ...parsed.error };
  const expr = parsed.expr;
  return { kind: 'track', track: (x) => evaluate(expr, x), latex: toLatex(expr) };
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

// beforeinput types that bring in text the player didn't type. Blocking these as well as the
// paste and drop events covers browsers that skip one or the other (and Emacs-style yank).
// This only stops casual copying of answers; the server re-runs every ride.
const BLOCKED_INPUT_TYPES = new Set(['insertFromPaste', 'insertFromDrop', 'insertFromYank']);

export function isBlockedInput(inputType: string): boolean {
  return BLOCKED_INPUT_TYPES.has(inputType);
}

// The quick keys under the box on touch screens, for the symbols phone keyboards hide.
// `insert` is what a tap types; sin and cos bring their opening bracket.
export const QUICK_KEYS: readonly { label: string; insert: string }[] = [
  { label: 'x', insert: 'x' },
  { label: '^', insert: '^' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: '|', insert: '|' },
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'π', insert: 'pi' },
];

// Replaces the selection [start, end) with `text`, returning the new value and where the
// cursor goes (just after the inserted text).
export function insertAt(
  value: string,
  start: number,
  end: number,
  text: string,
): { value: string; caret: number } {
  const a = Math.min(Math.max(0, start), value.length);
  const b = Math.min(Math.max(a, end), value.length);
  return { value: value.slice(0, a) + text + value.slice(b), caret: a + text.length };
}

export interface EquationInput {
  readonly element: HTMLElement;
  value(): string;
  focus(): void;
  // Runs any pending preview now, so the drawn track matches the text before a ride.
  flush(): void;
  setPar(par: number): void;
  // Puts `text` in the box and previews it straight away (a saved best when a level opens).
  setValue(text: string): void;
}

export function createEquationInput(
  par: number,
  onPreview: (preview: Preview) => void,
  onSubmit: () => void, // Enter = Ride
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
  input.enterKeyHint = 'go'; // the phone keyboard's Enter key reads "Go": it rides

  const counter = document.createElement('span');
  counter.className = 'eq-counter';
  counter.dataset.testid = 'char-counter';

  // The pretty maths. KaTeX also writes a hidden MathML copy for screen readers.
  const math = document.createElement('div');
  math.className = 'eq-math';
  math.dataset.testid = 'math-preview';

  const error = document.createElement('div');
  error.className = 'eq-error';
  error.dataset.testid = 'equation-error';
  error.setAttribute('aria-live', 'polite');
  input.setAttribute('aria-describedby', (error.id = 'eq-error'));

  // "No pasting" lives apart from the parse error so the two never overwrite each other.
  const note = document.createElement('div');
  note.className = 'eq-note';
  note.dataset.testid = 'paste-note';
  note.setAttribute('aria-live', 'polite');

  // Quick keys type by script, so the no-pasting rule doesn't block them. Pressing one keeps
  // the focus (and the phone keyboard) in the box.
  const keys = document.createElement('div');
  keys.className = 'eq-keys';
  keys.dataset.testid = 'quick-keys';
  for (const key of QUICK_KEYS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'eq-key';
    b.textContent = key.label;
    b.setAttribute('aria-label', `Type ${key.insert}`);
    b.addEventListener('pointerdown', (event) => event.preventDefault());
    b.addEventListener('click', () => type(key.insert));
    keys.append(b);
  }

  row.append(input, counter);
  root.append(row, keys, math, error, note);

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

  // On an error the last good maths stays, faded, like the track on the canvas.
  function showMath(preview: Preview): void {
    if (preview.kind === 'empty') math.replaceChildren();
    if (preview.kind === 'track') {
      katex.render(preview.latex, math, { throwOnError: false, output: 'htmlAndMathml' });
    }
    math.classList.toggle('faded', preview.kind === 'error');
  }

  function update(): void {
    const preview = previewOf(input.value);
    parses = preview.kind === 'track';
    input.toggleAttribute('aria-invalid', preview.kind === 'error');
    if (preview.kind === 'error') showError(preview.message, preview.position);
    else error.replaceChildren();
    showMath(preview);
    showCounter();
    onPreview(preview);
  }

  function type(text: string): void {
    const focused = document.activeElement === input;
    const start = focused ? (input.selectionStart ?? input.value.length) : input.value.length;
    const end = focused ? (input.selectionEnd ?? start) : start;
    const next = insertAt(input.value, start, end, text);
    input.value = next.value;
    input.setSelectionRange(next.caret, next.caret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function blockPaste(event: Event): void {
    event.preventDefault();
    note.textContent = messages.noPasting;
  }

  input.addEventListener('paste', blockPaste);
  input.addEventListener('drop', blockPaste);
  input.addEventListener('beforeinput', (event) => {
    if (isBlockedInput(event.inputType)) blockPaste(event);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      onSubmit();
    }
  });

  input.addEventListener('input', () => {
    note.replaceChildren();
    showCounter();
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      update();
    }, PREVIEW_DEBOUNCE_MS);
  });

  showCounter();
  return {
    element: root,
    value: () => input.value,
    focus() {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    },
    flush() {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      update();
    },
    setPar(next) {
      currentPar = next;
      showCounter();
    },
    setValue(text) {
      clearTimeout(timer);
      timer = undefined;
      input.value = text;
      update();
    },
  };
}
