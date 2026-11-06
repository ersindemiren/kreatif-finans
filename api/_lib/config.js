// Sayfa kimlikleri (istemcideki menüyle aynı) ve başlangıç kullanıcıları.
export const PAGES = ['dashboard', 'gelirler', 'giderler', 'alacaklar', 'nakitAkisi', 'satisTablosu', 'sureAnalizi', 'sureAnalizPersonel', 'sureAnalizDepartman', 'feeTakip', 'yorumlar'];
// 'sureAnalizi' = Süre Analiz · Müşteri görünümü (eski yetki aynen müşteri görünümüne denk gelir); personel ve departman ayrı yetkidir.

// Kullanıcı listesi Blob'da yoksa (ilk açılış) bu liste yazılır. Sonrasında değişiklikler Yönetim sayfasından yapılır.
export const DEFAULT_USERS = [
  { email: 'ersin@kreatif.net', name: 'Ersin Demiren', title: 'Kurucu Ortak', role: 'admin', pages: PAGES },
  { email: 'dd@kreatif.net', name: 'Dursun Demiren', title: 'Kurucu Ortak', role: 'member', pages: PAGES },
  { email: 'nejan@kreatif.net', name: 'Nejan Hatam', title: 'Pazarlama Direktörü', role: 'member', pages: ['gelirler', 'alacaklar', 'satisTablosu', 'sureAnalizi', 'feeTakip'] },
  { email: 'duygu@kreatif.net', name: 'Duygu Akus Löker', title: 'Muhasebe Müdürü', role: 'member', pages: ['gelirler', 'giderler', 'alacaklar', 'nakitAkisi', 'satisTablosu', 'feeTakip'] },
];

export const SESSION_HOURS = 12;
export const COOKIE_NAME = 'kf_session';
