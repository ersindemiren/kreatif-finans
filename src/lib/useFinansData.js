import { useEffect, useState, useCallback } from 'react';
import { fetchFinansData, AuthError } from './parseData.js';

export function useFinansData(asEmail) {
  const [state, setState] = useState({ loading: true, error: null, data: null, unauthorized: false });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchFinansData(asEmail);
      setState({ loading: false, error: null, data, unauthorized: false });
    } catch (err) {
      setState({ loading: false, error: err.message || String(err), data: null, unauthorized: err instanceof AuthError });
    }
  }, [asEmail]);

  useEffect(() => {
    // Görüntülenen kullanıcı değişince eski verinin kısa süre bile görünmemesi için veri sıfırlanır
    setState({ loading: true, error: null, data: null, unauthorized: false });
    load();
  }, [load]);

  return { ...state, reload: load };
}
