import React, { useRef, useState } from 'react';
import { SchoolMetadata } from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Eye,
  Sliders,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

// Official Tut Wuri Handayani clean SVG Data URL for instant preset
const TUT_WURI_HANDAYANI_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23005596" stroke="%23fdb913" stroke-width="3"/><path d="M50 14 L56 30 L73 30 L59 40 L64 56 L50 46 L36 56 L41 40 L27 30 L44 30 Z" fill="%23fdb913"/><path d="M30 68 C38 60 62 60 70 68 C64 80 36 80 30 68 Z" fill="%23ffffff"/><path d="M45 42 L55 42 L53 66 L47 66 Z" fill="%23fdb913"/><circle cx="50" cy="38" r="4" fill="%23ffffff"/></svg>`;

import { DEFAULT_KABUPATEN_BOGOR_LOGO_DATA_URL } from '../../assets/defaultLogo';
import { useSchool } from '../../context/SchoolContext';

interface SchoolLogoUploaderProps {
  metadata: SchoolMetadata;
  onChange: (field: keyof SchoolMetadata, value: any) => void;
}

export const SchoolLogoUploader: React.FC<SchoolLogoUploaderProps> = ({
  metadata,
  onChange
}) => {
  const { readOnly } = useSchool();
  const [activeLogoTab, setActiveLogoTab] = useState<'kiri' | 'kanan'>('kiri');
  const [dragActiveKiri, setDragActiveKiri] = useState(false);
  const [dragActiveKanan, setDragActiveKanan] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);

  // Maksimal ukuran file logo di Firebase: 100 KB (102,400 bytes)
  const MAX_LOGO_BYTES = 100 * 1024;

  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
    setUploadError(null);

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      setUploadError('Format file tidak didukung. Harap pilih gambar (PNG, JPG, WEBP, atau SVG).');
      return;
    }

    // Jika file SVG, periksa batas ukuran 100KB
    if (file.type === 'image/svg+xml') {
      if (file.size > MAX_LOGO_BYTES) {
        setUploadError(`Ukuran file SVG (${(file.size / 1024).toFixed(1)} KB) melebihi batas maksimum 100 KB. Gunakan file SVG yang lebih kecil.`);
        return;
      }
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
        let maxDim = 350;
        let quality = 0.85;

        const generateCompressed = (dim: number, q: number): string | null => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > dim) {
              height = Math.round((height * dim) / width);
              width = dim;
            }
          } else {
            if (height > dim) {
              width = Math.round((width * dim) / height);
              height = dim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const isTransparent = file.type === 'image/png' || file.type === 'image/webp';
          let dataUrl = canvas.toDataURL(isTransparent ? 'image/png' : 'image/jpeg', q);

          // Jika PNG transparan masih > 100KB, konversi ke JPEG dengan latar putih
          if (isTransparent && dataUrl.length > MAX_LOGO_BYTES) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            dataUrl = canvas.toDataURL('image/jpeg', q);
          }

          return dataUrl;
        };

        let result = generateCompressed(maxDim, quality);
        let tries = 0;

        while (result && result.length > MAX_LOGO_BYTES && tries < 6) {
          tries++;
          maxDim = Math.max(120, Math.round(maxDim * 0.8));
          quality = Math.max(0.35, quality - 0.15);
          result = generateCompressed(maxDim, quality);
        }

        if (!result || result.length > MAX_LOGO_BYTES) {
          setUploadError(`Gagal mengompresi logo di bawah 100 KB. Ukuran file gambar (${(file.size / 1024).toFixed(1)} KB) terlalu besar. Gunakan gambar berukuran lebih kecil.`);
          return;
        }

        callback(result);
      };
      img.onerror = () => {
        setUploadError('Gagal memuat gambar. Pastikan file gambar tidak rusak.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isKanan = false) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        onChange(isKanan ? 'logoKananUrl' : 'logoUrl', dataUrl);
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isKanan = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (isKanan) setDragActiveKanan(false);
    else setDragActiveKiri(false);
    if (readOnly) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        onChange(isKanan ? 'logoKananUrl' : 'logoUrl', dataUrl);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, isKanan = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
    if (isKanan) setDragActiveKanan(true);
    else setDragActiveKiri(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, isKanan = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (isKanan) setDragActiveKanan(false);
    else setDragActiveKiri(false);
  };

  const handleApplyPresetBogor = (target: 'kiri' | 'kanan') => {
    if (readOnly) return;
    onChange(target === 'kiri' ? 'logoUrl' : 'logoKananUrl', DEFAULT_KABUPATEN_BOGOR_LOGO_DATA_URL);
  };

  const handleApplyPresetTutWuri = (target: 'kiri' | 'kanan') => {
    if (readOnly) return;
    onChange(target === 'kiri' ? 'logoUrl' : 'logoKananUrl', TUT_WURI_HANDAYANI_SVG);
  };

  const handleRemoveLogo = (target: 'kiri' | 'kanan') => {
    if (readOnly) return;
    onChange(target === 'kiri' ? 'logoUrl' : 'logoKananUrl', '');
    if (target === 'kiri' && fileInputKiriRef.current) fileInputKiriRef.current.value = '';
    if (target === 'kanan' && fileInputKananRef.current) fileInputKananRef.current.value = '';
  };

  const logoHeight = metadata.logoSizePx || 65;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
      {/* Header Kartu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Logo Kop Surat & Identitas Visual
            </h4>
            <p className="text-[11px] text-slate-500">
              Unggah logo dinas/sekolah yang akan tercetak otomatis pada Kop Surat SPJ, BKU, Kwitansi, dan Opname.
            </p>
          </div>
        </div>

        {/* Tab Pemilihan: Logo Kiri vs Logo Kanan */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveLogoTab('kiri')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeLogoTab === 'kiri'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Logo Utama (Kiri) {metadata.logoUrl && '✓'}
          </button>
          <button
            type="button"
            onClick={() => setActiveLogoTab('kanan')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeLogoTab === 'kanan'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Logo Kanan (Opsional) {metadata.logoKananUrl && '✓'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Konten Tab: Logo Kiri (Utama) */}
      {activeLogoTab === 'kiri' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start gap-4">
            {/* Area Unggah / Dropzone */}
            <div
              onDrop={(e) => handleDrop(e, false)}
              onDragOver={(e) => handleDragOver(e, false)}
              onDragLeave={(e) => handleDragLeave(e, false)}
              onClick={() => !readOnly && fileInputKiriRef.current?.click()}
              className={`flex-1 w-full border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all ${
                readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                dragActiveKiri
                  ? 'border-emerald-500 bg-emerald-50/60 ring-4 ring-emerald-100'
                  : metadata.logoUrl
                  ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100 hover:border-emerald-400'
              }`}
            >
              <input
                ref={fileInputKiriRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={(e) => handleFileChange(e, false)}
                className="hidden"
              />

              {metadata.logoUrl ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                    <img
                      src={metadata.logoUrl}
                      alt="Logo Kiri"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block">Logo Kiri Siap Dipakai</span>
                    <span className="text-[11px] text-slate-500">Klik atau seret file baru untuk mengganti logo</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik untuk pilih logo atau seret gambar ke sini
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      PNG, JPG, WEBP, atau SVG (Direkomendasikan transparan, rasio 1:1)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Aksi & Preset */}
            <div className="w-full md:w-56 space-y-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputKiriRef.current?.click()}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Pilih File Logo...
              </button>

              <button
                type="button"
                onClick={() => handleApplyPresetBogor('kiri')}
                className="w-full px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Pakai Lambang Kab. Bogor
              </button>

              <button
                type="button"
                onClick={() => handleApplyPresetTutWuri('kiri')}
                className="w-full px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Pakai Logo Tut Wuri
              </button>

              {metadata.logoUrl && (
                <button
                  type="button"
                  onClick={() => handleRemoveLogo('kiri')}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Hapus Logo Kiri
                </button>
              )}

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] text-slate-600 leading-snug space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-emerald-600" /> Petunjuk Kop Dinas:
                </span>
                <p>
                  Sisi kiri umumnya memuat <strong>Logo Pemda Kabupaten/Kota</strong> atau <strong>Lambang Resmi Sekolah</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konten Tab: Logo Kanan (Opsional) */}
      {activeLogoTab === 'kanan' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start gap-4">
            {/* Area Unggah / Dropzone Kanan */}
            <div
              onDrop={(e) => handleDrop(e, true)}
              onDragOver={(e) => handleDragOver(e, true)}
              onDragLeave={(e) => handleDragLeave(e, true)}
              onClick={() => !readOnly && fileInputKananRef.current?.click()}
              className={`flex-1 w-full border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all ${
                readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                dragActiveKanan
                  ? 'border-emerald-500 bg-emerald-50/60 ring-4 ring-emerald-100'
                  : metadata.logoKananUrl
                  ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100 hover:border-emerald-400'
              }`}
            >
              <input
                ref={fileInputKananRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={(e) => handleFileChange(e, true)}
                className="hidden"
              />

              {metadata.logoKananUrl ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
                    <img
                      src={metadata.logoKananUrl}
                      alt="Logo Kanan"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-800 block">Logo Kanan Siap Dipakai</span>
                    <span className="text-[11px] text-slate-500">Klik atau seret file baru untuk mengganti</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Unggah Logo Kanan (Opsional)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cocok untuk lambang Tut Wuri Handayani atau Lambang Sekolah kedua
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Aksi & Preset Kanan */}
            <div className="w-full md:w-56 space-y-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputKananRef.current?.click()}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Pilih File Kanan...
              </button>

              <button
                type="button"
                onClick={() => handleApplyPresetBogor('kanan')}
                className="w-full px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Pakai Lambang Kab. Bogor
              </button>

              <button
                type="button"
                onClick={() => handleApplyPresetTutWuri('kanan')}
                className="w-full px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Pakai Logo Tut Wuri
              </button>

              {metadata.logoKananUrl && (
                <button
                  type="button"
                  onClick={() => handleRemoveLogo('kanan')}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Hapus Logo Kanan
                </button>
              )}

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] text-slate-600 leading-snug space-y-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-emerald-600" /> Sisi Kanan:
                </span>
                <p>
                  Jika dikosongkan, teks kop surat tetap seimbang di tengah. Logo kanan opsional untuk format kop ganda (Pemda di kiri & Tut Wuri di kanan).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pengaturan Ukuran Logo */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Tinggi Tampilan Logo di Kop Surat:</span>
        </div>

        <div className="flex items-center gap-2">
          {[
            { label: 'Kecil (52px)', value: 52 },
            { label: 'Standar (65px)', value: 65 },
            { label: 'Besar (78px)', value: 78 }
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange('logoSizePx', preset.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                logoHeight === preset.value
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Pratinjau Kop Surat */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pratinjau Hasil Kop Surat Dinas
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
          >
            {previewOpen ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>

        {previewOpen && (
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-300 shadow-inner overflow-x-auto">
            <div className="min-w-[500px]">
              <KopSuratResmi metadata={metadata} showDoubleLine={true} />
              <div className="text-center pt-2 text-[10px] text-slate-400 font-mono italic">
                (Pratinjau ini merefleksikan posisi logo, nama instansi, dan alamat pada dokumen cetak kedinasan)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
