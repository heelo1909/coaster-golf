// The low-key theme picker: a small round button in the canvas corner that opens a short
// menu of the four themes. Picking one restyles the page and canvas at once and remembers the
// choice on this device (storage/profile.ts).

import {
  DEFAULT_THEME,
  THEME_IDS,
  cssVars,
  isThemeId,
  setTheme,
  theme,
  themeName,
  themeSwatch,
} from '../render';
import type { ThemeId } from '../render';
import { loadProfile, saveProfile } from '../storage';
import { messages } from './messages';

// The saved theme, or the default on a first visit or when nothing valid is saved.
export function savedTheme(): ThemeId {
  const { theme: saved } = loadProfile();
  return isThemeId(saved) ? saved : DEFAULT_THEME;
}

// Makes `id` the active theme for the canvas and the page around it.
export function applyTheme(id: ThemeId): void {
  setTheme(id);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(cssVars(theme))) root.style.setProperty(name, value);
  root.dataset.style = theme.style;
  root.style.colorScheme = id === 'paper' ? 'light' : 'dark';
}

// Create it once for the whole app (it listens on the document to close when you tap away).
export function createThemePicker(onChange: () => void): HTMLElement {
  const root = document.createElement('div');
  root.className = 'theme-picker';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'theme-toggle';
  toggle.dataset.testid = 'theme-toggle';
  toggle.setAttribute('aria-label', messages.theme);
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'true');
  const dot = document.createElement('span');
  dot.className = 'theme-dot';
  dot.setAttribute('aria-hidden', 'true');
  toggle.append(dot);

  const menu = document.createElement('div');
  menu.className = 'theme-menu';
  menu.dataset.testid = 'theme-menu';
  menu.hidden = true;

  const options = THEME_IDS.map((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-option';
    b.dataset.testid = `theme-${id}`;
    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    const [paper, ink, mark] = themeSwatch(id);
    swatch.style.background = `linear-gradient(90deg, ${paper} 0 60%, ${ink} 60% 90%, ${mark} 90%)`;
    b.append(swatch, themeName(id));
    b.addEventListener('click', () => {
      applyTheme(id);
      saveProfile({ ...loadProfile(), theme: id });
      markCurrent();
      setOpen(false);
      toggle.focus();
      onChange();
    });
    menu.append(b);
    return [id, b] as const;
  });

  function markCurrent(): void {
    for (const [id, b] of options) b.setAttribute('aria-pressed', String(id === theme.id));
  }

  function setOpen(open: boolean): void {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden !== false));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !root.contains(event.target as Node)) setOpen(false);
  });

  markCurrent();
  root.append(toggle, menu);
  return root;
}
