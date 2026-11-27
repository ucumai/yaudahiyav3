import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  FieldPath,
  onSnapshot,
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SchoolMetadata,
  MasterGuru,
  MasterSiswa,
  MasterEskul,
  TransaksiBKU,
  MonthlyArchive,
  MonthLogistikData,
  MonthPerbaikanData,
  MonthEskulRecord,
  EskulAnggota
} from '../types';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'quota_exceeded';

let isQuotaExceededGlobal = false;

// Hash terakhir per sekolah (dan channel metadata) untuk deduplikasi write
const lastSavedHashes = new Map<string, string>();

// Peta timer & payload tertunda per (schoolId + channel) agar perpindahan sekolah tidak membatalkan/menukar target
interface PendingSaveEntry {
  schoolId: string;
  timer: ReturnType<typeof setTimeout>;
  flush: () => Promise<void>;
}
const pendingSaves = new Map<string, PendingSaveEntry>();

/**
 * Validasi ID dokumen sekolah sebelum membaca/menulis ke Firestore.
 * Menolak string kosong, tipe non-string, dan ID default lama 'sekolah_bosp_utama'.
 */
export function isValidSchoolId(schoolId?: string | null): schoolId is string {
  if (typeof schoolId !== 'string') return false;
  const trimmed = schoolId.trim();
  if (!trimmed || trimmed === 'sekolah_bosp_utama' || trimmed === 'default' || trimmed === 'default-school') {
    return false;
  }
  return /^[a-zA-Z0-9_-]{1,128}$/.test(trimmed);
}

function rejectInvalidSchoolId(fnName: string, schoolId: unknown): false {
  console.error(`[firebaseSync.${fnName}] Penulisan ditolak: schoolId tidak valid ->`, schoolId);
  return false;
}

/**
 * Mengirimkan seluruh tulisan tertunda (debounced) milik schoolId tertentu secara langsung.
 * Dipanggil pada cleanup unmount SchoolWorkspace agar tulisan tertunda tetap terkirim ke sekolah yang benar.
 */
export async function flushPendingSaves(schoolId: string): Promise<void> {
  if (!isValidSchoolId(schoolId)) return;

  const entriesToFlush: PendingSaveEntry[] = [];
  for (const [key, entry] of pendingSaves.entries()) {
    if (entry.schoolId === schoolId) {
      clearTimeout(entry.timer);
      pendingSaves.delete(key);
      entriesToFlush.push(entry);
    }
  }

  if (entriesToFlush.length === 0) return;

  await Promise.all(
    entriesToFlush.map(async (entry) => {
      try {
        await entry.flush();
      } catch (err) {
        console.warn(`[firebaseSync.flushPendingSaves] Gagal flush untuk ${schoolId}:`, err);
      }
    })
  );
}

/**
 * Mengecek apakah masih ada tulisan tertunda (debounced) untuk sekolah tertentu.
 */
export function hasPendingSaves(schoolId?: string): boolean {
  if (!schoolId) return pendingSaves.size > 0;
  for (const entry of pendingSaves.values()) {
    if (entry.schoolId === schoolId) return true;
  }
  return false;
}

/**
 * Mengecek apakah channel tertentu pada sekolah aktif sedang menunggu debounce save.
 */
export function hasPendingSaveChannel(schoolId: string, channel: string): boolean {
  if (!schoolId || !channel) return false;
  return pendingSaves.has(`${schoolId}:${channel}`);
}

/**
 * Menghasilkan hash deterministik untuk mendeteksi perubahan data nyata
 * dan mencegah echo-loop saat pembaruan datang dari onSnapshot.
 */
export function computeSyncHash(val: unknown): string {
  try {
    return JSON.stringify(sanitizeForFirestore(val === undefined ? null : val));
  } catch {
    return String(Date.now());
  }
}

export function markSchoolFieldSynced(schoolDocId: string, channel: string, value: unknown): void {
  if (!isValidSchoolId(schoolDocId)) return;
  lastSavedHashes.set(`${schoolDocId}:${channel}`, computeSyncHash(value));
}

export function markMonthSynced(
  schoolDocId: string,
  monthIndex: number,
  archive: MonthlyArchive | null | undefined
): void {
  if (!isValidSchoolId(schoolDocId)) return;
  lastSavedHashes.set(`${schoolDocId}:month:${monthIndex}`, computeSyncHash(archive ?? null));
}

function isDocNotFoundError(err: any): boolean {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return code === 'not-found' || msg.includes('no document to update') || msg.includes('not-found');
}

async function upsertSchoolFields(
  schoolDocId: string,
  fields: Record<string, any>
): Promise<void> {
  const docRef = doc(db, 'schools', schoolDocId);
  const cleanFields = sanitizeForFirestore({
    ...fields,
    lastUpdated: serverTimestamp()
  });
  try {
    await updateDoc(docRef, cleanFields);
  } catch (err: any) {
    if (isDocNotFoundError(err)) {
      await setDoc(docRef, { id: schoolDocId, ...cleanFields }, { merge: true });
    } else {
      throw err;
    }
  }
}

