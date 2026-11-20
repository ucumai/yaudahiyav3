import React, { useRef, useState } from 'react';
import { MasterEskul, SchoolMetadata, TransaksiBKU } from '../../types';
import { formatRupiah } from '../SummaryCards';
import { getCoachesFromEskul } from './EskulMasterTab';
import { PramukaProgramTahunanDocument, PramukaHeaderConfig, DEFAULT_PRAMUKA_CONFIG } from './PramukaProgramTahunanDocument';
import { EskulProgramTahunanStandardDocument } from './EskulProgramTahunanStandardDocument';
import { getThematicEskulProtaMatrix, generateWeeklyMateriForAnyEskul } from '../../utils/pramukaProtaIntegration';
import { findEskulProtaProfile } from '../../data/eskulProtaDataBank';
import { OfficialKopSurat, OfficialSignatures } from '../common/OfficialDocLayout';
import { useSchool } from '../../context/SchoolContext';
import { readLS, writeLS, removeLS } from '../../lib/schoolStorage';
import {
  Printer,
  Download,
  X,
  Trophy,
  Users,
  CheckCircle2,
  Calendar,
  Building2,
  Receipt,
  FileText,
  Sparkles,
  Award,
  SlidersHorizontal,
  Settings2,
  ChevronDown,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

interface EskulReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eskul: MasterEskul;
  metadata: SchoolMetadata;
  bkuData: TransaksiBKU[];
}

