// Fee Takip: FEE 2026 YENİ › FEE TAKİP sekmesinden markaların hizmet bazlı aylık fee geçmişi.
// Liste sayfası + marka iç sayfası (değişim günlüğü, artış ayrıştırma, otomatik yorumlar, tarih uyarıları).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Plus, Minus, PauseCircle, PlayCircle, Flag, Zap } from 'lucide-react';
import { analyzeFeeTakip, ftMoney, ftPct, tLabel, tLabelUzun, AY_KISA } from './lib/feeTakip.js';
import { normalizeNameKey } from './lib/parseData.js';

const FT_CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';
const ftTL = (n) => '₺' + ftMoney(n);
const ftNum = (v, d) => v.toLocaleString('tr-TR', { maximumFractionDigits: d });
// TL: 200B (bin) / 3,25M (milyon) · USD: 200K / 3,25M
const ftShort = (v, usd) => {
  if (!v) return '–';
  if (v >= 1e6) return ftNum(v / 1e6, 2) + 'M';
  if (v >= 1e3) return ftNum(v / 1e3, 1) + (usd ? 'K' : 'B');
  return ftMoney(v);
};
const ftAxis = (v) => (v >= 1e6 ? (v / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(Math.round(v)));
const FT_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#64748b', '#f97316'];
const FT_TONE = { good: 'bg-emerald-500', bad: 'bg-rose-500', warn: 'bg-amber-500', info: 'bg-slate-400' };
const FT_BADGE = {
  Yeni: 'border-sky-300 text-sky-600 dark:border-sky-700 dark:text-sky-400',
  Düştü: 'border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400',
  'Artış bekliyor': 'border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400',
  Pasif: 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400',
};
const ftBadge = (label) => (
  <span key={label} className={`text-[10px] font-medium border rounded-full px-1.5 py-0.5 whitespace-nowrap ${FT_BADGE[label]}`}>{label}</span>
);
const ftSure = (m) => (m === null || m === undefined || m < 0 ? '' : m < 12 ? `${m} ay` : `${Math.floor(m / 12)} yıl${m % 12 ? ` ${m % 12} ay` : ''}`);
const ftDegisimCls = (x) => (x === null ? 'text-slate-300 dark:text-slate-600' : x > 0.0005 ? 'text-emerald-600 dark:text-emerald-400' : x < -0.0005 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400');

function FtChart({ b, nowT }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth; // dar ekranda en güncel aylar görünsün
  }, [b.name]);
  const n = b.series.length;
  const W = 720; const H = 230; const padL = 44; const padR = 8; const padT = 14; const padB = 34;
  const max = Math.max(...b.series.map((p) => p.total), 1);
  const yMax = max * 1.12;
  const innerH = H - padT - padB;
  const slot = (W - padL - padR) / n;
  const bw = Math.max(slot * 0.68, 3);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);
  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 560 }} className="w-full h-auto" role="img" aria-label={`${b.name} aylık fee grafiği`}>
          {ticks.map((v) => {
            const y = padT + innerH - (v / yMax) * innerH;
            return (
              <g key={v}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-slate-400">{v === 0 ? '0' : ftAxis(v)}</text>
              </g>
            );
          })}
          {b.series.map((p, i) => {
            const x = padL + i * slot + (slot - bw) / 2;
            const m = ((p.t % 12) + 12) % 12;
            const planned = p.t > nowT;
            let acc = 0;
            const segs = b.services.map((s, si) => {
              const v = s.vals.get(p.t) || 0;
              if (!v) return null;
              const h = (v / yMax) * innerH;
              const y = padT + innerH - ((acc + v) / yMax) * innerH;
              acc += v;
              return <rect key={s.key} x={x} y={y} width={bw} height={Math.max(h, 0.5)} fill={FT_PALETTE[si % FT_PALETTE.length]} fillOpacity={planned ? 0.4 : 1} />;
            });
            return (
              <g key={p.t}>
                <title>{`${tLabelUzun(p.t)}${planned ? ' (plan)' : ''} · ${ftTL(p.total)}\n${b.services.filter((s) => (s.vals.get(p.t) || 0) > 0).map((s) => `${s.label}: ${ftTL(s.vals.get(p.t))}`).join('\n')}`}</title>
                <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" />
                {segs}
                {m % 3 === 0 && <text x={x + bw / 2} y={H - 18} textAnchor="middle" fontSize="10" className="fill-slate-400">{AY_KISA[m]}</text>}
                {m === 0 && <text x={x + bw / 2} y={H - 5} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-slate-500">{Math.floor(p.t / 12)}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
        {b.services.filter((s) => [...s.vals.values()].some((v) => v > 0)).map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: FT_PALETTE[b.services.indexOf(s) % FT_PALETTE.length] }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-2 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">Soluk sütunlar: planlanan aylar</div>
    </div>
  );
}

function FtMatrix({ b, nowT, kurUSD }) {
  const proj = b.proj;
  const tabs = [...b.years, ...(proj ? [proj.yil] : [])];
  const defYear = tabs.includes(Math.floor(nowT / 12)) ? Math.floor(nowT / 12) : tabs[tabs.length - 1];
  const [year, setYear] = useState(defYear);
  const [cur, setCur] = useState('TL');
  const kurs = Array.isArray(kurUSD) ? kurUSD : [];
  const sonKur = [...kurs].reverse().find((k) => k > 0) || 0;
  const usd = cur === 'USD' && sonKur > 0;
  const kaynaksiz = usd && year < 2026; // 2026 öncesi için kur kaynağı yok
  // 2026'da sheet'teki aylık kur, diğer dönemlerde (2025 ve öncesi, planlanan aylar, 2027) son bilinen kur
  const conv = (v, t) => {
    if (!usd) return v;
    const k = Math.floor(t / 12) === 2026 && kurs[t % 12] > 0 ? kurs[t % 12] : sonKur;
    return v / k;
  };
  const fmt = (v, t) => (kaynaksiz ? '–' : ftShort(conv(v, t), usd));
  const isProj = !!proj && year === proj.yil;
  const evMap = new Map();
  if (isProj) {
    // tahmin: ilk ay tüm hizmetlerde fiyat artışı olarak işaretlenir
    proj.services.forEach((sv) => evMap.set(`${year * 12}|${sv.label}`, { tip: 'fiyat', pct: proj.oran, from: sv.from, to: sv.to }));
  } else {
    b.events.forEach((e) => { if (e.svc) evMap.set(`${e.t}|${e.svc}`, e); });
  }
  const services = isProj ? proj.services : b.services;
  const rows = services.filter((s) => { for (let m = 0; m < 12; m += 1) if ((s.vals.get(year * 12 + m) || 0) > 0) return true; return false; });
  const cellCls = (e, v, planned) => {
    if (e && e.tip === 'fiyat') return e.pct > 0 ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200';
    if (e && e.tip === 'eklendi') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200';
    if (e && e.tip === 'bitti') return 'bg-rose-50 text-rose-400 dark:bg-rose-900/20 dark:text-rose-400';
    if (e && e.tip === 'sapma') return 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200';
    if (!v) return 'text-slate-300 dark:text-slate-600';
    return planned ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-700 dark:text-slate-300';
  };
  const colTotals = Array.from({ length: 12 }, (_, m) => (isProj ? proj.aylik : b.series.find((p) => p.t === year * 12 + m)?.total || 0));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {tabs.map((y) => (
          <button key={y} type="button" onClick={() => setYear(y)} className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${y === year ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'}`}>{proj && y === proj.yil ? `${y} (tahmini)` : y}</button>
        ))}
        {sonKur > 0 && (
          <div className="ml-auto inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs sm:text-sm font-medium">
            {['TL', 'USD'].map((c) => (
              <button key={c} type="button" onClick={() => setCur(c)} className={`px-3 py-1 transition-colors ${cur === c ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100'}`}>{c}</button>
            ))}
          </div>
        )}
      </div>
      {usd && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-5">
          USD karşılığı: 2026 aylarında sheet’teki aylık kur, planlanan aylarda ve 2027’de son bilinen kur ({ftNum(sonKur, 2)} ₺) kullanıldı. 2026 öncesi için kur kaynağı olmadığından USD gösterilmiyor (–).
        </p>
      )}
      {isProj && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-5">
          {year} tutarları, {year - 1} Aralık ayındaki aktif hizmetlere <span className="font-semibold">{ftPct(proj.oran, false)}</span> artış uygulanarak hesaplandı (sheet: “{year} FİYAT GÜNCELLEME ORANI”). Sheet’teki {year} tablosu doldurulunca bu görünüm sheet’teki rakamları gösterir.
        </p>
      )}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[11px] sm:text-xs tabular-nums border-separate border-spacing-0" style={{ minWidth: 680 }}>
          <thead>
            <tr className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="text-left font-normal py-2 pr-2 sticky left-0 bg-white dark:bg-slate-900 z-10" style={{ minWidth: 130 }}>Hizmet</th>
              {AY_KISA.map((a, m) => <th key={a} className={`text-right font-normal py-2 px-1 ${year * 12 + m > nowT ? 'opacity-60' : ''}`}>{a}</th>)}
              <th className="text-right font-normal py-2 pl-2">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const rowTotal = Array.from({ length: 12 }, (_, m) => conv(s.vals.get(year * 12 + m) || 0, year * 12 + m)).reduce((a, c) => a + c, 0);
              return (
                <tr key={s.key} className="border-t border-slate-50 dark:border-slate-800">
                  <td className="py-1.5 pr-2 text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10 border-t border-slate-50 dark:border-slate-800 leading-tight">{s.label}</td>
                  {Array.from({ length: 12 }, (_, m) => {
                    const t = year * 12 + m;
                    const v = s.vals.get(t) || 0;
                    const e = evMap.get(`${t}|${s.label}`);
                    return <td key={m} className={`text-right py-1.5 px-1 border-t border-slate-50 dark:border-slate-800 ${cellCls(e, v, t > nowT)}`} title={e ? (e.tip === 'fiyat' ? `${ftTL(e.from)} → ${ftTL(e.to)} (${ftPct(e.pct)})` : e.tip === 'eklendi' ? 'Hizmet eklendi' : e.tip === 'bitti' ? `Hizmet sona erdi (önceki ${ftTL(e.from)})` : 'Tek aylık sapma') : undefined}>{fmt(v, t)}</td>;
                  })}
                  <td className="text-right py-1.5 pl-2 font-medium text-slate-700 dark:text-slate-300 border-t border-slate-50 dark:border-slate-800">{kaynaksiz ? '–' : ftShort(rowTotal, usd)}</td>
                </tr>
              );
            })}
            <tr className="font-semibold text-slate-900 dark:text-slate-50">
              <td className="py-2 pr-2 sticky left-0 bg-white dark:bg-slate-900 z-10 border-t-2 border-slate-200 dark:border-slate-700">TOPLAM</td>
              {colTotals.map((v, m) => <td key={m} className={`text-right py-2 px-1 border-t-2 border-slate-200 dark:border-slate-700 ${year * 12 + m > nowT ? 'opacity-60' : ''}`}>{fmt(v, year * 12 + m)}</td>)}
              <td className="text-right py-2 pl-2 border-t-2 border-slate-200 dark:border-slate-700">{kaynaksiz ? '–' : ftShort(colTotals.reduce((a, c, m) => a + conv(c, year * 12 + m), 0), usd)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
        <span className="px-1.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">fiyat artışı</span>
        <span className="px-1.5 rounded bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">fiyat düşüşü</span>
        <span className="px-1.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">yeni hizmet</span>
        <span className="px-1.5 rounded bg-rose-50 text-rose-400 dark:bg-rose-900/20">hizmet sona erdi</span>
        <span className="px-1.5 rounded bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">tek aylık sapma</span>
        <span className="italic">soluk / italik: planlanan ay · {usd ? 'K = bin $ · M = milyon $' : 'B = bin ₺ · M = milyon ₺'}</span>
      </div>
    </div>
  );
}

