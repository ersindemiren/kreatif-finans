// İki personelin seçilen dönemdeki göstergeleri. Hesaplar personel detay sayfasındaki kartlarla aynıdır.
import { buildKisiDetay } from './sure.js';
import { kisiAylari } from './kisiAylar.js';
import { ayAnahtar } from './maliyet.js';

// Verimlilik Skoru (0-100): Süre Oranı 40 + Kayıt Oranı 40 + Kayıp Süre payı (ters) 20. Süre girilmiş ay yoksa skor üretilmez.
export const SKOR = { sureTam: 0.95, sureSifir: 0.5, kayipSifir: 0.2, agirlik: { sure: 40, kayit: 40, kayip: 20 } };
const kisit = (x) => Math.max(0, Math.min(1, x));
export function verimlilikSkoru({ oran, kayitOrani, kayip, toplam, sureliAy }) {
  if (!sureliAy || oran == null || !toplam) return null;
  const w = SKOR.agirlik;
  const sure = kisit((oran - SKOR.sureSifir) / (SKOR.sureTam - SKOR.sureSifir)) * w.sure;
  const kayit = kisit(kayitOrani || 0) * w.kayit;
  const kayipP = kisit(1 - kayip / toplam / SKOR.kayipSifir) * w.kayip;
  return { toplam: sure + kayit + kayipP, sure, kayit, kayip: kayipP };
}

const topla = (a, idx) => idx.reduce((s, i) => s + (a[i] || 0), 0);

export function kisiOlcu({ rows, user, departman, pasif, per, maksSaat, brandOf, maliyetAy, aylar }) {
  const d = buildKisiDetay({ rows, user, departman });
  const sayilan = kisiAylari((rows || []).filter((r) => r[0] === user), pasif ? { [user]: true } : {}).get(user) || new Set();
  const maksAylar = per.filter((i) => sayilan.has(i));
  const maks = maksAylar.reduce((t, i) => t + maksSaat(i), 0);
  const toplam = topla(d.monthly, per);
  const ekip = topla(d.team, per);
  const dep = topla(d.dep, per);
  const musteriler = d.clients.map((c) => ({ name: c.name, saat: topla(c.hours, per), brand: brandOf(c.name) })).filter((c) => c.saat > 0).sort((a, b) => b.saat - a.saat);
  const g = { faturali: 0, kayip: 0, atil: 0 };
  musteriler.forEach((c) => {
    const k = !c.brand || c.brand.tip !== 'marka' ? 'atil' : per.some((i) => c.brand.faturali[i]) ? 'faturali' : 'kayip';
    g[k] += c.saat;
  });
  const saatAy = (i) => maliyetAy?.[ayAnahtar(i)] || 0;
  const maksDeger = maksAylar.reduce((t, i) => t + maksSaat(i) * saatAy(i), 0);
  const topDeger = maksAylar.reduce((t, i) => t + d.monthly[i] * saatAy(i), 0);
  const sureli = per.filter((i) => d.monthly[i] > 0);
  const zirve = sureli.length ? sureli.reduce((a, i) => (d.monthly[i] > d.monthly[a] ? i : a), sureli[0]) : -1;
  const oran = maks ? toplam / maks : null;
  const kayitOrani = toplam ? g.faturali / toplam : null;
  return {
    skor: verimlilikSkoru({ oran, kayitOrani, kayip: g.kayip, toplam, sureliAy: sureli.length }),
    departman: departman?.[user] || null,
    pasif: !!pasif,
    toplam, maks, maksAy: maksAylar.length, oran: maks ? toplam / maks : null,
    aktif: g.faturali, atanmamis: g.atil, kayip: g.kayip,
    kayitOrani: toplam ? g.faturali / toplam : null,
    ekip, ekipPayi: ekip ? toplam / ekip : null,
    depSure: dep, depPayi: dep ? toplam / dep : null,
    musteriSayisi: musteriler.length, enCok: musteriler[0] ? { ad: musteriler[0].name, pay: toplam ? musteriler[0].saat / toplam : 0 } : null,
    maksDeger, topDeger, maliyetVar: maksDeger > 0,
    saatMaliyeti: toplam && topDeger ? topDeger / topla(d.monthly, maksAylar.filter((i) => saatAy(i))) : null,
    ortAylik: sureli.length ? toplam / sureli.length : null,
    sureliAy: sureli.length,
    zirve: zirve >= 0 ? { ay: aylar[zirve], saat: d.monthly[zirve] } : null,
  };
}
