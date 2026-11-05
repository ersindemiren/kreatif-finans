// Everhour API: süre kayıtlarını çeker, müşteri (client) adına ve aya göre toplar. Anahtar yalnızca sunucuda.
// Belge: https://developers.everhour.com  (X-Api-Key başlığı; 100 istek / 10 sn)
const BASE = 'https://api.everhour.com';

export async function call(path, key, fetchImpl = fetch) {
  for (let a = 0; a < 4; a += 1) {
    const res = await fetchImpl(`${BASE}${path}`, { headers: { 'X-Api-Key': key, Accept: 'application/json' } });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || 2 ** a;
      await new Promise((r) => setTimeout(r, Math.min(wait, 10) * 1000));
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new Error('Everhour anahtarı geçersiz ya da yetkisiz');
    if (!res.ok) {
      let detay = '';
      try { const b = await res.json(); detay = b?.message ? `: ${b.message}` : ''; } catch { /* gövde yok */ }
      throw new Error(`Everhour isteği başarısız (HTTP ${res.status}${detay})`);
    }
    return res.json();
  }
  throw new Error('Everhour istek sınırına takıldı, biraz sonra tekrar deneyin');
}

const pad = (n) => String(n).padStart(2, '0');
export const monthRange = (year, m) => {
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return [`${year}-${pad(m)}-01`, `${year}-${pad(m)}-${pad(last)}`];
};

// Dönüş: { rows: [[müşteri, 'YYYY-MM', saat]], personel: [[kişi, 'YYYY-MM', müşteri, saat]], musteriler: [{ name, hours }] }
// Müşteri (client) bilgisi Everhour'un client filtresinden gelir: her müşteri için kayıtlar `client=<id>` ile ayrıca çekilir,
// böylece bir kaydın hangi müşteriye ait olduğunu projeye bakmadan Everhour söyler. Hiçbir müşteriye ait olmayan süre
// (filtresiz toplam − müşteri toplamları) müşteri '' olur (dashboard'da "markaya atanmamış").
export async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next; next += 1; out[i] = await fn(items[i], i); }
  }));
  return out;
}

// Everhour `fields` parametresi GRUPLAMA sütunudur: fields=date,user -> gün x kişi toplamı (her süre bir kez);
// fields=...,project -> çok projeli görevlerde aynı süre her proje için ayrı satır (süre katlanır);
// fields=...,task -> gizli (hidden) görev varsa tüm istek 400 verir ("Hidden task ID must not be exposed").
// Bu yüzden süreler fields=date,user ile alınır. Müşteri `client=<id>` filtresinden gelir.
const GIZLI = /Hidden task/i;

// Kayıt atama: toplam (müşterisiz) kayıtlar kişi+gün(+görev) anahtarıyla saniye olarak tutulur; her müşteri sorgusu bu toplamdan
// en fazla kalan kadar alır (bir süre iki müşteriye yazılmaz, toplam aşılmaz); kalan süre müşteri '' olur.
const keyOf = (r) => `${r.user?.id ?? r.user?.name ?? ''}|${r.date}|${r.task?.id || ''}`;
const valid = (r) => r && r.date && Number(r.time) > 0;
function atamaYap(totalRecs, clientRecs) {
  const kalan = new Map();
  const ornek = new Map();
  totalRecs.filter(valid).forEach((r) => { const k = keyOf(r); kalan.set(k, (kalan.get(k) || 0) + Number(r.time)); if (!ornek.has(k)) ornek.set(k, r); });
  const out = [];
  clientRecs.forEach(({ name, recs }) => (Array.isArray(recs) ? recs : []).filter(valid).forEach((r) => {
    const k = keyOf(r);
    const al = Math.min(Number(r.time), kalan.get(k) || 0);
    if (al > 0) { kalan.set(k, kalan.get(k) - al); out.push({ client: name, rec: { ...ornek.get(k), time: al } }); }
  }));
  kalan.forEach((sec, k) => { if (sec > 0) out.push({ client: '', rec: { ...ornek.get(k), time: sec } }); });
  return out;
}

