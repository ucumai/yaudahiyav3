import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  Edit3,
  History,
  Loader2,
  LogOut,
  Trash2,
  X
} from 'lucide-react';
import { SchoolSummary } from '../../types';
import {
  getFriendlyRegistryErrorMessage,
  removeSchoolFromMyList,
  updateSchoolBasicInfo
} from '../../lib/schoolRegistry';
import {
  clearLegacyBackupKeys,
  countLegacyBackupKeys,
  readLS,
  writeLS
} from '../../lib/schoolStorage';
import { getRoleLabel, getSchoolAvatarColor, getSchoolInitials } from './SchoolSwitcher';

interface ManageSchoolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  schools: SchoolSummary[];
  activeSchoolId: string | null;
  onSchoolRenamed?: (schoolId: string, updated: { namaSekolah: string; npsn: string }) => void;
  onRemoved?: (schoolId: string) => void;
  onOpenRestoreSchool?: () => void;
}

export const ManageSchoolsModal: React.FC<ManageSchoolsModalProps> = ({
  isOpen,
  onClose,
  user,
  schools,
  activeSchoolId,
  onSchoolRenamed,
  onRemoved,
  onOpenRestoreSchool
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNpsn, setEditNpsn] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legacyBackupCount, setLegacyBackupCount] = useState<number>(0);
  const [isConfirmingClearBackup, setIsConfirmingClearBackup] = useState<boolean>(false);
  const [backupClearedMessage, setBackupClearedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditingId(null);
      setConfirmRemoveId(null);
      setBusyId(null);
      setErrorMessage(null);
      setIsConfirmingClearBackup(false);
      setBackupClearedMessage(null);
      setLegacyBackupCount(countLegacyBackupKeys());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startEdit = (school: SchoolSummary) => {
    if (school.role === 'viewer') return;
    setErrorMessage(null);
    setConfirmRemoveId(null);
    setEditingId(school.schoolId);
    setEditName(school.namaSekolah || '');
    setEditNpsn(school.npsn || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMessage(null);
  };

  const handleSaveEdit = async (school: SchoolSummary) => {
    if (school.role === 'viewer' || busyId) return;
    const cleanName = editName.trim();
    const cleanNpsn = editNpsn.trim();

    if (!cleanName) {
      setErrorMessage('Nama sekolah wajib diisi.');
      return;
    }
    if (!/^\d{8}$/.test(cleanNpsn)) {
      setErrorMessage('NPSN wajib berupa 8 digit angka.');
      return;
    }

    setBusyId(school.schoolId);
    setErrorMessage(null);
    try {
      await updateSchoolBasicInfo(user.uid, school.schoolId, {
        namaSekolah: cleanName,
        npsn: cleanNpsn
      });

      // Segarkan cache lokal metadata sekolah tersebut jika tersimpan
      const cachedMeta = readLS<Record<string, any> | null>(school.schoolId, 'school_metadata', null);
      if (cachedMeta && typeof cachedMeta === 'object') {
        writeLS(school.schoolId, 'school_metadata', {
          ...cachedMeta,
          namaSekolah: cleanName,
          npsn: cleanNpsn
        });
      }

      onSchoolRenamed?.(school.schoolId, { namaSekolah: cleanName, npsn: cleanNpsn });
      setEditingId(null);
    } catch (err) {
      setErrorMessage(
        getFriendlyRegistryErrorMessage(
          err,
          'Gagal memperbarui data sekolah. Pastikan Anda memiliki akses Owner/Editor.'
        )
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmRemove = async (school: SchoolSummary) => {
    if (busyId) return;
    setBusyId(school.schoolId);
    setErrorMessage(null);
    try {
      await removeSchoolFromMyList(user.uid, school.schoolId);
      setConfirmRemoveId(null);
      onRemoved?.(school.schoolId);
    } catch (err) {
      setErrorMessage(
        getFriendlyRegistryErrorMessage(err, 'Gagal mengeluarkan sekolah dari daftar Anda.')
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-schools-modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="manage-schools-modal-title" className="text-base font-bold text-slate-900">
                Kelola Daftar Sekolah Saya
              </h2>
              <p className="text-xs text-slate-500">
                Ubah nama/NPSN (khusus Owner &amp; Editor) atau keluarkan dari daftar pribadi Anda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {schools.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Belum ada sekolah dalam daftar Anda.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
              {schools.map((school) => {
                const isActive = school.schoolId === activeSchoolId;
                const isEditing = editingId === school.schoolId;
                const isConfirmingRemove = confirmRemoveId === school.schoolId;
                const isBusy = busyId === school.schoolId;
                const canEdit = school.role === 'owner' || school.role === 'editor';

                return (
                  <div
                    key={school.schoolId}
                    className={`p-4 transition-colors ${isActive ? 'bg-emerald-50/40' : 'bg-white'}`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Nama Sekolah
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              disabled={isBusy}
                              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              NPSN (8 digit)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={8}
                              value={editNpsn}
                              onChange={(e) => setEditNpsn(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              disabled={isBusy}
                              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleSaveEdit(school)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Simpan</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getSchoolAvatarColor(
                              school.schoolId
                            )}`}
                          >
                            {getSchoolInitials(school.namaSekolah)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {school.namaSekolah || 'Tanpa Nama'}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Aktif
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  school.role === 'owner'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : school.role === 'editor'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {getRoleLabel(school.role)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              NPSN: {school.npsn || '-'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={!canEdit || isBusy}
                            onClick={() => startEdit(school)}
                            title={
                              canEdit
                                ? 'Ubah nama sekolah atau NPSN'
                                : 'Peran Viewer tidak dapat mengubah nama atau NPSN'
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Ubah</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setErrorMessage(null);
                              setEditingId(null);
                              setConfirmRemoveId(
                                isConfirmingRemove ? null : school.schoolId
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluarkan dari daftar saya</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {isConfirmingRemove && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2 text-xs text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            Keluarkan <strong>{school.namaSekolah}</strong> dari daftar Anda? Data sekolah di cloud <strong>tidak akan dihapus</strong>.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 justify-end">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleConfirmRemove(school)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                          >
                            {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Ya, Keluarkan</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {backupClearedMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupClearedMessage}</span>
            </div>
          )}

          {isConfirmingClearBackup && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Hapus <strong>{legacyBackupCount}</strong> kunci cadangan lokal lama (<code>bosp_legacy_backup_*</code>) dari browser ini? Pastikan data sekolah yang dipulihkan sudah tampil lengkap terlebih dahulu.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfirmingClearBackup(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const removed = clearLegacyBackupKeys();
                    setLegacyBackupCount(0);
                    setIsConfirmingClearBackup(false);
                    setBackupClearedMessage(`${removed} kunci cadangan lokal lama telah dihapus dari browser.`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Ya, Hapus Cadangan
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Catatan: Mengeluarkan sekolah hanya menghapus entri dari daftar pribadi Anda. Dokumen dan riwayat sekolah di cloud tetap tersimpan utuh.
          </p>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenRestoreSchool && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRestoreSchool();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Pulihkan sekolah lama</span>
              </button>
            )}

            {legacyBackupCount > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmingClearBackup(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Hapus cadangan cache lokal lama hasil migrasi (bosp_legacy_backup_*)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus cadangan lama ({legacyBackupCount})</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