async function upsertMapEntry(
  docRef: DocumentReference,
  schoolDocId: string,
  mapField: string,
  entryKey: string,
  cleanValue: unknown,
  isDelete: boolean = false
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    await updateDoc(
      docRef,
      new FieldPath(mapField, String(entryKey)),
      isDelete ? deleteField() : cleanValue,
      new FieldPath('updatedAt'),
      nowIso,
      new FieldPath('lastUpdated'),
      serverTimestamp()
    );
  } catch (err: any) {
    if (isDocNotFoundError(err)) {
      if (isDelete) return;
      await setDoc(
        docRef,
        sanitizeForFirestore({
          id: schoolDocId,
          [mapField]: { [String(entryKey)]: cleanValue },
          updatedAt: nowIso,
          lastUpdated: serverTimestamp()
        }),
        { merge: true }
      );
    } else {
      throw err;
    }
  }
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('resource-exhausted')
  );
}

/**
 * Mendeteksi apakah error disebabkan oleh kondisi offline atau jaringan terputus
 */
export function isOfflineError(err: any): boolean {
  if (!err) return false;
  if (isQuotaError(err)) return true;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    msg.includes('client is offline') ||
    msg.includes('the client is offline') ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('could not reach') ||
    msg.includes('failed to get document') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  );
}

export interface SchoolCloudData {
  metadata?: Partial<SchoolMetadata>;
  teachers?: MasterGuru[];
  students?: MasterSiswa[];
  eskulList?: MasterEskul[];
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  logistikStore?: Record<number, MonthLogistikData>;
  perbaikanStore?: Record<number, MonthPerbaikanData>;
  eskulStore?: Record<string, MonthEskulRecord>;
  masterSiswaEskul?: Record<string, EskulAnggota[]>;
  lastUpdated?: any;
}

/**
 * @deprecated Hanya digunakan untuk migrasi data lama (Tahap 4).
 * Jangan dipakai di modul operasional — gunakan `schoolId` dari `useSchool()`.
 */
export function getSchoolDocId(npsn?: string): string {
  if (!npsn || npsn.trim() === '') {
    return 'sekolah_bosp_utama';
  }
  const sanitized = npsn.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `sekolah_${sanitized}`;
}

/**
 * Membersihkan objek secara rekursif sebelum dikirim ke Firebase Firestore.
 * Menghapus semua properti bernilai `undefined` dan mengonversi `undefined` dalam array menjadi `null`,
 * guna mencegah error fatal Firestore: "Function setDoc() called with invalid data. Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  // Biarkan objek sentinal Firestore (misalnya serverTimestamp)
  if (
    typeof (val as any).isEqual === 'function' ||
    (val as any)?._methodName !== undefined ||
    (val as any)?.constructor?.name === 'FieldValue'
  ) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => (item === undefined ? null : sanitizeForFirestore(item))) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(val as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as any;
}

function handleSchoolWriteError(err: any, onStatusChange?: (status: CloudSyncStatus) => void): void {
  if (isQuotaError(err)) {
    isQuotaExceededGlobal = true;
    console.warn('Quota harian Firestore terlampaui (Free Tier). Mengalihkan ke mode offline.');
    if (onStatusChange) onStatusChange('quota_exceeded');
  } else if (err?.code === 'permission-denied') {
    console.warn('Firestore sync dilewati karena permission rules:', err.message);
    if (onStatusChange) onStatusChange('offline');
  } else if (isOfflineError(err)) {
    console.warn('Firestore sync ditunda (mode offline):', err?.message || err);
    if (onStatusChange) onStatusChange('offline');
  } else {
    console.error('Gagal sinkronisasi data ke Firebase Firestore:', err);
    if (onStatusChange) onStatusChange('error');
  }
}

/**
 * Menyimpan SATU field spesifik pada dokumen schools/{schoolDocId} secara debounced + granular
 * agar pengeditan oleh satu anggota tidak menimpa field lain milik anggota lain.
 */
export function debounceSaveSchoolField<K extends 'metadata' | 'students' | 'eskulList'>(
  schoolDocId: string,
  field: K,
  value: SchoolCloudData[K],
  onStatusChange?: (status: CloudSyncStatus) => void,
  delay: number = 1000
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveSchoolField', schoolDocId);
  }
  if (isQuotaExceededGlobal) {
    if (onStatusChange) onStatusChange('quota_exceeded');
    return false;
  }

  const hashKey = `${schoolDocId}:${field}`;
  const currentHash = computeSyncHash(value);
  if (lastSavedHashes.get(hashKey) === currentHash) {
    if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    return true;
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:${field}`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      const cleanVal = sanitizeForFirestore(value);
      await upsertSchoolFields(schoolDocId, { [field]: cleanVal });
      lastSavedHashes.set(hashKey, currentHash);
      if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    } catch (err: any) {
      handleSchoolWriteError(err, onStatusChange);
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, delay);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

/**
 * Menyimpan HANYA bulan-bulan yang berubah pada monthlyStore di schools/{schoolDocId}
 * menggunakan field path spesifik (monthlyStore.1 .. monthlyStore.12).
 */
export function debounceSaveChangedMonthsToFirestore(
  schoolDocId: string,
  monthlyStore: Record<number, MonthlyArchive | null>,
  onStatusChange?: (status: CloudSyncStatus) => void,
  delay: number = 1200
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveChangedMonthsToFirestore', schoolDocId);
  }
  if (isQuotaExceededGlobal) {
    if (onStatusChange) onStatusChange('quota_exceeded');
    return false;
  }

  const changedMonths: Array<{ month: number; hash: string; value: MonthlyArchive | null }> = [];
  for (let m = 1; m <= 12; m++) {
    const val = monthlyStore[m] ?? null;
    const hash = computeSyncHash(val);
    if (lastSavedHashes.get(`${schoolDocId}:month:${m}`) !== hash) {
      changedMonths.push({ month: m, hash, value: val });
    }
  }

  if (changedMonths.length === 0) {
    if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    return true;
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:monthlyStore`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      const docRef = doc(db, 'schools', schoolDocId);
      const args: any[] = [];
      const fallbackMonthly: Record<string, any> = {};

      for (const item of changedMonths) {
        const cleanVal = item.value ? sanitizeForFirestore(item.value) : null;
        args.push(new FieldPath('monthlyStore', String(item.month)), cleanVal);
        fallbackMonthly[String(item.month)] = cleanVal;
      }
      args.push('lastUpdated', serverTimestamp());

      try {
        await (updateDoc as any)(docRef, ...args);
      } catch (err: any) {
        if (isDocNotFoundError(err)) {
          await setDoc(
            docRef,
            sanitizeForFirestore({
              id: schoolDocId,
              monthlyStore: fallbackMonthly,
              lastUpdated: serverTimestamp()
            }),
            { merge: true }
          );
        } else {
          throw err;
        }
      }

      for (const item of changedMonths) {
        lastSavedHashes.set(`${schoolDocId}:month:${item.month}`, item.hash);
      }
      if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    } catch (err: any) {
      handleSchoolWriteError(err, onStatusChange);
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, delay);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

