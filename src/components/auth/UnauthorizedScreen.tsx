import React from 'react';
import { User } from 'firebase/auth';
import { LogOut, Mail, RefreshCw, ShieldAlert } from 'lucide-react';

interface UnauthorizedScreenProps {
  user: User;
  isDeactivated?: boolean;
  onRetry: () => void;
  onLogout: () => void;
}

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({
  user,
  isDeactivated = false,
  onRetry,
  onLogout
}) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-rose-50/60 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-rose-200 p-7 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            {isDeactivated ? 'Akses Akun Dinonaktifkan' : 'Email Belum Terdaftar'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isDeactivated
              ? 'Akun Google Anda saat ini dinonaktifkan oleh Admin sistem sehingga akses ke data sekolah dihentikan sementara.'
              : 'Aplikasi ini hanya dapat diakses oleh email Google yang telah didaftarkan oleh Admin sistem.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500">Akun Google yang masuk:</div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
              {user.email || '-'}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 leading-relaxed">
          Hubungi Admin sistem untuk mendaftarkan atau mengaktifkan kembali alamat email di atas, lalu klik <strong>Periksa Ulang</strong> atau masuk dengan akun Google lain yang sudah terdaftar.
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Periksa Ulang</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar &amp; Ganti Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
};
