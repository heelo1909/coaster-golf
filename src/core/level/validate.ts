import { scoreEquation } from '../equation';
import { judge } from '../judge';
import { CART_RADIUS, circleTouches } from '../sim';
import type { Level, Obstacle, StartStation, Station } from './types';

export type ValidateResult = { ok: true; level: Level } | { ok: false; errors: string[] };

// Turns raw JSON into a Level, or lists everything wrong with it (see level/CLAUDE.md
// § Validation Rules). Three passes, each only once the one before is clean: the shape (types
// and no unknown fields), then the layout and par, then riding the reference. The returned
// Level is a fresh copy built from the checked fields, never the raw object cast.
export function validateLevel(raw: unknown): ValidateResult {
  const errors: string[] = [];
  const level = readLevel(raw, errors);
  if (!level) return { ok: false, errors };

  checkLayout(level, errors);
  if (errors.length > 0) return { ok: false, errors };

  const j = judge(level, level.reference);
  if (!j.ok) {
    errors.push(`reference doesn't parse: ${j.parseError.message}`);
  } else if (!j.result.success) {
    const at = j.result.failAt;
    const where = at ? ` at x = ${round(at.x)}` : '';
    errors.push(`reference "${level.reference}" doesn't win: ${j.result.reason}${where}`);
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, level };
}

// --- Pass 1: the shape ---

const LEVEL_FIELDS = ['id', 'name', 'bounds', 'start', 'end', 'obstacles', 'par', 'reference'];

function readLevel(raw: unknown, errors: string[]): Level | undefined {
  const o = readObject(raw, 'level', LEVEL_FIELDS, ['hint'], errors);
  if (!o) return undefined;
  const before = errors.length;

  const id = readString(o, 'id', 'id', errors);
  const name = readString(o, 'name', 'name', errors);
  const reference = readString(o, 'reference', 'reference', errors);
  const par = readNumber(o, 'par', 'par', errors);
  const b = readObject(o['bounds'], 'bounds', ['xMin', 'xMax', 'yMin', 'yMax'], [], errors);
  const bounds = b && {
    xMin: readNumber(b, 'xMin', 'bounds.xMin', errors),
    xMax: readNumber(b, 'xMax', 'bounds.xMax', errors),
    yMin: readNumber(b, 'yMin', 'bounds.yMin', errors),
    yMax: readNumber(b, 'yMax', 'bounds.yMax', errors),
  };
  const start = readStart(o['start'], errors);
  const end = readStation(o['end'], 'end', errors);
  const obstacles = readObstacles(o['obstacles'], errors);
  const hint = 'hint' in o ? readString(o, 'hint', 'hint', errors) : undefined;

  if (errors.length > before || !bounds || !start || !end || !obstacles) return undefined;
  const level: Level = {
    id,
    name,
    bounds,
    start,
    end,
    obstacles,
    par,
    reference,
  };
  if (hint !== undefined) level.hint = hint;
  return level;
}

function readStart(raw: unknown, errors: string[]): StartStation | undefined {
  const o = readObject(raw, 'start', ['x', 'y', 'speed'], [], errors);
  return (
    o && {
      x: readNumber(o, 'x', 'start.x', errors),
      y: readNumber(o, 'y', 'start.y', errors),
      speed: readNumber(o, 'speed', 'start.speed', errors),
    }
  );
}

function readStation(raw: unknown, path: string, errors: string[]): Station | undefined {
  const o = readObject(raw, path, ['x', 'y'], [], errors);
  return (
    o && { x: readNumber(o, 'x', `${path}.x`, errors), y: readNumber(o, 'y', `${path}.y`, errors) }
  );
}

