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
  'MYRA': 'MYRA ÇİKOLATA',
  'SİLVA KOZMETİK': 'SİLVA',
};

// Yazım farklarını (boşluk, nokta, Türkçe karakter: "PORTAKAL BAHÇEM" / "PORTAKALBAHCEM", "ALTIN.COM" / "ALTINCOM",
// "B.M.S" / "BMS") tek anahtarda toplamak için normalize eder.
export function normalizeNameKey(s) {
  return String(s || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/Ç/g, 'C').replace(/Ğ/g, 'G').replace(/İ|I/g, 'I').replace(/Ö/g, 'O').replace(/Ş/g, 'S').replace(/Ü/g, 'U')
    .replace(/[^A-Z0-9]/g, '');
}

// MARKA DURUM sekmesindeki marka listesi, marka adlarının tek ve resmi yazımıdır. Diğer tüm sekmelerde (aylık gelirler,
// ödeme listesi, satış tablosu) aynı markanın farklı yazımı gelirse bu yazıma çevrilir; böylece mükerrer satır oluşmaz.
// Türkçe büyük harf kuralı (i→İ) yabancı kökenli marka adlarını bozar; bunlar Latin I ile yazılır.
const BRAND_UPPER_FIXES = {
  'HERİTAGE': 'HERITAGE',
  'WİLDFRUİTS': 'WILDFRUITS',
  'PERSAN - PİCULET': 'PERSAN - PICULET',
};
let BRAND_CANON = {};
export function setBrandCanon(markaDurumRows) {
  const map = {};
  (Array.isArray(markaDurumRows) ? markaDurumRows : []).forEach((r) => {
    const name = String(r['MARKA'] || '').trim().replace(/\s+/g, ' ');
    if (name) {
      const up = name.toLocaleUpperCase('tr-TR');
      map[normalizeNameKey(name)] = BRAND_UPPER_FIXES[up] || up;
    }
  });
  BRAND_CANON = map;
}

// Marka / departman / gider / kategori isimleri tüm tablolarda BÜYÜK HARF gösterilir (Türkçe kurallarla: i→İ, ı→I).
// "RUMELİ BÖREK 3/4" gibi kesir eklerini temizler, bilinen yazım farklarını (CLIENT_ALIASES) tek isimde birleştirir.
// Fonksiyon adı geçmişten kaldı; artık başlık yazımı değil büyük harf döndürür.
function toTitleCaseTR(raw) {
  if (typeof raw !== 'string') return raw;
  let s = raw.trim().replace(/\s+\d+\/\d+$/, '').replace(/\s+/g, ' ').trim();
  if (!s) return s;
  const upper = s.toLocaleUpperCase('tr-TR');
  const aliased = CLIENT_ALIASES[upper] ? CLIENT_ALIASES[upper].toLocaleUpperCase('tr-TR') : upper;
  return BRAND_CANON[normalizeNameKey(aliased)] || aliased;
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
    expenseItemDefs.push(['DİĞER (SINIFLANDIRILMAMIŞ)', plugPerMonth]);
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

  const up = (t) => t.toLocaleUpperCase('tr-TR');
  return [
    { name: 'Personel', detay: 'Maaş, SGK, Yemek, Muhtasar', deger: personel, fill: '#2a78d6' },
    { name: 'Vergi', detay: 'Geçici Vergi - Kurumlar Vergisi', deger: vergi, fill: '#4a3aa7' },
    { name: 'Kira', detay: 'Kira Bedeli', deger: kira, fill: '#1baf7a' },
    { name: 'Krediler', detay: 'Kredi Ödemeleri', deger: krediler, fill: '#eda100' },
    { name: 'Demirbaş', detay: 'Demirbaş Yatırımı', deger: demirbas, fill: '#898781' },
    { name: 'Aidat', detay: 'Apartman Aidatları', deger: aidat, fill: '#e87ba4' },
    { name: 'Kıdem/İhbar', detay: 'Kıdem, İhbar, İzin', deger: kidem, fill: '#9085e9' },
    { name: 'Diğer', detay: 'Kalan tüm gider kalemleri', deger: diger, fill: '#eb6834' },
  ].map((c) => ({ ...c, name: up(c.name), detay: up(c.detay) }));
}

