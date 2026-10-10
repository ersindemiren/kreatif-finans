// ============================================================================
// Süre Analizi: zaman takip raporu (src/data/sureler.json) + FEE 2026 YENİ gelirleri
// Süre kaynağı canlı bir uç nokta değildir; rapor yeniden dışa aktarıldığında sureler.json güncellenir.
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

// Marka olmayan süreler: ajansın kendi işi ve markaya atanmamış kayıtlar
const IC_KEY = normalizeNameKey('Kreatif Yeni Nesil İletişim Ajansı');
export const IC_ADI = 'KREATİF (İÇ SÜRE)';
export const ATANMAMIS_ADI = 'MARKAYA ATANMAMIŞ';

// Dönüş: { brands: [...], disi: [...] }
//  brand = { name, tip: 'marka'|'ic'|'atanmamis', eslesti, hours[12], fee[12], faturali }
//  hours[i] ay süresi (saat), fee[i] o ay fee geliri (sabit + fee faturası, KDV hariç), faturali = Oca-Eyl'de herhangi bir geliri var mı
export function buildSure({ rows, months, ayDurumu, revenueRaw }) {
  const monthIdx = (ym) => Number(String(ym).slice(5, 7)) - 1;
  const map = new Map();
  const get = (name, tip, eslesti) => {
    if (!map.has(name)) map.set(name, { name, tip, eslesti, hours: new Array(12).fill(0), fee: new Array(12).fill(0), faturali: false });
    return map.get(name);
  };
  (rows || []).forEach(([client, ym, hours]) => {
    const i = monthIdx(ym);
    if (i < 0 || i > 11) return;
    let b;
    if (!client) b = get(ATANMAMIS_ADI, 'atanmamis', true);
    else if (normalizeNameKey(client) === IC_KEY) b = get(IC_ADI, 'ic', true);
    else {
      const mapped = MAP_BY_KEY[normalizeNameKey(client)];
      b = mapped ? get(mapped, 'marka', true) : get(client.toUpperCase(), 'marka', false);
    }
    b.hours[i] += hours;
  });

  // Gelirler: marka anahtarına göre ay ay fee (sabit + fee faturası) ve herhangi bir gelir var mı
  const guncel = (months || []).map((_, i) => ayDurumu?.[i] === 'güncel');
  const feeByKey = {};
  const anyByKey = {};
  (months || []).forEach((m, i) => {
    const rr = revenueRaw?.[m];
    if (!rr) return;
    [...(rr.diger || []), ...(rr.fatura || [])].forEach(([n, v]) => {
      const k = normalizeNameKey(n);
      (feeByKey[k] = feeByKey[k] || new Array(12).fill(0))[i] += typeof v === 'number' ? v : 0;
      if (guncel[i] && v > 0) anyByKey[k] = true;
    });
    (rr.feeDisi || []).forEach(([n, , v]) => {
      const k = normalizeNameKey(n);
      if (guncel[i] && v > 0) anyByKey[k] = true;
    });
  });
  map.forEach((b) => {
    if (b.tip !== 'marka') return;
    const k = normalizeNameKey(b.name);
    if (feeByKey[k]) b.fee = feeByKey[k];
    b.faturali = !!anyByKey[k];
  });

  const all = [...map.values()];
  return { brands: all.filter((b) => b.tip === 'marka'), disi: all.filter((b) => b.tip !== 'marka') };
}