export function debounceSaveToFirestore(
  schoolDocId: string,
  data: Partial<SchoolCloudData>,
  onStatusChange?: (status: CloudSyncStatus) => void
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveToFirestore', schoolDocId);
  }

  let ok = true;
  if (data.metadata !== undefined) {
    ok = debounceSaveSchoolField(schoolDocId, 'metadata', data.metadata, onStatusChange) && ok;
  }
  if (data.students !== undefined) {
    ok = debounceSaveSchoolField(schoolDocId, 'students', data.students, onStatusChange) && ok;
  }
  if (data.eskulList !== undefined) {
    ok = debounceSaveSchoolField(schoolDocId, 'eskulList', data.eskulList, onStatusChange) && ok;
  }
  if (data.teachers !== undefined) {
    ok = debounceSaveTeachersToFirestore(schoolDocId, data.teachers, onStatusChange) && ok;
  }
  if (data.monthlyStore !== undefined) {
    ok = debounceSaveChangedMonthsToFirestore(schoolDocId, data.monthlyStore, onStatusChange) && ok;
  }
  return ok;
}

// Mengambil data lengkap sekolah dari Firestore sekali jalan
export async function fetchSchoolDataFromCloud(schoolDocId: string): Promise<SchoolCloudData | null> {
  if (!isValidSchoolId(schoolDocId)) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const docRef = doc(db, 'schools', schoolDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SchoolCloudData;
    }
    return null;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore fetch dilewati karena izin akses dokumen:', err.message);
    } else if (isOfflineError(err)) {
      console.warn('Firestore offline saat membaca data sekolah:', err?.message || err);
    } else {
      console.error('Error membaca data dari Cloud Firestore:', err);
    }
    return null;
  }
}

