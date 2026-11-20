export type KlasifikasiSPJ =
  | 'Honorarium'
  | 'Ekstrakurikuler'
  | 'ATK'
  | 'ALKEB'
  | 'Kegiatan'
  | 'Perbaikan'
  | 'Komunitas Belajar'
  | 'Lainnya';

export interface RincianBarang {
  kode_rekening: string;
  uraian_barang: string;
  volume: number | null;
  satuan: string | null;
  harga_satuan: number | null;
  jumlah_transaksi: number;
  kode_kegiatan?: string;
  // Cross-Month Smart Match metadata
  is_cross_month?: boolean;
  rkas_source_month?: string;
  rkas_source_month_index?: number;
  rkas_matched_uraian?: string;
  match_note?: string;
}

export interface TransaksiBKU {
  id?: string;
  tanggal: string;
  no_bku: string;
  tipe_transaksi: 'Pemasukan' | 'Pengeluaran';
  total_pemasukan_bku: number;
  total_pengeluaran_bku: number;
  rincian_barang: RincianBarang[];
  keterangan?: string;
  kode_kegiatan?: string;
  klasifikasi?: KlasifikasiSPJ;
  // Korelasi Data Master Eskul
  eskulId?: string;
  eskulNama?: string;
  pelatihId?: string;
  pelatihNama?: string;
  // Cross-Month Smart Match indicators
  has_cross_month?: boolean;
  cross_month_source?: string;
  cross_month_notes?: string;
}

export interface BKUValidationReport {
  isValid: boolean;
  officialPenerimaan?: number;
  parsedPenerimaan: number;
  diffPenerimaan?: number;
  officialPengeluaran?: number;
  parsedPengeluaran: number;
  diffPengeluaran?: number;
  statusMessage: string;
  unmatchedRows?: Array<{
    lineIndex: number;
    rawText: string;
    reason: string;
  }>;
}

export interface RKASItem {
  id?: string;
  no_urut?: number;
  kode_rekening: string;
  kode_program?: string;
  uraian: string;
  volume: number;
  satuan: string;
  tarif_harga: number;
  jumlah: number;
  // Cross-Month allocation and tracking fields
  bulan?: string;
  monthIndex?: number; // 1 - 12
  tahap?: number; // 1 or 2
  sisa_volume?: number;
  sisa_jumlah?: number;
  terserap_di?: Array<{
    bulan: string;
    monthIndex: number;
    no_bku: string;
    volume: number;
    nominal: number;
  }>;
}

export interface SchoolMetadata {
  namaSekolah: string;
  npsn: string;
  bulanTahun: string;
  sumberDana: string;
  desaKecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  bendahara: string;
  nipBendahara: string;
  tahunAnggaran?: string;
  namaBendahara?: string;
  komiteSekolah?: string;
  alamatLengkap?: string;
  emailSekolah?: string;
  teleponSekolah?: string;
  bankNama?: string;
  bankNoRek?: string;
  bankAtasNama?: string;
  logoUrl?: string;
  logoKananUrl?: string;
  logoSizePx?: number;
}

export interface KwitansiItemData {
  noBku: string;
  tanggal: string;
  tipeTransaksi: string;
  nominal: number;
  terbilangText: string;
  uraian: string;
  kodeRekening: string;
  rincianBarang: RincianBarang[];
  penerimaNama?: string;
  penerimaAlamat?: string;
  penerimaJabatan?: string;
}

export interface UploadedFileState {
  bkuFileName?: string;
  bkuContent?: string;
  rkasFileName?: string;
  rkasContent?: string;
}

export interface MonthlyArchive {
  id: string; // e.g. "2026-02" or "2026-februari"
  bulanTahun: string; // e.g. "Februari 2026"
  bulan: string; // "Februari"
  tahun: string; // "2026"
  uploadedAt: string; // "02 Sep 2026, 17:00"
  bkuFileName?: string;
  rkasFileName?: string;
  data: TransaksiBKU[];
  rkasItems?: RKASItem[];
  metadata: Partial<SchoolMetadata>;
  totalPenerimaan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  transactionCount: number;
  itemCount: number;
  atkItemCount: number;
  atkTotalNominal: number;
  alkebItemCount: number;
  alkebTotalNominal: number;
  isVerified?: boolean;
  logistikBarangList?: LogistikBarang[];
  logistikConfig?: DokumenLogistikConfig;
  logistikPrintSettings?: PrintPreviewSettings;
}

