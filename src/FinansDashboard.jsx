// Veri kaynağı: Google Sheets "FEE 2026 YENİ" + "MÜŞTERİDEN GELECEK ÖDEMELER"
// Apps Script web app uç noktaları üzerinden otomatik çekilir (bkz. src/lib/parseData.js)
import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, Receipt, TrendingUp, TrendingDown, MessageSquare, AlertTriangle, Menu, X, Moon, Sun, ChevronRight,
  HandCoins, Landmark, FileCheck,
  Wallet, PiggyBank, Percent, Table, Clock,
} from 'lucide-react';
import SatisTablosu from './SatisTablosu.jsx';
import SureAnalizi from './SureAnalizi.jsx';
import { YASLANDIRMA_KOVALARI } from './lib/parseData.js';


/* ------------------------------------------------------------------ */
/* Editöryal yorumlar — bunlar veri değil, elle yazılmış değerlendirme */
/* metinleridir. Rakamlar önemli ölçüde değiştiğinde elden geçirin.    */
/* ------------------------------------------------------------------ */
const genelDegerlendirme = [
  "Ciro 2025'e göre %55,1 büyüdü (₺161,31 M / ₺104,00 M), gider %38,7 arttı (₺91,40 M / ₺65,90 M) — ciro büyümesi giderin açık ara önünde.",
  'Net kâr %83,5 arttı (₺69,91 M / ₺38,10 M); kâr marjı %36,6\'dan %43,3\'e yükseldi (+6,7 puan).',
  'Ocak-Eylül (9 ay) artık kesinleşmiş veriye dayanıyor (ciro ₺117,80 M, gider ₺69,64 M, kâr ₺48,16 M); sadece Ekim-Aralık tahmine dayalı. Kesinleşen 9 ayın kâr marjı %40,9, yıl geneli beklenti %43,3 — tahmin, gerçekleşenin biraz üzerinde kurgulanmış, son çeyrekte aylık ₺14,50 M ciro hedefi yakalanmalı.',
  'Kalan 3 ay için aylık ₺14,50 M ciro / ₺7,25 M gider (₺7,25 M kâr) varsayılıyor. Ocak-Eylül aylık ortalama ciro ₺13,09 M olduğundan bu hedef ortalamanın üzerinde; Ağustos (₺18,57 M) gibi güçlü proje aylarına ihtiyaç var.',
  'Eylül ayı ₺11,46 M ciro ile Ağustos\'un (₺18,57 M) belirgin altında kaldı; aylık kâr ₺4,00 M ve marj %34,9 ile Ağustos\'taki %59,5\'in çok altında. Eylül\'ün önceki ₺10,56 M tahmininin ₺0,90 M üzerinde kapandı.',
  'Banka bakiyesi ₺37,67 M (kasa ve çek dahil ₺37,90 M) — aylık giderin (~₺7,5 M) yaklaşık 5 katı, güçlü bir nakit pozisyonu; önceki güncellemeye göre banka bakiyesi ₺2,58 M azaldı.',
  'Satış Tablosu (fatura bazlı) ile Gelirler (ciro) Ocak-Eylül arasında birebir tutuyor (Ocak-Eylül toplamı ₺117,80 M; Eylül ₺11,46 M) — iki kaynak birbirini doğruluyor.',
];

const giderYorumlari = [
  'Personel gideri (Maaş + SGK + Yemek + Kıdem/İhbar + Muhtasar) toplam giderin %65,3\'ünü oluşturuyor — en büyük ve baskın kalem. Maaş Ocak\'ta ₺2,89 M\'den Eylül\'de ₺2,44 M\'ye gerilerken Muhtasar ₺0,47 M\'den ₺0,93 M\'ye çıktı; maliyet kontrolü öncelikle burada odaklanmalı.',
  'Aylık gider Ocak-Eylül arasında ₺7,06-8,59 M bandında kalıyor (Mart\'taki ₺1,03 M\'lik kıdem/ihbar ödemesi nedeniyle ₺8,59 M zirve); Eylül gideri ₺7,45 M. Ocak\'tan Eylül\'e ciro %20,4 artarken gider %2,7 azaldı.',
  'Aylık Lisanslar kalemi Ocak\'taki ₺67 B\'den Eylül\'de ₺151 B\'ye 2,2 katına çıktı (yıl toplamı ₺1,60 M; Yıllık Lisanslar ile birlikte ₺2,57 M) — yazılım/lisans yükü gözden geçirilmeli.',
  'Geçici Vergi (Kurumlar Vergisi) Temmuz\'dan itibaren aylık ₺780.314\'ten ₺650.000\'e düşmüş durumda.',
  '"Ek Masraflar" kalemi Haziran\'dan itibaren ortaya çıktı (₺100 B → ₺200 B+/ay) ve yıl sonuna kadar toplam ₺1,33 M\'e ulaşacak; Haziran\'daki SMM/YMM/Avukat (₺362 B) sıçraması da tek seferlik görünüyor. Bu kalemler bütçede ayrıca izlenmeli.',
  'Ödül-Reklam, Muhasebe Lisans, İş İlanı gibi kalemler düzensiz/dönemsel — yıl sonuna doğru gerekirse bütçede pay ayrılmalı.',
];

