import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from './lib/auth.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';

// Admin: üye ekleme/çıkarma ve sayfa yetkileri. Değişiklikler anında kaydedilir; çıkarılan kişinin oturumu bir sonraki istekte düşer.
export default function Yonetim({ me, tumSayfalar }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [yeni, setYeni] = useState({ email: '', name: '', title: '' });

  const load = useCallback(async () => {
    const r = await api('/api/users');
    if (r.ok) setUsers(r.data.users);
    else setError(r.data.error || 'Kullanıcılar okunamadı');
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (u, key) => {
    setBusy(key || u.email);
    setError('');
    const r = await api('/api/users', { method: 'PUT', body: u });
    if (r.ok) setUsers(r.data.users);
    else setError(r.data.error || 'Kaydedilemedi');
    setBusy('');
    return r.ok;
  };

  const remove = async (u) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`${u.name || u.email} erişimden çıkarılsın mı?`)) return;
    setBusy(u.email);
    setError('');
    const r = await api('/api/users', { method: 'DELETE', body: { email: u.email } });
    if (r.ok) setUsers(r.data.users);
    else setError(r.data.error || 'Çıkarılamadı');
    setBusy('');
  };

  const togglePage = (u, id) => {
    const has = u.pages.includes(id);
    save({ ...u, pages: has ? u.pages.filter((p) => p !== id) : [...u.pages, id] });
  };

  const ekle = async (e) => {
    e.preventDefault();
    const ok = await save({ ...yeni, role: 'member', pages: [] }, 'yeni');
    if (ok) setYeni({ email: '', name: '', title: '' });
  };

  if (!users) {
    return (
      <div className={`${CARD} p-6 flex items-center gap-3 text-sm text-slate-500`}>
        {error ? <span className="text-rose-600">{error}</span> : (<><Loader2 size={16} className="animate-spin" /> Kullanıcılar yükleniyor...</>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`${CARD} p-4 sm:p-5`}>
        <h2 className="font-serif text-lg text-slate-900 dark:text-slate-50 mb-1">Kullanıcılar ve Yetkiler</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Her üyenin görebileceği sayfaları işaretleyin. Yetkisi olmayan sayfanın verisi o kişiye hiç gönderilmez. Admin her sayfayı ve bu Yönetim sayfasını görür.</p>
        {error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => {
            const isMe = u.email === me.email;
            const admin = u.role === 'admin';
            return (
              <div key={u.email} className="py-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-50 flex items-center gap-2 flex-wrap">
                      {u.name || u.email}
                      {admin && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"><ShieldCheck size={11} /> Admin</span>}
                      {isMe && <span className="text-[10px] text-slate-400">(siz)</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 break-all">{u.email}{u.title ? ` · ${u.title}` : ''}</div>
                  </div>
                  {busy === u.email && <Loader2 size={14} className="animate-spin text-slate-400 mt-1" />}
                  {!isMe && (
                    <>
                      <button type="button" onClick={() => save({ ...u, role: admin ? 'member' : 'admin' })} className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">
                        {admin ? 'Üye yap' : 'Admin yap'}
                      </button>
                      <button type="button" onClick={() => remove(u)} aria-label="Erişimden çıkar" title="Erişimden çıkar" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tumSayfalar.map((p) => {
                    const on = admin || u.pages.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={admin}
                        onClick={() => togglePage(u, p.id)}
                        className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-lg border transition-colors ${on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'} ${admin ? 'opacity-70 cursor-default' : ''}`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={ekle} className={`${CARD} p-4 sm:p-5 flex flex-col gap-3`}>
        <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 flex items-center gap-2"><UserPlus size={16} /> Üye Ekle</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input required type="email" value={yeni.email} onChange={(e) => setYeni({ ...yeni, email: e.target.value })} placeholder="Google e-postası" className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <input value={yeni.name} onChange={(e) => setYeni({ ...yeni, name: e.target.value })} placeholder="Ad soyad" className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
          <input value={yeni.title} onChange={(e) => setYeni({ ...yeni, title: e.target.value })} placeholder="Ünvan" className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy === 'yeni'} className="bg-slate-900 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-slate-700 transition-colors disabled:opacity-60">Ekle</button>
          <span className="text-[11px] text-slate-400">Yeni üye başta hiçbir sayfayı göremez; yukarıdan yetki verin.</span>
        </div>
      </form>
    </div>
  );
}
