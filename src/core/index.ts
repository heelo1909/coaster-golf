// Public entry point for shared game logic. Features are exported here as they're built
// (see src/core/CLAUDE.md for the contract).
export const CORE_VERSION = 1;

export * from './equation';
export * from './sim';
export * from './level';
export { judge } from './judge';
export type { JudgeResult } from './judge';
