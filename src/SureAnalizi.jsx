// Süre Analizi: markalara harcanan süre, saatlik baza göre tüketilen bütçe ve fee ile farkı.
// Süre: zaman takip raporu (sunucuda api/_data/sureler.js; yalnızca yetkili kullanıcıya gelir). Fee + Proje: SATIŞ TABLOSU 2026 faturaları (KDV hariç).
// Fatura durumu: Satış Tablosu. Satış Tablosu'nda olup süre girilmemiş markalar 0 süreyle listelenir.
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { buildSure, buildPersonel, buildDepartman, kisiAyDizisi, DEPARTMAN_YOK, FEE_BAZI } from './lib/sure.js';
import Karsilastirma from './Karsilastirma.jsx';
import { verimlilikSkoru, skorKirmizi } from './lib/karsilastirma.js';
import { MarkaDetay, KisiDetay, ESIK, ORAN_KIRMIZI } from './SureDetay.jsx';
import { aySaati, VARSAYILAN_TATILLER } from './lib/takvim.js';
import { normalizeNameKey } from './lib/parseData.js';
import { hesaplaMaliyet, ayAnahtar } from './lib/maliyet.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtSaat = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');

// Fark = Saat x Baz − Fee. Pozitif: fee'den fazla zaman harcanmış (kırmızı). Negatif: fee içinde kalınmış (yeşil). Eksi işareti gösterilmez.
const farkText = (v) => (Math.round(v) > 0 ? 'text-rose-600 dark:text-rose-400' : Math.round(v) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400');
const farkCell = (v) => (Math.round(v) > 0 ? 'bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200' : Math.round(v) < 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : '');

export default function SureAnalizi({ months, ayDurumu, revenueRaw, satisRows, satisError, pasifMarkalar, sureData, sureError, gorunumler }) {
  const [selected, setSelected] = useState('Toplam');
  // Düğme tepkisi anında (selected), ağır tablolar hemen ardından (sel) çizilir: tıklama sırasında arayüz kilitlenmez
  const sel = useDeferredValue(selected);
  const temelGorunum = gorunumler?.length ? gorunumler : ['musteri'];
  const izinliGorunum = temelGorunum;
  const personelAcik = izinliGorunum.some((g) => g !== 'musteri');
  const [gorunum, setGorunum] = useState(temelGorunum[0]); // 'musteri' | 'personel' | 'departman' (yalnızca yetkili olanlar)
  const gor = useDeferredValue(gorunum);
  const [siralama, setSiralama] = useState({ k: 'sure', yon: 'desc' }); // Personel listesi sıralaması
  const [kars, setKars] = useState(null); // personel sayfasından gelen hızlı karşılaştırma: { a, b, k }
  const [yigin, setYigin] = useState([]); // alt sayfa geçmişi: [{ t: 'm' | 'k', n: ad }]
  const setSeciliMarka = (n) => setYigin([{ t: 'm', n }]);
  const setSeciliKisi = (n) => setYigin([{ t: 'k', n }]);
  const geri = () => setYigin((y) => y.slice(0, -1));

  const pasifKeys = useMemo(() => new Set((pasifMarkalar || []).map((n) => normalizeNameKey(n))), [pasifMarkalar]);

  const { brands, disi } = useMemo(
    () => buildSure({ rows: sureData?.rows || [], months, ayDurumu, revenueRaw, satisRows }),
    [months, ayDurumu, revenueRaw, satisRows, sureData]
  );

  const guncelIdx = months.map((_, i) => i).filter((i) => ayDurumu?.[i] === 'güncel');
  const periodIdx = sel === 'Toplam' ? guncelIdx : [months.indexOf(sel)];
  const rangeLabel = guncelIdx.length ? `${months[guncelIdx[0]]}-${months[guncelIdx[guncelIdx.length - 1]]}` : '';

  // Fark yalnızca süre girilmiş aylar için hesaplanır; süre girilmemiş ayın fee'si farka katılmaz
  const calc = (b, idxs) => {
    let hours = 0;
    let saatBaz = 0;
    let fee = 0;
    let fark = 0;
    idxs.forEach((i) => {
      hours += b.hours[i];
      saatBaz += b.tip === 'ic' ? 0 : b.hours[i] * FEE_BAZI[i];
      fee += b.fee[i] + b.proje[i];
      fark += (b.tip === 'ic' ? 0 : b.hours[i] * FEE_BAZI[i]) - (b.fee[i] + b.proje[i]);
    });
    return { hours, saatBaz, fee, fark, faturali: idxs.some((i) => b.faturali[i]) };
  };

  const personel = useMemo(() => buildPersonel({ rows: sureData?.personel || [], idxs: periodIdx, pasif: sureData?.pasif }), [sureData, sel, ayDurumu]); // eslint-disable-line react-hooks/exhaustive-deps
  // Azami süre: her ayın hafta içi sayısı - resmi tatiller (Yönetim > Resmi Tatiller), x 8,5 saat
  const yil = new Date().getFullYear();
  const tatiller = sureData?.tatiller || VARSAYILAN_TATILLER;
  const maksSaat = (i) => aySaati(tatiller, yil, i);
  const maliyetHesap = useMemo(() => hesaplaMaliyet(sureData?.maliyet, (ym) => aySaati(tatiller, yil, Number(ym.slice(5, 7)) - 1)), [sureData]); // eslint-disable-line react-hooks/exhaustive-deps
  const pasifSet = useMemo(() => new Set(Object.keys(sureData?.pasif || {})), [sureData]);
  const departmanlar = useMemo(() => buildDepartman({ personel, map: sureData?.departman }), [personel, sureData]);
  const personelToplam = personel.reduce((s, u) => s + u.hours, 0);

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

  // Üst kartlar (Müşteri / Personel / Departman görünümünde aynı): azami süre = 22 gün x 8,5 saat x dönemdeki kişi-ay sayısı
  const kisiAyD = sureData?.kisiAy || kisiAyDizisi({ rows: sureData?.personel || [], idxs: periodIdx, pasif: sureData?.pasif });
  const kisiAy = periodIdx.reduce((t, i) => t + (kisiAyD[i] || 0), 0);
  const maksToplam = periodIdx.reduce((t, i) => t + (kisiAyD[i] || 0) * maksSaat(i), 0);
  const sureOrani = maksToplam ? toplam / maksToplam : null;
  const donem = `(${sel === 'Toplam' ? rangeLabel : sel})`;
  const kartlar = [
    ['Maksimum Kapasite', maksToplam ? `${fmtN(maksToplam)} Saat` : '–', maksToplam ? `${kisiAy} kişi-ay · iş günü × 8,5 sa` : 'kişi bazlı veri yok', ''],
    ['Gerçekleşen Süre', `${fmtN(toplam)} Saat`, donem, ''],
    ['Süre Oranı', sureOrani == null ? '–' : pct1(sureOrani), 'toplam süre / maksimum süre', sureOrani != null && sureOrani < ESIK ? ORAN_KIRMIZI : ''],
    ['Girilen Süre', `${fmtN(aktif)} Saat`, `${pct1(toplam ? aktif / toplam : 0)} · ${donem}`, ''],
    ['Atanmamış Süre', `${fmtN(atil)} Saat`, `${pct1(toplam ? atil / toplam : 0)} · ${donem}`, ''],
    ['Kayıp Süre', `${fmtN(kayip)} Saat`, `${pct1(toplam ? kayip / toplam : 0)} · ${donem}`, ''],
  ];
  const UstKartlar = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
      {kartlar.map(([label, v, sub, cls]) => (
        <div key={label} className={`${CARD} p-4`}>
          <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          <div className={`text-base sm:text-lg lg:text-xl font-semibold tabular-nums mt-1 whitespace-nowrap ${cls || 'text-slate-900 dark:text-slate-50'}`}>{v}</div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block leading-snug">{sub}</span>
        </div>
      ))}
    </div>
  );

  const pillClass = (m, active) => {
    const durum = ayDurumu?.[months.indexOf(m)];
    if (durum === 'güncel') return active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return active ? 'bg-rose-300 text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100';
  };

  const COL_SURE = 'w-[4.25rem] sm:w-28';
  const COL_FARK = 'w-[5.25rem] sm:w-32';

  const TableHead = ({ label }) => (
    <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
      <span className="w-5 sm:w-6 shrink-0" />
      <span className="flex-1 min-w-0">{label}</span>
      <span className={`${COL_SURE} text-right shrink-0`}>Süre</span>
      <span className={`${COL_FARK} text-right shrink-0`}>Fark</span>
    </div>
  );

  const Row = ({ r, i, kirmizi, soluk }) => {
    const sureYok = r.tip === 'marka' && r.hours === 0;
    return (
      <div className="flex items-start gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm leading-5 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
        <span className="text-slate-400 dark:text-slate-500 w-5 sm:w-6 text-right tabular-nums shrink-0">{i}</span>
        <span className="flex-1 min-w-0 break-words text-left">
          <button
            type="button"
            onClick={() => setSeciliMarka(r.name)}
            className={`text-left hover:underline underline-offset-2 ${kirmizi ? 'text-rose-600 dark:text-rose-400' : soluk ? 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400' : 'text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
          >
            {r.name}
          </button>
          {r.tip === 'marka' && pasifKeys.has(normalizeNameKey(r.name)) && <span className="ml-1.5 text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-0.5 align-middle whitespace-nowrap">Pasif</span>}
          {!r.eslesti && <span className="ml-1.5 text-[10px] font-medium border border-amber-300 text-amber-600 rounded-full px-1.5 py-0.5 align-middle whitespace-nowrap">eşleşmedi</span>}
          {sureYok && <span className="ml-1.5 text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-0.5 align-middle whitespace-nowrap">süre girilmemiş</span>}
        </span>
        <span className={`tabular-nums ${COL_SURE} text-right shrink-0 leading-tight whitespace-nowrap ${kirmizi ? 'text-rose-600 dark:text-rose-400' : sureYok ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
          {fmtN(r.hours)} sa
          <span className="block text-[10px] sm:text-[11px] leading-4 text-slate-400 dark:text-slate-500">{pct1(toplam ? r.hours / toplam : 0)}</span>
        </span>
        <span className={`tabular-nums font-medium ${COL_FARK} text-right shrink-0 whitespace-nowrap ${farkText(r.fark)}`}>
          {'₺' + fmtN(Math.abs(r.fark))}
        </span>
      </div>
    );
  };

  // Marka araması: ad -> marka tablosu bir kez kurulur (her çağrıda tüm listeyi taramaz)
  const brandMap = useMemo(() => {
    const m = new Map();
    [...brands, ...disi].forEach((b) => { const k = normalizeNameKey(b.name); if (!m.has(k)) m.set(k, b); });
    return m;
  }, [brands, disi]);
  const brandOf = (ad) => brandMap.get(normalizeNameKey(ad)) || null;
  // Kayıt oranı: kişinin süresinin, dönemde faturası kesilmiş markalara giden payı
  const kayitOrani = (u) => {
    if (!u.hours) return 0;
    const f = u.clients.reduce((t, c) => {
      const b = brandOf(c.name);
      return t + (b && b.tip === 'marka' && periodIdx.some((i) => b.faturali[i]) ? c.hours : 0);
    }, 0);
    return f / u.hours;
  };
  // Personel listesi göstergeleri (kayıt oranı, maks. süre, oran, Verimlilik Skoru): dönem/veri değişince bir kez hesaplanır;
  // sıralama tıklamaları yeniden hesap yapmaz. Skor Karşılaştırma sayfasıyla aynı formülü kullanır.
  // Ort. Saat Maliyeti: ay ay (saat maliyeti x süre) toplamı / maliyeti bilinen aylardaki süre
  const ortSaatMaliyet = (ad, ayH) => {
    let deger = 0; let saat = 0;
    Object.entries(ayH || {}).forEach(([i, h]) => { const sm = maliyetHesap[ayAnahtar(Number(i))]?.rows[ad]?.saat || 0; if (sm > 0 && h > 0) { deger += h * sm; saat += h; } });
    return saat ? deger / saat : null;
  };
  const personelOlcu = useMemo(() => {
    const m = new Map();
    personel.forEach((u) => {
      const maks = u.aySet.reduce((t, i) => t + maksSaat(i), 0);
      const kayip = u.clients.reduce((t, c) => {
        const bm = brandOf(c.name);
        return t + (bm && bm.tip === 'marka' && !periodIdx.some((i) => bm.faturali[i]) ? c.hours : 0);
      }, 0);
      const kayit = kayitOrani(u);
      m.set(u.name, { maks, ort: ortSaatMaliyet(u.name, u.ayH), kayit, oran: u.aylar && maks ? u.hours / maks : null, skor: verimlilikSkoru({ oran: maks ? u.hours / maks : null, kayitOrani: u.hours ? kayit : null, kayip, toplam: u.hours, sureliAy: u.hours > 0 ? 1 : 0 }) });
    });
    return m;
  }, [personel, brandMap, sel, maliyetHesap]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sıralama: boş (–) değerler yönden bağımsız hep sonda. Başlık oku anında, liste ertelenmiş değerle güncellenir.
  const personelMap = useMemo(() => new Map(personel.map((u) => [u.name, u])), [personel]);
  const siraDef = useDeferredValue(siralama);
  const siralaDeger = {
    kayit: (u) => (u.hours ? personelOlcu.get(u.name)?.kayit : null),
    ort: (u) => personelOlcu.get(u.name)?.ort ?? null,
    oran: (u) => personelOlcu.get(u.name)?.oran ?? null,
    skor: (u) => personelOlcu.get(u.name)?.skor?.toplam ?? null,
    sure: (u) => u.hours,
  };
  const siraliPersonel = useMemo(() => {
    const f = siralaDeger[siraDef.k];
    const m = siraDef.yon === 'asc' ? 1 : -1;
    return personel.map((u) => ({ u, v: f(u) })).sort((x, y) => (x.v == null) - (y.v == null) || (x.v == null ? 0 : (x.v - y.v) * m)).map((x) => x.u);
  }, [personel, personelOlcu, siraDef]); // eslint-disable-line react-hooks/exhaustive-deps
  const sirala = (k) => setSiralama((s) => (s.k === k ? { k, yon: s.yon === 'desc' ? 'asc' : 'desc' } : { k, yon: 'desc' }));
  const SiraBasligi = ({ k, label, cls }) => (
    <button type="button" onClick={() => sirala(k)} className={`${cls} text-right shrink-0 leading-tight uppercase tracking-wide hover:text-slate-700 dark:hover:text-slate-200 ${siralama.k === k ? 'text-slate-700 dark:text-slate-200 font-semibold' : ''}`}>
      {label}{siralama.k === k ? (siralama.yon === 'desc' ? ' ↓' : ' ↑') : ''}
    </button>
  );
  const COL_ORT = 'w-16 sm:w-24';
  const tlSaat = (v) => (v == null ? '–' : '₺' + v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  // Personel ve Departman görünümlerinin ortak tablo başlığı ve satırı (sütunlar birebir aynı)
  const olcuBaslik = (etiket) => (
    <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
      <span className="w-5 sm:w-6 shrink-0" />
      <span className="flex-1 min-w-0">{etiket}</span>
      <SiraBasligi k="ort" label="Ort. Saat Maliyeti" cls={COL_ORT} />
      <SiraBasligi k="kayit" label="Kayıt Oranı" cls="w-14 sm:w-20" />
      <SiraBasligi k="oran" label="Maks. Kapasite" cls="w-14 sm:w-24" />
      <SiraBasligi k="skor" label="Verimlilik Skoru" cls="w-14 sm:w-20" />
    </div>
  );
  const olcuHucreleri = (o, hours, aylar) => {
    const orn = o && o.maks && aylar ? hours / o.maks : null;
    return (
      <>
        <span className={`${COL_ORT} text-right shrink-0 tabular-nums text-slate-700 dark:text-slate-300`}>{tlSaat(o?.ort)}</span>
        <span className={`w-14 sm:w-20 text-right shrink-0 tabular-nums ${o?.kayit < ESIK ? ORAN_KIRMIZI : 'text-slate-700 dark:text-slate-300'}`}>{pct1(o?.kayit || 0)}</span>
        <span className={`w-14 sm:w-24 text-right shrink-0 tabular-nums ${orn != null && orn < ESIK ? ORAN_KIRMIZI : 'text-slate-700 dark:text-slate-300'}`}>{orn != null ? pct1(orn) : '–'}</span>
        <span className={`w-14 sm:w-20 text-right shrink-0 tabular-nums ${skorKirmizi(o?.skor) ? ORAN_KIRMIZI : 'text-slate-700 dark:text-slate-300'}`}>{o?.skor ? Math.round(o.skor.toplam) : '–'}</span>
      </>
    );
  };
  const personelSatiri = (u, no) => (
    <button key={u.name} type="button" onClick={() => setSeciliKisi(u.name)} className="flex items-start gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm leading-5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
      <span className="text-slate-400 dark:text-slate-500 w-5 sm:w-6 text-right tabular-nums shrink-0">{no}</span>
      <span className="flex-1 min-w-0 break-words text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 uppercase">{u.name}{pasifSet.has(u.name) && <span className="ml-2 normal-case text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 rounded-full px-1.5 py-0.5">Pasif</span>}</span>
      {olcuHucreleri(personelOlcu.get(u.name), u.hours, u.aylar)}
    </button>
  );
  // Departman toplamı: kişilerin ölçülerinden (maliyet süre ağırlıklı, kapasite toplamı, kayıp süre toplamı)
  const depOlcu = (d) => {
    const us = d.kisiler.map((k) => personelMap.get(k.name)).filter(Boolean);
    const ol = us.map((u) => personelOlcu.get(u.name)).filter(Boolean);
    const maks = ol.reduce((t, o) => t + o.maks, 0);
    const hours = us.reduce((t, u) => t + u.hours, 0);
    let deger = 0; let saat = 0;
    us.forEach((u) => { const o = personelOlcu.get(u.name); if (o?.ort != null) { const h = Object.entries(u.ayH || {}).filter(([i]) => (maliyetHesap[ayAnahtar(Number(i))]?.rows[u.name]?.saat || 0) > 0).reduce((t, [, x]) => t + x, 0); deger += o.ort * h; saat += h; } });
    const kayit = kayitOrani(d);
    const kayipS = d.clients.reduce((t, c) => { const bm = brandOf(c.name); return t + (bm && bm.tip === 'marka' && !periodIdx.some((i) => bm.faturali[i]) ? c.hours : 0); }, 0);
    return { maks, ort: saat ? deger / saat : null, kayit, skor: verimlilikSkoru({ oran: maks ? hours / maks : null, kayitOrani: hours ? kayit : null, kayip: kayipS, toplam: hours, sureliAy: hours > 0 ? 1 : 0 }), hours, aylar: us.reduce((t, u) => t + u.aylar, 0) };
  };
  const sayfa = yigin[yigin.length - 1];
  const etiket = yigin.length > 1 ? 'Geri' : null;
  if (sayfa?.t === 'm') {
    const b = brandOf(sayfa.n);
    if (b) {
      return (
        <MarkaDetay key={'m' + b.name} brand={b} months={months} ayDurumu={ayDurumu} personelRows={sureData?.personel || []} pasifKisiler={pasifSet} personelAcik={personelAcik} pasif={pasifKeys.has(normalizeNameKey(b.name))}
          onBack={geri} backLabel={etiket || 'Tüm markalar'} onKisi={(n) => setYigin((y) => [...y, { t: 'k', n }])} />
      );
    }
  }
  if (sayfa?.t === 'k') {
    return (
      <KisiDetay key={'k' + sayfa.n} name={sayfa.n} months={months} ayDurumu={ayDurumu} personelRows={sureData?.personel || []} brandOf={brandOf} departman={sureData?.departman} maliyetAy={Object.fromEntries(Object.entries(maliyetHesap).map(([ym, h]) => [ym, h.rows[sayfa.n]?.saat || 0]))} maliyetAcik={!!sureData?.maliyet} maksSaat={maksSaat} pasif={pasifSet.has(sayfa.n)} pasifMarkaKeys={pasifKeys}
        karsilastirKisiler={izinliGorunum.includes('karsilastirma') ? personel.map((u) => u.name).sort((x, y) => x.localeCompare(y, 'tr')) : null}
        onKarsilastir={(a, b) => { setKars({ a, b, k: Date.now() }); setGorunum('karsilastirma'); setYigin([]); }}
        onBack={geri} backLabel={etiket || 'Tüm personel'} onMarka={(n) => { const b = brandOf(n); if (b) setYigin((y) => [...y, { t: 'm', n: b.name }]); }} />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {sureError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs sm:text-sm px-4 py-3">
          Everhour verisi alınamadı ({sureError}); son dışa aktarılan rapor gösteriliyor.
        </div>
      )}
      {!satisRows?.length && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs sm:text-sm px-4 py-3">
          Satış Tablosu verisi alınamadı{satisError ? ` (${satisError})` : ''}; bu yüzden faturalı/faturasız ayrımı ve Fee + Proje değerleri hesaplanamıyor. Sayfayı yenileyip tekrar deneyin.
        </div>
      )}
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
          <select
            value={gorunum}
            onChange={(e) => setGorunum(e.target.value)}
            aria-label="Görünüm"
            className="ml-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400"
          >
            {izinliGorunum.includes('musteri') && <option value="musteri">Müşteri</option>}
            {izinliGorunum.includes('personel') && <option value="personel">Personel</option>}
            {izinliGorunum.includes('departman') && <option value="departman">Departman</option>}
            {izinliGorunum.includes('karsilastirma') && <option value="karsilastirma">Karşılaştırma</option>}
          </select>
        </div>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5">
          {months.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelected(m)}
              className={`px-2 py-1.5 rounded-lg text-sm font-medium text-center transition-colors ${pillClass(m, selected === m)}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {gor === 'karsilastirma' ? (
        <Karsilastirma key={kars?.k || 0} baslangic={kars ? [kars.a, kars.b] : null}
          kisiler={[...personel.map((u) => u.name)].sort((x, y) => x.localeCompare(y, 'tr'))} rows={sureData?.personel || []} departman={sureData?.departman} pasifSet={pasifSet}
          per={periodIdx} donem={donem} maksSaat={maksSaat} brandOf={brandOf} months={months} maliyetAcik={!!sureData?.maliyet}
          maliyetAy={(u) => Object.fromEntries(Object.entries(maliyetHesap).map(([ym, h]) => [ym, h.rows[u]?.saat || 0]))}
        />
      ) : gor === 'departman' ? (
        <>
          {UstKartlar}
          <div className={`${CARD} p-5`}>
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Departman Bazlı Süre Dağılımı</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Personelin Everhour'a girdiği süreler, Yönetim'deki departman eşleştirmesine göre toplanır. Her departman, Personel Bazlı Süre Dağılımı ile aynı sütunlarla listelenir; kişi adına tıklayınca ayrıntısı açılır. Departman satırı, kişilerin toplamıdır.</p>
            {departmanlar.map((d) => {
              const o = depOlcu(d);
              const sirali = d.kisiler.map((k) => personelMap.get(k.name)).filter(Boolean).map((u) => ({ u, v: siralaDeger[siraDef.k](u) })).sort((x, y) => (x.v == null) - (y.v == null) || (x.v == null ? 0 : (x.v - y.v) * (siraDef.yon === 'asc' ? 1 : -1))).map((x) => x.u);
              return (
                <div key={d.name} className="mt-6 first:mt-2">
                  <h3 className={`text-sm font-semibold uppercase mb-2 ${d.name === DEPARTMAN_YOK ? 'text-amber-600' : 'text-slate-800 dark:text-slate-100'}`}>{d.name} <span className="ml-1 text-[11px] font-normal normal-case text-slate-400">{d.kisiler.filter((k) => !pasifSet.has(k.name)).length} aktif kişi · {fmtN(d.hours)} sa · {pct1(personelToplam ? d.hours / personelToplam : 0)}</span></h3>
                  {olcuBaslik('Personel')}
                  <div className="flex flex-col">
                    {sirali.map((u, k) => personelSatiri(u, k + 1))}
                    <div className="flex items-start gap-2 sm:gap-3 pt-2.5 text-[11px] sm:text-sm leading-5 font-semibold text-slate-900 dark:text-slate-50 border-t-2 border-slate-200 dark:border-slate-700">
                      <span className="w-5 sm:w-6 shrink-0" />
                      <span className="flex-1 min-w-0">Departman</span>
                      {olcuHucreleri(o, o.hours, o.aylar)}
                    </div>
                  </div>
                </div>
              );
            })}
            {departmanlar.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için personel verisi yok.</div>}
            {departmanlar.some((d) => d.name === DEPARTMAN_YOK) && <p className="text-[11px] text-amber-600 mt-3">Bazı kişilerin departmanı atanmamış; Yönetim sayfasındaki "Personel Departman Eşleştirme" bölümünden atayabilirsiniz.</p>}
          </div>

        </>
      ) : gor === 'personel' ? (
        <>
          {UstKartlar}
          <div className={`${CARD} p-5`}>
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Personel Bazlı Süre Dağılımı</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Kişi adına tıklayınca aylık süreleri ve müşteri kırılımı açılır. Maks. Kapasite = süre / maksimum süre; maksimum süre, süre girdiği ayların (hafta içi − resmi tatil) × 8,5 saatlik toplamıdır. Ort. Saat Maliyeti = ay ay (saat maliyeti × süre) / süre. Kayıt Oranı ve Maks. Kapasite %85'in altındaysa kırmızı. Verimlilik Skoru (0–100, %80 altı kırmızı): Süre Oranı %40, Kayıt Oranı %40, Kayıp Süre payı (ters) %20; süre girilmemişse –. Sütun başlığına tıklayarak o sütuna göre sıralayabilirsiniz (tekrar tıklayınca yön değişir).</p>
            {olcuBaslik('Personel')}
            <div className="flex flex-col">
              {siraliPersonel.map((u, k) => personelSatiri(u, k + 1))}
              {personel.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için personel verisi yok{sureData?.personel ? '' : ' (kişi bazlı veri yalnızca Everhour kaynağından gelir)'}.</div>}
            </div>
          </div>
        </>
      ) : (
        <>
      {UstKartlar}

      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Süre Dağılımı</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Fark = harcanan süre × saatlik baz − aynı dönemin Fee + Proje faturası (Satış Tablosu, KDV hariç). Satış Tablosu'nda faturası olup süresi girilmemiş markalar 0 süreyle listelenir. Marka adına tıklayınca aylık ayrıntı açılır.
        </p>
        <TableHead label="Marka" />
        <div className="flex flex-col">
          {faturali.map((r, k) => <Row key={r.name} r={r} i={k + 1} />)}
          {faturali.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için veri yok.</div>}
        </div>
      </div>

      <div className={`${CARD} p-5 border-rose-200 dark:border-rose-900/60`}>
        <h2 className="font-serif text-lg text-rose-600 dark:text-rose-400 mb-1">Kayıp Süre</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Faturası kesilmeyen markalara harcanan süre.</p>
        <TableHead label="Marka" />
        <div className="flex flex-col">
          {faturasiz.map((r, k) => <Row key={r.name} r={r} i={k + 1} kirmizi />)}
          {faturasiz.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için kayıt yok.</div>}
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Atanmamış Süre</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Kreatif iç süresi ve markaya atanmamış kayıtlar.</p>
        <TableHead label="Kalem" />
        <div className="flex flex-col">
          {markaDisi.map((r) => <Row key={r.name} r={r} i="·" soluk />)}
          {markaDisi.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için kayıt yok.</div>}
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Genel Toplam</h2>
        <TableHead label="Grup" />
        {[
          ['Faturalı Markalar', gFaturali, 'text-slate-700 dark:text-slate-300'],
          ['Kayıp Süre', gFaturasiz, 'text-rose-600 dark:text-rose-400'],
          ['Atanmamış Süre', gAtil, 'text-slate-700 dark:text-slate-300'],
        ].map(([label, g, c]) => (
          <div key={label} className="flex items-start gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm leading-5 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
            <span className="w-5 sm:w-6 shrink-0" />
            <span className={`flex-1 min-w-0 ${c}`}>{label}</span>
            <span className={`tabular-nums ${COL_SURE} text-right shrink-0 whitespace-nowrap ${c}`}>{fmtN(g.hours)} sa</span>
            <span className={`tabular-nums font-medium ${COL_FARK} text-right shrink-0 whitespace-nowrap ${farkText(g.fark)}`}>{'₺' + fmtN(Math.abs(g.fark))}</span>
          </div>
        ))}
        <div className="flex items-start gap-2 sm:gap-3 pt-3 text-[11px] sm:text-sm leading-5 font-bold text-slate-900 dark:text-slate-50 border-t-2 border-slate-200 dark:border-slate-700 mt-1">
          <span className="w-5 sm:w-6 shrink-0" />
          <span className="flex-1 min-w-0">Genel Toplam</span>
          <span className={`tabular-nums ${COL_SURE} text-right shrink-0 whitespace-nowrap`}>{fmtN(genel.hours)} sa</span>
          <span className={`tabular-nums ${COL_FARK} text-right shrink-0 whitespace-nowrap ${farkText(genel.fark)}`}>₺{fmtN(Math.abs(genel.fark))}</span>
        </div>
        <p className="text-[11px] sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-8 pt-2 text-center leading-relaxed">
          <span className="text-rose-600 dark:text-rose-400">KIRMIZI</span>, Bütçe'den fazla zaman harcandığını, <span className="text-emerald-600 dark:text-emerald-400">YEŞİL</span>, Bütçe içinde kalındığını gösterir.
        </p>
      </div>

        </>
      )}

    </div>
  );
}
