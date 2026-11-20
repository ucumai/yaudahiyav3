import React from 'react';
import { SchoolMetadata } from '../../types';

/* =========================================================================
   1. OFFICIAL PAGE CONTAINER
   Standar Kertas A4 Kedinasan Indonesia (Font Serif, Text Hitam, Margin Rapi)
   ========================================================================= */

interface OfficialPageProps {
  children: React.ReactNode;
  className?: string;
  breakAfter?: boolean;
}

export const OfficialPage: React.FC<OfficialPageProps> = ({
  children,
  className = '',
  breakAfter = true,
}) => {
  return (
    <div
      className={`official-doc-page bg-white font-serif text-black leading-relaxed space-y-4 print:p-0 print:m-0 print:shadow-none print:border-none ${
        breakAfter ? 'print:break-after-page' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

/* =========================================================================
   2. OFFICIAL KOP SURAT (Dinas Pendidikan & Gerakan Pramuka Gugus Depan)
   ========================================================================= */

interface OfficialKopSuratProps {
  metadata: SchoolMetadata;
  variant?: 'dinas' | 'pramuka';
  nomorGugusDepan?: string;
  className?: string;
}

export const OfficialKopSurat: React.FC<OfficialKopSuratProps> = ({
  metadata,
  variant = 'dinas',
  nomorGugusDepan,
  className = '',
}) => {
  const namaSekolah = (metadata?.namaSekolah || 'SD NEGERI SATUAN PENDIDIKAN').toUpperCase();
  const kabKota = (metadata?.kabupatenKota || 'KABUPATEN / KOTA').toUpperCase();
  const desaKec = (metadata?.desaKecamatan || '').toUpperCase();
  const npsn = metadata?.npsn || '-';
  const alamat = metadata?.alamatLengkap || [metadata?.desaKecamatan, metadata?.kabupatenKota, metadata?.provinsi].filter(Boolean).join(', ') || '-';

  if (variant === 'pramuka') {
    return (
      <div className={`w-full border-b-4 border-double border-black pb-2.5 mb-3 text-center ${className}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Logo Tunas Kelapa Sisi Kiri (Monochrome Klasik) */}
          <div className="w-14 h-14 shrink-0 flex items-center justify-center p-1 border border-black rounded-full">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-black text-black">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M50 20 C46 28 42 36 43 45 C44 54 49 61 50 78 C51 61 56 54 57 45 C58 36 54 28 50 20 Z" />
              <path d="M50 48 C42 46 36 42 33 34 C35 44 42 49 48 51 Z" />
              <path d="M50 48 C58 46 64 42 67 34 C65 44 58 49 52 51 Z" />
              <path d="M50 78 C47 79 45 83 45 86 C48 86 50 82 50 78 Z" />
              <path d="M50 78 C53 79 55 83 55 86 C52 86 50 82 50 78 Z" />
            </svg>
          </div>

          <div className="flex-1 space-y-0.5">
            <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest leading-tight">
              GERAKAN PRAMUKA GUGUS DEPAN {nomorGugusDepan ? `${nomorGugusDepan} ` : ''}
            </h4>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide leading-tight">
              PANGKALAN {namaSekolah}
            </h2>
            <p className="text-[9.5px] sm:text-[10.5px] font-semibold uppercase leading-tight">
              KWARTIR RANTING {desaKec || 'KECAMATAN'} &bull; {kabKota}
            </p>
            <p className="text-[9px] font-medium leading-tight">
              Alamat: {alamat} &bull; NPSN: {npsn}
            </p>
          </div>

          {/* Spacer Penyeimbang Kanan */}
          <div className="w-14 h-14 shrink-0 flex items-center justify-center p-1 border border-black rounded-full opacity-0 pointer-events-none hidden sm:flex">
            <div className="w-full h-full" />
          </div>
        </div>
      </div>
    );
  }

  // Standar Dinas Pendidikan
  return (
    <div className={`w-full border-b-4 border-double border-black pb-2.5 mb-3 text-center ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {metadata?.logoUrl ? (
          <div className="h-14 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={metadata.logoUrl}
              alt="Logo Sekolah"
              className="h-14 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}

        <div className="flex-1 space-y-0.5">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-tight">
            PEMERINTAH {metadata?.provinsi ? metadata.provinsi.toUpperCase() : 'DAERAH'} &bull; DINAS PENDIDIKAN {kabKota}
          </p>
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wide leading-tight">
            {namaSekolah}
          </h2>
          <p className="text-[9px] sm:text-[10px] font-medium leading-tight">
            {alamat} &bull; NPSN: {npsn}
            {metadata?.emailSekolah ? ` • Email: ${metadata.emailSekolah}` : ''}
          </p>
        </div>

        {metadata?.logoKananUrl ? (
          <div className="h-14 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={metadata.logoKananUrl}
              alt="Logo Kanan"
              className="h-14 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : metadata?.logoUrl ? (
          <div className="h-14 w-12 shrink-0 opacity-0 pointer-events-none hidden sm:block" />
        ) : null}
      </div>
    </div>
  );
};

/* =========================================================================
   3. OFFICIAL DOCUMENT TITLE & SUBTITLE
   ========================================================================= */

interface OfficialDocTitleProps {
  title: string;
  subtitle?: string;
  nomorSurat?: string;
  keterangan?: string;
  className?: string;
}

export const OfficialDocTitle: React.FC<OfficialDocTitleProps> = ({
  title,
  subtitle,
  nomorSurat,
  keterangan,
  className = '',
}) => {
  return (
    <div className={`text-center space-y-1 my-3 ${className}`}>
      <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide underline underline-offset-4 decoration-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs sm:text-[13px] font-bold uppercase tracking-wider">
          {subtitle}
        </p>
      )}
      {nomorSurat && (
        <p className="text-[11px] font-mono font-medium">
          Nomor: {nomorSurat}
        </p>
      )}
      {keterangan && (
        <p className="text-[10.5px] font-medium">
          {keterangan}
        </p>
      )}
    </div>
  );
};

/* =========================================================================
   4. OFFICIAL SECTION HEADER
   (Contoh: "I. PENDAHULUAN", "II. PELAKSANAAN LATIHAN", "A. LATAR BELAKANG")
   ========================================================================= */

interface OfficialSectionHeaderProps {
  title: string;
  withBorder?: boolean;
  className?: string;
}

export const OfficialSectionHeader: React.FC<OfficialSectionHeaderProps> = ({
  title,
  withBorder = false,
  className = '',
}) => {
  return (
    <h4
      className={`font-bold uppercase text-xs sm:text-[12px] mt-3.5 mb-1.5 tracking-wider ${
        withBorder ? 'border-b border-black pb-0.5' : ''
      } ${className}`}
    >
      {title}
    </h4>
  );
};

/* =========================================================================
   5. OFFICIAL TABLE SUITE (Borders, Headers, Padding Baku Manual)
   ========================================================================= */

interface OfficialTableProps {
  children: React.ReactNode;
  className?: string;
}

export const OfficialTable: React.FC<OfficialTableProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className="overflow-x-auto w-full my-2">
      <table className={`w-full border-collapse border border-black text-[11px] leading-tight ${className}`}>
        {children}
      </table>
    </div>
  );
};

interface OfficialThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const OfficialTh: React.FC<OfficialThProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <th
      className={`border border-black p-1.5 bg-slate-100 font-bold uppercase text-black text-center align-middle ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

interface OfficialTdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export const OfficialTd: React.FC<OfficialTdProps> = ({
  children,
  align = 'left',
  className = '',
  ...props
}) => {
  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <td
      className={`border border-black p-1.5 text-black ${alignClass} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

/* =========================================================================
   6. OFFICIAL SIGNATURES (Lembar Pengesahan Baku 2 Pihak & 3 Pihak)
   ========================================================================= */

interface SignaturePerson {
  label: string;
  subLabel?: string;
  nama: string;
  nip?: string;
  jabatan?: string;
}

interface OfficialSignaturesProps {
  tanggalSurat: string;
  kota?: string;
  leftPerson: SignaturePerson;
  rightPerson: SignaturePerson;
  centerPerson?: SignaturePerson; // Untuk pola 3 pihak (Kwitansi / LPJ)
  className?: string;
}

export const OfficialSignatures: React.FC<OfficialSignaturesProps> = ({
  tanggalSurat,
  kota = 'Bogor',
  leftPerson,
  rightPerson,
  centerPerson,
  className = '',
}) => {
  if (centerPerson) {
    // Pola 3 Pihak (Kwitansi Honor / BKU)
    return (
      <div className={`pt-4 text-xs font-serif text-black space-y-2 break-inside-avoid ${className}`}>
        <div className="flex justify-end text-xs mb-2">
          <span>{kota}, {tanggalSurat}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Pihak 1: Kiri (Kepala Sekolah) */}
          <div className="flex flex-col justify-between h-36">
            <div>
              <p className="text-[11px]">{leftPerson.subLabel || 'Setuju dibayar,'}</p>
              <p className="font-bold">{leftPerson.label}</p>
            </div>
            <div>
              <p className="font-bold underline">{leftPerson.nama}</p>
              <p className="text-[10px] font-mono">NIP. {leftPerson.nip || '-'}</p>
            </div>
          </div>

          {/* Pihak 2: Tengah (Bendahara) */}
          <div className="flex flex-col justify-between h-36">
            <div>
              <p className="text-[11px]">{centerPerson.subLabel || 'Lunas dibayar,'}</p>
              <p className="font-bold">{centerPerson.label}</p>
            </div>
            <div>
              <p className="font-bold underline">{centerPerson.nama}</p>
              <p className="text-[10px] font-mono">NIP. {centerPerson.nip || '-'}</p>
            </div>
          </div>

          {/* Pihak 3: Kanan (Penerima / Pelatih) */}
          <div className="flex flex-col justify-between h-36">
            <div>
              <p className="text-[11px]">{rightPerson.subLabel || 'Yang menerima,'}</p>
              <p className="font-bold">{rightPerson.label}</p>
            </div>
            <div>
              <p className="font-bold underline">{rightPerson.nama}</p>
              <p className="text-[10px]">{rightPerson.jabatan || (rightPerson.nip ? `NIP. ${rightPerson.nip}` : '')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pola Standar 2 Pihak (Mengetahui Kepala Sekolah & Pembina/Pelatih)
  return (
    <div className={`pt-6 grid grid-cols-2 gap-8 text-xs font-serif text-black break-inside-avoid ${className}`}>
      {/* Sisi Kiri: Mengetahui Kepala Sekolah / Mabigus */}
      <div className="space-y-1 text-left">
        <p className="font-medium">{leftPerson.subLabel || 'Mengetahui,'}</p>
        <p className="font-bold uppercase tracking-wider">{leftPerson.label}</p>
        <div className="h-16" />
        <p className="font-bold underline text-sm">{leftPerson.nama}</p>
        <p className="font-mono text-[11px]">NIP. {leftPerson.nip || '-'}</p>
      </div>

      {/* Sisi Kanan: Pembina / Pelatih */}
      <div className="space-y-1 text-right">
        <p className="font-medium">
          {kota}, {tanggalSurat}
        </p>
        <p className="font-bold uppercase tracking-wider">{rightPerson.label}</p>
        <div className="h-16" />
        <p className="font-bold underline text-sm">{rightPerson.nama}</p>
        <p className="font-mono text-[11px]">NIP. {rightPerson.nip || '-'}</p>
      </div>
    </div>
  );
};

/* =========================================================================
   7. OFFICIAL META TABLE (Tabel Informasi Rinci 2 Kolom Kedinasan)
   ========================================================================= */

interface MetaItem {
  label: string;
  value: React.ReactNode;
  widthLabel?: string;
}

interface OfficialMetaTableProps {
  items: MetaItem[];
  className?: string;
}

export const OfficialMetaTable: React.FC<OfficialMetaTableProps> = ({
  items,
  className = '',
}) => {
  return (
    <div className={`my-2 overflow-x-auto ${className}`}>
      <table className="w-full text-xs font-serif text-black border-collapse">
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-black/10 last:border-b-0">
              <td className={`py-1 pr-2 font-medium align-top ${item.widthLabel || 'w-48 sm:w-56'}`}>
                {item.label}
              </td>
              <td className="py-1 px-1.5 font-bold align-top w-4">:</td>
              <td className="py-1 pl-1.5 font-semibold align-top">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* =========================================================================
   8. OFFICIAL COVER PAGE (Halaman Sampul Standar Kedinasan)
   ========================================================================= */

interface OfficialCoverPageProps {
  title: string;
  subTitle?: string;
  subDetail?: string;
  tahunAnggaran: string;
  metadata: SchoolMetadata;
  leftPerson: SignaturePerson;
  rightPerson: SignaturePerson;
  variant?: 'dinas' | 'pramuka';
  customLogoUrl?: string;
  className?: string;
}

export const OfficialCoverPage: React.FC<OfficialCoverPageProps> = ({
  title,
  subTitle,
  subDetail,
  tahunAnggaran,
  metadata,
  leftPerson,
  rightPerson,
  variant = 'dinas',
  customLogoUrl,
  className = '',
}) => {
  const namaSekolah = (metadata?.namaSekolah || 'SD NEGERI SATUAN PENDIDIKAN').toUpperCase();
  const kecamatan = (metadata?.desaKecamatan || '').toUpperCase();
  const kabupatenKota = (metadata?.kabupatenKota || '').toUpperCase();

  return (
    <div
      className={`border-2 border-black p-8 sm:p-12 bg-white text-center space-y-6 print:border-black print:m-[10mm_12mm] print:p-8 print:break-after-page text-black font-serif ${className}`}
    >
      {/* Logo Sampul (Pramuka Tunas Kelapa, Logo Custom Upload, atau Logo Sekolah Kedinasan) */}
      <div className="flex justify-center">
        {customLogoUrl ? (
          <div className="w-24 h-24 rounded-full border-2 border-black bg-white flex items-center justify-center p-2 overflow-hidden shadow-2xs">
            <img
              src={customLogoUrl}
              alt="Logo Pramuka Gugus Depan"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : variant === 'pramuka' ? (
          <div className="w-24 h-24 rounded-full border-2 border-black bg-white flex items-center justify-center p-2.5">
            <svg viewBox="0 0 100 100" className="w-full h-full fill-black text-black">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
              <path d="M50 20 C46 28 42 36 43 45 C44 54 49 61 50 78 C51 61 56 54 57 45 C58 36 54 28 50 20 Z" />
              <path d="M50 48 C42 46 36 42 33 34 C35 44 42 49 48 51 Z" />
              <path d="M50 48 C58 46 64 42 67 34 C65 44 58 49 52 51 Z" />
              <path d="M50 78 C47 79 45 83 45 86 C48 86 50 82 50 78 Z" />
              <path d="M50 78 C53 79 55 83 55 86 C52 86 50 82 50 78 Z" />
            </svg>
          </div>
        ) : metadata?.logoUrl ? (
          <div className="w-24 h-24 flex items-center justify-center p-1">
            <img
              src={metadata.logoUrl}
              alt="Logo Sekolah"
              className="max-h-full max-w-full object-contain filter grayscale"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center font-bold text-2xl">
            SD
          </div>
        )}
      </div>

      {/* Identitas Instansi / Lembaga */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-widest text-black">
          {variant === 'pramuka' ? 'GERAKAN PRAMUKA GUGUS DEPAN' : 'PEMERINTAH DAERAH DINAS PENDIDIKAN'}
        </h4>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
          {variant === 'pramuka' ? `PANGKALAN ${namaSekolah}` : namaSekolah}
        </h1>
        <p className="text-xs uppercase font-bold text-black">
          {variant === 'pramuka' ? `KWARTIR RANTING KECAMATAN ${kecamatan || 'KECAMATAN'} • ${kabupatenKota}` : `${kecamatan} • ${kabupatenKota}`}
        </p>
      </div>

      {/* Judul Dokumen Utama */}
      <div className="py-5 border-y-2 border-black space-y-1.5">
        <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-black">
          {title}
        </h2>
        {subTitle && (
          <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
            {subTitle}
          </h3>
        )}
        {subDetail && (
          <p className="text-xs font-semibold text-black uppercase">
            {subDetail}
          </p>
        )}
        <p className="text-xs font-semibold text-black pt-1">
          TAHUN AJARAN / TAHUN ANGGARAN {tahunAnggaran}
        </p>
      </div>

      {/* Penanggung Jawab Sampul */}
      <div className="grid grid-cols-2 gap-4 text-xs pt-4 max-w-lg mx-auto text-black">
        <div className="text-left space-y-0.5">
          <p className="font-semibold">{leftPerson.label}:</p>
          <p className="font-bold underline">{leftPerson.nama}</p>
          <p className="font-mono text-[11px]">{leftPerson.nip ? `NIP. ${leftPerson.nip}` : '-'}</p>
        </div>
        <div className="text-right space-y-0.5">
          <p className="font-semibold">{rightPerson.label}:</p>
          <p className="font-bold underline">{rightPerson.nama}</p>
          <p className="font-mono text-[11px]">{rightPerson.nip ? `NIP. ${rightPerson.nip}` : '-'}</p>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   9. STANDAR FORMATTING HELPERS (TANGGAL & MATA UANG)
   ========================================================================= */

const NAMA_BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatTanggalDinas(dateInput?: string | Date | null, kota?: string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    return kota ? `${kota}, -` : '-';
  }
  const tgl = d.getDate();
  const bln = NAMA_BULAN_INDONESIA[d.getMonth()];
  const thn = d.getFullYear();
  const dateStr = `${tgl} ${bln} ${thn}`;
  return kota ? `${kota}, ${dateStr}` : dateStr;
}

export function formatRupiahDinas(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
