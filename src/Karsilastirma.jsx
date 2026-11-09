// Süre Analiz > Karşılaştırma: iki personeli seçilen dönemde yan yana karşılaştırır.
import React, { useMemo, useState } from 'react';
import { kisiOlcu, SKOR, skorKirmizi } from './lib/karsilastirma.js';
import { ORAN_KIRMIZI } from './SureDetay.jsx';
import SkorKutusu from './SkorKutusu.jsx';
import { GIZLI_SATIR } from './lib/gorunum.js';
import { ESIKLER, pctEsik } from './lib/esikler.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const SELECT = 'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400 uppercase';
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtS = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');
const pct0 = (x) => '%' + Math.round(x * 100);
const TL = (n) => '₺' + fmtN(n);
const VAR = '–';

const EN_COK = 6;

export default function Karsilastirma({ kisiler, rows, departman, pasifSet, per, donem, maksSaat, brandOf, maliyetAy, maliyetTop, maliyetAcik, months, baslangic }) {
  const [skorKutu, setSkorKutu] = useState(null);
  const [secimler, setSecimler] = useState(baslangic || ['', '']);
  const [sonuc, setSonuc] = useState(baslangic || null); // Karşılaştır düğmesine basılınca seçilen kişiler
  const dolu = secimler.filter(Boolean);
  const hazir = secimler.length >= 2 && dolu.length === secimler.length && new Set(dolu).size === dolu.length;
  const degistir = (k, v) => setSecimler((l) => l.map((x, j) => (j === k ? v : x)));

  const olcu = useMemo(() => {
    if (!sonuc) return null;
    return sonuc.map((u) => kisiOlcu({ rows, user: u, departman, pasif: pasifSet.has(u), per, maksSaat, brandOf, maliyetAy: maliyetAy(u), maliyetTop: maliyetTop?.(u), aylar: months }));
  }, [sonuc, rows, departman, pasifSet, per, maliyetAy, maliyetTop]); // eslint-disable-line react-hooks/exhaustive-deps

  // yon: 'yuksek' = büyük olan iyi, 'dusuk' = küçük olan iyi; verilmezse vurgu yapılmaz. num: karşılaştırılacak sayı
  const gruplarTumu = olcu && [
    [
      { l: 'Skor', skorTikla: true, f: (o) => (o.skor ? `${Math.round(o.skor.toplam)} / 100` : 'Veri yetersiz'), alt: (o) => (o.skor ? `Kapasite ${Math.round(o.skor.sure)}/${o.skor.w.sure} · Kayıt ${Math.round(o.skor.kayit)}/${o.skor.w.kayit} · Kayıp ${Math.round(o.skor.kayip)}/${o.skor.w.kayip}${o.skor.gc != null ? ` · Giriş–Çıkış ${Math.round(o.skor.gc)}/${o.skor.w.gc}` : ''}` : ''), num: (o) => o.skor?.toplam ?? null, yon: 'yuksek', buyuk: true, kirmizi: (o) => skorKirmizi(o.skor), not: 'Kapasite Oranı %40 · Kayıt Oranı %40 · Kayıp Süre %20 (ters)' },
    ],
    [
      { l: 'Maksimum Kapasite', f: (o) => (o.maks ? `${fmtS(o.maks)} Saat` : VAR), alt: (o) => (o.maksAy ? `${o.maksAy} ay` : ''), not: '(hafta içi − resmi tatil) × 8,5 sa' },
      { l: 'Gerçekleşen Süre', f: (o) => `${fmtS(o.toplam)} Saat`, num: (o) => o.toplam, yon: 'yuksek' },
      { l: 'Kapasite Oranı', f: (o) => (o.oran == null ? VAR : pct1(o.oran)), num: (o) => o.oran, yon: 'yuksek', kirmizi: (o) => o.oran != null && o.oran < ESIKLER.kapasite, not: 'Gerçekleşen Süre / Maksimum Kapasite' },
      { l: 'Girilen Süre', f: (o) => `${fmtS(o.aktif)} Saat`, alt: (o) => (o.toplam ? pct1(o.aktif / o.toplam) : ''), num: (o) => o.aktif, yon: 'yuksek' },
      { l: 'Atanmamış Süre', f: (o) => `${fmtS(o.atanmamis)} Saat`, alt: (o) => (o.toplam ? pct1(o.atanmamis / o.toplam) : ''), num: (o) => o.atanmamis, yon: 'dusuk' },
      { l: 'Kayıt Oranı', f: (o) => (o.kayitOrani == null ? VAR : pct1(o.kayitOrani)), num: (o) => o.kayitOrani, yon: 'yuksek', kirmizi: (o) => o.kayitOrani != null && o.kayitOrani < ESIKLER.kayit, not: 'faturası kesilen markalara giden süre payı' },
      { l: 'Ekip Payı', f: (o) => (o.ekipPayi == null ? VAR : pct1(o.ekipPayi)), num: (o) => o.ekipPayi, yon: 'yuksek', not: `Ekip Süresi ${fmtN(olcu[0].ekip)} Saat` },
      { l: 'Dep. Payı', f: (o) => (o.depPayi == null ? VAR : pct1(o.depPayi)), num: (o) => o.depPayi, yon: 'yuksek', not: 'kendi departmanının Gerçekleşen Süresine oranı' },
      { l: 'Ortalama Aylık Süre', f: (o) => (o.ortAylik == null ? VAR : `${fmtS(o.ortAylik)} Saat`), alt: (o) => (o.sureliAy ? `${o.sureliAy} ay` : ''), not: 'süre girilen aylar üzerinden' },
      ...(maliyetAcik ? [
        { l: 'Ort. Saat Maliyeti', f: (o) => (o.saatMaliyeti ? TL(Math.ceil(o.saatMaliyeti)) : VAR) },
        { l: 'Gerçekleşen Maliyet', f: (o) => (o.topDeger > 0 ? TL(o.topDeger) : VAR), not: 'Personel Maliyet Hesaplama\'daki aylık maliyetlerin toplamı' },
      ] : []),
    ],
    [
      { l: 'Müşteri Sayısı', f: (o) => `${o.musteriSayisi} adet`, num: (o) => o.musteriSayisi, yon: 'yuksek' },
      { l: 'En Çok Çalıştığı Müşteri', f: (o) => (o.enCok ? o.enCok.ad : VAR), alt: (o) => (o.enCok ? `süresinin ${pct1(o.enCok.pay)}'si` : '') },
    ],
  ];

  const gruplar = gruplarTumu && gruplarTumu.map((g) => g.filter((s) => !GIZLI_SATIR.has(s.l))).filter((g) => g.length);

  // En iyi değere sahip tüm kişiler (hepsi eşitse kimse vurgulanmaz)
  const kazananlar = (s) => {
    if (!s.yon) return [];
    const v = olcu.map(s.num);
    if (v.some((x) => x == null)) return [];
    const en = s.yon === 'yuksek' ? Math.max(...v) : Math.min(...v);
    const idx = v.map((x, j) => (Math.abs(x - en) < 1e-9 ? j : -1)).filter((j) => j >= 0);
    return idx.length === v.length ? [] : idx;
  };
  const n = olcu?.length || 0;

  return (
    <div className="flex flex-col gap-5">
      {skorKutu && <SkorKutusu ad={skorKutu.ad} donem={skorKutu.donem} skor={skorKutu.skor} onClose={() => setSkorKutu(null)} />}
      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Personel Karşılaştırma</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Personelleri seçip Karşılaştır'a basın; gerekirse "Kişi ekle" ile en fazla {EN_COK} kişi karşılaştırılır. Sonuçlar yukarıda seçili döneme göre hesaplanır; dönemi değiştirince güncellenir. Yeşil işaret, o başlıkta daha iyi olanı gösterir.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {secimler.map((deger, k) => (
            <label key={k} className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center justify-between">
                {k + 1}. Personel
                {k >= 2 && <button type="button" onClick={() => setSecimler((l) => l.filter((_, j) => j !== k))} className="text-[11px] text-rose-500 hover:text-rose-700">Kaldır</button>}
              </span>
              <select value={deger} onChange={(e) => degistir(k, e.target.value)} className={SELECT}>
                <option value="">Seçiniz</option>
                {kisiler.map((u) => <option key={u} value={u} disabled={secimler.includes(u) && u !== deger}>{u}{pasifSet.has(u) ? ' (Pasif)' : ''}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button type="button" disabled={!hazir} onClick={() => setSonuc([...secimler])}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Karşılaştır
          </button>
          {secimler.length < EN_COK && (
            <button type="button" onClick={() => setSecimler((l) => [...l, ''])}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              + Kişi ekle
            </button>
          )}
        </div>
      </div>

      {olcu && (
        <div className={`${CARD} p-5`}>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">{donem}</div>
          <div className="overflow-x-auto">
            <div className="grid gap-x-2" style={{ gridTemplateColumns: `minmax(7.5rem,1.3fr) repeat(${n}, minmax(6rem,1fr))`, minWidth: `${7.5 + n * 6}rem` }}>
              <div />
              {sonuc.map((u) => (
                <div key={u} className="text-center font-serif text-sm sm:text-base text-slate-900 dark:text-slate-50 uppercase pb-3 border-b border-slate-200 dark:border-slate-800 break-words">{u}{pasifSet.has(u) && <span className="block text-[10px] font-sans normal-case text-slate-400">Pasif</span>}</div>
              ))}
              {gruplar.map((satirlar, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div className="col-span-full h-4" />}
                  {satirlar.map((s, k) => {
                    const w = kazananlar(s);
                    const zebra = k % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/40' : '';
                    return (
                      <React.Fragment key={s.l}>
                        <div className={`${zebra} px-2 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 rounded-l-lg`}>
                          {s.l}
                          {s.not && <span className="block text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{s.not}</span>}
                        </div>
                        {olcu.map((o, j) => (
                          <div key={j} className={`${zebra} px-2 py-2.5 text-center text-xs sm:text-sm tabular-nums ${j === n - 1 ? 'rounded-r-lg' : ''} ${s.buyuk ? 'text-base sm:text-lg ' : ''}${s.kirmizi?.(o) ? ORAN_KIRMIZI : w.includes(j) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-800 dark:text-slate-100'}`}>
                            {s.skorTikla && o.skor ? <button type="button" onClick={() => setSkorKutu({ ad: sonuc[j], donem: String(donem || '').replace(/^\(|\)$/g, ''), skor: o.skor })} title="Skor kartını aç" className="break-words underline decoration-dotted underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400">{s.f(o)}</button> : <span className="break-words">{s.f(o)}</span>}
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
        </div>
      )}
    </div>
  );
}
