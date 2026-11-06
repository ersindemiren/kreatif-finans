import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from './lib/auth.js';
import { autoBrand, DEPARTMANLAR } from './lib/sure.js';
import { normalizeNameKey } from './lib/parseData.js';
import { hesaplaAy, parseTR, ayAnahtar } from './lib/maliyet.js';
import { aySaati, ayIsGunu, haftaIci, tatilGunu, tatilEtkisi, gunAdi, haftaSonu, VARSAYILAN_TATILLER } from './lib/takvim.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';

// Admin: üye ekleme/çıkarma ve sayfa yetkileri. Değişiklikler anında kaydedilir; çıkarılan kişinin oturumu bir sonraki istekte düşer.
// Everhour müşteri adlarını dashboard markalarıyla eşleştirir. Otomatik eşleşenler "otomatik" görünür, eşleşmeyenler seçilmeyi bekler.
function DepartmanEslestirme() {
  const [st, setSt] = useState({ loading: true, kisiler: [], map: {}, pasif: {}, error: '' });
  const [busy, setBusy] = useState('');
  useEffect(() => {
    (async () => {
      const r = await api('/api/everhour');
      if (r.ok) setSt({ loading: false, kisiler: r.data.kisiler || [], map: r.data.departman || {}, pasif: r.data.pasif || {}, error: '' });
      else setSt((s) => ({ ...s, loading: false, error: r.data.error || 'Everhour verisi alınamadı' }));
    })();
  }, []);
  const sec = async (kisi, departman) => {
    setBusy(kisi);
    const r = await api('/api/everhour', { method: 'PUT', body: { kisi, departman } });
    if (r.ok) setSt((s) => ({ ...s, map: r.data.departman, error: '' }));
    else setSt((s) => ({ ...s, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };
  const durumSec = async (kisi, pasif) => {
    setBusy(kisi);
    const r = await api('/api/everhour', { method: 'PUT', body: { kisi, pasif } });
    if (r.ok) setSt((s) => ({ ...s, pasif: r.data.pasif, error: '' }));
    else setSt((s) => ({ ...s, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };
  const atanmamis = st.kisiler.filter((k) => !st.pasif[k.name] && !st.map[k.name]).length;
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 mb-1">Personel Departman Eşleştirme</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Süre Analiz'deki Departman Bazlı Süre Dağılımı, Everhour'daki kişileri buradan seçilen departmana göre toplar. Seçim bir sonraki yenilemede uygulanır.</p>
      {st.loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Everhour kişileri okunuyor...</div>}
      {st.error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{st.error}</div>}
      {!st.loading && !st.error && (
        <>
          <div className="text-xs text-slate-500 mb-3">{st.kisiler.length} kişi ({st.kisiler.filter((k) => st.pasif[k.name]).length} pasif) · <span className={atanmamis ? 'text-amber-600 font-medium' : ''}>{atanmamis} departman atanmamış</span></div>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {[...st.kisiler].sort((a, b) => (!!st.pasif[a.name] - !!st.pasif[b.name]) || (!!st.map[a.name] - !!st.map[b.name])).map((k) => (
              <div key={k.name} className={`py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 ${st.pasif[k.name] ? 'opacity-60' : ''}`}>
                <div className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-200 uppercase">{k.name}{st.pasif[k.name] && <span className="ml-2 normal-case text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 rounded-full px-1.5 py-0.5">Pasif</span>}<span className="ml-2 text-[11px] text-slate-400 tabular-nums normal-case">{k.hours} sa</span></div>
                <select value={st.pasif[k.name] ? 'pasif' : 'aktif'} disabled={busy === k.name} onChange={(e) => durumSec(k.name, e.target.value === 'pasif')} aria-label={`${k.name} durumu`} className="sm:w-24 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400">
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
                <select value={st.map[k.name] || ''} disabled={busy === k.name} onChange={(e) => sec(k.name, e.target.value)} className="sm:w-60 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400">
                  <option value="">Departman seçin...</option>
                  {DEPARTMANLAR.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const tl = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
const tl2 = (n) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AY_ADLARI = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Personel maliyeti (aylık): seçilen ay için kişi başı aylık toplam ajans maliyeti + o ayın genel işletme dağıtım gideri.
// Dağıtım, o ay maliyeti girilmiş kişilere kendi maliyetleri oranında paylaştırılır; maliyeti girilmeyen (ayrılan) kişi dağıtımdan çıkar.
function MaliyetHesaplama() {
  const [st, setSt] = useState({ loading: true, kisiler: [], pasif: {}, aylikSaat: {}, maliyet: { aylar: {} }, tatiller: VARSAYILAN_TATILLER, error: '' });
  const [ay, setAy] = useState(new Date().getMonth()); // 0-11
  const [girdi, setGirdi] = useState({});
  const [dagitimGirdi, setDagitimGirdi] = useState(null);
  const [busy, setBusy] = useState('');
  const [kisiYukleniyor, setKisiYukleniyor] = useState(false);
  const [ozetZamani, setOzetZamani] = useState(null);
  const [rapor, setRapor] = useState(null);
  // Canlı Everhour okuması (yavaş): kişi listesi yoksa ya da "Yenile" ile
  const canliYukle = useCallback(async () => {
    setKisiYukleniyor(true);
    const r = await api('/api/everhour');
    if (r.ok) {
      setSt((x) => ({ ...x, kisiler: r.data.kisiler || [], aylikSaat: r.data.aylikSaat || {}, pasif: r.data.pasif || {}, error: '' }));
      setOzetZamani(r.data.ozetZamani || null);
    } else setSt((x) => ({ ...x, error: r.data.error || 'Everhour verisi alınamadı' }));
    setKisiYukleniyor(false);
  }, []);
  useEffect(() => {
    (async () => {
      // 1) Hızlı: kayıtlı maliyet + tatil + son kişi özeti (Everhour'a gitmez)
      const r = await api('/api/everhour?bolum=maliyet');
      if (!r.ok) { setSt((x) => ({ ...x, loading: false, error: r.data.error || 'Okunamadı' })); return; }
      setSt({ loading: false, kisiler: r.data.kisiler || [], pasif: r.data.pasif || {}, aylikSaat: r.data.aylikSaat || {}, maliyet: r.data.maliyet || { aylar: {} }, tatiller: r.data.tatiller || VARSAYILAN_TATILLER, error: '' });
      setOzetZamani(r.data.ozetZamani);
      // 2) Özet yoksa (ilk kez) kişi listesini canlı çek; form o sırada görünür
      if (!r.data.kisiler) canliYukle();
    })();
  }, [canliYukle]);
  const ym = ayAnahtar(ay);
  const aySaat = aySaati(st.tatiller, new Date().getFullYear(), ay);
  const veri = st.maliyet.aylar[ym] || { kisi: {}, dagitim: 0 };
  const oncekiVar = ay > 0 && !!st.maliyet.aylar[ayAnahtar(ay - 1)];
  const kaydet = async (govde, anahtar) => {
    setBusy(anahtar);
    const r = await api('/api/everhour', { method: 'PUT', body: govde });
    if (r.ok) setSt((x) => ({ ...x, maliyet: r.data.maliyet, error: '' }));
    else setSt((x) => ({ ...x, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };
  const ayDegis = (i) => { setAy(i); setGirdi({}); setDagitimGirdi(null); };
  const kisiKaydet = (name) => {
    if (girdi[name] === undefined) return;
    const n = parseTR(girdi[name]);
    setGirdi((g) => { const c = { ...g }; delete c[name]; return c; });
    if (n !== (Number(veri.kisi[name]) || 0)) kaydet({ ay: ym, maliyetKisi: name, tutar: n }, name);
  };
  const dagitimKaydet = () => {
    if (dagitimGirdi === null) return;
    const n = parseTR(dagitimGirdi);
    setDagitimGirdi(null);
    if (n !== (Number(veri.dagitim) || 0)) kaydet({ ay: ym, dagitim: n }, '__dagitim');
  };
  const canli = { kisi: { ...veri.kisi }, dagitim: dagitimGirdi !== null ? parseTR(dagitimGirdi) : veri.dagitim };
  Object.keys(girdi).forEach((k) => { canli.kisi[k] = parseTR(girdi[k]); });
  const hs = hesaplaAy(canli, aySaat);
  const gosterim = (v) => (v ? Number(v).toLocaleString('tr-TR') : '');
  const saatAy = (k) => st.aylikSaat[k.name]?.[ym] || 0;
  // Everhour listesinde olmayan (süre girmemiş) ama maliyeti kayıtlı kişiler de listelenir
  const bilinen = new Set(st.kisiler.map((k) => k.name));
  const ekstra = [...new Set(Object.values(st.maliyet.aylar).flatMap((a) => Object.keys(a.kisi || {})))].filter((n) => !bilinen.has(n)).map((name) => ({ name }));
  const tumKisiler = [...st.kisiler, ...ekstra];
  const iceAktar = async () => {
    setBusy('__ice');
    const r = await api('/api/everhour', { method: 'PUT', body: { iceAktar: true } });
    if (r.ok) { setSt((x) => ({ ...x, maliyet: r.data.maliyet, error: '' })); setRapor(r.data.rapor); } else setSt((x) => ({ ...x, error: r.data.error || 'Aktarılamadı' }));
    setBusy('');
  };
  const sirali = [...tumKisiler].sort((a, b) => (!!hs.rows[b.name] - !!hs.rows[a.name]) || (saatAy(b) - saatAy(a)));
  const eksik = tumKisiler.filter((k) => saatAy(k) > 0 && !hs.rows[k.name]);
  const input = 'w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm text-right tabular-nums outline-none focus:border-slate-400';
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 mb-1">Personel Maliyet Hesaplama</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Ay seçin; o ay için her personelin aylık toplam ajans maliyetini (maaş + işveren yükü vb.) ve genel işletme dağıtım giderini girin. Dağıtım gideri, o ay maliyeti girilen kişilere kendi maliyetleri oranında paylaştırılır; maliyeti boş bırakılan (ayrılan) kişi dağıtımdan çıkar. Saat maliyeti = toplam maliyet / ayın azami saati ({AY_ADLARI[ay]} için {aySaat.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} saat = hafta içi − resmi tatil, × 8,5). Değer, alandan çıkınca kaydedilir.</p>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 mb-4">
        {AY_ADLARI.map((m, i) => {
          const dolu = !!st.maliyet.aylar[ayAnahtar(i)] && Object.keys(st.maliyet.aylar[ayAnahtar(i)].kisi).length > 0;
          return <button key={m} onClick={() => ayDegis(i)} className={`px-2 py-1.5 rounded-lg text-sm font-medium text-center transition-colors ${ay === i ? 'bg-slate-900 text-white' : dolu ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{m}</button>;
        })}
      </div>
      {st.loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Okunuyor...</div>}
      {st.error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{st.error}</div>}
      {!st.loading && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">Genel işletme dağıtım gideri <span className="text-[11px] font-normal text-slate-400">({AY_ADLARI[ay]} ayı, ₺)</span></div>
            {oncekiVar && <button onClick={() => kaydet({ kopyala: { kaynak: ayAnahtar(ay - 1), hedef: ym } }, '__kopya')} disabled={busy === '__kopya'} className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{AY_ADLARI[ay - 1]} ayından boşları doldur</button>}
            <div className="sm:w-48">
              <input inputMode="decimal" value={dagitimGirdi ?? gosterim(veri.dagitim)} disabled={busy === '__dagitim'} placeholder="0" onChange={(e) => setDagitimGirdi(e.target.value)} onBlur={dagitimKaydet} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label="Genel işletme dağıtım gideri" className={input} />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-400 flex-wrap">
            <button type="button" onClick={iceAktar} disabled={busy === '__ice'} className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">{busy === '__ice' ? 'Aktarılıyor...' : 'Sheet verisini içe aktar'}</button>
            {rapor && <span className="text-emerald-600">{rapor.aylar} ay, {rapor.kayit} kayıt aktarıldı; {rapor.eslesmeyen.length} yeni kişi eklendi ({rapor.eslesmeyen.join(', ')}).</span>}
            {kisiYukleniyor ? <><Loader2 size={12} className="animate-spin" /> Everhour kişi listesi güncelleniyor...</> : <>Kişi listesi {ozetZamani ? `${new Date(ozetZamani).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} itibarıyla` : ''}</>}
            <button type="button" onClick={canliYukle} disabled={kisiYukleniyor} className="underline decoration-dotted hover:text-slate-600 disabled:opacity-50">Yenile</button>
          </div>
          <div className="hidden sm:flex items-center gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="flex-1 min-w-0">Personel</span>
            <span className="w-36 text-right">Aylık maliyet</span>
            <span className="w-28 text-right">Dağıtım payı</span>
            <span className="w-28 text-right">Toplam maliyet</span>
            <span className="w-24 text-right">Saat maliyeti</span>
          </div>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {sirali.map((k) => {
              const h = hs.rows[k.name];
              const sa = saatAy(k);
              return (
                <div key={k.name} className={`py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${!h && !sa ? 'opacity-55' : ''}`}>
                  <div className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-200 uppercase">{k.name}{st.pasif[k.name] && <span className="ml-2 normal-case text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 rounded-full px-1.5 py-0.5">Pasif</span>}<span className="ml-2 text-[11px] text-slate-400 tabular-nums normal-case">{sa ? `${sa.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sa` : 'süre yok'}</span></div>
                  <div className="sm:w-36">
                    <input inputMode="decimal" value={girdi[k.name] ?? gosterim(veri.kisi[k.name])} disabled={busy === k.name} placeholder="0" onChange={(e) => setGirdi((g) => ({ ...g, [k.name]: e.target.value }))} onBlur={() => kisiKaydet(k.name)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label={`${k.name} ${AY_ADLARI[ay]} maliyeti`} className={input} />
                  </div>
                  <div className="flex sm:contents gap-3 text-xs sm:text-sm tabular-nums text-slate-600 dark:text-slate-300">
                    <span className="sm:w-28 sm:text-right">{h ? tl(h.pay) : '–'}</span>
                    <span className="sm:w-28 sm:text-right">{h ? tl(h.toplam) : '–'}</span>
                    <span className="sm:w-24 sm:text-right font-medium text-slate-900 dark:text-slate-50">{h ? tl2(h.saat) : '–'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            <span className="flex-1">Toplam ({AY_ADLARI[ay]})</span>
            <span className="sm:w-36 sm:text-right">{tl(hs.toplamKisi)}</span>
            <span className="sm:w-28 sm:text-right">{tl(hs.toplamKisi ? hs.dagitim : 0)}</span>
            <span className="sm:w-28 sm:text-right">{tl(hs.toplamKisi + (hs.toplamKisi ? hs.dagitim : 0))}</span>
            <span className="sm:w-24" />
          </div>
          {eksik.length > 0 && <p className="text-[11px] text-amber-600 mt-3">{AY_ADLARI[ay]} ayında süre girmiş ama maliyeti girilmemiş {eksik.length} kişi var ({eksik.slice(0, 4).map((k) => k.name).join(', ')}{eksik.length > 4 ? '…' : ''}). Bu kişiler dağıtımdan pay almaz, sayfalarında o ayın maliyet değeri hesaplanmaz.</p>}
          {hs.toplamKisi === 0 && veri.dagitim > 0 && <p className="text-[11px] text-amber-600 mt-2">Dağıtım gideri, kişi maliyeti girilmeden paylaştırılamaz.</p>}
        </>
      )}
    </div>
  );
}

// Resmi tatiller: liste ve aylık iş günü özeti. Azami süre ve saat maliyeti bu listeden hesaplanır.
function ResmiTatiller() {
  const yil = new Date().getFullYear();
  const [st, setSt] = useState({ loading: true, liste: [], error: '', not: '' });
  const [kirli, setKirli] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const r = await api('/api/everhour?bolum=tatil');
      if (r.ok) setSt({ loading: false, liste: r.data.tatiller || VARSAYILAN_TATILLER, error: '', not: '' });
      else setSt((x) => ({ ...x, loading: false, error: r.data.error || 'Liste okunamadı' }));
    })();
  }, []);
  const degistir = (i, alan, v) => { setSt((x) => ({ ...x, not: '', liste: x.liste.map((t, k) => (k === i ? { ...t, [alan]: v } : t)) })); setKirli(true); };
  const sil = (i) => { setSt((x) => ({ ...x, not: '', liste: x.liste.filter((_, k) => k !== i) })); setKirli(true); };
  const ekle = () => { setSt((x) => ({ ...x, not: '', liste: [...x.liste, { tarih: `${yil}-01-01`, ad: '' }] })); setKirli(true); };
  const kaydet = async () => {
    setBusy(true);
    const r = await api('/api/everhour', { method: 'PUT', body: { tatiller: st.liste.map((t) => ({ tarih: t.tarih, ad: t.ad, yarim: !!t.yarim })) } });
    if (r.ok) { setSt((x) => ({ ...x, liste: r.data.tatiller, error: '', not: 'Kaydedildi. Rapor bir sonraki yenilemede yeni iş günlerini kullanır.' })); setKirli(false); }
    else setSt((x) => ({ ...x, error: r.data.error || 'Kaydedilemedi' }));
    setBusy(false);
  };
  const sirali = st.liste.map((t, i) => ({ t, i })).sort((a, b) => (a.t.tarih || '').localeCompare(b.t.tarih || ''));
  const input = 'border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400';
  const toplamTatil = st.liste.filter((t) => t.tarih.startsWith(`${yil}-`)).reduce((s, t) => s + tatilEtkisi(t), 0);
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 mb-1">Resmi Tatiller</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Her ayın azami çalışma süresi = (o ayın hafta içi sayısı − aşağıdaki resmi tatiller) × 8,5 saat. Hafta sonuna denk gelen tatil iş gününden düşmez; "Yarım gün" (arife) 0,5 gün düşer. Köprü/idari izin gibi ek günleri buraya ekleyebilirsiniz. Değişiklikler "Kaydet" ile uygulanır.</p>
      {st.loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Liste okunuyor...</div>}
      {st.error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{st.error}</div>}
      {st.not && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">{st.not}</div>}
      {!st.loading && (
        <>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {sirali.map(({ t, i }) => {
              const etki = tatilEtkisi(t);
              return (
                <div key={i} className="py-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <input type="date" value={t.tarih} onChange={(e) => degistir(i, 'tarih', e.target.value)} aria-label="Tarih" className={`${input} sm:w-40`} />
                  <span className="text-xs text-slate-500 w-8 shrink-0">{t.tarih ? gunAdi(t.tarih) : ''}</span>
                  <input value={t.ad} onChange={(e) => degistir(i, 'ad', e.target.value)} placeholder="Tatil adı" aria-label="Tatil adı" className={`${input} flex-1 min-w-0`} />
                  <select value={t.yarim ? 'yarim' : 'tam'} onChange={(e) => degistir(i, 'yarim', e.target.value === 'yarim')} aria-label="Süre" className={`${input} sm:w-28`}>
                    <option value="tam">Tam gün</option>
                    <option value="yarim">Yarım gün</option>
                  </select>
                  <span className={`text-xs sm:w-28 shrink-0 tabular-nums ${etki ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>{t.tarih && haftaSonu(t.tarih) ? 'hafta sonu, etki yok' : `−${etki.toLocaleString('tr-TR')} iş günü`}</span>
                  <button type="button" onClick={() => sil(i)} aria-label="Sil" title="Sil" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 self-end sm:self-auto"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={ekle} className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">+ Gün ekle</button>
            <button type="button" onClick={kaydet} disabled={!kirli || busy} className="text-xs bg-slate-900 text-white rounded-lg px-4 py-1.5 disabled:opacity-40 flex items-center gap-1.5">{busy && <Loader2 size={12} className="animate-spin" />} Kaydet</button>
            {kirli && <span className="text-[11px] text-amber-600">Kaydedilmemiş değişiklik var</span>}
          </div>
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-6 mb-2">{yil} aylık iş günü özeti <span className="text-[11px] font-normal text-slate-400">(yıllık toplam tatil: {toplamTatil.toLocaleString('tr-TR')} gün)</span></h4>
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
            <div className="grid grid-cols-5 bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 text-center">
              <span className="py-2 text-left pl-3">Ay</span><span className="py-2">Hafta içi</span><span className="py-2">Tatil</span><span className="py-2">İş günü</span><span className="py-2">Azami saat</span>
            </div>
            {AY_ADLARI.map((m, i) => (
              <div key={m} className="grid grid-cols-5 border-t border-slate-100 dark:border-slate-800 text-center tabular-nums text-slate-700 dark:text-slate-300">
                <span className="py-1.5 text-left pl-3">{m}</span>
                <span className="py-1.5">{haftaIci(yil, i)}</span>
                <span className="py-1.5">{tatilGunu(st.liste, yil, i) ? `−${tatilGunu(st.liste, yil, i).toLocaleString('tr-TR')}` : '–'}</span>
                <span className="py-1.5">{ayIsGunu(st.liste, yil, i).toLocaleString('tr-TR')}</span>
                <span className="py-1.5 font-medium">{aySaati(st.liste, yil, i).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EverhourEslestirme({ markalar }) {
  const [state, setState] = useState({ loading: true, musteriler: [], map: {}, error: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const r = await api('/api/everhour');
    if (r.ok) setState({ loading: false, musteriler: r.data.musteriler || [], map: r.data.map || {}, error: '' });
    else setState((s) => ({ ...s, loading: false, error: r.data.error || 'Everhour verisi alınamadı' }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const markaKeys = new Set((markalar || []).map((m) => normalizeNameKey(m)));
  const durum = (name) => {
    if (state.map[name]) return { tip: 'elle', brand: state.map[name] };
    const a = autoBrand(name);
    if (a) return { tip: 'otomatik', brand: a };
    if (markaKeys.has(normalizeNameKey(name))) return { tip: 'otomatik', brand: name };
    return { tip: 'yok', brand: '' };
  };

  const sec = async (name, brand) => {
    setBusy(name);
    const r = await api('/api/everhour', { method: 'PUT', body: { name, brand } });
    if (r.ok) setState((s) => ({ ...s, map: r.data.map, error: '' }));
    else setState((s) => ({ ...s, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };

  const eslesmeyen = state.musteriler.filter((m) => durum(m.name).tip === 'yok');
  const siralanmis = [...eslesmeyen, ...state.musteriler.filter((m) => durum(m.name).tip !== 'yok')];

  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 mb-1">Everhour Müşteri Eşleştirme</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Süre Analiz, Everhour'daki müşteri adlarını dashboard markalarıyla eşleştirir. Adı farklı yazılanları buradan seçin (örnek: Everhour'da "BMS Design Center", dashboard'da "B.M.S"). Seçim bir sonraki yenilemede uygulanır.</p>
      {state.loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Everhour müşterileri okunuyor...</div>}
      {state.error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{state.error}</div>}
      {!state.loading && !state.error && (
        <>
          <div className="text-xs text-slate-500 mb-3">{state.musteriler.length} müşteri · <span className={eslesmeyen.length ? 'text-amber-600 font-medium' : ''}>{eslesmeyen.length} eşleşmedi</span></div>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {siralanmis.map((m) => {
              const d = durum(m.name);
              return (
                <div key={m.name} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-200">
                    {m.name}
                    <span className="ml-2 text-[11px] text-slate-400 tabular-nums">{m.hours} sa</span>
                    {d.tip === 'yok' && <span className="ml-2 text-[10px] font-medium border border-amber-300 text-amber-600 rounded-full px-1.5 py-0.5">eşleşmedi</span>}
                    {d.tip === 'otomatik' && <span className="ml-2 text-[10px] text-slate-400">otomatik → {d.brand}</span>}
                  </div>
                  <select
                    value={state.map[m.name] || ''}
                    disabled={busy === m.name}
                    onChange={(e) => sec(m.name, e.target.value)}
                    className="sm:w-60 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">{d.tip === 'otomatik' ? 'Otomatik' : 'Marka seçin...'}</option>
                    {(markalar || []).map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Yonetim({ me, tumSayfalar, markalar, onViewAs }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [yeni, setYeni] = useState({ email: '', name: '', title: '' });
  const [bolum, setBolum] = useState(''); // '' | 'everhour' | 'departman'

  const load = useCallback(async () => {
    const r = await api('/api/users');
    if (r.ok) setUsers(r.data.users);
    else setError(r.data.error || 'Kullanıcılar okunamadı');
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (u, key) => {
    setBusy(key || u.email);
    setError('');
    const r = await api('/api/users', { method: 'PUT', body: u });
    if (r.ok) setUsers(r.data.users);
    else setError(r.data.error || 'Kaydedilemedi');
    setBusy('');
    return r.ok;
  };

  const remove = async (u) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`${u.name || u.email} erişimden çıkarılsın mı?`)) return;
    setBusy(u.email);
    setError('');
    const r = await api('/api/users', { method: 'DELETE', body: { email: u.email } });
    if (r.ok) setUsers(r.data.users);
    else setError(r.data.error || 'Çıkarılamadı');
    setBusy('');
  };

  const togglePage = (u, id) => {
    const has = u.pages.includes(id);
    save({ ...u, pages: has ? u.pages.filter((p) => p !== id) : [...u.pages, id] });
  };

  const ekle = async (e) => {
    e.preventDefault();
    const ok = await save({ ...yeni, role: 'member', pages: [] }, 'yeni');
    if (ok) setYeni({ email: '', name: '', title: '' });
  };

  if (!users) {
    return (
      <div className={`${CARD} p-6 flex items-center gap-3 text-sm text-slate-500`}>
        {error ? <span className="text-rose-600">{error}</span> : (<><Loader2 size={16} className="animate-spin" /> Kullanıcılar yükleniyor...</>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <select value={bolum} onChange={(e) => setBolum(e.target.value)} aria-label="Görünüm" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400">
          <option value="">Kullanıcılar ve Yetkiler</option>
          <option value="everhour">Everhour Müşteri Eşleştirme</option>
          <option value="departman">Personel Departman Eşleştirme</option>
          <option value="maliyet">Personel Maliyet Hesaplama</option>
          <option value="tatil">Resmi Tatiller</option>
        </select>
      </div>
      {bolum === '' && (
      <>
      <div className={`${CARD} p-4 sm:p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Kullanıcılar ve Yetkiler</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Her üyenin görebileceği sayfaları işaretleyin. Yetkisi olmayan sayfanın verisi o kişiye hiç gönderilmez. Admin her sayfayı ve bu Yönetim sayfasını görür.</p>
        {error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => {
            const isMe = u.email === me.email;
            const admin = u.role === 'admin';
            return (
              <div key={u.email} className="py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50 flex items-center gap-2 flex-wrap">
                      {u.name || u.email}
                      {admin && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><ShieldCheck size={11} /> Admin</span>}
                      {isMe && <span className="text-[10px] text-slate-400">(siz)</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 break-all">{u.email}{u.title ? ` · ${u.title}` : ''}</div>
                  </div>
                  {busy === u.email && <Loader2 size={14} className="animate-spin text-slate-400 mt-1" />}
                  {!isMe && (
                    <>
                      {onViewAs && <button type="button" onClick={() => onViewAs(u)} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">Bu kullanıcı olarak görüntüle</button>}
                      <button type="button" onClick={() => save({ ...u, role: admin ? 'member' : 'admin' })} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">
                        {admin ? 'Üye yap' : 'Admin yap'}
                      </button>
                      <button type="button" onClick={() => remove(u)} aria-label="Erişimden çıkar" title="Erişimden çıkar" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tumSayfalar.map((p) => {
                    const on = admin || u.pages.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={admin}
                        onClick={() => togglePage(u, p.id)}
                        className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-lg border transition-colors ${on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'} ${admin ? 'opacity-70 cursor-default' : ''}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={ekle} className={`${CARD} p-4 sm:p-5 flex flex-col gap-3`}>
        <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 flex items-center gap-2"><UserPlus size={16} /> Üye Ekle</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input required type="email" value={yeni.email} onChange={(e) => setYeni({ ...yeni, email: e.target.value })} placeholder="Google e-postası" className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <input value={yeni.name} onChange={(e) => setYeni({ ...yeni, name: e.target.value })} placeholder="Ad soyad" className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <input value={yeni.title} onChange={(e) => setYeni({ ...yeni, title: e.target.value })} placeholder="Ünvan" className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy === 'yeni'} className="bg-slate-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-slate-700 transition-colors disabled:opacity-60">Ekle</button>
          <span className="text-[11px] text-slate-400">Yeni üye başta hiçbir sayfayı göremez; yukarıdan yetki verin.</span>
        </div>
      </form>

      </>
      )}
      {bolum === 'everhour' && <EverhourEslestirme markalar={markalar} />}
      {bolum === 'departman' && <DepartmanEslestirme />}
      {bolum === 'maliyet' && <MaliyetHesaplama />}
      {bolum === 'tatil' && <ResmiTatiller />}
    </div>
  );
}
