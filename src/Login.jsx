import React, { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google giriş betiği yüklenemedi'));
    document.head.appendChild(s);
    return undefined;
  });
}

export default function Login({ onCredential }) {
  const btnRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mockUsers = typeof window !== 'undefined' ? window.__KF_MOCK_USERS__ : null; // yalnızca önizleme

  const handle = async (credential) => {
    setBusy(true);
    setError('');
    const r = await onCredential(credential);
    if (!r.ok) setError(r.status === 403 ? 'Bu Google hesabı için erişim tanımlı değil. Yetki için yöneticiyle görüşün.' : 'Giriş doğrulanamadı, tekrar deneyin.');
    setBusy(false);
  };

  useEffect(() => {
    if (mockUsers) return undefined;
    if (!CLIENT_ID) { setError('Google giriş kimliği tanımlı değil (VITE_GOOGLE_CLIENT_ID).'); return undefined; }
    let cancelled = false;
    loadGsi().then(() => {
      if (cancelled || !btnRef.current) return;
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (resp) => handle(resp.credential), ux_mode: 'popup' });
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', text: 'signin_with', locale: 'tr', width: 280 });
    }).catch((e) => setError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#E4E7EB] font-sans flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 font-bold shrink-0">K</div>
          <span className="font-semibold text-slate-900 text-[15px]">Finans Özeti</span>
          <span className="text-xs text-slate-500">Devam etmek için Google hesabınızla giriş yapın</span>
        </div>
        {mockUsers ? (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-4">Önizleme: gerçek Google girişi yok. Aşağıdan bir kullanıcı seçerek o kişinin gördüğü ekranı deneyebilirsiniz.</span>
            {mockUsers.map((u) => (
              <button key={u.email} type="button" disabled={busy} onClick={() => handle(`mock:${u.email}`)} className="text-left border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors">
                <span className="block text-sm font-medium text-slate-900">{u.name}</span>
                <span className="block text-[11px] text-slate-500">{u.email} · {u.title}{u.role === 'admin' ? ' · Admin' : ''}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center min-h-[44px]"><div ref={btnRef} /></div>
        )}
        {error && <span className="text-xs text-rose-600 text-center">{error}</span>}
        <span className="text-[10px] text-slate-400 text-center leading-4">Yalnızca yetkilendirilmiş kullanıcılar girebilir.</span>
      </div>
    </div>
  );
}
