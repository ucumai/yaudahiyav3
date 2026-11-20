import React from 'react';
import { MasterEskul, SchoolMetadata } from '../../types';
import {
  OfficialPage,
  OfficialCoverPage,
  OfficialDocTitle,
  OfficialSectionHeader,
  OfficialTable,
  OfficialTh,
  OfficialTd,
  OfficialSignatures,
} from '../common/OfficialDocLayout';

interface PramukaProgramTahunanProps {
  eskul: MasterEskul;
  metadata: SchoolMetadata;
  isSiaga?: boolean;
  config?: PramukaHeaderConfig;
}

export interface PramukaHeaderConfig {
  judulBaris1: string;
  subJudulFormat: 'pangkalan' | 'nama_sd' | 'gudep_pangkalan';
  customSubJudul?: string;
  nomorGudep: string;
  tampilkanLogoKiri: boolean;
  tampilkanLogoKanan: boolean;
  tampilkanLogoDiSemuaHalaman: boolean;
  // Upload logo kustom (tersimpan di local storage)
  customLogoPramukaUrl?: string; // Logo Pramuka Kiri Kustom (Data URL)
  customLogoKananUrl?: string; // Logo Kanan Kustom (Data URL)
  // Konfigurasi dinamis target & variasi urutan/matriks
  scrambleVariant?: number; // 1, 2, atau 3
  customKeywords?: string;  // Kata kunci tambahan / override
}

export const DEFAULT_PRAMUKA_CONFIG: PramukaHeaderConfig = {
  judulBaris1: 'PROGRAM KERJA PRAMUKA TAHUNAN',
  subJudulFormat: 'pangkalan',
  customSubJudul: '',
  nomorGudep: '',
  tampilkanLogoKiri: true,
  tampilkanLogoKanan: true,
  tampilkanLogoDiSemuaHalaman: false,
  customLogoPramukaUrl: '',
  customLogoKananUrl: '',
  scrambleVariant: 1,
  customKeywords: '',
};

/* =========================================================================
   LOGO SVG RESMI: TUNAS KELAPA (PRAMUKA) & FLEUR-DE-LIS (WOSM)
   ========================================================================= */

export const PramukaLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <div className={`border-2 border-black rounded-full flex items-center justify-center p-1 bg-white shrink-0 shadow-2xs ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full fill-black text-black">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M50 18 C46 26 42 34 43 44 C44 54 49 61 50 78 C51 61 56 54 57 44 C58 34 54 26 50 18 Z" />
      <path d="M50 48 C42 46 35 41 32 33 C34 43 41 49 48 51 Z" />
      <path d="M50 48 C58 46 65 41 68 33 C66 43 59 49 52 51 Z" />
      <path d="M50 78 C46 79 44 83 45 87 C48 87 50 82 50 78 Z" />
      <path d="M50 78 C54 79 56 83 55 87 C52 87 50 82 50 78 Z" />
    </svg>
  </div>
);

export const WosmLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <div className={`border-2 border-black rounded-full flex items-center justify-center p-1 bg-white shrink-0 shadow-2xs ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full fill-black text-black">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M50 20 C48 30 46 45 50 68 C54 45 52 30 50 20 Z" />
      <path d="M50 45 C41 43 32 37 30 28 C28 42 36 53 47 55 Z" />
      <path d="M50 45 C59 43 68 37 70 28 C72 42 64 53 53 55 Z" />
      <circle cx="38" cy="38" r="2.5" />
      <circle cx="62" cy="38" r="2.5" />
      <path d="M42 62 Q50 65 58 62 L57 67 Q50 70 43 67 Z" />
    </svg>
  </div>
);

/* =========================================================================
   PRAMUKA DOC HEADER: LOGO KIRI, JUDUL BARIS 1, BARIS 2 NAMA SD, LOGO KANAN
   ========================================================================= */

