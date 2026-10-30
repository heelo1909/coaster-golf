import { campaign } from '../levels';
import { mountPlayScreen } from './ui/PlayScreen';
import type { PlayScreen } from './ui/PlayScreen';
import { applyTheme, createThemePicker, savedTheme } from './ui/ThemePicker';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');
if (campaign.length === 0) throw new Error('no campaign levels');

// The saved theme goes on before anything is drawn, so the page never flashes another one.
applyTheme(savedTheme());

// Plays the campaign in order until the level select screen arrives in Section 6.
let screen: PlayScreen | undefined;
function play(index: number): void {
  screen?.unmount();
  const next = index + 1 < campaign.length ? () => play(index + 1) : undefined;
  screen = mountPlayScreen(app!, campaign[index]!, next);
}

play(0);
document.body.append(createThemePicker(() => screen?.redraw()));
