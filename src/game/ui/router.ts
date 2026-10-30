// The screen state machine (see ui/CLAUDE.md). The URL hash mirrors the screen, so Back works
// and a level can be linked: #/levels, #/play/c03, #/daily, #/howto, #/about, #/privacy. parseHash
// and hashOf are pure; the listener in startRouter is the only part that touches the window.

export type Route =
  | { screen: 'levels' }
  | { screen: 'howto' }
  | { screen: 'daily' }
  | { screen: 'about' }
  | { screen: 'privacy' }
  | { screen: 'play'; id: string };

const PLAY = /^#\/play\/([a-z0-9]{1,16})$/;

// Anything unknown (an empty hash, a typo, an old link) goes to level select.
export function parseHash(hash: string): Route {
  const play = PLAY.exec(hash);
  if (play) return { screen: 'play', id: play[1]! };
  if (hash === '#/howto') return { screen: 'howto' };
  if (hash === '#/daily') return { screen: 'daily' };
  if (hash === '#/about') return { screen: 'about' };
  if (hash === '#/privacy') return { screen: 'privacy' };
  return { screen: 'levels' };
}

export function hashOf(route: Route): string {
  return route.screen === 'play' ? `#/play/${route.id}` : `#/${route.screen}`;
}

export interface Router {
  show(route: Route): void; // a new history entry, so Back returns here
  replace(route: Route): void; // swaps the current entry, for redirects
}

// Calls `onRoute` now and on every hash change. `onRoute` may redirect with `replace`.
export function startRouter(onRoute: (route: Route, router: Router) => void): Router {
  const router: Router = {
    show(route) {
      if (location.hash === hashOf(route)) onRoute(route, router);
      else location.hash = hashOf(route); // the hashchange below does the rest
    },
    replace(route) {
      history.replaceState(null, '', hashOf(route));
      onRoute(route, router);
    },
  };
  window.addEventListener('hashchange', () => onRoute(parseHash(location.hash), router));
  onRoute(parseHash(location.hash), router);
  return router;
}
