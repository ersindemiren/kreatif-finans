// ============================================================================
// Google Apps Script uç noktalarından gelen ham JSON'u, dashboard'un ihtiyaç
// duyduğu temiz veri yapılarına (ciro, gider, expenseItemDefs, revenueRaw,
// alacaklarData, nakitAkisiData, totals...) dönüştürür.
// ============================================================================

export const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// "OCAK".."ARALIK" sekme adları -> kısa ay kodu eşleşmesi (ham grid sekmeleri için)
const REVENUE_SHEET_NAMES = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];

// GİDERLER sekmesindeki ay sütun başlıkları (tam Türkçe karakterli)
const GIDERLER_MONTH_KEYS = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];

function num(v) {
  return typeof v === 'number' ? v : 0;
}

// Sheet'te aynı müşterinin farklı yazımlarla geçtiği durumlar için eşleştirme.
// Sol taraf HAM isim (büyük harf, sheet'teki hali), sağ taraf birleştirileceği kanonik isim.
const CLIENT_ALIASES = {
  'ALTINCOM PROJE': 'ALTINCOM',
  'MEHMET ZENGİN': 'TUN GIDA',
  'MEHMET ZENGİN (TUN)': 'TUN GIDA',
};

// Başlık-yazımına sokulmadan, olduğu gibi bırakılması gereken isimler (kısaltmalar, yabancı kökenli kelimeler)
const SPECIAL_CASE_NAMES = {
  'B.M.S': 'B.M.S',
  'HERITAGE': 'Heritage',
  'WILDFRUITS': 'Wildfruits',
  'PERSAN - PICULET': 'Persan - Piculet',
  'PERSONEL SGK': 'Personel SGK',
  'SGK VE DİĞER DANIŞMANLIK': 'SGK Ve Diğer Danışmanlık',
  'OGS HGS': 'OGS HGS',
  'İSKİ SU': 'İSKİ Su',
  'MTV VE ÖZEL İLETİŞİM VERGİSİ': 'MTV Ve Özel İletişim Vergisi',
  'BELEDİYE (ÇEVRE TEMİZLİK) - İTO AİDAT': 'Belediye (Çevre Temizlik) - İTO Aidat',
  'SMM YMM AVUKAT': 'SMM YMM Avukat',
};

// Başlık-yazımı sonrasında kısaltma olarak kalması gereken kelimeler
const ACRONYM_WORDS = {
  SGK: 'SGK',
  SMM: 'SMM',
  YMM: 'YMM',
  OGS: 'OGS',
  HGS: 'HGS',
  MTV: 'MTV',
  KDV: 'KDV',
  İSKİ: 'İSKİ',
  ISKI: 'İSKİ',
  İTO: 'İTO',
  ITO: 'İTO',
};

// Türkçe kurallara göre "Başlık Şeklinde" yazım (BÜYÜK HARF sheet verisini
// okunabilir hale getirmek için). "RUMELİ BÖREK 3/4" gibi kesir eklerini de temizler.
function toTitleCaseTR(raw) {
  if (typeof raw !== 'string') return raw;
  let s = raw.trim().replace(/\s+\d+\/\d+$/, '').trim();
  if (!s) return s;
  const upper = s.toLocaleUpperCase('tr-TR');
  if (CLIENT_ALIASES[upper]) s = CLIENT_ALIASES[upper];
  const upperAfterAlias = s.toLocaleUpperCase('tr-TR');
  if (SPECIAL_CASE_NAMES[upperAfterAlias]) return SPECIAL_CASE_NAMES[upperAfterAlias];
  const titled = s
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((w) => w.replace(/^(\P{L}*)(\p{L})/u, (_, pre, c) => pre + c.toLocaleUpperCase('tr-TR')))
    .join(' ');
  return titled
    .split(' ')
    .map((w) => {
      const key = w.replace(/[.,]/g, '').toLocaleUpperCase('tr-TR');
      return ACRONYM_WORDS[key] || w;
    })
    .join(' ');
}

