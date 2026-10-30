// The Level Set as a grid of tiles: each shows its number and name, then its par, or once
// beaten the best score with a star at or under par. A level unlocks when the one before it
// has been beaten; the first is always open. tilesOf is pure so the rules are tested without
// a DOM.

import type { Level } from '../../core';
import type { Progress } from '../storage';
import { messages } from './messages';

export interface Tile {
  id: string;
  number: string; // "01"
  name: string;
  locked: boolean;
  par: number;
  best?: number; // characters; only once beaten
  underPar: boolean;
  label: string; // the whole tile in words, for screen readers
}

export function isUnlocked(
  levels: readonly Pick<Level, 'id'>[],
  progress: Progress,
  index: number,
): boolean {
  if (index === 0) return true;
  const before = levels[index - 1];
  return before !== undefined && progress.best[before.id] !== undefined;
}

export function tilesOf(
  levels: readonly Pick<Level, 'id' | 'name' | 'par'>[],
  progress: Progress,
): Tile[] {
  return levels.map((level, i) => {
    const number = String(i + 1).padStart(2, '0');
    const locked = !isUnlocked(levels, progress, i);
    const best = progress.best[level.id]?.score;
    const underPar = best !== undefined && best <= level.par;
    const label = messages.tileLabel(i + 1, level.name, locked, best, level.par);
    const tile: Tile = {
      id: level.id,
      number,
      name: level.name,
      par: level.par,
      locked,
      underPar,
      label,
    };
    if (best !== undefined) tile.best = best;
    return tile;
  });
}

export function mountLevelSelect(
  root: HTMLElement,
  levels: readonly Level[],
  progress: Progress,
  notSaving: boolean, // storage is blocked: say so, quietly
  onPick: (id: string) => void,
  onHowTo: () => void,
): void {
  const screen = document.createElement('section');
  screen.className = 'levels';
  screen.dataset.testid = 'level-select';

  const title = document.createElement('h1');
  title.className = 'levels-title';
  title.textContent = messages.levelsTitle;

  const grid = document.createElement('ol');
  grid.className = 'levels-grid';

  for (const tile of tilesOf(levels, progress)) {
    const item = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'level-tile';
    b.dataset.testid = `level-${tile.id}`;
    b.setAttribute('aria-label', tile.label);
    b.disabled = tile.locked;
    if (tile.locked) b.dataset.locked = '';
    if (tile.best !== undefined) b.dataset.beaten = '';

    const number = document.createElement('span');
    number.className = 'tile-number';
    number.textContent = tile.number;
    const name = document.createElement('span');
    name.className = 'tile-name';
    name.textContent = tile.name;
    const score = document.createElement('span');
    score.className = 'tile-score';
    score.dataset.testid = `level-${tile.id}-score`;
    if (tile.locked) score.textContent = messages.locked;
    else if (tile.best !== undefined) score.textContent = messages.tileBest(tile.best);
    else score.textContent = messages.tilePar(tile.par);
    if (tile.underPar) {
      const star = document.createElement('span');
      star.className = 'tile-star';
      star.textContent = ' ★';
      score.append(star);
    }
    for (const el of [number, name, score]) el.setAttribute('aria-hidden', 'true');
    b.append(number, name, score);
    b.addEventListener('click', () => onPick(tile.id));
    item.append(b);
    grid.append(item);
  }

  screen.append(title);
  if (notSaving) {
    const note = document.createElement('p');
    note.className = 'levels-note';
    note.dataset.testid = 'not-saving';
    note.textContent = messages.notSaving;
    screen.append(note);
  }
  const howTo = document.createElement('button');
  howTo.type = 'button';
  howTo.className = 'levels-howto';
  howTo.dataset.testid = 'how-to-link';
  howTo.textContent = messages.howToLink;
  howTo.addEventListener('click', onHowTo);

  screen.append(grid, howTo);
  root.replaceChildren(screen);
}