function readObstacles(raw: unknown, errors: string[]): Obstacle[] | undefined {
  if (!Array.isArray(raw)) {
    errors.push('obstacles must be a list');
    return undefined;
  }
  const out: Obstacle[] = [];
  raw.forEach((item: unknown, i) => {
    const path = `obstacles[${i}]`;
    const kind = isRecord(item) ? item['kind'] : undefined;
    if (kind === 'rect') {
      const o = readObject(item, path, ['kind', 'x', 'y', 'w', 'h'], [], errors);
      if (o) {
        const [x, y] = [
          readNumber(o, 'x', `${path}.x`, errors),
          readNumber(o, 'y', `${path}.y`, errors),
        ];
        const [w, h] = [
          readNumber(o, 'w', `${path}.w`, errors),
          readNumber(o, 'h', `${path}.h`, errors),
        ];
        out.push({ kind, x, y, w, h });
      }
    } else if (kind === 'circle') {
      const o = readObject(item, path, ['kind', 'x', 'y', 'r'], [], errors);
      if (o) {
        const [x, y] = [
          readNumber(o, 'x', `${path}.x`, errors),
          readNumber(o, 'y', `${path}.y`, errors),
        ];
        out.push({ kind, x, y, r: readNumber(o, 'r', `${path}.r`, errors) });
      }
    } else {
      errors.push(`${path}.kind must be "rect" or "circle"`);
    }
  });
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// An object with every required field and nothing unknown. Unknown fields are named, so a
// typo like "obstacels" points straight at itself.
function readObject(
  raw: unknown,
  path: string,
  required: string[],
  optional: string[],
  errors: string[],
): Record<string, unknown> | undefined {
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  const prefix = path === 'level' ? '' : `${path}.`;
  let ok = true;
  for (const key of required) {
    if (!(key in raw)) {
      errors.push(`missing field "${prefix}${key}"`);
      ok = false;
    }
  }
  for (const key of Object.keys(raw)) {
    if (!required.includes(key) && !optional.includes(key)) {
      errors.push(`unknown field "${prefix}${key}"`);
      ok = false;
    }
  }
  return ok ? raw : undefined;
}

// The read helpers record an error and return a placeholder; readLevel throws the result away
// whenever an error was recorded, so a placeholder never reaches a Level.
function readNumber(
  o: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): number {
  const v = o[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  errors.push(`${path} must be a number`);
  return NaN;
}

function readString(
  o: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[],
): string {
  const v = o[key];
  if (typeof v === 'string' && v.trim() !== '') return v;
  errors.push(`${path} must be a non-empty string`);
  return '';
}

// --- Pass 2: the layout and par ---

function checkLayout(level: Level, errors: string[]): void {
  const { bounds, start, end, par } = level;
  if (!(bounds.xMin < start.x)) errors.push('start.x must be right of bounds.xMin');
  if (!(start.x < end.x)) errors.push('end.x must be right of start.x');
  if (!(end.x <= bounds.xMax)) errors.push('end.x must not be right of bounds.xMax');
  if (!(bounds.yMin < bounds.yMax)) errors.push('bounds.yMin must be below bounds.yMax');
  if (start.speed < 0) errors.push('start.speed must not be negative');

  for (const [name, s] of [
    ['start', start],
    ['end', end],
  ] as const) {
    if (s.y < bounds.yMin || s.y > bounds.yMax)
      errors.push(`${name} station is outside the bounds`);
    // The cart sits at a station, so nothing may be within its radius of one.
    level.obstacles.forEach((o, i) => {
      if (circleTouches(s.x, s.y, CART_RADIUS, o)) {
        errors.push(`${name} station overlaps obstacles[${i}]`);
      }
    });
  }

  level.obstacles.forEach((o, i) => {
    const size = o.kind === 'rect' ? Math.min(o.w, o.h) : o.r;
    if (!(size > 0)) errors.push(`obstacles[${i}] must have a size above 0`);
  });

  if (!Number.isInteger(par) || par < 1) errors.push('par must be a whole number, at least 1');
  const refScore = scoreEquation(level.reference);
  if (par > refScore) {
    errors.push(`par (${par}) is longer than the reference (${refScore} characters)`);
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
