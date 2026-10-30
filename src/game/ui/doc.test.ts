import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import privacy from '../../../docs/launch/privacy.md?raw';
import { parseDoc, parseInline } from './doc';
import { messages } from './messages';

describe('the About and Privacy text: a small, safe Markdown subset', () => {
  it('reads headings, paragraphs and lists', () => {
    const blocks = parseDoc('# Title\n\nOne line\nsame paragraph.\n\n## Part\n- a\n- b\nAfter.');
    expect(blocks).toEqual([
      { kind: 'h1', parts: [{ text: 'Title' }] },
      { kind: 'p', parts: [{ text: 'One line same paragraph.' }] },
      { kind: 'h2', parts: [{ text: 'Part' }] },
      { kind: 'ul', items: [[{ text: 'a' }], [{ text: 'b' }]] },
      { kind: 'p', parts: [{ text: 'After.' }] },
    ]);
  });

  it('makes email, https and in-game links, and leaves anything else as plain text', () => {
    expect(parseInline('Mail [me](mailto:a@b.co) now')).toEqual([
      { text: 'Mail ' },
      { text: 'me', href: 'mailto:a@b.co' },
      { text: ' now' },
    ]);
    expect(parseInline('[p](#/privacy)')).toEqual([{ text: 'p', href: '#/privacy' }]);
    expect(parseInline('[x](https://x.dev)')).toEqual([{ text: 'x', href: 'https://x.dev' }]);
    expect(parseInline('[bad](javascript:alert(1))')).toEqual([{ text: 'bad' }, { text: ')' }]);
    expect(parseInline('[plain](http://x.dev)')).toEqual([{ text: 'plain' }]);
  });

  it('the About page links to the privacy page and the contact email', () => {
    const links = parseDoc(messages.about).flatMap((b) =>
      b.kind === 'ul' ? b.items.flat() : b.parts,
    );
    expect(links.map((l) => l.href).filter(Boolean)).toEqual([
      '#/privacy',
      'mailto:heelo1909@gmail.com',
    ]);
  });
});

describe('the privacy page matches what the game stores', () => {
  const text = privacy.toLowerCase();

  it('names everything the leaderboard table keeps', () => {
    const sql = readFileSync('worker/migrations/0001_scores.sql', 'utf8');
    const columns = [...sql.matchAll(/^\s+(\w+)\s+(TEXT|INTEGER)/gm)].map((m) => m[1]);
    expect(columns).toEqual(['level_id', 'nickname', 'equation', 'score', 'created_at']);
    // In plain words: the level, your nickname, your equation, its score, when you submitted.
    for (const words of ['level', 'nickname', 'equation', 'score', 'when you submitted']) {
      expect(text).toContain(words);
    }
  });

  it('says what it does not collect, the age limit and who to contact', () => {
    for (const words of ['no accounts', 'no cookies', 'no ads', 'no ip addresses saved', '13']) {
      expect(text).toContain(words);
    }
    expect(text).toContain('mailto:heelo1909@gmail.com');
  });
});
