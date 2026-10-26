// Oturum: imzalı, HttpOnly çerez (12 saat). Çerezde yalnızca e-posta var; yetkiler her istekte listeden okunur.
import { SignJWT, jwtVerify } from 'jose';
import { COOKIE_NAME, SESSION_HOURS } from './config.js';

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET tanımlı değil (en az 32 karakter)');
  return new TextEncoder().encode(s);
};

export async function createSessionCookie(email) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(email).setIssuedAt().setExpirationTime(`${SESSION_HOURS}h`).sign(key());
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}
export const clearCookie = () => `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function emailFromRequest(req) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`).exec(req.headers.cookie || '');
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], key(), { algorithms: ['HS256'] });
    return payload.sub || null;
  } catch { return null; }
}
