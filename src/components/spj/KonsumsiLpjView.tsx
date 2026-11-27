import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TransaksiBKU, SchoolMetadata, MasterGuru, MonthlyArchive } from '../../types';
import { MONTH_NAMES_ID } from '../../utils/monthArchiveUtils';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { extractSpatialDataFromPDF } from '../../utils/pdfPrecisionParser';
import {
  saveKombelRecordToFirestore,
  fetchKombelFromFirestore,
  subscribeToKombelData,
  computeSyncHash,
  CloudSyncStatus
} from '../../lib/firebaseSync';
import { useSchool } from '../../context/SchoolContext';
import { readLS, writeLS } from '../../lib/schoolStorage';
import {
  Calendar,
  Printer,
  RotateCcw,
  Plus,
  Trash2,
  ChevronDown,
  Users,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Copy,
  Check,
  BookOpen,
  Layers,
  Lightbulb,
  ExternalLink,
  Wand2,
  Save,
  Cloud,
  CloudCheck,
  CloudOff,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface KonsumsiLpjViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  teachers?: MasterGuru[];
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  onSelectMonthIndex?: (monthIndex: number) => void;
}

interface AcaraItem {
  jam: string;
  agenda: string;
  narasumber: string;
}

interface PegawaiItem {
  nama: string;
  nip: string;
  pangkat: string;
  jabatan: string;
}

export interface KombelDocRecord {
  txId: string;
  status: 'draft' | 'synced';
  isFilled: boolean;
  kegiatan: string;
  tp: string;
  tahunProg: string;
  tanggal: string;
  waktu: string;
  tempat: string;
  alamatTempat: string;
  materi: string;
  nomor: string;
  kota: string;
  tglSurat: string;
  lampiran: string;
  hal: string;
  kepada: string;
  dasar: string;
  bawa: string;
  acaraList: AcaraItem[];
  pegawaiList: PegawaiItem[];
  kepsek: string;
  kepPangkat: string;
  kepNip: string;
  notulen: string;
  agendaRapat: string;
  pdfTxt: string;
  pdfInfo: string;
  nPembukaan: string;
  nIsi: string;
  nPenutup: string;
  skemaInput: 'skema2_ai' | 'skema1_manual';
  aiJudulInput: string;
  aiFokusInput?: string;
  aiSasaranInput?: string;
  aiNarasumberInput?: string;
  generatedMateriData?: {
    judulResmi: string;
    deskripsi: string;
    tujuan: string[];
    materiLengkap: string;
    ringkasanMateri: string;
  } | null;
  updatedAt?: string;
}

const BULAN_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatTglId(v: string): string {
  if (!v) return '';
  const p = v.split('-');
  if (p.length !== 3) return v;
  if (p[0].length === 4) {
    const blnIndex = parseInt(p[1], 10) - 1;
    const bln = BULAN_NAMES_ID[blnIndex] || p[1];
    return `${parseInt(p[2], 10)} ${bln} ${p[0]}`;
  } else {
    const blnIndex = parseInt(p[1], 10) - 1;
    const bln = BULAN_NAMES_ID[blnIndex] || p[1];
    return `${parseInt(p[0], 10)} ${bln} ${p[2]}`;
  }
}

