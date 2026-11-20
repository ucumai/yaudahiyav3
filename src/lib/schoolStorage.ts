export function sk(schoolId: string, name: string): string {
  return `bosp:${schoolId}:${name}`;
}

export function readLS<T>(schoolId: string, name: string, fallback: T): T {
  if (!schoolId || typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(sk(schoolId, name));
    if (raw === null) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function writeLS<T>(schoolId: string, name: string, value: T): void {
  if (!schoolId || typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(sk(schoolId, name), JSON.stringify(value));
  } catch (e) {
    console.warn(`Gagal menulis localStorage untuk kunci ${sk(schoolId, name)}:`, e);
  }
}

export function removeLS(schoolId: string, name: string): void {
  if (!schoolId || typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(sk(schoolId, name));
  } catch {
    // ignore
  }
}

export function hasSchoolLocalCache(schoolId: string): boolean {
  if (!schoolId || typeof window === 'undefined') {
    return false;
  }
  try {
    return (
      localStorage.getItem(sk(schoolId, '12months_archive_v3')) !== null ||
      localStorage.getItem(sk(schoolId, 'master_teachers')) !== null
    );
  } catch {
    return false;
  }
}

/**
 * Menghapus seluruh cache aplikasi di localStorage yang diawali 'bosp:'
 * (termasuk riwayat sekolah terakhir 'bosp:lastSchool:<uid>' dan cache per sekolah).
 */
export function clearAllBospStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bosp:')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export interface LegacySchoolMetadataPreview {
  namaSekolah?: string;
  npsn?: string;
}

/**
 * Membaca metadata sekolah dari kunci global lama `bosp_school_metadata` bila ada.
 */
export function readLegacySchoolMetadata(): LegacySchoolMetadataPreview | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('bosp_school_metadata');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        namaSekolah: typeof parsed.namaSekolah === 'string' ? parsed.namaSekolah.trim() : undefined,
        npsn: typeof parsed.npsn === 'string' || typeof parsed.npsn === 'number'
          ? String(parsed.npsn).trim()
          : undefined
      };
    }
    return null;
  } catch {
    return null;
  }
}

const LEGACY_GLOBAL_STORAGE_MAP: ReadonlyArray<{
  oldKey: string;
  newName: string;
  backupKey: string;
}> = [
  { oldKey: 'bosp_12months_archive_v3', newName: '12months_archive_v3', backupKey: 'bosp_legacy_backup_12months_archive_v3' },
  { oldKey: 'bosp_active_month_index', newName: 'active_month_index', backupKey: 'bosp_legacy_backup_active_month_index' },
  { oldKey: 'bosp_bku_transactions', newName: 'bku_transactions', backupKey: 'bosp_legacy_backup_bku_transactions' },
  { oldKey: 'bosp_school_metadata', newName: 'school_metadata', backupKey: 'bosp_legacy_backup_school_metadata' },
  { oldKey: 'bosp_master_teachers', newName: 'master_teachers', backupKey: 'bosp_legacy_backup_master_teachers' },
  { oldKey: 'bosp_master_students', newName: 'master_students', backupKey: 'bosp_legacy_backup_master_students' },
  { oldKey: 'bosp_master_eskul', newName: 'master_eskul', backupKey: 'bosp_legacy_backup_master_eskul' },
  { oldKey: 'bosp_managed_barang_list', newName: 'managed_barang_list', backupKey: 'bosp_legacy_backup_managed_barang_list' },
  { oldKey: 'bosp_managed_personnel_tags', newName: 'managed_personnel_tags', backupKey: 'bosp_legacy_backup_managed_personnel_tags' },
  { oldKey: 'bosp_unified_logistik_items', newName: 'unified_logistik_items', backupKey: 'bosp_legacy_backup_unified_logistik_items' },
  { oldKey: 'bosp_kombel_store_v2', newName: 'kombel_store_v2', backupKey: 'bosp_legacy_backup_kombel_store_v2' },
  { oldKey: 'bosp_perbaikan_store_v2', newName: 'perbaikan_store_v2', backupKey: 'bosp_legacy_backup_perbaikan_store_v2' },
  { oldKey: 'bosp_logistik_config', newName: 'logistik_config', backupKey: 'bosp_legacy_backup_logistik_config' },
  { oldKey: 'bosp_print_preview_settings', newName: 'print_preview_settings', backupKey: 'bosp_legacy_backup_print_preview_settings' },
  { oldKey: 'bosp_pramuka_proker_config', newName: 'pramuka_proker_config', backupKey: 'bosp_legacy_backup_pramuka_proker_config' },
  { oldKey: 'opname_print_settings_v1', newName: 'opname_print_settings_v1', backupKey: 'bosp_legacy_backup_opname_print_settings_v1' },
  { oldKey: 'bosp_gdrive_file_id', newName: 'gdrive_file_id', backupKey: 'bosp_legacy_backup_gdrive_file_id' }
];

