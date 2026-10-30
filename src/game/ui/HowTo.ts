// The first-visit explainer: three short steps and one button. Shown before anything else on
// a first visit, and again from the link on level select.

import { messages } from './messages';

// A tiny picture of the idea: an equation's curve carrying the cart from Start to End. Drawn
// in the page's colour tokens so it follows the theme.
const PICTURE = `<svg viewBox="0 0 240 96" role="img" aria-label="${messages.howToPicture}">
  <path d="M20 30 C 80 30, 90 80, 130 80 S 190 52, 220 52" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M8 30h24M208 52h24" stroke="var(--mark)" stroke-width="3" stroke-linecap="round"/>
  <circle cx="88" cy="56" r="6" fill="var(--mark)"/>
  <text x="20" y="18" fill="var(--label)" font-size="11" text-anchor="middle">${messages.start}</text>
  <text x="220" y="40" fill="var(--label)" font-size="11" text-anchor="middle">${messages.end}</text>
</svg>`;

export function mountHowTo(root: HTMLElement, onDone: () => void): void {
  const screen = document.createElement('section');
  screen.className = 'howto';
  screen.dataset.testid = 'how-to';
  screen.setAttribute('aria-labelledby', 'howto-title');

  const title = document.createElement('h1');
  title.id = 'howto-title';
  title.className = 'howto-title';
  title.textContent = messages.howToTitle;

  const picture = document.createElement('div');
  picture.className = 'howto-picture';
  picture.innerHTML = PICTURE;

  const steps = document.createElement('ol');
  steps.className = 'howto-steps';
  for (const [head, body] of messages.howToSteps) {
    const step = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = head;
    // `backticks` mark an equation, shown in the equation box's monospace.
    const text = document.createElement('span');
    body.split('`').forEach((part, i) => {
      if (i % 2 === 0) return text.append(part);
      const code = document.createElement('code');
      code.textContent = part;
      text.append(code);
    });
    step.append(strong, text);
    steps.append(step);
  }

  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'ride-btn howto-go';
  go.dataset.testid = 'how-to-done';
  go.textContent = messages.howToDone;
  go.addEventListener('click', onDone);

  screen.append(title, picture, steps, go);
  root.replaceChildren(screen);
}
