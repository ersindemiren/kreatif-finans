// SATIŞ TABLOSU 2026 sayfası — Gelirler sayfasıyla aynı şablon.
// Veri: parseData.js > parseSatisTablosu (ay sekmelerindeki fatura satırları)
import React, { useState, useMemo } from 'react';

const fmtTL = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtM = (n) => ((n || 0) / 1000000).toFixed(2).replace('.', ',') + ' M';
const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1).replace('.', ',') : '0,0') + '%';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';

export default function SatisTablosu({ satis, satisError, months, kurUSD }) {
  const [period, setPeriod] = useState('Toplam'); // 'Toplam' | 'Oca'..'Ara'
  const [brand, setBrand] = useState(''); // '' = tüm markalar
  const [gorunum, setGorunum] = useState('toplam'); // toplam | fee | proje
  const [currency, setCurrency] = useState('TL'); // TL | USD
  const sym = currency === 'USD' ? '$' : '₺';

  // USD görünümünde her satır, kendi ayının kuruyla (FEE 2026 YENİ > DASH 26 > KUR USD) çevrilir
  const rows = useMemo(() => {
    const base = satis?.rows || [];
    if (currency !== 'USD') return base;
    return base.map((r) => {
      const kur = kurUSD?.[months.indexOf(r.ay)] || 0;
      return { ...r, tutar: kur ? r.tutar / kur : 0 };
    });
  }, [satis, currency, kurUSD, months]);

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

  const sum = (list, hizmet) => list.reduce((s, r) => s + (!hizmet || r.hizmet === hizmet ? r.tutar : 0), 0);
  const totalAll = sum(scopedRows);
  const totalFee = sum(scopedRows, 'FEE');
  const totalProje = sum(scopedRows, 'PROJE');

  const rangeLabel = (() => {
    if (period !== 'Toplam') return period;
    if (!monthsWithData.length) return '';
    return monthsWithData.length === 1 ? monthsWithData[0] : `${monthsWithData[0]}-${monthsWithData[monthsWithData.length - 1]}`;
  })();

  const pillClass = (m, active) => {
    const has = monthsWithData.includes(m);
    if (has) return active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return active ? 'bg-rose-300 text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100';
  };

  // Marka bazlı dağılım (marka seçili değilken)
  const brandTable = useMemo(() => {
    const map = {};
    periodRows.forEach((r) => {
      if (gorunum === 'fee' && r.hizmet !== 'FEE') return;
      if (gorunum === 'proje' && r.hizmet !== 'PROJE') return;
      map[r.marka] = (map[r.marka] || 0) + r.tutar;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .filter((r) => r.amount !== 0)
      .sort((a, b) => b.amount - a.amount);
  }, [periodRows, gorunum]);
  const brandTableTotal = brandTable.reduce((s, r) => s + r.amount, 0);

  // Seçili markanın aylık dağılımı
  const brandMonthly = useMemo(() => {
    if (!brand) return [];
    return months
      .map((m) => {
        const list = rows.filter((r) => r.marka === brand && r.ay === m);
        return { ay: m, fee: sum(list, 'FEE'), proje: sum(list, 'PROJE'), toplam: sum(list), adet: list.length };
      })
      .filter((x) => x.adet > 0);
  }, [rows, brand, months]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!satis) {
    return (
      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Satış Tablosu bağlı değil</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {satisError
            ? `Veri alınamadı: ${satisError}`
            : 'VITE_SATIS_URL ve VITE_SATIS_KEY ortam değişkenleri tanımlanınca SATIŞ TABLOSU 2026 verisi burada görünür.'}
        </p>
      </div>
    );
  }

  const selectCls = `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer max-w-[60%] ${
    brand
      ? 'bg-slate-900 text-white border-slate-900'
      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
  }`;

  const Box = ({ label, value }) => (
    <div className={`${CARD} p-4`}>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{sym}{fmtM(value)}</div>
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

      {!brand ? (
        <div className={`${CARD} p-5`}>
          <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Satış Dağılımı</h2>
          <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 w-fit mb-4 mt-3">
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
          <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="w-5 shrink-0" />
            <span className="flex-1">Marka</span>
            <span className="w-12 sm:w-14 text-right shrink-0">Pay</span>
            <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
          </div>
          <div className="flex flex-col">
            {brandTable.map((b, i) => (
              <button
                key={b.name}
                onClick={() => setBrand(b.name)}
                className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="text-xs text-slate-400 dark:text-slate-500 w-5 tabular-nums shrink-0">{i + 1}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">{b.name}</span>
                <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(brandTableTotal ? b.amount / brandTableTotal : 0)}</span>
                <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-20 sm:w-28 text-right shrink-0">{sym}{fmtTL(b.amount)}</span>
              </button>
            ))}
            <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
              <span className="w-5 shrink-0" />
              <span className="text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
              <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(brandTableTotal ? 1 : 0)}</span>
              <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-20 sm:w-28 text-right shrink-0">{sym}{fmtTL(brandTableTotal)}</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {period === 'Toplam' && (
            <div className={`${CARD} p-5`}>
              <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Aylık Dağılım</h2>
              <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <span className="flex-1">Ay</span>
                <span className="w-16 sm:w-24 text-right shrink-0">Fee</span>
                <span className="w-16 sm:w-24 text-right shrink-0">Proje</span>
                <span className="w-20 sm:w-28 text-right shrink-0">Toplam</span>
              </div>
              {brandMonthly.map((m) => (
                <button
                  key={m.ay}
                  onClick={() => setPeriod(m.ay)}
                  className="w-full flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{m.ay}</span>
                  <span className="text-xs sm:text-sm tabular-nums text-slate-500 w-16 sm:w-24 text-right shrink-0">{m.fee ? fmtTL(m.fee) : '–'}</span>
                  <span className="text-xs sm:text-sm tabular-nums text-slate-500 w-16 sm:w-24 text-right shrink-0">{m.proje ? fmtTL(m.proje) : '–'}</span>
                  <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-20 sm:w-28 text-right shrink-0">{sym}{fmtTL(m.toplam)}</span>
                </button>
              ))}
              <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex-1">Toplam</span>
                <span className="text-xs sm:text-sm tabular-nums font-semibold w-16 sm:w-24 text-right shrink-0">{fmtTL(totalFee)}</span>
                <span className="text-xs sm:text-sm tabular-nums font-semibold w-16 sm:w-24 text-right shrink-0">{fmtTL(totalProje)}</span>
                <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-20 sm:w-28 text-right shrink-0">{sym}{fmtTL(totalAll)}</span>
              </div>
            </div>
          )}

          <div className={`${CARD} p-5`}>
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Fatura Kalemleri</h2>
            <div className="flex flex-col">
              {scopedRows.length === 0 && <p className="text-sm text-slate-500">Bu dönemde kayıt yok.</p>}
              {scopedRows.map((r, i) => (
                <div key={i} className="py-2.5 border-b border-slate-50 dark:border-slate-800 flex flex-col gap-1">
                  <div className="flex items-start gap-3">
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0">{r.aciklama || r.departman}</span>
                    <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium shrink-0">{sym}{fmtTL(r.tutar)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 dark:text-slate-500">
                    {hizmetBadge(r.hizmet)}
                    <span>{r.tarih}</span>
                    <span>·</span>
                    <span>{r.departman}</span>
                    {r.fatura && (
                      <>
                        <span>·</span>
                        <span>{r.fatura}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
