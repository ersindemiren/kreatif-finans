// FEE TAKİP sekmesi: markaların hizmet bazlı aylık fee geçmişi (son 3 yıl).
// Kurallar: boş hücre = 0 (hizmet yok). Yarım ay (kıst) başlayan markalarda ilk ay fiyat değişimi sayılmaz.
// Bu dosyanın bağımlılığı yok: marka adı eşleme fonksiyonları `deps` ile dışarıdan verilir (önizleme dosyasıyla aynı kod çalışır).

export const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const ftTxt = (v) => String(v === null || v === undefined ? '' : v).trim();

// "1.040.000", "8.000,00", 87719 ... hepsi sayıya çevrilir; boş / okunamayan = 0
export function parseTRNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = ftTxt(v).replace(/[₺\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// "35%", "%35", 0.35, 35 → 0.35 ; boş/okunamayan → null
export function parseOran(v) {
  if (v === null || v === undefined || ftTxt(v) === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? (v > 1 ? v / 100 : v) : null;
  const str = ftTxt(v);
  if (!/\d/.test(str)) return null;
  const n = parseTRNumber(str.replace('%', ''));
  return str.includes('%') ? n / 100 : n > 1 ? n / 100 : n;
}

// "27.05.2020" veya ISO tarih → { y, m (0-11), d, label, t }
export function parseTarih(v) {
  const s = ftTxt(v);
  if (!s) return null;
  let y; let m; let d;
  const tr = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (tr) {
    d = Number(tr[1]); m = Number(tr[2]) - 1; y = Number(tr[3]);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const dt = s.includes('T') ? new Date(s) : null;
    if (dt && !Number.isNaN(dt.getTime())) {
      y = dt.getFullYear(); m = dt.getMonth(); d = dt.getDate();
    } else {
      y = Number(s.slice(0, 4)); m = Number(s.slice(5, 7)) - 1; d = Number(s.slice(8, 10));
    }
  } else {
    return null;
  }
  const pad = (n) => String(n).padStart(2, '0');
  return { y, m, d, label: `${pad(d)}.${pad(m + 1)}.${y}`, t: y * 12 + m };
}

export const tLabel = (t) => `${AY_KISA[((t % 12) + 12) % 12]} ${Math.floor(t / 12)}`;
export const tLabelUzun = (t) => `${AY_ADLARI[((t % 12) + 12) % 12]} ${Math.floor(t / 12)}`;

/* ------------------------------------------------------------------ */
/* 1) HAM GRID → MARKA LİSTESİ                                          */
/* ------------------------------------------------------------------ */
export function parseFeeTakip(grid, deps) {
  const { normalizeNameKey, resolveName } = deps;
  const rows = Array.isArray(grid) ? grid : [];
  const nk = (s) => normalizeNameKey(s);
  const firstFilled = (r) => {
    for (let i = 1; i < (r || []).length; i += 1) if (ftTxt(r[i]) !== '') return r[i];
    return '';
  };
  const nextHasStart = (i) => {
    for (let j = i + 1; j <= i + 2 && j < rows.length; j += 1) {
      if (nk(ftTxt((rows[j] || [])[0])).startsWith('HIZMETBASLANGIC')) return true;
    }
    return false;
  };

  // Sayfanın en üstü: "2027 FİYAT GÜNCELLEME ORANI" + altındaki oran hücresi
  let oran2027 = null;
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const r = rows[i] || [];
    for (let j = 0; j < r.length; j += 1) {
      const m = /^(\d{4})FIYATGUNCELLEMEORANI$/.exec(nk(ftTxt(r[j])));
      if (!m) continue;
      const below = (rows[i + 1] || [])[j];
      const o = parseOran(ftTxt(below) !== '' ? below : r[j + 1]);
      if (o !== null) oran2027 = { yil: Number(m[1]), oran: o };
    }
  }

  const raw = [];
  let cur = null;
  let block = null;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i] || [];
    const c0 = ftTxt(r[0]);
    if (!c0) continue;
    const k0 = nk(c0);
    const othersEmpty = r.slice(1).every((v) => ftTxt(v) === '');
    if (othersEmpty && nextHasStart(i)) {
      cur = { title: c0, startRaw: '', updRaw: '', blocks: [] };
      raw.push(cur);
      block = null;
      continue;
    }
    if (!cur) continue;
    if (k0.startsWith('HIZMETBASLANGIC')) {
      cur.startRaw = firstFilled(r);
      // marka bazlı oran: etiket bu satırda, değer hemen altındaki satırda (veya sağında)
      for (let j = 1; j < r.length; j += 1) {
        const m = /^(\d{4})FIYATGUNCELLEMEORANI$/.exec(nk(ftTxt(r[j])));
        if (!m) continue;
        const below = (rows[i + 1] || [])[j];
        const o = parseOran(ftTxt(below) !== '' ? below : r[j + 1]);
        if (o !== null) cur.oran = { yil: Number(m[1]), oran: o };
      }
      continue;
    }
    if (k0.startsWith('FIYATGUNCELLEME')) { cur.updRaw = firstFilled(r); continue; }
    const yearMatch = /(\d{4})\s+AYLIK\s+FEE/i.exec(c0);
    if (yearMatch && nk(ftTxt(r[1])) === 'OCAK') {
      block = { year: Number(yearMatch[1]), services: [], sheetTotal: null };
      cur.blocks.push(block);
      continue;
    }
    if (!block) continue;
    const vals = Array.from({ length: 12 }, (_, m) => parseTRNumber(r[m + 1]));
    if (k0 === 'TOPLAM') {
      block.sheetTotal = vals;
      block = null;
    } else {
      block.services.push({ name: c0, vals });
    }
  }

  const brands = [];
  raw.forEach((b) => {
    if (!b.blocks.length) return;
    const name = resolveName(b.title) || String(b.title).toLocaleUpperCase('tr-TR');
    const start = parseTarih(b.startRaw);
    const upd = parseTarih(b.updRaw);
    const years = [...new Set(b.blocks.map((x) => x.year))].sort((a, c) => a - c);
    const tMin = years[0] * 12;

    // hizmetler: anahtar = normalize edilmiş ad; etiket = en yeni yıldaki yazım
    const svc = new Map();
    const byYear = [...b.blocks].sort((a, c) => a.year - c.year);
    byYear.forEach((blk) => {
      blk.services.forEach((s) => {
        const key = nk(s.name);
        if (!svc.has(key)) svc.set(key, { key, label: s.name, vals: new Map() });
        const o = svc.get(key);
        o.label = s.name;
        s.vals.forEach((v, m) => {
          const t = blk.year * 12 + m;
          o.vals.set(t, (o.vals.get(t) || 0) + v);
        });
      });
    });
    const services = [...svc.values()].map((o) => ({ key: o.key, label: o.label.toLocaleUpperCase('tr-TR'), vals: o.vals }));

    // Sonda hiç tutar girilmemiş yıllar (örn. boş 2027 tablosu) analizden ayrılır; tahmin için ayrıca kullanılır
    const yearHas = (y) => services.some((sv) => { for (let m = 0; m < 12; m += 1) if ((sv.vals.get(y * 12 + m) || 0) > 0) return true; return false; });
    const planYears = [];
    while (years.length > 1 && !yearHas(years[years.length - 1])) planYears.unshift(years.pop());
    const tMax = years[years.length - 1] * 12 + 11;

    const series = [];
    const sheetTotalWarn = [];
    for (let t = tMin; t <= tMax; t += 1) {
      let total = 0;
      services.forEach((s) => { total += s.vals.get(t) || 0; });
      series.push({ t, total });
    }
    b.blocks.forEach((blk) => {
      if (!blk.sheetTotal || blk.year > years[years.length - 1]) return;
      blk.sheetTotal.forEach((v, m) => {
        const t = blk.year * 12 + m;
        const comp = series[t - tMin]?.total || 0;
        if (Math.abs(comp - v) > 1) sheetTotalWarn.push({ t, sheet: v, hesap: comp });
      });
    });

    brands.push({ name, startRaw: ftTxt(b.startRaw), updRaw: ftTxt(b.updRaw), start, upd, tMin, tMax, years, planYears, services, series, sheetTotalWarn, oran: b.oran || oran2027 });
  });
  return brands;
}

