// Süre Analiz > Karşılaştırma: iki personeli seçilen dönemde yan yana karşılaştırır.
import React, { useMemo, useState } from 'react';
import { kisiOlcu } from './lib/karsilastirma.js';
import { ESIK, ORAN_KIRMIZI } from './SureDetay.jsx';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const SELECT = 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400 uppercase';
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtS = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');
const TL = (n) => '₺' + fmtN(n);
const VAR = '–';

export default function Karsilastirma({ kisiler, rows, departman, pasifSet, per, donem, maksSaat, brandOf, maliyetAy, maliyetAcik, months }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [secim, setSecim] = useState(null); // Karşılaştır düğmesine basılınca {a, b}
  const hazir = a && b && a !== b;

  const olcu = useMemo(() => {
    if (!secim) return null;
    const hesap = (u) => kisiOlcu({ rows, user: u, departman, pasif: pasifSet.has(u), per, maksSaat, brandOf, maliyetAy: maliyetAy(u), aylar: months });
    return [hesap(secim.a), hesap(secim.b)];
  }, [secim, rows, departman, pasifSet, per, maliyetAy]); // eslint-disable-line react-hooks/exhaustive-deps

  // yon: 'yuksek' = büyük olan iyi, 'dusuk' = küçük olan iyi; verilmezse vurgu yapılmaz. num: karşılaştırılacak sayı
  const grup = (baslik, satirlar) => ({ baslik, satirlar });
  const gruplar = olcu && [
    grup('İstenen başlıklar', [
      { l: 'Toplam Süre', f: (o) => `${fmtS(o.toplam)} Saat`, num: (o) => o.toplam, yon: 'yuksek' },
      { l: 'Süre Oranı', f: (o) => (o.oran == null ? VAR : pct1(o.oran)), num: (o) => o.oran, yon: 'yuksek', kirmizi: (o) => o.oran != null && o.oran < ESIK, not: 'toplam süre / maksimum süre' },
      { l: 'Aktif Süre', f: (o) => `${fmtS(o.aktif)} Saat`, alt: (o) => (o.toplam ? pct1(o.aktif / o.toplam) : ''), num: (o) => o.aktif, yon: 'yuksek' },
      { l: 'Atanmamış Süre', f: (o) => `${fmtS(o.atanmamis)} Saat`, alt: (o) => (o.toplam ? pct1(o.atanmamis / o.toplam) : ''), num: (o) => o.atanmamis, yon: 'dusuk' },
      { l: 'Kayıp Süre', f: (o) => `${fmtS(o.kayip)} Saat`, alt: (o) => (o.toplam ? pct1(o.kayip / o.toplam) : ''), num: (o) => o.kayip, yon: 'dusuk' },
      { l: 'Ekip Süresi', f: (o) => `${fmtN(o.ekip)} Saat`, not: 'dönemde ekibin toplam süresi' },
      { l: 'Ekip Payı', f: (o) => (o.ekipPayi == null ? VAR : pct1(o.ekipPayi)), num: (o) => o.ekipPayi, yon: 'yuksek' },
      { l: 'Dep. Payı', f: (o) => (o.depPayi == null ? VAR : pct1(o.depPayi)), num: (o) => o.depPayi, yon: 'yuksek', not: 'kendi departmanındaki toplam süreye oranı' },
      { l: 'Müşteri Sayısı', f: (o) => `${o.musteriSayisi} adet`, num: (o) => o.musteriSayisi, yon: 'yuksek' },
      ...(maliyetAcik ? [
        { l: 'Maks. Süre Değer', f: (o) => (o.maliyetVar ? TL(o.maksDeger) : VAR), not: 'maksimum süre × saat maliyeti' },
        { l: 'Top. Süre Değer', f: (o) => (o.topDeger > 0 ? TL(o.topDeger) : VAR), alt: (o) => (o.maksDeger ? pct1(o.topDeger / o.maksDeger) : ''), not: 'harcanan süre × saat maliyeti' },
      ] : []),
    ]),
    grup('Ek başlıklar', [
      { l: 'Departman', f: (o) => o.departman || VAR },
      { l: 'Durum', f: (o) => (o.pasif ? 'Pasif' : 'Aktif') },
      { l: 'Maksimum Süre', f: (o) => (o.maks ? `${fmtS(o.maks)} Saat` : VAR), alt: (o) => (o.maksAy ? `${o.maksAy} ay` : ''), not: '(hafta içi − resmi tatil) × 8,5 sa' },
      { l: 'Kayıt Oranı', f: (o) => (o.kayitOrani == null ? VAR : pct1(o.kayitOrani)), num: (o) => o.kayitOrani, yon: 'yuksek', kirmizi: (o) => o.kayitOrani != null && o.kayitOrani < ESIK, not: 'faturası kesilen markalara giden süre payı' },
      { l: 'Ortalama Aylık Süre', f: (o) => (o.ortAylik == null ? VAR : `${fmtS(o.ortAylik)} Saat`), alt: (o) => (o.sureliAy ? `${o.sureliAy} ay` : ''), not: 'süre girilen aylar üzerinden' },
      { l: 'En Yoğun Ay', f: (o) => (o.zirve ? o.zirve.ay : VAR), alt: (o) => (o.zirve ? `${fmtS(o.zirve.saat)} Saat` : '') },
      { l: 'En Çok Çalıştığı Müşteri', f: (o) => (o.enCok ? o.enCok.ad : VAR), alt: (o) => (o.enCok ? `süresinin ${pct1(o.enCok.pay)}'si` : '') },
      ...(maliyetAcik ? [{ l: 'Ort. Saat Maliyeti', f: (o) => (o.saatMaliyeti ? TL(o.saatMaliyeti) : VAR) }] : []),
    ]),
  ];

  const kazanan = (s) => {
    if (!s.yon) return -1;
    const [x, y] = olcu.map(s.num);
    if (x == null || y == null || Math.abs(x - y) < 1e-9) return -1;
    return (s.yon === 'yuksek' ? x > y : x < y) ? 0 : 1;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Personel Karşılaştırma</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">İki personeli seçip Karşılaştır'a basın. Sonuçlar yukarıda seçili döneme göre hesaplanır; dönemi değiştirince güncellenir. Yeşil işaret, o başlıkta daha iyi olanı gösterir.</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          {[['1. Personel', a, setA, b], ['2. Personel', b, setB, a]].map(([etiket, deger, set, diger]) => (
            <label key={etiket} className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
              {etiket}
              <select value={deger} onChange={(e) => set(e.target.value)} className={SELECT}>
                <option value="">Seçiniz</option>
                {kisiler.map((k) => <option key={k} value={k} disabled={k === diger}>{k}{pasifSet.has(k) ? ' (Pasif)' : ''}</option>)}
              </select>
            </label>
          ))}
          <button type="button" disabled={!hazir} onClick={() => setSecim({ a, b })}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Karşılaştır
          </button>
        </div>
      </div>

      {olcu && (
        <div className={`${CARD} p-5`}>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">{donem}</div>
          <div className="grid grid-cols-[minmax(6.5rem,1fr)_1fr_1fr] sm:grid-cols-[minmax(10rem,1.2fr)_1fr_1fr] gap-x-2">
            <div />
            {[secim.a, secim.b].map((n) => (
              <div key={n} className="text-center font-serif text-sm sm:text-base text-slate-900 dark:text-slate-50 uppercase pb-3 border-b border-slate-200 dark:border-slate-800 break-words">{n}</div>
            ))}
            {gruplar.map((g) => (
              <React.Fragment key={g.baslik}>
                <div className="col-span-3 pt-5 pb-1 text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">{g.baslik}</div>
                {g.satirlar.map((s, k) => {
                  const w = kazanan(s);
                  const zebra = k % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/40' : '';
                  return (
                    <React.Fragment key={s.l}>
                      <div className={`${zebra} px-2 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 rounded-l-lg`}>
                        {s.l}
                        {s.not && <span className="block text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{s.not}</span>}
                      </div>
                      {olcu.map((o, j) => (
                        <div key={j} className={`${zebra} px-2 py-2.5 text-center text-xs sm:text-sm tabular-nums ${j === 1 ? 'rounded-r-lg' : ''} ${s.kirmizi?.(o) ? ORAN_KIRMIZI : w === j ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-800 dark:text-slate-100'}`}>
                          <span className="break-words">{s.f(o)}</span>
                          {s.alt && s.alt(o) && <span className="block text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-normal">{s.alt(o)}</span>}
                        </div>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
