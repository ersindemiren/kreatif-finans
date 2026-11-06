// Editöryal yorumlar (veri değil, elle yazılmış değerlendirme). Sunucuda tutulur; yalnızca yetkili kullanıcıya gönderilir.
// Son güncelleme: Ekim 2026 GÜNCEL (Ocak-Ekim kesinleşmiş, Kasım-Aralık tahmin). Yeni ay GÜNCEL olunca yeniden gözden geçirilmeli.
export const genelDegerlendirme = [
  "Yıl geneli beklentide ciro 2025'e göre %52,8 büyüyor (₺158,89 M / ₺104,00 M), gider %55,1 artıyor (₺102,22 M / ₺65,90 M) — gider büyümesi ciro büyümesinin biraz üzerinde; kâr marjı buna paralel geriliyor.",
  "Net kâr %48,7 artışla ₺56,67 M (2025: ₺38,10 M); kâr marjı %36,6'dan %35,7'ye (-1,0 puan) geriledi. Gider tarafında Diğer Giderler (%18,3, 2025: %11,8), Vergiler ve Krediler oranı yükselirken Maaş oranı 6,5 puan düştü (%19,1, 2025: %25,6).",
  'Ocak-Ekim (10 ay) kesinleşmiş veriye dayanıyor (ciro ₺130,18 M, gider ₺85,35 M, kâr ₺44,83 M); sadece Kasım-Aralık tahmine dayalı. Kesinleşen 10 ayın kâr marjı %34,4, yıl geneli beklenti %35,7 — tahmin, kalan 2 ayda %41,2 marj varsayıyor; bu da gerçekleşenin belirgin üzerinde.',
  'Kalan 2 ay için aylık ortalama ₺14,35 M ciro / ₺8,43 M gider (₺5,92 M kâr) varsayılıyor. Ocak-Ekim aylık ortalama ciro ₺13,02 M, Ekim ₺12,00 M olduğundan hedef ortalamanın da son iki ayın da üzerinde; Ağustos (₺18,57 M) gibi güçlü proje aylarına ihtiyaç var.',
  "Ekim ayı ₺12,00 M ciro ile Eylül'ün (₺11,85 M) %1,2 üzerinde kapandı; ancak gider %6,5 artarak ₺8,73 M'ye çıktığı için kâr %10,6 azaldı (₺3,26 M) ve marj %30,8'den %27,2'ye geriledi. Ağustos'taki %55,8 marjın çok altında.",
  'Banka bakiyesi ₺41,34 M (kasa dahil ₺41,68 M) — Ocak-Ekim aylık gider ortalamasının (~₺8,54 M) yaklaşık 4,9 katı, güçlü bir nakit pozisyonu; önceki güncellemeye göre banka bakiyesi ₺3,67 M arttı.',
  'Satış Tablosu (fatura bazlı) ile Gelirler (ciro) Ekim ayında birebir tutuyor (₺11.995.340) — iki kaynak birbirini doğruluyor.',
];

export const giderYorumlari = [
  'Personel gideri (Maaş + SGK + Yemek + Kıdem/İhbar + Muhtasar) Ocak-Ekim giderinin %58,4\'ünü (₺49,87 M) oluşturuyor, Ekim\'de %55,2 — en büyük kalem. Maaş Ocak\'ta ₺2,89 M\'den Ekim\'de ₺2,34 M\'ye (yılın en düşüğü) gerilerken Muhtasar ₺0,47 M\'den ₺0,92 M\'ye çıktı; maliyet kontrolü öncelikle burada odaklanmalı.',
  "Aylık gider Ocak-Ekim arasında ₺7,90-9,43 M bandında kalıyor (Mart'taki ₺1,03 M'lik kıdem/ihbar ödemesi nedeniyle ₺9,43 M zirve); Ekim gideri ₺8,73 M, Eylül'ün ₺0,53 M üzerinde. Ocak'tan Ekim'e ciro %26,0 artarken gider %2,7 arttı.",
  "Ekim giderindeki artış Diğer Giderler'den geldi (₺2,41 M → ₺2,91 M): Ulaşım-Konaklama-Eğitim ₺55 B'den ₺390 B'ye (yılın en yüksek aylığı), Ek Masraflar ₺203 B'den ₺352 B'ye, Aylık Lisanslar ₺151 B'den ₺212 B'ye, Demirbaş ₺103 B ve Kırtasiye ₺38 B oldu.",
  "Aylık Lisanslar kalemi Ocak'taki ₺67 B'den Ekim'de ₺212 B'ye 3,2 katına çıktı (Ocak-Ekim ₺1,36 M, yıl sonu ₺1,66 M; Yıllık Lisanslar ile birlikte ₺2,54 M) — yazılım/lisans yükü gözden geçirilmeli.",
  "\"Ek Masraflar\" Haziran'dan beri her ay var (₺100 B → ₺352 B; Ocak-Ekim ₺1,07 M) ve Kasım için ₺500 B tahmin girilmiş, yıl sonu ₺1,77 M. Ulaşım-Konaklama-Eğitim de Ocak-Ekim'de ₺1,59 M'ye ulaştı; bu iki kalem bütçede ayrıca izlenmeli.",
  "Geçici Vergi (Kurumlar Vergisi) Temmuz'dan itibaren aylık ₺780.314'ten ₺650.000'e düştü; krediler aylık ₺244.056 sabit, Aralık için ₺424.917 tahmin ediliyor. Demirbaş yatırımı Ocak-Ekim ₺1,81 M (Ocak, Mart, Temmuz, Ağustos, Ekim). Ödül-Reklam, Muhasebe Lisans, İş İlanı gibi kalemler düzensiz/dönemsel.",
];

