import { api, BASE } from './api.js';
import { common } from './styles.js';

// ponytail: плеер на hls.js (вендор-файл js/vendor/hls.min.js, без сборки). Самодельный
// MSE-движок (очередь appends + trimmer + live-jump) после одного битого сегмента
// молча переставал дописывать буфер — картинка замирала у live-края; hls.js это
// обрабатывает из коробки. Нативный HLS — только Safari (см. play()).
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
    this.video.addEventListener('error', () => {
      // Chrome/Firefox врут в canPlayType и ломаются на нативном HLS — падаем на hls.js
      if (this.native && this.id) { this.native = false; this.setStatus('нативный HLS не поддерживается → транскод'); this.startMSE(this.id, this.enc); }
    });
    $('#close').onclick = () => this.close();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    $('#audio').onchange = e => {
      this.audioIdx = +e.target.value;
      if (!this.id) return;
      this.at = this.audioIdx;
      localStorage.setItem('at:' + this.id, this.at);
      this.setStatus('дорожка ' + (this.at + 1) + '…');
      this.startMSE(this.id, this.enc);
    };
    window.addEventListener('play', e => this.play(e.detail.id, e.detail.title));
  }

  setStatus(msg, err) { const el = this.$('#status'); el.textContent = msg; el.className = 'status' + (err ? ' err' : ''); }

  // ---- транскод через hls.js ----
  startMSE(id, forceEnc) {
    this.native = false;
    this.stopMSE();
    if (!window.Hls) { this.setStatus('hls.js не загрузился — обновите страницу', true); return; }
    if (!Hls.isSupported()) { this.setStatus('браузер не поддерживает MSE', true); return; }
    // холодный старт p2p: прокси держит /master.m3u8 пока ffmpeg не выдаст плейлист —
    // щедрые ретраи манифеста, чтобы пережить медленные источники и редкие 504
    const hls = new Hls({
      liveDurationInfinity: true,
      backBufferLength: 60,
      manifestLoadPolicy: { default: { maxTimeToFirstByteMs: 180000, maxTimeToLoadMs: 200000, timeoutRetry: { maxNumRetry: 4, retryDelayMs: 500, maxRetryDelayMs: 4000 }, errorRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000 } } },
    });
    this.mse = { hls };
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        // remux (copy h264) тащит мусор источника в MSE: после пары ошибок
        // декодирования переезжаем на полный транскод (?enc=1) — самовосстановление
        this.mediaFails = (this.mediaFails || 0) + 1;
        if (this.mediaFails >= 2 && !this.enc) {
          this.enc = true;
          this.setStatus('битые кадры в remux → полный транскод…');
          this.startMSE(id, true);
          return;
        }
        this.setStatus('восстановление после ошибки декодирования (' + data.details + ')…');
        hls.recoverMediaError();
        return;
      }
      this.setStatus('поток оборвался (' + data.details + '), перезапуск через 10с…');
      const sid = id;
      setTimeout(() => { if (this.id === sid) this.startMSE(sid, this.enc); }, 10000);
    });
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // мультитрек-рендишены аудио (если появятся) — по селектору
      if (hls.audioTracks?.length > 1) hls.audioTrack = Math.min(this.audioIdx, hls.audioTracks.length - 1);
      this.setStatus(this.enc ? 'полный транскод → браузер' : 'транскод → браузер');
      this.video.play().catch(() => {});
    });
    this.setStatus('запуск транскода… (p2p прогрев, до ~2 мин)');
    const q = [this.enc && 'enc=1', this.at != null && 'at=' + this.at].filter(Boolean).join('&');
    hls.loadSource(`${BASE}/play/${encodeURIComponent(id)}/master.m3u8` + (q ? '?' + q : ''));
    hls.attachMedia(this.video);
  }

  stopMSE() {
    const st = this.mse; if (!st) return;
    this.mse = null;
    try { st.hls.destroy(); } catch { /* уже уничтожен */ }
  }

  async play(id, title) {
    this.$('#overlay').classList.add('open');
    this.$('#title').textContent = title;
    this.$('#audio').hidden = true;
    this.setStatus('запуск сессии…');
    this.video.removeAttribute('src'); this.video.load();
    this.id = id;
    this.enc = false; // новый канал — заново решаем remux/транскод
    this.mediaFails = 0;
    this.at = +(localStorage.getItem('at:' + id) || 0); // выбранная аудиодорожка
    // список дорожек — в фоне (не мешает старту): селектор появится, когда probe
    // увидит дорожки; выбор идёт в транскод через ?at=N (липкий, как сдвиг)
    api(`/api/streams/${encodeURIComponent(id)}/audio`).then(info => {
      if (this.id !== id) return;
      const sel = this.$('#audio');
      sel.innerHTML = info.tracks.map((t, i) => `<option value="${i}">аудио ${i + 1}: ${esc0(t.codec)}${t.lang ? ' · ' + esc0(t.lang) : ''}</option>`).join('');
      sel.hidden = info.tracks.length < 2;
      sel.value = Math.min(this.at, info.tracks.length - 1);
    }).catch(() => {});
    const safari = navigator.userAgent.includes('Safari') && !/Chrome|Chromium|Edg|OPR/.test(navigator.userAgent);
    if (!safari) {
      // Chrome/Firefox: транскод сразу, без префлайта /audio — тот ждёт probe до ~90с,
      // а нужен был только для выбора аудиодорожки (при одной варианте селектор всё
      // равно декоративный). master.m3u8 теперь отдаёт транскод без probe.
      this.startMSE(id, this.enc);
      return;
    }
    let info;
    // холодный старт канала: движок буферизует p2p, probe занимает десятки секунд.
    // fetch без таймаута терпелив; при ошибке (probe failed / сессия движка умерла)
    // прокси отдаёт 503 без сноса стрима — один ретрай через 5с
    const audioInfo = async () => {
      this.setStatus('запуск сессии… (p2p прогрев, до ~90с)');
      try { return await api(`/api/streams/${encodeURIComponent(id)}/audio`); }
      catch (e) {
        this.setStatus('повтор через 5с: ' + e.message);
        await new Promise(r => setTimeout(r, 5000));
        return api(`/api/streams/${encodeURIComponent(id)}/audio`);
      }
    };
    try { info = await audioInfo(); }
    catch (e) { this.setStatus('Ошибка: ' + e.message, true); return; }

    const sel = this.$('#audio'); // дорожки из probe (транскод отдаёт первую)
    sel.innerHTML = info.tracks.map((t, i) => `<option value="${i}">аудио ${i + 1}: ${esc0(t.codec)}${t.lang ? ' · ' + esc0(t.lang) : ''}</option>`).join('');
    sel.hidden = info.tracks.length < 2;
    this.audioIdx = Math.min(this.audioIdx, Math.max(0, info.tracks.length - 1));
    sel.value = this.audioIdx;

    if (info.passthrough && this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari умеет нативный HLS; Chrome в canPlayType отвечает «maybe» и потом
      // молча не играет — ему всегда hls.js (ветка выше)
        this.native = true;
        this.setStatus('прямой HLS движка (без транскода)');
        this.video.src = `${BASE}/play/${encodeURIComponent(id)}/master.m3u8`;
        this.video.play().catch(() => {});
        // страховка: если за 8с ни одного кадра — не ждём error, сразу в транскод
        setTimeout(() => {
          if (this.native && this.video.readyState === 0) {
            this.native = false;
            this.setStatus('нативный HLS не завёлся → транскод');
            this.startMSE(id, this.enc);
          }
        }, 8000);
    } else {
      this.startMSE(id, this.enc);
    }
  }

  close() {
    this.stopMSE();
    this.native = false;
    this.enc = false;
    this.mediaFails = 0;
    this.$('#overlay').classList.remove('open');
    this.video.removeAttribute('src'); this.video.load();
    this.id = null;
  }
});

// локальный esc (не тянет api.js в замыкание ради одной строки)
const esc0 = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
