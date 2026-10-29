import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkLevels, formatReport, loadLevelFiles } from '../scripts/level-check';
import type { LevelFile } from '../scripts/level-check';

const fixtures = fileURLToPath(new URL('./fixtures/check-levels/', import.meta.url));
const dirs = [`${fixtures}campaign`, `${fixtures}daily`];

// A level file in memory, starting from a valid one; `change` breaks it for one test.
function file(
  name: string,
  change: (level: Record<string, unknown>) => void = () => {},
): LevelFile {
  const level: Record<string, unknown> = {
    id: name.replace('.json', ''),
    name: 'Test Slope',
    bounds: { xMin: -1, xMax: 11, yMin: -2, yMax: 8 },
    start: { x: 0, y: 5, speed: 1 },
    end: { x: 10, y: 0 },
    obstacles: [],
    par: 5,
    reference: '5-x/2',
  };
  change(level);
  return { path: `levels/${name}`, text: JSON.stringify(level) };
}

describe('check-levels: finding the level files', () => {
  it('loads every .json file, campaign folder first, sorted by name, skipping other files', () => {
    const files = loadLevelFiles(dirs);
    expect(files.map((f) => f.path.replace(/\\/g, '/').split('/').slice(-2).join('/'))).toEqual([
      'campaign/fixture-slope.json',
      'daily/fixture-valley.json',
    ]);
  });

  it('a folder that does not exist yet counts as empty', () => {
    expect(loadLevelFiles([`${fixtures}no-such-folder`])).toEqual([]);
  });
});

describe('check-levels: checking each level', () => {
  it('valid levels pass and show their reference score and par', () => {
    const rows = checkLevels(loadLevelFiles(dirs));
    expect(rows).toEqual([
      {
        file: 'fixture-slope.json',
        id: 'fx-slope',
        name: 'Fixture Slope',
        ref: 5,
        par: 5,
        errors: [],
      },
      {
        file: 'fixture-valley.json',
        id: 'fx-valley',
        name: 'Fixture Valley',
        ref: 9,
        par: 9,
        errors: [],
      },
    ]);
  });

  it('a level that fails validation lists its errors and keeps what can be read of it', () => {
    const [row] = checkLevels([file('c02.json', (l) => (l['reference'] = '5-x'))]);
    expect(row).toEqual({
      file: 'c02.json',
      id: 'c02',
      name: 'Test Slope',
      ref: 3,
      par: 5,
      errors: ['par (5) is longer than the reference (3 characters)'],
    });
  });

  it('a file that is not valid JSON fails without stopping the others', () => {
    const rows = checkLevels([
      { path: 'levels/c01.json', text: '{ "id": "c01",' },
      file('c02.json'),
    ]);
    expect(rows[0]!.id).toBe('-');
    expect(rows[0]!.errors).toHaveLength(1);
    expect(rows[0]!.errors[0]).toMatch(/^not valid JSON: /);
    expect(rows[1]!.errors).toEqual([]);
  });

  it('two files with the same id both fail, each naming the other', () => {
    const rows = checkLevels([
      file('c01.json'),
      file('c02.json', (l) => (l['id'] = 'c01')),
      file('c03.json'),
    ]);
    const clash = 'id "c01" is used by c01.json, c02.json';
    expect(rows.map((r) => r.errors)).toEqual([[clash], [clash], []]);
  });

  it('a duplicate id is reported even when the level is broken in other ways', () => {
    const rows = checkLevels([
      file('c01.json'),
      file('c01-copy.json', (l) => {
        l['id'] = 'c01';
        l['par'] = 0;
      }),
    ]);
    expect(rows[1]!.errors).toEqual([
      'par must be a whole number, at least 1',
      'id "c01" is used by c01.json, c01-copy.json',
    ]);
  });
});

describe('check-levels: the report', () => {
  it('prints the table with each level on its own line', () => {
    const report = formatReport(checkLevels(loadLevelFiles(dirs)));
    expect(report.split('\n')).toEqual([
      'id         name            ref  par  result',
      'fx-slope   Fixture Slope     5    5  ✅',
      'fx-valley  Fixture Valley    9    9  ✅',
      '',
      '2 levels OK',
    ]);
  });

  it('lists every failing file and its errors under the table', () => {
    const rows = checkLevels([
      file('c01.json'),
      file('c02.json', (l) => {
        l['reference'] = '5-x';
        l['par'] = 3;
      }),
    ]);
    expect(formatReport(rows).split('\n')).toEqual([
      'id   name        ref  par  result',
      'c01  Test Slope    5    5  ✅',
      'c02  Test Slope    3    3  ❌',
      '',
      'c02.json:',
      '  - reference "5-x" doesn\'t win: MISSED_END at x = 10',
      '',
      '1 of 2 levels failed',
    ]);
  });

  it('says so when there are no level files at all', () => {
    expect(formatReport([])).toBe('check-levels: no level files found.');
  });
});
