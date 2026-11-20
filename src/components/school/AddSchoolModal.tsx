import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { AlertCircle, AlertTriangle, Building2, Loader2, Plus, X } from 'lucide-react';
import { SchoolSummary } from '../../types';
import { initialSchoolMaster } from '../../data/masterData';
import { createSchool, getFriendlyRegistryErrorMessage } from '../../lib/schoolRegistry';

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  schools: SchoolSummary[];
  onCreated: (schoolId: string, namaSekolah: string) => void;
}

export const AddSchoolModal: React.FC<AddSchoolModalProps> = ({
  isOpen,
  onClose,
  user,
  schools,
  onCreated
}) => {
  const [namaSekolah, setNamaSekolah] = useState('');
  const [npsn, setNpsn] = useState('');
  const [kabupatenKota, setKabupatenKota] = useState(initialSchoolMaster.kabupatenKota);
  const [provinsi, setProvinsi] = useState(initialSchoolMaster.provinsi);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNamaSekolah('');
      setNpsn('');
      setKabupatenKota(initialSchoolMaster.kabupatenKota);
      setProvinsi(initialSchoolMaster.provinsi);
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const cleanNpsn = npsn.trim();
  const isDuplicateNpsn = useMemo(() => {
    if (!cleanNpsn) return false;
    return schools.some((s) => (s.npsn || '').trim() === cleanNpsn);
  }, [schools, cleanNpsn]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanName = namaSekolah.trim();
    if (!cleanName) {
      setErrorMessage('Nama sekolah wajib diisi.');
      return;
    }

    if (!/^\d{8}$/.test(cleanNpsn)) {
      setErrorMessage('NPSN wajib diisi dan harus berupa 8 digit angka.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const newSchoolId = await createSchool(user, {
        namaSekolah: cleanName,
        npsn: cleanNpsn,
        kabupatenKota: kabupatenKota.trim() || initialSchoolMaster.kabupatenKota,
        provinsi: provinsi.trim() || initialSchoolMaster.provinsi
      });
      onCreated(newSchoolId, cleanName);
      onClose();
    } catch (err) {
      setErrorMessage(
        getFriendlyRegistryErrorMessage(
          err,
          'Gagal membuat sekolah baru. Periksa koneksi internet Anda lalu coba lagi.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-school-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-school-modal-title" className="text-base font-bold text-slate-900">
                Tambah Sekolah Baru
              </h2>
              <p className="text-xs text-slate-500">
                Sekolah baru dimulai dalam kondisi kosong dan terisolasi
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Sekolah <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaSekolah}
              onChange={(e) => setNamaSekolah(e.target.value)}
              placeholder="Contoh: SD NEGERI SUKADAMAI 3"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              NPSN (8 digit angka) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={npsn}
              onChange={(e) => setNpsn(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Contoh: 20201363"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {isDuplicateNpsn && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>NPSN ini sudah ada di daftar Anda</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kabupaten / Kota
              </label>
              <input
                type="text"
                value={kabupatenKota}
                onChange={(e) => setKabupatenKota(e.target.value)}
                placeholder={initialSchoolMaster.kabupatenKota}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Provinsi
              </label>
              <input
                type="text"
                value={provinsi}
                onChange={(e) => setProvinsi(e.target.value)}
                placeholder={initialSchoolMaster.provinsi}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Simpan Sekolah</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
