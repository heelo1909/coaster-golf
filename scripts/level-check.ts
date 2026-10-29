/// <reference types="node" />
// The logic behind `npm run check-levels` (see src/core/level/CLAUDE.md): load every level file,
// validate it, check ids are unique, and print a table. Kept apart from the entry point so tests
// can run it on fixture folders without exiting the process.
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { scoreEquation, validateLevel } from '../src/core';

export interface LevelFile {
  path: string;
  text: string;
}

export interface LevelRow {
  file: string; // the file's name, for errors
  id: string; // '-' when the file can't say
  name: string;
  ref: number | undefined; // the reference's score, when there's a reference to score
  par: number | undefined;
  errors: string[]; // empty means ✅
}

// Every .json file in the folders, folder by folder, sorted by name. Other files (.gitkeep) are
// skipped; a missing folder counts as empty.
export function loadLevelFiles(dirs: string[]): LevelFile[] {
  const files: LevelFile[] = [];
  for (const dir of dirs) {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
      const path = join(dir, name);
      files.push({ path, text: readFileSync(path, 'utf8') });
    }
  }
  return files;
}

export function checkLevels(files: LevelFile[]): LevelRow[] {
  const rows = files.map(checkFile);
  // Unique ids across all files: every file sharing an id gets the error, so each one is listed.
  const seen = new Map<string, string[]>();
  for (const row of rows) {
    if (row.id !== '-') seen.set(row.id, [...(seen.get(row.id) ?? []), row.file]);
  }
  for (const row of rows) {
    const same = seen.get(row.id);
    if (same && same.length > 1) row.errors.push(`id "${row.id}" is used by ${same.join(', ')}`);
  }
  return rows;
}

function checkFile({ path, text }: LevelFile): LevelRow {
  const file = basename(path);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return {
      file,
      id: '-',
      name: '-',
      ref: undefined,
      par: undefined,
      errors: [`not valid JSON: ${why}`],
    };
  }
  const result = validateLevel(raw);
  if (result.ok) {
    const { id, name, par, reference } = result.level;
    return { file, id, name, ref: scoreEquation(reference), par, errors: [] };
  }
  // Show what can be read from a broken level, so the row is still recognisable.
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const shown = (v: unknown): string => (typeof v === 'string' && v !== '' ? v : '-');
  return {
    file,
    id: shown(o['id']),
    name: shown(o['name']),
    ref: typeof o['reference'] === 'string' ? scoreEquation(o['reference']) : undefined,
    par: typeof o['par'] === 'number' ? o['par'] : undefined,
    errors: result.errors,
  };
}

// The table from level/CLAUDE.md, then each failing file's errors underneath.
export function formatReport(rows: LevelRow[]): string {
  if (rows.length === 0) return 'check-levels: no level files found.';
  const cells = rows.map((r) => [
    r.id,
    r.name,
    r.ref === undefined ? '-' : String(r.ref),
    r.par === undefined ? '-' : String(r.par),
    r.errors.length === 0 ? '✅' : '❌',
  ]);
  const header = ['id', 'name', 'ref', 'par', 'result'];
  const widths = header.map((h, c) => Math.max(h.length, ...cells.map((row) => row[c]!.length)));
  const line = (row: string[]): string =>
    row
      .map((cell, c) => (c === 2 || c === 3 ? cell.padStart(widths[c]!) : cell.padEnd(widths[c]!)))
      .join('  ')
      .trimEnd();

  const out = [line(header), ...cells.map(line)];
  const failed = rows.filter((r) => r.errors.length > 0);
  for (const r of failed) {
    out.push('', `${r.file}:`, ...r.errors.map((e) => `  - ${e}`));
  }
  out.push(
    '',
    failed.length === 0
      ? `${rows.length} levels OK`
      : `${failed.length} of ${rows.length} levels failed`,
  );
  return out.join('\n');
}
