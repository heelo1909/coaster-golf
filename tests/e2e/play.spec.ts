// Play-screen smoke tests (tests/CLAUDE.md). Each runs in the phone project (375×812, touch)
// and the desktop project (1280×800). Elements are found by data-testid only.

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { skipHowTo } from './helpers';

const isPhone = (name: string): boolean => name === 'phone';

// Fails the test on any uncaught error in the page.
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

// How many canvas pixels are the theme's accent colour: the stations and the cart. More of
// them means the camera is zoomed in.
async function accentPixels(page: Page): Promise<number> {
  return page.getByTestId('game-canvas').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(accent.slice(i, i + 2), 16));
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let k = 0; k < d.length; k += 4) {
      if (Math.abs(d[k]! - r!) + Math.abs(d[k + 1]! - g!) + Math.abs(d[k + 2]! - b!) < 40) n++;
    }
    return n;
  });
}

test.beforeEach(async ({ page }) => {
  await skipHowTo(page);
  await page.goto('/#/play/c01');
  await expect(page.getByTestId('game-canvas')).toBeVisible();
});

test('typing a winning equation and riding shows the win panel with the score', async ({
  page,
}, info) => {
  const errors = watchErrors(page);
  await page.getByTestId('equation-input').fill('0');
  const ride = page.getByTestId('ride-button');
  if (isPhone(info.project.name)) await ride.tap();
  else await ride.click();
  await expect(page.getByTestId('result-title')).toHaveText('Made it! 1 char (par 1)');
  await expect(page.getByTestId('par-star')).toBeVisible();
  await expect(page.getByTestId('ride-button')).toHaveText('Ride');
  expect(errors).toEqual([]);
});

test('Enter rides too, and Next level opens level 2', async ({ page }) => {
  await page.getByTestId('equation-input').fill('0');
  await page.getByTestId('equation-input').press('Enter');
  await expect(page.getByTestId('result-title')).toContainText('Made it!');
  await page.getByTestId('next-level').click();
  await expect(page.getByTestId('char-counter')).toHaveText('0 chars · par 5');
});

test('a broken equation shows the inline error and the page keeps working', async ({ page }) => {
  const errors = watchErrors(page);
  const input = page.getByTestId('equation-input');
  await input.fill('(x-');
  await expect(page.getByTestId('equation-error')).toContainText('nothing after "-"');
  await expect(input).toHaveAttribute('aria-invalid', '');
  await input.fill('x/2');
  await expect(page.getByTestId('equation-error')).toBeEmpty();
  expect(errors).toEqual([]);
});

test('pasting does nothing and shows the note; typing sqrt(x) renders a root', async ({ page }) => {
  const input = page.getByTestId('equation-input');
  await input.focus();
  const pasted = await input.evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'x/2');
    return el.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  expect(pasted).toBe(false); // the paste was cancelled
  await expect(input).toHaveValue('');
  await expect(page.getByTestId('paste-note')).toHaveText('No pasting — type it out ✍️');
  await input.pressSequentially('sqrt(x)');
  // KaTeX also writes MathML for screen readers; a root there means √ was rendered.
  await expect(page.getByTestId('math-preview').locator('msqrt')).toHaveCount(1);
  await expect(page.getByTestId('paste-note')).toBeEmpty();
});

