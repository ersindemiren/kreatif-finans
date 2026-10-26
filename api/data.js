import { json, currentUser } from './_lib/http.js';
import { fetchSources } from './_lib/source.js';
import { filterData } from './_lib/filter.js';
import yorumlar from './_data/yorumlar.js';
import sureler from './_data/sureler.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Giriş gerekli' });
    const src = await fetchSources();
    const out = filterData({ ...src, yorumlar, sureler }, user.pages);
    out.satisError = src.satisError;
    return json(res, 200, out);
  } catch (err) {
    return json(res, 500, { error: err.message || 'Sunucu hatası' });
  }
}
