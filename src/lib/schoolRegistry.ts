import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  writeBatch,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from './firebase';
import { getSchoolDocId, sanitizeForFirestore } from './firebaseSync';
import { initialSchoolMaster } from '../data/masterData';
import { SchoolInvite, SchoolMember, SchoolRole, SchoolSummary } from '../types';

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

// ==========================================
// TAHAP 5: ANGGOTA SEKOLAH & KODE UNDANGAN SEKALI PAKAI
// ==========================================

// Alfabet tanpa karakter mirip (0, O, 1, I, L)
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 10;
const INVITE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

export function toMillisSafe(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  return 0;
}

export function normalizeInviteCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Menghasilkan kode undangan acak 10 karakter tanpa karakter mirip (tanpa 0/O/1/I/L).
 */
export function generateInviteCode(): string {
  const chars: string[] = [];
  const buffer = new Uint8Array(24);
  const alphabetLen = INVITE_CODE_ALPHABET.length; // 31
  const maxUnbiased = Math.floor(256 / alphabetLen) * alphabetLen; // 248

  while (chars.length < INVITE_CODE_LENGTH) {
    crypto.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && chars.length < INVITE_CODE_LENGTH; i++) {
      if (buffer[i] < maxUnbiased) {
        chars.push(INVITE_CODE_ALPHABET[buffer[i] % alphabetLen]);
      }
    }
  }
  return chars.join('');
}

/**
 * Membuat kode undangan sekali pakai (berlaku 7 hari) pada koleksi invites/{kode}.
 * Hanya berhasil jika pembuat adalah Owner sekolah tersebut.
 */
export async function createSchoolInvite(
  user: User,
  input: { schoolId: string; schoolName: string; role: 'editor' | 'viewer' }
): Promise<SchoolInvite> {
  const code = generateInviteCode();
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_VALIDITY_MS);
  const cleanName = (input.schoolName || '').trim() || 'Sekolah';

  const payload = sanitizeForFirestore({
    schoolId: input.schoolId,
    schoolName: cleanName,
    role: input.role,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    expiresAt
  });

  try {
    await setDoc(doc(db, 'invites', code), payload);
    return {
      code,
      schoolId: input.schoolId,
      schoolName: cleanName,
      role: input.role,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      expiresAt
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `invites/${code}`);
  }
}

/**
 * Berlangganan daftar undangan milik pengguna yang sedang login (where('createdBy', '==', uid)).
 */
