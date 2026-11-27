import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db } from './firebase';
import { sanitizeForFirestore } from './firebaseSync';
import { getFriendlyRegistryErrorMessage, toMillisSafe } from './schoolRegistry';
import { AllowedUserRecord, EmailSchoolInvite, SystemRole } from '../types';

export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'ucum.270367@gmail.com';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

function handleUserRegistryError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    code: (error as any)?.code,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  const wrapped = new Error(JSON.stringify(errInfo));
  if ((error as any)?.code) {
    (wrapped as any).code = (error as any).code;
  }
  throw wrapped;
}

export function normalizeEmail(raw?: string | null): string {
  return (raw || '').trim().toLowerCase();
}

export function isValidEmailFormat(raw: string): boolean {
  const clean = normalizeEmail(raw);
  return /^[^\s/]+@[^\s/]+\.[^\s/]+$/.test(clean) && clean.length >= 3 && clean.length <= 254;
}

export function isBootstrapSuperAdmin(email?: string | null): boolean {
  return normalizeEmail(email) === BOOTSTRAP_SUPER_ADMIN_EMAIL;
}

function mapAllowedUserDoc(id: string, data: Record<string, any>): AllowedUserRecord {
  return {
    email: normalizeEmail(data.email || id),
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    systemRole: data.systemRole === 'super_admin' ? 'super_admin' : 'operator',
    active: Boolean(data.active),
    canCreateSchool: Boolean(data.canCreateSchool),
    addedBy: typeof data.addedBy === 'string' ? data.addedBy : undefined,
    lastUid: typeof data.lastUid === 'string' ? data.lastUid : undefined,
    lastLoginAt: data.lastLoginAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

/**
 * Memantau izin akses email pengguna yang sedang login secara realtime (`allowed_users/{email}`).
 * Jika email belum terdaftar atau nonaktif (dan bukan bootstrap Super Admin), mengembalikan null / active: false.
 */
export function subscribeMyAllowedAccess(
  user: User,
  cb: (record: AllowedUserRecord | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const email = normalizeEmail(user.email);
  if (!email || !user.emailVerified) {
    cb(null);
    return () => {};
  }

  const ref = doc(db, 'allowed_users', email);
  let hasEnsuredBootstrap = false;
  let hasUpdatedLastLogin = false;

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        if (isBootstrapSuperAdmin(email)) {
          const fallbackAdmin: AllowedUserRecord = {
            email,
            displayName: user.displayName || 'Super Admin',
            systemRole: 'super_admin',
            active: true,
            canCreateSchool: true,
            lastUid: user.uid
          };
          cb(fallbackAdmin);

          if (!hasEnsuredBootstrap) {
            hasEnsuredBootstrap = true;
            void setDoc(
              ref,
              sanitizeForFirestore({
                email,
                displayName: user.displayName || 'Super Admin',
                systemRole: 'super_admin',
                active: true,
                canCreateSchool: true,
                addedBy: 'system_bootstrap',
                lastUid: user.uid,
                lastLoginAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              })
            ).catch((err) => {
              console.warn('Gagal menyinkronkan profil bootstrap admin:', err);
            });
          }
          return;
        }

        cb(null);
        return;
      }

      const mapped = mapAllowedUserDoc(snap.id, snap.data() || {});
      // Bootstrap admin selalu dianggap aktif sebagai super_admin
      const effectiveRecord: AllowedUserRecord = isBootstrapSuperAdmin(email)
        ? { ...mapped, systemRole: 'super_admin', active: true, canCreateSchool: true }
        : mapped;

      cb(effectiveRecord);

      if (effectiveRecord.active && !hasUpdatedLastLogin) {
        hasUpdatedLastLogin = true;
        const needsProfileSync =
          mapped.lastUid !== user.uid ||
          (!mapped.displayName && Boolean(user.displayName));
        if (needsProfileSync) {
          void updateDoc(
            ref,
            sanitizeForFirestore({
              lastUid: user.uid,
              lastLoginAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              ...(mapped.displayName ? {} : { displayName: user.displayName || '' })
            })
          ).catch((err) => {
            console.warn('Gagal mencatat login terakhir ke allowed_users:', err);
          });
        }
      }
    },
    (error) => {
      if (isBootstrapSuperAdmin(email)) {
        cb({
          email,
          displayName: user.displayName || 'Super Admin',
          systemRole: 'super_admin',
          active: true,
          canCreateSchool: true,
          lastUid: user.uid
        });
        return;
      }
      if (onError) {
        onError(error);
      } else {
        handleUserRegistryError(error, OperationType.GET, `allowed_users/${email}`);
      }
    }
  );
}