/* ------------------------------------------------------------------ */
/* 2) ANALİZ: olaylar, uyarılar, ayrıştırma, yorumlar                   */
/* ------------------------------------------------------------------ */
export const ftMoney = (n) => Math.round(n).toLocaleString('tr-TR');
export const ftPct = (x, signed = true) => `${signed ? (x > 0 ? '+' : x < 0 ? '−' : '') : ''}%${(Math.abs(x) * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0).replace('.', ',')}`;

const ftTotalAt = (brand, t) => (t < brand.tMin || t > brand.tMax ? 0 : brand.series[t - brand.tMin].total);

// iki ay arasındaki hizmet bazlı fark (fiyat / yeni / iptal)
export function decompose(brand, fromT, toT) {
  const items = [];
  let before = 0; let after = 0; let fiyat = 0; let yeni = 0; let iptal = 0;
  brand.services.forEach((s) => {
    const a = s.vals.get(fromT) || 0;
    const b = s.vals.get(toT) || 0;
    if (!a && !b) return;
    before += a; after += b;
    let tip = 'sabit';
    if (a === 0 && b > 0) { tip = 'yeni'; yeni += b; }
    else if (a > 0 && b === 0) { tip = 'iptal'; iptal += a; }
    else if (Math.abs(b - a) > 0.5) { tip = 'fiyat'; fiyat += b - a; }
    items.push({ key: s.key, label: s.label, before: a, after: b, diff: b - a, pct: a > 0 ? (b - a) / a : null, tip });
  });
  return { fromT, toT, before, after, fiyat, yeni, iptal, items, brandNew: before === 0 && after > 0 };
}

