// Süre Analizi: markalara harcanan süre, saatlik baza göre tüketilen bütçe ve fee ile farkı.
// Süre: src/data/sureler.json (zaman takip raporu). Fee + Proje: SATIŞ TABLOSU 2026 faturaları (KDV hariç).
// Fatura durumu: Satış Tablosu. Satış Tablosu'nda olup süre girilmemiş markalar 0 süreyle listelenir.
import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import sureData from './data/sureler.json';
import { buildSure, FEE_BAZI } from './lib/sure.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtSaat = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');

// Fark = Saat x Baz − Fee. Pozitif: fee'den fazla zaman harcanmış (kırmızı). Negatif: fee içinde kalınmış (yeşil). Eksi işareti gösterilmez.
const farkText = (v) => (Math.round(v) > 0 ? 'text-rose-600 dark:text-rose-400' : Math.round(v) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400');
const farkCell = (v) => (Math.round(v) > 0 ? 'bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200' : Math.round(v) < 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : '');

export default function SureAnalizi({ months, ayDurumu, revenueRaw, satisRows }) {
  const [selected, setSelected] = useState('Toplam');
  const [seciliMarka, setSeciliMarka] = useState(null);

  useEffect(() => {
    if (!seciliMarka) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSeciliMarka(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seciliMarka]);

  const { brands, disi } = useMemo(
    () => buildSure({ rows: sureData.rows, months, ayDurumu, revenueRaw, satisRows }),
    [months, ayDurumu, revenueRaw, satisRows]
  );

  const guncelIdx = months.map((_, i) => i).filter((i) => ayDurumu?.[i] === 'güncel');
  const periodIdx = selected === 'Toplam' ? guncelIdx : [months.indexOf(selected)];
  const rangeLabel = guncelIdx.length ? `${months[guncelIdx[0]]}-${months[guncelIdx[guncelIdx.length - 1]]}` : '';

  // Fark yalnızca süre girilmiş aylar için hesaplanır; süre girilmemiş ayın fee'si farka katılmaz
  const calc = (b, idxs) => {
    let hours = 0;
    let saatBaz = 0;
    let fee = 0;
    let fark = 0;
    idxs.forEach((i) => {
      hours += b.hours[i];
      saatBaz += b.hours[i] * FEE_BAZI[i];
      fee += b.fee[i] + b.proje[i];
      if (b.hours[i] > 0) fark += b.hours[i] * FEE_BAZI[i] - (b.fee[i] + b.proje[i]);
    });
    return { hours, saatBaz, fee, fark, faturali: idxs.some((i) => b.faturali[i]) };
  };

  const rows = brands.map((b) => ({ ...b, ...calc(b, periodIdx) })).filter((r) => r.hours > 0 || r.faturali);
  const faturali = rows.filter((r) => r.faturali).sort((a, b) => b.hours - a.hours);
  const faturasiz = rows.filter((r) => !r.faturali).sort((a, b) => b.hours - a.hours);
  // Kreatif iç süresine TL değer atanmaz (fark 0); atanmamış süre saat x baz ile değerlenir
  const markaDisi = disi.map((b) => { const c = calc(b, periodIdx); return { ...b, ...c, fark: b.tip === 'ic' ? 0 : c.fark }; }).filter((r) => r.hours > 0);

  // Marka dışı ve atanmamış süreler gelir getirmez: fark = saat x baz
  const icRows = markaDisi.filter((r) => r.tip === 'ic');
  const atanmamisRows = markaDisi.filter((r) => r.tip === 'atanmamis');
  const grp = (list) => ({ hours: list.reduce((s, r) => s + r.hours, 0), fark: list.reduce((s, r) => s + r.fark, 0) });
  const gFaturali = grp(faturali);
  const gFaturasiz = grp(faturasiz);
  const gIc = grp(icRows);
  const gAtanmamis = grp(atanmamisRows);
  const gAtil = { hours: gIc.hours + gAtanmamis.hours, fark: gIc.fark + gAtanmamis.fark };
  const genel = { hours: gFaturali.hours + gFaturasiz.hours + gIc.hours + gAtanmamis.hours, fark: gFaturali.fark + gFaturasiz.fark + gIc.fark + gAtanmamis.fark };
  const toplam = genel.hours;
  const aktif = gFaturali.hours;
  const kayip = gFaturasiz.hours;
  const atil = gIc.hours + gAtanmamis.hours; // Atanmamış Süre kartı: iç süre + markaya atanmamış

  const pillClass = (m, active) => {
    const durum = ayDurumu?.[months.indexOf(m)];
    if (durum === 'güncel') return active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return 'bg-rose-50 text-rose-300 cursor-not-allowed';
  };

  const COL_SURE = 'w-[4.25rem] sm:w-28';
  const COL_FARK = 'w-[5.25rem] sm:w-32';

  const Row = ({ r, i, kirmizi, soluk }) => {
    const sureYok = r.hours === 0;
    return (
      <div className="flex items-start gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm leading-5">
        <span className="text-slate-400 dark:text-slate-500 w-5 sm:w-6 text-right tabular-nums shrink-0">{i}</span>
        <span className="flex-1 min-w-0 break-words text-left">
          {r.tip === 'marka' ? (
            <button
              type="button"
              onClick={() => setSeciliMarka(r.name)}
              className={`text-left hover:underline underline-offset-2 ${kirmizi ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              {r.name}
            </button>
          ) : (
            <span className={soluk ? 'text-slate-400 dark:text-slate-500' : ''}>{r.name}</span>
          )}
          {!r.eslesti && <span className="ml-1.5 text-[10px] font-medium border border-amber-300 text-amber-600 rounded-full px-1.5 py-0.5 align-middle whitespace-nowrap">eşleşmedi</span>}
          {sureYok && <span className="ml-1.5 text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-0.5 align-middle whitespace-nowrap">süre girilmemiş</span>}
        </span>
        <span className={`tabular-nums ${COL_SURE} text-right shrink-0 leading-tight whitespace-nowrap ${kirmizi ? 'text-rose-600 dark:text-rose-400' : sureYok ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
          {fmtN(r.hours)} sa
          <span className="block text-[10px] sm:text-[11px] leading-4 text-slate-400 dark:text-slate-500">{pct1(toplam ? r.hours / toplam : 0)}</span>
        </span>
        <span className={`tabular-nums font-medium ${COL_FARK} text-right shrink-0 whitespace-nowrap ${sureYok && r.tip === 'marka' ? 'text-slate-300 dark:text-slate-600' : farkText(r.fark)}`}>
          {sureYok && r.tip === 'marka' ? '–' : '₺' + fmtN(Math.abs(r.fark))}
        </span>
      </div>
    );
  };

  let sira = 0;
  const lightboxBrand = seciliMarka ? brands.find((b) => b.name === seciliMarka) : null;

  return (
    <div className="flex flex-col gap-5">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {[
          ['Toplam Süre', toplam],
          ['Aktif Süre', aktif],
          ['Atanmamış Süre', atil],
          ['Kayıp Süre', kayip],
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
          Fark = harcanan süre × saatlik baz − aynı dönemin Fee + Proje faturası (Satış Tablosu, KDV hariç). Kırmızı: fee'den fazla zaman harcanmış, yeşil: fee içinde kalınmış. Satış Tablosu'nda faturası olup süresi girilmemiş markalar 0 süreyle listelenir; faturası kesilmeyen markalar sonda kırmızıdır. Marka adına tıklayınca aylık ayrıntı açılır.
        </p>
        <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span className="w-5 sm:w-6 shrink-0" />
          <span className="flex-1 min-w-0">Marka</span>
          <span className={`${COL_SURE} text-right shrink-0`}>Süre</span>
          <span className={`${COL_FARK} text-right shrink-0`}>Fark</span>
        </div>
        <div className="flex flex-col">
          {faturali.map((r) => <Row key={r.name} r={r} i={++sira} />)}
          {faturasiz.length > 0 && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-rose-500 pt-4 pb-1">Faturası kesilmeyen markalar</div>
          )}
          {faturasiz.map((r) => <Row key={r.name} r={r} i={++sira} kirmizi />)}
          {markaDisi.length > 0 && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 pt-4 pb-1">Atanmamış süreler</div>
          )}
          {markaDisi.map((r) => <Row key={r.name} r={r} i="·" soluk />)}
          <div className="mt-3 pt-1 border-t-2 border-slate-200 dark:border-slate-700">
            {[
              ['Faturalı Markalar', gFaturali, 'text-slate-700 dark:text-slate-300'],
              ['Kayıp Süre', gFaturasiz, 'text-rose-600 dark:text-rose-400'],
              ['Atanmamış Süre', gAtil, 'text-slate-700 dark:text-slate-300'],
            ].map(([label, g, c]) => (
              <div key={label} className="flex items-start gap-2 sm:gap-3 py-2 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm leading-5">
                <span className="w-5 sm:w-6 shrink-0" />
                <span className={`flex-1 min-w-0 ${c}`}>{label}</span>
                <span className={`tabular-nums ${COL_SURE} text-right shrink-0 whitespace-nowrap ${c}`}>{fmtN(g.hours)} sa</span>
                <span className={`tabular-nums font-medium ${COL_FARK} text-right shrink-0 whitespace-nowrap ${farkText(g.fark)}`}>{'₺' + fmtN(Math.abs(g.fark))}</span>
              </div>
            ))}
            <div className="flex items-start gap-2 sm:gap-3 pt-3 text-[11px] sm:text-sm leading-5 font-bold text-slate-900 dark:text-slate-50">
              <span className="w-5 sm:w-6 shrink-0" />
              <span className="flex-1 min-w-0">Genel Toplam</span>
              <span className={`tabular-nums ${COL_SURE} text-right shrink-0 whitespace-nowrap`}>{fmtN(genel.hours)} sa</span>
              <span className={`tabular-nums ${COL_FARK} text-right shrink-0 whitespace-nowrap ${farkText(genel.fark)}`}>₺{fmtN(Math.abs(genel.fark))}</span>
            </div>
          </div>
        </div>
      </div>

      {lightboxBrand && (() => {
        const idx = months.map((_, i) => i);
        const aktifIdx = idx.filter((i) => ayDurumu?.[i] === 'güncel');
        const t = calc(lightboxBrand, aktifIdx);
        const bazOrt = aktifIdx.length ? aktifIdx.reduce((s, i) => s + FEE_BAZI[i], 0) / aktifIdx.length : 0;
        const grid = 'grid grid-cols-[2.75rem_repeat(5,minmax(0,1fr))] sm:grid-cols-[4rem_repeat(5,minmax(0,1fr))]';
        const cell = 'px-1 sm:px-3 py-1.5 sm:py-2 text-center tabular-nums whitespace-nowrap';
        const hic = !lightboxBrand.faturali.some(Boolean);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50" onClick={() => setSeciliMarka(null)} role="dialog" aria-modal="true" aria-label={`${seciliMarka} süre ayrıntısı`}>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setSeciliMarka(null)} aria-label="Kapat" className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
              <h2 className="font-serif text-xl text-slate-900 dark:text-slate-50 pr-8">{lightboxBrand.name}</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mb-4">Aylık harcanan süreler, Baz'a göre tüketilen bütçe, Fee + Proje arasındaki fark</p>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] sm:text-sm">
                <div className={`${grid} bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 leading-tight items-center`}>
                  <span className={`${cell} text-left`}>Ay</span>
                  <span className={cell}>Süre</span>
                  <span className={cell}>Baz</span>
                  <span className={cell}>Saat x Baz</span>
                  <span className={cell}>Fee + Proje</span>
                  <span className={cell}>Fark</span>
                </div>
                {idx.map((i) => {
                  const on = ayDurumu?.[i] === 'güncel';
                  const h = lightboxBrand.hours[i];
                  const saatBaz = h * FEE_BAZI[i];
                  const fee = lightboxBrand.fee[i] + lightboxBrand.proje[i];
                  const fark = saatBaz - fee;
                  const farkVar = on && h > 0;
                  return (
                    <div key={i} className={`${grid} border-t border-slate-100 dark:border-slate-800 ${on ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                      <span className={`${cell} text-left`}>{months[i]}</span>
                      <span className={cell}>{on ? fmtSaat(h) : '–'}</span>
                      <span className={cell}>{fmtN(FEE_BAZI[i])}</span>
                      <span className={cell}>{on ? fmtN(saatBaz) : '–'}</span>
                      <span className={cell}>{on && fee ? fmtN(fee) : '–'}</span>
                      <span className={`${cell} font-medium ${farkVar ? farkCell(fark) : ''}`}>{farkVar ? fmtN(Math.abs(fark)) : '–'}</span>
                    </div>
                  );
                })}
                <div className={`${grid} border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-slate-50`}>
                  <span className={`${cell} text-left`}>Toplam</span>
                  <span className={cell}>{fmtSaat(t.hours)}</span>
                  <span className={cell}>{fmtN(bazOrt)}</span>
                  <span className={cell}>{fmtN(t.saatBaz)}</span>
                  <span className={cell}>{fmtN(t.fee)}</span>
                  <span className={`${cell} ${farkCell(t.fark)}`}>{fmtN(Math.abs(t.fark))}</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-3">
                Tutarlar ₺ ve KDV hariçtir. Fee + Proje: Satış Tablosu faturaları. Fark = Saat x Baz − (Fee + Proje). Süre girilmemiş aylar Fark'a katılmaz; toplamdaki Baz güncel ayların ortalamasıdır.{hic ? ' Bu markaya Ocak-Eylül arasında fatura kesilmemiştir.' : ''}
              </p>
              <p className="text-[11px] sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">
                <span className="text-rose-600 dark:text-rose-400">KIRMIZI</span>, Fee'den fazla zaman harcandığını, <span className="text-emerald-600 dark:text-emerald-400">YEŞİL</span>, Fee içinde kalındığını gösterir.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
