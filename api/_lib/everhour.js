// Everhour API: süre kayıtlarını çeker, müşteri (client) adına ve aya göre toplar. Anahtar yalnızca sunucuda.
// Belge: https://developers.everhour.com  (X-Api-Key başlığı; 100 istek / 10 sn)
const BASE = 'https://api.everhour.com';

async function call(path, key, fetchImpl = fetch) {
  for (let a = 0; a < 4; a += 1) {
    const res = await fetchImpl(`${BASE}${path}`, { headers: { 'X-Api-Key': key, Accept: 'application/json' } });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || 2 ** a;
      await new Promise((r) => setTimeout(r, Math.min(wait, 10) * 1000));
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new Error('Everhour anahtarı geçersiz ya da yetkisiz');
    if (!res.ok) throw new Error(`Everhour isteği başarısız (HTTP ${res.status})`);
    return res.json();
  }
  throw new Error('Everhour istek sınırına takıldı, biraz sonra tekrar deneyin');
}

const pad = (n) => String(n).padStart(2, '0');
const monthRange = (year, m) => {
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [`${year}-${pad(m)}-01`, `${year}-${pad(m)}-${pad(last)}`];
};

// Dönüş: { rows: [[müşteri, 'YYYY-MM', saat]], personel: [[kişi, 'YYYY-MM', müşteri, saat]], musteriler: [{ name, hours }] }
// Müşterisi olmayan projeler müşteri '' olur (dashboard'da "markaya atanmamış").
export async function fetchEverhour({ key, year, upToMonth, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  const clients = await call('/clients', key, fetchImpl);
  const projectClient = new Map();
  (Array.isArray(clients) ? clients : []).forEach((c) => (c.projects || []).forEach((pid) => projectClient.set(pid, c.name)));

  const byClient = new Map(); // `${client}|${ym}` -> saniye
  const byUser = new Map(); // `${user}|${ym}|${client}` -> saniye
  const lastMonth = Math.min(12, upToMonth || 12);
  for (let m = 1; m <= lastMonth; m += 1) {
    const [from, to] = monthRange(year, m);
    const recs = await call(`/team/time/export?from=${from}&to=${to}&fields=date,user,project&allowTimeWithoutTask=true`, key, fetchImpl);
    const ym = `${year}-${pad(m)}`;
    (Array.isArray(recs) ? recs : []).forEach((r) => {
      const sec = Number(r.time) || 0;
      if (!sec) return;
      const pid = r.project?.id;
      const client = (pid && projectClient.get(pid)) || '';
      const user = r.user?.name || 'Bilinmeyen';
      byClient.set(`${client}|${ym}`, (byClient.get(`${client}|${ym}`) || 0) + sec);
      byUser.set(`${user}|${ym}|${client}`, (byUser.get(`${user}|${ym}|${client}`) || 0) + sec);
    });
  }
  const h = (s) => Math.round((s / 3600) * 100) / 100;
  const rows = [...byClient].map(([k, s]) => { const [c, ym] = k.split('|'); return [c, ym, h(s)]; });
  const personel = [...byUser].map(([k, s]) => { const [u, ym, c] = k.split('|'); return [u, ym, c, h(s)]; });
  const tot = new Map();
  rows.forEach(([c, , hrs]) => tot.set(c, (tot.get(c) || 0) + hrs));
  const musteriler = [...tot].filter(([c]) => c).map(([name, hours]) => ({ name, hours: Math.round(hours) })).sort((a, b) => b.hours - a.hours);
  return { rows, personel, musteriler };
}

// Elle eşleştirme: Everhour müşteri adı -> dashboard marka adı (rapor satırlarına uygulanır)
export function applyMap(result, map = {}) {
  const f = (c) => (c && map[c]) || c;
  return {
    ...result,
    rows: result.rows.map(([c, ym, h]) => [f(c), ym, h]),
    personel: result.personel.map(([u, ym, c, h]) => [u, ym, f(c), h]),
  };
}

// Kısa süreli bellek önbelleği (sunucu örneği başına)
let cache = null;
export const clearEverhourCache = () => { cache = null; };
export async function getEverhour(opts, ttlMs = 5 * 60 * 1000) {
  if (cache && Date.now() - cache.at < ttlMs && cache.year === opts.year) return cache.data;
  const data = await fetchEverhour(opts);
  cache = { at: Date.now(), year: opts.year, data };
  return data;
}