// Simpan langsung satu bulan data logistik ke logistik_data/{schoolDocId} (granular per bulan)
export async function saveLogistikMonthToFirestore(
  schoolDocId: string,
  monthIndex: number,
  monthData: MonthLogistikData,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveLogistikMonthToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');
  try {
    const logistikDocRef = doc(db, 'logistik_data', schoolDocId);
    const cleanMonth = sanitizeForFirestore(monthData);
    await upsertMapEntry(logistikDocRef, schoolDocId, 'months', String(monthIndex), cleanMonth, false);
    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore logistik sync dilewati karena permission rules');
      if (onStatusChange) onStatusChange('offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore logistik sync ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal sinkronisasi data logistik ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export function debounceSaveLogistikMonthToFirestore(
  schoolDocId: string,
  monthIndex: number,
  monthData: MonthLogistikData,
  onStatusChange?: (status: CloudSyncStatus) => void
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveLogistikMonthToFirestore', schoolDocId);
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:logistik_m${monthIndex}`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      await saveLogistikMonthToFirestore(schoolDocId, monthIndex, monthData, onStatusChange);
    } catch {
      // Handled inside saveLogistikMonthToFirestore
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, 900);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

// Simpan langsung seluruh peta logistik ke Firestore (kanonik di logistik_data/{schoolDocId})
export async function saveLogistikToFirestore(
  schoolDocId: string,
  logistikStore: Record<number, MonthLogistikData>,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveLogistikToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');
  try {
    const logistikDocRef = doc(db, 'logistik_data', schoolDocId);
    const cleanLogistik = sanitizeForFirestore({
      id: schoolDocId,
      months: logistikStore,
      updatedAt: new Date().toISOString(),
      lastUpdated: serverTimestamp()
    });
    await setDoc(logistikDocRef, cleanLogistik, { merge: true });

    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore logistik sync dilewati karena permission rules');
      if (onStatusChange) onStatusChange('offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore logistik sync ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal sinkronisasi data logistik ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export function subscribeToLogistikData(
  schoolDocId: string,
  onUpdate: (months: Record<number, MonthLogistikData>) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'logistik_data', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.months) {
          onUpdate(data.months as Record<number, MonthLogistikData>);
        }
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isQuotaError(error)) {
        isQuotaExceededGlobal = true;
        if (onStatusChange) onStatusChange('quota_exceeded');
      } else if (isOfflineError(error)) {
        console.warn('Realtime logistik listener offline:', error.message);
        if (onStatusChange) onStatusChange('offline');
      } else {
        console.warn('Realtime logistik listener error:', error);
        if (onStatusChange) onStatusChange('error');
      }
    }
  );
}

// Simpan satu kegiatan Kombel secara granular ke kombel_data/{schoolDocId}
export async function saveKombelRecordToFirestore(
  schoolDocId: string,
  recordKey: string,
  record: any,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveKombelRecordToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');
  try {
    const kombelDocRef = doc(db, 'kombel_data', schoolDocId);
    const cleanRec = sanitizeForFirestore(record);
    await upsertMapEntry(kombelDocRef, schoolDocId, 'records', recordKey, cleanRec, false);
    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    console.error('Gagal menyimpan Kombel ke Firestore:', err);
    if (onStatusChange) onStatusChange('error');
    return false;
  }
}

// Simpan data Kombel ke Firestore (kanonik di kombel_data/{schoolDocId})
export async function saveKombelToFirestore(
  schoolDocId: string,
  kombelStore: Record<string, any>,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveKombelToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');
  try {
    const kombelDocRef = doc(db, 'kombel_data', schoolDocId);
    const cleanKombel = sanitizeForFirestore({
      id: schoolDocId,
      records: kombelStore,
      updatedAt: new Date().toISOString(),
      lastUpdated: serverTimestamp()
    });
    await setDoc(kombelDocRef, cleanKombel, { merge: true });

    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    console.error('Gagal menyimpan Kombel ke Firestore:', err);
    if (onStatusChange) onStatusChange('error');
    return false;
  }
}

// Mengambil data Kombel dari Firestore
export async function fetchKombelFromFirestore(schoolDocId: string): Promise<Record<string, any> | null> {
  if (!isValidSchoolId(schoolDocId)) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  try {
    const kombelDocRef = doc(db, 'kombel_data', schoolDocId);
    const snap = await getDoc(kombelDocRef);
    if (snap.exists() && snap.data()?.records) {
      return snap.data().records;
    }
    const schoolDocRef = doc(db, 'schools', schoolDocId);
    const sSnap = await getDoc(schoolDocRef);
    if (sSnap.exists() && (sSnap.data() as any)?.kombelStore) {
      return (sSnap.data() as any).kombelStore;
    }
    return null;
  } catch (err) {
    console.warn('Gagal membaca data Kombel dari Firestore:', err);
    return null;
  }
}

export function subscribeToKombelData(
  schoolDocId: string,
  onUpdate: (records: Record<string, any>) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'kombel_data', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.records) {
          onUpdate(data.records as Record<string, any>);
        }
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isQuotaError(error)) {
        isQuotaExceededGlobal = true;
        if (onStatusChange) onStatusChange('quota_exceeded');
      } else if (isOfflineError(error)) {
        console.warn('Realtime listener kombel offline:', error.message);
        if (onStatusChange) onStatusChange('offline');
      } else {
        console.warn('Realtime listener kombel error:', error);
        if (onStatusChange) onStatusChange('error');
      }
    }
  );
}

export function debounceSaveLogistikToFirestore(
  schoolDocId: string,
  logistikStore: Record<number, MonthLogistikData>,
  onStatusChange?: (status: CloudSyncStatus) => void
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveLogistikToFirestore', schoolDocId);
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:logistik`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      await saveLogistikToFirestore(schoolDocId, logistikStore, onStatusChange);
    } catch {
      // Handled inside saveLogistikToFirestore
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, 1000);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

// Mengambil data logistik bulanan langsung dari Firestore
export async function fetchLogistikFromFirestore(
  schoolDocId: string
): Promise<Record<number, MonthLogistikData> | null> {
  if (!isValidSchoolId(schoolDocId)) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    // Coba baca dari koleksi logistik_data
    const logistikDocRef = doc(db, 'logistik_data', schoolDocId);
    const snap = await getDoc(logistikDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.months) {
        return data.months as Record<number, MonthLogistikData>;
      }
    }

    // Fallback baca dari schools/{schoolDocId}
    const schoolDocRef = doc(db, 'schools', schoolDocId);
    const schoolSnap = await getDoc(schoolDocRef);
    if (schoolSnap.exists()) {
      const schoolData = schoolSnap.data() as SchoolCloudData;
      if (schoolData && schoolData.logistikStore) {
        return schoolData.logistikStore;
      }
    }

    return null;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore logistik fetch dilewati karena permission rules atau mode offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore logistik fetch ditunda (mode offline):', err?.message || err);
    } else {
      console.error('Error mengambil data logistik dari Firestore:', err);
    }
    return null;
  }
}

// Langganan pembaruan realtime dari Firestore (mengabaikan hasPendingWrites agar tidak echo)
export function subscribeToSchoolCloudData(
  schoolDocId: string,
  onUpdate: (data: SchoolCloudData) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'schools', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        onUpdate(snap.data() as SchoolCloudData);
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isQuotaError(error)) {
        isQuotaExceededGlobal = true;
        if (onStatusChange) onStatusChange('quota_exceeded');
      } else if (isOfflineError(error)) {
        console.warn('Realtime listener Firestore offline:', error.message);
        if (onStatusChange) onStatusChange('offline');
      } else {
        console.warn('Realtime listener error:', error);
        if (onStatusChange) onStatusChange('error');
      }
    }
  );
}

