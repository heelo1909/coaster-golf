import { campaign } from '../levels';
import { loadProgress, saveBest, storageWorks } from './storage';
import { isUnlocked, mountLevelSelect } from './ui/LevelSelect';
import { mountPlayScreen } from './ui/PlayScreen';
import type { PlayScreen } from './ui/PlayScreen';
import { startRouter } from './ui/router';
import type { Route, Router } from './ui/router';
import { applyTheme, createThemePicker, savedTheme } from './ui/ThemePicker';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');
if (campaign.length === 0) throw new Error('no campaign levels');

// The saved theme goes on before anything is drawn, so the page never flashes another one.
applyTheme(savedTheme());

// Kept in memory as well as saved, so wins still unlock levels for this visit when storage
// is blocked.
let progress = loadProgress();
let screen: PlayScreen | undefined;
// When saves won't stick, level select says so once per visit, quietly.
let noteNotSaving = !storageWorks();

function show(route: Route, router: Router): void {
  screen?.unmount();
  screen = undefined;
  if (route.screen === 'levels') {
    mountLevelSelect(app!, campaign, progress, noteNotSaving, (id) =>
      router.show({ screen: 'play', id }),
    );
    noteNotSaving = false;
    return;
  }
  const index = campaign.findIndex((l) => l.id === route.id);
  // Unknown and locked levels go back to level select (see ui/CLAUDE.md).
  if (index < 0 || !isUnlocked(campaign, progress, index)) {
    router.replace({ screen: 'levels' });
    return;
  }
  const level = campaign[index]!;
  const next = campaign[index + 1];
  screen = mountPlayScreen(app!, level, {
    best: progress.best[level.id],
    onWin: (score, equation) => {
      progress = saveBest(progress, level.id, score, equation);
      return progress.best[level.id];
    },
    onBack: () => router.show({ screen: 'levels' }),
    onNext: next && (() => router.show({ screen: 'play', id: next.id })),
  });
}

startRouter(show);
document.body.append(createThemePicker(() => screen?.redraw()));
