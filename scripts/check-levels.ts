/// <reference types="node" />
// `npm run check-levels`: validate every campaign and daily level file, print the table, and
// exit non-zero if any level fails (see src/core/level/CLAUDE.md).
import { fileURLToPath } from 'node:url';
import { checkLevels, formatReport, loadLevelFiles } from './level-check';

const levels = fileURLToPath(new URL('../src/levels/', import.meta.url));
const rows = checkLevels(loadLevelFiles([`${levels}campaign`, `${levels}daily`]));
console.log(formatReport(rows));
if (rows.some((r) => r.errors.length > 0)) process.exitCode = 1;