const gelirYorumlari = [
  'En büyük 3 marka (Zuhal Müzik %8,7, Eğriçayır %8,3, Servet %7,9) Ocak-Eylül faturalamasının sadece %25,0\'ını oluşturuyor; ilk 8 marka yaklaşık %60,5\'ini oluşturuyor — portföy dağılmış, yoğunlaşma riski düşük. Kozoliv (%7,9) ve Myra (%7,5) da ilk 5\'e girdi.',
  '9 marka (Nehir, Ecocotton, Kuşkonmaz, Arçelik, Artı Cerrahi, Eczi, Wildfruits, Gerçek Kozmetik, Heritage) Pasif işaretli ve Ocak-Eylül faturalamasının %7,7\'sini (₺9,07 M) oluşturuyor — pasif sayısı arttı (Gerçek Kozmetik ve Heritage eklendi), kayıp hâlâ sınırlı ama büyüyor.',
  'Ocak-Eylül faturalamasının %62,9\'u (₺74,05 M) aylık sabit Fee, %37,1\'i (₺43,75 M) proje geliri — düzenli gelir tabanı güçlü, proje kısmı aylara göre dalgalı (Ağustos ₺18,57 M, Eylül ₺11,46 M).',
  'Ekim-Aralık için "Tahmini Proje" altında toplu gelir tahmini hâlâ girilmiş durumda; Eylül ayında Fee ₺8,99 M\'de kalırken proje geliri ₺2,47 M\'ye düştü — son çeyrek ciro hedefi (₺14,50 M/ay) için yeni proje netleştirilmeli ve müşteri bazında ayrıştırılmalı.',
  'Departman dağılımı dengeli: Strateji Pazarlama İletişimi %30,6, Prodüksiyon %28,9, Tasarım %24,5 ve Performans Pazarlama %15,9 — Performans Pazarlama en küçük paya sahip, büyüme alanı olarak değerlendirilebilir.',
  'Yıl içinde 12 yeni marka fee portföyüne katıldı (Mart 3, Nisan 2, Mayıs 2, Haziran 3, Temmuz 1, Ağustos 1); fee faturası kesilen marka sayısı Ocak\'taki 18\'den Haziran-Ağustos\'ta 26\'ya çıktı, Eylül\'de 23\'e geriledi (pasif markalar). Satış Tablosu\'nda fatura kesilmeyen aylar gri gösteriliyor.',
  'Sabit TL fee dolar karşılığında eriyor: Ocak-Eylül\'de kur %16,5 yükseldi (42,22 → 49,20), yani aynı TL fee USD\'de yaklaşık %14,2 değer kaybetti (marka sayfalarındaki KKO oranı). Yeni markalarla aylık Fee\'nin USD karşılığı Ocak\'ta $152 K\'dan Ağustos\'ta $196 K\'ya çıktı, Eylül\'de $183 K\'ya geriledi.',
];

