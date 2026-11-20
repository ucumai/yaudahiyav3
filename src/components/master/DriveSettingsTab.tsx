import React, { useState } from 'react';
import {
  HardDrive,
  CheckCircle2,
  RefreshCw,
  LogOut,
  AlertCircle,
  FileCheck,
  Shield,
  Key,
  FolderLock,
  Download,
  UploadCloud,
  HelpCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleDriveFileInfo } from '../../lib/googleDriveSync';
import { SchoolMetadata } from '../../types';
import { useSchool } from '../../context/SchoolContext';

interface DriveSettingsTabProps {
  currentUser: User | null;
  accessToken: string | null;
  isSyncing: boolean;
  lastDriveSync: Date | null;
  driveFile: GoogleDriveFileInfo | null;
  metadata: SchoolMetadata;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onManualSync: () => Promise<void>;
  onPullFromDrive: () => Promise<void>;
}

export const DriveSettingsTab: React.FC<DriveSettingsTabProps> = ({
  currentUser,
  accessToken,
  isSyncing,
  lastDriveSync,
  driveFile,
  metadata,
  onLogin,
  onLogout,
  onManualSync,
  onPullFromDrive
}) => {
  const { schoolId, readOnly } = useSchool();
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const executeAction = async (action: () => Promise<void>, successText: string) => {
    setStatusMsg(null);
    try {
      await action();
      setStatusMsg({ type: 'success', text: successText });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Operasi Google Drive gagal dijalankan.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert status message */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium leading-relaxed">{statusMsg.text}</p>
        </div>
      )}

      {/* Main Connection Status Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
              currentUser ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Integrasi Database Google Drive Pribadi Sekolah
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  Opsi 3 Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Penyimpanan terisolasi antarsekolah: Setiap sekolah memiliki file database sendiri di Google Drive masing-masing.
              </p>
            </div>
          </div>

          <div>
            {currentUser ? (
              <button
                type="button"
                onClick={() => executeAction(onLogout, 'Berhasil keluar dari akun Google.')}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Ganti / Putuskan Akun
              </button>
            ) : (
              <button
                type="button"
                onClick={() => executeAction(onLogin, 'Berhasil login dan menghubungkan Google Drive sekolah.')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                Hubungkan Akun Google Sekolah
              </button>
            )}
          </div>
        </div>

        {/* Detailed Connection Information */}
        {currentUser ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Informasi Akun Terdaftar
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Akun:</span>
                  <span className="font-semibold text-slate-900">{currentUser.displayName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alamat Email:</span>
                  <span className="font-semibold text-slate-900 font-mono">{currentUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Otorisasi:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terotorisasi Google
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Target File Database Drive
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama File di Drive:</span>
                  <span className="font-mono font-semibold text-blue-700">
                    bosp_database_{schoolId || 'default'}.json
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Dokumen Drive:</span>
                  <span className="font-mono text-slate-600 text-[11px] truncate max-w-[180px]">
                    {driveFile ? driveFile.id : 'Dibuat saat sinkronisasi pertama'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Sinkron Terakhir:</span>
                  <span className="font-mono text-slate-700">
                    {lastDriveSync ? lastDriveSync.toLocaleString('id-ID') : 'Belum pernah disinkronkan'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-2">
            <p className="font-semibold text-sm text-amber-950 flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-amber-600" />
              Akun Google Drive Sekolah Belum Terhubung
            </p>
            <p>
              Saat ini aplikasi masih bekerja dengan penyimpanan memori browser lokal dan Firebase Cloud umum.
              Klik tombol <strong>"Hubungkan Akun Google Sekolah"</strong> di atas untuk mengaktifkan database independen milik sekolah Anda sendiri.
            </p>
          </div>
        )}

        {/* Action Controls when logged in */}
        {currentUser && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => !readOnly && executeAction(onManualSync, 'Data berhasil disimpan ke file database di Google Drive!')}
              disabled={readOnly || isSyncing}
              title={readOnly ? 'Mode lihat saja tidak dapat menulis ke Google Drive' : undefined}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyimpan ke Google Drive...' : 'Simpan / Sinkronkan Data ke Drive Sekarang'}
            </button>

            <button
              type="button"
              onClick={() => executeAction(onPullFromDrive, 'Data dari Google Drive berhasil dimuat ke aplikasi!')}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              Muat / Pulihkan Data dari Drive
            </button>
          </div>
        )}
      </div>

      {/* Security & Multi-School Isolation Explanation Card */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Jaminan Keamanan & Privasi Antarsekolah (Zero-Leakage Security)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <FolderLock className="w-4 h-4 text-emerald-400" />
              1. Terisolasi Akun Google
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Setiap sekolah hanya memiliki hak akses ke Google Drive milik akun mereka sendiri. Sekolah lain secara teknis tidak dapat mengintip database sekolah lain.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Key className="w-4 h-4 text-blue-400" />
              2. Scope Terbatas (drive.file)
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Aplikasi ini hanya diberikan izin untuk membaca dan menulis file database BOSP miliknya sendiri, dan tidak memiliki akses ke foto atau file pribadi Anda di Drive.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              3. Operator Multi-Sekolah
            </div>
            <p className="text-slate-400 leading-relaxed text-[11.5px]">
              Bagi operator yang memegang lebih dari satu sekolah, cukup klik <strong>"Ganti / Putuskan Akun"</strong> lalu masuk dengan akun Google sekolah yang bersangkutan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
