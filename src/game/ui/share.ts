// Sends the daily's share text: the phone's share sheet on touch screens, the clipboard
// everywhere else (and whenever the share sheet isn't there or fails).

export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareText(text: string): Promise<ShareOutcome> {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (e) {
      // Closing the share sheet isn't a failure; anything else falls back to copying.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return copyByHand(text) ? 'copied' : 'failed';
  }
}

// For browsers without the async clipboard (or without permission): copy from a hidden box.
function copyByHand(text: string): boolean {
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.append(box);
  box.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    box.remove();
  }
}

// Wires a button to share: while it works, then "Copied!" or "Couldn't copy" for a moment.
export function shareButton(
  label: string,
  testid: string,
  className: string,
  text: () => string,
  words: { copied: string; failed: string },
): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.dataset.testid = testid;
  b.textContent = label;
  let reset: ReturnType<typeof setTimeout> | undefined;
  b.addEventListener('click', async () => {
    const outcome = await shareText(text());
    if (outcome === 'shared') return;
    b.textContent = outcome === 'copied' ? words.copied : words.failed;
    clearTimeout(reset);
    reset = setTimeout(() => (b.textContent = label), 2000);
  });
  return b;
}
