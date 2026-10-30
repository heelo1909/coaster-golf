// Every colour, line width and font the game uses, for each of the four themes the player can
// pick (see progress.md → Decisions). The three minimal themes follow a strict 60-30-10 split:
// 60% `paper` (the background), 30% `panel` and `ink` (panel, track and text), 10% `mark` (one
// accent for the cart, stations, Ride and par). Blueprint is the original drafting look. The
// page's CSS colour tokens are set from the same palette (cssVars), so this file is the only
// place a colour lives.

export type ThemeId = 'graphite' | 'paper' | 'midnight' | 'blueprint';

export const THEME_IDS: readonly ThemeId[] = ['graphite', 'paper', 'midnight', 'blueprint'];
export const DEFAULT_THEME: ThemeId = 'graphite';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

interface Palette {
  name: string; // shown in the theme picker
  // 'minimal': dot grid, tinted obstacles, solid cart, level name top-left in sans.
  // 'blueprint': line grid, hatched obstacles, outlined cart, "FIG. 4 — THE DIP" title block.
  style: 'minimal' | 'blueprint';
  paper: string; // 60%: the background behind everything
  panel: string; // 30%: the input panel under the canvas
  ink: string; // 30%: the track, obstacle outlines and main text
  inkFaint: string; // the track outside the stations
  label: string; // axis numbers, titles and secondary text
  line: string; // hairlines: panel border, input border
  gridMinor: string; // grid lines or dots, one per world unit
  gridMajor: string; // every MAJOR_EVERY units (blueprint only)
  axis: string; // x = 0 and y = 0
  obstacleFill: string; // inside obstacles: a tint (minimal) or the hatching (blueprint)
  mark: string; // 10%: the one accent
  onMark: string; // text on a solid accent fill
  error: string; // parse errors, fail messages and the fail marker
  font: string; // canvas labels
  uiFont: string; // buttons and messages
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = '"JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace';

const palettes: Record<ThemeId, Palette> = {
  graphite: {
    name: 'Graphite',
    style: 'minimal',
    paper: '#0f1115',
    panel: '#181b21',
    ink: '#d9dee5',
    inkFaint: 'rgba(217, 222, 229, 0.3)',
    label: '#8b93a1',
    line: 'rgba(217, 222, 229, 0.14)',
    gridMinor: 'rgba(217, 222, 229, 0.22)',
    gridMajor: 'rgba(217, 222, 229, 0.22)',
    axis: 'rgba(217, 222, 229, 0.28)',
    obstacleFill: 'rgba(217, 222, 229, 0.08)',
    mark: '#d7ff3a',
    onMark: '#0f1115',
    error: '#ff8a7a',
    font: SANS,
    uiFont: SANS,
  },
  paper: {
    name: 'Paper',
    style: 'minimal',
    paper: '#f3f1ec',
    panel: '#e8e4db',
    ink: '#1c1c1e',
    inkFaint: 'rgba(28, 28, 30, 0.3)',
    label: '#6b675f',
    line: 'rgba(28, 28, 30, 0.14)',
    gridMinor: 'rgba(28, 28, 30, 0.2)',
    gridMajor: 'rgba(28, 28, 30, 0.2)',
    axis: 'rgba(28, 28, 30, 0.28)',
    obstacleFill: 'rgba(28, 28, 30, 0.07)',
    mark: '#ff4f1a',
    onMark: '#ffffff',
    error: '#c8361b',
    font: SANS,
    uiFont: SANS,
  },
  midnight: {
    name: 'Midnight',
    style: 'minimal',
    paper: '#0e1a2b',
    panel: '#152438',
    ink: '#e9e3d5',
    inkFaint: 'rgba(233, 227, 213, 0.3)',
    label: '#8e9aae',
    line: 'rgba(233, 227, 213, 0.14)',
    gridMinor: 'rgba(233, 227, 213, 0.2)',
    gridMajor: 'rgba(233, 227, 213, 0.2)',
    axis: 'rgba(233, 227, 213, 0.28)',
    obstacleFill: 'rgba(233, 227, 213, 0.08)',
    mark: '#ff6b5b',
    onMark: '#0e1a2b',
    error: '#f5c26b',
    font: SANS,
    uiFont: SANS,
  },
  blueprint: {
    name: 'Blueprint',
    style: 'blueprint',
    paper: '#1e4a72',
    panel: '#173b5c',
    ink: '#f2f6fa',
    inkFaint: 'rgba(242, 246, 250, 0.35)',
    label: '#a9c8e6',
    line: 'rgba(169, 200, 230, 0.32)',
    gridMinor: 'rgba(169, 200, 230, 0.16)',
    gridMajor: 'rgba(169, 200, 230, 0.32)',
    axis: '#a9c8e6',
    obstacleFill: 'rgba(242, 246, 250, 0.45)', // the hatching
    mark: '#ffd27a',
    onMark: '#1e4a72',
    error: '#ffb4a2',
    font: MONO,
    uiFont: MONO,
  },
};

// Sizes shared by every theme, in CSS px unless noted.
const sizes = {
  gridMinorWidth: 1,
  gridMajorWidth: 1,
  gridDot: 1.2, // dot radius on the minimal grid
  axisWidth: 1.5,
  trackWidth: 3,
  trackFaintWidth: 1.5,
  trackFaintDash: [6, 6],
  trackFadedAlpha: 0.3, // the last good track while the equation has an error
  obstacleWidth: 1.5,
  hatchGap: 7, // px between hatch lines (blueprint)
  stationWidth: 2.5,
  cartWidth: 2, // outline of the cart and its wheels
  cartMinRadius: 6, // so the cart stays visible when the level is zoomed far out
  sparkRays: 8,
  sparkLength: 18, // at full size
  failMarkSize: 7, // half the width of the ✕
  failMarkWidth: 2.5,
  labelSize: 11,
  titleSize: 13,
  monoFont: MONO, // the equation itself, so every character is easy to count
  padding: 24, // kept clear around the level's bounds
};

export type Theme = Palette & typeof sizes & { id: ThemeId };

function build(id: ThemeId): Theme {
  return { id, ...palettes[id], ...sizes };
}

// The active theme. A live binding: importers always read the current one.
export let theme: Theme = build(DEFAULT_THEME);

export function setTheme(id: ThemeId): void {
  theme = build(id);
}

export function themeName(id: ThemeId): string {
  return palettes[id].name;
}

// Three colours that stand for a theme in the picker: background, ink and accent.
export function themeSwatch(id: ThemeId): [string, string, string] {
  const p = palettes[id];
  return [p.paper, p.ink, p.mark];
}

// The CSS custom properties for the page around the canvas, from the same palette.
export function cssVars(t: Theme): Record<string, string> {
  return {
    '--paper': t.paper,
    '--panel': t.panel,
    '--ink': t.ink,
    '--label': t.label,
    '--line': t.line,
    '--mark': t.mark,
    '--on-mark': t.onMark,
    '--error': t.error,
    '--ui': t.uiFont,
    '--mono': t.monoFont,
  };
}

// A heavier grid line every this many world units (blueprint).
export const MAJOR_EVERY = 5;

// Station platforms, in world units: how far they reach out from the station point and how
// long their legs are.
export const STATION_PLATFORM = 0.6;
export const STATION_LEG = 0.3;
