// SATIŞ TABLOSU 2026 sayfası — Gelirler sayfasıyla aynı şablon.
// Veri: parseData.js > parseSatisTablosu (ay sekmelerindeki fatura satırları)
import React, { useState, useMemo } from 'react';

const fmtTL = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtM = (n) => ((n || 0) / 1000000).toFixed(2).replace('.', ',') + ' M';
// Kutu özetleri: 1 milyonun altında 3 basamak korunur (TL: ₺340 B, ₺34,3 B, ₺3,43 B — USD: $230 K, $23,3 K, $2,50 K)
const sig3 = (v) => {
  const a = Math.abs(v);
  return (a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)).replace('.', ',');
};
function fmtBox(n, sym, currency) {
  const v = n || 0;
  const a = Math.abs(v);
  const suffix = currency === 'USD' ? ' K' : ' B';
  if (a >= 999500) return `${sym}${(v / 1e6).toFixed(2).replace('.', ',')} M`;
  if (a >= 1000) {
    const k = v / 1000;
    if (Math.abs(Number(sig3(k).replace(',', '.'))) >= 1000) return `${sym}${(v / 1e6).toFixed(2).replace('.', ',')} M`;
    return `${sym}${sig3(k)}${suffix}`;
  }
  return `${sym}${sig3(v)}`;
}
const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1).replace('.', ',') : '0,0') + '%';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';

