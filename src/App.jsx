import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import FinansDashboard from './FinansDashboard.jsx';
import Login from './Login.jsx';
import { useFinansData } from './lib/useFinansData.js';
import { useAuth } from './lib/auth.js';

export default function App() {
  const { loading, user, login, logout } = useAuth();

  if (loading) return <Spinner text="Oturum kontrol ediliyor..." />;
  if (!user) return <Login onCredential={login} />;
  return <FinansApp user={user} onLogout={logout} />;
}

function Spinner({ text }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 size={28} className="animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

function FinansApp({ user, onLogout }) {
  const [izle, setIzle] = useState(null); // admin: görüntülenen kullanıcı
  const [donus, setDonus] = useState(false);
  const { loading, error, data, reload, unauthorized } = useFinansData(izle?.email);

  // Oturum sunucuda sona erdiyse (12 saat dolduysa ya da yetki kaldırıldıysa) giriş ekranına dön
  useEffect(() => { if (unauthorized) onLogout(); }, [unauthorized, onLogout]);

  if (loading && !data) return <Spinner text="Veriler yükleniyor..." />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle size={20} />
            <h1 className="font-semibold">Veri alınamadı</h1>
          </div>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={reload}
            className="mt-2 flex items-center justify-center gap-2 bg-slate-900 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} />
            Tekrar dene
          </button>
          {izle ? <button onClick={() => { setIzle(null); setDonus(true); }} className="text-xs text-slate-500 hover:text-slate-900">Görüntülemeden çık</button> : <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-900">Çıkış yap</button>}
        </div>
      </div>
    );
  }

  return (
    <>
    <FinansDashboard
      key={izle?.email || 'ben'}
      baslangicSayfa={donus && !izle ? 'yonetim' : undefined}
      izleniyor={!!izle}
      onViewAs={(u) => { setDonus(false); setIzle(u); }}
      data={data}
      user={izle || user}
      onLogout={onLogout}
      lastUpdatedFee={data.lastUpdatedFee}
      lastUpdatedOdeme={data.lastUpdatedOdeme}
      onRefresh={reload}
      refreshing={loading}
    />
    {izle && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-100 border border-amber-300 text-amber-900 text-sm rounded-full pl-4 pr-2 py-1.5 shadow-lg max-w-[92vw]">
        <span className="truncate"><strong>{izle.name || izle.email}</strong> olarak görüntülüyorsun</span>
        <button onClick={() => { setIzle(null); setDonus(true); }} className="shrink-0 bg-amber-900 text-white text-xs font-medium rounded-full px-3 py-1 hover:bg-amber-800">Çık</button>
      </div>
    )}
    </>
  );
}