export const KonsumsiLpjView: React.FC<KonsumsiLpjViewProps> = ({
  data = [],
  metadata,
  teachers = [],
  monthlyStore,
  activeMonthIndex = 2,
  onSelectMonthIndex
}) => {
  const activeMonthName = MONTH_NAMES_ID[activeMonthIndex - 1] || 'Februari';

  // Data for active month
  const effectiveData = useMemo(() => {
    if (monthlyStore && monthlyStore[activeMonthIndex]?.data) {
      return monthlyStore[activeMonthIndex]!.data;
    }
    return data;
  }, [monthlyStore, activeMonthIndex, data]);

  // Transaksi BKU/RKAS yang memiliki tag 'Komunitas Belajar' atau kata kunci Kombel
  const kombelTransactions = useMemo(() => {
    return (effectiveData || []).filter((tx) => {
      if (tx.tipe_transaksi !== 'Pengeluaran') return false;
      if (tx.klasifikasi === 'Komunitas Belajar') return true;

      const text = [
        tx.keterangan || '',
        tx.kode_kegiatan || '',
        tx.no_bku || '',
        ...(tx.rincian_barang || []).map((r) => `${r?.uraian_barang || ''} ${r?.kode_rekening || ''}`)
      ]
        .join(' ')
        .toLowerCase();

      return /kombel|komunitas belajar|pekan pembinaan|pembinaan guru|pembinaan rutin|kkg\b|mgmp\b|berbagi praktik baik/i.test(text);
    });
  }, [effectiveData]);

  const [selectedTxId, setSelectedTxId] = useState<string>('manual');

  // Reset selected tx when month changes
  useEffect(() => {
    setSelectedTxId('manual');
  }, [activeMonthIndex]);

  // Helper default dates for the active month
  const defaultYear = '2026';
  const defaultMonthStr = String(activeMonthIndex).padStart(2, '0');
  const defaultDateStr = `${defaultYear}-${defaultMonthStr}-14`;
  const defaultTglSuratStr = `${defaultYear}-${defaultMonthStr}-10`;

  // 1. Kegiatan Form State
  const [kegiatan, setKegiatan] = useState(
    'Pekan Pembinaan Rutin Pendidik dan Tenaga Kependidikan (Komunitas Belajar)'
  );
  const [tp, setTp] = useState('2025/2026');
  const [tahunProg, setTahunProg] = useState('2026');
  const [tanggal, setTanggal] = useState(defaultDateStr);
  const [waktu, setWaktu] = useState('12.30 – 14.45 WIB');
  const [tempat, setTempat] = useState(`Ruang Guru ${metadata.namaSekolah || 'SD Negeri Singgasana'}`);
  const [alamatTempat, setAlamatTempat] = useState(
    metadata.alamatLengkap || 'Kp. Cihoe Ombang Rt. 04/04 Desa. Kuripan Kecamatan Ciseeng Kabupaten Bogor 16120'
  );
  const [materi, setMateri] = useState(
    'Implementasi Kurikulum Merdeka & Penguatan Komunitas Belajar (Kombel)'
  );

  // 2. Surat Undangan Form State
  const [nomor, setNomor] = useState(`421.2/015-SD/${defaultMonthStr}/2026`);
  const [kota, setKota] = useState(metadata.desaKecamatan || 'Ciseeng');
  const [tglSurat, setTglSurat] = useState(defaultTglSuratStr);
  const [lampiran, setLampiran] = useState('1 (satu) lembar');
  const [hal, setHal] = useState('Undangan');
  const [kepada, setKepada] = useState(`Yth. Dewan Guru ${metadata.namaSekolah || 'SD Negeri Singgasana'}`);
  const [dasar, setDasar] = useState(
    'Program Tahunan {sekolah} tentang Pengembangan Kompetensi dan Profesionalitas Pendidik dan Kependidikan Tahun {tahunProg}\nKurikulum Operasional Satuan Pendidikan (KOSP) Tahun Pelajaran {tp}'
  );
  const [bawa, setBawa] = useState(
    'Laptop\nBuku Notula Rapat\nBuku Administrasi Kelas\nBuku Catatan Pribadi'
  );

  // Helper to build Pegawai List strictly from Master Data (no dummy data)
  const buildPegawaiFromMaster = (teachersList: MasterGuru[], schoolMeta: SchoolMetadata): PegawaiItem[] => {
    const list: PegawaiItem[] = [];
    if (schoolMeta.kepalaSekolah && schoolMeta.kepalaSekolah.trim()) {
      list.push({
        nama: schoolMeta.kepalaSekolah.trim(),
        nip: schoolMeta.nipKepalaSekolah && schoolMeta.nipKepalaSekolah.trim() ? schoolMeta.nipKepalaSekolah.trim() : '-',
        pangkat: 'Pembina / Kepala Sekolah',
        jabatan: 'Kepala Satuan Pendidikan'
      });
    }

    (teachersList || []).forEach((t) => {
      if (schoolMeta.kepalaSekolah && t.nama.trim().toLowerCase() === schoolMeta.kepalaSekolah.trim().toLowerCase()) {
        return;
      }
      list.push({
        nama: t.nama.trim(),
        nip: t.nip && t.nip !== '-' ? t.nip.trim() : '-',
        pangkat: t.statusKepegawaian || 'Pendidik',
        jabatan: t.jabatan || 'Guru Kelas'
      });
    });

    return list;
  };

  // List of teachers and principal for Susunan Acara dropdown options
  const teacherOptions = useMemo(() => {
    const opts: Array<{ nama: string; role: string }> = [];
    if (metadata.kepalaSekolah && metadata.kepalaSekolah.trim()) {
      opts.push({ nama: metadata.kepalaSekolah.trim(), role: 'Kepala Sekolah' });
    }
    (teachers || []).forEach((t) => {
      if (metadata.kepalaSekolah && t.nama.trim().toLowerCase() === metadata.kepalaSekolah.trim().toLowerCase()) {
        return;
      }
      opts.push({ nama: t.nama.trim(), role: t.jabatan || 'Guru' });
    });
    return opts;
  }, [teachers, metadata.kepalaSekolah]);

  // 3. Susunan Acara Form State (Initialized dynamically from Master Data)
  const [acaraList, setAcaraList] = useState<AcaraItem[]>(() => {
    const pemateriDefault = teachers.length > 0 ? teachers[0].nama : (metadata.kepalaSekolah || 'Narasumber / Fasilitator');
    const pembawaAcaraDefault = teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel');
    return [
      { jam: '12.30 – 13.00', agenda: 'Pembukaan & Doa', narasumber: pembawaAcaraDefault },
      { jam: '13.00 – 13.15', agenda: 'Sambutan Kepala Sekolah', narasumber: metadata.kepalaSekolah || 'Kepala Sekolah' },
      { jam: '13.15 – 14.30', agenda: 'Penyampaian Materi : {materi}', narasumber: pemateriDefault },
      { jam: '14.30 – 14.45', agenda: 'Penutup & Tindak Lanjut', narasumber: pembawaAcaraDefault }
    ];
  });

  // 4. Pegawai (Daftar Hadir) Form State strictly from Master Data (NO dummy data)
  const [pegawaiList, setPegawaiList] = useState<PegawaiItem[]>(() => {
    return buildPegawaiFromMaster(teachers, metadata);
  });

  // Auto-sync pegawaiList whenever Master Data teachers or principal changes
  useEffect(() => {
    const fresh = buildPegawaiFromMaster(teachers, metadata);
    if (fresh.length > 0) {
      setPegawaiList(fresh);
    }
  }, [teachers, metadata.kepalaSekolah, metadata.nipKepalaSekolah]);

  // 5. Pejabat & Notulen Form State (Strictly from Master Data / Metadata)
  const [kepsek, setKepsek] = useState(metadata.kepalaSekolah || '');
  const [kepPangkat, setKepPangkat] = useState(metadata.kepalaSekolah ? 'Pembina / Kepala Sekolah' : '');
  const [kepNip, setKepNip] = useState(metadata.nipKepalaSekolah || '');
  const [notulen, setNotulen] = useState(() => {
    return teachers.length > 0 ? teachers[0].nama : '';
  });

  // 6. Notula Form State
  const [agendaRapat, setAgendaRapat] = useState('Pekan Pembinaan & Koordinasi Komunitas Belajar (Kombel)');
  const [pdfTxt, setPdfTxt] = useState('');
  const [pdfInfo, setPdfInfo] = useState('Belum ada file.');
  const [nPembukaan, setNPembukaan] = useState(
    'Acara pembinaan rutin dibuka dengan pembacaan doa bersama dan pengantar mengenai pentingnya pengembangan keprofesian berkelanjutan.'
  );
  const [nIsi, setNIsi] = useState(
    'Kepala Sekolah dan Narasumber memaparkan evaluasi proses pembelajaran, pemanfaatan Platform Merdeka Mengajar (PMM), serta strategi penyusunan modul ajar berbasis asesmen diagnostik.'
  );
  const [nPenutup, setNPenutup] = useState(
    'Pertemuan ditutup dengan kesepakatan tindak lanjut penyusunan rencana aksi komunitas belajar pada pekan berikutnya.'
  );

  // Dua Skema Pengisian Output Dokumen Kombel (Permintaan User di Kotak 1):
  // 1. Skema 1: Upload Materi & Isi Notula Langsung (Eksisting)
  // 2. Skema 2: Belum ada judul, input judul dan AI membuatkan materi lengkap 5 bab + Notula yang selaras (Fitur Baru di Kotak Coretan)
  const [skemaInput, setSkemaInput] = useState<'skema2_ai' | 'skema1_manual'>('skema2_ai');
  const [aiJudulInput, setAiJudulInput] = useState('Implementasi Kurikulum Merdeka & Penguatan Komunitas Belajar (Kombel)');
  const [aiFokusInput, setAiFokusInput] = useState('Kurikulum Merdeka & Pembelajaran Berdiferensiasi');
  const [aiSasaranInput, setAiSasaranInput] = useState('Seluruh Dewan Guru dan Tenaga Kependidikan');
  const [aiNarasumberInput, setAiNarasumberInput] = useState(() => {
    return teachers.length > 0 ? teachers[0].nama : (metadata.kepalaSekolah || 'Narasumber / Fasilitator');
  });
  const [isGeneratingMateri, setIsGeneratingMateri] = useState(false);
  const [materiStatus, setMateriStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedMateri, setCopiedMateri] = useState(false);
  const [generatedMateriData, setGeneratedMateriData] = useState<{
    judulResmi: string;
    deskripsi: string;
    tujuan: string[];
    materiLengkap: string;
    ringkasanMateri: string;
  } | null>(null);

  // Active Document Tab: 'surat' | 'acara' | 'hadir' | 'notula' | 'materi' | 'all' | 'ana'
  const [currentDocTab, setCurrentDocTab] = useState<'surat' | 'acara' | 'hadir' | 'notula' | 'materi' | 'all' | 'ana'>('surat');

  // Kombel Store per Transaksi & Sinkronisasi Cloud Firestore
  const { schoolId, readOnly } = useSchool();
  const [kombelStore, setKombelStore] = useState<Record<string, KombelDocRecord>>(() => {
    const raw = readLS<Record<string, KombelDocRecord>>(schoolId, 'kombel_store_v2', {});
    return raw && typeof raw === 'object' ? raw : {};
  });
  const [isSavingFirebase, setIsSavingFirebase] = useState(false);
  const [kombelSaveFeedback, setKombelSaveFeedback] = useState<{
    type: 'draft' | 'synced' | 'info' | 'error';
    message: string;
  } | null>(null);

  const getStorageKey = (id: string) => (id === 'manual' ? `manual_m${activeMonthIndex}` : id);
  const currentKombelKey = getStorageKey(selectedTxId);
  const currentKombelKeyRef = useRef<string>(currentKombelKey);
  const kombelStoreRef = useRef<Record<string, KombelDocRecord>>(kombelStore);
  const applyRecordToFormRef = useRef<(rec: KombelDocRecord) => void>(() => {});

  useEffect(() => {
    currentKombelKeyRef.current = currentKombelKey;
  }, [currentKombelKey]);
  useEffect(() => {
    kombelStoreRef.current = kombelStore;
  }, [kombelStore]);

  const createBlankKombelState = (id: string, tx?: TransaksiBKU): KombelDocRecord => {
    const mm = String(activeMonthIndex).padStart(2, '0');
    let cleanTanggal = `2026-${mm}-14`;
    if (tx && tx.tanggal) {
      const parts = tx.tanggal.split('-');
      if (parts.length === 3) {
        cleanTanggal = parts[0].length === 4 ? tx.tanggal : `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    const cleanNomor =
      tx && tx.no_bku && tx.no_bku !== '-'
        ? `421.2/${tx.no_bku}-SD/${mm}/2026`
        : `421.2/015-SD/${mm}/2026`;

    return {
      txId: id,
      status: 'draft',
      isFilled: false,
      kegiatan: '',
      tp: '2025/2026',
      tahunProg: '2026',
      tanggal: cleanTanggal,
      waktu: '12.30 – 14.45 WIB',
      tempat: metadata.namaSekolah ? `Ruang Guru ${metadata.namaSekolah}` : 'Ruang Pertemuan / Guru',
      alamatTempat: metadata.alamatLengkap || 'Alamat Satuan Pendidikan',
      materi: '',
      nomor: cleanNomor,
      kota: metadata.desaKecamatan || 'Ciseeng',
      tglSurat: `2026-${mm}-10`,
      lampiran: '1 (satu) lembar',
      hal: 'Undangan',
      kepada: metadata.namaSekolah ? `Yth. Dewan Guru ${metadata.namaSekolah}` : 'Yth. Dewan Guru Satuan Pendidikan',
      dasar:
        'Program Tahunan {sekolah} tentang Pengembangan Kompetensi dan Profesionalitas Pendidik dan Kependidikan Tahun {tahunProg}\nKurikulum Operasional Satuan Pendidikan (KOSP) Tahun Pelajaran {tp}',
      bawa: 'Laptop\nBuku Notula Rapat\nBuku Administrasi Kelas\nBuku Catatan Pribadi',
      acaraList: [
        { jam: '12.30 – 13.00', agenda: 'Pembukaan & Doa', narasumber: teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel') },
        { jam: '13.00 – 13.15', agenda: 'Sambutan Kepala Sekolah', narasumber: metadata.kepalaSekolah || 'Kepala Sekolah' },
        { jam: '13.15 – 14.30', agenda: 'Penyampaian Materi : {materi}', narasumber: teachers.length > 0 ? teachers[0].nama : (metadata.kepalaSekolah || 'Narasumber / Fasilitator') },
        { jam: '14.30 – 14.45', agenda: 'Penutup & Tindak Lanjut', narasumber: teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel') }
      ],
      pegawaiList: buildPegawaiFromMaster(teachers, metadata),
      kepsek: metadata.kepalaSekolah || '',
      kepPangkat: metadata.kepalaSekolah ? 'Pembina / Kepala Sekolah' : '',
      kepNip: metadata.nipKepalaSekolah || '',
      notulen: teachers.length > 0 ? teachers[0].nama : '',
      agendaRapat: '',
      pdfTxt: '',
      pdfInfo: 'Belum ada file.',
      nPembukaan: '',
      nIsi: '',
      nPenutup: '',
      skemaInput: 'skema2_ai',
      aiJudulInput: '',
      aiFokusInput: '',
      aiSasaranInput: 'Seluruh Dewan Guru dan Tenaga Kependidikan',
      aiNarasumberInput: teachers.length > 0 ? teachers[0].nama : (metadata.kepalaSekolah || 'Narasumber / Fasilitator'),
      generatedMateriData: null,
      updatedAt: new Date().toISOString()
    };
  };

  const getCurrentFormData = (status: 'draft' | 'synced' = 'draft'): KombelDocRecord => {
    const key = getStorageKey(selectedTxId);
    const hasSubstance = Boolean(
      materi?.trim() ||
      aiJudulInput?.trim() ||
      nPembukaan?.trim() ||
      nIsi?.trim() ||
      nPenutup?.trim() ||
      pdfTxt?.trim() ||
      generatedMateriData
    );
    return {
      txId: key,
      status,
      isFilled: hasSubstance,
      kegiatan,
      tp,
      tahunProg,
      tanggal,
      waktu,
      tempat,
      alamatTempat,
      materi,
      nomor,
      kota,
      tglSurat,
      lampiran,
      hal,
      kepada,
      dasar,
      bawa,
      acaraList,
      pegawaiList,
      kepsek,
      kepPangkat,
      kepNip,
      notulen,
      agendaRapat,
      pdfTxt,
      pdfInfo,
      nPembukaan,
      nIsi,
      nPenutup,
      skemaInput,
      aiJudulInput,
      aiFokusInput,
      aiSasaranInput,
      aiNarasumberInput,
      generatedMateriData,
      updatedAt: new Date().toISOString()
    };
  };

  const applyRecordToForm = (rec: KombelDocRecord) => {
    setKegiatan(rec.kegiatan || '');
    setTp(rec.tp || '2025/2026');
    setTahunProg(rec.tahunProg || '2026');
    setTanggal(rec.tanggal || `${defaultYear}-${defaultMonthStr}-14`);
    setWaktu(rec.waktu || '12.30 – 14.45 WIB');
    setTempat(rec.tempat || (metadata.namaSekolah ? `Ruang Guru ${metadata.namaSekolah}` : 'Ruang Pertemuan / Guru'));
    setAlamatTempat(rec.alamatTempat || metadata.alamatLengkap || '');
    setMateri(rec.materi || '');
    setNomor(rec.nomor || `421.2/015-SD/${defaultMonthStr}/2026`);
    setKota(rec.kota || metadata.desaKecamatan || 'Ciseeng');
    setTglSurat(rec.tglSurat || `${defaultYear}-${defaultMonthStr}-10`);
    setLampiran(rec.lampiran || '1 (satu) lembar');
    setHal(rec.hal || 'Undangan');
    setKepada(rec.kepada || (metadata.namaSekolah ? `Yth. Dewan Guru ${metadata.namaSekolah}` : 'Yth. Dewan Guru Satuan Pendidikan'));
    setDasar(rec.dasar || 'Program Tahunan {sekolah} tentang Pengembangan Kompetensi dan Profesionalitas Pendidik dan Kependidikan Tahun {tahunProg}\nKurikulum Operasional Satuan Pendidikan (KOSP) Tahun Pelajaran {tp}');
    setBawa(rec.bawa || 'Laptop\nBuku Notula Rapat\nBuku Administrasi Kelas\nBuku Catatan Pribadi');
    if (rec.acaraList && rec.acaraList.length > 0) {
      setAcaraList(rec.acaraList);
    } else {
      setAcaraList([
        { jam: '12.30 – 13.00', agenda: 'Pembukaan & Doa', narasumber: teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel') },
        { jam: '13.00 – 13.15', agenda: 'Sambutan Kepala Sekolah', narasumber: metadata.kepalaSekolah || 'Kepala Sekolah' },
        { jam: '13.15 – 14.30', agenda: 'Penyampaian Materi : {materi}', narasumber: teachers.length > 0 ? teachers[0].nama : (metadata.kepalaSekolah || 'Narasumber / Fasilitator') },
        { jam: '14.30 – 14.45', agenda: 'Penutup & Tindak Lanjut', narasumber: teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel') }
      ]);
    }
    if (rec.pegawaiList && rec.pegawaiList.length > 0) {
      setPegawaiList(rec.pegawaiList);
    } else {
      setPegawaiList(buildPegawaiFromMaster(teachers, metadata));
    }
    setKepsek(rec.kepsek || metadata.kepalaSekolah || '');
    setKepPangkat(rec.kepPangkat || (metadata.kepalaSekolah ? 'Pembina / Kepala Sekolah' : ''));
    setKepNip(rec.kepNip || metadata.nipKepalaSekolah || '');
    setNotulen(rec.notulen || (teachers.length > 0 ? teachers[0].nama : ''));
    setAgendaRapat(rec.agendaRapat || '');
    setPdfTxt(rec.pdfTxt || '');
    setPdfInfo(rec.pdfInfo || 'Belum ada file.');
    setNPembukaan(rec.nPembukaan || '');
    setNIsi(rec.nIsi || '');
    setNPenutup(rec.nPenutup || '');
    setSkemaInput(rec.skemaInput || 'skema2_ai');
    setAiJudulInput(rec.aiJudulInput || '');
    setAiFokusInput(rec.aiFokusInput || '');
    setAiSasaranInput(rec.aiSasaranInput || 'Seluruh Dewan Guru dan Tenaga Kependidikan');
    setAiNarasumberInput(rec.aiNarasumberInput || (teachers.length > 0 ? teachers[0].nama : metadata.kepalaSekolah || ''));
    setGeneratedMateriData(rec.generatedMateriData || null);
    setMateriStatus(null);
  };

  useEffect(() => {
    applyRecordToFormRef.current = applyRecordToForm;
  });

  // Sync with Cloud Firestore on mount & realtime updates
  useEffect(() => {
    let isCancelled = false;

    const applyRemoteKombelRecords = (cloudData: Record<string, any>, isInitial: boolean) => {
      if (isCancelled || !cloudData || typeof cloudData !== 'object') return;
      const prevStore = kombelStoreRef.current;
      const activeKey = currentKombelKeyRef.current;
      const prevActiveRec = prevStore[activeKey];
      const merged = { ...prevStore };
      let anyChanged = false;

      Object.entries(cloudData).forEach(([k, val]) => {
        if (!val || typeof val !== 'object') return;
        const normalized = { ...val, status: 'synced', isFilled: true } as KombelDocRecord;
        if (computeSyncHash(prevStore[k] || null) !== computeSyncHash(normalized)) {
          merged[k] = normalized;
          anyChanged = true;
        }
      });

      if (anyChanged) {
        kombelStoreRef.current = merged;
        setKombelStore(merged);
        writeLS(schoolId, 'kombel_store_v2', merged);

        const nextActiveRec = merged[activeKey];
        if (
          nextActiveRec &&
          computeSyncHash(prevActiveRec || null) !== computeSyncHash(nextActiveRec)
        ) {
          applyRecordToFormRef.current(nextActiveRec);
          if (!isInitial) {
            setKombelSaveFeedback({
              type: 'synced',
              message: 'Data Kombel diperbarui realtime dari cloud.'
            });
            setTimeout(() => {
              setKombelSaveFeedback((prev) =>
                prev?.message === 'Data Kombel diperbarui realtime dari cloud.' ? null : prev
              );
            }, 3000);
          }
        }
      }
    };

    const fetchCloud = async () => {
      try {
        const cloudData = await fetchKombelFromFirestore(schoolId);
        if (cloudData && Object.keys(cloudData).length > 0 && !isCancelled) {
          applyRemoteKombelRecords(cloudData, true);
        }
      } catch (err) {
        console.warn('Error loading cloud kombel records:', err);
      }
    };
    fetchCloud();

    const unsubscribe = subscribeToKombelData(
      schoolId,
      (remoteRecords) => {
        applyRemoteKombelRecords(remoteRecords, false);
      }
    );

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [schoolId]);

  // When activeMonthIndex changes, load that month's manual Kombel or blank
  useEffect(() => {
    setSelectedTxId('manual');
    const manualKey = `manual_m${activeMonthIndex}`;
    const rec = kombelStore[manualKey];
    if (rec && rec.isFilled) {
      applyRecordToForm(rec);
    } else {
      const blank = createBlankKombelState(manualKey);
      applyRecordToForm(blank);
    }
  }, [activeMonthIndex]);

  const handleSelectKombelTx = (nextTxId: string) => {
    if (nextTxId === selectedTxId) return;

    // 1. Simpan perubahan form kombel sebelumnya jika ada isian yang dibuat user (kecuali readOnly)
    const prevKey = getStorageKey(selectedTxId);
    const prevFormData = getCurrentFormData(kombelStore[prevKey]?.status || 'draft');
    if (prevFormData.isFilled && !readOnly) {
      const updatedStore = {
        ...kombelStore,
        [prevKey]: prevFormData
      };
      setKombelStore(updatedStore);
      writeLS(schoolId, 'kombel_store_v2', updatedStore);
    }

    // 2. Berpindah ke Kombel yang baru
    setSelectedTxId(nextTxId);
    const nextKey = nextTxId === 'manual' ? `manual_m${activeMonthIndex}` : nextTxId;
    const existingRec = kombelStore[nextKey];

    if (existingRec && existingRec.isFilled) {
      // Kombel ini sudah diisi/disimpan -> Pulihkan datanya
      applyRecordToForm(existingRec);
      setKombelSaveFeedback({
        type: existingRec.status === 'synced' ? 'synced' : 'draft',
        message: existingRec.status === 'synced'
          ? 'Memuat data Kombel yang tersimpan di Firebase.'
          : 'Memuat data Kombel dari Draft lokal.'
      });
      setTimeout(() => setKombelSaveFeedback(null), 3000);
    } else {
      // Kombel ini belum diisi -> SEMUA FORM BERSIH / BLANK
      const nextTx = kombelTransactions.find((t, idx) => (t.id || `${t.no_bku}-${idx}`) === nextTxId);
      const blankState = createBlankKombelState(nextKey, nextTx);
      applyRecordToForm(blankState);
      setKombelSaveFeedback(null);
    }
  };

  const handleSaveDraft = () => {
    if (readOnly) return;
    const key = getStorageKey(selectedTxId);
    const currentRec = getCurrentFormData('draft');
    currentRec.isFilled = true;
    currentRec.status = 'draft';
    currentRec.updatedAt = new Date().toISOString();

    const updated = {
      ...kombelStore,
      [key]: currentRec
    };
    setKombelStore(updated);
    writeLS(schoolId, 'kombel_store_v2', updated);
    setKombelSaveFeedback({
      type: 'draft',
      message: 'Draft untuk Kombel ini berhasil disimpan di memori lokal perangkat.'
    });
    setTimeout(() => {
      setKombelSaveFeedback((prev) => (prev?.type === 'draft' ? null : prev));
    }, 4000);
  };

  const handleSaveToFirebase = async () => {
    if (readOnly) return;
    const key = getStorageKey(selectedTxId);
    const currentRec = getCurrentFormData('synced');
    currentRec.isFilled = true;
    currentRec.status = 'synced';
    currentRec.updatedAt = new Date().toISOString();

    const updated = {
      ...kombelStore,
      [key]: currentRec
    };
    setKombelStore(updated);
    writeLS(schoolId, 'kombel_store_v2', updated);

    setIsSavingFirebase(true);
    setKombelSaveFeedback({
      type: 'info',
      message: 'Menyimpan dan menyinkronkan data Kombel ke Firebase Cloud Firestore...'
    });

    try {
      const success = await saveKombelRecordToFirestore(schoolId, key, currentRec);
      if (success) {
        setKombelSaveFeedback({
          type: 'synced',
          message: '✨ Berhasil disimpan ke Firebase Firestore! Dokumen resmi Kombel ini telah tersimpan online.'
        });
      } else {
        setKombelSaveFeedback({
          type: 'draft',
          message: 'Tersimpan di Draft lokal (koneksi Firebase offline/ditunda).'
        });
      }
    } catch (err: any) {
      setKombelSaveFeedback({
        type: 'error',
        message: `Terjadi kendala saat menyimpan ke Firebase: ${err?.message || 'Gagal koneksi'}`
      });
    } finally {
      setIsSavingFirebase(false);
      setTimeout(() => {
        setKombelSaveFeedback((prev) => (prev?.type === 'synced' ? null : prev));
      }, 5000);
    }
  };

  const handleResetCurrentKombel = () => {
    if (readOnly) return;
    if (window.confirm('Kosongkan semua isian form untuk Kombel yang sedang aktif ini?')) {
      const key = getStorageKey(selectedTxId);
      const tx = kombelTransactions.find((t, idx) => (t.id || `${t.no_bku}-${idx}`) === selectedTxId);
      const blank = createBlankKombelState(key, tx);
      applyRecordToForm(blank);
      setKombelStore((prev) => {
        const next = { ...prev };
        delete next[key];
        writeLS(schoolId, 'kombel_store_v2', next);
        return next;
      });
      setKombelSaveFeedback({
        type: 'info',
        message: 'Form untuk Kombel ini telah dikosongkan (blank).'
      });
      setTimeout(() => setKombelSaveFeedback(null), 3000);
    }
  };

  const handleApplyBkuKeterangan = () => {
    const tx = kombelTransactions.find((t, idx) => (t.id || `${t.no_bku}-${idx}`) === selectedTxId);
    if (!tx) return;
    const uraian = tx.rincian_barang?.[0]?.uraian_barang || tx.keterangan || 'Komunitas Belajar';
    setMateri(uraian);
    setAiJudulInput(uraian);
    setAgendaRapat(tx.keterangan || uraian);
    setKegiatan(tx.keterangan || `Pekan Pembinaan: ${uraian}`);
  };

  const currentKey = getStorageKey(selectedTxId);
  const currentKombelRecord = kombelStore[currentKey];
  const currentKombelStatus: 'synced' | 'draft' | 'empty' =
    currentKombelRecord?.status === 'synced'
      ? 'synced'
      : currentKombelRecord?.isFilled
      ? 'draft'
      : (materi?.trim() || aiJudulInput?.trim() || nPembukaan?.trim() || nIsi?.trim())
      ? 'draft'
      : 'empty';

  // Reset to default sample
  const handleReset = () => {
    if (readOnly) return;
    if (window.confirm('Kembalikan semua isian dokumen ke contoh awal?')) {
      const mm = String(activeMonthIndex).padStart(2, '0');
      setKegiatan('Pekan Pembinaan Rutin Pendidik dan Tenaga Kependidikan (Komunitas Belajar)');
      setTp('2025/2026');
      setTahunProg('2026');
      setTanggal(`2026-${mm}-14`);
      setWaktu('12.30 – 14.45 WIB');
      setTempat(metadata.namaSekolah ? `Ruang Guru ${metadata.namaSekolah}` : 'Ruang Pertemuan / Guru');
      setAlamatTempat(metadata.alamatLengkap || 'Alamat Satuan Pendidikan');
      setMateri('Implementasi Kurikulum Merdeka & Penguatan Komunitas Belajar (Kombel)');
      setNomor(`421.2/015-SD/${mm}/2026`);
      setKota(metadata.desaKecamatan || 'Ciseeng');
      setTglSurat(`2026-${mm}-10`);
      setLampiran('1 (satu) lembar');
      setHal('Undangan');
      setKepada(metadata.namaSekolah ? `Yth. Dewan Guru ${metadata.namaSekolah}` : 'Yth. Dewan Guru Satuan Pendidikan');
      setDasar('Program Tahunan {sekolah} tentang Pengembangan Kompetensi dan Profesionalitas Pendidik dan Kependidikan Tahun {tahunProg}\nKurikulum Operasional Satuan Pendidikan (KOSP) Tahun Pelajaran {tp}');
      setBawa('Laptop\nBuku Notula Rapat\nBuku Administrasi Kelas\nBuku Catatan Pribadi');
      setAcaraList([
        { jam: '12.30 – 13.00', agenda: 'Pembukaan & Doa', narasumber: teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel') },
        { jam: '13.00 – 13.15', agenda: 'Sambutan Kepala Sekolah', narasumber: metadata.kepalaSekolah || 'Kepala Sekolah' },
        { jam: '13.15 – 14.30', agenda: 'Penyampaian Materi : {materi}', narasumber: teachers.length > 0 ? teachers[0].nama : (metadata.kepalaSekolah || 'Narasumber / Fasilitator') },
        { jam: '14.30 – 14.45', agenda: 'Penutup & Tindak Lanjut', narasumber: teachers.length > 1 ? teachers[1].nama : (teachers.length > 0 ? teachers[0].nama : 'Panitia Kombel') }
      ]);
      setPegawaiList(buildPegawaiFromMaster(teachers, metadata));
      setKepsek(metadata.kepalaSekolah || '');
      setKepPangkat(metadata.kepalaSekolah ? 'Pembina / Kepala Sekolah' : '');
      setKepNip(metadata.nipKepalaSekolah || '');
      setNotulen(teachers.length > 0 ? teachers[0].nama : '');
      setAgendaRapat('Pekan Pembinaan & Koordinasi Komunitas Belajar (Kombel)');
      setNPembukaan('Acara pembinaan rutin dibuka dengan pembacaan doa bersama dan pengantar mengenai pentingnya pengembangan keprofesian berkelanjutan.');
      setNIsi('Kepala Sekolah dan Narasumber memaparkan evaluasi proses pembelajaran, pemanfaatan Platform Merdeka Mengajar (PMM), serta strategi penyusunan modul ajar berbasis asesmen diagnostik.');
      setNPenutup('Pertemuan ditutup dengan kesepakatan tindak lanjut penyusunan rencana aksi komunitas belajar pada pekan berikutnya.');
      setPdfTxt('');
      setPdfInfo('Belum ada file.');
      setGeneratedMateriData(null);
      setMateriStatus(null);
      setAiJudulInput('Implementasi Kurikulum Merdeka & Penguatan Komunitas Belajar (Kombel)');
    }
  };

  // Printing functions
  const handlePrintActive = () => {
    if (currentDocTab === 'ana') {
      setCurrentDocTab('surat');
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAll = () => {
    const prev = currentDocTab;
    setCurrentDocTab('all');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setCurrentDocTab(prev);
      }, 500);
    }, 200);
  };

  // AI Notula Generator & File Reader States
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Helper: Read and extract material from PDF or text file
  const processMaterialFile = async (file: File) => {
    setIsReadingFile(true);
    setPdfInfo(`Membaca ${file.name}...`);
    setAiStatus({ type: 'info', message: `Sedang memindai dan mengekstrak materi dari ${file.name}...` });

    try {
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        let extractedSubstance = '';

        // Step 1: Coba ekstraksi digital teks biasa (cepat)
        try {
          const { fullFormattedText } = await extractSpatialDataFromPDF(file);
          const stripped = (fullFormattedText || '').replace(/---\s*HALAMAN\s+\d+\s*---/gi, '').trim();
          if (stripped.length >= 35) {
            extractedSubstance = stripped;
          }
        } catch (fastErr) {
          console.warn('Ekstraksi teks standar tidak menemukan teks digital:', fastErr);
        }

        // Step 2: Jika berkas adalah slide gambar / hasil pindaian (seperti 1. Menata Kata Membangun Makna.pdf)
        if (!extractedSubstance || extractedSubstance.length < 35) {
          setPdfInfo(`Membaca slide visual dari ${file.name} via AI Multimodal...`);
          setAiStatus({
            type: 'info',
            message: `Menganalisis slide dan gambar ${file.name} melalui AI Multimodal Vision...`
          });

          // Konversi aman File ke Base64 menggunakan FileReader
          const base64Data: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.includes(',') ? res.split(',')[1] : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const resp = await fetch('/api/gemini/extract-pdf-material', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64: base64Data,
              fileName: file.name
            })
          });

          const resJson = await resp.json();
          if (resp.ok && resJson.success && resJson.text) {
            extractedSubstance = resJson.text.trim();
          } else {
            console.warn('AI OCR PDF gagal:', resJson?.error);
          }
        }

        if (extractedSubstance && extractedSubstance.trim()) {
          const cleanSubstance = extractedSubstance.trim();
          setPdfTxt(cleanSubstance);
          setPdfInfo(`${file.name} · Teks berhasil diekstrak (${cleanSubstance.length} karakter).`);
          setAiStatus({
            type: 'success',
            message: `✨ Teks dari "${file.name}" berhasil diekstrak (${cleanSubstance.length} karakter)! Silakan periksa atau edit teks di bawah, lalu klik "Buat Notula Otomatis (Didukung AI)" untuk menganalisis teks.`
          });
        } else {
          // Tidak ada materi yang terbaca: KOSONGKAN
          setPdfTxt('');
          setNPembukaan('');
          setNIsi('');
          setNPenutup('');
          setPdfInfo(`${file.name} · Tidak ditemukan teks atau substansi materi yang terbaca.`);
          setAiStatus({
            type: 'error',
            message: `Tidak ada materi yang terbaca dari "${file.name}". Kolom Pembukaan, Isi Penyampaian Materi, dan Penutup dikosongkan.`
          });
        }
      } else {
        const text = await file.text();
        const trimmed = text.trim();
        if (trimmed) {
          setPdfTxt(trimmed);
          setPdfInfo(`${file.name} · ${trimmed.length} karakter berhasil diekstrak.`);
          setAiStatus({
            type: 'success',
            message: `✨ Teks dari "${file.name}" berhasil diekstrak (${trimmed.length} karakter)! Silakan periksa atau edit teks di bawah, lalu klik "Buat Notula Otomatis (Didukung AI)" untuk menganalisis.`
          });
        } else {
          setPdfTxt('');
          setNPembukaan('');
          setNIsi('');
          setNPenutup('');
          setPdfInfo(`${file.name} · Berkas kosong.`);
          setAiStatus({
            type: 'error',
            message: `Berkas "${file.name}" kosong. Kolom Pembukaan, Isi, dan Penutup dikosongkan.`
          });
        }
      }
    } catch (err: any) {
      console.warn('Gagal membaca berkas materi:', err);
      setPdfTxt('');
      setNPembukaan('');
      setNIsi('');
      setNPenutup('');
      setPdfInfo(`Gagal membaca ${file.name}.`);
      setAiStatus({
        type: 'error',
        message: `Gagal membaca berkas materi: ${err?.message || 'Terjadi kesalahan'}. Kolom dikosongkan.`
      });
    } finally {
      setIsReadingFile(false);
    }
  };

  // Handling Text File / PDF Reader
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processMaterialFile(file);
  };

  // Convenience helper to load sample uploaded file
  const handleLoadSamplePdf = async () => {
    try {
      setIsReadingFile(true);
      setPdfInfo('Mengunduh contoh file: 1. Menata Kata Membangun Makna.pdf...');
      const response = await fetch('/assets/aistudio/1._Menata_Kata_Membangun_Makna_eaa1074a.pdf');
      if (!response.ok) throw new Error('File contoh tidak ditemukan.');
      const blob = await response.blob();
      const file = new File([blob], '1. Menata Kata Membangun Makna.pdf', { type: 'application/pdf' });
      await processMaterialFile(file);
    } catch (err: any) {
      console.warn('Gagal memuat contoh berkas:', err);
      setAiStatus({
        type: 'error',
        message: 'Gagal memuat file contoh. Silakan unggah file PDF secara manual.'
      });
      setIsReadingFile(false);
    }
  };

  // Helper: Ensure text is strictly 1 single flowing paragraph without numbering
  const formatSingleParagraphNoNumbering = (text: string): string => {
    if (!text) return '';
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^([0-9]+[.)\-]|[a-zA-Z][.)\-]|[\u2022\u2023\u25E6\u2043\u2219\-\*•])\s*/g, '').trim())
      .filter(Boolean);

    const joined = lines.join(' ');
    return joined
      .replace(/(^|\s)[0-9]+[.)\-]\s*/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // Core Notula Generator from substantive text
  const generateNotulaFromSubstance = async (substanceText: string, sourceName?: string) => {
    const substantive = (substanceText || '').replace(/---\s*HALAMAN\s+\d+\s*---/gi, '').trim();

    // ATURAN USER: "nah jika tidak ada materi yang terbaca, kosongkan"
    if (!substantive && !materi.trim()) {
      setNPembukaan('');
      setNIsi('');
      setNPenutup('');
      setAiStatus({
        type: 'error',
        message: sourceName
          ? `Tidak ada materi yang terbaca dari "${sourceName}". Kolom Pembukaan, Isi Materi, dan Penutup dikosongkan.`
          : 'Tidak ada materi yang terbaca dari berkas. Kolom Pembukaan, Isi Materi, dan Penutup dikosongkan.'
      });
      return;
    }

    setIsGeneratingAi(true);
    setAiStatus({
      type: 'info',
      message: sourceName
        ? `Menyusun otomatis Pembukaan, Isi Materi (1 paragraf tanpa numbering), dan Penutup dari "${sourceName}" via AI...`
        : 'Sedang menganalisis materi dan menyusun notula resmi kedinasan via AI...'
    });

    try {
      const response = await fetch('/api/gemini/generate-notula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialText: substantive || materi.trim(),
          kegiatan,
          materi,
          agenda: agendaRapat,
          namaSekolah: metadata.namaSekolah
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.isEmpty) {
          // KOSONGKAN sesuai instruksi user jika materi kosong/tidak terbaca
          setNPembukaan('');
          setNIsi('');
          setNPenutup('');
          setAiStatus({
            type: 'error',
            message: data.message || 'Tidak ada materi yang terbaca. Kolom Pembukaan, Isi, dan Penutup dikosongkan.'
          });
        } else {
          // ATURAN USER: Isi penyampaian materi dibuat 1 paragraf saja, JANGAN ADA NUMBERING
          const cleanIsi = formatSingleParagraphNoNumbering(data.isiMateri || '');
          setNPembukaan(data.pembukaan || '');
          setNIsi(cleanIsi);
          setNPenutup(data.penutup || '');

          setAiStatus({
            type: 'success',
            message: sourceName
              ? `✨ Berkas "${sourceName}" terbaca! Pembukaan, Isi Penyampaian Materi (1 paragraf narasi tanpa numbering), dan Penutup terisi otomatis.`
              : '✨ Notula resmi berhasil disusun! Isi penyampaian materi dibuat 1 paragraf narasi tanpa numbering.'
          });
        }
      } else {
        setAiStatus({
          type: 'error',
          message: data.error || 'Terjadi kendala saat menyusun notula otomatis.'
        });
      }
    } catch (err: any) {
      console.error('AI notula request error:', err);
      setAiStatus({
        type: 'error',
        message: 'Gagal menghubungi server pembuat notula AI. Silakan coba kembali.'
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleUsePdfText = () => {
    if (!pdfTxt.trim()) return;
    const clean = formatSingleParagraphNoNumbering(pdfTxt.trim());
    setNIsi((prev) => (prev ? `${prev} ${clean}` : clean));
  };

  // AI-Powered Notula Generator Handler (Opsi 2 / Tombol Manual)
  const handleGenerateAiNotula = async () => {
    await generateNotulaFromSubstance(pdfTxt);
  };

  // Handler Skema 2: AI membuatkan materi lengkap 5 bab dari judul + Notula selaras
  const handleGenerateMateriFromTitle = async (customJudul?: string) => {
    const rawJudul = (customJudul || aiJudulInput).trim();
    if (!rawJudul) {
      setMateriStatus({
        type: 'error',
        message: 'Silakan masukkan judul atau topik pembinaan Komunitas Belajar terlebih dahulu.'
      });
      return;
    }

    if (customJudul) {
      setAiJudulInput(customJudul);
    }

    setIsGeneratingMateri(true);
    setMateriStatus({
      type: 'info',
      message: `Sedang menyusun materi pembinaan 5 bab & notula resmi kedinasan dari topik "${rawJudul}" via AI...`
    });

    try {
      const resp = await fetch('/api/gemini/generate-kombel-materi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: rawJudul,
          fokus: aiFokusInput,
          sasaran: aiSasaranInput,
          namaSekolah: metadata.namaSekolah,
          namaKepsek: kepsek,
          narasumber: aiNarasumberInput || notulen,
          tanggal: tanggal,
          waktu: waktu,
          tempat: tempat
        })
      });

      const resJson = await resp.json();
      if (resp.ok && resJson.success) {
        const cleanJudul = resJson.judulResmi || rawJudul;
        const cleanIsi = formatSingleParagraphNoNumbering(resJson.notula?.isiMateri || '');

        setGeneratedMateriData({
          judulResmi: cleanJudul,
          deskripsi: resJson.deskripsi || '',
          tujuan: Array.isArray(resJson.tujuan) && resJson.tujuan.length > 0 ? resJson.tujuan : [
            'Memperdalam pemahaman konseptual dan implementatif pendidik mengenai topik pembinaan.',
            'Merumuskan strategi pembelajaran yang adaptif bagi peserta didik di kelas.',
            'Membangun budaya kolaborasi antarguru melalui berbagi praktik baik (best practices).'
          ],
          materiLengkap: resJson.materiLengkap || '',
          ringkasanMateri: resJson.ringkasanMateri || ''
        });

        // Sinkronisasi otomatis ke seluruh form dokumen
        setMateri(cleanJudul);
        setKegiatan(cleanJudul.toLowerCase().startsWith('pekan') ? cleanJudul : `Pekan Pembinaan: ${cleanJudul}`);
        setAgendaRapat(cleanJudul);
        setNPembukaan(resJson.notula?.pembukaan || '');
        setNIsi(cleanIsi);
        setNPenutup(resJson.notula?.penutup || '');
        setPdfTxt(resJson.materiLengkap || '');

        // Update susunan acara pada sesi materi
        setAcaraList((prevList) =>
          prevList.map((ac) => {
            if (ac.agenda.toLowerCase().includes('materi')) {
              return {
                ...ac,
                agenda: `Penyampaian Materi : ${cleanJudul}`,
                narasumber: aiNarasumberInput || ac.narasumber
              };
            }
            return ac;
          })
        );

        // Buka tab Materi agar pengguna langsung melihat hasil modul yang digenerate
        setCurrentDocTab('materi');

        setMateriStatus({
          type: 'success',
          message: `✨ Materi pembinaan "${cleanJudul}" dan Notula resmi berhasil digenerate! Modul materi dapat langsung diunduh (.DOC) atau dicetak.`
        });
      } else {
        setMateriStatus({
          type: 'error',
          message: resJson.error || 'Terjadi kendala saat menyusun materi via AI.'
        });
      }
    } catch (err: any) {
      console.error('Error generating kombel materi:', err);
      setMateriStatus({
        type: 'error',
        message: 'Gagal terhubung dengan server generator AI. Silakan coba kembali.'
      });
    } finally {
      setIsGeneratingMateri(false);
    }
  };

  // Unduh Naskah Materi Pembinaan dalam Format Dokumen Microsoft Word (.DOC)
  const handleDownloadMateriWord = () => {
    const title = generatedMateriData?.judulResmi || materi || 'Materi Pembinaan Komunitas Belajar';
    const narasumberName = aiNarasumberInput || (teachers.length > 0 ? teachers[0].nama : metadata.kepalaSekolah || 'Narasumber / Fasilitator');
    const tujuanList = generatedMateriData?.tujuan || [
      'Memperdalam pemahaman konseptual dan implementatif pendidik mengenai materi.',
      'Merumuskan strategi pembelajaran yang adaptif bagi peserta didik di kelas.',
      'Membangun budaya kolaborasi antarguru melalui berbagi praktik baik (best practices).'
    ];
    const naskah = generatedMateriData?.materiLengkap || pdfTxt || '';

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2cm; mso-page-orientation: portrait; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.45; color: #000; }
          .kop-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px; }
          .kop-pemerintah { font-size: 11pt; text-transform: uppercase; font-weight: bold; margin: 0; }
          .kop-dinas { font-size: 12pt; text-transform: uppercase; font-weight: bold; margin: 0; }
          .kop-sekolah { font-size: 14pt; text-transform: uppercase; font-weight: bold; margin: 2px 0; }
          .kop-alamat { font-size: 9pt; font-style: italic; margin: 0; }
          .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 16px 0 4px 0; }
          .doc-subtitle { text-align: center; font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin: 0 0 16px 0; color: #111; }
          table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5pt; }
          table.meta-table td { padding: 3px 6px; vertical-align: top; }
          .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 16px 0 8px 0; }
          p { margin: 0 0 8px 0; text-align: justify; }
          ul, ol { margin: 0 0 10px 0; padding-left: 24px; }
          li { margin-bottom: 4px; text-align: justify; }
          .signature-table { width: 100%; margin-top: 40px; font-size: 11pt; }
          .signature-table td { text-align: center; vertical-align: top; width: 50%; }
        </style>
      </head>
      <body>
        <div class="kop-header">
          <p class="kop-pemerintah">${metadata.kabupatenKota ? 'PEMERINTAH ' + metadata.kabupatenKota.toUpperCase() : 'PEMERINTAH KABUPATEN BOGOR'}</p>
          <p class="kop-dinas">DINAS PENDIDIKAN</p>
          <p class="kop-sekolah">${metadata.namaSekolah || 'SD NEGERI SINGGASANA'}</p>
          <p class="kop-alamat">${metadata.alamatLengkap || ''} ${metadata.desaKecamatan ? 'Kec. ' + metadata.desaKecamatan : ''} NPSN: ${metadata.npsn || '-'}</p>
        </div>

        <div class="doc-title">MATERI PEMBINAAN PEKANAN &amp; KOMUNITAS BELAJAR (KOMBEL)</div>
        <div class="doc-subtitle">${title}</div>

        <table class="meta-table">
          <tr>
            <td style="width: 130px; font-weight: bold;">Satuan Pendidikan</td>
            <td style="width: 10px;">:</td>
            <td>${metadata.namaSekolah || 'Satuan Pendidikan'}</td>
            <td style="width: 90px; font-weight: bold;">Tahun Pelajaran</td>
            <td style="width: 10px;">:</td>
            <td>${tp}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Hari / Tanggal</td>
            <td>:</td>
            <td>${formatTglId(tanggal)}</td>
            <td style="font-weight: bold;">Waktu</td>
            <td>:</td>
            <td>${waktu}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Narasumber</td>
            <td>:</td>
            <td>${narasumberName}</td>
            <td style="font-weight: bold;">Tempat</td>
            <td>:</td>
            <td>${tempat}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Sasaran Peserta</td>
            <td>:</td>
            <td colspan="4">${aiSasaranInput || 'Seluruh Dewan Guru & Tenaga Kependidikan'}</td>
          </tr>
        </table>

        <div class="section-title">A. TUJUAN KEGIATAN &amp; INDIKATOR CAPAIAN</div>
        <ul>
          ${tujuanList.map((t) => `<li>${t}</li>`).join('')}
        </ul>

        <div class="section-title">B. URAIAN SUBSTANSI MATERI PEMBINAAN</div>
        <div>
          ${naskah
            .split('\n\n')
            .map((par) => {
              const trimmed = par.trim();
              if (trimmed.startsWith('#') || trimmed.startsWith('BAB')) {
                return `<h3 style="font-size: 11pt; font-weight: bold; margin: 12px 0 4px 0;">${trimmed.replace(/^[#\s]+/, '')}</h3>`;
              }
              return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
            })
            .join('')}
        </div>

        <table class="signature-table">
          <tr>
            <td>
              Mengetahui,<br/>
              <strong>Kepala Satuan Pendidikan</strong>
              <br/><br/><br/><br/>
              <u><strong>${kepsek}</strong></u><br/>
              NIP. ${kepNip}
            </td>
            <td>
              ${kota}, ${formatTglId(tanggal)}<br/>
              <strong>Pemateri / Fasilitator Kombel</strong>
              <br/><br/><br/><br/>
              <u><strong>${narasumberName}</strong></u><br/>
              Pendidik / Penggerak Komunitas
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanFileName = `Materi_Kombel_${title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35)}.doc`;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Unduh Notula Pertemuan Resmi dalam Format Microsoft Word (.DOC)
  const handleDownloadNotulaWord = () => {
    const agendaTitle = agendaRapat || materi || 'Notula Rapat Komunitas Belajar';
    const notulenObj = pegawaiList.find((r) => r.nama === notulen);
    const notNip = notulenObj && notulenObj.nip && notulenObj.nip !== '-' ? notulenObj.nip : '-';

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Notula - ${agendaTitle}</title>
        <style>
          @page { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2cm; mso-page-orientation: portrait; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.45; color: #000; }
          .kop-header { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 16px; }
          .doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 16px 0 16px 0; text-decoration: underline; }
          table.meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5pt; }
          table.meta-table td { padding: 3px 6px; vertical-align: top; }
          .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin: 16px 0 8px 0; }
          p { margin: 0 0 8px 0; text-align: justify; }
          .signature-table { width: 100%; margin-top: 40px; font-size: 11pt; }
          .signature-table td { text-align: center; vertical-align: top; width: 50%; }
        </style>
      </head>
      <body>
        <div class="kop-header">
          <p style="font-size: 11pt; text-transform: uppercase; font-weight: bold; margin: 0;">${metadata.kabupatenKota ? 'PEMERINTAH ' + metadata.kabupatenKota.toUpperCase() : 'PEMERINTAH KABUPATEN BOGOR'}</p>
          <p style="font-size: 12pt; text-transform: uppercase; font-weight: bold; margin: 0;">DINAS PENDIDIKAN</p>
          <p style="font-size: 14pt; text-transform: uppercase; font-weight: bold; margin: 2px 0;">${metadata.namaSekolah || 'SD NEGERI SINGGASANA'}</p>
          <p style="font-size: 9pt; font-style: italic; margin: 0;">${metadata.alamatLengkap || ''} ${metadata.desaKecamatan ? 'Kec. ' + metadata.desaKecamatan : ''} NPSN: ${metadata.npsn || '-'}</p>
        </div>

        <div class="doc-title">NOTULA PERTEMUAN</div>

        <p><strong>Agenda Rapat :</strong> ${agendaTitle}</p>

        <table class="meta-table">
          <tr><td style="width: 100px;">Hari / Tanggal</td><td style="width: 10px;">:</td><td>${formatTglId(tanggal)}</td></tr>
          <tr><td>Waktu</td><td>:</td><td>${waktu}</td></tr>
          <tr><td>Tempat</td><td>:</td><td>${tempat}</td></tr>
        </table>

        <div class="section-title">PESERTA KEGIATAN</div>
        <ol style="margin: 0 0 16px 20px;">
          ${pegawaiList.map((p) => `<li>${p.nama} (${p.nip && p.nip !== '-' ? 'NIP. ' + p.nip : p.jabatan || 'Pendidik'})</li>`).join('')}
        </ol>

        <div class="section-title">ALUR PERTEMUAN</div>
        <p><strong>1. Pembukaan :</strong></p>
        <p>${nPembukaan || '-'}</p>

        <p><strong>2. Isi Penyampaian Materi :</strong></p>
        <p>${nIsi || '-'}</p>

        <p><strong>3. Penutup :</strong></p>
        <p>${nPenutup || '-'}</p>

        <table class="signature-table">
          <tr>
            <td>
              Mengetahui,<br/>
              <strong>Kepala Sekolah</strong>
              <br/><br/><br/><br/>
              <u><strong>${kepsek}</strong></u><br/>
              NIP. ${kepNip}
            </td>
            <td>
              ${kota}, ${formatTglId(tanggal)}<br/>
              <strong>Notulen</strong>
              <br/><br/><br/><br/>
              <u><strong>${notulen}</strong></u><br/>
              NIP. ${notNip}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Notula_Kombel_${agendaTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Salin Teks Materi ke Clipboard
  const handleCopyMateri = async () => {
    const textToCopy = generatedMateriData?.materiLengkap || pdfTxt || '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedMateri(true);
      setTimeout(() => setCopiedMateri(false), 2000);
    } catch {
      // fallback
    }
  };

  // Helper string replacements: {kegiatan}, {materi}, {tp}, {tahunProg}, {sekolah}, {tempat}, {kota}
  const fillTemplate = (text: string): string => {
    return (text || '')
      .replace(/{kegiatan}/g, kegiatan || '')
      .replace(/{materi}/g, materi || '')
      .replace(/{tp}/g, tp || '')
      .replace(/{tahunProg}/g, tahunProg || '')
      .replace(/{sekolah}/g, metadata.namaSekolah || 'SD Negeri Singgasana')
      .replace(/{tempat}/g, tempat || '')
      .replace(/{kota}/g, kota || '');
  };

  const dasarLines = useMemo(() => {
    return fillTemplate(dasar)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }, [dasar, materi, tp, tahunProg, kegiatan, tempat, kota, metadata.namaSekolah]);

  const bawaLines = useMemo(() => {
    return bawa
      .split('\n')
      .map((l) => fillTemplate(l.trim()))
      .filter(Boolean);
  }, [bawa, materi, tp, tahunProg, kegiatan, tempat, kota, metadata.namaSekolah]);

  // Lookup NIP of selected notulen
  const notulenNip = useMemo(() => {
    const p = pegawaiList.find((r) => r.nama === notulen);
    return p && p.nip && p.nip !== '-' ? p.nip : '';
  }, [pegawaiList, notulen]);

  // Acara Handlers
  const handleAddAcara = () => {
    setAcaraList([...acaraList, { jam: '14.00 – 14.30', agenda: '', narasumber: '' }]);
  };

  const handleRemoveAcara = (index: number) => {
    setAcaraList(acaraList.filter((_, i) => i !== index));
  };

  const handleAcaraChange = (index: number, field: keyof AcaraItem, value: string) => {
    const updated = [...acaraList];
    updated[index][field] = value;
    setAcaraList(updated);
  };

  // Pegawai Handlers
  const handleAddPegawai = () => {
    setPegawaiList([...pegawaiList, { nama: '', nip: '-', pangkat: 'Honorer', jabatan: 'Guru Kelas' }]);
  };

  const handleRemovePegawai = (index: number) => {
    setPegawaiList(pegawaiList.filter((_, i) => i !== index));
  };

  const handlePegawaiChange = (index: number, field: keyof PegawaiItem, value: string) => {
    const updated = [...pegawaiList];
    updated[index][field] = value;
    setPegawaiList(updated);
  };

  // Render Kop Surat Resmi
  const renderKop = () => {
    return <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-4" />;
  };

  // 1. Lembar Surat Undangan
  const renderDocSurat = () => {
    return (
      <div className="paper-doc text-black font-sans text-[10.5pt] leading-normal">
        {renderKop()}
        <div className="text-right pr-6 mb-3">
          {kota}, {formatTglId(tglSurat) || <span className="bg-amber-100 text-red-700 px-1">……</span>}
        </div>

        <table className="mb-4 text-[10.5pt]">
          <tbody>
            <tr>
              <td className="w-24 align-top py-0.5">Nomor</td>
              <td className="align-top py-0.5">: {nomor || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">Lampiran</td>
              <td className="align-top py-0.5">: {lampiran}</td>
            </tr>
            <tr>
              <td className="align-top py-0.5">Hal</td>
              <td className="align-top py-0.5 font-bold">: {hal}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-4">
          <p>Kepada</p>
          <p className="font-bold">{kepada}</p>
          <p>di -</p>
          <p className="pl-6">Tempat</p>
        </div>

        <div className="mb-3">
          <p className="font-bold mb-1">Dasar :</p>
          <ol className="list-decimal pl-6 space-y-1">
            {dasarLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ol>
        </div>

        <p className="text-justify indent-8 mb-3 leading-relaxed">
          Maka akan dilaksanakan {kegiatan} Tahun Pelajaran {tp}. Sehubungan dengan itu kami meminta Bapak/Ibu untuk hadir pada kegiatan tersebut pada:
        </p>

        <table className="ml-8 mb-4 text-[10.5pt]">
          <tbody>
            <tr>
              <td className="w-24 py-0.5 font-medium">Tanggal</td>
              <td className="py-0.5">: {formatTglId(tanggal) || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="py-0.5 font-medium">Waktu</td>
              <td className="py-0.5">: {waktu || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top font-medium">Tempat</td>
              <td className="py-0.5">: {tempat}<br /><span className="text-[9.5pt] text-slate-700">{alamatTempat}</span></td>
            </tr>
          </tbody>
        </table>

        <div className="ml-8 mb-4">
          <p className="font-medium mb-1">Adapun kelengkapan yang harus dibawa adalah:</p>
          <ol className="list-decimal pl-6 space-y-0.5">
            {bawaLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ol>
        </div>

        <p className="ml-8 mb-8">
          Demikian disampaikan untuk dilaksanakan dengan penuh tanggung jawab.
        </p>

        {/* Tanda Tangan */}
        <div className="ml-auto w-64 text-center mt-6">
          <p>Kepala Sekolah,</p>
          <div className="h-16"></div>
          <p className="font-bold underline">{kepsek}</p>
          {kepPangkat && <p className="text-[9.5pt]">{kepPangkat}</p>}
          <p className="text-[9.5pt] font-mono">NIP. {kepNip}</p>
        </div>
      </div>
    );
  };

  // 2. Lembar Susunan Acara
  const renderDocAcara = () => {
    return (
      <div className="paper-doc text-black font-sans text-[10.5pt] leading-normal">
        {renderKop()}
        <table className="mb-4 text-[10pt]">
          <tbody>
            <tr>
              <td className="w-24 py-0.5">Lampiran</td>
              <td className="py-0.5">: Surat Undangan {kegiatan} Tahun Pelajaran {tp}</td>
            </tr>
            <tr>
              <td className="py-0.5">Nomor</td>
              <td className="py-0.5">: {nomor || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="py-0.5">Tanggal</td>
              <td className="py-0.5">: {formatTglId(tglSurat) || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-center my-5">
          <h3 className="font-bold text-[12pt] uppercase tracking-wide">
            Susunan Acara<br />
            {kegiatan}<br />
            Tahun Pelajaran {tp}
          </h3>
        </div>

        <table className="w-full border-collapse border border-black text-[10pt] mb-6">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-2 text-center w-[25%] font-bold">Jam</th>
              <th className="border border-black p-2 text-left font-bold">Agenda</th>
              <th className="border border-black p-2 text-center w-[35%] font-bold">Pembicara / Narasumber</th>
            </tr>
          </thead>
          <tbody>
            {acaraList.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 text-center font-mono text-[9.5pt]">{item.jam}</td>
                <td className="border border-black p-2">{fillTemplate(item.agenda)}</td>
                <td className="border border-black p-2 text-center font-medium">{item.narasumber}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="ml-auto w-64 text-center mt-8">
          <p>Kepala Sekolah,</p>
          <div className="h-16"></div>
          <p className="font-bold underline">{kepsek}</p>
          {kepPangkat && <p className="text-[9.5pt]">{kepPangkat}</p>}
          <p className="text-[9.5pt] font-mono">NIP. {kepNip}</p>
        </div>
      </div>
    );
  };

  // 3. Lembar Daftar Hadir
  const renderDocHadir = () => {
    return (
      <div className="paper-doc text-black font-sans text-[10pt] leading-normal">
        {renderKop()}
        <div className="text-center mb-4">
          <h3 className="font-bold text-[12pt] uppercase tracking-wide">DAFTAR HADIR</h3>
          <p className="font-bold text-[10.5pt] uppercase">
            KEGIATAN {kegiatan.toUpperCase()}<br />
            TAHUN PELAJARAN {tp}
          </p>
        </div>

        <table className="mb-4 text-[9.5pt]">
          <tbody>
            <tr>
              <td className="w-36 py-0.5 font-medium">Tanggal</td>
              <td className="py-0.5">: {formatTglId(tanggal) || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="py-0.5 font-medium">Tempat</td>
              <td className="py-0.5">: {tempat}</td>
            </tr>
            <tr>
              <td className="py-0.5 font-medium">Agenda Pembahasan</td>
              <td className="py-0.5">: {materi || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border border-black text-[9pt] mb-4">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-1 text-center w-7 font-bold">No</th>
              <th className="border border-black p-1 text-left font-bold">Nama Pegawai</th>
              <th className="border border-black p-1 text-center font-bold">NIP</th>
              <th className="border border-black p-1 text-left font-bold">Pangkat, Gol</th>
              <th className="border border-black p-1 text-left font-bold">Jabatan</th>
              <th className="border border-black p-1 text-center w-28 font-bold">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {pegawaiList.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-black p-4 text-center italic text-slate-500">
                  Data pegawai belum tersedia di Data Master Guru. Silakan lengkapi di menu Data Master Terpadu atau tambahkan melalui form input di sebelah kiri.
                </td>
              </tr>
            ) : (
              pegawaiList.map((p, idx) => (
                <tr key={idx} className="h-7">
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold">{p.nama}</td>
                  <td className="border border-black p-1 text-center font-mono text-[8.5pt]">{p.nip}</td>
                  <td className="border border-black p-1 text-[8.5pt]">{p.pangkat}</td>
                  <td className="border border-black p-1 text-[8.5pt]">{p.jabatan}</td>
                  <td className="border border-black p-1 text-left text-[8pt] text-slate-400 pl-2">
                    {idx + 1}. ....................
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="ml-auto w-64 text-center mt-4">
          <p>Kepala Sekolah,</p>
          <div className="h-12"></div>
          <p className="font-bold underline">{kepsek}</p>
          <p className="text-[9pt] font-mono">NIP. {kepNip}</p>
        </div>
      </div>
    );
  };

  // 4. Lembar Notula Pertemuan
  const renderDocNotula = () => {
    return (
      <div className="paper-doc text-black font-sans text-[10pt] leading-normal">
        {renderKop()}
        <div className="text-center mb-3">
          <h3 className="font-bold text-[12pt] uppercase tracking-wide underline">NOTULA PERTEMUAN</h3>
        </div>

        <p className="mb-2">
          <strong>Agenda Rapat :</strong> {agendaRapat || materi || <span className="bg-amber-100 text-red-700 px-1">……</span>}
        </p>

        <table className="mb-3 text-[9.5pt]">
          <tbody>
            <tr>
              <td className="w-24 py-0.5">Tanggal</td>
              <td className="py-0.5">: {formatTglId(tanggal) || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="py-0.5">Waktu</td>
              <td className="py-0.5">: {waktu || <span className="bg-amber-100 text-red-700 px-1">……</span>}</td>
            </tr>
            <tr>
              <td className="py-0.5">Tempat</td>
              <td className="py-0.5">: {tempat}</td>
            </tr>
          </tbody>
        </table>

        {/* Peserta Kegiatan (2 Columns) */}
        <div className="mb-3">
          <p className="font-bold mb-1 text-[9.5pt]">Peserta Kegiatan :</p>
          {pegawaiList.length === 0 ? (
            <p className="italic text-[9pt] text-slate-500 pl-4">
              Belum ada data peserta (silakan isi di Data Master Guru).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 text-[8.5pt]">
              <ol className="list-decimal pl-5 space-y-0.5">
                {pegawaiList.slice(0, Math.ceil(pegawaiList.length / 2)).map((p, i) => (
                  <li key={i}>{p.nama}</li>
                ))}
              </ol>
              <ol className="list-decimal pl-5 space-y-0.5" start={Math.ceil(pegawaiList.length / 2) + 1}>
                {pegawaiList.slice(Math.ceil(pegawaiList.length / 2)).map((p, i) => (
                  <li key={i}>{p.nama}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Alur Pertemuan */}
        <div className="space-y-3 mb-6">
          <p className="font-bold text-[10pt] uppercase tracking-wide border-b border-black pb-0.5">
            ALUR PERTEMUAN
          </p>

          <div className="pl-4">
            <p className="font-bold text-[9.5pt]">Pembukaan :</p>
            <p className="text-justify text-[9.5pt] leading-relaxed mt-0.5 whitespace-pre-wrap">
              {nPembukaan || <span className="bg-amber-100 text-red-700 px-1">isi pembukaan</span>}
            </p>
          </div>

          <div className="pl-4">
            <p className="font-bold text-[9.5pt]">Isi Penyampaian Materi :</p>
            <p className="text-justify text-[9.5pt] leading-relaxed mt-0.5 whitespace-pre-wrap">
              {nIsi || <span className="bg-amber-100 text-red-700 px-1">isi materi</span>}
            </p>
          </div>

          <div className="pl-4">
            <p className="font-bold text-[9.5pt]">Penutup :</p>
            <p className="text-justify text-[9.5pt] leading-relaxed mt-0.5 whitespace-pre-wrap">
              {nPenutup || <span className="bg-amber-100 text-red-700 px-1">penutup</span>}
            </p>
          </div>
        </div>

        {/* Tanda Tangan 2 Kolom */}
        <div className="grid grid-cols-2 gap-4 text-center mt-6 text-[9.5pt]">
          <div>
            <p>Mengetahui</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{kepsek}</p>
            <p className="text-[9pt] font-mono">NIP. {kepNip}</p>
          </div>

          <div>
            <p>{kota}, {formatTglId(tanggal)}</p>
            <p className="font-bold">Notulen</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{notulen}</p>
            <p className="text-[9pt] font-mono">{notulenNip ? `NIP. ${notulenNip}` : 'NIP. -'}</p>
          </div>
        </div>
      </div>
    );
  };

  // 4b. Lembar Dokumen Naskah Materi Pembinaan & Modul Kombel (Lengkap untuk Cetak / Unduh)
  const renderDocMateri = () => {
    const displayJudul = generatedMateriData?.judulResmi || materi || 'Materi Pembinaan Komunitas Belajar (Kombel)';
    const displayTujuan = generatedMateriData?.tujuan && generatedMateriData.tujuan.length > 0 ? generatedMateriData.tujuan : [
      'Memperdalam pemahaman konseptual dan implementatif pendidik mengenai topik pembinaan.',
      'Mengidentifikasi kendala faktual di kelas dan merumuskan strategi pembelajaran adaptif.',
      'Membangun budaya kolaborasi antarguru melalui berbagi praktik baik (best practices).'
    ];
    const displayNaskah = generatedMateriData?.materiLengkap || pdfTxt || '';
    const narasumberName = aiNarasumberInput || (teachers.length > 0 ? teachers[0].nama : metadata.kepalaSekolah || 'Narasumber / Fasilitator');

    return (
      <div className="paper-doc text-black font-sans text-[10pt] leading-normal relative">
        {/* Quick Toolbar khusus di Tab Materi - No Print */}
        <div className="no-print mb-4 p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-950">
              Dokumen Naskah Materi Pembinaan Kombel (Standar Kedinasan)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadMateriWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Unduh berkas modul materi lengkap dalam format Microsoft Word (.DOC)"
            >
              <Download className="w-3.5 h-3.5" />
              Download Word (.DOC)
            </button>
            <button
              type="button"
              onClick={handleCopyMateri}
              disabled={!displayNaskah}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {copiedMateri ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedMateri ? 'Tersalin!' : 'Salin Teks'}
            </button>
          </div>
        </div>

        {renderKop()}

        <div className="text-center mb-4">
          <h2 className="font-bold text-[12pt] uppercase tracking-wide">
            MATERI PEMBINAAN PEKANAN &amp; KOMUNITAS BELAJAR (KOMBEL)
          </h2>
          <h3 className="font-bold text-[11pt] text-emerald-950 uppercase mt-0.5 tracking-tight">
            {displayJudul}
          </h3>
          <p className="text-[9pt] text-slate-600 mt-1">
            Tahun Pelajaran {tp} · Satuan Pendidikan: {metadata.namaSekolah || 'Satuan Pendidikan'}
          </p>
        </div>

        {/* Tabel Metadata Pertemuan */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-4 text-[9pt]">
          <table className="w-full text-[9pt]">
            <tbody>
              <tr>
                <td className="w-28 py-0.5 font-semibold text-slate-700">Hari / Tanggal</td>
                <td className="py-0.5">: {formatTglId(tanggal) || '-'}</td>
                <td className="w-28 py-0.5 font-semibold text-slate-700">Waktu</td>
                <td className="py-0.5">: {waktu}</td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold text-slate-700">Tempat</td>
                <td className="py-0.5">: {tempat}</td>
                <td className="py-0.5 font-semibold text-slate-700">Narasumber</td>
                <td className="py-0.5 font-bold">: {narasumberName}</td>
              </tr>
              <tr>
                <td className="py-0.5 font-semibold text-slate-700">Sasaran</td>
                <td className="py-0.5" colSpan={3}>: {aiSasaranInput || 'Seluruh Dewan Guru & Tenaga Kependidikan'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* A. Tujuan Kegiatan */}
        <div className="mb-4">
          <p className="font-bold text-[9.5pt] uppercase text-slate-900 border-b border-black pb-0.5 mb-1.5">
            A. TUJUAN KEGIATAN &amp; INDIKATOR CAPAIAN
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[9pt] text-justify leading-relaxed">
            {displayTujuan.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>

        {/* B. Naskah Substansi Materi */}
        <div className="mb-6 space-y-3">
          <p className="font-bold text-[9.5pt] uppercase text-slate-900 border-b border-black pb-0.5">
            B. URAIAN SUBSTANSI MATERI PEMBINAAN
          </p>

          {displayNaskah ? (
            <div className="text-[9pt] leading-relaxed text-justify space-y-2 whitespace-pre-wrap font-sans">
              {displayNaskah}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-amber-300 bg-amber-50 rounded-xl text-center text-xs text-amber-800">
              Belum ada naskah materi. Masukkan judul pada form <strong>Skema 2</strong> lalu klik tombol <strong>Generate Materi &amp; Notula (AI)</strong>.
            </div>
          )}
        </div>

        {/* Tanda Tangan Dokumen Materi */}
        <div className="grid grid-cols-2 gap-4 text-center mt-8 text-[9.5pt] pt-4 border-t border-slate-300">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Satuan Pendidikan</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{kepsek}</p>
            <p className="text-[9pt] font-mono">NIP. {kepNip}</p>
          </div>

          <div>
            <p>{kota}, {formatTglId(tanggal)}</p>
            <p className="font-bold">Pemateri / Fasilitator Kombel</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{narasumberName}</p>
            <p className="text-[9pt] font-mono">Pendidik / Penggerak Komunitas</p>
          </div>
        </div>
      </div>
    );
  };

  // 5. Lembar Analisis Form
  const renderDocAnalisis = () => {
    return (
      <div className="bg-white border border-slate-300 rounded-2xl p-6 text-slate-800 text-xs leading-relaxed space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b pb-2">
          Hasil Analisis Dokumen Pekan Pembinaan &amp; Komunitas Belajar (Kombel)
        </h2>
        <p>
          Empat dokumen (undangan, susunan acara, daftar hadir, notula) memakai kop dan data yang sama. Karena itu cukup satu kali input, lalu semua dokumen terisi otomatis.
        </p>

        <h3 className="font-bold text-sm text-slate-900 mt-3">Kolom Form yang Dibutuhkan &amp; Terintegrasi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-emerald-50">
                <th className="border border-slate-300 p-2 font-bold">Kelompok</th>
                <th className="border border-slate-300 p-2 font-bold">Field</th>
                <th className="border border-slate-300 p-2 font-bold">Dipakai Di</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Kegiatan</td>
                <td className="border border-slate-300 p-2">Nama kegiatan, tahun pelajaran, tahun program, tanggal, waktu, tempat, alamat tempat, agenda/materi</td>
                <td className="border border-slate-300 p-2">Semua dokumen</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Surat</td>
                <td className="border border-slate-300 p-2">Nomor, kota, tanggal surat, lampiran, hal, tujuan, daftar dasar, daftar kelengkapan</td>
                <td className="border border-slate-300 p-2">Undangan; nomor dan tanggal juga di susunan acara</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Susunan Acara</td>
                <td className="border border-slate-300 p-2">Baris berulang: jam, agenda, narasumber</td>
                <td className="border border-slate-300 p-2">Susunan acara</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Pegawai</td>
                <td className="border border-slate-300 p-2">Nama, NIP, pangkat/golongan, jabatan (tabel master)</td>
                <td className="border border-slate-300 p-2">Daftar hadir, peserta notula, NIP notulen</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Pejabat</td>
                <td className="border border-slate-300 p-2">Kepala sekolah (nama, pangkat, NIP), notulen (dipilih dari pegawai)</td>
                <td className="border border-slate-300 p-2">Tanda tangan di keempat dokumen</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Notula</td>
                <td className="border border-slate-300 p-2">Agenda rapat, pembukaan, isi materi, penutup</td>
                <td className="border border-slate-300 p-2">Notula</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 font-bold">Kop</td>
                <td className="border border-slate-300 p-2">Pemerintah, dinas, sekolah, alamat, NPSN, NSS, email, logo</td>
                <td className="border border-slate-300 p-2">Semua dokumen (otomatis dari Data Master)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-bold text-sm text-slate-900 mt-4">Karakteristik &amp; Fitur Otomasi</h3>
        <p>
          <strong>Tetap (sekali isi)</strong>: kop surat, kepala sekolah, daftar pegawai dari master data. <strong>Per kegiatan</strong>: tanggal, waktu, materi, nomor surat, narasumber, isi notula. <strong>Otomatis</strong>: peserta notula dan nomor urut daftar hadir dari data pegawai, NIP notulen dicocokkan otomatis dari data pegawai, tanggal dan materi disalin ke seluruh dokumen, kalimat dasar memakai tahun pelajaran yang sama.
        </p>

        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-[11px] space-y-1">
          <p className="font-bold">Kiat Penggunaan Cetak:</p>
          <p>
            Gunakan tombol <strong>Cetak Semua Dokumen</strong> di bilah atas untuk mencetak keempat lembar (Surat Undangan, Susunan Acara, Daftar Hadir, dan Notula) secara berurutan dalam format A4 resmi dengan pembatas halaman otomatis.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar (Identik dengan Skema HTML Generator) - No Print */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-base sm:text-lg font-serif font-bold text-slate-900 leading-tight">
            Generator Dokumen Pekan Pembinaan &amp; Komunitas Belajar (Kombel)
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Otomasi dokumen kedinasan: Surat Undangan, Susunan Acara, Daftar Hadir, dan Notula Pertemuan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={readOnly}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Contoh
          </button>
          <button
            onClick={handlePrintActive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Tab Ini
          </button>
          <button
            onClick={handlePrintAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Semua Dokumen
          </button>
        </div>
      </div>

      {/* 2. Selected Months Bar (Satu-satunya elemen yang dipertahankan sesuai permintaan user) - No Print */}
      {monthlyStore && onSelectMonthIndex && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs no-print">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Selected Months (Pilih Bulan BKU / SPJ):</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Bulan Terpilih: <strong className="text-emerald-700 font-bold">{activeMonthName} 2026</strong>
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {MONTH_NAMES_ID.map((mName, idx) => {
              const mNum = idx + 1;
              const isSelected = activeMonthIndex === mNum;
              const hasData = Boolean(monthlyStore[mNum]?.data && monthlyStore[mNum]!.data.length > 0);

              return (
                <button
                  key={mName}
                  onClick={() => onSelectMonthIndex(mNum)}
                  className={`px-2 py-2 rounded-xl text-center text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/40'
                      : hasData
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/60'
                  }`}
                >
                  <div className="text-[11px] truncate">{mName.slice(0, 3)}</div>
                  <div
                    className={`text-[9px] font-mono mt-0.5 ${
                      isSelected
                        ? 'text-emerald-100'
                        : hasData
                        ? 'text-emerald-600 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {hasData ? `${monthlyStore[mNum]!.data.length} bku` : 'Kosong'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2b. Dropdown Pemilih Transaksi Komunitas Belajar (Kombel) dari BKU/RKAS - No Print */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-sm no-print bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Pilih Transaksi Komunitas Belajar (Kombel)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  {activeMonthName} 2026 ({kombelTransactions.length} transaksi)
                </span>
                {/* Status Mode Badge: Tersimpan di Firebase vs Draft vs Belum Diisi */}
                {currentKombelStatus === 'synced' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <CloudCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Tersimpan di Firebase</span>
                  </span>
                ) : currentKombelStatus === 'draft' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Mode Draft (Lokal)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Belum Diisi</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih Kombel yang ingin diisi. Setiap pilihan memiliki form independen; item belum diisi akan bersih/blank secara otomatis.
              </p>
            </div>
          </div>

          {/* Tombol Simpan Draft & Simpan ke Firebase */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={handleSaveDraft}
              title="Simpan perubahan ke memori perangkat lokal sebagai draft"
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 hover:border-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5 text-amber-700" />
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToFirebase}
              disabled={readOnly || isSavingFirebase}
              title="Simpan dan sinkronkan dokumen Kombel ini ke Cloud Firestore Firebase"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              {isSavingFirebase ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span>Simpan ke Firebase</span>
            </button>

            <button
              type="button"
              disabled={readOnly}
              onClick={handleResetCurrentKombel}
              title="Kosongkan seluruh isian form untuk Kombel ini"
              className="px-2.5 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kosongkan</span>
            </button>
          </div>
        </div>

        {/* Dropdown Menu Pemilih Kombel dengan Indikator Status Tiap Item */}
        <div className="relative">
          <select
            value={selectedTxId}
            onChange={(e) => handleSelectKombelTx(e.target.value)}
            className="w-full text-xs sm:text-[13px] font-semibold px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs cursor-pointer text-slate-800"
          >
            {(() => {
              const manualKey = `manual_m${activeMonthIndex}`;
              const manualRec = kombelStore[manualKey];
              const tag =
                manualRec?.status === 'synced'
                  ? '[🟢 Tersimpan]'
                  : manualRec?.isFilled
                  ? '[🟡 Draft]'
                  : '[⚪ Belum Diisi]';
              return (
                <option value="manual">
                  {tag} Input Manual / Bebas ({activeMonthName} 2026)
                </option>
              );
            })()}
            {kombelTransactions.map((tx, idx) => {
              const txId = tx.id || `${tx.no_bku}-${idx}`;
              const rec = kombelStore[txId];
              const tag =
                rec?.status === 'synced'
                  ? '[🟢 Tersimpan]'
                  : rec?.isFilled
                  ? '[🟡 Draft]'
                  : '[⚪ Belum Diisi]';
              const uraian = tx.rincian_barang?.[0]?.uraian_barang || tx.keterangan || 'Kegiatan Komunitas Belajar';
              return (
                <option key={txId} value={txId}>
                  {tag} {tx.no_bku} • {tx.tanggal} • {uraian.slice(0, 36)}... (Rp {tx.total_pengeluaran_bku.toLocaleString('id-ID')})
                </option>
              );
            })}
          </select>
        </div>

        {/* Notifikasi / Feedback Penyimpanan */}
        {kombelSaveFeedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
              kombelSaveFeedback.type === 'synced'
                ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
                : kombelSaveFeedback.type === 'draft'
                ? 'bg-amber-100/90 text-amber-900 border border-amber-300'
                : kombelSaveFeedback.type === 'error'
                ? 'bg-rose-100/90 text-rose-900 border border-rose-300'
                : 'bg-blue-100/90 text-blue-900 border border-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {kombelSaveFeedback.type === 'synced' && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
              {kombelSaveFeedback.type === 'draft' && <Check className="w-4 h-4 text-amber-700 shrink-0" />}
              {kombelSaveFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />}
              {kombelSaveFeedback.type === 'info' && <Lightbulb className="w-4 h-4 text-blue-700 shrink-0" />}
              <span>{kombelSaveFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setKombelSaveFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Saran Cepat jika Kombel dari BKU masih berstatus Belum Diisi */}
        {selectedTxId !== 'manual' && currentKombelStatus === 'empty' && (
          <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Kombel ini masih baru (kosong). Anda dapat mengklik <strong>Salin Uraian BKU</strong> atau langsung memasukkan judul di <strong>Kotak 1</strong> untuk membuat materi via AI.
              </span>
            </div>
            <button
              type="button"
              onClick={handleApplyBkuKeterangan}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] shrink-0 transition-all cursor-pointer shadow-2xs"
            >
              ✨ Salin Uraian BKU ke Judul
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Two-Column Layout (Form Input vs Live Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Input (Cols 1 to 5) - No Print */}
        <section className="lg:col-span-5 space-y-4 no-print lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto pr-1">
          {/* KOTAK 1: PILIHAN 2 SKEMA PENGISIAN DOKUMEN & MATERI KOMBEL (Sesuai Coretan Gambar User) */}
          <div className="bg-white border-2 border-emerald-600 rounded-2xl p-4 shadow-sm space-y-3.5 bg-gradient-to-b from-emerald-50/50 via-white to-white ring-1 ring-emerald-500/20">
            {/* Header Kotak 1 */}
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  1
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Kotak 1: Metode Penyusunan Materi &amp; Dokumen Kombel</span>
                  </h2>
                  <p className="text-[10.5px] text-slate-500">
                    2 cara fleksibel mengisi output: <strong>Upload Berkas</strong> atau <strong>Input Judul (AI)</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Selector 2 Skema */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSkemaInput('skema2_ai')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  skemaInput === 'skema2_ai'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-transparent text-slate-700 hover:bg-white/70'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate">Skema 2: Judul Baru (AI)</span>
              </button>
              <button
                type="button"
                onClick={() => setSkemaInput('skema1_manual')}
                className={`px-2.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  skemaInput === 'skema1_manual'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-transparent text-slate-700 hover:bg-white/70'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Skema 1: Upload Berkas</span>
              </button>
            </div>

            {/* SKEMA 2: KOMBEL BELUM ADA JUDUL -> INPUT JUDUL & AI BUATKAN MATERI LENGKAP 5 BAB + NOTULA */}
            {skemaInput === 'skema2_ai' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Judul / Topik Pembinaan Komunitas Belajar (Kombel)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={aiJudulInput}
                      onChange={(e) => setAiJudulInput(e.target.value)}
                      placeholder="Masukkan judul atau topik materi Kombel..."
                      className="w-full px-3 py-2 border border-emerald-300 rounded-xl bg-white focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs font-medium shadow-2xs text-slate-900 pr-8"
                    />
                    {aiJudulInput && (
                      <button
                        type="button"
                        onClick={() => setAiJudulInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        title="Hapus judul"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Tombol Utama Generate */}
                <button
                  type="button"
                  onClick={() => handleGenerateMateriFromTitle()}
                  disabled={isGeneratingMateri || !aiJudulInput.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGeneratingMateri ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                      <span>Menyusun Modul Materi &amp; Notula via AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Buat Materi &amp; Notula Otomatis (Didukung AI)</span>
                    </>
                  )}
                </button>

                {/* Status Response */}
                {materiStatus && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                      materiStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                        : materiStatus.type === 'error'
                        ? 'bg-red-50 text-red-900 border border-red-300'
                        : 'bg-teal-50 text-teal-900 border border-teal-300'
                    }`}
                  >
                    {materiStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : materiStatus.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 animate-spin" />
                    )}
                    <div className="flex-1 text-[11px] leading-relaxed font-medium">
                      {materiStatus.message}
                    </div>
                  </div>
                )}

                {/* Card Hasil Materi & Aksi Unduh */}
                {generatedMateriData && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 via-white to-teal-50 border border-emerald-300 rounded-xl space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                      <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Materi &amp; Notula Kombel Siap Digunakan
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                        5 Bab Terstruktur
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 line-clamp-2">
                      {generatedMateriData.judulResmi}
                    </p>

                    <p className="text-[10.5px] text-slate-600 line-clamp-2 leading-relaxed">
                      {generatedMateriData.deskripsi}
                    </p>

                    {/* Tombol Unduh & Tinjau */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDownloadMateriWord}
                        className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        title="Unduh naskah materi lengkap berkop sekolah format Word (.DOC)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Word (.DOC)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentDocTab('materi')}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        title="Lihat lembar dokumen materi di stage pratinjau"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                        Lihat Tab Materi
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyMateri}
                        className="px-2.5 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        title="Salin teks materi"
                      >
                        {copiedMateri ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-white/90 p-2 rounded-lg border border-emerald-100 leading-snug">
                      ✅ <strong>Notula Selaras:</strong> Pembukaan, Isi Narasi 1 Paragraf (tanpa numbering), dan Penutup pada tab <strong>Notula</strong> telah otomatis terisi sesuai materi ini.
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* SKEMA 1: UPLOAD BERKAS MATERI & ISI NOTULA LANGSUNG */}
            {skemaInput === 'skema1_manual' && (
              <div className="space-y-3 pt-1 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 leading-relaxed">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    <span>Skema 1: Upload Berkas Materi (PDF/Teks) &amp; Buat Notula Langsung</span>
                  </p>
                  <p className="text-slate-600 text-[10.5px]">
                    Gunakan opsi ini jika sekolah sudah memiliki berkas naskah/slide presentasi materi pembinaan. Sistem akan mengekstrak teks materi dan merangkumnya menjadi notula resmi.
                  </p>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">Unggah berkas materi (PDF/Teks)</label>
                    <button
                      type="button"
                      onClick={handleLoadSamplePdf}
                      disabled={isReadingFile || isGeneratingAi}
                      className="text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer disabled:opacity-50"
                    >
                      Muat Berkas Contoh
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handlePdfUpload}
                    disabled={isReadingFile}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600 cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-mono">
                    <span className="truncate">{pdfInfo}</span>
                    {isReadingFile && (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold shrink-0 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Membaca berkas...
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Teks hasil baca materi berkas..."
                    value={pdfTxt}
                    onChange={(e) => setPdfTxt(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateAiNotula}
                      disabled={isGeneratingAi || isReadingFile}
                      className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyusun Notula via AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Buat Notula dari Berkas (AI)</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleUsePdfText}
                      disabled={!pdfTxt.trim()}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Salin ke Isi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 1: Detail Kegiatan & Surat Undangan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <details open className="border-b border-slate-100 pb-3">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer select-none py-1 flex items-center justify-between">
                <span>Rincian Kegiatan &amp; Waktu</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </summary>
              <div className="pt-2 space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama kegiatan</label>
                  <input
                    type="text"
                    value={kegiatan}
                    onChange={(e) => setKegiatan(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tahun pelajaran</label>
                    <input
                      type="text"
                      value={tp}
                      onChange={(e) => setTp(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tahun program</label>
                    <input
                      type="text"
                      value={tahunProg}
                      onChange={(e) => setTahunProg(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Waktu</label>
                    <input
                      type="text"
                      value={waktu}
                      placeholder="12.30 – 14.45 WIB"
                      onChange={(e) => setWaktu(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tempat</label>
                  <input
                    type="text"
                    value={tempat}
                    onChange={(e) => setTempat(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Alamat tempat</label>
                  <input
                    type="text"
                    value={alamatTempat}
                    onChange={(e) => setAlamatTempat(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Agenda pembahasan / materi</label>
                  <input
                    type="text"
                    value={materi}
                    placeholder="mis. Implementasi Kurikulum Merdeka"
                    onChange={(e) => setMateri(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </details>

            <details open>
              <summary className="font-bold text-sm text-slate-900 cursor-pointer select-none py-1 flex items-center justify-between">
                <span>2. Surat Undangan</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </summary>
              <div className="pt-2 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor surat</label>
                    <input
                      type="text"
                      value={nomor}
                      onChange={(e) => setNomor(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kota</label>
                    <input
                      type="text"
                      value={kota}
                      onChange={(e) => setKota(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal surat</label>
                    <input
                      type="date"
                      value={tglSurat}
                      onChange={(e) => setTglSurat(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lampiran</label>
                    <input
                      type="text"
                      value={lampiran}
                      onChange={(e) => setLampiran(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hal</label>
                  <input
                    type="text"
                    value={hal}
                    onChange={(e) => setHal(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ditujukan kepada</label>
                  <input
                    type="text"
                    value={kepada}
                    onChange={(e) => setKepada(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dasar (satu per baris)</label>
                  <textarea
                    rows={4}
                    value={dasar}
                    onChange={(e) => setDasar(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelengkapan yang dibawa (satu per baris)</label>
                  <textarea
                    rows={4}
                    value={bawa}
                    onChange={(e) => setBawa(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs leading-relaxed"
                  />
                </div>
              </div>
            </details>
          </div>

          {/* Card 2: Susunan Acara & Pegawai */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <details open className="border-b border-slate-100 pb-3">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer select-none py-1 flex items-center justify-between">
                <span>3. Susunan Acara</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </summary>
              <div className="pt-2 space-y-2">
                {acaraList.map((item, idx) => {
                  const isNarasumberInMaster = teacherOptions.some((o) => o.nama === item.narasumber);
                  return (
                    <div key={idx} className="flex flex-wrap items-center gap-1.5 p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs">
                      <span className="font-bold w-5 text-center text-slate-500">{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Jam"
                        value={item.jam}
                        onChange={(e) => handleAcaraChange(idx, 'jam', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded bg-white font-mono text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Agenda"
                        value={item.agenda}
                        onChange={(e) => handleAcaraChange(idx, 'agenda', e.target.value)}
                        className="flex-1 min-w-[120px] px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                      />
                      {/* Dropdown Narasumber dari Data Master Guru */}
                      <div className="flex items-center gap-1 min-w-[180px]">
                        <select
                          value={isNarasumberInMaster ? item.narasumber : (item.narasumber ? '__custom__' : '')}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              handleAcaraChange(idx, 'narasumber', '');
                            } else {
                              handleAcaraChange(idx, 'narasumber', e.target.value);
                            }
                          }}
                          className="w-full text-xs font-semibold px-2 py-1 border border-emerald-300 rounded bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500 cursor-pointer truncate shadow-2xs"
                          title="Pilih Narasumber / Pembicara dari Data Master Guru"
                        >
                          <option value="">-- Pilih dari Master Guru --</option>
                          {teacherOptions.map((opt, oIdx) => (
                            <option key={`${opt.nama}-${oIdx}`} value={opt.nama}>
                              {opt.nama} ({opt.role})
                            </option>
                          ))}
                          <option value="__custom__">+ Input Nama Manual / Lainnya</option>
                        </select>
                      </div>
                      {/* Text input if manual or not in master */}
                      {(!isNarasumberInMaster || !item.narasumber) && (
                        <input
                          type="text"
                          placeholder="Ketik narasumber..."
                          value={item.narasumber}
                          onChange={(e) => handleAcaraChange(idx, 'narasumber', e.target.value)}
                          className="w-32 px-2 py-1 border border-slate-300 rounded bg-white text-xs font-medium"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAcara(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={handleAddAcara}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 mt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris Acara
                </button>
              </div>
            </details>

            <details open>
              <summary className="font-bold text-sm text-slate-900 cursor-pointer select-none py-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>4. Pegawai (Daftar Hadir)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    {pegawaiList.length} dari Data Master
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </summary>
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <small className="block text-[10.5px] text-slate-500">
                    Data diambil secara dinamis dari Data Master Guru. Isi NIP dengan - untuk honorer.
                  </small>
                  <button
                    type="button"
                    onClick={() => setPegawaiList(buildPegawaiFromMaster(teachers, metadata))}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                    title="Muat ulang data dari Data Master Guru"
                  >
                    Sync Ulang Master
                  </button>
                </div>

                {pegawaiList.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 text-center space-y-1">
                    <p className="text-xs font-bold text-amber-900">
                      Belum ada data guru di Data Master Guru
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Silakan isi data guru di menu <strong>Data Master Terpadu</strong> atau tambahkan baris secara mandiri menggunakan tombol di bawah.
                    </p>
                  </div>
                ) : (
                  pegawaiList.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-1.5 p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs">
                      <span className="font-bold w-5 text-center text-slate-500">{idx + 1}</span>
                      <input
                        type="text"
                        placeholder="Nama"
                        value={item.nama}
                        onChange={(e) => handlePegawaiChange(idx, 'nama', e.target.value)}
                        className="flex-1 min-w-[130px] px-2 py-1 border border-slate-300 rounded bg-white font-medium"
                      />
                      <input
                        type="text"
                        placeholder="NIP"
                        value={item.nip}
                        onChange={(e) => handlePegawaiChange(idx, 'nip', e.target.value)}
                        className="w-28 px-2 py-1 border border-slate-300 rounded bg-white font-mono text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Pangkat, gol"
                        value={item.pangkat}
                        onChange={(e) => handlePegawaiChange(idx, 'pangkat', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Jabatan"
                        value={item.jabatan}
                        onChange={(e) => handlePegawaiChange(idx, 'jabatan', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePegawai(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={handleAddPegawai}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 mt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris Pegawai
                </button>
              </div>
            </details>
          </div>

          {/* Card 3: Pejabat, Notulen & Notula */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <details open className="border-b border-slate-100 pb-3">
              <summary className="font-bold text-sm text-slate-900 cursor-pointer select-none py-1 flex items-center justify-between">
                <span>5. Pejabat &amp; Notulen</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </summary>
              <div className="pt-2 space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kepala sekolah</label>
                  <input
                    type="text"
                    value={kepsek}
                    onChange={(e) => setKepsek(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pangkat</label>
                    <input
                      type="text"
                      value={kepPangkat}
                      onChange={(e) => setKepPangkat(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIP</label>
                    <input
                      type="text"
                      value={kepNip}
                      onChange={(e) => setKepNip(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notulen (Pilih dari Pegawai)</label>
                  <select
                    value={notulen}
                    onChange={(e) => setNotulen(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  >
                    {pegawaiList.map((p, idx) => (
                      <option key={idx} value={p.nama}>
                        {p.nama} {p.nip && p.nip !== '-' ? `(NIP. ${p.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </details>

            <details open>
              <summary className="font-bold text-sm text-slate-900 cursor-pointer select-none py-1 flex items-center justify-between">
                <span>6. Notula</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </summary>
              <div className="pt-2 space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Agenda rapat</label>
                  <input
                    type="text"
                    value={agendaRapat}
                    onChange={(e) => setAgendaRapat(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="p-2.5 border border-slate-200 rounded-xl bg-slate-50/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">Unggah bahan materi (PDF/Teks)</label>
                    <button
                      type="button"
                      onClick={handleLoadSamplePdf}
                      disabled={isReadingFile || isGeneratingAi}
                      className="text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer disabled:opacity-50"
                      title="Muat berkas 1. Menata Kata Membangun Makna.pdf langsung ke sistem"
                    >
                      Muat Berkas Contoh (1. Menata Kata...)
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handlePdfUpload}
                    disabled={isReadingFile}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-600 cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-mono">
                    <span className="truncate">{pdfInfo}</span>
                    {isReadingFile && (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold shrink-0 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Membaca...
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Teks hasil baca (boleh diedit)... Jika tidak ada materi terbaca, kotak ini akan kosong."
                    value={pdfTxt}
                    onChange={(e) => setPdfTxt(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerateAiNotula}
                      disabled={isGeneratingAi || isReadingFile}
                      className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                      title="Ekstrak materi dari file dan susun teks Pembukaan, Isi Pokok Materi, serta Penutup Notula kedinasan secara otomatis. Jika materi kosong, kolom notula akan dikosongkan."
                    >
                      {isGeneratingAi ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                          <span>Menyusun Notula via AI...</span>
                        </>
                      ) : isReadingFile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                          <span>Membaca Berkas via AI Vision...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                          <span>Buat Notula Otomatis (Didukung AI)</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleUsePdfText}
                      disabled={!pdfTxt.trim()}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
                      title="Salin teks materi di atas secara manual ke kotak Isi Penyampaian Materi"
                    >
                      Salin ke Isi (Manual)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfTxt('');
                        setAiStatus(null);
                        setPdfInfo('Belum ada file.');
                      }}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title="Bersihkan teks materi"
                    >
                      Hapus teks
                    </button>
                  </div>

                  {aiStatus && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-start gap-2 transition-all ${
                        aiStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                          : aiStatus.type === 'error'
                          ? 'bg-red-50 text-red-900 border border-red-300'
                          : 'bg-teal-50 text-teal-900 border border-teal-300'
                      }`}
                    >
                      {aiStatus.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : aiStatus.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 animate-spin" />
                      )}
                      <div className="flex-1 leading-snug font-medium">
                        {aiStatus.message}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 leading-tight bg-slate-100/80 p-2 rounded-lg border border-slate-200/80 flex items-center gap-1.5">
                    <span className="font-bold text-emerald-700">Mekanisme 2 Tahap:</span>
                    <span>
                      1. Unggah berkas untuk <strong>ekstraksi teks materi</strong> secara manual. 2. Klik tombol <strong>&ldquo;Buat Notula Otomatis (Didukung AI)&rdquo;</strong> untuk menganalisis teks tersebut menjadi <strong>Pembukaan</strong>, <strong>Isi Penyampaian Materi (1 paragraf narasi tanpa numbering)</strong>, dan <strong>Penutup</strong>.
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pembukaan</label>
                  <textarea
                    rows={3}
                    value={nPembukaan}
                    onChange={(e) => setNPembukaan(e.target.value)}
                    placeholder="Paragraf pembukaan notula resmi..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs leading-relaxed"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Isi penyampaian materi
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      1 Paragraf Saja (Tanpa Numbering)
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={nIsi}
                    onChange={(e) => setNIsi(e.target.value)}
                    placeholder="Uraian penyampaian materi dalam 1 paragraf narasi tanpa penomoran/numbering (hasil analisis AI)..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Penutup</label>
                  <textarea
                    rows={3}
                    value={nPenutup}
                    onChange={(e) => setNPenutup(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs leading-relaxed"
                  />
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* Right Column: Stage / Live Paper Preview (Cols 6 to 12) */}
        <section className="lg:col-span-7 space-y-4">
          {/* Tabs bar - No Print */}
          <div className="tabs flex flex-wrap gap-1.5 bg-white border border-slate-200 p-2 rounded-2xl shadow-2xs no-print">
            <button
              onClick={() => setCurrentDocTab('surat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                currentDocTab === 'surat'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Surat Undangan
            </button>
            <button
              onClick={() => setCurrentDocTab('acara')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                currentDocTab === 'acara'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Susunan Acara
            </button>
            <button
              onClick={() => setCurrentDocTab('hadir')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                currentDocTab === 'hadir'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Daftar Hadir
            </button>
            <button
              onClick={() => setCurrentDocTab('notula')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                currentDocTab === 'notula'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Notula
            </button>
            <button
              onClick={() => setCurrentDocTab('materi')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                currentDocTab === 'materi'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Materi Pembinaan</span>
              {generatedMateriData && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-emerald-950 rounded text-[9px] font-bold">
                  AI
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentDocTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                currentDocTab === 'all'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Cetak Semua (5 Lembar)
            </button>
            <button
              onClick={() => setCurrentDocTab('ana')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                currentDocTab === 'ana'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Analisis Form
            </button>
          </div>

          {/* Paper Stage Container */}
          <div className="stage overflow-x-auto">
            {/* Tab: Analisis Form */}
            {currentDocTab === 'ana' && renderDocAnalisis()}

            {/* Tab: Surat Undangan */}
            {(currentDocTab === 'surat' || currentDocTab === 'all') && (
              <div className="paper bg-white text-black p-8 sm:p-10 shadow-md border border-slate-300 rounded-xl mb-6 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0 print:m-0 print:mb-0 print:page-break-after-always">
                {renderDocSurat()}
              </div>
            )}

            {/* Tab: Susunan Acara */}
            {(currentDocTab === 'acara' || currentDocTab === 'all') && (
              <div className="paper bg-white text-black p-8 sm:p-10 shadow-md border border-slate-300 rounded-xl mb-6 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0 print:m-0 print:mb-0 print:page-break-after-always">
                {renderDocAcara()}
              </div>
            )}

            {/* Tab: Daftar Hadir */}
            {(currentDocTab === 'hadir' || currentDocTab === 'all') && (
              <div className="paper bg-white text-black p-8 sm:p-10 shadow-md border border-slate-300 rounded-xl mb-6 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0 print:m-0 print:mb-0 print:page-break-after-always">
                {renderDocHadir()}
              </div>
            )}

            {/* Tab: Notula Pertemuan */}
            {(currentDocTab === 'notula' || currentDocTab === 'all') && (
              <div className={`paper bg-white text-black p-8 sm:p-10 shadow-md border border-slate-300 rounded-xl mb-6 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0 print:m-0 print:mb-0 ${currentDocTab === 'all' ? 'print:page-break-after-always' : ''}`}>
                {renderDocNotula()}
              </div>
            )}

            {/* Tab: Materi Pembinaan & Modul Kombel */}
            {(currentDocTab === 'materi' || currentDocTab === 'all') && (
              <div className="paper bg-white text-black p-8 sm:p-10 shadow-md border border-slate-300 rounded-xl mb-6 mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0 print:m-0 print:mb-0">
                {renderDocMateri()}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
