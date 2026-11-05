// Süre Analizi: markalara harcanan süre, saatlik baza göre tüketilen bütçe ve fee ile farkı.
// Süre: zaman takip raporu (sunucuda api/_data/sureler.js; yalnızca yetkili kullanıcıya gelir). Fee + Proje: SATIŞ TABLOSU 2026 faturaları (KDV hariç).
// Fatura durumu: Satış Tablosu. Satış Tablosu'nda olup süre girilmemiş markalar 0 süreyle listelenir.
import React, { useEffect, useMemo, useState } from 'react';
import { buildSure, buildPersonel, buildDepartman, DEPARTMAN_YOK, FEE_BAZI } from './lib/sure.js';
import { MarkaDetay, KisiDetay } from './SureDetay.jsx';
import { normalizeNameKey } from './lib/parseData.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const fmtN = (n) => Math.round(n).toLocaleString('tr-TR');
const fmtSaat = (n) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct1 = (x) => '%' + (x * 100).toFixed(1).replace('.', ',');

// Fark = Saat x Baz − Fee. Pozitif: fee'den fazla zaman harcanmış (kırmızı). Negatif: fee içinde kalınmış (yeşil). Eksi işareti gösterilmez.
const farkText = (v) => (Math.round(v) > 0 ? 'text-rose-600 dark:text-rose-400' : Math.round(v) < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400');
const farkCell = (v) => (Math.round(v) > 0 ? 'bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200' : Math.round(v) < 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200' : '');

export default function SureAnalizi({ months, ayDurumu, revenueRaw, satisRows, satisError, pasifMarkalar, sureData, sureError }) {
  const [selected, setSelected] = useState('Toplam');
  const [gorunum, setGorunum] = useState('musteri'); // 'musteri' | 'personel'
  const [acikDep, setAcikDep] = useState(null);
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
      saatBaz += b.tip === 'ic' ? 0 : b.hours[i] * FEE_BAZI[i];
      fee += b.fee[i] + b.proje[i];
      fark += (b.tip === 'ic' ? 0 : b.hours[i] * FEE_BAZI[i]) - (b.fee[i] + b.proje[i]);
    });
    return { hours, saatBaz, fee, fark, faturali: idxs.some((i) => b.faturali[i]) };
  };

  const personel = useMemo(() => buildPersonel({ rows: sureData?.personel || [], idxs: periodIdx }), [sureData, selected, ayDurumu]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const tumMarkalar = [...brands, ...disi];
  const brandOf = (ad) => tumMarkalar.find((b) => normalizeNameKey(b.name) === normalizeNameKey(ad)) || null;
  // Kayıt oranı: kişinin süresinin, dönemde faturası kesilmiş markalara giden payı
  const kayitOrani = (u) => {
    if (!u.hours) return 0;
    const f = u.clients.reduce((t, c) => {
      const b = brandOf(c.name);
      return t + (b && b.tip === 'marka' && periodIdx.some((i) => b.faturali[i]) ? c.hours : 0);
    }, 0);
    return f / u.hours;
  };
  const sayfa = yigin[yigin.length - 1];
  const etiket = yigin.length > 1 ? 'Geri' : null;
  if (sayfa?.t === 'm') {
    const b = brandOf(sayfa.n);
    if (b) {
      return (
        <MarkaDetay key={'m' + b.name} brand={b} months={months} ayDurumu={ayDurumu} personelRows={sureData?.personel || []} pasifKisiler={pasifSet} pasif={pasifKeys.has(normalizeNameKey(b.name))}
          onBack={geri} backLabel={etiket || 'Tüm markalar'} onKisi={(n) => setYigin((y) => [...y, { t: 'k', n }])} />
      );
    }
  }
  if (sayfa?.t === 'k') {
    return (
      <KisiDetay key={'k' + sayfa.n} name={sayfa.n} months={months} ayDurumu={ayDurumu} personelRows={sureData?.personel || []} brandOf={brandOf} pasif={pasifSet.has(sayfa.n)}
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
            <option value="musteri">Müşteri</option>
            <option value="personel">Personel</option>
            <option value="departman">Departman</option>
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

      {gorunum === 'departman' ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className={`${CARD} p-4`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">Toplam Süre</span>
              <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{fmtN(personelToplam)} Saat</div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({selected === 'Toplam' ? rangeLabel : selected})</span>
            </div>
            <div className={`${CARD} p-4`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">Departman</span>
              <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{departmanlar.filter((d) => d.name !== DEPARTMAN_YOK).length} Departman</div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">{personel.filter((u) => !pasifSet.has(u.name)).length} aktif kişi</span>
            </div>
          </div>
          <div className={`${CARD} p-5`}>
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Departman Bazlı Süre Dağılımı</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Personelin Everhour'a girdiği süreler, Yönetim'deki departman eşleştirmesine göre toplanır. Departmana tıklayınca kişi dağılımı açılır. Kayıt Oranı: sürenin faturası kesilmiş markalara giden payı.</p>
            <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span className="flex-1 min-w-0">Departman</span>
              <span className="w-10 sm:w-14 text-right shrink-0">Aktif Kişi</span>
              <span className="w-16 sm:w-24 text-right shrink-0">Kayıt Oranı</span>
              <span className={`${COL_SURE} text-right shrink-0`}>Süre</span>
            </div>
            {departmanlar.map((d) => {
              const acik = acikDep === d.name;
              return (
                <div key={d.name} className="border-b border-slate-50 dark:border-slate-800">
                  <button type="button" onClick={() => setAcikDep(acik ? null : d.name)} className="w-full flex items-start gap-2 sm:gap-3 py-2.5 text-[11px] sm:text-sm leading-5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                    <span className={`flex-1 min-w-0 break-words uppercase ${d.name === DEPARTMAN_YOK ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>{d.name}</span>
                    <span className="w-10 sm:w-14 text-right shrink-0 tabular-nums text-slate-500">{d.kisiler.filter((k) => !pasifSet.has(k.name)).length}</span>
                    <span className="w-16 sm:w-24 text-right shrink-0 tabular-nums text-slate-700 dark:text-slate-300">{pct1(kayitOrani(d))}</span>
                    <span className={`tabular-nums ${COL_SURE} text-right shrink-0 leading-tight whitespace-nowrap text-slate-700 dark:text-slate-300`}>
                      {fmtN(d.hours)} sa
                      <span className="block text-[10px] sm:text-[11px] leading-4 text-slate-400 dark:text-slate-500">{pct1(personelToplam ? d.hours / personelToplam : 0)}</span>
                    </span>
                  </button>
                  {acik && (
                    <div className="pb-2 pl-3 sm:pl-5">
                      {d.kisiler.map((k) => (
                        <button key={k.name} type="button" onClick={() => setSeciliKisi(k.name)} className="w-full flex items-center gap-2 py-1.5 text-[11px] sm:text-xs text-left text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                          <span className="flex-1 min-w-0 truncate uppercase">{k.name}{pasifSet.has(k.name) && <span className="ml-2 normal-case text-[10px] border border-slate-300 dark:border-slate-600 rounded-full px-1.5 py-0.5">Pasif</span>}</span>
                          <span className="tabular-nums shrink-0">{fmtN(k.hours)} sa · {pct1(d.hours ? k.hours / d.hours : 0)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {departmanlar.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için personel verisi yok.</div>}
            {departmanlar.some((d) => d.name === DEPARTMAN_YOK) && <p className="text-[11px] text-amber-600 mt-3">Bazı kişilerin departmanı atanmamış; Yönetim sayfasındaki "Personel Departman Eşleştirme" bölümünden atayabilirsiniz.</p>}
          </div>

        </>
      ) : gorunum === 'personel' ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className={`${CARD} p-4`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">Toplam Süre</span>
              <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{fmtN(personelToplam)} Saat</div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({selected === 'Toplam' ? rangeLabel : selected})</span>
            </div>
            <div className={`${CARD} p-4`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">Personel</span>
              <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">{personel.length} Kişi</div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">Süre girmiş</span>
            </div>
          </div>
          <div className={`${CARD} p-5`}>
            <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Personel Bazlı Süre Dağılımı</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Kişi adına tıklayınca aylık süreleri ve müşteri kırılımı açılır.</p>
            <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span className="w-5 sm:w-6 shrink-0" />
              <span className="flex-1 min-w-0">Personel</span>
              <span className="w-16 sm:w-24 text-right shrink-0">Kayıt Oranı</span>
              <span className={`${COL_SURE} text-right shrink-0`}>Süre</span>
            </div>
            <div className="flex flex-col">
              {personel.map((u, k) => (
                <button key={u.name} type="button" onClick={() => setSeciliKisi(u.name)} className="flex items-start gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm leading-5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                  <span className="text-slate-400 dark:text-slate-500 w-5 sm:w-6 text-right tabular-nums shrink-0">{k + 1}</span>
                  <span className="flex-1 min-w-0 break-words text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 uppercase">{u.name}{pasifSet.has(u.name) && <span className="ml-2 normal-case text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 rounded-full px-1.5 py-0.5">Pasif</span>}</span>
                  <span className="w-16 sm:w-24 text-right shrink-0 tabular-nums text-slate-700 dark:text-slate-300">{pct1(kayitOrani(u))}</span>
                  <span className={`tabular-nums ${COL_SURE} text-right shrink-0 leading-tight whitespace-nowrap text-slate-700 dark:text-slate-300`}>
                    {fmtN(u.hours)} sa
                    <span className="block text-[10px] sm:text-[11px] leading-4 text-slate-400 dark:text-slate-500">{pct1(personelToplam ? u.hours / personelToplam : 0)}</span>
                  </span>
                </button>
              ))}
              {personel.length === 0 && <div className="py-3 text-xs text-slate-400">Bu dönem için personel verisi yok{sureData?.personel ? '' : ' (kişi bazlı veri yalnızca Everhour kaynağından gelir)'}.</div>}
            </div>
          </div>
        </>
      ) : (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {[
          ['Toplam Süre', toplam, false],
          ['Aktif Süre', aktif, true],
          ['Atanmamış Süre', atil, true],
          ['Kayıp Süre', kayip, true],
        ].map(([label, v, showPct]) => (
          <div key={label} className={`${CARD} p-4`}>
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
            <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">
              {fmtN(v)} Saat
              {showPct && <span className="ml-1.5 text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500">{pct1(toplam ? v / toplam : 0)}</span>}
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({selected === 'Toplam' ? rangeLabel : selected})</span>
          </div>
        ))}
      </div>

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