export const PramukaDocHeader: React.FC<{
  title: string;
  subTitle: string;
  detailText: string;
  config: PramukaHeaderConfig;
  metadata: SchoolMetadata;
  showLogos?: boolean;
}> = ({
  title,
  subTitle,
  detailText,
  config,
  metadata,
  showLogos = true,
}) => {
  return (
    <div className="w-full pb-2.5 mb-4 border-b-4 border-double border-black text-black">
      <div className="flex items-center justify-between gap-3">
        {/* Logo Kiri: Logo Tunas Kelapa Gerakan Pramuka atau Logo Kustom yang Diunggah */}
        {showLogos && config.tampilkanLogoKiri && (
          <div className="w-14 sm:w-16 h-14 sm:h-16 shrink-0 flex items-center justify-center overflow-hidden">
            {config.customLogoPramukaUrl ? (
              <img
                src={config.customLogoPramukaUrl}
                alt="Logo Pramuka"
                className="max-h-13 sm:max-h-15 max-w-13 sm:max-w-15 object-contain"
              />
            ) : (
              <PramukaLogoSvg className="w-13 sm:w-15 h-13 sm:h-15" />
            )}
          </div>
        )}

        {/* Konten Judul Bertingkat (Baris 1 di atas, Baris 2 Nama SD di bawahnya) */}
        <div className="flex-1 space-y-0.5 text-center">
          {/* Baris 1: PROGRAM KERJA PRAMUKA TAHUNAN */}
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider leading-tight text-black">
            {title}
          </h3>
          {/* Baris 2: NAMA SD / PANGKALAN NAMA SD */}
          <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide leading-tight text-black">
            {subTitle}
          </h4>
          {/* Baris 3: Detail Tahun Ajaran & Gugus Depan */}
          <p className="text-[10px] sm:text-[11px] font-medium leading-tight text-black">
            {detailText}
          </p>
        </div>

        {/* Logo Kanan: Logo Kustom Kanan, Logo Sekolah atau Logo Pandu Dunia WOSM */}
        {showLogos && config.tampilkanLogoKanan && (
          <div className="w-14 sm:w-16 h-14 sm:h-16 shrink-0 flex items-center justify-center overflow-hidden">
            {config.customLogoKananUrl ? (
              <img
                src={config.customLogoKananUrl}
                alt="Logo Kanan"
                className="max-h-13 sm:max-h-15 max-w-13 sm:max-w-15 object-contain"
              />
            ) : metadata?.logoUrl ? (
              <img
                src={metadata.logoUrl}
                alt="Logo Sekolah"
                className="max-h-13 sm:max-h-15 max-w-13 sm:max-w-15 object-contain filter grayscale"
                referrerPolicy="no-referrer"
              />
            ) : metadata?.logoKananUrl ? (
              <img
                src={metadata.logoKananUrl}
                alt="Logo Kanan"
                className="max-h-13 sm:max-h-15 max-w-13 sm:max-w-15 object-contain filter grayscale"
                referrerPolicy="no-referrer"
              />
            ) : (
              <WosmLogoSvg className="w-13 sm:w-15 h-13 sm:h-15" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export interface PramukaMatrixItem {
  no: number;
  kegiatan: string;
  bulan: number[];
  keterangan?: string;
}

export function generateDynamicPramukaCurriculum(
  isSiaga: boolean,
  eskul: MasterEskul,
  config?: PramukaHeaderConfig
) {
  const activeConfig = config || DEFAULT_PRAMUKA_CONFIG;
  const rawVariant = Number(activeConfig.scrambleVariant || eskul.variasiUrutanKurikulum || 1);
  const variant = rawVariant > 0 ? ((rawVariant - 1) % 3) + 1 : 1; // 1, 2, atau 3

  // Gabungkan semua sumber kata kunci (config override, master data, capaian, deskripsi)
  const keywordsCombined = [
    activeConfig.customKeywords || '',
    eskul.tujuanTahunanKeywords || '',
    eskul.targetCapaian || '',
    eskul.deskripsiProgram || ''
  ].filter(Boolean).join(', ');

  const kw = keywordsCombined.toLowerCase();

  const hasLt = kw.includes('lt') || kw.includes('lomba') || kw.includes('kompetisi') || kw.includes('kwarran') || kw.includes('prestasi');
  const hasPersami = kw.includes('persami') || kw.includes('kemah') || kw.includes('camping') || kw.includes('perkemahan');
  const hasPelantikan = kw.includes('pelantikan') || kw.includes('sku') || kw.includes('ramu') || kw.includes('rakit') || kw.includes('terap') || kw.includes('mula') || kw.includes('bantu') || kw.includes('tata');
  const hasJelajah = kw.includes('jelajah') || kw.includes('survival') || kw.includes('kompas') || kw.includes('jejak') || kw.includes('rimba') || kw.includes('wide game');
  const hasBakti = kw.includes('bakti') || kw.includes('lingkungan') || kw.includes('adiwiyata') || kw.includes('kebersihan') || kw.includes('sosial');
  const hasTkk = kw.includes('tkk') || kw.includes('skk') || kw.includes('menabung') || kw.includes('masak') || kw.includes('p3k') || kw.includes('kebun');
  const hasPestaSiaga = kw.includes('pesta siaga') || kw.includes('karnaval') || isSiaga;

  // Daftar Fokus Target Capaian SD yang Ditargetkan
  let fokusTargetList: string[] = [];
  if (eskul.tujuanTahunanKeywords?.trim()) {
    fokusTargetList = eskul.tujuanTahunanKeywords
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (fokusTargetList.length === 0) {
    fokusTargetList = isSiaga
      ? [
          'Pencapaian butir SKU Siaga Mula, Bantu, dan Tata',
          'Partisipasi ajang Pesta Siaga Tingkat Kwartir Ranting',
          'Ujian Syarat Kecakapan Khusus (TKK) Menabung, Juru Kebun & Sholat',
          'Pembinaan karakter budi pekerti, keceriaan & cinta keluarga'
        ]
      : [
          'Pencapaian butir SKU Penggalang Ramu & Rakit',
          'Partisipasi aktif Lomba Tingkat II (LT-2) Kwartir Ranting',
          'Penyelenggaraan Perkemahan Sabtu-Minggu (PERSAMI) Gugus Depan',
          'Pencapaian 10 Tanda Kecakapan Khusus (TKK) Wajib Penggalang'
        ];
  }

  // 12-Month Matrix
  const matrix: PramukaMatrixItem[] = [];
  let no = 1;

  // 1. Penerimaan Calon
  matrix.push({
    no: no++,
    kegiatan: isSiaga 
      ? 'Penerimaan Calon Siaga Baru & Pembentukan Barung Ceria' 
      : 'Penerimaan Calon Penggalang & Pembentukan Regu Baru',
    bulan: variant === 2 ? [7, 8] : [7, 10],
    keterangan: 'Awal Semester'
  });

  // 2. Latihan Rutin
  matrix.push({
    no: no++,
    kegiatan: isSiaga 
      ? 'Latihan Rutin Mingguan Ceria & Budi Pekerti (Dwi Satya & Dwi Darma)' 
      : 'Latihan Rutin Mingguan (PBB Dasar, Kedisiplinan & Tata Upacara)',
    bulan: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    keterangan: 'Rutin Mingguan'
  });

  // 3. Teknik Kepramukaan
  matrix.push({
    no: no++,
    kegiatan: isSiaga
      ? 'Keterampilan Dasar Kepramukaan Siaga (Simpul Praktis & Permainan)'
      : 'Keterampilan Teknik Kepramukaan (Tali Temali, Pionering & Sandi)',
    bulan: variant === 2 ? [1, 2, 3, 7, 8, 9, 10, 11] : [1, 2, 3, 4, 9, 10, 11],
    keterangan: 'Teori & Praktek'
  });

  // 4. P3K & Tanggap Darurat
  matrix.push({
    no: no++,
    kegiatan: isSiaga
      ? 'Pembiasaan Hidup Sehat, Kebersihan Diri & P3K Ringan'
      : 'Pertolongan Pertama (P3K Sederhana) & Tandu Darurat Mitela',
    bulan: variant === 3 ? [2, 4, 9] : [3, 5, 10],
    keterangan: 'Kesehatan Lapangan'
  });

  // Injeksi Dinamis: Lomba Tingkat / Prestasi
  if (hasLt) {
    matrix.push({
      no: no++,
      kegiatan: isSiaga
        ? 'Simulasi & Pembekalan Kontingen Pesta Siaga Kwarran'
        : 'Pemusatan Latihan & Seleksi Regu Inti Berprestasi (Persiapan LT-2)',
      bulan: variant === 2 ? [8, 9] : [9, 10],
      keterangan: 'Regu Inti'
    });
    matrix.push({
      no: no++,
      kegiatan: isSiaga
        ? 'Keikutsertaan Kontingen Pesta Siaga Tingkat Kwartir Ranting'
        : 'Pemberangkatan & Partisipasi Lomba Tingkat II (LT-2) Kwartir Ranting',
      bulan: variant === 2 ? [9] : [10],
      keterangan: 'Ajang Kwarran'
    });
  }

  // Injeksi Dinamis: Perkemahan / PERSAMI
  if (hasPersami) {
    matrix.push({
      no: no++,
      kegiatan: isSiaga
        ? 'Perkemahan Satu Hari (PERSARI) Ceria di Lapangan Sekolah'
        : 'Perkemahan Sabtu-Minggu (PERSAMI) & Api Unggun Edukatif Pangkalan',
      bulan: variant === 2 ? [9] : variant === 3 ? [5] : [10, 2],
      keterangan: 'Bumi Perkemahan'
    });
  }

  // Injeksi Dinamis: Penjelajahan / Survival
  if (hasJelajah) {
    matrix.push({
      no: no++,
      kegiatan: isSiaga
        ? 'Jalan Ceria Mengenal Lingkungan Terbuka Sekitar Sekolah'
        : 'Penjelajahan Alam Terbuka (Wide Game 4 Pos Jelajah & Navigasi Kompas)',
      bulan: variant === 2 ? [10] : [4, 11],
      keterangan: 'Eksplorasi Alam'
    });
  }

  // Injeksi Dinamis: Bakti Lingkungan
  if (hasBakti) {
    matrix.push({
      no: no++,
      kegiatan: 'Aksi Pramuka Peduli & Bakti Sosial Bersih Lingkungan Sekolah / Desa',
      bulan: variant === 2 ? [8, 12] : [8, 1],
      keterangan: 'Bakti Masyarakat'
    });
  }

  // Ujian SKU
  matrix.push({
    no: no++,
    kegiatan: isSiaga
      ? 'Pendalaman Materi & Ujian Syarat Kecakapan Umum (SKU Siaga Mula/Bantu/Tata)'
      : 'Pendalaman & Ujian Syarat Kecakapan Umum (SKU Ramu/Rakit/Terap)',
    bulan: variant === 2 ? [3, 6, 9, 12] : variant === 3 ? [4, 10, 11] : [5, 10, 11, 12, 1],
    keterangan: 'Ujian Mandiri'
  });

  // Pelantikan & TKK
  matrix.push({
    no: no++,
    kegiatan: isSiaga
      ? 'Penyematan Tanda Kecakapan Khusus (TKK) & Pelantikan Tingkat'
      : (hasTkk
          ? 'Ujian Portofolio 10 TKK Wajib & Upacara Pelantikan Kenaikan Tingkat'
          : 'Ujian Syarat Kecakapan Khusus (SKK) & Pelantikan Kenaikan Tingkat'),
    bulan: variant === 2 ? [1, 10] : variant === 3 ? [12, 6] : [1, 10, 12],
    keterangan: 'Pelantikan Resmi'
  });

  // Peringatan Hari Pramuka & HUT RI
  matrix.push({
    no: no++,
    kegiatan: 'Peringatan Hari Pramuka (14 Agustus) & HUT RI / Lomba Antar-Regu',
    bulan: [8],
    keterangan: 'Peringatan Resmi'
  });

  // Evaluasi
  matrix.push({
    no: no++,
    kegiatan: 'Evaluasi Capaian Pembinaan & Rekapitulasi Akhir Semester',
    bulan: [6, 12],
    keterangan: 'Laporan Mabigus'
  });

  return {
    matrix,
    fokusTargetList,
    variant,
    hasLt,
    hasPersami,
    hasPelantikan,
    hasJelajah,
    hasBakti,
    hasTkk,
    hasPestaSiaga
  };
}

export function getPramukaAgendaByMonth(monthIndex: number, isSiaga: boolean, eskul?: MasterEskul, config?: PramukaHeaderConfig) {
  const monthNum = monthIndex + 1;
  const dummyEskul: MasterEskul = eskul || {
    id: 'dummy',
    namaEskul: isSiaga ? 'Pramuka Siaga' : 'Pramuka Penggalang',
    kategori: 'Kepanduan',
    namaPembina: '',
    namaPelatih: '',
    jadwalLatihan: '',
    lokasi: '',
    anggotaSiswa: []
  };
  const { matrix } = generateDynamicPramukaCurriculum(isSiaga, dummyEskul, config);
  return matrix.filter((item) => item.bulan.includes(monthNum));
}

export const PramukaProgramTahunanDocument: React.FC<PramukaProgramTahunanProps> = ({
  eskul,
  metadata,
  isSiaga = false,
  config
}) => {
  const activeConfig = config || DEFAULT_PRAMUKA_CONFIG;
  const namaSekolah = metadata.namaSekolah || 'SD NEGERI PAGERMANEUH';
  const kecamatan = metadata.desaKecamatan || 'LEMBANG';
  const kabupatenKota = metadata.kabupatenKota || 'KABUPATEN BANDUNG BARAT';
  const tahunAnggaran = metadata.tahunAnggaran || '2025/2026';
  const namaKepalaSekolah = metadata.kepalaSekolah || 'Drs. Ujang Raharjo, M.M.Pd';
  const nipKepalaSekolah = metadata.nipKepalaSekolah || '196805121992031005';
  // Ambil nama Pembina Gudep dari data master eskul yang diinput pengguna
  const namaPembinaGudep = eskul.namaPembinaGudep || eskul.namaPembina || eskul.namaPelatih || 'Ado Hidayat, S.Pd';
  const nipPembinaGudep = eskul.nipPembinaGudep || eskul.nipPembina || '-';

  // Sub-judul Baris 2 (Nama SD / Pangkalan Nama SD)
  const subJudulText = activeConfig.customSubJudul?.trim()
    ? activeConfig.customSubJudul.trim().toUpperCase()
    : activeConfig.subJudulFormat === 'nama_sd'
    ? namaSekolah.toUpperCase()
    : activeConfig.subJudulFormat === 'gudep_pangkalan'
    ? `GUGUS DEPAN PANGKALAN ${namaSekolah.toUpperCase()}`
    : `PANGKALAN ${namaSekolah.toUpperCase()}`;

  // Generator Kurikulum Dinamis Berdasarkan Kata Kunci Target & Variasi Urutan
  const dynamicPenggalang = generateDynamicPramukaCurriculum(false, eskul, activeConfig);
  const dynamicSiaga = generateDynamicPramukaCurriculum(true, eskul, activeConfig);

  const penggalangMatrix = dynamicPenggalang.matrix;
  const siagaMatrix = dynamicSiaga.matrix;
  const activeCurriculum = isSiaga ? dynamicSiaga : dynamicPenggalang;

  // 10 Materi Teori Inti (Umum & Mendalam)
  const materiTeori = [
    { no: 1, materi: 'Kode Kehormatan (Tri Satya & Dasa Darma / Dwi Satya & Dwi Darma)', ramu: true, rakit: true, terap: true },
    { no: 2, materi: 'Lambang Pramuka (Tunas Kelapa) & Makna Kiasan Dasar', ramu: true, rakit: false, terap: false },
    { no: 3, materi: 'Salam Pramuka & Tata Cara Penghormatan Resmi', ramu: true, rakit: false, terap: false },
    { no: 4, materi: 'Struktur Organisasi Regu / Barung & Manajemen Kepemimpinan', ramu: true, rakit: true, terap: false },
    { no: 5, materi: 'Riwayat Singkat Bapak Pandu Dunia (Lord Robert Baden Powell)', ramu: true, rakit: true, terap: false },
    { no: 6, materi: 'Pengamalan Pancasila & Pembiasaan Taqwa Beribadah', ramu: true, rakit: false, terap: true },
    { no: 7, materi: 'Tanda Pengenal Gerakan Pramuka (TKU, TKK, Tanda Satuan)', ramu: true, rakit: true, terap: true },
    { no: 8, materi: 'Sejarah Bendera Merah Putih & Lagu Kebangsaan Indonesia Raya', ramu: true, rakit: false, terap: false },
    { no: 9, materi: 'Pola Hidup Bersih, Sehat & Kepedulian Lingkungan Sekolah', ramu: true, rakit: true, terap: true },
    { no: 10, materi: 'Etika Berkemah & Kelestarian Alam Semesta', ramu: true, rakit: true, terap: true },
  ];

  // Materi Tekpram (Sandi, Morse, Semaphore, Tali Temali & P3K)
  const materiTekpram = [
    { no: '1.1', kategori: 'Sandi', uraian: 'Sandi Kotak I & Sandi Angka / Balik', ramu: true, rakit: true, terap: true },
    { no: '1.2', kategori: 'Sandi', uraian: 'Sandi Rumput & Sandi Koordinat Sederhana', ramu: false, rakit: true, terap: true },
    { no: '2.1', kategori: 'Morse', uraian: 'Sandi Morse Tulisan (Titik dan Garis)', ramu: true, rakit: true, terap: true },
    { no: '2.2', kategori: 'Morse', uraian: 'Transmisi Isyarat Morse Menggunakan Peluit Lapangan', ramu: true, rakit: true, terap: true },
    { no: '3.1', kategori: 'Semaphore', uraian: 'Pengenalan Sudut Bendera Semaphore (Huruf A s.d. Z)', ramu: true, rakit: true, terap: true },
    { no: '4', kategori: 'Tali Temali', uraian: '5 Simpul Wajib (Hidup, Mati, Pangkal, Jangkar, Anyam)', ramu: true, rakit: true, terap: true },
    { no: '5', kategori: 'Pionering', uraian: 'Pembuatan Tiang Bendera Tiga Kaki & Tandu Sederhana', ramu: true, rakit: true, terap: true },
    { no: '6', kategori: 'PPPK', uraian: 'Pertolongan Pertama Luka Ringan & Pembalutan Mitela', ramu: true, rakit: true, terap: true },
  ];

  // 10 TKK Wajib
  const tkkWajib = [
    'TKK Berkemah',
    'TKK Juru Masak',
    'TKK Penabung',
    'TKK Pengamat',
    'TKK Pengatur Rumah',
    'TKK Gerak Jalan',
    'TKK Pengaman Kampung',
    'TKK Penjahit',
    'TKK PPPK',
    'TKK Juru Kebun'
  ];

  // 10 Materi Praktik Inti Lapangan (Fokus & Mendalam)
  const materiPraktik = [
    { no: 1, materi: 'Baris Berbaris (PBB Dasar di Tempat & Langkah Tegap)', ramu: true, rakit: true, terap: true },
    { no: 2, materi: 'Tata Upacara Pembukaan & Penutupan Latihan (Formasi Angkare / Lingkaran)', ramu: true, rakit: true, terap: true },
    { no: 3, materi: 'Pasang dan Bongkar Tenda Regu Secara Gotong Royong', ramu: true, rakit: true, terap: true },
    { no: 4, materi: 'Pembuatan Blankar / Tandu Darurat dengan 2 Tongkat & Tali', ramu: true, rakit: true, terap: true },
    { no: 5, materi: 'Simulasi Pembalutan Luka Mitela & Pertolongan Pertama (P3K)', ramu: true, rakit: true, terap: true },
    { no: 6, materi: 'Pengenalan Kompas Bidik & 8 Penjuru Arah Mata Angin', ramu: false, rakit: true, terap: true },
    { no: 7, materi: 'Penjelajahan Alam Sekitar & Pembacaan Tanda Jejak', ramu: false, rakit: true, terap: true },
    { no: 8, materi: 'Hasta Karya & Keterampilan Tangan Berdaya Guna', ramu: true, rakit: true, terap: true },
    { no: 9, materi: 'Permainan Edukatif, Yel-yel Regu & Lagu Pramuka Ceria', ramu: true, rakit: true, terap: true },
    { no: 10, materi: 'Aksi Bersih Lingkungan Sekolah & Perkemahan Bersama', ramu: true, rakit: true, terap: true },
  ];

  return (
    <div className="space-y-8 text-black font-serif print:space-y-6">
      {/* ============================================================== */}
      {/* 1. HALAMAN COVER RESMI (FORMAT FORMAL KEDINASAN MANUAL)        */}
      {/* ============================================================== */}
      <OfficialCoverPage
        variant="pramuka"
        title="PROGRAM KERJA TAHUNAN GUGUS DEPAN"
        subTitle="PERINDUKAN SIAGA (KELAS 1 - 3) & PASUKAN PENGGALANG (KELAS 4 - 6)"
        tahunAnggaran={tahunAnggaran}
        metadata={metadata}
        customLogoUrl={activeConfig.customLogoPramukaUrl}
        leftPerson={{
          label: 'Ketua Mabigus (Kepala Sekolah)',
          nama: namaKepalaSekolah,
          nip: nipKepalaSekolah,
        }}
        rightPerson={{
          label: 'Pembina Gugus Depan',
          nama: namaPembinaGudep,
          nip: nipPembinaGudep,
        }}
      />

      {/* ============================================================== */}
      {/* 2. BAB I S.D. V: PROGRAM KERJA RESMI (DOKUMEN KETIK FORMAL)   */}
      {/* ============================================================== */}
      <div className="bg-white p-6 sm:p-8 border border-black space-y-5 print:border-none print:px-[14mm] print:py-[10mm] print:break-after-page text-black">
        {/* KOP / HEADER PROGRAM KERJA DENGAN LOGO & JUDUL BERTINGKAT (BARIS 1 & BARIS 2 NAMA SD) */}
        <PramukaDocHeader
          title={activeConfig.judulBaris1 || 'PROGRAM KERJA PRAMUKA TAHUNAN'}
          subTitle={subJudulText}
          detailText={`${activeConfig.nomorGudep ? `Gugus Depan ${activeConfig.nomorGudep} • ` : ''}Tahun Ajaran ${tahunAnggaran} • Gugus Depan Pangkalan Sekolah Dasar`}
          config={activeConfig}
          metadata={metadata}
          showLogos={true}
        />

        {/* I. BIDANG KEGIATAN DAN LATIHAN PESERTA DIDIK */}
        <div className="space-y-2 text-xs leading-relaxed">
          <h4 className="font-bold text-xs uppercase mb-1">
            I. BIDANG KEGIATAN DAN LATIHAN PESERTA DIDIK
          </h4>

          {/* SASARAN & TARGET UNGGULAN DINAMIS PANGKALAN (BERDASARKAN DATA MASTER / KEYWORDS) */}
          {activeCurriculum.fokusTargetList.length > 0 && (
            <div className="mb-3 p-2.5 bg-slate-50 print:bg-white border border-black rounded-xs">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-black/40">
                <span className="font-bold text-[11px] uppercase tracking-wide text-black">
                  Sasaran Strategis &amp; Target Unggulan Tahun {tahunAnggaran}
                </span>
                <span className="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.2 rounded-xs no-print print:hidden">
                  Model Alur {activeCurriculum.variant}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {activeCurriculum.fokusTargetList.map((target, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold text-black">&#10003;</span>
                    <span className="font-medium">{target}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub 1: Siaga */}
          <div className="pl-3 space-y-1">
            <p className="font-bold uppercase text-xs">A. Perindukan Siaga (Usia 7 - 10 Tahun / Siswa Kelas 1 - 3 SD):</p>
            <p className="font-medium">1. Meningkatkan Latihan Pramuka Siaga dari jenjang:</p>
            <ul className="list-disc list-inside pl-4 space-y-0.5">
              <li>Siaga Mula</li>
              <li>Siaga Bantu</li>
              <li>Siaga Tata</li>
            </ul>
            <p className="font-medium pt-1">2. Pencapaian SKK (Syarat Kecakapan Khusus) Siaga:</p>
            <ol className="list-decimal list-inside pl-4 space-y-0.5">
              <li>Dua Macam SKK Agama</li>
              <li>Dua Macam SKK Patriotisme dan Seni Budaya</li>
              <li>Dua Macam SKK Ketangkasan dan Kesehatan</li>
              <li>Dua Macam SKK Keterampilan dan Teknik Pembangunan</li>
              <li>Dua Macam SKK Sosial, Gotong Royong, Ketertiban Masyarakat, dan Lingkungan Hidup.</li>
            </ol>
          </div>

          {/* Sub 2: Penggalang */}
          <div className="pl-3 space-y-1 pt-2">
            <p className="font-bold uppercase text-xs">B. Pasukan Penggalang (Usia 11 - 15 Tahun / Siswa Kelas 4 - 6 SD):</p>
            <p className="font-medium">1. Pencapaian SKU &amp; Meningkatkan Latihan Pramuka Penggalang dari jenjang:</p>
            <ul className="list-disc list-inside pl-4 space-y-0.5">
              <li>Penggalang Ramu</li>
              <li>Penggalang Rakit</li>
              <li>Penggalang Terap</li>
            </ul>
            <p className="font-medium pt-1">2. Pencapaian SKK Penggalang (Purwa, Madya, Utama):</p>
            <ol className="list-decimal list-inside pl-4 space-y-0.5">
              <li>2 Macam SKK Agama</li>
              <li>2 Macam SKK Patriotisme dan Seni Budaya</li>
              <li>2 Macam SKK Ketangkasan dan Kesehatan</li>
              <li>2 Macam SKK Keterampilan dan Teknik Pembangunan</li>
              <li>2 Macam SKK Sosial, Perikemanusiaan, Gotong Royong, Ketertiban Masyarakat, dan Lingkungan Hidup.</li>
            </ol>
          </div>
        </div>

        {/* II. KEGIATAN BERSAMA DALAM SATUAN GUGUS DEPAN */}
        <div className="space-y-1 text-xs leading-relaxed">
          <h4 className="font-bold text-xs uppercase mb-1">
            II. KEGIATAN BERSAMA DALAM SATUAN GUGUS DEPAN
          </h4>
          <ul className="list-disc list-inside pl-3 space-y-0.5">
            <li>Peringatan Ulang Tahun Gugus Depan Sekolah</li>
            <li>Peringatan Hari Besar Agama dan Hari-hari Besar Nasional</li>
            <li>Bakti Masyarakat di lingkungan sekitar dimana Gugus Depan berada</li>
          </ul>
        </div>

        {/* III. BIDANG PENDIDIKAN ORANG DEWASA */}
        <div className="space-y-1 text-xs leading-relaxed">
          <h4 className="font-bold text-xs uppercase mb-1">
            III. BIDANG PENDIDIKAN ORANG DEWASA (PEMBINA GUGUS DEPAN)
          </h4>
          <ul className="list-disc list-inside pl-3 space-y-0.5">
            <li>Mengirimkan Pembina untuk mengikuti pertemuan-pertemuan Pembina di tingkat Kwartir Ranting</li>
            <li>Mengirimkan Para Pembina untuk mengikuti Kursus Pembina (KMD / KML) di tingkat Kwartir Cabang</li>
          </ul>
        </div>

        {/* IV. BIDANG TANDA PENGHARGAAN */}
        <div className="space-y-1 text-xs leading-relaxed">
          <h4 className="font-bold text-xs uppercase mb-1">
            IV. BIDANG TANDA PENGHARGAAN
          </h4>
          <p className="pl-3">
            Sistem Penghargaan dijalankan sebagaimana mestinya sesuai Petunjuk Penyelenggaraan Kwartir Nasional Gerakan Pramuka.
          </p>
        </div>

        {/* V. BIDANG SARANA DAN ADMINISTRASI */}
        <div className="space-y-1 text-xs leading-relaxed">
          <h4 className="font-bold text-xs uppercase mb-1">
            V. BIDANG SARANA DAN ADMINISTRASI
          </h4>
          <p className="pl-3 font-medium">Mengusahakan tersedianya fasilitas dan perangkat penunjang:</p>
          <ul className="list-disc list-inside pl-5 space-y-0.5">
            <li>Buku-buku Pegangan Pembina (Buku SKU, SKK, AD/ART Gerakan Pramuka)</li>
            <li>Perlengkapan Perindukan Siaga (Standar Barung, Tali, Peluit)</li>
            <li>Perlengkapan Pasukan Penggalang (Tongkat Pramuka, Bendera Regu, Tenda Regu, Kompas, Peluit)</li>
            <li>Sanggar Bakti Gugus Depan Sekolah</li>
            <li>Papan nama Gugus Depan, Stempel surat resmi dan Perangkat buku-buku Administrasi</li>
            <li>Surat perijinan kegiatan dibuat secara tertib sesuai kebutuhan</li>
            <li>Kartu Anggota (KTA) Pembina dan Peserta Didik terdaftar</li>
          </ul>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MATRIKS PROGRAM KERJA BULAN I S.D. XII (FORMAT TABEL POLOS) */}
      {/* ============================================================== */}
      <div className="bg-white p-6 sm:p-8 border border-black space-y-6 print:border-none print:px-[14mm] print:py-[10mm] print:break-after-page text-black">
        <PramukaDocHeader
          title="MATRIKS DISTRIBUSI PROGRAM KERJA TAHUNAN (BULAN I S.D. XII)"
          subTitle={subJudulText}
          detailText={`Pangkalan Sekolah Dasar • Distribusi Bulan I (Januari) s.d. Bulan XII (Desember) ${tahunAnggaran}`}
          config={activeConfig}
          metadata={metadata}
          showLogos={activeConfig.tampilkanLogoDiSemuaHalaman}
        />

        {/* 3.A MATRIKS PROGRAM KERJA PERINDUKAN SIAGA (KELAS 1 - 3 SD) */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-xs uppercase">
            A. Matriks Program Tahunan Perindukan Siaga (Usia 7–10 Tahun / Siswa Kelas 1–3 SD)
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-black text-[11px]">
              <thead className="bg-slate-100 text-black font-bold uppercase text-center">
                <tr>
                  <th className="border border-black p-1.5 w-8 text-center" rowSpan={2}>NO.</th>
                  <th className="border border-black p-1.5 min-w-[200px]" rowSpan={2}>KEGIATAN SIAGA</th>
                  <th className="border border-black p-1 text-center" colSpan={12}>BULAN</th>
                  <th className="border border-black p-1.5 w-24 text-center" rowSpan={2}>KETERANGAN</th>
                </tr>
                <tr className="bg-slate-50 text-[10px]">
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((b) => (
                    <th key={b} className="border border-black p-1 w-6 text-center">{b}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {siagaMatrix.map((item) => (
                  <tr key={item.no}>
                    <td className="border border-black p-1.5 text-center font-mono">{item.no}</td>
                    <td className="border border-black p-1.5 font-medium">{item.kegiatan}</td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mNum) => {
                      const hasCheck = item.bulan.includes(mNum);
                      return (
                        <td key={mNum} className="border border-black p-1 text-center font-bold">
                          {hasCheck ? '✓' : ''}
                        </td>
                      );
                    })}
                    <td className="border border-black p-1.5 text-center text-[10px] font-mono">
                      {item.bulan.length === 12 ? 'Rutin' : 'Terjadwal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3.B MATRIKS PROGRAM KERJA PASUKAN PENGGALANG (KELAS 4 - 6 SD) */}
        <div className="space-y-1.5 pt-2">
          <h4 className="font-bold text-xs uppercase">
            B. Matriks Program Tahunan Pasukan Penggalang (Usia 11–15 Tahun / Siswa Kelas 4–6 SD)
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-black text-[11px]">
              <thead className="bg-slate-100 text-black font-bold uppercase text-center">
                <tr>
                  <th className="border border-black p-1.5 w-8 text-center" rowSpan={2}>NO.</th>
                  <th className="border border-black p-1.5 min-w-[200px]" rowSpan={2}>KEGIATAN PENGGALANG</th>
                  <th className="border border-black p-1 text-center" colSpan={12}>BULAN</th>
                  <th className="border border-black p-1.5 w-24 text-center" rowSpan={2}>KETERANGAN</th>
                </tr>
                <tr className="bg-slate-50 text-[10px]">
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((b) => (
                    <th key={b} className="border border-black p-1 w-6 text-center">{b}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {penggalangMatrix.map((item) => (
                  <tr key={item.no}>
                    <td className="border border-black p-1.5 text-center font-mono">{item.no}</td>
                    <td className="border border-black p-1.5 font-medium">{item.kegiatan}</td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mNum) => {
                      const hasCheck = item.bulan.includes(mNum);
                      return (
                        <td key={mNum} className="border border-black p-1 text-center font-bold">
                          {hasCheck ? '✓' : ''}
                        </td>
                      );
                    })}
                    <td className="border border-black p-1.5 text-center text-[10px] font-mono">
                      {item.bulan.length === 12 ? 'Rutin' : 'Terjadwal'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. SILABUS MATERI TEORI LATIHAN MINGGUAN (POLOS RESMI)          */}
      {/* ============================================================== */}
      <div className="bg-white p-6 sm:p-8 border border-black space-y-4 print:border-none print:px-[14mm] print:py-[10mm] print:break-after-page text-black">
        <PramukaDocHeader
          title="MATERI PROGRAM (TEORI) LATIHAN MINGGUAN"
          subTitle={subJudulText}
          detailText="Distribusi SKU Perindukan Siaga (Mula, Bantu, Tata) & Pasukan Penggalang (Ramu, Rakit, Terap)"
          config={activeConfig}
          metadata={metadata}
          showLogos={activeConfig.tampilkanLogoDiSemuaHalaman}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-black text-[11px]">
            <thead className="bg-slate-100 text-black font-bold uppercase text-center">
              <tr>
                <th className="border border-black p-1.5 w-8 text-center" rowSpan={2}>NO</th>
                <th className="border border-slate-400 p-1.5 min-w-[200px]" rowSpan={2}>MATERI TEORI KEPRAMUKAAN</th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  SKU SIAGA (KLS 1–3)
                </th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  SKU PENGGALANG (KLS 4–6)
                </th>
                <th className="border border-black p-1.5 w-20 text-center" rowSpan={2}>KETERANGAN</th>
              </tr>
              <tr className="bg-slate-50 text-[10px]">
                <th className="border border-black p-1 w-10 text-center">MULA</th>
                <th className="border border-black p-1 w-10 text-center">BANTU</th>
                <th className="border border-black p-1 w-10 text-center">TATA</th>
                <th className="border border-black p-1 w-10 text-center">RAMU</th>
                <th className="border border-black p-1 w-10 text-center">RAKIT</th>
                <th className="border border-black p-1 w-10 text-center">TERAP</th>
              </tr>
            </thead>
            <tbody>
              {materiTeori.map((m) => (
                <tr key={m.no}>
                  <td className="border border-black p-1.5 text-center font-mono">{m.no}</td>
                  <td className="border border-black p-1.5 font-medium">{m.materi}</td>
                  <td className="border border-black p-1 text-center font-bold">{m.ramu ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{m.rakit ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{m.terap ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{m.ramu ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{m.rakit ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{m.terap ? '✓' : ''}</td>
                  <td className="border border-black p-1.5 text-center text-[10px] font-mono">
                    {m.ramu && m.rakit && m.terap ? 'Semua' : 'Bertahap'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. MATERI TEKPRAM & 10 TKK WAJIB (POLOS RESMI)                  */}
      {/* ============================================================== */}
      <div className="bg-white p-6 sm:p-8 border border-black space-y-5 print:border-none print:px-[14mm] print:py-[10mm] print:break-after-page text-black">
        <PramukaDocHeader
          title="MATERI TEKNIK KEPRAMUKAAN (TEKPRAM) & TKK WAJIB"
          subTitle={subJudulText}
          detailText="Sandi, Morse, Semaphore, Tali Temali, P3K & 10 Syarat Kecakapan Khusus Pokok"
          config={activeConfig}
          metadata={metadata}
          showLogos={activeConfig.tampilkanLogoDiSemuaHalaman}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-black text-[11px]">
            <thead className="bg-slate-100 text-black font-bold uppercase text-center">
              <tr>
                <th className="border border-black p-1.5 w-12 text-center" rowSpan={2}>NO</th>
                <th className="border border-black p-1.5 min-w-[200px]" rowSpan={2}>MATERI TEKPRAM &amp; KECAKAPAN</th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  SIAGA (KLS 1–3)
                </th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  PENGGALANG (KLS 4–6)
                </th>
                <th className="border border-black p-1.5 w-20 text-center" rowSpan={2}>KETERANGAN</th>
              </tr>
              <tr className="bg-slate-50 text-[10px]">
                <th className="border border-black p-1 w-10 text-center">MULA</th>
                <th className="border border-black p-1 w-10 text-center">BANTU</th>
                <th className="border border-black p-1 w-10 text-center">TATA</th>
                <th className="border border-black p-1 w-10 text-center">RAMU</th>
                <th className="border border-black p-1 w-10 text-center">RAKIT</th>
                <th className="border border-black p-1 w-10 text-center">TERAP</th>
              </tr>
            </thead>
            <tbody>
              {materiTekpram.map((item) => (
                <tr key={item.no}>
                  <td className="border border-black p-1.5 text-center font-mono">{item.no}</td>
                  <td className="border border-black p-1.5">
                    <span className="font-bold mr-2">[{item.kategori}]</span>
                    {item.uraian}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">{item.ramu ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.rakit ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.terap ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.ramu ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.rakit ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{item.terap ? '✓' : ''}</td>
                  <td className="border border-black p-1.5 text-center text-[10px] font-mono">Tekpram</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 10 TKK Wajib */}
        <div className="space-y-1.5 pt-2">
          <h4 className="font-bold text-xs uppercase border-b border-black pb-0.5">
            10 Macam Tanda Kecakapan Khusus (TKK) Wajib Gerakan Pramuka:
          </h4>
          <table className="w-full border-collapse border border-black text-[11px] text-center">
            <tbody>
              <tr>
                {tkkWajib.slice(0, 5).map((tkk, idx) => (
                  <td key={idx} className="border border-black p-2 font-medium">
                    <span className="font-bold">{idx + 1}.</span> {tkk}
                  </td>
                ))}
              </tr>
              <tr>
                {tkkWajib.slice(5, 10).map((tkk, idx) => (
                  <td key={idx + 5} className="border border-black p-2 font-medium">
                    <span className="font-bold">{idx + 6}.</span> {tkk}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. SILABUS MATERI PRAKTIK LAPANGAN & PENGESAHAN (POLOS RESMI)  */}
      {/* ============================================================== */}
      <div className="bg-white p-6 sm:p-8 border border-black space-y-6 print:border-none print:px-[14mm] print:py-[10mm] print:break-after-page text-black">
        <PramukaDocHeader
          title="MATERI PROGRAM (PRAKTEK) LATIHAN MINGGUAN"
          subTitle={subJudulText}
          detailText="10 Butir Kegiatan Praktik Lapangan Terpadu (Siaga & Penggalang)"
          config={activeConfig}
          metadata={metadata}
          showLogos={activeConfig.tampilkanLogoDiSemuaHalaman}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-black text-[11px]">
            <thead className="bg-slate-100 text-black font-bold uppercase text-center">
              <tr>
                <th className="border border-black p-1.5 w-8 text-center" rowSpan={2}>NO</th>
                <th className="border border-black p-1.5 min-w-[200px]" rowSpan={2}>MATERI PRAKTIK LAPANGAN</th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  SIAGA (KLS 1–3)
                </th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  PENGGALANG (KLS 4–6)
                </th>
                <th className="border border-black p-1.5 w-20 text-center" rowSpan={2}>KETERANGAN</th>
              </tr>
              <tr className="bg-slate-50 text-[10px]">
                <th className="border border-black p-1 w-10 text-center">MULA</th>
                <th className="border border-black p-1 w-10 text-center">BANTU</th>
                <th className="border border-black p-1 w-10 text-center">TATA</th>
                <th className="border border-black p-1 w-10 text-center">RAMU</th>
                <th className="border border-black p-1 w-10 text-center">RAKIT</th>
                <th className="border border-black p-1 w-10 text-center">TERAP</th>
              </tr>
            </thead>
            <tbody>
              {materiPraktik.map((p) => (
                <tr key={p.no}>
                  <td className="border border-black p-1.5 text-center font-mono">{p.no}</td>
                  <td className="border border-black p-1.5 font-medium">{p.materi}</td>
                  <td className="border border-black p-1 text-center font-bold">{p.ramu ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{p.rakit ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{p.terap ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{p.ramu ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{p.rakit ? '✓' : ''}</td>
                  <td className="border border-black p-1 text-center font-bold">{p.terap ? '✓' : ''}</td>
                  <td className="border border-black p-1.5 text-center text-[10px] font-mono">
                    {p.ramu && p.rakit && p.terap ? 'Rutin' : 'Lanjutan'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* LEMBAR PENGESAHAN AKHIR RESMI */}
        <OfficialSignatures
          kota={kecamatan}
          tanggalSurat={`Juli ${tahunAnggaran.slice(0, 4)}`}
          leftPerson={{
            label: `Mabigus ${namaSekolah}`,
            nama: namaKepalaSekolah,
            nip: nipKepalaSekolah,
          }}
          rightPerson={{
            label: 'Pembina Gugus Depan',
            nama: namaPembinaGudep,
            nip: nipPembinaGudep,
          }}
        />
      </div>
    </div>
  );
};
