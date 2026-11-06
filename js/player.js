import { api, BASE, fetchText, fetchBuf } from './api.js';
import { parseMaster, parseMedia } from './m3u8.js';
import { common } from './styles.js';

// ponytail: свой MSE-плеер вместо hls.js (требование «без зависимостей»); работает потому,
// что транскод бэкенда отдаёт fMP4-сегменты — демуксер не нужен. TS-потоки движка (passthrough)
// без hls.js играются только нативно (Safari).
const appendOne = (sb, buf) => new Promise((res, rej) => {
  sb.addEventListener('updateend', () => res(), { once: true });
  sb.addEventListener('error', () => rej(new Error('append failed')), { once: true });
  sb.appendBuffer(buf);
});

customElements.define('player-overlay', class extends HTMLElement {
  connectedCallback() {
    this.audioIdx = 0;
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>${common}
      #overlay { position: fixed; inset: 0; z-index: 50; background: radial-gradient(1200px 800px at 50% -20%, #10182b, #05070b 65%); display: none; flex-direction: column; }
      #overlay.open { display: flex; }
      .top { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid var(--border); background: rgba(7, 11, 20, .75); backdrop-filter: blur(10px); }
      .title { font-weight: 700; margin-right: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: linear-gradient(90deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
      .status { color: var(--dim); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .status.err { color: var(--bad); }
      video { flex: 1; width: 100%; min-height: 0; background: #000; outline: none; object-fit: contain; }
      #audio { max-width: 220px; }
      #close {
        appearance: none; cursor: pointer; background: none; border: 1px solid var(--border);
        border-radius: 10px; color: var(--text); width: 36px; height: 36px; font-size: 16px; flex: none;
        transition: border-color .15s, color .15s;
      }
      #close:hover { border-color: var(--bad); color: var(--bad); }
    </style>
    <div id="overlay">
      <div class="top">
        <span class="title" id="title"></span>
        <span class="status" id="status"></span>
        <select id="audio" hidden></select>
        <button id="close" title="Закрыть (Esc)">✕</button>
      </div>
      <video controls autoplay playsinline></video>
    </div>`;
    const $ = s => this.shadowRoot.querySelector(s);
    this.$ = $;
    this.video = $('video');
    const bufEnd = () => { const b = this.video.buffered; return b.length ? b.end(b.length - 1) : 0; };
    this.liveJump = () => { const e = bufEnd(); if (e > 0) this.video.currentTime = Math.max(0, e - 1.5); };
    this.video.addEventListener('waiting', () => { if (bufEnd() - this.video.currentTime > 3) this.liveJump(); });
    $('#close').onclick = () => this.close();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    $('#audio').onchange = e => { this.audioIdx = +e.target.value; if (this.id) { this.setStatus('переключение дорожки…'); this.startMSE(this.id); } };
    window.addEventListener('play', e => this.play(e.detail.id, e.detail.title));
  }

  setStatus(msg, err) { const el = this.$('#status'); el.textContent = msg; el.className = 'status' + (err ? ' err' : ''); }

  // ---- MSE live HLS ----
  makeAppender(sb) { // сериализованная очередь на один SourceBuffer
    let q = Promise.resolve();
    return buf => q = q.then(async () => {
      try { await appendOne(sb, buf); }
      catch { try { sb.remove(0, this.video.currentTime - 5); await appendOne(sb, buf); } catch { /* сегмент потерян, едем дальше */ } }
    });
  }

  runPlaylist(uri, sb, seen, st) {
    let initAppended = null, first = true;
    const append = this.makeAppender(sb);
    const tick = async () => {
      if (st !== this.mse) return; // плеер перезапущен
      let pl;
      try { pl = parseMedia(await fetchText(uri), uri); } catch { return; } // транзиентная ошибка — ждём следующий тик
      if (pl.init && initAppended !== pl.init) { await append(await fetchBuf(pl.init)); initAppended = pl.init; }
      let fresh = pl.segs.filter(u => !seen.has(u));
      if (first) { fresh = fresh.slice(-3); first = false; } // начинаем у live-края
      for (const u of fresh) {
        seen.add(u);
        const b = await fetchBuf(u).catch(() => null);
        if (b) append(b);
      }
      if (fresh.length && !st.started) {
        st.startedCount = (st.startedCount || 0) + 1;
        if (st.startedCount >= (st.hasAudio ? 2 : 1)) { // ждём и видео, и аудио
          st.started = true;
          this.video.play().then(() => this.liveJump()).catch(() => {});
        }
      }
    };
    tick();
    st.timers.push(setInterval(tick, 2000));
  }

  startMSE(id) {
    this.stopMSE();
    const masterUrl = `${BASE}/play/${encodeURIComponent(id)}/master.m3u8`;
    const st = this.mse = { timers: [], seenV: new Set(), seenA: new Set(), started: false, hasAudio: false };
    const ms = st.ms = new MediaSource();
    this.video.src = URL.createObjectURL(ms);
    ms.addEventListener('sourceopen', async () => {
      if (st !== this.mse) return;
      try {
        const m = parseMaster(await fetchText(masterUrl), masterUrl);
        st.sbV = ms.addSourceBuffer('video/mp4');
        if (m.media) { this.setStatus('транскод (без аудио)'); this.runPlaylist(masterUrl, st.sbV, st.seenV, st); return; }
        const audio = m.audios[Math.min(this.audioIdx, m.audios.length - 1)];
        st.hasAudio = !!audio;
        if (audio) st.sbA = ms.addSourceBuffer('audio/mp4');
        this.setStatus('транскод → браузер' + (audio ? ` · аудио: ${audio.name}` : ''));
        this.runPlaylist(m.variants[0].uri, st.sbV, st.seenV, st);
        if (audio) this.runPlaylist(audio.uri, st.sbA, st.seenA, st);
        st.trimmer = setInterval(() => { // не даём буферу расти бесконечно
          const from = this.video.currentTime - 60;
          for (const sb of [st.sbV, st.sbA]) if (sb && sb.buffered.length && sb.buffered.start(0) < from) sb.remove(0, from);
        }, 20000);
      } catch (e) { this.setStatus('Ошибка запуска: ' + e.message, true); }
    }, { once: true });
  }

  stopMSE() {
    const st = this.mse; if (!st) return;
    this.mse = null;
    st.timers.forEach(clearInterval);
    clearInterval(st.trimmer);
    if (st.ms && st.ms.readyState === 'open') try { st.ms.endOfStream(); } catch { /* уже закрыт */ }
  }

  async play(id, title) {
    this.$('#overlay').classList.add('open');
    this.$('#title').textContent = title;
    this.$('#audio').hidden = true;
    this.setStatus('запуск сессии…');
    this.video.removeAttribute('src'); this.video.load();
    this.id = id;
    let info;
    try { info = await api(`/api/streams/${encodeURIComponent(id)}/audio`); }
    catch (e) { this.setStatus('Ошибка: ' + e.message, true); return; }

    const sel = this.$('#audio'); // дорожки из probe; в MSE-режиме имена совпадают с рендишенами по порядку
    sel.innerHTML = info.tracks.map((t, i) => `<option value="${i}">аудио ${i + 1}: ${esc0(t.codec)}${t.lang ? ' · ' + esc0(t.lang) : ''}</option>`).join('');
    sel.hidden = info.tracks.length < 2;
    this.audioIdx = Math.min(this.audioIdx, Math.max(0, info.tracks.length - 1));
    sel.value = this.audioIdx;

    if (info.passthrough) {
      if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.setStatus('прямой HLS движка (без транскода)');
        this.video.src = `${BASE}/play/${encodeURIComponent(id)}/master.m3u8`;
        this.video.play().catch(() => {});
      } else {
        this.setStatus('Кодеки браузерные → движок отдаёт TS-HLS, который без hls.js играет только Safari. Настройте транскод на бэке (?transcode=1) или смотрите с Safari.', true);
      }
    } else {
      this.startMSE(id);
    }
  }

  close() {
    this.stopMSE();
    this.$('#overlay').classList.remove('open');
    this.video.removeAttribute('src'); this.video.load();
    this.id = null;
  }
});

// локальный esc (не тянет api.js в замыкание ради одной строки)
const esc0 = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
