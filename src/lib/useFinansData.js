import { useEffect, useState, useCallback } from 'react';
import { fetchFinansData } from './parseData.js';

const CONFIG = {
  feeUrl: import.meta.env.VITE_FEE_URL,
  feeKey: import.meta.env.VITE_FEE_KEY,
  odemeUrl: import.meta.env.VITE_ODEME_URL,
  odemeKey: import.meta.env.VITE_ODEME_KEY,
};

export function useFinansData() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      if (!CONFIG.feeUrl || !CONFIG.feeKey || !CONFIG.odemeUrl || !CONFIG.odemeKey) {
        throw new Error(
          'Ortam değişkenleri eksik. .env dosyasında VITE_FEE_URL, VITE_FEE_KEY, VITE_ODEME_URL, VITE_ODEME_KEY tanımlı olmalı.'
        );
      }
      const data = await fetchFinansData(CONFIG);
      setState({ loading: false, error: null, data });
    } catch (err) {
      setState({ loading: false, error: err.message || String(err), data: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
