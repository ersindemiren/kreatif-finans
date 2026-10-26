// Kullanıcı listesi: Vercel Blob (private) içinde tek bir JSON dosyası.
import { get, put } from '@vercel/blob';
import { DEFAULT_USERS, PAGES } from './config.js';

const PATH = 'kf-auth/users.json';

export const normEmail = (e) => String(e || '').trim().toLowerCase();

// Depolama: varsayılan Blob; testlerde setStore ile değiştirilir.
let store = {
  async read() {
    const r = await get(PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(users) {
    await put(PATH, JSON.stringify(users), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setStore = (s) => { store = s; };

export function sanitizeUser(u) {
  const email = normEmail(u.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Geçersiz e-posta');
  const role = u.role === 'admin' ? 'admin' : 'member';
  const pages = role === 'admin' ? PAGES : PAGES.filter((p) => (u.pages || []).includes(p));
  return { email, name: String(u.name || '').trim().slice(0, 80), title: String(u.title || '').trim().slice(0, 80), role, pages };
}

export async function listUsers() {
  let users = null;
  try { users = await store.read(); } catch (err) { throw new Error('Kullanıcı listesi okunamadı'); }
  if (!Array.isArray(users) || !users.length) {
    users = DEFAULT_USERS.map(sanitizeUser);
    await store.write(users);
  }
  return users;
}

export async function findUser(email) {
  const e = normEmail(email);
  return (await listUsers()).find((u) => u.email === e) || null;
}

// En az bir admin her zaman kalmalı.
export async function upsertUser(input) {
  const user = sanitizeUser(input);
  const users = await listUsers();
  const i = users.findIndex((u) => u.email === user.email);
  const next = i >= 0 ? users.map((u, k) => (k === i ? user : u)) : [...users, user];
  if (!next.some((u) => u.role === 'admin')) throw new Error('En az bir admin kalmalı');
  await store.write(next);
  return next;
}

export async function removeUser(email) {
  const e = normEmail(email);
  const users = await listUsers();
  const next = users.filter((u) => u.email !== e);
  if (next.length === users.length) throw new Error('Kullanıcı bulunamadı');
  if (!next.some((u) => u.role === 'admin')) throw new Error('En az bir admin kalmalı');
  await store.write(next);
  return next;
}
