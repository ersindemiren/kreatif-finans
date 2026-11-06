// Bir kişinin bir aydaki Everhour görevleri. Yalnızca Süre Analiz personel/departman yetkisi olan kullanıcı (kişi bazlı veri).
import { json, currentUser } from './_lib/http.js';
import { groupsFor } from './_lib/filter.js';
import { fetchGorevler } from './_lib/everhour.js';
import { readMap } from './_lib/everhourMap.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  try {
    const me = await currentUser(req);
    if (!me) return json(res, 401, { error: 'Giriş gerekli' });
    if (!groupsFor(me.pages).has('PERSONEL')) return json(res, 403, { error: 'Bu veriye erişim yetkiniz yok' });
    const url = new URL(req.url, 'http://x');
    const list = await fetchGorevler({ key: process.env.EVERHOUR_API_KEY, user: url.searchParams.get('user'), ym: url.searchParams.get('ym') });
    const map = await readMap();
    // Müşteri adı, süre tablolarıyla aynı eşleştirmeden geçer (Everhour müşteri adı -> marka)
    const gorevler = list.map((g) => ({ ...g, client: (g.client && map[g.client]) || g.client }));
    return json(res, 200, { gorevler });
  } catch (err) {
    return json(res, 400, { error: err.message || 'Görevler alınamadı' });
  }
}
