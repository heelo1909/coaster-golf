import { describe, expect, it } from 'vitest';
import { counterOf, previewOf, splitAtError } from './EquationInput';

describe('previewOf: what the live preview shows while typing', () => {
  it('an empty box shows no track and no error', () => {
    expect(previewOf('')).toEqual({ kind: 'empty' });
    expect(previewOf('   ')).toEqual({ kind: 'empty' });
  });

  it('a valid equation previews as a track that evaluates like the equation', () => {
    const preview = previewOf('y = (x-3)^2/9-1');
    expect(preview.kind).toBe('track');
    if (preview.kind !== 'track') return;
    expect(preview.track(3)).toBe(-1);
    expect(preview.track(6)).toBe(0);
  });

  it('a half-typed equation gives the parser error and its position, without throwing', () => {
    expect(previewOf('(x-')).toEqual({ kind: 'error', message: 'nothing after "-"', position: 2 });
    expect(previewOf('x + sn(x)')).toEqual({
      kind: 'error',
      message: 'unknown word "sn" at 4',
      position: 4,
    });
  });

  it('LaTeX input previews too', () => {
    const preview = previewOf('\\frac{x}{2}');
    expect(preview.kind === 'track' && preview.track(4)).toBe(2);
  });

  it('the pretty preview turns sqrt into a root, ^ into an exponent and / into a fraction', () => {
    const latexOf = (text: string): string | false => {
      const preview = previewOf(text);
      return preview.kind === 'track' && preview.latex;
    };
    expect(latexOf('sqrt(x)')).toBe('\\sqrt{x}');
    expect(latexOf('x^2')).toBe('x^{2}');
    expect(latexOf('x/2')).toBe('\\frac{x}{2}');
  });

  it('a gap in the track is NaN, not a crash', () => {
    const preview = previewOf('1/(x-2)');
    expect(preview.kind === 'track' && preview.track(2)).toBeNaN();
  });
});

describe('splitAtError: which character gets underlined', () => {
  it('underlines the character at the position', () => {
    expect(splitAtError('x + sn(x)', 4)).toEqual({ before: 'x + ', bad: 's', after: 'n(x)' });
  });

  it('underlines a space after the text when the problem is at the end', () => {
    expect(splitAtError('x^', 2)).toEqual({ before: 'x^', bad: ' ', after: '' });
  });

  it('underlines a whole emoji, not half of it', () => {
    expect(splitAtError('x 😀+1', 2)).toEqual({ before: 'x ', bad: '😀', after: '+1' });
  });

  it('clamps a position outside the text', () => {
    expect(splitAtError('ab', 9)).toEqual({ before: 'ab', bad: ' ', after: '' });
    expect(splitAtError('ab', -1)).toEqual({ before: '', bad: 'a', after: 'b' });
  });
});

describe('counterOf: the live character counter', () => {
  it('counts like the score: no spaces, no leading y=', () => {
    expect(counterOf('y = (x-3)^2/2', 14, true).label).toBe('9 chars · par 14');
  });

  it('turns gold at or under par for an equation that parses', () => {
    expect(counterOf('x/2', 3, true).underPar).toBe(true);
    expect(counterOf('x/20', 3, true).underPar).toBe(false);
  });

  it('stays plain for an unfinished equation or an empty box', () => {
    expect(counterOf('(x-', 9, false).underPar).toBe(false);
    expect(counterOf('', 9, true)).toEqual({ label: '0 chars · par 9', underPar: false });
  });
});