export function analyzeBrand(brand, nowT) {
  const cm = Math.min(Math.max(nowT, brand.tMin), brand.tMax);
  const { tMin, tMax, series } = brand;
  const tot = (t) => ftTotalAt(brand, t);
  const firstActive = series.find((p) => p.total > 0)?.t ?? null;
  const events = [];
  const spikeSkip = new Set();
  const warnings = [];
  const kistT = brand.start && brand.start.d > 1 && brand.start.t >= tMin ? brand.start.t : null;

  if (firstActive !== null) {
    // marka başlangıcı
    if (brand.start && brand.start.t >= tMin) events.push({ t: firstActive, tip: 'baslangic', amount: tot(firstActive), kist: kistT === firstActive });
    else if (!brand.start && firstActive > tMin) events.push({ t: firstActive, tip: 'baslangic', amount: tot(firstActive), kist: false });

    let lastActiveT = firstActive;
    for (let t = firstActive + 1; t <= tMax; t += 1) {
      const pt = tot(t - 1);
      const ct = tot(t);
      if (ct === 0 && pt > 0) { events.push({ t, tip: 'ara', amount: pt }); continue; }
      if (ct === 0) continue;
      const resume = pt === 0;
      const baseT = resume ? lastActiveT : t - 1;
      if (resume) events.push({ t, tip: 'devam', amount: ct, ara: t - lastActiveT - 1 });
      brand.services.forEach((s) => {
        const pv = s.vals.get(baseT) || 0;
        const cv = s.vals.get(t) || 0;
        const nv = t + 1 <= tMax ? s.vals.get(t + 1) || 0 : null;
        if (spikeSkip.has(`${t}|${s.key}`)) return;
        if (!resume && pv > 0 && cv > 0 && Math.abs(cv - pv) > 0.5 && nv !== null && Math.abs(nv - pv) <= 0.5) {
          events.push({ t, tip: 'sapma', svc: s.label, from: pv, to: cv });
          spikeSkip.add(`${t + 1}|${s.key}`);
          return;
        }
        if (pv === 0 && cv > 0) events.push({ t, tip: 'eklendi', svc: s.label, to: cv, afterGap: resume });
        else if (pv > 0 && cv === 0) events.push({ t, tip: 'bitti', svc: s.label, from: pv, afterGap: resume });
        else if (pv > 0 && cv > 0 && Math.abs(cv - pv) > 0.5) {
          if (kistT !== null && t === kistT + 1) return; // yarım aydan tam aya geçiş fiyat değişimi sayılmaz
          events.push({ t, tip: 'fiyat', svc: s.label, from: pv, to: cv, pct: (cv - pv) / pv, afterGap: resume });
        }
      });
      lastActiveT = t;
    }
  }
  events.sort((a, b) => a.t - b.t);

  // fiyat değişimi tarihleri (planlanan aylar hariç)
  const priceTs = [...new Set(events.filter((e) => e.tip === 'fiyat' && e.t <= cm).map((e) => e.t))];
  const lastPriceT = priceTs.length ? Math.max(...priceTs) : null;

  // --- tarih uyarıları (sheet tarihi ↔ veriden hesaplanan) ---
  if (brand.upd && brand.upd.t > cm) {
    // sheet'teki tarih ileri bir tarihse planlanan güncellemedir; geçmişle karşılaştırılmaz
  } else if (brand.upd) {
    if (lastPriceT === null) {
      if (brand.upd.t >= tMin) warnings.push({ tip: 'tarih', text: `Sheet'te fiyat güncelleme tarihi ${brand.upd.label} yazıyor ama veride bu dönemde fiyat değişimi görünmüyor.` });
    } else if (brand.upd.t !== lastPriceT) {
      warnings.push({ tip: 'tarih', text: `Fiyat güncelleme tarihi uyuşmuyor: sheet ${brand.upd.label}, veriye göre son fiyat değişimi ${tLabelUzun(lastPriceT)}.` });
    }
  } else if (lastPriceT !== null) {
    warnings.push({ tip: 'tarih', text: `Sheet'te fiyat güncelleme tarihi boş; veriye göre son fiyat değişimi ${tLabelUzun(lastPriceT)}.` });
  }
  if (firstActive !== null && brand.start) {
    if (brand.start.t >= tMin && brand.start.t !== firstActive) {
      warnings.push({ tip: 'baslangic', text: `Hizmet başlangıç tarihi ${brand.start.label} ama ilk fee ${tLabelUzun(firstActive)} ayında görünüyor.` });
    } else if (brand.start.t < tMin && firstActive > tMin) {
      warnings.push({ tip: 'baslangic', text: `Hizmet başlangıç tarihi ${brand.start.label} ama ilk fee ${tLabelUzun(firstActive)} ayında görünüyor.` });
    }
  }
  brand.sheetTotalWarn.slice(0, 3).forEach((w) => warnings.push({ tip: 'toplam', text: `${tLabelUzun(w.t)}: sheet'teki TOPLAM ₺${ftMoney(w.sheet)}, hizmetlerin toplamı ₺${ftMoney(w.hesap)}.` }));

  // --- metrikler ---
  const cur = tot(cm);
  const prev12 = tot(cm - 12);
  const degisim = prev12 > 0 ? cur / prev12 - 1 : null;
  let peak = 0; let peakT = cm;
  for (let t = Math.max(tMin, cm - 11); t <= cm; t += 1) if (tot(t) > peak) { peak = tot(t); peakT = t; }
  const startT = brand.start ? brand.start.t : firstActive;
  const age = startT !== null && startT !== undefined ? cm - startT : null;
  const sincePrice = lastPriceT !== null ? cm - lastPriceT : age;
  const aktifHizmet = brand.services.filter((s) => (s.vals.get(cm) || 0) > 0).length;
  const spark = [];
  for (let t = cm - 23; t <= cm; t += 1) spark.push(tot(t));

  const badges = [];
  if (firstActive !== null && firstActive > tMin && startT !== null && cm - startT <= 6) badges.push('Yeni');
  if (cur === 0 || (peak > 0 && cur / peak <= 0.8)) badges.push('Düştü');
  if (cur > 0 && sincePrice !== null && sincePrice >= 12 && !badges.includes('Yeni')) badges.push('Artış bekliyor');

  // 2027 tahmini: sheet'teki 2027 tablosu boşsa, Aralık ayındaki aktif hizmetlere oran uygulanır
  let proj = null;
  if (brand.oran && firstActive !== null) {
    const Y = brand.oran.yil;
    const decT = (Y - 1) * 12 + 11;
    if (!brand.years.includes(Y) && decT >= tMin && decT <= tMax) {
      const rows = [];
      let toplam = 0; let onceki = 0;
      brand.services.forEach((sv) => {
        const v = sv.vals.get(decT) || 0;
        if (v <= 0) return;
        const nv = Math.round(v * (1 + brand.oran.oran));
        const vals = new Map();
        for (let m = 0; m < 12; m += 1) vals.set(Y * 12 + m, nv);
        rows.push({ key: sv.key, label: sv.label, vals, from: v, to: nv });
        toplam += nv; onceki += v;
      });
      if (rows.length) proj = { yil: Y, oran: brand.oran.oran, services: rows, aylik: toplam, onceki };
    }
  }

  const periods = [
    { id: 'son12', label: 'Son 12 ay', ...decompose(brand, cm - 12, cm) },
    { id: 'onceki12', label: 'Önceki 12 ay', ...decompose(brand, cm - 24, cm - 12) },
  ];

  // yıllık özet
  const yillik = brand.years.map((y) => {
    let toplam = 0; let aktif = 0; let sonAy = 0;
    for (let m = 0; m < 12; m += 1) {
      const v = tot(y * 12 + m);
      toplam += v;
      if (v > 0) aktif += 1;
    }
    for (let m = 11; m >= 0; m -= 1) { const v = tot(y * 12 + m); if (v > 0) { sonAy = v; break; } }
    return { yil: y, toplam, ortalama: aktif ? toplam / aktif : 0, sonAy, aktif, kismi: y * 12 + 11 > cm };
  });
  yillik.forEach((y, i) => { y.sonAyDegisim = i > 0 && yillik[i - 1].sonAy > 0 && y.sonAy > 0 ? y.sonAy / yillik[i - 1].sonAy - 1 : null; });

  // --- yorumlar ---
  const comments = [];
  const son12 = periods[0];
  if (cur === 0) {
    comments.push({ tone: 'bad', text: `${tLabelUzun(cm)} ayında aktif fee görünmüyor.` });
  } else if (degisim !== null) {
    comments.push({ tone: degisim > 0 ? 'good' : degisim < 0 ? 'bad' : 'info', text: `Güncel aylık fee ₺${ftMoney(cur)}; 12 ay önce ₺${ftMoney(prev12)} idi (${ftPct(degisim)}).` });
    const parts = [];
    if (Math.abs(son12.fiyat) > 0.5) parts.push(`mevcut hizmetlerde fiyat değişimi ${son12.fiyat > 0 ? '+' : '−'}₺${ftMoney(Math.abs(son12.fiyat))}`);
    if (son12.yeni > 0) parts.push(`yeni hizmet +₺${ftMoney(son12.yeni)}`);
    if (son12.iptal > 0) parts.push(`sona eren hizmet −₺${ftMoney(son12.iptal)}`);
    if (parts.length) comments.push({ tone: 'info', text: `Değişimin kaynağı: ${parts.join(', ')}.` });
  } else if (startT !== null && startT !== undefined) {
    comments.push({ tone: 'info', text: `Marka ${brand.start ? brand.start.label : tLabelUzun(firstActive)} tarihinde başladı; güncel aylık fee ₺${ftMoney(cur)}.` });
  }
  if (cur > 0 && sincePrice !== null && sincePrice >= 12) {
    comments.push({ tone: 'warn', text: `${lastPriceT !== null ? `Son fiyat değişimi ${tLabelUzun(lastPriceT)}` : 'Başlangıçtan bu yana fiyat değişimi yok'}; ${sincePrice} aydır güncelleme yapılmadı. Fiyat artışı gündeme alınabilir.` });
  }
  if (cur > 0 && peak > 0 && cur / peak <= 0.8) {
    comments.push({ tone: 'bad', text: `Aylık fee son 12 aydaki zirveden (${tLabel(peakT)}: ₺${ftMoney(peak)}) ${ftPct(Math.abs(cur / peak - 1), false)} düştü.` });
  }
  if (lastPriceT !== null) {
    const last = events.filter((e) => e.tip === 'fiyat' && e.t === lastPriceT && e.pct > 0);
    if (last.length >= 3) {
      const sorted = [...last].sort((a, b) => b.pct - a.pct);
      const hi = sorted[0]; const lo = sorted[sorted.length - 1];
      if (hi.pct - lo.pct >= 0.15) comments.push({ tone: 'info', text: `${tLabelUzun(lastPriceT)} artışında oranlar hizmete göre farklı: en yüksek ${hi.svc} (${ftPct(hi.pct)}), en düşük ${lo.svc} (${ftPct(lo.pct)}).` });
    }
  }
  // kısa süreli hizmetler
  const kisa = [];
  brand.services.forEach((s) => {
    let runStart = null;
    for (let t = tMin; t <= tMax + 1; t += 1) {
      const v = t <= tMax ? s.vals.get(t) || 0 : 0;
      if (v > 0 && runStart === null) runStart = t;
      if (v === 0 && runStart !== null) {
        const len = t - runStart;
        if (len <= 3 && t - 1 < cm && runStart !== kistT) kisa.push(`${s.label} (${len === 1 ? tLabel(runStart) : `${tLabel(runStart)}–${tLabel(t - 1)}`}, ${len} ay)`);
        runStart = null;
      }
    }
  });
  if (kisa.length) comments.push({ tone: 'info', text: `Kısa süreli hizmetler: ${kisa.join('; ')}. Kalıcı hizmet mi, proje mi netleştirilebilir.` });
  const sapmalar = events.filter((e) => e.tip === 'sapma');
  if (sapmalar.length) comments.push({ tone: 'info', text: `Tek aylık sapma: ${sapmalar.map((e) => `${e.svc} ${tLabel(e.t)} (₺${ftMoney(e.to)}, diğer aylar ₺${ftMoney(e.from)})`).join('; ')}. Veri girişi ya da geçici kampanya olabilir; fiyat değişimi sayılmadı.` });
  events.filter((e) => e.tip === 'ara').forEach((e) => {
    const resume = events.find((x) => x.tip === 'devam' && x.t > e.t);
    comments.push({ tone: 'info', text: `Hizmete ara verilmiş: ${tLabel(e.t)}${resume && resume.t - 1 > e.t ? `–${tLabel(resume.t - 1)}` : ''}${resume ? '' : ' sonrası'} fee yok${resume ? `; ${tLabelUzun(resume.t)} ayında yeniden başladı` : ''}.` });
  });
  if (kistT !== null && brand.start) comments.push({ tone: 'info', text: `${tLabelUzun(kistT)} ayı yarım ay (hizmet ${brand.start.label} tarihinde başladı); tam aya geçiş fiyat değişimi sayılmadı.` });

  return {
    ...brand, cm, firstActive, events, lastPriceT, warnings, cur, prev12, degisim, peak, peakT, age, sincePrice, aktifHizmet, spark, badges, periods, yillik, comments, kistT, proj,
  };
}

export function analyzeFeeTakip(brands, now = new Date()) {
  const nowT = now.getFullYear() * 12 + now.getMonth();
  const list = (brands || []).map((b) => analyzeBrand(b, nowT)).sort((a, b) => b.cur - a.cur || a.name.localeCompare(b.name, 'tr'));
  const cm = list.length ? Math.min(nowT, Math.max(...list.map((b) => b.tMax))) : nowT;
  let cur = 0; let prev12 = 0; let fiyat = 0; let yeni = 0; let iptal = 0;
  list.forEach((b) => {
    cur += b.cur; prev12 += b.prev12;
    fiyat += b.periods[0].fiyat; yeni += b.periods[0].yeni; iptal += b.periods[0].iptal;
  });
  const warnings = [];
  list.forEach((b) => b.warnings.forEach((w) => warnings.push({ marka: b.name, ...w })));
  return { nowT: cm, list, totals: { cur, prev12, fiyat, yeni, iptal }, warnings };
}
