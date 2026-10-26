// Yetkiye göre veri süzme: kullanıcı yetkisi olmayan hiçbir veri tarayıcıya gönderilmez.
// Her sayfa, ihtiyaç duyduğu "veri gruplarını" açar; grupların birleşimi gönderilir.
export const PAGE_GROUPS = {
  dashboard: ['CIRO', 'GIDER', 'NAKIT', 'GELIR', 'ALACAK', 'SATIS', 'YORUM'],
  gelirler: ['CIRO', 'GELIR', 'SATIS'],
  giderler: ['CIRO', 'GIDER'],
  alacaklar: ['ALACAK'],
  nakitAkisi: ['NAKIT', 'ALACAK'],
  satisTablosu: ['CIRO', 'SATIS'],
  sureAnalizi: ['CIRO', 'GELIR', 'SATIS', 'SURE'],
  feeTakip: ['CIRO', 'SATIS', 'FEETAKIP'],
  yorumlar: ['YORUM'],
};

export const groupsFor = (pages) => new Set((pages || []).flatMap((p) => PAGE_GROUPS[p] || []));

// DASH 26_RAW sütunları: 2 ciro, 3-14 gider kalemleri/toplam/kâr, 15 kur, 16 ciro USD, 17 gider USD, 18-20 kasa/banka/çek, 21 durum
const DASH_COLS = {
  CIRO: [0, 1, 2, 15, 16, 21],
  GIDER: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17],
  NAKIT: [18, 19, 20],
};
const REV_KEYS = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'].map((k) => `${k}_RAW`);

export function filterDash(grid, groups) {
  if (!Array.isArray(grid)) return grid;
  const keep = new Set(Object.entries(DASH_COLS).filter(([g]) => groups.has(g)).flatMap(([, cols]) => cols));
  return grid.map((row) => (Array.isArray(row) ? row.map((v, i) => (keep.has(i) ? v : '')) : row));
}

export function filterData({ fee, odeme, satis, yorumlar, sureler }, pages) {
  const g = groupsFor(pages);
  const out = { fee: {}, odeme: { '2026 ÖDEME LİSTESİ': [] }, satis: null, yorumlar: null, sureler: null };
  if (fee) {
    out.fee._lastUpdated = fee._lastUpdated;
    out.fee['MARKA DURUM'] = fee['MARKA DURUM'];
    out.fee['DASH 26_RAW'] = filterDash(fee['DASH 26_RAW'], g);
    if (g.has('GIDER')) out.fee['GİDERLER'] = fee['GİDERLER'];
    if (g.has('GELIR')) REV_KEYS.forEach((k) => { if (fee[k]) out.fee[k] = fee[k]; });
    if (g.has('FEETAKIP')) Object.keys(fee).filter((k) => /^FEE TAK[İI]P/i.test(k)).forEach((k) => { out.fee[k] = fee[k]; });
  }
  if (g.has('ALACAK') && odeme) out.odeme = odeme;
  else if (odeme) out.odeme._lastUpdated = odeme._lastUpdated;
  if (g.has('SATIS')) out.satis = satis;
  if (g.has('YORUM')) out.yorumlar = yorumlar;
  if (g.has('SURE')) out.sureler = sureler;
  return out;
}
