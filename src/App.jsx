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
  const { loading, error, data, reload, unauthorized } = useFinansData();

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
          <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-900">Çıkış yap</button>
        </div>
      </div>
    );
  }

  return (
    <FinansDashboard
      data={data}
      user={user}
      onLogout={onLogout}
      lastUpdatedFee={data.lastUpdatedFee}
      lastUpdatedOdeme={data.lastUpdatedOdeme}
      onRefresh={reload}
      refreshing={loading}
    />
  );
}
