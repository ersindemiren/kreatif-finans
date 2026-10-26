// Editöryal yorumlar (veri değil, elle yazılmış değerlendirme). Sunucuda tutulur; yalnızca yetkili kullanıcıya gönderilir.
export const genelDegerlendirme = [
  "Ciro 2025'e göre %55,1 büyüdü (₺161,31 M / ₺104,00 M), gider %38,7 arttı (₺91,40 M / ₺65,90 M) — ciro büyümesi giderin açık ara önünde.",
  'Net kâr %83,5 arttı (₺69,91 M / ₺38,10 M); kâr marjı %36,6\'dan %43,3\'e yükseldi (+6,7 puan).',
  'Ocak-Eylül (9 ay) artık kesinleşmiş veriye dayanıyor (ciro ₺117,80 M, gider ₺69,64 M, kâr ₺48,16 M); sadece Ekim-Aralık tahmine dayalı. Kesinleşen 9 ayın kâr marjı %40,9, yıl geneli beklenti %43,3 — tahmin, gerçekleşenin biraz üzerinde kurgulanmış, son çeyrekte aylık ₺14,50 M ciro hedefi yakalanmalı.',
  'Kalan 3 ay için aylık ₺14,50 M ciro / ₺7,25 M gider (₺7,25 M kâr) varsayılıyor. Ocak-Eylül aylık ortalama ciro ₺13,09 M olduğundan bu hedef ortalamanın üzerinde; Ağustos (₺18,57 M) gibi güçlü proje aylarına ihtiyaç var.',
  'Eylül ayı ₺11,46 M ciro ile Ağustos\'un (₺18,57 M) belirgin altında kaldı; aylık kâr ₺4,00 M ve marj %34,9 ile Ağustos\'taki %59,5\'in çok altında. Eylül\'ün önceki ₺10,56 M tahmininin ₺0,90 M üzerinde kapandı.',
  'Banka bakiyesi ₺37,67 M (kasa ve çek dahil ₺37,90 M) — aylık giderin (~₺7,5 M) yaklaşık 5 katı, güçlü bir nakit pozisyonu; önceki güncellemeye göre banka bakiyesi ₺2,58 M azaldı.',
  'Satış Tablosu (fatura bazlı) ile Gelirler (ciro) Ocak-Eylül arasında birebir tutuyor (Ocak-Eylül toplamı ₺117,80 M; Eylül ₺11,46 M) — iki kaynak birbirini doğruluyor.',
];

export const giderYorumlari = [
  'Personel gideri (Maaş + SGK + Yemek + Kıdem/İhbar + Muhtasar) toplam giderin %65,3\'ünü oluşturuyor — en büyük ve baskın kalem. Maaş Ocak\'ta ₺2,89 M\'den Eylül\'de ₺2,44 M\'ye gerilerken Muhtasar ₺0,47 M\'den ₺0,93 M\'ye çıktı; maliyet kontrolü öncelikle burada odaklanmalı.',
  'Aylık gider Ocak-Eylül arasında ₺7,06-8,59 M bandında kalıyor (Mart\'taki ₺1,03 M\'lik kıdem/ihbar ödemesi nedeniyle ₺8,59 M zirve); Eylül gideri ₺7,45 M. Ocak\'tan Eylül\'e ciro %20,4 artarken gider %2,7 azaldı.',
  'Aylık Lisanslar kalemi Ocak\'taki ₺67 B\'den Eylül\'de ₺151 B\'ye 2,2 katına çıktı (yıl toplamı ₺1,60 M; Yıllık Lisanslar ile birlikte ₺2,57 M) — yazılım/lisans yükü gözden geçirilmeli.',
  'Geçici Vergi (Kurumlar Vergisi) Temmuz\'dan itibaren aylık ₺780.314\'ten ₺650.000\'e düşmüş durumda.',
  '"Ek Masraflar" kalemi Haziran\'dan itibaren ortaya çıktı (₺100 B → ₺200 B+/ay) ve yıl sonuna kadar toplam ₺1,33 M\'e ulaşacak; Haziran\'daki SMM/YMM/Avukat (₺362 B) sıçraması da tek seferlik görünüyor. Bu kalemler bütçede ayrıca izlenmeli.',
  'Ödül-Reklam, Muhasebe Lisans, İş İlanı gibi kalemler düzensiz/dönemsel — yıl sonuna doğru gerekirse bütçede pay ayrılmalı.',
];