// ==========================================
// MASTER GURU / GTK FIREBASE SYNC
// ==========================================

export async function saveTeachersToFirestore(
  schoolDocId: string,
  teachers: MasterGuru[],
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveTeachersToFirestore', schoolDocId);
  }
  const hashKey = `${schoolDocId}:teachers`;
  const currentHash = computeSyncHash(teachers || []);
  if (lastSavedHashes.get(hashKey) === currentHash) {
    if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    return true;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');

  try {
    const cleanTeachers = sanitizeForFirestore(teachers || []);

    // 1. Simpan ke koleksi teachers_data/{schoolDocId}
    const teachersDocRef = doc(db, 'teachers_data', schoolDocId);
    await setDoc(
      teachersDocRef,
      {
        id: schoolDocId,
        teachers: cleanTeachers,
        updatedAt: new Date().toISOString(),
        lastUpdated: serverTimestamp()
      },
      { merge: true }
    );

    // 2. Sinkronkan hanya field teachers pada schools/{schoolDocId} (tanpa menimpa field lain)
    await upsertSchoolFields(schoolDocId, { teachers: cleanTeachers });

    lastSavedHashes.set(hashKey, currentHash);
    if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore teachers sync dilewati karena permission rules');
      if (onStatusChange) onStatusChange('offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore teachers sync ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal sinkronisasi data guru ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export function debounceSaveTeachersToFirestore(
  schoolDocId: string,
  teachers: MasterGuru[],
  onStatusChange?: (status: CloudSyncStatus) => void
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveTeachersToFirestore', schoolDocId);
  }

  const hashKey = `${schoolDocId}:teachers`;
  const currentHash = computeSyncHash(teachers || []);
  if (lastSavedHashes.get(hashKey) === currentHash) {
    if (onStatusChange && !hasPendingSaves(schoolDocId)) onStatusChange('synced');
    return true;
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:teachers`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      await saveTeachersToFirestore(schoolDocId, teachers, onStatusChange);
    } catch {
      // Handled inside saveTeachersToFirestore
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, 800);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

export async function fetchTeachersFromFirestore(
  schoolDocId: string
): Promise<MasterGuru[] | null> {
  if (!isValidSchoolId(schoolDocId)) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    // 1. Coba baca dari koleksi teachers_data/{schoolDocId}
    const teachersDocRef = doc(db, 'teachers_data', schoolDocId);
    const snap = await getDoc(teachersDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.teachers)) {
        return data.teachers as MasterGuru[];
      }
    }

    // 2. Fallback baca dari schools/{schoolDocId}
    const schoolDocRef = doc(db, 'schools', schoolDocId);
    const schoolSnap = await getDoc(schoolDocRef);
    if (schoolSnap.exists()) {
      const schoolData = schoolSnap.data() as SchoolCloudData;
      if (schoolData && Array.isArray(schoolData.teachers)) {
        return schoolData.teachers;
      }
    }

    return null;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore teachers fetch dilewati karena permission rules');
    } else if (isOfflineError(err)) {
      console.warn('Firestore teachers fetch ditunda (mode offline):', err?.message || err);
    } else {
      console.error('Error membaca data guru dari Firestore:', err);
    }
    return null;
  }
}

export function subscribeToTeachersData(
  schoolDocId: string,
  onUpdate: (teachers: MasterGuru[]) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'teachers_data', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.teachers)) {
          onUpdate(data.teachers as MasterGuru[]);
        }
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isOfflineError(error)) {
        console.warn('Realtime teachers listener offline:', error.message);
      } else {
        console.warn('Realtime teachers listener error:', error);
      }
      if (onStatusChange) onStatusChange('offline');
    }
  );
}

// ==========================================
// PERBAIKAN SAPRAS LPJ FIREBASE SYNC
// ==========================================

export async function savePerbaikanMonthToFirestore(
  schoolDocId: string,
  monthIndex: number,
  monthData: MonthPerbaikanData | null,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('savePerbaikanMonthToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');
  try {
    const perbaikanDocRef = doc(db, 'perbaikan_data', schoolDocId);
    const cleanMonth = monthData ? sanitizeForFirestore(monthData) : null;
    await upsertMapEntry(
      perbaikanDocRef,
      schoolDocId,
      'months',
      String(monthIndex),
      cleanMonth,
      monthData === null
    );
    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore perbaikan sync dilewati karena permission rules');
      if (onStatusChange) onStatusChange('offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore perbaikan sync ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal sinkronisasi data perbaikan ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export function debounceSavePerbaikanMonthToFirestore(
  schoolDocId: string,
  monthIndex: number,
  monthData: MonthPerbaikanData | null,
  onStatusChange?: (status: CloudSyncStatus) => void
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSavePerbaikanMonthToFirestore', schoolDocId);
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:perbaikan_m${monthIndex}`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      await savePerbaikanMonthToFirestore(schoolDocId, monthIndex, monthData, onStatusChange);
    } catch {
      // Handled inside savePerbaikanMonthToFirestore
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, 1000);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

export async function savePerbaikanToFirestore(
  schoolDocId: string,
  perbaikanStore: Record<number, MonthPerbaikanData>,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('savePerbaikanToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');
  try {
    const perbaikanDocRef = doc(db, 'perbaikan_data', schoolDocId);
    const cleanPerbaikan = sanitizeForFirestore({
      id: schoolDocId,
      months: perbaikanStore,
      updatedAt: new Date().toISOString(),
      lastUpdated: serverTimestamp()
    });
    await setDoc(perbaikanDocRef, cleanPerbaikan, { merge: true });

    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore perbaikan sync dilewati karena permission rules');
      if (onStatusChange) onStatusChange('offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore perbaikan sync ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal sinkronisasi data perbaikan ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export function debounceSavePerbaikanToFirestore(
  schoolDocId: string,
  perbaikanStore: Record<number, MonthPerbaikanData>,
  onStatusChange?: (status: CloudSyncStatus) => void
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSavePerbaikanToFirestore', schoolDocId);
  }

  if (onStatusChange) onStatusChange('syncing');

  const pendingKey = `${schoolDocId}:perbaikan`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  const flush = async () => {
    try {
      await savePerbaikanToFirestore(schoolDocId, perbaikanStore, onStatusChange);
    } catch {
      // Handled inside savePerbaikanToFirestore
    }
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, 1000);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

export async function fetchPerbaikanFromFirestore(
  schoolDocId: string
): Promise<Record<number, MonthPerbaikanData> | null> {
  if (!isValidSchoolId(schoolDocId)) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    // 1. Coba baca dari koleksi perbaikan_data
    const perbaikanDocRef = doc(db, 'perbaikan_data', schoolDocId);
    const snap = await getDoc(perbaikanDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.months) {
        return data.months as Record<number, MonthPerbaikanData>;
      }
    }

    // 2. Fallback baca dari schools/{schoolDocId}
    const schoolDocRef = doc(db, 'schools', schoolDocId);
    const schoolSnap = await getDoc(schoolDocRef);
    if (schoolSnap.exists()) {
      const schoolData = schoolSnap.data() as SchoolCloudData;
      if (schoolData && schoolData.perbaikanStore) {
        return schoolData.perbaikanStore;
      }
    }

    return null;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore perbaikan fetch dilewati karena permission rules atau offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore perbaikan fetch ditunda (mode offline):', err?.message || err);
    } else {
      console.error('Error mengambil data perbaikan dari Firestore:', err);
    }
    return null;
  }
}

export function subscribeToPerbaikanData(
  schoolDocId: string,
  onUpdate: (data: Record<number, MonthPerbaikanData>) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'perbaikan_data', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.months) {
          onUpdate(data.months as Record<number, MonthPerbaikanData>);
        }
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isOfflineError(error)) {
        console.warn('Realtime perbaikan listener offline:', error.message);
      } else {
        console.warn('Realtime perbaikan listener error:', error);
      }
      if (onStatusChange) onStatusChange('offline');
    }
  );
}

