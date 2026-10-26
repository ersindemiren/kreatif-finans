// Kullanıcı yönetimi: yalnızca admin. GET liste, PUT ekle/güncelle, DELETE çıkar.
import { json, sameOriginJson, readBody, currentUser } from './_lib/http.js';
import { listUsers, upsertUser, removeUser, normEmail } from './_lib/users.js';

export default async function handler(req, res) {
  try {
    const me = await currentUser(req);
    if (!me) return json(res, 401, { error: 'Giriş gerekli' });
    if (me.role !== 'admin') return json(res, 403, { error: 'Bu işlem için admin yetkisi gerekir' });
    if (req.method === 'GET') return json(res, 200, { users: await listUsers() });
    if (!sameOriginJson(req)) return json(res, 403, { error: 'İstek reddedildi' });
    if (req.method === 'PUT') {
      const body = await readBody(req);
      // Kendi admin yetkisini kaldırmaya izin verme (kilitlenmeyi önler)
      if (normEmail(body.email) === me.email && body.role !== 'admin') return json(res, 400, { error: 'Kendi admin yetkinizi kaldıramazsınız' });
      return json(res, 200, { users: await upsertUser(body) });
    }
    if (req.method === 'DELETE') {
      const { email } = await readBody(req);
      if (normEmail(email) === me.email) return json(res, 400, { error: 'Kendinizi çıkaramazsınız' });
      return json(res, 200, { users: await removeUser(email) });
    }
    return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  } catch (err) {
    return json(res, 400, { error: err.message || 'İşlem yapılamadı' });
  }
}
