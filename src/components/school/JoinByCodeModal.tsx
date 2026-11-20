import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Shield,
  UserPlus,
  X
} from 'lucide-react';
import { SchoolInvite, SchoolSummary } from '../../types';
import {
  acceptInviteCode,
  lookupInviteCode,
  normalizeInviteCode,
  toMillisSafe
} from '../../lib/schoolRegistry';

interface JoinByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  existingSchools: SchoolSummary[];
  onJoined: (schoolId: string, namaSekolah: string, role: 'editor' | 'viewer') => void;
}

function formatExpiryId(val: any): string {
  const ms = toMillisSafe(val);
  if (!ms) return '-';
  return new Date(ms).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const JoinByCodeModal: React.FC<JoinByCodeModalProps> = ({
  isOpen,
  onClose,
  user,
  existingSchools,
  onJoined
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [invitePreview, setInvitePreview] = useState<SchoolInvite | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCodeInput('');
      setInvitePreview(null);
      setIsChecking(false);
      setIsJoining(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking || isJoining) return;

    const cleanCode = normalizeInviteCode(codeInput);
    if (!cleanCode) {
      setErrorMessage('Masukkan kode undangan terlebih dahulu.');
      return;
    }

    setIsChecking(true);
    setErrorMessage(null);
    try {
      const invite = await lookupInviteCode(cleanCode);
      if (existingSchools.some((s) => s.schoolId === invite.schoolId)) {
        setErrorMessage(
          `Akun Anda sudah terdaftar sebagai anggota di "${invite.schoolName}". Pilih sekolah tersebut dari daftar sekolah.`
        );
        return;
      }
      setInvitePreview(invite);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Kode undangan tidak ditemukan, kedaluwarsa, atau sudah dipakai.'
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!invitePreview || isJoining) return;
    setIsJoining(true);
    setErrorMessage(null);
    try {
      const res = await acceptInviteCode(user, invitePreview);
      onJoined(res.schoolId, res.namaSekolah, res.role);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Gagal bergabung ke sekolah. Kode mungkin sudah dipakai atau kedaluwarsa.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  const roleLabel = invitePreview?.role === 'editor' ? 'Editor' : 'Viewer';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-by-code-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 id="join-by-code-modal-title" className="text-base font-bold text-slate-900">
                Gabung dengan Kode Undangan
              </h2>
              <p className="text-xs text-slate-500">
                Masukkan kode undangan sekali pakai dari pemilik sekolah
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isChecking || isJoining}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!invitePreview ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label
                  htmlFor="join-invite-code"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Kode Undangan (10 karakter)
                </label>
                <input
                  id="join-invite-code"
                  type="text"
                  value={codeInput}
                  onChange={(e) =>
                    setCodeInput(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, '')
                        .slice(0, 16)
                    )
                  }
                  placeholder="Contoh: A7K9M3P2QX"
                  autoFocus
                  disabled={isChecking}
                  className="w-full px-4 py-3 text-center text-lg font-mono font-bold tracking-[0.22em] uppercase bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Kode hanya dapat digunakan satu kali sebelum kedaluwarsa.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isChecking}
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChecking || !normalizeInviteCode(codeInput)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memeriksa Kode...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Periksa Kode</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 leading-snug">
                      Anda diundang ke <span className="text-emerald-800">{invitePreview.schoolName}</span> sebagai{' '}
                      <span className="text-emerald-800">{roleLabel}</span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {invitePreview.role === 'editor'
                        ? 'Sebagai Editor, Anda dapat melihat, menambah, dan mengubah data BKU/RKAS serta master sekolah.'
                        : 'Sebagai Viewer, Anda hanya dapat melihat dan mencetak data tanpa menyimpan perubahan.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/70 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Kode: {invitePreview.code}
                  </span>
                  <span>Berlaku s.d. {formatExpiryId(invitePreview.expiresAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={() => {
                    setInvitePreview(null);
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ganti Kode</span>
                </button>

                <button
                  type="button"
                  disabled={isJoining}
                  onClick={() => void handleConfirmJoin()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Bergabung...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Konfirmasi &amp; Gabung</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