// ==========================================
// ESKUL LPJ, HONOR & PRESENSI SYNC
// ==========================================

export async function saveEskulRecordToFirestore(
  schoolDocId: string,
  recordKey: string,
  record: MonthEskulRecord,
  masterSiswaEskul?: Record<string, EskulAnggota[]>,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveEskulRecordToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  try {
    if (onStatusChange) onStatusChange('syncing');
    const eskulDocRef = doc(db, 'eskul_data', schoolDocId);
    const cleanRecord = sanitizeForFirestore(record);
    await upsertMapEntry(eskulDocRef, schoolDocId, 'records', recordKey, cleanRecord, false);

    if (masterSiswaEskul) {
      const cleanMaster = sanitizeForFirestore(masterSiswaEskul);
      await setDoc(
        eskulDocRef,
        {
          masterSiswaEskul: cleanMaster,
          updatedAt: new Date().toISOString(),
          lastServerSync: serverTimestamp()
        },
        { merge: true }
      );
    }

    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore eskul save dilewati karena permission rules atau offline');
      if (onStatusChange) onStatusChange('synced');
    } else if (isOfflineError(err)) {
      console.warn('Firestore eskul save ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Error menyimpan data eskul ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export async function saveEskulMasterSiswaToFirestore(
  schoolDocId: string,
  masterSiswaEskul: Record<string, EskulAnggota[]>,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveEskulMasterSiswaToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  try {
    if (onStatusChange) onStatusChange('syncing');
    const eskulDocRef = doc(db, 'eskul_data', schoolDocId);
    const cleanMaster = sanitizeForFirestore(masterSiswaEskul || {});
    await setDoc(
      eskulDocRef,
      {
        id: schoolDocId,
        masterSiswaEskul: cleanMaster,
        updatedAt: new Date().toISOString(),
        lastServerSync: serverTimestamp()
      },
      { merge: true }
    );
    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    console.warn('Gagal menyimpan master siswa eskul:', err);
    if (onStatusChange) onStatusChange('error');
    return false;
  }
}

export async function saveEskulToFirestore(
  schoolDocId: string,
  records: Record<string, MonthEskulRecord>,
  masterSiswaEskul?: Record<string, EskulAnggota[]>,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveEskulToFirestore', schoolDocId);
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  try {
    if (onStatusChange) onStatusChange('syncing');

    const cleanRecords = sanitizeForFirestore(records || {});
    const cleanMasterSiswa = sanitizeForFirestore(masterSiswaEskul || {});

    const eskulPayload = {
      id: schoolDocId,
      records: cleanRecords,
      masterSiswaEskul: cleanMasterSiswa,
      updatedAt: new Date().toISOString(),
      lastServerSync: serverTimestamp()
    };

    const eskulDocRef = doc(db, 'eskul_data', schoolDocId);
    await setDoc(eskulDocRef, eskulPayload, { merge: true });

    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore eskul save dilewati karena permission rules atau offline');
      if (onStatusChange) onStatusChange('synced');
    } else if (isOfflineError(err)) {
      console.warn('Firestore eskul save ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Error menyimpan data eskul ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export function debounceSaveEskulToFirestore(
  schoolDocId: string,
  records: Record<string, MonthEskulRecord>,
  masterSiswaEskul?: Record<string, EskulAnggota[]>,
  onStatusChange?: (status: CloudSyncStatus) => void,
  delay: number = 1000
): boolean {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('debounceSaveEskulToFirestore', schoolDocId);
  }

  const pendingKey = `${schoolDocId}:eskul`;
  const existingPending = pendingSaves.get(pendingKey);
  if (existingPending) {
    clearTimeout(existingPending.timer);
  }

  if (onStatusChange) {
    onStatusChange('syncing');
  }

  const flush = async () => {
    await saveEskulToFirestore(schoolDocId, records, masterSiswaEskul, onStatusChange);
  };

  const timer = setTimeout(async () => {
    pendingSaves.delete(pendingKey);
    await flush();
  }, delay);

  pendingSaves.set(pendingKey, {
    schoolId: schoolDocId,
    timer,
    flush
  });

  return true;
}

export async function fetchEskulFromFirestore(
  schoolDocId: string
): Promise<{
  records: Record<string, MonthEskulRecord>;
  masterSiswaEskul?: Record<string, EskulAnggota[]>;
} | null> {
  if (!isValidSchoolId(schoolDocId)) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    // 1. Coba baca dari eskul_data/{schoolDocId}
    const eskulDocRef = doc(db, 'eskul_data', schoolDocId);
    const snap = await getDoc(eskulDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.records) {
        return {
          records: data.records as Record<string, MonthEskulRecord>,
          masterSiswaEskul: (data.masterSiswaEskul || {}) as Record<string, EskulAnggota[]>
        };
      }
    }

    // 2. Fallback baca dari schools/{schoolDocId}
    const schoolDocRef = doc(db, 'schools', schoolDocId);
    const schoolSnap = await getDoc(schoolDocRef);
    if (schoolSnap.exists()) {
      const schoolData = schoolSnap.data() as SchoolCloudData;
      if (schoolData && schoolData.eskulStore) {
        return {
          records: schoolData.eskulStore,
          masterSiswaEskul: schoolData.masterSiswaEskul || {}
        };
      }
    }

    return null;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('Firestore eskul fetch dilewati karena permission rules atau offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore eskul fetch ditunda (mode offline):', err?.message || err);
    } else {
      console.error('Error mengambil data eskul dari Firestore:', err);
    }
    return null;
  }
}