// ==========================================
// MASTER DATA TYPES
// ==========================================

export interface MasterGuru {
  id: string;
  nama: string;
  nip: string;
  nuptk?: string;
  jabatan: string;
  tags?: string[]; // e.g. ['GURU_KELAS', 'TIM_BOSP', 'PANITIA_KEGIATAN']
  statusKepegawaian: 'PNS' | 'PPPK' | 'Honorer' | 'GTT';
  jenisKelamin: 'L' | 'P';
  pendidikanTerakhir?: string;
  email?: string;
}

export interface MasterSiswa {
  id: string;
  nisn: string;
  nis?: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  namaWali?: string;
  status: 'Aktif' | 'Lulus' | 'Mutasi';
  penerimaPIP?: boolean;
}

export interface EskulAnggota {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  peran: 'Ketua' | 'Wakil Ketua' | 'Sekretaris' | 'Bendahara' | 'Anggota Utama' | 'Anggota';
  keaktifan?: 'Aktif' | 'Cukup' | 'Kurang';
  golongan?: 'Penggalang' | 'Siaga';
  satuanRegu?: string; // misal Regu Rajawali / Barung Merah
}

export interface EskulPrestasi {
  id: string;
  namaKegiatan: string;
  tanggalPelaksanaan: string;
  tingkat: 'Sekolah' | 'Kecamatan' | 'Kabupaten/Kota' | 'Provinsi' | 'Nasional';
  capaian: string;
}

export interface EskulPelatihItem {
  id: string;
  nama: string;
  peran?: string;
  noHp?: string;
  noRekening?: string;
  bank?: string;
  honorPerKegiatan?: number;
}

export interface MasterEskul {
  id: string;
  namaEskul: string;
  kategori: 'Kepanduan' | 'Olahraga' | 'Seni & Budaya' | 'Keagamaan' | 'Akademik' | 'Lainnya';
  namaPembina: string;
  nipPembina?: string;
  namaPelatih: string;
  noHpPelatih?: string;
  noRekeningPelatih?: string;
  bankPelatih?: string;
  honorPerKegiatan?: number;
  daftarPelatih?: EskulPelatihItem[];
  jadwalLatihan: string;
  lokasi: string;
  jumlahAnggota?: number;
  deskripsiProgram?: string;
  targetCapaian?: string;
  evaluasiTahunan?: string;
  sumberHonor?: 'otomatis_bku' | 'manual';
  kataKunciBKU?: string;
  noBkuTerkait?: string;
  subGolonganAktif?: 'Penggalang' | 'Siaga' | 'Semua';
  nomorGudep?: string;
  // Field Pembina Gudep & Generator Dinamis Program Tahunan
  namaPembinaGudep?: string;
  nipPembinaGudep?: string;
  tujuanTahunanKeywords?: string;
  fokusProgramTahunan?: string[];
  variasiUrutanKurikulum?: number;
  matriksProtaCustom?: { id?: string; text: string; months: number[]; keterangan?: string }[];
  anggotaSiswa: EskulAnggota[];
  prestasiDanKegiatan?: EskulPrestasi[];
}

// ==========================================
// LOGISTIK, PERMINTAAN, BAST & OPNAME TYPES
// ==========================================

export interface LogistikItemAlokasi {
  personId: string;
  personName: string;
  jabatan: string;
  nip: string;
  qty: number;
  keperluan?: string;
  status: 'Disetujui' | 'Tidak Disetujui';
}

export interface LogistikBarang {
  id: string;
  namaBarang: string;
  spesifikasi: string;
  kategori: 'ATK' | 'ALKEB' | 'Lainnya';
  satuan: string;
  totalVolume: number;
  sisaLalu: number;
  hargaSatuan: number;
  kodeRekening: string;
  kodeKegiatan?: string;
  tanggalBelanja?: string;
  noBku?: string;
  keperluanDefault: string;
  targetTags?: string[]; // e.g. ['GURU_KELAS'], ['PETUGAS_KEBERSIHAN'], ['TIM_BOSP']
  faktorKonversi?: number; // Misal 12 jika beli 1 lusin/pack
  satuanDistribusi?: string; // Misal 'batang' atau 'pcs' jika satuan beli 'pack' / 'lusin'
  alokasi: LogistikItemAlokasi[];
}

