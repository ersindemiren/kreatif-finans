# Kreatif Finans Dashboard

Google Sheets'ten ("FEE 2026 YENİ" ve "MÜŞTERİDEN GELECEK ÖDEMELER") otomatik veri çeken, canlı finans dashboard'u.

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env   # kendi URL/anahtar değerlerinizi girin
npm run dev
```

## Vercel'e deploy

1. Bu klasörü GitHub'a push edin (veya doğrudan Vercel'e sürükleyin).
2. [vercel.com](https://vercel.com) üzerinde ücretsiz hesap açın, "New Project" ile bu repoyu seçin.
3. Deploy ayarlarında **Environment Variables** kısmına `.env.example` dosyasındaki 4 değişkeni aynı isimlerle ekleyin:
   - `VITE_FEE_URL`
   - `VITE_FEE_KEY`
   - `VITE_ODEME_URL`
   - `VITE_ODEME_KEY`
4. Deploy edin. Vercel otomatik olarak `npm run build` çalıştırıp statik siteyi yayınlayacak.
5. Size kalıcı bir link verecek (örn. `kreatif-finans.vercel.app`). Bu link her açıldığında Google Sheets'teki güncel veriyi otomatik çeker.

## Veri akışı nasıl çalışıyor

- `src/lib/parseData.js` — Apps Script uç noktalarından gelen ham JSON'u dashboard'un ihtiyaç duyduğu veri yapılarına dönüştürür.
- `src/lib/useFinansData.js` — Sayfa her açıldığında iki uç noktayı paralel çeken React hook'u.
- `src/FinansDashboard.jsx` — Görsel arayüz. Sol menüdeki "Şimdi güncelle" butonuyla manuel yenileme de yapılabilir.

## Otomatik / manuel veri kapsamı

**Tam otomatik** (Google Sheets'ten canlı çekilir):
- Giderler (kalem bazlı + kategori bazlı)
- Gelirler (marka bazlı, aylık)
- Ciro / Gider / Kar toplamları (TL ve USD, 2025 kıyaslı)
- Kasa / Banka / Çek
- Alacaklar (müşteri bazlı)

**Elle güncellenmesi gereken** (`src/FinansDashboard.jsx` içinde sabit metin):
- "Yorumlar" sekmesindeki değerlendirme metinleri (genelDegerlendirme, giderYorumlari, gelirYorumlari, aksiyonlar) — bunlar editöryal yorumlardır, rakamlar önemli ölçüde değiştiğinde elden geçirilmesi önerilir.

## Bilinen küçük sınırlamalar

- Müşteri/marka isimleri sheet'te BÜYÜK HARF olduğu için otomatik "Başlık Şeklinde" çeviriliyor (örn. "ALTINCOM" → "Altıncom"). Bazı marka isimleri (örn. "Altın.com") stil olarak orijinal yazımından farklı görünebilir — toplam rakamlar her zaman doğrudur, bu sadece görsel bir detaydır.
- Sheet'lerde satır/sütun yapısı büyük ölçüde değişirse (örn. DASH 26 sekmesinin genel düzeni yeniden tasarlanırsa) `parseData.js` içindeki pozisyon bazlı okuma mantığının güncellenmesi gerekir.
