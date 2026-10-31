import { dailyLevelIndex, dailyNumber, liveStreak } from '../core';
import { campaign, daily } from '../levels';
import {
  loadDaily,
  loadProfile,
  loadProgress,
  saveBest,
  saveDailyWin,
  saveProfile,
  storageWorks,
} from './storage';
import { apiBase } from './ui/api';
import privacy from '../../docs/launch/privacy.md?raw';
import { mountDailyScreen } from './ui/DailyScreen';
import { mountDoc } from './ui/doc';
import { openLeaderboard } from './ui/LeaderboardDialog';
import { mountHowTo } from './ui/HowTo';
import { isUnlocked, mountLevelSelect } from './ui/LevelSelect';
import { mountPlayScreen } from './ui/PlayScreen';
import type { PlayScreen } from './ui/PlayScreen';
import { startRouter } from './ui/router';
import type { Route, Router } from './ui/router';
import { messages } from './ui/messages';
import { createMuteToggle, gameSound } from './ui/sound';
import { applyTheme, createThemePicker, savedTheme } from './ui/ThemePicker';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');
if (campaign.length === 0) throw new Error('no campaign levels');
if (daily.length === 0) throw new Error('no daily levels');

// The saved theme goes on before anything is drawn, so the page never flashes another one.
applyTheme(savedTheme());

// Kept in memory as well as saved, so wins still unlock levels for this visit when storage
// is blocked.
let progress = loadProgress();
let dailySave = loadDaily();
let screen: PlayScreen | undefined;
// When saves won't stick, level select says so once per visit, quietly.
let noteNotSaving = !storageWorks();
// A first visit sees the how-to before anything else (also once per visit when storage is
// blocked). `afterHowTo` is where its button goes.
let seenHowTo = loadProfile().seenHowTo === true;
let afterHowTo: Route = { screen: 'levels' };

// The leaderboard, when there's a Worker to talk to (ui/api.ts). The nickname is asked once
// and kept in the profile.
const boards = apiBase() !== '';
function board(boardId: string, name: string, run?: string): void {
  openLeaderboard({
    boardId,
    title: messages.boardTitle(name),
    ...(run === undefined ? {} : { run }),
    nickname: () => loadProfile().nickname ?? nickname,
    saveNickname: (value) => {
      nickname = value;
      saveProfile({ ...loadProfile(), nickname: value });
    },
  });
}
let nickname: string | undefined; // kept for the visit when storage is blocked

function show(route: Route, router: Router): void {
  screen?.unmount();
  screen = undefined;
  // About and Privacy are open to anyone, first visit or not (a privacy link must just work).
  if (route.screen === 'about' || route.screen === 'privacy') {
    const md = route.screen === 'about' ? messages.about : privacy;
    mountDoc(app!, md, route.screen, () => router.show({ screen: 'levels' }));
    return;
  }
  if (!seenHowTo && route.screen !== 'howto') {
    // Level select afterwards, so the player sees the whole set, or the level a link pointed at.
    afterHowTo = route.screen === 'play' ? route : { screen: 'levels' };
    router.replace({ screen: 'howto' });
    return;
  }
  if (route.screen === 'howto') {
    mountHowTo(app!, () => {
      seenHowTo = true;
      saveProfile({ ...loadProfile(), seenHowTo: true });
      const next = afterHowTo;
      afterHowTo = { screen: 'levels' };
      router.replace(next);
    });
    return;
  }
  // Today's daily, by the UTC date (core/daily): the same level on every device.
  const n = dailyNumber(new Date());
  const today = daily[dailyLevelIndex(n, daily.length)]!;
  if (route.screen === 'levels') {
    mountLevelSelect(app!, campaign, {
      progress,
      daily: {
        n,
        name: today.name,
        par: today.par,
        best: dailySave.best[n]?.score,
        streak: liveStreak(dailySave.streak, n),
      },
      notSaving: noteNotSaving,
      onPick: (id) => router.show({ screen: 'play', id }),
      onDaily: () => router.show({ screen: 'daily' }),
      onHowTo: () => router.show({ screen: 'howto' }),
      onAbout: () => router.show({ screen: 'about' }),
      onPrivacy: () => router.show({ screen: 'privacy' }),
    });
    noteNotSaving = false;
    return;
  }
  if (route.screen === 'daily') {
    screen = mountDailyScreen(app!, today, n, {
      save: dailySave,
      onWin: (score, equation) => (dailySave = saveDailyWin(dailySave, n, score, equation)),
      onBack: () => router.show({ screen: 'levels' }),
      onNewDay: () => router.replace({ screen: 'daily' }),
      onLeaderboard: boards ? (run) => board(`daily:${n}`, today.name, run) : undefined,
    });
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
    onLeaderboard: boards ? (run) => board(level.id, level.name, run) : undefined,
  });
}

startRouter(show);
document.body.append(
  createMuteToggle(gameSound()),
  createThemePicker(() => screen?.redraw()),
);
