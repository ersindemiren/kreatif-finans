import { json, sameOriginJson, readBody } from './_lib/http.js';
import { verifyGoogleToken } from './_lib/google.js';
import { findUser } from './_lib/users.js';
import { createSessionCookie } from './_lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  if (!sameOriginJson(req)) return json(res, 403, { error: 'İstek reddedildi' });
  try {
    const { credential } = await readBody(req);
    if (!credential) return json(res, 400, { error: 'Eksik kimlik bilgisi' });
    const g = await verifyGoogleToken(credential);
    const user = await findUser(g.email);
    if (!user) return json(res, 403, { error: 'Bu Google hesabı için erişim tanımlı değil' });
    const cookie = await createSessionCookie(user.email);
    return json(res, 200, { user }, { 'Set-Cookie': cookie });
  } catch (err) {
    return json(res, 401, { error: 'Giriş doğrulanamadı' });
  }
}
