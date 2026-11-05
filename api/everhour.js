// Everhour müşteri adı eşleştirme: yalnızca admin. GET liste + mevcut eşleşmeler, PUT eşleştir/kaldır.
import { json, sameOriginJson, readBody, currentUser } from './_lib/http.js';
import { getEverhour, clearEverhourCache } from './_lib/everhour.js';
import { readMap, setMapping } from './_lib/everhourMap.js';

export default async function handler(req, res) {
  try {
    const me = await currentUser(req);
    if (!me) return json(res, 401, { error: 'Giriş gerekli' });
    if (me.role !== 'admin') return json(res, 403, { error: 'Bu işlem için admin yetkisi gerekir' });
    if (req.method === 'GET') {
      const ev = await getEverhour({ key: process.env.EVERHOUR_API_KEY, year: new Date().getFullYear(), upToMonth: new Date().getMonth() + 1 });
      return json(res, 200, { musteriler: ev.musteriler, map: await readMap() });
    }
    if (req.method === 'PUT') {
      if (!sameOriginJson(req)) return json(res, 403, { error: 'İstek reddedildi' });
      const { name, brand } = await readBody(req);
      const map = await setMapping(name, brand);
      clearEverhourCache();
      return json(res, 200, { map });
    }
    return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  } catch (err) {
    return json(res, 400, { error: err.message || 'İşlem yapılamadı' });
  }
}
