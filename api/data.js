import { json, currentUser } from './_lib/http.js';
import { findUser } from './_lib/users.js';
import { fetchSources } from './_lib/source.js';
import { filterData } from './_lib/filter.js';
import yorumlar from './_data/yorumlar.js';
import sureler from './_data/sureler.js';
import { getEverhour, applyMap } from './_lib/everhour.js';
import { readMap, readDepartman, readPasif, readMaliyet, readTatil } from './_lib/everhourMap.js';
import { groupsFor } from './_lib/filter.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  try {
    let user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Giriş gerekli' });
    // Admin, başka bir kullanıcının görünümünü görüntüleyebilir (oturum değişmez; yalnızca o kişinin yetkisine göre süzülmüş veri döner)
    const as = new URL(req.url, 'http://x').searchParams.get('as');
    if (as) {
      if (user.role !== 'admin') return json(res, 403, { error: 'Bu işlem için admin yetkisi gerekir' });
      const hedef = await findUser(as);
      if (!hedef) return json(res, 404, { error: 'Kullanıcı bulunamadı' });
      user = hedef;
    }
    const src = await fetchSources();
    // Süre: Everhour (canlı). Alınamazsa yedek olarak son dışa aktarılan rapora düşer.
    let sure = sureler;
    let sureError = null;
    if (groupsFor(user.pages).has('SURE')) {
      try {
        const now = new Date();
        const ev = applyMap(await getEverhour({ key: process.env.EVERHOUR_API_KEY, year: now.getFullYear(), upToMonth: now.getMonth() + 1 }), await readMap());
        sure = { kaynak: 'Everhour', rows: ev.rows, personel: ev.personel, departman: await readDepartman(), pasif: await readPasif() };
      } catch (e) { sureError = e.message; }
      sure = { ...sure, tatiller: await readTatil() };
    }
    // Maliyet bilgisi yalnızca admin'e gönderilir
    if (user.role === 'admin' && groupsFor(user.pages).has('PERSONEL') && sure) sure = { ...sure, maliyet: await readMaliyet() };
    const out = filterData({ ...src, yorumlar, sureler: sure }, user.pages);
    out.satisError = src.satisError;
    out.sureError = sureError;
    return json(res, 200, out);
  } catch (err) {
    return json(res, 500, { error: err.message || 'Sunucu hatası' });
  }
}
