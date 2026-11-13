// Kırmızı baraj değerleri (Yönetim > Ayarlar'dan değiştirilir). Sunucudan gelen değerler uygulaEsikler ile uygulanır.
// kapasite / kayit: oran (0-1), skor: Skor (0-100). Bu değerin altı kırmızı gösterilir.
export const VARSAYILAN_ESIKLER = { kapasite: 0.85, kayit: 0.85, skor: 80 };
export const ESIKLER = { ...VARSAYILAN_ESIKLER };
export const uygulaEsikler = (a) => {
  if (!a || typeof a !== 'object') return;
  ['kapasite', 'kayit'].forEach((k) => { const v = Number(a[k]); if (Number.isFinite(v) && v >= 0 && v <= 1) ESIKLER[k] = v; });
  const s = Number(a.skor);
  if (Number.isFinite(s) && s >= 0 && s <= 100) ESIKLER.skor = s;
};
export const pctEsik = (v) => `%${Math.round(v * 1000) / 10}`.replace('.', ',');

// Süre Analizi saatlik baz fiyatı (₺/saat), Ocak–Aralık. Yönetim > Baz Fiyat Güncelleme'den değiştirilir; dizi yerinde güncellenir.
export const VARSAYILAN_BAZ_FIYAT = [5000, 5000, 5000, 5000, 5000, 5000, 6000, 6000, 6000, 6000, 6000, 6000];
export const FEE_BAZI = [...VARSAYILAN_BAZ_FIYAT];
export const uygulaBaz = (a) => {
  if (!Array.isArray(a) || a.length !== 12) return;
  const n = a.map(Number);
  if (n.some((v) => !Number.isFinite(v) || v <= 0)) return;
  n.forEach((v, i) => { FEE_BAZI[i] = v; });
};
