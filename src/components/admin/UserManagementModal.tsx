import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X
} from 'lucide-react';
import { AllowedUserRecord, SchoolSummary, SystemRole } from '../../types';
import {
  createEmailSchoolInvite,
  deleteAllowedUser,
  isBootstrapSuperAdmin,
  isValidEmailFormat,
  normalizeEmail,
  subscribeAllowedUsers,
  upsertAllowedUser
} from '../../lib/userRegistry';
import { getFriendlyRegistryErrorMessage, toMillisSafe } from '../../lib/schoolRegistry';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  schools: SchoolSummary[];
}

function formatShortDateTime(val: any): string {
  const ms = toMillisSafe(val);
  if (!ms) return 'Belum pernah login';
  return new Date(ms).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  schools
}) => {
  const [usersList, setUsersList] = useState<AllowedUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Tambah / Edit Email Terdaftar
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<SystemRole>('operator');
  const [activeInput, setActiveInput] = useState<boolean>(true);
  const [canCreateSchoolInput, setCanCreateSchoolInput] = useState<boolean>(false);

  // Opsional: langsung tugaskan sekolah saat mendaftarkan email
  const [assignSchoolId, setAssignSchoolId] = useState<string>('');
  const [assignSchoolRole, setAssignSchoolRole] = useState<'editor' | 'viewer'>('editor');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const ownedOrAdminSchools = useMemo(
    () => schools.filter((s) => s.role === 'owner' || s.role === 'editor'),
    [schools]
  );

  const resetForm = () => {
    setEditingEmail(null);
    setEmailInput('');
    setNameInput('');
    setRoleInput('operator');
    setActiveInput(true);
    setCanCreateSchoolInput(false);
    setAssignSchoolId('');
    setAssignSchoolRole('editor');
  };

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    setSearchQuery('');
    setConfirmDeleteEmail(null);
    setFeedback(null);
    setLoadError(null);
    setLoading(true);

    const unsub = subscribeAllowedUsers(
      (list) => {
        setUsersList(list);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(
          getFriendlyRegistryErrorMessage(err, 'Gagal memuat daftar pengguna terdaftar.')
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  if (!isOpen) return null;

  const handleStartEdit = (record: AllowedUserRecord) => {
    setFeedback(null);
    setConfirmDeleteEmail(null);
    setEditingEmail(record.email);
    setEmailInput(record.email);
    setNameInput(record.displayName || '');
    setRoleInput(record.systemRole);
    setActiveInput(record.active);
    setCanCreateSchoolInput(record.canCreateSchool);
    setAssignSchoolId('');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const cleanEmail = normalizeEmail(emailInput);
    if (!isValidEmailFormat(cleanEmail)) {
      setFeedback({ type: 'error', message: 'Masukkan alamat email Google yang valid.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await upsertAllowedUser(user, {
        email: cleanEmail,
        displayName: nameInput.trim(),
        systemRole: roleInput,
        active: activeInput,
        canCreateSchool: roleInput === 'super_admin' ? true : canCreateSchoolInput
      });

      let extraMsg = '';
      if (assignSchoolId) {
        const targetSchool = schools.find((s) => s.schoolId === assignSchoolId);
        if (targetSchool) {
          await createEmailSchoolInvite(user, {
            schoolId: targetSchool.schoolId,
            schoolName: targetSchool.namaSekolah || 'Sekolah',
            npsn: targetSchool.npsn || '',
            email: cleanEmail,
            role: assignSchoolRole
          });
          extraMsg = ` dan ditugaskan ke "${targetSchool.namaSekolah}" sebagai ${
            assignSchoolRole === 'editor' ? 'Editor' : 'Viewer'
          }`;
        }
      }

      setFeedback({
        type: 'success',
        message: editingEmail
          ? `Data "${cleanEmail}" berhasil diperbarui${extraMsg}.`
          : `Email "${cleanEmail}" berhasil didaftarkan${extraMsg}.`
      });
      resetForm();
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Gagal menyimpan data pengguna.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (record: AllowedUserRecord) => {
    if (busyEmail || isBootstrapSuperAdmin(record.email)) return;
    setBusyEmail(record.email);
    setFeedback(null);
    try {
      await upsertAllowedUser(user, {
        email: record.email,
        displayName: record.displayName,
        systemRole: record.systemRole,
        active: !record.active,
        canCreateSchool: record.canCreateSchool
      });
      setFeedback({
        type: 'success',
        message: `Akun "${record.email}" kini ${!record.active ? 'diaktifkan' : 'dinonaktifkan'}.`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengubah status akun.'
      });
    } finally {
      setBusyEmail(null);
    }
  };

  const handleConfirmDelete = async (email: string) => {
    if (busyEmail || isBootstrapSuperAdmin(email)) return;
    setBusyEmail(email);
    setFeedback(null);
    try {
      await deleteAllowedUser(email);
      setConfirmDeleteEmail(null);
      if (editingEmail === email) {
        resetForm();
      }
      setFeedback({
        type: 'success',
        message: `Email "${email}" telah dihapus dari daftar pengguna resmi.`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menghapus email.'
      });
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-management-modal-title"
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="user-management-modal-title" className="text-base font-bold text-slate-900">
                Kelola Pengguna Terdaftar (Whitelist Email)
              </h2>
              <p className="text-xs text-slate-500">
                Hanya email Google aktif di daftar ini yang dapat mengakses aplikasi &amp; database
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

        <div className="p-5 overflow-y-auto space-y-5">
          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                feedback.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Form Tambah / Ubah Pengguna */}
          <form
            onSubmit={handleSubmitForm}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>{editingEmail ? `Ubah Pengguna: ${editingEmail}` : 'Daftarkan Email Baru'}</span>
              </h3>
              {editingEmail && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Email Google <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={Boolean(editingEmail) || isSaving}
                  placeholder="bendahara@gmail.com"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama / Keterangan
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={isSaving}
                  placeholder="Contoh: Bendahara SDN 1"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Peran Sistem
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => {
                    const val = e.target.value as SystemRole;
                    setRoleInput(val);
                    if (val === 'super_admin') {
                      setCanCreateSchoolInput(true);
                    }
                  }}
                  disabled={
                    isSaving || (editingEmail ? isBootstrapSuperAdmin(editingEmail) : false)
                  }
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer disabled:bg-slate-100"
                >
                  <option value="operator">Operator Sekolah</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            {ownedOrAdminSchools.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tugaskan Langsung ke Sekolah (Opsional)
                  </label>
                  <select
                    value={assignSchoolId}
                    onChange={(e) => setAssignSchoolId(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Tidak perlu / atur nanti --</option>
                    {ownedOrAdminSchools.map((s) => (
                      <option key={s.schoolId} value={s.schoolId}>
                        {s.namaSekolah} (NPSN: {s.npsn || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Peran di Sekolah
                  </label>
                  <select
                    value={assignSchoolRole}
                    onChange={(e) => setAssignSchoolRole(e.target.value as 'editor' | 'viewer')}
                    disabled={isSaving || !assignSchoolId}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer disabled:bg-slate-100"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roleInput === 'super_admin' ? true : canCreateSchoolInput}
                    disabled={isSaving || roleInput === 'super_admin'}
                    onChange={(e) => setCanCreateSchoolInput(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Izinkan buat sekolah baru</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      editingEmail && isBootstrapSuperAdmin(editingEmail) ? true : activeInput
                    }
                    disabled={
                      isSaving || (editingEmail ? isBootstrapSuperAdmin(editingEmail) : false)
                    }
                    onChange={(e) => setActiveInput(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Akun aktif</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{editingEmail ? 'Simpan Perubahan' : 'Daftarkan Email'}</span>
              </button>
            </div>
          </form>

          {/* Daftar Pengguna Terdaftar */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Daftar Email Terdaftar ({usersList.length})
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau email..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {loadError && (
              <div
                role="alert"
                className="m-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{loadError}</span>
              </div>
            )}

            {loading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Memuat daftar pengguna...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                {usersList.length === 0
                  ? 'Belum ada email lain yang didaftarkan.'
                  : 'Tidak ada pengguna yang cocok dengan pencarian.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredUsers.map((record) => {
                  const isBootstrap = isBootstrapSuperAdmin(record.email);
                  const isBusy = busyEmail === record.email;
                  const isConfirmDelete = confirmDeleteEmail === record.email;

                  return (
                    <div
                      key={record.email}
                      className={`p-3.5 space-y-2.5 ${!record.active ? 'bg-slate-50/80' : 'bg-white'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {record.email}
                            </span>

                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                record.systemRole === 'super_admin'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {record.systemRole === 'super_admin' ? 'Super Admin' : 'Operator'}
                            </span>

                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                record.active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {record.active ? 'Aktif' : 'Nonaktif'}
                            </span>

                            {record.canCreateSchool && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                <Building2 className="w-2.5 h-2.5" />
                                Buat Sekolah
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                            <span>{record.displayName || 'Tanpa keterangan nama'}</span>
                            <span>&bull;</span>
                            <span
                              className={
                                record.lastUid ? 'text-emerald-700 font-medium' : 'text-slate-400'
                              }
                            >
                              {record.lastUid
                                ? `Login terakhir: ${formatShortDateTime(record.lastLoginAt)}`
                                : 'Menunggu login pertama'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleStartEdit(record)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Ubah</span>
                          </button>

                          {!isBootstrap && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleToggleActive(record)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${
                                  record.active
                                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                                    : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isBusy ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : record.active ? (
                                  <UserX className="w-3 h-3" />
                                ) : (
                                  <UserCheck className="w-3 h-3" />
                                )}
                                <span>{record.active ? 'Nonaktifkan' : 'Aktifkan'}</span>
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  setConfirmDeleteEmail(
                                    isConfirmDelete ? null : record.email
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isConfirmDelete && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2 text-xs text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                              Hapus <strong>{record.email}</strong> dari daftar pengguna? Akun ini tidak akan bisa mengakses aplikasi lagi.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-end shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteEmail(null)}
                              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleConfirmDelete(record.email)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-60"
                            >
                              {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Ya, Hapus</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-500">
            Menonaktifkan email langsung memblokir akses Firestore tanpa perlu menunggu user logout.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
