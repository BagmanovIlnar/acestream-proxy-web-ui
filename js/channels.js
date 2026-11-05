import { api, esc } from './api.js';
import { common } from './styles.js';

customElements.define('channels-tab', class extends HTMLElement {
  connectedCallback() {
    this.channels = [];
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${common}
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
      .card {
        display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer;
        background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
        transition: border-color .15s, transform .15s;
      }
      .card:hover { border-color: var(--accent); transform: translateY(-1px); }
      .logo {
        width: 40px; height: 40px; border-radius: 8px; background: var(--panel2);
        display: flex; align-items: center; justify-content: center; flex: none;
        color: var(--accent); font-weight: 700; font-size: 16px; overflow: hidden;
      }
      .logo img { width: 100%; height: 100%; object-fit: contain; }
      .meta { min-width: 0; }
      .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
      .grp { color: var(--dim); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
      #search { flex: 1 1 200px; }
      #custom { flex: 2 1 280px; }
    </style>
    <div class="toolbar">
      <select id="group"><option value="">Все группы</option></select>
      <input type="text" id="search" placeholder="Поиск канала…">
    </div>
    <div class="toolbar">
      <input type="text" id="custom" placeholder="content-id, acestream://, magnet:, http(s)://…">
      <button class="primary" id="play-custom">Смотреть</button>
    </div>
    <div class="grid" id="grid"></div>
    <div class="empty" id="empty" hidden></div>`;
    const $ = s => this.shadowRoot.querySelector(s);
    this.$ = $;
    $('#group').onchange = () => this.render();
    $('#search').oninput = () => this.render();
    $('#play-custom').onclick = async () => {
      const content = $('#custom').value.trim();
      if (!content) return;
      try {
        const s = await api('/api/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
        window.dispatchEvent(new CustomEvent('play', { detail: { id: s.id, title: content } }));
      } catch (e) { alert('Не удалось запустить: ' + e.message); }
    };
    window.addEventListener('channels', e => { this.channels = e.detail; this.rebuildGroups(); this.render(); });
  }
  rebuildGroups() {
    const sel = this.$('#group'), cur = sel.value;
    const groups = [...new Set(this.channels.map(c => c.group).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">Все группы</option>' + groups.map(g => `<option>${esc(g)}</option>`).join('');
    if (groups.includes(cur)) sel.value = cur;
  }
  render() {
    const $ = this.$;
    const g = $('#group').value, q = $('#search').value.trim().toLowerCase();
    const list = this.channels.filter(c => (!g || c.group === g) && (!q || c.name.toLowerCase().includes(q)));
    $('#empty').hidden = list.length > 0 || this.channels.length > 0;
    $('#empty').textContent = this.channels.length ? 'Ничего не найдено' : 'Плейлист пуст — задайте PLAYLIST_URL на сервере';
    $('#grid').innerHTML = list.map(c => `<div class="card" data-play="${esc(c.id)}" data-name="${esc(c.name)}">
      <span class="logo" data-logo="${esc(c.logo || '')}">${esc((c.name[0] || '?').toUpperCase())}</span>
      <span class="meta"><span class="name">${esc(c.name)}</span><span class="grp">${esc(c.group)}</span></span>
    </div>`).join('');
    this.shadowRoot.querySelectorAll('.logo[data-logo]:not([data-logo=""])').forEach(el => {
      const img = new Image();
      img.onload = () => { el.textContent = ''; el.appendChild(img); };
      img.src = el.dataset.logo;
    });
    this.shadowRoot.querySelectorAll('[data-play]').forEach(el => el.onclick = () =>
      window.dispatchEvent(new CustomEvent('play', { detail: { id: el.dataset.play, title: el.dataset.name } })));
  }
});
