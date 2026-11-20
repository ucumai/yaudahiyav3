import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionTable } from './components/TransactionTable';
import { FileUploadSection } from './components/FileUploadSection';
import { KwitansiManager } from './components/KwitansiManager';
import { SpjManager, SpjSubTab } from './components/spj/SpjManager';
import { MasterDataManager } from './components/master/MasterDataManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { JsonViewerModal } from './components/JsonViewerModal';
import { UploadModal } from './components/UploadModal';
import { TwelveMonthGrid } from './components/TwelveMonthGrid';
import { initialSchoolMaster } from './data/masterData';
import {
  TransaksiBKU,
  SchoolMetadata,
  MasterGuru,
  MasterSiswa,
  MasterEskul,
  MonthlyArchive,
  RKASItem,
  SchoolRole,
  SchoolSummary
} from './types';
import {
  MONTH_NAMES_ID,
  detectMonthYearFromData,
  createMonthlyArchive
} from './utils/monthArchiveUtils';
import { ensureTransactionsClassification } from './utils/klasifikasiSpjHelper';
import { AlertCircle, CheckCircle2, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { testFirestoreConnection, initAuth, googleSignIn, logoutGoogle } from './lib/firebase';
import { User } from 'firebase/auth';
import { SchoolContext } from './context/SchoolContext';
import { readLS, writeLS, removeLS, hasSchoolLocalCache, clearAllBospStorage } from './lib/schoolStorage';
import { renameSchoolInRegistry } from './lib/schoolRegistry';
import {
  findSchoolDatabaseFile,
  loadSchoolDataFromDrive,
  saveSchoolDataToDrive,
  triggerDebouncedDriveSave,
  isExistingDriveUser,
  setSavedDriveConnected,
  clearSavedDriveConnection,
  DriveRealtimeStatus,
  GoogleDriveFileInfo,
  SchoolDatabasePayload
} from './lib/googleDriveSync';
import {
  CloudSyncStatus,
  debounceSaveToFirestore,
  fetchSchoolDataFromCloud,
  flushPendingSaves,
  hasPendingSaves
} from './lib/firebaseSync';

export interface ExternalSchoolRename {
  schoolId: string;
  namaSekolah: string;
  npsn: string;
  version: number;
}

export interface SchoolWorkspaceProps {
  schoolId: string;
  role: SchoolRole;
  user: User;
  onSwitchSchool: (schoolId: string) => void;
  schools: SchoolSummary[];
  onOpenAddSchool: () => void;
  onOpenManageSchools: () => void;
  externalRename?: ExternalSchoolRename | null;
}

const EMPTY_MONTHLY_STORE: Record<number, MonthlyArchive | null> = {
  1: null, 2: null, 3: null, 4: null, 5: null, 6: null,
  7: null, 8: null, 9: null, 10: null, 11: null, 12: null
};

const sanitizeTeachers = (list: any[]): MasterGuru[] => {
  return (list || []).map((t) => {
    const { tugasTambahan, golongan, noHp, noRekening, bank, ...rest } = t;
    return rest as MasterGuru;
  });
};

export function SchoolWorkspace(props: SchoolWorkspaceProps) {
  const {
    schoolId,
    role,
    user,
    onSwitchSchool,
    schools,
    onOpenAddSchool,
    onOpenManageSchools,
    externalRename
  } = props;
  const readOnly = role === 'viewer';
  const activeSummary = schools.find((s) => s.schoolId === schoolId);

  const defaultMetadata: SchoolMetadata = {
    ...initialSchoolMaster,
    namaSekolah: activeSummary?.namaSekolah || '',
    npsn: activeSummary?.npsn || ''
  };

  // 12-Month Store: Maps month index (1 to 12) to MonthlyArchive
  const [monthlyStore, setMonthlyStore] = useState<Record<number, MonthlyArchive | null>>(() => {
    const saved = readLS<Record<number, MonthlyArchive | null> | null>(schoolId, '12months_archive_v3', null);
    if (saved && typeof saved === 'object') {
      return { ...EMPTY_MONTHLY_STORE, ...saved };
    }
    return { ...EMPTY_MONTHLY_STORE };
  });

  // Active Month Index (1 = Januari ... 12 = Desember)
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(() => {
    const saved = readLS<number>(schoolId, 'active_month_index', 2);
    return typeof saved === 'number' && saved >= 1 && saved <= 12 ? saved : 2;
  });

  const [data, setData] = useState<TransaksiBKU[]>(() => {
    const savedStore = readLS<Record<number, MonthlyArchive | null> | null>(schoolId, '12months_archive_v3', null);
    const savedMonth = readLS<number>(schoolId, 'active_month_index', 2);
    const monthNum = typeof savedMonth === 'number' && savedMonth >= 1 && savedMonth <= 12 ? savedMonth : 2;
    if (savedStore && savedStore[monthNum]?.data && Array.isArray(savedStore[monthNum]?.data)) {
      return ensureTransactionsClassification(savedStore[monthNum]!.data);
    }
    const saved = readLS<TransaksiBKU[]>(schoolId, 'bku_transactions', []);
    return Array.isArray(saved) ? ensureTransactionsClassification(saved) : [];
  });

  const [metadata, setMetadata] = useState<SchoolMetadata>(() => {
    const saved = readLS<Partial<SchoolMetadata> | null>(schoolId, 'school_metadata', null);
    if (saved && typeof saved === 'object') {
      return {
        ...defaultMetadata,
        ...saved,
        namaSekolah: saved.namaSekolah || defaultMetadata.namaSekolah,
        npsn: saved.npsn || defaultMetadata.npsn,
        logoUrl: saved.logoUrl || defaultMetadata.logoUrl
      };
    }
    return defaultMetadata;
  });

  const [teachers, setTeachers] = useState<MasterGuru[]>(() => {
    const saved = readLS<MasterGuru[]>(schoolId, 'master_teachers', []);
    return Array.isArray(saved) ? sanitizeTeachers(saved) : [];
  });

  const [students, setStudents] = useState<MasterSiswa[]>(() => {
    const saved = readLS<MasterSiswa[]>(schoolId, 'master_students', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [eskulList, setEskulList] = useState<MasterEskul[]>(() => {
    const saved = readLS<MasterEskul[]>(schoolId, 'master_eskul', []);
    return Array.isArray(saved) ? saved : [];
  });

  // Narrow focus defaults: Pengolah BKU & RKAS and LPJ ALKEB & ATK
  const [activeTab, setActiveTab] = useState<ActiveTab>('processor');
  const [activeSpjSubTab, setActiveSpjSubTab] = useState<SpjSubTab>('lpj-alkeb-atk');
  const [selectedSpjEskulId, setSelectedSpjEskulId] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [isCopied, setIsCopied] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Cloud Database Synchronization State (Firebase Firestore)
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);
  const [isInitialCloudLoaded, setIsInitialCloudLoaded] = useState(false);

  // Tahap 3: Safe switch confirmation & shared-computer safe logout modal states
  const [pendingSwitchTargetId, setPendingSwitchTargetId] = useState<string | null>(null);
  const [isFlushingSwitch, setIsFlushingSwitch] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Track last known registry namaSekolah & npsn so we don't trigger redundant registry updates
  const lastRegistryIdentityRef = useRef<{ namaSekolah: string; npsn: string }>({
    namaSekolah: (activeSummary?.namaSekolah || metadata.namaSekolah || '').trim(),
    npsn: (activeSummary?.npsn || metadata.npsn || '').trim()
  });

  // Opsi 3: Google Drive Pribadi Sekolah Synchronization State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState<boolean>(false);
  const [driveRealtimeStatus, setDriveRealtimeStatus] = useState<DriveRealtimeStatus>('idle');
  const [lastDriveSync, setLastDriveSync] = useState<Date | null>(null);
  const [driveFile, setDriveFile] = useState<GoogleDriveFileInfo | null>(null);
  const [isExistingUser, setIsExistingUser] = useState<boolean>(() => isExistingDriveUser());
  const [isDriveReconnecting, setIsDriveReconnecting] = useState<boolean>(false);
  const isInitialDriveLoadComplete = useRef<boolean>(false);

  const activeDisplayName = (metadata.namaSekolah || activeSummary?.namaSekolah || 'Sekolah').trim();

  // Indikator anti-salah-sekolah pada tab browser
  useEffect(() => {
    document.title = `${activeDisplayName} - LPJ Revitalisasi`;
  }, [activeDisplayName]);

  // Terima pembaruan nama/NPSN apabila sekolah aktif diubah lewat ManageSchoolsModal
  useEffect(() => {
    if (!externalRename || externalRename.schoolId !== schoolId) return;
    lastRegistryIdentityRef.current = {
      namaSekolah: externalRename.namaSekolah,
      npsn: externalRename.npsn
    };
    setMetadata((prev) => ({
      ...prev,
      namaSekolah: externalRename.namaSekolah,
      npsn: externalRename.npsn
    }));
  }, [externalRename, schoolId]);

  // Flush pending debounced Firestore saves for this school on unmount
  useEffect(() => {
    return () => {
      if (!readOnly) {
        void flushPendingSaves(schoolId);
      }
    };
  }, [schoolId, readOnly]);

  // Inisialisasi Auth State Google Drive & Auto-Connect untuk Pengguna Lama (hanya untuk sekolah aktif)
  useEffect(() => {
    let isMounted = true;
    const legacyNpsn = (activeSummary?.npsn || metadata.npsn || '').trim();

    const unsubscribe = initAuth(
      async (driveUser, token) => {
        if (!isMounted) return;
        setCurrentUser(driveUser);
        setAccessToken(token);
        setIsExistingUser(true);
        setIsDriveReconnecting(false);

        // Cari file database sekolah di Google Drive berdasarkan schoolId permanen
        try {
          setIsDriveSyncing(true);
          setDriveRealtimeStatus('syncing');
          const found = await findSchoolDatabaseFile(token, schoolId, legacyNpsn);
          if (!isMounted) return;
          if (found) {
            setDriveFile(found);
            setSavedDriveConnected(driveUser, found.id, schoolId);
            if (!isInitialDriveLoadComplete.current) {
              const remoteData = await loadSchoolDataFromDrive(token, found.id);
              if (!isMounted) return;
              if (remoteData && (!remoteData.schoolId || remoteData.schoolId === schoolId)) {
                if (remoteData.metadata) setMetadata((prev) => ({ ...prev, ...remoteData.metadata }));
                if (Array.isArray(remoteData.teachers)) setTeachers(sanitizeTeachers(remoteData.teachers));
                if (Array.isArray(remoteData.students)) setStudents(remoteData.students);
                if (Array.isArray(remoteData.eskulList)) setEskulList(remoteData.eskulList);
                if (remoteData.monthlyStore && typeof remoteData.monthlyStore === 'object') {
                  setMonthlyStore(remoteData.monthlyStore);
                  const currentMonthArchive = remoteData.monthlyStore[remoteData.activeMonthIndex || activeMonthIndex];
                  if (currentMonthArchive && currentMonthArchive.data) {
                    setData(ensureTransactionsClassification(currentMonthArchive.data));
                  }
                }
                if (remoteData.activeMonthIndex !== undefined) setActiveMonthIndex(remoteData.activeMonthIndex);
                setLastDriveSync(new Date(found.modifiedTime || Date.now()));
                setDriveRealtimeStatus('synced');
              }
            }
          }
        } catch (err: any) {
          console.warn('Auto fetch Google Drive error:', err);
        } finally {
          if (isMounted) {
            setIsDriveSyncing(false);
          }
          isInitialDriveLoadComplete.current = true;
        }
      },
      () => {
        if (!isMounted) return;
        setCurrentUser(null);
        setAccessToken(null);
        setDriveFile(null);
        setIsDriveReconnecting(false);
        setDriveRealtimeStatus('idle');
      },
      () => {
        if (!isMounted) return;
        setIsDriveReconnecting(true);
      }
    );
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [schoolId]);

  // Realtime Autosave ke Google Drive Sekolah aktif setiap kali data berubah (dilewati saat readOnly / sebelum cloud siap)
  useEffect(() => {
    if (!currentUser || !accessToken || !isInitialDriveLoadComplete.current || !isInitialCloudLoaded || readOnly) {
      return;
    }

    const payload: SchoolDatabasePayload = {
      version: '1.0',
      app: 'SPJ & BKU BOSP',
      schoolId,
      npsn: metadata.npsn || 'default',
      namaSekolah: metadata.namaSekolah || 'Sekolah',
      lastUpdated: new Date().toISOString(),
      metadata,
      teachers,
      students,
      eskulList,
      monthlyStore,
      activeMonthIndex
    };

    setIsDriveSyncing(true);
    setDriveRealtimeStatus('syncing');

    triggerDebouncedDriveSave(
      accessToken,
      payload,
      driveFile?.id,
      (status, file) => {
        setDriveRealtimeStatus(status);
        if (file) {
          setDriveFile(file);
          setLastDriveSync(new Date());
        }
        if (status === 'synced') {
          setIsDriveSyncing(false);
        } else if (status === 'unauthorized') {
          setIsDriveSyncing(false);
          setAccessToken(null);
        } else if (status === 'error') {
          setIsDriveSyncing(false);
        }
      },
      1500
    );
  }, [
    data,
    teachers,
    students,
    eskulList,
    monthlyStore,
    metadata,
    activeMonthIndex,
    currentUser,
    accessToken,
    driveFile?.id,
    schoolId,
    readOnly
  ]);

  // Handler Login Akun Google Sekolah (Pengguna baru atau re-koneksi manual)
  const handleDriveLogin = async () => {
    setIsDriveSyncing(true);
    setDriveRealtimeStatus('syncing');
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        setIsExistingUser(true);
        setIsDriveReconnecting(false);

        const found = await findSchoolDatabaseFile(
          res.accessToken,
          schoolId,
          metadata.npsn || activeSummary?.npsn
        );
        if (found) {
          setDriveFile(found);
          setSavedDriveConnected(res.user, found.id, schoolId);
          const remoteData = await loadSchoolDataFromDrive(res.accessToken, found.id);
          if (remoteData && (!remoteData.schoolId || remoteData.schoolId === schoolId)) {
            if (remoteData.metadata) setMetadata((prev) => ({ ...prev, ...remoteData.metadata }));
            if (Array.isArray(remoteData.teachers)) setTeachers(sanitizeTeachers(remoteData.teachers));
            if (Array.isArray(remoteData.students)) setStudents(remoteData.students);
            if (Array.isArray(remoteData.eskulList)) setEskulList(remoteData.eskulList);
            if (remoteData.monthlyStore && typeof remoteData.monthlyStore === 'object') {
              setMonthlyStore(remoteData.monthlyStore);
              const currentMonthArchive = remoteData.monthlyStore[remoteData.activeMonthIndex || activeMonthIndex];
              if (currentMonthArchive && currentMonthArchive.data) {
                setData(ensureTransactionsClassification(currentMonthArchive.data));
              }
            }
            if (remoteData.activeMonthIndex !== undefined) setActiveMonthIndex(remoteData.activeMonthIndex);
          }
          setLastDriveSync(new Date());
          setDriveRealtimeStatus('synced');
        } else if (!readOnly) {
          const payload: SchoolDatabasePayload = {
            version: '1.0',
            app: 'SPJ & BKU BOSP',
            schoolId,
            npsn: metadata.npsn || 'default',
            namaSekolah: metadata.namaSekolah || 'Sekolah',
            lastUpdated: new Date().toISOString(),
            metadata,
            teachers,
            students,
            eskulList,
            monthlyStore,
            activeMonthIndex
          };
          const created = await saveSchoolDataToDrive(res.accessToken, payload, null, schoolId);
          setDriveFile(created);
          setSavedDriveConnected(res.user, created.id, schoolId);
          setLastDriveSync(new Date());
          setDriveRealtimeStatus('synced');
        } else {
          setSavedDriveConnected(res.user, null, schoolId);
          setDriveRealtimeStatus('idle');
        }
        isInitialDriveLoadComplete.current = true;
      }
    } catch (err) {
      console.error('Login Drive gagal:', err);
      setDriveRealtimeStatus('error');
      throw err;
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Handler Logout Akun Google
  const handleDriveLogout = async () => {
    await logoutGoogle();
    clearSavedDriveConnection(schoolId);
    setCurrentUser(null);
    setAccessToken(null);
    setDriveFile(null);
    setIsExistingUser(false);
    setDriveRealtimeStatus('idle');
    isInitialDriveLoadComplete.current = false;
  };

  // Handler Menyimpan State Saat Ini ke Google Drive Sekolah (Manual fallback)
  const handleSaveToDrive = async () => {
    if (readOnly) {
      throw new Error('Mode lihat saja — akses Viewer tidak dapat menyimpan perubahan ke Google Drive.');
    }
    if (!accessToken) {
      throw new Error('Silakan masuk dengan Akun Google Sekolah terlebih dahulu.');
    }
    setIsDriveSyncing(true);
    setDriveRealtimeStatus('syncing');
    try {
      const payload: SchoolDatabasePayload = {
        version: '1.0',
        app: 'SPJ & BKU BOSP',
        schoolId,
        npsn: metadata.npsn || 'default',
        namaSekolah: metadata.namaSekolah || 'Sekolah',
        lastUpdated: new Date().toISOString(),
        metadata,
        teachers,
        students,
        eskulList,
        monthlyStore,
        activeMonthIndex
      };

      const result = await saveSchoolDataToDrive(accessToken, payload, driveFile?.id, schoolId);
      setDriveFile(result);
      setSavedDriveConnected(currentUser || {}, result.id, schoolId);
      setLastDriveSync(new Date());
      setDriveRealtimeStatus('synced');
    } catch (err: any) {
      console.error('Gagal menyimpan ke Google Drive:', err);
      setDriveRealtimeStatus('error');
      if (err?.message === 'UNAUTHORIZED') {
        await handleDriveLogin();
      }
      throw err;
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Handler Memuat / Memulihkan Data dari File Database Google Drive Sekolah (Manual fallback)
  const handlePullFromDrive = async () => {
    if (!accessToken) {
      throw new Error('Silakan masuk dengan Akun Google Sekolah terlebih dahulu.');
    }
    setIsDriveSyncing(true);
    setDriveRealtimeStatus('syncing');
    try {
      let targetFile = driveFile;
      if (!targetFile) {
        targetFile = await findSchoolDatabaseFile(
          accessToken,
          schoolId,
          metadata.npsn || activeSummary?.npsn
        );
      }

      if (!targetFile) {
        throw new Error(`Belum ditemukan file database "bosp_database_${schoolId || 'default'}.json" di Google Drive akun ini.`);
      }

      const remoteData = await loadSchoolDataFromDrive(accessToken, targetFile.id);
      if (remoteData) {
        if (remoteData.schoolId && remoteData.schoolId !== schoolId) {
          throw new Error('File database Google Drive ini milik sekolah lain dan tidak dapat dimuat ke sekolah aktif.');
        }
        if (remoteData.metadata) setMetadata((prev) => ({ ...prev, ...remoteData.metadata }));
        if (Array.isArray(remoteData.teachers)) setTeachers(sanitizeTeachers(remoteData.teachers));
        if (Array.isArray(remoteData.students)) setStudents(remoteData.students);
        if (Array.isArray(remoteData.eskulList)) setEskulList(remoteData.eskulList);
        if (remoteData.monthlyStore && typeof remoteData.monthlyStore === 'object') {
          setMonthlyStore(remoteData.monthlyStore);
          const currentMonthArchive = remoteData.monthlyStore[remoteData.activeMonthIndex || activeMonthIndex];
          if (currentMonthArchive && currentMonthArchive.data) {
            setData(ensureTransactionsClassification(currentMonthArchive.data));
          }
        }
        if (remoteData.activeMonthIndex !== undefined) setActiveMonthIndex(remoteData.activeMonthIndex);

        setDriveFile(targetFile);
        setSavedDriveConnected(currentUser || {}, targetFile.id, schoolId);
        setLastDriveSync(new Date());
        setDriveRealtimeStatus('synced');
      }
    } catch (err: any) {
      console.error('Gagal memuat data dari Google Drive:', err);
      setDriveRealtimeStatus('error');
      throw err;
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // 1. Initial Cloud Boot: Baca Firestore untuk schoolId aktif
  useEffect(() => {
    if (!user) {
      setIsInitialCloudLoaded(false);
      return;
    }

    let isMounted = true;

    async function initCloudSync() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isMounted) {
          setSyncStatus('offline');
          setIsInitialCloudLoaded(true);
        }
        return;
      }

      setSyncStatus('syncing');
      const isConnected = await testFirestoreConnection();
      if (!isMounted) return;

      if (!isConnected) {
        setSyncStatus('offline');
        setIsInitialCloudLoaded(true);
        return;
      }

      try {
        const cloudData = await fetchSchoolDataFromCloud(schoolId);
        if (!isMounted) return;

        const hasAnyCloudData = Boolean(
          cloudData && (cloudData.teachers || cloudData.metadata || cloudData.monthlyStore)
        );

        if (hasAnyCloudData && cloudData) {
          if (cloudData.metadata) {
            const loadedName = (cloudData.metadata.namaSekolah ?? activeSummary?.namaSekolah ?? '').trim();
            const loadedNpsn = (cloudData.metadata.npsn ?? activeSummary?.npsn ?? '').trim();
            lastRegistryIdentityRef.current = {
              namaSekolah: loadedName,
              npsn: loadedNpsn
            };
            setMetadata((prev) => ({ ...prev, ...cloudData.metadata }));
          }
          if (Array.isArray(cloudData.teachers)) {
            setTeachers(sanitizeTeachers(cloudData.teachers));
          }
          if (Array.isArray(cloudData.students)) {
            setStudents(cloudData.students);
          }
          if (Array.isArray(cloudData.eskulList)) {
            setEskulList(cloudData.eskulList);
          }
          const targetMonth = cloudData.activeMonthIndex || activeMonthIndex;
          if (cloudData.monthlyStore && typeof cloudData.monthlyStore === 'object') {
            setMonthlyStore({ ...EMPTY_MONTHLY_STORE, ...cloudData.monthlyStore });
            const activeArchive = cloudData.monthlyStore[targetMonth];
            if (activeArchive?.data && Array.isArray(activeArchive.data)) {
              setData(ensureTransactionsClassification(activeArchive.data));
            }
          }
          if (cloudData.activeMonthIndex) {
            setActiveMonthIndex(cloudData.activeMonthIndex);
          }
          setSyncStatus('synced');
          setLastSyncedTime(new Date());
        }

        // Hanya unggah cache lokal ke cloud jika:
        // - bukan readOnly (viewer)
        // - sekolah ini memang punya cache lokal
        // - dan dokumen cloud belum memiliki monthlyStore maupun teachers
        if (!readOnly && hasSchoolLocalCache(schoolId) && !cloudData?.monthlyStore && !cloudData?.teachers) {
          debounceSaveToFirestore(
            schoolId,
            {
              metadata,
              teachers,
              students,
              eskulList,
              monthlyStore,
              activeMonthIndex
            },
            (st) => {
              if (isMounted) {
                setSyncStatus(st);
                if (st === 'synced') setLastSyncedTime(new Date());
              }
            }
          );
        } else if (!hasAnyCloudData) {
          setSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Initial cloud sync error:', err);
        if (isMounted) setSyncStatus('offline');
      } finally {
        if (isMounted) setIsInitialCloudLoaded(true);
      }
    }

    initCloudSync();

    const handleOnline = () => {
      initCloudSync();
    };
    const handleOffline = () => {
      if (isMounted) setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, schoolId, readOnly]);

  // 2. Simpan ke localStorage per sekolah sebagai cache offline cepat
  useEffect(() => {
    writeLS(schoolId, '12months_archive_v3', monthlyStore);
  }, [schoolId, monthlyStore]);

  useEffect(() => {
    writeLS(schoolId, 'active_month_index', activeMonthIndex);
  }, [schoolId, activeMonthIndex]);

  useEffect(() => {
    writeLS(schoolId, 'bku_transactions', data);
  }, [schoolId, data]);

  useEffect(() => {
    writeLS(schoolId, 'school_metadata', metadata);
  }, [schoolId, metadata]);

  useEffect(() => {
    writeLS(schoolId, 'master_teachers', teachers);
  }, [schoolId, teachers]);

  useEffect(() => {
    writeLS(schoolId, 'master_students', students);
  }, [schoolId, students]);

  useEffect(() => {
    writeLS(schoolId, 'master_eskul', eskulList);
  }, [schoolId, eskulList]);

  // 3. Sinkronkan otomatis ke Cloud Firestore setiap kali ada perubahan data (dilewati saat readOnly)
  useEffect(() => {
    if (!user || !isInitialCloudLoaded || readOnly) return;

    debounceSaveToFirestore(
      schoolId,
      {
        metadata,
        teachers,
        students,
        eskulList,
        monthlyStore,
        activeMonthIndex
      },
      (st) => {
        setSyncStatus(st);
        if (st === 'synced') setLastSyncedTime(new Date());
      }
    );
  }, [metadata, teachers, students, eskulList, monthlyStore, activeMonthIndex, isInitialCloudLoaded, user, schoolId, readOnly]);

  // 4. Sinkronkan perubahan nama sekolah / NPSN ke ringkasan mySchools (debounce 1.5s)
  useEffect(() => {
    if (!user || !isInitialCloudLoaded || readOnly) return;
    const nextName = (metadata.namaSekolah || '').trim();
    const nextNpsn = (metadata.npsn || '').trim();
    if (!nextName && !nextNpsn) return;

    if (
      nextName === lastRegistryIdentityRef.current.namaSekolah &&
      nextNpsn === lastRegistryIdentityRef.current.npsn
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await renameSchoolInRegistry(user.uid, schoolId, {
          namaSekolah: nextName,
          npsn: nextNpsn
        });
        lastRegistryIdentityRef.current = { namaSekolah: nextName, npsn: nextNpsn };
      } catch (err) {
        console.warn('Gagal menyinkronkan nama/NPSN sekolah ke daftar sekolah saya:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [metadata.namaSekolah, metadata.npsn, isInitialCloudLoaded, readOnly, user, schoolId]);

  // Manual trigger untuk force sync ke cloud
  const handleForceCloudSync = () => {
    if (!user || readOnly) return;
    setSyncStatus('syncing');
    debounceSaveToFirestore(
      schoolId,
      {
        metadata,
        teachers,
        students,
        eskulList,
        monthlyStore,
        activeMonthIndex
      },
      (st) => {
        setSyncStatus(st);
        if (st === 'synced') setLastSyncedTime(new Date());
      }
    );
  };

  // Handler: Selecting a month from the 12-month calendar cards
  const handleSelectMonthIndex = (monthNum: number) => {
    setActiveMonthIndex(monthNum);
    const archive = monthlyStore[monthNum];
    if (archive && archive.data && archive.data.length > 0) {
      setData(ensureTransactionsClassification(archive.data));
      if (archive.metadata) {
        setMetadata((prev) => ({
          ...prev,
          ...archive.metadata,
          bulanTahun: archive.bulanTahun
        }));
      } else {
        setMetadata((prev) => ({
          ...prev,
          bulanTahun: archive.bulanTahun
        }));
      }
    } else {
      setData([]);
      setMetadata((prev) => ({
        ...prev,
        bulanTahun: `${MONTH_NAMES_ID[monthNum - 1]} 2026`
      }));
    }
    removeLS(schoolId, 'managed_barang_list');
  };

  // Handler: Deleting transactions of a specific month
  const handleDeleteMonthIndex = (monthNum: number) => {
    if (readOnly) return;
    setMonthlyStore((prev) => ({
      ...prev,
      [monthNum]: null
    }));
    if (activeMonthIndex === monthNum) {
      setData([]);
    }
    removeLS(schoolId, 'managed_barang_list');
  };

  const toggleRow = (idx: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const areAllExpanded = data.length > 0 && data.every((_, idx) => !!expandedRows[idx]);

  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    data.forEach((_, idx) => {
      all[idx] = true;
    });
    setExpandedRows(all);
  };

  const handleCollapseAll = () => {
    setExpandedRows({});
  };

  const handleToggleExpandAll = () => {
    if (areAllExpanded) {
      handleCollapseAll();
    } else {
      handleExpandAll();
    }
  };

  // Handler: When new BKU & RKAS data is uploaded and extracted
  const handleDataGenerated = (
    newData: TransaksiBKU[],
    newMetadata?: Partial<SchoolMetadata>,
    fileInfo?: { bkuFileName?: string; rkasFileName?: string },
    rkasItems?: RKASItem[]
  ) => {
    if (readOnly) return;
    const classifiedData = ensureTransactionsClassification(newData);
    const detected = detectMonthYearFromData(
      classifiedData,
      newMetadata?.bulanTahun,
      fileInfo?.bkuFileName
    );
    const targetMonthIndex = detected.monthIndex || activeMonthIndex || 2;
    const newArchive = createMonthlyArchive(
      classifiedData,
      newMetadata || {},
      {
        bkuFileName: fileInfo?.bkuFileName,
        rkasFileName: fileInfo?.rkasFileName,
        rkasItems
      }
    );

    setMonthlyStore((prev) => ({
      ...prev,
      [targetMonthIndex]: newArchive
    }));

    setActiveMonthIndex(targetMonthIndex);
    setData(classifiedData);

    if (newMetadata) {
      setMetadata((prev) => ({
        ...prev,
        ...newMetadata,
        bulanTahun: newArchive.bulanTahun
      }));
    } else {
      setMetadata((prev) => ({
        ...prev,
        bulanTahun: newArchive.bulanTahun
      }));
    }

    removeLS(schoolId, 'managed_barang_list');

    const newExpanded: Record<number, boolean> = {};
    newData.slice(0, 5).forEach((_, idx) => {
      newExpanded[idx] = true;
    });
    setExpandedRows(newExpanded);
  };

  const handleUpdateData = (newData: TransaksiBKU[]) => {
    if (readOnly) return;
    setData(newData);
    setMonthlyStore((prev) => {
      const current = prev[activeMonthIndex];
      if (!current) return prev;
      return {
        ...prev,
        [activeMonthIndex]: {
          ...current,
          data: newData,
          totalTransaksi: newData.length,
          totalPengeluaran: newData
            .filter((d) => d.tipe_transaksi === 'Pengeluaran')
            .reduce((acc, curr) => acc + curr.total_pengeluaran_bku, 0),
          totalPemasukan: newData
            .filter((d) => d.tipe_transaksi === 'Pemasukan')
            .reduce((acc, curr) => acc + curr.total_pemasukan_bku, 0)
        }
      };
    });
  };

  const handleDeleteAll = () => {
    if (readOnly) return;
    setData([]);
    setExpandedRows({});
    removeLS(schoolId, 'managed_barang_list');
  };

  const handleResetDefault = () => {
    if (readOnly) return;
    setData([]);
    setMetadata((prev) => ({
      ...initialSchoolMaster,
      namaSekolah: prev.namaSekolah || activeSummary?.namaSekolah || '',
      npsn: prev.npsn || activeSummary?.npsn || ''
    }));
    removeLS(schoolId, 'managed_barang_list');
    removeLS(schoolId, 'bku_transactions');
    removeLS(schoolId, 'school_metadata');
    setExpandedRows({});
  };

  const handleResetAllMaster = () => {
    if (readOnly) return;
    setMetadata((prev) => ({
      ...initialSchoolMaster,
      namaSekolah: prev.namaSekolah || activeSummary?.namaSekolah || '',
      npsn: prev.npsn || activeSummary?.npsn || ''
    }));
    setTeachers([]);
    setStudents([]);
    setEskulList([]);
    removeLS(schoolId, 'school_metadata');
    removeLS(schoolId, 'master_teachers');
    removeLS(schoolId, 'master_students');
    removeLS(schoolId, 'master_eskul');
    removeLS(schoolId, 'managed_personnel_tags');
    removeLS(schoolId, 'managed_barang_list');
    removeLS(schoolId, 'unified_logistik_items');
  };

  const getCleanJsonString = () => {
    const cleanData = data.map(({ tanggal, no_bku, tipe_transaksi, total_pemasukan_bku, total_pengeluaran_bku, rincian_barang }) => ({
      tanggal,
      no_bku,
      tipe_transaksi,
      total_pemasukan_bku,
      total_pengeluaran_bku,
      rincian_barang: rincian_barang.map(({ kode_rekening, uraian_barang, volume, satuan, harga_satuan, jumlah_transaksi }) => ({
        kode_rekening,
        uraian_barang,
        volume,
        satuan,
        harga_satuan,
        jumlah_transaksi
      }))
    }));
    return JSON.stringify(cleanData, null, 2);
  };

  const handleCopyJson = () => {
    const jsonStr = getCleanJsonString();
    navigator.clipboard.writeText(jsonStr);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadJson = () => {
    const jsonStr = getCleanJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BKU_RKAS_BOSP_${metadata.npsn || schoolId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const kwitansiCount = data.filter((d) => d.tipe_transaksi === 'Pengeluaran' && d.no_bku !== '-').length;

  const waitForFlushWithTimeout = async () => {
    if (readOnly) return;
    await Promise.race([
      flushPendingSaves(schoolId),
      new Promise<void>((resolve) => setTimeout(resolve, 5000))
    ]);
  };

  const handleRequestSelectSchool = (targetSchoolId: string) => {
    if (!targetSchoolId || targetSchoolId === schoolId) return;
    if (!readOnly && (syncStatus !== 'synced' || hasPendingSaves(schoolId))) {
      setPendingSwitchTargetId(targetSchoolId);
      return;
    }
    onSwitchSchool(targetSchoolId);
  };

  const handleConfirmSwitchSchool = async () => {
    if (!pendingSwitchTargetId || isFlushingSwitch) return;
    const targetId = pendingSwitchTargetId;
    setIsFlushingSwitch(true);
    try {
      await waitForFlushWithTimeout();
    } finally {
      setIsFlushingSwitch(false);
      setPendingSwitchTargetId(null);
      onSwitchSchool(targetId);
    }
  };

  const handleRequestLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await waitForFlushWithTimeout();
    } catch {
      // ignore flush error before logout
    }
    try {
      clearSavedDriveConnection(schoolId);
      clearAllBospStorage();
      await logoutGoogle();
    } catch (err) {
      console.error('Gagal logout:', err);
      setIsLoggingOut(false);
    }
  };

  const pendingTargetSchool = pendingSwitchTargetId
    ? schools.find((s) => s.schoolId === pendingSwitchTargetId)
    : null;
  const hasUnsyncedChanges = !readOnly && (syncStatus !== 'synced' || hasPendingSaves(schoolId));

  // Overlay penuh selama data awal sekolah dimuat dari cloud: JANGAN merender tab data sebelum isInitialCloudLoaded true
  if (!isInitialCloudLoaded) {
    return (
      <SchoolContext.Provider value={{ schoolId, role, readOnly }}>
        <div
          className="fixed inset-0 z-50 bg-slate-100 flex flex-col items-center justify-center p-6 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="mt-4 text-base font-bold text-slate-900">
            Memuat {activeDisplayName}...
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mengambil data terbaru sekolah dari cloud
          </p>
        </div>
      </SchoolContext.Provider>
    );
  }

  return (
    <SchoolContext.Provider value={{ schoolId, role, readOnly }}>
      <div className="min-h-screen bg-slate-100/70 text-slate-800 font-sans antialiased flex flex-col lg:flex-row print:bg-white print:min-h-0 print:block print:p-0 print:m-0">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          activeSpjSubTab={activeSpjSubTab}
          onSelectSpjSubTab={(sub) => setActiveSpjSubTab(sub)}
          metadata={metadata}
          kwitansiCount={kwitansiCount}
          onOpenUploadModal={() => !readOnly && setIsUploadModalOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          schools={schools}
          onSelectSchool={handleRequestSelectSchool}
          onAddSchool={onOpenAddSchool}
          onManageSchools={onOpenManageSchools}
          onRequestLogout={handleRequestLogout}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 print:block print:w-full print:m-0 print:p-0">
          {/* Top Header */}
          <Header
            metadata={metadata}
            activeTab={activeTab}
            onCopyJson={handleCopyJson}
            onDownloadJson={handleDownloadJson}
            isCopied={isCopied}
            onToggleExpandAll={handleToggleExpandAll}
            allExpanded={areAllExpanded}
            onOpenJsonModal={() => setIsJsonModalOpen(true)}
            onOpenUploadModal={() => !readOnly && setIsUploadModalOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
            syncStatus={syncStatus}
            lastSyncedTime={lastSyncedTime}
            onForceSync={handleForceCloudSync}
            currentUser={currentUser}
            accessToken={accessToken}
            isDriveSyncing={isDriveSyncing}
            driveRealtimeStatus={driveRealtimeStatus}
            lastDriveSync={lastDriveSync}
            driveFile={driveFile}
            isExistingUser={isExistingUser}
            isDriveReconnecting={isDriveReconnecting}
            onDriveLogin={handleDriveLogin}
            onDriveLogout={handleDriveLogout}
            onDriveManualSync={handleSaveToDrive}
            onDrivePull={handlePullFromDrive}
            schools={schools}
            activeSchoolId={schoolId}
            activeRole={role}
            onSelectSchool={handleRequestSelectSchool}
            onAddSchool={onOpenAddSchool}
            onManageSchools={onOpenManageSchools}
            onRequestLogout={handleRequestLogout}
          />

          {/* Tab View Contents */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-0">
            {readOnly && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2 no-print">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Mode lihat saja — Anda memiliki akses Viewer, sehingga perubahan tidak dapat disimpan ke cloud.
                </span>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                data={data}
                metadata={metadata}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenUploadModal={() => !readOnly && setIsUploadModalOpen(true)}
              />
            )}

            {activeTab === 'processor' && (
              <div className="space-y-6">
                <FileUploadSection
                  currentData={data}
                  onDataGenerated={handleDataGenerated}
                  onResetDefault={handleResetDefault}
                  onClearData={handleDeleteAll}
                  monthlyStore={monthlyStore}
                  activeMonthIndex={activeMonthIndex}
                />

                <TwelveMonthGrid
                  monthlyStore={monthlyStore}
                  activeMonthIndex={activeMonthIndex}
                  onSelectMonthIndex={handleSelectMonthIndex}
                  onDeleteMonthIndex={handleDeleteMonthIndex}
                  onTriggerUploadForMonth={() => !readOnly && setIsUploadModalOpen(true)}
                />

                <TransactionTable
                  data={data}
                  expandedRows={expandedRows}
                  toggleRow={toggleRow}
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                  onToggleExpandAll={handleToggleExpandAll}
                  onUpdateData={handleUpdateData}
                  onDeleteAll={handleDeleteAll}
                  eskulList={eskulList}
                  onNavigateToEskul={(eskulId) => {
                    setSelectedSpjEskulId(eskulId);
                    setActiveSpjSubTab('lpj-eskul');
                    setActiveTab('spj');
                  }}
                />
              </div>
            )}

            {activeTab === 'kwitansi' && (
              <KwitansiManager
                data={data}
                metadata={metadata}
                onUpdateMetadata={(newMeta) => !readOnly && setMetadata(newMeta)}
              />
            )}

            {activeTab === 'spj' && (
              <SpjManager
                data={data}
                metadata={metadata}
                eskulList={eskulList}
                teachers={teachers}
                students={students}
                currentSubTab={activeSpjSubTab}
                onSubTabChange={(sub) => setActiveSpjSubTab(sub)}
                selectedEskulId={selectedSpjEskulId}
                onUpdateEskul={(newList) => !readOnly && setEskulList(newList)}
                onUpdateMetadata={(newMeta) => !readOnly && setMetadata(newMeta)}
                onUpdateTeachers={(newTeachers) => !readOnly && setTeachers(sanitizeTeachers(newTeachers))}
                onNavigateToMaster={() => setActiveTab('master')}
                monthlyStore={monthlyStore}
                activeMonthIndex={activeMonthIndex}
                onSelectMonthIndex={handleSelectMonthIndex}
              />
            )}

            {activeTab === 'master' && (
              <ErrorBoundary
                fallbackTitle="Kendala Memuat Master Data"
                fallbackMessage="Terjadi kendala saat memuat menu Master Data. Anda dapat mencoba memuat ulang tampilan tab ini atau kembali ke ringkasan BKU."
              >
                <MasterDataManager
                  metadata={metadata}
                  teachers={teachers}
                  students={students}
                  eskulList={eskulList}
                  bkuData={data}
                  onUpdateMetadata={(newMeta) => !readOnly && setMetadata(newMeta)}
                  onUpdateTeachers={(newTeachers) => !readOnly && setTeachers(sanitizeTeachers(newTeachers))}
                  onUpdateStudents={(newStudents) => !readOnly && setStudents(newStudents)}
                  onUpdateEskul={(newList) => !readOnly && setEskulList(newList)}
                  onResetAllMaster={handleResetAllMaster}
                  onNavigateToSpj={(eskulId) => {
                    setSelectedSpjEskulId(eskulId);
                    setActiveSpjSubTab('lpj-eskul');
                    setActiveTab('spj');
                  }}
                  currentUser={currentUser}
                  accessToken={accessToken}
                  isDriveSyncing={isDriveSyncing}
                  lastDriveSync={lastDriveSync}
                  driveFile={driveFile}
                  onDriveLogin={handleDriveLogin}
                  onDriveLogout={handleDriveLogout}
                  onDriveManualSync={handleSaveToDrive}
                  onDrivePull={handlePullFromDrive}
                />
              </ErrorBoundary>
            )}

            {/* Footer info */}
            <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-200 no-print">
              <div>
                Sistem Pengolah Data BKU & RKAS BOSP &bull; {metadata.namaSekolah} ({metadata.bulanTahun}).
              </div>
              <div className="mt-1 sm:mt-0 font-mono text-[11px]">
                Kwitansi Resmi &bull; Master Data &bull; TTD Kepala Sekolah & Bendahara &bull; Rekonsiliasi Terpadu
              </div>
            </footer>
          </main>
        </div>

        {/* JSON Viewer Modal */}
        <JsonViewerModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          data={data}
          onCopyJson={handleCopyJson}
          onDownloadJson={handleDownloadJson}
          isCopied={isCopied}
        />

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen && !readOnly}
          onClose={() => setIsUploadModalOpen(false)}
          onDataGenerated={handleDataGenerated}
          monthlyStore={monthlyStore}
          activeMonthIndex={activeMonthIndex}
        />

        {/* Modal Konfirmasi Pindah Sekolah saat masih ada perubahan belum tersimpan */}
        {pendingSwitchTargetId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  {isFlushingSwitch ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Perubahan sedang disimpan, tunggu sebentar
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Data <strong>{activeDisplayName}</strong> belum selesai tersinkron ke cloud. Sistem akan menunggu penyimpanan selesai (maks. 5 detik) sebelum berpindah ke{' '}
                    <strong>{pendingTargetSchool?.namaSekolah || 'sekolah tujuan'}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isFlushingSwitch}
                  onClick={() => setPendingSwitchTargetId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isFlushingSwitch}
                  onClick={() => void handleConfirmSwitchSchool()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isFlushingSwitch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan &amp; Berpindah...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tunggu Simpan &amp; Pindah</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Keluar Aman untuk Komputer Bersama */}
        {isLogoutModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  {isLoggingOut ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Keluar dari Akun Google?
                  </h3>
                  {hasUnsyncedChanges ? (
                    <p className="mt-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                      <strong>Perhatian:</strong> Masih ada perubahan pada <strong>{activeDisplayName}</strong> yang belum tersinkron ke cloud. Sistem akan menunggu penyimpanan selesai (maks. 5 detik) sebelum keluar.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Seluruh cache data sekolah lokal di browser ini akan dibersihkan secara otomatis agar aman digunakan pada komputer bersama.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => void handleConfirmLogout()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan &amp; Keluar...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{hasUnsyncedChanges ? 'Simpan & Keluar' : 'Keluar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SchoolContext.Provider>
  );
}