export function subscribeToEskulData(
  schoolDocId: string,
  onUpdate: (payload: {
    records: Record<string, MonthEskulRecord>;
    masterSiswaEskul?: Record<string, EskulAnggota[]>;
  }) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'eskul_data', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.records) {
          onUpdate({
            records: data.records as Record<string, MonthEskulRecord>,
            masterSiswaEskul: (data.masterSiswaEskul || {}) as Record<string, EskulAnggota[]>
          });
        }
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isOfflineError(error)) {
        console.warn('Realtime eskul listener offline:', error.message);
      } else {
        console.warn('Realtime eskul listener error:', error);
      }
      if (onStatusChange) onStatusChange('offline');
    }
  );
}

// ==========================================
// SCHOOL METADATA FIREBASE SYNC
// ==========================================

export async function saveSchoolMetadataToFirestore(
  schoolDocId: string,
  metadata: SchoolMetadata,
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveSchoolMetadataToFirestore', schoolDocId);
  }
  if (isQuotaExceededGlobal) {
    if (onStatusChange) onStatusChange('quota_exceeded');
    return false;
  }

  const metaHash = JSON.stringify(metadata);
  const metaKey = `${schoolDocId}_meta`;
  if (lastSavedHashes.get(metaKey) === metaHash) {
    if (onStatusChange) onStatusChange('synced');
    return true;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');

  try {
    const docRef = doc(db, 'schools', schoolDocId);
    const cleanMeta = sanitizeForFirestore({
      metadata,
      lastUpdated: serverTimestamp()
    });
    await setDoc(docRef, cleanMeta, { merge: true });
    lastSavedHashes.set(metaKey, metaHash);
    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExceededGlobal = true;
      console.warn('Quota harian Firestore terlampaui saat menyimpan metadata sekolah.');
      if (onStatusChange) onStatusChange('quota_exceeded');
    } else if (isOfflineError(err)) {
      console.warn('Simpan metadata sekolah ditunda (offline):', err.message);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal menyimpan data sekolah ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}

export async function fetchSchoolMetadataFromFirestore(
  schoolDocId: string
): Promise<SchoolMetadata | null> {
  if (!isValidSchoolId(schoolDocId)) {
    return null;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const docRef = doc(db, 'schools', schoolDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.metadata) {
        lastSavedHashes.set(`${schoolDocId}_meta`, JSON.stringify(data.metadata));
        return data.metadata as SchoolMetadata;
      }
    }
    return null;
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExceededGlobal = true;
    } else if (isOfflineError(err)) {
      console.warn('Fetch metadata sekolah offline:', err.message);
    } else {
      console.error('Error mengambil metadata sekolah dari Firestore:', err);
    }
    return null;
  }
}

