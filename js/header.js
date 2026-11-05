import { common } from './styles.js';

customElements.define('app-header', class extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${common}
      :host { position: sticky; top: 0; z-index: 10; }
      header {
        display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 14px 20px;
        background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--border);
      }
      .brand { display: flex; align-items: center; gap: 10px; margin-right: auto; }
      .brand svg { width: 26px; height: 26px; }
      .brand b {
        font-size: 16px; letter-spacing: .2px;
        background: linear-gradient(90deg, var(--accent), var(--accent2));
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
    </style>
    <header>
      <div class="brand">
        <svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="24" y2="24"><stop stop-color="#6ea8ff"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs></svg>
        <b>Ace Stream Proxy</b>
      </div>
      <span class="chip"><span class="dot" id="engine"></span>engine <b id="status">…</b></span>
      <span class="chip">v<b id="ver">—</b></span>
      <span class="chip">стримы <b id="streams">0</b></span>
      <span class="chip">зрители <b id="clients">0</b></span>
    </header>`;
    this.$ = s => this.shadowRoot.querySelector(s);
    window.addEventListener('health', e => this.render(e.detail));
  }
  render(h) {
    const $ = this.$;
    if (!h) { $('#engine').className = 'dot off'; $('#status').textContent = 'нет связи'; return; }
    $('#engine').className = 'dot ' + (h.engine ? 'on' : 'off');
    $('#status').textContent = h.engine ? 'ok' : 'down';
    $('#ver').textContent = h.version;
    $('#streams').textContent = h.active_streams;
    $('#clients').textContent = h.clients;
  }
});
