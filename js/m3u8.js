// Чистый парсер HLS-плейлистов (без DOM) — тестируется через `node js/m3u8.js`.
export function attrs(s) {
  const m = {}; const re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g; let x;
  while ((x = re.exec(s))) m[x[1]] = x[2].replace(/^"|"$/g, '');
  return m;
}

// master → {media:false, variants:[{uri}], audios:[{uri,name,def}]}; media-плейлист → {media:true}
export function parseMaster(text, base) {
  if (!text.includes('#EXT-X-STREAM-INF')) return { media: true };
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const variants = [], audios = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('#EXT-X-MEDIA:')) {
      const a = attrs(l.slice(13));
      if (a.TYPE === 'AUDIO' && a.URI) audios.push({ uri: new URL(a.URI, base).href, name: a.NAME || a.LANGUAGE || 'дорожка', def: a.DEFAULT === 'YES' });
    } else if (l.startsWith('#EXT-X-STREAM-INF:')) {
      const sa = attrs(l.slice(18));
      let j = i + 1; while (j < lines.length && lines[j].startsWith('#')) j++;
      if (j < lines.length) variants.push({ uri: new URL(lines[j], base).href, codecs: sa.CODECS || '' });
    }
  }
  return { media: false, variants, audios };
}

export function parseMedia(text, base) {
  let init = null; const segs = [];
  for (const l of text.split('\n').map(l => l.trim())) {
    if (l.startsWith('#EXT-X-MAP:')) { const u = attrs(l.slice(11)).URI; if (u) init = new URL(u, base).href; }
    else if (l && !l.startsWith('#')) segs.push(new URL(l, base).href);
  }
  return { init, segs };
}

export function selfTest() {
  const A = (cond, name) => { if (!cond) throw new Error('FAIL: ' + name); };
  const m1 = parseMaster('#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aac",NAME="Русский",DEFAULT=YES,LANGUAGE="rus",URI="audio_0.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,CODECS="avc1.64001f,mp4a.40.2"\n0.m3u8\n', 'http://x/play/abc/master.m3u8');
  A(!m1.media && m1.variants[0].uri === 'http://x/play/abc/0.m3u8', 'variant uri');
  A(m1.audios.length === 1 && m1.audios[0].uri === 'http://x/play/abc/audio_0.m3u8' && m1.audios[0].def, 'audio rendition');
  A(parseMaster('#EXTM3U\n#EXT-X-TARGETDURATION:4\n', 'http://x/').media, 'media playlist detect');
  const p1 = parseMedia('#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4.0,\nseg0.m4s\n#EXTINF:4.0,\nseg1.m4s\n', 'http://x/play/abc/0.m3u8');
  A(p1.init === 'http://x/play/abc/init.mp4' && p1.segs.length === 2 && p1.segs[1] === 'http://x/play/abc/seg1.m4s', 'media segments + map');
  A(attrs('A="1 2",B=3,C=""').A === '1 2' && attrs('A="1 2",B=3,C=""').B === '3', 'attrs');
  return 'selftest: OK';
}

if (typeof window === 'undefined') console.log(selfTest()); // node js/m3u8.js
