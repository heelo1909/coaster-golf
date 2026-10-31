// The "‹ Levels" button top-left on the play, daily, About and Privacy screens, mirroring the
// theme picker top-right. It says where it goes in words, so level select is easy to find.

import { messages } from './messages';

export function createBackButton(testid: string, onClick: () => void): HTMLButtonElement {
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'back-btn';
  back.dataset.testid = testid;
  back.innerHTML =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  back.append(messages.levelsButton);
  back.addEventListener('click', onClick);
  return back;
}