export type LegacyMigrationStatus = 'migrated' | 'npsn_mismatch' | 'nothing_to_migrate';

export interface LegacyMigrationResult {
  status: LegacyMigrationStatus;
  copiedCount: number;
  localNpsn?: string;
}

function copyLegacyKeyToSchool(
  schoolId: string,
  oldKey: string,
  newName: string,
  backupKey: string
): boolean {
  const raw = localStorage.getItem(oldKey);
  if (raw === null) return false;

  let valueToStore = raw;
  try {
    JSON.parse(raw);
  } catch {
    valueToStore = JSON.stringify(raw);
  }

  localStorage.setItem(sk(schoolId, newName), valueToStore);
  localStorage.setItem(backupKey, raw);
  localStorage.removeItem(oldKey);
  return true;
}

/**
 * Memigrasikan cache lokal lama (`bosp_*` global & per-ID lama) ke format `bosp:{schoolId}:{nama}`
 * jika NPSN pada `bosp_school_metadata` cocok dengan NPSN sekolah yang dipulihkan,
 * lalu mengganti nama kunci lama menjadi `bosp_legacy_backup_<nama>`.
 */
export function migrateLegacyLocalStorage(
  schoolId: string,
  restoredNpsn: string
): LegacyMigrationResult {
  if (!schoolId || typeof window === 'undefined') {
    return { status: 'nothing_to_migrate', copiedCount: 0 };
  }

  try {
    const cleanRestoredNpsn = restoredNpsn.trim();
    const legacyMeta = readLegacySchoolMetadata();
    const localNpsn = (legacyMeta?.npsn || '').trim();

    if (legacyMeta && localNpsn && localNpsn !== cleanRestoredNpsn) {
      return {
        status: 'npsn_mismatch',
        copiedCount: 0,
        localNpsn
      };
    }

    let copiedCount = 0;

    // 1. Kunci global lama disalin bila bosp_school_metadata memiliki NPSN yang sama
    if (legacyMeta && localNpsn === cleanRestoredNpsn) {
      for (const entry of LEGACY_GLOBAL_STORAGE_MAP) {
        if (copyLegacyKeyToSchool(schoolId, entry.oldKey, entry.newName, entry.backupKey)) {
          copiedCount++;
        }
      }
    }

    // 2. Kunci lama yang sudah memuat ID (`legacyId` === `schoolId`) ikut disalin bila belum diblokir mismatch
    const idScopedEntries = [
      {
        oldKey: `bosp_monthly_logistik_store_${schoolId}`,
        newName: 'monthly_logistik_store',
        backupKey: `bosp_legacy_backup_monthly_logistik_store_${schoolId}`
      },
      {
        oldKey: `bosp_eskul_store_${schoolId}`,
        newName: 'eskul_store',
        backupKey: `bosp_legacy_backup_eskul_store_${schoolId}`
      }
    ];

    for (const entry of idScopedEntries) {
      if (copyLegacyKeyToSchool(schoolId, entry.oldKey, entry.newName, entry.backupKey)) {
        copiedCount++;
      }
    }

    return {
      status: copiedCount > 0 ? 'migrated' : 'nothing_to_migrate',
      copiedCount,
      localNpsn: localNpsn || undefined
    };
  } catch (err) {
    console.warn('Gagal memigrasikan cache lokal lama:', err);
    return { status: 'nothing_to_migrate', copiedCount: 0 };
  }
}

export function countLegacyBackupKeys(): number {
  if (typeof window === 'undefined') return 0;
  try {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bosp_legacy_backup_')) {
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

export function clearLegacyBackupKeys(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bosp_legacy_backup_')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    return keysToRemove.length;
  } catch {
    return 0;
  }
}
