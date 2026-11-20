import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firestore Database menggunakan ID database khusus dari konfigurasi
const configAny = firebaseConfig as any;
export const db = getFirestore(
  app,
  configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== '(default)'
    ? configAny.firestoreDatabaseId
    : undefined
);

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

// Konfigurasi Google Auth Provider dengan Scope Drive.file (Opsi 3: Database Google Drive Pribadi Sekolah)
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Fungsi silent token request menggunakan Google Identity Services (prompt: '')
export const requestSilentDriveToken = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    const clientId = (firebaseConfig as any).oAuthClientId;
    if (!clientId) {
      resolve(null);
      return;
    }

    let attempts = 0;
    const checkAndRequest = () => {
      const g = (window as any).google;
      if (g?.accounts?.oauth2) {
        try {
          const client = g.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            prompt: '', // Silent! No popup for users who previously granted permissions
            callback: (resp: any) => {
              if (resp?.access_token) {
                cachedAccessToken = resp.access_token;
                resolve(resp.access_token);
              } else {
                resolve(null);
              }
            },
            error_callback: () => {
              resolve(null);
            }
          });
          client.requestAccessToken({ prompt: '' });
        } catch {
          resolve(null);
        }
      } else {
        attempts++;
        if (attempts < 10) {
          setTimeout(checkAndRequest, 250);
        } else {
          resolve(null);
        }
      }
    };

    checkAndRequest();
  });
};

// Initial Auth State Listener (hanya meneruskan token Drive yang sudah ada di memori;
// re-koneksi Drive dilakukan lewat klik pengguna agar tidak diblokir pemblokir popup browser)
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
  _onConnecting?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!user) {
        cachedAccessToken = null;
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Login dengan akun Google sekolah
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token otorisasi Google Drive');
    }

    cachedAccessToken = credential.accessToken;
    // Simpan tanda pengguna terhubung
    try {
      localStorage.setItem('bosp_gdrive_has_connected', 'true');
      if (result.user.email) localStorage.setItem('bosp_gdrive_user_email', result.user.email);
      if (result.user.displayName) localStorage.setItem('bosp_gdrive_user_name', result.user.displayName);
    } catch {}

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in Google error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  try {
    localStorage.removeItem('bosp_gdrive_has_connected');
    localStorage.removeItem('bosp_gdrive_user_email');
    localStorage.removeItem('bosp_gdrive_user_name');
  } catch {}
  await signOut(auth);
  cachedAccessToken = null;
};

// Uji koneksi awal ke Firestore secara aman dengan batas waktu (timeout)
export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) {
    return false;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 3000)
    );

    const checkPromise = getDoc(doc(db, 'test', 'connection'))
      .then(() => true)
      .catch((error: any) => {
        const msg = (error?.message || '').toLowerCase();
        const code = (error?.code || '').toLowerCase();
        if (code === 'unavailable' || msg.includes('offline') || code === 'failed-precondition') {
          console.warn('Firestore offline atau koneksi internet belum terhubung.');
        }
        return false;
      });

    return await Promise.race([checkPromise, timeoutPromise]);
  } catch {
    return false;
  }
}