export function subscribeToSchoolMetadata(
  schoolDocId: string,
  onUpdate: (metadata: SchoolMetadata) => void,
  onStatusChange?: (status: CloudSyncStatus) => void
) {
  if (!isValidSchoolId(schoolDocId)) {
    return () => {};
  }
  const docRef = doc(db, 'schools', schoolDocId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.metadata) {
          markSchoolFieldSynced(schoolDocId, 'metadata', data.metadata);
          lastSavedHashes.set(`${schoolDocId}_meta`, JSON.stringify(data.metadata));
          onUpdate(data.metadata as SchoolMetadata);
        }
        if (onStatusChange) onStatusChange('synced');
      }
    },
    (error) => {
      if (isQuotaError(error)) {
        isQuotaExceededGlobal = true;
        if (onStatusChange) onStatusChange('quota_exceeded');
      } else if (isOfflineError(error)) {
        console.warn('Realtime listener metadata sekolah offline:', error.message);
        if (onStatusChange) onStatusChange('offline');
      } else {
        console.warn('Realtime listener metadata sekolah error:', error);
        if (onStatusChange) onStatusChange('error');
      }
    }
  );
}

// ==========================================
// UNIFIED ALL MASTER DATA FIREBASE SYNC
// (GURU, SISWA, PROFIL SEKOLAH, ESKUL)
// ==========================================

export async function saveAllMasterDataToFirestore(
  schoolDocId: string,
  payload: {
    metadata?: Partial<SchoolMetadata>;
    teachers?: MasterGuru[];
    students?: MasterSiswa[];
    eskulList?: MasterEskul[];
  },
  onStatusChange?: (status: CloudSyncStatus) => void
): Promise<boolean> {
  if (!isValidSchoolId(schoolDocId)) {
    return rejectInvalidSchoolId('saveAllMasterDataToFirestore', schoolDocId);
  }
  if (isQuotaExceededGlobal) {
    if (onStatusChange) onStatusChange('quota_exceeded');
    return false;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (onStatusChange) onStatusChange('offline');
    return false;
  }

  if (onStatusChange) onStatusChange('syncing');

  try {
    const updateObj: Record<string, any> = {
      lastUpdated: serverTimestamp()
    };

    if (payload.metadata) {
      updateObj.metadata = sanitizeForFirestore(payload.metadata);
    }
    if (payload.teachers) {
      updateObj.teachers = sanitizeForFirestore(payload.teachers);
    }
    if (payload.students) {
      updateObj.students = sanitizeForFirestore(payload.students);
    }
    if (payload.eskulList) {
      updateObj.eskulList = sanitizeForFirestore(payload.eskulList);
    }

    // 1. Simpan ke koleksi utama schools/{schoolDocId}
    const schoolDocRef = doc(db, 'schools', schoolDocId);
    await setDoc(schoolDocRef, updateObj, { merge: true });

    if (payload.metadata) {
      markSchoolFieldSynced(schoolDocId, 'metadata', payload.metadata);
    }
    if (payload.teachers) {
      markSchoolFieldSynced(schoolDocId, 'teachers', payload.teachers);
    }
    if (payload.students) {
      markSchoolFieldSynced(schoolDocId, 'students', payload.students);
    }
    if (payload.eskulList) {
      markSchoolFieldSynced(schoolDocId, 'eskulList', payload.eskulList);
    }

    // 2. Simpan juga ke sub-koleksi spesifik agar kompatibel dengan listener tiap tab
    if (payload.teachers && payload.teachers.length > 0) {
      const teachersDocRef = doc(db, 'teachers_data', schoolDocId);
      await setDoc(
        teachersDocRef,
        {
          id: schoolDocId,
          teachers: sanitizeForFirestore(payload.teachers),
          updatedAt: new Date().toISOString(),
          lastUpdated: serverTimestamp()
        },
        { merge: true }
      );
    }

    if (payload.students && payload.students.length > 0) {
      const studentsDocRef = doc(db, 'students_data', schoolDocId);
      await setDoc(
        studentsDocRef,
        {
          id: schoolDocId,
          students: sanitizeForFirestore(payload.students),
          updatedAt: new Date().toISOString(),
          lastUpdated: serverTimestamp()
        },
        { merge: true }
      );
    }

    if (onStatusChange) onStatusChange('synced');
    return true;
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExceededGlobal = true;
      if (onStatusChange) onStatusChange('quota_exceeded');
    } else if (err?.code === 'permission-denied') {
      console.warn('Firestore master sync dilewati karena permission rules');
      if (onStatusChange) onStatusChange('offline');
    } else if (isOfflineError(err)) {
      console.warn('Firestore master sync ditunda (mode offline):', err?.message || err);
      if (onStatusChange) onStatusChange('offline');
    } else {
      console.error('Gagal sinkronisasi data master ke Firestore:', err);
      if (onStatusChange) onStatusChange('error');
    }
    return false;
  }
}
