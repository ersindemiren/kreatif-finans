// Everhour müşteri adı -> dashboard marka adı eşleştirmeleri (Blob, private).
import { get, put } from '@vercel/blob';

const PATH = 'kf-auth/everhour-map.json';
let store = {
  async read() {
    const r = await get(PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(map) {
    await put(PATH, JSON.stringify(map), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setMapStore = (s) => { store = s; };

export async function readMap() {
  try { const m = await store.read(); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

export async function setMapping(name, brand) {
  const n = String(name || '').trim().slice(0, 120);
  if (!n) throw new Error('Everhour adı gerekli');
  const map = await readMap();
  const b = String(brand || '').trim().slice(0, 120);
  if (b) map[n] = b; else delete map[n];
  await store.write(map);
  return map;
}

// Everhour kişi adı -> departman eşleştirmeleri (ayrı Blob dosyası).
const DEP_PATH = 'kf-auth/everhour-departman.json';
let depStore = {
  async read() {
    const r = await get(DEP_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(map) {
    await put(DEP_PATH, JSON.stringify(map), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setDepartmanStore = (s) => { depStore = s; };

export async function readDepartman() {
  try { const m = await depStore.read(); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

export async function setDepartman(kisi, departman) {
  const k = String(kisi || '').trim().slice(0, 120);
  if (!k) throw new Error('Kişi adı gerekli');
  const map = await readDepartman();
  const d = String(departman || '').trim().slice(0, 80);
  if (d) map[k] = d; else delete map[k];
  await depStore.write(map);
  return map;
}

// Everhour kişi adı -> pasif (işten ayrıldı) işareti.
const PASIF_PATH = 'kf-auth/everhour-pasif.json';
let pasifStore = {
  async read() {
    const r = await get(PASIF_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(map) {
    await put(PASIF_PATH, JSON.stringify(map), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setPasifStore = (s) => { pasifStore = s; };

export async function readPasif() {
  try { const m = await pasifStore.read(); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; }
}

export async function setPasif(kisi, pasif) {
  const k = String(kisi || '').trim().slice(0, 120);
  if (!k) throw new Error('Kişi adı gerekli');
  const map = await readPasif();
  if (pasif) map[k] = true; else delete map[k];
  await pasifStore.write(map);
  return map;
}

// Personel maliyeti: { kisi: { AD: aylık toplam maliyet }, dagitim: genel işletme dağıtım gideri }. Yalnızca admin okur/yazar.
const MAL_PATH = 'kf-auth/personel-maliyet.json';
let malStore = {
  async read() {
    const r = await get(MAL_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return {};
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(v) {
    await put(MAL_PATH, JSON.stringify(v), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setMaliyetStore = (s) => { malStore = s; };

const YM = /^\d{4}-(0[1-9]|1[0-2])$/;
const ayKontrol = (ay) => { if (!YM.test(String(ay || ''))) throw new Error('Geçersiz ay'); return ay; };

export async function readMaliyet() {
  try {
    const m = await malStore.read();
    const aylar = {};
    Object.entries(m && typeof m.aylar === 'object' && m.aylar ? m.aylar : {}).forEach(([ym, v]) => {
      if (YM.test(ym)) aylar[ym] = { kisi: v && typeof v.kisi === 'object' && !Array.isArray(v.kisi) ? v.kisi : {}, dagitim: Number(v?.dagitim) > 0 ? Number(v.dagitim) : 0 };
    });
    return m?.tohum ? { aylar, tohum: m.tohum, tohumSurum: m.tohumSurum } : { aylar };
  } catch { return { aylar: {} }; }
}

const tutar = (v) => { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 1e10) throw new Error('Geçersiz tutar'); return Math.round(n * 100) / 100; };
const ayAl = (m, ay) => (m.aylar[ay] ||= { kisi: {}, dagitim: 0 });

export async function setMaliyetKisi(ay, kisi, deger) {
  ayKontrol(ay);
  const k = String(kisi || '').trim().slice(0, 120);
  if (!k) throw new Error('Kişi adı gerekli');
  const m = await readMaliyet();
  const n = tutar(deger);
  const a = ayAl(m, ay);
  if (n > 0) a.kisi[k] = n; else delete a.kisi[k];
  await malStore.write(m);
  return m;
}

export async function setDagitim(ay, deger) {
  ayKontrol(ay);
  const m = await readMaliyet();
  ayAl(m, ay).dagitim = tutar(deger);
  await malStore.write(m);
  return m;
}

// Önceki aydaki girişleri bu aya kopyalar; bu ayda zaten girilmiş olanlara dokunmaz.
export async function kopyalaAy(kaynak, hedef) {
  ayKontrol(kaynak); ayKontrol(hedef);
  const m = await readMaliyet();
  const src = m.aylar[kaynak];
  if (!src) throw new Error('Kaynak ayda kayıt yok');
  const h = ayAl(m, hedef);
  Object.entries(src.kisi).forEach(([k, v]) => { if (!(h.kisi[k] > 0)) h.kisi[k] = v; });
  if (!(h.dagitim > 0)) h.dagitim = src.dagitim;
  await malStore.write(m);
  return m;
}

// Ad eşleştirme anahtarı: büyük harf (tr), aksanlar sadeleştirilir, boşluklar tekilleştirilir
const adAnahtar = (x) => String(x || '').toLocaleUpperCase('tr-TR').replace(/[ÇĞİIŞÖÜÂÎÛ]/g, (c) => ({ Ç: 'C', Ğ: 'G', İ: 'I', I: 'I', Ş: 'S', Ö: 'O', Ü: 'U', Â: 'A', Î: 'I', Û: 'U' }[c])).replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).join(' ');

// Bir seferlik tohumlama: MALIYET_ICE_AKTAR (JSON, sunucu ortam değişkeni) bir kez yazılır; veri depoda tutulmaz.
// MALIYET_ICE_ADLAR: eski ad -> doğru ad, MALIYET_ICE_HARIC: dağıtım dışı kişiler. Yazılan aylar sheet'teki haliyle değiştirilir.
export async function maliyetTohumla() {
  if (!process.env.MALIYET_ICE_AKTAR) return;
  let veri; let adlar = {}; let haric = [];
  try { veri = JSON.parse(process.env.MALIYET_ICE_AKTAR); adlar = JSON.parse(process.env.MALIYET_ICE_ADLAR || '{}'); haric = JSON.parse(process.env.MALIYET_ICE_HARIC || '[]'); } catch { return; }
  if (!veri || typeof veri.aylar !== 'object') return;
  const m = await readMaliyet();
  const surum = process.env.MALIYET_ICE_SURUM || '1';
  if (m.tohum && m.tohumSurum === surum) return;
  const oz = await readKisiOzet();
  const ev = new Map((oz?.kisiler || []).map((k) => [adAnahtar(k.name), k.name])); // Everhour'daki yazılışı kullan
  Object.entries(veri.aylar).forEach(([ay, v]) => {
    ayKontrol(ay);
    const a = ayAl(m, ay);
    a.dagitim = tutar(v.dagitim);
    a.kisi = {};
    Object.entries(v.kisi || {}).forEach(([ad, t]) => {
      if (haric.includes(ad)) return;
      const n = tutar(t);
      if (n > 0) { const d = adlar[ad] || ad; a.kisi[ev.get(adAnahtar(d)) || d.toLocaleUpperCase('tr-TR')] = n; }
    });
  });
  m.tohum = new Date().toISOString();
  m.tohumSurum = surum;
  await malStore.write(m);
  // Silinecek (artık olmayan) adların departman / pasif kayıtları da temizlenir
  let sil = []; try { sil = JSON.parse(process.env.MALIYET_ICE_SIL || '[]'); } catch { /* yok say */ }
  const dep = await readDepartman(); const pas = await readPasif();
  for (const ad of sil) {
    for (const k of Object.keys(dep)) if (adAnahtar(k) === adAnahtar(ad)) await setDepartman(k, '');
    for (const k of Object.keys(pas)) if (adAnahtar(k) === adAnahtar(ad)) await setPasif(k, false);
  }
}

// Maliyet verisinde olup Everhour listesinde olmayan kişiler (süre girmemiş / henüz eşleşmemiş)
export function maliyetKisileri(m) {
  return [...new Set(Object.values(m?.aylar || {}).flatMap((a) => Object.keys(a.kisi || {})))];
}

// Resmi tatiller (Yönetim'den düzenlenir): [{ tarih: 'YYYY-AA-GG', ad, yarim? }]. Kayıt yoksa 2026 varsayılan listesi.
export const VARSAYILAN_TATILLER = [
  ['2026-01-01', 'Yılbaşı'], ['2026-03-19', 'Ramazan Bayramı Arifesi', 1], ['2026-03-20', 'Ramazan Bayramı 1. Gün'], ['2026-03-21', 'Ramazan Bayramı 2. Gün'], ['2026-03-22', 'Ramazan Bayramı 3. Gün'],
  ['2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'], ['2026-05-01', 'Emek ve Dayanışma Günü'], ['2026-05-19', "Atatürk'ü Anma, Gençlik ve Spor Bayramı"],
  ['2026-05-26', 'Kurban Bayramı Arifesi', 1], ['2026-05-27', 'Kurban Bayramı 1. Gün'], ['2026-05-28', 'Kurban Bayramı 2. Gün'], ['2026-05-29', 'Kurban Bayramı 3. Gün'], ['2026-05-30', 'Kurban Bayramı 4. Gün'],
  ['2026-07-15', 'Demokrasi ve Milli Birlik Günü'], ['2026-08-30', 'Zafer Bayramı'], ['2026-10-28', 'Cumhuriyet Bayramı Arifesi', 1], ['2026-10-29', 'Cumhuriyet Bayramı'],
].map(([tarih, ad, y]) => ({ tarih, ad, ...(y ? { yarim: true } : {}) }));

const TATIL_PATH = 'kf-auth/resmi-tatiller.json';
let tatilStore = {
  async read() {
    const r = await get(TATIL_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(v) {
    await put(TATIL_PATH, JSON.stringify(v), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setTatilStore = (s) => { tatilStore = s; };

export async function readTatil() {
  try {
    const l = await tatilStore.read();
    return Array.isArray(l) ? l : VARSAYILAN_TATILLER;
  } catch { return VARSAYILAN_TATILLER; }
}

export async function setTatiller(liste) {
  if (!Array.isArray(liste) || liste.length > 200) throw new Error('Geçersiz liste');
  const seen = new Set();
  const temiz = liste.map((t) => {
    const tarih = String(t?.tarih || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || Number.isNaN(Date.parse(`${tarih}T00:00:00Z`))) throw new Error(`Geçersiz tarih: ${tarih || '(boş)'}`);
    if (seen.has(tarih)) throw new Error(`Aynı tarih iki kez girilmiş: ${tarih}`);
    seen.add(tarih);
    return { tarih, ad: String(t.ad || '').trim().slice(0, 80) || 'Resmi tatil', ...(t.yarim ? { yarim: true } : {}) };
  }).sort((a, b) => a.tarih.localeCompare(b.tarih));
  await tatilStore.write(temiz);
  return temiz;
}

// Kişi listesi özeti (kişi adı, toplam saat, aylık saat): panel Everhour verisini çektikçe güncellenir; Yönetim'deki maliyet bölümü
// Everhour'a gitmeden buradan okur.
const KISI_PATH = 'kf-auth/everhour-kisiler.json';
let kisiStore = {
  async read() {
    const r = await get(KISI_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(v) {
    await put(KISI_PATH, JSON.stringify(v), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setKisiStore = (s) => { kisiStore = s; };

// personel: Everhour satırları [kişi, 'YYYY-AA', müşteri, saat]
export function kisiOzet(personel) {
  const saat = new Map();
  const aylikSaat = {};
  (personel || []).forEach(([u, ym, , h]) => {
    saat.set(u, (saat.get(u) || 0) + h);
    const a = (aylikSaat[u] ||= {});
    a[ym] = Math.round(((a[ym] || 0) + h) * 100) / 100;
  });
  const kisiler = [...saat].map(([name, hours]) => ({ name, hours: Math.round(hours) })).sort((a, b) => b.hours - a.hours);
  return { kisiler, aylikSaat };
}

let sonYazim = 0;
export async function kaydetKisiOzet(personel, simdi = Date.now()) {
  if (simdi - sonYazim < 60 * 1000) return; // en fazla dakikada bir yaz
  sonYazim = simdi;
  try { await kisiStore.write({ ...kisiOzet(personel), at: new Date(simdi).toISOString() }); } catch { /* yedek veri: yazılamazsa sessiz geç */ }
}

export async function readKisiOzet() {
  try { const v = await kisiStore.read(); return v && Array.isArray(v.kisiler) ? v : null; } catch { return null; }
}

// Kırmızı baraj değerleri: Yönetim > Ayarlar. kapasite / kayit oran (0-1), skor 0-100. Herkes okur, yalnızca admin değiştirir.
const AYAR_PATH = 'kf-auth/ayarlar.json';
// bazFiyat: Süre Analizi saatlik baz fiyatı (₺/saat), Ocak–Aralık için 12 değer (Yönetim > Baz Fiyat Güncelleme)
export const VARSAYILAN_BAZ_FIYAT = [5000, 5000, 5000, 5000, 5000, 5000, 6000, 6000, 6000, 6000, 6000, 6000];
export const VARSAYILAN_AYARLAR = { kapasite: 0.85, kayit: 0.85, skor: 80, bazFiyat: VARSAYILAN_BAZ_FIYAT };
const bazGecerli = (a) => Array.isArray(a) && a.length === 12 && a.every((v) => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 1000000);
let ayarStore = {
  async read() {
    const r = await get(AYAR_PATH, { access: 'private', useCache: false });
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text());
  },
  async write(v) {
    await put(AYAR_PATH, JSON.stringify(v), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
  },
};
export const setAyarStore = (s) => { ayarStore = s; };
export async function readAyarlar() {
  try {
    const a = await ayarStore.read();
    const out = { ...VARSAYILAN_AYARLAR, bazFiyat: [...VARSAYILAN_BAZ_FIYAT] };
    if (bazGecerli(a?.bazFiyat)) out.bazFiyat = a.bazFiyat.map(Number);
    ['kapasite', 'kayit'].forEach((k) => { const v = Number(a?.[k]); if (Number.isFinite(v) && v >= 0 && v <= 1) out[k] = v; });
    const s = Number(a?.skor);
    if (Number.isFinite(s) && s >= 0 && s <= 100) out.skor = s;
    return out;
  } catch { return { ...VARSAYILAN_AYARLAR }; }
}
export async function setAyarlar(girdi) {
  const mevcut = await readAyarlar();
  const oran = (v, ad) => { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${ad}: 0 ile 100 arasında bir yüzde girin`); return Math.round(n * 10) / 1000; };
  const yeni = { ...mevcut };
  if (girdi?.kapasite !== undefined) yeni.kapasite = oran(girdi.kapasite, 'Kapasite Oranı');
  if (girdi?.kayit !== undefined) yeni.kayit = oran(girdi.kayit, 'Kayıt Oranı');
  if (girdi?.skor !== undefined) { const n = Number(girdi.skor); if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('Verimlilik Skoru: 0 ile 100 arasında bir değer girin'); yeni.skor = Math.round(n * 10) / 10; }
  if (girdi?.bazFiyat !== undefined) {
    if (!bazGecerli(girdi.bazFiyat)) throw new Error('Baz Fiyat: 12 ay için 0’dan büyük (en fazla 1.000.000) birer tutar girin');
    yeni.bazFiyat = girdi.bazFiyat.map((v) => Math.round(Number(v) * 100) / 100);
  }
  await ayarStore.write(yeni);
  return yeni;
}
