import { evaluate, parseEquation } from '../core';
import { campaign } from '../levels';
import { createRenderer } from './render';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('missing #game canvas');
const level = campaign[0];
if (!level) throw new Error('no campaign levels');

const renderer = createRenderer(canvas, level);

// A fixed demo track until the equation input arrives (next Section 5 task).
const demo = parseEquation('(x-3)^2/9-1');
if (demo.ok) {
  const expr = demo.expr;
  renderer.setTrack((x) => evaluate(expr, x));
}

window.addEventListener('resize', () => renderer.resize());
