import { emailFromRequest } from './session.js';
import { findUser } from './users.js';

export const json = (res, status, body, headers = {}) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
};

// Durum değiştiren isteklerde: aynı kaynaktan (Origin) ve JSON olmalı.
export function sameOriginJson(req) {
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!origin || !host) return false;
  try { if (new URL(origin).host !== host) return false; } catch { return false; }
  return String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json');
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

// Oturumu çözer ve kullanıcıyı listeden okur: listeden çıkarılan kişi çerezi geçerli olsa bile anında düşer.
export async function currentUser(req) {
  const email = await emailFromRequest(req);
  if (!email) return null;
  return findUser(email);
}
