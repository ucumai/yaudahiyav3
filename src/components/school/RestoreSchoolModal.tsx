import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  History,
  Info,
  Loader2,
  X
} from 'lucide-react';
import { claimLegacySchool } from '../../lib/schoolRegistry';
import {
  LegacyMigrationResult,
  migrateLegacyLocalStorage,
  readLegacySchoolMetadata
} from '../../lib/schoolStorage';

interface RestoreSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onRestored: (
    schoolId: string,
    info: {
      namaSekolah: string;
      npsn: string;
      migration: LegacyMigrationResult;
    }
  ) => void;
}

export const RestoreSchoolModal: React.FC<RestoreSchoolModalProps> = ({
  isOpen,
  onClose,
  user,
  onRestored
}) => {
  const [npsn, setNpsn] = useState('');
  const [prefilledSchoolName, setPrefilledSchoolName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setIsSubmitting(false);

    const legacyMeta = readLegacySchoolMetadata();
    if (legacyMeta?.npsn) {
      const digits = legacyMeta.npsn.replace(/\D/g, '').slice(0, 8);
      setNpsn(digits || legacyMeta.npsn);
      setPrefilledSchoolName(legacyMeta.namaSekolah || null);
    } else {
      setNpsn('');
      setPrefilledSchoolName(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanNpsn = npsn.trim();
    if (!/^\d{8}$/.test(cleanNpsn)) {
      setErrorMessage('NPSN wajib diisi dan harus berupa 8 digit angka.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const claimed = await claimLegacySchool(user, cleanNpsn);
      const migration = migrateLegacyLocalStorage(claimed.schoolId, cleanNpsn);

      onRestored(claimed.schoolId, {
        namaSekolah: claimed.namaSekolah,
        npsn: claimed.npsn,
        migration
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Sekolah lama dengan NPSN ini tidak ditemukan atau sudah dimiliki akun lain.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-school-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 id="restore-school-modal-title" className="text-base font-bold text-slate-900">
                Pulihkan Sekolah Lama
              </h2>
              <p className="text-xs text-slate-500">
                Klaim data sekolah lama agar menjadi milik akun Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {prefilledSchoolName && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Terdeteksi data lokal lama untuk <strong>{prefilledSchoolName}</strong>. NPSN otomatis diisikan di bawah ini.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              NPSN Sekolah Lama (8 digit angka) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={npsn}
              onChange={(e) => setNpsn(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Contoh: 20201363"
              required
              disabled={isSubmitting}
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Seluruh data BKU, guru, siswa, eskul, kombel, perbaikan, dan logistik pada NPSN tersebut akan langsung terhubung ke akun Anda tanpa perlu menyalin data cloud.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memulihkan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pulihkan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