export default function SatisTablosu({ satis, satisError, months, kurUSD, ozet }) {
  const [period, setPeriod] = useState('Toplam'); // 'Toplam' | 'Oca'..'Ara'
  const [brand, setBrand] = useState(''); // '' = tüm markalar
  const [gorunum, setGorunum] = useState('toplam'); // toplam | fee | proje
  const [currency, setCurrency] = useState('TL'); // TL | USD
  const sym = currency === 'USD' ? '$' : '₺';

  // Kur kaybı referansı: DASH 26'daki son GÜNCEL ayın kuru. Ay kapanıp güncel olunca referans otomatik kayar.
  const guncelIdx = useMemo(() => {
    let last = -1;
    (ozet?.ayDurumu || []).forEach((d, i) => {
      if (d === 'güncel') last = i;
    });
    return last;
  }, [ozet]);
  const kurGuncel = guncelIdx >= 0 ? kurUSD?.[guncelIdx] || 0 : 0;
  const guncelAy = guncelIdx >= 0 ? months[guncelIdx] : '';

  // USD görünümünde her satır, kendi ayının kuruyla (FEE 2026 YENİ > DASH 26 > KUR USD) çevrilir.
  // kayip: o ay alınan tutarın, güncel kura göre USD cinsinden kaybı = tutar/kur_ay − tutar/kur_güncel
  const rows = useMemo(() => {
    const base = satis?.rows || [];
    if (currency !== 'USD') return base;
    return base.map((r) => {
      const mi = months.indexOf(r.ay);
      const kur = kurUSD?.[mi] || 0;
      const usd = kur ? r.tutar / kur : 0;
      const kayip = kur && kurGuncel && mi <= guncelIdx ? usd - r.tutar / kurGuncel : 0;
      return { ...r, tutar: usd, kayip };
    });
  }, [satis, currency, kurUSD, months, kurGuncel, guncelIdx]);

  const monthsWithData = useMemo(() => {
    const set = new Set(rows.map((r) => r.ay));
    return months.filter((m) => set.has(m));
  }, [rows, months]);

  const inPeriod = (r) => period === 'Toplam' || r.ay === period;

  // Seçili dönemdeki satırlar (marka filtresi hariç) — marka listesi bunlardan çıkar
  const periodRows = useMemo(() => rows.filter(inPeriod), [rows, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandOptions = useMemo(() => {
    const names = new Set(periodRows.map((r) => r.marka));
    if (brand) names.add(brand);
    return [...names].sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [periodRows, brand]);

  const scopedRows = brand ? periodRows.filter((r) => r.marka === brand) : periodRows;

  // Kur kaybı özeti (yalnızca $ görünümü): ağırlıklı oran = toplam kayıp $ / toplam gelirin $ karşılığı
  const lossOf = (list) => {
    const base = list.reduce((a, r) => a + (r.tutar || 0), 0);
    const loss = list.reduce((a, r) => a + (r.kayip || 0), 0);
    return { loss, ratio: base ? loss / base : 0 };
  };
  const showLoss = currency === 'USD' && kurGuncel > 0;
  const fmtLossPct = (v) => `%${(v * 100).toFixed(1).replace('.', ',')}`;

  const sum = (list, hizmet) => list.reduce((s, r) => s + (!hizmet || r.hizmet === hizmet ? r.tutar : 0), 0);
  // Fatura kalemleri listesi, Toplam / Fee / Proje seçimine göre süzülür
  const listRows = scopedRows.filter((r) => gorunum === 'toplam' || (gorunum === 'fee' ? r.hizmet === 'FEE' : r.hizmet === 'PROJE'));
  const listTotal = sum(listRows);
  const totalAll = sum(scopedRows);
  const totalFee = sum(scopedRows, 'FEE');
  const totalProje = sum(scopedRows, 'PROJE');

  const rangeLabel = (() => {
    if (period !== 'Toplam') return period;
    if (!monthsWithData.length) return '';
    return monthsWithData.length === 1 ? monthsWithData[0] : `${monthsWithData[0]}-${monthsWithData[monthsWithData.length - 1]}`;
  })();

  // Seçili markanın fatura kestiği aylar (marka seçiliyken ay şeridinde kullanılır)
  const brandActiveMonths = useMemo(() => {
    if (!brand) return null;
    return new Set(rows.filter((r) => r.marka === brand).map((r) => r.ay));
  }, [rows, brand]);

  const pillClass = (m, active) => {
    const has = monthsWithData.includes(m);
    if (has && brandActiveMonths && !brandActiveMonths.has(m)) {
      // Marka bu ay fatura kesmemiş: pasif, açık gri
      return active ? 'bg-slate-400 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200';
    }
    if (has) return active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return active ? 'bg-rose-300 text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100';
  };

  // Marka bazlı dağılım (marka seçili değilken)
  const brandTable = useMemo(() => {
    const map = {};
    const lossMap = {};
    periodRows.forEach((r) => {
      if (gorunum === 'fee' && r.hizmet !== 'FEE') return;
      if (gorunum === 'proje' && r.hizmet !== 'PROJE') return;
      map[r.marka] = (map[r.marka] || 0) + r.tutar;
      lossMap[r.marka] = (lossMap[r.marka] || 0) + (r.kayip || 0);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount, loss: lossMap[name] || 0 }))
      .filter((r) => r.amount !== 0)
      .sort((a, b) => b.amount - a.amount);
  }, [periodRows, gorunum]);
  const brandTableTotal = brandTable.reduce((s, r) => s + r.amount, 0);

  // Departman bazlı dağılım (RAPOR DEPARTMAN sütunu)
  const deptTable = useMemo(() => {
    const map = {};
    periodRows.forEach((r) => {
      if (brand && r.marka !== brand) return;
      if (gorunum === 'fee' && r.hizmet !== 'FEE') return;
      if (gorunum === 'proje' && r.hizmet !== 'PROJE') return;
      map[r.departman] = (map[r.departman] || 0) + r.tutar;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .filter((r) => r.amount !== 0)
      .sort((a, b) => b.amount - a.amount);
  }, [periodRows, gorunum, brand]);
  const deptTableTotal = deptTable.reduce((s, r) => s + r.amount, 0);

  // Seçili markanın aylık dağılımı
  const brandMonthly = useMemo(() => {
    if (!brand) return [];
    return months
      .map((m) => {
        const list = rows.filter((r) => r.marka === brand && r.ay === m);
        const l = lossOf(list);
        return { ay: m, fee: sum(list, 'FEE'), proje: sum(list, 'PROJE'), toplam: sum(list), adet: list.length, loss: l.loss, ratio: l.ratio };
      })
      .filter((x) => x.adet > 0);
  }, [rows, brand, months]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!satis) {
    return (
      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Satış Tablosu bağlı değil</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {satisError
            ? `Veri alınamadı: ${satisError}${/404/.test(satisError) ? ' — VITE_SATIS_URL adresi bulunamadı. Apps Script web uygulaması URL\'sinin /exec ile bittiğini ve erişimin "Herkes" olduğunu kontrol edin.' : ''}`
            : 'VITE_SATIS_URL ve VITE_SATIS_KEY ortam değişkenleri tanımlanınca SATIŞ TABLOSU 2026 verisi burada görünür.'}
        </p>
      </div>
    );
  }

  const selectCls = `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer max-w-xs ${
    brand
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
  }`;

  const Box = ({ label, value }) => (
    <div className={`${CARD} p-4`}>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{fmtBox(value, sym, currency)}</div>
      {rangeLabel && <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({rangeLabel})</span>}
    </div>
  );

  const hizmetBadge = (h) => (
    <span
      className={`shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 ${
        h === 'FEE' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
      }`}
    >
      {h === 'FEE' ? 'Fee' : 'Proje'}
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-end">
          <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
            {[['TL', '₺'], ['USD', '$']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCurrency(key)}
                className={`w-9 py-1 rounded-md text-sm font-medium transition-colors ${
                  currency === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => {
              setPeriod('Toplam');
              setBrand('');
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === 'Toplam' && !brand ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Toplam
          </button>
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectCls}>
            <option value="">Marka Seç</option>
            {brandOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => setPeriod(m)}
              className={`px-2 py-1.5 rounded-lg text-sm font-medium text-center transition-colors ${pillClass(m, period === m)}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {brand && (
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-xl text-slate-900 dark:text-slate-50">{brand}</h2>
          <button onClick={() => setBrand('')} className="text-xs text-slate-500 border border-slate-300 dark:border-slate-600 rounded-full px-2.5 py-0.5 hover:bg-slate-100">
            Tüm markalar
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Box label={period === 'Toplam' ? 'Toplam Satış' : `${period} Satış`} value={totalAll} />
        <Box label="Aylık Fee" value={totalFee} />
        <Box label="Proje" value={totalProje} />
      </div>

      {showLoss && (() => {
        const scope = scopedRows.filter((r) => gorunum === 'toplam' || (gorunum === 'fee' ? r.hizmet === 'FEE' : r.hizmet === 'PROJE'));
        const l = lossOf(scope);
        return (
          <div className={`${CARD} p-4 flex items-center justify-between gap-3`}>
            <div className="min-w-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">Kur Kaynaklı Kayıp</span>
              <div className="text-base sm:text-xl font-semibold text-rose-600 tabular-nums mt-1 whitespace-nowrap">
                {fmtLossPct(l.ratio)} <span className="text-slate-300 dark:text-slate-600 font-normal">·</span> −${fmtTL(l.loss)}
              </div>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 text-right leading-snug">
              Her ayın tutarı, güncel ay ({guncelAy}) kuruna ({kurGuncel.toFixed(2).replace('.', ',')}) göre
            </span>
          </div>
        );
      })()}

      <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 w-fit">
          {[
            { key: 'toplam', label: 'Toplam' },
            { key: 'fee', label: 'Fee' },
            { key: 'proje', label: 'Proje' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setGorunum(opt.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                gorunum === opt.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Departman Bazlı Satış Dağılımı</h2>
          <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="w-4 sm:w-5 shrink-0" />
            <span className="flex-1">Departman</span>
            <span className="w-12 sm:w-14 text-right shrink-0">Pay</span>
            <span className="w-[4.5rem] sm:w-28 text-right shrink-0">Tutar</span>
          </div>
          {deptTable.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
              <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
              <span className="text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">{d.name}</span>
              <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(deptTableTotal ? d.amount / deptTableTotal : 0)}</span>
              <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">{sym}{fmtTL(d.amount)}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
            <span className="w-4 sm:w-5 shrink-0" />
            <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
            <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(deptTableTotal ? 1 : 0)}</span>
            <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">{sym}{fmtTL(deptTableTotal)}</span>
          </div>
        </div>
      </div>

      {!brand ? (
        <div className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Satış Dağılımı</h2>
          <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="w-4 sm:w-5 shrink-0" />
            <span className="flex-1">Marka</span>
            <span className="w-12 sm:w-14 text-right shrink-0">Pay</span>
            <span className="w-[4.5rem] sm:w-28 text-right shrink-0">Tutar</span>
            {showLoss && <span className="w-14 sm:w-24 text-right shrink-0">Kur Kaybı</span>}
          </div>
          <div className="flex flex-col">
            {brandTable.map((b, i) => (
              <button
                key={b.name}
                onClick={() => setBrand(b.name)}
                className="flex items-center gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
                <span className="text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">{b.name}</span>
                <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(brandTableTotal ? b.amount / brandTableTotal : 0)}</span>
                <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">{sym}{fmtTL(b.amount)}</span>
                {showLoss && (
                  <span className="w-14 sm:w-24 text-right shrink-0 leading-tight">
                    <span className="block text-xs tabular-nums text-rose-600">{fmtLossPct(b.amount ? b.loss / b.amount : 0)}</span>
                    <span className="block text-[10px] tabular-nums text-slate-400">−${fmtTL(b.loss)}</span>
                  </span>
                )}
              </button>
            ))}
            <div className="flex items-center gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
              <span className="w-4 sm:w-5 shrink-0" />
              <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
              <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(brandTableTotal ? 1 : 0)}</span>
              <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">{sym}{fmtTL(brandTableTotal)}</span>
              {showLoss && (() => {
                const tl = brandTable.reduce((a, b) => a + b.loss, 0);
                return (
                  <span className="w-14 sm:w-24 text-right shrink-0 leading-tight">
                    <span className="block text-xs tabular-nums font-semibold text-rose-600">{fmtLossPct(brandTableTotal ? tl / brandTableTotal : 0)}</span>
                    <span className="block text-[10px] tabular-nums text-slate-400">−${fmtTL(tl)}</span>
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <>
          {period === 'Toplam' && (
            <div className={`${CARD} p-5`}>
              <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Aylık Dağılım</h2>
              <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span className="flex-1">Ay</span>
                <span className={`text-right shrink-0 w-14 sm:w-24`}>Fee</span>
                <span className="w-14 sm:w-24 text-right shrink-0">Proje</span>
                <span className="w-16 sm:w-28 text-right shrink-0">Toplam</span>
                {showLoss && <span className="w-14 sm:w-24 text-right shrink-0">Kur Kaybı</span>}
              </div>
              {brandMonthly.map((m) => (
                <button
                  key={m.ay}
                  onClick={() => setPeriod(m.ay)}
                  className="w-full flex items-center gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex-1">{m.ay}</span>
                  <span className={`text-[11px] sm:text-sm tabular-nums text-slate-500 text-right shrink-0 w-14 sm:w-24`}>
                    {m.fee ? fmtTL(m.fee) : '–'}
                  </span>
                  <span className="text-[11px] sm:text-sm tabular-nums text-slate-500 w-14 sm:w-24 text-right shrink-0">{m.proje ? fmtTL(m.proje) : '–'}</span>
                  <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">{sym}{fmtTL(m.toplam)}</span>
                  {showLoss && (
                    <span className="w-14 sm:w-24 text-right shrink-0 leading-tight">
                      <span className="block text-xs tabular-nums text-rose-600">{fmtLossPct(m.ratio)}</span>
                      <span className="block text-[10px] tabular-nums text-slate-400">−${fmtTL(m.loss)}</span>
                    </span>
                  )}
                </button>
              ))}
              <div className="flex items-center gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex-1">Toplam</span>
                <span className={`text-[11px] sm:text-sm tabular-nums font-semibold text-right shrink-0 w-14 sm:w-24`}>{fmtTL(totalFee)}</span>
                <span className="text-[11px] sm:text-sm tabular-nums font-semibold w-14 sm:w-24 text-right shrink-0">{fmtTL(totalProje)}</span>
                <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">{sym}{fmtTL(totalAll)}</span>
                {showLoss && (() => {
                  const l = lossOf(brandMonthly.map((m) => ({ tutar: m.toplam, kayip: m.loss })));
                  return (
                    <span className="w-14 sm:w-24 text-right shrink-0 leading-tight">
                      <span className="block text-xs tabular-nums font-semibold text-rose-600">{fmtLossPct(l.ratio)}</span>
                      <span className="block text-[10px] tabular-nums text-slate-400">−${fmtTL(l.loss)}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
          )}

          <div className={`${CARD} p-5`}>
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Fatura Kalemleri</h2>
            <div className="flex flex-col">
              {listRows.length === 0 && <p className="text-sm text-slate-500">Bu dönemde kayıt yok.</p>}
              {listRows.map((r, i) => (
                <div key={i} className="py-2.5 border-b border-slate-50 dark:border-slate-800 flex flex-col gap-1">
                  <div className="flex items-start gap-3">
                    <span className="text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0">{r.aciklama || r.departman}</span>
                    <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium shrink-0">{sym}{fmtTL(r.tutar)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 dark:text-slate-500">
                    {hizmetBadge(r.hizmet)}
                    <span>{r.tarih}</span>
                    <span>·</span>
                    <span>{r.departman}</span>
                  </div>
                </div>
              ))}
              {listRows.length > 0 && (
                <div className="flex items-center gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1">Toplam</span>
                  <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold shrink-0">{sym}{fmtTL(listTotal)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {ozet && (
        <div className={`${CARD} p-5`}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50">Aylık Gelir - Gider Özeti</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Gelirler ve giderler FEE 2026 YENİ dosyasından gelir; $ görünümü her ayın kuruyla (DASH 26) hesaplanır. Yeşil nokta güncel, kırmızı nokta tahmini aydır.</p>
          <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="w-12 sm:w-20 shrink-0">Aylar</span>
            <span className="flex-1 min-w-0 text-right">Gelirler</span>
            <span className="flex-1 min-w-0 text-right">Giderler</span>
            <span className="flex-1 min-w-0 text-right">Fark</span>
            <span className="w-9 sm:w-14 text-right shrink-0">%</span>
          </div>
          {(() => {
            const gel = (i) => (currency === 'USD' ? ozet.ciroUSD?.[i] : ozet.ciro?.[i]) || 0;
            const gid = (i) => (currency === 'USD' ? ozet.giderUSD?.[i] : ozet.gider?.[i]) || 0;
            const idx = months.map((_, i) => i);
            const guncelList = idx.filter((i) => ozet.ayDurumu?.[i] === 'güncel');
            const money = (v) => `${v < 0 ? '−' : ''}${sym}${fmtTL(Math.abs(v))}`;
            const tot = (list) => {
              const g = list.reduce((a, i) => a + gel(i), 0);
              const d = list.reduce((a, i) => a + gid(i), 0);
              return { g, d, f: g - d, o: g ? (g - d) / g : 0 };
            };
            const cell = 'flex-1 min-w-0 text-[11px] sm:text-sm tabular-nums text-right';
            const pctCell = 'w-9 sm:w-14 shrink-0 text-[11px] sm:text-sm tabular-nums text-right';
            const gridCls = 'flex items-center gap-1.5 sm:gap-3';
            const rowsEl = idx.map((i) => {
              const durum = ozet.ayDurumu?.[i];
              const g = gel(i);
              const d = gid(i);
              return (
                <div key={i} className={`${gridCls} py-2 border-b border-slate-50 dark:border-slate-800`}>
                  <span className="w-12 sm:w-20 shrink-0 text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${durum === 'güncel' ? 'bg-emerald-500' : 'bg-rose-300'}`} />
                    {months[i]}
                  </span>
                  <span className={`${cell} text-slate-700 dark:text-slate-300`}>{money(g)}</span>
                  <span className={`${cell} text-slate-700 dark:text-slate-300`}>{money(d)}</span>
                  <span className={`${cell} text-slate-900 dark:text-slate-50 font-medium`}>{money(g - d)}</span>
                  <span className={`${pctCell} text-slate-400`}>{g ? Math.round(((g - d) / g) * 100) : 0}%</span>
                </div>
              );
            });
            const totRow = (label, list, strong) => {
              const t = tot(list);
              return (
                <div className={`${gridCls} py-2.5 ${strong ? 'mt-1 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg' : 'border-t border-slate-100 dark:border-slate-800'}`}>
                  <span className="w-12 sm:w-20 shrink-0 text-[10px] sm:text-xs font-semibold text-slate-900 dark:text-slate-50 uppercase leading-tight">{label}</span>
                  <span className={`${cell} font-bold text-slate-900 dark:text-slate-50`}>{money(t.g)}</span>
                  <span className={`${cell} font-bold text-slate-900 dark:text-slate-50`}>{money(t.d)}</span>
                  <span className={`${cell} font-bold text-slate-900 dark:text-slate-50`}>{money(t.f)}</span>
                  <span className={`${pctCell} font-semibold text-slate-500`}>{Math.round(t.o * 100)}%</span>
                </div>
              );
            };
            return (
              <>
                {rowsEl}
                {totRow('Güncel', guncelList, false)}
                {totRow('Toplam', idx, true)}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
