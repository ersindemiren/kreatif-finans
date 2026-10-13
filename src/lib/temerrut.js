// Ticari işlerde (B2B) temerrüt faizi: TTK md. 1530 uyarınca TCMB'nin yıllık ilan ettiği oran.
// Kaynak: TCMB > İstatistikler > Piyasa Verileri > TTK Md. 1530 (yıl başından itibaren geçerli).
// Yeni yıl oranı ilan edildiğinde yalnızca bu tabloya satır eklenir.
export const TEMERRUT_ORANLARI = {
  2025: 53.25,
  2026: 43.0,
};

const GUN = 86400000;
const utcGun = (y, m, d) => Date.UTC(y, m, d);

// Oranı henüz tabloda olmayan yıl için son bilinen oran kullanılır
export function temerrutOrani(yil) {
  if (TEMERRUT_ORANLARI[yil] != null) return TEMERRUT_ORANLARI[yil];
  const yillar = Object.keys(TEMERRUT_ORANLARI).map(Number).sort((a, b) => a - b);
  const son = yillar.filter((y) => y <= yil).pop() ?? yillar[0];
  return TEMERRUT_ORANLARI[son];
}

// Basit faiz: anapara x yıllık oran x gecikme günü / 365. Vadeyi izleyen günden bugüne (bugün dahil) sayılır;
// gecikme birden çok takvim yılına yayılıyorsa her yıl kendi oranıyla hesaplanır.
export function temerrutFaizi(anapara, vadeISO, bugun = new Date()) {
  const [vy, vm, vd] = vadeISO.split('-').map(Number);
  const baslangic = utcGun(vy, vm - 1, vd) + GUN; // vadeyi izleyen gün
  const bitis = utcGun(bugun.getFullYear(), bugun.getMonth(), bugun.getDate());
  if (bitis < baslangic) return 0;
  let faiz = 0;
  for (let y = new Date(baslangic).getUTCFullYear(); y <= new Date(bitis).getUTCFullYear(); y += 1) {
    const yBas = Math.max(baslangic, utcGun(y, 0, 1));
    const yBit = Math.min(bitis, utcGun(y, 11, 31));
    const gun = Math.round((yBit - yBas) / GUN) + 1;
    if (gun > 0) faiz += (anapara * temerrutOrani(y) * gun) / 100 / 365;
  }
  return faiz;
}