/**
 * Berlangganan seluruh daftar email terdaftar (khusus Super Admin).
 */
export function subscribeAllowedUsers(
  cb: (users: AllowedUserRecord[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'allowed_users'),
    (snap) => {
      const list = snap.docs
        .map((d) => mapAllowedUserDoc(d.id, d.data() || {}))
        .sort((a, b) => {
          if (a.systemRole !== b.systemRole) {
            return a.systemRole === 'super_admin' ? -1 : 1;
          }
          if (a.active !== b.active) {
            return a.active ? -1 : 1;
          }
          return a.email.localeCompare(b.email, 'id');
        });
      cb(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleUserRegistryError(error, OperationType.LIST, 'allowed_users');
      }
    }
  );
}

/**
 * Menambah atau memperbarui email terdaftar pada `allowed_users/{email}` (khusus Super Admin).
 */
export async function upsertAllowedUser(
  adminUser: User,
  input: {
    email: string;
    displayName: string;
    systemRole: SystemRole;
    active: boolean;
    canCreateSchool: boolean;
  }
): Promise<AllowedUserRecord> {
  const cleanEmail = normalizeEmail(input.email);
  if (!isValidEmailFormat(cleanEmail)) {
    throw new Error('Format alamat email tidak valid.');
  }

  const isBootstrap = isBootstrapSuperAdmin(cleanEmail);
  const safeRole: SystemRole = isBootstrap ? 'super_admin' : input.systemRole;
  const safeActive = isBootstrap ? true : Boolean(input.active);
  const safeCanCreate = isBootstrap || safeRole === 'super_admin' ? true : Boolean(input.canCreateSchool);
  const cleanName = (input.displayName || '').trim();

  const ref = doc(db, 'allowed_users', cleanEmail);
  const path = `allowed_users/${cleanEmail}`;

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(
        ref,
        sanitizeForFirestore({
          email: cleanEmail,
          displayName: cleanName,
          systemRole: safeRole,
          active: safeActive,
          canCreateSchool: safeCanCreate,
          updatedAt: serverTimestamp()
        })
      );
    } else {
      await setDoc(
        ref,
        sanitizeForFirestore({
          email: cleanEmail,
          displayName: cleanName,
          systemRole: safeRole,
          active: safeActive,
          canCreateSchool: safeCanCreate,
          addedBy: normalizeEmail(adminUser.email) || adminUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
    }

    return {
      email: cleanEmail,
      displayName: cleanName,
      systemRole: safeRole,
      active: safeActive,
      canCreateSchool: safeCanCreate,
      updatedAt: Timestamp.now()
    };
  } catch (error) {
    throw new Error(
      getFriendlyRegistryErrorMessage(error, `Gagal menyimpan email "${cleanEmail}" ke daftar pengguna.`)
    );
  }
}

/**
 * Menghapus email dari `allowed_users/{email}` (khusus Super Admin, kecuali Bootstrap Admin).
 */
export async function deleteAllowedUser(email: string): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  if (isBootstrapSuperAdmin(cleanEmail)) {
    throw new Error('Akun Super Admin utama tidak dapat dihapus.');
  }
  try {
    await deleteDoc(doc(db, 'allowed_users', cleanEmail));
  } catch (error) {
    throw new Error(
      getFriendlyRegistryErrorMessage(error, `Gagal menghapus email "${cleanEmail}".`)
    );
  }
}

/**
 * Membuat penugasan/undangan sekolah langsung berdasarkan email terdaftar (`email_invites/{id}`).
 * Ketika pemilik email masuk dengan Google, sistem otomatis menyambungkannya ke sekolah ini.
 */
export async function createEmailSchoolInvite(
  creatorUser: User,
  input: {
    schoolId: string;
    schoolName: string;
    npsn?: string;
    email: string;
    role: 'editor' | 'viewer';
  }
): Promise<EmailSchoolInvite> {
  const cleanEmail = normalizeEmail(input.email);
  if (!isValidEmailFormat(cleanEmail)) {
    throw new Error('Format alamat email tujuan tidak valid.');
  }

  const inviteRef = doc(collection(db, 'email_invites'));
  const cleanSchoolName = (input.schoolName || '').trim() || 'Sekolah';
  const cleanNpsn = (input.npsn || '').trim();
  const creatorEmail = normalizeEmail(creatorUser.email);

  const payload = sanitizeForFirestore({
    schoolId: input.schoolId,
    schoolName: cleanSchoolName,
    npsn: cleanNpsn,
    email: cleanEmail,
    role: input.role,
    createdBy: creatorUser.uid,
    createdByEmail: creatorEmail,
    createdAt: serverTimestamp()
  });

  try {
    await setDoc(inviteRef, payload);
    return {
      id: inviteRef.id,
      schoolId: input.schoolId,
      schoolName: cleanSchoolName,
      npsn: cleanNpsn,
      email: cleanEmail,
      role: input.role,
      createdBy: creatorUser.uid,
      createdByEmail: creatorEmail,
      createdAt: Timestamp.now()
    };
  } catch (error) {
    throw new Error(
      getFriendlyRegistryErrorMessage(error, 'Gagal membuat undangan email untuk sekolah ini.')
    );
  }
}

