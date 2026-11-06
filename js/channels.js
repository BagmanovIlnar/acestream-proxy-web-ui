import { api, esc } from './api.js';
import { common } from './styles.js';

customElements.define('channels-tab', class extends HTMLElement {
  connectedCallback() {
    this.channels = [];
    this.net = null; // результаты поиска публичных трансляций (/api/search)
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${common}
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
      .card {
        display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer;
        background: linear-gradient(180deg, #16203a, var(--panel));
        border: 1px solid var(--border); border-radius: var(--radius);
        transition: border-color .15s, transform .15s, box-shadow .15s;
      }
      .card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 10px 28px rgba(110, 168, 255, .16); }
      .logo {
        width: 44px; height: 44px; border-radius: 10px; background: var(--panel2);
        border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center; flex: none;
        color: var(--accent); font-weight: 700; font-size: 17px; overflow: hidden;
      }
      .logo img { width: 100%; height: 100%; object-fit: contain; }
      .meta { min-width: 0; }
      .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
      .grp { color: var(--dim); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
      #search { flex: 1 1 200px; }
      #custom { flex: 2 1 260px; }
      #netq { flex: 1 1 200px; }
      .nethead { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; color: var(--dim); font-size: 12.5px; }
      .nethead b { color: var(--text); }
    </style>
    <div class="toolbar">
      <select id="cat"><option value="">Все категории</option></select>
      <input type="text" id="search" placeholder="Поиск канала…">
    </div>
    <div class="toolbar">
      <input type="text" id="custom" placeholder="content-id, acestream://, magnet:, http(s)://…">
      <button class="primary" id="play-custom">Смотреть</button>
      <input type="text" id="netq" placeholder="Поиск публичных трансляций в сети…">
      <button class="ghost" id="net-go">Найти</button>
    </div>
    <div class="nethead" id="nethead" hidden>
      <span>Публичные трансляции: <b id="netn">0</b></span>
      <button class="ghost" id="net-clear">← к каталогу</button>
    </div>
    <div class="grid" id="grid"></div>
    <div class="empty" id="empty" hidden></div>`;
    const $ = s => this.shadowRoot.querySelector(s);
    this.$ = $;
    $('#cat').onchange = () => this.render();
    $('#search').oninput = () => this.render();
    $('#play-custom').onclick = async () => {
      const content = $('#custom').value.trim();
      if (!content) return;
      try {
        const s = await api('/api/streams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
        window.dispatchEvent(new CustomEvent('play', { detail: { id: s.id, title: content } }));
      } catch (e) { alert('Не удалось запустить: ' + e.message); }
    };
    $('#net-go').onclick = () => this.netSearch();
    $('#netq').onkeydown = e => { if (e.key === 'Enter') this.netSearch(); };
    $('#net-clear').onclick = () => { this.net = null; $('#netq').value = ''; this.render(); };
    api('/api/channels/categories').then(cats => { // категории с бэка (group из JSON убрали)
      const sel = $('#cat'), cur = sel.value;
      sel.innerHTML = '<option value="">Все категории</option>' + cats.map(c => `<option value="${esc(c.name)}">${esc(c.name)} (${c.count})</option>`).join('');
      if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
    }).catch(() => {});
    window.addEventListener('channels', e => { this.channels = e.detail; this.render(); });
  }

  async netSearch() {
    const q = this.$('#netq').value.trim();
    if (!q) return;
    this.$('#net-go').textContent = '…';
    try {
      const r = await api('/api/search?q=' + encodeURIComponent(q));
      this.net = r.items;
      this.$('#nethead').hidden = false;
      this.$('#netn').textContent = this.net.length;
      this.render();
    } catch (e) { alert('Поиск не удался: ' + e.message); }
    this.$('#net-go').textContent = 'Найти';
  }

  card(id, name, sub, logo) {
    return `<div class="card" data-play="${esc(id)}" data-name="${esc(name)}">
      <span class="logo" data-logo="${esc(logo || '')}">${esc((name[0] || '?').toUpperCase())}</span>
      <span class="meta"><span class="name">${esc(name)}</span><span class="grp">${esc(sub)}</span></span>
    </div>`;
  }

  render() {
    const $ = this.$, grid = $('#grid');
    if (this.net) {
      grid.innerHTML = this.net.map(it =>
        this.card(it.content_id, it.name, it.bitrate ? (it.bitrate / 1e6).toFixed(1) + ' Мбит/с' : 'сеть Ace Stream')).join('');
      $('#empty').hidden = this.net.length > 0;
      $('#empty').textContent = 'Ничего не найдено';
    } else {
      const cat = $('#cat').value, q = $('#search').value.trim().toLowerCase();
      const list = this.channels.filter(c =>
        (!cat || (c.categories || []).some(x => x.toLowerCase() === cat.toLowerCase())) &&
        (!q || c.name.toLowerCase().includes(q)));
      $('#empty').hidden = list.length > 0 || this.channels.length > 0;
      $('#empty').textContent = this.channels.length ? 'Ничего не найдено' : 'Каталог пуст — бэкенд наполняет его из сети автоматически';
      grid.innerHTML = list.map(c =>
        this.card(c.id, c.name, (c.categories || [])[0] || '', c.logo)).join('');
    }
    this.shadowRoot.querySelectorAll('.logo[data-logo]:not([data-logo=""])').forEach(el => {
      const img = new Image();
      img.onload = () => { el.textContent = ''; el.appendChild(img); };
      img.src = el.dataset.logo;
    });
    this.shadowRoot.querySelectorAll('[data-play]').forEach(el => el.onclick = () =>
      window.dispatchEvent(new CustomEvent('play', { detail: { id: el.dataset.play, title: el.dataset.name } })));
  }
});
