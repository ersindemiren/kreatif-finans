import { useEffect, useState, useCallback } from 'react';
import { fetchFinansData, AuthError } from './parseData.js';

export function useFinansData() {
  const [state, setState] = useState({ loading: true, error: null, data: null, unauthorized: false });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchFinansData();
      setState({ loading: false, error: null, data, unauthorized: false });
    } catch (err) {
      setState({ loading: false, error: err.message || String(err), data: null, unauthorized: err instanceof AuthError });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
