import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TransaksiBKU,
  SchoolMetadata,
  MasterGuru,
  LogistikBarang,
  DokumenLogistikConfig,
  LogistikItemAlokasi,
  STANDARD_LOGISTIK_TAGS,
  LogistikTagId,
  LogistikTagDefinition,
  MonthlyArchive,
  PrintPreviewSettings,
  PaperSize,
  MarginPreset,
  TableSpacingPreset,
  SignatureSpacingPreset,
  MonthLogistikData
} from '../../types';
import { DokumenTripartitGuru, DokumenGuruData, DEFAULT_PRINT_SETTINGS } from './DokumenTripartitGuru';
import {
  debounceSaveLogistikMonthToFirestore,
  fetchLogistikFromFirestore,
  saveLogistikMonthToFirestore,
  subscribeToLogistikData,
  computeSyncHash,
  hasPendingSaveChannel,
  CloudSyncStatus,
  isOfflineError
} from '../../lib/firebaseSync';
import { useSchool } from '../../context/SchoolContext';
import { readLS, writeLS, removeLS } from '../../lib/schoolStorage';
import { OpnamePersediaanView } from './OpnamePersediaanView';
import { AtkLpjView } from './AtkLpjView';
import { AlkebLpjView } from './AlkebLpjView';
import { LogistikTagManager } from './LogistikTagManager';
import { formatRupiah } from '../SummaryCards';
import { parseTanggalBAST, formatNomorSuratKedinasan } from '../../utils/logistikUtils';
import { detectDefaultKlasifikasiSPJ } from '../../utils/klasifikasiSpjHelper';
import { detectDefaultKonversi, isKemasanGrosir } from '../../utils/konversiSatuanHelper';
import { MonthlyArchiveCards } from '../MonthlyArchiveCards';
import { TwelveMonthGrid } from '../TwelveMonthGrid';
import {
  Package,
  Brush,
  FileCheck2,
  Printer,
  Sparkles,
  Sliders,
  RefreshCw,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  UserCheck,
  UserPlus,
  Plus,
  Trash2,
  Edit3,
  Search,
  Save,
  Check,
  X,
  AlertCircle,
  Database,
  ArrowRight,
  Building2,
  FolderSync,
  Tag,
  Zap,
  Filter,
  CheckSquare,
  Square,
  Maximize2,
  Cloud
} from 'lucide-react';

interface UnifiedAlkebAtkManagerProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  teachers: MasterGuru[];
  onUpdateTeachers?: (newTeachers: MasterGuru[]) => void;
  onNavigateToMaster?: () => void;
  initialSubTab?: 'kelola' | 'dokumen-guru' | 'opname' | 'lpj-atk' | 'lpj-alkeb';
  monthlyArchives?: MonthlyArchive[];
  activeMonthId?: string | null;
  onSelectMonth?: (monthId: string) => void;
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  onSelectMonthIndex?: (monthIndex: number) => void;
}

// Helper: Deteksi Tag Otomatis untuk Personel / Guru berdasarkan Jabatan & Tugas Tambahan
export const detectDefaultTeacherTags = (guru: MasterGuru): string[] => {
  const j = (guru.jabatan || '').toLowerCase();
  const tags: string[] = [];

  if (j.includes('kelas') || j.includes('wali kelas') || j.includes('guru kelas')) {
    tags.push('GURU_KELAS');
  }
  if (j.includes('pai') || j.includes('agama') || j.includes('pjok') || j.includes('penjas') || j.includes('olahraga') || j.includes('mapel') || j.includes('bahasa') || j.includes('inggris') || j.includes('seni')) {
    tags.push('GURU_MAPEL');
  }
  if (j.includes('kebersihan') || j.includes('penjaga') || j.includes('caraka') || j.includes('cleaning') || j.includes('pramubakti')) {
    tags.push('PETUGAS_KEBERSIHAN');
  }
  if (j.includes('keamanan') || j.includes('satpam') || j.includes('security') || j.includes('pos')) {
    tags.push('PETUGAS_KEAMANAN');
  }
  if (j.includes('tu') || j.includes('tata usaha') || j.includes('administrasi') || j.includes('operator') || j.includes('dapodik') || j.includes('arsiparis')) {
    tags.push('TENDIK_ADMIN');
  }
  if (j.includes('bendahara') || j.includes('barang') || j.includes('bosp') || j.includes('bos')) {
    tags.push('TIM_BOSP');
  }
  if (j.includes('panitia') || j.includes('anbk') || j.includes('asesmen') || j.includes('ppdb') || j.includes('ujian')) {
    tags.push('PANITIA_KEGIATAN');
  }

  // Jika belum ada tag dan bukan kepala sekolah murni
  if (tags.length === 0 && !j.includes('kepala sekolah')) {
    tags.push('GURU_KELAS');
  }

  return tags;
};

// Helper: Deteksi Target Tag Otomatis untuk Barang Persediaan
export const detectDefaultItemTargetTags = (namaBarang: string, kategori: string, kodeRekening: string): string[] => {
  const n = namaBarang.toLowerCase();
  const k = (kategori || '').toUpperCase();

  if (k === 'ALKEB' || n.includes('pel') || n.includes('sapu') || n.includes('sabun') || n.includes('desinfektan') || n.includes('karbol') || n.includes('wipol') || n.includes('kamper') || n.includes('tisu') || n.includes('plastik sampah') || n.includes('pengki') || n.includes('sikat') || n.includes('pembersih') || n.includes('keset') || n.includes('kemoceng') || n.includes('trash bag') || n.includes('sanitasi')) {
    return ['PETUGAS_KEBERSIHAN'];
  }

  if (n.includes('spidol') || n.includes('boardmarker') || n.includes('penghapus papan') || n.includes('kapur') || n.includes('refill spidol') || n.includes('buku') || n.includes('modul') || n.includes('tematik') || n.includes('harmoni') || n.includes('basa sunda') || n.includes('pendamping')) {
    return ['GURU_KELAS', 'GURU_MAPEL'];
  }

  if (n.includes('tinta') || n.includes('toner') || n.includes('cartridge') || n.includes('printer') || n.includes('flashdisk') || n.includes('kuitansi') || n.includes('bku') || n.includes('stempel') || n.includes('materai')) {
    return ['TIM_BOSP', 'TENDIK_ADMIN'];
  }

  if (n.includes('ujian') || n.includes('asesmen') || n.includes('anbk') || n.includes('soal') || n.includes('ijazah') || n.includes('map raport') || n.includes('ppdb') || n.includes('co-card') || n.includes('kartu peserta') || n.includes('fotocopy') || n.includes('penggandaan')) {
    return ['PANITIA_KEGIATAN', 'GURU_KELAS'];
  }

  if (n.includes('senter') || n.includes('jas hujan') || n.includes('peluit') || n.includes('gembok') || n.includes('batu baterai')) {
    return ['PETUGAS_KEAMANAN'];
  }

  if (n.includes('hvs') || n.includes('kertas') || n.includes('folio') || n.includes('paper') || n.includes('karton')) {
    return ['GURU_KELAS', 'TIM_BOSP', 'TENDIK_ADMIN'];
  }

  // Default ATK umum
  return ['GURU_KELAS', 'GURU_MAPEL'];
};