/* ------------------------------------------------------------------ */
/* DASH 26_RAW: pozisyon-bazlı hücrelerden ciro[] ve totals üretir     */
/* ------------------------------------------------------------------ */
export function parseDash26(dash26Raw) {
  const fallback = {
    ciro: new Array(12).fill(0),
    ciroUSD: new Array(12).fill(0),
    giderUSD: new Array(12).fill(0),
    kurUSD: new Array(12).fill(0),
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
  const kurUSD = monthRows.map((row) => num(row[15])); // P sütunu: aylık KUR USD
  const ayDurumu = monthRows.map((row) => {
    const raw = String(row[21] || '').trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');
    if (raw === 'güncel') return 'güncel';
    if (raw.startsWith('tahmin')) return 'tahmini';
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
    kurUSD,
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
// Vade tarihi: "2026-10-01" (Apps Script) veya "01.10.2026 00:00:00" -> Date (yerel gün başlangıcı)
function parseVade(v) {
  const t = String(v || '');
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

// Gecikme kovaları (gün): 0-30, 31-60, 61-90, 90+
export const YASLANDIRMA_KOVALARI = ['0-30 gün', '31-60 gün', '61-90 gün', '90+ gün'];
const kovaIndex = (gun) => (gun <= 30 ? 0 : gun <= 60 ? 1 : gun <= 90 ? 2 : 3);

// Dönüş: [marka, toplam, vadesiGecmis, gelecekVadeli, yas]. Vadesi bugünden önceyse "geçmiş" (TABLO sekmesindeki kırmızılar).
// yas.satirlar = [[vade 'YYYY-AA-GG', tutar, gecikme günü (vadesi gelmemişse 0)]] (marka ayrıntı penceresi için)
// yas = { enEski: en eski vadenin gecikme günü, gunTutar: Σ(tutar × gecikme günü), kovalar: [4 kova tutarı] }
// Vade tarihi, fatura kesiminden 30 gün sonrasıdır; gecikme günü = bugün − vade tarihi. Tutarlar KDV dahildir.
export function parseAlacaklar(odemeListesiRows, today = new Date()) {
  if (!Array.isArray(odemeListesiRows)) return [];
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const totals = {};
  odemeListesiRows.forEach((r) => {
    const firma = String(r['Firma'] || '').trim();
    const tutar = num(r['Tutar']);
    if (!firma) return; // genel toplam satırını atla
    const label = toTitleCaseTR(firma);
    const vade = parseVade(r['Ödeme Vadesi']);
    const gecmis = vade && vade < t0;
    const o = totals[label] || (totals[label] = { toplam: 0, gecmis: 0, gelecek: 0, enEski: 0, gunTutar: 0, kovalar: [0, 0, 0, 0], satir: {} });
    o.toplam += tutar;
    if (vade) { // TABLO sekmesi gibi: marka × vade günü kırılımı (aynı günün kalemleri toplanır)
      const key = `${vade.getFullYear()}-${String(vade.getMonth() + 1).padStart(2, '0')}-${String(vade.getDate()).padStart(2, '0')}`;
      o.satir[key] = (o.satir[key] || 0) + tutar;
    }
    if (gecmis) {
      const gun = Math.round((t0 - vade) / 86400000);
      o.gecmis += tutar;
      o.gunTutar += tutar * gun;
      o.enEski = Math.max(o.enEski, gun);
      o.kovalar[kovaIndex(gun)] += tutar;
    } else o.gelecek += tutar;
  });
  const r2 = (x) => Math.round(x * 100) / 100;
  return Object.entries(totals)
    .map(([name, o]) => [name, r2(o.toplam), r2(o.gecmis), r2(o.gelecek), { enEski: o.enEski, gunTutar: o.gunTutar, kovalar: o.kovalar.map(r2), satirlar: Object.keys(o.satir).sort().map((k) => { const v = parseVade(k); return [k, r2(o.satir[k]), v < t0 ? Math.round((t0 - v) / 86400000) : 0]; }) }])
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
/* SATIŞ TABLOSU 2026: fatura satırları (ay sekmeleri, _RAW grid)       */
/* ------------------------------------------------------------------ */
const SATIS_MONTH_KEYS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

function normalizeSheetKey(name) {
  return String(name)
    .replace(/İ/g, 'i')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function formatTarihTR(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(v || '');
}

// RAPOR DEPARTMAN değerleri sheet'te Türkçe karaktersiz / tutarsız yazılabiliyor; ekranda düzgün adlarla gösterilir
const DEPARTMAN_ADLARI = {
  'strateji pazarlama iletisimi': 'STRATEJİ PAZARLAMA İLETİŞİMİ',
  'performans pazarlama': 'PERFORMANS PAZARLAMA',
  'tasarim': 'TASARIM',
  'produksiyon': 'PRODÜKSİYON',
};
function departmanAdi(raw) {
  const t = String(raw || '').trim();
  if (!t) return 'BELİRSİZ';
  return DEPARTMAN_ADLARI[normalizeSheetKey(t)] || toTitleCaseTR(t);
}

export function parseSatisTablosu(json) {
  const rows = [];
  Object.keys(json || {}).forEach((key) => {
    if (!key.endsWith('_RAW')) return;
    const monthIdx = SATIS_MONTH_KEYS.indexOf(normalizeSheetKey(key.slice(0, -4)));
    if (monthIdx < 0) return;
    const grid = json[key] || [];
    if (!grid.length) return;

    // Sütunları başlık adından bul (sütun sırası değişse de bozulmaz)
    const header = grid[0].map((h) => normalizeSheetKey(h));
    const find = (pred) => header.findIndex(pred);
    const iTarih = find((h) => h.startsWith('tarih'));
    const iFirma = find((h) => h.startsWith('firma'));
    const iHizmet = find((h) => h === 'hizmet');
    const iAciklama = find((h) => h.startsWith('aciklama'));
    const iTutar = find((h) => h.startsWith('tutar'));
    // "RAPOR DEPARTMAN" sütunu; yoksa eski "DEPARTMANLAR" sütununa düşer
    let iDep = find((h) => h.includes('rapor') && h.includes('departman'));
    if (iDep < 0) iDep = find((h) => h.startsWith('departman'));
    if (iFirma < 0 || iTutar < 0) return;

    grid.slice(1).forEach((r) => {
      const firma = typeof r[iFirma] === 'string' ? r[iFirma].trim() : '';
      const tutar = r[iTutar];
      if (!firma || typeof tutar !== 'number') return; // toplam / boş satırları atla
      const hizmetRaw = String(iHizmet >= 0 ? r[iHizmet] || '' : '').trim().toLocaleUpperCase('tr-TR');
      const depRaw = iDep >= 0 ? String(r[iDep] || '').trim() : '';
      rows.push({
        ay: MONTHS[monthIdx],
        tarih: formatTarihTR(iTarih >= 0 ? r[iTarih] : ''),
        marka: toTitleCaseTR(firma),
        hizmet: hizmetRaw === 'FEE' ? 'FEE' : 'PROJE',
        departman: departmanAdi(depRaw),
        aciklama: iAciklama >= 0 ? String(r[iAciklama] || '').trim() : '',
        tutar,
      });
    });
  });
  return { rows, lastUpdated: json?._lastUpdated || null };
}

/* ------------------------------------------------------------------ */
/* ANA GİRİŞ NOKTASI                                                    */
/* ------------------------------------------------------------------ */
export async function fetchFinansData({ feeUrl, feeKey, odemeUrl, odemeKey, satisUrl, satisKey }) {
  const [feeRes, odemeRes] = await Promise.all([
    fetch(`${feeUrl}?key=${encodeURIComponent(feeKey)}`),
    fetch(`${odemeUrl}?key=${encodeURIComponent(odemeKey)}`),
  ]);

  if (!feeRes.ok) throw new Error(`FEE 2026 YENİ verisi alınamadı (HTTP ${feeRes.status})`);
  if (!odemeRes.ok) throw new Error(`MÜŞTERİDEN GELECEK ÖDEMELER verisi alınamadı (HTTP ${odemeRes.status})`);

  const feeJson = await feeRes.json();
  const odemeJson = await odemeRes.json();

  // Marka adı yazım farklarını tek isimde birleştirmek için resmi marka listesini önce kur
  setBrandCanon(feeJson['MARKA DURUM']);

  // SATIŞ TABLOSU 2026 (isteğe bağlı): hata verirse dashboard'un geri kalanı çalışmaya devam eder
  let satis = null;
  let satisError = null;
  if (satisUrl && satisKey) {
    // Apps Script zaman zaman geçici hata verebilir: en fazla 3 deneme
    for (let attempt = 0; attempt < 3 && !satis; attempt += 1) {
      try {
        const satisRes = await fetch(`${satisUrl}?key=${encodeURIComponent(satisKey)}`);
        if (!satisRes.ok) throw new Error(`HTTP ${satisRes.status}`);
        const satisJson = await satisRes.json();
        if (satisJson.error) throw new Error(satisJson.error);
        satis = parseSatisTablosu(satisJson);
        satisError = null;
      } catch (err) {
        satisError = err.message || String(err);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  if (feeJson.error) throw new Error(`FEE 2026 YENİ: ${feeJson.error}`);
  if (odemeJson.error) throw new Error(`MÜŞTERİDEN GELECEK ÖDEMELER: ${odemeJson.error}`);

  const { expenseItemDefs, giderPerMonth } = parseGiderler(feeJson['GİDERLER']);
  const giderYapisi = buildGiderKategorileri(expenseItemDefs);
  const { ciro, ciroUSD, giderUSD, kurUSD, nakitAkisiData, totals2026, totals2025, ayDurumu } = parseDash26(feeJson['DASH 26_RAW']);
  const revenueRaw = parseRevenueRaw(feeJson);
  const alacaklarData = parseAlacaklar(odemeJson['2026 ÖDEME LİSTESİ']);
  const tahminiProjeToplam = computeTahminiToplam(revenueRaw);

  // Genel kontrol: MARKA DURUM listesinde olmayan marka adları (olası yazım farkı / mükerrer) tarayıcı konsoluna yazılır
  try {
    const known = new Set(Object.values(BRAND_CANON));
    const seen = new Set();
    Object.values(revenueRaw).forEach((mo) => ['sabit', 'fee', 'fatura', 'diger'].forEach((c) => (mo[c] || []).forEach(([n]) => seen.add(n))));
    alacaklarData.forEach(([n]) => seen.add(n));
    (satis?.rows || []).forEach((r) => seen.add(r.marka));
    const unknown = [...seen].filter((n) => n && !known.has(n));
    if (unknown.length) console.warn('[Marka kontrolü] MARKA DURUM listesinde olmayan isimler:', unknown.sort());
  } catch (e) {
    /* kontrol hatası dashboard'u etkilemez */
  }
  const pasifMarkalar = parsePasifMarkalar(feeJson['MARKA DURUM']);

  return {
    months: MONTHS,
    ciro,
    ciroUSD,
    giderUSD,
    kurUSD,
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
    satis,
    satisError,
  };
}