export const gelirYorumlari = [
  "Ekim faturalamasının %69,8'i (₺8,38 M) aylık sabit Fee, %30,2'si (₺3,62 M) proje geliri; proje gelirinin %64,9'u (₺2,35 M) tek müşteriden, Kozoliv'den (web sitesi, konsept çekim, bilinirlik filmleri, Selme işleri). Potamya ₺1,11 M, Yandex ciro primi ₺0,16 M.",
  "Ekim'de en büyük markalar Kozoliv (%24,1, ₺2,89 M), Potamya (%11,8), Zuhal Müzik (%9,8), Eğriçayır (%9,1) ve Servet (%8,7); ilk 3 marka cironun %45,6'sını oluşturuyor. Fee tabanı dağınık, ancak aydaki yoğunlaşma proje işlerinden geliyor — proje geliri tek müşteriye bağımlı.",
  "Ekim'de fee faturası kesilen marka sayısı 22 (önceki güncellemede Eylül 23, Haziran-Ağustos 26); toplam 23 markaya fatura kesildi. Pasif işaretli markaların hiçbiri Ekim'de fatura almadı — fee tabanındaki daralma sürüyor, yeni marka kazanımı gerekiyor.",
  "Kasım-Aralık için \"Tahmini Proje\" altında toplu gelir tahmini hâlâ girilmiş durumda; Ekim'de proje geliri ₺3,62 M ile Eylül sonrası toparlansa da aylık ₺14,35 M ciro hedefi (Ekim ₺12,00 M) için yaklaşık ₺2,35 M ek gelir gerekiyor — yeni projeler netleştirilmeli ve müşteri bazında ayrıştırılmalı.",
  'Ekim departman dağılımı (Rapor Departman): Strateji Pazarlama İletişimi %30,3 (₺3,63 M), Tasarım %25,8 (₺3,09 M), Prodüksiyon %25,2 (₺3,02 M), Performans Pazarlama %18,8 (₺2,26 M) — Performans Pazarlama yine en küçük pay; büyüme alanı olarak değerlendirilebilir. Prodüksiyon ve Tasarım payı proje işleri nedeniyle yüksek.',
  "Sabit TL fee dolar karşılığında eriyor: Ocak-Ekim'de kur %18,0 yükseldi (42,22 → 49,80; yıl sonu tahmini 50,70, %20,1), yani aynı TL fee USD'de yaklaşık %15,2 değer kaybetti (marka sayfalarındaki KKO oranı). Aylık ciro USD karşılığı Ocak'ta $225 B'den Ekim'de $241 B'ye (%6,8) çıktı; TL'deki %26,0 artışın ancak dörtte biri USD'ye yansıdı.",
];

export const aksiyonlar = [
  "Gider büyümesi (%55,1) ciro büyümesinin (%52,8) üzerine çıktı ve marj 2025'in altına indi: Diğer Giderler (ulaşım-konaklama, ek masraflar, lisanslar, demirbaş) için aylık limit/bütçe belirlenmeli; Kasım için girilmiş ₺500 B Ek Masraf tahmini gözden geçirilmeli.",
  'Alacaklar toplamı ₺9,75 M (önceki güncellemede ₺21,74 M — tahsilat iyi ilerlemiş). Ancak ₺7,15 M\'si (%73) vadesi gelmiş durumda; Kozoliv (₺2,16 M, %22,2), Potamya (₺1,49 M, %15,3) ve BMS (₺1,43 M, %14,6) alacakların yarısından fazlasını oluşturuyor — tahsilat takibi bu üç müşteride önceliklendirilmeli.',
  "BMS'in ₺1,43 M'lik kalemi 24 Ağustos vadeli, yaklaşık 74 gündür gecikmiş; Portakal Bahçem (₺677 B, 1 Ekim) ve Silva (₺1,03 M, 1 Kasım) da vadesi gelmiş. Kalan ₺2,60 M Kasım'ın 7-20'si arasında vadeli (Kozoliv ₺1,37 M, Potamya ₺1,15 M, Yandex ₺82 B).",
  "Ekim marjı %27,2'ye geriledi (Eylül %30,8); personel dışı giderlerin artışı kâr üzerinde belirleyici — Ekim'in demirbaş, ulaşım ve lisans artışları tekrarlanırsa kalan 2 aydaki %41,2 marj varsayımı tutmaz.",
  "Kasım-Aralık'ta aylık ₺14,35 M ciro tahmini, Ocak-Ekim ortalamasının (₺13,02 M) ve Ekim'in (₺12,00 M) üzerinde — yaklaşık ₺2,35 M ek gelir gerekiyor; proje pipeline'ı Kasım başında netleştirilmeli ve müşteri bazında girilmeli.",
  "Proje gelirinin %64,9'u tek müşteriden (Kozoliv) geldi; proje bağımlılığını azaltmak için ikinci ve üçüncü büyük proje müşterileri geliştirilmeli. Pasif markaların yerine yeni fee müşterisi kazanımı planlanmalı (fee faturası kesilen marka sayısı 22).",
  'Personel giderindeki büyük payı (%58,4) göz önünde bulundurarak, ekip büyümesi planlanıyorsa kâr marjı etkisi önceden modellenmeli; Muhtasar\'daki artış (Ocak ₺0,47 M → Ekim ₺0,92 M) ayrıca incelenmeli.',
  "Kur kaybını azaltmak için sabit fee'li markalarda fee'yi kura veya enflasyona endeksleyen dönemsel (ör. 6 aylık) güncelleme maddesi sözleşmelere eklenmeli; kur Ocak'tan beri %18,0 yükseldi. 2026 için resmi bir bütçe/hedef belirlenip rapora eklenmeli — sadece geçen yılla değil hedefle kıyas da yapılabilsin.",
];

export default { genelDegerlendirme, giderYorumlari, gelirYorumlari, aksiyonlar };
