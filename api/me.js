import { json, currentUser } from './_lib/http.js';

export default async function handler(req, res) {
  try {
    const user = await currentUser(req);
    if (!user) return json(res, 401, { error: 'Giriş gerekli' });
    return json(res, 200, { user });
  } catch (err) {
    return json(res, 500, { error: 'Sunucu hatası' });
  }
}
