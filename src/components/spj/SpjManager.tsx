import React, { useState, useEffect } from 'react';
import { TransaksiBKU, SchoolMetadata, MasterEskul, MasterGuru, MasterSiswa, MonthlyArchive } from '../../types';
import { KwitansiManager } from '../KwitansiManager';
import { EskulLpjView } from './EskulLpjView';
import { UnifiedAlkebAtkManager } from './UnifiedAlkebAtkManager';
import { KonsumsiLpjView } from './KonsumsiLpjView';
import { SptjbView } from './SptjbView';
import { HonorReceiptView } from './HonorReceiptView';
import { RekapSpjView } from './RekapSpjView';
import { PerbaikanSaprasView } from './PerbaikanSaprasView';
import { formatRupiah } from '../SummaryCards';
import {
  FileText,
  Trophy,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  Sparkles,
  Layers,
  Building2,
  Users,
  Package,
  Brush,
  UtensilsCrossed,
  FileCheck2,
  Receipt,
  Hammer
} from 'lucide-react';

export type SpjSubTab =
  | 'kwitansi'
  | 'lpj-alkeb-atk'
  | 'lpj-perbaikan'
  | 'lpj-eskul'
  | 'lpj-konsumsi'
  | 'honor'
  | 'sptjb'
  | 'rekap'
  | 'logistik-bast'
  | 'lpj-atk'
  | 'lpj-alkeb';

interface SpjManagerProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  eskulList: MasterEskul[];
  teachers: MasterGuru[];
  students: MasterSiswa[];
  currentSubTab?: SpjSubTab;
  onSubTabChange?: (subTab: SpjSubTab) => void;
  selectedEskulId?: string;
  onUpdateEskul?: (newList: MasterEskul[]) => void;
  onUpdateMetadata?: (newMeta: SchoolMetadata) => void;
  onUpdateTeachers?: (newTeachers: MasterGuru[]) => void;
  onNavigateToMaster?: () => void;
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  onSelectMonthIndex?: (monthIndex: number) => void;
}