const EV_ORDER = { baslangic: 0, devam: 1, ara: 2, fiyat: 3, eklendi: 4, bitti: 5, sapma: 6 };

function FtJournal({ b, nowT }) {
  const groups = useMemo(() => {
    const m = new Map();
    b.events.forEach((e) => { if (!m.has(e.t)) m.set(e.t, []); m.get(e.t).push(e); });
    return [...m.entries()].sort((a, c) => c[0] - a[0]).map(([t, list]) => ({ t, list: [...list].sort((x, y) => EV_ORDER[x.tip] - EV_ORDER[y.tip]) }));
  }, [b]);
  const shown = groups;
  const total = (t) => b.series.find((p) => p.t === t)?.total || 0;
  const line = (e) => {
    switch (e.tip) {
      case 'baslangic': return [Flag, 'text-emerald-600', `Hizmet başladı${e.kist ? ' (yarım ay)' : ''} · aylık fee ${ftTL(e.amount)}`];
      case 'devam': return [PlayCircle, 'text-emerald-600', `Hizmet yeniden başladı (${e.ara} ay ara) · aylık fee ${ftTL(e.amount)}`];
      case 'ara': return [PauseCircle, 'text-slate-500', `Hizmete ara verildi · önceki aylık fee ${ftTL(e.amount)}`];
      case 'fiyat': return [e.pct > 0 ? TrendingUp : TrendingDown, e.pct > 0 ? 'text-amber-600' : 'text-rose-600', `${e.svc}: ${ftTL(e.from)} → ${ftTL(e.to)} (${ftPct(e.pct)})${e.afterGap ? ' · ara sonrası' : ''}`];
      case 'eklendi': return [Plus, 'text-emerald-600', `${e.svc} eklendi · +${ftTL(e.to)}${e.afterGap ? ' · ara sonrası' : ''}`];
      case 'bitti': return [Minus, 'text-rose-600', `${e.svc} sona erdi · −${ftTL(e.from)}`];
      default: return [Zap, 'text-sky-600', `${e.svc}: tek aylık sapma ${ftTL(e.to)} (diğer aylar ${ftTL(e.from)})`];
    }
  };
  if (!groups.length) return <p className="text-sm text-slate-400">Bu marka için kayıtlı değişiklik yok.</p>;
  return (
    <div>
      <div className="flex flex-col">
        {shown.map((g) => {
          const prevTot = total(g.t - 1);
          const curTot = total(g.t);
          return (
            <div key={g.t} className="py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {tLabelUzun(g.t)}
                  {g.t > nowT && <span className="ml-1.5 text-[10px] font-medium text-slate-400 border border-slate-300 dark:border-slate-600 rounded-full px-1.5 py-0.5">plan</span>}
                </span>
                {prevTot > 0 && curTot !== prevTot && (
                  <span className="text-[10px] sm:text-[11px] tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    aylık fee {ftTL(prevTot)} → {ftTL(curTot)} <span className={ftDegisimCls(curTot / prevTot - 1)}>({ftPct(curTot / prevTot - 1)})</span>
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1">
                {g.list.map((e, i) => {
                  const [Icon, cls, text] = line(e);
                  return (
                    <li key={i} className="flex items-start gap-2 text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 leading-5">
                      <Icon size={14} className={`${cls} mt-1 shrink-0`} />
                      <span className="min-w-0 break-words">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FeeTakip({ feeTakip, feeTakipError, pasifMarkalar, satisRows, kurUSD }) {
  const [sec, setSec] = useState(null);
  const [sort, setSort] = useState({ key: 'cur', dir: -1 });
  const analiz = useMemo(() => (feeTakip && feeTakip.length ? analyzeFeeTakip(feeTakip, new Date()) : null), [feeTakip]);
  const pasifKeys = useMemo(() => new Set((pasifMarkalar || []).map((n) => normalizeNameKey(n))), [pasifMarkalar]);

  // Satış Tablosu'nda Fee faturası olup FEE TAKİP sekmesinde marka bloğu bulunmayan markalar
  const eksik = useMemo(() => {
    if (!feeTakip || !feeTakip.length || !satisRows || !satisRows.length) return [];
    const ALIAS = { [normalizeNameKey('HERITAGE')]: normalizeNameKey('KASSANDRA') };
    const have = new Set(feeTakip.map((b) => normalizeNameKey(b.name)));
    const map = new Map();
    satisRows.forEach((r) => {
      if (String(r.hizmet).toUpperCase() !== 'FEE' || !(r.tutar > 0)) return;
      const k0 = normalizeNameKey(r.marka);
      const k = ALIAS[k0] || k0;
      if (have.has(k) || pasifKeys.has(k0) || pasifKeys.has(k)) return; // pasif markalarda artış beklenmez
      if (!map.has(k)) map.set(k, { name: r.marka, toplam: 0, aylar: new Set() });
      const o = map.get(k);
      o.toplam += r.tutar;
      o.aylar.add(r.ay);
    });
    return [...map.values()]
      .map((o) => {
        const idx = [...o.aylar].map((a) => AY_KISA.indexOf(a)).filter((i) => i >= 0).sort((a, c) => a - c);
        return { name: o.name, toplam: o.toplam, ilk: idx[0], son: idx[idx.length - 1] };
      })
      .sort((a, c) => c.toplam - a.toplam);
  }, [feeTakip, satisRows, pasifKeys]);
  const eksikAraligi = (x) => (x.ilk === undefined ? '' : x.ilk === x.son ? AY_KISA[x.ilk] : `${AY_KISA[x.ilk]}–${AY_KISA[x.son]}`);

  useEffect(() => {
    if (!sec) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSec(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sec]);

  const openBrand = (name) => {
    setSec(name);
    try { window.scrollTo({ top: 0 }); } catch (e) { /* önemsiz */ }
  };

  if (!analiz) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs sm:text-sm px-4 py-3">
        FEE TAKİP verisi alınamadı{feeTakipError ? ` (${feeTakipError})` : ''}. “FEE 2026 YENİ” dosyasındaki FEE TAKİP sekmesinin Apps Script çıktısına dahil olduğundan emin olun, sonra sayfayı yenileyin.
      </div>
    );
  }

  const { list, totals, nowT, warnings } = analiz;
  const brand = sec ? list.find((x) => x.name === sec) : null;

  /* ---------------- FEE TAKİP'TE OLMAYAN MARKA (BOŞ İÇ SAYFA) ---------------- */
  const eksikBrand = sec && !brand ? eksik.find((x) => x.name === sec) : null;
  if (eksikBrand) {
    return (
      <div className="flex flex-col gap-5">
        <div className={`${FT_CARD} p-5`}>
          <button type="button" onClick={() => setSec(null)} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 transition-colors mb-4">
            <ArrowLeft size={14} /> Tüm markalar
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl sm:text-2xl text-slate-900 dark:text-slate-50">{eksikBrand.name}</h2>
          </div>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs sm:text-sm px-4 py-3">
          <div className="flex items-center gap-1.5 font-semibold mb-1"><AlertTriangle size={14} /> FEE TAKİP sekmesinde bu marka yok</div>
          Satış Tablosu’nda {eksikAraligi(eksikBrand)} döneminde {ftTL(eksikBrand.toplam)} Fee faturası (KDV hariç) görünüyor. FEE TAKİP sekmesine marka bloğu eklendiğinde bu sayfa hizmet geçmişiyle otomatik dolar.
        </div>
      </div>
    );
  }

  /* ------------------------- MARKA İÇ SAYFASI ------------------------- */
  if (brand) {
    const b = brand;
    const sinceTxt = ftSure(b.age);
    return (
      <div className="flex flex-col gap-5">
        <div className={`${FT_CARD} p-5`}>
          <button type="button" onClick={() => setSec(null)} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-700 transition-colors mb-4">
            <ArrowLeft size={14} /> Tüm markalar
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl sm:text-2xl text-slate-900 dark:text-slate-50">{b.name}</h2>
            {pasifKeys.has(normalizeNameKey(b.name)) && ftBadge('Pasif')}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mt-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Hizmet Başlangıcı</div>
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-0.5">{b.start ? b.start.label : '–'}</div>
              {sinceTxt && <div className="text-[11px] text-slate-400 dark:text-slate-500">({sinceTxt})</div>}
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Güncel Aylık Fee</div>
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-0.5">{ftTL(b.cur)}</div>
              <div className={`text-[11px] tabular-nums ${ftDegisimCls(b.degisim)}`}>{b.degisim === null ? `(${tLabelUzun(nowT)})` : `12 ay önce ${ftTL(b.prev12)} (${ftPct(b.degisim)})`}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Son Fiyat Değişimi (veriden)</div>
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 mt-0.5">{b.lastPriceT !== null ? tLabelUzun(b.lastPriceT) : 'Yok'}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">{b.upd ? (b.upd.t > nowT ? `Planlanan güncelleme: ${b.upd.label}` : `Sheet: ${b.upd.label}`) : 'Sheet: boş'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Aktif Hizmet</div>
              <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-0.5">{b.aktifHizmet}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">({tLabelUzun(nowT)})</div>
            </div>
          </div>
        </div>

        {b.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs sm:text-sm px-4 py-3">
            <div className="flex items-center gap-1.5 font-semibold mb-1"><AlertTriangle size={14} /> Veri uyarısı</div>
            <ul className="flex flex-col gap-1">{b.warnings.map((w, i) => <li key={i}>{w.text}</li>)}</ul>
          </div>
        )}

        <div className={`${FT_CARD} p-5`}>
          <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Yorumlar</h3>
          <ul className="flex flex-col gap-2.5">
            {b.comments.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-5">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${FT_TONE[c.tone]}`} />
                <span className="min-w-0 break-words">{c.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${FT_CARD} p-5`}>
          <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Aylık Fee Seyri</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sütunlar hizmetlere göre renklenir.</p>
          <FtChart b={b} nowT={nowT} />
        </div>

        <div className={`${FT_CARD} p-5`}>
          <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Hizmet × Ay Matrisi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Boş hücre = hizmet yok (0). Renkli hücreler o ay değişen hizmetleri gösterir.</p>
          <FtMatrix b={b} nowT={nowT} kurUSD={kurUSD} />
        </div>

        <div className={`${FT_CARD} p-5`}>
          <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Değişim Günlüğü</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Hizmet ekleme, sona erme ve fiyat değişimleri veriden otomatik çıkarılır; en yeni üstte.</p>
          <FtJournal b={b} nowT={nowT} />
        </div>

        <div className={`${FT_CARD} p-5`}>
          <h3 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-3">Yıllık Özet</h3>
          <div className="flex items-start gap-2 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="w-12 shrink-0">Yıl</span>
            <span className="flex-1 min-w-0 text-right leading-tight">Yıllık Toplam</span>
            <span className="flex-1 min-w-0 text-right leading-tight">Aylık Ort.</span>
            <span className="flex-1 min-w-0 text-right leading-tight">Yıl Sonu Aylık</span>
            <span className="w-14 sm:w-16 text-right shrink-0 leading-tight">Değişim</span>
          </div>
          {b.yillik.map((y) => (
            <div key={y.yil} className="flex items-start gap-2 py-2 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm tabular-nums">
              <span className="w-12 shrink-0 text-slate-700 dark:text-slate-300">{y.yil}{y.kismi ? '*' : ''}</span>
              <span className="flex-1 min-w-0 text-right text-slate-900 dark:text-slate-50 font-medium">{y.toplam ? ftTL(y.toplam) : '–'}</span>
              <span className="flex-1 min-w-0 text-right text-slate-600 dark:text-slate-300">{y.ortalama ? ftTL(y.ortalama) : '–'}</span>
              <span className="flex-1 min-w-0 text-right text-slate-600 dark:text-slate-300">{y.sonAy ? ftTL(y.sonAy) : '–'}</span>
              <span className={`w-14 sm:w-16 text-right shrink-0 ${ftDegisimCls(y.sonAyDegisim)}`}>{y.sonAyDegisim === null ? '–' : ftPct(y.sonAyDegisim)}</span>
            </div>
          ))}
          {b.proj && (
            <div className="flex items-start gap-2 py-2 border-b border-slate-50 dark:border-slate-800 text-[11px] sm:text-sm tabular-nums">
              <span className="w-12 shrink-0 text-slate-700 dark:text-slate-300 leading-tight">{b.proj.yil}<span className="block text-[10px] text-slate-400">tahmini</span></span>
              <span className="flex-1 min-w-0 text-right text-slate-900 dark:text-slate-50 font-medium">{ftTL(b.proj.aylik * 12)}</span>
              <span className="flex-1 min-w-0 text-right text-slate-600 dark:text-slate-300">{ftTL(b.proj.aylik)}</span>
              <span className="flex-1 min-w-0 text-right text-slate-600 dark:text-slate-300">{ftTL(b.proj.aylik)}</span>
              <span className={`w-14 sm:w-16 text-right shrink-0 ${ftDegisimCls(b.proj.oran)}`}>{ftPct(b.proj.oran)}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">* Yıl henüz bitmedi: toplam, planlanan aylar dahil sheet’teki tutarlardır. Değişim, bir önceki yılın son aylık fee’sine göredir.{b.proj ? ` ${b.proj.yil} (tahmini): ${b.proj.yil - 1} Aralık ayındaki aktif hizmetlere ${ftPct(b.proj.oran, false)} artış uygulanmıştır.` : ''}</p>
        </div>
      </div>
    );
  }

  /* ------------------------------ LİSTE ------------------------------ */
  const sorted = [...list].sort((x, y) => {
    if (sort.key === 'name') return sort.dir * x.name.localeCompare(y.name, 'tr');
    const a = sort.key === 'cur' ? x.cur : x.degisim;
    const c = sort.key === 'cur' ? y.cur : y.degisim;
    if (a === null && c === null) return 0;
    if (a === null) return 1;
    if (c === null) return -1;
    return sort.dir * (a - c);
  });
  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'name' ? 1 : -1 }));
  const arrow = (key) => (sort.key === key ? (sort.dir < 0 ? ' ↓' : ' ↑') : '');
  const netDeg = totals.prev12 > 0 ? totals.cur / totals.prev12 - 1 : null;

  return (
    <div className="flex flex-col gap-5">
      <div className={`${FT_CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Fee Takibi</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Kaynak: FEE 2026 YENİ › FEE TAKİP. Marka adına tıklayınca hizmet bazlı geçmiş, değişim günlüğü ve yorumlar açılır.</p>
        <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <span className="w-4 sm:w-5 shrink-0" />
          <button type="button" onClick={() => toggleSort('name')} className="flex-1 min-w-0 text-left uppercase">Marka{arrow('name')}</button>
          <span className="hidden sm:block w-20 text-right shrink-0 leading-tight">Başlangıç</span>
          <span className="hidden sm:block w-24 text-right shrink-0 leading-tight">12 Ay Önce</span>
          <button type="button" onClick={() => toggleSort('cur')} className="w-20 sm:w-24 text-right shrink-0 leading-tight uppercase">Güncel Fee{arrow('cur')}</button>
          <button type="button" onClick={() => toggleSort('degisim')} className="w-12 sm:w-16 text-right shrink-0 leading-tight uppercase">Değişim{arrow('degisim')}</button>
        </div>
        <div className="flex flex-col">
          {sorted.map((x, i) => (
            <div key={x.name} className="flex items-start gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
              <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0 break-words text-[11px] sm:text-sm">
                <button type="button" onClick={() => openBrand(x.name)} className={`text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2 ${x.cur ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>{x.name}</button>
                {pasifKeys.has(normalizeNameKey(x.name)) && <span className="flex flex-wrap gap-1 mt-0.5">{ftBadge('Pasif')}</span>}
              </span>
              <span className="hidden sm:block w-20 text-right shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">{x.start ? x.start.label : '–'}</span>
              <span className="hidden sm:block w-24 text-right shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">{x.prev12 ? ftTL(x.prev12) : '–'}</span>
              <span className="w-20 sm:w-24 text-right shrink-0 text-[11px] sm:text-sm tabular-nums font-medium text-slate-900 dark:text-slate-50">{x.cur ? ftTL(x.cur) : '–'}</span>
              <span className={`w-12 sm:w-16 text-right shrink-0 text-[10px] sm:text-xs tabular-nums ${ftDegisimCls(x.degisim)}`}>{x.degisim === null ? '–' : ftPct(x.degisim)}</span>
            </div>
          ))}
          <div className="flex items-start gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
            <span className="w-4 sm:w-5 shrink-0" />
            <span className="flex-1 min-w-0 text-[11px] sm:text-sm font-semibold text-slate-900 dark:text-slate-50">Toplam</span>
            <span className="hidden sm:block w-20 shrink-0" />
            <span className="hidden sm:block w-24 text-right shrink-0 text-sm tabular-nums font-bold text-slate-900 dark:text-slate-50">{ftTL(totals.prev12)}</span>
            <span className="w-20 sm:w-24 text-right shrink-0 text-[10px] sm:text-sm tabular-nums font-bold text-slate-900 dark:text-slate-50">{ftTL(totals.cur)}</span>
            <span className={`w-12 sm:w-16 text-right shrink-0 text-[10px] sm:text-xs tabular-nums font-bold ${ftDegisimCls(netDeg)}`}>{netDeg === null ? '–' : ftPct(netDeg)}</span>
          </div>
        </div>

        {eksik.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">FEE TAKİP sekmesinde olmayan markalar ({eksik.length})</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">Satış Tablosu’nda Fee faturası kesilen, pasif olmayan ama FEE TAKİP sekmesinde hizmet geçmişi girilmemiş markalar. Marka bloğu eklendikçe yukarıdaki listeye otomatik taşınır.</p>
            <div className="flex items-start gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <span className="flex-1 min-w-0">Marka</span>
              <span className="w-28 sm:w-40 text-right shrink-0 leading-tight">Satış Tablosu Fee Faturası</span>
            </div>
            {eksik.map((x) => (
              <div key={x.name} className="flex items-start gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                <span className="flex-1 min-w-0 break-words text-[11px] sm:text-sm">
                  <button type="button" onClick={() => openBrand(x.name)} className="text-left text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2">{x.name}</button>
                </span>
                <span className="w-28 sm:w-40 text-right shrink-0 text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 leading-tight">
                  {ftTL(x.toplam)}
                  <span className="block text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">{eksikAraligi(x)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${FT_CARD} p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Tarih ve Veri Uyarıları</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sheet’teki fiyat güncelleme / başlangıç tarihleri ile hizmet verisinden hesaplanan tarihler karşılaştırılır; uyuşmayanlar burada listelenir.</p>
        {warnings.length === 0 ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Tarih ve toplam kontrollerinde uyuşmazlık yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-5">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">
                  <button type="button" onClick={() => openBrand(w.marka)} className="font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2 text-left">{w.marka}</button>
                  {' · '}{w.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
