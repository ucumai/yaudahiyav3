import React, { useState } from 'react';
import { Cloud, CloudCheck, CloudUpload, RefreshCw, AlertTriangle, WifiOff } from 'lucide-react';
import { CloudSyncStatus } from '../lib/firebaseSync';

interface CloudSyncBadgeProps {
  status: CloudSyncStatus;
  onForceSync?: () => void;
  lastSyncedTime?: Date | null;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({
  status,
  onForceSync,
  lastSyncedTime
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center hidden" aria-hidden="true">
      <button
        type="button"
        onClick={onForceSync}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`!hidden items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
          status === 'synced'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : status === 'syncing'
            ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
            : status === 'quota_exceeded'
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : status === 'offline'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : status === 'error'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}
        title="Klik untuk menyinkronkan data sekarang ke Cloud Firestore"
      >
        {status === 'synced' && (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Database Cloud Aktif</span>
          </>
        )}

        {status === 'syncing' && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span className="hidden sm:inline">Menyimpan ke Cloud...</span>
          </>
        )}

        {status === 'quota_exceeded' && (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Quota Firestore Habis</span>
          </>
        )}

        {status === 'offline' && (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Mode Offline (Lokal)</span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Gagal Sinkron</span>
          </>
        )}

        {status === 'idle' && (
          <>
            <CloudUpload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Database Cloud</span>
          </>
        )}
      </button>

      {/* Floating Tooltip info */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-1.5 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-lg z-50 pointer-events-none">
          <div className="font-bold flex items-center gap-1 text-emerald-400">
            <Cloud className="w-3 h-3" />
            Firebase Firestore Database
          </div>
          <p className="text-slate-300 mt-1 leading-snug">
            Data sekolah, guru, siswa, dan transaksi BKU tersimpan di cloud database secara realtime.
          </p>
          {lastSyncedTime && (
            <p className="text-[10px] text-slate-400 mt-1.5 border-t border-slate-700/60 pt-1">
              Sinkron terakhir: {lastSyncedTime.toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
