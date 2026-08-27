// Veri kaynağı: Google Sheets "FEE 2026 YENİ" + "MÜŞTERİDEN GELECEK ÖDEMELER"
// Apps Script web app uç noktaları üzerinden otomatik çekilir (bkz. src/lib/parseData.js)
import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Receipt, TrendingUp, TrendingDown, MessageSquare, ChevronRight, AlertTriangle, Menu, X, Moon, Sun,
  HandCoins, Landmark, FileCheck,
  Wallet, PiggyBank, Percent,
} from 'lucide-react';


/* ------------------------------------------------------------------ */
/* Editöryal yorumlar — bunlar veri değil, elle yazılmış değerlendirme */
/* metinleridir. Rakamlar önemli ölçüde değiştiğinde elden geçirin.    */
/* ------------------------------------------------------------------ */
const genelDegerlendirme = [
  "Ciro 2025'e göre büyüyerek yükseldi; toplam gider daha düşük oranda arttı — gelir büyümesi giderin önünde.",
  'Net kâr belirgin şekilde arttı; kâr marjı 2025\'e göre yükseldi. Vergiler doğrudan gider kalemi olarak kâra dahil edildiği için bu rakam vergi sonrası nettir.',
  'Ocak-Temmuz kesinleşmiş veriye, Ağustos-Aralık ise tahmine dayanıyor.',
];

const giderYorumlari = [
  'Gider kalemleri arasında birkaç ana kalem toplam giderin büyük kısmını oluşturuyor (Kira, Lisanslar, SMM/Avukat, Apartman Aidatı, Mutfak/Temizlik gibi) — maliyet kontrolü bu kalemlerde odaklanmalı.',
  'Personel giderinin (Maaş+SGK+Yemek) gelire oranı yıl içinde geriliyor — ekip büyümeden gelir artışı sağlandığı görülüyor.',
  'Ödül-Reklam, Yıllık Lisans, Muhasebe Lisans, İş İlanı ve MTV gibi kalemler yılın yalnızca belirli aylarında gerçekleşiyor; bu hizmetlerden herhangi biri yıl sonuna doğru tekrar gerekirse tahmin güncellenmeli.',
  'Kıdem/İhbar ve Demirbaş gibi kalemler düzensiz — yıl sonuna kadar benzer bir ödeme çıkma ihtimaline karşı bütçede bir risk payı ayrılmalı.',
];

const gelirYorumlari = [
  'Sabit aylık bedelli müşteriler öngörülebilir bir taban gelir oluşturuyor; proje bazlı gelirler ise aya göre büyük dalgalanma gösteriyor.',
  'Portföyün önemli bir kısmı az sayıda büyük müşteriye bağlı — bu yoğunlaşma riski değerlendirilip müşteri portföyü çeşitlendirilmeli.',
  'Ağustos-Aralık\'ta proje bazlı gelir hâlâ toplu bir tahmin olarak giriliyor; gerçek proje detayı netleşince müşteri bazında güncellenmeli.',
];

const aksiyonlar = [
  'En büyük gider kalemleri için aylık üst limit (bütçe tavanı) belirlenmeli.',
  'Yılın yalnızca belirli aylarında gerçekleşen kalemlerin yıl sonuna doğru tekrar gerekip gerekmeyeceği netleştirilip tahmine yansıtılmalı.',
  'Kıdem/İhbar gibi düzensiz gider kalemleri için yıl sonuna kadar bir risk payı ayrılmalı.',
  'Az sayıda müşteride yoğunlaşan gelir riski için müşteri portföyü çeşitlendirilmeli.',
  'Proje bazlı gelir tahminleri, gerçek proje detayı geldikçe müşteri bazında güncellenmeli.',
  '2026 için resmi bir bütçe/hedef belirlenip rapora eklenmeli — sadece geçen yılla değil hedefle kıyas da yapılabilsin.',
];

/* ------------------------------------------------------------------ */
/* YARDIMCI FONKSİYONLAR                                                */
/* ------------------------------------------------------------------ */
// Gece modu butonu şimdilik gizli — ileride tekrar açmak için true yapmak yeterli
const SHOW_DARK_MODE_TOGGLE = false;

const fmtTL = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtM = (n) => ((n || 0) / 1000000).toFixed(2).replace('.', ',') + ' M';
const fmtCompact = (n) => {
  const v = n || 0;
  const abs = Math.abs(v);
  if (abs >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (abs >= 1000) return Math.round(v / 1000) + 'K';
  return fmtTL(v);
};
const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1).replace('.', ',') : '0,0') + '%';

