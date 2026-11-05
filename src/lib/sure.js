// ============================================================================
// Süre Analizi: Everhour zaman kayıtları + SATIŞ TABLOSU 2026 (Fee / Proje faturaları)
// Süre kaynağı: Everhour (sunucu /api/data). Everhour alınamazsa yedek olarak api/_data/sureler.js (son dışa aktarım) kullanılır.
// ============================================================================
import { normalizeNameKey } from './parseData.js';

// Saatlik baz (₺/saat) — ay ay. Ocak-Haziran 5.000, Temmuz sonrası 6.000. Değişirse yalnızca burası güncellenir.
export const FEE_BAZI = [5000, 5000, 5000, 5000, 5000, 5000, 6000, 6000, 6000, 6000, 6000, 6000];

// Zaman raporundaki isim -> dashboard marka adı. Birden çok isim aynı markaya birleşebilir (Kozoliv + Selme, Persan + Piculet).
const MAP = {
  'Servet': 'SERVET',
  'ALTIN.com': 'ALTINCOM',
  'Zuhal Müzik': 'ZUHAL MÜZİK',
  'Kozoliv': 'KOZOLİV',
  'Selme': 'KOZOLİV',
  'Eğriçayır': 'EĞRİÇAYIR',
  'Akdu Peynir': 'AKDU',
  'Silva': 'SİLVA',
  'Yenigün': 'YENİGÜN',
  'Portakal Bahçem': 'PORTAKALBAHCEM',
  'Nehir': 'NEHİR',
  'Saygın Tuz': 'SAYGIN TUZ',
  'BMS Design Center': 'B.M.S',
  'Potamya': 'POTAMYA',
  'Hasanbey Çiftliği': 'HASANBEY',
  'Mehmet Zengin (Tun Gıda)': 'TUN GIDA',
  'Myra - Çikolata Evim': 'MYRA ÇİKOLATA',
  'Fiskobirlik': 'FİSKOBİRLİK',
  'Kassandra Boutique Hotel': 'KASSANDRA',
  'Rumeli Börekçisi': 'RUMELİ BÖREK',
  'Ecocotton': 'ECOCOTTON',
  'Kuşkonmaz Vadisi': 'KUŞKONMAZ',
  'Hayfene': 'HAYFENE',
  'Lazika': 'LAZİKA',
  'Büyük Arçelik Mağazası': 'ARÇELİK',
  'Artı İstanbul Cerrahi': 'ARTI CERRAHİ',
  'Eczi': 'ECZİ',
  'Persan': 'PERSAN - PICULET',
  'Piculet': 'PERSAN - PICULET',
  'Wild Fruits': 'WILDFRUITS',
  'Duran Gayrimenkul Yatırım': 'DURAN GRUP',
  'Cem Alhan': 'CEM ALHAN',
  'ZMR Aydınlatma': 'ZMR AYDINLATMA',
};
const MAP_BY_KEY = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [normalizeNameKey(k), v]));

// Everhour müşteri adı otomatik olarak hangi dashboard markasına denk geliyor? (Yönetim eşleştirme ekranı için)
export function autoBrand(name) {
  const k = normalizeNameKey(name);
  if (k === IC_KEY) return IC_ADI;
  return MAP_BY_KEY[k] || null;
}

// Gelir / satış tarafında birleştirilen markalar (anahtar -> hedef marka). Heritage, Kassandra ile tek marka sayılır.
const REVENUE_ALIAS = { [normalizeNameKey('HERITAGE')]: 'KASSANDRA' };
const canonName = (name) => REVENUE_ALIAS[normalizeNameKey(name)] || name;

// Marka olmayan süreler: ajansın kendi işi ve markaya atanmamış kayıtlar
const IC_KEY = normalizeNameKey('Kreatif Yeni Nesil İletişim Ajansı');
export const IC_ADI = 'KREATİF (İÇ SÜRE)';
export const ATANMAMIS_ADI = 'MARKAYA ATANMAMIŞ';