export const UnifiedAlkebAtkManager: React.FC<UnifiedAlkebAtkManagerProps> = ({
  data,
  metadata,
  teachers,
  onUpdateTeachers,
  onNavigateToMaster,
  initialSubTab = 'kelola',
  monthlyArchives,
  activeMonthId,
  onSelectMonth,
  monthlyStore,
  activeMonthIndex,
  onSelectMonthIndex
}) => {
  const { schoolId, readOnly } = useSchool();
  const [activeSubTab, setActiveSubTab] = useState<'kelola' | 'dokumen-guru' | 'opname' | 'lpj-atk' | 'lpj-alkeb'>(initialSubTab);
  
  // Inner Sub-Mode di dalam Tab 1 (Kelola Barang vs Kelola Tag Personel)
  const [kelolaViewMode, setKelolaViewMode] = useState<'barang' | 'tag-personel'>('barang');
  
  const [filterKategori, setFilterKategori] = useState<'SEMUA' | 'ATK' | 'ALKEB'>('SEMUA');
  const [filterTag, setFilterTag] = useState<string>('SEMUA_TAG');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Kelola Jatah state
  const [modalTeacherSearch, setModalTeacherSearch] = useState('');
  const [includeKepsekInModal, setIncludeKepsekInModal] = useState(false);

  // 1. Personnel List: MURNI 100% Mengambil langsung dari Data Master (teachers prop)
  // Relationship Ketat: Jika di Data Master kosong / dihapus, personel seketika tidak ada
  const personnelList = useMemo<MasterGuru[]>(() => {
    if (!teachers || teachers.length === 0) return [];
    return teachers.map((t) => ({
      ...t,
      tags: t.tags && t.tags.length > 0 ? t.tags : detectDefaultTeacherTags(t)
    }));
  }, [teachers]);

  // Update Personnel Tags (disimpan langsung ke master guru jika ada handler)
  const handleUpdatePersonnel = (updated: MasterGuru[]) => {
    if (readOnly) return;
    if (onUpdateTeachers) {
      onUpdateTeachers(updated);
    }
  };

  // Reset Personnel Tags to Defaults based on Jabatan
  const handleResetPersonnelTags = () => {
    if (readOnly) return;
    if (onUpdateTeachers && teachers.length > 0) {
      const reset = teachers.map((t) => ({
        ...t,
        tags: detectDefaultTeacherTags(t)
      }));
      onUpdateTeachers(reset);
    }
  };

  // 1. Month Key & School Id
  const currentMonthIndex = typeof activeMonthIndex === 'number' ? activeMonthIndex : 2;

  // Monthly Logistics & Distribution Store (Persisted locally per-school and to Firestore database)
  const [monthlyLogistikStore, setMonthlyLogistikStore] = useState<Record<number, MonthLogistikData>>(() => {
    const saved = readLS<Record<number, MonthLogistikData>>(schoolId, 'monthly_logistik_store', {});
    return saved && typeof saved === 'object' ? saved : {};
  });

  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showPrintSettingsDrawer, setShowPrintSettingsDrawer] = useState<boolean>(false);

  // Print Preview Settings (kertas, margin, spasi tabel, spasi tanda tangan luas)
  const [printSettings, setPrintSettings] = useState<PrintPreviewSettings>(() => {
    if (monthlyLogistikStore[currentMonthIndex]?.printSettings) {
      return monthlyLogistikStore[currentMonthIndex].printSettings!;
    }
    return readLS<PrintPreviewSettings>(schoolId, 'print_preview_settings', DEFAULT_PRINT_SETTINGS);
  });

  // 2. Dokumen Logistik Config
  const [config, setConfig] = useState<DokumenLogistikConfig>(() => {
    if (monthlyLogistikStore[currentMonthIndex]?.config) {
      return monthlyLogistikStore[currentMonthIndex].config!;
    }
    const saved = readLS<DokumenLogistikConfig | null>(schoolId, 'logistik_config', null);
    if (saved) {
      return saved;
    }
    return {
      noMintaStart: 174,
      tglMinta: 'Jumat, 10 April 2026',
      tglVerif: 'Sabtu, 11 April 2026',
      tglBA: '2026-04-13',
      namaVerifikator: 'Drs. H. Mulyadi Kartasasmita',
      nipVerifikator: '197108151996031002',
      jabatanVerifikator: 'Ketua Tim PBJ / Verifikator',
      namaPengurusBarang: 'Nurhayati, S.Pd.',
      nipPengurusBarang: '198804152014032002',
      jabatanPengurusBarang: 'Pengurus Barang / Pengelola Persediaan',
      kotaKecamatan: metadata.desaKecamatan ? metadata.desaKecamatan.split(',')[1]?.trim() || 'Bogor' : 'Bogor'
    };
  });

  useEffect(() => {
    if (!readOnly) {
      writeLS(schoolId, 'logistik_config', config);
    }
  }, [config, schoolId, readOnly]);

  // Daftar Referensi Pejabat untuk Dropdown: Diambil dari Database Master Guru + Bendahara
  const pejabatOptions = useMemo(() => {
    const list: Array<{
      id: string;
      nama: string;
      nip: string;
      jabatan: string;
      category: 'bendahara' | 'guru' | 'kepsek';
    }> = [];
    const addedNames = new Set<string>();

    // 1. Bendahara Sekolah (dari SchoolMetadata)
    if (metadata.bendahara && metadata.bendahara.trim()) {
      const cleanName = metadata.bendahara.trim();
      list.push({
        id: 'meta-bendahara',
        nama: cleanName,
        nip: (metadata.nipBendahara || '-').trim(),
        jabatan: 'Bendahara Sekolah / BOSP',
        category: 'bendahara'
      });
      addedNames.add(cleanName.toLowerCase());
    }

    // 2. Seluruh Guru & Staf dari Database Master Guru (personnelList)
    personnelList.forEach((g) => {
      const cleanName = (g.nama || '').trim();
      if (cleanName && !addedNames.has(cleanName.toLowerCase())) {
        list.push({
          id: g.id,
          nama: cleanName,
          nip: (g.nip || '-').trim(),
          jabatan: g.jabatan || 'Guru / Staf',
          category: 'guru'
        });
        addedNames.add(cleanName.toLowerCase());
      }
    });

    // 3. Kepala Sekolah (dari SchoolMetadata)
    if (metadata.kepalaSekolah && metadata.kepalaSekolah.trim()) {
      const cleanName = metadata.kepalaSekolah.trim();
      if (!addedNames.has(cleanName.toLowerCase())) {
        list.push({
          id: 'meta-kepsek',
          nama: cleanName,
          nip: (metadata.nipKepalaSekolah || '-').trim(),
          jabatan: 'Kepala Satuan Pendidikan',
          category: 'kepsek'
        });
      }
    }

    return list;
  }, [metadata.bendahara, metadata.nipBendahara, metadata.kepalaSekolah, metadata.nipKepalaSekolah, personnelList]);

  // 3. Ekstraksi Otomatis Barang dari BKU & RKAS dengan Deteksi Target Tag
  const extractedFromBku: LogistikBarang[] = useMemo(() => {
    const list: LogistikBarang[] = [];

    data.forEach((tx) => {
      if (tx.tipe_transaksi === 'Pengeluaran') {
        const firstItem = tx.rincian_barang?.[0];
        // Dapatkan klasifikasi transaksi (dari dropdown pilihan user atau deteksi default)
        const effectiveKlas = tx.klasifikasi || detectDefaultKlasifikasiSPJ(
          firstItem?.uraian_barang || '',
          tx.keterangan || '',
          firstItem?.kode_rekening || '',
          tx.kode_kegiatan || ''
        );

        // Filter: Hanya panggil BNU yang diklasifikasikan sebagai ATK atau ALKEB
        if (effectiveKlas !== 'ATK' && effectiveKlas !== 'ALKEB') {
          return; // Lewati Honorarium, Kegiatan, Perbaikan, dan Lainnya
        }

        const itemsToProcess = (tx.rincian_barang && tx.rincian_barang.length > 0)
          ? tx.rincian_barang
          : [{
              kode_rekening: tx.kode_kegiatan || '-',
              uraian_barang: tx.keterangan || (effectiveKlas === 'ALKEB' ? 'Belanja Bahan Kebersihan' : 'Belanja ATK'),
              volume: 1,
              satuan: 'buah',
              harga_satuan: tx.total_pengeluaran_bku,
              jumlah_transaksi: tx.total_pengeluaran_bku,
              kode_kegiatan: tx.kode_kegiatan
            }];

        itemsToProcess.forEach((item, idx) => {
          const kategori: 'ATK' | 'ALKEB' = effectiveKlas;
          const kode = (item.kode_rekening || '').trim();
          const namaBarang = item.uraian_barang || tx.keterangan || (kategori === 'ATK' ? 'Perlengkapan ATK & KBM' : 'Bahan Kebersihan & Sanitasi');
          const targetTags = detectDefaultItemTargetTags(namaBarang, kategori, kode);

          const safeId = `${tx.no_bku || 'BNU'}-${idx}-${kategori}-${namaBarang.slice(0, 15).replace(/[^a-zA-Z0-9]/g, '')}`;
          const rawSatuan = item.satuan || 'buah';
          const defaultKonv = detectDefaultKonversi(rawSatuan, namaBarang);

          list.push({
            id: safeId,
            namaBarang,
            spesifikasi: tx.keterangan || `Belanja ${metadata.bulanTahun || 'BOSP'}`,
            kategori,
            satuan: rawSatuan,
            totalVolume: item.volume && item.volume > 0 ? item.volume : 1,
            sisaLalu: 0,
            hargaSatuan: item.harga_satuan && item.harga_satuan > 0 ? item.harga_satuan : item.jumlah_transaksi,
            kodeRekening: item.kode_rekening && item.kode_rekening !== '-' ? item.kode_rekening : (kategori === 'ATK' ? '5.1.02.01.01.0024' : '5.1.02.01.01.0028'),
            kodeKegiatan: item.kode_kegiatan || tx.kode_kegiatan || (kategori === 'ATK' ? '06.05.08.' : '06.05.09.'),
            tanggalBelanja: tx.tanggal,
            noBku: tx.no_bku,
            targetTags,
            faktorKonversi: defaultKonv.faktor,
            satuanDistribusi: defaultKonv.satuanDistribusi,
            keperluanDefault: kategori === 'ATK' ? 'Kegiatan Belajar Mengajar & Administrasi' : 'Operasional Sanitasi & Kebersihan Sekolah',
            alokasi: []
          });
        });
      }
    });

    // Jika data BKU kosong, return list kosong
    return list;
  }, [data, metadata]);

  // =========================================================================
  // 4. SMART AUTO-DISTRIBUTION ENGINE BERDASARKAN TAG PERSONEL & TARGET TAG
  // =========================================================================
  const smartAutoDistributeHelper = (rawItems: LogistikBarang[], activePersonnel: MasterGuru[]): LogistikBarang[] => {
    // Jika data guru di Data Master kosong, kembalikan barang dengan alokasi kosong (tidak ada alokasi fiktif)
    if (!activePersonnel || activePersonnel.length === 0) {
      return rawItems.map((item) => ({
        ...item,
        targetTags: item.targetTags && item.targetTags.length > 0
          ? item.targetTags
          : detectDefaultItemTargetTags(item.namaBarang, item.kategori, item.kodeRekening),
        alokasi: []
      }));
    }

    return rawItems.map((item) => {
      const itemTags = item.targetTags && item.targetTags.length > 0
        ? item.targetTags
        : detectDefaultItemTargetTags(item.namaBarang, item.kategori, item.kodeRekening);

      // Cari personel yang memiliki tag yang cocok dengan targetTags barang
      const matchedPersonnel = activePersonnel.filter((p) => {
        // Jangan sertakan Kepala Sekolah murni kecuali ada tag tim BOSP
        const isKepsek = (p.jabatan || '').toLowerCase().includes('kepala sekolah');
        const pTags = p.tags || [];

        if (isKepsek && !pTags.includes('TIM_BOSP')) {
          return false;
        }

        // Cocok jika ada irisan tag
        return pTags.some((pt) => itemTags.includes(pt));
      });

      // Jika tidak ada personel yang cocok, fallback ke semua guru selain kepsek
      const recipients = matchedPersonnel.length > 0
        ? matchedPersonnel
        : activePersonnel.filter(p => !(p.jabatan || '').toLowerCase().includes('kepala sekolah'));

      // Jika barang memiliki faktor konversi (misal 1 lusin/pack = 12 pcs), hitung total volume distribusi
      const faktor = item.faktorKonversi && item.faktorKonversi > 0 ? item.faktorKonversi : 1;
      const totalVolDistribusi = item.totalVolume * faktor;

      if (recipients.length === 0 || totalVolDistribusi <= 0) {
        return { ...item, targetTags: itemTags, alokasi: [] };
      }

      // Hitung jatah proporsional dalam satuan distribusi (pcs/batang/buah)
      const jatahRata = Math.floor(totalVolDistribusi / recipients.length);
      const sisa = totalVolDistribusi % recipients.length;

      // Buat alokasi untuk penerima yang cocok
      const alokasi: LogistikItemAlokasi[] = recipients.map((p, idx) => {
        const qty = jatahRata + (idx < sisa ? 1 : 0);
        
        // Tentukan keperluan sesuai peran personel
        let kep = item.keperluanDefault;
        const pTags = p.tags || [];
        if (pTags.includes('PETUGAS_KEBERSIHAN')) {
          kep = 'Pemeliharaan Sanitasi & Kebersihan Lingkungan Sekolah';
        } else if (pTags.includes('TIM_BOSP')) {
          kep = 'Pengelolaan Administrasi SPJ & Pembukuan BOSP';
        } else if (pTags.includes('PANITIA_KEGIATAN')) {
          kep = 'Operasional Pelaksanaan Kegiatan / Asesmen';
        } else if (pTags.includes('GURU_KELAS')) {
          kep = 'Kegiatan Belajar Mengajar & Administrasi Kelas';
        } else if (pTags.includes('GURU_MAPEL')) {
          kep = 'Praktik & Pembelajaran Mata Pelajaran';
        }

        return {
          personId: p.id,
          personName: p.nama,
          jabatan: p.jabatan,
          nip: p.nip,
          qty,
          keperluan: kep,
          status: 'Disetujui'
        };
      });

      return {
        ...item,
        targetTags: itemTags,
        alokasi
      };
    });
  };

  // State Barang yang dimanage & tersinkronisasi dengan Database Firestore & LocalStorage
  const [barangList, setBarangList] = useState<LogistikBarang[]>(() => {
    const existingMonthData = monthlyLogistikStore[currentMonthIndex];
    if (existingMonthData && existingMonthData.barangList && existingMonthData.barangList.length > 0) {
      return existingMonthData.barangList;
    }
    return smartAutoDistributeHelper(extractedFromBku, personnelList);
  });

  // Live Synchronous References untuk mencegah stale closure saat perpindahan bulan atau async callback
  const monthlyStoreRef = useRef<Record<number, MonthLogistikData>>(monthlyLogistikStore);
  const barangListRef = useRef<LogistikBarang[]>(barangList);
  const configRef = useRef<DokumenLogistikConfig>(config);
  const printSettingsRef = useRef<PrintPreviewSettings>(printSettings);
  const currentMonthRef = useRef<number>(currentMonthIndex);
  const lastBkuMonthRef = useRef<number>(currentMonthIndex);
  const isCloudReadyRef = useRef<boolean>(false);

  useEffect(() => {
    monthlyStoreRef.current = monthlyLogistikStore;
  }, [monthlyLogistikStore]);

  useEffect(() => {
    barangListRef.current = barangList;
  }, [barangList]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    printSettingsRef.current = printSettings;
  }, [printSettings]);

  // Helper Simpan State Logistik ke Toko Bulanan & Database Firestore (Dapat langsung/immediate atau debounce)
  const persistLogistikState = async (
    updatedBarangList: LogistikBarang[],
    updatedConfig: DokumenLogistikConfig = configRef.current,
    updatedPrintSettings: PrintPreviewSettings = printSettingsRef.current,
    immediateCloudSave: boolean = false
  ) => {
    const activeMonth = currentMonthRef.current;
    const updatedMonthData: MonthLogistikData = {
      monthIndex: activeMonth,
      barangList: updatedBarangList,
      config: updatedConfig,
      printSettings: updatedPrintSettings,
      updatedAt: new Date().toISOString()
    };

    const newStore: Record<number, MonthLogistikData> = {
      ...monthlyStoreRef.current,
      [activeMonth]: updatedMonthData
    };

    // Update state dan ref seketika
    monthlyStoreRef.current = newStore;
    barangListRef.current = updatedBarangList;
    configRef.current = updatedConfig;
    printSettingsRef.current = updatedPrintSettings;
    setMonthlyLogistikStore(newStore);

    // Simpan ke LocalStorage per-sekolah & Firestore (kecuali readOnly)
    if (readOnly) {
      return;
    }

    writeLS(schoolId, 'monthly_logistik_store', newStore);
    removeLS(schoolId, 'managed_barang_list');

    // Simpan ke Firestore (granular hanya untuk bulan aktif)
    if (immediateCloudSave) {
      try {
        setCloudSyncStatus('syncing');
        await saveLogistikMonthToFirestore(schoolId, activeMonth, updatedMonthData);
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      } catch (err) {
        if (isOfflineError(err)) {
          console.warn('Simpan langsung logistik beralih ke mode offline:', err);
          setCloudSyncStatus('offline');
        } else {
          console.error('Gagal simpan langsung ke Firestore:', err);
          setCloudSyncStatus('error');
        }
      }
    } else {
      debounceSaveLogistikMonthToFirestore(schoolId, activeMonth, updatedMonthData, (st) => {
        setCloudSyncStatus(st);
        if (st === 'synced') setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      });
    }
  };

  // Muat data dari Firestore Cloud + berlangganan realtime saat komponen dimount atau saat schoolId berganti
  useEffect(() => {
    let isMounted = true;
    isCloudReadyRef.current = false;
    setCloudSyncStatus('syncing');

    const monthContentHash = (m?: MonthLogistikData | null) =>
      m
        ? computeSyncHash({
            barangList: m.barangList || [],
            config: m.config || null,
            printSettings: m.printSettings || null
          })
        : '';

    const applyCloudMonths = (cloudData: Record<number, MonthLogistikData>, isInitial: boolean) => {
      if (!isMounted || !cloudData || typeof cloudData !== 'object') return;

      const merged: Record<number, MonthLogistikData> = { ...monthlyStoreRef.current };
      let anyChanged = false;
      let activeMonthChanged = false;
      const activeMonth = currentMonthRef.current;

      Object.keys(cloudData).forEach((mKey) => {
        const numKey = Number(mKey);
        if (!Number.isFinite(numKey)) return;
        if (hasPendingSaveChannel(schoolId, `logistik_m${numKey}`)) return;

        const remoteMonth = cloudData[numKey];
        if (!remoteMonth) return;

        const localMonth = merged[numKey];
        const remoteHash = monthContentHash(remoteMonth);
        const localHash = monthContentHash(localMonth);

        const shouldApply = isInitial
          ? !localMonth || new Date(remoteMonth.updatedAt || 0) >= new Date(localMonth.updatedAt || 0)
          : remoteHash !== localHash;

        if (shouldApply) {
          merged[numKey] = remoteMonth;
          anyChanged = true;
          if (numKey === activeMonth) {
            activeMonthChanged = true;
          }
        }
      });

      if (anyChanged) {
        monthlyStoreRef.current = merged;
        setMonthlyLogistikStore(merged);
        writeLS(schoolId, 'monthly_logistik_store', merged);

        if (activeMonthChanged) {
          const activeCloudMonth = merged[activeMonth];
          if (activeCloudMonth) {
            if (Array.isArray(activeCloudMonth.barangList)) {
              setBarangList(activeCloudMonth.barangList);
              barangListRef.current = activeCloudMonth.barangList;
            }
            if (activeCloudMonth.config) {
              setConfig(activeCloudMonth.config);
              configRef.current = activeCloudMonth.config;
            }
            if (activeCloudMonth.printSettings) {
              setPrintSettings(activeCloudMonth.printSettings);
              printSettingsRef.current = activeCloudMonth.printSettings;
            }
          }
        }
      }
    };

    fetchLogistikFromFirestore(schoolId)
      .then((cloudData) => {
        if (!isMounted) return;
        if (cloudData) {
          applyCloudMonths(cloudData, true);
        }
        isCloudReadyRef.current = true;
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      })
      .catch((err) => {
        console.warn('Error fetching cloud logistik:', err);
        if (isMounted) {
          isCloudReadyRef.current = true;
          setCloudSyncStatus('synced');
        }
      });

    const unsubscribe = subscribeToLogistikData(
      schoolId,
      (remoteMonths) => {
        if (!isMounted) return;
        applyCloudMonths(remoteMonths, false);
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
      },
      (st) => {
        if (isMounted) setCloudSyncStatus(st);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [schoolId]);

  // Efek Perpindahan Bulan: Menjamin data distribusi bulan sebelumnya tersimpan hanya jika memang berubah,
  // dan memuat data distribusi bulan baru tanpa menimpa data anggota tim lain.
  const prevMonthRef = useRef<number>(currentMonthIndex);

  useEffect(() => {
    if (prevMonthRef.current !== currentMonthIndex) {
      const prevMonth = prevMonthRef.current;
      prevMonthRef.current = currentMonthIndex;
      currentMonthRef.current = currentMonthIndex;
      lastBkuMonthRef.current = currentMonthIndex;

      let updatedStore = monthlyStoreRef.current;
      if (!readOnly && isCloudReadyRef.current) {
        const existingPrev = monthlyStoreRef.current[prevMonth];
        const prevContentChanged =
          !existingPrev ||
          computeSyncHash({
            barangList: existingPrev.barangList || [],
            config: existingPrev.config || null,
            printSettings: existingPrev.printSettings || null
          }) !==
            computeSyncHash({
              barangList: barangListRef.current || [],
              config: configRef.current || null,
              printSettings: printSettingsRef.current || null
            });

        if (prevContentChanged || hasPendingSaveChannel(schoolId, `logistik_m${prevMonth}`)) {
          const prevData: MonthLogistikData = {
            monthIndex: prevMonth,
            barangList: barangListRef.current,
            config: configRef.current,
            printSettings: printSettingsRef.current,
            updatedAt: new Date().toISOString()
          };

          updatedStore = {
            ...monthlyStoreRef.current,
            [prevMonth]: prevData
          };
          monthlyStoreRef.current = updatedStore;
          setMonthlyLogistikStore(updatedStore);
          writeLS(schoolId, 'monthly_logistik_store', updatedStore);

          saveLogistikMonthToFirestore(schoolId, prevMonth, prevData).catch((e) =>
            console.warn('Sync prev month failed:', e)
          );
        }
      }

      // 2. Muat data bulan yang baru dipilih dari updatedStore atau LocalStorage
      let targetMonthData = updatedStore[currentMonthIndex];
      if (!targetMonthData) {
        const parsed = readLS<Record<number, MonthLogistikData>>(schoolId, 'monthly_logistik_store', {});
        if (parsed && parsed[currentMonthIndex]) {
          targetMonthData = parsed[currentMonthIndex];
        }
      }

      if (targetMonthData && targetMonthData.barangList && targetMonthData.barangList.length > 0) {
        // Bulan ini sudah ada data tersimpan! Muat data yang sudah dikelola, JANGAN timpa jatah guru!
        const existingIds = new Set(targetMonthData.barangList.map((b) => b.id));
        const newBkuItems = extractedFromBku.filter((b) => !existingIds.has(b.id));

        let finalBarangList = targetMonthData.barangList;
        if (newBkuItems.length > 0) {
          const newlyDistributed = smartAutoDistributeHelper(newBkuItems, personnelList);
          finalBarangList = [...targetMonthData.barangList, ...newlyDistributed];
        }

        setBarangList(finalBarangList);
        barangListRef.current = finalBarangList;
        if (targetMonthData.config) {
          setConfig(targetMonthData.config);
          configRef.current = targetMonthData.config;
        }
        if (targetMonthData.printSettings) {
          setPrintSettings(targetMonthData.printSettings);
          printSettingsRef.current = targetMonthData.printSettings;
        }
      } else {
        // Belum pernah ada data tersimpan untuk bulan ini: baru lakukan auto-distribusi awal dari BKU
        const initialDist = smartAutoDistributeHelper(extractedFromBku, personnelList);
        setBarangList(initialDist);
        barangListRef.current = initialDist;

        if (!readOnly && isCloudReadyRef.current) {
          // Simpan inisialisasi awal ke store bulan ini agar saat berpindah lagi tidak hilang
          const newMonthData: MonthLogistikData = {
            monthIndex: currentMonthIndex,
            barangList: initialDist,
            config: configRef.current,
            printSettings: printSettingsRef.current,
            updatedAt: new Date().toISOString()
          };
          const storeWithNew = {
            ...updatedStore,
            [currentMonthIndex]: newMonthData
          };
          monthlyStoreRef.current = storeWithNew;
          setMonthlyLogistikStore(storeWithNew);
          writeLS(schoolId, 'monthly_logistik_store', storeWithNew);
          saveLogistikMonthToFirestore(schoolId, currentMonthIndex, newMonthData).catch((e) =>
            console.warn('Save initial new month failed:', e)
          );
        }
      }
    }
  }, [currentMonthIndex]);

  // Reaktif cerdas terhadap perubahan transaksi BKU untuk bulan yang sedang aktif:
  // - Hanya berjalan jika bulan TIDAK sedang berganti dan initial cloud fetch sudah selesai
  // - Jika BKU kosong (data BKU dihapus), kosongkan list
  // - Jika ada item baru di BKU yang belum ada di daftar logistik, tambahkan tanpa merusak jatah yang sudah dikelola
  useEffect(() => {
    // Jika efek dipicu oleh pergantian bulan, abaikan karena ditangani oleh efek perpindahan bulan
    if (lastBkuMonthRef.current !== currentMonthIndex) {
      lastBkuMonthRef.current = currentMonthIndex;
      return;
    }

    if (extractedFromBku.length === 0) {
      if (barangListRef.current.length > 0) {
        setBarangList([]);
        if (!readOnly && isCloudReadyRef.current) {
          persistLogistikState([], configRef.current, printSettingsRef.current, true);
        }
      }
      return;
    }

    const currentList = barangListRef.current;
    if (currentList.length === 0) {
      const stored = monthlyStoreRef.current[currentMonthIndex];
      if (stored && stored.barangList && stored.barangList.length > 0) {
        setBarangList(stored.barangList);
        barangListRef.current = stored.barangList;
        return;
      }
      const initialDist = smartAutoDistributeHelper(extractedFromBku, personnelList);
      setBarangList(initialDist);
      if (!readOnly && isCloudReadyRef.current) {
        persistLogistikState(initialDist, configRef.current, printSettingsRef.current, true);
      }
      return;
    }

    // Periksa apakah ada barang baru dari BKU yang belum ada di barangList saat ini
    const currentIdMap = new Map(currentList.map((b) => [b.id, b]));
    let hasNewItems = false;
    const mergedList = [...currentList];

    extractedFromBku.forEach((bkuItem) => {
      if (!currentIdMap.has(bkuItem.id)) {
        const newlyDist = smartAutoDistributeHelper([bkuItem], personnelList)[0];
        mergedList.push(newlyDist);
        hasNewItems = true;
      }
    });

    if (hasNewItems) {
      setBarangList(mergedList);
      if (!readOnly) {
        persistLogistikState(mergedList, configRef.current, printSettingsRef.current, true);
      }
    }
  }, [extractedFromBku, personnelList, currentMonthIndex]);

  // Trigger Smart Auto Distribution
  const handleRunSmartAutoDistribute = () => {
    if (readOnly) return;
    const newlyDistributed = smartAutoDistributeHelper(barangList, personnelList);
    setBarangList(newlyDistributed);
    persistLogistikState(newlyDistributed, configRef.current, printSettingsRef.current, true);
  };

  // Trigger Sync with BKU Data
  const handleSyncWithBku = () => {
    if (readOnly) return;
    const newlyDistributed = smartAutoDistributeHelper(extractedFromBku, personnelList);
    setBarangList(newlyDistributed);
    persistLogistikState(newlyDistributed, configRef.current, printSettingsRef.current, true);
  };

  // Force Simpan Manual Langsung ke Firestore Cloud Database
  const handleForceSyncDatabase = async () => {
    if (readOnly) return;
    setCloudSyncStatus('syncing');
    const currentMonthData: MonthLogistikData = {
      monthIndex: currentMonthIndex,
      barangList: barangListRef.current,
      config: configRef.current,
      printSettings: printSettingsRef.current,
      updatedAt: new Date().toISOString()
    };
    const currentStore = {
      ...monthlyStoreRef.current,
      [currentMonthIndex]: currentMonthData
    };
    try {
      await saveLogistikMonthToFirestore(schoolId, currentMonthIndex, currentMonthData);
      monthlyStoreRef.current = currentStore;
      setMonthlyLogistikStore(currentStore);
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      if (isOfflineError(e)) {
        console.warn('Manual sync logistik beralih ke mode offline:', e);
        setCloudSyncStatus('offline');
      } else {
        console.error('Failed manual sync to database:', e);
        setCloudSyncStatus('error');
      }
    }
  };

  // Handler Update Pengaturan Cetak Preview
  const handleUpdatePrintSettings = (newSettings: Partial<PrintPreviewSettings>) => {
    const updated: PrintPreviewSettings = {
      ...printSettings,
      ...newSettings
    };
    setPrintSettings(updated);
    if (!readOnly) {
      writeLS(schoolId, 'print_preview_settings', updated);
      persistLogistikState(barangList, config, updated);
    }
  };

  // Dialog State
  const [editingItem, setEditingItem] = useState<LogistikBarang | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [isPrintAllMode, setIsPrintAllMode] = useState<boolean>(false);

  // New Item Form
  const [newItemForm, setNewItemForm] = useState<Partial<LogistikBarang>>({
    namaBarang: '',
    spesifikasi: 'Belanja BOSP',
    kategori: 'ATK',
    satuan: 'buah',
    totalVolume: 10,
    hargaSatuan: 10000,
    kodeRekening: '5.1.02.01.01.0024',
    targetTags: ['GURU_KELAS', 'GURU_MAPEL'],
    keperluanDefault: 'Kegiatan Belajar Mengajar'
  });

  // Toggle Target Tag on an item directly
  const handleToggleItemTargetTag = (itemId: string, tagId: string) => {
    if (readOnly) return;
    const updated = barangList.map((item) => {
      if (item.id === itemId) {
        const currentTags = item.targetTags || [];
        const exists = currentTags.includes(tagId);
        const newTags = exists
          ? currentTags.filter((t) => t !== tagId)
          : [...currentTags, tagId];
        return { ...item, targetTags: newTags };
      }
      return item;
    });
    setBarangList(updated);
    persistLogistikState(updated);
  };

  // Filter List Barang
  const filteredBarangList = useMemo(() => {
    return barangList.filter((b) => {
      const matchKat = filterKategori === 'SEMUA' || b.kategori === filterKategori;
      const matchTag =
        filterTag === 'SEMUA_TAG' ||
        (b.targetTags || []).includes(filterTag);
      const matchSearch =
        searchQuery === '' ||
        (b.namaBarang && b.namaBarang.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.kodeRekening && b.kodeRekening.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.noBku || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchKat && matchTag && matchSearch;
    });
  }, [barangList, filterKategori, filterTag, searchQuery]);

  // Sinkronisasi alokasi di barangList: Jika seorang guru dihapus dari Data Master Guru,
  // maka seluruh alokasi barang ke guru tersebut otomatis terhapus seketika
  useEffect(() => {
    const teacherIdSet = new Set((teachers || []).map((t) => t.id));
    setBarangList((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        const validAlloc = (item.alokasi || []).filter((al) => teacherIdSet.has(al.personId));
        if (validAlloc.length !== (item.alokasi || []).length) {
          changed = true;
          return { ...item, alokasi: validAlloc };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, [teachers]);

  // Daftar Guru / Personel yang menerima alokasi barang (Strict: hanya yang ada di Data Master)
  const recipientList = useMemo(() => {
    const teacherIdSet = new Set((teachers || []).map((t) => t.id));
    const map = new Map<string, { id: string; nama: string; jabatan: string; nip: string; totalItems: number; tags: string[] }>();

    barangList.forEach((b) => {
      b.alokasi.forEach((al) => {
        // HANYA proses jika alokasi > 0 dan guru BENAR-BENAR ada di Data Master
        if (al.qty > 0 && al.status === 'Disetujui' && teacherIdSet.has(al.personId)) {
          const personObj = personnelList.find((p) => p.id === al.personId);
          const existing = map.get(al.personId);
          if (existing) {
            existing.totalItems += 1;
          } else {
            map.set(al.personId, {
              id: al.personId,
              nama: personObj ? personObj.nama : al.personName,
              jabatan: personObj ? personObj.jabatan : al.jabatan,
              nip: personObj ? personObj.nip : al.nip,
              totalItems: 1,
              tags: personObj?.tags || []
            });
          }
        }
      });
    });

    return Array.from(map.values());
  }, [barangList, personnelList, teachers]);

  // Set default selected person jika belum terpilih
  useEffect(() => {
    if (recipientList.length > 0) {
      if (!selectedPersonId || !recipientList.some((r) => r.id === selectedPersonId)) {
        setSelectedPersonId(recipientList[0].id);
      }
    } else {
      setSelectedPersonId('');
    }
  }, [recipientList, selectedPersonId]);

  // Susun data Dokumen Tripartit untuk setiap guru penerima
  const allGuruDocuments: DokumenGuruData[] = useMemo(() => {
    const totalGuru = recipientList.length;
    const noAwal = Number(config.noMintaStart) || 174;

    return recipientList.map((recip, idx) => {
      const items = barangList
        .map((b) => {
          const alloc = b.alokasi.find((a) => a.personId === recip.id && a.qty > 0 && a.status === 'Disetujui');
          if (alloc) {
            const displaySatuan = b.satuanDistribusi || b.satuan || 'buah';
            return {
              no: 0,
              namaBarang: b.namaBarang,
              spesifikasi: b.spesifikasi || '-',
              jumlah: alloc.qty,
              satuan: displaySatuan,
              keperluan: alloc.keperluan || b.keperluanDefault || '-'
            };
          }
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .map((it, i) => ({ ...it, no: i + 1 }));

      return {
        personId: recip.id,
        namaGuru: recip.nama,
        nip: recip.nip,
        jabatan: recip.jabatan,
        noPermintaan: noAwal + idx,
        noVerifikasi: noAwal + totalGuru + idx,
        noBast: noAwal + (2 * totalGuru) + idx,
        items
      };
    });
  }, [recipientList, barangList, config.noMintaStart]);

  const currentGuruDoc = allGuruDocuments.find((d) => d.personId === selectedPersonId) || allGuruDocuments[0];

  // Helper Simpan Perubahan Alokasi Barang
  const handleSaveAllocations = async (updatedItem: LogistikBarang) => {
    if (readOnly) return;
    const cleanedItem: LogistikBarang = {
      ...updatedItem,
      alokasi: (updatedItem.alokasi || []).filter((a) => a.qty > 0)
    };
    const updated = barangList.map((item) => (item.id === cleanedItem.id ? cleanedItem : item));
    setBarangList(updated);
    barangListRef.current = updated;
    setEditingItem(null);
    await persistLogistikState(updated, configRef.current, printSettingsRef.current, true);
  };

  // State Modal Penyesuaian Jatah Guru Tertentu
  const [editingTeacherAllocations, setEditingTeacherAllocations] = useState<MasterGuru | null>(null);
  const [teacherAllocTemp, setTeacherAllocTemp] = useState<Record<string, { qty: number; keperluan: string }>>({});
  const [teacherAllocSearch, setTeacherAllocSearch] = useState('');

  const handleOpenTeacherAllocModal = (t: MasterGuru) => {
    const temp: Record<string, { qty: number; keperluan: string }> = {};
    barangList.forEach((b) => {
      const existing = (b.alokasi || []).find((a) => a.personId === t.id);
      temp[b.id] = {
        qty: existing ? existing.qty : 0,
        keperluan: existing?.keperluan || b.keperluanDefault || 'Kegiatan Belajar Mengajar'
      };
    });
    setTeacherAllocTemp(temp);
    setTeacherAllocSearch('');
    setEditingTeacherAllocations(t);
  };

  const handleSaveTeacherAllocModal = async () => {
    if (readOnly || !editingTeacherAllocations) return;
    const t = editingTeacherAllocations;

    const updatedList = barangList.map((b) => {
      const itemAlloc = [...(b.alokasi || [])];
      const foundIdx = itemAlloc.findIndex((a) => a.personId === t.id);
      const conf = teacherAllocTemp[b.id] || { qty: 0, keperluan: b.keperluanDefault || 'KBM' };

      if (conf.qty > 0) {
        if (foundIdx >= 0) {
          itemAlloc[foundIdx] = {
            ...itemAlloc[foundIdx],
            qty: conf.qty,
            keperluan: conf.keperluan,
            status: 'Disetujui'
          };
        } else {
          itemAlloc.push({
            personId: t.id,
            personName: t.nama,
            jabatan: t.jabatan,
            nip: t.nip,
            qty: conf.qty,
            keperluan: conf.keperluan,
            status: 'Disetujui'
          });
        }
      } else {
        if (foundIdx >= 0) {
          itemAlloc.splice(foundIdx, 1);
        }
      }

      return {
        ...b,
        alokasi: itemAlloc.filter((a) => a.qty > 0)
      };
    });

    setBarangList(updatedList);
    barangListRef.current = updatedList;
    setEditingTeacherAllocations(null);
    await persistLogistikState(updatedList, configRef.current, printSettingsRef.current, true);
  };

  const handleClearAllAllocationsForTeacher = async (teacherId: string) => {
    if (readOnly) return;
    const t = personnelList.find((p) => p.id === teacherId);
    const teacherName = t ? t.nama : 'guru ini';
    if (
      !window.confirm(
        `Yakin ingin mengosongkan dan menghapus semua jatah barang untuk ${teacherName}? Perubahan akan langsung disimpan ke database.`
      )
    ) {
      return;
    }

    const updatedList = barangList.map((b) => ({
      ...b,
      alokasi: (b.alokasi || []).filter((a) => a.personId !== teacherId)
    }));

    setBarangList(updatedList);
    barangListRef.current = updatedList;
    await persistLogistikState(updatedList, configRef.current, printSettingsRef.current, true);
  };

  // Helper Tambah Barang Baru
  const handleCreateNewItem = async () => {
    if (readOnly || !newItemForm.namaBarang) return;

    const rawSatuan = newItemForm.satuan || 'buah';
    const defaultKonv = detectDefaultKonversi(rawSatuan, newItemForm.namaBarang);

    const newItem: LogistikBarang = {
      id: `manual-${Date.now()}`,
      namaBarang: newItemForm.namaBarang || 'Barang Baru',
      spesifikasi: newItemForm.spesifikasi || 'Pengadaan BOSP',
      kategori: (newItemForm.kategori as 'ATK' | 'ALKEB') || 'ATK',
      satuan: rawSatuan,
      totalVolume: Number(newItemForm.totalVolume) || 1,
      sisaLalu: 0,
      hargaSatuan: Number(newItemForm.hargaSatuan) || 0,
      kodeRekening: newItemForm.kodeRekening || '5.1.02.01.01.0024',
      kodeKegiatan: newItemForm.kategori === 'ATK' ? '06.05.08.' : '06.05.09.',
      tanggalBelanja: '01-03-2026',
      targetTags: newItemForm.targetTags || ['GURU_KELAS'],
      faktorKonversi: defaultKonv.faktor,
      satuanDistribusi: defaultKonv.satuanDistribusi,
      keperluanDefault: newItemForm.keperluanDefault || 'Kegiatan Belajar Mengajar',
      alokasi: []
    };

    const autoDistributedItem = smartAutoDistributeHelper([newItem], personnelList)[0];
    const updated = [autoDistributedItem, ...barangList];
    setBarangList(updated);
    barangListRef.current = updated;
    setShowAddItemModal(false);
    setNewItemForm({
      namaBarang: '',
      spesifikasi: 'Belanja BOSP',
      kategori: 'ATK',
      satuan: 'buah',
      totalVolume: 10,
      hargaSatuan: 10000,
      kodeRekening: '5.1.02.01.01.0024',
      targetTags: ['GURU_KELAS', 'GURU_MAPEL'],
      keperluanDefault: 'Kegiatan Belajar Mengajar'
    });
    await persistLogistikState(updated, configRef.current, printSettingsRef.current, true);
  };

  const handleDeleteItem = async (id: string) => {
    if (readOnly) return;
    if (confirm('Hapus barang ini dari daftar logistik persediaan?')) {
      const updated = barangList.filter((b) => b.id !== id);
      setBarangList(updated);
      barangListRef.current = updated;
      await persistLogistikState(updated, configRef.current, printSettingsRef.current, true);
    }
  };

  const handlePrintSingle = () => {
    setIsPrintAllMode(false);
    const originalTitle = document.title;
    document.title = ' ';
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  const handlePrintAll = () => {
    setIsPrintAllMode(true);
    const originalTitle = document.title;
    document.title = ' ';
    setTimeout(() => {
      window.print();
      setIsPrintAllMode(false);
      document.title = originalTitle;
    }, 250);
  };

  // Metrics
  const totalItems = barangList.length;
  const totalVolumeSemua = barangList.reduce((acc, curr) => acc + curr.totalVolume, 0);
  const totalNilaiBelanja = barangList.reduce((acc, curr) => acc + (curr.totalVolume * (curr.hargaSatuan || 0)), 0);

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
      {/* 12-Month Calendar Grid (Compact mode in LPJ) */}
      {monthlyStore && onSelectMonthIndex && (
        <div className="no-print">
          <TwelveMonthGrid
            compact={true}
            monthlyStore={monthlyStore}
            activeMonthIndex={activeMonthIndex || 2}
            onSelectMonthIndex={onSelectMonthIndex}
            onDeleteMonthIndex={() => {}}
          />
        </div>
      )}

      {/* Legacy Monthly Archive Selector for fallback */}
      {!monthlyStore && monthlyArchives && monthlyArchives.length > 0 && onSelectMonth && (
        <div className="no-print">
          <MonthlyArchiveCards
            compact={true}
            archives={monthlyArchives}
            activeMonthId={activeMonthId || null}
            onSelectMonth={onSelectMonth}
            onDeleteMonth={() => {}}
          />
        </div>
      )}

      {/* Top Banner & Main Sub-Tab Navigation (Unified Section) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                <FolderSync className="w-3.5 h-3.5" />
                Data Terintegrasi RKAS &amp; BKU
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">Logistik, BAST &amp; Tag-Based Distribution</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-600" />
              LPJ ALKEB &amp; ATK (Kelola Distribusi, BAST &amp; Opname)
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Kelola pembagian jatah barang BKU/RKAS secara presisi menggunakan sistem <strong>Tag Peran Guru/Staf</strong> (Guru Kelas, Guru Mapel, Petugas Kebersihan, Tim BOSP, Panitia). Cetak berkas BAST tripartit 3 halaman per guru &amp; rekap stock opname persediaan.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-right">
              <div className="text-[10px] text-slate-500 font-medium">Total Nilai Barang</div>
              <div className="text-sm font-bold text-emerald-700 font-mono">{formatRupiah(totalNilaiBelanja)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl text-right">
              <div className="text-[10px] text-slate-500 font-medium">Penerima Terdaftar</div>
              <div className="text-sm font-bold text-indigo-700 font-mono">{recipientList.length} Personel</div>
            </div>
          </div>
        </div>

        {/* Unified Sub-Tabs Navigation */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveSubTab('kelola')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'kelola'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              1. Kelola Distribusi &amp; Tag ({totalItems})
            </button>

            <button
              onClick={() => setActiveSubTab('dokumen-guru')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'dokumen-guru'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              2. BAST Per Guru ({recipientList.length} Org)
            </button>

            <button
              onClick={() => setActiveSubTab('opname')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'opname'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              3. Rekap Stock Opname
            </button>

            <button
              onClick={() => setActiveSubTab('lpj-atk')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'lpj-atk'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-teal-400" />
              4. Laporan LPJ ATK
            </button>

            <button
              onClick={() => setActiveSubTab('lpj-alkeb')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                activeSubTab === 'lpj-alkeb'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Brush className="w-3.5 h-3.5 text-cyan-400" />
              5. Laporan LPJ ALKEB
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Database Cloud Sync Status & Manual Save Trigger */}
            <button
              onClick={handleForceSyncDatabase}
              disabled={readOnly || cloudSyncStatus === 'syncing'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                cloudSyncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title={lastSyncedAt ? `Terakhir tersinkron ke cloud: ${lastSyncedAt}` : 'Simpan data distribusi ke Firestore Database'}
            >
              {cloudSyncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              ) : cloudSyncStatus === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>
                {cloudSyncStatus === 'syncing'
                  ? 'Menyimpan...'
                  : cloudSyncStatus === 'error'
                  ? 'Gagal Sync (Klik Ulang)'
                  : 'Database Tersimpan'}
              </span>
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Atur Pejabat BAST &amp; No. Surat
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SUB-TAB 1: KELOLA DISTRIBUSI, TAG BARANG & TAG PERSONEL */}
      {/* ======================================================================= */}
      {activeSubTab === 'kelola' && (
        <div className="space-y-6 no-print">
          {/* Inner Mode Switcher: Kelola Barang vs Kelola Tag Personel */}
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Mode Manajemen Distribusi &amp; Tag
                </h3>
                <p className="text-xs text-slate-300">
                  Pilih antara mengatur target tag pada barang belanja, atau mengelola tag peran guru/staf penerima.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-2xl border border-slate-700">
              <button
                onClick={() => setKelolaViewMode('barang')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  kelolaViewMode === 'barang'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                📦 Kelola Barang &amp; Target Tag ({totalItems})
              </button>

              <button
                onClick={() => setKelolaViewMode('tag-personel')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  kelolaViewMode === 'tag-personel'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                👥 Kelola Tag Personel / Guru ({personnelList.length})
              </button>
            </div>
          </div>

          {/* VIEW A: KELOLA BARANG & TARGET TAG */}
          {kelolaViewMode === 'barang' && (
            <div className="space-y-6">
              {/* Action Toolbar & Filters */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Category Filter & Search */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                      <button
                        onClick={() => setFilterKategori('SEMUA')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          filterKategori === 'SEMUA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semua ({barangList.length})
                      </button>
                      <button
                        onClick={() => setFilterKategori('ATK')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          filterKategori === 'ATK' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ATK ({barangList.filter(b => b.kategori === 'ATK').length})
                      </button>
                      <button
                        onClick={() => setFilterKategori('ALKEB')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                          filterKategori === 'ALKEB' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ALKEB ({barangList.filter(b => b.kategori === 'ALKEB').length})
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari barang persediaan..."
                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs w-52 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Primary Actions: Smart Auto Distribute & Add Item */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleRunSmartAutoDistribute}
                      disabled={readOnly}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer animate-pulse disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
                      title="Membagikan seluruh barang otomatis hanya ke guru/staf yang memiliki tag yang sesuai"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      🚀 Auto-Distribusi Cerdas (Sesuai Tag)
                    </button>

                    <button
                      onClick={handleSyncWithBku}
                      disabled={readOnly}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Tarik kembali data belanja murni dari BKU & RKAS"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset dari BKU
                    </button>

                    <button
                      onClick={() => setShowAddItemModal(true)}
                      disabled={readOnly}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Barang
                    </button>
                  </div>
                </div>

                {/* Tag Filter Pills Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    Filter Target Tag:
                  </span>
                  <button
                    onClick={() => setFilterTag('SEMUA_TAG')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      filterTag === 'SEMUA_TAG'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua Target Tag
                  </button>
                  {STANDARD_LOGISTIK_TAGS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFilterTag(t.id as string)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        filterTag === t.id
                          ? `${t.colorBadge} ring-1 ring-current font-bold shadow-2xs`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Peringatan Data Master Guru Kosong */}
              {personnelList.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">Data Master Guru Masih Kosong</h4>
                      <p className="text-[11.5px] text-amber-700 mt-0.5">
                        Distribusi ATK dan ALKEB hanya dapat diberikan kepada guru yang sudah terdaftar di <strong>Data Master</strong>. Silakan masukkan data guru terlebih dahulu agar barang dapat dialokasikan.
                      </p>
                    </div>
                  </div>
                  {onNavigateToMaster && (
                    <button
                      type="button"
                      onClick={onNavigateToMaster}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Input Guru di Data Master</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Daftar Barang Belanja Persediaan &amp; Tag Peruntukan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Klik tag pada barang untuk menambah/menghapus peran target penerima, atau klik &ldquo;Kelola Penerima &amp; Jatah&rdquo; untuk mengubah rincian per orang.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200 shrink-0">
                    Menampilkan {filteredBarangList.length} barang
                  </span>
                </div>

                <div className="divide-y divide-slate-200">
                  {filteredBarangList.length > 0 ? (
                    filteredBarangList.map((item, idx) => {
                      const faktor = item.faktorKonversi && item.faktorKonversi > 0 ? item.faktorKonversi : 1;
                      const targetTotalDistribusi = item.totalVolume * faktor;
                      const unitDistribusi = item.satuanDistribusi || item.satuan || 'buah';
                      const isConverted = faktor > 1;

                      const totalAllocated = item.alokasi.reduce((acc, curr) => acc + (curr.status === 'Disetujui' ? curr.qty : 0), 0);
                      const sisaUnallocated = targetTotalDistribusi - totalAllocated;
                      const itemTags = item.targetTags || [];

                      // Hitung berapa guru yang memenuhi kriteria tag ini
                      const matchingStaff = personnelList.filter((p) => {
                        const isKepsek = (p.jabatan || '').toLowerCase().includes('kepala sekolah');
                        if (isKepsek && !(p.tags || []).includes('TIM_BOSP')) return false;
                        return (p.tags || []).some((pt) => itemTags.includes(pt));
                      });

                      return (
                        <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            {/* Left: Info Barang & Quick Tag Toggles */}
                            <div className="space-y-2 max-w-xl">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  item.kategori === 'ALKEB' ? 'bg-cyan-100 text-cyan-800' : 'bg-teal-100 text-teal-800'
                                }`}>
                                  {item.kategori}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900">{item.namaBarang}</h4>
                                {isConverted && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Konversi: 1 {item.satuan} = {faktor} {unitDistribusi}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono">
                                <span>Vol Beli BKU: <strong className="text-slate-800">{item.totalVolume} {item.satuan}</strong></span>
                                {isConverted && (
                                  <>
                                    <span>&rarr;</span>
                                    <span className="text-indigo-800 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                                      Jatah Bagi: {targetTotalDistribusi} {unitDistribusi}
                                    </span>
                                  </>
                                )}
                                <span>&bull;</span>
                                <span>Harga: <strong>{formatRupiah(item.hargaSatuan || 0)}</strong> / {item.satuan}</span>
                                <span>&bull;</span>
                                <span>Rekening: <span className="text-slate-600">{item.kodeRekening}</span></span>
                                {item.noBku && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">{item.noBku}</span>
                                  </>
                                )}
                              </div>

                              {/* Target Tag Selector Pills for this Item */}
                              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                                  Target Penerima:
                                </span>
                                {STANDARD_LOGISTIK_TAGS.map((tagDef) => {
                                  const isTagActive = itemTags.includes(tagDef.id as string);
                                  return (
                                    <button
                                      key={tagDef.id}
                                      disabled={readOnly}
                                      onClick={() => handleToggleItemTargetTag(item.id, tagDef.id as string)}
                                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                        isTagActive
                                          ? `${tagDef.colorBadge} ring-1 ring-inset ${tagDef.colorBorder} font-bold shadow-2xs`
                                          : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                                      }`}
                                      title={`Klik untuk ${isTagActive ? 'menghapus' : 'menambahkan'} target tag ini`}
                                    >
                                      {tagDef.shortLabel} {isTagActive ? '✓' : '+'}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Matching personnel hint */}
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                {matchingStaff.length > 0 ? (
                                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Cocok dengan {matchingStaff.length} personel terdaftar: {matchingStaff.map(s => s.nama.split(',')[0]).join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Belum ada personel dengan tag ini. Klik tag di atas atau kelola tag guru di tab &ldquo;Kelola Tag Personel&rdquo;.
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Middle & Right: Status Alokasi & Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <div className="text-left sm:text-right">
                                <div className="text-xs text-slate-500">Terdistribusi:</div>
                                <div className={`text-xs font-mono font-bold ${
                                  sisaUnallocated === 0
                                    ? 'text-emerald-600'
                                    : sisaUnallocated > 0
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                                }`}>
                                  {totalAllocated} / {targetTotalDistribusi} {unitDistribusi}
                                  {sisaUnallocated !== 0 && (
                                    <span className="text-[10px] ml-1">
                                      ({sisaUnallocated > 0 ? `Sisa ${sisaUnallocated}` : `Lebih ${Math.abs(sisaUnallocated)}`})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setEditingItem(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                                >
                                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                                  Kelola Jatah ({item.alokasi.filter(a => a.qty > 0).length})
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={readOnly}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Hapus barang"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Recipient breakdown chips */}
                          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-400 mr-1">Penerima Saat Ini:</span>
                            {item.alokasi.filter(a => a.qty > 0).length > 0 ? (
                              item.alokasi
                                .filter(a => a.qty > 0)
                                .map((al, aIdx) => (
                                  <div
                                    key={aIdx}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700"
                                  >
                                    <span className="font-medium text-slate-900">{al.personName.split(',')[0]}:</span>
                                    <span className="font-bold text-emerald-800 font-mono bg-emerald-50 px-1 rounded">
                                      {al.qty} {unitDistribusi}
                                    </span>
                                  </div>
                                ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum ada jatah penerima yang dibagikan. Klik &ldquo;Auto-Distribusi Cerdas&rdquo; di atas.</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-medium">Tidak ada barang persediaan yang cocok dengan kriteria filter.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW B: KELOLA TAG PERSONEL & GURU */}
          {kelolaViewMode === 'tag-personel' && (
            <LogistikTagManager
              personnelList={personnelList}
              onUpdatePersonnel={handleUpdatePersonnel}
              onResetToDefaults={handleResetPersonnelTags}
              onNavigateToMaster={onNavigateToMaster}
            />
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUB-TAB 2: DOKUMEN PERMINTAAN, VERIFIKASI & BAST PER GURU */}
      {/* ======================================================================= */}
      {activeSubTab === 'dokumen-guru' && (
        <div className="space-y-6 print:space-y-0 print:m-0 print:p-0">
          {/* Guru Selector Bar - No Print */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Pilih Guru / Staf Penerima Barang:
                </span>
                <span className="text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-md font-mono">
                  {recipientList.length} dari {personnelList.filter(p => !(p.jabatan || '').toLowerCase().includes('kepala sekolah')).length} Personel Menerima Jatah
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pilih guru untuk melihat dan mencetak Berkas Tripartit Resmi (Permintaan, Verifikasi, &amp; BAST).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-850 text-xs font-bold rounded-xl border border-indigo-200 transition-all cursor-pointer"
                title="Pilih Verifikator PBJ dan Pengurus Barang dari Master Guru atau Bendahara"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Atur Pejabat BAST
              </button>

              <button
                onClick={handleRunSmartAutoDistribute}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-all cursor-pointer"
                title="Distribusikan ulang seluruh barang secara otomatis ke semua guru/staf sesuai peran tag"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Auto-Distribusi Sesuai Tag
              </button>

              <button
                onClick={handlePrintSingle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Guru Ini
              </button>

              <button
                onClick={handlePrintAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Semua Guru ({recipientList.length})
              </button>
            </div>
          </div>

          {/* Horizontal Guru List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs no-print overflow-x-auto">
            <div className="flex items-center gap-2">
              {recipientList.map((recip) => {
                const isSelected = recip.id === selectedPersonId;
                return (
                  <button
                    key={recip.id}
                    onClick={() => setSelectedPersonId(recip.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-900 text-white font-bold shadow-xs ring-1 ring-indigo-950'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <div className="leading-tight truncate">{recip.nama}</div>
                      <div className={`text-[9.5px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {recip.jabatan} ({recip.totalItems} item)
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher Specific Controls Bar: Ubah / Hapus Jatah Guru Langsung */}
          {selectedPersonId && (
            <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-indigo-50/90 border border-indigo-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs no-print">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                    <span>
                      Kelola Jatah: {recipientList.find((r) => r.id === selectedPersonId)?.nama || 'Guru Penerima'}
                    </span>
                    <span className="text-[10px] bg-indigo-200/80 text-indigo-900 font-bold px-2 py-0.5 rounded-full font-mono">
                      {recipientList.find((r) => r.id === selectedPersonId)?.totalItems || 0} Barang Terdistribusi
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Ubah atau hapus jatah barang guru ini langsung dari halaman berkas dan tersimpan permanen ke database cloud.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const t = personnelList.find((p) => p.id === selectedPersonId);
                    if (t) handleOpenTeacherAllocModal(t);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Ubah / Sesuaikan Jatah Guru Ini</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClearAllAllocationsForTeacher(selectedPersonId)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                  title="Hapus seluruh jatah barang untuk guru ini dan simpan langsung ke database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Jatah Guru Ini</span>
                </button>
              </div>
            </div>
          )}

          {/* Print Preview Settings Bar & Drawer */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs no-print overflow-hidden">
            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Pengaturan Format Cetak &amp; Layout Dokumen SPJ
                    </h4>
                    <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                      {printSettings.paperSize} &bull; {printSettings.marginPreset} &bull; TTD {printSettings.signatureHeightPx || (printSettings.signatureSpacing === 'wide' ? 90 : printSettings.signatureSpacing === 'extra-wide' ? 120 : 65)}px
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Atur ukuran kertas (A4/F4), margin cetak, kerapatan tabel, serta perluas ruang tanda tangan &amp; stempel resmi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintSettingsDrawer(!showPrintSettingsDrawer)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    showPrintSettingsDrawer
                      ? 'bg-indigo-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showPrintSettingsDrawer ? 'Tutup Pengaturan' : 'Buka Pengaturan Cetak'}</span>
                </button>

                <button
                  onClick={() => handleUpdatePrintSettings(DEFAULT_PRINT_SETTINGS)}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Reset ke Pengaturan Standar"
                >
                  Reset
                </button>
              </div>
            </div>

            {showPrintSettingsDrawer && (
              <div className="p-4 sm:p-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white">
                {/* 1. Kertas */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Ukuran Kertas:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['A4', 'F4', 'Letter'] as PaperSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleUpdatePrintSettings({ paperSize: size })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          printSettings.paperSize === size
                            ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {size === 'F4' ? 'F4 / Folio' : size}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {printSettings.paperSize === 'A4' ? 'Standar nasional (210 × 297 mm)' : printSettings.paperSize === 'F4' ? 'HVS Folio kedinasan (215 × 330 mm)' : 'Letter (216 × 279 mm)'}
                  </p>
                </div>

                {/* 2. Margin */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                    Margin Kertas:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'compact', label: 'Sempit (10mm)' },
                      { id: 'normal', label: 'Normal (15mm)' },
                      { id: 'spacious', label: 'Lapang (20mm)' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleUpdatePrintSettings({ marginPreset: m.id as MarginPreset })}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                          printSettings.marginPreset === m.id
                            ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Pilih "Sempit" jika barang banyak agar tidak terpotong ke halaman berikutnya.
                  </p>
                </div>

                {/* 3. Spasi Tanda Tangan (Perluas TTD & Stempel) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      Spasi Tanda Tangan:
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      {printSettings.signatureHeightPx || (printSettings.signatureSpacing === 'wide' ? 90 : printSettings.signatureSpacing === 'extra-wide' ? 120 : 65)}px
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'normal', label: 'Standar (65px)', h: 65 },
                      { id: 'wide', label: 'Luas (90px)', h: 90 },
                      { id: 'extra-wide', label: 'Ekstra (120px)', h: 120 }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdatePrintSettings({
                          signatureSpacing: s.id as SignatureSpacingPreset,
                          signatureHeightPx: s.h
                        })}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                          (printSettings.signatureHeightPx === s.h || (!printSettings.signatureHeightPx && printSettings.signatureSpacing === s.id))
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] text-slate-400">Slider:</span>
                    <input
                      type="range"
                      min="50"
                      max="160"
                      step="5"
                      value={printSettings.signatureHeightPx || (printSettings.signatureSpacing === 'wide' ? 90 : printSettings.signatureSpacing === 'extra-wide' ? 120 : 65)}
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        handleUpdatePrintSettings({
                          signatureSpacing: 'custom',
                          signatureHeightPx: h
                        });
                      }}
                      className="flex-1 accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. Kepadatan Tabel & Kop */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Kepadatan Tabel &amp; Kop:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'compact', label: 'Kompak' },
                      { id: 'normal', label: 'Normal' },
                      { id: 'spacious', label: 'Lapang' }
                    ].map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handleUpdatePrintSettings({ tableSpacing: sp.id as TableSpacingPreset })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          printSettings.tableSpacing === sp.id
                            ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printSettings.showKop ?? true}
                      onChange={(e) => handleUpdatePrintSettings({ showKop: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-medium">Sertakan Kop Surat Resmi</span>
                  </label>

                  <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printSettings.lebihanPermintaanPrint ?? true}
                      onChange={(e) => handleUpdatePrintSettings({ lebihanPermintaanPrint: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-semibold text-emerald-900">
                      Rasionalisasi Riil (Permohonan dilebihkan &amp; disesuaikan saat verifikasi)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Render Mode: Single Guru View vs Print All Mode */}
          {recipientList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-xs">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                {personnelList.length === 0 ? 'Data Master Guru Masih Kosong' : 'Belum Ada Alokasi Barang ke Guru'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {personnelList.length === 0
                  ? 'Dokumen tanda terima dan BAST Tripartit memerlukan data guru dari Data Master Terpadu. Masukkan data guru terlebih dahulu.'
                  : 'Data belanja persediaan (ATK/ALKEB) belum terdistribusi ke penerima. Silakan lakukan Auto-Distribusi Cerdas atau Kelola Jatah pada tab Kelola Barang.'}
              </p>
              {personnelList.length === 0 && onNavigateToMaster && (
                <button
                  type="button"
                  onClick={onNavigateToMaster}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Input Guru di Data Master</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : isPrintAllMode ? (
            <div className="space-y-12 print:space-y-0 print:m-0 print:p-0 print:w-full">
              {allGuruDocuments.map((gDoc) => (
                <div key={gDoc.personId} className="print:break-after-page print:m-0 print:p-0">
                  <DokumenTripartitGuru
                    guruData={gDoc}
                    metadata={metadata}
                    tglMinta={config.tglMinta}
                    tglVerif={config.tglVerif}
                    tglBA={config.tglBA}
                    namaVerifikator={config.namaVerifikator}
                    nipVerifikator={config.nipVerifikator}
                    namaPengurusBarang={config.namaPengurusBarang}
                    nipPengurusBarang={config.nipPengurusBarang}
                    kotaKecamatan={config.kotaKecamatan}
                    printSettings={printSettings}
                  />
                </div>
              ))}
            </div>
          ) : (
            currentGuruDoc && (
              <div className="max-w-4xl mx-auto print:max-w-none print:w-full print:m-0 print:p-0">
                <DokumenTripartitGuru
                  guruData={currentGuruDoc}
                  metadata={metadata}
                  tglMinta={config.tglMinta}
                  tglVerif={config.tglVerif}
                  tglBA={config.tglBA}
                  namaVerifikator={config.namaVerifikator}
                  nipVerifikator={config.nipVerifikator}
                  namaPengurusBarang={config.namaPengurusBarang}
                  nipPengurusBarang={config.nipPengurusBarang}
                  kotaKecamatan={config.kotaKecamatan}
                  printSettings={printSettings}
                />
              </div>
            )
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* SUB-TAB 3: REKAP STOCK OPNAME PERSEDIAAN */}
      {/* ======================================================================= */}
      {activeSubTab === 'opname' && (
        <OpnamePersediaanView
          barangList={barangList}
          teachers={personnelList}
          metadata={metadata}
          periodeText={metadata.bulanTahun}
          tanggalCetak={config.tglVerif}
          namaPengurusBarang={config.namaPengurusBarang}
          nipPengurusBarang={config.nipPengurusBarang}
        />
      )}

      {/* ======================================================================= */}
      {/* SUB-TAB 4: LPJ PENGADAAN ATK */}
      {/* ======================================================================= */}
      {activeSubTab === 'lpj-atk' && (
        <AtkLpjView
          data={data}
          barangList={barangList}
          metadata={metadata}
          namaPengurusBarang={config.namaPengurusBarang}
          nipPengurusBarang={config.nipPengurusBarang}
          onOpenBastDocs={() => setActiveSubTab('dokumen-guru')}
          monthlyArchives={monthlyArchives}
          activeMonthId={activeMonthId}
          onSelectMonth={onSelectMonth}
        />
      )}

      {/* ======================================================================= */}
      {/* SUB-TAB 5: LPJ ALAT KEBERSIHAN (ALKEB) */}
      {/* ======================================================================= */}
      {activeSubTab === 'lpj-alkeb' && (
        <AlkebLpjView
          data={data}
          barangList={barangList}
          metadata={metadata}
          namaPengurusBarang={config.namaPengurusBarang}
          nipPengurusBarang={config.nipPengurusBarang}
          onOpenBastDocs={() => setActiveSubTab('dokumen-guru')}
          monthlyArchives={monthlyArchives}
          activeMonthId={activeMonthId}
          onSelectMonth={onSelectMonth}
        />
      )}

      {/* ======================================================================= */}
      {/* MODAL DIALOG: KELOLA ALOKASI BARANG KE PERSONEL / GURU */}
      {/* ======================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      editingItem.kategori === 'ALKEB' ? 'bg-cyan-100 text-cyan-800' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {editingItem.kategori}
                    </span>
                    {(editingItem.targetTags || []).map((tId) => {
                      const def = STANDARD_LOGISTIK_TAGS.find(t => t.id === tId);
                      return (
                        <span key={tId} className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${def?.colorBadge || 'bg-slate-100'}`}>
                          {def?.shortLabel || tId}
                        </span>
                      );
                    })}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{editingItem.namaBarang}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Total Beli BKU: <strong className="text-slate-800">{editingItem.totalVolume} {editingItem.satuan}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Konversi Satuan Pengemasan (Grosir/Lusin/Pack ke Satuan Distribusi Guru) */}
              <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Konversi Satuan Distribusi ke Guru</span>
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium">
                    1 {editingItem.satuan} = <strong className="font-mono text-xs">{editingItem.faktorKonversi || 1}</strong> {editingItem.satuanDistribusi || editingItem.satuan}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-amber-200/60">
                    <label className="text-[11px] text-slate-600 font-medium shrink-0">1 {editingItem.satuan} berisi:</label>
                    <input
                      type="number"
                      min="1"
                      value={editingItem.faktorKonversi || 1}
                      onChange={(e) => {
                        const newFaktor = Math.max(1, parseInt(e.target.value) || 1);
                        setEditingItem({ ...editingItem, faktorKonversi: newFaktor });
                      }}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[11px] text-slate-500">unit</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-amber-200/60">
                    <label className="text-[11px] text-slate-600 font-medium shrink-0">Satuan Guru:</label>
                    <input
                      type="text"
                      placeholder="pcs / batang / buah"
                      value={editingItem.satuanDistribusi || editingItem.satuan || 'pcs'}
                      onChange={(e) => {
                        setEditingItem({ ...editingItem, satuanDistribusi: e.target.value });
                      }}
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-amber-900/80 flex items-center justify-between">
                  <span>
                    Total barang tersedia untuk dibagikan ke guru:
                  </span>
                  <span className="font-mono font-bold text-xs bg-amber-200/70 px-2 py-0.5 rounded-md text-amber-950">
                    {editingItem.totalVolume * (editingItem.faktorKonversi || 1)} {editingItem.satuanDistribusi || editingItem.satuan}
                  </span>
                </div>
              </div>

              {/* Quick Split, Search, & Add Teacher Header */}
              <div className="mt-3 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 text-[11px] font-semibold">Bagi Cepat:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const distributed = smartAutoDistributeHelper([editingItem], personnelList)[0];
                        setEditingItem(distributed);
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Bagi Sesuai Tag
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const guruOnly = personnelList.filter(t => !(t.jabatan || '').toLowerCase().includes('kepala sekolah') && !(t.jabatan || '').toLowerCase().includes('kebersihan'));
                        const totalDistribusi = editingItem.totalVolume * (editingItem.faktorKonversi || 1);
                        if (guruOnly.length === 0) return;
                        const jatah = Math.floor(totalDistribusi / guruOnly.length);
                        const sisa = totalDistribusi % guruOnly.length;
                        const newAlloc = guruOnly.map((t, idx) => ({
                          personId: t.id,
                          personName: t.nama,
                          jabatan: t.jabatan,
                          nip: t.nip,
                          qty: jatah + (idx < sisa ? 1 : 0),
                          keperluan: editingItem.keperluanDefault || 'Kegiatan Belajar Mengajar',
                          status: 'Disetujui' as const
                        }));
                        setEditingItem({ ...editingItem, alokasi: newAlloc });
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      Bagi Rata Guru ({personnelList.filter(t => !(t.jabatan || '').toLowerCase().includes('kepala sekolah') && !(t.jabatan || '').toLowerCase().includes('kebersihan')).length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, alokasi: [] })}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      Kosongkan
                    </button>
                  </div>

                  {onNavigateToMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        onNavigateToMaster();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold border border-slate-300/80 transition-colors cursor-pointer"
                      title="Buka Data Master Terpadu untuk menambah guru baru"
                    >
                      <Database className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Input Guru di Data Master</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                  )}
                </div>

                {/* Search Bar & Include Kepsek Checkbox */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari guru berdasarkan nama / NIP / jabatan..."
                      value={modalTeacherSearch}
                      onChange={(e) => setModalTeacherSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs transition-colors focus:ring-1 focus:ring-indigo-500"
                    />
                    {modalTeacherSearch && (
                      <button
                        type="button"
                        onClick={() => setModalTeacherSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-slate-600 select-none cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={includeKepsekInModal}
                      onChange={(e) => setIncludeKepsekInModal(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-medium">Sertakan Kepala Sekolah</span>
                  </label>
                </div>
              </div>

              {/* Recipient Allocation List */}
              <div className="mt-2 max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const filteredRecipients = personnelList.filter((t) => {
                    const isKepsek = (t.jabatan || '').toLowerCase().includes('kepala sekolah');
                    const hasAlloc = editingItem.alokasi.some((a) => a.personId === t.id && a.qty > 0);
                    if (isKepsek && !includeKepsekInModal && !hasAlloc) {
                      return false;
                    }
                    if (!modalTeacherSearch.trim()) return true;
                    const q = modalTeacherSearch.toLowerCase().trim();
                    return (
                      (t.nama && t.nama.toLowerCase().includes(q)) ||
                      (t.jabatan && t.jabatan.toLowerCase().includes(q)) ||
                      (t.nip && t.nip.includes(q))
                    );
                  });

                  if (filteredRecipients.length === 0) {
                    return (
                      <div className="p-6 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <Users className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                        <p className="text-xs font-semibold text-slate-600">Tidak ada guru/personel yang cocok.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {modalTeacherSearch ? 'Ubah kata kunci pencarian atau ' : ''}
                          tambahkan data guru baru melalui menu <strong>Data Master Terpadu</strong>.
                        </p>
                        {onNavigateToMaster && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(null);
                              onNavigateToMaster();
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span>Buka Data Master Guru</span>
                          </button>
                        )}
                      </div>
                    );
                  }

                  return filteredRecipients.map((t) => {
                    const existingAlloc = editingItem.alokasi.find(a => a.personId === t.id);
                    const qtyVal = existingAlloc ? existingAlloc.qty : 0;
                    const kepVal = existingAlloc ? (existingAlloc.keperluan || '') : '';
                    const isMatchedTag = (t.tags || []).some(pt => (editingItem.targetTags || []).includes(pt));
                    const maxDistribusi = editingItem.totalVolume * (editingItem.faktorKonversi || 1);
                    const currentUnitDist = editingItem.satuanDistribusi || editingItem.satuan;

                    return (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border transition-colors flex items-center justify-between gap-3 text-xs ${
                          qtyVal > 0
                            ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                            : isMatchedTag
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="max-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{t.nama}</span>
                            {isMatchedTag && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                                Sesuai Tag
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500 truncate">{t.jabatan}</div>
                        </div>

                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <input
                            type="text"
                            value={kepVal}
                            placeholder="Keperluan (misal: KBM)"
                            onChange={(e) => {
                              const newKep = e.target.value;
                              const updatedAlloc = [...editingItem.alokasi];
                              const foundIdx = updatedAlloc.findIndex(a => a.personId === t.id);
                              if (foundIdx >= 0) {
                                updatedAlloc[foundIdx].keperluan = newKep;
                              } else {
                                updatedAlloc.push({
                                  personId: t.id,
                                  personName: t.nama,
                                  jabatan: t.jabatan,
                                  nip: t.nip,
                                  qty: 0,
                                  keperluan: newKep,
                                  status: 'Disetujui'
                                });
                              }
                              setEditingItem({ ...editingItem, alokasi: updatedAlloc });
                            }}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs w-44 focus:ring-1 focus:ring-emerald-500"
                          />

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={maxDistribusi}
                              value={qtyVal}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 0;
                                const updatedAlloc = [...editingItem.alokasi];
                                const foundIdx = updatedAlloc.findIndex(a => a.personId === t.id);
                                if (foundIdx >= 0) {
                                  updatedAlloc[foundIdx].qty = newQty;
                                } else {
                                  updatedAlloc.push({
                                    personId: t.id,
                                    personName: t.nama,
                                    jabatan: t.jabatan,
                                    nip: t.nip,
                                    qty: newQty,
                                    keperluan: editingItem.keperluanDefault || 'KBM',
                                    status: 'Disetujui'
                                  });
                                }
                                setEditingItem({ ...editingItem, alokasi: updatedAlloc });
                              }}
                              className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-center focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-slate-500 text-[11px] w-12 truncate">{currentUnitDist}</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs font-mono">
                Total Jatah: <strong>{editingItem.alokasi.reduce((acc, c) => acc + c.qty, 0)}</strong> / {editingItem.totalVolume * (editingItem.faktorKonversi || 1)} {editingItem.satuanDistribusi || editingItem.satuan}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => handleSaveAllocations(editingItem)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Cloud className="w-3.5 h-3.5 text-white" />
                  <span>Simpan Jatah ke Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL DIALOG: KELOLA JATAH PER GURU SPESIFIK */}
      {/* ======================================================================= */}
      {editingTeacherAllocations && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Kelola Jatah Barang: {editingTeacherAllocations.nama}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{editingTeacherAllocations.jabatan}</span>
                    <span>&bull;</span>
                    <span className="font-mono">NIP: {editingTeacherAllocations.nip || '-'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingTeacherAllocations(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari barang persediaan..."
                  value={teacherAllocSearch}
                  onChange={(e) => setTeacherAllocSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs transition-colors focus:ring-1 focus:ring-indigo-500"
                />
                {teacherAllocSearch && (
                  <button
                    type="button"
                    onClick={() => setTeacherAllocSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const cleared: Record<string, { qty: number; keperluan: string }> = {};
                    barangList.forEach((b) => {
                      cleared[b.id] = { qty: 0, keperluan: b.keperluanDefault || 'KBM' };
                    });
                    setTeacherAllocTemp(cleared);
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Kosongkan Semua (0)
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {barangList
                .filter((b) => {
                  if (!teacherAllocSearch.trim()) return true;
                  const q = teacherAllocSearch.toLowerCase().trim();
                  return (
                    (b.namaBarang && b.namaBarang.toLowerCase().includes(q)) ||
                    (b.kategori && b.kategori.toLowerCase().includes(q)) ||
                    (b.spesifikasi || '').toLowerCase().includes(q)
                  );
                })
                .map((b) => {
                  const conf = teacherAllocTemp[b.id] || { qty: 0, keperluan: b.keperluanDefault || 'KBM' };
                  const unitDist = b.satuanDistribusi || b.satuan || 'buah';
                  const maxAvail = b.totalVolume * (b.faktorKonversi || 1);

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        conf.qty > 0
                          ? 'bg-indigo-50/50 border-indigo-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            b.kategori === 'ATK'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}
                        >
                          {b.kategori}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{b.namaBarang}</h4>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span>{b.spesifikasi || '-'}</span>
                            <span>&bull;</span>
                            <span>Total BKU: {maxAvail} {unitDist}</span>
                          </div>
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-40">
                          <input
                            type="text"
                            placeholder="Keperluan..."
                            value={conf.keperluan}
                            onChange={(e) =>
                              setTeacherAllocTemp((prev) => ({
                                ...prev,
                                [b.id]: { ...conf, keperluan: e.target.value }
                              }))
                            }
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setTeacherAllocTemp((prev) => ({
                                ...prev,
                                [b.id]: { ...conf, qty: Math.max(0, conf.qty - 1) }
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={maxAvail}
                            value={conf.qty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setTeacherAllocTemp((prev) => ({
                                ...prev,
                                [b.id]: { ...conf, qty: val }
                              }));
                            }}
                            className="w-14 px-1 py-1 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setTeacherAllocTemp((prev) => ({
                                ...prev,
                                [b.id]: { ...conf, qty: conf.qty + 1 }
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                          <span className="text-[11px] text-slate-500 w-12 truncate">{unitDist}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs font-mono text-slate-600">
                Total Jatah Guru Ini:{' '}
                <strong className="text-indigo-900">
                  {Object.values(teacherAllocTemp).filter((v: { qty: number; keperluan: string }) => v.qty > 0).length} jenis barang
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeacherAllocations(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSaveTeacherAllocModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Cloud className="w-3.5 h-3.5 text-white" />
                  <span>Simpan Jatah ke Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL DIALOG: TAMBAH BARANG MANUAL */}
      {/* ======================================================================= */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Tambah Barang Persediaan Manual
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tambahkan item di luar BKU atau barang persediaan tambahan.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Barang</label>
                <input
                  type="text"
                  value={newItemForm.namaBarang}
                  onChange={(e) => {
                    const nama = e.target.value;
                    const detected = detectDefaultItemTargetTags(nama, newItemForm.kategori || 'ATK', newItemForm.kodeRekening || '');
                    setNewItemForm({ ...newItemForm, namaBarang: nama, targetTags: detected });
                  }}
                  placeholder="Contoh: Kertas HVS A4 70gr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <select
                    value={newItemForm.kategori}
                    onChange={(e) => {
                      const kat = e.target.value as 'ATK' | 'ALKEB';
                      const detected = detectDefaultItemTargetTags(newItemForm.namaBarang || '', kat, newItemForm.kodeRekening || '');
                      setNewItemForm({ ...newItemForm, kategori: kat, targetTags: detected });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ATK">ATK (Alat Tulis Kantor)</option>
                    <option value="ALKEB">ALKEB (Alat Kebersihan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={newItemForm.satuan}
                    onChange={(e) => setNewItemForm({ ...newItemForm, satuan: e.target.value })}
                    placeholder="buah / rim / set / pack"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Volume / Kuantitas</label>
                  <input
                    type="number"
                    value={newItemForm.totalVolume}
                    onChange={(e) => setNewItemForm({ ...newItemForm, totalVolume: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={newItemForm.hargaSatuan}
                    onChange={(e) => setNewItemForm({ ...newItemForm, hargaSatuan: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Target Tags on New Item */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Pilih Target Tag Penerima:</label>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_LOGISTIK_TAGS.map((t) => {
                    const isSelected = (newItemForm.targetTags || []).includes(t.id as string);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          const current = newItemForm.targetTags || [];
                          const updated = isSelected
                            ? current.filter((x) => x !== t.id)
                            : [...current, t.id as string];
                          setNewItemForm({ ...newItemForm, targetTags: updated });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? `${t.colorBadge} ring-1 ring-current`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t.shortLabel} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleCreateNewItem}
                disabled={readOnly || !newItemForm.namaBarang}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl"
              >
                Tambahkan Barang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL DIALOG: ATUR NOMOR & TANGGAL SURAT KEDINASAN + PEJABAT BAST */}
      {/* ======================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col justify-between">
            <div className="overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    Pengaturan Dokumen Surat &amp; Pejabat BAST
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atur penomoran surat, tanggal kedinasan, serta pilih nama Verifikator dan Pengurus Barang dari Master Guru / Bendahara.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* BAGIAN 1: NOMOR SURAT & TANGGAL KEDINASAN */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    Nomor &amp; Tanggal Surat Kedinasan
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">No. Urut Surat Awal</label>
                      <input
                        type="number"
                        value={config.noMintaStart}
                        onChange={(e) => setConfig({ ...config, noMintaStart: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kota / Kecamatan</label>
                      <input
                        type="text"
                        value={config.kotaKecamatan}
                        onChange={(e) => setConfig({ ...config, kotaKecamatan: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">Tgl Permintaan (Hal 1)</label>
                      <input
                        type="text"
                        value={config.tglMinta}
                        onChange={(e) => setConfig({ ...config, tglMinta: e.target.value })}
                        placeholder="Contoh: Jumat, 10 April 2026"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">Tgl Verifikasi (Hal 2)</label>
                      <input
                        type="text"
                        value={config.tglVerif}
                        onChange={(e) => setConfig({ ...config, tglVerif: e.target.value })}
                        placeholder="Contoh: Sabtu, 11 April 2026"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-700 font-semibold mb-1">Tgl BAST (Hal 3)</label>
                      <input
                        type="text"
                        value={config.tglBA}
                        onChange={(e) => setConfig({ ...config, tglBA: e.target.value })}
                        placeholder="Contoh: 2026-04-13"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* BAGIAN 2: PEJABAT PENANDATANGAN DOKUMEN SPJ & BAST */}
                <div className="p-3.5 bg-indigo-50/40 border border-indigo-200/80 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-700" />
                        Pejabat Penandatangan SPJ &amp; BAST (Master Guru + Bendahara)
                      </h4>
                      <p className="text-[11px] text-indigo-900/70 mt-0.5">
                        Pilih nama dan NIP langsung dari database Master Guru atau Bendahara Sekolah.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {pejabatOptions.length} Personel
                    </span>
                  </div>

                  {/* KARTU 1: VERIFIKATOR PBJ */}
                  <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                        1. Verifikator PBJ (Pemeriksa Permintaan Barang)
                      </label>
                      <span className="text-[10px] font-medium text-slate-500">Tanda Tangan Lembar Verifikasi Hal. 2</span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Ambil dari Database Master Guru / Bendahara:
                      </label>
                      <select
                        value={
                          pejabatOptions.find(
                            (p) => (p.nama || '').trim().toLowerCase() === (config.namaVerifikator || '').trim().toLowerCase()
                          )?.id || ''
                        }
                        onChange={(e) => {
                          const selected = pejabatOptions.find((p) => p.id === e.target.value);
                          if (selected) {
                            setConfig((prev) => ({
                              ...prev,
                              namaVerifikator: selected.nama,
                              nipVerifikator: selected.nip !== '-' ? selected.nip : '',
                              jabatanVerifikator: selected.jabatan
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Pilih dari Database Guru / Bendahara --</option>
                        <optgroup label="Bendahara & Pimpinan Sekolah">
                          {pejabatOptions
                            .filter((p) => p.category !== 'guru')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} — {p.jabatan} (NIP: {p.nip || '-'})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Database Master Guru & Tenaga Kependidikan">
                          {pejabatOptions
                            .filter((p) => p.category === 'guru')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} — {p.jabatan} (NIP: {p.nip || '-'})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10.5px] text-slate-500 font-medium mb-0.5">Nama Verifikator</label>
                        <input
                          type="text"
                          value={config.namaVerifikator}
                          onChange={(e) => setConfig({ ...config, namaVerifikator: e.target.value })}
                          placeholder="Nama Lengkap & Gelar"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] text-slate-500 font-medium mb-0.5">NIP Verifikator</label>
                        <input
                          type="text"
                          value={config.nipVerifikator}
                          onChange={(e) => setConfig({ ...config, nipVerifikator: e.target.value })}
                          placeholder="NIP (atau strip '-' jika non-PNS)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* KARTU 2: PENGURUS BARANG */}
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-600" />
                        2. Pengurus Barang / Petugas Pengelola Persediaan
                      </label>
                      <span className="text-[10px] font-medium text-slate-500">Tanda Tangan BAST Hal. 3, Opname &amp; LPJ</span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                        Ambil dari Database Master Guru / Bendahara:
                      </label>
                      <select
                        value={
                          pejabatOptions.find(
                            (p) => (p.nama || '').trim().toLowerCase() === (config.namaPengurusBarang || '').trim().toLowerCase()
                          )?.id || ''
                        }
                        onChange={(e) => {
                          const selected = pejabatOptions.find((p) => p.id === e.target.value);
                          if (selected) {
                            setConfig((prev) => ({
                              ...prev,
                              namaPengurusBarang: selected.nama,
                              nipPengurusBarang: selected.nip !== '-' ? selected.nip : '',
                              jabatanPengurusBarang: selected.jabatan
                            }));
                          }
                        }}
                        className="w-full px-3 py-2 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">-- Pilih dari Database Guru / Bendahara --</option>
                        <optgroup label="Bendahara & Pimpinan Sekolah">
                          {pejabatOptions
                            .filter((p) => p.category !== 'guru')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} — {p.jabatan} (NIP: {p.nip || '-'})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Database Master Guru & Tenaga Kependidikan">
                          {pejabatOptions
                            .filter((p) => p.category === 'guru')
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama} — {p.jabatan} (NIP: {p.nip || '-'})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10.5px] text-slate-500 font-medium mb-0.5">Nama Pengurus Barang</label>
                        <input
                          type="text"
                          value={config.namaPengurusBarang}
                          onChange={(e) => setConfig({ ...config, namaPengurusBarang: e.target.value })}
                          placeholder="Nama Lengkap & Gelar"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] text-slate-500 font-medium mb-0.5">NIP Pengurus Barang</label>
                        <input
                          type="text"
                          value={config.nipPengurusBarang}
                          onChange={(e) => setConfig({ ...config, nipPengurusBarang: e.target.value })}
                          placeholder="NIP (atau strip '-' jika non-PNS)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">
                Otomatis disimpan ke database cloud &amp; disinkronkan ke seluruh dokumen SPJ.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={async () => {
                    if (readOnly) return;
                    configRef.current = config;
                    setShowConfigModal(false);
                    await persistLogistikState(barangListRef.current, config, printSettingsRef.current, true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan &amp; Terapkan ke Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
