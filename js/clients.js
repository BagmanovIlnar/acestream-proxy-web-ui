import { esc, fmtDur } from './api.js';
import { common } from './styles.js';

customElements.define('clients-tab', class extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${common}
      table { width: 100%; border-collapse: collapse; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
      th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border); }
      th { color: var(--dim); font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
      tr:last-child td { border-bottom: 0; }
      .ua { color: var(--dim); font-size: 12px; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
      .content { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    </style>
    <table>
      <thead><tr><th>IP</th><th>Тип</th><th>Смотрит</th><th>Что смотрит</th><th>Клиент</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <div class="empty" id="empty" hidden>Нет подключённых клиентов</div>`;
    window.addEventListener('clients', e => this.render(e.detail));
  }
  render(clients) {
    const root = this.shadowRoot;
    root.querySelector('#empty').hidden = clients.length > 0;
    root.querySelector('#rows').innerHTML = clients.map(c => `<tr>
      <td><b>${esc(c.ip)}</b></td>
      <td><span class="badge ${esc(c.kind)}">${esc(c.kind)}</span></td>
      <td>${fmtDur(c.watching_secs)}</td>
      <td class="content">${esc(c.content)}</td>
      <td><span class="ua" title="${esc(c.user_agent)}">${esc(c.user_agent)}</span></td>
    </tr>`).join('');
  }
});
