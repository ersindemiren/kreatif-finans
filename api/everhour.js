// Everhour müşteri adı eşleştirme: yalnızca admin. GET liste + mevcut eşleşmeler, PUT eşleştir/kaldır.
import { json, sameOriginJson, readBody, currentUser } from './_lib/http.js';
import { getEverhour, clearEverhourCache, teshis, teshis2, teshis3, teshis4 } from './_lib/everhour.js';
import { readMap, setMapping, readDepartman, setDepartman, readPasif, setPasif, readMaliyet, setMaliyetKisi, setDagitim, kopyalaAy, maliyetTohumla, maliyetKisileri, readTatil, setTatiller, readAyarlar, setAyarlar, kisiOzet, kaydetKisiOzet, readKisiOzet } from './_lib/everhourMap.js';

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
    // Hafif okuma: yalnızca resmi tatil listesi (Everhour'a gitmez)
    // Hafif okuma (maliyet bölümü): Everhour'a gitmeden; kişi listesi son kaydedilen özetten gelir (yoksa kisiler: null)
    if (req.method === 'GET') { try { await maliyetTohumla(); } catch { /* tohumlama başarısızsa sayfa yine açılır */ } }
    if (req.method === 'GET' && new URL(req.url, 'http://x').searchParams.get('bolum') === 'maliyet') {
      const oz = await readKisiOzet();
      return json(res, 200, { kisiler: oz ? oz.kisiler : null, aylikSaat: oz ? oz.aylikSaat : {}, ozetZamani: oz?.at || null, pasif: await readPasif(), maliyet: await readMaliyet(), tatiller: await readTatil() });
    }
    if (req.method === 'GET' && new URL(req.url, 'http://x').searchParams.get('bolum') === 'ayarlar') return json(res, 200, { ayarlar: await readAyarlar() });
    if (req.method === 'GET' && new URL(req.url, 'http://x').searchParams.get('bolum') === 'tatil') return json(res, 200, { tatiller: await readTatil() });
    if (req.method === 'GET') {
      const ev = await getEverhour({ key: process.env.EVERHOUR_API_KEY, year: new Date().getFullYear(), upToMonth: new Date().getMonth() + 1 });
      const { kisiler, aylikSaat } = kisiOzet(ev.personel);
      await kaydetKisiOzet(ev.personel);
      const mal = await readMaliyet();
      const bilinen = new Set(kisiler.map((k) => k.name));
      return json(res, 200, { musteriler: ev.musteriler, map: await readMap(), kisiler, ekKisiler: maliyetKisileri(mal).filter((n) => !bilinen.has(n)), departman: await readDepartman(), pasif: await readPasif(), maliyet: mal, aylikSaat, tatiller: await readTatil(), ozetZamani: new Date().toISOString() });
    }
    if (req.method === 'PUT') {
      if (!sameOriginJson(req)) return json(res, 403, { error: 'İstek reddedildi' });
      const body = await readBody(req);
      if (body.ayarlar) return json(res, 200, { ayarlar: await setAyarlar(body.ayarlar) });
      if (body.maliyetKisi !== undefined) return json(res, 200, { maliyet: await setMaliyetKisi(body.ay, body.maliyetKisi, body.tutar) });
      if (body.dagitim !== undefined) return json(res, 200, { maliyet: await setDagitim(body.ay, body.dagitim) });
      if (body.tatiller !== undefined) return json(res, 200, { tatiller: await setTatiller(body.tatiller) });
      if (body.kopyala) return json(res, 200, { maliyet: await kopyalaAy(body.kopyala.kaynak, body.kopyala.hedef) });
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
