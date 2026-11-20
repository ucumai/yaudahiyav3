import * as XLSX from 'xlsx';
import {
  SchoolMetadata,
  MasterGuru,
  MasterSiswa,
  MasterEskul
} from '../types';

export interface ParsedMasterExcelResult {
  metadata?: Partial<SchoolMetadata>;
  teachers?: MasterGuru[];
  students?: MasterSiswa[];
  eskulList?: MasterEskul[];
  detectedSheets: string[];
  totalRowsFound: {
    school: number;
    teachers: number;
    students: number;
    eskul: number;
  };
}

export interface ValidationErrorItem {
  sheet: 'Profil Sekolah' | 'Data Guru' | 'Data Siswa' | 'Data Eskul';
  row: number;
  field: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface MasterValidationReport {
  isValid: boolean;
  totalErrors: number;
  totalWarnings: number;
  items: ValidationErrorItem[];
  sanitizedData: {
    metadata?: SchoolMetadata;
    teachers?: MasterGuru[];
    students?: MasterSiswa[];
    eskulList?: MasterEskul[];
  };
  counts: {
    schoolFields: number;
    teachers: number;
    students: number;
    eskul: number;
  };
}

// ============================================================================
// 1. TEMPLATE & EXPORT HELPER
// ============================================================================

/**
 * Format string or number cleanly
 */
function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Normalizes Excel row keys (case-insensitive & whitespace trimmed)
 */
function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = key
      .toLowerCase()
      .replace(/[\s_\-\/]+/g, '')
      .replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = val;
  }
  return normalized;
}

/**
 * Ekspor Seluruh Master Data ke Workbook Excel (.xlsx) dengan Sheet Terpisah
 */