/**
 * Berlangganan daftar undangan email yang masih menunggu login untuk sekolah tertentu.
 */
export function subscribeSchoolEmailInvites(
  schoolId: string,
  uid: string,
  isSuperAdminUser: boolean,
  cb: (invites: EmailSchoolInvite[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const q = isSuperAdminUser
    ? query(collection(db, 'email_invites'), where('schoolId', '==', schoolId))
    : query(collection(db, 'email_invites'), where('createdBy', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list: EmailSchoolInvite[] = snap.docs
        .map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            schoolId: (data.schoolId as string) || '',
            schoolName: (data.schoolName as string) || '',
            npsn: (data.npsn as string) || '',
            email: normalizeEmail(data.email),
            role: (data.role === 'editor' ? 'editor' : 'viewer') as 'editor' | 'viewer',
            createdBy: (data.createdBy as string) || '',
            createdByEmail: typeof data.createdByEmail === 'string' ? data.createdByEmail : '',
            createdAt: data.createdAt
          };
        })
        .filter((inv) => inv.schoolId === schoolId)
        .sort((a, b) => toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt));
      cb(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleUserRegistryError(error, OperationType.LIST, 'email_invites');
      }
    }
  );
}

/**
 * Membatalkan penugasan email yang belum diklaim.
 */
export async function revokeEmailSchoolInvite(inviteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'email_invites', inviteId));
  } catch (error) {
    throw new Error(
      getFriendlyRegistryErrorMessage(error, 'Gagal membatalkan undangan email.')
    );
  }
}

/**
 * Mengklaim otomatis seluruh penugasan sekolah berbasis email (`email_invites`)
 * yang ditujukan ke email pengguna yang sedang login.
 */
export async function claimPendingEmailInvites(
  user: User
): Promise<Array<{ schoolId: string; namaSekolah: string; role: 'editor' | 'viewer' }>> {
  const email = normalizeEmail(user.email);
  if (!email || !user.emailVerified) return [];

  const q = query(collection(db, 'email_invites'), where('email', '==', email));
  let snap;
  try {
    snap = await getDocs(q);
  } catch (err) {
    console.warn('Gagal memeriksa penugasan sekolah via email:', err);
    return [];
  }

  if (snap.empty) return [];

  const claimed: Array<{ schoolId: string; namaSekolah: string; role: 'editor' | 'viewer' }> = [];

  for (const d of snap.docs) {
    const data = d.data() || {};
    const schoolId = typeof data.schoolId === 'string' ? data.schoolId.trim() : '';
    const schoolName = typeof data.schoolName === 'string' ? data.schoolName.trim() : 'Sekolah';
    const npsn = typeof data.npsn === 'string' ? data.npsn.trim() : '';
    const role = data.role === 'editor' ? 'editor' : 'viewer';

    if (!schoolId) continue;

    const memberRef = doc(db, 'schools', schoolId, 'members', user.uid);
    const inviteRef = doc(db, 'email_invites', d.id);
    const mySchoolRef = doc(db, 'users', user.uid, 'mySchools', schoolId);

    try {
      const existingMember = await getDoc(memberRef);
      if (existingMember.exists()) {
        // Sudah menjadi anggota sekolah ini — bersihkan undangan duplikat
        await deleteDoc(inviteRef).catch(() => {});
        continue;
      }

      const batch = writeBatch(db);
      batch.set(
        memberRef,
        sanitizeForFirestore({
          uid: user.uid,
          email,
          displayName: user.displayName || '',
          role,
          emailInviteId: d.id,
          addedAt: serverTimestamp()
        })
      );
      batch.delete(inviteRef);
      batch.set(
        mySchoolRef,
        sanitizeForFirestore({
          schoolId,
          namaSekolah: schoolName,
          npsn,
          role,
          createdAt: serverTimestamp()
        })
      );
      await batch.commit();

      claimed.push({ schoolId, namaSekolah: schoolName, role });
    } catch (err) {
      console.warn(`Gagal mengklaim undangan email untuk sekolah ${schoolId}:`, err);
    }
  }

  return claimed;
}
