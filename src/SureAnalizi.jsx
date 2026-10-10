// Süre Analizi: markalara harcanan süre, saatlik baza göre tüketilen bütçe ve fee ile farkı.
// Süre: src/data/sureler.json (zaman takip raporu). Fee: FEE 2026 YENİ aylık gelirleri (KDV hariç).
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import sureData from './data/sureler.json';
import { buildSure, FEE_BAZI } from './lib/sure.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtSigned = (n) => (n < 0 ? '−' : '') + fmtN(Math.abs(n));
const fmtTL = (n) => (n < 0 ? '−' : '') + '₺' + fmtN(Math.abs(n));
const fmtSaat = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');

export default function SureAnalizi({ months, ayDurumu, revenueRaw }) {
  const [selected, setSelected] = useState('Toplam');
  const [seciliMarka, setSeciliMarka] = useState(null);

  useEffect(() => {
    if (!seciliMarka) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSeciliMarka(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seciliMarka]);

  const { brands, disi } = useMemo(() => buildSure({ rows: sureData.rows, months, ayDurumu, revenueRaw }), [months, ayDurumu, revenueRaw]);

  const guncelIdx = months.map((_, i) => i).filter((i) => ayDurumu?.[i] === 'güncel');
  const periodIdx = selected === 'Toplam' ? guncelIdx : [months.indexOf(selected)];
  const rangeLabel = guncelIdx.length ? `${months[guncelIdx[0]]}-${months[guncelIdx[guncelIdx.length - 1]]}` : '';

  const calc = (b, idxs) => {
    const hours = idxs.reduce((s, i) => s + b.hours[i], 0);
    const saatBaz = idxs.reduce((s, i) => s + b.hours[i] * FEE_BAZI[i], 0);
    const fee = idxs.reduce((s, i) => s + b.fee[i], 0);
    return { hours, saatBaz, fee, fark: saatBaz - fee };
  };

  const rows = brands
    .map((b) => ({ ...b, ...calc(b, periodIdx) }))
    .filter((r) => r.hours > 0);
  const faturali = rows.filter((r) => r.faturali).sort((a, b) => b.hours - a.hours);
  const faturasiz = rows.filter((r) => !r.faturali).sort((a, b) => b.hours - a.hours);
  const markaDisi = disi.map((b) => ({ ...b, ...calc(b, periodIdx) })).filter((r) => r.hours > 0);

  const toplam = [...faturali, ...faturasiz, ...markaDisi].reduce((s, r) => s + r.hours, 0);
  const aktif = faturali.reduce((s, r) => s + r.hours, 0);
  const atil = toplam - aktif;
  const toplamFark = [...faturali, ...faturasiz].reduce((s, r) => s + r.fark, 0);

  const pillClass = (m, active) => {
    const i = months.indexOf(m);
    const durum = ayDurumu?.[i];
    if (durum === 'güncel') return active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return 'bg-rose-50 text-rose-300 cursor-not-allowed';
  };

  const farkTone = (v) => (v > 0 ? 'text-emerald-700 dark:text-emerald-400' : v < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400');

  const Row = ({ r, i, kirmizi, soluk }) => (
    <div className="flex items-start gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
      <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i}</span>
      {r.tip === 'marka' ? (
        <button
          type="button"
          onClick={() => setSeciliMarka(r.name)}
          className={`text-[11px] sm:text-sm text-left hover:underline underline-offset-2 flex-1 min-w-0 break-words ${kirmizi ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
        >
          {r.name}
          {!r.eslesti && <span className="ml-1.5 text-[10px] font-medium border border-amber-300 text-amber-600 rounded-full px-1.5 py-0.5 align-middle">eşleşmedi</span>}
        </button>
      ) : (
        <span className={`text-[11px] sm:text-sm flex-1 min-w-0 break-words ${soluk ? 'text-slate-400 dark:text-slate-500' : ''}`}>{r.name}</span>
      )}
      <span className={`text-[11px] sm:text-sm tabular-nums w-16 sm:w-24 text-right shrink-0 leading-tight ${kirmizi ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
        {fmtSaat(r.hours)} sa
        <span className="block text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">{pct1(toplam ? r.hours / toplam : 0)}</span>
      </span>
      <span className={`text-[11px] sm:text-sm tabular-nums font-medium w-[4.75rem] sm:w-32 text-right shrink-0 ${r.tip === 'marka' ? (kirmizi ? 'text-rose-600 dark:text-rose-400' : farkTone(r.fark)) : 'text-slate-300 dark:text-slate-600'}`}>
        {r.tip === 'marka' ? fmtTL(r.fark) : '–'}
      </span>
    </div>
  );

  let sira = 0;
  const lightboxBrand = seciliMarka ? brands.find((b) => b.name === seciliMarka) : null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-serif text-2xl sm:text-3xl text-slate-900 dark:text-slate-50">Süre Analiz</h1>

      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center w-full">
          <button
            onClick={() => setSelected('Toplam')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selected === 'Toplam' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Toplam
          </button>
        </div>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5">
          {months.map((m, i) => (
            <button
              key={m}
              disabled={ayDurumu?.[i] !== 'güncel'}
              onClick={() => setSelected(m)}
              className={`px-2 py-1.5 rounded-lg text-sm font-medium text-center transition-colors ${pillClass(m, selected === m)}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          ['Toplam Süre', toplam],
          ['Aktif Süre', aktif],
          ['Atıl Süre', atil],
        ].map(([label, v]) => (
          <div key={label} className={`${CARD} p-4`}>
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
            <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{fmtN(v)} Saat</div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({selected === 'Toplam' ? rangeLabel : selected})</span>
          </div>
        ))}
      </div>

      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Süre Dağılımı</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Süre, zaman takip raporundan gelir. Fark = harcanan süre × saatlik baz − aynı dönemin fee geliri (KDV hariç). Fee faturası kesilmeyen markalar listenin sonunda kırmızıdır. Marka adına tıklayınca aylık ayrıntı açılır.
        </p>
        <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span className="w-4 sm:w-5 shrink-0" />
          <span className="flex-1 min-w-0">Marka</span>
          <span className="w-16 sm:w-24 text-right shrink-0">Süre</span>
          <span className="w-[4.75rem] sm:w-32 text-right shrink-0">Fark</span>
        </div>
        <div className="flex flex-col">
          {faturali.map((r) => <Row key={r.name} r={r} i={++sira} />)}
          {faturasiz.length > 0 && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-rose-500 pt-4 pb-1">Faturası kesilmeyen markalar</div>
          )}
          {faturasiz.map((r) => <Row key={r.name} r={r} i={++sira} kirmizi />)}
          {markaDisi.length > 0 && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 pt-4 pb-1">Marka dışı süreler</div>
          )}
          {markaDisi.map((r) => <Row key={r.name} r={r} i="·" soluk />)}
          <div className="flex items-start gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
            <span className="w-4 sm:w-5 shrink-0" />
            <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
            <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-16 sm:w-24 text-right shrink-0">{fmtSaat(toplam)} sa</span>
            <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.75rem] sm:w-32 text-right shrink-0">{fmtTL(toplamFark)}</span>
          </div>
        </div>
      </div>

      {lightboxBrand && (() => {
        const idx = months.map((_, i) => i);
        const aktifIdx = idx.filter((i) => ayDurumu?.[i] === 'güncel');
        const t = calc(lightboxBrand, aktifIdx);
        const bazOrt = aktifIdx.length ? aktifIdx.reduce((s, i) => s + FEE_BAZI[i], 0) / aktifIdx.length : 0;
        const grid = 'grid grid-cols-[3.2rem_1fr_1fr_1.2fr_1.2fr_1.2fr] sm:grid-cols-[4.5rem_1fr_1fr_1.2fr_1.2fr_1.2fr]';
        const cellCls = 'px-1.5 sm:px-3 py-1.5 sm:py-2 text-right tabular-nums';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50" onClick={() => setSeciliMarka(null)} role="dialog" aria-modal="true" aria-label={`${seciliMarka} süre ayrıntısı`}>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setSeciliMarka(null)} aria-label="Kapat" className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
              <h2 className="font-serif text-xl text-slate-900 dark:text-slate-50 pr-8">{lightboxBrand.name}</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4">Aylık harcanan süreler, Fee bazına göre tüketilen bütçe, Fee arasındaki fark</p>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] sm:text-sm">
                <div className={`${grid} bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 leading-tight`}>
                  <span className={`${cellCls} text-left`}>Ay</span>
                  <span className={cellCls}>Süre</span>
                  <span className={cellCls}>Fee Bazı</span>
                  <span className={cellCls}>Saat x Baz</span>
                  <span className={cellCls}>Mevcut Fee</span>
                  <span className={cellCls}>Fark</span>
                </div>
                {idx.map((i) => {
                  const on = ayDurumu?.[i] === 'güncel';
                  const h = lightboxBrand.hours[i];
                  const saatBaz = h * FEE_BAZI[i];
                  const fee = lightboxBrand.fee[i];
                  const fark = saatBaz - fee;
                  return (
                    <div key={i} className={`${grid} border-t border-slate-100 dark:border-slate-800 ${on ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                      <span className={`${cellCls} text-left`}>{months[i]}</span>
                      <span className={cellCls}>{on ? fmtSaat(h) : '–'}</span>
                      <span className={cellCls}>{fmtN(FEE_BAZI[i])}</span>
                      <span className={cellCls}>{on ? fmtN(saatBaz) : '–'}</span>
                      <span className={cellCls}>{on ? (fee ? fmtN(fee) : '–') : '–'}</span>
                      <span className={`${cellCls} font-medium ${on && h + fee > 0 ? (fark >= 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200') : ''}`}>
                        {on && h + fee > 0 ? fmtSigned(fark) : '–'}
                      </span>
                    </div>
                  );
                })}
                <div className={`${grid} border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-slate-50`}>
                  <span className={`${cellCls} text-left`}>Toplam</span>
                  <span className={cellCls}>{fmtSaat(t.hours)}</span>
                  <span className={cellCls}>{fmtN(bazOrt)}</span>
                  <span className={cellCls}>{fmtN(t.saatBaz)}</span>
                  <span className={cellCls}>{fmtN(t.fee)}</span>
                  <span className={`${cellCls} ${t.fark >= 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200'}`}>{fmtSigned(t.fark)}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">Tutarlar ₺ ve KDV hariçtir. Fark = Saat x Baz − Mevcut Fee. Yalnızca güncel aylar hesaba katılır; toplamdaki Fee Bazı güncel ayların ortalamasıdır.{!lightboxBrand.faturali ? ' Bu markaya Ocak-Eylül arasında fatura kesilmemiştir.' : ''}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
