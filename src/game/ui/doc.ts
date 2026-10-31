// A tiny Markdown subset for the About and Privacy screens: `# ` and `## ` headings, `- `
// lists, paragraphs split by blank lines, and [text](link) links. parseDoc is pure; mountDoc
// puts the text in with textContent only (never innerHTML), and only mailto:, https: and #/ links
// become links, so the text can never inject anything.

import { createBackButton } from './BackButton';

export interface Inline {
  text: string;
  href?: string;
}

export type Block =
  { kind: 'h1' | 'h2' | 'p'; parts: Inline[] } | { kind: 'ul'; items: Inline[][] };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const SAFE_HREF = /^(mailto:|https:\/\/|#\/)/; // #/ is a screen in this game

export function parseInline(line: string): Inline[] {
  const parts: Inline[] = [];
  let at = 0;
  for (const m of line.matchAll(LINK)) {
    if (m.index > at) parts.push({ text: line.slice(at, m.index) });
    const [, text, href] = m as unknown as [string, string, string];
    parts.push(SAFE_HREF.test(href) ? { text, href } : { text });
    at = m.index + m[0].length;
  }
  if (at < line.length) parts.push({ text: line.slice(at) });
  return parts;
}

export function parseDoc(md: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] | null = null;
  const flush = (): void => {
    if (paragraph.length > 0) blocks.push({ kind: 'p', parts: parseInline(paragraph.join(' ')) });
    paragraph = [];
    if (list) blocks.push({ kind: 'ul', items: list });
    list = null;
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') {
      flush();
    } else if (line.startsWith('# ') || line.startsWith('## ')) {
      flush();
      const h1 = line.startsWith('# ');
      blocks.push({ kind: h1 ? 'h1' : 'h2', parts: parseInline(line.slice(h1 ? 2 : 3)) });
    } else if (line.startsWith('- ')) {
      if (paragraph.length > 0) flush();
      (list ??= []).push(parseInline(line.slice(2)));
    } else {
      if (list) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

function inlineNodes(parts: readonly Inline[]): Node[] {
  return parts.map((part) => {
    if (part.href === undefined) return document.createTextNode(part.text);
    const a = document.createElement('a');
    a.href = part.href;
    a.textContent = part.text;
    return a;
  });
}

// A text screen (About, Privacy): the back button top-left, then the document in one narrow
// column, like the how-to.
export function mountDoc(root: HTMLElement, md: string, testid: string, onBack: () => void): void {
  const screen = document.createElement('article');
  screen.className = 'doc';
  screen.dataset.testid = testid;
  for (const block of parseDoc(md)) {
    if (block.kind === 'ul') {
      const ul = document.createElement('ul');
      for (const item of block.items) {
        const li = document.createElement('li');
        li.append(...inlineNodes(item));
        ul.append(li);
      }
      screen.append(ul);
    } else {
      const el = document.createElement(block.kind);
      el.append(...inlineNodes(block.parts));
      screen.append(el);
    }
  }

  root.replaceChildren(createBackButton('doc-back', onBack), screen);
}
