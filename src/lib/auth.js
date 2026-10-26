import { useEffect, useState, useCallback } from 'react';

// Küçük API yardımcısı: aynı kaynağa, çerezle. Hata gövdesi { error } olarak döner.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* boş gövde */ }
  return { ok: res.ok, status: res.status, data: data || {} };
}

// Oturum: /api/me ile kullanıcıyı (rol + izinli sayfalar) okur.
export function useAuth() {
  const [state, setState] = useState({ loading: true, user: null });

  const refresh = useCallback(async () => {
    try {
      const r = await api('/api/me');
      setState({ loading: false, user: r.ok ? r.data.user : null });
    } catch {
      setState({ loading: false, user: null });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (credential) => {
    const r = await api('/api/login', { method: 'POST', body: { credential } });
    if (r.ok) setState({ loading: false, user: r.data.user });
    return r;
  }, []);

  const logout = useCallback(async () => {
    try { await api('/api/logout', { method: 'POST', body: {} }); } catch { /* çevrimdışıysa da yerel oturumu kapat */ }
    setState({ loading: false, user: null });
  }, []);

  return { ...state, login, logout, refresh };
}