test('the page never scrolls sideways and the canvas is drawn at its real size', async ({
  page,
}) => {
  const check = () =>
    page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid=game-canvas]')!;
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        sharp:
          c.width === Math.round(c.clientWidth * devicePixelRatio) &&
          c.height === Math.round(c.clientHeight * devicePixelRatio),
      };
    });
  expect(await check()).toEqual({ overflow: 0, sharp: true });
  await page.getByTestId('equation-input').fill('0');
  await page.getByTestId('equation-input').press('Enter');
  await expect(page.getByTestId('result-title')).toBeVisible();
  expect(await check()).toEqual({ overflow: 0, sharp: true }); // with the result panel open
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone only');

  test('quick keys type the symbols phone keyboards hide, keeping the box focused', async ({
    page,
  }) => {
    const input = page.getByTestId('equation-input');
    await input.tap();
    const keys = page.getByTestId('quick-keys');
    await expect(keys).toBeVisible();
    for (const label of ['sin', 'x', ')', '^', '(']) {
      await keys.getByRole('button', { name: `Type ${label === 'sin' ? 'sin(' : label}` }).tap();
    }
    await expect(input).toHaveValue('sin(x)^(');
    await expect(input).toBeFocused();
    const box = await keys.getByRole('button').first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });

  test('a two-finger pinch zooms the track', async ({ page }) => {
    const before = await accentPixels(page);
    const canvas = (await page.getByTestId('game-canvas').boundingBox())!;
    const cx = canvas.x + canvas.width / 2;
    const cy = canvas.y + canvas.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', spread: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints:
          type === 'touchEnd'
            ? []
            : [
                { x: cx - spread, y: cy, id: 1 },
                { x: cx + spread, y: cy, id: 2 },
              ],
      });
    await touch('touchStart', 30);
    for (let s = 40; s <= 120; s += 10) await touch('touchMove', s);
    await touch('touchEnd', 120);
    // Spreading the fingers 4× apart zooms in 4× about the middle of the level, which pushes
    // both stations (the only accent on screen before a ride) off the edges.
    expect(before).toBeGreaterThan(0);
    expect(await accentPixels(page)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('tapping the canvas during a ride skips to the end', async ({ page }) => {
    await page.getByTestId('equation-input').fill('x(6-x)/9');
    await page.getByTestId('ride-button').tap();
    await expect(page.getByTestId('ride-button')).toHaveText('Skip');
    await page.getByTestId('game-canvas').tap();
    await expect(page.getByTestId('result-title')).toContainText('Made it!');
  });
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('quick keys are hidden and the scroll wheel zooms the track', async ({ page }) => {
    await expect(page.getByTestId('quick-keys')).toBeHidden();
    const before = await accentPixels(page);
    const canvas = (await page.getByTestId('game-canvas').boundingBox())!;
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(0, -400);
    // About 1.8× closer: both stations stay on screen and are drawn longer.
    await expect.poll(() => accentPixels(page)).toBeGreaterThan(before * 1.5);
    expect(await page.evaluate(() => window.scrollY)).toBe(0); // the page itself didn't scroll
  });
});

test('sound plays on a ride, and the mute toggle silences it and is remembered', async ({
  page,
}) => {
  const errors = watchErrors(page);
  // Count every sound the page starts, without needing speakers.
  await page.addInitScript(() => {
    const w = window as unknown as { sounds: number };
    w.sounds = 0;
    const proto = AudioContext.prototype;
    for (const name of ['createOscillator', 'createBufferSource'] as const) {
      const make = proto[name] as (this: AudioContext) => AudioScheduledSourceNode;
      (proto as unknown as Record<string, unknown>)[name] = function (this: AudioContext) {
        const node = make.call(this);
        const start = node.start.bind(node);
        node.start = (...args: Parameters<typeof start>) => {
          w.sounds++;
          start(...args);
        };
        return node;
      };
    }
  });
  await page.reload();
  const sounds = (): Promise<number> =>
    page.evaluate(() => (window as unknown as { sounds: number }).sounds);
  const mute = page.getByTestId('mute-toggle');
  await expect(mute).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('equation-input').fill('0');
  await page.getByTestId('ride-button').click();
  await expect(page.getByTestId('result-title')).toBeVisible();
  await expect.poll(sounds).toBeGreaterThan(1); // the rumble and the chime

  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(mute).toHaveAccessibleName('Turn sound on');
  await page.reload();
  await expect(page.getByTestId('mute-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('equation-input').fill('0');
  await page.getByTestId('ride-button').click();
  await expect(page.getByTestId('result-title')).toBeVisible();
  expect(await sounds()).toBe(0);
  expect(errors).toEqual([]);
});
