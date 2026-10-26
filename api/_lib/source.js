// Google Apps Script uç noktalarından ham veriyi çeker (anahtarlar yalnızca sunucuda).
async function getJson(url, key, what) {
  const res = await fetch(`${url}?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`${what} verisi alınamadı (HTTP ${res.status})`);
  const j = await res.json();
  if (j.error) throw new Error(`${what}: ${j.error}`);
  return j;
}

export async function fetchSources(env = process.env) {
  const { FEE_URL, FEE_KEY, ODEME_URL, ODEME_KEY, SATIS_URL, SATIS_KEY } = env;
  if (!FEE_URL || !FEE_KEY || !ODEME_URL || !ODEME_KEY) throw new Error('Sunucu ortam değişkenleri eksik (FEE_URL, FEE_KEY, ODEME_URL, ODEME_KEY)');
  const [fee, odeme] = await Promise.all([getJson(FEE_URL, FEE_KEY, 'FEE 2026 YENİ'), getJson(ODEME_URL, ODEME_KEY, 'MÜŞTERİDEN GELECEK ÖDEMELER')]);
  let satis = null;
  let satisError = null;
  if (SATIS_URL && SATIS_KEY) {
    for (let a = 0; a < 3 && !satis; a += 1) {
      try { satis = await getJson(SATIS_URL, SATIS_KEY, 'SATIŞ TABLOSU 2026'); satisError = null; } catch (e) { satisError = e.message; if (a < 2) await new Promise((r) => setTimeout(r, 800)); }
    }
  }
  return { fee, odeme, satis, satisError };
}