export function exportMasterToExcel(
  data: {
    metadata: SchoolMetadata;
    teachers: MasterGuru[];
    students: MasterSiswa[];
    eskulList: MasterEskul[];
  },
  fileName?: string
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Profil Sekolah
  const schoolRows = [
    {
      Parameter: 'Nama Sekolah',
      Nilai: data.metadata.namaSekolah || '',
      Keterangan: 'Nama resmi satuan pendidikan'
    },
    {
      Parameter: 'NPSN',
      Nilai: data.metadata.npsn || '',
      Keterangan: 'Nomor Pokok Sekolah Nasional (8 digit)'
    },
    {
      Parameter: 'Tahun Anggaran',
      Nilai: data.metadata.tahunAnggaran || '2026',
      Keterangan: 'Tahun anggaran belanja BOSP'
    },
    {
      Parameter: 'Bulan / Periode',
      Nilai: data.metadata.bulanTahun || 'Februari 2026',
      Keterangan: 'Format: Bulan Tahun'
    },
    {
      Parameter: 'Sumber Dana',
      Nilai: data.metadata.sumberDana || 'BOSP Reguler',
      Keterangan: 'Contoh: BOSP Reguler / Kinerja'
    },
    {
      Parameter: 'Alamat Lengkap',
      Nilai: data.metadata.alamatLengkap || '',
      Keterangan: 'Jalan, RT/RW, Dusun'
    },
    {
      Parameter: 'Desa / Kelurahan / Kecamatan',
      Nilai: data.metadata.desaKecamatan || '',
      Keterangan: 'Nama Desa & Kecamatan'
    },
    {
      Parameter: 'Kabupaten / Kota',
      Nilai: data.metadata.kabupatenKota || '',
      Keterangan: 'Contoh: Kabupaten Bogor'
    },
    {
      Parameter: 'Provinsi',
      Nilai: data.metadata.provinsi || 'Jawa Barat',
      Keterangan: 'Nama Provinsi'
    },
    {
      Parameter: 'Email Sekolah',
      Nilai: data.metadata.emailSekolah || '',
      Keterangan: 'Email resmi sekolah'
    },
    {
      Parameter: 'Telepon Sekolah',
      Nilai: data.metadata.teleponSekolah || '',
      Keterangan: 'No telepon kantor / kontak'
    },
    {
      Parameter: 'Nama Kepala Sekolah',
      Nilai: data.metadata.kepalaSekolah || '',
      Keterangan: 'Nama lengkap beserta gelar'
    },
    {
      Parameter: 'NIP Kepala Sekolah',
      Nilai: data.metadata.nipKepalaSekolah || '-',
      Keterangan: '18 digit NIP atau tanda strip (-)'
    },
    {
      Parameter: 'Nama Bendahara',
      Nilai: data.metadata.bendahara || data.metadata.namaBendahara || '',
      Keterangan: 'Nama bendahara pengeluaran BOSP'
    },
    {
      Parameter: 'NIP Bendahara',
      Nilai: data.metadata.nipBendahara || '-',
      Keterangan: '18 digit NIP atau tanda strip (-)'
    },
    {
      Parameter: 'Komite Sekolah',
      Nilai: data.metadata.komiteSekolah || '',
      Keterangan: 'Ketua / Pengurus Komite Sekolah'
    },
    {
      Parameter: 'Nama Bank BOSP',
      Nilai: data.metadata.bankNama || 'Bank BJB',
      Keterangan: 'Nama bank penyalur BOSP'
    },
    {
      Parameter: 'Nomor Rekening',
      Nilai: data.metadata.bankNoRek || '',
      Keterangan: 'Nomor rekening penampung BOSP'
    },
    {
      Parameter: 'Rekening Atas Nama',
      Nilai: data.metadata.bankAtasNama || '',
      Keterangan: 'Nama pemilik rekening bank'
    }
  ];
  const wsSchool = XLSX.utils.json_to_sheet(schoolRows);
  wsSchool['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSchool, 'Profil Sekolah');

  // 2. Sheet: Data Guru & GTK
  const teacherRows = (data.teachers && data.teachers.length > 0 ? data.teachers : []).map(
    (t, idx) => ({
      No: idx + 1,
      ID: t.id || `GUR-${String(idx + 1).padStart(3, '0')}`,
      'Nama Lengkap': t.nama,
      NIP: t.nip || '-',
      NUPTK: t.nuptk || '-',
      Jabatan: t.jabatan,
      'Status Kepegawaian': t.statusKepegawaian || 'PNS',
      'Jenis Kelamin (L/P)': t.jenisKelamin || 'L',
      'Pendidikan Terakhir': t.pendidikanTerakhir || 'S1',
      Email: t.email || '',
      'Tag Penugasan': Array.isArray(t.tags) ? t.tags.join(', ') : ''
    })
  );
  const wsTeachers = XLSX.utils.json_to_sheet(
    teacherRows.length > 0
      ? teacherRows
      : [
          {
            No: 1,
            ID: 'GUR-001',
            'Nama Lengkap': 'Contoh Guru, S.Pd',
            NIP: '198501012010011001',
            NUPTK: '1234567890123456',
            Jabatan: 'Guru Kelas / Guru PJOK',
            'Status Kepegawaian': 'PNS',
            'Jenis Kelamin (L/P)': 'L',
            'Pendidikan Terakhir': 'S1',
            Email: 'guru@sekolah.sch.id',
            'Tag Penugasan': 'GURU_KELAS, TIM_BOSP'
          }
        ]
  );
  wsTeachers['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 32 },
    { wch: 24 },
    { wch: 20 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTeachers, 'Data Guru & GTK');

  // 3. Sheet: Data Siswa
  const studentRows = (data.students && data.students.length > 0 ? data.students : []).map(
    (s, idx) => ({
      No: idx + 1,
      ID: s.id || `SIS-${String(idx + 1).padStart(3, '0')}`,
      NISN: s.nisn,
      NIS: s.nis || '-',
      'Nama Siswa': s.nama,
      'Kelas / Rombel': s.kelas,
      'Jenis Kelamin (L/P)': s.jenisKelamin || 'L',
      'Tempat Lahir': s.tempatLahir || '',
      'Tanggal Lahir': s.tanggalLahir || '',
      'Nama Wali': s.namaWali || '',
      Status: s.status || 'Aktif',
      'Penerima PIP (Ya/Tidak)': s.penerimaPIP ? 'Ya' : 'Tidak'
    })
  );
  const wsStudents = XLSX.utils.json_to_sheet(
    studentRows.length > 0
      ? studentRows
      : [
          {
            No: 1,
            ID: 'SIS-001',
            NISN: '0123456789',
            NIS: '242501001',
            'Nama Siswa': 'Ahmad Fauzi',
            'Kelas / Rombel': 'Kelas 1A',
            'Jenis Kelamin (L/P)': 'L',
            'Tempat Lahir': 'Bogor',
            'Tanggal Lahir': '2017-05-12',
            'Nama Wali': 'Budi Santoso',
            Status: 'Aktif',
            'Penerima PIP (Ya/Tidak)': 'Tidak'
          }
        ]
  );
  wsStudents['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 30 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 25 },
    { wch: 12 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Data Siswa');

  // 4. Sheet: Data Ekstrakurikuler
  const eskulRows = (data.eskulList && data.eskulList.length > 0 ? data.eskulList : []).map(
    (e, idx) => ({
      No: idx + 1,
      ID: e.id || `ESK-${String(idx + 1).padStart(2, '0')}`,
      'Nama Ekstrakurikuler': e.namaEskul,
      Kategori: e.kategori || 'Kepanduan',
      'Nama Pembina': e.namaPembina,
      'NIP Pembina': e.nipPembina || '-',
      'Nama Pelatih': e.namaPelatih,
      'No HP Pelatih': e.noHpPelatih || '',
      'Nama Bank Pelatih': e.bankPelatih || 'Bank BJB',
      'No Rekening Pelatih': e.noRekeningPelatih || '',
      'Honor Per Kegiatan (Rp)': e.honorPerKegiatan || 50000,
      'Jadwal Latihan': e.jadwalLatihan || 'Jumat, 14:00 - 16:00',
      'Lokasi Latihan': e.lokasi || 'Lapangan Sekolah',
      'Jumlah Anggota': e.jumlahAnggota || (e.anggotaSiswa ? e.anggotaSiswa.length : 0),
      'Deskripsi Program': e.deskripsiProgram || '',
      'Target Capaian': e.targetCapaian || ''
    })
  );
  const wsEskul = XLSX.utils.json_to_sheet(
    eskulRows.length > 0
      ? eskulRows
      : [
          {
            No: 1,
            ID: 'ESK-01',
            'Nama Ekstrakurikuler': 'Pramuka',
            Kategori: 'Kepanduan',
            'Nama Pembina': 'Pembina Pramuka, S.Pd',
            'NIP Pembina': '198001012005011002',
            'Nama Pelatih': 'Pelatih Pramuka Mahir',
            'No HP Pelatih': '081234567890',
            'Nama Bank Pelatih': 'Bank BJB',
            'No Rekening Pelatih': '0123456789001',
            'Honor Per Kegiatan (Rp)': 75000,
            'Jadwal Latihan': 'Jumat, 13:30 - 15:30',
            'Lokasi Latihan': 'Halaman Utama Sekolah',
            'Jumlah Anggota': 30,
            'Deskripsi Program': 'Pembinaan kepramukaan siaga dan penggalang',
            'Target Capaian': 'Kecakapan umum & pelantikan tingkat regu'
          }
        ]
  );
  wsEskul['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 25 },
    { wch: 18 },
    { wch: 28 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 25 },
    { wch: 15 },
    { wch: 35 },
    { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsEskul, 'Data Ekstrakurikuler');

  // 5. Sheet: Petunjuk & Kriteria Database Firebase
  const helpRows = [
    {
      Kategori: 'Kriteria Firebase',
      Ketentuan: 'Format data wajib sesuai kolom header agar langsung tersimpan di Cloud Firestore.'
    },
    {
      Kategori: 'Guru & GTK',
      Ketentuan:
        'Status Kepegawaian harus salah satu dari: PNS, PPPK, Honorer, GTT. Jenis Kelamin: L atau P. NIP kosong otomatis diisi tanda strip (-).'
    },
    {
      Kategori: 'Data Siswa',
      Ketentuan:
        'NISN wajib diisi angka. Kelas format bebas (contoh: Kelas 1A, Kelas 6). Status: Aktif, Lulus, atau Mutasi. PIP: Ya atau Tidak.'
    },
    {
      Kategori: 'Profil Sekolah',
      Ketentuan:
        'Parameter nama sekolah dan NPSN penting untuk kunci identifikasi dokumen SPJ dan database cloud.'
    },
    {
      Kategori: 'Ekstrakurikuler',
      Ketentuan:
        'Kategori eskul: Kepanduan, Olahraga, Seni & Budaya, Keagamaan, Akademik, Lainnya. Honor diisi angka tanpa titik/koma.'
    }
  ];
  const wsHelp = XLSX.utils.json_to_sheet(helpRows);
  wsHelp['!cols'] = [{ wch: 22 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, 'Petunjuk Kriteria');

  const safeNpsn = data.metadata.npsn ? cleanStr(data.metadata.npsn) : '20201363';
  const outName =
    fileName ||
    `Master_Data_BOSP_${safeNpsn}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, outName);
}

/**
 * Download Template Kosong Excel dengan format standar siap diisi
 */
export function downloadMasterTemplateExcel() {
  const dummyMetadata: SchoolMetadata = {
    namaSekolah: 'SD NEGERI CONTOH',
    npsn: '20201363',
    bulanTahun: 'Januari 2026',
    sumberDana: 'BOSP Reguler',
    desaKecamatan: 'Desa Sukadamai, Kec. Tanah Sareal',
    kabupatenKota: 'Kota Bogor',
    provinsi: 'Jawa Barat',
    kepalaSekolah: 'Drs. H. Mulyadi, M.Pd.',
    nipKepalaSekolah: '197001011995031001',
    bendahara: 'Siti Aminah, S.Pd.',
    nipBendahara: '198505122009022003',
    komiteSekolah: 'Ir. Hendra Gunawan',
    alamatLengkap: 'Jl. Raya Pendidikan No. 45',
    emailSekolah: 'sdn.contoh@sekolah.sch.id',
    teleponSekolah: '0251-8321456',
    bankNama: 'Bank BJB',
    bankNoRek: '0123456789001',
    bankAtasNama: 'SDN CONTOH BOSP REGULER',
    tahunAnggaran: '2026'
  };

  const dummyTeachers: MasterGuru[] = [
    {
      id: 'GUR-001',
      nama: 'Drs. H. Mulyadi, M.Pd.',
      nip: '197001011995031001',
      nuptk: '1234567890123456',
      jabatan: 'Kepala Sekolah',
      statusKepegawaian: 'PNS',
      jenisKelamin: 'L',
      pendidikanTerakhir: 'S2',
      email: 'kepsek@sekolah.sch.id',
      tags: ['TIM_BOSP']
    },
    {
      id: 'GUR-002',
      nama: 'Siti Aminah, S.Pd.',
      nip: '198505122009022003',
      nuptk: '9876543210987654',
      jabatan: 'Bendahara BOSP & Guru Kelas 1A',
      statusKepegawaian: 'PNS',
      jenisKelamin: 'P',
      pendidikanTerakhir: 'S1',
      email: 'bendahara@sekolah.sch.id',
      tags: ['GURU_KELAS', 'TIM_BOSP']
    },
    {
      id: 'GUR-003',
      nama: 'Rahmat Hidayat, S.Pd.',
      nip: '-',
      nuptk: '-',
      jabatan: 'Guru PJOK & Pelatih Futsal',
      statusKepegawaian: 'Honorer',
      jenisKelamin: 'L',
      pendidikanTerakhir: 'S1',
      email: 'rahmat@gmail.com',
      tags: ['GURU_MAPEL']
    }
  ];

  const dummyStudents: MasterSiswa[] = [
    {
      id: 'SIS-001',
      nisn: '0151234567',
      nis: '242501001',
      nama: 'Ahmad Fauzi',
      kelas: 'Kelas 1A',
      jenisKelamin: 'L',
      tempatLahir: 'Bogor',
      tanggalLahir: '2018-05-12',
      namaWali: 'Budi Santoso',
      status: 'Aktif',
      penerimaPIP: false
    },
    {
      id: 'SIS-002',
      nisn: '0159876543',
      nis: '242501002',
      nama: 'Siti Nurhaliza',
      kelas: 'Kelas 1A',
      jenisKelamin: 'P',
      tempatLahir: 'Bogor',
      tanggalLahir: '2018-07-20',
      namaWali: 'Umar Bakri',
      status: 'Aktif',
      penerimaPIP: true
    }
  ];

  const dummyEskul: MasterEskul[] = [
    {
      id: 'ESK-01',
      namaEskul: 'Pramuka',
      kategori: 'Kepanduan',
      namaPembina: 'Drs. H. Mulyadi, M.Pd.',
      nipPembina: '197001011995031001',
      namaPelatih: 'Kak Ridwan Suwandi',
      noHpPelatih: '081234567890',
      bankPelatih: 'Bank BJB',
      noRekeningPelatih: '001293847583',
      honorPerKegiatan: 75000,
      jadwalLatihan: 'Jumat, 13:30 - 15:30',
      lokasi: 'Halaman Utama Sekolah',
      jumlahAnggota: 32,
      deskripsiProgram: 'Latihan dasar kepramukaan Siaga dan Penggalang.',
      targetCapaian: 'Lulus SKU Ramu & Rakit.',
      anggotaSiswa: []
    },
    {
      id: 'ESK-02',
      namaEskul: 'Futsal',
      kategori: 'Olahraga',
      namaPembina: 'Rahmat Hidayat, S.Pd.',
      nipPembina: '-',
      namaPelatih: 'Coach Bayu Pratama',
      noHpPelatih: '087812345678',
      bankPelatih: 'Bank BJB',
      noRekeningPelatih: '003948572619',
      honorPerKegiatan: 60000,
      jadwalLatihan: 'Sabtu, 08:00 - 10:00',
      lokasi: 'Lapangan Olahraga',
      jumlahAnggota: 20,
      deskripsiProgram: 'Pengembangan fisik & taktik bermain futsal.',
      targetCapaian: 'Juara Turnamen O2SN Tingkat Kecamatan.',
      anggotaSiswa: []
    }
  ];

  exportMasterToExcel(
    {
      metadata: dummyMetadata,
      teachers: dummyTeachers,
      students: dummyStudents,
      eskulList: dummyEskul
    },
    'Template_Master_Data_BOSP_Format_Firebase.xlsx'
  );
}

// ============================================================================
// 2. PARSING EXCEL HELPER
// ============================================================================

/**
 * Parsing file Excel (All-in-one ataupun single sheet)
 */
export async function parseMasterExcelFile(file: File): Promise<ParsedMasterExcelResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const result: ParsedMasterExcelResult = {
    detectedSheets: workbook.SheetNames,
    totalRowsFound: {
      school: 0,
      teachers: 0,
      students: 0,
      eskul: 0
    }
  };

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const lowerSheet = sheetName.toLowerCase().trim();

    // Convert sheet to json
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    // Detect sheet type
    const isSchoolSheet =
      lowerSheet.includes('profil') ||
      lowerSheet.includes('sekolah') ||
      lowerSheet.includes('metadata') ||
      lowerSheet.includes('school');

    const isTeacherSheet =
      lowerSheet.includes('guru') ||
      lowerSheet.includes('gtk') ||
      lowerSheet.includes('teacher') ||
      lowerSheet.includes('pendidik');

    const isStudentSheet =
      lowerSheet.includes('siswa') ||
      lowerSheet.includes('student') ||
      lowerSheet.includes('murid') ||
      lowerSheet.includes('peserta didik');

    const isEskulSheet =
      lowerSheet.includes('eskul') ||
      lowerSheet.includes('ekskul') ||
      lowerSheet.includes('ekstrakurikuler');

    if (isSchoolSheet) {
      result.metadata = parseSchoolSheetRows(rawRows);
      result.totalRowsFound.school = Object.keys(result.metadata).length;
    } else if (isTeacherSheet) {
      result.teachers = parseTeacherSheetRows(rawRows);
      result.totalRowsFound.teachers = result.teachers.length;
    } else if (isStudentSheet) {
      result.students = parseStudentSheetRows(rawRows);
      result.totalRowsFound.students = result.students.length;
    } else if (isEskulSheet) {
      result.eskulList = parseEskulSheetRows(rawRows);
      result.totalRowsFound.eskul = result.eskulList.length;
    }
  }

  // Fallback: If no sheets matched names (e.g. user uploaded a single sheet named "Sheet1")
  if (
    !result.metadata &&
    !result.teachers &&
    !result.students &&
    !result.eskulList &&
    workbook.SheetNames.length > 0
  ) {
    const firstSheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
    if (rawRows.length > 0) {
      const firstRowNormalized = normalizeRowKeys(rawRows[0]);
      const keys = Object.keys(firstRowNormalized);

      if (keys.some((k) => k.includes('nisn') || k.includes('kelas') || k.includes('pip'))) {
        result.students = parseStudentSheetRows(rawRows);
        result.totalRowsFound.students = result.students.length;
      } else if (keys.some((k) => k.includes('nip') || k.includes('nuptk') || k.includes('kepegawaian'))) {
        result.teachers = parseTeacherSheetRows(rawRows);
        result.totalRowsFound.teachers = result.teachers.length;
      } else if (keys.some((k) => k.includes('pembina') || k.includes('pelatih') || k.includes('eskul'))) {
        result.eskulList = parseEskulSheetRows(rawRows);
        result.totalRowsFound.eskul = result.eskulList.length;
      } else if (keys.some((k) => k.includes('parameter') || k.includes('npsn') || k.includes('kepala'))) {
        result.metadata = parseSchoolSheetRows(rawRows);
        result.totalRowsFound.school = Object.keys(result.metadata).length;
      }
    }
  }

  return result;
}

/**
 * Parsing rows for School Metadata
 */
function parseSchoolSheetRows(rows: Record<string, any>[]): Partial<SchoolMetadata> {
  const meta: Partial<SchoolMetadata> = {};

  // Check if rows are Key-Value (Parameter | Nilai)
  const isKeyValue = rows.some((r) => {
    const nr = normalizeRowKeys(r);
    return nr.parameter !== undefined && nr.nilai !== undefined;
  });

  if (isKeyValue) {
    for (const r of rows) {
      const nr = normalizeRowKeys(r);
      const param = cleanStr(nr.parameter).toLowerCase().replace(/[^a-z0-9]/g, '');
      const val = cleanStr(nr.nilai);
      if (!param || !val) continue;

      if (param.includes('namasekolah')) meta.namaSekolah = val;
      else if (param.includes('npsn')) meta.npsn = val;
      else if (param.includes('tahunanggaran') || param.includes('tahun')) meta.tahunAnggaran = val;
      else if (param.includes('bulantahun') || param.includes('bulan')) meta.bulanTahun = val;
      else if (param.includes('sumberdana')) meta.sumberDana = val;
      else if (param.includes('alamatlengkap') || param.includes('alamat')) meta.alamatLengkap = val;
      else if (param.includes('desakecamatan') || param.includes('desa') || param.includes('kecamatan'))
        meta.desaKecamatan = val;
      else if (param.includes('kabupatenkota') || param.includes('kabupaten') || param.includes('kota'))
        meta.kabupatenKota = val;
      else if (param.includes('provinsi')) meta.provinsi = val;
      else if (param.includes('emailsekolah') || param.includes('email')) meta.emailSekolah = val;
      else if (param.includes('teleponsekolah') || param.includes('telepon') || param.includes('telp'))
        meta.teleponSekolah = val;
      else if (param.includes('nipkepala') || param.includes('nipkepsek')) meta.nipKepalaSekolah = val;
      else if (param.includes('kepalasekolah') || param.includes('kepsek')) meta.kepalaSekolah = val;
      else if (param.includes('nipbendahara')) meta.nipBendahara = val;
      else if (param.includes('bendahara')) {
        meta.bendahara = val;
        meta.namaBendahara = val;
      } else if (param.includes('komite')) meta.komiteSekolah = val;
      else if (param.includes('namabank') || param.includes('bank')) meta.bankNama = val;
      else if (param.includes('nomorrekening') || param.includes('norek')) meta.bankNoRek = val;
      else if (param.includes('atasnama') || param.includes('rekeningatasnama')) meta.bankAtasNama = val;
    }
  } else if (rows.length > 0) {
    // Single row with headers as column names
    const r = normalizeRowKeys(rows[0]);
    meta.namaSekolah = cleanStr(r.namasekolah || r.sekolah);
    meta.npsn = cleanStr(r.npsn);
    meta.tahunAnggaran = cleanStr(r.tahunanggaran || r.tahun || '2026');
    meta.bulanTahun = cleanStr(r.bulantahun || r.bulan);
    meta.sumberDana = cleanStr(r.sumberdana || 'BOSP Reguler');
    meta.alamatLengkap = cleanStr(r.alamatlengkap || r.alamat);
    meta.desaKecamatan = cleanStr(r.desakecamatan || r.kecamatan || r.desa);
    meta.kabupatenKota = cleanStr(r.kabupatenkota || r.kabupaten || r.kota);
    meta.provinsi = cleanStr(r.provinsi || 'Jawa Barat');
    meta.emailSekolah = cleanStr(r.emailsekolah || r.email);
    meta.teleponSekolah = cleanStr(r.teleponsekolah || r.telepon || r.telp);
    meta.kepalaSekolah = cleanStr(r.kepalasekolah || r.kepsek);
    meta.nipKepalaSekolah = cleanStr(r.nipkepalasekolah || r.nipkepsek || '-');
    meta.bendahara = cleanStr(r.namabendahara || r.bendahara);
    meta.namaBendahara = meta.bendahara;
    meta.nipBendahara = cleanStr(r.nipbendahara || '-');
    meta.komiteSekolah = cleanStr(r.komitesekolah || r.komite);
    meta.bankNama = cleanStr(r.namabank || r.bank || 'Bank BJB');
    meta.bankNoRek = cleanStr(r.nomorrekening || r.norek || r.banknorek);
    meta.bankAtasNama = cleanStr(r.atasnama || r.rekeningatasnama || r.bankatasnama);
  }

  return meta;
}

/**
 * Parsing rows for Teachers
 */
function parseTeacherSheetRows(rows: Record<string, any>[]): MasterGuru[] {
  const result: MasterGuru[] = [];

  rows.forEach((r, idx) => {
    const nr = normalizeRowKeys(r);
    const nama = cleanStr(nr.namalengkap || nr.nama || nr.namaguru);
    if (!nama) return;

    let nip = cleanStr(nr.nip);
    if (!nip || nip === '0') nip = '-';

    let nuptk = cleanStr(nr.nuptk);
    if (!nuptk || nuptk === '0') nuptk = '-';

    const rawJabatan = cleanStr(nr.jabatan || nr.tugas || nr.posisi);
    const jabatan = rawJabatan || 'Guru Kelas';

    // Status kepegawaian
    const rawStatus = cleanStr(nr.statuskepegawaian || nr.status || nr.kepegawaian).toUpperCase();
    let statusKepegawaian: 'PNS' | 'PPPK' | 'Honorer' | 'GTT' = 'PNS';
    if (rawStatus.includes('PPPK') || rawStatus.includes('P3K')) statusKepegawaian = 'PPPK';
    else if (rawStatus.includes('HONOR') || rawStatus.includes('GTT')) statusKepegawaian = 'Honorer';
    else if (rawStatus.includes('GTT')) statusKepegawaian = 'GTT';
    else if (rawStatus.includes('PNS') || nip !== '-') statusKepegawaian = 'PNS';
    else statusKepegawaian = 'Honorer';

    // Jenis Kelamin
    const rawJk = cleanStr(nr.jeniskelamin || nr.jk || nr.gender).toUpperCase();
    const jenisKelamin: 'L' | 'P' =
      rawJk.startsWith('P') || rawJk.includes('WANITA') || rawJk.includes('PEREMPUAN') ? 'P' : 'L';

    // Tags
    const rawTags = cleanStr(nr.tagpenugasan || nr.tag || nr.tags);
    const tags = rawTags
      ? rawTags
          .split(/[,;\/]+/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : undefined;

    const teacher: MasterGuru = {
      id: cleanStr(nr.id) || `GUR-${String(idx + 1).padStart(3, '0')}`,
      nama,
      nip,
      nuptk,
      jabatan,
      statusKepegawaian,
      jenisKelamin,
      pendidikanTerakhir: cleanStr(nr.pendidikanterakhir || nr.pendidikan || 'S1') || 'S1',
      email: cleanStr(nr.email),
      tags
    };

    result.push(teacher);
  });

  return result;
}

/**
 * Parsing rows for Students
 */
function parseStudentSheetRows(rows: Record<string, any>[]): MasterSiswa[] {
  const result: MasterSiswa[] = [];

  rows.forEach((r, idx) => {
    const nr = normalizeRowKeys(r);
    const nama = cleanStr(nr.namasiswa || nr.nama || nr.namapesertadidik);
    if (!nama) return;

    let nisn = cleanStr(nr.nisn);
    if (!nisn) {
      nisn = `NISN-${String(idx + 1).padStart(6, '0')}`;
    }

    const nis = cleanStr(nr.nis) || '-';

    let kelas = cleanStr(nr.kelasrombel || nr.kelas || nr.rombel);
    if (!kelas) kelas = 'Kelas 1A';

    // Jenis kelamin
    const rawJk = cleanStr(nr.jeniskelamin || nr.jk || nr.gender).toUpperCase();
    const jenisKelamin: 'L' | 'P' =
      rawJk.startsWith('P') || rawJk.includes('WANITA') || rawJk.includes('PEREMPUAN') ? 'P' : 'L';

    // Status
    const rawStatus = cleanStr(nr.status).toLowerCase();
    let status: 'Aktif' | 'Lulus' | 'Mutasi' = 'Aktif';
    if (rawStatus.includes('lulus')) status = 'Lulus';
    else if (rawStatus.includes('mutasi') || rawStatus.includes('pindah')) status = 'Mutasi';

    // Penerima PIP
    const rawPip = cleanStr(nr.penerimapip || nr.pip).toLowerCase();
    const penerimaPIP =
      rawPip === 'ya' ||
      rawPip === 'y' ||
      rawPip === 'true' ||
      rawPip === '1' ||
      rawPip === 'dapat';

    const student: MasterSiswa = {
      id: cleanStr(nr.id) || `SIS-${String(idx + 1).padStart(3, '0')}`,
      nisn,
      nis,
      nama: nama.toUpperCase(),
      kelas,
      jenisKelamin,
      tempatLahir: cleanStr(nr.tempatlahir || nr.tempat || 'Bogor'),
      tanggalLahir: cleanStr(nr.tanggallahir || nr.tgllahir || '-'),
      namaWali: cleanStr(nr.namawali || nr.wali || nr.orangtua || '-'),
      status,
      penerimaPIP
    };

    result.push(student);
  });

  return result;
}

/**
 * Parsing rows for Ekstrakurikuler
 */
function parseEskulSheetRows(rows: Record<string, any>[]): MasterEskul[] {
  const result: MasterEskul[] = [];

  rows.forEach((r, idx) => {
    const nr = normalizeRowKeys(r);
    const namaEskul = cleanStr(nr.namaekstrakurikuler || nr.namaeskul || nr.nama);
    if (!namaEskul) return;

    // Kategori
    const rawKategori = cleanStr(nr.kategori).toLowerCase();
    let kategori: MasterEskul['kategori'] = 'Olahraga';
    if (rawKategori.includes('pandu') || rawKategori.includes('pramuka')) kategori = 'Kepanduan';
    else if (rawKategori.includes('olahraga') || rawKategori.includes('sport')) kategori = 'Olahraga';
    else if (rawKategori.includes('seni') || rawKategori.includes('budaya') || rawKategori.includes('tari') || rawKategori.includes('musik'))
      kategori = 'Seni & Budaya';
    else if (rawKategori.includes('agama') || rawKategori.includes('islam') || rawKategori.includes('tahfiz') || rawKategori.includes('quran'))
      kategori = 'Keagamaan';
    else if (rawKategori.includes('akademik') || rawKategori.includes('sains') || rawKategori.includes('inggris'))
      kategori = 'Akademik';
    else kategori = 'Lainnya';

    const namaPembina = cleanStr(nr.namapembina || nr.pembina || 'Pembina Eskul');
    const nipPembina = cleanStr(nr.nippembina || '-');
    const namaPelatih = cleanStr(nr.namapelatih || nr.pelatih || 'Pelatih Eskul');
    const noHpPelatih = cleanStr(nr.nohppelatih || nr.nohp || nr.telepon || '');
    const bankPelatih = cleanStr(nr.namabankpelatih || nr.bankpelatih || nr.bank || 'Bank BJB');
    const noRekeningPelatih = cleanStr(nr.norekeningpelatih || nr.norekpelatih || nr.norekening || '');

    // Numeric Honor
    let honorPerKegiatan = 50000;
    const rawHonor = cleanStr(nr.honorperkegiatan || nr.honor || nr.tarif);
    if (rawHonor) {
      const cleanNum = parseFloat(rawHonor.replace(/[^0-9.]/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        honorPerKegiatan = cleanNum;
      }
    }

    const eskul: MasterEskul = {
      id: cleanStr(nr.id) || `ESK-${String(idx + 1).padStart(2, '0')}`,
      namaEskul,
      kategori,
      namaPembina,
      nipPembina,
      namaPelatih,
      noHpPelatih,
      bankPelatih,
      noRekeningPelatih,
      honorPerKegiatan,
      jadwalLatihan: cleanStr(nr.jadwallatihan || nr.jadwal || 'Jumat, 14:00 - 16:00'),
      lokasi: cleanStr(nr.lokasilatihan || nr.lokasi || 'Lingkungan Sekolah'),
      jumlahAnggota: parseInt(cleanStr(nr.jumlahanggota || '0'), 10) || 0,
      deskripsiProgram: cleanStr(nr.deskripsiprogram || nr.deskripsi || ''),
      targetCapaian: cleanStr(nr.targetcapaian || nr.target || ''),
      anggotaSiswa: []
    };

    result.push(eskul);
  });

  return result;
}

// ============================================================================
// 3. VALIDASI SESUAI KRITERIA DATABASE FIREBASE
// ============================================================================

/**
 * Validasi Master Data secara menyeluruh sebelum disimpan ke Firestore
 */
export function validateMasterDataForFirebase(
  parsed: ParsedMasterExcelResult,
  currentData: {
    metadata: SchoolMetadata;
    teachers: MasterGuru[];
    students: MasterSiswa[];
    eskulList: MasterEskul[];
  }
): MasterValidationReport {
  const items: ValidationErrorItem[] = [];

  // A. Validasi Profil Sekolah
  const mergedMeta: SchoolMetadata = {
    ...currentData.metadata,
    ...(parsed.metadata || {})
  };

  let schoolFieldsCount = 0;
  if (parsed.metadata && Object.keys(parsed.metadata).length > 0) {
    schoolFieldsCount = Object.keys(parsed.metadata).length;
    if (!mergedMeta.namaSekolah || mergedMeta.namaSekolah.trim() === '') {
      items.push({
        sheet: 'Profil Sekolah',
        row: 1,
        field: 'Nama Sekolah',
        value: '',
        message: 'Nama Sekolah wajib diisi untuk identifikasi dokumen SPJ.',
        severity: 'error'
      });
    }

    if (!mergedMeta.npsn || mergedMeta.npsn.trim() === '') {
      items.push({
        sheet: 'Profil Sekolah',
        row: 2,
        field: 'NPSN',
        value: '',
        message: 'NPSN wajib diisi untuk penomoran database cloud sekolah.',
        severity: 'error'
      });
    } else if (mergedMeta.npsn.length < 6) {
      items.push({
        sheet: 'Profil Sekolah',
        row: 2,
        field: 'NPSN',
        value: mergedMeta.npsn,
        message: 'NPSN umumnya terdiri dari 8 digit angka.',
        severity: 'warning'
      });
    }

    if (!mergedMeta.kepalaSekolah || mergedMeta.kepalaSekolah.trim() === '') {
      items.push({
        sheet: 'Profil Sekolah',
        row: 12,
        field: 'Kepala Sekolah',
        value: '',
        message: 'Nama Kepala Sekolah belum diisi (dibutuhkan untuk TTD SPJ & Kwitansi).',
        severity: 'warning'
      });
    }

    if (!mergedMeta.bendahara || mergedMeta.bendahara.trim() === '') {
      items.push({
        sheet: 'Profil Sekolah',
        row: 14,
        field: 'Bendahara',
        value: '',
        message: 'Nama Bendahara belum diisi (dibutuhkan untuk TTD SPJ & BKU).',
        severity: 'warning'
      });
    }
  }

  // B. Validasi Data Guru & GTK
  const validatedTeachers: MasterGuru[] = [];
  const seenNip = new Set<string>();

  if (parsed.teachers && parsed.teachers.length > 0) {
    parsed.teachers.forEach((t, idx) => {
      const rowNum = idx + 2; // header at row 1
      if (!t.nama || t.nama.trim() === '') {
        items.push({
          sheet: 'Data Guru',
          row: rowNum,
          field: 'Nama Lengkap',
          value: '',
          message: `Baris ke-${rowNum}: Nama Guru tidak boleh kosong.`,
          severity: 'error'
        });
        return;
      }

      // Check NIP duplication if not '-'
      if (t.nip && t.nip !== '-' && t.nip.length > 5) {
        if (seenNip.has(t.nip)) {
          items.push({
            sheet: 'Data Guru',
            row: rowNum,
            field: 'NIP',
            value: t.nip,
            message: `Baris ke-${rowNum}: NIP ${t.nip} terduplikasi dengan guru lain.`,
            severity: 'warning'
          });
        }
        seenNip.add(t.nip);
      }

      validatedTeachers.push({
        ...t,
        id: t.id || `GUR-${String(idx + 1).padStart(3, '0')}`
      });
    });
  }

  // C. Validasi Data Siswa
  const validatedStudents: MasterSiswa[] = [];
  const seenNisn = new Set<string>();

  if (parsed.students && parsed.students.length > 0) {
    parsed.students.forEach((s, idx) => {
      const rowNum = idx + 2;
      if (!s.nama || s.nama.trim() === '') {
        items.push({
          sheet: 'Data Siswa',
          row: rowNum,
          field: 'Nama Siswa',
          value: '',
          message: `Baris ke-${rowNum}: Nama Siswa tidak boleh kosong.`,
          severity: 'error'
        });
        return;
      }

      if (!s.nisn || s.nisn.trim() === '') {
        items.push({
          sheet: 'Data Siswa',
          row: rowNum,
          field: 'NISN',
          value: '',
          message: `Baris ke-${rowNum}: NISN kosong, sistem membuat NISN sementara.`,
          severity: 'warning'
        });
      } else if (seenNisn.has(s.nisn)) {
        items.push({
          sheet: 'Data Siswa',
          row: rowNum,
          field: 'NISN',
          value: s.nisn,
          message: `Baris ke-${rowNum}: NISN ${s.nisn} terdeteksi ganda.`,
          severity: 'warning'
        });
      } else {
        seenNisn.add(s.nisn);
      }

      validatedStudents.push({
        ...s,
        id: s.id || `SIS-${String(idx + 1).padStart(3, '0')}`
      });
    });
  }

  // D. Validasi Data Ekstrakurikuler
  const validatedEskul: MasterEskul[] = [];

  if (parsed.eskulList && parsed.eskulList.length > 0) {
    parsed.eskulList.forEach((e, idx) => {
      const rowNum = idx + 2;
      if (!e.namaEskul || e.namaEskul.trim() === '') {
        items.push({
          sheet: 'Data Eskul',
          row: rowNum,
          field: 'Nama Ekstrakurikuler',
          value: '',
          message: `Baris ke-${rowNum}: Nama Ekstrakurikuler wajib diisi.`,
          severity: 'error'
        });
        return;
      }

      if (!e.namaPembina || e.namaPembina.trim() === '') {
        items.push({
          sheet: 'Data Eskul',
          row: rowNum,
          field: 'Nama Pembina',
          value: '',
          message: `Baris ke-${rowNum} (${e.namaEskul}): Pembina belum diisi.`,
          severity: 'warning'
        });
      }

      if (!e.namaPelatih || e.namaPelatih.trim() === '') {
        items.push({
          sheet: 'Data Eskul',
          row: rowNum,
          field: 'Nama Pelatih',
          value: '',
          message: `Baris ke-${rowNum} (${e.namaEskul}): Pelatih belum diisi (dibutuhkan untuk Kwitansi Honor Eskul).`,
          severity: 'warning'
        });
      }

      validatedEskul.push({
        ...e,
        id: e.id || `ESK-${String(idx + 1).padStart(2, '0')}`
      });
    });
  }

  // Count errors
  const totalErrors = items.filter((i) => i.severity === 'error').length;
  const totalWarnings = items.filter((i) => i.severity === 'warning').length;

  return {
    isValid: totalErrors === 0,
    totalErrors,
    totalWarnings,
    items,
    sanitizedData: {
      metadata: parsed.metadata ? mergedMeta : undefined,
      teachers: validatedTeachers.length > 0 ? validatedTeachers : undefined,
      students: validatedStudents.length > 0 ? validatedStudents : undefined,
      eskulList: validatedEskul.length > 0 ? validatedEskul : undefined
    },
    counts: {
      schoolFields: schoolFieldsCount,
      teachers: validatedTeachers.length,
      students: validatedStudents.length,
      eskul: validatedEskul.length
    }
  };
}