// Dönüş: { brands, disi }
//  brand = { name, tip: 'marka', eslesti, hours[12], fee[12], faturali[12] }
//  hours[i] ay süresi (saat), fee[i] / proje[i] o ay Satış Tablosu'ndaki Fee ve Proje faturaları (KDV hariç),
//  faturali[i] = o ay Satış Tablosu'nda bu markaya fatura satırı var mı.
//  Satış Tablosu'nda olup zaman raporunda olmayan markalar da süresi 0 olarak eklenir (zaman girilmemiş demektir).
// Henüz tamamlanmamış / verisi gelmemiş aylar için süre ve fatura değerleri sıfır alınır. Ekim verisi Everhour'dan geldiği için artık boş.
const SIFIRLANAN_AYLAR = [];

// Everhour / rapor müşteri adı -> dashboard marka adı (otomatik eşleşme + birleştirme kuralları)
export function kanonikMusteri(client) {
  if (!client) return ATANMAMIS_ADI;
  if (normalizeNameKey(client) === IC_KEY) return IC_ADI;
  const mapped = MAP_BY_KEY[normalizeNameKey(client)];
  return mapped ? canonName(mapped) : canonName(String(client).toUpperCase());
}

// Bir markada çalışan kişiler: [{ name, hours[12] }]  rows: [kişi, 'YYYY-MM', müşteri, saat]
export function buildMarkaPersonel({ rows, brandName }) {
  const key = normalizeNameKey(brandName);
  const map = new Map();
  (rows || []).forEach(([u, ym, client, hours]) => {
    const i = Number(String(ym).slice(5, 7)) - 1;
    if (i < 0 || i > 11 || SIFIRLANAN_AYLAR.includes(i)) return;
    if (normalizeNameKey(kanonikMusteri(client)) !== key) return;
    if (!map.has(u)) map.set(u, new Array(12).fill(0));
    map.get(u)[i] += hours;
  });
  return [...map].map(([name, hours]) => ({ name, hours }));
}

// Personel görünümü: kişi bazında süre (saat) ve müşteri kırılımı. rows: [kişi, 'YYYY-MM', müşteri, saat]
export function buildPersonel({ rows, idxs }) {
  const map = new Map();
  (rows || []).forEach(([user, ym, client, hours]) => {
    const i = Number(String(ym).slice(5, 7)) - 1;
    if (!idxs.includes(i) || SIFIRLANAN_AYLAR.includes(i)) return;
    if (!map.has(user)) map.set(user, { name: user, hours: 0, clients: new Map() });
    const u = map.get(user);
    u.hours += hours;
    const c = kanonikMusteri(client);
    u.clients.set(c, (u.clients.get(c) || 0) + hours);
  });
  return [...map.values()]
    .map((u) => ({ name: u.name, hours: u.hours, clients: [...u.clients].map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours) }))
    .filter((u) => u.hours > 0)
    .sort((a, b) => b.hours - a.hours);
}

// Tek kişinin ayrıntısı: aylık süre, o ayda ekibin toplam süresi, müşteri kırılımı (müşteri x ay). rows: [kişi, 'YYYY-MM', müşteri, saat]
export function buildKisiDetay({ rows, user }) {
  const monthly = new Array(12).fill(0);
  const team = new Array(12).fill(0);
  const clients = new Map();
  const aktifKisi = Array.from({ length: 12 }, () => new Set());
  (rows || []).forEach(([u, ym, client, hours]) => {
    const i = Number(String(ym).slice(5, 7)) - 1;
    if (i < 0 || i > 11 || SIFIRLANAN_AYLAR.includes(i)) return;
    team[i] += hours;
    if (hours > 0) aktifKisi[i].add(u);
    if (u !== user) return;
    monthly[i] += hours;
    const c = kanonikMusteri(client);
    if (!clients.has(c)) clients.set(c, new Array(12).fill(0));
    clients.get(c)[i] += hours;
  });
  return { monthly, team, kisiSayisi: aktifKisi.map((x) => x.size), clients: [...clients].map(([name, hours]) => ({ name, hours })) };
}

