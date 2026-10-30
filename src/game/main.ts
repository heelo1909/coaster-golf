import { campaign } from '../levels';
import { mountPlayScreen } from './ui/PlayScreen';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');
if (campaign.length === 0) throw new Error('no campaign levels');

// Plays the campaign in order until the level select screen arrives in Section 6.
let unmount: (() => void) | undefined;
function play(index: number): void {
  unmount?.();
  const next = index + 1 < campaign.length ? () => play(index + 1) : undefined;
  unmount = mountPlayScreen(app!, campaign[index]!, next);
}

play(0);