export type LogistikTagId =
  | 'GURU_KELAS'
  | 'GURU_MAPEL'
  | 'TIM_BOSP'
  | 'PANITIA_KEGIATAN'
  | 'PETUGAS_KEBERSIHAN'
  | 'PETUGAS_KEAMANAN'
  | 'TENDIK_ADMIN';

export interface LogistikTagDefinition {
  id: LogistikTagId | string;
  name: string;
  shortLabel: string;
  colorBg: string;
  colorBadge: string;
  colorBorder: string;
  description: string;
  defaultKeperluan: string;
}

export const STANDARD_LOGISTIK_TAGS: LogistikTagDefinition[] = [
  {
    id: 'GURU_KELAS',
    name: 'Guru Kelas (Wali Kelas)',
    shortLabel: 'Guru Kelas',
    colorBg: 'bg-blue-50 text-blue-700 border-blue-200',
    colorBadge: 'bg-blue-100 text-blue-800',
    colorBorder: 'border-blue-300',
    description: 'Guru yang mengampu kelas rombel 1-6 (kebutuhan spidol, kertas HVS, administrasi kelas)',
    defaultKeperluan: 'Kegiatan Belajar Mengajar & Administrasi Kelas'
  },
  {
    id: 'GURU_MAPEL',
    name: 'Guru Mapel (PAI / PJOK / Bahasa)',
    shortLabel: 'Guru Mapel',
    colorBg: 'bg-purple-50 text-purple-700 border-purple-200',
    colorBadge: 'bg-purple-100 text-purple-800',
    colorBorder: 'border-purple-300',
    description: 'Guru mata pelajaran khusus (Agama, Olahraga, Kesenian, Bahasa)',
    defaultKeperluan: 'Pembelajaran & Praktik Mata Pelajaran'
  },
  {
    id: 'TIM_BOSP',
    name: 'Tim BOSP & Pengurus Barang',
    shortLabel: 'Tim BOSP',
    colorBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    colorBadge: 'bg-emerald-100 text-emerald-800',
    colorBorder: 'border-emerald-300',
    description: 'Bendahara, Pengurus Barang, Pengelola SPJ & Pembukuan BOSP',
    defaultKeperluan: 'Pengelolaan Administrasi SPJ & Pembukuan BOSP'
  },
  {
    id: 'PANITIA_KEGIATAN',
    name: 'Panitia Kegiatan / Asesmen',
    shortLabel: 'Panitia Kegiatan',
    colorBg: 'bg-amber-50 text-amber-700 border-amber-200',
    colorBadge: 'bg-amber-100 text-amber-800',
    colorBorder: 'border-amber-300',
    description: 'Panitia ANBK, Asesmen Sumatif, PPDB, Peringatan PHBN/PHBI',
    defaultKeperluan: 'Operasional Pelaksanaan Kegiatan / Asesmen'
  },
  {
    id: 'PETUGAS_KEBERSIHAN',
    name: 'Petugas Kebersihan & Sanitasi',
    shortLabel: 'Petugas Kebersihan',
    colorBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    colorBadge: 'bg-cyan-100 text-cyan-800',
    colorBorder: 'border-cyan-300',
    description: 'Petugas kebersihan sekolah, sanitasi toilet, pemeliharaan sarpras',
    defaultKeperluan: 'Pemeliharaan Sanitasi & Kebersihan Lingkungan Sekolah'
  },
  {
    id: 'PETUGAS_KEAMANAN',
    name: 'Petugas Keamanan / Satpam',
    shortLabel: 'Petugas Keamanan',
    colorBg: 'bg-orange-50 text-orange-700 border-orange-200',
    colorBadge: 'bg-orange-100 text-orange-800',
    colorBorder: 'border-orange-300',
    description: 'Penjaga pos keamanan, satpam & ketertiban gerbang sekolah',
    defaultKeperluan: 'Operasional Keamanan & Ketertiban Sekolah'
  },
  {
    id: 'TENDIK_ADMIN',
    name: 'Tenaga Administrasi / Tata Usaha',
    shortLabel: 'Tendik / TU',
    colorBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    colorBadge: 'bg-indigo-100 text-indigo-800',
    colorBorder: 'border-indigo-300',
    description: 'Staf TU, Operator Dapodik, Arsiparis Sekolah',
    defaultKeperluan: 'Pelayanan Administrasi Sekolah & Dapodik'
  }
];

