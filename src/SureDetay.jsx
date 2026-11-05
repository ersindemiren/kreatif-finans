// Süre Analizi alt sayfaları (Fee Takip'teki marka iç sayfası gibi): marka detayı ve personel detayı.
import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { FEE_BAZI, buildMarkaPersonel, buildKisiDetay, kanonikMusteri } from './lib/sure.js';
import { normalizeNameKey } from './lib/parseData.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const TONE = { good: 'bg-emerald-500', bad: 'bg-rose-500', warn: 'bg-amber-500', info: 'bg-slate-400' };
// Aylık azami çalışma süresi: 22 gün x 8,5 saat
export const MAKS_SURE = 22 * 8.5;
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtSaat = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtTL = (n) => '₺' + fmtN(Math.abs(n));
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');
const sum = (a, idx) => idx.reduce((s, i) => s + (a[i] || 0), 0);
const farkText = (v) => (Math.round(v) > 0 ? 'text-rose-600 dark:text-rose-400' : Math.round(v) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400');
const farkCell = (v) => (Math.round(v) > 0 ? 'bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200' : Math.round(v) < 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : '');

const Badge = ({ children, tone = 'slate' }) => (
  <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 whitespace-nowrap ${tone === 'amber' ? 'border-amber-300 text-amber-600' : tone === 'rose' ? 'border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400' : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'}`}>{children}</span>
);

function BackButton({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 transition-colors mb-4">
      <ArrowLeft size={14} /> {label}
    </button>
  );
}

function Kpi({ label, value, sub, subClass = 'text-slate-400 dark:text-slate-500' }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-0.5">{value}</div>
      {sub && <div className={`text-[11px] tabular-nums ${subClass}`}>{sub}</div>}
    </div>
  );
}

function Yorumlar({ list }) {
  if (!list.length) return null;
  return (
    <div className={`${CARD} p-5`}>
      <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Yorumlar</h3>
      <ul className="flex flex-col gap-2.5">
        {list.map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-5">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${TONE[c.tone]}`} />
            <span className="min-w-0 break-words">{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Aylık sütun grafiği: her ay için 1-2 sütun. series: [{ name, values[12], color }]
function Bars({ months, on, series, unit = 'sa' }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values.filter((_, i) => on[i])));
  return (
    <div>
      <div className="flex items-end gap-1 sm:gap-2 h-40">
        {months.map((m, i) => (
          <div key={m} className="flex-1 min-w-0 h-full flex items-end justify-center gap-0.5">
            {series.map((s) => {
              const v = on[i] ? s.values[i] : 0;
              return <div key={s.name} title={`${m} · ${s.name}: ${fmtN(v)} ${unit}`} className={`w-full max-w-[18px] rounded-t ${s.color} ${v ? '' : 'opacity-0'}`} style={{ height: `${Math.max(v ? 2 : 0, (v / max) * 100)}%` }} />;
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-2 mt-1.5">
        {months.map((m, i) => (
          <span key={m} className={`flex-1 min-w-0 text-center text-[9px] sm:text-[11px] ${on[i] ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>{m}</span>
        ))}
      </div>
      {series.length > 1 && (
        <div className="flex gap-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          {series.map((s) => <span key={s.name} className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />{s.name}</span>)}
        </div>
      )}
    </div>
  );
}

// Satır x ay ısı matrisi. rows: [{ name, values[12], onClick? }]
function Matris({ months, on, rows, firstLabel, onPick }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.values.filter((_, i) => on[i])));
  const shade = (v) => {
    if (!v) return '';
    const r = v / max;
    return r > 0.66 ? 'bg-sky-300 dark:bg-sky-700 text-slate-900 dark:text-white' : r > 0.33 ? 'bg-sky-200 dark:bg-sky-800/70 text-slate-900 dark:text-sky-50' : 'bg-sky-100 dark:bg-sky-900/40 text-slate-700 dark:text-sky-100';
  };
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-[10px] sm:text-xs tabular-nums border-separate border-spacing-0" style={{ minWidth: 640 }}>
        <thead>
          <tr className="text-slate-400 dark:text-slate-500">
            <th className="text-left font-medium py-1.5 pr-2 sticky left-0 bg-white dark:bg-slate-900">{firstLabel}</th>
            {months.map((m, i) => <th key={m} className={`font-medium py-1.5 px-1 ${on[i] ? '' : 'opacity-40'}`}>{m}</th>)}
            <th className="font-semibold py-1.5 pl-2 text-right text-slate-500 dark:text-slate-400">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="py-0.5 pr-2 sticky left-0 bg-white dark:bg-slate-900 max-w-[9rem] sm:max-w-[14rem]">
                {onPick ? <button type="button" onClick={() => onPick(r.name)} className="text-left truncate block max-w-full text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2">{r.name}</button> : <span className="truncate block text-slate-700 dark:text-slate-300">{r.name}</span>}
              </td>
              {r.values.map((v, i) => (
                <td key={i} className={`py-0.5 px-0.5 text-center ${on[i] ? '' : 'opacity-30'}`}>
                  <div className={`rounded px-0.5 py-1 ${on[i] ? shade(v) : ''}`}>{on[i] && v ? fmtN(v) : ''}</div>
                </td>
              ))}
              <td className="py-0.5 pl-2 text-right font-semibold text-slate-900 dark:text-slate-50">{fmtN(sum(r.values, on.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const useTop = () => useEffect(() => { window.scrollTo(0, 0); }, []);

/* =============================== MARKA DETAYI =============================== */
export function MarkaDetay({ brand, months, ayDurumu, personelRows, pasif, onBack, backLabel, onKisi }) {
  useTop();
  const idx = months.map((_, i) => i);
  const aktif = idx.filter((i) => ayDurumu?.[i] === 'güncel');
  const on = idx.map((i) => ayDurumu?.[i] === 'güncel');
  const degerYok = brand.tip === 'ic';

  const t = useMemo(() => {
    let hours = 0; let saatBaz = 0; let fee = 0;
    aktif.forEach((i) => {
      hours += brand.hours[i];
      saatBaz += degerYok ? 0 : brand.hours[i] * FEE_BAZI[i];
      fee += brand.fee[i] + brand.proje[i];
    });
    return { hours, saatBaz, fee, fark: saatBaz - fee };
  }, [brand, aktif.join(','), degerYok]); // eslint-disable-line react-hooks/exhaustive-deps

  const kisiler = useMemo(
    () => buildMarkaPersonel({ rows: personelRows, brandName: brand.name }).map((k) => ({ ...k, toplam: sum(k.hours, aktif) })).filter((k) => k.toplam > 0).sort((a, b) => b.toplam - a.toplam),
    [personelRows, brand.name, aktif.join(',')] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const aylikFark = idx.map((i) => (degerYok ? 0 : brand.hours[i] * FEE_BAZI[i]) - (brand.fee[i] + brand.proje[i]));
  const asimAylari = aktif.filter((i) => brand.hours[i] > 0 && aylikFark[i] > 0);
  const hic = brand.tip === 'marka' && !brand.faturali.some(Boolean);
  const bazOrt = aktif.length ? aktif.reduce((s, i) => s + FEE_BAZI[i], 0) / aktif.length : 0;

  const yorumlar = [];
  if (hic) yorumlar.push({ tone: 'bad', text: `Bu markaya güncel aylarda hiç fatura kesilmemiş; harcanan ${fmtSaat(t.hours)} saat (${fmtTL(t.saatBaz)} değerinde) karşılıksız kaldı.` });
  else if (degerYok) yorumlar.push({ tone: 'info', text: 'Kreatif iç süresi: gelir getirmediği için TL değeri hesaplanmaz.' });
  else if (t.hours > 0 || t.fee > 0) {
    if (Math.round(t.fark) > 0) yorumlar.push({ tone: 'bad', text: `Güncel aylarda fee'den ${fmtTL(t.fark)} fazla zaman harcandı (Saat × Baz ${fmtTL(t.saatBaz)}, Fee + Proje ${fmtTL(t.fee)}).` });
    else if (Math.round(t.fark) < 0) yorumlar.push({ tone: 'good', text: `Fee içinde kalındı: faturalanan tutar, harcanan süre değerinin ${fmtTL(t.fark)} üzerinde.` });
    else yorumlar.push({ tone: 'info', text: 'Harcanan süre değeri ile fatura tutarı başa baş.' });
  }
  if (asimAylari.length && !hic) yorumlar.push({ tone: 'warn', text: `${aktif.length} güncel ayın ${asimAylari.length} tanesinde bütçe aşıldı: ${asimAylari.map((i) => months[i]).join(', ')}.` });
  const sureliAylar = aktif.filter((i) => brand.hours[i] > 0);
  if (sureliAylar.length >= 2) {
    const zirve = sureliAylar.reduce((a, i) => (brand.hours[i] > brand.hours[a] ? i : a), sureliAylar[0]);
    yorumlar.push({ tone: 'info', text: `En yoğun ay ${months[zirve]} (${fmtSaat(brand.hours[zirve])} saat); aylık ortalama ${fmtSaat(t.hours / sureliAylar.length)} saat.` });
  }
  if (sureliAylar.length >= 4) {
    const son3 = sureliAylar.slice(-3);
    const onceki = sureliAylar.slice(0, -3);
    const a = sum(brand.hours, son3) / son3.length;
    const b = sum(brand.hours, onceki) / onceki.length;
    if (b > 0 && Math.abs(a / b - 1) >= 0.15) yorumlar.push({ tone: a > b ? 'warn' : 'good', text: `Son 3 ayın aylık ortalaması ${fmtSaat(a)} saat; öncesine göre ${a > b ? 'artış' : 'düşüş'} ${pct1(Math.abs(a / b - 1))}.` });
  }
  if (kisiler.length) {
    const top = kisiler[0];
    yorumlar.push({ tone: 'info', text: `${kisiler.length} kişi çalışmış; en çok süreyi ${top.name} harcadı (${fmtSaat(top.toplam)} saat, ${pct1(t.hours ? top.toplam / t.hours : 0)}).` });
  }

  const gridA = 'grid grid-cols-6';
  const cellA = 'px-1 sm:px-3 py-1.5 sm:py-2 text-center tabular-nums whitespace-nowrap';

  return (
    <div className="flex flex-col gap-5">
      <div className={`${CARD} p-5`}>
        <BackButton onClick={onBack} label={backLabel} />
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-xl sm:text-2xl text-slate-900 dark:text-slate-50">{brand.name}</h2>
          {pasif && <Badge>Pasif</Badge>}
          {brand.tip === 'marka' && !brand.eslesti && <Badge tone="amber">eşleşmedi</Badge>}
          {hic && <Badge tone="rose">faturasız</Badge>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mt-4">
          <Kpi label="Harcanan Süre" value={`${fmtN(t.hours)} saat`} sub={sureliAylar.length ? `aylık ort. ${fmtSaat(t.hours / sureliAylar.length)} sa` : 'süre girilmemiş'} />
          <Kpi label="Saat × Baz" value={degerYok ? '–' : fmtTL(t.saatBaz)} sub={degerYok ? 'iç süre' : `ort. baz ${fmtN(bazOrt)} ₺/sa`} />
          <Kpi label="Fee + Proje (KDV hariç)" value={t.fee ? fmtTL(t.fee) : '–'} sub={brand.faturali.some(Boolean) ? `${brand.faturali.filter(Boolean).length} ay faturalı` : 'fatura yok'} />
          <Kpi label="Fark" value={degerYok ? '–' : <span className={farkText(t.fark)}>{fmtTL(t.fark)}</span>} sub={degerYok ? '' : Math.round(t.fark) > 0 ? 'bütçe aşıldı' : Math.round(t.fark) < 0 ? 'bütçe içinde' : 'başa baş'} subClass={farkText(t.fark)} />
        </div>
      </div>

      <Yorumlar list={yorumlar} />

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Aylık Bütçe Tüketimi</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Her ay için harcanan sürenin değeri (Saat × Baz) ile faturalanan tutar (Fee + Proje). Mavi sütun yeşili aşarsa o ay fee'den fazla zaman harcanmıştır.</p>
        <Bars
          months={months}
          on={on}
          unit="₺"
          series={[
            { name: 'Saat × Baz', color: 'bg-sky-400', values: idx.map((i) => (degerYok ? 0 : brand.hours[i] * FEE_BAZI[i])) },
            { name: 'Fee + Proje', color: 'bg-emerald-400', values: idx.map((i) => brand.fee[i] + brand.proje[i]) },
          ]}
        />
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Aylık Ayrıntı</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Fark = Saat × Baz − (Fee + Proje). Kırmızı: fee'den fazla zaman, yeşil: fee içinde.</p>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] sm:text-sm">
          <div className={`${gridA} bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 leading-tight items-center`}>
            <span className={`${cellA} text-left`}>Ay</span><span className={cellA}>Süre</span><span className={cellA}>Baz</span><span className={cellA}>Saat × Baz</span><span className={cellA}>Fee + Proje</span><span className={cellA}>Fark</span>
          </div>
          {idx.map((i) => {
            const h = brand.hours[i];
            const saatBaz = degerYok ? 0 : h * FEE_BAZI[i];
            const fee = brand.fee[i] + brand.proje[i];
            const farkVar = on[i] && (h > 0 || fee > 0);
            return (
              <div key={i} className={`${gridA} border-t border-slate-100 dark:border-slate-800 ${on[i] ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                <span className={`${cellA} text-left`}>{months[i]}</span>
                <span className={cellA}>{on[i] ? fmtSaat(h) : '–'}</span>
                <span className={cellA}>{fmtN(FEE_BAZI[i])}</span>
                <span className={cellA}>{on[i] ? fmtN(saatBaz) : '–'}</span>
                <span className={cellA}>{on[i] && fee ? fmtN(fee) : '–'}</span>
                <span className={`${cellA} font-medium ${farkVar ? farkCell(saatBaz - fee) : ''}`}>{farkVar ? fmtN(Math.abs(saatBaz - fee)) : '–'}</span>
              </div>
            );
          })}
          <div className={`${gridA} border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-slate-50`}>
            <span className={`${cellA} text-left`}>Toplam</span><span className={cellA}>{fmtSaat(t.hours)}</span><span className={cellA}>{fmtN(bazOrt)}</span><span className={cellA}>{fmtN(t.saatBaz)}</span><span className={cellA}>{fmtN(t.fee)}</span><span className={`${cellA} ${farkCell(t.fark)}`}>{fmtN(Math.abs(t.fark))}</span>
          </div>
        </div>
        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-3">Tutarlar ₺ ve KDV hariçtir. Toplamdaki Baz, güncel ayların ortalamasıdır.</p>
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Personel × Ay</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Bu markada kim, hangi ay kaç saat çalışmış (saat). Kişi adına tıklayınca personel sayfası açılır.</p>
        {kisiler.length ? (
          <Matris months={months} on={on} rows={kisiler.map((k) => ({ name: k.name, values: k.hours }))} firstLabel="Personel" onPick={onKisi} />
        ) : (
          <div className="text-xs text-slate-400 py-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Bu marka için personel kaydı yok (kişi bazlı veri Everhour kaynağından gelir).</div>
        )}
      </div>
    </div>
  );
}

/* =============================== PERSONEL DETAYI =============================== */
export function KisiDetay({ name, months, ayDurumu, personelRows, brandOf, onBack, backLabel, onMarka }) {
  useTop();
  const idx = months.map((_, i) => i);
  const aktif = idx.filter((i) => ayDurumu?.[i] === 'güncel');
  const on = idx.map((i) => ayDurumu?.[i] === 'güncel');
  const d = useMemo(() => buildKisiDetay({ rows: personelRows, user: name }), [personelRows, name]);

  const toplamKisi = sum(d.monthly, aktif);
  const toplamEkip = sum(d.team, aktif);
  const sureliAylar = aktif.filter((i) => d.monthly[i] > 0);
  const ortalama = sureliAylar.length ? toplamKisi / sureliAylar.length : 0;
  const cl = d.clients.map((c) => ({ ...c, toplam: sum(c.hours, aktif), brand: brandOf(c.name) })).filter((c) => c.toplam > 0).sort((a, b) => b.toplam - a.toplam);

  // Faturalı / faturasız (kayıp) / iç-atanmamış kırılımı
  const sinif = (c) => {
    if (!c.brand || c.brand.tip !== 'marka') return 'atil';
    return aktif.some((i) => c.brand.faturali[i]) ? 'faturali' : 'kayip';
  };
  const grp = { faturali: 0, kayip: 0, atil: 0 };
  cl.forEach((c) => { grp[sinif(c)] += c.toplam; });

  const yorumlar = [];
  if (cl.length) yorumlar.push({ tone: 'info', text: `Süresinin ${pct1(toplamKisi ? cl[0].toplam / toplamKisi : 0)}'si ${cl[0].name} markasına gitti (${fmtSaat(cl[0].toplam)} saat); toplam ${cl.length} müşteriyle çalıştı.` });
  if (sureliAylar.length >= 2) {
    const zirve = sureliAylar.reduce((a, i) => (d.monthly[i] > d.monthly[a] ? i : a), sureliAylar[0]);
    const fark = ortalama ? d.monthly[zirve] / ortalama - 1 : 0;
    yorumlar.push({ tone: 'info', text: `En yoğun ay ${months[zirve]} (${fmtSaat(d.monthly[zirve])} saat, ortalamanın ${pct1(Math.abs(fark))} ${fark >= 0 ? 'üzerinde' : 'altında'}).` });
  }
  if (toplamKisi > 0) {
    const kayipPay = grp.kayip / toplamKisi;
    if (kayipPay >= 0.2) yorumlar.push({ tone: 'bad', text: `Süresinin ${pct1(kayipPay)}'i (${fmtSaat(grp.kayip)} saat) faturası kesilmeyen markalara harcandı.` });
    else if (grp.kayip > 0) yorumlar.push({ tone: 'warn', text: `${fmtSaat(grp.kayip)} saat (${pct1(kayipPay)}) faturası kesilmeyen markalara harcandı.` });
    else yorumlar.push({ tone: 'good', text: 'Faturası kesilmeyen markaya süre harcanmadı.' });
    const atilPay = grp.atil / toplamKisi;
    if (atilPay >= 0.15) yorumlar.push({ tone: 'warn', text: `Süresinin ${pct1(atilPay)}'i iç süre / markaya atanmamış kayıtlarda.` });
  }
  if (toplamEkip > 0) yorumlar.push({ tone: 'info', text: `Ekibin toplam süresinin ${pct1(toplamKisi / toplamEkip)}'ini üstlendi.` });

  const gridA = 'grid grid-cols-4';
  const cellA = 'px-2 sm:px-3 py-1.5 sm:py-2 text-center tabular-nums whitespace-nowrap';

  return (
    <div className="flex flex-col gap-5">
      <div className={`${CARD} p-5`}>
        <BackButton onClick={onBack} label={backLabel} />
        <h2 className="font-serif text-xl sm:text-2xl text-slate-900 dark:text-slate-50">{name}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mt-4">
          <Kpi label="Toplam Süre" value={`${fmtN(toplamKisi)} saat`} sub={`ekibin ${pct1(toplamEkip ? toplamKisi / toplamEkip : 0)}'i`} />
          <Kpi label="Maksimum Süre" value={`${fmtN(MAKS_SURE)} saat`} sub="22 gün × 8,5 saat / ay" />
          <Kpi label="Aylık Ortalama" value={`${fmtN(ortalama)} saat`} sub={`maks. sürenin ${pct1(ortalama / MAKS_SURE)}'i`} />
          <Kpi label="Müşteri" value={`${cl.length} adet`} sub={cl[0] ? `en çok: ${cl[0].name}` : ''} />
          <Kpi label="Kayıt Oranı" value={pct1(toplamKisi ? grp.faturali / toplamKisi : 0)} sub={`kayıp ${pct1(toplamKisi ? grp.kayip / toplamKisi : 0)} · atanmamış ${pct1(toplamKisi ? grp.atil / toplamKisi : 0)}`} />
        </div>
      </div>

      <Yorumlar list={yorumlar} />

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Aylık Süre Seyri</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Kişinin her ay girdiği toplam süre (saat). Gri çizgi altındaki açık sütun, ekibin kişi başı ortalamasıdır.</p>
        <Bars
          months={months}
          on={on}
          series={[
            { name: name, color: 'bg-sky-400', values: d.monthly },
            { name: 'Ekip ortalaması (kişi başı)', color: 'bg-slate-300 dark:bg-slate-600', values: d.team.map((v, i) => (d.kisiSayisi?.[i] ? v / d.kisiSayisi[i] : 0)) },
          ]}
        />
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Müşteri × Ay Matrisi</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Hangi müşteriye hangi ay kaç saat (saat). Marka adına tıklayınca marka sayfası açılır.</p>
        <Matris months={months} on={on} rows={cl.map((c) => ({ name: c.name, values: c.hours }))} firstLabel="Müşteri" onPick={(n) => onMarka(n)} />
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Müşteri Kırılımı</h3>
        <div className="flex items-center gap-2 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span className="flex-1 min-w-0">Müşteri</span>
          <span className="w-20 text-right">Süre</span>
          <span className="w-14 text-right">Pay</span>
        </div>
        {cl.map((c) => {
          const k = sinif(c);
          return (
            <div key={c.name} className="flex items-center gap-2 py-2 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm">
              <span className="flex-1 min-w-0 break-words">
                <button type="button" onClick={() => onMarka(c.name)} className="text-left text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2">{c.name}</button>
                {k === 'kayip' && <span className="ml-1.5"><Badge tone="rose">faturasız</Badge></span>}
                {k === 'atil' && <span className="ml-1.5"><Badge>iç / atanmamış</Badge></span>}
              </span>
              <span className="w-20 text-right tabular-nums text-slate-700 dark:text-slate-300">{fmtSaat(c.toplam)} sa</span>
              <span className="w-14 text-right tabular-nums text-slate-400">{pct1(toplamKisi ? c.toplam / toplamKisi : 0)}</span>
            </div>
          );
        })}
        {cl.length === 0 && <div className="py-3 text-xs text-slate-400">Güncel aylarda kayıt yok.</div>}
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Aylık Ayrıntı</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Ekip Payı = kişinin o ayki süresi / ekibin o ayki toplam süresi.</p>
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-[10px] sm:text-sm">
          <div className={`${gridA} bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 leading-tight items-center`}>
            <span className={`${cellA} text-left`}>Ay</span><span className={cellA}>Süre</span><span className={cellA}>Ekip Süresi</span><span className={cellA}>Ekip Payı</span>
          </div>
          {idx.map((i) => (
            <div key={i} className={`${gridA} border-t border-slate-100 dark:border-slate-800 ${on[i] ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
              <span className={`${cellA} text-left`}>{months[i]}</span>
              <span className={cellA}>{on[i] ? fmtSaat(d.monthly[i]) : '–'}</span>
              <span className={cellA}>{on[i] ? fmtN(d.team[i]) : '–'}</span>
              <span className={cellA}>{on[i] && d.team[i] ? pct1(d.monthly[i] / d.team[i]) : '–'}</span>
            </div>
          ))}
          <div className={`${gridA} border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-slate-50`}>
            <span className={`${cellA} text-left`}>Toplam</span><span className={cellA}>{fmtSaat(toplamKisi)}</span><span className={cellA}>{fmtN(toplamEkip)}</span><span className={cellA}>{toplamEkip ? pct1(toplamKisi / toplamEkip) : '–'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { kanonikMusteri, normalizeNameKey };
