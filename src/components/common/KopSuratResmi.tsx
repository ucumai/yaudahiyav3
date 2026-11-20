import React from 'react';
import { SchoolMetadata } from '../../types';
import { Building2 } from 'lucide-react';
import { DEFAULT_KABUPATEN_BOGOR_LOGO_DATA_URL } from '../../assets/defaultLogo';

interface KopSuratResmiProps {
  metadata: SchoolMetadata;
  className?: string;
  showDoubleLine?: boolean;
  compact?: boolean;
  alignCenter?: boolean;
}

export const KopSuratResmi: React.FC<KopSuratResmiProps> = ({
  metadata,
  className = '',
  showDoubleLine = true,
  compact = false
}) => {
  const logoHeight = metadata.logoSizePx || (compact ? 52 : 65);
  const effectiveLogoKiri = metadata.logoUrl || DEFAULT_KABUPATEN_BOGOR_LOGO_DATA_URL;
  const hasLogoKiri = Boolean(effectiveLogoKiri);
  const hasLogoKanan = Boolean(metadata.logoKananUrl);

  const kabKotaText = metadata.kabupatenKota?.toUpperCase() || 'KABUPATEN BOGOR';
  const desaKecText = metadata.desaKecamatan?.toUpperCase() || '';
  const namaSekolahText = metadata.namaSekolah?.toUpperCase() || 'SD NEGERI SATUAN PENDIDIKAN';

  const pemdaText = kabKotaText.includes('PEMERINTAH')
    ? kabKotaText
    : kabKotaText.includes('KABUPATEN') || kabKotaText.includes('KOTA')
    ? `PEMERINTAH ${kabKotaText}`
    : `PEMERINTAH KABUPATEN / KOTA ${kabKotaText}`;

  return (
    <div className={`kop-surat-resmi w-full ${showDoubleLine ? 'border-b-2 border-slate-900 pb-2.5 mb-3 print:border-black' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Logo Sisi Kiri (Logo Utama / Pemda / Lambang Sekolah) */}
        {hasLogoKiri ? (
          <div
            style={{ height: `${logoHeight}px`, minWidth: `${Math.round(logoHeight * 0.826)}px` }}
            className="shrink-0 flex items-center justify-center overflow-hidden"
          >
            <img
              src={effectiveLogoKiri}
              alt="Logo Kop Surat"
              style={{ height: `${logoHeight}px`, width: 'auto', maxHeight: `${logoHeight}px` }}
              className="object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : hasLogoKanan ? (
          // Spacer penyeimbang jika hanya ada logo kanan
          <div
            style={{ height: `${logoHeight}px`, width: `${Math.round(logoHeight * 0.826)}px` }}
            className="shrink-0 opacity-0 pointer-events-none hidden sm:block"
          />
        ) : null}

        {/* Bagian Teks Kop Surat Dinas */}
        <div className="text-center flex-1 space-y-0.5 font-serif">
          <p className={`${compact ? 'text-[9.5px] print:text-[8pt]' : 'text-[10.5px] print:text-[9pt]'} uppercase tracking-widest font-bold text-slate-800 print:text-black leading-tight`}>
            {pemdaText}
          </p>
          <p className={`${compact ? 'text-[9.5px] print:text-[8pt]' : 'text-[10.5px] print:text-[9pt]'} uppercase tracking-widest font-bold text-slate-800 print:text-black leading-tight`}>
            DINAS PENDIDIKAN {desaKecText ? `• KECAMATAN ${desaKecText}` : ''}
          </p>
          <h2 className={`${compact ? 'text-sm sm:text-base print:text-[11.5pt]' : 'text-base sm:text-lg print:text-[13pt]'} font-bold uppercase tracking-wide text-slate-950 print:text-black mt-0.5 leading-tight font-sans`}>
            {namaSekolahText}
          </h2>
          <p className={`${compact ? 'text-[9px] print:text-[7.5pt]' : 'text-[10px] print:text-[8.5pt]'} text-slate-600 print:text-black italic font-sans leading-tight mt-0.5`}>
            {metadata.alamatLengkap || [metadata.desaKecamatan, metadata.kabupatenKota, metadata.provinsi].filter(Boolean).join(', ') || '-'} &bull; NPSN: {metadata.npsn || '-'}
            {metadata.emailSekolah ? ` • Email: ${metadata.emailSekolah}` : ''}
            {metadata.teleponSekolah ? ` • Telp: ${metadata.teleponSekolah}` : ''}
          </p>
        </div>

        {/* Logo Sisi Kanan (Opsional: Tut Wuri Handayani / Lambang Sekolah) */}
        {hasLogoKanan ? (
          <div
            style={{ height: `${logoHeight}px`, minWidth: `${Math.round(logoHeight * 0.826)}px` }}
            className="shrink-0 flex items-center justify-center overflow-hidden"
          >
            <img
              src={metadata.logoKananUrl}
              alt="Logo Kop Kanan"
              style={{ height: `${logoHeight}px`, width: 'auto', maxHeight: `${logoHeight}px` }}
              className="object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : hasLogoKiri ? (
          // Spacer penyeimbang agar teks kop tetap presisi di tengah kertas
          <div
            style={{ height: `${logoHeight}px`, width: `${Math.round(logoHeight * 0.826)}px` }}
            className="shrink-0 opacity-0 pointer-events-none hidden sm:block"
          />
        ) : null}
      </div>
    </div>
  );
};
