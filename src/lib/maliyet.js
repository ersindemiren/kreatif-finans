// Personel maliyeti (aylık): her ay için kişi başı toplam ajans maliyeti + o ayın genel işletme dağıtım gideri.
// Dağıtım gideri, o ay maliyeti girilmiş kişilere kendi maliyetleri oranında paylaştırılır (maliyeti girilmeyen = dağıtımdan çıkar).
// Saat maliyeti = (maliyet + dağıtım payı) / o ayın azami saati (hafta içi - resmi tatil, x 8,5; bkz. takvim.js). Yıllık/mazeret izni gelince kişiye göre düşülecek.
export const ayAnahtar = (i, yil = new Date().getFullYear()) => `${yil}-${String(i + 1).padStart(2, '0')}`;

// ayVeri: { kisi: { AD: tutar }, dagitim } -> { toplamKisi, dagitim, rows: { AD: { own, pay, toplam, saat } } }
export function hesaplaAy(ayVeri, aySaat) {
  const kisi = ayVeri?.kisi || {};
  const dagitim = Number(ayVeri?.dagitim) || 0;
  const ad = Object.keys(kisi).filter((k) => Number(kisi[k]) > 0);
  const toplamKisi = ad.reduce((t, k) => t + Number(kisi[k]), 0);
  const rows = {};
  ad.forEach((k) => {
    const own = Number(kisi[k]);
    const pay = toplamKisi ? (dagitim * own) / toplamKisi : 0;
    rows[k] = { own, pay, toplam: own + pay, saat: aySaat > 0 ? (own + pay) / aySaat : 0 };
  });
  return { toplamKisi, dagitim, rows };
}

// maliyet: { aylar: { 'YYYY-AA': ayVeri } } -> { 'YYYY-AA': hesaplaAy(...) }
export function hesaplaMaliyet(maliyet, saatFn) {
  const out = {};
  Object.entries(maliyet?.aylar || {}).forEach(([ym, v]) => { out[ym] = hesaplaAy(v, saatFn ? saatFn(ym) : 0); });
  return out;
}

// "1.100.000" / "1100000,50" -> sayı
export const parseTR = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
