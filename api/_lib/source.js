// Google Apps Script uç noktalarından ham veriyi çeker (anahtarlar yalnızca sunucuda).
async function getOnce(url, key, what) {
  const res = await fetch(`${url}?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`${what} verisi alınamadı (HTTP ${res.status})`);
  const j = await res.json();
  if (j.error) throw new Error(`${what}: ${j.error}`);
  return j;
}

// Apps Script zaman zaman geçici hata verir ("Service Spreadsheets failed"); kısa aralıkla 3 kez dener.
async function getJson(url, key, what) {
  let err;
  for (let a = 0; a < 3; a += 1) {
    try { return await getOnce(url, key, what); } catch (e) { err = e; if (a < 2) await new Promise((r) => setTimeout(r, 800)); }
  }
  throw err;
}

export async function fetchSources(env = process.env) {
  const { FEE_URL, FEE_KEY, ODEME_URL, ODEME_KEY, SATIS_URL, SATIS_KEY } = env;
  if (!FEE_URL || !FEE_KEY || !ODEME_URL || !ODEME_KEY) throw new Error('Sunucu ortam değişkenleri eksik (FEE_URL, FEE_KEY, ODEME_URL, ODEME_KEY)');
  const [fee, odeme] = await Promise.all([getJson(FEE_URL, FEE_KEY, 'FEE 2026 YENİ'), getJson(ODEME_URL, ODEME_KEY, 'MÜŞTERİDEN GELECEK ÖDEMELER')]);
  let satis = null;
  let satisError = null;
  if (SATIS_URL && SATIS_KEY) {
    try { satis = await getJson(SATIS_URL, SATIS_KEY, 'SATIŞ TABLOSU 2026'); } catch (e) { satisError = e.message; }
  }
  return { fee, odeme, satis, satisError };
}