export function subscribeMyInvites(
  uid: string,
  cb: (invites: SchoolInvite[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = 'invites';
  const q = query(collection(db, 'invites'), where('createdBy', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: SchoolInvite[] = snap.docs
        .map((d) => {
          const data = d.data() || {};
          return {
            code: d.id,
            schoolId: (data.schoolId as string) || '',
            schoolName: (data.schoolName as string) || '',
            role: (data.role === 'editor' ? 'editor' : 'viewer') as 'editor' | 'viewer',
            createdBy: (data.createdBy as string) || '',
            createdAt: data.createdAt,
            expiresAt: data.expiresAt
          };
        })
        .sort((a, b) => toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt));
      cb(list);
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
 * Mencabut (menghapus) kode undangan yang belum terpakai.
 */
export async function revokeInviteCode(code: string): Promise<void> {
  const cleanCode = normalizeInviteCode(code);
  const path = `invites/${cleanCode}`;
  try {
    await deleteDoc(doc(db, 'invites', cleanCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Memeriksa satu dokumen invites/{kode} (hanya getDoc, bukan list).
 * Melempar pesan error ramah bila salah, sudah dipakai, atau kedaluwarsa.
 */
export async function lookupInviteCode(rawCode: string): Promise<SchoolInvite> {
  const code = normalizeInviteCode(rawCode);
  if (!code || !/^[A-Z0-9]{4,32}$/.test(code)) {
    throw new Error('Masukkan kode undangan yang valid (huruf dan angka tanpa spasi).');
  }

  let snap;
  try {
    snap = await getDoc(doc(db, 'invites', code));
  } catch (error) {
    const rawCodeErr = extractRawErrorCode(error).toLowerCase();
    if (rawCodeErr === 'resource-exhausted') {
      throw new Error('Kuota harian gratis habis, coba lagi besok.');
    }
    if (rawCodeErr === 'unavailable') {
      throw new Error('Koneksi internet sedang terputus. Coba lagi saat terhubung.');
    }
    throw new Error('Kode undangan tidak dapat diperiksa atau sudah tidak berlaku.');
  }

  if (!snap.exists()) {
    throw new Error('Kode undangan salah, tidak ditemukan, atau sudah pernah digunakan.');
  }

  const data = snap.data() || {};
  const schoolId = typeof data.schoolId === 'string' ? data.schoolId.trim() : '';
  const schoolName = typeof data.schoolName === 'string' ? data.schoolName.trim() : '';
  const role = data.role;
  const createdBy = typeof data.createdBy === 'string' ? data.createdBy : '';
  const expiresAt = data.expiresAt;

  if (!schoolId || (role !== 'editor' && role !== 'viewer')) {
    throw new Error('Data kode undangan tidak valid.');
  }

  const expiresMs = toMillisSafe(expiresAt);
  if (!expiresMs || expiresMs <= Date.now()) {
    throw new Error('Kode undangan ini sudah kedaluwarsa. Minta pemilik sekolah membuat kode baru.');
  }

  return {
    code: snap.id,
    schoolId,
    schoolName: schoolName || 'Sekolah',
    role,
    createdBy,
    createdAt: data.createdAt,
    expiresAt
  };
}

/**
 * Menerima undangan secara atomik via writeBatch (3 operasi):
 * a. set schools/{schoolId}/members/{uid} dengan inviteCode
 * b. delete invites/{code} (sekali pakai)
 * c. set users/{uid}/mySchools/{schoolId}
 */
export async function acceptInviteCode(
  user: User,
  invite: SchoolInvite
): Promise<{ schoolId: string; namaSekolah: string; npsn: string; role: 'editor' | 'viewer' }> {
  const uid = user.uid;
  const code = normalizeInviteCode(invite.code);
  const schoolId = invite.schoolId;

  const memberRef = doc(db, 'schools', schoolId, 'members', uid);
  const inviteRef = doc(db, 'invites', code);
  const mySchoolRef = doc(db, 'users', uid, 'mySchools', schoolId);

  const memberPayload = sanitizeForFirestore({
    uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: invite.role,
    inviteCode: code,
    addedAt: serverTimestamp()
  });

  const mySchoolPayload = sanitizeForFirestore({
    schoolId,
    namaSekolah: invite.schoolName || 'Sekolah',
    npsn: '',
    role: invite.role,
    createdAt: serverTimestamp()
  });

  const batch = writeBatch(db);
  batch.set(memberRef, memberPayload);
  batch.delete(inviteRef);
  batch.set(mySchoolRef, mySchoolPayload);

  try {
    await batch.commit();
  } catch (error) {
    const rawCode = extractRawErrorCode(error).toLowerCase();
    const msg = (
      error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')
    ).toLowerCase();

    if (
      rawCode === 'resource-exhausted' ||
      msg.includes('resource-exhausted') ||
      msg.includes('quota exceeded') ||
      msg.includes('quota limit exceeded')
    ) {
      throw new Error('Kuota harian gratis habis, coba lagi besok.');
    }

    if (
      rawCode === 'not-found' ||
      rawCode === 'permission-denied' ||
      msg.includes('not-found') ||
      msg.includes('permission-denied') ||
      msg.includes('missing or insufficient permissions')
    ) {
      throw new Error(
        'Kode undangan sudah dipakai, kedaluwarsa, atau akun Anda sudah menjadi anggota sekolah ini.'
      );
    }

    if (rawCode === 'unavailable' || msg.includes('offline') || msg.includes('network')) {
      throw new Error('Koneksi internet sedang terputus. Coba lagi saat terhubung.');
    }

    throw new Error('Gagal bergabung ke sekolah. Silakan periksa kembali kode undangan Anda.');
  }

  // Setelah berhasil menjadi anggota, ambil NPSN & namaSekolah asli dari dokumen sekolah (best-effort)
  let resolvedName = invite.schoolName || 'Sekolah';
  let resolvedNpsn = '';
  try {
    const schoolSnap = await getDoc(doc(db, 'schools', schoolId));
    if (schoolSnap.exists()) {
      const data = schoolSnap.data() as { metadata?: { namaSekolah?: string; npsn?: string } };
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
    console.warn('Berhasil bergabung, tetapi gagal menyegarkan NPSN dari dokumen sekolah:', err);
  }

  return {
    schoolId,
    namaSekolah: resolvedName,
    npsn: resolvedNpsn,
    role: invite.role
  };
}

/**
 * Berlangganan daftar anggota sebuah sekolah (schools/{schoolId}/members).
 */
export function subscribeSchoolMembers(
  schoolId: string,
  cb: (members: SchoolMember[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `schools/${schoolId}/members`;
  return onSnapshot(
    collection(db, 'schools', schoolId, 'members'),
    (snap) => {
      const roleRank: Record<SchoolRole, number> = { owner: 0, editor: 1, viewer: 2 };
      const list: SchoolMember[] = snap.docs
        .map((d) => {
          const data = d.data() || {};
          return {
            uid: (data.uid as string) || d.id,
            email: (data.email as string) || '',
            displayName: (data.displayName as string) || '',
            role: (data.role as SchoolRole) || 'viewer',
            addedAt: data.addedAt,
            inviteCode: data.inviteCode as string | undefined
          };
        })
        .sort((a, b) => {
          const rankDiff = (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9);
          if (rankDiff !== 0) return rankDiff;
          return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'id', {
            sensitivity: 'base'
          });
        });
      cb(list);
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
 * Mengubah peran anggota lain antara 'editor' dan 'viewer' (khusus Owner).
 */
export async function updateSchoolMemberRole(
  schoolId: string,
  targetUid: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  const path = `schools/${schoolId}/members/${targetUid}`;
  try {
    await updateDoc(doc(db, 'schools', schoolId, 'members', targetUid), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Mengeluarkan anggota lain dari sekolah (menghapus dokumen members/{targetUid}).
 */
export async function removeSchoolMember(schoolId: string, targetUid: string): Promise<void> {
  const path = `schools/${schoolId}/members/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'schools', schoolId, 'members', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Berlangganan status keanggotaan pengguna aktif pada sekolah aktif (schools/{schoolId}/members/{uid})
 * agar perubahan peran oleh Owner atau pencabutan akses langsung tercermin di UI.
 */
export function subscribeMyMembership(
  schoolId: string,
  uid: string,
  cb: (member: SchoolMember | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `schools/${schoolId}/members/${uid}`;
  return onSnapshot(
    doc(db, 'schools', schoolId, 'members', uid),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const data = snap.data() || {};
      cb({
        uid: (data.uid as string) || snap.id,
        email: (data.email as string) || '',
        displayName: (data.displayName as string) || '',
        role: (data.role as SchoolRole) || 'viewer',
        addedAt: data.addedAt,
        inviteCode: data.inviteCode as string | undefined
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

/**
 * Menyelaraskan ringkasan role di users/{uid}/mySchools/{schoolId} sesuai keanggotaan terbaru.
 */
export async function syncMySchoolRoleInRegistry(
  uid: string,
  schoolId: string,
  role: SchoolRole
): Promise<void> {
  const path = `users/${uid}/mySchools/${schoolId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'mySchools', schoolId), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