const aksiyonlar = [
  'Personel giderindeki büyük payı (%65,3) göz önünde bulundurarak, ekip büyümesi planlanıyorsa kâr marjı etkisi önceden modellenmeli; Muhtasar\'daki artış (Ocak ₺0,47 M → Eylül ₺0,93 M) ayrıca incelenmeli.',
  'Alacaklar toplamı ₺21,74 M. Servet (₺3,72 M, %17,1) ve Kozoliv (₺3,69 M, %17,0) tek başlarına alacakların üçte birini oluşturuyor; Myra (₺2,36 M) da öne çıkıyor — tahsilat takibi bu üç müşteride önceliklendirilmeli.',
  'Alacakların ₺11,11 M\'si (%51) bugüne kadar vadesi gelmiş durumda — ağırlıkla 1 Ekim vadeli (Servet, Myra, Silva, Portakal Bahçem, Zuhal) ve BMS\'in ₺1,43 M\'lik Ağustos vadeli kalemi; tahsilat haftalık izlenmeli. Kalan ₺10,63 M Ekim sonu-Kasım vadeli.',
  'Pasif markalar (9 marka) cirodaki payı düşük olsa da (%7,7), pasif sayısı arttığı için bu markaların yerine yeni müşteri kazanımı planlanmalı; Eylül\'de fee faturası kesilen marka sayısındaki düşüş (26 → 23) izlenmeli.',
  'Ekim-Aralık\'ta aylık ₺14,50 M ciro tahmini, Ocak-Eylül ortalamasının (₺13,09 M) üzerinde — Eylül\'deki proje düşüşü (₺2,47 M) tekrarlanırsa hedef kaçar; proje pipeline\'ı çeyrek başında netleştirilmeli.',
  '2026 için resmi bir bütçe/hedef belirlenip rapora eklenmeli — sadece geçen yılla değil hedefle kıyas da yapılabilsin.',
  'Kur kaybını azaltmak için sabit fee\'li markalarda fee\'yi kura veya enflasyona endeksleyen dönemsel (ör. 6 aylık) güncelleme maddesi sözleşmelere eklenmeli; kur Ocak\'tan beri %16,5 yükseldi, en çok erimeyi KKO oranı yüksek markalar gösteriyor.',
  'Yıl ortasında katılan markaların (Mart-Ağustos) fee seviyeleri, kur kaybı oluşmadan baştan kura duyarlı belirlenmeli.',
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
  const [kdvDahil, setKdvDahil] = useState(true); // Alacaklar: varsayılan KDV dahil
  const [seciliMarka, setSeciliMarka] = useState(null); // Alacaklar: marka ayrıntı penceresi
  useEffect(() => {
    if (!seciliMarka) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSeciliMarka(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seciliMarka]);

  const { months, ciro, ciroUSD, giderUSD, gider, expenseItemDefs, giderYapisi, revenueRaw, alacaklarData: alacaklarHam, nakitAkisiData, totals2026, totals2025, tahminiProjeToplam, ayDurumu, pasifMarkalar } = data;
  // Alacak kaynağı KDV dahildir; KDV'siz görünümde 1,14'e bölünür (yaşlandırma gün ağırlıkları da aynı oranda ölçeklenir)
  const KDV_CARPANI = 1.14;
  const alacakOlcekle = (kdv) => alacaklarHam.map(([n, t, g, f, y]) => {
    const k = (v) => (kdv ? v : v / KDV_CARPANI);
    return [n, k(t), k(g || 0), k(f || 0), y && { ...y, gunTutar: k(y.gunTutar || 0), kovalar: (y.kovalar || []).map(k), satirlar: (y.satirlar || []).map(([d, t, gn]) => [d, k(t), gn]) }];
  });
  const alacaklarData = alacakOlcekle(kdvDahil);
  const alacaklarKdvsiz = kdvDahil ? alacakOlcekle(false) : alacaklarData;
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

  // Marka × ay: fee (sabit + fee faturası) ve proje (fee dışı) ayrımı
  function monthSplitMap(monthKey) {
    const monthData = revenueRaw[monthKey];
    const map = {};
    if (!monthData) return map;
    const add = (client, key, amount) => {
      const o = map[client] || (map[client] = { fee: 0, proje: 0 });
      o[key] += amount;
    };
    ['diger', 'fatura'].forEach((cat) => (monthData[cat] || []).forEach(([client, amount]) => add(client, 'fee', amount)));
    (monthData.feeDisi || []).forEach(([client, , amount]) => add(client, 'proje', amount));
    return map;
  }

  function monthByBrand(monthKey) {
    return Object.entries(monthDistributedMap(monthKey))
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  const customerPivot = useMemo(() => {
    const totalsByBrand = {};
    const splitByBrand = {};
    months.forEach((m) => {
      const map = monthDistributedMap(m);
      Object.entries(map).forEach(([client, amount]) => {
        if (!totalsByBrand[client]) totalsByBrand[client] = {};
        totalsByBrand[client][m] = amount;
      });
      Object.entries(monthSplitMap(m)).forEach(([client, v]) => {
        if (!splitByBrand[client]) splitByBrand[client] = {};
        splitByBrand[client][m] = v;
      });
    });
    return Object.entries(totalsByBrand)
      .map(([name, byMonth]) => {
        const total = months.reduce((s, m) => s + (byMonth[m] || 0), 0);
        return { name, byMonth, total, split: splitByBrand[name] || {} };
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
    { id: 'satisTablosu', label: 'Satış Tablosu', icon: Table },
    { id: 'sureAnalizi', label: 'Süre Analiz', icon: Clock },
    { id: 'yorumlar', label: 'Yorumlar', icon: MessageSquare },
  ];

  const pageTitle = pages.find((p) => p.id === page)?.label ?? 'Yönetici Özeti';

  const lastSync = lastUpdatedFee ? new Date(lastUpdatedFee).toLocaleString('tr-TR') : null;

  return (
    <div className={darkMode ? 'dark' : ''}>
    <div className="min-h-screen bg-[#E4E7EB] dark:bg-slate-950 font-sans flex transition-colors">
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
                  <KpiCard icon={Receipt} label="Tahmini Gider" value={'₺' + fmtM(totals.totalGider)} delta={totals.giderBuyume} compareLabel={'₺' + fmtM(totals.gider2025) + ' (2025)'} />
                </div>
              )}

              {dashCurrency === 'USD' && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  <KpiCard icon={Receipt} label="Gider $" value={'$' + fmtM(confirmedGiderUSD)} delta={confirmedGiderUSDBuyume} compareLabel={'$' + fmtM(giderUSD2025Prorated) + ' (2025)'} />
                  <KpiCard icon={Receipt} label="Tahmini Gider $" value={'$' + fmtM(totals.giderUSD2026)} delta={totals.giderUSDBuyume} compareLabel={'$' + fmtM(totals.giderUSD2025) + ' (2025)'} />
                </div>
              )}

              {(() => {
                const sym = dashCurrency === 'USD' ? '$' : '₺';
                const baseGel = (i) => (dashCurrency === 'USD' ? ciroUSD?.[i] : ciro?.[i]) || 0;
                const gid = (i) => (dashCurrency === 'USD' ? giderUSD?.[i] : gider?.[i]) || 0;
                const gel = baseGel;
                const idx = months.map((_, i) => i);
                const guncelList = idx.filter((i) => ayDurumu?.[i] === 'güncel');
                const money = (v) => `${v < 0 ? '−' : ''}${sym}${fmtTL(Math.abs(v))}`;
                const tot = (list) => {
                  const g = list.reduce((a, i) => a + gel(i), 0);
                  const d = list.reduce((a, i) => a + gid(i), 0);
                  return { g, d, f: g - d, o: g ? (g - d) / g : 0 };
                };
                const cell = 'flex-1 min-w-0 text-[11px] sm:text-sm tabular-nums text-right';
                const pctCell = 'w-9 sm:w-14 shrink-0 text-[11px] sm:text-sm tabular-nums text-right';
                const gridCls = 'flex items-center gap-1.5 sm:gap-3';
                const totRow = (label, list, strong) => {
                  const t = tot(list);
                  return (
                    <div className={`${gridCls} py-2.5 ${strong ? 'mt-1 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg' : 'border-t border-slate-100 dark:border-slate-800'}`}>
                      <span className="w-12 sm:w-20 shrink-0 text-[10px] sm:text-xs font-semibold text-slate-900 dark:text-slate-50 uppercase leading-tight">{label}</span>
                      <span className={`${cell} font-bold text-slate-900 dark:text-slate-50`}>{money(t.g)}</span>
                      <span className={`${cell} font-bold text-slate-900 dark:text-slate-50`}>{money(t.d)}</span>
                      <span className={`${cell} font-bold text-slate-900 dark:text-slate-50`}>{money(t.f)}</span>
                      <span className={`${pctCell} font-semibold text-slate-500`}>{Math.round(t.o * 100)}%</span>
                    </div>
                  );
                };
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Aylık Gelir - Gider Özeti</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Gelirler ve giderler FEE 2026 YENİ dosyasından gelir; $ görünümü her ayın kuruyla (DASH 26) hesaplanır. Yeşil nokta güncel, kırmızı nokta tahmini aydır.</p>
                    <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <span className="w-12 sm:w-20 shrink-0">Aylar</span>
                      <span className="flex-1 min-w-0 text-right">Gelirler</span>
                      <span className="flex-1 min-w-0 text-right">Giderler</span>
                      <span className="flex-1 min-w-0 text-right">Fark</span>
                      <span className="w-9 sm:w-14 text-right shrink-0">%</span>
                    </div>
                    {idx.map((i) => {
                      const durum = ayDurumu?.[i];
                      const g = gel(i);
                      const d = gid(i);
                      return (
                        <div key={i} className={`${gridCls} py-2 border-b border-slate-50 dark:border-slate-800`}>
                          <span className="w-12 sm:w-20 shrink-0 text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${durum === 'güncel' ? 'bg-emerald-500' : 'bg-rose-300'}`} />
                            {months[i]}
                          </span>
                          <span className={`${cell} text-slate-700 dark:text-slate-300`}>{money(g)}</span>
                          <span className={`${cell} text-slate-700 dark:text-slate-300`}>{money(d)}</span>
                          <span className={`${cell} text-slate-900 dark:text-slate-50 font-medium`}>{money(g - d)}</span>
                          <span className={`${pctCell} text-slate-400`}>{g ? Math.round(((g - d) / g) * 100) : 0}%</span>
                        </div>
                      );
                    })}
                    {totRow('Güncel', guncelList, false)}
                    {totRow('Toplam', idx, true)}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ---------------- GİDERLER (liste) ---------------- */}
          {page === 'giderler' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => setSelectedMonth('Toplam')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === 'Toplam' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Toplam
                  </button>
                </div>
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
                <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-4 sm:w-5 shrink-0" />
                  <span className="flex-1">Kalem</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gidere Oranı</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir'e Oranı</span>
                  <span className="w-[4.5rem] sm:w-28 text-right shrink-0">Tutar</span>
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
                          <div key={k.name + i} className="flex items-center gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0">{k.name}</span>
                            <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalGider ? k.amount / periodTotalGider : 0)}</span>
                            <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? k.amount / periodTotalCiro : 0)}</span>
                            <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(k.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="w-4 sm:w-5 shrink-0" />
                          <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalGider ? rowsTotal / periodTotalGider : 0)}</span>
                          <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? rowsTotal / periodTotalCiro : 0)}</span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(rowsTotal)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Gider Oranları</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">8 gider kategorisi, büyükten küçüğe sıralanmıştır.</p>
                <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-4 sm:w-5 shrink-0" />
                  <span className="flex-1">Kategori</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gidere Oranı</span>
                  <span className="w-12 sm:w-14 text-right shrink-0">Gelir'e Oranı</span>
                  <span className="w-[4.5rem] sm:w-28 text-right shrink-0">Tutar</span>
                </div>
                <div className="flex flex-col">
                  {[...giderYapisi].sort((a, b) => b.deger - a.deger).map((g, i) => (
                    <div key={g.name} className="flex items-center gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: g.fill }} />
                          <span>{g.name}</span>
                        </span>
                        <span className="block text-xs text-slate-400 dark:text-slate-500 pl-3.5">({g.detay})</span>
                      </span>
                      <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(g.deger / totals.totalGider)}</span>
                      <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(g.deger / totals.totalCiro)}</span>
                      <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(g.deger)}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                    <span className="w-4 sm:w-5 shrink-0" />
                    <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                    <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(1)}</span>
                    <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-12 sm:w-14 text-right shrink-0">{pct(totals.totalGider / totals.totalCiro)}</span>
                    <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(giderYapisi.reduce((s, g) => s + g.deger, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- GELİRLER ---------------- */}
          {page === 'gelirler' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => setSelectedMonth('Toplam')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === 'Toplam' ? 'bg-slate-900 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Toplam
                  </button>
                </div>
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
                <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-4 sm:w-5 shrink-0" />
                  <span className="flex-1 min-w-0">Marka</span>
                  <span className="w-10 sm:w-14 text-right shrink-0 leading-tight">Gelir Oranı</span>
                  <span className="w-[4.25rem] sm:w-24 text-right shrink-0">Fee</span>
                  <span className="w-[4.25rem] sm:w-24 text-right shrink-0">Proje</span>
                  <span className="w-[4.5rem] sm:w-28 text-right shrink-0">Toplam</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    let periodMonths, periodTotalCiro;
                    if (selectedMonth === 'Toplam') {
                      if (gelirGorunum === 'güncel') {
                        periodMonths = guncelAylar;
                        periodTotalCiro = confirmedCiro;
                      } else if (gelirGorunum === 'tahmini') {
                        periodMonths = tahminiAylar;
                        periodTotalCiro = tahminiCiroToplam;
                      } else {
                        periodMonths = months;
                        periodTotalCiro = totals.totalCiro;
                      }
                    } else {
                      periodMonths = [selectedMonth];
                      periodTotalCiro = ciro[months.indexOf(selectedMonth)];
                    }
                    const rows = customerPivot
                      .map((c) => {
                        const fee = periodMonths.reduce((s, m) => s + (c.split[m]?.fee || 0), 0);
                        const proje = periodMonths.reduce((s, m) => s + (c.split[m]?.proje || 0), 0);
                        return { name: c.name, fee, proje, amount: fee + proje };
                      })
                      .filter((r) => r.amount > 0)
                      .sort((a, b) => b.amount - a.amount);
                    const feeTotal = rows.reduce((s, r) => s + r.fee, 0);
                    const projeTotal = rows.reduce((s, r) => s + r.proje, 0);
                    const tl = (v) => (v ? '₺' + fmtTL(v) : '–');
                    const rowsTotal = rows.reduce((s, r) => s + r.amount, 0);
                    return (
                      <>
                        {rows.map((b, i) => (
                          <div key={b.name + i} className="flex items-start gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
                            <span className="text-[11px] sm:text-sm text-slate-700 dark:text-slate-300 flex-1 min-w-0 flex flex-wrap items-center gap-x-2 break-words">
                              <span>{b.name}</span>
                              {isPasifMarka(b.name) && (
                                <span className="shrink-0 text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5">
                                  Pasif
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-10 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? b.amount / periodTotalCiro : 0)}</span>
                            <span className={`text-[11px] sm:text-sm tabular-nums w-[4.25rem] sm:w-24 text-right shrink-0 ${b.fee ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>{tl(b.fee)}</span>
                            <span className={`text-[11px] sm:text-sm tabular-nums w-[4.25rem] sm:w-24 text-right shrink-0 ${b.proje ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>{tl(b.proje)}</span>
                            <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(b.amount)}</span>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="w-4 sm:w-5 shrink-0" />
                          <span className="text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-10 sm:w-14 text-right shrink-0">{pct(periodTotalCiro ? rowsTotal / periodTotalCiro : 0)}</span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.25rem] sm:w-24 text-right shrink-0">{tl(feeTotal)}</span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.25rem] sm:w-24 text-right shrink-0">{tl(projeTotal)}</span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(rowsTotal)}</span>
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
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                    {[[false, "KDV'siz"], [true, "KDV'li"]].map(([v, label]) => (
                      <button key={label} onClick={() => setKdvDahil(v)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${kdvDahil === v ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'}`}>{label}</button>
                    ))}
                  </div>
                  {!kdvDahil && <span className="text-[10px] text-slate-400 dark:text-slate-500">(%{Math.round((KDV_CARPANI - 1) * 100)} Tevkifat paylı düşülmüştür)</span>}
                </div>
              </div>

              {(() => {
                const kovalar = [0, 0, 0, 0];
                let gunTutar = 0;
                let gecmisToplam = 0;
                alacaklarData.forEach(([, , gecmis, , yas]) => {
                  gecmisToplam += gecmis || 0;
                  gunTutar += yas?.gunTutar || 0;
                  (yas?.kovalar || []).forEach((v, i) => (kovalar[i] += v));
                });
                const ortGun = gecmisToplam ? gunTutar / gecmisToplam : 0;
                const tones = ['text-amber-600', 'text-orange-600', 'text-rose-600', 'text-rose-800'];
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50">Alacak Yaşlandırma</h2>
                      <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 text-right shrink-0">
                        Ort. gecikme <span className="font-semibold text-slate-900 dark:text-slate-50 tabular-nums">{Math.round(ortGun)} gün</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Vadesi geçmiş alacaklar, vade bitiş tarihinden bugüne geçen güne göre gruplanır; markalardaki gecikme tutar ağırlıklı ortalamadır. Tutarlar {kdvDahil ? 'KDV dahildir' : 'KDV hariçtir (KDV dahil tutar ÷ 1,14)'}.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      {YASLANDIRMA_KOVALARI.map((label, i) => (
                        <div key={label} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">{label}</span>
                          <div className={`text-sm sm:text-lg font-semibold tabular-nums mt-1 whitespace-nowrap ${kovalar[i] ? tones[i] : 'text-slate-300 dark:text-slate-600'}`}>
                            {kovalar[i] ? '₺' + fmtTL(kovalar[i]) : '–'}
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{pct(gecmisToplam ? kovalar[i] / gecmisToplam : 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Marka Bazlı Alacak Dağılımı</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Müşterilerden beklenen ödemeler, markaya göre büyükten küçüğe sıralanmıştır. Vadesi bugünden önce olanlar "Vadesi Geçmiş" sütunundadır.</p>
                <div className="flex items-center gap-1.5 sm:gap-3 pb-2 text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <span className="w-4 sm:w-5 shrink-0" />
                  <span className="flex-1 min-w-0">Marka</span>
                  <span className="w-10 sm:w-14 text-right shrink-0 leading-tight">Alacak Oranı</span>
                  <span className="w-[4.25rem] sm:w-24 text-right shrink-0 leading-tight">Vadesi Geçmiş</span>
                  <span className="w-[4.25rem] sm:w-24 text-right shrink-0 leading-tight">Gelecek Vadeli</span>
                  <span className="w-[4.5rem] sm:w-28 text-right shrink-0 leading-tight">Toplam Tutar</span>
                </div>
                <div className="flex flex-col">
                  {(() => {
                    const toplamAlacak = alacaklarData.reduce((s, [, v]) => s + v, 0);
                    const toplamGecmis = alacaklarData.reduce((s, [, , g]) => s + (g || 0), 0);
                    const toplamGelecek = alacaklarData.reduce((s, [, , , f]) => s + (f || 0), 0);
                    const toplamGunTutar = alacaklarData.reduce((s, [, , , , y]) => s + (y?.gunTutar || 0), 0);
                    const money = (v) => (v ? '₺' + fmtTL(v) : '–');
                    return (
                      <>
                        {alacaklarData.map(([name, amount, gecmis, gelecek, yas], i) => {
                          const oran = amount / toplamAlacak;
                          const gun = gecmis ? Math.round((yas?.gunTutar || 0) / gecmis) : 0; // tutar ağırlıklı ortalama gecikme (gün)
                          const enEski = yas?.enEski || 0;
                          const gunTone = gun > 90 ? 'text-rose-800' : gun > 60 ? 'text-rose-600' : gun > 30 ? 'text-orange-600' : 'text-amber-600';
                          return (
                            <div key={name} className="flex items-start gap-1.5 sm:gap-3 py-2.5 border-b border-slate-50 dark:border-slate-800">
                              <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
                              <button type="button" onClick={() => setSeciliMarka(name)} className="text-[11px] sm:text-sm text-left text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-2 flex-1 min-w-0 break-words">{name}</button>
                              <span className={`text-[10px] sm:text-xs tabular-nums w-10 sm:w-14 text-right shrink-0 ${oran > 0.1 ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{pct(oran)}</span>
                              <span className={`text-[11px] sm:text-sm tabular-nums w-[4.25rem] sm:w-24 text-right shrink-0 leading-tight ${gecmis ? 'text-rose-600' : 'text-slate-300 dark:text-slate-600'}`}>
                                {money(gecmis)}
                                {gun > 0 && <span className={`block text-[10px] sm:text-[11px] ${gunTone}`} title={enEski ? `En eski vade: ${enEski} gün` : undefined}>ort. {gun} gün</span>}
                              </span>
                              <span className={`text-[11px] sm:text-sm tabular-nums w-[4.25rem] sm:w-24 text-right shrink-0 ${gelecek ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>{money(gelecek)}</span>
                              <span className="text-[11px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-medium w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(amount)}</span>
                            </div>
                          );
                        })}
                        <div className="flex items-start gap-1.5 sm:gap-3 pt-3 mt-1 border-t-2 border-slate-200 dark:border-slate-700">
                          <span className="w-4 sm:w-5 shrink-0" />
                          <span className="text-[11px] sm:text-[11px] sm:text-sm text-slate-900 dark:text-slate-50 font-semibold flex-1 min-w-0">Toplam</span>
                          <span className="text-[10px] sm:text-xs tabular-nums text-slate-400 dark:text-slate-500 w-10 sm:w-14 text-right shrink-0">{pct(1)}</span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-rose-600 font-bold w-[4.25rem] sm:w-24 text-right shrink-0 leading-tight">
                            {money(toplamGecmis)}
                            {toplamGecmis > 0 && <span className="block text-[10px] sm:text-[11px] font-normal text-slate-500">ort. {Math.round(toplamGunTutar / toplamGecmis)} gün</span>}
                          </span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.25rem] sm:w-24 text-right shrink-0">{money(toplamGelecek)}</span>
                          <span className="text-[10px] sm:text-sm tabular-nums text-slate-900 dark:text-slate-50 font-bold w-[4.5rem] sm:w-28 text-right shrink-0">₺{fmtTL(toplamAlacak)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {(() => {
                const satir = seciliMarka ? alacaklarData.find(([n]) => n === seciliMarka) : null;
                if (!satir) return null;
                const lines = satir[4]?.satirlar || [];
                const gecenler = lines.filter(([, , gn]) => gn > 0);
                const gecenToplam = gecenler.reduce((s, [, t]) => s + t, 0);
                const gecenGun = gecenToplam ? gecenler.reduce((s, [, t, gn]) => s + t * gn, 0) / gecenToplam : 0;
                const genelToplam = lines.reduce((s, [, t]) => s + t, 0);
                const fmtVade = (iso) => iso.split('-').reverse().join('.');
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={() => setSeciliMarka(null)} role="dialog" aria-modal="true" aria-label={`${seciliMarka} alacak ayrıntısı`}>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setSeciliMarka(null)} aria-label="Kapat" className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X size={18} />
                      </button>
                      <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 pr-8">{seciliMarka}</h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Ödeme vadesine göre alacaklar · {kdvDahil ? 'KDV dahil' : 'KDV hariç'}</p>
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-[1fr_1fr_4rem] bg-slate-600 text-white text-xs sm:text-sm font-medium">
                          <span className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 italic font-normal">Ödeme Vadesi</span>
                          <span className="px-3 py-2 text-right truncate">{seciliMarka}</span>
                          <span className="px-3 py-2 text-right">Vade Gün</span>
                        </div>
                        {lines.map(([iso, tutar, gn]) => (
                          <div key={iso} className={`grid grid-cols-[1fr_1fr_4rem] text-xs sm:text-sm tabular-nums border-t border-slate-100 dark:border-slate-800 ${gn > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-50'}`}>
                            <span className="px-3 py-2">{fmtVade(iso)}</span>
                            <span className="px-3 py-2 text-right">{fmtTL(tutar)}</span>
                            <span className="px-3 py-2 text-right">{gn}</span>
                          </div>
                        ))}
                        <div className="grid grid-cols-[1fr_1fr_4rem] text-xs sm:text-sm tabular-nums font-semibold bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                          <span className="px-3 py-2 text-slate-900 dark:text-slate-50">Vadesi Geçen</span>
                          <span className={`px-3 py-2 text-right ${gecenToplam ? 'text-rose-600' : 'text-slate-400'}`}>{gecenToplam ? fmtTL(gecenToplam) : '–'}</span>
                          <span className={`px-3 py-2 text-right ${gecenToplam ? 'text-rose-600' : 'text-slate-400'}`}>{gecenToplam ? Math.round(gecenGun) : '–'}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_4rem] text-xs sm:text-sm tabular-nums font-semibold bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                          <span className="px-3 py-2 text-slate-900 dark:text-slate-50">Genel Toplam</span>
                          <span className="px-3 py-2 text-right text-slate-900 dark:text-slate-50">{fmtTL(genelToplam)}</span>
                          <span />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">Vade Gün: vade tarihinin üzerinden bugüne geçen gün (kırmızı = vadesi geçmiş). Vadesi Geçen satırındaki gün, tutar ağırlıklı ortalamadır.</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ---------------- NAKİT AKIŞI ---------------- */}
          {page === 'nakitAkisi' && (
            <div className="flex flex-col gap-4">
              {(() => {
                const toplamAlacak = alacaklarKdvsiz.reduce((s, [, v]) => s + v, 0);
                const toplamNakit = toplamAlacak + nakitAkisiData.kasa + nakitAkisiData.banka + nakitAkisiData.cek;
                return (
                  <>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Toplam</span>
                      <div className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums mt-1">₺{fmtTL(toplamNakit)}</div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Alacaklar (KDV hariç) + Kasa + Banka + Çek toplamı</p>
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

          {/* ---------------- SATIŞ TABLOSU ---------------- */}
          {page === 'satisTablosu' && (
            <SatisTablosu satis={data.satis} satisError={data.satisError} months={months} kurUSD={data.kurUSD} ozet={{ ciro, gider, ciroUSD, giderUSD, ayDurumu }} />
          )}

          {page === 'sureAnalizi' && <SureAnalizi months={months} ayDurumu={ayDurumu} revenueRaw={revenueRaw} satisRows={data.satis?.rows} satisError={data.satisError} pasifMarkalar={pasifMarkalar} />}

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