/* ------------------------------------------------------------------ */
/* GİDERLER: header-bazlı JSON'dan expenseItemDefs üretir              */
/* ------------------------------------------------------------------ */
export function parseGiderler(giderlerRows) {
  if (!Array.isArray(giderlerRows)) return { expenseItemDefs: [], giderPerMonth: new Array(12).fill(0) };

  const EXCLUDE = ['GENEL TOPLAM', 'DİĞER İŞLETME GİDERLERİ'];
  const itemRows = giderlerRows.filter((r) => {
    const name = String(r['2026 GİDER KALEMİ'] || '').trim().toUpperCase();
    return name && !EXCLUDE.includes(name);
  });

  const expenseItemDefs = itemRows.map((r) => {
    const name = toTitleCaseTR(r['2026 GİDER KALEMİ']);
    const vals = GIDERLER_MONTH_KEYS.map((mk) => num(r[mk]));
    return [name, vals];
  });

  const genelToplamRow = giderlerRows.find((r) => String(r['2026 GİDER KALEMİ'] || '').trim().toUpperCase() === 'GENEL TOPLAM');
  const giderPerMonth = GIDERLER_MONTH_KEYS.map((mk) => num(genelToplamRow ? genelToplamRow[mk] : 0));

  // Uzlaştırma kalemi: GENEL TOPLAM - kalemlerin toplamı (yuvarlama / sınıflandırılmamış fark)
  const itemizedPerMonth = GIDERLER_MONTH_KEYS.map((_, i) => expenseItemDefs.reduce((s, [, vals]) => s + vals[i], 0));
  const plugPerMonth = giderPerMonth.map((total, i) => Math.round((total - itemizedPerMonth[i]) * 100) / 100);
  if (plugPerMonth.some((v) => Math.abs(v) > 0.5)) {
    expenseItemDefs.push(['Diğer (Sınıflandırılmamış)', plugPerMonth]);
  }

  return { expenseItemDefs, giderPerMonth };
}

export function buildGiderKategorileri(expenseItemDefs) {
  const itemTotal = (names) =>
    expenseItemDefs
      .filter(([n]) => names.map((x) => x.toLocaleUpperCase('tr-TR')).includes(n.toLocaleUpperCase('tr-TR')))
      .reduce((s, [, vals]) => s + vals.reduce((a, b) => a + b, 0), 0);
  const grandTotal = expenseItemDefs.reduce((s, [, vals]) => s + vals.reduce((a, b) => a + b, 0), 0);

  const personel = itemTotal(['Maaş', 'Personel Sgk', 'Yemek', 'Muhtasar']);
  const vergi = itemTotal(['Geçici Vergi - Kurumlar Vergisi']);
  const kira = itemTotal(['Kira Bedeli']);
  const krediler = itemTotal(['Krediler']);
  const demirbas = itemTotal(['Demirbaşlar', 'Küçük Demirbaşlar']);
  const aidat = itemTotal(['Apartman Aidatları']);
  const kidem = itemTotal(['Kıdem, İhbar, İzin']);
  const assigned = personel + vergi + kira + krediler + demirbas + aidat + kidem;
  const diger = grandTotal - assigned;

  return [
    { name: 'Personel', detay: 'Maaş, SGK, Yemek, Muhtasar', deger: personel, fill: '#2a78d6' },
    { name: 'Vergi', detay: 'Geçici Vergi - Kurumlar Vergisi', deger: vergi, fill: '#4a3aa7' },
    { name: 'Kira', detay: 'Kira Bedeli', deger: kira, fill: '#1baf7a' },
    { name: 'Krediler', detay: 'Kredi Ödemeleri', deger: krediler, fill: '#eda100' },
    { name: 'Demirbaş', detay: 'Demirbaş Yatırımı', deger: demirbas, fill: '#898781' },
    { name: 'Aidat', detay: 'Apartman Aidatları', deger: aidat, fill: '#e87ba4' },
    { name: 'Kıdem/İhbar', detay: 'Kıdem, İhbar, İzin', deger: kidem, fill: '#9085e9' },
    { name: 'Diğer', detay: 'Kalan tüm gider kalemleri', deger: diger, fill: '#eb6834' },
  ];
}

