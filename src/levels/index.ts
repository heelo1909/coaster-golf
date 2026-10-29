// The levels, in play order (see src/levels/CLAUDE.md). Each file goes through validateLevel(),
// never a cast, so a broken file fails loudly at load time; `npm run check-levels` catches it first.
// Explicit imports, not import.meta.glob, so the Worker (Section 8) can load the same list.
import { validateLevel } from '../core';
import type { Level } from '../core';
import c01 from './campaign/c01.json';
import c02 from './campaign/c02.json';
import c03 from './campaign/c03.json';
import c04 from './campaign/c04.json';
import c05 from './campaign/c05.json';
import c06 from './campaign/c06.json';
import c07 from './campaign/c07.json';
import c08 from './campaign/c08.json';
import c09 from './campaign/c09.json';
import c10 from './campaign/c10.json';
import c11 from './campaign/c11.json';
import c12 from './campaign/c12.json';
import c13 from './campaign/c13.json';
import c14 from './campaign/c14.json';
import c15 from './campaign/c15.json';

function load(raw: unknown): Level {
  const result = validateLevel(raw);
  if (!result.ok) throw new Error(`invalid level file: ${result.errors.join('; ')}`);
  return result.level;
}

// The Level Set, played in order.
export const campaign: readonly Level[] = [
  c01,
  c02,
  c03,
  c04,
  c05,
  c06,
  c07,
  c08,
  c09,
  c10,
  c11,
  c12,
  c13,
  c14,
  c15,
].map(load);

// The daily pool (Section 7).
export const daily: readonly Level[] = [];
