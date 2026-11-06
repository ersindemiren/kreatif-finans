// Bir personelin "çalışıyor sayıldığı" aylar (maksimum süre bu aylar için hesaplanır).
//  - Pasif (işten ayrıldı): süre girdiği ilk aydan son aya kadar. Ayrıldıktan sonraki aylar sayılmaz.
//  - Aktif: süre girdiği ilk aydan yıl sonuna kadar; süre girmediği (unuttuğu) aylar da sayılır, dönem filtresi çağıran tarafta uygulanır.
// rows: [[kişi, 'YYYY-AA', müşteri, saat]], pasif: { kişi: true } -> Map(kişi -> Set(ay indeksi 0-11))
export function kisiAylari(rows, pasif = {}) {
  const ilk = new Map();
  const son = new Map();
  const top = new Map();
  (rows || []).forEach(([user, ym, , h]) => {
    const i = Number(String(ym).slice(5, 7)) - 1;
    if (!(i >= 0 && i <= 11)) return;
    const k = `${user}|${i}`;
    top.set(k, (top.get(k) || 0) + h);
  });
  top.forEach((h, k) => {
    if (!(h > 0)) return;
    const [user, i] = [k.slice(0, k.lastIndexOf('|')), Number(k.slice(k.lastIndexOf('|') + 1))];
    if (!ilk.has(user) || i < ilk.get(user)) ilk.set(user, i);
    if (!son.has(user) || i > son.get(user)) son.set(user, i);
  });
  const out = new Map();
  ilk.forEach((bas, user) => {
    const bit = pasif[user] ? son.get(user) : 11;
    const s = new Set();
    for (let m = bas; m <= bit; m++) s.add(m);
    out.set(user, s);
  });
  return out;
}

// Her ay için sayılan kişi sayısı (12 elemanlı dizi)
export function kisiAySayilari(rows, pasif) {
  const dizi = new Array(12).fill(0);
  kisiAylari(rows, pasif).forEach((s) => s.forEach((m) => { dizi[m] += 1; }));
  return dizi;
}
