import { json, sameOriginJson } from './_lib/http.js';
import { clearCookie } from './_lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Yöntem desteklenmiyor' });
  if (!sameOriginJson(req)) return json(res, 403, { error: 'İstek reddedildi' });
  return json(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
}
