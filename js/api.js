// Общее: API-клиент, состояние, поллинг. Компоненты подписываются на window-события
// 'health' | 'streams' | 'clients' | 'channels' (detail = данные).
export const BASE = new URLSearchParams(location.search).get('api') || '';
export const state = { health: null, streams: [], clients: [], channels: [] };

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDur = s => s < 60 ? `${s}с` : s < 3600 ? `${s / 60 | 0}м ${s % 60 | 0}с` : `${s / 3600 | 0}ч ${s % 3600 / 60 | 0}м`;

export async function api(path, opts) {
  const r = await fetch(BASE + path, opts);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.status === 204 ? null : r.json();
}
export const fetchText = url => fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); });
export const fetchBuf = url => fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); });

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const every = (ms, fn) => { fn(); setInterval(fn, ms); };

export function startPolling() {
  every(5000, async () => {
    try { state.health = await api('/api/health'); } catch { state.health = null; }
    emit('health', state.health);
  });
  every(5000, async () => { try { state.streams = await api('/api/streams'); emit('streams', state.streams); } catch { /* показываем прошлые данные */ } });
  every(5000, async () => { try { state.clients = await api('/api/clients'); emit('clients', state.clients); } catch {} });
  every(60000, async () => { try { state.channels = await api('/api/channels'); emit('channels', state.channels); } catch {} });
}
