import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TransaksiBKU,
  SchoolMetadata,
  PerbaikanRABItem,
  PerbaikanSaprasConfig,
  MonthlyArchive,
  MonthPerbaikanData,
  TukangPerbaikanItem,
  PerbaikanKegiatanItem
} from '../../types';
import {
  savePerbaikanToFirestore,
  debounceSavePerbaikanToFirestore,
  fetchPerbaikanFromFirestore,
  subscribeToPerbaikanData,
  CloudSyncStatus
} from '../../lib/firebaseSync';
import { useSchool } from '../../context/SchoolContext';
import { readLS, writeLS } from '../../lib/schoolStorage';
import { formatRupiah } from '../SummaryCards';
import { PrintConfigToolbar } from '../common/PrintConfigToolbar';
import { terbilang } from '../../utils/terbilang';
import {
  Hammer,
  Printer,
  Sparkles,
  FileText,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  UserCheck,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  FileCheck2,
  Receipt,
  Layers,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
  Search,
  Filter,
  Cloud,
  CloudCheck,
  CloudOff,
  CheckSquare,
  Square,
  ListFilter,
  Tag,
  X,
  Check
} from 'lucide-react';

interface PerbaikanSaprasViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  onSelectMonthIndex?: (monthIndex: number) => void;
}

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function getDayName(dateStr: string): string {
  if (!dateStr) return 'Senin';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'Senin' : HARI_NAMES[d.getDay()];
}

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${BULAN_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function dateToSpelledOut(dateStr: string): { hari: string; tanggalEjaan: string; bulan: string; tahunEjaan: string } {
  const d = new Date(dateStr || Date.now());
  const hari = HARI_NAMES[d.getDay()] || 'Senin';
  const tgl = d.getDate();
  const bln = BULAN_NAMES[d.getMonth()] || 'Februari';
  const thn = d.getFullYear();

  const angkaWords = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh',
    'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas', 'Tujuh Belas',
    'Delapan Belas', 'Sembilan Belas', 'Dua Puluh', 'Dua Puluh Satu', 'Dua Puluh Dua', 'Dua Puluh Tiga',
    'Dua Puluh Empat', 'Dua Puluh Lima', 'Dua Puluh Enam', 'Dua Puluh Tujuh', 'Dua Puluh Delapan',
    'Dua Puluh Sembilan', 'Tiga Puluh', 'Tiga Puluh Satu'
  ];

  const tanggalEjaan = angkaWords[tgl] || String(tgl);
  const tahunEjaan = thn === 2025 ? 'Dua Ribu Dua Puluh Lima' : thn === 2026 ? 'Dua Ribu Dua Puluh Enam' : String(thn);

  return { hari, tanggalEjaan, bulan: bln, tahunEjaan };
}

/**
 * Kop Surat Dokumen Resmi LPJ Perbaikan Sapras
 * Sepenuhnya menggunakan data master sekolah (SchoolMetadata)
 */
export const KopSuratDokumen: React.FC<{ metadata: SchoolMetadata }> = ({ metadata }) => {
  const namaSekolah = metadata.namaSekolah?.trim() || 'SD NEGERI SATUAN PENDIDIKAN';
  const npsn = metadata.npsn?.trim() || '-';
  const nss = (metadata as any).nss?.trim() || (metadata as any).nomorStatistikSekolah?.trim() || '';
  const alamatLengkap = metadata.alamatLengkap?.trim() || [metadata.desaKecamatan, metadata.kabupatenKota, metadata.provinsi].filter(Boolean).join(', ') || '-';
  const emailSekolah = metadata.emailSekolah?.trim() || '';
  const telpSekolah = metadata.teleponSekolah?.trim() || '';
  const kabKota = metadata.kabupatenKota?.trim() || '';
  const kecamatan = metadata.desaKecamatan?.trim() || '';

  const logoKiri = metadata.logoUrl;
  const logoKanan = metadata.logoKananUrl;
  const logoHeight = metadata.logoSizePx || 68;

  const pemdaText = kabKota
    ? kabKota.toUpperCase().includes('PEMERINTAH')
      ? kabKota.toUpperCase()
      : kabKota.toUpperCase().includes('KABUPATEN') || kabKota.toUpperCase().includes('KOTA')
      ? `PEMERINTAH ${kabKota.toUpperCase()}`
      : `PEMERINTAH KABUPATEN ${kabKota.toUpperCase()}`
    : 'PEMERINTAH KABUPATEN / KOTA';

  return (
    <div className="w-full border-b-4 border-double border-black pb-2 mb-6 text-black print:border-black">
      <div className="flex items-center justify-between gap-3">
        {/* Logo Kiri / Logo Satuan Pendidikan dari Data Master */}
        {logoKiri ? (
          <div style={{ width: `${logoHeight}px`, height: `${logoHeight}px` }} className="shrink-0 flex items-center justify-center overflow-hidden">
            <img src={logoKiri} alt="Logo Sekolah" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
          </div>
        ) : logoKanan ? (
          <div style={{ width: `${logoHeight}px`, height: `${logoHeight}px` }} className="shrink-0 opacity-0 pointer-events-none hidden sm:block" />
        ) : null}

        {/* Teks Kop Surat Dinas Resmi */}
        <div className="text-center flex-1 space-y-0.5 font-serif">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider leading-tight">
            {pemdaText}
          </h3>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider leading-tight">
            DINAS PENDIDIKAN {kecamatan ? `• KECAMATAN ${kecamatan.toUpperCase()}` : ''}
          </h3>
          <h2 className="text-base sm:text-xl font-extrabold uppercase tracking-wide mt-1 font-serif leading-tight">
            {namaSekolah}
          </h2>
          <p className="text-[10.5px] sm:text-xs font-sans mt-1 text-slate-800 print:text-black leading-tight">
            Alamat : {alamatLengkap} {telpSekolah ? `| Telp : ${telpSekolah}` : ''}
          </p>
          <p className="text-[10px] sm:text-[11px] font-sans text-slate-700 print:text-black leading-tight">
            NPSN : {npsn} {nss ? `| NSS : ${nss}` : ''} {emailSekolah ? `| Email : ${emailSekolah}` : ''}
          </p>
        </div>

        {/* Logo Kanan (misal Tut Wuri Handayani) dari Data Master */}
        {logoKanan ? (
          <div style={{ width: `${logoHeight}px`, height: `${logoHeight}px` }} className="shrink-0 flex items-center justify-center overflow-hidden">
            <img src={logoKanan} alt="Logo Kanan" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
          </div>
        ) : logoKiri ? (
          <div style={{ width: `${logoHeight}px`, height: `${logoHeight}px` }} className="shrink-0 opacity-0 pointer-events-none hidden sm:block" />
        ) : null}
      </div>
    </div>
  );
};