export const EskulReportModal: React.FC<EskulReportModalProps> = ({
  isOpen,
  onClose,
  eskul,
  metadata,
  bkuData
}) => {
  const { schoolId } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);
  const [docType, setDocType] = useState<'proker_tahunan' | 'lpj_realisasi'>('proker_tahunan');
  const isPramuka = (eskul?.namaEskul || '').toLowerCase().includes('pramuka') || eskul?.kategori === 'Kepanduan';
  const isSiaga = (eskul?.namaEskul || '').toLowerCase().includes('siaga');

  // Konfigurasi Header Output Program Tahunan Pramuka (Sesuai Permintaan Pengguna)
  const [pramukaConfig, setPramukaConfig] = useState<PramukaHeaderConfig>(() => {
    const saved = readLS<Partial<PramukaHeaderConfig> | null>(schoolId, 'pramuka_proker_config', null);
    if (saved) {
      return {
        ...DEFAULT_PRAMUKA_CONFIG,
        scrambleVariant: eskul?.variasiUrutanKurikulum || 1,
        customKeywords: eskul?.tujuanTahunanKeywords || '',
        ...saved
      };
    }
    return {
      ...DEFAULT_PRAMUKA_CONFIG,
      scrambleVariant: eskul?.variasiUrutanKurikulum || 1,
      customKeywords: eskul?.tujuanTahunanKeywords || '',
    };
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const handleUpdatePramukaConfig = (newConfig: Partial<PramukaHeaderConfig>) => {
    setPramukaConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      writeLS(schoolId, 'pramuka_proker_config', updated);
      return updated;
    });
  };

  const handleResetPramukaConfig = () => {
    setPramukaConfig(DEFAULT_PRAMUKA_CONFIG);
    removeLS(schoolId, 'pramuka_proker_config');
  };

  const logoPramukaInputRef = useRef<HTMLInputElement>(null);
  const logoKananInputRef = useRef<HTMLInputElement>(null);

  const processLogoImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.svg')) return;

    // SVG bypass to preserve pristine vector quality without canvas rasterization
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    if (isSvg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          callback(e.target.result);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml';
          const optimizedDataUrl = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', 0.9);
          callback(optimizedDataUrl);
        } else {
          callback(img.src);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogoPramuka = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoImageFile(file, (dataUrl) => {
        handleUpdatePramukaConfig({
          customLogoPramukaUrl: dataUrl,
          tampilkanLogoKiri: true,
        });
      });
    }
  };

  const handleRemoveLogoPramuka = () => {
    handleUpdatePramukaConfig({
      customLogoPramukaUrl: '',
    });
    if (logoPramukaInputRef.current) {
      logoPramukaInputRef.current.value = '';
    }
  };

  const handleUploadLogoKanan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoImageFile(file, (dataUrl) => {
        handleUpdatePramukaConfig({
          customLogoKananUrl: dataUrl,
          tampilkanLogoKanan: true,
        });
      });
    }
  };

  const handleRemoveLogoKanan = () => {
    handleUpdatePramukaConfig({
      customLogoKananUrl: '',
    });
    if (logoKananInputRef.current) {
      logoKananInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  // Find linked BKU transaction for honor
  const linkedBkuTx = (bkuData || []).find((tx) => {
    if (!tx) return false;
    if (eskul?.noBkuTerkait && tx.no_bku === eskul.noBkuTerkait) return true;
    const txKet = (tx.keterangan || '').toLowerCase();
    if (eskul?.kataKunciBKU && typeof eskul.kataKunciBKU === 'string' && txKet.includes(eskul.kataKunciBKU.toLowerCase().trim())) {
      return true;
    }
    const searchEskulName = (eskul?.namaEskul || '').toLowerCase().trim();
    if (!searchEskulName) return false;
    return (
      txKet.includes(searchEskulName) ||
      (tx.rincian_barang || []).some((r) => (r?.uraian_barang || '').toLowerCase().includes(searchEskulName))
    );
  });

  const honorDetail = linkedBkuTx?.rincian_barang?.[0];
  const totalHonorBku = linkedBkuTx ? linkedBkuTx.total_pengeluaran_bku : (eskul?.honorPerKegiatan || 0);

  const handlePrint = () => {
    const prevTitle = document.title;
    const cleanEskulName = (eskul?.namaEskul || 'Ekstrakurikuler').replace(/[^a-zA-Z0-9]/g, '_');
    const docName = docType === 'proker_tahunan' ? 'Program_Kerja_Tahunan' : 'LPJ_Tahunan';
    document.title = `${docName}_${cleanEskulName}_${(metadata.tahunAnggaran || '2025_2026').replace(/[^a-zA-Z0-9]/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1500);
  };

  const handleDownloadReport = () => {
    const anggota = eskul?.anggotaSiswa || [];
    const prestasi = eskul?.prestasiDanKegiatan || [];

    const reportText = `
LAPORAN PERTANGGUNGJAWABAN (LPJ) TAHUNAN
KEGIATAN EKSTRAKURIKULER ${(eskul?.namaEskul || '').toUpperCase()}
TAHUN PELAJARAN 2025/2026
${(metadata?.namaSekolah || '').toUpperCase()}

I. IDENTITAS EKSTRAKURIKULER
- Nama Ekstrakurikuler: ${eskul?.namaEskul || '-'}
- Kategori: ${eskul?.kategori || '-'}
- Guru Pembina: ${eskul?.namaPembina || '-'} (NIP: ${eskul?.nipPembina || '-'})
- Pelatih / Instruktur: ${eskul?.namaPelatih || '-'} (Kontak: ${eskul?.noHpPelatih || '-'})
- Jadwal & Lokasi: ${eskul?.jadwalLatihan || '-'} di ${eskul?.lokasi || '-'}
- Total Anggota Siswa: ${anggota.length} Siswa

II. REALISASI ANGGARAN & HONOR PELATIH (SUMBER BKU & RKAS BOSP)
- Status SPJ: ${linkedBkuTx ? `Terhubung ke No. BKU ${linkedBkuTx.no_bku}` : 'Input Standar Satuan'}
- Kode Rekening: ${honorDetail?.kode_rekening || '5.1.02.02.01.0029'}
- Uraian: ${honorDetail?.uraian_barang || `Jasa Pelatih ${eskul?.namaEskul || ''}`}
- Volume: ${honorDetail?.volume || 4} ${honorDetail?.satuan || 'orang / hari'} @ ${formatRupiah(honorDetail?.harga_satuan || eskul?.honorPerKegiatan || 0)}
- Total Realisasi Honor: ${formatRupiah(totalHonorBku)}

III. DAFTAR ANGGOTA SISWA (${anggota.length} Siswa)
${anggota.map((s, idx) => `${idx + 1}. [${s.nisn}] ${s.nama} (${s.kelas}) - Jabatan: ${s.peran}`).join('\n')}

IV. CAPAIAN PRESTASI & AGENDA TAHUNAN
${prestasi.map((p, idx) => `${idx + 1}. ${p.namaKegiatan} (${p.tanggalPelaksanaan}) - Tingkat ${p.tingkat}: ${p.capaian}`).join('\n')}

V. EVALUASI KEGIATAN
${eskul?.evaluasiTahunan || 'Kegiatan berlangsung tertib dan lancar sesuai jadwal program kerja.'}

Mengetahui,
Kepala Sekolah: ${metadata?.kepalaSekolah || '-'} (NIP. ${metadata?.nipKepalaSekolah || '-'})
Guru Pembina: ${eskul?.namaPembina || '-'} (NIP. ${eskul?.nipPembina || '-'})
Pelatih: ${eskul?.namaPelatih || '-'}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LPJ_Tahunan_${(eskul?.namaEskul || 'Eskul').replace(/[^a-zA-Z0-9]/g, '_')}_2025_2026.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:bg-white print:static print:overflow-visible print:block print:w-full">
      {/* Print Stylesheet Isolation: Menghapus Otomatis Timestamp/Header Browser & Margin Eksternal */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
              html, body {
                background: #ffffff !important;
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print,
              .print\\:hidden,
              header,
              nav,
              aside,
              button,
              footer {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `,
        }}
      />
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] my-auto overflow-hidden print:max-h-none print:h-auto print:shadow-none print:border-none print:w-full print:rounded-none print:overflow-visible print:m-0 print:p-0 print:block print:static">
        {/* Modal Header Bar - Hidden in Print */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 no-print print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {docType === 'proker_tahunan' ? 'Program Kerja Tahunan Resmi' : 'LPJ Realisasi Anggaran / BKU'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {eskul.namaEskul} &bull; T.A. {metadata.tahunAnggaran || '2025/2026'}
              </p>
            </div>

            {/* Document Mode Switcher: Program Kerja Tahunan vs LPJ Realisasi Anggaran */}
            <div className="ml-2 hidden sm:flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => setDocType('proker_tahunan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'proker_tahunan'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📑 Program Kerja Tahunan
              </button>
              <button
                type="button"
                onClick={() => setDocType('lpj_realisasi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'lpj_realisasi'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💰 LPJ Realisasi Anggaran
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReport}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Teks
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak LPJ / PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOOLBAR KONFIGURASI HEADER & OUTPUT DOKUMEN PRAMUKA (SESUAI PERMINTAAN PENGGUNA) */}
        {isPramuka && docType === 'proker_tahunan' && (
          <div className="bg-amber-50/95 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950 no-print print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
                <span className="font-extrabold uppercase tracking-wide text-amber-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                  Konfigurasi Header &amp; Output Program Tahunan Pramuka
                </span>
                <span className="hidden sm:inline-block text-[11px] text-amber-800 font-medium">
                  (Baris 1: Judul, Baris 2: Nama SD/Pangkalan, Logo Tunas Kelapa &amp; Logo Sekolah)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Badge Pembina Gudep */}
                <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-amber-100/80 text-amber-900 rounded-lg text-[11px] font-semibold border border-amber-300/70">
                  <span>⚜️ Pembina Gudep:</span>
                  <span className="font-bold">{eskul?.namaPembinaGudep || eskul?.namaPembina || '-'}</span>
                </div>

                {/* Tombol Acak / Scramble Cepat */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVariant = ((pramukaConfig.scrambleVariant || 1) % 3) + 1;
                    handleUpdatePramukaConfig({ scrambleVariant: nextVariant });
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                  title="Klik untuk mengacak alur distribusi materi matriks 12 bulan (Model 1, 2, 3)"
                >
                  🎲 Model Alur {pramukaConfig.scrambleVariant || 1} (Acak)
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfigOpen(!isConfigOpen)}
                  className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5 text-amber-700" />
                  {isConfigOpen ? 'Tutup Konfigurasi' : 'Atur Header & Target'}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* EXPANDED CONFIG DRAWER */}
            {isConfigOpen && (
              <div className="mt-3 pt-3 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
                {/* 1. Judul Baris 1 */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 block">
                    Teks Baris 1:
                  </label>
                  <input
                    type="text"
                    value={pramukaConfig.judulBaris1}
                    onChange={(e) => handleUpdatePramukaConfig({ judulBaris1: e.target.value })}
                    placeholder="PROGRAM KERJA PRAMUKA TAHUNAN"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Judul utama bagian atas</p>
                </div>

                {/* 2. Format Baris 2 (Nama SD / Pangkalan) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 block">
                    Format Baris 2 (Di Bawah Judul):
                  </label>
                  <select
                    value={pramukaConfig.subJudulFormat}
                    onChange={(e) => handleUpdatePramukaConfig({ subJudulFormat: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="pangkalan">PANGKALAN {metadata.namaSekolah ? metadata.namaSekolah.toUpperCase() : 'NAMA SD'}</option>
                    <option value="nama_sd">{metadata.namaSekolah ? metadata.namaSekolah.toUpperCase() : 'NAMA SD SAJA'}</option>
                    <option value="gudep_pangkalan">GUGUS DEPAN PANGKALAN {metadata.namaSekolah ? metadata.namaSekolah.toUpperCase() : 'NAMA SD'}</option>
                  </select>
                  <p className="text-[10px] text-slate-500 font-medium">Format identitas pangkalan sekolah</p>
                </div>

                {/* 3. Nomor Gugus Depan */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-800 block">
                    Nomor Gudep (Opsional):
                  </label>
                  <input
                    type="text"
                    value={pramukaConfig.nomorGudep}
                    onChange={(e) => handleUpdatePramukaConfig({ nomorGudep: e.target.value })}
                    placeholder="Contoh: 04.091 - 04.092"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Nomor Gugus Depan Pangkalan</p>
                </div>

                {/* 4. Konfigurasi Logo & Aksi */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800 block">
                      Tampilan Logo:
                    </label>
                    <button
                      type="button"
                      onClick={handleResetPramukaConfig}
                      className="text-[10.5px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pramukaConfig.tampilkanLogoKiri}
                        onChange={(e) => handleUpdatePramukaConfig({ tampilkanLogoKiri: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      Logo Tunas Kelapa (Kiri)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pramukaConfig.tampilkanLogoKanan}
                        onChange={(e) => handleUpdatePramukaConfig({ tampilkanLogoKanan: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      Logo Sekolah / WOSM (Kanan)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pramukaConfig.tampilkanLogoDiSemuaHalaman}
                        onChange={(e) => handleUpdatePramukaConfig({ tampilkanLogoDiSemuaHalaman: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      Terapkan Logo di Setiap Halaman BAB
                    </label>
                  </div>
                </div>

                {/* 5. SEKSI UPLOAD FILE LOGO PRAMUKA & LOGO KANAN (TERSIMPAN DI LOCAL STORAGE) */}
                <div className="sm:col-span-2 lg:col-span-4 mt-2 pt-3 border-t border-amber-200/80 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-amber-700" />
                        Unggah File Logo Kop Dokumen Pramuka (Tersimpan di Local Storage)
                      </h4>
                      <p className="text-[10px] text-amber-800">
                        File logo otomatis dikompresi ringan dan tersimpan permanen di Local Storage browser untuk kop Program Tahunan.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Kotak Upload 1: Logo Pramuka (Kiri) */}
                    <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                        {pramukaConfig.customLogoPramukaUrl ? (
                          <img
                            src={pramukaConfig.customLogoPramukaUrl}
                            alt="Preview Logo Pramuka"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-xs font-black text-amber-800">Tunas</span>
                            <span className="text-[9px] block text-slate-400 font-mono">Default</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Logo Pramuka (Kiri)</span>
                          {pramukaConfig.customLogoPramukaUrl && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Kustom Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {pramukaConfig.customLogoPramukaUrl
                            ? 'Logo kustom tersimpan di Local Storage'
                            : 'Menggunakan logo resmi Tunas Kelapa'}
                        </p>

                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="file"
                            ref={logoPramukaInputRef}
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleUploadLogoPramuka}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoPramukaInputRef.current?.click()}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            {pramukaConfig.customLogoPramukaUrl ? 'Ganti File Logo' : 'Unggah File Logo'}
                          </button>
                          {pramukaConfig.customLogoPramukaUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogoPramuka}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Kembalikan ke logo Tunas Kelapa default"
                            >
                              <Trash2 className="w-3 h-3" />
                              Reset Default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Kotak Upload 2: Logo Kanan (Sekolah / Pangkalan / WOSM) */}
                    <div className="bg-white p-3 rounded-xl border border-amber-300 shadow-2xs flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                        {pramukaConfig.customLogoKananUrl ? (
                          <img
                            src={pramukaConfig.customLogoKananUrl}
                            alt="Preview Logo Kanan"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : metadata?.logoUrl ? (
                          <img
                            src={metadata.logoUrl}
                            alt="Logo Sekolah"
                            className="max-h-full max-w-full object-contain filter grayscale"
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-xs font-black text-indigo-800">WOSM</span>
                            <span className="text-[9px] block text-slate-400 font-mono">Default</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">Logo Kanan (Sekolah/Gudep)</span>
                          {pramukaConfig.customLogoKananUrl && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Kustom Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {pramukaConfig.customLogoKananUrl
                            ? 'Logo kustom kanan tersimpan di Local Storage'
                            : metadata?.logoUrl
                            ? 'Menggunakan Logo Utama Sekolah'
                            : 'Menggunakan lambang Pandu Dunia WOSM'}
                        </p>

                        <div className="flex items-center gap-2 pt-0.5">
                          <input
                            type="file"
                            ref={logoKananInputRef}
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleUploadLogoKanan}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoKananInputRef.current?.click()}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            {pramukaConfig.customLogoKananUrl ? 'Ganti File Logo' : 'Unggah File Logo'}
                          </button>
                          {pramukaConfig.customLogoKananUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogoKanan}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Kembalikan ke logo sekolah default"
                            >
                              <Trash2 className="w-3 h-3" />
                              Reset Default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Target Dinamis Program Tahunan & Generator Matriks */}
                <div className="sm:col-span-2 lg:col-span-4 mt-2 pt-3 border-t border-amber-200/80 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-700" />
                        Target Fokus Program Tahunan &amp; Generator Matriks Dinamis
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded">
                        Model Alur {pramukaConfig.scrambleVariant || 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = ((pramukaConfig.scrambleVariant || 1) % 3) + 1;
                          handleUpdatePramukaConfig({ scrambleVariant: next });
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                      >
                        🎲 Acak / Ganti Variasi Matriks
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-800 block">
                      Kata Kunci / Sasaran Gugus Depan Tahun Ini (Otomatis Merajut Silabus &amp; Matriks):
                    </label>
                    <textarea
                      rows={2}
                      value={pramukaConfig.customKeywords ?? (eskul?.tujuanTahunanKeywords || '')}
                      onChange={(e) => handleUpdatePramukaConfig({ customKeywords: e.target.value })}
                      placeholder="Contoh: Pelantikan SKU Ramu & Rakit, Lomba Tingkat (LT-2), Persami, Bakti Lingkungan, Ujian 10 TKK Wajib"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none font-sans"
                    />

                    {/* Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold">Preset Cepat:</span>
                      {[
                        'Pelantikan SKU Ramu & Rakit',
                        'Lomba Tingkat II (LT-2)',
                        'Perkemahan PERSAMI',
                        'Penjelajahan / Survival Rimba',
                        'Bakti Lingkungan & Adiwiyata',
                        'Uji 10 TKK Wajib',
                        'Pesta Siaga Kwarran'
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const current = pramukaConfig.customKeywords ?? (eskul?.tujuanTahunanKeywords || '');
                            if (!current.toLowerCase().includes(chip.toLowerCase())) {
                              const updated = current.trim() ? `${current.trim()}, ${chip}` : chip;
                              handleUpdatePramukaConfig({ customKeywords: updated });
                            }
                          }}
                          className="text-[10px] bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs font-medium"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-indigo-100/80 gap-2">
                      <span>* Perubahan kata kunci langsung merajut ulang matriks 12 bulan dan sasaran di dokumen secara otomatis.</span>
                      <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Pembina Gudep: {eskul?.namaPembinaGudep || eskul?.namaPembina || '-'} (NIP. {eskul?.nipPembinaGudep || eskul?.nipPembina || '-'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Printable Report Document Body */}
        <div
          ref={printRef}
          className="official-doc-page flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-black font-serif print:p-0 print:m-0 print:overflow-visible print:text-black print:block print:h-auto print:max-h-none print:w-full"
        >
          {docType === 'proker_tahunan' ? (
            isPramuka ? (
              <PramukaProgramTahunanDocument
                eskul={eskul}
                metadata={metadata}
                isSiaga={isSiaga}
                config={pramukaConfig}
              />
            ) : (
              /* DOKUMEN PROGRAM KERJA TAHUNAN 5 LEMBAR (STANDAR RESMI) */
              <EskulProgramTahunanStandardDocument
                eskul={eskul}
                metadata={metadata}
                bkuData={bkuData}
              />
            )
          ) : (
            /* DOKUMEN LPJ REALISASI ANGGARAN & BKU (LAPORAN AKHIR TAHUN - FORMAT POLOS RESMI) */
            <div className="space-y-6 text-black font-serif print:px-[14mm] print:py-[10mm]">
              {/* KOP SURAT SEKOLAH RESMI */}
              <OfficialKopSurat metadata={metadata} variant="dinas" />

              {/* JUDUL LAPORAN */}
              <div className="text-center space-y-1 py-1">
                <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide text-black underline underline-offset-4">
                  LAPORAN PERTANGGUNGJAWABAN (LPJ) TAHUNAN
                </h3>
                <p className="text-xs font-bold uppercase text-black">
                  EKSTRAKURIKULER: {eskul.namaEskul.toUpperCase()}
                </p>
                <p className="text-[11px] text-black font-medium">
                  Tahun Pelajaran {metadata.tahunAnggaran || '2025/2026'} &bull; Sumber Anggaran: Dana BOSP ({metadata.sumberDana})
                </p>
              </div>

              {/* I. INFORMASI UMUM & IDENTITAS */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-xs mb-1">
                  I. IDENTITAS DAN PENANGGUNG JAWAB EKSTRAKURIKULER
                </h4>
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="w-36 py-1 font-medium">- Nama Ekstrakurikuler</td>
                      <td className="w-3 py-1">:</td>
                      <td className="py-1 font-bold">{eskul.namaEskul}</td>
                      <td className="w-32 py-1 font-medium">- Jadwal Latihan</td>
                      <td className="w-3 py-1">:</td>
                      <td className="py-1">{eskul.jadwalLatihan}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium">- Bidang / Kategori</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{eskul.kategori}</td>
                      <td className="py-1 font-medium">- Tempat / Lokasi</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{eskul.lokasi}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium">- Guru Pembina</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{eskul.namaPembina} {eskul.nipPembina ? `(NIP. ${eskul.nipPembina})` : ''}</td>
                      <td className="py-1 font-medium">- Jumlah Peserta</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{(eskul.anggotaSiswa || []).length} Siswa Terdaftar</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium">- Pelatih / Instruktur</td>
                      <td className="py-1">:</td>
                      <td className="py-1" colSpan={4}>
                        {(() => {
                          const coaches = getCoachesFromEskul(eskul);
                          if (coaches.length > 1) {
                            return coaches.map((c, i) => `${i + 1}. ${c.nama} (${c.peran || 'Pelatih'})`).join('  •  ');
                          }
                          return `${eskul.namaPelatih} ${eskul.noHpPelatih ? `(Telp. ${eskul.noHpPelatih})` : ''}`;
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* II. PROGRAM KERJA & TARGET CAPAIAN */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider border-b border-black pb-0.5">
                  II. PROGRAM KERJA DAN TARGET CAPAIAN
                </h4>
                <div className="pl-3 space-y-1.5 leading-relaxed text-justify">
                  <div>
                    <p className="font-bold">A. Uraian Program Kerja:</p>
                    <p>
                      {eskul.deskripsiProgram ||
                        'Menyelenggarakan pembinaan rutin mingguan guna meningkatkan kompetensi, kedisiplinan, sportivitas, musikalitas, dan kepribadian siswa sesuai dengan visi sekolah.'}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold">B. Target Sasaran:</p>
                    <p>
                      {eskul?.targetCapaian ||
                        `Mengikutsertakan sedikitnya ${(eskul?.anggotaSiswa || []).length} peserta didik aktif dan mengikuti ajang kompetisi tingkat kecamatan dan kabupaten.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* III. REALISASI ANGGARAN HONOR PELATIH */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider border-b border-black pb-0.5">
                  III. REALISASI ANGGARAN HONOR PELATIH (SUMBER BKU &amp; RKAS BOSP)
                </h4>
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead className="bg-slate-100 text-black text-[11px] font-bold uppercase text-center">
                    <tr>
                      <th className="border border-black p-1.5 w-10">No</th>
                      <th className="border border-black p-1.5 w-28">Kode Rekening</th>
                      <th className="border border-black p-1.5">Uraian Belanja Jasa Pelatih</th>
                      <th className="border border-black p-1.5 text-center w-24">No. BKU</th>
                      <th className="border border-black p-1.5 text-center w-20">Volume</th>
                      <th className="border border-black p-1.5 text-right w-28">Tarif Satuan</th>
                      <th className="border border-black p-1.5 text-right w-32">Total Realisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-1.5 text-center font-mono">1</td>
                      <td className="border border-black p-1.5 font-mono text-[11px]">
                        {honorDetail?.kode_rekening || '5.1.02.02.01.0029'}
                      </td>
                      <td className="border border-black p-1.5">
                        <p className="font-bold">
                          {honorDetail?.uraian_barang || `Jasa Pelatih Ekstrakurikuler ${eskul?.namaEskul || ''}`}
                        </p>
                        <p className="text-[10px]">
                          Penerima: {eskul?.namaPelatih || '-'} &bull; {eskul?.bankPelatih || 'Bank Rekening'} ({eskul?.noRekeningPelatih || '-'})
                        </p>
                      </td>
                      <td className="border border-black p-1.5 text-center font-mono font-bold">
                        {linkedBkuTx?.no_bku || 'BNU-ESK'}
                      </td>
                      <td className="border border-black p-1.5 text-center font-mono">
                        {honorDetail?.volume || 4} {honorDetail?.satuan || 'kegiatan'}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono">
                        {formatRupiah(honorDetail?.harga_satuan || eskul?.honorPerKegiatan || 0)}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono font-bold">
                        {formatRupiah(totalHonorBku)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={6} className="border border-black p-1.5 text-right uppercase text-[11px]">
                        Total Realisasi Anggaran Honor Pelatih:
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono text-xs">
                        {formatRupiah(totalHonorBku)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* IV. DAFTAR ANGGOTA SISWA TERDAFTAR */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider border-b border-black pb-0.5">
                  IV. DAFTAR PESERTA DIDIK ANGGOTA EKSTRAKURIKULER ({(eskul?.anggotaSiswa || []).length} Siswa)
                </h4>
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead className="bg-slate-100 text-black text-[11px] font-bold uppercase text-center">
                    <tr>
                      <th className="border border-black p-1.5 w-10">No</th>
                      <th className="border border-black p-1.5 w-28">NISN</th>
                      <th className="border border-black p-1.5">Nama Lengkap Siswa</th>
                      <th className="border border-black p-1.5 text-center w-16">Kelas</th>
                      <th className="border border-black p-1.5 text-center w-12">L/P</th>
                      <th className="border border-black p-1.5 text-center w-28">Jabatan / Peran</th>
                      <th className="border border-black p-1.5 text-center w-20">Keaktifan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(eskul?.anggotaSiswa || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-black p-3 text-center italic">
                          Belum ada peserta didik yang didaftarkan pada eskul ini.
                        </td>
                      </tr>
                    ) : (
                      (eskul?.anggotaSiswa || []).map((siswa, idx) => (
                        <tr key={siswa.id || idx}>
                          <td className="border border-black p-1.5 text-center font-mono text-[11px]">{idx + 1}</td>
                          <td className="border border-black p-1.5 text-center font-mono text-[11px]">
                            {siswa.nisn}
                          </td>
                          <td className="border border-black p-1.5 font-bold">
                            {siswa.nama}
                          </td>
                          <td className="border border-black p-1.5 text-center font-medium">
                            {siswa.kelas}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono">
                            {siswa.jenisKelamin}
                          </td>
                          <td className="border border-black p-1.5 text-center">
                            {siswa.peran}
                          </td>
                          <td className="border border-black p-1.5 text-center font-bold">
                            {siswa.keaktifan || 'Aktif'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* V. CAPAIAN PRESTASI & AGENDA TAHUNAN */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider border-b border-black pb-0.5">
                  V. REALISASI AGENDA KEGIATAN DAN CAPAIAN PRESTASI
                </h4>
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead className="bg-slate-100 text-black text-[11px] font-bold uppercase text-center">
                    <tr>
                      <th className="border border-black p-1.5 w-10">No</th>
                      <th className="border border-black p-1.5 w-24">Tanggal</th>
                      <th className="border border-black p-1.5">Nama Kegiatan / Agenda / Lomba</th>
                      <th className="border border-black p-1.5 text-center w-28">Tingkat</th>
                      <th className="border border-black p-1.5">Hasil / Capaian Prestasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(eskul.prestasiDanKegiatan || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-black p-3 text-center italic">
                          Latihan rutin mingguan berjalan secara berkala sesuai program kerja tahunan.
                        </td>
                      </tr>
                    ) : (
                      (eskul.prestasiDanKegiatan || []).map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td className="border border-black p-1.5 text-center font-mono text-[11px]">{idx + 1}</td>
                          <td className="border border-black p-1.5 text-center font-mono text-[11px]">
                            {p.tanggalPelaksanaan}
                          </td>
                          <td className="border border-black p-1.5 font-bold">
                            {p.namaKegiatan}
                          </td>
                          <td className="border border-black p-1.5 text-center font-medium">
                            {p.tingkat}
                          </td>
                          <td className="border border-black p-1.5 font-bold">
                            {p.capaian}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* VI. EVALUASI & TINDAK LANJUT */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider border-b border-black pb-0.5">
                  VI. EVALUASI PELAKSANAAN DAN TINDAK LANJUT
                </h4>
                <div className="pl-3 leading-relaxed text-justify">
                  <p>
                    {eskul.evaluasiTahunan ||
                      'Secara keseluruhan kegiatan ekstrakurikuler terlaksana dengan baik, tertib, dan disiplin sesuai alokasi kalender pendidikan. Seluruh target pembinaan tercapai dan anggaran honor pelatih terealisasi transparan melalui dana BOSP sekolah.'}
                  </p>
                </div>
              </div>

              {/* LEMBAR PENGESAHAN RESMI (3 TANDA TANGAN) */}
              <div className="pt-6 space-y-6 break-inside-avoid print:pt-4 text-black">
                <div className="flex justify-end text-xs">
                  <span>{metadata.kabupatenKota?.replace('Kab. ', '')?.replace('Kota ', '')}, 28 Februari 2026</span>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs text-center">
                  {/* Kiri: Guru Pembina */}
                  <div className="space-y-16">
                    <p className="font-semibold">
                      Guru Pembina Ekstrakurikuler,
                    </p>
                    <div>
                      <p className="font-bold underline underline-offset-2">
                        {eskul.namaPembina}
                      </p>
                      <p className="text-[11px] font-mono">
                        NIP. {eskul.nipPembina || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Kanan: Pelatih Eskul */}
                  <div className="space-y-16">
                    <p className="font-semibold">
                      Pelatih / Instruktur Eskul,
                    </p>
                    {(() => {
                      const coaches = getCoachesFromEskul(eskul);
                      if (coaches.length > 1) {
                        return (
                          <div className="flex flex-wrap items-center justify-center gap-6">
                            {coaches.map((c, i) => (
                              <div key={c.id || i} className="text-center min-w-[120px]">
                                <p className="font-bold underline underline-offset-2">
                                  {c.nama}
                                </p>
                                <p className="text-[11px]">
                                  {c.peran || `Pelatih ${i + 1}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div>
                          <p className="font-bold underline underline-offset-2">
                            {eskul.namaPelatih}
                          </p>
                          <p className="text-[11px]">
                            Instruktur Resmi
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Tengah: Mengetahui Kepala Sekolah */}
                <div className="text-center text-xs space-y-16 pt-4">
                  <p className="font-semibold">
                    Mengetahui &amp; Mengesahkan,<br />
                    Kepala {metadata.namaSekolah}
                  </p>
                  <div>
                    <p className="font-bold underline underline-offset-2 text-sm">
                      {metadata.kepalaSekolah}
                    </p>
                    <p className="text-[11px] font-mono">
                      NIP. {metadata.nipKepalaSekolah}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  </div>
</div>
  );
};