export async function fetchEverhour({ key, year, upToMonth, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  const clients = (await call('/clients', key, fetchImpl)) || [];
  const list = Array.isArray(clients) ? clients : [];
  const lastMonth = Math.min(12, upToMonth || 12);
  const [from] = monthRange(year, 1);
  const [, to] = monthRange(year, lastMonth);
  const q = `from=${from}&to=${to}&fields=date,user&allowTimeWithoutTask=true`;

  const totalRecs = (await call(`/team/time/export?${q}`, key, fetchImpl)) || [];
  const perClient = await pool(list, 4, async (c) => ({ name: c.name, recs: await call(`/team/time/export?${q}&client=${encodeURIComponent(c.id)}`, key, fetchImpl) }));
  const atanan = atamaYap(Array.isArray(totalRecs) ? totalRecs : [], perClient);

  const byClient = new Map(); // `${client}|${ym}` -> saniye
  const byUser = new Map(); // `${user}|${ym}|${client}` -> saniye
  atanan.forEach(({ client, rec }) => {
    const ym = String(rec.date).slice(0, 7);
    const user = rec.user?.name || 'Bilinmeyen';
    const sec = Number(rec.time) || 0;
    byClient.set(`${client}|${ym}`, (byClient.get(`${client}|${ym}`) || 0) + sec);
    byUser.set(`${user}|${ym}|${client}`, (byUser.get(`${user}|${ym}|${client}`) || 0) + sec);
  });

  const h = (s) => Math.round((s / 3600) * 100) / 100;
  const rows = [...byClient].map(([k, s]) => { const [c, ym] = k.split('|'); return [c, ym, h(s)]; });
  const personel = [...byUser].map(([k, s]) => { const [u, ym, c] = k.split('|'); return [u, ym, c, h(s)]; });
  const tot = new Map();
  rows.forEach(([c, , hrs]) => tot.set(c, (tot.get(c) || 0) + hrs));
  const musteriler = [...tot].filter(([c]) => c).map(([name, hours]) => ({ name, hours: Math.round(hours) })).sort((a, b) => b.hours - a.hours);
  return { rows, personel, musteriler };
}

// Görev düzeyinde kayıtlar (gün x kişi x görev). Gizli görev içeren aralıkta gün gün dener; gizli günün süresi
// (görev adı olmadan) "(Gizli görev)" olarak, fields=date,user toplamından yazılır.
async function gorevKayitlari(q, extra, key, from, to, fetchImpl) {
  try {
    return (await call(`/team/time/export?from=${from}&to=${to}&fields=date,user,task&allowTimeWithoutTask=true${extra}`, key, fetchImpl)) || [];
  } catch (e) {
    if (!GIZLI.test(e.message)) throw e;
  }
  const gunSayisi = Number(to.slice(8, 10));
  const ay = from.slice(0, 8);
  const parts = await pool(Array.from({ length: gunSayisi }, (_, i) => `${ay}${String(i + 1).padStart(2, '0')}`), 4, async (d) => {
    try {
      return (await call(`/team/time/export?from=${d}&to=${d}&fields=date,user,task&allowTimeWithoutTask=true${extra}`, key, fetchImpl)) || [];
    } catch (e) {
      if (!GIZLI.test(e.message)) throw e;
      const g = (await call(`/team/time/export?from=${d}&to=${d}&fields=date,user&allowTimeWithoutTask=true${extra}`, key, fetchImpl)) || [];
      return g.map((r) => ({ ...r, task: { id: 'gizli', name: '(Gizli görev)' } }));
    }
  });
  return parts.flat();
}

// Bir kişinin bir aydaki görevleri (matris hücresine tıklayınca). Müşteri ataması aynı yöntemle (client filtresi) yapılır.
// Dönüş: [{ client, task, detay, hours }] (client '' = hiçbir müşteriye ait olmayan süre)
const gorevCache = new Map();
export async function fetchGorevler({ key, user, ym, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  if (!/^\d{4}-\d{2}$/.test(ym || '') || !user) throw new Error('Geçersiz istek');
  const ck = `${user}|${ym}`;
  const hit = gorevCache.get(ck);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.data;
  const [from, to] = monthRange(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));
  const clients = await call('/clients', key, fetchImpl);
  const list = Array.isArray(clients) ? clients : [];
  // kişi kimliği: gün x kişi toplamından
  const kisiler = (await call(`/team/time/export?from=${from}&to=${to}&fields=date,user&allowTimeWithoutTask=true`, key, fetchImpl)) || [];
  const uid = (Array.isArray(kisiler) ? kisiler : []).find((r) => r.user?.name === user)?.user?.id;
  if (uid == null) { gorevCache.set(ck, { at: Date.now(), data: [] }); return []; }
  const ue = `&user=${encodeURIComponent(uid)}`;
  const mine = (await gorevKayitlari('', ue, key, from, to, fetchImpl)).filter(valid);
  const per = await pool(list, 4, async (c) => ({ name: c.name, recs: (await gorevKayitlari('', `${ue}&client=${encodeURIComponent(c.id)}`, key, from, to, fetchImpl)).filter(valid) }));
  const atanan = atamaYap(mine, per);
  const agg = new Map();
  atanan.forEach(({ client, rec }) => {
    const k = `${client}|${rec.task?.id || ''}`;
    const detay = rec.task?.iteration && rec.task.iteration !== 'Untitled section' ? rec.task.iteration : '';
    const e = agg.get(k) || { client, task: rec.task?.name || '(görev yok)', detay, sec: 0 };
    e.sec += Number(rec.time) || 0;
    agg.set(k, e);
  });
  const data = [...agg.values()].map((e) => ({ client: e.client, task: e.task, detay: e.detay, hours: Math.round((e.sec / 3600) * 100) / 100 })).sort((a, b) => b.hours - a.hours);
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

// Geçici tanı: bir kişinin bir aydaki belirli görev kayıtlarının Everhour'dan gelen ham hali (filtresiz / müşteri filtreli / /team/time).
export async function teshis({ key, user, ym, task, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  const [from, to] = monthRange(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)));
  const pick = (recs) => (Array.isArray(recs) ? recs : []).filter((r) => (!user || r.user?.name === user) && (!task || JSON.stringify(r.task || {}).toLowerCase().includes(task.toLowerCase())));
  const safe = async (path) => { try { return { ok: true, data: await call(path, key, fetchImpl) }; } catch (e) { return { ok: false, hata: e.message }; } };
  const out = { aralik: [from, to], user, task };
  const clients = await call('/clients', key, fetchImpl);
  out.musteriSayisi = (clients || []).length;

  const a = await safe(`/team/time/export?from=${from}&to=${to}&allowTimeWithoutTask=true`);
  out.export_filtresiz_alansiz = a.ok ? { toplamKayit: a.data.length, eslesen: pick(a.data).slice(0, 30) } : a;
  const b = await safe(`/team/time/export?from=${from}&to=${to}&fields=date,user,task,project&allowTimeWithoutTask=true`);
  out.export_filtresiz_alanli = b.ok ? { toplamKayit: b.data.length, eslesen: pick(b.data).slice(0, 30) } : b;

  const per = await pool(clients || [], 4, async (c) => {
    const r = await safe(`/team/time/export?from=${from}&to=${to}&allowTimeWithoutTask=true&client=${encodeURIComponent(c.id)}`);
    return { client: c.name, id: c.id, ok: r.ok, hata: r.hata, toplamKayit: r.ok ? r.data.length : undefined, eslesen: r.ok ? pick(r.data).slice(0, 10) : [] };
  });
  out.musteri_filtreli = per.filter((x) => !x.ok || x.eslesen.length);

  const t1 = await safe(`/team/time?from=${from}&to=${to}&limit=50&page=1`);
  out.team_time_sayfa1 = t1.ok ? { kayit: t1.data.length, ornek: t1.data.slice(0, 2), eslesen: pick(t1.data).slice(0, 10) } : t1;
  const t2 = await safe(`/team/time?from=${from}&to=${to}&limit=50&page=2`);
  out.team_time_sayfa2 = t2.ok ? { kayit: t2.data.length, ornek: t2.data.slice(0, 1) } : t2;
  return out;
}

// Geçici tanı 2: "Hidden task ID must not be exposed" hatasını izole eder (hangi sorgu biçimi / hangi gün).
export async function teshis2({ key, ym, fetchImpl = fetch }) {
  if (!key) throw new Error('EVERHOUR_API_KEY tanımlı değil');
  const y = Number(ym.slice(0, 4)); const m = Number(ym.slice(5, 7));
  const [from, to] = monthRange(y, m);
  const safe = async (path) => { try { const d = await call(path, key, fetchImpl); return { ok: true, kayit: Array.isArray(d) ? d.length : -1, saniye: Array.isArray(d) ? d.reduce((t, r) => t + (Number(r.time) || 0), 0) : 0, anahtarlar: Array.isArray(d) && d[0] ? Object.keys(d[0]) : [] }; } catch (e) { return { ok: false, hata: e.message }; } };
  const out = { aralik: [from, to] };
  const v = { A_alansiz: '', B_date_user: '&fields=date,user', C_date_user_project: '&fields=date,user,project', D_date_user_task: '&fields=date,user,task' };
  for (const [ad, ek] of Object.entries(v)) out[ad] = await safe(`/team/time/export?from=${from}&to=${to}&allowTimeWithoutTask=true${ek}`);
  out.E_allowTimeWithoutTask_yok = await safe(`/team/time/export?from=${from}&to=${to}`);
  out.F_team_time_p1 = await safe(`/team/time?from=${from}&to=${to}&limit=50&page=1`);
  // Günlük tarama (alansız sorgu): hangi günler hata veriyor
  const gunSayisi = Number(to.slice(8, 10));
  const gunler = await pool(Array.from({ length: gunSayisi }, (_, i) => i + 1), 4, async (g) => {
    const d = `${ym}-${String(g).padStart(2, '0')}`;
    const r = await safe(`/team/time/export?from=${d}&to=${d}&allowTimeWithoutTask=true`);
    return [d, r.ok ? `ok:${r.kayit}` : r.hata];
  });
  out.gunluk_alansiz = Object.fromEntries(gunler);
  return out;
}
