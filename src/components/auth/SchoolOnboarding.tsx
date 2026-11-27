import React from 'react';
import { User } from 'firebase/auth';
import { Building2, History, KeyRound, LogOut, Plus, ShieldCheck } from 'lucide-react';

interface SchoolOnboardingProps {
  user: User;
  canCreateSchool?: boolean;
  isSuperAdmin?: boolean;
  onOpenAddSchool: () => void;
  onOpenRestoreSchool: () => void;
  onOpenJoinByCode: () => void;
  onOpenUserManagement?: () => void;
  onLogout: () => void;
}

export const SchoolOnboarding: React.FC<SchoolOnboardingProps> = ({
  user,
  canCreateSchool = true,
  isSuperAdmin = false,
  onOpenAddSchool,
  onOpenRestoreSchool,
  onOpenJoinByCode,
  onOpenUserManagement,
  onLogout
}) => {
  const userName = user.displayName || user.email || 'Pengguna';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/70 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-7 sm:p-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600">Selamat datang,</p>
              <h1 className="text-lg font-bold text-slate-900 leading-snug">
                {userName}
              </h1>
              {user.displayName && user.email && (
                <p className="text-xs text-slate-500">{user.email}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            title="Keluar akun Google"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
          {canCreateSchool
            ? 'Akun Anda belum terhubung dengan sekolah mana pun. Daftarkan sekolah pertama Anda, bergabung dengan kode undangan tim, atau pulihkan sekolah lama.'
            : 'Akun Anda belum terhubung dengan sekolah mana pun. Masukkan kode undangan dari pemilik sekolah atau hubungi Admin sistem untuk menugaskan email Anda ke sekolah.'}
        </p>

        <div className="space-y-3">
          {canCreateSchool && (
            <button
              type="button"
              onClick={onOpenAddSchool}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat sekolah pertama</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenJoinByCode}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-sm transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Gabung dengan kode</span>
          </button>

          {canCreateSchool && (
            <button
              type="button"
              onClick={onOpenRestoreSchool}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-sm transition-colors cursor-pointer"
            >
              <History className="w-4 h-4" />
              <span>Pulihkan sekolah lama</span>
            </button>
          )}

          {isSuperAdmin && onOpenUserManagement && (
            <button
              type="button"
              onClick={onOpenUserManagement}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 font-semibold text-sm transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Kelola Pengguna (Whitelist Email)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
