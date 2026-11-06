// Personel maliyeti: kişi başı aylık toplam maliyet + genel işletme dağıtım gideri.
// Dağıtım gideri, kişilerin kendi maliyetlerine oranla paylaştırılır; saat maliyeti = toplam / aylık azami saat (22 gün x 8,5).
export const AYLIK_SAAT = 22 * 8.5;

// maliyet: { kisi: { AD: aylık maliyet }, dagitim: sayı } -> { toplamKisi, rows: { AD: { own, pay, toplam, saat } } }
export function hesaplaMaliyet(maliyet) {
  const kisi = maliyet?.kisi || {};
  const dagitim = Number(maliyet?.dagitim) || 0;
  const ad = Object.keys(kisi).filter((k) => Number(kisi[k]) > 0);
  const toplamKisi = ad.reduce((t, k) => t + Number(kisi[k]), 0);
  const rows = {};
  ad.forEach((k) => {
    const own = Number(kisi[k]);
    const pay = toplamKisi ? (dagitim * own) / toplamKisi : 0;
    rows[k] = { own, pay, toplam: own + pay, saat: (own + pay) / AYLIK_SAAT };
  });
  return { toplamKisi, dagitim, rows };
}

// "1.100.000" / "1100000,50" -> sayı
export const parseTR = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