export const SpjManager: React.FC<SpjManagerProps> = ({
  data,
  metadata,
  eskulList,
  teachers,
  students,
  currentSubTab = 'lpj-alkeb-atk',
  onSubTabChange,
  selectedEskulId,
  onUpdateEskul,
  onUpdateMetadata,
  onUpdateTeachers,
  onNavigateToMaster,
  monthlyStore,
  activeMonthIndex,
  onSelectMonthIndex
}) => {
  const [internalSubTab, setInternalSubTab] = useState<SpjSubTab>(currentSubTab);

  useEffect(() => {
    if (currentSubTab) {
      setInternalSubTab(currentSubTab);
    }
  }, [currentSubTab]);

  const activeSubTab = internalSubTab;
  const handleSelectTab = (tab: SpjSubTab) => {
    setInternalSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  const pengeluaranList = data.filter((d) => d.tipe_transaksi === 'Pengeluaran');
  const kwitansiList = data.filter((d) => d.tipe_transaksi === 'Pengeluaran' && d.no_bku !== '-');
  const totalPengeluaran = pengeluaranList.reduce((acc, curr) => acc + curr.total_pengeluaran_bku, 0);

  const subTabs = [
    {
      id: 'kwitansi' as SpjSubTab,
      label: 'Generator Kwitansi BNU',
      icon: Receipt,
      count: `${kwitansiList.length} BNU`,
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: 'Cetak kwitansi & tanda tangan resmi BNU'
    },
    {
      id: 'lpj-alkeb-atk' as SpjSubTab,
      label: 'LPJ ALKEB & ATK',
      icon: Package,
      count: 'BAST & Opname',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      desc: 'Kelola distribusi barang BKU/RKAS, BAST per Guru & Opname Persediaan'
    },
    {
      id: 'lpj-perbaikan' as SpjSubTab,
      label: 'Perbaikan Sapras',
      icon: Hammer,
      count: 'Proposal & SPK',
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: 'Proposal 12 Bab, SPK, Berita Acara & RAB Perbaikan Sapras'
    },
    {
      id: 'lpj-eskul' as SpjSubTab,
      label: 'LPJ Ekstrakurikuler',
      icon: Trophy,
      count: `${(eskulList || []).length} Eskul`,
      badgeColor: 'bg-indigo-100 text-indigo-800',
      desc: 'Laporan resmi pelaksanaan eskul, capaian & honor pelatih'
    },
    {
      id: 'lpj-konsumsi' as SpjSubTab,
      label: 'LPJ Kombel (Pekan Pembinaan)',
      icon: UtensilsCrossed,
      count: 'Dokumen Kombel',
      badgeColor: 'bg-orange-100 text-orange-800',
      desc: 'Generator Dokumen: Undangan, Acara, Hadir & Notula'
    },
    {
      id: 'honor' as SpjSubTab,
      label: 'Tanda Terima Honor & Gaji',
      icon: CreditCard,
      count: 'Daftar Nominal',
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: 'Daftar honor pelatih, instruktur, guru & pajak PPh 21'
    },
    {
      id: 'sptjb' as SpjSubTab,
      label: 'SPTJB Permendikbudristek',
      icon: ShieldCheck,
      count: 'Surat Mutlak',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      desc: 'Surat Pernyataan Tanggung Jawab Belanja Kepala Sekolah'
    },
    {
      id: 'rekap' as SpjSubTab,
      label: 'Rekapitulasi Bukti SPJ',
      icon: FileSpreadsheet,
      count: `${pengeluaranList.length} BNU`,
      badgeColor: 'bg-blue-100 text-blue-800',
      desc: 'Rekap Berkas SPJ, Nota & Kwitansi Pengeluaran'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Info - No Print */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden no-print">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Modul SPJ &amp; LPJ BOSP Resmi
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Laporan Pertanggungjawaban (SPJ &amp; LPJ) {metadata.namaSekolah ? metadata.namaSekolah : 'Satuan Pendidikan'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Pusat penyusunan dokumen pertanggungjawaban terpadu sesuai ketentuan Permendikbudristek: LPJ Ekstrakurikuler, LPJ Pengadaan ATK, LPJ Alat Kebersihan, LPJ Konsumsi, Tanda Terima Honorarium, SPTJB, dan Rekapitulasi SPJ Belanja.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-300">
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Total Realisasi SPJ: <strong className="text-emerald-400 font-bold">{formatRupiah(totalPengeluaran)}</strong>
            </span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Total 7 Format Dokumen Resmi
            </span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Standar Permendikbudristek &amp; BOSP 2026
            </span>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Sub-Tab Navigation Bar - No Print */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs no-print">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-start p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-slate-800 text-emerald-400' : tab.badgeColor
                    }`}
                  >
                    {tab.count}
                  </span>
                </div>
                <div className="min-w-0 w-full">
                  <span className="text-[11px] font-bold block leading-tight truncate">{tab.label}</span>
                  <p
                    className={`text-[9.5px] mt-0.5 line-clamp-1 ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab Content Views */}
      <div className="transition-all duration-200">
        {activeSubTab === 'kwitansi' && (
          <KwitansiManager
            data={data}
            metadata={metadata}
            onUpdateMetadata={onUpdateMetadata}
          />
        )}

        {(activeSubTab === 'lpj-alkeb-atk' || activeSubTab === 'logistik-bast' || activeSubTab === 'lpj-atk' || activeSubTab === 'lpj-alkeb') && (
          <UnifiedAlkebAtkManager
            data={data}
            metadata={metadata}
            teachers={teachers}
            onUpdateTeachers={onUpdateTeachers}
            onNavigateToMaster={onNavigateToMaster}
            monthlyStore={monthlyStore}
            activeMonthIndex={activeMonthIndex}
            onSelectMonthIndex={onSelectMonthIndex}
            initialSubTab={
              activeSubTab === 'lpj-atk'
                ? 'lpj-atk'
                : activeSubTab === 'lpj-alkeb'
                ? 'lpj-alkeb'
                : activeSubTab === 'logistik-bast'
                ? 'dokumen-guru'
                : 'kelola'
            }
          />
        )}

        {activeSubTab === 'lpj-perbaikan' && (
          <PerbaikanSaprasView
            data={data}
            metadata={metadata}
            monthlyStore={monthlyStore}
            activeMonthIndex={activeMonthIndex}
            onSelectMonthIndex={onSelectMonthIndex}
          />
        )}

        {activeSubTab === 'lpj-eskul' && (
          <EskulLpjView
            eskulList={eskulList}
            metadata={metadata}
            bkuData={data}
            teachers={teachers}
            students={students}
            selectedEskulId={selectedEskulId}
            onUpdateEskul={onUpdateEskul}
            monthlyStore={monthlyStore}
            activeMonthIndex={activeMonthIndex}
            onSelectMonthIndex={onSelectMonthIndex}
          />
        )}

        {activeSubTab === 'lpj-konsumsi' && (
          <KonsumsiLpjView
            data={data}
            metadata={metadata}
            teachers={teachers}
            monthlyStore={monthlyStore}
            activeMonthIndex={activeMonthIndex}
            onSelectMonthIndex={onSelectMonthIndex}
          />
        )}

        {activeSubTab === 'honor' && (
          <HonorReceiptView
            data={data}
            metadata={metadata}
            eskulList={eskulList}
            teachers={teachers}
          />
        )}

        {activeSubTab === 'sptjb' && (
          <SptjbView data={data} metadata={metadata} />
        )}

        {activeSubTab === 'rekap' && (
          <RekapSpjView data={data} metadata={metadata} />
        )}
      </div>
    </div>
  );
};