export interface DokumenLogistikConfig {
  noMintaStart: number;
  tglMinta: string;
  tglVerif: string;
  tglBA: string; // Format YYYY-MM-DD or readable
  namaVerifikator: string;
  nipVerifikator: string;
  jabatanVerifikator: string;
  namaPengurusBarang: string;
  nipPengurusBarang: string;
  jabatanPengurusBarang: string;
  kotaKecamatan: string;
}

export type PaperSize = 'A4' | 'F4' | 'Letter';
export type MarginPreset = 'compact' | 'normal' | 'spacious' | 'custom';
export type TableSpacingPreset = 'compact' | 'normal' | 'spacious';
export type SignatureSpacingPreset = 'normal' | 'wide' | 'extra-wide' | 'custom';

export interface PrintPreviewSettings {
  paperSize: PaperSize;
  marginPreset: MarginPreset;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  tableSpacing: TableSpacingPreset;
  signatureSpacing: SignatureSpacingPreset;
  signatureHeightPx: number; // default: 90px
  fontSize: 'small' | 'normal' | 'large';
  showKop: boolean;
  lebihanPermintaanPrint?: boolean;
}

export interface MonthLogistikData {
  monthIndex: number;
  monthName?: string;
  barangList: LogistikBarang[];
  config: DokumenLogistikConfig;
  printSettings: PrintPreviewSettings;
  updatedAt: string;
}

export interface PerbaikanRABItem {
  id: string;
  no: number;
  namaBarang: string;
  volume: number;
  satuan: string;
  tarifHarga: number;
  jumlah: number;
  sumberBkuNo?: string;
  tipe?: 'material' | 'tukang';
  namaTukang?: string;
  peranTukang?: string;
  alamatTukang?: string;
  noHpTukang?: string;
}

export interface TukangPerbaikanItem {
  id: string;
  nama: string;
  nik?: string;
  alamat?: string;
  peran?: string; // e.g. 'Tukang Besi/Baja', 'Tukang Bangunan'
  noHp?: string;
  upahPerHari?: number;
  jumlahHari?: number;
  totalUpah?: number;
}

export interface PerbaikanSaprasConfig {
  temaPerbaikan: string;
  tglMulai: string;
  tglSelesai: string;
  tglSurat: string;
  tglBA: string;
  nomorSPK: string;
  nomorSuratPengantar: string;
  nomorSuratPermohonan: string;
  nomorBA: string;
  namaKomite: string;
  jabatanKomite: string;
  namaTukang: string;
  alamatTukang: string;
  noHpTukang: string;
  daftarTukang?: TukangPerbaikanItem[];
  bab3Maksud: string;
  bab3Tujuan: string[];
  bab3IdentifikasiMasalah: string[];
  fotoSebelum?: string;
  fotoProses?: string;
  syncMode?: 'auto' | 'manual';
}

export interface PerbaikanKegiatanItem {
  id: string; // e.g. 'kegiatan-1', 'kegiatan-2', or timestamp-based ID
  namaKegiatan: string; // e.g. 'Kegiatan 1: Perbaikan Atap dan Plafon Kelas'
  config: PerbaikanSaprasConfig;
  rabItems: PerbaikanRABItem[];
  selectedBkuNos?: string[]; // Daftar nomor BKU transaksi yang dipilih untuk kegiatan ini
  isSubmitted?: boolean;
  submittedAt?: string;
}

export interface MonthPerbaikanData {
  monthIndex: number;
  monthName?: string;
  isSubmitted?: boolean;
  submittedAt?: string;
  config: PerbaikanSaprasConfig;
  rabItems: PerbaikanRABItem[];
  totalAnggaran?: number;
  updatedAt: string;
  // Multi-kegiatan perbaikan dalam 1 bulan
  kegiatanList?: PerbaikanKegiatanItem[];
  activeKegiatanId?: string;
}

// ==========================================
// ESKUL LPJ, HONOR, PRESENSI & PROGRAM TYPES
// ==========================================

export interface EskulPelatihHonor {
  id: string;
  nama: string;
  jabatan: string;
  hk: number; // Hari kerja / jumlah pertemuan (default 4)
  satuan: number; // Tarif per pertemuan (default 75.000)
  pph21Persen: number; // e.g. 5, 6, atau 0
  hasNpwp?: boolean;
}

