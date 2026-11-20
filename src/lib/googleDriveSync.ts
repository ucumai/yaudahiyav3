import { SchoolMetadata, MasterGuru, MasterSiswa, MasterEskul, MonthlyArchive, MonthLogistikData, MonthPerbaikanData, RKASItem } from '../types';
import { readLS, writeLS, removeLS } from './schoolStorage';

export interface SchoolDatabasePayload {
  version: string;
  app: string;
  schoolId?: string;
  npsn: string;
  namaSekolah: string;
  lastUpdated: string;
  metadata: SchoolMetadata;
  teachers: MasterGuru[];
  students: MasterSiswa[];
  eskulList: MasterEskul[];
  monthlyStore: Record<number, MonthlyArchive | null>;
  masterRkasPool?: RKASItem[];
  logistikStore?: Record<number, MonthLogistikData>;
  perbaikanStore?: Record<number, MonthPerbaikanData>;
  activeMonthIndex?: number;
}

export interface GoogleDriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

async function searchDriveFileByName(
  accessToken: string,
  filename: string
): Promise<GoogleDriveFileInfo | null> {
  const escapedName = filename.replace(/'/g, "\\'");
  const query = encodeURIComponent(`name = '${escapedName}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)&spaces=drive`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errText = await res.text();
    console.warn('Gagal mencari file di Google Drive:', errText);
    return null;
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string
): Promise<GoogleDriveFileInfo | null> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,size,webViewLink`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: newName })
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const errText = await res.text();
    console.warn('Gagal mengganti nama file Google Drive:', errText);
    return null;
  }

  return (await res.json()) as GoogleDriveFileInfo;
}

// Menemukan file database sekolah yang ada di Google Drive pengguna berdasarkan schoolId permanen.
// Untuk sekolah hasil klaim (schoolId diawali 'sekolah_'), bila file format baru belum ada,
// cari nama lama `bosp_database_<npsn>.json` lalu ganti namanya ke format baru lewat Drive API.
export async function findSchoolDatabaseFile(
  accessToken: string,
  schoolId: string,
  legacyNpsn?: string
): Promise<GoogleDriveFileInfo | null> {
  try {
    const targetFilename = `bosp_database_${schoolId || 'default'}.json`;
    const primaryMatch = await searchDriveFileByName(accessToken, targetFilename);
    if (primaryMatch) {
      return primaryMatch;
    }

    if (schoolId.startsWith('sekolah_')) {
      const derivedSuffix = schoolId.slice('sekolah_'.length).trim();
      const candidates = Array.from(
        new Set(
          [legacyNpsn?.trim(), derivedSuffix].filter(
            (v): v is string => Boolean(v)
          )
        )
      );

      for (const npsnCandidate of candidates) {
        const legacyFilename = `bosp_database_${npsnCandidate}.json`;
        if (legacyFilename === targetFilename) continue;
        const legacyFile = await searchDriveFileByName(accessToken, legacyFilename);
        if (legacyFile) {
          const renamed = await renameDriveFile(accessToken, legacyFile.id, targetFilename);
          return renamed || { ...legacyFile, name: targetFilename };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Error findSchoolDatabaseFile:', err);
    throw err;
  }
}

// Membaca isi file database JSON dari Google Drive
export async function loadSchoolDataFromDrive(
  accessToken: string,
  fileId: string
): Promise<SchoolDatabasePayload | null> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      throw new Error(`Gagal membaca file Drive: HTTP ${res.status}`);
    }

    const payload = (await res.json()) as SchoolDatabasePayload;
    return payload;
  } catch (err) {
    console.error('Error loadSchoolDataFromDrive:', err);
    throw err;
  }
}

// Menyimpan atau memperbarui data database sekolah langsung ke Google Drive
export async function saveSchoolDataToDrive(
  accessToken: string,
  payload: SchoolDatabasePayload,
  existingFileId?: string | null,
  schoolId?: string
): Promise<GoogleDriveFileInfo> {
  const targetSchoolId = schoolId || payload.schoolId;
  const filename = `bosp_database_${targetSchoolId || 'default'}.json`;
  const fileContent = JSON.stringify(payload, null, 2);

  // Jika file sudah ada, lakukan UPDATE (PATCH) konten file
  if (existingFileId) {
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED');
      // Jika file hilang (404), fallback buat baru di bawah
      if (res.status !== 404) {
        throw new Error(`Gagal update file di Drive: HTTP ${res.status}`);
      }
    } else {
      await res.json();
      return {
        id: existingFileId,
        name: filename,
        modifiedTime: new Date().toISOString(),
      };
    }
  }

  // Jika file belum ada, buat file baru menggunakan multipart upload
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: `Database SPJ & BKU BOSP Resmi untuk ${payload.metadata.namaSekolah} (NPSN: ${payload.metadata.npsn})`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    const errBody = await res.text();
    throw new Error(`Gagal membuat file baru di Google Drive: ${errBody}`);
  }

  const createdFile = (await res.json()) as GoogleDriveFileInfo;
  return createdFile;
}

export type DriveRealtimeStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'reconnecting' | 'unauthorized';

export const GDRIVE_STORAGE_KEYS = {
  HAS_CONNECTED: 'bosp_gdrive_has_connected',
  USER_EMAIL: 'bosp_gdrive_user_email',
  USER_NAME: 'bosp_gdrive_user_name',
};

export function isExistingDriveUser(): boolean {
  try {
    return localStorage.getItem(GDRIVE_STORAGE_KEYS.HAS_CONNECTED) === 'true';
  } catch {
    return false;
  }
}

export function getSavedDriveUserInfo(schoolId?: string): { email?: string; name?: string; fileId?: string } {
  try {
    return {
      email: localStorage.getItem(GDRIVE_STORAGE_KEYS.USER_EMAIL) || undefined,
      name: localStorage.getItem(GDRIVE_STORAGE_KEYS.USER_NAME) || undefined,
      fileId: schoolId ? readLS<string | undefined>(schoolId, 'gdrive_file_id', undefined) : undefined,
    };
  } catch {
    return {};
  }
}

export function setSavedDriveConnected(
  user: { email?: string | null; displayName?: string | null },
  fileId?: string | null,
  schoolId?: string
) {
  try {
    localStorage.setItem(GDRIVE_STORAGE_KEYS.HAS_CONNECTED, 'true');
    if (user.email) localStorage.setItem(GDRIVE_STORAGE_KEYS.USER_EMAIL, user.email);
    if (user.displayName) localStorage.setItem(GDRIVE_STORAGE_KEYS.USER_NAME, user.displayName);
    if (schoolId) {
      if (fileId) writeLS(schoolId, 'gdrive_file_id', fileId);
      writeLS(schoolId, 'gdrive_last_sync', new Date().toISOString());
    }
  } catch (e) {
    console.warn('Gagal menyimpan status Google Drive di localStorage', e);
  }
}

export function clearSavedDriveConnection(schoolId?: string) {
  try {
    localStorage.removeItem(GDRIVE_STORAGE_KEYS.HAS_CONNECTED);
    localStorage.removeItem(GDRIVE_STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(GDRIVE_STORAGE_KEYS.USER_NAME);
    if (schoolId) {
      removeLS(schoolId, 'gdrive_file_id');
      removeLS(schoolId, 'gdrive_last_sync');
    }
  } catch (e) {
    console.warn('Gagal menghapus status Google Drive di localStorage', e);
  }
}

const driveDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function triggerDebouncedDriveSave(
  accessToken: string,
  payload: SchoolDatabasePayload,
  existingFileId: string | null | undefined,
  onStatusChange: (status: DriveRealtimeStatus, file?: GoogleDriveFileInfo) => void,
  delay: number = 1500
) {
  const targetSchoolId = payload.schoolId || 'default';
  const existingTimer = driveDebounceTimers.get(targetSchoolId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  onStatusChange('syncing');

  const timer = setTimeout(async () => {
    driveDebounceTimers.delete(targetSchoolId);
    try {
      const file = await saveSchoolDataToDrive(accessToken, payload, existingFileId, targetSchoolId);
      setSavedDriveConnected({}, file.id, payload.schoolId);
      onStatusChange('synced', file);
    } catch (err: any) {
      if (err?.message === 'UNAUTHORIZED') {
        onStatusChange('unauthorized');
      } else {
        console.error('Realtime Drive auto-save error:', err);
        onStatusChange('error');
      }
    }
  }, delay);

  driveDebounceTimers.set(targetSchoolId, timer);
}
