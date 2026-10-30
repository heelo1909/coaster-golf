// Every colour, line width and font the renderer uses. The art direction is the engineer's
// blueprint (see progress.md → Decisions): swap the look by editing this file only.

export const theme = {
  paper: '#1e4a72', // drafting paper behind everything
  gridMinor: 'rgba(169, 200, 230, 0.16)', // one line per world unit
  gridMajor: 'rgba(169, 200, 230, 0.32)', // every MAJOR_EVERY units
  axis: '#a9c8e6', // x = 0 and y = 0
  label: '#a9c8e6', // axis numbers and the title block
  ink: '#f2f6fa', // the track and obstacle outlines
  inkFaint: 'rgba(242, 246, 250, 0.35)', // the track outside the stations
  hatch: 'rgba(242, 246, 250, 0.45)', // diagonal hatching inside obstacles
  mark: '#ffd27a', // stations and the cart, in amber drafting pencil

  gridMinorWidth: 1,
  gridMajorWidth: 1,
  axisWidth: 1.5,
  trackWidth: 3,
  trackFaintWidth: 1.5,
  trackFaintDash: [6, 6],
  trackFadedAlpha: 0.3, // the last good track while the equation has an error
  obstacleWidth: 2,
  hatchGap: 7, // px between hatch lines
  stationWidth: 2.5,
  cartWidth: 2, // outline of the cart and its wheels
  cartMinRadius: 6, // px, so the cart stays visible when the level is zoomed far out
  sparkRays: 8,
  sparkLength: 18, // px, at full size

  font: '"JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace',
  labelSize: 11, // px
  titleSize: 13, // px

  padding: 24, // px kept clear around the level's bounds
} as const;

// A heavier grid line every this many world units.
export const MAJOR_EVERY = 5;

// Station platforms, in world units: how far they reach out from the station point and how
// long their legs are.
export const STATION_PLATFORM = 0.6;
export const STATION_LEG = 0.3;
