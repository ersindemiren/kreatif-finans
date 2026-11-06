// Everhour müşteri adı -> dashboard marka adı eşleştirmeleri (Blob, private).
import { get, put } from '@vercel/blob';

const PATH = 'kf-auth/everhour-map.json';
let store = {
  async read() {
    const r = await get(PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(map) {
    await put(PATH, JSON.stringify(map), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setMapStore = (s) => { store = s; };

export async function readMap() {
  try { const m = await store.read(); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

export async function setMapping(name, brand) {
  const n = String(name || '').trim().slice(0, 120);
  if (!n) throw new Error('Everhour adı gerekli');
  const map = await readMap();
  const b = String(brand || '').trim().slice(0, 120);
  if (b) map[n] = b; else delete map[n];
  await store.write(map);
  return map;
}

// Everhour kişi adı -> departman eşleştirmeleri (ayrı Blob dosyası).
const DEP_PATH = 'kf-auth/everhour-departman.json';
let depStore = {
  async read() {
    const r = await get(DEP_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(map) {
    await put(DEP_PATH, JSON.stringify(map), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setDepartmanStore = (s) => { depStore = s; };

export async function readDepartman() {
  try { const m = await depStore.read(); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

export async function setDepartman(kisi, departman) {
  const k = String(kisi || '').trim().slice(0, 120);
  if (!k) throw new Error('Kişi adı gerekli');
  const map = await readDepartman();
  const d = String(departman || '').trim().slice(0, 80);
  if (d) map[k] = d; else delete map[k];
  await depStore.write(map);
  return map;
}

// Everhour kişi adı -> pasif (işten ayrıldı) işareti.
const PASIF_PATH = 'kf-auth/everhour-pasif.json';
let pasifStore = {
  async read() {
    const r = await get(PASIF_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(map) {
    await put(PASIF_PATH, JSON.stringify(map), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setPasifStore = (s) => { pasifStore = s; };

export async function readPasif() {
  try { const m = await pasifStore.read(); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

export async function setPasif(kisi, pasif) {
  const k = String(kisi || '').trim().slice(0, 120);
  if (!k) throw new Error('Kişi adı gerekli');
  const map = await readPasif();
  if (pasif) map[k] = true; else delete map[k];
  await pasifStore.write(map);
  return map;
}

// Personel maliyeti: { kisi: { AD: aylık toplam maliyet }, dagitim: genel işletme dağıtım gideri }. Yalnızca admin okur/yazar.
const MAL_PATH = 'kf-auth/personel-maliyet.json';
let malStore = {
  async read() {
    const r = await get(MAL_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(v) {
    await put(MAL_PATH, JSON.stringify(v), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setMaliyetStore = (s) => { malStore = s; };

export async function readMaliyet() {
  try {
    const m = await malStore.read();
    return { kisi: m && typeof m.kisi === 'object' && !Array.isArray(m.kisi) ? m.kisi : {}, dagitim: Number(m?.dagitim) > 0 ? Number(m.dagitim) : 0 };
  } catch { return { kisi: {}, dagitim: 0 }; }
}

const tutar = (v) => { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 1e10) throw new Error('Geçersiz tutar'); return Math.round(n * 100) / 100; };

export async function setMaliyetKisi(kisi, deger) {
  const k = String(kisi || '').trim().slice(0, 120);
  if (!k) throw new Error('Kişi adı gerekli');
  const m = await readMaliyet();
  const n = tutar(deger);
  if (n > 0) m.kisi[k] = n; else delete m.kisi[k];
  await malStore.write(m);
  return m;
}

export async function setDagitim(deger) {
  const m = await readMaliyet();
  m.dagitim = tutar(deger);
  await malStore.write(m);
  return m;
}
