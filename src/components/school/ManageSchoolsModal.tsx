import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Edit3,
  History,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Trash2,
  UserMinus,
  Users,
  X
} from 'lucide-react';
import { EmailSchoolInvite, SchoolInvite, SchoolMember, SchoolSummary } from '../../types';
import {
  createSchoolInvite,
  getFriendlyRegistryErrorMessage,
  removeSchoolFromMyList,
  removeSchoolMember,
  revokeInviteCode,
  subscribeMyInvites,
  subscribeSchoolMembers,
  toMillisSafe,
  updateSchoolBasicInfo,
  updateSchoolMemberRole
} from '../../lib/schoolRegistry';
import {
  createEmailSchoolInvite,
  isValidEmailFormat,
  normalizeEmail,
  revokeEmailSchoolInvite,
  subscribeSchoolEmailInvites
} from '../../lib/userRegistry';
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
  isSuperAdmin?: boolean;
  canCreateSchool?: boolean;
  onSchoolRenamed?: (schoolId: string, updated: { namaSekolah: string; npsn: string }) => void;
  onRemoved?: (schoolId: string) => void;
  onOpenRestoreSchool?: () => void;
}

function formatDateId(val: any): string {
  const ms = toMillisSafe(val);
  if (!ms) return '-';
  return new Date(ms).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTimeId(val: any): string {
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

export const ManageSchoolsModal: React.FC<ManageSchoolsModalProps> = ({
  isOpen,
  onClose,
  user,
  schools,
  activeSchoolId,
  isSuperAdmin = false,
  canCreateSchool = true,
  onSchoolRenamed,
  onRemoved,
  onOpenRestoreSchool
}) => {
  const ownedSchools = useMemo(
    () => schools.filter((s) => s.role === 'owner'),
    [schools]
  );

  const [modalTab, setModalTab] = useState<'schools' | 'members'>('schools');
  const [selectedOwnerSchoolId, setSelectedOwnerSchoolId] = useState<string>('');

  // Tab 1: Daftar Sekolah state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNpsn, setEditNpsn] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legacyBackupCount, setLegacyBackupCount] = useState<number>(0);
  const [isConfirmingClearBackup, setIsConfirmingClearBackup] = useState<boolean>(false);
  const [backupClearedMessage, setBackupClearedMessage] = useState<string | null>(null);

  // Tab 2: Anggota & Kode Undangan & Email Undangan state
  const [members, setMembers] = useState<SchoolMember[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberBusyUid, setMemberBusyUid] = useState<string | null>(null);
  const [confirmKickUid, setConfirmKickUid] = useState<string | null>(null);

  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isCreatingInvite, setIsCreatingInvite] = useState<boolean>(false);
  const [latestInvite, setLatestInvite] = useState<SchoolInvite | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [myInvites, setMyInvites] = useState<SchoolInvite[]>([]);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);

  const [emailInviteInput, setEmailInviteInput] = useState<string>('');
  const [emailInviteRole, setEmailInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isSendingEmailInvite, setIsSendingEmailInvite] = useState<boolean>(false);
  const [emailInvites, setEmailInvites] = useState<EmailSchoolInvite[]>([]);
  const [emailInviteFeedback, setEmailInviteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [revokingEmailInviteId, setRevokingEmailInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setModalTab('schools');
      setEditingId(null);
      setConfirmRemoveId(null);
      setBusyId(null);
      setErrorMessage(null);
      setIsConfirmingClearBackup(false);
      setBackupClearedMessage(null);
      setLegacyBackupCount(countLegacyBackupKeys());
      setMembersError(null);
      setInvitesError(null);
      setLatestInvite(null);
      setCopiedCode(null);
      setConfirmKickUid(null);
      setInviteRole('editor');
      setEmailInviteInput('');
      setEmailInviteRole('editor');
      setEmailInviteFeedback(null);

      const activeIsOwned = ownedSchools.some((s) => s.schoolId === activeSchoolId);
      setSelectedOwnerSchoolId(
        activeIsOwned && activeSchoolId
          ? activeSchoolId
          : ownedSchools[0]?.schoolId || ''
      );
    }
  }, [isOpen, activeSchoolId, ownedSchools]);

  // Pastikan selectedOwnerSchoolId tetap valid jika daftar sekolah berubah
  useEffect(() => {
    if (ownedSchools.length === 0) {
      setModalTab('schools');
      setSelectedOwnerSchoolId('');
      return;
    }
    if (!ownedSchools.some((s) => s.schoolId === selectedOwnerSchoolId)) {
      const activeIsOwned = ownedSchools.some((s) => s.schoolId === activeSchoolId);
      setSelectedOwnerSchoolId(
        activeIsOwned && activeSchoolId ? activeSchoolId : ownedSchools[0].schoolId
      );
    }
  }, [ownedSchools, selectedOwnerSchoolId, activeSchoolId]);

  // Subscribe daftar anggota sekolah terpilih & daftar undangan milik user saat tab Anggota dibuka
  useEffect(() => {
    if (!isOpen || modalTab !== 'members' || !selectedOwnerSchoolId) return;

    setMembersLoading(true);
    setMembersError(null);
    setConfirmKickUid(null);

    const unsubMembers = subscribeSchoolMembers(
      selectedOwnerSchoolId,
      (list) => {
        setMembers(list);
        setMembersLoading(false);
      },
      (err) => {
        setMembersError(
          getFriendlyRegistryErrorMessage(err, 'Gagal memuat daftar anggota sekolah.')
        );
        setMembersLoading(false);
      }
    );

    const unsubInvites = subscribeMyInvites(
      user.uid,
      (list) => {
        setMyInvites(list);
        setInvitesError(null);
      },
      (err) => {
        setInvitesError(
          getFriendlyRegistryErrorMessage(err, 'Gagal memuat daftar kode undangan aktif.')
        );
      }
    );

    const unsubEmailInvites = subscribeSchoolEmailInvites(
      selectedOwnerSchoolId,
      user.uid,
      isSuperAdmin,
      (list) => {
        setEmailInvites(list);
      },
      (err) => {
        setEmailInviteFeedback({
          type: 'error',
          message: getFriendlyRegistryErrorMessage(
            err,
            'Gagal memuat daftar undangan email.'
          )
        });
      }
    );

    return () => {
      unsubMembers();
      unsubInvites();
      unsubEmailInvites();
    };
  }, [isOpen, modalTab, selectedOwnerSchoolId, user.uid, isSuperAdmin]);

  const selectedOwnerSchool = useMemo(
    () => ownedSchools.find((s) => s.schoolId === selectedOwnerSchoolId) || null,
    [ownedSchools, selectedOwnerSchoolId]
  );

  const activeInvitesForSchool = useMemo(() => {
    const now = Date.now();
    return myInvites.filter(
      (inv) =>
        inv.schoolId === selectedOwnerSchoolId &&
        toMillisSafe(inv.expiresAt) > now
    );
  }, [myInvites, selectedOwnerSchoolId]);

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

  const handleRoleChange = async (member: SchoolMember, newRole: 'editor' | 'viewer') => {
    if (!selectedOwnerSchoolId || member.uid === user.uid || member.role === newRole || memberBusyUid) {
      return;
    }
    setMemberBusyUid(member.uid);
    setMembersError(null);
    try {
      await updateSchoolMemberRole(selectedOwnerSchoolId, member.uid, newRole);
    } catch (err) {
      setMembersError(
        getFriendlyRegistryErrorMessage(err, 'Gagal mengubah peran anggota.')
      );
    } finally {
      setMemberBusyUid(null);
    }
  };

  const handleKickMember = async (member: SchoolMember) => {
    if (!selectedOwnerSchoolId || member.uid === user.uid || memberBusyUid) return;
    setMemberBusyUid(member.uid);
    setMembersError(null);
    try {
      await removeSchoolMember(selectedOwnerSchoolId, member.uid);
      setConfirmKickUid(null);
    } catch (err) {
      setMembersError(
        getFriendlyRegistryErrorMessage(err, 'Gagal mengeluarkan anggota dari sekolah.')
      );
    } finally {
      setMemberBusyUid(null);
    }
  };

  const handleCreateInvite = async () => {
    if (!selectedOwnerSchool || isCreatingInvite) return;
    setIsCreatingInvite(true);
    setInvitesError(null);
    try {
      const created = await createSchoolInvite(user, {
        schoolId: selectedOwnerSchool.schoolId,
        schoolName: selectedOwnerSchool.namaSekolah || 'Sekolah',
        role: inviteRole
      });
      setLatestInvite(created);
    } catch (err) {
      setInvitesError(
        getFriendlyRegistryErrorMessage(err, 'Gagal membuat kode undangan baru.')
      );
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleRevokeInvite = async (code: string) => {
    if (revokingCode) return;
    setRevokingCode(code);
    setInvitesError(null);
    try {
      await revokeInviteCode(code);
      if (latestInvite?.code === code) {
        setLatestInvite(null);
      }
    } catch (err) {
      setInvitesError(
        getFriendlyRegistryErrorMessage(err, 'Gagal mencabut kode undangan.')
      );
    } finally {
      setRevokingCode(null);
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerSchool || isSendingEmailInvite) return;

    const cleanEmail = normalizeEmail(emailInviteInput);
    if (!isValidEmailFormat(cleanEmail)) {
      setEmailInviteFeedback({
        type: 'error',
        message: 'Masukkan alamat email Google yang valid.'
      });
      return;
    }

    if (members.some((m) => normalizeEmail(m.email) === cleanEmail)) {
      setEmailInviteFeedback({
        type: 'error',
        message: `Email "${cleanEmail}" sudah menjadi anggota sekolah ini.`
      });
      return;
    }

    if (emailInvites.some((inv) => normalizeEmail(inv.email) === cleanEmail)) {
      setEmailInviteFeedback({
        type: 'error',
        message: `Undangan untuk "${cleanEmail}" sudah ada dalam daftar tunggu.`
      });
      return;
    }

    setIsSendingEmailInvite(true);
    setEmailInviteFeedback(null);
    try {
      await createEmailSchoolInvite(user, {
        schoolId: selectedOwnerSchool.schoolId,
        schoolName: selectedOwnerSchool.namaSekolah || 'Sekolah',
        npsn: selectedOwnerSchool.npsn || '',
        email: cleanEmail,
        role: emailInviteRole
      });
      setEmailInviteInput('');
      setEmailInviteFeedback({
        type: 'success',
        message: `Penugasan untuk "${cleanEmail}" (${getRoleLabel(emailInviteRole)}) berhasil dibuat. Saat akun tersebut login, sekolah ini otomatis ditambahkan.`
      });
    } catch (err) {
      setEmailInviteFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat undangan email.'
      });
    } finally {
      setIsSendingEmailInvite(false);
    }
  };

  const handleRevokeEmailInvite = async (inviteId: string) => {
    if (revokingEmailInviteId) return;
    setRevokingEmailInviteId(inviteId);
    setEmailInviteFeedback(null);
    try {
      await revokeEmailSchoolInvite(inviteId);
    } catch (err) {
      setEmailInviteFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membatalkan undangan email.'
      });
    } finally {
      setRevokingEmailInviteId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-schools-modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              {modalTab === 'members' ? (
                <Users className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 id="manage-schools-modal-title" className="text-base font-bold text-slate-900">
                Kelola Sekolah &amp; Tim
              </h2>
              <p className="text-xs text-slate-500">
                {modalTab === 'members'
                  ? 'Kelola anggota dan kode undangan sekali pakai (khusus Owner)'
                  : 'Ubah nama/NPSN (Owner & Editor) atau keluarkan dari daftar pribadi Anda'}
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

        {ownedSchools.length > 0 && (
          <div className="px-6 pt-3 pb-0 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModalTab('schools')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                modalTab === 'schools'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Daftar Sekolah ({schools.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('members')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                modalTab === 'members'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Anggota</span>
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-4">
          {modalTab === 'schools' && (
            <>
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
            </>
          )}

          {modalTab === 'members' && selectedOwnerSchool && (
            <div className="space-y-5">
              {/* Pemilih Sekolah (jika Owner memiliki lebih dari 1 sekolah) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${getSchoolAvatarColor(
                      selectedOwnerSchool.schoolId
                    )}`}
                  >
                    {getSchoolInitials(selectedOwnerSchool.namaSekolah)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedOwnerSchool.namaSekolah}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      NPSN: {selectedOwnerSchool.npsn || '-'}
                    </div>
                  </div>
                </div>

                {ownedSchools.length > 1 && (
                  <select
                    value={selectedOwnerSchoolId}
                    onChange={(e) => {
                      setSelectedOwnerSchoolId(e.target.value);
                      setLatestInvite(null);
                    }}
                    aria-label="Pilih sekolah yang dikelola"
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {ownedSchools.map((s) => (
                      <option key={s.schoolId} value={s.schoolId}>
                        {s.namaSekolah} ({s.npsn || '-'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bagian 1A: Undang Langsung via Email Terdaftar */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Tugaskan Anggota via Email Terdaftar
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Otomatis masuk saat login
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {emailInviteFeedback && (
                    <div
                      role={emailInviteFeedback.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                        emailInviteFeedback.type === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {emailInviteFeedback.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <span>{emailInviteFeedback.message}</span>
                    </div>
                  )}

                  <form
                    onSubmit={handleSendEmailInvite}
                    className="flex flex-col sm:flex-row sm:items-end gap-2.5"
                  >
                    <div className="flex-1">
                      <label
                        htmlFor="direct-email-invite-input"
                        className="block text-[11px] font-semibold text-slate-600 mb-1"
                      >
                        Email Google Anggota
                      </label>
                      <input
                        id="direct-email-invite-input"
                        type="email"
                        value={emailInviteInput}
                        onChange={(e) => setEmailInviteInput(e.target.value)}
                        disabled={isSendingEmailInvite}
                        placeholder="operator@gmail.com"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:w-36">
                      <label
                        htmlFor="direct-email-invite-role"
                        className="block text-[11px] font-semibold text-slate-600 mb-1"
                      >
                        Peran
                      </label>
                      <select
                        id="direct-email-invite-role"
                        value={emailInviteRole}
                        onChange={(e) =>
                          setEmailInviteRole(e.target.value as 'editor' | 'viewer')
                        }
                        disabled={isSendingEmailInvite}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingEmailInvite || !emailInviteInput.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {isSendingEmailInvite ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Tugaskan Email</span>
                    </button>
                  </form>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pastikan alamat email tersebut sudah didaftarkan di daftar pengguna sistem oleh Admin. Saat login dengan Google, sekolah ini otomatis ditambahkan ke akun mereka tanpa perlu kode undangan.
                  </p>

                  {emailInvites.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-600">
                        Menunggu Login Anggota ({emailInvites.length})
                      </div>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {emailInvites.map((inv) => (
                          <div
                            key={inv.id}
                            className="px-3 py-2 bg-white flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {inv.email}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  inv.role === 'editor'
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {getRoleLabel(inv.role)}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={revokingEmailInviteId === inv.id}
                              onClick={() => void handleRevokeEmailInvite(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 cursor-pointer disabled:opacity-50"
                            >
                              {revokingEmailInviteId === inv.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>Batalkan</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bagian 1B: Buat Kode Undangan */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Buat Kode Undangan
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Sekali pakai &bull; Berlaku 7 hari
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  {invitesError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{invitesError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor="invite-role-select"
                        className="block text-[11px] font-semibold text-slate-600 mb-1"
                      >
                        Peran Anggota Baru
                      </label>
                      <select
                        id="invite-role-select"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                        disabled={isCreatingInvite}
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                      >
                        <option value="editor">Editor (Dapat melihat &amp; mengubah data)</option>
                        <option value="viewer">Viewer (Hanya lihat &amp; cetak)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isCreatingInvite}
                      onClick={() => void handleCreateInvite()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {isCreatingInvite ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Buat Kode Undangan</span>
                    </button>
                  </div>

                  {latestInvite && latestInvite.schoolId === selectedOwnerSchoolId && (
                    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/70 p-4 text-center space-y-2.5">
                      <div className="text-[11px] font-semibold text-emerald-800">
                        Kode Undangan ({getRoleLabel(latestInvite.role)}) Berhasil Dibuat
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-[0.22em] text-slate-900 select-all py-1">
                        {latestInvite.code}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => void handleCopyCode(latestInvite.code)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {copiedCode === latestInvite.code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>
                        <span className="text-[11px] text-slate-600">
                          Berlaku s.d. {formatDateTimeId(latestInvite.expiresAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Daftar Kode Aktif Milik Saya */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600">
                      Kode Undangan Aktif ({activeInvitesForSchool.length})
                    </div>
                    {activeInvitesForSchool.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Belum ada kode undangan aktif untuk sekolah ini.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                        {activeInvitesForSchool.map((inv) => (
                          <div
                            key={inv.code}
                            className="px-3 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-bold text-sm tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                {inv.code}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      inv.role === 'editor'
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                  >
                                    {getRoleLabel(inv.role)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Kedaluwarsa: {formatDateTimeId(inv.expiresAt)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleCopyCode(inv.code)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              >
                                {copiedCode === inv.code ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={revokingCode === inv.code}
                                onClick={() => void handleRevokeInvite(inv.code)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 cursor-pointer disabled:opacity-50"
                              >
                                {revokingCode === inv.code ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                <span>Cabut</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bagian 2: Daftar Anggota */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Daftar Anggota ({members.length})
                    </h3>
                  </div>
                </div>

                {membersError && (
                  <div
                    role="alert"
                    className="m-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{membersError}</span>
                  </div>
                )}

                {membersLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Memuat daftar anggota...</span>
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Belum ada data anggota.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {members.map((member) => {
                      const isSelf = member.uid === user.uid;
                      const isBusy = memberBusyUid === member.uid;
                      const isConfirmKick = confirmKickUid === member.uid;

                      return (
                        <div key={member.uid} className="p-3.5 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {member.displayName || member.email || 'Pengguna'}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {member.email || '-'}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Bergabung: {formatDateId(member.addedAt)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isSelf || member.role === 'owner' ? (
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {getRoleLabel(member.role)}
                                </span>
                              ) : (
                                <>
                                  <select
                                    value={member.role === 'editor' ? 'editor' : 'viewer'}
                                    disabled={isBusy}
                                    onChange={(e) =>
                                      void handleRoleChange(
                                        member,
                                        e.target.value as 'editor' | 'viewer'
                                      )
                                    }
                                    aria-label={`Ubah peran ${member.displayName || member.email}`}
                                    className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer disabled:opacity-50"
                                  >
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                  </select>

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      setConfirmKickUid(isConfirmKick ? null : member.uid)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                    <span>Keluarkan</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isConfirmKick && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs text-amber-900">
                                Keluarkan <strong>{member.displayName || member.email}</strong> dari sekolah ini?
                              </span>
                              <div className="flex items-center gap-2 justify-end shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmKickUid(null)}
                                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleKickMember(member)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-60"
                                >
                                  {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
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
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {modalTab === 'schools' && canCreateSchool && onOpenRestoreSchool && (
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

            {modalTab === 'schools' && legacyBackupCount > 0 && (
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