export const PerbaikanSaprasView: React.FC<PerbaikanSaprasViewProps> = ({
  data,
  metadata,
  monthlyStore,
  activeMonthIndex = 2,
  onSelectMonthIndex
}) => {
  // Document Output Active View Tab
  const [activeDocTab, setActiveDocTab] = useState<'proposal' | 'spk' | 'berita-acara' | 'rab' | 'absensi'>('proposal');
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Month Selection State (Pilihan Bulan Aktif 1 - 12)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    return activeMonthIndex || 2;
  });

  // Sync when activeMonthIndex prop updates
  useEffect(() => {
    if (activeMonthIndex && activeMonthIndex !== selectedMonthIndex) {
      setSelectedMonthIndex(activeMonthIndex);
    }
  }, [activeMonthIndex]);

  // Current Month Data Extraction from MonthlyStore or Active BKU Data
  const currentMonthArchive = useMemo(() => {
    return monthlyStore?.[selectedMonthIndex] || null;
  }, [monthlyStore, selectedMonthIndex]);

  const activeMonthData = useMemo(() => {
    if (currentMonthArchive?.data && currentMonthArchive.data.length > 0) {
      return currentMonthArchive.data;
    }
    if (selectedMonthIndex === activeMonthIndex && data && data.length > 0) {
      return data;
    }
    return [];
  }, [currentMonthArchive, selectedMonthIndex, activeMonthIndex, data]);

  // Extract Year & Month
  const currentYear = useMemo(() => {
    if (currentMonthArchive?.tahun) return currentMonthArchive.tahun;
    const yearMatch = metadata.bulanTahun ? metadata.bulanTahun.match(/\b(20\d{2})\b/) : null;
    return yearMatch ? yearMatch[1] : '2026';
  }, [currentMonthArchive, metadata.bulanTahun]);

  const currentMonthName = useMemo(() => {
    return BULAN_NAMES[selectedMonthIndex - 1] || 'Februari';
  }, [selectedMonthIndex]);

  // Ref for Document Scroll Container (Scrollable PDF view)
  const docScrollContainerRef = useRef<HTMLDivElement>(null);

  // Firestore School ID & Role Context
  const { schoolId, readOnly } = useSchool();

  // Perbaikan Store (Monthly state map persisted in Firebase Firestore)
  const [perbaikanStore, setPerbaikanStore] = useState<Record<number, MonthPerbaikanData>>(() => {
    const saved = readLS<Record<number, MonthPerbaikanData>>(schoolId, 'perbaikan_store_v2', {});
    return saved && typeof saved === 'object' ? saved : {};
  });

  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const [isSubmittingCloud, setIsSubmittingCloud] = useState<boolean>(false);
  const isMonthSwitchingRef = useRef<boolean>(false);
  const initialMountLoadedRef = useRef<boolean>(false);

  // Default Config generator for clean month initialization (No stall data)
  const getDefaultConfig = (monthIdx: number): PerbaikanSaprasConfig => {
    const npsnVal = metadata.npsn || '';
    const mStr = String(monthIdx).padStart(2, '0');
    const namaSek = metadata.namaSekolah || 'Sekolah';
    return {
      temaPerbaikan: 'Pemeliharaan dan Perbaikan Sarana Prasarana Sekolah',
      syncMode: 'auto',
      tglMulai: `${currentYear}-${mStr}-10`,
      tglSelesai: `${currentYear}-${mStr}-25`,
      tglSurat: `${currentYear}-${mStr}-05`,
      tglBA: `${currentYear}-${mStr}-25`,
      nomorSPK: npsnVal ? `400.3.5.5/012-${npsnVal}` : '400.3.5.5/012/SPK',
      nomorSuratPengantar: npsnVal ? `421.2/015-${npsnVal}` : '421.2/015/PENG',
      nomorSuratPermohonan: npsnVal ? `421.2/016-${npsnVal}` : '421.2/016/MOHON',
      nomorBA: npsnVal ? `400.3.5.5/028-${npsnVal}` : '400.3.5.5/028/BA',
      namaKomite: (metadata as any).komiteSekolah || (metadata as any).namaKomite || '',
      jabatanKomite: 'Ketua Komite Sekolah / Panitia Pelaksana',
      namaTukang: 'Sulaeman',
      alamatTukang: metadata.desaKecamatan || '',
      noHpTukang: '0812-3456-7890',
      daftarTukang: [
        {
          id: 'tukang-1',
          nama: 'Sulaeman',
          nik: '3201234567890001',
          alamat: metadata.desaKecamatan || 'Lingkungan Sekolah',
          peran: 'Tukang Besi/Baja',
          upahPerHari: 120000,
          jumlahHari: 14,
          totalUpah: 1680000
        },
        {
          id: 'tukang-2',
          nama: 'Asep Kusnadi',
          nik: '3201234567890002',
          alamat: metadata.desaKecamatan || 'Lingkungan Sekolah',
          peran: 'Tukang Pelaksana',
          upahPerHari: 100000,
          jumlahHari: 14,
          totalUpah: 1400000
        }
      ],
      bab3Maksud: `Memperbaiki dan memelihara sarana prasarana ${namaSek} agar senantiasa layak, aman, dan nyaman untuk menunjang kegiatan pembelajaran.`,
      bab3Tujuan: [
        'Meningkatkan keamanan dan kenyamanan siswa serta pendidik dalam proses pembelajaran.',
        'Mencegah kerusakan sarana prasarana yang lebih meluas melalui perbaikan fisik berkala.',
        'Mewujudkan lingkungan satuan pendidikan yang tertib, bersih, dan representatif.'
      ],
      bab3IdentifikasiMasalah: [
        'Terdapat bagian fisik sarana prasarana yang mengalami penurunan fungsi atau kerusakan ringan hingga sedang.',
        'Kondisi material atau fasilitas yang membutuhkan peremajaan agar tidak membahayakan warga sekolah.',
        'Kebutuhan pemeliharaan mendesak untuk menjaga kelancaran operasional harian sekolah.'
      ]
    };
  };

  // Real Extractor Function from BKU & RKAS Data
  const extractRealItemsFromBKU = (
    transactions: TransaksiBKU[],
    filterPerbaikanOnly: boolean = false
  ): PerbaikanRABItem[] => {
    const extracted: PerbaikanRABItem[] = [];
    let counter = 1;

    // Filter pengeluaran transactions only
    const pengeluaranList = (transactions || []).filter(
      (tx) => tx.tipe_transaksi === 'Pengeluaran' || (tx.total_pengeluaran_bku && tx.total_pengeluaran_bku > 0)
    );

    pengeluaranList.forEach((tx) => {
      // If filterPerbaikanOnly is true, strictly accept only transactions explicitly tagged as 'Perbaikan'
      if (filterPerbaikanOnly && tx.klasifikasi !== 'Perbaikan') {
        return;
      }

      // Look at rincian_barang from RKAS merge or raw transaction
      const items = (tx.rincian_barang && tx.rincian_barang.length > 0)
        ? tx.rincian_barang
        : [{
            kode_rekening: tx.kode_kegiatan || '',
            uraian_barang: tx.keterangan || (tx as any).uraian || 'Belanja Perbaikan',
            volume: 1,
            satuan: 'paket',
            harga_satuan: tx.total_pengeluaran_bku || 0,
            jumlah_transaksi: tx.total_pengeluaran_bku || 0
          }];

      items.forEach((item) => {
        const vol = item.volume && item.volume > 0 ? item.volume : 1;
        const harga = item.harga_satuan && item.harga_satuan > 0 ? item.harga_satuan : item.jumlah_transaksi;
        const cleanNama = item.uraian_barang || tx.keterangan || (tx as any).uraian || 'Rincian Belanja';

        extracted.push({
          id: `rab-${tx.no_bku || 'tx'}-${counter}`,
          no: counter,
          namaBarang: cleanNama,
          volume: vol,
          satuan: item.satuan || 'paket',
          tarifHarga: harga,
          jumlah: item.jumlah_transaksi || (vol * harga),
          sumberBkuNo: tx.no_bku
        });
        counter++;
      });
    });

    return extracted;
  };

  // Helper to get or build initial kegiatan list for month
  const getInitialKegiatanForMonth = (
    mIdx: number,
    savedMonth?: MonthPerbaikanData | null,
    bkuData?: TransaksiBKU[]
  ): { list: PerbaikanKegiatanItem[]; activeId: string } => {
    if (savedMonth && Array.isArray(savedMonth.kegiatanList) && savedMonth.kegiatanList.length > 0) {
      const activeId =
        savedMonth.activeKegiatanId && savedMonth.kegiatanList.some((k) => k.id === savedMonth.activeKegiatanId)
          ? savedMonth.activeKegiatanId
          : savedMonth.kegiatanList[0].id;
      return { list: savedMonth.kegiatanList, activeId };
    }

    if (savedMonth && savedMonth.isSubmitted && savedMonth.config) {
      const single: PerbaikanKegiatanItem = {
        id: 'kegiatan-1',
        namaKegiatan: savedMonth.config.temaPerbaikan || 'Kegiatan 1: Pemeliharaan Sarpras',
        config: savedMonth.config,
        rabItems: savedMonth.rabItems || [],
        selectedBkuNos: (savedMonth.rabItems || []).map((r) => String(r.sumberBkuNo || '')).filter(Boolean),
        isSubmitted: !!savedMonth.isSubmitted
      };
      return { list: [single], activeId: 'kegiatan-1' };
    }

    const baseCfg = getDefaultConfig(mIdx);
    let baseItems: PerbaikanRABItem[] = [];
    if (bkuData && bkuData.length > 0) {
      // Strictly extract ONLY transactions with tag Perbaikan (NO fallback to all transactions, NO fake labor)
      baseItems = extractRealItemsFromBKU(bkuData, true);
    }

    const defaultKeg: PerbaikanKegiatanItem = {
      id: 'kegiatan-1',
      namaKegiatan: baseCfg.temaPerbaikan || 'Kegiatan 1: Pemeliharaan Sarpras',
      config: baseCfg,
      rabItems: baseItems,
      selectedBkuNos: baseItems.map((r) => String(r.sumberBkuNo || '')).filter(Boolean),
      isSubmitted: false
    };

    return { list: [defaultKeg], activeId: 'kegiatan-1' };
  };

  const initialKegiatanData = useMemo(() => {
    const saved = perbaikanStore[selectedMonthIndex];
    return getInitialKegiatanForMonth(selectedMonthIndex, saved, activeMonthData);
  }, []);

  // Multi-Kegiatan State for the active month
  const [kegiatanList, setKegiatanList] = useState<PerbaikanKegiatanItem[]>(() => initialKegiatanData.list);
  const [activeKegiatanId, setActiveKegiatanId] = useState<string>(() => initialKegiatanData.activeId);

  // Form Configurations of Active Kegiatan
  const [config, setConfig] = useState<PerbaikanSaprasConfig>(() => {
    const act = initialKegiatanData.list.find((k) => k.id === initialKegiatanData.activeId) || initialKegiatanData.list[0];
    return act?.config || getDefaultConfig(selectedMonthIndex);
  });

  // RAB Items State of Active Kegiatan
  const [rabItems, setRabItems] = useState<PerbaikanRABItem[]>(() => {
    const act = initialKegiatanData.list.find((k) => k.id === initialKegiatanData.activeId) || initialKegiatanData.list[0];
    return act?.rabItems || [];
  });

  // Transaction Picker State (Checklist BKU)
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [pickerFilterPerbaikanOnly, setPickerFilterPerbaikanOnly] = useState<boolean>(true);
  const [pickerSelectedNos, setPickerSelectedNos] = useState<string[]>([]);

  // Load from Firestore on mount & subscribe to realtime updates
  useEffect(() => {
    let isMounted = true;
    const initFirebaseData = async () => {
      setCloudSyncStatus('syncing');
      try {
        const remoteData = await fetchPerbaikanFromFirestore(schoolId);
        if (remoteData && Object.keys(remoteData).length > 0 && isMounted) {
          setPerbaikanStore(remoteData);
          writeLS(schoolId, 'perbaikan_store_v2', remoteData);
          setCloudSyncStatus('synced');

          // If current month was already submitted in Firebase, load it immediately
          if (!initialMountLoadedRef.current && remoteData[selectedMonthIndex]?.isSubmitted) {
            const currentSaved = remoteData[selectedMonthIndex];
            const { list, activeId } = getInitialKegiatanForMonth(selectedMonthIndex, currentSaved, activeMonthData);
            setKegiatanList(list);
            setActiveKegiatanId(activeId);
            const activeKeg = list.find((k) => k.id === activeId) || list[0];
            if (activeKeg?.config) setConfig(activeKeg.config);
            if (activeKeg?.rabItems) setRabItems(activeKeg.rabItems);
            initialMountLoadedRef.current = true;
          }
        } else {
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi data perbaikan dari Firebase:', err);
        setCloudSyncStatus('offline');
      } finally {
        if (isMounted) setIsCloudLoaded(true);
      }
    };

    initFirebaseData();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToPerbaikanData(
      schoolId,
      (remoteMonths) => {
        if (isMounted && remoteMonths) {
          setPerbaikanStore((prev) => {
            const merged = { ...prev, ...remoteMonths };
            writeLS(schoolId, 'perbaikan_store_v2', merged);
            return merged;
          });
        }
      },
      (status) => {
        if (isMounted) setCloudSyncStatus(status);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [schoolId]);

  // Handler to extract items from current selected month BKU
  const handleExtractFromMonth = (filterPerbaikanOnly: boolean = false) => {
    const extracted = extractRealItemsFromBKU(activeMonthData, filterPerbaikanOnly);

    if (extracted.length > 0) {
      const finalItems = extracted.map((item, idx) => ({ ...item, no: idx + 1 }));
      setRabItems(finalItems);
      setAiSuccessMessage(
        `Berhasil mengekstrak ${extracted.length} rincian belanja dari BKU & RKAS bulan ${currentMonthName} ${currentYear}.`
      );
      setTimeout(() => setAiSuccessMessage(null), 4000);
    } else {
      if (activeMonthData.length === 0) {
        setRabItems([]);
        alert(`Bulan ${currentMonthName} ${currentYear} belum memiliki data transaksi BKU/RKAS.`);
      } else {
        alert(
          `Tidak ditemukan transaksi dengan tag 'Perbaikan' di bulan ${currentMonthName}.`
        );
      }
    }
  };

  // Synchronize active config & rabItems into kegiatanList
  useEffect(() => {
    setKegiatanList((prev) =>
      prev.map((k) =>
        k.id === activeKegiatanId
          ? {
              ...k,
              config,
              rabItems,
              namaKegiatan: config.temaPerbaikan || k.namaKegiatan
            }
          : k
      )
    );
  }, [config, rabItems, activeKegiatanId]);

  // Switch month with multi-kegiatan support & zero stall data
  const handleSelectMonth = (monthIdx: number) => {
    isMonthSwitchingRef.current = true;
    setSelectedMonthIndex(monthIdx);
    if (onSelectMonthIndex) {
      onSelectMonthIndex(monthIdx);
    }

    const savedMonth = perbaikanStore[monthIdx];
    const targetArchive = monthlyStore?.[monthIdx];
    const targetData = targetArchive?.data || (monthIdx === activeMonthIndex ? data : []);

    const { list, activeId } = getInitialKegiatanForMonth(monthIdx, savedMonth, targetData);
    setKegiatanList(list);
    setActiveKegiatanId(activeId);
    const activeKeg = list.find((k) => k.id === activeId) || list[0];
    setConfig(activeKeg.config);
    setRabItems(activeKeg.rabItems || []);

    if (savedMonth && savedMonth.isSubmitted) {
      setAiSuccessMessage(
        `Data LPJ Perbaikan Bulan ${BULAN_NAMES[monthIdx - 1]} (${list.length} kegiatan) dimuat dari Cloud Firebase (Tersubmit).`
      );
    } else {
      if (activeKeg.rabItems.length > 0) {
        setAiSuccessMessage(
          `Bulan ${BULAN_NAMES[monthIdx - 1]} aktif: Berhasil memuat rincian kegiatan.`
        );
      } else {
        setAiSuccessMessage(
          `Bulan ${BULAN_NAMES[monthIdx - 1]} aktif: Draf baru.`
        );
      }
    }
    setTimeout(() => setAiSuccessMessage(null), 3500);

    setTimeout(() => {
      isMonthSwitchingRef.current = false;
    }, 150);
  };

  // Submit / Save Month LPJ to Firebase with all kegiatan preserved
  const currentMonthIsSubmitted = !!perbaikanStore[selectedMonthIndex]?.isSubmitted;

  const handleSubmitMonthPerbaikan = async () => {
    if (readOnly) return;
    setIsSubmittingCloud(true);
    setCloudSyncStatus('syncing');

    const totalVal = rabItems.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);

    // Ensure current active kegiatan in list is up to date
    const latestKegiatanList = kegiatanList.map((k) =>
      k.id === activeKegiatanId
        ? {
            ...k,
            config,
            rabItems,
            namaKegiatan: config.temaPerbaikan || k.namaKegiatan,
            isSubmitted: true,
            submittedAt: new Date().toISOString()
          }
        : {
            ...k,
            isSubmitted: true,
            submittedAt: k.submittedAt || new Date().toISOString()
          }
    );

    const mData: MonthPerbaikanData = {
      monthIndex: selectedMonthIndex,
      monthName: currentMonthName,
      isSubmitted: true,
      submittedAt: new Date().toISOString(),
      config,
      rabItems,
      totalAnggaran: totalVal,
      updatedAt: new Date().toISOString(),
      kegiatanList: latestKegiatanList,
      activeKegiatanId
    };

    const newStore = {
      ...perbaikanStore,
      [selectedMonthIndex]: mData
    };

    setPerbaikanStore(newStore);
    writeLS(schoolId, 'perbaikan_store_v2', newStore);

    try {
      await savePerbaikanToFirestore(schoolId, newStore, setCloudSyncStatus);
      setAiSuccessMessage(
        `LPJ Perbaikan (${latestKegiatanList.length} kegiatan) Bulan ${currentMonthName} ${currentYear} berhasil disubmit dan tersimpan permanen di Cloud Firebase!`
      );
      setTimeout(() => setAiSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Gagal simpan ke Firebase:', err);
      setAiSuccessMessage(
        `Disimpan di cache lokal. Periksa koneksi internet untuk sinkronisasi ke Cloud Firebase.`
      );
      setTimeout(() => setAiSuccessMessage(null), 5000);
    } finally {
      setIsSubmittingCloud(false);
    }
  };

  // Reset month back to draft
  const handleResetMonthToDraft = async () => {
    if (readOnly) return;
    if (!confirm(`Batalkan status submit untuk Bulan ${currentMonthName} ${currentYear}? Data bulan ini akan kembali menjadi draf.`)) {
      return;
    }
    const newStore = { ...perbaikanStore };
    delete newStore[selectedMonthIndex];
    setPerbaikanStore(newStore);
    writeLS(schoolId, 'perbaikan_store_v2', newStore);
    await savePerbaikanToFirestore(schoolId, newStore, setCloudSyncStatus);
    setAiSuccessMessage(`Bulan ${currentMonthName} kembali ke status draf.`);
    setTimeout(() => setAiSuccessMessage(null), 3500);
  };

  // Auto-sync updates to Firebase if this month is already submitted
  useEffect(() => {
    if (readOnly || isMonthSwitchingRef.current) return;
    if (perbaikanStore[selectedMonthIndex]?.isSubmitted) {
      const totalVal = rabItems.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
      const currentListWithLatest = kegiatanList.map((k) =>
        k.id === activeKegiatanId
          ? {
              ...k,
              config,
              rabItems,
              namaKegiatan: config.temaPerbaikan || k.namaKegiatan
            }
          : k
      );
      const updatedMonthData: MonthPerbaikanData = {
        ...perbaikanStore[selectedMonthIndex],
        config,
        rabItems,
        totalAnggaran: totalVal,
        updatedAt: new Date().toISOString(),
        kegiatanList: currentListWithLatest,
        activeKegiatanId
      };
      const newStore = {
        ...perbaikanStore,
        [selectedMonthIndex]: updatedMonthData
      };
      setPerbaikanStore(newStore);
      writeLS(schoolId, 'perbaikan_store_v2', newStore);
      debounceSavePerbaikanToFirestore(schoolId, newStore, setCloudSyncStatus);
    }
  }, [config, rabItems]);

  // ==========================================
  // MULTI-KEGIATAN & TRANSACTION PICKER LOGIC
  // ==========================================

  // Switch between kegiatan within the active month
  const handleSelectKegiatan = (targetId: string) => {
    if (targetId === activeKegiatanId) return;

    // 1. Update current active kegiatan in list
    const updatedList = kegiatanList.map((k) =>
      k.id === activeKegiatanId
        ? {
            ...k,
            config,
            rabItems,
            namaKegiatan: config.temaPerbaikan || k.namaKegiatan
          }
        : k
    );

    // 2. Load target kegiatan
    const target = updatedList.find((k) => k.id === targetId);
    if (target) {
      setKegiatanList(updatedList);
      setActiveKegiatanId(targetId);
      setConfig(target.config);
      setRabItems(target.rabItems || []);
      setAiSuccessMessage(`Beralih ke: ${target.config?.temaPerbaikan || target.namaKegiatan || 'Kegiatan'}`);
      setTimeout(() => setAiSuccessMessage(null), 3000);
    }
  };

  // Add new kegiatan in current active month
  const handleAddKegiatan = () => {
    if (readOnly) return;
    const newNum = kegiatanList.length + 1;
    const newId = `kegiatan-${Date.now()}`;
    const baseCfg = getDefaultConfig(selectedMonthIndex);

    const newConfig: PerbaikanSaprasConfig = {
      ...baseCfg,
      temaPerbaikan: `Kegiatan ${newNum}: Pemeliharaan / Perbaikan Sarpras`,
      nomorSPK: baseCfg.nomorSPK ? `${baseCfg.nomorSPK}.${newNum}` : `400.3.5.5/012.${newNum}/SPK`,
      nomorBA: baseCfg.nomorBA ? `${baseCfg.nomorBA}.${newNum}` : `400.3.5.5/028.${newNum}/BA`,
      nomorSuratPengantar: baseCfg.nomorSuratPengantar ? `${baseCfg.nomorSuratPengantar}.${newNum}` : `421.2/015.${newNum}/PENG`,
      nomorSuratPermohonan: baseCfg.nomorSuratPermohonan ? `${baseCfg.nomorSuratPermohonan}.${newNum}` : `421.2/016.${newNum}/MOHON`
    };

    const newKegiatan: PerbaikanKegiatanItem = {
      id: newId,
      namaKegiatan: `Kegiatan ${newNum}: Pemeliharaan Sarpras`,
      config: newConfig,
      rabItems: [], // Clean empty RAB for picking transactions
      selectedBkuNos: [],
      isSubmitted: false
    };

    const updatedList = kegiatanList.map((k) =>
      k.id === activeKegiatanId
        ? { ...k, config, rabItems, namaKegiatan: config.temaPerbaikan || k.namaKegiatan }
        : k
    );

    const finalList = [...updatedList, newKegiatan];
    setKegiatanList(finalList);
    setActiveKegiatanId(newId);
    setConfig(newConfig);
    setRabItems([]);

    setAiSuccessMessage(
      `Kegiatan ${newNum} berhasil ditambahkan! Silakan pilih transaksi belanja dari BKU untuk kegiatan ini.`
    );
    setTimeout(() => setAiSuccessMessage(null), 5000);

    // Auto-open transaction picker dialog
    setTimeout(() => {
      openTransactionPicker(newKegiatan);
    }, 400);
  };

  // Delete a kegiatan from current active month
  const handleDeleteKegiatan = (idToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (readOnly) return;
    if (kegiatanList.length <= 1) {
      alert('Minimal harus ada 1 kegiatan perbaikan dalam satu bulan.');
      return;
    }

    const target = kegiatanList.find((k) => k.id === idToDelete);
    const targetName = target?.config?.temaPerbaikan || target?.namaKegiatan || 'kegiatan ini';
    if (!confirm(`Hapus ${targetName}? Seluruh parameter dan dokumen kegiatan ini akan dihapus.`)) {
      return;
    }

    const remaining = kegiatanList.filter((k) => k.id !== idToDelete);
    setKegiatanList(remaining);

    if (activeKegiatanId === idToDelete) {
      const nextActive = remaining[0];
      setActiveKegiatanId(nextActive.id);
      setConfig(nextActive.config);
      setRabItems(nextActive.rabItems || []);
    }

    setAiSuccessMessage(`${targetName} berhasil dihapus.`);
    setTimeout(() => setAiSuccessMessage(null), 3000);
  };

  // Open Transaction Picker Modal
  const openTransactionPicker = (targetKeg?: PerbaikanKegiatanItem) => {
    const keg = targetKeg || kegiatanList.find((k) => k.id === activeKegiatanId);
    const existingNos = (keg?.selectedBkuNos && keg.selectedBkuNos.length > 0)
      ? keg.selectedBkuNos
      : (targetKeg ? targetKeg.rabItems : rabItems).map((r) => String(r.sumberBkuNo || '')).filter(Boolean);

    setPickerSelectedNos(Array.from(new Set(existingNos)));
    setPickerSearchQuery('');
    setPickerFilterPerbaikanOnly(true);
    setIsPickerOpen(true);
  };

  // Map of no_bku -> other kegiatan names using it (to prevent accidental duplicate allocation)
  const bkuUsageMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    kegiatanList.forEach((keg) => {
      if (keg.id === activeKegiatanId) return;
      const kegTitle = keg.config?.temaPerbaikan || keg.namaKegiatan || 'Kegiatan Lain';
      const nos = (keg.selectedBkuNos || []).concat(
        (keg.rabItems || []).map((r) => String(r.sumberBkuNo || '')).filter(Boolean)
      );
      nos.forEach((no) => {
        if (!no) return;
        const key = String(no);
        if (!map[key]) map[key] = [];
        if (!map[key].includes(kegTitle)) {
          map[key].push(kegTitle);
        }
      });
    });
    return map;
  }, [kegiatanList, activeKegiatanId]);

  // List of all candidate transactions from activeMonthData
  const availableBkuTransactions = useMemo(() => {
    return (activeMonthData || []).filter(
      (tx) => tx.tipe_transaksi === 'Pengeluaran' || (tx.total_pengeluaran_bku && tx.total_pengeluaran_bku > 0)
    );
  }, [activeMonthData]);

  // Filtered transactions in the picker dialog
  const filteredPickerTransactions = useMemo(() => {
    const q = pickerSearchQuery.toLowerCase().trim();

    return availableBkuTransactions.filter((tx) => {
      // STRICT: When filterPerbaikanOnly is ON, ONLY allow transactions explicitly classified with Tag 'Perbaikan'
      if (pickerFilterPerbaikanOnly && tx.klasifikasi !== 'Perbaikan') {
        return false;
      }

      const descStr = tx.keterangan || (tx.rincian_barang && tx.rincian_barang[0]?.uraian_barang) || (tx as any).uraian || '';
      const tokoStr = (tx as any).nama_toko || (tx as any).penerima || '';
      const text = `${tx.no_bku || ''} ${descStr} ${tokoStr} ${tx.kode_kegiatan || ''}`.toLowerCase();

      if (q) {
        return text.includes(q);
      }
      return true;
    });
  }, [availableBkuTransactions, pickerSearchQuery, pickerFilterPerbaikanOnly]);

  // Handle Apply Picked Transactions to current active kegiatan's RAB
  const handleApplyPickedTransactions = (mode: 'replace' | 'append' = 'replace') => {
    if (pickerSelectedNos.length === 0) {
      alert('Pilih minimal 1 transaksi BKU untuk diterapkan ke kegiatan ini.');
      return;
    }

    const selectedTxs = availableBkuTransactions.filter((tx) =>
      pickerSelectedNos.includes(String(tx.no_bku))
    );

    if (selectedTxs.length === 0) {
      alert('Tidak ada transaksi BKU yang cocok.');
      return;
    }

    // Extract ONLY authentic items from the selected transactions - ZERO injected items
    const extracted = extractRealItemsFromBKU(selectedTxs, false);

    let resultItems = extracted.map((item, idx) => ({ ...item, no: idx + 1 }));
    if (mode === 'append') {
      resultItems = [...rabItems, ...extracted].map((item, idx) => ({ ...item, no: idx + 1 }));
    }

    setRabItems(resultItems);

    // Auto-suggest temaPerbaikan if it still looks generic
    let updatedConfig = { ...config };
    const firstTxDesc = selectedTxs[0]?.keterangan || (selectedTxs[0]?.rincian_barang && selectedTxs[0].rincian_barang[0]?.uraian_barang) || '';
    if (firstTxDesc && (config.temaPerbaikan.startsWith('Kegiatan') || config.temaPerbaikan === 'Pemeliharaan dan Perbaikan Sarana Prasarana Sekolah')) {
      const cleanDesc = firstTxDesc.length > 55 ? firstTxDesc.substring(0, 52) + '...' : firstTxDesc;
      updatedConfig.temaPerbaikan = cleanDesc;
      setConfig(updatedConfig);
    }

    // Update current kegiatan in list
    setKegiatanList((prev) =>
      prev.map((k) =>
        k.id === activeKegiatanId
          ? {
              ...k,
              config: updatedConfig,
              namaKegiatan: updatedConfig.temaPerbaikan || k.namaKegiatan,
              rabItems: resultItems,
              selectedBkuNos: pickerSelectedNos
            }
          : k
      )
    );

    setIsPickerOpen(false);
    setAiSuccessMessage(
      `Berhasil menerapkan ${selectedTxs.length} transaksi BKU (${resultItems.length} rincian item) ke RAB kegiatan ini!`
    );
    setTimeout(() => setAiSuccessMessage(null), 4000);
  };

  // Scroll helpers for document preview
  const handleScrollToTop = () => {
    if (docScrollContainerRef.current) {
      docScrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToBottom = () => {
    if (docScrollContainerRef.current) {
      docScrollContainerRef.current.scrollTo({
        top: docScrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollToElement = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Calculations
  const totalAnggaran = useMemo(() => {
    return rabItems.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
  }, [rabItems]);

  const terbilangAnggaran = useMemo(() => {
    return terbilang(totalAnggaran);
  }, [totalAnggaran]);

  // Date interpretations for documents (Batasan 3: Menentukan hari awal perbaikan)
  const hariAwalPerbaikan = useMemo(() => getDayName(config.tglMulai), [config.tglMulai]);
  const hariSelesaiPerbaikan = useMemo(() => getDayName(config.tglSelesai), [config.tglSelesai]);
  const tglMulaiFormatted = useMemo(() => formatIndonesianDate(config.tglMulai), [config.tglMulai]);
  const tglSelesaiFormatted = useMemo(() => formatIndonesianDate(config.tglSelesai), [config.tglSelesai]);
  const tglSuratFormatted = useMemo(() => formatIndonesianDate(config.tglSurat), [config.tglSurat]);
  const tglBAFormatted = useMemo(() => formatIndonesianDate(config.tglBA), [config.tglBA]);

  const ejaanBA = useMemo(() => dateToSpelledOut(config.tglBA), [config.tglBA]);

  // Perbaikan daily attendance generator based on config.tglMulai and config.tglSelesai
  const perbaikanDaysList = useMemo(() => {
    const parseYMD = (str: string) => {
      if (!str) return null;
      const parts = str.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    if (!config.tglMulai || !config.tglSelesai) {
      const mStr = String(selectedMonthIndex).padStart(2, '0');
      return [
        { index: 1, dateStr: `${currentYear}-${mStr}-10`, hari: 'Senin', shortDay: 'Sen', shortDate: '10/' + mStr, tanggalFormatted: `10 ${currentMonthName} ${currentYear}`, uraianPekerjaanDefault: 'Persiapan peralatan, pembongkaran awal dan pembersihan area sarpras' },
        { index: 2, dateStr: `${currentYear}-${mStr}-11`, hari: 'Selasa', shortDay: 'Sel', shortDate: '11/' + mStr, tanggalFormatted: `11 ${currentMonthName} ${currentYear}`, uraianPekerjaanDefault: 'Pemasangan material dasar, pengerjaan konstruksi utama dan pembenahan fisik' },
        { index: 3, dateStr: `${currentYear}-${mStr}-12`, hari: 'Rabu', shortDay: 'Rab', shortDate: '12/' + mStr, tanggalFormatted: `12 ${currentMonthName} ${currentYear}`, uraianPekerjaanDefault: 'Perakitan komponen penunjang, perbaikan rangka dan plesteran' },
        { index: 4, dateStr: `${currentYear}-${mStr}-13`, hari: 'Kamis', shortDay: 'Kam', shortDate: '13/' + mStr, tanggalFormatted: `13 ${currentMonthName} ${currentYear}`, uraianPekerjaanDefault: 'Pengecatan dasar, pelapisan permukaan dan perapihan sambungan' },
        { index: 5, dateStr: `${currentYear}-${mStr}-14`, hari: 'Jumat', shortDay: 'Jum', shortDate: '14/' + mStr, tanggalFormatted: `14 ${currentMonthName} ${currentYear}`, uraianPekerjaanDefault: 'Finishing akhir, pengecatan lapis kedua dan pengujian kelayakan' },
        { index: 6, dateStr: `${currentYear}-${mStr}-15`, hari: 'Sabtu', shortDay: 'Sab', shortDate: '15/' + mStr, tanggalFormatted: `15 ${currentMonthName} ${currentYear}`, uraianPekerjaanDefault: 'Pembersihan sisa puing/material, inspeksi bersama panitia dan serah terima' }
      ];
    }

    const start = parseYMD(config.tglMulai);
    const end = parseYMD(config.tglSelesai);
    if (!start || !end || start > end) {
      return [];
    }

    const list: Array<{
      index: number;
      dateStr: string;
      hari: string;
      shortDay: string;
      shortDate: string;
      tanggalFormatted: string;
      uraianPekerjaanDefault: string;
    }> = [];

    const defaultTasks = [
      'Persiapan peralatan, pembongkaran awal dan pembersihan area sarpras',
      'Pemasangan material dasar, pengerjaan konstruksi utama dan pembenahan fisik',
      'Perakitan komponen penunjang, perbaikan rangka dan plesteran/penambalan',
      'Pengecatan dasar, pelapisan permukaan dan perapihan sambungan',
      'Finishing akhir, pengecatan lapis kedua dan pengujian kelayakan fungsi',
      'Pembersihan sisa puing/material, inspeksi bersama panitia dan serah terima hasil kerja'
    ];

    const cur = new Date(start);
    let dayIdx = 1;
    while (cur <= end && list.length < 60) {
      const isSunday = cur.getDay() === 0;
      const isSingleDay = start.getTime() === end.getTime();
      if (!isSunday || isSingleDay) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const hari = HARI_NAMES[cur.getDay()];
        const shortDay = hari.slice(0, 3);
        const shortDate = `${dd}/${mm}`;
        const tanggalFormatted = formatIndonesianDate(dateStr);
        const task = defaultTasks[(dayIdx - 1) % defaultTasks.length];

        list.push({
          index: dayIdx,
          dateStr,
          hari,
          shortDay,
          shortDate,
          tanggalFormatted,
          uraianPekerjaanDefault: task
        });
        dayIdx++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    return list;
  }, [config.tglMulai, config.tglSelesai, currentYear, currentMonthName, selectedMonthIndex]);

  // Pemecahan presensi per minggu (Maksimal 7 hari per tabel A4 agar tidak horizontal overflow)
  const weeklyDayChunks = useMemo(() => {
    const chunks: Array<{
      weekNumber: number;
      days: typeof perbaikanDaysList;
      startDateFormatted: string;
      endDateFormatted: string;
    }> = [];

    const CHUNK_SIZE = 7;
    for (let i = 0; i < perbaikanDaysList.length; i += CHUNK_SIZE) {
      const slice = perbaikanDaysList.slice(i, i + CHUNK_SIZE);
      chunks.push({
        weekNumber: Math.floor(i / CHUNK_SIZE) + 1,
        days: slice,
        startDateFormatted: slice[0]?.tanggalFormatted || '',
        endDateFormatted: slice[slice.length - 1]?.tanggalFormatted || ''
      });
    }
    return chunks;
  }, [perbaikanDaysList]);

  // Active Tukang List (Dari daftar pekerja di form config dengan Nama, NIK & Alamat untuk absensi)
  const activeTukangList: TukangPerbaikanItem[] = useMemo(() => {
    const totalDurationDays = perbaikanDaysList.length || 14;
    const baseList: TukangPerbaikanItem[] = Array.isArray(config.daftarTukang) && config.daftarTukang.length > 0
      ? config.daftarTukang
      : [
          {
            id: 'tukang-1',
            nama: config.namaTukang || 'Sulaeman',
            nik: '3201234567890001',
            alamat: config.alamatTukang || metadata.desaKecamatan || 'Lingkungan Sekolah',
            peran: 'Tukang Besi/Baja',
            upahPerHari: 120000,
            jumlahHari: totalDurationDays,
            totalUpah: 120000 * totalDurationDays
          },
          {
            id: 'tukang-2',
            nama: 'Asep Kusnadi',
            nik: '3201234567890002',
            alamat: metadata.desaKecamatan || 'Lingkungan Sekolah',
            peran: 'Tukang Pelaksana',
            upahPerHari: 100000,
            jumlahHari: totalDurationDays,
            totalUpah: 100000 * totalDurationDays
          }
        ];

    // Opsi Sinkronisasi Otomatis:
    // Pastikan hari kerja pekerja otomatis tersinkronisasi penuh dengan durasi efektif pelaksanaan fisik jika mode otomatis aktif
    const isAutoSync = config.syncMode !== 'manual';
    return baseList.map((t) => {
      const days = isAutoSync ? totalDurationDays : (Number(t.jumlahHari) || totalDurationDays);
      const wage = Number(t.upahPerHari) || 100000;
      return {
        ...t,
        jumlahHari: days,
        totalUpah: days * wage
      };
    });
  }, [config.daftarTukang, config.namaTukang, config.alamatTukang, config.syncMode, metadata.desaKecamatan, perbaikanDaysList.length]);

  // Total wage of all workers combined
  const totalUpahAllTukang = useMemo(() => {
    return activeTukangList.reduce((acc, t) => {
      const daysWorked = Number(t.jumlahHari) || perbaikanDaysList.length || 6;
      const wage = Number(t.upahPerHari) || 0;
      return acc + (daysWorked * wage);
    }, 0);
  }, [activeTukangList, perbaikanDaysList.length]);

  // Opsi Sinkronisasi Otomatis: Selaraskan baris Jasa Tenaga Kerja / Tukang di TABEL RAB
  // secara otomatis dengan durasi hari kerja (perbaikanDaysList.length) saat mode auto aktif
  useEffect(() => {
    if (config.syncMode === 'manual') return;
    const totalDays = perbaikanDaysList.length;
    if (!totalDays || totalDays <= 0) return;

    setRabItems((prev) => {
      let hasChanges = false;
      const updated = prev.map((item) => {
        const isLabor =
          item.namaBarang.toLowerCase().includes('jasa') ||
          item.namaBarang.toLowerCase().includes('tenaga kerja') ||
          item.namaBarang.toLowerCase().includes('tukang') ||
          item.satuan.toLowerCase().includes('oh') ||
          item.satuan.toLowerCase().includes('hari');
        if (!isLabor) return item;
        if (item.volume !== totalDays) {
          hasChanges = true;
          return {
            ...item,
            volume: totalDays,
            jumlah: totalDays * (Number(item.tarifHarga) || 0)
          };
        }
        return item;
      });
      return hasChanges ? updated : prev;
    });
  }, [perbaikanDaysList.length, config.syncMode]);

  // Handlers for Tukang (Nama, NIK, Alamat)
  const handleAddTukang = () => {
    if (readOnly) return;
    const current = Array.isArray(config.daftarTukang) ? config.daftarTukang : activeTukangList;
    const newTukang: TukangPerbaikanItem = {
      id: `tukang-${Date.now()}`,
      nama: '',
      nik: '',
      alamat: metadata.desaKecamatan || 'Lingkungan Sekolah',
      peran: 'Tukang Pelaksana',
      upahPerHari: 100000,
      jumlahHari: perbaikanDaysList.length || 6,
      totalUpah: 100000 * (perbaikanDaysList.length || 6)
    };
    setConfig((prev) => ({
      ...prev,
      daftarTukang: [...current, newTukang]
    }));
  };

  const handleUpdateTukang = (index: number, field: keyof TukangPerbaikanItem, value: any) => {
    if (readOnly) return;
    setConfig((prev) => {
      const current = [...(Array.isArray(prev.daftarTukang) ? prev.daftarTukang : activeTukangList)];
      if (!current[index]) return prev;
      const updatedTukang = { ...current[index], [field]: value };
      if (field === 'upahPerHari' || field === 'jumlahHari') {
        const days = field === 'jumlahHari' ? Number(value) || 0 : Number(updatedTukang.jumlahHari) || 0;
        const wage = field === 'upahPerHari' ? Number(value) || 0 : Number(updatedTukang.upahPerHari) || 0;
        updatedTukang.totalUpah = days * wage;
      }
      current[index] = updatedTukang;
      return {
        ...prev,
        daftarTukang: current,
        namaTukang: index === 0 && field === 'nama' ? value : prev.namaTukang
      };
    });
  };

  const handleDeleteTukang = (index: number) => {
    if (readOnly) return;
    setConfig((prev) => {
      const current = Array.isArray(prev.daftarTukang) ? prev.daftarTukang : activeTukangList;
      const filtered = current.filter((_, i) => i !== index);
      return {
        ...prev,
        daftarTukang: filtered,
        namaTukang: filtered[0]?.nama || ''
      };
    });
  };

  // Handler for adding material item in standard RAB table
  const handleAddRabItem = () => {
    if (readOnly) return;
    const newItem: PerbaikanRABItem = {
      id: `item-mat-${Date.now()}`,
      no: rabItems.length + 1,
      namaBarang: '',
      volume: 1,
      satuan: 'buah',
      tarifHarga: 50000,
      jumlah: 50000
    };
    setRabItems((prev) => [...prev, newItem]);
  };

  // Handler for adding Jasa Tenaga Kerja Kontruksi-Tukang Besi/Baja row in RAB table
  const handleAddJasaTenagaKerja = () => {
    if (readOnly) return;
    const defaultDays = perbaikanDaysList.length || 6;
    const newItem: PerbaikanRABItem = {
      id: `rab-jasa-${Date.now()}`,
      no: rabItems.length + 1,
      namaBarang: 'Jasa Tenaga Kerja Kontruksi-Tukang Besi/Baja',
      volume: defaultDays,
      satuan: 'OH',
      tarifHarga: 120000,
      jumlah: defaultDays * 120000
    };
    setRabItems((prev) => [...prev, newItem]);
  };

  // Sync working days of labor items in RAB to repair duration
  const handleSyncTukangDaysToDuration = () => {
    const totalDays = perbaikanDaysList.length || 1;
    let count = 0;
    const updated = rabItems.map((item) => {
      const isLabor = item.namaBarang.toLowerCase().includes('jasa') || item.namaBarang.toLowerCase().includes('tenaga kerja') || item.namaBarang.toLowerCase().includes('tukang') || item.satuan.toLowerCase().includes('oh') || item.satuan.toLowerCase().includes('hari');
      if (!isLabor) return item;
      count++;
      return {
        ...item,
        volume: totalDays,
        jumlah: totalDays * (Number(item.tarifHarga) || 0)
      };
    });
    setRabItems(updated);

    // Otomatis sinkronkan hari kerja seluruh pekerja di daftar tukang
    setConfig((prev) => {
      const currentTukang = Array.isArray(prev.daftarTukang) && prev.daftarTukang.length > 0 ? prev.daftarTukang : activeTukangList;
      const synced = currentTukang.map((t) => {
        const wage = Number(t.upahPerHari) || 100000;
        return {
          ...t,
          jumlahHari: totalDays,
          totalUpah: totalDays * wage
        };
      });
      return {
        ...prev,
        syncMode: 'auto',
        daftarTukang: synced
      };
    });

    setAiSuccessMessage(`✨ Opsi Sinkronisasi Otomatis Diterapkan: Hari kerja jasa tenaga kerja di RAB & absensi tukang berhasil diselaraskan menjadi ${totalDays} hari penuh (sesuai tanggal ${tglMulaiFormatted} s.d. ${tglSelesaiFormatted})`);
    setTimeout(() => setAiSuccessMessage(null), 4000);
  };

  // AI Generator for BAB III (1 Maksud, 3 Tujuan, 3 Identifikasi Masalah)
  const handleGenerateBab3Ai = () => {
    setIsAiGenerating(true);
    setAiSuccessMessage(null);

    const temaClean = config.temaPerbaikan.trim() || 'Perbaikan Sarana Prasarana Sekolah';
    const sekolahName = namaSekolah || 'Sekolah';
    const cleanSubject = temaClean.toLowerCase().replace(/perbaikan|pemeliharaan|rehabilitasi/gi, '').trim() || 'sarana prasarana';

    setConfig((prev) => ({
      ...prev,
      bab3Maksud: `Memperbaiki ${cleanSubject} ${sekolahName} agar lebih kokoh, aman, dan tahan lama.`,
      bab3Tujuan: [
        `Meningkatkan keamanan siswa dan ketertiban saat berada di lingkungan ${sekolahName}.`,
        `Menjaga batas dan kelayakan fasilitas sarana prasarana ${sekolahName} agar tidak mudah rusak atau diakses tanpa izin.`,
        `Meningkatkan nilai estetika, kerapian, dan kelayakan fasilitas ${sekolahName} untuk menunjang kegiatan pembelajaran.`
      ],
      bab3IdentifikasiMasalah: [
        `Terdapat keretakan dan kerusakan fisik pada bagian konstruksi fasilitas di ${sekolahName}.`,
        `Material yang digunakan sudah mengalami pelapukan dimakan usia sehingga kekuatannya menurun.`,
        `Apabila tidak segera diperbaiki dikhawatirkan dapat membahayakan keselamatan warga ${sekolahName}.`
      ]
    }));
    setAiSuccessMessage('BAB III berhasil disusun otomatis sesuai tema perbaikan & rincian RAB!');
    setTimeout(() => setAiSuccessMessage(null), 4000);
    setIsAiGenerating(false);
  };

  // Add / Edit / Remove Item in RAB Table
  const handleUpdateItem = (index: number, field: keyof PerbaikanRABItem, value: any) => {
    setRabItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'volume' || field === 'tarifHarga') {
        const vol = field === 'volume' ? Number(value) || 0 : Number(item.volume) || 0;
        const price = field === 'tarifHarga' ? Number(value) || 0 : Number(item.tarifHarga) || 0;
        item.jumlah = vol * price;
      }
      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    handleAddRabItem();
  };

  const handleDeleteItem = (index: number) => {
    if (readOnly) return;
    setRabItems((prev) => {
      const itemToDelete = prev[index];
      const filtered = prev.filter((_, i) => i !== index).map((item, idx) => ({
        ...item,
        no: idx + 1
      }));

      // Keep selectedBkuNos in sync so removed transactions are no longer tracked
      const remainingBkuNos = Array.from(
        new Set(filtered.map((r) => String(r.sumberBkuNo || '')).filter(Boolean))
      );

      setKegiatanList((prevKegs) =>
        prevKegs.map((k) =>
          k.id === activeKegiatanId
            ? {
                ...k,
                rabItems: filtered,
                selectedBkuNos: remainingBkuNos
              }
            : k
        )
      );

      if (itemToDelete?.sumberBkuNo) {
        const stillInRab = filtered.some((r) => String(r.sumberBkuNo) === String(itemToDelete.sumberBkuNo));
        if (!stillInRab) {
          setPickerSelectedNos((prevNos) =>
            prevNos.filter((no) => no !== String(itemToDelete.sumberBkuNo))
          );
        }
      }

      return filtered;
    });
  };

  const handleClearRab = () => {
    if (readOnly) return;
    if (confirm('Kosongkan semua rincian pada tabel RAB?')) {
      setRabItems([]);
      setKegiatanList((prevKegs) =>
        prevKegs.map((k) =>
          k.id === activeKegiatanId
            ? {
                ...k,
                rabItems: [],
                selectedBkuNos: []
              }
            : k
        )
      );
      setPickerSelectedNos([]);
    }
  };

  const handleSyncFromDataMaster = () => {
    const npsnVal = metadata.npsn || '';
    setConfig((prev) => ({
      ...prev,
      nomorSPK: npsnVal ? `400.3.5.5/012-${npsnVal}` : prev.nomorSPK,
      nomorSuratPengantar: npsnVal ? `421.2/015-${npsnVal}` : prev.nomorSuratPengantar,
      nomorSuratPermohonan: npsnVal ? `421.2/016-${npsnVal}` : prev.nomorSuratPermohonan,
      nomorBA: npsnVal ? `400.3.5.5/028-${npsnVal}` : prev.nomorBA,
      namaKomite: (metadata as any).komiteSekolah || (metadata as any).namaKomite || prev.namaKomite,
      bab3Maksud: `Memperbaiki dan memelihara sarana prasarana ${metadata.namaSekolah || 'Sekolah'} agar senantiasa layak, aman, dan nyaman untuk menunjang kegiatan pembelajaran.`
    }));
    setAiSuccessMessage('Data sekolah berhasil disinkronkan dari Data Master.');
    setTimeout(() => setAiSuccessMessage(null), 3500);
  };

  // Printing
  const handlePrint = () => {
    window.print();
  };

  // Data Master derivations (Strictly from metadata prop, clean fallbacks without dummy bias)
  const namaSekolah = metadata.namaSekolah?.trim() || 'SD NEGERI SATUAN PENDIDIKAN';
  const npsn = metadata.npsn?.trim() || '-';
  const nss = (metadata as any).nss?.trim() || (metadata as any).nomorStatistikSekolah?.trim() || '-';
  const alamatLengkap = metadata.alamatLengkap?.trim() || [metadata.desaKecamatan, metadata.kabupatenKota, metadata.provinsi].filter(Boolean).join(', ') || '-';
  const emailSekolah = metadata.emailSekolah?.trim() || '';
  const teleponSekolah = metadata.teleponSekolah?.trim() || '';
  const kabKota = metadata.kabupatenKota?.trim() || 'Kabupaten / Kota';
  const provinsi = metadata.provinsi?.trim() || 'Jawa Barat';
  const desaKecamatan = metadata.desaKecamatan?.trim() || '';
  const kepalaSekolah = metadata.kepalaSekolah?.trim() || 'Kepala Sekolah';
  const nipKepalaSekolah = metadata.nipKepalaSekolah?.trim() || '-';
  const bendahara = metadata.bendahara?.trim() || 'Bendahara Sekolah';
  const nipBendahara = metadata.nipBendahara?.trim() || '-';
  const sumberDana = metadata.sumberDana?.trim() || 'Dana BOSP';
  const tahunAnggaran = currentYear;

  const kotaSurat = useMemo(() => {
    if (metadata.desaKecamatan) {
      const cleanKec = metadata.desaKecamatan.replace(/kecamatan|desa|kelurahan/gi, '').split(',')[0].trim();
      if (cleanKec) return cleanKec;
    }
    if (metadata.kabupatenKota) {
      const cleanKab = metadata.kabupatenKota.replace(/kabupaten|kota/gi, '').trim();
      if (cleanKab) return cleanKab;
    }
    return 'Tempat';
  }, [metadata.desaKecamatan, metadata.kabupatenKota]);

  return (
    <div className="space-y-6">
      {/* Alert Notification if any */}
      {aiSuccessMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 text-sm no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{aiSuccessMessage}</span>
        </div>
      )}

      {/* Sub-Kegiatan Tabs (Multi-Kegiatan per Bulan) - No Print */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 shadow-2xs no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 pr-2 border-r border-amber-300">
            <Hammer className="w-4 h-4 text-amber-700" />
            <span>Kegiatan Bulan {currentMonthName} ({kegiatanList.length}):</span>
          </div>

          {kegiatanList.map((keg, idx) => {
            const isActive = keg.id === activeKegiatanId;
            const kegTotal = (isActive ? rabItems : keg.rabItems || []).reduce(
              (sum, item) => sum + (item.jumlah || 0),
              0
            );
            return (
              <div
                key={keg.id}
                onClick={() => handleSelectKegiatan(keg.id)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                    : 'bg-white hover:bg-amber-100 text-slate-700 border-amber-200'
                }`}
              >
                <span className="truncate max-w-[200px] sm:max-w-[280px]">
                  {keg.config?.temaPerbaikan || keg.namaKegiatan || `Kegiatan ${idx + 1}`}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                    isActive ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {formatRupiah(kegTotal)}
                </span>
                {kegiatanList.length > 1 && (
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={(e) => handleDeleteKegiatan(keg.id, e)}
                    className={`p-1 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'text-amber-200 hover:text-white hover:bg-rose-600'
                        : 'text-slate-400 hover:text-white hover:bg-rose-600'
                    }`}
                    title="Hapus paket kegiatan perbaikan ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            disabled={readOnly}
            onClick={handleAddKegiatan}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Tambah kegiatan perbaikan lain di bulan ini (misal dalam satu bulan ada 2 kegiatan perbaikan terpisah)"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>+ Tambah Kegiatan Baru</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => openTransactionPicker()}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Buka pemilih transaksi BKU untuk memilih transaksi yang dialokasikan khusus ke kegiatan ini"
          >
            <Filter className="w-3.5 h-3.5 text-amber-200" />
            <span>Pilih Transaksi dari BKU</span>
          </button>
        </div>
      </div>

      {/* Action Control Bar (No Print) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Compact Month Selector Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl mr-1">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">Bulan:</span>
            <select
              value={selectedMonthIndex}
              onChange={(e) => handleSelectMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {BULAN_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name} {currentYear}
                </option>
              ))}
            </select>
            {currentMonthIsSubmitted ? (
              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Cloud
              </span>
            ) : (
              <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                Draf
              </span>
            )}
          </div>

          {/* Document Tabs */}
          <button
            onClick={() => setActiveDocTab('proposal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDocTab === 'proposal'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Proposal (12 Halaman)
          </button>

          <button
            onClick={() => setActiveDocTab('spk')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDocTab === 'spk'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Surat Perintah Kerja (SPK)
          </button>

          <button
            onClick={() => setActiveDocTab('berita-acara')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDocTab === 'berita-acara'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Berita Acara (2 Halaman)
          </button>

          <button
            onClick={() => setActiveDocTab('absensi')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDocTab === 'absensi'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Absensi &amp; Upah Tukang
          </button>

          <button
            onClick={() => setActiveDocTab('rab')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeDocTab === 'rab'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Tabel RAB Lengkap
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmitMonthPerbaikan}
            disabled={readOnly || isSubmittingCloud}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              currentMonthIsSubmitted
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
            title="Simpan konfigurasi panitia dan rincian RAB bulan ini ke Firebase"
          >
            {isSubmittingCloud ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : currentMonthIsSubmitted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersimpan di Cloud
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5" />
                Submit ke Firebase
              </>
            )}
          </button>

          <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {showConfigPanel ? 'Sembunyikan Form' : 'Edit Parameter & RAB'}
            {showConfigPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Collapsible Config & RAB Editor Panel (No Print) */}
      {showConfigPanel && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-6 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                Form Parameter &amp; Batasan Dokumen Perbaikan Sapras
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi judul manual, nama komite, jadwal awal perbaikan, serta generate narasi BAB III dengan AI.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => openTransactionPicker()}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pilih transaksi BKU secara interaktif dengan checklist"
              >
                <Filter className="w-3.5 h-3.5 text-amber-200" />
                Pilih Transaksi BKU
              </button>
              <button
                disabled={readOnly}
                onClick={() => handleExtractFromMonth(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Tarik hanya item dengan tag Perbaikan pada BKU"
              >
                <Hammer className="w-3.5 h-3.5 text-amber-600" />
                Tarik Tag Perbaikan ({currentMonthName})
              </button>
              <button
                disabled={readOnly}
                onClick={() => handleExtractFromMonth(false)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Tarik seluruh rincian belanja pada bulan aktif"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                Tarik Semua Belanja Bulan Ini
              </button>
              <button
                disabled={readOnly}
                onClick={handleSyncFromDataMaster}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sinkronkan dengan Data Master Sekolah"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                Sinkron Data Master
              </button>
              <button
                disabled={readOnly}
                onClick={handleClearRab}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Kosongkan tabel RAB untuk input baru"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Kosongkan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tema / Judul Perbaikan (MANUAL INPUT) */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Tema / Judul Utama Perbaikan (Input Manual)</span>
                <span className="text-[10px] text-amber-600 font-normal">Ketik bebas manual</span>
              </label>
              <input
                type="text"
                value={config.temaPerbaikan}
                onChange={(e) => setConfig({ ...config, temaPerbaikan: e.target.value })}
                placeholder="Contoh: Perbaikan Gapura Sekolah"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Nama Sekolah (Batasan 1: Menggunakan nama sekolah Data Master) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Sekolah (Data Master)</span>
                <span className="text-[10px] text-emerald-600 font-normal">Tersinkron Master</span>
              </label>
              <input
                type="text"
                disabled
                value={namaSekolah}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed font-medium"
              />
            </div>

            {/* Komite Panitia Perbaikan (Batasan 2: Input Komite Panitia Perbaikan) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Nama Komite Panitia Perbaikan</span>
                <span className="text-[10px] text-amber-600 font-normal">Penandatangan Proposal</span>
              </label>
              <input
                type="text"
                value={config.namaKomite}
                onChange={(e) => setConfig({ ...config, namaKomite: e.target.value })}
                placeholder="Contoh: ATANG SUMARNA"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Batasan 3: Menentukan hari awal perbaikan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Tanggal Awal Mulai Perbaikan</span>
                <span className="text-[10px] font-bold text-amber-700">Hari: {hariAwalPerbaikan}</span>
              </label>
              <input
                type="date"
                value={config.tglMulai}
                onChange={(e) => setConfig({ ...config, tglMulai: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Tanggal Selesai */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Tanggal Selesai Perbaikan</span>
                <span className="text-[10px] text-slate-500">Hari: {hariSelesaiPerbaikan}</span>
              </label>
              <input
                type="date"
                value={config.tglSelesai}
                onChange={(e) => setConfig({ ...config, tglSelesai: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Tanggal Surat Permohonan / Proposal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tanggal Proposal / Permohonan</label>
              <input
                type="date"
                value={config.tglSurat}
                onChange={(e) => setConfig({ ...config, tglSurat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Tanggal Berita Acara */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tanggal Berita Acara Selesai</label>
              <input
                type="date"
                value={config.tglBA}
                onChange={(e) => setConfig({ ...config, tglBA: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Nomor SPK */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nomor SPK</label>
              <input
                type="text"
                value={config.nomorSPK}
                onChange={(e) => setConfig({ ...config, nomorSPK: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Nomor Berita Acara */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nomor Berita Acara</label>
              <input
                type="text"
                value={config.nomorBA}
                onChange={(e) => setConfig({ ...config, nomorBA: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Jabatan Komite */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-700">Jabatan Komite / Panitia</label>
              <input
                type="text"
                value={config.jabatanKomite}
                onChange={(e) => setConfig({ ...config, jabatanKomite: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Opsi Sinkronisasi Otomatis Banner & Controller */}
          <div className="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Opsi Sinkronisasi Otomatis:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      config.syncMode !== 'manual'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {config.syncMode !== 'manual' ? '✓ AKTIF (Kalender ↔ RAB ↔ Absensi Tukang)' : 'MANUAL'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Durasi efektif: <strong>{perbaikanDaysList.length} Hari Kerja</strong> ({tglMulaiFormatted} s.d. {tglSelesaiFormatted}).
                  Kehadiran <strong>Minggu Ke-1 (M-1)</strong> otomatis {Math.min(6, perbaikanDaysList.length)} hari (Senin–Sabtu), dan volume RAB disesuaikan {perbaikanDaysList.length} OH.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncTukangDaysToDuration}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Sinkronkan seluruh volume RAB dan absensi tukang ke durasi pelaksanaan sekarang"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Samakan ke Durasi ({perbaikanDaysList.length} Hari)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextMode = config.syncMode === 'manual' ? 'auto' : 'manual';
                  setConfig((prev) => ({ ...prev, syncMode: nextMode }));
                  if (nextMode === 'auto') handleSyncTukangDaysToDuration();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  config.syncMode !== 'manual'
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                {config.syncMode !== 'manual' ? 'Mode Otomatis Aktif' : 'Ubah ke Mode Otomatis'}
              </button>
            </div>
          </div>

          {/* Section Tabel RAB Editor (Standar Rencana Anggaran Biaya) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Rincian Perhitungan Belanja &amp; Jasa (Tabel RAB)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input rincian belanja bahan/material dan jasa tenaga kerja secara sederhana dan standar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => openTransactionPicker()}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Pilih transaksi belanja pengeluaran BKU untuk dimasukkan ke kegiatan ini"
                >
                  <Filter className="w-3.5 h-3.5 text-amber-200" />
                  Pilih Transaksi BKU
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleAddRabItem}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Tambah Material / Belanja
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleAddJasaTenagaKerja}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  + Tambah Jasa Tenaga Kerja
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSyncTukangDaysToDuration}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sesuaikan hari kerja jasa tenaga kerja dengan durasi tanggal pelaksanaan"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  Samakan Hari ke Durasi ({perbaikanDaysList.length} Hari)
                </button>
                {rabItems.length > 0 && (
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={handleClearRab}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Kosongkan seluruh baris pada tabel RAB"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Kosongkan Tabel
                  </button>
                )}
              </div>
            </div>

            {/* Clean Standard Table in Config Editor */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">No</th>
                    <th className="p-2.5 min-w-[280px]">Rincian Barang / Jasa Tenaga Kerja</th>
                    <th className="p-2.5 w-24 text-center">Volume</th>
                    <th className="p-2.5 w-24 text-center">Satuan</th>
                    <th className="p-2.5 w-32 text-right">Harga Satuan (Rp)</th>
                    <th className="p-2.5 w-32 text-right">Subtotal (Rp)</th>
                    <th className="p-2.5 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rabItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.namaBarang}
                          onChange={(e) => handleUpdateItem(idx, 'namaBarang', e.target.value)}
                          placeholder="Contoh: Semen Gresik 40 Kg atau Jasa Tenaga Kerja Kontruksi-Tukang Besi/Baja"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-amber-500 font-medium text-slate-900"
                        />
                      </td>
                      <td className="p-2.5 align-middle text-center">
                        <input
                          type="number"
                          value={item.volume}
                          onChange={(e) => handleUpdateItem(idx, 'volume', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-mono font-bold focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-2.5 align-middle text-center">
                        <input
                          type="text"
                          value={item.satuan}
                          onChange={(e) => handleUpdateItem(idx, 'satuan', e.target.value)}
                          placeholder="Sak/OH/Paket"
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-2.5 align-middle">
                        <input
                          type="number"
                          value={item.tarifHarga}
                          onChange={(e) => handleUpdateItem(idx, 'tarifHarga', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono font-bold focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold align-middle text-slate-900">
                        {formatRupiah(item.jumlah)}
                      </td>
                      <td className="p-2.5 text-center align-middle">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(idx);
                          }}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td colSpan={5} className="p-2.5 text-right text-slate-700 uppercase">
                      Total Nilai Anggaran ({rabItems.length} Rincian):
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-700 font-extrabold text-sm">
                      {formatRupiah(totalAnggaran)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section Daftar Pekerja / Tukang (Khusus Lampiran Absensi: Nama, NIK, Alamat Saja) */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Daftar Pekerja / Tukang (Untuk Lampiran Absensi Harian)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cukup isi Nama, NIK, dan Alamat seluruh tenaga kerja yang hadir untuk dicantumkan pada lembar absensi &amp; berita acara.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleSyncTukangDaysToDuration}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Otomatis samakan kehadiran seluruh pekerja dengan total durasi pelaksanaan"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  Samakan ke Durasi ({perbaikanDaysList.length} Hari)
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={handleAddTukang}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Tambah Pekerja
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">No</th>
                    <th className="p-2.5 min-w-[190px]">Nama Lengkap Pekerja</th>
                    <th className="p-2.5 w-44 text-center">NIK (16 Digit)</th>
                    <th className="p-2.5 min-w-[220px]">Alamat Domisili</th>
                    <th className="p-2.5 w-28 text-center">Hari Kerja</th>
                    <th className="p-2.5 w-12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeTukangList.map((t, tIdx) => (
                    <tr key={t.id || tIdx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-center font-bold text-slate-500">{tIdx + 1}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={t.nama}
                          onChange={(e) => handleUpdateTukang(tIdx, 'nama', e.target.value)}
                          placeholder="Contoh: Sulaeman"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="text"
                          value={t.nik || ''}
                          onChange={(e) => handleUpdateTukang(tIdx, 'nik', e.target.value)}
                          placeholder="3201xxxxxxxxxxxx"
                          maxLength={16}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-center font-mono focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={t.alamat || ''}
                          onChange={(e) => handleUpdateTukang(tIdx, 'alamat', e.target.value)}
                          placeholder="Contoh: Kp. Sukamaju RT 02/03 Desa Babakan"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 text-slate-700"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={perbaikanDaysList.length || 60}
                            value={t.jumlahHari}
                            onChange={(e) => handleUpdateTukang(tIdx, 'jumlahHari', parseInt(e.target.value, 10) || 0)}
                            className="w-16 px-2 py-1.5 border border-slate-300 rounded text-xs text-center font-bold font-mono focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-[11px] text-slate-500 font-medium">Hari</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center align-middle">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTukang(tIdx);
                          }}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Hapus pekerja"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

            {/* Action Bar: Simpan & Submit ke Firebase */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-800/60 -mx-5 -mb-5 p-4 rounded-b-2xl">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl flex items-center justify-center ${
                    currentMonthIsSubmitted
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {currentMonthIsSubmitted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Status LPJ Bulan {currentMonthName} {currentYear}:
                    </span>
                    {currentMonthIsSubmitted ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300/80 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Tersimpan di Cloud Firebase (Tersubmit)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300/80">
                        Draf Baru / Belum Disubmit
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentMonthIsSubmitted
                      ? `Data nama panitia, pelaksana, tanggal, dan rincian RAB bulan ${currentMonthName} tersimpan di Firebase. Ketika memilih bulan ini lagi, data akan dipanggil kembali.`
                      : `Tekan tombol "Simpan & Submit ke Firebase" agar konfigurasi bulan ini disimpan ke database cloud.`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentMonthIsSubmitted && (
                  <button
                    disabled={readOnly}
                    onClick={handleResetMonthToDraft}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Batalkan submit bulan ini agar kembali menjadi draf"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Batalkan Submit
                  </button>
                )}
                <button
                  onClick={handleSubmitMonthPerbaikan}
                  disabled={readOnly || isSubmittingCloud}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSubmittingCloud
                      ? 'bg-emerald-700 opacity-80 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  }`}
                >
                  {isSubmittingCloud ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan ke Firebase...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Simpan &amp; Submit LPJ {currentMonthName} ke Firebase
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ========================================================= */}
      {/* DOCUMENT PREVIEW & PRINT SECTION (SCROLLABLE VIEWPORT)     */}
      {/* ========================================================= */}
      <PrintConfigToolbar title="Pengaturan Margin & Cetak LPJ Perbaikan Sapras" />
      <div className="relative border border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-200/80 dark:bg-slate-950 p-2 sm:p-5 shadow-inner print:p-0 print:border-none print:bg-white print:shadow-none">
        {/* Sticky Preview Control Header */}
        <div className="sticky top-2 z-30 mb-4 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              {activeDocTab.toUpperCase()}
            </span>
            <span>
              {activeDocTab === 'proposal'
                ? 'Dokumen Proposal (12 Halaman)'
                : activeDocTab === 'spk'
                ? 'Surat Perintah Kerja (2 Hal)'
                : activeDocTab === 'berita-acara'
                ? 'Berita Acara (2 Hal)'
                : activeDocTab === 'absensi'
                ? 'Absensi & Tanda Terima Upah Tukang'
                : 'Tabel RAB Lengkap'}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-amber-300 font-mono">
              {currentMonthName} {currentYear}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Jump Navigator for Proposal */}
            {activeDocTab === 'proposal' && (
              <select
                onChange={(e) => {
                  if (e.target.value) handleScrollToElement(e.target.value);
                }}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Lompat ke Bab...</option>
                <option value="page-cover">Cover</option>
                <option value="page-daftar-isi">Daftar Isi</option>
                <option value="page-kata-pengantar">Kata Pengantar</option>
                <option value="page-surat-pengantar">Surat Pengantar</option>
                <option value="page-surat-permohonan">Surat Permohonan</option>
                <option value="page-bab1">BAB I Pendahuluan</option>
                <option value="page-bab2">BAB II Profil &amp; Tujuan</option>
                <option value="page-bab3">BAB III Maksud &amp; Tujuan</option>
                <option value="page-bab4">BAB IV RAB</option>
                <option value="page-bab5">BAB V Penutup</option>
                <option value="page-foto">Foto Dokumentasi</option>
              </select>
            )}

            <button
              onClick={handleScrollToTop}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Gulir ke Halaman Pertama"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ke Atas</span>
            </button>
            <button
              onClick={handleScrollToBottom}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Gulir ke Halaman Terakhir"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ke Bawah</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak (A4)
            </button>
          </div>
        </div>

        {/* Scrollable Viewport Container: scrollable, bounded height, doesn't stretch indefinitely */}
        <div
          ref={docScrollContainerRef}
          className="max-h-[780px] overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-8 custom-scrollbar print:max-h-none print:overflow-visible print:space-y-0 print:p-0"
        >

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: PROPOSAL LENGKAP (12 HALAMAN PERSIS DOKUMEN REFERENSI)      */}
        {/* ------------------------------------------------------------------ */}
        {activeDocTab === 'proposal' && (
          <div className="space-y-8 print:space-y-0 text-black font-serif">

            {/* HALAMAN 1: COVER PROPOSAL */}
            <div id="page-cover" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between items-center text-center print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div className="w-full pt-10">
                <h1 className="text-3xl font-bold tracking-wider mb-3 uppercase">PROPOSAL</h1>
                <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-900 mb-12">
                  {config.temaPerbaikan}
                </h2>

                {/* Logo Daerah / Lambang Sekolah dari Data Master */}
                <div className="my-16 flex justify-center">
                  {metadata.logoUrl ? (
                    <div className="w-48 h-56 border-2 border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 bg-amber-50/40 relative shadow-inner overflow-hidden">
                      <img
                        src={metadata.logoUrl}
                        alt="Logo Satuan Pendidikan"
                        className="max-h-36 max-w-36 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider mt-3 text-slate-800 text-center font-serif">
                        {namaSekolah}
                      </span>
                    </div>
                  ) : (
                    <div className="w-48 h-56 border-2 border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 bg-amber-50/40 relative shadow-inner">
                      <Building2 className="w-20 h-20 text-slate-700 stroke-[1.5]" />
                      <span className="text-xs font-bold uppercase tracking-widest mt-4 text-slate-800 text-center">
                        {kabKota.replace(/kabupaten|kota/gi, '').trim() || 'DINAS PENDIDIKAN'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans mt-1">Lambang Satuan Pendidikan / Daerah</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full pb-10">
                <h3 className="text-xl font-bold uppercase tracking-wider">{namaSekolah}</h3>
                {desaKecamatan && (
                  <p className="text-base font-bold uppercase tracking-wide mt-1">
                    {desaKecamatan.toUpperCase()}
                  </p>
                )}
                <p className="text-base font-bold uppercase tracking-wide">
                  {kabKota.toUpperCase()}
                </p>
                {provinsi && (
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-700 mt-0.5">
                    PROVINSI {provinsi.toUpperCase()}
                  </p>
                )}
                <p className="text-lg font-bold tracking-widest mt-2 uppercase">TAHUN {tahunAnggaran}</p>
                <div className="text-right text-xs text-slate-400 mt-6 font-sans">1</div>
              </div>
            </div>

            {/* HALAMAN 2: DAFTAR ISI */}
            <div id="page-daftar-isi" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <h2 className="text-center text-xl font-bold uppercase tracking-wider mb-10">DAFTAR ISI</h2>

                <div className="space-y-4 text-sm sm:text-base leading-relaxed">
                  <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                    <span>Kata Pengantar</span>
                    <span className="font-bold font-sans">3</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                    <span>Surat Permohonan {config.temaPerbaikan}</span>
                    <span className="font-bold font-sans">5</span>
                  </div>
                  <div className="pt-2">
                    <span className="font-bold block">BAB I</span>
                    <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                      <span>Pendahuluan</span>
                      <span className="font-bold font-sans">6</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="font-bold block">BAB II</span>
                    <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                      <span>Tujuan</span>
                      <span className="font-bold font-sans">7</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="font-bold block">BAB III</span>
                    <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                      <span>Maksud dan Tujuan</span>
                      <span className="font-bold font-sans">9</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="font-bold block">BAB IV</span>
                    <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                      <span>Rencana Kegiatan &amp; RAB</span>
                      <span className="font-bold font-sans">10</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="font-bold block">BAB V</span>
                    <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1">
                      <span>Penutup</span>
                      <span className="font-bold font-sans">11</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-dotted border-slate-400 pb-1 pt-2">
                    <span className="font-bold uppercase">FOTO DOKUMENTASI FISIK</span>
                    <span className="font-bold font-sans">12</span>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans">2</div>
            </div>

            {/* HALAMAN 3: KATA PENGANTAR */}
            <div id="page-kata-pengantar" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <h2 className="text-center text-xl font-bold uppercase tracking-wider mb-8">Kata Pengantar</h2>

                <div className="space-y-4 text-justify text-sm sm:text-base leading-relaxed">
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Puji syukur kami panjatkan kehadirat Allah SWT bahwa atas limpahan Rahmat dan Karunia-Nya, {namaSekolah} sampai saat ini masih mendapatkan kepercayaan dari masyarakat sebagai lembaga pendidikan dasar di {desaKecamatan ? `${desaKecamatan}, ` : ''}{kabKota} Provinsi {provinsi}. Perkenankan bersama ini kami selaku lembaga pendidikan merasa perlu mengajukan Proposal {config.temaPerbaikan}.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Proposal ini disusun sebagai bukti rencana optimalisasi kegiatan peningkatan mutu pendidikan sebagai pertimbangan Direktur Pembinaan SD, Direktorat Jenderal Pendidikan Dasar Kementerian Pendidikan Nasional serta Gubernur {provinsi} dan Kepala Dinas Pendidikan Provinsi {provinsi} serta Kepala Dinas Pendidikan {kabKota} dan tentunya sesuai dengan tujuan kita bersama dalam memajukan dan meningkatkan kualitas pendidikan.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Sebagai rasa syukur kami atas diterimanya proposal ini, maka dengan ini kami ucapkan terima kasih kepada :
                  </p>
                  <ol className="list-decimal pl-12 space-y-1">
                    <li>Kepala Koordinator Layanan Pendidikan {desaKecamatan || kabKota}</li>
                    <li>Kepala Sekolah {namaSekolah}</li>
                    <li>Pengurus Komite {namaSekolah}</li>
                  </ol>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Kami menyadari bahwa proposal ini masih jauh dari kesempurnaan khususnya dalam penulisan dan perumusan materi. Hal ini merupakan kekurangan dan keterbatasan kami dalam penyusunan proposal ini, namun kami berharap kekurangan tersebut tidak mengurangi niat baik pihak terkait untuk membangun dan meningkatkan kualitas pendidikan nasional.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-end mt-8">
                  <div className="text-center w-64 text-sm sm:text-base">
                    <p>{kotaSurat}, {tglSuratFormatted}</p>
                    <p className="font-semibold mt-1">{config.jabatanKomite}</p>
                    <div className="h-24"></div>
                    <p className="font-bold underline uppercase">{config.namaKomite}</p>
                    <p className="text-xs">NIP. -</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 font-sans mt-4">3</div>
              </div>
            </div>

            {/* HALAMAN 4: SURAT PENGANTAR PROPOSAL */}
            <div id="page-surat-pengantar" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                {/* KOP RESMI DINAS MENGGUNAKAN DATA MASTER */}
                <KopSuratDokumen metadata={metadata} />

                <div className="text-sm sm:text-base space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p>Kepada</p>
                      <p>Yth, Kepala Sekolah {namaSekolah}</p>
                      <p>{desaKecamatan || kabKota}</p>
                    </div>
                  </div>

                  <div className="text-center my-6">
                    <h4 className="font-bold underline uppercase tracking-wide">SURAT PENGANTAR</h4>
                    <p className="text-xs font-sans">Nomor : {config.nomorSuratPengantar}</p>
                  </div>

                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Bersama ini kami sampaikan berkas usulan dan permohonan dana kegiatan <strong>{config.temaPerbaikan}</strong> pada {namaSekolah} tahun anggaran {tahunAnggaran} untuk diperiksa dan ditindaklanjuti sebagaimana mestinya.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mt-12 text-sm sm:text-base">
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold underline">Tembusan disampaikan kepada Yth,</p>
                    <ol className="list-decimal pl-4 mt-1">
                      <li>Kepala Koordinator Layanan Pendidikan {desaKecamatan || kabKota}</li>
                      <li>Kepala Sekolah {namaSekolah}</li>
                    </ol>
                  </div>

                  <div className="text-center w-60">
                    <p>{kotaSurat}, {tglSuratFormatted}</p>
                    <p className="font-semibold mt-1">{config.jabatanKomite}</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline uppercase">{config.namaKomite}</p>
                    <p className="text-xs">NIP. -</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 font-sans mt-4">4</div>
              </div>
            </div>

            {/* HALAMAN 5: SURAT PERMOHONAN PERBAIKAN */}
            <div id="page-surat-permohonan" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                {/* KOP RESMI MENGGUNAKAN DATA MASTER */}
                <KopSuratDokumen metadata={metadata} />

                <div className="text-sm sm:text-base space-y-4">
                  <div className="grid grid-cols-6 gap-1 font-sans text-xs sm:text-sm">
                    <div className="col-span-1">Nomor</div>
                    <div className="col-span-5">: {config.nomorSuratPermohonan}</div>
                    <div className="col-span-1">Tanggal</div>
                    <div className="col-span-5">: {tglSuratFormatted}</div>
                    <div className="col-span-1">Lampiran</div>
                    <div className="col-span-5">: 1 (satu) berkas</div>
                    <div className="col-span-1">Perihal</div>
                    <div className="col-span-5 font-bold">: Permohonan {config.temaPerbaikan}</div>
                  </div>

                  <div className="pt-2">
                    <p>Kepada Yth,</p>
                    <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                    <p>{desaKecamatan || kabKota}</p>
                  </div>

                  <p className="indent-8 text-justify leading-relaxed pt-2" style={{ textIndent: '2rem' }}>
                    Sehubungan dengan adanya program Pengembangan Sarana dan Prasarana Sekolah untuk {config.temaPerbaikan} bagi SD/MI Negeri melalui Anggaran {sumberDana} {namaSekolah} tahun {tahunAnggaran}, dengan hormat kami mengajukan permohonan agar dapat memperoleh alokasi dana anggaran tersebut.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Melihat kondisi sekolah kami, dana anggaran tersebut akan kami gunakan untuk pekerjaan <strong>{config.temaPerbaikan}</strong> di {namaSekolah} sebagaimana tertuang dalam RKAS tahun {tahunAnggaran}.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Sebagai bahan pertimbangan, bersama ini kami sertakan usulan rencana penggunaan dana (RAB), surat pernyataan, foto kondisi sekolah, data kondisi fisik yang dilengkapi dengan rincian kebutuhan sebagai data pendukung.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Atas perhatian dan pertimbangannya, kami ucapkan terima kasih.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-end mt-8 text-sm sm:text-base">
                  <div className="text-center w-60">
                    <p>{kotaSurat}, {tglSuratFormatted}</p>
                    <p className="font-semibold mt-1">{config.jabatanKomite}</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline uppercase">{config.namaKomite}</p>
                    <p className="text-xs">NIP. -</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 font-sans mt-4">5</div>
              </div>
            </div>

            {/* HALAMAN 6: BAB I PENDAHULUAN */}
            <div id="page-bab1" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold uppercase">BAB I</h3>
                  <h4 className="text-lg font-bold uppercase tracking-wider">PENDAHULUAN</h4>
                </div>

                <div className="text-sm sm:text-base space-y-4 text-justify leading-relaxed">
                  <h5 className="font-bold">A. Latar belakang</h5>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Fasilitas sarana dan prasarana sekolah, khususnya {config.temaPerbaikan.toLowerCase().replace(/perbaikan|rehabilitasi/gi, '').trim() || 'sarana fisik sekolah'}, merupakan elemen penting dalam menciptakan lingkungan belajar yang aman, tertib, dan nyaman. Selain berfungsi sebagai penunjang utama operasional sekolah, fasilitas ini juga berperan langsung dalam menjaga keselamatan seluruh siswa dan warga sekolah dari ancaman eksternal serta mencegah akses yang tidak diinginkan.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Namun, kondisi fisik pada {namaSekolah} saat ini telah mengalami penurunan mutu dan kerusakan di beberapa bagian struktural, seperti keretakan konstruksi, bagian yang rapuh dimakan cuaca, serta potensi lepasnya material penutup. Kondisi ini berpotensi membahayakan siswa dan mengurangi estetika lingkungan belajar yang kondusif.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Oleh karena itu, diperlukan tindakan perbaikan segera melalui pekerjaan <strong>{config.temaPerbaikan}</strong> agar fungsi sarana prasarana {namaSekolah} dapat kembali optimal, kokoh, dan memberikan jaminan keamanan bagi seluruh ekosistem pendidikan.
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans">6</div>
            </div>

            {/* HALAMAN 7 & 8: BAB II TUJUAN */}
            <div id="page-bab2" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold uppercase">BAB II</h3>
                  <h4 className="text-lg font-bold uppercase tracking-wider">TUJUAN</h4>
                </div>

                <div className="text-sm sm:text-base space-y-3 text-justify leading-relaxed">
                  <p className="font-bold">B. Tujuan</p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Tujuan yang diharapkan oleh {namaSekolah} dalam implementasi kurikulum sebagai bentuk dan cara mewujudkan misi sekolah yang telah ditetapkan adalah sebagai berikut:
                  </p>

                  <h5 className="font-bold pt-2">1. Tujuan Jangka Pendek (1 Tahun ke depan)</h5>
                  <ol className="list-[lower-alpha] pl-6 space-y-1 text-xs sm:text-sm">
                    <li>Mengoptimalkan sarana prasarana sekolah untuk menunjang rancangan pembelajaran yang memotivasi keinginan selalu belajar.</li>
                    <li>Menyelenggarakan sistem penilaian dengan sistem digitalisasi.</li>
                    <li>Membentuk peserta didik yang taat dan tepat waktu melaksanakan ibadah.</li>
                    <li>Meningkatkan simpati dan empati peserta didik dalam kepedulian sosial.</li>
                    <li>Merancang program sekolah untuk mengenalkan implementasi kebhinekaan global di masyarakat.</li>
                    <li>Merancang pembelajaran yang bangga akan potensi daerah.</li>
                    <li>Menerapkan pondasi gotong royong dalam kegiatan kelas hingga sekolah.</li>
                    <li>Melaksanakan program dan pembelajaran HOTs untuk memperkuat bernalar kritis dan kreativitas.</li>
                    <li>Melaksanakan pembelajaran untuk mengasah kemampuan literasi dan numerasi.</li>
                    <li>Mempertahankan prestasi yang sudah tercapai sebelumnya.</li>
                  </ol>

                  <h5 className="font-bold pt-2">2. Tujuan Jangka Menengah (2-3 tahun ke depan)</h5>
                  <ol className="list-[lower-alpha] pl-6 space-y-1 text-xs sm:text-sm">
                    <li>Merancang pembelajaran yang sesuai dengan tingkat perbedaan kemampuan kognitif peserta didik mengarahkan pada keterampilan dan kecakapan hidup sesuai bakat dan minatnya.</li>
                    <li>Sekolah mampu melaksanakan penilaian secara akuntabel dan valid dengan sistem digitalisasi.</li>
                    <li>Meningkatkan kemampuan peserta didik dalam menghafal surat-surat pendek.</li>
                    <li>Membudayakan gerakan kebersihan sebagian daripada iman.</li>
                    <li>Meningkatkan kecintaan dan kebanggaan terhadap potensi daerah.</li>
                    <li>Melakukan kerjasama dengan stakeholder daerah atau Corporate Social Responsibility (CSR) perusahaan untuk merancang program pembelajaran berbasis budaya lokal.</li>
                    <li>Memotivasi peserta didik untuk menggagas inovasi sederhana untuk memberikan solusi dalam kehidupannya.</li>
                  </ol>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans">7</div>
            </div>

            {/* HALAMAN 9: BAB III MAKSUD DAN TUJUAN (SESUAI PERMINTAAN KETAT USER) */}
            <div id="page-bab3" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <div className="text-center mb-10">
                  <h3 className="text-lg font-bold uppercase">BAB III</h3>
                  <h4 className="text-lg font-bold uppercase tracking-wider">MAKSUD DAN TUJUAN</h4>
                </div>

                <div className="text-sm sm:text-base space-y-6 text-justify leading-relaxed">
                  {/* 1. Maksud (1 poin) */}
                  <div>
                    <h5 className="font-bold text-base mb-2">1. Maksud</h5>
                    <p className="indent-8 text-justify leading-relaxed pl-3 border-l-2 border-slate-300" style={{ textIndent: '2rem' }}>
                      {config.bab3Maksud}
                    </p>
                  </div>

                  {/* 2. Tujuan (3 list) */}
                  <div>
                    <h5 className="font-bold text-base mb-2">2. Tujuan</h5>
                    <ol className="list-[lower-alpha] pl-8 space-y-2">
                      {config.bab3Tujuan.map((tuj, idx) => (
                        <li key={idx} className="leading-relaxed">{tuj}</li>
                      ))}
                    </ol>
                  </div>

                  {/* 3. Identifikasi Masalah (3 list) */}
                  <div>
                    <h5 className="font-bold text-base mb-2">3. Identifikasi Masalah</h5>
                    <ol className="list-decimal pl-8 space-y-2">
                      {config.bab3IdentifikasiMasalah.map((mas, idx) => (
                        <li key={idx} className="leading-relaxed">{mas}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans">9</div>
            </div>

            {/* HALAMAN 10: BAB IV RENCANA KEGIATAN & TABEL RAB */}
            <div id="page-bab4" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold uppercase">BAB IV</h3>
                  <h4 className="text-lg font-bold uppercase tracking-wider">RENCANA KEGIATAN</h4>
                </div>

                <p className="indent-8 text-justify leading-relaxed mb-4 text-xs sm:text-sm" style={{ textIndent: '2rem' }}>
                  Pelaksanaan kegiatan {config.temaPerbaikan} pada {namaSekolah} dilaksanakan secara terstruktur dan bertahap melalui rincian rencana kegiatan sebagai berikut:
                </p>

                <div className="text-xs sm:text-sm space-y-2 text-justify leading-relaxed mb-6">
                  <ol className="list-decimal pl-6 space-y-1.5">
                    <li><strong>Survey dan Pengukuran:</strong> Dilakukan pengukuran ulang untuk menentukan area spesifik yang perlu diperbaiki.</li>
                    <li><strong>Pembongkaran Konstruksi Lama:</strong> Membersihkan dan membongkar bagian fasilitas yang sudah rusak, keropos, atau retak.</li>
                    <li><strong>Pembangunan dan Perbaikan:</strong>
                      <ul className="list-[lower-alpha] pl-5 mt-0.5 space-y-0.5">
                        <li>Perbaikan kerangka, dinding penopang, dan struktur utama.</li>
                        <li>Penggantian material penutup atau atap yang telah usang.</li>
                        <li>Pengecatan ulang dan pelapisan pelindung untuk memperpanjang usia pakai.</li>
                      </ul>
                    </li>
                    <li><strong>Pengecekan dan Finishing:</strong> Memastikan seluruh bagian pekerjaan telah terselesaikan dengan kokoh, rapi, dan aman.</li>
                  </ol>
                </div>

                {/* TABEL RAB RESMI DENGAN SATUAN & RINCIAN LENGKAP */}
                <div className="mt-4">
                  <h4 className="text-center font-bold text-sm uppercase mb-3 tracking-wide">
                    RAB {config.temaPerbaikan.toUpperCase()}
                  </h4>
                  <table className="w-full border-collapse border border-black text-[11px] font-sans">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th rowSpan={2} className="border border-black p-1.5 w-8">No</th>
                        <th rowSpan={2} className="border border-black p-1.5 text-left">Nama Barang / Uraian</th>
                        <th colSpan={3} className="border border-black p-1">Rincian Perhitungan</th>
                        <th rowSpan={2} className="border border-black p-1.5 w-24 text-right">Jumlah (Rp)</th>
                      </tr>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-black p-1 w-12">Vol</th>
                        <th className="border border-black p-1 w-14">Satuan</th>
                        <th className="border border-black p-1 w-20 text-right">Tarif Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rabItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="border border-black p-1 text-center">{idx + 1}</td>
                          <td className="border border-black p-1">{item.namaBarang}</td>
                          <td className="border border-black p-1 text-center">{item.volume}</td>
                          <td className="border border-black p-1 text-center">{item.satuan}</td>
                          <td className="border border-black p-1 text-right font-mono">
                            {Number(item.tarifHarga).toLocaleString('id-ID')}
                          </td>
                          <td className="border border-black p-1 text-right font-mono font-semibold">
                            {Number(item.jumlah).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-slate-50">
                        <td colSpan={5} className="border border-black p-1.5 text-right uppercase">
                          Total
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono text-xs">
                          {Number(totalAnggaran).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] italic mt-1 font-sans text-slate-600">
                    Terbilang: {terbilangAnggaran}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans mt-4">10</div>
            </div>

            {/* HALAMAN 11: BAB V PENUTUP */}
            <div id="page-bab5" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold uppercase">BAB V</h3>
                  <h4 className="text-lg font-bold uppercase tracking-wider">PENUTUP</h4>
                </div>

                <div className="text-sm sm:text-base space-y-4 text-justify leading-relaxed">
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Demikian proposal ini kami sampaikan sebagai upaya nyata dalam menciptakan lingkungan {namaSekolah} yang aman, nyaman, dan mendukung penuh peningkatan mutu pendidikan.
                  </p>
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Besar harapan kami agar proposal <strong>{config.temaPerbaikan}</strong> ini dapat diterima dan mendapatkan dukungan dari Kepala Sekolah {namaSekolah} maupun pihak-pihak terkait. Atas perhatian, dukungan, dan kerja samanya, kami ucapkan terima kasih.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-end mt-12 text-sm sm:text-base">
                  <div className="text-center w-64">
                    <p>{kotaSurat}, {tglSuratFormatted}</p>
                    <p className="font-semibold mt-1">{config.jabatanKomite}</p>
                    <div className="h-24"></div>
                    <p className="font-bold underline uppercase">{config.namaKomite}</p>
                    <p className="text-xs">NIP. -</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 font-sans mt-4">11</div>
              </div>
            </div>

            {/* HALAMAN 12: FOTO GAPURA / DOKUMENTASI FISIK */}
            <div id="page-foto" className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen">
              <div>
                <div className="text-center mb-8">
                  <h3 className="text-lg font-bold uppercase tracking-wider">
                    FOTO DOKUMENTASI FISIK {config.temaPerbaikan.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-1">{namaSekolah} &bull; {alamatLengkap}</p>
                </div>

                <div className="space-y-6">
                  {/* Foto 1: Sebelum Perbaikan (0%) */}
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                    <div className="h-64 bg-slate-200 border border-slate-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                      <Building2 className="w-16 h-16 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-600 font-sans uppercase">
                        Kondisi Fisik Sebelum Perbaikan (0%)
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Tampak keretakan struktur dan material yang telah usang
                      </span>
                    </div>
                    <p className="text-center text-xs font-semibold mt-2 font-sans text-slate-700">
                      Foto 1: Kondisi awal fisik {config.temaPerbaikan.toLowerCase()} sebelum renovasi
                    </p>
                  </div>

                  {/* Foto 2: Saat Pengerjaan / Setelah Perbaikan (100%) */}
                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50">
                    <div className="h-64 bg-slate-200 border border-slate-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                      <Hammer className="w-16 h-16 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-600 font-sans uppercase">
                        Pelaksanaan Perbaikan &amp; Finishing Fisik
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Pekerjaan pembongkaran, pergantian material, dan pengecatan
                      </span>
                    </div>
                    <p className="text-center text-xs font-semibold mt-2 font-sans text-slate-700">
                      Foto 2: Proses pengerjaan oleh tim teknis dan tukang bangunan
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans mt-4">12</div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: SURAT PERINTAH KERJA (SPK - SESUAI PDF 1)                   */}
        {/* ------------------------------------------------------------------ */}
        {activeDocTab === 'spk' && (
          <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] font-serif print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen">
            {/* KOP RESMI DARI DATA MASTER */}
            <KopSuratDokumen metadata={metadata} />

            {/* JUDUL SPK */}
            <div className="text-center my-6">
              <h3 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
                SURAT PERINTAH KERJA (SPK)
              </h3>
              <p className="text-xs sm:text-sm font-sans mt-0.5">
                Nomor : {config.nomorSPK}
              </p>
            </div>

            <div className="text-xs sm:text-sm space-y-4 text-justify leading-relaxed">
              {/* Kepada */}
              <div className="font-sans text-xs border border-black/30 rounded p-2.5 bg-slate-50/60 print:bg-transparent print:border-black space-y-1">
                <div className="font-bold text-slate-800 print:text-black">Kepada Yth. Tim Tenaga Kerja / Tukang Pelaksana:</div>
                <div className="space-y-1 pl-2">
                  {activeTukangList.map((t, idx) => (
                    <div key={t.id || idx} className="grid grid-cols-6 gap-1">
                      <div className="col-span-2 font-semibold">{idx + 1}. {t.nama || `Tukang ${idx + 1}`}</div>
                      <div className="col-span-4 text-slate-700 print:text-black">
                        : {t.nik ? `NIK. ${t.nik} • ` : ''}Alamat: {t.alamat || metadata.desaKecamatan || 'Lingkungan Sekolah'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold">
                  Perihal: Surat Perintah Kerja {config.temaPerbaikan}
                </p>
              </div>

              <div>
                <p className="font-bold">Deskripsi Pekerjaan:</p>
                <p className="indent-8 pl-4 mt-0.5" style={{ textIndent: '2rem' }}>
                  {config.temaPerbaikan} {namaSekolah} dengan Lokasi di {alamatLengkap}.
                </p>
              </div>

              <div>
                <p className="font-bold">Pekerjaan yang dilaksanakan:</p>
                <ul className="list-disc pl-8 space-y-1 mt-0.5">
                  <li>Penggantian bagian yang lama yang sudah rapuh/keropos atau rusak fisiknya.</li>
                  <li>Penyelesaian dan finishing perbaikan agar fasilitas lebih kokoh, aman, dan nyaman.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <p>
                  <strong>Nilai Anggaran:</strong> {formatRupiah(totalAnggaran)},- ({terbilangAnggaran})
                </p>
                <p>
                  <strong>Sumber Dana:</strong> {sumberDana} Tahun Anggaran {tahunAnggaran}
                </p>
                <p>
                  <strong>Jadwal Pelaksanaan:</strong> {tglMulaiFormatted} – {tglSelesaiFormatted} (Dimulai pada hari {hariAwalPerbaikan})
                </p>
                <p>
                  <strong>Sistem Pembayaran:</strong> Pembayaran upah tukang dan kenek dihitung harian dan dibayar pertermin/minggu.
                </p>
              </div>

              <div className="pt-1">
                <p className="font-bold">Syarat dan ketentuan:</p>
                <p className="indent-8 pl-4 mt-0.5" style={{ textIndent: '2rem' }}>
                  Tukang bangunan wajib mematuhi instruksi teknis yang telah disepakati di awal perjanjian kerja, apabila ada kelalaian kerja maka tanggung jawab dibebankan kepada pelaksana/tukang tersebut.
                </p>
              </div>

              <p className="indent-8 pt-2" style={{ textIndent: '2rem' }}>
                Demikian Surat Perintah Kerja ini dibuat untuk dilaksanakan dengan sebaik-baiknya.
              </p>
            </div>

            {/* Tanda Tangan Kepala Sekolah */}
            <div className="flex justify-end mt-12 text-xs sm:text-sm">
              <div className="text-center w-64">
                <p>Hormat kami,</p>
                <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                <div className="h-24"></div>
                <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                <p className="font-sans text-xs">NIP. {nipKepalaSekolah}</p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: BERITA ACARA PERAWATAN (2 HALAMAN SESUAI PDF 2)             */}
        {/* ------------------------------------------------------------------ */}
        {activeDocTab === 'berita-acara' && (
          <div className="space-y-8 print:space-y-0 text-black font-serif">

            {/* HALAMAN 1 BERITA ACARA */}
            <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always">
              <div>
                {/* KOP RESMI DARI DATA MASTER */}
                <KopSuratDokumen metadata={metadata} />

                <div className="text-center my-6">
                  <h3 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
                    BERITA ACARA
                  </h3>
                  <h4 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                    {config.temaPerbaikan}
                  </h4>
                </div>

                <div className="text-xs sm:text-sm space-y-4 text-justify leading-relaxed">
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Pada hari ini, <strong>{ejaanBA.tanggalEjaan}</strong> bulan <strong>{ejaanBA.bulan}</strong> tahun <strong>{ejaanBA.tahunEjaan}</strong>, bertempat di {namaSekolah} yang beralamat di {alamatLengkap}, telah dilaksanakan kegiatan {config.temaPerbaikan.toLowerCase()}. Kegiatan ini dilakukan sebagai upaya pemeliharaan dan perbaikan sarana prasarana sekolah agar tetap nyaman, aman, dan layak digunakan untuk kegiatan pembelajaran yang berlangsung di {namaSekolah}.
                  </p>

                  <div>
                    <p className="font-bold">Pihak yang terlibat:</p>
                    <ol className="list-decimal pl-6 space-y-1 mt-1">
                      <li>Nama : <strong>{kepalaSekolah}</strong> &nbsp;|&nbsp; Jabatan: Kepala Sekolah {namaSekolah}</li>
                      <li>Nama : <strong>{bendahara}</strong> &nbsp;|&nbsp; Jabatan: Bendahara {namaSekolah}</li>
                      {activeTukangList.map((t, idx) => (
                        <li key={t.id || idx}>
                          Nama : <strong>{t.nama || `Tukang ${idx + 1}`}</strong> &nbsp;|&nbsp; {t.nik ? `NIK: ${t.nik} | ` : ''}Alamat: {t.alamat || metadata.desaKecamatan || 'Lingkungan Sekolah'}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <p className="font-bold">Ruang Lingkup Pekerjaan:</p>
                    <ol className="list-decimal pl-6 mt-1">
                      <li>{config.temaPerbaikan} {namaSekolah}</li>
                    </ol>
                  </div>

                  <div>
                    <p className="font-bold">Waktu Pelaksanaan:</p>
                    <p className="indent-8 pl-4 mt-0.5" style={{ textIndent: '2rem' }}>
                      Pekerjaan dimulai pada hari <strong>{hariAwalPerbaikan}</strong> tanggal <strong>{tglMulaiFormatted}</strong> dan selesai pada hari <strong>{hariSelesaiPerbaikan}</strong> tanggal <strong>{tglSelesaiFormatted}</strong>.
                    </p>
                  </div>

                  <div>
                    <p className="font-bold">Catatan:</p>
                    <ul className="list-disc pl-6 space-y-1 mt-1">
                      <li>Kegiatan perawatan dan perbaikan fasilitas {namaSekolah} ini berjalan dengan baik dan lancar.</li>
                      <li>Tidak ada halangan yang berarti selama proses perbaikan berlangsung.</li>
                      <li>Semua pekerjaan telah selesai 100% dan sesuai dengan rencana teknis yang disepakati.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans">Hal. 1</div>
            </div>

            {/* HALAMAN 2 BERITA ACARA */}
            <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen">
              <div>
                <div className="text-xs sm:text-sm text-justify leading-relaxed pt-12">
                  <p className="indent-8 text-justify leading-relaxed" style={{ textIndent: '2rem' }}>
                    Demikian berita acara ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya bagi pertanggungjawaban administrasi dan operasional di {namaSekolah}.
                  </p>
                </div>

                <div className="mt-12 text-xs sm:text-sm">
                  <div className="text-right mb-6">
                    <p>{kotaSurat}, {tglBAFormatted}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                      <div className="h-28"></div>
                      <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                      <p className="font-sans text-xs">NIP. {nipKepalaSekolah}</p>
                    </div>

                    <div>
                      <p>&nbsp;</p>
                      <p className="font-semibold">Bendahara {namaSekolah},</p>
                      <div className="h-28"></div>
                      <p className="font-bold underline uppercase">{bendahara}</p>
                      <p className="font-sans text-xs">NIP. {nipBendahara}</p>
                    </div>
                  </div>

                  <div className="text-center mt-10">
                    <p className="font-semibold mb-2">Tim Teknis / Pelaksana Kerja Tukang:</p>
                    <div className="flex flex-wrap justify-center gap-8">
                      {activeTukangList.map((t, idx) => (
                        <div key={t.id || idx} className="min-w-[140px] text-center">
                          <div className="h-20"></div>
                          <p className="font-bold underline uppercase">{t.nama || `Tukang ${idx + 1}`}</p>
                          <p className="text-xs text-slate-600 font-sans">{t.peran || 'Tukang Pelaksana'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-sans">Hal. 2</div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB: LAPORAN ABSENSI & TANDA TERIMA UPAH TUKANG                    */}
        {/* ------------------------------------------------------------------ */}
        {activeDocTab === 'absensi' && (
          <div className="space-y-6 print:space-y-0 text-black font-sans">
            {/* Control Banner Opsi Sinkronisasi Otomatis (No Print) */}
            <div className="bg-gradient-to-r from-blue-50 to-amber-50 border border-blue-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print max-w-3xl mx-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Opsi Sinkronisasi Otomatis</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        config.syncMode !== 'manual'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {config.syncMode !== 'manual' ? '✓ AKTIF' : 'MANUAL'}
                    </span>
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Tanggal Pelaksanaan (<strong>{hariAwalPerbaikan}, {tglMulaiFormatted}</strong> s.d. <strong>{hariSelesaiPerbaikan}, {tglSelesaiFormatted}</strong>) terhitung <strong>{perbaikanDaysList.length} Hari Kerja Efektif</strong>.
                  Kehadiran <strong>Minggu Ke-1 (M-1)</strong> otomatis terisi <strong>{Math.min(6, perbaikanDaysList.length)} hari</strong> (Senin–Sabtu), dan volume RAB diselaraskan <strong>{perbaikanDaysList.length} OH</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncTukangDaysToDuration}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="Sinkronkan ulang seluruh hari kerja tukang dan volume RAB ke durasi kalender"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkronkan Sekarang ({perbaikanDaysList.length} Hari)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = config.syncMode === 'manual' ? 'auto' : 'manual';
                    setConfig((prev) => ({ ...prev, syncMode: nextMode }));
                    if (nextMode === 'auto') handleSyncTukangDaysToDuration();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    config.syncMode !== 'manual'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {config.syncMode !== 'manual' ? 'Mode Otomatis Aktif' : 'Beralih ke Otomatis'}
                </button>
              </div>
            </div>

            {perbaikanDaysList.length <= 7 ? (
              /* MODE KOMPAK: DURASI <= 7 HARI (DAFTAR HADIR & JURNAL DALAM 1 LEMBAR CETAK) */
              <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always print-page-break">
                <div>
                  <KopSuratDokumen metadata={metadata} />

                  <div className="text-center my-4">
                    <h3 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
                      DAFTAR HADIR (ABSENSI) HARIAN PEKERJA &amp; JURNAL KERJA
                    </h3>
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide mt-0.5">
                      KEGIATAN: {config.temaPerbaikan.toUpperCase()}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Satuan Pendidikan: {namaSekolah} &bull; Tahun Anggaran {tahunAnggaran} &bull; Bulan {currentMonthName} {currentYear}
                    </p>
                  </div>

                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 space-y-1 print:border-black print:bg-transparent">
                    <div className="grid grid-cols-6 gap-1">
                      <div className="col-span-2 font-semibold">Nama Pekerjaan</div>
                      <div className="col-span-4">: {config.temaPerbaikan}</div>
                      <div className="col-span-2 font-semibold">Waktu Pelaksanaan</div>
                      <div className="col-span-4">: {hariAwalPerbaikan}, {tglMulaiFormatted} s.d. {hariSelesaiPerbaikan}, {tglSelesaiFormatted}</div>
                      <div className="col-span-2 font-semibold">Durasi Efektif</div>
                      <div className="col-span-4">: {perbaikanDaysList.length} Hari Kerja ({activeTukangList.length} Orang Pekerja)</div>
                      <div className="col-span-2 font-semibold">Lokasi Pelaksanaan</div>
                      <div className="col-span-4">: {alamatLengkap}</div>
                    </div>
                  </div>

                  {/* TABEL A: MATRIKS DAFTAR HADIR HARIAN */}
                  <div className="mb-6">
                    <div className="text-xs font-bold uppercase mb-1.5 flex items-center justify-between">
                      <span>A. Rekapitulasi Presensi Kehadiran Harian</span>
                      <span className="text-[10px] font-normal normal-case italic text-slate-500 print:text-black">
                        * Tanda (✓) menyatakan kehadiran aktif pekerja di lokasi sekolah
                      </span>
                    </div>
                    <table className="w-full border-collapse border border-black text-[10.5px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th rowSpan={2} className="border border-black p-1.5 w-7">No</th>
                          <th rowSpan={2} className="border border-black p-1.5 min-w-[120px] text-left">Nama Pekerja / Tukang</th>
                          <th rowSpan={2} className="border border-black p-1.5 w-28 text-center">NIK</th>
                          <th rowSpan={2} className="border border-black p-1.5 min-w-[110px] text-left">Alamat</th>
                          <th colSpan={perbaikanDaysList.length || 1} className="border border-black p-1">
                            Hari &amp; Tanggal Kehadiran ({tglMulaiFormatted} s.d. {tglSelesaiFormatted})
                          </th>
                          <th rowSpan={2} className="border border-black p-1.5 w-16 text-center">Total Hadir</th>
                          <th rowSpan={2} className="border border-black p-1.5 w-14 text-center">Paraf</th>
                        </tr>
                        <tr className="bg-slate-100 font-bold text-center">
                          {perbaikanDaysList.map((day) => (
                            <th key={day.index} className="border border-black p-1 text-[9px] w-9">
                              <div className="font-semibold">{day.shortDay}</div>
                              <div className="font-mono text-[8.5px]">{day.shortDate || day.dateStr.slice(8)}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeTukangList.map((t, idx) => {
                          const daysWorked = Number(t.jumlahHari) || perbaikanDaysList.length;
                          return (
                            <tr key={t.id || idx} className="hover:bg-slate-50">
                              <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                              <td className="border border-black p-1.5 font-bold">{t.nama || `Tukang ${idx + 1}`}</td>
                              <td className="border border-black p-1.5 font-mono text-center text-[10px]">{t.nik || '-'}</td>
                              <td className="border border-black p-1.5 text-slate-700 text-[10px]">{t.alamat || metadata.desaKecamatan || 'Lingkungan Sekolah'}</td>
                              {perbaikanDaysList.map((day) => {
                                const isHadir = day.index <= daysWorked;
                                return (
                                  <td key={day.index} className="border border-black p-1 text-center font-bold text-xs">
                                    {isHadir ? '✓' : '-'}
                                  </td>
                                );
                              })}
                              <td className="border border-black p-1.5 text-center font-bold font-mono">
                                {daysWorked} Hari
                              </td>
                              <td className="border border-black p-1.5 text-center text-[10px] text-slate-400 italic">
                                Paraf {idx + 1}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Footnote Single-Week Attendance Table */}
                    <div className="text-[10px] text-slate-600 print:text-black italic px-1 pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 print:border-black mt-1">
                      <span>* Catatan: Tanda (✓) menyatakan kehadiran aktif pekerja fisik di lingkungan sekolah pada hari kerja berjalan.</span>
                      <span className="font-semibold not-italic text-emerald-800 print:text-black">
                        {config.syncMode !== 'manual' ? `✓ Sinkronisasi Otomatis Aktif (${perbaikanDaysList.length} Hari)` : 'Mode Manual'}
                      </span>
                    </div>
                  </div>

                  {/* TABEL B: JURNAL & CATATAN HARIAN PEKERJAAN */}
                  <div className="mb-4">
                    <div className="text-xs font-bold uppercase mb-1.5">
                      B. Jurnal Catatan Aktivitas Pekerjaan Fisik Harian
                    </div>
                    <table className="w-full border-collapse border border-black text-[10.5px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-black p-1.5 w-7">No</th>
                          <th className="border border-black p-1.5 w-28 text-left">Hari, Tanggal</th>
                          <th className="border border-black p-1.5 text-left">Uraian / Aktivitas Fisik yang Dilaksanakan</th>
                          <th className="border border-black p-1.5 w-32 text-center">Tenaga Hadir</th>
                          <th className="border border-black p-1.5 w-16 text-center">Paraf Mandor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {perbaikanDaysList.map((day) => (
                          <tr key={day.index}>
                            <td className="border border-black p-1 text-center font-semibold">{day.index}</td>
                            <td className="border border-black p-1 font-semibold">{day.hari}, {day.dateStr.slice(8)} {currentMonthName.slice(0, 3)}</td>
                            <td className="border border-black p-1 text-slate-800">{day.uraianPekerjaanDefault}</td>
                            <td className="border border-black p-1 text-center text-[10px]">
                              {activeTukangList.length} Orang Lengkap
                            </td>
                            <td className="border border-black p-1 text-center text-[9px] text-slate-400 italic">
                              ✓
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Tanda Tangan Hal 1 */}
                  <div className="grid grid-cols-2 gap-8 text-center mt-6 text-xs">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                      <p className="text-slate-500">NIP. {nipKepalaSekolah}</p>
                    </div>

                    <div>
                      <p>{kotaSurat}, {tglBAFormatted}</p>
                      <p className="font-semibold">Koordinator / Kepala Tukang</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline uppercase">{activeTukangList[0]?.nama || config.namaTukang}</p>
                      <p className="text-slate-500 font-sans">{activeTukangList[0]?.peran || 'Kepala Tukang'}</p>
                    </div>
                  </div>

                </div>

                <div className="text-right text-xs text-slate-400 font-sans mt-4">Hal. 1 (Daftar Hadir &amp; Jurnal)</div>
              </div>
            ) : (
              /* MODE MULTI-MINGGU: DURASI > 7 HARI (DAFTAR HADIR MINGGUAN DI LEMBAR 1, JURNAL DI LEMBAR 2) */
              <>
                {/* LEMBAR 1: DAFTAR HADIR (ABSENSI) HARIAN PEKERJA - REKAPITULASI MINGGUAN */}
                <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always print-page-break">
                  <div>
                    <KopSuratDokumen metadata={metadata} />

                    <div className="text-center my-4">
                      <h3 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
                        DAFTAR HADIR (ABSENSI) HARIAN PEKERJA
                      </h3>
                      <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide mt-0.5">
                        KEGIATAN: {config.temaPerbaikan.toUpperCase()}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Satuan Pendidikan: {namaSekolah} &bull; Tahun Anggaran {tahunAnggaran} &bull; Bulan {currentMonthName} {currentYear}
                      </p>
                    </div>

                    <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 space-y-1 print:border-black print:bg-transparent">
                      <div className="grid grid-cols-6 gap-1">
                        <div className="col-span-2 font-semibold">Nama Pekerjaan</div>
                        <div className="col-span-4">: {config.temaPerbaikan}</div>
                        <div className="col-span-2 font-semibold">Waktu Pelaksanaan</div>
                        <div className="col-span-4">: {hariAwalPerbaikan}, {tglMulaiFormatted} s.d. {hariSelesaiPerbaikan}, {tglSelesaiFormatted}</div>
                        <div className="col-span-2 font-semibold">Durasi Efektif</div>
                        <div className="col-span-4">: {perbaikanDaysList.length} Hari Kerja ({activeTukangList.length} Orang Pekerja, Terbagi {weeklyDayChunks.length} Minggu)</div>
                        <div className="col-span-2 font-semibold">Lokasi Pelaksanaan</div>
                        <div className="col-span-4">: {alamatLengkap}</div>
                      </div>
                    </div>

                    {/* TABEL PRESENSI PER MINGGU (MAKS 7 HARI PER TABEL, 100% FIT A4 PORTRAIT) */}
                    <div className="space-y-4 mb-4">
                      {weeklyDayChunks.map((chunk) => (
                        <div key={chunk.weekNumber} className="border border-black rounded overflow-hidden">
                          <div className="text-[11px] font-bold bg-slate-100 p-2 border-b border-black flex items-center justify-between">
                            <span className="uppercase text-slate-900">
                              Minggu Ke-{chunk.weekNumber} ({chunk.startDateFormatted} s.d. {chunk.endDateFormatted} &bull; {chunk.days.length} Hari Kerja)
                            </span>
                            <span className="text-[10px] font-normal italic text-slate-600 print:text-black">
                              * Tanda (✓) menyatakan kehadiran
                            </span>
                          </div>
                          <table className="w-full border-collapse text-[10.5px]">
                            <thead>
                              <tr className="bg-slate-50 font-bold text-center border-b border-black">
                                <th rowSpan={2} className="border-r border-black p-1 w-7 text-center">No</th>
                                <th rowSpan={2} className="border-r border-black p-1 text-left min-w-[110px]">Nama Pekerja</th>
                                <th rowSpan={2} className="border-r border-black p-1 text-center w-28">NIK</th>
                                <th rowSpan={2} className="border-r border-black p-1 text-left min-w-[100px]">Alamat</th>
                                <th colSpan={chunk.days.length} className="border-r border-black p-1">
                                  Hari &amp; Tanggal Kehadiran
                                </th>
                                <th rowSpan={2} className="border-r border-black p-1 text-center w-20">
                                  <div className="font-bold">Hadir M-{chunk.weekNumber}</div>
                                  <div className="text-[8.5px] font-normal text-slate-600 print:text-black leading-tight">(Minggu {chunk.weekNumber})</div>
                                </th>
                                <th rowSpan={2} className="p-1 text-center w-14">Paraf</th>
                              </tr>
                              <tr className="bg-slate-50 font-bold text-center border-b border-black">
                                {chunk.days.map((day) => (
                                  <th key={day.index} className="border-r border-black p-1 text-[9px] w-9">
                                    <div className="font-semibold">{day.shortDay}</div>
                                    <div className="font-mono text-[8.5px]">{day.shortDate || day.dateStr.slice(8)}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {activeTukangList.map((t, idx) => {
                                const daysWorked = Number(t.jumlahHari) || perbaikanDaysList.length;
                                const presentInChunk = chunk.days.filter((day) => day.index <= daysWorked).length;
                                return (
                                  <tr key={t.id || idx} className="border-b border-black last:border-b-0 hover:bg-slate-50">
                                    <td className="border-r border-black p-1 text-center font-bold">{idx + 1}</td>
                                    <td className="border-r border-black p-1 font-bold text-slate-900">{t.nama || `Tukang ${idx + 1}`}</td>
                                    <td className="border-r border-black p-1 font-mono text-center text-[10px]">{t.nik || '-'}</td>
                                    <td className="border-r border-black p-1 text-slate-700 text-[10px] truncate max-w-[120px]">{t.alamat || metadata.desaKecamatan || 'Lingkungan Sekolah'}</td>
                                    {chunk.days.map((day) => {
                                      const isHadir = day.index <= daysWorked;
                                      return (
                                        <td key={day.index} className="border-r border-black p-1 text-center font-bold text-xs">
                                          {isHadir ? '✓' : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className="border-r border-black p-1 text-center font-bold font-mono">
                                      {presentInChunk} Hari
                                    </td>
                                    <td className="p-1 text-center text-[10px] text-slate-400 italic">
                                      Paraf {idx + 1}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}

                      {/* Footnote Penjelasan Minggu dan Sinkronisasi Otomatis */}
                      <div className="text-[10px] text-slate-600 print:text-black italic px-1 pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 print:border-black mt-1">
                        <span>* Catatan: M-1 = Minggu Ke-1, M-2 = Minggu Ke-2, dst. Kolom Hadir M-x merupakan total hari kerja aktif (Senin–Sabtu) yang dihadiri pekerja pada minggu tersebut.</span>
                        <span className="font-semibold not-italic text-emerald-800 print:text-black">
                          {config.syncMode !== 'manual' ? `✓ Sinkronisasi Otomatis Aktif (${perbaikanDaysList.length} Hari Kerja)` : 'Mode Manual'}
                        </span>
                      </div>

                      {/* Rekapitulasi Kumulatif Seluruh Periode */}
                      <div className="p-2.5 bg-slate-50 border border-black rounded text-[11px] flex items-center justify-between font-mono">
                        <span className="font-sans font-bold">Total Durasi Efektif Perbaikan Fisik:</span>
                        <span className="font-bold text-slate-900">{perbaikanDaysList.length} Hari Kerja ({weeklyDayChunks.length} Minggu Pekerjaan)</span>
                      </div>
                    </div>

                    {/* Tanda Tangan Pengesahan Absensi */}
                    <div className="grid grid-cols-2 gap-8 text-center mt-6 text-xs">
                      <div>
                        <p>Mengetahui,</p>
                        <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                        <p className="text-slate-500">NIP. {nipKepalaSekolah}</p>
                      </div>

                      <div>
                        <p>{kotaSurat}, {tglBAFormatted}</p>
                        <p className="font-semibold">Koordinator / Kepala Tukang</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline uppercase">{activeTukangList[0]?.nama || config.namaTukang}</p>
                        <p className="text-slate-500 font-sans">{activeTukangList[0]?.peran || 'Kepala Tukang'}</p>
                      </div>
                    </div>

                  </div>

                  <div className="text-right text-xs text-slate-400 font-sans mt-4">Hal. 1 (Daftar Hadir Pekerja)</div>
                </div>

                {/* LEMBAR 2: JURNAL CATATAN AKTIVITAS PEKERJAAN FISIK HARIAN */}
                <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen print:page-break-after-always print-page-break">
                  <div>
                    <KopSuratDokumen metadata={metadata} />

                    <div className="text-center my-4">
                      <h3 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
                        JURNAL CATATAN AKTIVITAS PEKERJAAN FISIK HARIAN
                      </h3>
                      <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide mt-0.5">
                        KEGIATAN: {config.temaPerbaikan.toUpperCase()}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Satuan Pendidikan: {namaSekolah} &bull; Periode {tglMulaiFormatted} s.d. {tglSelesaiFormatted}
                      </p>
                    </div>

                    <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 space-y-1 print:border-black print:bg-transparent">
                      <p>Catatan uraian pekerjaan teknis dan kehadiran tenaga kerja harian yang diselenggarakan di bawah pengawasan Panitia Pemeliharaan Sekolah:</p>
                    </div>

                    {/* TABEL JURNAL LENGKAP */}
                    <div className="mb-4">
                      <table className="w-full border-collapse border border-black text-[10.5px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-center">
                            <th className="border border-black p-1.5 w-8">No</th>
                            <th className="border border-black p-1.5 w-32 text-left">Hari, Tanggal</th>
                            <th className="border border-black p-1.5 text-left">Uraian / Aktivitas Fisik yang Dilaksanakan</th>
                            <th className="border border-black p-1.5 w-32 text-center">Tenaga Hadir</th>
                            <th className="border border-black p-1.5 w-16 text-center">Paraf Mandor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perbaikanDaysList.map((day) => (
                            <tr key={day.index} className="hover:bg-slate-50">
                              <td className="border border-black p-1.5 text-center font-semibold">{day.index}</td>
                              <td className="border border-black p-1.5 font-semibold">{day.hari}, {day.dateStr.slice(8)} {currentMonthName.slice(0, 3)}</td>
                              <td className="border border-black p-1.5 text-slate-800">{day.uraianPekerjaanDefault}</td>
                              <td className="border border-black p-1.5 text-center text-[10px]">
                                {activeTukangList.length} Orang Lengkap
                              </td>
                              <td className="border border-black p-1.5 text-center text-[9px] text-slate-400 italic">
                                ✓
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Tanda Tangan Jurnal */}
                    <div className="grid grid-cols-2 gap-8 text-center mt-6 text-xs">
                      <div>
                        <p>Mengetahui,</p>
                        <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                        <p className="text-slate-500">NIP. {nipKepalaSekolah}</p>
                      </div>

                      <div>
                        <p>{kotaSurat}, {tglBAFormatted}</p>
                        <p className="font-semibold">Koordinator / Kepala Tukang</p>
                        <div className="h-20"></div>
                        <p className="font-bold underline uppercase">{activeTukangList[0]?.nama || config.namaTukang}</p>
                        <p className="text-slate-500 font-sans">{activeTukangList[0]?.peran || 'Kepala Tukang'}</p>
                      </div>
                    </div>

                  </div>

                  <div className="text-right text-xs text-slate-400 font-sans mt-4">Hal. 2 (Jurnal Aktivitas Harian)</div>
                </div>
              </>
            )}

            {/* LEMBAR 2: DAFTAR TANDA TERIMA UPAH TUKANG */}
            <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] flex flex-col justify-between print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen">
              <div>
                <KopSuratDokumen metadata={metadata} />

                <div className="text-center my-4">
                  <h3 className="text-base sm:text-lg font-bold underline uppercase tracking-wide">
                    DAFTAR TANDA TERIMA UPAH / ONGKOS KERJA TUKANG
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide mt-0.5">
                    KEGIATAN: {config.temaPerbaikan.toUpperCase()}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Bulan {currentMonthName} {currentYear} &bull; Sumber Dana: {sumberDana}
                  </p>
                </div>

                <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 space-y-1 print:border-black print:bg-transparent">
                  <p>Berdasarkan Surat Perintah Kerja (SPK) Nomor: <strong>{config.nomorSPK}</strong> tertanggal <strong>{tglSuratFormatted}</strong>, bersama ini telah dibayarkan upah/ongkos kerja tenaga pemeliharaan sarana prasarana sekolah dengan rincian nominatif sebagai berikut:</p>
                </div>

                {/* TABEL NOMINATIF TANDA TERIMA UPAH */}
                <table className="w-full border-collapse border border-black text-xs mb-4">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black p-2 w-8">No</th>
                      <th className="border border-black p-2 min-w-[120px] text-left">Nama Penerima / Tukang</th>
                      <th className="border border-black p-2 w-32 text-center">NIK</th>
                      <th className="border border-black p-2 min-w-[130px] text-left">Alamat</th>
                      <th className="border border-black p-2 w-24 text-right">Upah/Hari (Rp)</th>
                      <th className="border border-black p-2 w-16 text-center">Hari</th>
                      <th className="border border-black p-2 w-28 text-right">Total Upah (Rp)</th>
                      <th className="border border-black p-2 w-28 text-center">Tanda Tangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTukangList.map((t, idx) => {
                      const daysWorked = Number(t.jumlahHari) || perbaikanDaysList.length || 6;
                      const wage = Number(t.upahPerHari) || 100000;
                      const subtotal = daysWorked * wage;
                      const isOdd = (idx + 1) % 2 !== 0;
                      return (
                        <tr key={t.id || idx}>
                          <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-black p-2 font-bold">
                            {t.nama || `Tukang ${idx + 1}`}
                          </td>
                          <td className="border border-black p-2 font-mono text-center text-[10px]">
                            {t.nik || '-'}
                          </td>
                          <td className="border border-black p-2 text-slate-700 text-[10px]">
                            {t.alamat || metadata.desaKecamatan || 'Lingkungan Sekolah'}
                          </td>
                          <td className="border border-black p-2 text-right font-mono">
                            {wage.toLocaleString('id-ID')}
                          </td>
                          <td className="border border-black p-2 text-center font-mono font-bold">
                            {daysWorked}
                          </td>
                          <td className="border border-black p-2 text-right font-mono font-bold">
                            {subtotal.toLocaleString('id-ID')}
                          </td>
                          <td className="border border-black p-2 h-10 align-middle">
                            <div className={`text-[10px] text-slate-500 ${isOdd ? 'text-left pl-1' : 'text-right pr-1'}`}>
                              {idx + 1}. ..................
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={6} className="border border-black p-2 text-right uppercase">
                        Total Pembayaran Upah Tukang ({activeTukangList.length} Orang):
                      </td>
                      <td className="border border-black p-2 text-right font-mono text-sm font-extrabold">
                        {Number(totalUpahAllTukang).toLocaleString('id-ID')}
                      </td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 mb-6 print:border-black print:bg-transparent">
                  <p>
                    <strong>Terbilang:</strong> <em>{terbilang(totalUpahAllTukang)} Rupiah</em>
                  </p>
                  <p className="text-slate-500 text-[11px] print:text-black">
                    Telah dibayarkan lunas kepada seluruh tenaga kerja/tukang sesuai dengan absensi dan volume hari kerja fisik yang telah diselesaikan 100% dengan baik.
                  </p>
                </div>

                {/* 4 PIHAK TANDA TANGAN */}
                <div className="mt-8 text-xs">
                  <div className="text-right mb-4">
                    <p>{kotaSurat}, {tglBAFormatted}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8 text-center mb-8">
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                      <p className="text-slate-500">NIP. {nipKepalaSekolah}</p>
                    </div>

                    <div>
                      <p>Lunas Dibayar,</p>
                      <p className="font-semibold">Bendahara {namaSekolah}</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline uppercase">{bendahara}</p>
                      <p className="text-slate-500">NIP. {nipBendahara}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 text-center pt-2 border-t border-slate-200 print:border-black">
                    <div>
                      <p className="font-semibold">{config.jabatanKomite}</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline uppercase">{config.namaKomite}</p>
                      <p className="text-slate-500">Ketua Panitia / Komite</p>
                    </div>

                    <div>
                      <p className="font-semibold">Koordinator Tukang / Mandor</p>
                      <div className="h-20"></div>
                      <p className="font-bold underline uppercase">{activeTukangList[0]?.nama || config.namaTukang}</p>
                      <p className="text-slate-500">Perwakilan Penerima Upah</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="text-right text-xs text-slate-400 font-sans mt-4">Hal. {perbaikanDaysList.length > 7 ? '3' : '2'} (Tanda Terima Upah)</div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: TABEL RAB KHUSUS (SESUAI LAMPIRAN PDF)                      */}
        {/* ------------------------------------------------------------------ */}
        {activeDocTab === 'rab' && (
          <div className="bg-white p-8 sm:p-12 shadow-sm rounded-xl max-w-3xl mx-auto min-h-[1050px] font-sans print:shadow-none print:rounded-none print:m-0 print:p-0 print:min-h-screen">
            <div className="text-center mb-6">
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider">
                RAB {config.temaPerbaikan.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-600 mt-1">{namaSekolah} &nbsp;|&nbsp; {kabKota}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Sumber Dana: {sumberDana} Tahun Anggaran {tahunAnggaran}
              </p>
            </div>

            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th rowSpan={2} className="border border-black p-2 w-10">No</th>
                  <th rowSpan={2} className="border border-black p-2 text-left">Nama Barang</th>
                  <th colSpan={3} className="border border-black p-1.5">Rincian Perhitungan</th>
                  <th rowSpan={2} className="border border-black p-2 w-28 text-right">Jumlah (Rp)</th>
                </tr>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-1.5 w-14">Vol</th>
                  <th className="border border-black p-1.5 w-16">Satuan</th>
                  <th className="border border-black p-1.5 w-24 text-right">Tarif Harga</th>
                </tr>
              </thead>
              <tbody>
                {rabItems.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-black p-1.5">{item.namaBarang}</td>
                    <td className="border border-black p-1.5 text-center">{item.volume}</td>
                    <td className="border border-black p-1.5 text-center">{item.satuan}</td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {Number(item.tarifHarga).toLocaleString('id-ID')}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono font-semibold">
                      {Number(item.jumlah).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={5} className="border border-black p-2 text-right uppercase">
                    Total
                  </td>
                  <td className="border border-black p-2 text-right font-mono text-sm font-extrabold">
                    {Number(totalAnggaran).toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p>
                <strong>Terbilang:</strong> <em>{terbilangAnggaran}</em>
              </p>
              <p className="text-slate-500 text-[11px]">
                Seluruh rincian volume, satuan, dan harga tarif di atas telah disesuaikan dengan bukti transaksi penggabungan BKU &amp; RKAS.
              </p>
            </div>

            {/* Lembar Tanda Tangan */}
            <div className="grid grid-cols-2 gap-8 text-center mt-12 text-xs">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Sekolah {namaSekolah}</p>
                <div className="h-24"></div>
                <p className="font-bold underline uppercase">{kepalaSekolah}</p>
                <p className="text-slate-500">NIP. {nipKepalaSekolah}</p>
              </div>

              <div>
                <p>{kotaSurat}, {tglSuratFormatted}</p>
                <p className="font-semibold">{config.jabatanKomite}</p>
                <div className="h-24"></div>
                <p className="font-bold underline uppercase">{config.namaKomite}</p>
                <p className="text-slate-500">NIP. -</p>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* MODAL DIALOG: TRANSACTION PICKER (Checklist Transaksi BKU) */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Pilih Transaksi Belanja BKU</span>
                    <span className="text-xs font-normal text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Bulan {currentMonthName} {currentYear}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Alokasikan transaksi untuk: <strong className="text-amber-300">{config.temaPerbaikan}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder="Cari no BKU, uraian belanja, toko, atau kode rekening..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {pickerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPickerSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerFilterPerbaikanOnly(!pickerFilterPerbaikanOnly)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      pickerFilterPerbaikanOnly
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>Hanya Tag Perbaikan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const allVisibleNos = filteredPickerTransactions.map((t) => String(t.no_bku));
                      const combined = Array.from(new Set([...pickerSelectedNos, ...allVisibleNos]));
                      setPickerSelectedNos(combined);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    Pilih Semua
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerSelectedNos([])}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  Menampilkan <strong>{filteredPickerTransactions.length}</strong> dari{' '}
                  <strong>{availableBkuTransactions.length}</strong> transaksi pengeluaran BKU.
                </span>
                <span className="text-amber-800 font-medium">
                  {pickerSelectedNos.length} transaksi terpilih
                </span>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredPickerTransactions.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Tidak ada transaksi yang cocok.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Coba sesuaikan kata kunci pencarian atau matikan filter &apos;Hanya Tag Perbaikan&apos;.
                  </p>
                </div>
              ) : (
                filteredPickerTransactions.map((tx, idx) => {
                  const noStr = String(tx.no_bku);
                  const isChecked = pickerSelectedNos.includes(noStr);
                  const otherKegiatanUsing = bkuUsageMap[noStr] || [];
                  const isUsedElsewhere = otherKegiatanUsing.length > 0;

                  return (
                    <div
                      key={tx.no_bku || idx}
                      onClick={() => {
                        setPickerSelectedNos((prev) =>
                          prev.includes(noStr) ? prev.filter((id) => id !== noStr) : [...prev, noStr]
                        );
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-amber-300">
                              No. BKU: {tx.no_bku || '-'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {formatIndonesianDate(tx.tanggal)}
                            </span>
                            {tx.klasifikasi === 'Perbaikan' && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Tag: Perbaikan
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {formatRupiah(tx.total_pengeluaran_bku || 0)}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {tx.keterangan || (tx.rincian_barang && tx.rincian_barang[0]?.uraian_barang) || (tx as any).uraian || 'Uraian Belanja BKU'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {((tx as any).nama_toko || (tx as any).penerima) && (
                            <span>
                              Toko / Rekanan: <strong className="text-slate-700">{(tx as any).nama_toko || (tx as any).penerima}</strong>
                            </span>
                          )}
                          {tx.kode_kegiatan && (
                            <span>
                              Kode: <strong className="text-slate-700">{tx.kode_kegiatan}</strong>
                            </span>
                          )}
                        </div>

                        {/* Rincian item barang if exists from RKAS */}
                        {Array.isArray(tx.rincian_barang) && tx.rincian_barang.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-600 bg-slate-100/60 rounded-lg p-2 space-y-0.5">
                            <div className="font-semibold text-slate-700 text-[10px] uppercase tracking-wide">
                              Rincian Barang RKAS ({tx.rincian_barang.length} item):
                            </div>
                            {tx.rincian_barang.map((rb, rIdx) => (
                              <div key={rIdx} className="flex justify-between items-center text-[10.5px]">
                                <span className="truncate pr-2">
                                  • {rb.uraian_barang} ({rb.volume} {rb.satuan})
                                </span>
                                <span className="font-mono text-slate-700 shrink-0">
                                  {formatRupiah(rb.jumlah_transaksi || (rb.volume * rb.harga_satuan))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Usage warning if already used in other kegiatan */}
                        {isUsedElsewhere && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-700 bg-amber-100/60 border border-amber-300/80 rounded-md px-2 py-0.5">
                            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>
                              Telah dialokasikan di: <strong>{otherKegiatanUsing.join(', ')}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                Total terpilih:{' '}
                <strong className="text-slate-900 font-mono text-sm">
                  {formatRupiah(
                    availableBkuTransactions
                      .filter((tx) => pickerSelectedNos.includes(String(tx.no_bku)))
                      .reduce((acc, curr) => acc + (curr.total_pengeluaran_bku || 0), 0)
                  )}
                </strong>{' '}
                ({pickerSelectedNos.length} transaksi)
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPickedTransactions('append')}
                  disabled={pickerSelectedNos.length === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Tambahkan rincian belanja transaksi terpilih ke tabel RAB yang sudah ada"
                >
                  + Tambahkan ke RAB
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPickedTransactions('replace')}
                  disabled={pickerSelectedNos.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Ganti seluruh rincian RAB kegiatan ini dengan transaksi yang dipilih"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan ke TABEL RAB</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