export interface EskulPresensiPelatih {
  pelatihId: string;
  nama: string;
  jabatan: string;
  minggu1: boolean;
  minggu2: boolean;
  minggu3: boolean;
  minggu4: boolean;
  keterangan?: string;
}

export interface EskulPresensiSiswa {
  siswaId: string;
  nama: string;
  kelas: string;
  jenisKelamin?: string;
  minggu1: 'H' | 'S' | 'I' | 'A' | '';
  minggu2: 'H' | 'S' | 'I' | 'A' | '';
  minggu3: 'H' | 'S' | 'I' | 'A' | '';
  minggu4: 'H' | 'S' | 'I' | 'A' | '';
  keterangan?: string;
}

export interface EskulPertemuanKegiatan {
  mingguKe: number;
  tanggal: string;
  hari: string;
  waktu: string;
  tempat: string;
  materi: string;
  materiSiaga?: string;
  materiPenggalang?: string;
  penanggungJawab: string;
  pesertaInfo: string;
  fotoDokumentasi?: string; // base64 or URL
}

export interface EskulProgramLaporanConfig {
  judulLaporan: string;
  bulanNama: string;
  tahunAnggaran: string;
  latarBelakang: string;
  tujuanLatihan: string[];
  hasilDanManfaat: string[];
  kendala: string[];
  solusi: string[];
  nomorSurat: string;
  tanggalSurat: string;
  tempatPembuatan: string;
  penutup: string;
}

export interface EskulProtaMatriksItem {
  bulanIndex: number; // 0..11
  bulanNama: string;
  fase: string;
  fokusKompetensi: string;
  materiMinggu1: string;
  materiMinggu2: string;
  materiMinggu3: string;
  materiMinggu4: string;
  targetOutput: string;
}

export interface EskulProtaConfig {
  judulProta: string;
  tahunAnggaran: string;
  subGolongan?: 'Penggalang' | 'Siaga' | 'Semua' | 'Umum';
  nomorGugusDepan?: string;
  latarBelakang: string;
  dasarHukum: string[];
  visiMisi: string;
  tujuanProgram: string[];
  sasaranPeserta: string;
  jadwalDanTempat: string;
  matriksTahunan: EskulProtaMatriksItem[];
  kegiatanBesarTahunan: { nama: string; waktu: string; tempat: string; sasaran: string }[];
  rabTahunan: {
    uraian: string;
    volume: number;
    satuan: string;
    hargaSatuan: number;
    total: number;
  }[];
  tempatPembuatan: string;
  tanggalPengesahan: string;
}

export interface MonthEskulRecord {
  recordKey: string; // e.g. `${monthIndex}_${eskulId}`
  monthIndex: number;
  monthName: string;
  eskulId: string;
  namaEskul: string;
  golonganPramuka?: 'Penggalang' | 'Siaga';
  isSubmitted?: boolean;
  submittedAt?: string;
  honorPelatihList: EskulPelatihHonor[];
  presensiPelatihList: EskulPresensiPelatih[];
  presensiSiswaList: EskulPresensiSiswa[];
  pertemuanList: EskulPertemuanKegiatan[];
  programConfig: EskulProgramLaporanConfig;
  protaConfig?: EskulProtaConfig;
  updatedAt: string;
}

export interface EskulFirestorePayload {
  id: string;
  records: Record<string, MonthEskulRecord>; // keyed by `${monthIndex}_${eskulId}`
  masterSiswaEskul: Record<string, EskulAnggota[]>; // eskulId -> EskulAnggota[]
  updatedAt: string;
}

// ==========================================
// MULTI-SCHOOL REGISTRY & MEMBERSHIP TYPES
// ==========================================

export type SchoolRole = 'owner' | 'editor' | 'viewer';

export interface SchoolSummary {
  schoolId: string;
  namaSekolah: string;
  npsn: string;
  role: SchoolRole;
  createdAt?: any;
}

export interface SchoolMember {
  uid: string;
  email: string;
  displayName?: string;
  role: SchoolRole;
  addedAt: any;
  inviteCode?: string;
}

export interface SchoolInvite {
  code: string;
  schoolId: string;
  schoolName: string;
  role: 'editor' | 'viewer';
  createdBy: string;
  createdAt?: any;
  expiresAt: any;
}

