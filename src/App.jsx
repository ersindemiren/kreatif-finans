import React from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import FinansDashboard from './FinansDashboard.jsx';
import { useFinansData } from './lib/useFinansData.js';

export default function App() {
  const { loading, error, data, reload } = useFinansData();

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin" />
          <span className="text-sm">Google Sheets'ten veri çekiliyor...</span>
        </div>
      </div>
    );
  }

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
        </div>
      </div>
    );
  }

  return (
    <FinansDashboard
      data={data}
      lastUpdatedFee={data.lastUpdatedFee}
      lastUpdatedOdeme={data.lastUpdatedOdeme}
      onRefresh={reload}
      refreshing={loading}
    />
  );
}
