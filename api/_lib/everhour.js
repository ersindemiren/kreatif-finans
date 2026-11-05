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
// Müşteri (client) bilgisi Everhour'un client filtresinden gelir: her müşteri için kayıtlar `client=<id>` ile ayrıca çekilir,
// böylece bir kaydın hangi müşteriye ait olduğunu projeye bakmadan Everhour söyler. Hiçbir müşteriye ait olmayan süre
// (filtresiz toplam − müşteri toplamları) müşteri '' olur (dashboard'da "markaya atanmamış").
async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; out[i] = await fn(items[i], i); }
  }));
  return out;
}

export async function fetchEverhour({ key, year, upToMonth, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  const clients = (await call('/clients', key, fetchImpl)) || [];
  const lastMonth = Math.min(12, upToMonth || 12);
  const [from] = monthRange(year, 1);
  const [, to] = monthRange(year, lastMonth);
  const q = `from=${from}&to=${to}&fields=date,user,project&allowTimeWithoutTask=true`;

  const addTo = (map, recs) => (Array.isArray(recs) ? recs : []).forEach((r) => {
    const sec = Number(r.time) || 0;
    if (!sec || !r.date) return;
    const k = `${r.user?.name || 'Bilinmeyen'}|${String(r.date).slice(0, 7)}`;
    map.set(k, (map.get(k) || 0) + sec);
  });

  const total = new Map(); // `${user}|${ym}` -> saniye (filtresiz)
  addTo(total, await call(`/team/time/export?${q}`, key, fetchImpl));

  const list = Array.isArray(clients) ? clients : [];
  const perClient = await pool(list, 4, async (c) => {
    const m = new Map();
    addTo(m, await call(`/team/time/export?${q}&client=${encodeURIComponent(c.id)}`, key, fetchImpl));
    return m;
  });

  const byClient = new Map(); // `${client}|${ym}` -> saniye
  const byUser = new Map(); // `${user}|${ym}|${client}` -> saniye
  const add = (client, userYm, sec) => {
    const [user, ym] = userYm.split('|');
    byClient.set(`${client}|${ym}`, (byClient.get(`${client}|${ym}`) || 0) + sec);
    byUser.set(`${user}|${ym}|${client}`, (byUser.get(`${user}|${ym}|${client}`) || 0) + sec);
  };
  const assigned = new Map();
  list.forEach((c, i) => perClient[i].forEach((sec, k) => { add(c.name, k, sec); assigned.set(k, (assigned.get(k) || 0) + sec); }));
  // Güvenlik: müşteri filtresi uygulanmamışsa (her müşteri tüm kayıtları döndürürse) toplam aşılır; yanlış sayı göstermek yerine hata ver.
  assigned.forEach((sec, k) => { if (sec > (total.get(k) || 0) + 60) throw new Error('Everhour client filtresi beklenen sonucu vermedi (müşteri toplamları genel toplamı aşıyor)'); });
  total.forEach((sec, k) => { const rest = sec - (assigned.get(k) || 0); if (rest > 1) add('', k, rest); });

  const h = (s) => Math.round((s / 3600) * 100) / 100;
  const rows = [...byClient].map(([k, s]) => { const [c, ym] = k.split('|'); return [c, ym, h(s)]; });
  const personel = [...byUser].map(([k, s]) => { const [u, ym, c] = k.split('|'); return [u, ym, c, h(s)]; });
  const tot = new Map();
  rows.forEach(([c, , hrs]) => tot.set(c, (tot.get(c) || 0) + hrs));
  const musteriler = [...tot].filter(([c]) => c).map(([name, hours]) => ({ name, hours: Math.round(hours) })).sort((a, b) => b.hours - a.hours);
  return { rows, personel, musteriler };
}

// Bir kişinin bir aydaki görevleri (satır tıklayınca açılan ayrıntı). Müşteri ataması da client filtresinden gelir.
// Dönüş: [{ client, task, project, hours }] (client '' = hiçbir müşteriye ait olmayan süre)
const gorevCache = new Map();
export async function fetchGorevler({ key, user, ym, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  if (!/^\d{4}-\d{2}$/.test(ym || '') || !user) throw new Error('Geçersiz istek');
  const ck = `${user}|${ym}`;
  const hit = gorevCache.get(ck);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.data;
  const [from, to] = monthRange(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));
  const q = `from=${from}&to=${to}&fields=date,user,task,project&allowTimeWithoutTask=true`;
  const collect = (recs) => {
    const m = new Map();
    (Array.isArray(recs) ? recs : []).forEach((r) => {
      const sec = Number(r.time) || 0;
      if (!sec || r.user?.name !== user) return;
      const k = `${r.task?.id || ''}|${r.project?.id || ''}`;
      const e = m.get(k) || { task: r.task?.name || '(görev yok)', project: r.project?.name || '', sec: 0 };
      e.sec += sec;
      m.set(k, e);
    });
    return m;
  };
  const clients = await call('/clients', key, fetchImpl);
  const list = Array.isArray(clients) ? clients : [];
  const total = collect(await call(`/team/time/export?${q}`, key, fetchImpl));
  const per = await pool(list, 4, async (c) => collect(await call(`/team/time/export?${q}&client=${encodeURIComponent(c.id)}`, key, fetchImpl)));
  const used = new Map();
  const out = [];
  list.forEach((c, i) => per[i].forEach((e, k) => {
    out.push({ client: c.name, task: e.task, project: e.project, sec: e.sec });
    used.set(k, (used.get(k) || 0) + e.sec);
  }));
  used.forEach((sec, k) => { if (sec > (total.get(k)?.sec || 0) + 60) throw new Error('Everhour client filtresi beklenen sonucu vermedi'); });
  total.forEach((e, k) => { const rest = e.sec - (used.get(k) || 0); if (rest > 1) out.push({ client: '', task: e.task, project: e.project, sec: rest }); });
  const data = out.map((e) => ({ client: e.client, task: e.task, project: e.project, hours: Math.round((e.sec / 3600) * 100) / 100 })).sort((a, b) => b.hours - a.hours);
  gorevCache.set(ck, { at: Date.now(), data });
  return data;
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
