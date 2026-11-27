import React, { useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { googleSignIn } from '../../lib/firebase';

function getFriendlyAuthError(err: unknown): string {
  const code = (err as any)?.code || '';
  const msg = ((err as any)?.message || '').toLowerCase();

  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return 'Jendela login Google ditutup sebelum proses selesai. Silakan klik tombol masuk untuk mencoba lagi.';
  }
  if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
    return 'Popup login diblokir oleh browser Anda. Mohon izinkan popup untuk situs ini lalu coba kembali.';
  }
  if (code === 'auth/cancelled-popup-request' || msg.includes('cancelled-popup-request')) {
    return 'Permintaan login sebelumnya dibatalkan. Silakan klik tombol masuk sekali lagi.';
  }
  if (code === 'auth/network-request-failed' || msg.includes('network')) {
    return 'Koneksi internet bermasalah. Periksa jaringan Anda dan coba lagi.';
  }
  if (code === 'auth/user-disabled') {
    return 'Akun Google ini dinonaktifkan untuk layanan ini. Hubungi administrator.';
  }
  if (msg.includes('token otorisasi google drive')) {
    return 'Izin akses akun Google belum lengkap. Silakan masuk kembali dan setujui permintaan akses.';
  }
  return 'Gagal masuk dengan Google. Silakan coba lagi beberapa saat.';
}

export const LoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await googleSignIn();
    } catch (err) {
      setErrorMessage(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/70 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-7 sm:p-9">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-2.5 mb-5 shadow-xs">
            <img
              src="/assets/logo_kabupaten_bogor.svg"
              alt="Logo Aplikasi"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Ekstraktor RKAS &amp; BKU BOSP
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Aplikasi pengolah transaksi BKU, rekonsiliasi RKAS 12 bulan, kwitansi, dan generator LPJ BOSP resmi.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs sm:text-sm text-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <div className="mt-7">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Menghubungkan ke Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Khusus akun Google yang telah didaftarkan oleh Admin sistem</span>
        </div>
      </div>
    </div>
  );
};
