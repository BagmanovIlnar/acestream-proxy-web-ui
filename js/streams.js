import { api, esc, fmtDur } from './api.js';
import { common } from './styles.js';

customElements.define('streams-tab', class extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${common}
      .stream { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 10px; }
      .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .content { font-weight: 600; margin-right: auto; word-break: break-all; }
      .kv { color: var(--dim); font-size: 12.5px; display: inline-flex; gap: 5px; align-items: center; }
      .kv b { color: var(--text); }
      .watchers { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
      .watcher { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; color: var(--dim); font-size: 12.5px; padding: 6px 10px; background: var(--panel2); border-radius: 8px; }
      .watcher b { color: var(--text); font-weight: 600; }
    </style>
    <div id="list"></div>
    <div class="empty" id="empty" hidden>Нет активных трансляций</div>`;
    window.addEventListener('streams', e => this.render(e.detail));
  }
  render(streams) {
    const root = this.shadowRoot;
    root.querySelector('#empty').hidden = streams.length > 0;
    root.querySelector('#list').innerHTML = streams.map(s => `<div class="stream">
      <div class="row">
        <span class="content">${esc(s.content)}</span>
        ${s.video ? `<span class="codec">${esc(s.video)}</span>` : ''}
        <span class="kv">uptime <b>${fmtDur(s.uptime_secs)}</b></span>
        <span class="kv">зрители <b>${s.clients.length}</b></span>
        <button class="ghost" data-kill="${esc(s.id)}">Завершить</button>
      </div>
      ${s.clients.length ? `<div class="watchers">${s.clients.map(c =>
        `<div class="watcher"><b>${esc(c.ip)}</b><span class="badge ${esc(c.kind)}">${esc(c.kind)}</span><span>${fmtDur(c.watching_secs)}</span><span style="margin-left:auto">${esc(c.user_agent)}</span></div>`
      ).join('')}</div>` : ''}
    </div>`).join('');
    root.querySelectorAll('[data-kill]').forEach(b => b.onclick = async () => {
      await api('/api/streams/' + b.dataset.kill, { method: 'DELETE' }).catch(() => {});
    });
  }
});
