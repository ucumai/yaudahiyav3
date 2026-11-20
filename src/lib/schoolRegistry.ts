import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from './firebase';
import { getSchoolDocId, sanitizeForFirestore } from './firebaseSync';
import { initialSchoolMaster } from '../data/masterData';
import { SchoolRole, SchoolSummary } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function extractRawErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const direct = (error as any).code;
  if (typeof direct === 'string' && direct) return direct;
  const msg = (error as any).message;
  if (typeof msg === 'string' && msg.startsWith('{')) {
    try {
      const parsed = JSON.parse(msg);
      if (typeof parsed?.code === 'string') return parsed.code;
    } catch {
      // ignore
    }
  }
  return '';
}

export function getFriendlyRegistryErrorMessage(error: unknown, fallbackMessage: string): string {
  const code = extractRawErrorCode(error).toLowerCase();
  const msg = (
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')
  ).toLowerCase();

  if (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('quota limit exceeded')
  ) {
    return 'Kuota harian gratis habis, coba lagi besok.';
  }

  if (
    code === 'permission-denied' ||
    msg.includes('permission-denied') ||
    msg.includes('missing or insufficient permissions')
  ) {
    return 'Akses ditolak (permission-denied). Kemungkinan Firestore Security Rules belum ter-deploy atau Anda tidak memiliki izin.';
  }

  if (code === 'unavailable' || msg.includes('offline') || msg.includes('network')) {
    return 'Koneksi internet tidak stabil atau sedang offline. Coba lagi saat terhubung.';
  }

  return fallbackMessage;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const rawCode = extractRawErrorCode(error);
  const errInfo: FirestoreErrorInfo & { code?: string } = {
    error: error instanceof Error ? error.message : String(error),
    ...(rawCode ? { code: rawCode } : {}),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  const wrapped = new Error(JSON.stringify(errInfo));
  if (rawCode) {
    (wrapped as any).code = rawCode;
  }
  throw wrapped;
}

const SCHOOL_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Menghasilkan schoolId unik berformat 'sch_' + 12 karakter [a-z0-9]
 * menggunakan crypto.getRandomValues.
 */
export function generateSchoolId(): string {
  const chars: string[] = [];
  const buffer = new Uint8Array(24);
  while (chars.length < 12) {
    crypto.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && chars.length < 12; i++) {
      // 252 adalah kelipatan terbesar 36 <= 255 untuk menghindari modulo bias
      if (buffer[i] < 252) {
        chars.push(SCHOOL_ID_ALPHABET[buffer[i] % 36]);
      }
    }
  }
  return `sch_${chars.join('')}`;
}

function sortSchoolsByName(list: SchoolSummary[]): SchoolSummary[] {
  return [...list].sort((a, b) =>
    (a.namaSekolah || '').localeCompare(b.namaSekolah || '', 'id', { sensitivity: 'base' })
  );
}

/**
 * Membaca daftar sekolah milik pengguna dari users/{uid}/mySchools,
 * diurutkan berdasarkan namaSekolah.
 */
export async function listMySchools(uid: string): Promise<SchoolSummary[]> {
  const path = `users/${uid}/mySchools`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'mySchools'));
    const list: SchoolSummary[] = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        schoolId: (data.schoolId as string) || d.id,
        namaSekolah: (data.namaSekolah as string) || '',
        npsn: (data.npsn as string) || '',
        role: (data.role as SchoolRole) || 'viewer',
        createdAt: data.createdAt
      };
    });
    return sortSchoolsByName(list);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Berlangganan realtime daftar sekolah milik pengguna dari users/{uid}/mySchools,
 * diurutkan berdasarkan namaSekolah.
 */