/* ------------------------------------------------------------------ */
/* DASH 26_RAW: pozisyon-bazlı hücrelerden ciro[] ve totals üretir     */
/* ------------------------------------------------------------------ */
export function parseDash26(dash26Raw) {
  const fallback = {
    ciro: new Array(12).fill(0),
    ciroUSD: new Array(12).fill(0),
    giderUSD: new Array(12).fill(0),
    nakitAkisiData: { kasa: 0, banka: 0, cek: 0 },
    totals2026: null,
    totals2025: null,
    ayDurumu: new Array(12).fill(null),
  };
  if (!Array.isArray(dash26Raw) || dash26Raw.length < 16) return fallback;

  // Satır 3..14 (0-indeks 2..13) = Ocak..Aralık; sütun C(2)=Ciro, Q(16)=Ciro USD, R(17)=Gider USD, V(21)=Ay Durumu
  const monthRows = dash26Raw.slice(2, 14);
  const ciro = monthRows.map((row) => num(row[2]));
  const ciroUSD = monthRows.map((row) => num(row[16]));
  const giderUSD = monthRows.map((row) => num(row[17]));
  const ayDurumu = monthRows.map((row) => {
    const raw = String(row[21] || '').trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');
    if (raw === 'güncel') return 'güncel';
    if (raw === 'tahmini') return 'tahmini';
    return null;
  });

  const toplamRow = dash26Raw.find((r) => String(r[1]).trim().toUpperCase() === 'TOPLAM');
  const row2025 = dash26Raw.find((r) => String(r[1]).trim() === '2025');

  const readTotals = (row) => {
    if (!row) return null;
    return {
      ciro: num(row[2]),
      toplamGider: num(row[12]),
      kar: num(row[13]),
      karUSD: num(row[14]),
      kurUSD: num(row[15]),
      ciroUSD: num(row[16]),
      giderUSD: num(row[17]),
    };
  };

  const nakitAkisiData = toplamRow
    ? { kasa: num(toplamRow[18]), banka: num(toplamRow[19]), cek: num(toplamRow[20]) }
    : fallback.nakitAkisiData;

  return {
    ciro,
    ciroUSD,
    giderUSD,
    nakitAkisiData,
    totals2026: readTotals(toplamRow),
    totals2025: readTotals(row2025),
    ayDurumu,
  };
}

/* ------------------------------------------------------------------ */
/* OCAK_RAW..ARALIK_RAW: 3 yan yana bölüm (DİĞER / FATURA / FEE DIŞI)  */
/* ------------------------------------------------------------------ */
export function parseRevenueMonthGrid(grid) {
  const empty = { diger: [], fatura: [], feeDisi: [] };
  if (!Array.isArray(grid)) return empty;

  let headerIdx = grid.findIndex((row) => String(row[0]).trim().toLocaleUpperCase('tr-TR') === 'DİĞER');
  if (headerIdx === -1) headerIdx = 2;

  const diger = [];
  const fatura = [];
  const feeDisi = [];

  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row) continue;
    if (row[0] !== '' && row[0] != null && typeof row[1] === 'number') {
      diger.push([toTitleCaseTR(row[0]), row[1]]);
    }
    if (row[3] !== '' && row[3] != null && typeof row[4] === 'number') {
      fatura.push([toTitleCaseTR(row[3]), row[4]]);
    }
    if (row[6] !== '' && row[6] != null && typeof row[8] === 'number') {
      feeDisi.push([toTitleCaseTR(row[6]), row[7] || '', row[8]]);
    }
  }

  return { diger, fatura, feeDisi };
}

export function parseRevenueRaw(json) {
  const revenueRaw = {};
  MONTHS.forEach((shortMonth, i) => {
    const sheetName = REVENUE_SHEET_NAMES[i];
    const grid = json[`${sheetName}_RAW`];
    revenueRaw[shortMonth] = parseRevenueMonthGrid(grid);
  });
  return revenueRaw;
}

/* ------------------------------------------------------------------ */
/* MÜŞTERİDEN GELECEK ÖDEMELER: "2026 ÖDEME LİSTESİ" -> alacaklarData  */
/* ------------------------------------------------------------------ */
export function parseAlacaklar(odemeListesiRows) {
  if (!Array.isArray(odemeListesiRows)) return [];
  const totals = {};
  odemeListesiRows.forEach((r) => {
    const firma = String(r['Firma'] || '').trim();
    const tutar = num(r['Tutar']);
    if (!firma) return; // genel toplam satırını atla
    const label = toTitleCaseTR(firma);
    totals[label] = (totals[label] || 0) + tutar;
  });
  return Object.entries(totals)
    .map(([name, deger]) => [name, Math.round(deger * 100) / 100])
    .sort((a, b) => b[1] - a[1]);
}

