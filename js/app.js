import './header.js';
import './channels.js';
import './streams.js';
import './clients.js';
import './player.js';
import { startPolling } from './api.js';

// табы
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('main > *').forEach(x => x.hidden = x.tagName.toLowerCase() !== b.dataset.tab);
});

// счётчики в навигации
window.addEventListener('health', e => {
  document.querySelector('#n-streams').textContent = e.detail?.active_streams ?? 0;
  document.querySelector('#n-clients').textContent = e.detail?.clients ?? 0;
});
window.addEventListener('channels', e => document.querySelector('#n-channels').textContent = e.detail.length);

// selftest m3u8-парсера удалён вместе с самописным MSE-движком (hls.js парсит сам)

startPolling();
