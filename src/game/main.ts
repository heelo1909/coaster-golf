import { campaign } from '../levels';
import { mountPlayScreen } from './ui/PlayScreen';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');
const level = campaign[0];
if (!level) throw new Error('no campaign levels');

mountPlayScreen(app, level);
