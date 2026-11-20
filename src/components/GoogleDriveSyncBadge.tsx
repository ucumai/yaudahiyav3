import React, { useState } from 'react';
import {
  HardDrive,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertCircle,
  FileCheck,
  Shield,
  UserCheck,
  Zap,
  Sparkles,
  Lock
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleDriveFileInfo, DriveRealtimeStatus } from '../lib/googleDriveSync';
import { useSchool } from '../context/SchoolContext';

interface GoogleDriveSyncProps {
  currentUser: User | null;
  accessToken: string | null;
  isSyncing: boolean;
  realtimeStatus?: DriveRealtimeStatus;
  lastDriveSync: Date | null;
  driveFile: GoogleDriveFileInfo | null;
  isExistingUser?: boolean;
  isReconnecting?: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onManualSync: () => Promise<void>;
  onPullFromDrive: () => Promise<void>;
}

export const GoogleDriveSyncBadge: React.FC<GoogleDriveSyncProps> = ({
  currentUser,
  accessToken,
  isSyncing,
  realtimeStatus = 'idle',
  lastDriveSync,
  driveFile,
  isExistingUser = false,
  isReconnecting = false,
  onLogin,
  onLogout,
  onManualSync,
  onPullFromDrive,
}) => {
  const { readOnly } = useSchool();
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (fn: () => Promise<void>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err: any) {
      setActionError(err?.message || 'Operasi Google Drive gagal.');
    }
  };

  const isConnected = !!(currentUser && accessToken);

  // Status text for the trigger button
  const getButtonContent = () => {
    if (isReconnecting) {
      return {
        label: 'Menyambungkan Drive...',
        subtext: 'Memuat sesi database',
        badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-700/60 hover:bg-blue-900/90',
        iconColor: 'text-blue-400',
        spin: true,
      };
    }

    if (isConnected) {
      if (isSyncing || realtimeStatus === 'syncing') {
        return {
          label: 'Menyimpan Realtime...',
          subtext: 'Sinkronisasi ke Drive',
          badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900',
          iconColor: 'text-emerald-400',
          spin: true,
        };
      }

      return {
        label: 'Drive Realtime Aktif',
        subtext: lastDriveSync
          ? `Tersimpan ${lastDriveSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
          : currentUser.email || 'Terhubung',
        badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/90 shadow-xs shadow-emerald-900/30',
        iconColor: 'text-emerald-400',
        spin: false,
      };
    }

    if (isExistingUser) {
      return {
        label: 'Sambungkan Drive',
        subtext: '1-Klik Reconnect',
        badgeColor: 'bg-amber-950/70 text-amber-300 border-amber-700/60 hover:bg-amber-900/80',
        iconColor: 'text-amber-400',
        spin: false,
      };
    }

    // New user
    return {
      label: 'Hubungkan Drive Sekolah',
      subtext: 'Verifikasi Akun (Opsi 3)',
      badgeColor: 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white',
      iconColor: 'text-blue-400',
      spin: false,
    };
  };

  const btnContent = getButtonContent();

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button di Header */}
      <button
        type="button"
        id="btn-google-drive-sync-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm active:scale-[0.98] ${btnContent.badgeColor}`}
        title="Pengaturan & Status Database Google Drive Realtime"
      >
        <div className="relative flex items-center justify-center shrink-0">
          <HardDrive className={`w-4 h-4 ${btnContent.iconColor}`} />
          {isConnected && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-slate-900"></span>
            </span>
          )}
        </div>

        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1.5 leading-tight">
            <span>{btnContent.label}</span>
            {btnContent.spin && <RefreshCw className="w-3 h-3 animate-spin shrink-0 text-emerald-400" />}
            {isConnected && !btnContent.spin && <Zap className="w-3 h-3 text-emerald-400 shrink-0 fill-emerald-400/20" />}
          </div>
          <div className="text-[10px] opacity-80 font-normal truncate max-w-[150px]">
            {btnContent.subtext}
          </div>
        </div>
      </button>

      {/* Popover Modal / Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700/80 p-4 text-white shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header Popup */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                  <HardDrive className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    Google Drive Pribadi Sekolah
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                      Realtime
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Penyimpanan otomatis langsung di akun Drive sekolah
                  </p>
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {actionError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-snug">{actionError}</span>
              </div>
            )}

            {/* Status Realtime Pill */}
            {isConnected && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
                  <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/20 shrink-0 animate-pulse" />
                  <span>Autosave Realtime: <strong>AKTIF</strong></span>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-700/50">
                  1.5s Debounce
                </span>
              </div>
            )}

            {/* Status Panel */}
            {currentUser && accessToken ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Akun Terdaftar:
                    </span>
                    <span className="font-semibold text-white truncate max-w-[170px]" title={currentUser.email || ''}>
                      {currentUser.displayName || currentUser.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                      File Database:
                    </span>
                    <span className="font-mono text-slate-300 text-[11px] truncate max-w-[170px]" title={driveFile?.name}>
                      {driveFile ? driveFile.name : 'Akan dibuat otomatis'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-700/40 pt-2">
                    <span className="text-slate-400">Sinkronisasi Terakhir:</span>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      {lastDriveSync ? lastDriveSync.toLocaleTimeString('id-ID') : 'Baru saja terhubung'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl flex items-start gap-2">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Setiap kali Anda mengubah BKU, RKAS, atau Master Data, aplikasi otomatis menyimpannya ke Google Drive Anda. Setiap membuka aplikasi via link, akun akan otomatis terhubung kembali.
                  </span>
                </div>

                {/* Tombol Aksi */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => !readOnly && handleAction(onManualSync)}
                    disabled={readOnly || isSyncing}
                    title={readOnly ? 'Mode lihat saja tidak dapat menulis ke Google Drive' : undefined}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Menyimpan...' : 'Simpan Sekarang'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(onPullFromDrive)}
                    disabled={isSyncing}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="Muat data dari file database di Drive"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    Muat dari Drive
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleAction(onLogout)}
                    className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Putuskan / Ganti Akun
                  </button>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    Terkoneksi Aman
                  </span>
                </div>
              </div>
            ) : (
              /* State Belum Terhubung (Pengguna Baru atau Pengguna Lama yang butuh re-auth) */
              <div className="space-y-3">
                {isExistingUser ? (
                  <div className="p-3 bg-amber-950/50 border border-amber-800/70 rounded-xl text-xs space-y-1.5 text-amber-200">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      Pengguna Terdaftar Terdeteksi
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-200/90">
                      Database Anda sebelumnya telah tersimpan di Google Drive. Klik tombol di bawah untuk menyambungkan kembali sesi dan memuat data Anda secara otomatis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Pengguna Baru:</strong> Klik tombol verifikasi di bawah untuk menghubungkan Google Drive sekolah Anda pertama kali.
                    </p>
                    <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Otomatis tersimpan realtime ke Google Drive
                      </div>
                      <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Otomatis terhubung kembali setiap buka link
                      </div>
                      <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        100% Terisolasi di akun Drive sekolah Anda
                      </div>
                    </div>
                  </div>
                )}

                {/* Tombol Google Sign In Resmi */}
                <button
                  type="button"
                  onClick={() => handleAction(onLogin)}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer hover:shadow-lg disabled:opacity-50 active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>
                    {isExistingUser ? 'Sambungkan Kembali Akun Google' : 'Verifikasi & Hubungkan Akun Google'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