/* ------------------------------------------------------------------ */
/* "Tahmini Proje" etiketli gelir kalemlerinin toplamı (hedefe ulaşma   */
/* oranı göstergesi için) — isim eşleşmesi büyük/küçük harften bağımsız */
/* ------------------------------------------------------------------ */
export function computeTahminiToplam(revenueRaw) {
  let total = 0;
  Object.values(revenueRaw).forEach((month) => {
    ['diger', 'fatura'].forEach((cat) => {
      (month[cat] || []).forEach(([client, amount]) => {
        if (String(client).toLocaleLowerCase('tr-TR').includes('tahmini')) total += amount;
      });
    });
    (month.feeDisi || []).forEach(([client, , amount]) => {
      if (String(client).toLocaleLowerCase('tr-TR').includes('tahmini')) total += amount;
    });
  });
  return total;
}

/* ------------------------------------------------------------------ */
/* MARKA DURUM: "Pasif" işaretli markaların listesi                    */
/* ------------------------------------------------------------------ */
// Sheet'teki kısa/farklı yazılmış isimlerin, uygulamadaki tam isme eşleştirilmesi
const MARKA_DURUM_ALIASES = {};

export function parsePasifMarkalar(markaDurumRows) {
  const pasifSet = new Set();
  if (!Array.isArray(markaDurumRows)) return [];
  markaDurumRows.forEach((r) => {
    const durum = String(r['DURUM'] || '').trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');
    if (durum !== 'pasif') return;
    let name = toTitleCaseTR(r['MARKA']);
    if (MARKA_DURUM_ALIASES[name]) name = MARKA_DURUM_ALIASES[name];
    pasifSet.add(name);
  });
  return [...pasifSet];
}

/* ------------------------------------------------------------------ */
/* ANA GİRİŞ NOKTASI                                                    */
/* ------------------------------------------------------------------ */
export async function fetchFinansData({ feeUrl, feeKey, odemeUrl, odemeKey }) {
  const [feeRes, odemeRes] = await Promise.all([
    fetch(`${feeUrl}?key=${encodeURIComponent(feeKey)}`),
    fetch(`${odemeUrl}?key=${encodeURIComponent(odemeKey)}`),
  ]);

  if (!feeRes.ok) throw new Error(`FEE 2026 YENİ verisi alınamadı (HTTP ${feeRes.status})`);
  if (!odemeRes.ok) throw new Error(`MÜŞTERİDEN GELECEK ÖDEMELER verisi alınamadı (HTTP ${odemeRes.status})`);

  const feeJson = await feeRes.json();
  const odemeJson = await odemeRes.json();

  if (feeJson.error) throw new Error(`FEE 2026 YENİ: ${feeJson.error}`);
  if (odemeJson.error) throw new Error(`MÜŞTERİDEN GELECEK ÖDEMELER: ${odemeJson.error}`);

  const { expenseItemDefs, giderPerMonth } = parseGiderler(feeJson['GİDERLER']);
  const giderYapisi = buildGiderKategorileri(expenseItemDefs);
  const { ciro, ciroUSD, giderUSD, nakitAkisiData, totals2026, totals2025, ayDurumu } = parseDash26(feeJson['DASH 26_RAW']);
  const revenueRaw = parseRevenueRaw(feeJson);
  const alacaklarData = parseAlacaklar(odemeJson['2026 ÖDEME LİSTESİ']);
  const tahminiProjeToplam = computeTahminiToplam(revenueRaw);
  const pasifMarkalar = parsePasifMarkalar(feeJson['MARKA DURUM']);

  return {
    months: MONTHS,
    ciro,
    ciroUSD,
    giderUSD,
    gider: giderPerMonth,
    expenseItemDefs,
    giderYapisi,
    revenueRaw,
    alacaklarData,
    nakitAkisiData,
    totals2026,
    totals2025,
    tahminiProjeToplam,
    ayDurumu,
    pasifMarkalar,
    lastUpdatedFee: feeJson._lastUpdated || null,
    lastUpdatedOdeme: odemeJson._lastUpdated || null,
  };
}