export const gelirYorumlari = [
  'En büyük 3 marka (Zuhal Müzik %8,7, Eğriçayır %8,3, Servet %7,9) Ocak-Eylül faturalamasının sadece %25,0\'ını oluşturuyor; ilk 8 marka yaklaşık %60,5\'ini oluşturuyor — portföy dağılmış, yoğunlaşma riski düşük. Kozoliv (%7,9) ve Myra (%7,5) da ilk 5\'e girdi.',
  '9 marka (Nehir, Ecocotton, Kuşkonmaz, Arçelik, Artı Cerrahi, Eczi, Wildfruits, Gerçek Kozmetik, Heritage) Pasif işaretli ve Ocak-Eylül faturalamasının %7,7\'sini (₺9,07 M) oluşturuyor — pasif sayısı arttı (Gerçek Kozmetik ve Heritage eklendi), kayıp hâlâ sınırlı ama büyüyor.',
  'Ocak-Eylül faturalamasının %62,9\'u (₺74,05 M) aylık sabit Fee, %37,1\'i (₺43,75 M) proje geliri — düzenli gelir tabanı güçlü, proje kısmı aylara göre dalgalı (Ağustos ₺18,57 M, Eylül ₺11,46 M).',
  'Ekim-Aralık için "Tahmini Proje" altında toplu gelir tahmini hâlâ girilmiş durumda; Eylül ayında Fee ₺8,99 M\'de kalırken proje geliri ₺2,47 M\'ye düştü — son çeyrek ciro hedefi (₺14,50 M/ay) için yeni proje netleştirilmeli ve müşteri bazında ayrıştırılmalı.',
  'Departman dağılımı dengeli: Strateji Pazarlama İletişimi %30,6, Prodüksiyon %28,9, Tasarım %24,5 ve Performans Pazarlama %15,9 — Performans Pazarlama en küçük paya sahip, büyüme alanı olarak değerlendirilebilir.',
  'Yıl içinde 12 yeni marka fee portföyüne katıldı (Mart 3, Nisan 2, Mayıs 2, Haziran 3, Temmuz 1, Ağustos 1); fee faturası kesilen marka sayısı Ocak\'taki 18\'den Haziran-Ağustos\'ta 26\'ya çıktı, Eylül\'de 23\'e geriledi (pasif markalar). Satış Tablosu\'nda fatura kesilmeyen aylar gri gösteriliyor.',
  'Sabit TL fee dolar karşılığında eriyor: Ocak-Eylül\'de kur %16,5 yükseldi (42,22 → 49,20), yani aynı TL fee USD\'de yaklaşık %14,2 değer kaybetti (marka sayfalarındaki KKO oranı). Yeni markalarla aylık Fee\'nin USD karşılığı Ocak\'ta $152 K\'dan Ağustos\'ta $196 K\'ya çıktı, Eylül\'de $183 K\'ya geriledi.',
];

export const aksiyonlar = [
  'Personel giderindeki büyük payı (%65,3) göz önünde bulundurarak, ekip büyümesi planlanıyorsa kâr marjı etkisi önceden modellenmeli; Muhtasar\'daki artış (Ocak ₺0,47 M → Eylül ₺0,93 M) ayrıca incelenmeli.',
  'Alacaklar toplamı ₺21,74 M. Servet (₺3,72 M, %17,1) ve Kozoliv (₺3,69 M, %17,0) tek başlarına alacakların üçte birini oluşturuyor; Myra (₺2,36 M) da öne çıkıyor — tahsilat takibi bu üç müşteride önceliklendirilmeli.',
  'Alacakların ₺11,11 M\'si (%51) bugüne kadar vadesi gelmiş durumda — ağırlıkla 1 Ekim vadeli (Servet, Myra, Silva, Portakal Bahçem, Zuhal) ve BMS\'in ₺1,43 M\'lik Ağustos vadeli kalemi; tahsilat haftalık izlenmeli. Kalan ₺10,63 M Ekim sonu-Kasım vadeli.',
  'Pasif markalar (9 marka) cirodaki payı düşük olsa da (%7,7), pasif sayısı arttığı için bu markaların yerine yeni müşteri kazanımı planlanmalı; Eylül\'de fee faturası kesilen marka sayısındaki düşüş (26 → 23) izlenmeli.',
  'Ekim-Aralık\'ta aylık ₺14,50 M ciro tahmini, Ocak-Eylül ortalamasının (₺13,09 M) üzerinde — Eylül\'deki proje düşüşü (₺2,47 M) tekrarlanırsa hedef kaçar; proje pipeline\'ı çeyrek başında netleştirilmeli.',
  '2026 için resmi bir bütçe/hedef belirlenip rapora eklenmeli — sadece geçen yılla değil hedefle kıyas da yapılabilsin.',
  'Kur kaybını azaltmak için sabit fee\'li markalarda fee\'yi kura veya enflasyona endeksleyen dönemsel (ör. 6 aylık) güncelleme maddesi sözleşmelere eklenmeli; kur Ocak\'tan beri %16,5 yükseldi, en çok erimeyi KKO oranı yüksek markalar gösteriyor.',
  'Yıl ortasında katılan markaların (Mart-Ağustos) fee seviyeleri, kur kaybı oluşmadan baştan kura duyarlı belirlenmeli.',
];

export default { genelDegerlendirme, giderYorumlari, gelirYorumlari, aksiyonlar };
