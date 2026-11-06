// İş günü takvimi: aylık azami süre = (o ayın hafta içi sayısı - resmi tatil günleri) x günlük 8,5 saat.
// Hafta sonuna denk gelen resmi tatil iş gününden düşmez; arife (yarım gün) 0,5 gün düşer. Liste Yönetim'den değiştirilir.
export const GUNLUK_SAAT = 8.5;

// Sunucuda kayıtlı liste yoksa kullanılan 2026 resmi tatilleri (api/_lib/everhourMap.js'deki ile aynı)
export const VARSAYILAN_TATILLER = [
  { tarih: '2026-01-01', ad: 'Yılbaşı' },
  { tarih: '2026-03-19', ad: 'Ramazan Bayramı Arifesi', yarim: true },
  { tarih: '2026-03-20', ad: 'Ramazan Bayramı 1. Gün' },
  { tarih: '2026-03-21', ad: 'Ramazan Bayramı 2. Gün' },
  { tarih: '2026-03-22', ad: 'Ramazan Bayramı 3. Gün' },
  { tarih: '2026-04-23', ad: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { tarih: '2026-05-01', ad: 'Emek ve Dayanışma Günü' },
  { tarih: '2026-05-19', ad: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { tarih: '2026-05-26', ad: 'Kurban Bayramı Arifesi', yarim: true },
  { tarih: '2026-05-27', ad: 'Kurban Bayramı 1. Gün' },
  { tarih: '2026-05-28', ad: 'Kurban Bayramı 2. Gün' },
  { tarih: '2026-05-29', ad: 'Kurban Bayramı 3. Gün' },
  { tarih: '2026-05-30', ad: 'Kurban Bayramı 4. Gün' },
  { tarih: '2026-07-15', ad: 'Demokrasi ve Milli Birlik Günü' },
  { tarih: '2026-08-30', ad: 'Zafer Bayramı' },
  { tarih: '2026-10-28', ad: 'Cumhuriyet Bayramı Arifesi', yarim: true },
  { tarih: '2026-10-29', ad: 'Cumhuriyet Bayramı' },
];

const hs = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 pazar ... 6 cumartesi
export const haftaSonu = (iso) => [0, 6].includes(hs(iso));
export const GUN_ADLARI = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
export const gunAdi = (iso) => GUN_ADLARI[hs(iso)];

// Bir tatilin iş gününden düşen miktarı (hafta sonuysa 0)
export const tatilEtkisi = (t) => (haftaSonu(t.tarih) ? 0 : t.yarim ? 0.5 : 1);

export function haftaIci(yil, ay0) {
  const n = new Date(Date.UTC(yil, ay0 + 1, 0)).getUTCDate();
  let c = 0;
  for (let d = 1; d <= n; d++) if (![0, 6].includes(new Date(Date.UTC(yil, ay0, d)).getUTCDay())) c++;
  return c;
}

export const tatilGunu = (tatiller, yil, ay0) =>
  (tatiller || []).filter((t) => t.tarih.startsWith(`${yil}-${String(ay0 + 1).padStart(2, '0')}-`)).reduce((s, t) => s + tatilEtkisi(t), 0);

export const ayIsGunu = (tatiller, yil, ay0) => haftaIci(yil, ay0) - tatilGunu(tatiller, yil, ay0);
export const aySaati = (tatiller, yil, ay0) => ayIsGunu(tatiller, yil, ay0) * GUNLUK_SAAT;
