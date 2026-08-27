// Veri kaynağı: Google Sheets "FEE 2026 YENİ" + "MÜŞTERİDEN GELECEK ÖDEMELER"
// Apps Script web app uç noktaları üzerinden otomatik çekilir (bkz. src/lib/parseData.js)
import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Receipt, TrendingUp, MessageSquare, ChevronRight, AlertTriangle, Menu, X,
  HandCoins, Landmark, FileCheck,
  Wallet, PiggyBank, Percent, RefreshCw,
} from 'lucide-react';

// Kesinleşmiş (gerçek) aylar — kalan aylar tahmine dayalıdır
const REAL_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem'];

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
const fmtTL = (n) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n || 0);
const fmtM = (n) => ((n || 0) / 1000000).toFixed(2).replace('.', ',') + ' M';
const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1).replace('.', ',') : '0,0') + '%';

function KpiCard({ icon: Icon, label, value, deltaLabel, compareLabel }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 min-w-0">
      <span className="flex items-center gap-1.5 text-sm text-slate-500">
        {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
        {label}
      </span>
      <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 tabular-nums whitespace-nowrap">{value}</span>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full px-2.5 py-1">{deltaLabel}</span>
        <span className="text-slate-400 text-sm">{compareLabel}</span>
      </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { months, ciro, gider, expenseItemDefs, giderYapisi, revenueRaw, alacaklarData, nakitAkisiData, totals2026, totals2025 } = data;

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

  const pages = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gelirler', label: 'Gelirler', icon: TrendingUp },
    { id: 'giderler', label: 'Giderler', icon: Receipt },
    { id: 'alacaklar', label: 'Alacaklar', icon: HandCoins },
    { id: 'nakitAkisi', label: 'Nakit Akışı', icon: Landmark },
    { id: 'yorumlar', label: 'Yorumlar', icon: MessageSquare },
  ];

  const pageTitle = pages.find((p) => p.id === page)?.label ?? 'Dashboard';

  const lastSync = lastUpdatedFee ? new Date(lastUpdatedFee).toLocaleString('tr-TR') : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* Masaüstü sol menü */}
      <div className="hidden md:flex w-64 bg-slate-900 flex-shrink-0 flex-col py-6 px-4 gap-1">
        <div className="flex items-center gap-3 px-2 pb-6 mb-2 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-semibold shrink-0">M</div>
          <span className="text-white font-semibold text-[15px]">Kreatif Dashboard</span>
        </div>
        {pages.map((p) => (
          <NavItem key={p.id} icon={p.icon} label={p.label} active={page === p.id} onClick={() => setPage(p.id)} />
        ))}
        <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-2">
          {lastSync && <span className="text-[11px] text-slate-500 px-2">Son senkron: {lastSync}</span>}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-2 text-[13px] text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Güncelleniyor...' : 'Şimdi güncelle'}
          </button>
        </div>
      </div>

      {/* Mobil karartma katmanı */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Mobil açılır menü */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col py-6 px-4 gap-1">
          <div className="flex items-center justify-between px-2 pb-6 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-semibold shrink-0">M</div>
              <span className="text-white font-semibold text-[15px]">Kreatif Dashboard</span>
            </div>
            <button className="text-slate-400 hover:text-white shrink-0" onClick={() => setMobileMenuOpen(false)}>
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
        <div className="px-4 sm:px-8 py-5 border-b border-slate-200 bg-white flex items-center gap-3">
          <button className="md:hidden text-slate-500 hover:text-slate-900 shrink-0" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="text-sm text-slate-500">Yönetici Özeti</span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="md:hidden ml-auto flex items-center gap-1.5 text-xs text-slate-400 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Güncelle
          </button>
        </div>

        <div className="p-4 sm:p-8 flex flex-col gap-6">
          <h1 className="font-serif text-3xl text-slate-900">{pageTitle}</h1>

          {/* ---------------- DASHBOARD ---------------- */}
          {page === 'dashboard' && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-400 -mb-1">Yeşil oranlar 2025'e göre değişimi gösterir (2025 → 2026)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard icon={Wallet} label="Ciro" value={'₺' + fmtM(totals.totalCiro)} deltaLabel={pct(totals.ciroBuyume)} compareLabel={'₺' + fmtM(totals.ciro2025) + ' (2025)'} />
                <KpiCard icon={Receipt} label="Gider" value={'₺' + fmtM(totals.totalGider)} deltaLabel={pct(totals.giderBuyume)} compareLabel={'₺' + fmtM(totals.gider2025) + ' (2025)'} />
                <KpiCard icon={PiggyBank} label="Net Kar" value={'₺' + fmtM(totals.totalKar)} deltaLabel={pct(totals.karBuyume)} compareLabel={'₺' + fmtM(totals.kar2025) + ' (2025)'} />
                <KpiCard icon={Percent} label="Kar Marjı" value={pct(totals.karMarji)} deltaLabel={pct(totals.karMarji - totals.karMarji2025) + ' puan'} compareLabel={pct(totals.karMarji2025) + ' (2025)'} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard icon={Wallet} label="Ciro $" value={'$' + fmtM(totals.ciroUSD2026)} deltaLabel={pct(totals.ciroUSDBuyume)} compareLabel={'$' + fmtM(totals.ciroUSD2025) + ' (2025)'} />
                <KpiCard icon={Receipt} label="Gider $" value={'$' + fmtM(totals.giderUSD2026)} deltaLabel={pct(totals.giderUSDBuyume)} compareLabel={'$' + fmtM(totals.giderUSD2025) + ' (2025)'} />
                <KpiCard icon={PiggyBank} label="Net Kar $" value={'$' + fmtM(totals.netKarUSD2026)} deltaLabel={pct(totals.karUSDBuyume)} compareLabel={'$' + fmtM(totals.netKarUSD2025) + ' (2025)'} />
                <KpiCard icon={Percent} label="Kar Marjı $" value={pct(totals.karMarjiUSD2026)} deltaLabel={pct(totals.karMarjiUSD2026 - totals.karMarjiUSD2025) + ' puan'} compareLabel={pct(totals.karMarjiUSD2025) + ' (2025)'} />
              </div>
            </div>
          )}

          {/* ---------------- GİDERLER (liste) ---------------- */}
          {page === 'giderler' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 w-fit">
                <button
                  onClick={() => setSelectedMonth('Toplam')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMonth === 'Toplam' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Toplam
                </button>
                <span className="w-px bg-slate-200 my-1" />
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === m ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                    {!REAL_MONTHS.includes(m) && <span className="ml-1 text-[10px] opacity-60">•</span>}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-sm text-slate-500">{selectedMonth === 'Toplam' ? 'Yıl Toplam Gider' : selectedMonth + ' Toplam Gider'}</span>
                  <div className="font-serif text-3xl text-slate-900 tabular-nums mt-1">
                    ₺{fmtTL(selectedMonth === 'Toplam' ? totals.totalGider : gider[months.indexOf(selectedMonth)])}
                  </div>
                </div>
                {selectedMonth !== 'Toplam' && !REAL_MONTHS.includes(selectedMonth) && (
                  <span className="bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-3 py-1.5">Tahmini (~%90)</span>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-serif text-lg text-slate-900 mb-1">Gider Kalemi Dağılımı</h2>
                <p className="text-xs text-slate-500 mb-4">{expenseItemDefs.length} gider kalemi, büyükten küçüğe sıralanmıştır.</p>
                <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Kalem</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gidere Oranı</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir'e Oranı</span>
                  <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    const rows = monthByExpense(selectedMonth);
                    const periodTotalGider = selectedMonth === 'Toplam' ? totals.totalGider : gider[months.indexOf(selectedMonth)];
                    const periodTotalCiro = selectedMonth === 'Toplam' ? totals.totalCiro : ciro[months.indexOf(selectedMonth)];
                    const rowsTotal = rows.reduce((s, r) => s + r.amount, 0);
                    return (
                      <>
                        {rows.map((k, i) => (
                          <div key={k.name + i} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50">
                            <span className="text-xs text-slate-400 w-5 tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-sm text-slate-700 flex-1 min-w-0">{k.name}</span>
                            <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(k.amount / periodTotalGider)}</span>
                            <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(k.amount / periodTotalCiro)}</span>
                            <span className="text-sm tabular-nums text-slate-900 font-medium w-20 sm:w-28 text-right shrink-0">₺{fmtTL(k.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200">
                          <span className="w-5 shrink-0" />
                          <span className="text-sm text-slate-900 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(rowsTotal / periodTotalGider)}</span>
                          <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(rowsTotal / periodTotalCiro)}</span>
                          <span className="text-sm tabular-nums text-slate-900 font-bold w-20 sm:w-28 text-right shrink-0">₺{fmtTL(rowsTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-serif text-lg text-slate-900 mb-1">Gider Oranları</h2>
                <p className="text-xs text-slate-500 mb-4">8 gider kategorisi, büyükten küçüğe sıralanmıştır.</p>
                <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Kategori</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gidere Oranı</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir'e Oranı</span>
                  <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {[...giderYapisi].sort((a, b) => b.deger - a.deger).map((g, i) => (
                    <div key={g.name} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50">
                      <span className="text-xs text-slate-400 w-5 tabular-nums shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm text-slate-700">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: g.fill }} />
                          <span>{g.name}</span>
                        </span>
                        <span className="block text-xs text-slate-400 pl-3.5">({g.detay})</span>
                      </span>
                      <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(g.deger / totals.totalGider)}</span>
                      <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(g.deger / totals.totalCiro)}</span>
                      <span className="text-sm tabular-nums text-slate-900 font-medium w-20 sm:w-28 text-right shrink-0">₺{fmtTL(g.deger)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200">
                    <span className="w-5 shrink-0" />
                    <span className="text-sm text-slate-900 font-semibold flex-1 min-w-0">Toplam</span>
                    <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(1)}</span>
                    <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(totals.totalGider / totals.totalCiro)}</span>
                    <span className="text-sm tabular-nums text-slate-900 font-bold w-20 sm:w-28 text-right shrink-0">₺{fmtTL(giderYapisi.reduce((s, g) => s + g.deger, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- GELİRLER ---------------- */}
          {page === 'gelirler' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 w-fit">
                <button
                  onClick={() => setSelectedMonth('Toplam')}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMonth === 'Toplam' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Toplam
                </button>
                <span className="w-px bg-slate-200 my-1" />
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === m ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                    {!REAL_MONTHS.includes(m) && <span className="ml-1 text-[10px] opacity-60">•</span>}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-500">{selectedMonth === 'Toplam' ? 'Yıl Toplam Ciro' : selectedMonth + ' Toplam Ciro'}</span>
                  <div className="font-serif text-3xl text-slate-900 tabular-nums mt-1">
                    ₺{fmtTL(selectedMonth === 'Toplam' ? totals.totalCiro : ciro[months.indexOf(selectedMonth)])}
                  </div>
                </div>
                {selectedMonth !== 'Toplam' && !REAL_MONTHS.includes(selectedMonth) && (
                  <span className="bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-3 py-1.5">Tahmini (~%90)</span>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-serif text-lg text-slate-900 mb-1">Marka Bazlı Gelir Dağılımı</h2>
                <p className="text-xs text-slate-500 mb-4">
                  {selectedMonth === 'Toplam'
                    ? 'Ocak-Aralık tüm markaların toplam geliri, sabit gelir + fee faturası + proje bazlı gelir birleştirilmiştir.'
                    : 'Sabit gelir, fee faturası ve proje bazlı gelirlerin toplamı, markaya göre birleştirilmiştir.'}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1">Marka</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir Oranı</span>
                  <span className="w-20 sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    const rows = selectedMonth === 'Toplam' ? customerPivot.map((c) => ({ name: c.name, amount: c.total })) : monthByBrand(selectedMonth);
                    const periodTotalCiro = selectedMonth === 'Toplam' ? totals.totalCiro : ciro[months.indexOf(selectedMonth)];
                    const rowsTotal = rows.reduce((s, r) => s + r.amount, 0);
                    return (
                      <>
                        {rows.map((b, i) => (
                          <div key={b.name + i} className="flex items-center gap-2 sm:gap-3 py-2.5 border-b border-slate-50">
                            <span className="text-xs text-slate-400 w-5 tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-sm text-slate-700 flex-1 min-w-0">{b.name}</span>
                            <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(b.amount / periodTotalCiro)}</span>
                            <span className="text-sm tabular-nums text-slate-900 font-medium w-20 sm:w-28 text-right shrink-0">₺{fmtTL(b.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200">
                          <span className="w-5 shrink-0" />
                          <span className="text-sm text-slate-900 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-xs tabular-nums text-slate-400 w-12 sm:w-14 text-right shrink-0">{pct(rowsTotal / periodTotalCiro)}</span>
                          <span className="text-sm tabular-nums text-slate-900 font-bold w-20 sm:w-28 text-right shrink-0">₺{fmtTL(rowsTotal)}</span>
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
              <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-sm text-slate-500">Toplam Alacak</span>
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums mt-1">
                    ₺{fmtTL(alacaklarData.reduce((s, [, v]) => s + v, 0))}
                  </div>
                </div>
                <span className="bg-amber-50 text-amber-700 text-xs font-medium rounded-full px-3 py-1.5">Müşteriden Gelecek Ödemeler</span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-serif text-lg text-slate-900 mb-1">Marka Bazlı Alacak Dağılımı</h2>
                <p className="text-xs text-slate-500 mb-4">Müşterilerden beklenen ödemeler, markaya göre büyükten küçüğe sıralanmıştır.</p>
                <div className="flex items-center gap-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400">
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
                            <div key={name} className="flex items-center gap-3 py-2.5 border-b border-slate-50">
                              <span className="text-xs text-slate-400 w-5 tabular-nums shrink-0">{i + 1}</span>
                              <span className="text-sm text-slate-700 flex-1 min-w-0">{name}</span>
                              <span className={`text-xs tabular-nums w-14 text-right shrink-0 ${oran > 0.1 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{pct(oran)}</span>
                              <span className="text-sm tabular-nums text-slate-900 font-medium w-28 text-right shrink-0">₺{fmtTL(amount)}</span>
                            </div>
                          );
                        })}
                        <div className="flex items-center gap-3 pt-3 mt-1 border-t-2 border-slate-200">
                          <span className="w-5 shrink-0" />
                          <span className="text-sm text-slate-900 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-xs tabular-nums text-slate-400 w-14 text-right shrink-0">{pct(1)}</span>
                          <span className="text-sm tabular-nums text-slate-900 font-bold w-28 text-right shrink-0">₺{fmtTL(toplamAlacak)}</span>
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
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                      <span className="text-sm text-slate-500">Toplam</span>
                      <div className="text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums mt-1">₺{fmtTL(toplamNakit)}</div>
                      <p className="text-xs text-slate-400 mt-2">Alacaklar + Kasa + Banka + Çek toplamı</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <HandCoins size={14} className="text-slate-400 shrink-0" />
                          Alacaklar
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 tabular-nums whitespace-nowrap">₺{fmtTL(toplamAlacak)}</span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Wallet size={14} className="text-slate-400 shrink-0" />
                          Kasa
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 tabular-nums whitespace-nowrap">₺{fmtTL(nakitAkisiData.kasa)}</span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Landmark size={14} className="text-slate-400 shrink-0" />
                          Banka
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 tabular-nums whitespace-nowrap">₺{fmtTL(nakitAkisiData.banka)}</span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 min-w-0">
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <FileCheck size={14} className="text-slate-400 shrink-0" />
                          Çek
                        </span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 tabular-nums whitespace-nowrap">₺{fmtTL(nakitAkisiData.cek)}</span>
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
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-serif text-lg text-slate-900 mb-4">Genel Değerlendirme</h2>
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
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h2 className="font-serif text-lg text-slate-900 mb-4">Gider Yorumları</h2>
                  <div className="flex flex-col gap-3">
                    {giderYorumlari.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <h2 className="font-serif text-lg text-slate-900 mb-4">Gelir Yorumları</h2>
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

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
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
  );
}
