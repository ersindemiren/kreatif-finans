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