function TrendBadge({ value, suffix = '' }) {
  const isNeg = value < 0;
  const Icon = isNeg ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap shrink-0 ${
        isNeg ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      <Icon size={11} />
      {pct(value)}
      {suffix}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, delta, deltaSuffix = '', compareLabel }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-1 min-w-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />}
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap">{value}</span>
        <TrendBadge value={delta} suffix={deltaSuffix} />
      </div>
      <span className="text-slate-400 dark:text-slate-500 text-[11px] whitespace-nowrap">{compareLabel}</span>
    </div>
  );
}

function SegmentedBar({ percent, segmentCount = 24 }) {
  const p = Math.max(0, Math.min(1, percent));
  const filledCount = Math.round(p * segmentCount);
  return (
    <div className="flex-1 min-w-0 flex items-center gap-1">
      {Array.from({ length: segmentCount }, (_, i) => (
        <div key={i} className={`flex-1 h-2 sm:h-2.5 rounded-full ${i < filledCount ? 'bg-emerald-500' : 'bg-emerald-100'}`} />
      ))}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
        active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* ANA UYGULAMA                                                         */
/* ------------------------------------------------------------------ */
export default function FinansDashboard({ data, lastUpdatedFee, lastUpdatedOdeme, onRefresh, refreshing }) {
  const [page, setPage] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('Toplam');
  const [gelirGorunum, setGelirGorunum] = useState('güncel');
  const [giderGorunum, setGiderGorunum] = useState('güncel');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashCurrency, setDashCurrency] = useState('TL');
  const [darkMode, setDarkMode] = useState(false);

  const { months, ciro, ciroUSD, giderUSD, gider, expenseItemDefs, giderYapisi, revenueRaw, alacaklarData, nakitAkisiData, totals2026, totals2025, tahminiProjeToplam, ayDurumu, pasifMarkalar } = data;
  const isPasifMarka = (name) => (pasifMarkalar || []).includes(name);

  // "Güncel" / "Tahmini" — FEE 2026 YENİ > DASH 26 sekmesi V sütunundan gelir
  const getAyDurumu = (monthName) => ayDurumu?.[months.indexOf(monthName)] ?? null;

  // Ay pili renkleri: güncel = aktif soft yeşil, tahmini = pasif soft kırmızı
  const monthPillClass = (monthName, active) => {
    const durum = getAyDurumu(monthName);
    if (durum === 'güncel') return active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    if (durum === 'tahmini') return active ? 'bg-rose-300 text-white' : 'bg-rose-50 text-rose-400 hover:bg-rose-100';
    return active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100';
  };

  // Ay bazlı, sıfır olmayan gider kalemleri
  const expenseRaw = useMemo(() => {
    const map = {};
    months.forEach((m, i) => {
      map[m] = expenseItemDefs.map(([name, vals]) => [name, vals[i]]).filter(([, amt]) => amt !== 0);
    });
    return map;
  }, [months, expenseItemDefs]);

  function monthByExpense(monthKey) {
    if (monthKey === 'Toplam') {
      return expenseItemDefs
        .map(([name, vals]) => ({ name, amount: vals.reduce((a, b) => a + b, 0) }))
        .sort((a, b) => b.amount - a.amount);
    }
    return (expenseRaw[monthKey] || []).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }

  function monthDistributedMap(monthKey) {
    const monthData = revenueRaw[monthKey];
    const map = {};
    if (!monthData) return map;
    ['diger', 'fatura'].forEach((cat) => {
      (monthData[cat] || []).forEach(([client, amount]) => {
        map[client] = (map[client] || 0) + amount;
      });
    });
    (monthData.feeDisi || []).forEach(([client, , amount]) => {
      map[client] = (map[client] || 0) + amount;
    });
    return map;
  }

  function monthByBrand(monthKey) {
    return Object.entries(monthDistributedMap(monthKey))
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  const customerPivot = useMemo(() => {
    const totalsByBrand = {};
    months.forEach((m) => {
      const map = monthDistributedMap(m);
      Object.entries(map).forEach(([client, amount]) => {
        if (!totalsByBrand[client]) totalsByBrand[client] = {};
        totalsByBrand[client][m] = amount;
      });
    });
    return Object.entries(totalsByBrand)
      .map(([name, byMonth]) => {
        const total = months.reduce((s, m) => s + (byMonth[m] || 0), 0);
        return { name, byMonth, total };
      })
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, revenueRaw]);

  const totals = useMemo(() => {
    const totalCiro = ciro.reduce((a, b) => a + b, 0);
    const totalGider = gider.reduce((a, b) => a + b, 0);
    const totalKar = totalCiro - totalGider;

    const ciro2025 = totals2025?.ciro || 0;
    const gider2025 = totals2025?.toplamGider || 0;
    const kar2025 = totals2025?.kar || (ciro2025 - gider2025);

    const ciroUSD2026 = totals2026?.ciroUSD || 0;
    const ciroUSD2025 = totals2025?.ciroUSD || 0;
    const giderUSD2026 = totals2026?.giderUSD || 0;
    const giderUSD2025 = totals2025?.giderUSD || 0;
    const netKarUSD2026 = totals2026?.karUSD || 0;
    const netKarUSD2025 = totals2025?.karUSD || 0;

    return {
      totalCiro,
      totalGider,
      totalKar,
      karMarji: totalCiro ? totalKar / totalCiro : 0,
      ciroBuyume: ciro2025 ? (totalCiro - ciro2025) / ciro2025 : 0,
      giderBuyume: gider2025 ? (totalGider - gider2025) / gider2025 : 0,
      karBuyume: kar2025 ? (totalKar - kar2025) / kar2025 : 0,
      karMarji2025: ciro2025 ? kar2025 / ciro2025 : 0,
      ciroUSD2026,
      ciroUSD2025,
      giderUSD2026,
      giderUSD2025,
      netKarUSD2026,
      netKarUSD2025,
      ciroUSDBuyume: ciroUSD2025 ? (ciroUSD2026 - ciroUSD2025) / ciroUSD2025 : 0,
      giderUSDBuyume: giderUSD2025 ? (giderUSD2026 - giderUSD2025) / giderUSD2025 : 0,
      karUSDBuyume: netKarUSD2025 ? (netKarUSD2026 - netKarUSD2025) / netKarUSD2025 : 0,
      karMarjiUSD2026: ciroUSD2026 ? netKarUSD2026 / ciroUSD2026 : 0,
      karMarjiUSD2025: ciroUSD2025 ? netKarUSD2025 / ciroUSD2025 : 0,
      ciro2025,
      gider2025,
      kar2025,
    };
  }, [ciro, gider, totals2026, totals2025]);

  // Sheet'teki V sütunundan gelen "Güncel/Tahmini" işaretine göre kesinleşmiş aylar
  const confirmedCount = (ayDurumu || []).filter((d) => d === 'güncel').length;
  const confirmedCiro = months.reduce((sum, _, i) => sum + (ayDurumu?.[i] === 'güncel' ? ciro[i] : 0), 0);
  const tahminiCiroToplam = totals.totalCiro - confirmedCiro;
  const hedefIlerleme = totals.totalCiro ? confirmedCiro / totals.totalCiro : 0;
  const guncelAylar = months.filter((_, i) => ayDurumu?.[i] === 'güncel');
  const tahminiAylar = months.filter((_, i) => ayDurumu?.[i] === 'tahmini');
  const guncelRangeLabel = guncelAylar.length ? `${guncelAylar[0]}-${guncelAylar[guncelAylar.length - 1]}` : '';
  const tahminiRangeLabel = tahminiAylar.length ? `${tahminiAylar[0]}-${tahminiAylar[tahminiAylar.length - 1]}` : '';
  const toplamRangeLabel = `${months[0]}-${months[months.length - 1]}`;
  const confirmedGider = months.reduce((sum, _, i) => sum + (ayDurumu?.[i] === 'güncel' ? gider[i] : 0), 0);
  const confirmedKar = confirmedCiro - confirmedGider;
  const confirmedKarMarji = confirmedCiro ? confirmedKar / confirmedCiro : 0;
  const confirmedGiderOrani = confirmedCiro ? confirmedGider / confirmedCiro : 0;
  const tahminiGiderToplam = totals.totalGider - confirmedGider;
  const itemAmountForMonths = (vals, monthNames) => monthNames.reduce((s, m) => s + vals[months.indexOf(m)], 0);

  // 2025'in aylık kırılımı olmadığı için, kesinleşmiş ay sayısına göre orantılı (n/12) baz alınır
  const prorate2025 = (val) => (confirmedCount / 12) * (val || 0);
  const ciro2025Prorated = prorate2025(totals.ciro2025);
  const kar2025Prorated = prorate2025(totals.kar2025);
  const gider2025Prorated = prorate2025(totals.gider2025);
  const karMarji2025Prorated = ciro2025Prorated ? kar2025Prorated / ciro2025Prorated : 0;
  const giderOrani2025Prorated = ciro2025Prorated ? gider2025Prorated / ciro2025Prorated : 0;

  const confirmedCiroBuyume = ciro2025Prorated ? (confirmedCiro - ciro2025Prorated) / ciro2025Prorated : 0;
  const confirmedKarBuyume = kar2025Prorated ? (confirmedKar - kar2025Prorated) / kar2025Prorated : 0;
  const confirmedGiderBuyume = gider2025Prorated ? (confirmedGider - gider2025Prorated) / gider2025Prorated : 0;

  // USD taraf — Ciro $/Gider $ (Q/R sütunları) için de aynı kesinleşmiş/tahmini ayrımı
  const confirmedCiroUSD = months.reduce((sum, _, i) => sum + (ayDurumu?.[i] === 'güncel' ? (ciroUSD?.[i] || 0) : 0), 0);
  const tahminiCiroToplamUSD = (totals.ciroUSD2026 || 0) - confirmedCiroUSD;
  const confirmedGiderUSD = months.reduce((sum, _, i) => sum + (ayDurumu?.[i] === 'güncel' ? (giderUSD?.[i] || 0) : 0), 0);
  const confirmedKarUSD = confirmedCiroUSD - confirmedGiderUSD;
  const confirmedKarMarjiUSD = confirmedCiroUSD ? confirmedKarUSD / confirmedCiroUSD : 0;

  const ciroUSD2025Prorated = prorate2025(totals.ciroUSD2025);
  const karUSD2025Prorated = prorate2025(totals.netKarUSD2025);
  const giderUSD2025Prorated = prorate2025(totals.giderUSD2025);
  const karMarjiUSD2025Prorated = ciroUSD2025Prorated ? karUSD2025Prorated / ciroUSD2025Prorated : 0;

  const confirmedCiroUSDBuyume = ciroUSD2025Prorated ? (confirmedCiroUSD - ciroUSD2025Prorated) / ciroUSD2025Prorated : 0;
  const confirmedKarUSDBuyume = karUSD2025Prorated ? (confirmedKarUSD - karUSD2025Prorated) / karUSD2025Prorated : 0;
  const confirmedGiderUSDBuyume = giderUSD2025Prorated ? (confirmedGiderUSD - giderUSD2025Prorated) / giderUSD2025Prorated : 0;

  // Tahmini Hedef Ciro'nun $ karşılığı (Gelirler'deki Tahmini Ciro ile aynı mantık)

  const pages = [
    { id: 'dashboard', label: 'Yönetici Özeti', icon: LayoutDashboard },
    { id: 'gelirler', label: 'Gelirler', icon: TrendingUp },
    { id: 'giderler', label: 'Giderler', icon: Receipt },
    { id: 'alacaklar', label: 'Alacaklar', icon: HandCoins },
    { id: 'nakitAkisi', label: 'Nakit Akışı', icon: Landmark },
    { id: 'yorumlar', label: 'Yorumlar', icon: MessageSquare },
  ];

  const pageTitle = pages.find((p) => p.id === page)?.label ?? 'Yönetici Özeti';

  const lastSync = lastUpdatedFee ? new Date(lastUpdatedFee).toLocaleString('tr-TR') : null;

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans flex transition-colors">
      {/* Masaüstü sol menü */}
      <div className="hidden md:flex w-64 bg-slate-900 flex-shrink-0 flex-col py-6 px-4 gap-1">
        <div className="flex items-center gap-3 px-2 pb-6 mb-2 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 font-bold shrink-0">K</div>
          <span className="text-white font-semibold text-[15px]">Finans Özeti</span>
        </div>
        {pages.map((p) => (
          <NavItem key={p.id} icon={p.icon} label={p.label} active={page === p.id} onClick={() => setPage(p.id)} />
        ))}
        <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-2">
          {lastSync && <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2">Son senkron: {lastSync}</span>}
          {SHOW_DARK_MODE_TOGGLE && (
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-slate-400 dark:text-slate-500 hover:text-white transition-colors"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? 'Gündüz Modu' : 'Gece Modu'}
            </button>
          )}
        </div>
      </div>

      {/* Mobil karartma katmanı */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Mobil açılır menü */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col py-6 px-4 gap-1">
          <div className="flex items-center justify-between px-2 pb-6 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 font-bold shrink-0">K</div>
              <span className="text-white font-semibold text-[15px]">Finans Özeti</span>
            </div>
            <button className="text-slate-400 dark:text-slate-500 hover:text-white shrink-0" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          {pages.map((p) => (
            <NavItem
              key={p.id}
              icon={p.icon}
              label={p.label}
              active={page === p.id}
              onClick={() => {
                setPage(p.id);
                setMobileMenuOpen(false);
              }}
            />
          ))}
        </div>
      )}

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        <div className="px-4 sm:px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <button className="md:hidden text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} strokeWidth={2.25} />
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">MENÜ</span>
          {SHOW_DARK_MODE_TOGGLE && (
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="md:hidden ml-auto flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500"
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? 'Gündüz' : 'Gece'}
            </button>
          )}
        </div>

        <div className="p-4 sm:p-8 flex flex-col gap-6">
          <h1 className="font-serif text-3xl text-slate-900 dark:text-slate-50 dark:text-white">{pageTitle}</h1>

          {/* ---------------- DASHBOARD ---------------- */}
          {page === 'dashboard' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2 -mb-1">
                <p className="text-xs text-slate-400 dark:text-slate-500">Yeşil oranlar 2025'e göre değişimi gösterir (2025 → 2026)</p>
                <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setDashCurrency('TL')}
                    className={`w-9 py-1 rounded-md text-sm font-medium transition-colors ${
                      dashCurrency === 'TL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    ₺
                  </button>
                  <button
                    onClick={() => setDashCurrency('USD')}
                    className={`w-9 py-1 rounded-md text-sm font-medium transition-colors ${
                      dashCurrency === 'USD' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    $
                  </button>
                </div>
              </div>
              {dashCurrency === 'TL' ? (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <KpiCard icon={Wallet} label="Ciro" value={'₺' + fmtM(confirmedCiro)} delta={confirmedCiroBuyume} compareLabel={'₺' + fmtM(ciro2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Wallet} label="Tahmini Ciro" value={'₺' + fmtM(totals.totalCiro)} delta={totals.ciroBuyume} compareLabel={'₺' + fmtM(totals.ciro2025) + ' (2025)'} />
                  <KpiCard icon={PiggyBank} label="Net Kar" value={'₺' + fmtM(confirmedKar)} delta={confirmedKarBuyume} compareLabel={'₺' + fmtM(kar2025Prorated) + ' (2025)'} />
                  <KpiCard icon={PiggyBank} label="Tahmini Net Kar" value={'₺' + fmtM(totals.totalKar)} delta={totals.karBuyume} compareLabel={'₺' + fmtM(totals.kar2025) + ' (2025)'} />
                  <KpiCard icon={Percent} label="Kar Marjı" value={pct(confirmedKarMarji)} delta={confirmedKarMarji - karMarji2025Prorated} deltaSuffix=" puan" compareLabel={pct(karMarji2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Percent} label="Tahmini Kar Marjı" value={pct(totals.karMarji)} delta={totals.karMarji - totals.karMarji2025} deltaSuffix=" puan" compareLabel={pct(totals.karMarji2025) + ' (2025)'} />
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <KpiCard icon={Wallet} label="Ciro $" value={'$' + fmtM(confirmedCiroUSD)} delta={confirmedCiroUSDBuyume} compareLabel={'$' + fmtM(ciroUSD2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Wallet} label="Tahmini Ciro $" value={'$' + fmtM(totals.ciroUSD2026)} delta={totals.ciroUSDBuyume} compareLabel={'$' + fmtM(totals.ciroUSD2025) + ' (2025)'} />
                  <KpiCard icon={PiggyBank} label="Net Kar $" value={'$' + fmtM(confirmedKarUSD)} delta={confirmedKarUSDBuyume} compareLabel={'$' + fmtM(karUSD2025Prorated) + ' (2025)'} />
                  <KpiCard icon={PiggyBank} label="Tahmini Net Kar $" value={'$' + fmtM(totals.netKarUSD2026)} delta={totals.karUSDBuyume} compareLabel={'$' + fmtM(totals.netKarUSD2025) + ' (2025)'} />
                  <KpiCard icon={Percent} label="Kar Marjı $" value={pct(confirmedKarMarjiUSD)} delta={confirmedKarMarjiUSD - karMarjiUSD2025Prorated} deltaSuffix=" puan" compareLabel={pct(karMarjiUSD2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Percent} label="Tahmini Kar Marjı $" value={pct(totals.karMarjiUSD2026)} delta={totals.karMarjiUSD2026 - totals.karMarjiUSD2025} deltaSuffix=" puan" compareLabel={pct(totals.karMarjiUSD2025) + ' (2025)'} />
                </div>
              )}

              {dashCurrency === 'TL' && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <KpiCard icon={Receipt} label="Gider" value={'₺' + fmtM(confirmedGider)} delta={confirmedGiderBuyume} compareLabel={'₺' + fmtM(gider2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Percent} label="Gider Oranı" value={pct(confirmedGiderOrani)} delta={confirmedGiderOrani - giderOrani2025Prorated} deltaSuffix=" puan" compareLabel={pct(giderOrani2025Prorated) + ' (2025)'} />
                </div>
              )}

              {dashCurrency === 'USD' && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <KpiCard icon={Receipt} label="Gider $" value={'$' + fmtM(confirmedGiderUSD)} delta={confirmedGiderUSDBuyume} compareLabel={'$' + fmtM(giderUSD2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Receipt} label="Tahmini Gider $" value={'$' + fmtM(totals.giderUSD2026)} delta={totals.giderUSDBuyume} compareLabel={'$' + fmtM(totals.giderUSD2025) + ' (2025)'} />
                </div>
              )}

              {tahminiCiroToplam > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="shrink-0">
                    <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Hedefe Ulaşma</span>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{Math.round(hedefIlerleme * 100)}%</div>
                  </div>
                  <SegmentedBar percent={hedefIlerleme} />
                  <div className="shrink-0 flex items-center gap-3 sm:pl-4 sm:border-l border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <AlertTriangle size={14} className="text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Tahmini Hedef Ciro</span>
                      <div className="text-base font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap">
                        {dashCurrency === 'TL' ? '₺' + fmtTL(tahminiCiroToplam) : '$' + fmtTL(tahminiCiroToplamUSD)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---------------- GİDERLER (liste) ---------------- */}
          {page === 'giderler' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 w-full sm:w-fit">
                <button
                  onClick={() => setSelectedMonth('Toplam')}
                  className={`self-start px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMonth === 'Toplam' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Toplam
                </button>
                <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5">
                  {months.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-2 py-1.5 rounded-lg text-sm font-medium text-center transition-colors ${monthPillClass(m, selectedMonth === m)}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMonth === 'Toplam' ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Toplam Gider</span>
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">₺{fmtM(totals.totalGider)}</div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({toplamRangeLabel})</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Güncel Gider</span>
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">₺{fmtM(confirmedGider)}</div>
                    {guncelRangeLabel && <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({guncelRangeLabel})</span>}
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Tahmini Gider</span>
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">₺{fmtM(tahminiGiderToplam)}</div>
                    {tahminiRangeLabel && <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({tahminiRangeLabel})</span>}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{selectedMonth} Toplam Gider</span>
                    <div className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1">₺{fmtTL(gider[months.indexOf(selectedMonth)])}</div>
                  </div>
                  {getAyDurumu(selectedMonth) === 'tahmini' && (
                    <span className="bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-3 py-1.5">Tahmini</span>
                  )}
                  {getAyDurumu(selectedMonth) === 'güncel' && (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full px-3 py-1.5">Güncel</span>
                  )}
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Gider Kalemi Dağılımı</h2>
                {selectedMonth === 'Toplam' ? (
                  <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 w-fit mb-4 mt-3">
                    {[
                      { key: 'toplam', label: 'Toplam' },
                      { key: 'güncel', label: 'Güncel' },
                      { key: 'tahmini', label: 'Tahmini' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setGiderGorunum(opt.key)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          giderGorunum === opt.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{expenseItemDefs.length} gider kalemi, büyükten küçüğe sıralanmıştır.</p>
                )}
                <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Kalem</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gidere Oranı</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir'e Oranı</span>
                  <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    let rows, periodTotalGider, periodTotalCiro;
                    if (selectedMonth === 'Toplam') {
                      if (giderGorunum === 'güncel') {
                        rows = expenseItemDefs.map(([name, vals]) => ({ name, amount: itemAmountForMonths(vals, guncelAylar) })).filter((r) => r.amount !== 0);
                        periodTotalGider = confirmedGider;
                        periodTotalCiro = confirmedCiro;
                      } else if (giderGorunum === 'tahmini') {
                        rows = expenseItemDefs.map(([name, vals]) => ({ name, amount: itemAmountForMonths(vals, tahminiAylar) })).filter((r) => r.amount !== 0);
                        periodTotalGider = tahminiGiderToplam;
                        periodTotalCiro = tahminiCiroToplam;
                      } else {
                        rows = monthByExpense('Toplam');
                        periodTotalGider = totals.totalGider;
                        periodTotalCiro = totals.totalCiro;
                      }
                      rows.sort((a, b) => b.amount - a.amount);
                    } else {
                      rows = monthByExpense(selectedMonth);
                      periodTotalGider = gider[months.indexOf(selectedMonth)];
                      periodTotalCiro = ciro[months.indexOf(selectedMonth)];
                    }
                    const rowsTotal = rows.reduce((s, r) => s + r.amount, 0);
                    return (
                      <>
                        {rows.map((k, i) => (
                          <div key={k.name + i} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                            <span className="text-xs text-slate-400 dark:text-slate-500 w-5 tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0">{k.name}</span>
                            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalGider ? k.amount / periodTotalGider : 0)}</span>
                            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? k.amount / periodTotalCiro : 0)}</span>
                            <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-20 sm:w-28 text-right shrink-0">₺{fmtTL(k.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="w-5 shrink-0" />
                          <span className="text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalGider ? rowsTotal / periodTotalGider : 0)}</span>
                          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? rowsTotal / periodTotalCiro : 0)}</span>
                          <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-20 sm:w-28 text-right shrink-0">₺{fmtTL(rowsTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Gider Oranları</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">8 gider kategorisi, büyükten küçüğe sıralanmıştır.</p>
                <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Kategori</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gidere Oranı</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir'e Oranı</span>
                  <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {[...giderYapisi].sort((a, b) => b.deger - a.deger).map((g, i) => (
                    <div key={g.name} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-xs text-slate-400 dark:text-slate-500 w-5 tabular-nums shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: g.fill }} />
                          <span>{g.name}</span>
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500 pl-3.5">({g.detay})</span>
                      </span>
                      <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(g.deger / totals.totalGider)}</span>
                      <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(g.deger / totals.totalCiro)}</span>
                      <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-20 sm:w-28 text-right shrink-0">₺{fmtTL(g.deger)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                    <span className="w-5 shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                    <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(1)}</span>
                    <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(totals.totalGider / totals.totalCiro)}</span>
                    <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-20 sm:w-28 text-right shrink-0">₺{fmtTL(giderYapisi.reduce((s, g) => s + g.deger, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- GELİRLER ---------------- */}
          {page === 'gelirler' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 w-full sm:w-fit">
                <button
                  onClick={() => setSelectedMonth('Toplam')}
                  className={`self-start px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMonth === 'Toplam' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Toplam
                </button>
                <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5">
                  {months.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMonth(m)}
                      className={`px-2 py-1.5 rounded-lg text-sm font-medium text-center transition-colors ${monthPillClass(m, selectedMonth === m)}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMonth === 'Toplam' ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Toplam Ciro</span>
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">₺{fmtM(totals.totalCiro)}</div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({toplamRangeLabel})</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Güncel Ciro</span>
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">₺{fmtM(confirmedCiro)}</div>
                    {guncelRangeLabel && <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({guncelRangeLabel})</span>}
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Tahmini Ciro</span>
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1 whitespace-nowrap">₺{fmtM(tahminiCiroToplam)}</div>
                    {tahminiRangeLabel && <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">({tahminiRangeLabel})</span>}
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{selectedMonth} Toplam Ciro</span>
                    <div className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1">₺{fmtTL(ciro[months.indexOf(selectedMonth)])}</div>
                  </div>
                  {getAyDurumu(selectedMonth) === 'tahmini' && (
                    <span className="bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-3 py-1.5">Tahmini</span>
                  )}
                  {getAyDurumu(selectedMonth) === 'güncel' && (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full px-3 py-1.5">Güncel</span>
                  )}
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Gelir Dağılımı</h2>
                {selectedMonth === 'Toplam' ? (
                  <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 w-fit mb-4 mt-3">
                    {[
                      { key: 'toplam', label: 'Toplam' },
                      { key: 'güncel', label: 'Güncel' },
                      { key: 'tahmini', label: 'Tahmini' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setGelirGorunum(opt.key)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          gelirGorunum === opt.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Sabit gelir, fee faturası ve proje bazlı gelirlerin toplamı, markaya göre birleştirilmiştir.</p>
                )}
                <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Marka</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir Oranı</span>
                  <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    let rows, periodTotalCiro;
                    if (selectedMonth === 'Toplam') {
                      if (gelirGorunum === 'güncel') {
                        rows = customerPivot.map((c) => ({ name: c.name, amount: guncelAylar.reduce((s, m) => s + (c.byMonth[m] || 0), 0) })).filter((r) => r.amount > 0);
                        periodTotalCiro = confirmedCiro;
                      } else if (gelirGorunum === 'tahmini') {
                        rows = customerPivot.map((c) => ({ name: c.name, amount: tahminiAylar.reduce((s, m) => s + (c.byMonth[m] || 0), 0) })).filter((r) => r.amount > 0);
                        periodTotalCiro = tahminiCiroToplam;
                      } else {
                        rows = customerPivot.map((c) => ({ name: c.name, amount: c.total }));
                        periodTotalCiro = totals.totalCiro;
                      }
                      rows.sort((a, b) => b.amount - a.amount);
                    } else {
                      rows = monthByBrand(selectedMonth);
                      periodTotalCiro = ciro[months.indexOf(selectedMonth)];
                    }
                    const rowsTotal = rows.reduce((s, r) => s + r.amount, 0);
                    return (
                      <>
                        {rows.map((b, i) => (
                          <div key={b.name + i} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                            <span className="text-xs text-slate-400 dark:text-slate-500 w-5 tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0 flex items-center gap-2 truncate">
                              <span className="truncate">{b.name}</span>
                              {isPasifMarka(b.name) && (
                                <span className="shrink-0 text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5">
                                  Pasif
                                </span>
                              )}
                            </span>
                            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? b.amount / periodTotalCiro : 0)}</span>
                            <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-20 sm:w-28 text-right shrink-0">₺{fmtTL(b.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="w-5 shrink-0" />
                          <span className="text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? rowsTotal / periodTotalCiro : 0)}</span>
                          <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-20 sm:w-28 text-right shrink-0">₺{fmtTL(rowsTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- ALACAKLAR ---------------- */}
          {page === 'alacaklar' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Toplam Alacak</span>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1">
                    ₺{fmtTL(alacaklarData.reduce((s, [, v]) => s + v, 0))}
                  </div>
                </div>
                <span className="bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-3 py-1.5">Müşteriden Gelecek Ödemeler</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Alacak Dağılımı</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Müşterilerden beklenen ödemeler, markaya göre büyükten küçüğe sıralanmıştır.</p>
                <div className="flex items-center gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Marka</span>
                  <span className="w-14 text-right shrink-0">Alacak Oranı</span>
                  <span className="w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    const toplamAlacak = alacaklarData.reduce((s, [, v]) => s + v, 0);
                    return (
                      <>
                        {alacaklarData.map(([name, amount], i) => {
                          const oran = amount / toplamAlacak;
                          return (
                            <div key={name} className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                              <span className="text-xs text-slate-400 dark:text-slate-500 w-5 tabular-nums shrink-0">{i + 1}</span>
                              <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0">{name}</span>
                              <span className={`text-xs tabular-nums w-14 text-right shrink-0 ${oran > 0.1 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{pct(oran)}</span>
                              <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-28 text-right shrink-0">₺{fmtTL(amount)}</span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="w-5 shrink-0" />
                          <span className="text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 w-14 text-right shrink-0">{pct(1)}</span>
                          <span className="text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-28 text-right shrink-0">₺{fmtTL(toplamAlacak)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- NAKİT AKIŞI ---------------- */}
          {page === 'nakitAkisi' && (
            <div className="flex flex-col gap-4">
              {(() => {
                const toplamAlacak = alacaklarData.reduce((s, [, v]) => s + v, 0);
                const toplamNakit = toplamAlacak + nakitAkisiData.kasa + nakitAkisiData.banka + nakitAkisiData.cek;
                return (
                  <>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Toplam</span>
                      <div className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1">₺{fmtTL(toplamNakit)}</div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Alacaklar + Kasa + Banka + Çek toplamı</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <HandCoins size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          Alacaklar
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap">₺{fmtTL(toplamAlacak)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <Wallet size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          Kasa
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap">₺{fmtTL(nakitAkisiData.kasa)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <Landmark size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          Banka
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap">₺{fmtTL(nakitAkisiData.banka)}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <FileCheck size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          Çek
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums whitespace-nowrap">₺{fmtTL(nakitAkisiData.cek)}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ---------------- YORUMLAR ---------------- */}
          {page === 'yorumlar' && (
            <div className="flex flex-col gap-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-4">Genel Değerlendirme</h2>
                <div className="flex flex-col gap-3">
                  {genelDegerlendirme.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <ChevronRight size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-4">Gider Yorumları</h2>
                  <div className="flex flex-col gap-3">
                    {giderYorumlari.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                  <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-4">Gelir Yorumları</h2>
                  <div className="flex flex-col gap-3">
                    {gelirYorumlari.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 dark:bg-black border border-slate-800 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h2 className="font-serif text-lg text-white">Aksiyon Önerileri</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aksiyonlar.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <ChevronRight size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
