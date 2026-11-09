// Geçici olarak gizlenen göstergeler (olgunlaştırma sonrası tekrar açılacak).
// Tekrar göstermek için ilgili değeri false yapmak yeterli.
export const GIZLI = {
  maliyetKayitSkor: true, // Ort. Saat Maliyeti, Gerçekleşen Maliyet, Kayıt Oranı ve Skor sütunları/satırları (Süre Analizi tabloları, Karşılaştırma, Aylık Ayrıntı)
  skorKarti: true, // Personel detayındaki Skor kartı
};
// Süre Analizi tablolarındaki gizlenen sütun anahtarları
export const GIZLI_SUTUN = new Set(GIZLI.maliyetKayitSkor ? ['ort', 'gm', 'sureOran', 'skor'] : []);
// Karşılaştırma'daki gizlenen satır etiketleri
export const GIZLI_SATIR = new Set(GIZLI.maliyetKayitSkor ? ['Ort. Saat Maliyeti', 'Gerçekleşen Maliyet', 'Kayıt Oranı', 'Skor'] : []);
