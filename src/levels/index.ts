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
import d001 from './daily/d001.json';
import d002 from './daily/d002.json';
import d003 from './daily/d003.json';
import d004 from './daily/d004.json';
import d005 from './daily/d005.json';
import d006 from './daily/d006.json';
import d007 from './daily/d007.json';
import d008 from './daily/d008.json';
import d009 from './daily/d009.json';
import d010 from './daily/d010.json';
import d011 from './daily/d011.json';
import d012 from './daily/d012.json';
import d013 from './daily/d013.json';
import d014 from './daily/d014.json';
import d015 from './daily/d015.json';
import d016 from './daily/d016.json';
import d017 from './daily/d017.json';
import d018 from './daily/d018.json';
import d019 from './daily/d019.json';
import d020 from './daily/d020.json';
import d021 from './daily/d021.json';
import d022 from './daily/d022.json';
import d023 from './daily/d023.json';
import d024 from './daily/d024.json';
import d025 from './daily/d025.json';
import d026 from './daily/d026.json';
import d027 from './daily/d027.json';
import d028 from './daily/d028.json';
import d029 from './daily/d029.json';
import d030 from './daily/d030.json';

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

// The daily pool (Section 7), in schedule order: day n plays daily[(n - 1) % length]. Every
// ten days mix four easy, four medium and two hard levels.
export const daily: readonly Level[] = [
  d001,
  d002,
  d003,
  d004,
  d005,
  d006,
  d007,
  d008,
  d009,
  d010,
  d011,
  d012,
  d013,
  d014,
  d015,
  d016,
  d017,
  d018,
  d019,
  d020,
  d021,
  d022,
  d023,
  d024,
  d025,
  d026,
  d027,
  d028,
  d029,
  d030,
].map(load);
