import React, { useState } from 'react';
import { SchoolMetadata } from '../../types';
import { SchoolLogoUploader } from './SchoolLogoUploader';
import {
  Building2,
  Save,
  CheckCircle2,
  MapPin,
  UserCheck,
  CreditCard,
  Phone,
  Mail,
  RotateCcw,
  Sparkles,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';

interface SchoolMasterTabProps {
  metadata: SchoolMetadata;
  onUpdateMetadata: (newMeta: SchoolMetadata) => void;
  onResetDefault: () => void;
  onOpenExcelModal?: () => void;
}

export const SchoolMasterTab: React.FC<SchoolMasterTabProps> = ({
  metadata,
  onUpdateMetadata,
  onResetDefault,
  onOpenExcelModal
}) => {
  const { readOnly } = useSchool();
  const [formData, setFormData] = useState<SchoolMetadata>(metadata);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state if external metadata changes
  React.useEffect(() => {
    setFormData(metadata);
  }, [metadata]);

  const handleChange = (field: keyof SchoolMetadata, value: any) => {
    if (readOnly) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    onUpdateMetadata(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert / Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-800/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Profil Master Data Satuan Pendidikan</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Data ini otomatis menjadi sumber referensi Kop Surat, Kwitansi BNU, Lembar SPJ, dan Laporan BOSP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          {onOpenExcelModal && (
            <button
              type="button"
              onClick={onOpenExcelModal}
              className="px-3.5 py-2 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/80 rounded-xl border border-emerald-700/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export & Import Profil Sekolah via Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Excel Sekolah
            </button>
          )}

          <button
            type="button"
            onClick={onResetDefault}
            disabled={readOnly}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data
          </button>
          <button
            type="submit"
            disabled={readOnly}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                Tersimpan!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Berhasil disimpan!</strong> Master data sekolah telah diperbarui dan langsung tersinkronisasi ke seluruh modul Kwitansi dan BKU.
          </span>
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-6">
        {/* Logo Kop Surat & Identitas Visual */}
        <SchoolLogoUploader metadata={formData} onChange={handleChange} />

      {/* Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Identitas Pokok Sekolah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Identitas Pokok Satuan Pendidikan
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Resmi Satuan Pendidikan (Kop & Kwitansi)
              </label>
              <input
                type="text"
                value={formData.namaSekolah}
                onChange={(e) => handleChange('namaSekolah', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Contoh: SD NEGERI SUKADAMAI 3"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Pokok Sekolah (NPSN)</label>
                <input
                  type="text"
                  value={formData.npsn}
                  onChange={(e) => handleChange('npsn', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="20201363"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sumber Dana Anggaran</label>
                <input
                  type="text"
                  value={formData.sumberDana}
                  onChange={(e) => handleChange('sumberDana', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="BOSP REGULER TAHAP 1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun Anggaran / Periode BOSP</label>
                <input
                  type="text"
                  value={formData.tahunAnggaran || formData.bulanTahun}
                  onChange={(e) => {
                    handleChange('tahunAnggaran', e.target.value);
                    handleChange('bulanTahun', e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="TAHUN ANGGARAN 2026"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Komite Sekolah</label>
                <input
                  type="text"
                  value={formData.komiteSekolah || ''}
                  onChange={(e) => handleChange('komiteSekolah', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Nama Ketua Komite Sekolah"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pejabat Penandatangan Resmi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Pejabat Pengelola Dana BOSP (TTD Kwitansi)
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            {/* Kepala Sekolah */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                1. Kepala Satuan Pendidikan (KPA / PPK)
              </span>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={formData.kepalaSekolah}
                  onChange={(e) => handleChange('kepalaSekolah', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Nama Kepala Sekolah beserta gelar"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  value={formData.nipKepalaSekolah}
                  onChange={(e) => handleChange('nipKepalaSekolah', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="19xxxxxxxxxxxxxx"
                  required
                />
              </div>
            </div>

            {/* Bendahara BOSP */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                2. Bendahara BOSP (Pemegang Kas Pengeluaran)
              </span>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={formData.bendahara}
                  onChange={(e) => handleChange('bendahara', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Nama Bendahara beserta gelar"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIP Bendahara</label>
                <input
                  type="text"
                  value={formData.nipBendahara}
                  onChange={(e) => handleChange('nipBendahara', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="19xxxxxxxxxxxxxx"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Wilayah & Alamat Lengkap */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Wilayah Administrasi & Domisili
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Provinsi</label>
                <input
                  type="text"
                  value={formData.provinsi}
                  onChange={(e) => handleChange('provinsi', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Jawa Barat"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
                <input
                  type="text"
                  value={formData.kabupatenKota}
                  onChange={(e) => handleChange('kabupatenKota', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Kota Bogor"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kecamatan & Kelurahan / Desa</label>
              <input
                type="text"
                value={formData.desaKecamatan}
                onChange={(e) => handleChange('desaKecamatan', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Jl. Pemuda No. 45, Tanah Sareal"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap & Kode Pos</label>
              <textarea
                rows={2}
                value={formData.alamatLengkap || ''}
                onChange={(e) => handleChange('alamatLengkap', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                placeholder="Jl. Pemuda No. 45 RT 02/RW 05, Kel. Sukadamai, Kec. Tanah Sareal, Kota Bogor 16161"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Kontak & Rekening Bank Penampung */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekening Bank Penampung & Kontak
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Bank Penampung</label>
                <input
                  type="text"
                  value={formData.bankNama || ''}
                  onChange={(e) => handleChange('bankNama', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Bank BJB Cabang Bogor"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. Rekening Giro / Tabungan</label>
                <input
                  type="text"
                  value={formData.bankNoRek || ''}
                  onChange={(e) => handleChange('bankNoRek', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="0012984572001"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rekening Atas Nama</label>
              <input
                type="text"
                value={formData.bankAtasNama || ''}
                onChange={(e) => handleChange('bankAtasNama', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="BOS REGULER SDN SUKADAMAI 3"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Resmi Sekolah</label>
                <input
                  type="email"
                  value={formData.emailSekolah || ''}
                  onChange={(e) => handleChange('emailSekolah', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="sdnsukadamai3bogor@dinasdik.bogor.go.id"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. Telepon / Fax</label>
                <input
                  type="text"
                  value={formData.teleponSekolah || ''}
                  onChange={(e) => handleChange('teleponSekolah', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="(0251) 8334912"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </fieldset>
    </form>
  );
};