export function buildSure({ rows, months, ayDurumu, revenueRaw, satisRows }) {
  const monthIdx = (ym) => Number(String(ym).slice(5, 7)) - 1;
  const map = new Map();
  const get = (name, tip, eslesti) => {
    const key = tip + '|' + normalizeNameKey(name);
    if (!map.has(key)) map.set(key, { name, tip, eslesti, hours: new Array(12).fill(0), fee: new Array(12).fill(0), proje: new Array(12).fill(0), faturali: new Array(12).fill(false) });
    return map.get(key);
  };
  (rows || []).forEach(([client, ym, hours]) => {
    const i = monthIdx(ym);
    if (i < 0 || i > 11 || SIFIRLANAN_AYLAR.includes(i)) return;
    let b;
    if (!client) b = get(ATANMAMIS_ADI, 'atanmamis', true);
    else if (normalizeNameKey(client) === IC_KEY) b = get(IC_ADI, 'ic', true);
    else {
      const mapped = MAP_BY_KEY[normalizeNameKey(client)];
      b = mapped ? get(canonName(mapped), 'marka', true) : get(client.toUpperCase(), 'marka', false);
    }
    b.hours[i] += hours;
  });

  // Satış Tablosu: hangi marka hangi ay faturalandı (süresi olmayanlar da listeye eklenir)
  (satisRows || []).forEach((r) => {
    const i = months.indexOf(r.ay);
    if (i < 0 || SIFIRLANAN_AYLAR.includes(i)) return;
    const name = canonName(r.marka);
    const b = get(name, 'marka', true);
    b.eslesti = true; // Satış Tablosu'nda fatura kesilmiş marka eşleşmiş sayılır
    b.faturali[i] = true;
    if (r.hizmet === 'FEE') b.fee[i] += r.tutar || 0;
    else b.proje[i] += r.tutar || 0;
  });

  // Eşleşme yalnızca Satış Tablosu'na göre: Satış'ta hiç faturası olmayan isim "eşleşmedi" sayılır
  if ((satisRows || []).length) {
    const satisKeys = new Set(satisRows.map((r) => normalizeNameKey(canonName(r.marka))));
    map.forEach((b) => {
      if (b.tip === 'marka') b.eslesti = satisKeys.has(normalizeNameKey(b.name));
    });
  }

  const all = [...map.values()];
  return { brands: all.filter((b) => b.tip === 'marka'), disi: all.filter((b) => b.tip !== 'marka') };
}

export const DEPARTMANLAR = ['STRATEJİ PAZARLAMA İLETİŞİMİ', 'PRODÜKSİYON', 'TASARIM', 'PERFORMANS PAZARLAMA', 'DİĞER / İDARİ'];
export const DEPARTMAN_YOK = 'Departman atanmamış';

// Departman bazlı süre: personel listesi (buildPersonel çıktısı) + kişi->departman eşleşmesi
export function buildDepartman({ personel, map }) {
  const deps = new Map();
  (personel || []).forEach((u) => {
    const d = (map && map[u.name]) || DEPARTMAN_YOK;
    if (!deps.has(d)) deps.set(d, { name: d, hours: 0, kisiler: [], clients: new Map() });
    const x = deps.get(d);
    x.hours += u.hours;
    x.kisiler.push({ name: u.name, hours: u.hours });
    u.clients.forEach((c) => x.clients.set(c.name, (x.clients.get(c.name) || 0) + c.hours));
  });
  return [...deps.values()]
    .map((x) => ({ name: x.name, hours: x.hours, kisiler: x.kisiler.sort((a, b) => b.hours - a.hours), clients: [...x.clients].map(([name, hours]) => ({ name, hours })) }))
    .sort((a, b) => (a.name === DEPARTMAN_YOK) - (b.name === DEPARTMAN_YOK) || b.hours - a.hours);
}
