import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from './lib/auth.js';
import { autoBrand, DEPARTMANLAR } from './lib/sure.js';
import { normalizeNameKey } from './lib/parseData.js';

const CARD = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800';

// Admin: üye ekleme/çıkarma ve sayfa yetkileri. Değişiklikler anında kaydedilir; çıkarılan kişinin oturumu bir sonraki istekte düşer.
// Everhour müşteri adlarını dashboard markalarıyla eşleştirir. Otomatik eşleşenler "otomatik" görünür, eşleşmeyenler seçilmeyi bekler.
function DepartmanEslestirme() {
  const [st, setSt] = useState({ loading: true, kisiler: [], map: {}, pasif: {}, error: '' });
  const [busy, setBusy] = useState('');
  useEffect(() => {
    (async () => {
      const r = await api('/api/everhour');
      if (r.ok) setSt({ loading: false, kisiler: r.data.kisiler || [], map: r.data.departman || {}, pasif: r.data.pasif || {}, error: '' });
      else setSt((s) => ({ ...s, loading: false, error: r.data.error || 'Everhour verisi alınamadı' }));
    })();
  }, []);
  const sec = async (kisi, departman) => {
    setBusy(kisi);
    const r = await api('/api/everhour', { method: 'PUT', body: { kisi, departman } });
    if (r.ok) setSt((s) => ({ ...s, map: r.data.departman, error: '' }));
    else setSt((s) => ({ ...s, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };
  const durumSec = async (kisi, pasif) => {
    setBusy(kisi);
    const r = await api('/api/everhour', { method: 'PUT', body: { kisi, pasif } });
    if (r.ok) setSt((s) => ({ ...s, pasif: r.data.pasif, error: '' }));
    else setSt((s) => ({ ...s, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };
  const atanmamis = st.kisiler.filter((k) => !st.pasif[k.name] && !st.map[k.name]).length;
  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 mb-1">Personel Departman Eşleştirme</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Süre Analiz'deki Departman Bazlı Süre Dağılımı, Everhour'daki kişileri buradan seçilen departmana göre toplar. Seçim bir sonraki yenilemede uygulanır.</p>
      {st.loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Everhour kişileri okunuyor...</div>}
      {st.error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{st.error}</div>}
      {!st.loading && !st.error && (
        <>
          <div className="text-xs text-slate-500 mb-3">{st.kisiler.length} kişi ({st.kisiler.filter((k) => st.pasif[k.name]).length} pasif) · <span className={atanmamis ? 'text-amber-600 font-medium' : ''}>{atanmamis} departman atanmamış</span></div>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {[...st.kisiler].sort((a, b) => (!!st.pasif[a.name] - !!st.pasif[b.name]) || (!!st.map[a.name] - !!st.map[b.name])).map((k) => (
              <div key={k.name} className={`py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 ${st.pasif[k.name] ? 'opacity-60' : ''}`}>
                <div className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-200 uppercase">{k.name}{st.pasif[k.name] && <span className="ml-2 normal-case text-[10px] font-medium border border-slate-300 dark:border-slate-600 text-slate-500 rounded-full px-1.5 py-0.5">Pasif</span>}<span className="ml-2 text-[11px] text-slate-400 tabular-nums normal-case">{k.hours} sa</span></div>
                <select value={st.pasif[k.name] ? 'pasif' : 'aktif'} disabled={busy === k.name} onChange={(e) => durumSec(k.name, e.target.value === 'pasif')} aria-label={`${k.name} durumu`} className="sm:w-24 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400">
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
                <select value={st.map[k.name] || ''} disabled={busy === k.name} onChange={(e) => sec(k.name, e.target.value)} className="sm:w-60 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400">
                  <option value="">Departman seçin...</option>
                  {DEPARTMANLAR.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EverhourEslestirme({ markalar }) {
  const [state, setState] = useState({ loading: true, musteriler: [], map: {}, error: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const r = await api('/api/everhour');
    if (r.ok) setState({ loading: false, musteriler: r.data.musteriler || [], map: r.data.map || {}, error: '' });
    else setState((s) => ({ ...s, loading: false, error: r.data.error || 'Everhour verisi alınamadı' }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const markaKeys = new Set((markalar || []).map((m) => normalizeNameKey(m)));
  const durum = (name) => {
    if (state.map[name]) return { tip: 'elle', brand: state.map[name] };
    const a = autoBrand(name);
    if (a) return { tip: 'otomatik', brand: a };
    if (markaKeys.has(normalizeNameKey(name))) return { tip: 'otomatik', brand: name };
    return { tip: 'yok', brand: '' };
  };

  const sec = async (name, brand) => {
    setBusy(name);
    const r = await api('/api/everhour', { method: 'PUT', body: { name, brand } });
    if (r.ok) setState((s) => ({ ...s, map: r.data.map, error: '' }));
    else setState((s) => ({ ...s, error: r.data.error || 'Kaydedilemedi' }));
    setBusy('');
  };

  const eslesmeyen = state.musteriler.filter((m) => durum(m.name).tip === 'yok');
  const siralanmis = [...eslesmeyen, ...state.musteriler.filter((m) => durum(m.name).tip !== 'yok')];

  return (
    <div className={`${CARD} p-4 sm:p-5`}>
      <h3 className="font-serif text-base text-slate-900 dark:text-slate-50 mb-1">Everhour Müşteri Eşleştirme</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Süre Analiz, Everhour'daki müşteri adlarını dashboard markalarıyla eşleştirir. Adı farklı yazılanları buradan seçin (örnek: Everhour'da "BMS Design Center", dashboard'da "B.M.S"). Seçim bir sonraki yenilemede uygulanır.</p>
      {state.loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" /> Everhour müşterileri okunuyor...</div>}
      {state.error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{state.error}</div>}
      {!state.loading && !state.error && (
        <>
          <div className="text-xs text-slate-500 mb-3">{state.musteriler.length} müşteri · <span className={eslesmeyen.length ? 'text-amber-600 font-medium' : ''}>{eslesmeyen.length} eşleşmedi</span></div>
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {siralanmis.map((m) => {
              const d = durum(m.name);
              return (
                <div key={m.name} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-200">
                    {m.name}
                    <span className="ml-2 text-[11px] text-slate-400 tabular-nums">{m.hours} sa</span>
                    {d.tip === 'yok' && <span className="ml-2 text-[10px] font-medium border border-amber-300 text-amber-600 rounded-full px-1.5 py-0.5">eşleşmedi</span>}
                    {d.tip === 'otomatik' && <span className="ml-2 text-[10px] text-slate-400">otomatik → {d.brand}</span>}
                  </div>
                  <select
                    value={state.map[m.name] || ''}
                    disabled={busy === m.name}
                    onChange={(e) => sec(m.name, e.target.value)}
                    className="sm:w-60 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                  >
                    <option value="">{d.tip === 'otomatik' ? 'Otomatik' : 'Marka seçin...'}</option>
                    {(markalar || []).map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Yonetim({ me, tumSayfalar, markalar }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [yeni, setYeni] = useState({ email: '', name: '', title: '' });
  const [bolum, setBolum] = useState(''); // '' | 'everhour' | 'departman'

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
      <div className="flex justify-end">
        <select value={bolum} onChange={(e) => setBolum(e.target.value)} aria-label="Görünüm" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-slate-400">
          <option value="">Kullanıcılar ve Yetkiler</option>
          <option value="everhour">Everhour Müşteri Eşleştirme</option>
          <option value="departman">Personel Departman Eşleştirme</option>
        </select>
      </div>
      {bolum === '' && (
      <>
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

      </>
      )}
      {bolum === 'everhour' && <EverhourEslestirme markalar={markalar} />}
      {bolum === 'departman' && <DepartmanEslestirme />}
    </div>
  );
}
