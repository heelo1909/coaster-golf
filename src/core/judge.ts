import { evaluate, parseEquation, scoreEquation } from './equation';
import type { Level } from './level/types';
import { simulate } from './sim';
import type { SimResult } from './sim';

export type JudgeResult =
  | { ok: false; parseError: { message: string; position: number } }
  | { ok: true; result: SimResult; score: number }; // score only counts if result.success

// The one way to judge a run, in the browser and on the server: parse, ride, score. Callers
// never do these by hand, so the two can't drift apart (see core/CLAUDE.md).
export function judge(level: Level, input: string): JudgeResult {
  const parsed = parseEquation(input);
  if (!parsed.ok) return { ok: false, parseError: parsed.error };
  const expr = parsed.expr;
  const result = simulate(level, (x) => evaluate(expr, x));
  return { ok: true, result, score: scoreEquation(input) };
}