export function subscribeMySchools(
  uid: string,
  cb: (schools: SchoolSummary[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `users/${uid}/mySchools`;
  return onSnapshot(
    collection(db, 'users', uid, 'mySchools'),
    (snap) => {
      const list: SchoolSummary[] = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          schoolId: (data.schoolId as string) || d.id,
          namaSekolah: (data.namaSekolah as string) || '',
          npsn: (data.npsn as string) || '',
          role: (data.role as SchoolRole) || 'viewer',
          createdAt: data.createdAt
        };
      });
      cb(sortSchoolsByName(list));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

/**
 * Membuat sekolah baru secara atomik dengan writeBatch (3 dokumen):
 * a. schools/{schoolId}
 * b. schools/{schoolId}/members/{uid}
 * c. users/{uid}/mySchools/{schoolId}
 */
export async function createSchool(
  user: User,
  input: { namaSekolah: string; npsn: string; kabupatenKota?: string; provinsi?: string }
): Promise<string> {
  const schoolId = generateSchoolId();
  const uid = user.uid;
  const namaSekolah = input.namaSekolah.trim();
  const npsn = input.npsn.trim();
  const kabupatenKota = (input.kabupatenKota ?? '').trim() || initialSchoolMaster.kabupatenKota;
  const provinsi = (input.provinsi ?? '').trim() || initialSchoolMaster.provinsi;

  const schoolRef = doc(db, 'schools', schoolId);
  const memberRef = doc(db, 'schools', schoolId, 'members', uid);
  const mySchoolRef = doc(db, 'users', uid, 'mySchools', schoolId);

  const schoolPayload = sanitizeForFirestore({
    id: schoolId,
    ownerUid: uid,
    metadata: {
      ...initialSchoolMaster,
      namaSekolah,
      npsn,
      kabupatenKota,
      provinsi
    },
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp()
  });

  const memberPayload = sanitizeForFirestore({
    uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: 'owner' as SchoolRole,
    addedAt: serverTimestamp()
  });

  const mySchoolPayload = sanitizeForFirestore({
    schoolId,
    namaSekolah,
    npsn,
    role: 'owner' as SchoolRole,
    createdAt: serverTimestamp()
  });

  const batch = writeBatch(db);
  batch.set(schoolRef, schoolPayload);
  batch.set(memberRef, memberPayload);
  batch.set(mySchoolRef, mySchoolPayload);

  try {
    await batch.commit();
    return schoolId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}`);
  }
}

/**
 * Memperbarui ringkasan namaSekolah & npsn di users/{uid}/mySchools/{schoolId}.
 */
export async function renameSchoolInRegistry(
  uid: string,
  schoolId: string,
  input: { namaSekolah: string; npsn: string }
): Promise<void> {
  const path = `users/${uid}/mySchools/${schoolId}`;
  const ref = doc(db, 'users', uid, 'mySchools', schoolId);
  const cleanPayload = sanitizeForFirestore({
    namaSekolah: input.namaSekolah.trim(),
    npsn: input.npsn.trim()
  });
  try {
    await updateDoc(ref, cleanPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Memperbarui namaSekolah & npsn secara atomik di dokumen sekolah (schools/{schoolId})
 * dan ringkasan users/{uid}/mySchools/{schoolId}. Hanya berhasil untuk role owner / editor.
 */
export async function updateSchoolBasicInfo(
  uid: string,
  schoolId: string,
  input: { namaSekolah: string; npsn: string }
): Promise<void> {
  const cleanName = input.namaSekolah.trim();
  const cleanNpsn = input.npsn.trim();
  const schoolRef = doc(db, 'schools', schoolId);
  const mySchoolRef = doc(db, 'users', uid, 'mySchools', schoolId);

  const batch = writeBatch(db);
  batch.update(schoolRef, {
    'metadata.namaSekolah': cleanName,
    'metadata.npsn': cleanNpsn,
    lastUpdated: serverTimestamp()
  });
  batch.update(mySchoolRef, {
    namaSekolah: cleanName,
    npsn: cleanNpsn
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `schools/${schoolId}`);
  }
}

/**
 * Menghapus entri sekolah dari daftar pribadi users/{uid}/mySchools/{schoolId} saja
 * (TIDAK menghapus dokumen data sekolah).
 */
export async function removeSchoolFromMyList(uid: string, schoolId: string): Promise<void> {
  const path = `users/${uid}/mySchools/${schoolId}`;
  const ref = doc(db, 'users', uid, 'mySchools', schoolId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface ClaimLegacySchoolResult {
  schoolId: string;
  namaSekolah: string;
  npsn: string;
}

/**
 * Mengklaim dokumen sekolah lama (ID: `sekolah_<npsn>`) yang belum memiliki `ownerUid`
 * menjadi milik akun yang sedang login secara atomik via writeBatch tanpa menyalin data cloud.
 */
export async function claimLegacySchool(
  user: User,
  npsnInput: string
): Promise<ClaimLegacySchoolResult> {
  const cleanNpsn = npsnInput.trim();
  const legacyId = getSchoolDocId(cleanNpsn);
  const uid = user.uid;
  const fallbackName = `Sekolah ${cleanNpsn}`;

  const schoolRef = doc(db, 'schools', legacyId);
  const memberRef = doc(db, 'schools', legacyId, 'members', uid);
  const mySchoolRef = doc(db, 'users', uid, 'mySchools', legacyId);

  const memberPayload = sanitizeForFirestore({
    uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: 'owner' as SchoolRole,
    addedAt: serverTimestamp()
  });

  const mySchoolPayload = sanitizeForFirestore({
    schoolId: legacyId,
    namaSekolah: fallbackName,
    npsn: cleanNpsn,
    role: 'owner' as SchoolRole,
    createdAt: serverTimestamp()
  });

  const batch = writeBatch(db);
  // a. Klaim ownerUid (hanya diizinkan rules bila dokumen ada dan belum punya ownerUid)
  batch.update(schoolRef, { ownerUid: uid });
  // b. Daftarkan anggota pertama sebagai owner
  batch.set(memberRef, memberPayload);
  // c. Tambahkan ke daftar pribadi mySchools
  batch.set(mySchoolRef, mySchoolPayload);

  try {
    await batch.commit();
  } catch (error) {
    const code = extractRawErrorCode(error).toLowerCase();
    const msg = (
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')
    ).toLowerCase();

    if (
      code === 'resource-exhausted' ||
      msg.includes('resource-exhausted') ||
      msg.includes('quota exceeded') ||
      msg.includes('quota limit exceeded')
    ) {
      throw new Error('Kuota harian gratis habis, coba lagi besok.');
    }

    if (
      code === 'not-found' ||
      code === 'permission-denied' ||
      msg.includes('not-found') ||
      msg.includes('no document to update') ||
      msg.includes('permission-denied') ||
      msg.includes('missing or insufficient permissions')
    ) {
      throw new Error('Sekolah lama dengan NPSN ini tidak ditemukan atau sudah dimiliki akun lain.');
    }

    handleFirestoreError(error, OperationType.WRITE, `schools/${legacyId}`);
  }

  // Setelah menjadi anggota, dokumen schools/{legacyId} sudah boleh dibaca untuk mengambil namaSekolah asli
  let resolvedName = fallbackName;
  let resolvedNpsn = cleanNpsn;
  try {
    const snap = await getDoc(schoolRef);
    if (snap.exists()) {
      const data = snap.data() as { metadata?: { namaSekolah?: string; npsn?: string } };
      const docName = (data?.metadata?.namaSekolah || '').trim();
      const docNpsn = (data?.metadata?.npsn || '').trim();
      if (docName) resolvedName = docName;
      if (docNpsn) resolvedNpsn = docNpsn;

      await updateDoc(
        mySchoolRef,
        sanitizeForFirestore({
          namaSekolah: resolvedName,
          npsn: resolvedNpsn
        })
      );
    }
  } catch (err) {
    console.warn('Klaim berhasil, tetapi gagal menyegarkan namaSekolah dari dokumen:', err);
  }

  return {
    schoolId: legacyId,
    namaSekolah: resolvedName,
    npsn: resolvedNpsn
  };
}
