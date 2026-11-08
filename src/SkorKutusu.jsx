// Skor kartı (lightbox): Süre Analizi tablolarında/kartlarında "Skor"a tıklayınca açılır.
// Kapasite / Kayıt / Kayıp puanları ve Giriş–Çıkış satırı. Giriş–Çıkış verisi yokken satır yalnızca bilgi amaçlıdır (skora etkisi yok);
// veri geldiğinde (verimlilikSkoru girisCikis parametresi) ağırlıklar otomatik güncellenir ve satır puanla görünür.
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { skorKirmizi, SKOR } from './lib/karsilastirma.js';
import { ESIKLER } from './lib/esikler.js';

const pct = (x) => '%' + Math.round((x || 0) * 100);

function Satir({ ad, puan, max, detay, yok }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-baseline justify-between text-sm mb-1.5">
        <span className="font-medium text-slate-800 dark:text-slate-100">{ad}</span>
        <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-50">{yok ? '–' : `${Math.round(puan)} / ${max}`}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {!yok && <div className="h-full rounded-full bg-slate-800 dark:bg-slate-200" style={{ width: `${Math.max(0, Math.min(100, (puan / max) * 100))}%` }} />}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">{detay}</div>
    </div>
  );
}

export default function SkorKutusu({ ad, donem, skor, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!skor) return null;
  const w = skor.w;
  const gcVar = skor.gc != null;
  const kirmizi = skorKirmizi(skor);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${ad || ''} skor`}>
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Kapat" className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        <div className="flex items-start justify-between gap-3 pr-8 mb-1">
          <div className="min-w-0">
            <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 uppercase break-words">{ad || 'Skor'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Skor{donem ? ` · ${donem}` : ''}</p>
          </div>
          <div className={`shrink-0 text-right ${kirmizi ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-50'}`}>
            <span className="font-serif text-4xl font-bold tabular-nums leading-none">{Math.round(skor.toplam)}</span>
            <span className="text-sm text-slate-400 ml-1">/ 100</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 my-4">
          Kapasite {Math.round(skor.sure)}/{w.sure} · Kayıt {Math.round(skor.kayit)}/{w.kayit} · Kayıp {Math.round(skor.kayip)}/{w.kayip}{gcVar ? ` · Giriş–Çıkış ${Math.round(skor.gc)}/${w.gc}` : ''}
        </div>
        <Satir ad="Kapasite" puan={skor.sure} max={w.sure} detay={`Kapasite Oranı ${pct(skor.oran)} · ${pct(SKOR.sureSifir)} ve altı 0 puan, ${pct(SKOR.sureTam)} ve üstü tam puan`} />
        <Satir ad="Kayıt" puan={skor.kayit} max={w.kayit} detay={`Kayıt Oranı ${pct(skor.kayitOrani)} (faturası kesilen markalara giden süre payı)`} />
        <Satir ad="Kayıp" puan={skor.kayip} max={w.kayip} detay={`Kayıp Süre payı ${pct(skor.kayipPay)} · %0'da tam puan, ${pct(SKOR.kayipSifir)} ve üstü 0 puan`} />
        <Satir
          ad="Giriş–Çıkış"
          puan={skor.gc}
          max={SKOR.agirlikGC.gc}
          yok={!gcVar}
          detay={gcVar
            ? 'Mobofis giriş–çıkış kayıtlarına göre: tam kayıt 1, gecikme 0,75, eksik kayıt 0'
            : `Mobofis giriş–çıkış verisi henüz yok; skora etkisi yok. Veri geldiğinde otomatik hesaba katılır (Kapasite ${SKOR.agirlikGC.sure} · Kayıt ${SKOR.agirlikGC.kayit} · Kayıp ${SKOR.agirlikGC.kayip} · Giriş–Çıkış ${SKOR.agirlikGC.gc}).`}
        />
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">{ESIKLER.skor} altındaki skor kırmızı gösterilir (Yönetim › Ayarlar).</p>
      </div>
    </div>
  );
}
