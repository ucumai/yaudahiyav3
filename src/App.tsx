/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, LogOut, RefreshCw, X } from 'lucide-react';
import { useFirebaseUser } from './hooks/useFirebaseUser';
import { LoginScreen } from './components/auth/LoginScreen';
import { SchoolOnboarding } from './components/auth/SchoolOnboarding';
import { SchoolWorkspace, ExternalSchoolRename } from './SchoolWorkspace';
import { AddSchoolModal } from './components/school/AddSchoolModal';
import { ManageSchoolsModal } from './components/school/ManageSchoolsModal';
import { RestoreSchoolModal } from './components/school/RestoreSchoolModal';
import { getFriendlyRegistryErrorMessage, subscribeMySchools } from './lib/schoolRegistry';
import { clearAllBospStorage } from './lib/schoolStorage';
import { logoutGoogle } from './lib/firebase';
import { SchoolSummary } from './types';

function getLastSchoolStorageKey(uid: string): string {
  return `bosp:lastSchool:${uid}`;
}

interface PendingSchoolState {
  schoolId: string;
  namaSekolah: string;
}

export default function App() {
  const { user: firebaseUser, loading: authLoading } = useFirebaseUser();
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState<boolean>(true);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [pendingSchool, setPendingSchool] = useState<PendingSchoolState | null>(null);
  const [pendingSchoolTimeoutError, setPendingSchoolTimeoutError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [externalRename, setExternalRename] = useState<ExternalSchoolRename | null>(null);
  const [restoreBanner, setRestoreBanner] = useState<{
    type: 'success' | 'warning';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setSchools([]);
      setSchoolsLoading(false);
      setSchoolsError(null);
      setSelectedSchoolId(null);
      setPendingSchool(null);
      setPendingSchoolTimeoutError(null);
      setIsAddModalOpen(false);
      setIsManageModalOpen(false);
      setIsRestoreModalOpen(false);
      setRestoreBanner(null);
      document.title = 'Ekstraktor RKAS & BKU BOSP';
      return;
    }

    setSchoolsLoading(true);
    setSchoolsError(null);
    try {
      const saved = localStorage.getItem(getLastSchoolStorageKey(firebaseUser.uid));
      setSelectedSchoolId((prev) => prev || saved || null);
    } catch {
      // ignore
    }

    const unsubscribe = subscribeMySchools(
      firebaseUser.uid,
      (list) => {
        setSchools(list);
        setSchoolsError(null);
        setSchoolsLoading(false);
      },
      (err) => {
        console.warn('Gagal berlangganan daftar sekolah:', err);
        setSchoolsError(
          getFriendlyRegistryErrorMessage(err, 'Gagal memuat daftar sekolah.')
        );
        setSchoolsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [firebaseUser?.uid, retryKey]);

  // Pantau kemunculan sekolah baru/pulihan di snapshot daftar sekolah (batas tunggu 8 detik)
  useEffect(() => {
    if (!pendingSchool) {
      setPendingSchoolTimeoutError(null);
      return;
    }

    const foundInList = schools.some((s) => s.schoolId === pendingSchool.schoolId);
    if (foundInList) {
      setPendingSchool(null);
      setPendingSchoolTimeoutError(null);
      return;
    }

    const timer = setTimeout(() => {
      setPendingSchoolTimeoutError(
        'Sekolah dibuat tetapi daftar belum bisa dimuat. Periksa Firestore Rules (users/{uid}/mySchools harus mengizinkan read untuk pemilik).'
      );
    }, 8000);

    return () => clearTimeout(timer);
  }, [pendingSchool, schools, retryKey]);

  const activeSchool = useMemo(() => {
    if (schools.length === 0) return null;
    if (selectedSchoolId) {
      const matched = schools.find((s) => s.schoolId === selectedSchoolId);
      if (matched) return matched;
    }
    return schools[0];
  }, [schools, selectedSchoolId]);

  const isWaitingPendingSchool = Boolean(
    pendingSchool && !schools.some((s) => s.schoolId === pendingSchool.schoolId)
  );

  useEffect(() => {
    if (!authLoading && firebaseUser && !schoolsLoading && !schoolsError && !activeSchool && !isWaitingPendingSchool) {
      document.title = 'Pilih Sekolah - LPJ Revitalisasi';
    }
  }, [authLoading, firebaseUser, schoolsLoading, schoolsError, activeSchool, isWaitingPendingSchool]);

  const handleSwitchSchool = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    if (firebaseUser) {
      try {
        localStorage.setItem(getLastSchoolStorageKey(firebaseUser.uid), schoolId);
      } catch {
        // ignore
      }
    }
  };

  const handleRetrySchools = () => {
    setSchoolsError(null);
    setPendingSchoolTimeoutError(null);
    setRetryKey((prev) => prev + 1);
  };

  const handleOnboardingLogout = async () => {
    clearAllBospStorage();
    await logoutGoogle();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-600">Memuat aplikasi...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginScreen />;
  }

  if (schoolsLoading && !isWaitingPendingSchool) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="mt-4 text-sm font-medium text-slate-600">Memuat daftar sekolah...</p>
      </div>
    );
  }

  if (schoolsError) {
    return (
      <div className="min-h-screen w-full bg-slate-100/80 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-rose-200 p-7 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Gagal Memuat Daftar Sekolah
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-rose-800 leading-relaxed">
                {schoolsError}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => void handleOnboardingLogout()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
            <button
              type="button"
              onClick={handleRetrySchools}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba lagi</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isWaitingPendingSchool && pendingSchool) {
    if (pendingSchoolTimeoutError) {
      return (
        <div className="min-h-screen w-full bg-slate-100/80 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-amber-200 p-7 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Daftar Sekolah Belum Terbaca
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
                  {pendingSchoolTimeoutError}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => void handleOnboardingLogout()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
              <button
                type="button"
                onClick={handleRetrySchools}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba lagi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-11 h-11 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="mt-4 text-base font-bold text-slate-900">
          Memuat {pendingSchool.namaSekolah || 'sekolah baru'}...
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Menunggu sinkronisasi daftar sekolah dari cloud
        </p>
      </div>
    );
  }

  return (
    <>
      {restoreBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md no-print">
          <div
            role="status"
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs shadow-xl ${
              restoreBanner.type === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-950'
                : 'border-emerald-300 bg-emerald-50 text-emerald-950'
            }`}
          >
            {restoreBanner.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed flex-1">{restoreBanner.message}</span>
            <button
              type="button"
              onClick={() => setRestoreBanner(null)}
              className="p-0.5 rounded hover:bg-black/5 cursor-pointer shrink-0"
              aria-label="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {!activeSchool ? (
        <SchoolOnboarding
          user={firebaseUser}
          onOpenAddSchool={() => setIsAddModalOpen(true)}
          onOpenRestoreSchool={() => setIsRestoreModalOpen(true)}
          onLogout={() => void handleOnboardingLogout()}
        />
      ) : (
        <SchoolWorkspace
          key={activeSchool.schoolId}
          schoolId={activeSchool.schoolId}
          role={activeSchool.role}
          user={firebaseUser}
          onSwitchSchool={handleSwitchSchool}
          schools={schools}
          onOpenAddSchool={() => setIsAddModalOpen(true)}
          onOpenManageSchools={() => setIsManageModalOpen(true)}
          externalRename={externalRename}
        />
      )}

      <AddSchoolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        user={firebaseUser}
        schools={schools}
        onCreated={(newSchoolId, namaSekolah) => {
          setPendingSchoolTimeoutError(null);
          setPendingSchool({ schoolId: newSchoolId, namaSekolah });
          handleSwitchSchool(newSchoolId);
        }}
      />

      <RestoreSchoolModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        user={firebaseUser}
        onRestored={(restoredSchoolId, info) => {
          setPendingSchoolTimeoutError(null);
          setPendingSchool({ schoolId: restoredSchoolId, namaSekolah: info.namaSekolah });
          handleSwitchSchool(restoredSchoolId);
          if (info.migration.status === 'npsn_mismatch') {
            setRestoreBanner({
              type: 'warning',
              message: `Sekolah "${info.namaSekolah}" (NPSN ${info.npsn}) berhasil dipulihkan. Namun cache lokal lama di browser ini milik NPSN berbeda (${info.migration.localNpsn}), sehingga cache lokal lama tidak disalin.`
            });
          } else if (info.migration.status === 'migrated') {
            setRestoreBanner({
              type: 'success',
              message: `Sekolah "${info.namaSekolah}" berhasil dipulihkan dan ${info.migration.copiedCount} cache lokal lama telah dipindahkan.`
            });
          } else {
            setRestoreBanner({
              type: 'success',
              message: `Sekolah "${info.namaSekolah}" (NPSN ${info.npsn}) berhasil dipulihkan ke akun Anda.`
            });
          }
        }}
      />

      <ManageSchoolsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        user={firebaseUser}
        schools={schools}
        activeSchoolId={activeSchool?.schoolId || null}
        onOpenRestoreSchool={() => setIsRestoreModalOpen(true)}
        onSchoolRenamed={(schoolId, updated) => {
          setExternalRename((prev) => ({
            schoolId,
            namaSekolah: updated.namaSekolah,
            npsn: updated.npsn,
            version: (prev?.version || 0) + 1
          }));
        }}
        onRemoved={(removedId) => {
          if (selectedSchoolId === removedId) {
            const nextSchool = schools.find((s) => s.schoolId !== removedId);
            if (nextSchool) {
              handleSwitchSchool(nextSchool.schoolId);
            } else {
              setSelectedSchoolId(null);
            }
          }
        }}
      />
    </>
  );
}
