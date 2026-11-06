// Everhour müşteri adı eşleştirme: yalnızca admin. GET liste + mevcut eşleşmeler, PUT eşleştir/kaldır.
import { json, sameOriginJson, readBody, currentUser } from './_lib/http.js';
import { getEverhour, clearEverhourCache, teshis, teshis2, teshis3, teshis4 } from './_lib/everhour.js';
import { readMap, setMapping, readDepartman, setDepartman, readPasif, setPasif, readMaliyet, setMaliyetKisi, setDagitim } from './_lib/everhourMap.js';

export default async function handler(req, res) {
  try {
    const me = await currentUser(req);
    if (!me) return json(res, 401, { error: 'Giriş gerekli' });
    if (me.role !== 'admin') return json(res, 403, { error: 'Bu işlem için admin yetkisi gerekir' });
    if (req.method === 'GET' && new URL(req.url, 'http://x').searchParams.get('teshis')) {
      const q = new URL(req.url, 'http://x').searchParams;
      if (q.get('teshis') === '4') return json(res, 200, await teshis4({ key: process.env.EVERHOUR_API_KEY, user: q.get('user') || '', date: q.get('gun') || '' }));
      const ym = q.get('ym') || '';
      if (!/^\d{4}-\d{2}$/.test(ym)) return json(res, 400, { error: 'ym=YYYY-AA gerekli' });
      if (q.get('teshis') === '3') return json(res, 200, await teshis3({ key: process.env.EVERHOUR_API_KEY, user: q.get('user') || '', ym }));
      if (q.get('teshis') === '2') return json(res, 200, await teshis2({ key: process.env.EVERHOUR_API_KEY, ym }));
      return json(res, 200, await teshis({ key: process.env.EVERHOUR_API_KEY, user: q.get('user') || '', ym, task: q.get('task') || '' }));
    }
    if (req.method === 'GET') {
      const ev = await getEverhour({ key: process.env.EVERHOUR_API_KEY, year: new Date().getFullYear(), upToMonth: new Date().getMonth() + 1 });
      const saat = new Map();
      (ev.personel || []).forEach(([u, , , h]) => saat.set(u, (saat.get(u) || 0) + h));
      const kisiler = [...saat].map(([name, hours]) => ({ name, hours: Math.round(hours) })).sort((a, b) => b.hours - a.hours);
      return json(res, 200, { musteriler: ev.musteriler, map: await readMap(), kisiler, departman: await readDepartman(), pasif: await readPasif(), maliyet: await readMaliyet() });
    }
    if (req.method === 'PUT') {
      if (!sameOriginJson(req)) return json(res, 403, { error: 'İstek reddedildi' });
      const body = await readBody(req);
      if (body.maliyetKisi !== undefined) return json(res, 200, { maliyet: await setMaliyetKisi(body.maliyetKisi, body.tutar) });
      if (body.dagitim !== undefined) return json(res, 200, { maliyet: await setDagitim(body.dagitim) });
      if (body.kisi !== undefined && body.pasif !== undefined) {
        const pasif = await setPasif(body.kisi, !!body.pasif);
        return json(res, 200, { pasif });
      }
      if (body.kisi !== undefined) {
        const departman = await setDepartman(body.kisi, body.departman);
        clearEverhourCache();
        return json(res, 200, { departman });
      }
      const { name, brand } = body;
      const map = await setMapping(name, brand);
      clearEverhourCache();
      return json(res, 200, { map });
    }
    return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  } catch (err) {
    return json(res, 400, { error: err.message || 'İşlem yapılamadı' });
  }
}
