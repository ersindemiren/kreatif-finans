import { json, currentUser } from './_lib/http.js';
import { fetchSources } from './_lib/source.js';
import { filterData } from './_lib/filter.js';
import yorumlar from './_data/yorumlar.js';
import sureler from './_data/sureler.js';
import { getEverhour, applyMap } from './_lib/everhour.js';
import { readMap } from './_lib/everhourMap.js';
import { groupsFor } from './_lib/filter.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Giriş gerekli' });
    const src = await fetchSources();
    // Süre: Everhour (canlı). Alınamazsa yedek olarak son dışa aktarılan rapora düşer.
    let sure = sureler;
    let sureError = null;
    if (groupsFor(user.pages).has('SURE')) {
      try {
        const now = new Date();
        const ev = applyMap(await getEverhour({ key: process.env.EVERHOUR_API_KEY, year: now.getFullYear(), upToMonth: now.getMonth() + 1 }), await readMap());
        sure = { kaynak: 'Everhour', rows: ev.rows, personel: ev.personel };
      } catch (e) { sureError = e.message; }
    }
    const out = filterData({ ...src, yorumlar, sureler: sure }, user.pages);
    out.satisError = src.satisError;
    out.sureError = sureError;
    return json(res, 200, out);
  } catch (err) {
    return json(res, 500, { error: err.message || 'Sunucu hatası' });
  }
}
