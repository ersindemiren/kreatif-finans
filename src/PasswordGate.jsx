import React, { useState } from 'react';
import { Lock } from 'lucide-react';

const SESSION_KEY = 'kreatif_finans_auth';

function checkStoredAuth() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function PasswordGate({ children }) {
  const [authed, setAuthed] = useState(checkStoredAuth);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const correctPassword = import.meta.env.VITE_SITE_PASSWORD;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!correctPassword || value === correctPassword) {
      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // sessionStorage kullanılamıyorsa sorun değil, sadece bu oturumda hatırlanmaz
      }
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authed) return children;

  return (
    <div className="min-h-screen bg-[#E4E7EB] font-sans flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 w-full max-w-xs"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-900 font-bold shrink-0">
            K
          </div>
          <span className="font-semibold text-slate-900 text-[15px]">Finans Özeti</span>
          <span className="text-xs text-slate-500">Devam etmek için şifreyi girin</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-slate-400">
            <Lock size={14} className="text-slate-400 shrink-0" />
            <input
              type="password"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              placeholder="Şifre"
              className="flex-1 min-w-0 text-sm outline-none"
            />
          </div>
          {error && <span className="text-xs text-rose-600">Şifre yanlış, tekrar deneyin.</span>}
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-slate-800 transition-colors"
        >
          Giriş Yap
        </button>
      </form>
    </div>
  );
}
