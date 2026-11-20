import React, { useState, useMemo } from 'react';
import { TransaksiBKU, RincianBarang, KlasifikasiSPJ, MasterEskul } from '../types';
import { formatRupiah } from './SummaryCards';
import { COMMON_SATUAN_OPTIONS } from '../utils/fileHelpers';
import {
  KLASIFIKASI_SPJ_OPTIONS,
  getKlasifikasiBadgeClass,
  detectDefaultKlasifikasiSPJ,
  findCorrelatedMasterEskul
} from '../utils/klasifikasiSpjHelper';
import { getCoachesFromEskul } from './master/EskulMasterTab';
import { useSchool } from '../context/SchoolContext';
import { readLS } from '../lib/schoolStorage';
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ChevronsUpDown,
  Search,
  CheckCircle2,
  HelpCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Plus,
  Boxes,
  Edit3,
  Check,
  AlertTriangle,
  Trophy,
  Tag,
  ExternalLink
} from 'lucide-react';

interface TransactionTableProps {
  data: TransaksiBKU[];
  expandedRows: Record<number, boolean>;
  toggleRow: (idx: number) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onToggleExpandAll?: () => void;
  onUpdateData: (newData: TransaksiBKU[]) => void;
  onDeleteAll: () => void;
  eskulList?: MasterEskul[];
  onNavigateToEskul?: (eskulId: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  data,
  expandedRows,
  toggleRow,
  onExpandAll,
  onCollapseAll,
  onToggleExpandAll,
  onUpdateData,
  onDeleteAll,
  eskulList,
  onNavigateToEskul
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Pemasukan' | 'Pengeluaran' | 'rkas_matched' | 'rkas_unmatched'>('all');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState<'all' | KlasifikasiSPJ>('all');
  const [filterEskul, setFilterEskul] = useState<string>('all');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deletingParentIdx, setDeletingParentIdx] = useState<number | null>(null);

  const { schoolId, readOnly } = useSchool();

  // Murni hanya ambil data dari Master Eskul yang diinput pengguna
  const effectiveEskulList = useMemo(() => {
    if (eskulList && Array.isArray(eskulList) && eskulList.length > 0) return eskulList;
    const saved = readLS<MasterEskul[]>(schoolId, 'master_eskul', []);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return eskulList || [];
  }, [eskulList, schoolId]);

  const expandedCount = data.filter((_, idx) => !!expandedRows[idx]).length;
  const isAllExpanded = data.length > 0 && expandedCount === data.length;
  const isAllCollapsed = expandedCount === 0;

  const handleExpandAll = () => {
    if (onExpandAll) {
      onExpandAll();
    } else if (onToggleExpandAll) {
      onToggleExpandAll();
    }
  };

  const handleCollapseAll = () => {
    if (onCollapseAll) {
      onCollapseAll();
    } else if (onToggleExpandAll) {
      onToggleExpandAll();
    }
  };

  // Update Child Item
  const handleUpdateChild = (
    parentIndex: number,
    childIndex: number,
    field: keyof RincianBarang,
    value: any
  ) => {
    const updated = [...data];
    const parent = { ...updated[parentIndex] };
    const rincianList = [...parent.rincian_barang];
    const targetChild = { ...rincianList[childIndex], [field]: value };

    // Auto calculate if volume & harga_satuan are present
    if (field === 'volume' || field === 'harga_satuan') {
      const vol = field === 'volume' ? value : targetChild.volume;
      const harga = field === 'harga_satuan' ? value : targetChild.harga_satuan;
      if (vol !== null && harga !== null && typeof vol === 'number' && typeof harga === 'number') {
        targetChild.jumlah_transaksi = vol * harga;
      }
    }

    rincianList[childIndex] = targetChild;
    parent.rincian_barang = rincianList;

    // Recalculate parent totals
    const sumChild = rincianList.reduce((acc, curr) => acc + (curr.jumlah_transaksi || 0), 0);
    if (parent.tipe_transaksi === 'Pengeluaran') {
      parent.total_pengeluaran_bku = sumChild;
    } else {
      parent.total_pemasukan_bku = sumChild;
    }

    updated[parentIndex] = parent;
    onUpdateData(updated);
  };

  // Delete Child Item
  const handleDeleteChild = (parentIndex: number, childIndex: number) => {
    const updated = [...data];
    const parent = { ...updated[parentIndex] };
    const rincianList = parent.rincian_barang.filter((_, i) => i !== childIndex);

    if (rincianList.length === 0) {
      // If no children left, remove parent transaction
      updated.splice(parentIndex, 1);
    } else {
      parent.rincian_barang = rincianList;
      const sumChild = rincianList.reduce((acc, curr) => acc + (curr.jumlah_transaksi || 0), 0);
      if (parent.tipe_transaksi === 'Pengeluaran') {
        parent.total_pengeluaran_bku = sumChild;
      } else {
        parent.total_pemasukan_bku = sumChild;
      }
      updated[parentIndex] = parent;
    }
    onUpdateData(updated);
  };

  // Add New Child Item
  const handleAddChild = (parentIndex: number) => {
    const updated = [...data];
    const parent = { ...updated[parentIndex] };
    const newChild: RincianBarang = {
      kode_rekening: parent.rincian_barang[0]?.kode_rekening || '5.1.02.01.01.0024',
      uraian_barang: 'Item Baru',
      volume: 1,
      satuan: 'buah',
      harga_satuan: 10000,
      jumlah_transaksi: 10000
    };
    parent.rincian_barang = [...parent.rincian_barang, newChild];
    const sumChild = parent.rincian_barang.reduce((acc, curr) => acc + (curr.jumlah_transaksi || 0), 0);
    if (parent.tipe_transaksi === 'Pengeluaran') {
      parent.total_pengeluaran_bku = sumChild;
    } else {
      parent.total_pemasukan_bku = sumChild;
    }
    updated[parentIndex] = parent;
    onUpdateData(updated);
  };

  // Delete Parent Record
  const handleDeleteParent = (parentIndex: number) => {
    const updated = data.filter((_, i) => i !== parentIndex);
    onUpdateData(updated);
    setDeletingParentIdx(null);
  };

  // Add New Parent Transaction
  const handleAddParentTransaction = () => {
    const newTrans: TransaksiBKU = {
      tanggal: '06-02-2026',
      no_bku: `BNU${String(data.length + 1).padStart(2, '0')}`,
      tipe_transaksi: 'Pengeluaran',
      total_pemasukan_bku: 0,
      total_pengeluaran_bku: 150000,
      keterangan: 'Transaksi Belanja Baru',
      rincian_barang: [
        {
          kode_rekening: '5.1.02.01.01.0024',
          uraian_barang: 'Belanja ATK Baru',
          volume: 1,
          satuan: 'buah',
          harga_satuan: 150000,
          jumlah_transaksi: 150000
        }
      ]
    };
    onUpdateData([...data, newTrans]);
  };

  // Change Klasifikasi SPJ on Parent Transaction
  const handleKlasifikasiChange = (parentIndex: number, newKlasifikasi: KlasifikasiSPJ) => {
    const updated = [...data];
    updated[parentIndex] = {
      ...updated[parentIndex],
      klasifikasi: newKlasifikasi
    };
    onUpdateData(updated);
  };

  // Change or Set Eskul Tag on Parent Transaction (Mendukung tag per-eskul atau per-pelatih)
  const handleEskulTagChange = (parentIndex: number, newTagValue: string) => {
    const updated = [...data];
    if (!newTagValue || newTagValue === 'none') {
      const { eskulId, eskulNama, pelatihId, pelatihNama, ...rest } = updated[parentIndex];
      updated[parentIndex] = rest;
    } else {
      let targetEskulId = newTagValue;
      let targetPelatihNama: string | undefined;
      let targetPelatihId: string | undefined;

      if (newTagValue.includes(':::')) {
        const [eId, pName] = newTagValue.split(':::');
        targetEskulId = eId;
        targetPelatihNama = pName;
      }

      const eskulObj = effectiveEskulList.find((e) => e.id === targetEskulId);
      if (targetPelatihNama && eskulObj) {
        const coaches = getCoachesFromEskul(eskulObj);
        const matchedCoach = coaches.find((c) => c.nama.toLowerCase().trim() === targetPelatihNama?.toLowerCase().trim());
        targetPelatihId = matchedCoach?.id;
      }

      updated[parentIndex] = {
        ...updated[parentIndex],
        eskulId: targetEskulId,
        eskulNama: eskulObj?.namaEskul,
        pelatihNama: targetPelatihNama,
        pelatihId: targetPelatihId
      };
    }
    onUpdateData(updated);
  };

  const filteredData = data.filter((item) => {
    if (filterType === 'Pemasukan' && item.tipe_transaksi !== 'Pemasukan') return false;
    if (filterType === 'Pengeluaran' && item.tipe_transaksi !== 'Pengeluaran') return false;

    // Filter berdasarkan Klasifikasi SPJ (Honorarium, Ekstrakurikuler, ATK, ALKEB, Kegiatan, Perbaikan, Lainnya)
    if (filterKlasifikasi !== 'all') {
      const currentKlas = item.klasifikasi || detectDefaultKlasifikasiSPJ(
        item.rincian_barang[0]?.uraian_barang || '',
        item.keterangan || '',
        item.rincian_barang[0]?.kode_rekening || '',
        item.kode_kegiatan || ''
      );
      if (currentKlas !== filterKlasifikasi) return false;
    }

    // Filter berdasarkan Tag Eskul (Korelasi Data Master Eskul)
    if (filterEskul !== 'all') {
      const correlated = findCorrelatedMasterEskul(item, effectiveEskulList);
      if (filterEskul === 'tagged') {
        if (!item.eskulId && !correlated) return false;
      } else {
        const matchedId = item.eskulId || correlated?.id;
        if (matchedId !== filterEskul) return false;
      }
    }

    const hasMatchedItem = item.rincian_barang.some(
      (b) => b.volume !== null && b.satuan !== null && b.harga_satuan !== null
    );
    if (filterType === 'rkas_matched' && !hasMatchedItem) return false;
    if (filterType === 'rkas_unmatched' && hasMatchedItem && item.tipe_transaksi === 'Pengeluaran') {
      const hasUnmatched = item.rincian_barang.some((b) => b.volume === null || b.harga_satuan === null);
      if (!hasUnmatched) return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    const correlatedForSearch = findCorrelatedMasterEskul(item, effectiveEskulList);
    const matchEskul =
      correlatedForSearch &&
      ((correlatedForSearch.namaEskul && correlatedForSearch.namaEskul.toLowerCase().includes(term)) ||
        (correlatedForSearch.namaPelatih && correlatedForSearch.namaPelatih.toLowerCase().includes(term)) ||
        (correlatedForSearch.kategori && correlatedForSearch.kategori.toLowerCase().includes(term)));

    const matchHeader =
      (item.no_bku && item.no_bku.toLowerCase().includes(term)) ||
      (item.tanggal && item.tanggal.toLowerCase().includes(term)) ||
      (item.tipe_transaksi && item.tipe_transaksi.toLowerCase().includes(term)) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(term)) ||
      (item.eskulNama && item.eskulNama.toLowerCase().includes(term)) ||
      !!matchEskul;

    const matchChild = (item.rincian_barang || []).some(
      (b) =>
        (b.kode_rekening && b.kode_rekening.toLowerCase().includes(term)) ||
        (b.uraian_barang && b.uraian_barang.toLowerCase().includes(term)) ||
        (b.satuan && b.satuan.toLowerCase().includes(term))
    );

    return matchHeader || matchChild;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari BNU, Uraian, Kode Rekening..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-60"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({data.length})
            </button>
            <button
              onClick={() => setFilterType('Pemasukan')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'Pemasukan' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType('Pengeluaran')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                filterType === 'Pengeluaran' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => setFilterType('rkas_matched')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer hidden sm:inline-block ${
                filterType === 'rkas_matched' ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              Ada di RKAS
            </button>
          </div>

          {/* Filter Klasifikasi SPJ */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Filter SPJ:</span>
            <select
              value={filterKlasifikasi}
              onChange={(e) => setFilterKlasifikasi(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Sub-Menu ({data.length})</option>
              {KLASIFIKASI_SPJ_OPTIONS.map((opt) => {
                const count = data.filter((d) => {
                  if (d.tipe_transaksi !== 'Pengeluaran') return false;
                  const k = d.klasifikasi || detectDefaultKlasifikasiSPJ(
                    d.rincian_barang[0]?.uraian_barang || '',
                    d.keterangan || '',
                    d.rincian_barang[0]?.kode_rekening || '',
                    d.kode_kegiatan || ''
                  );
                  return k === opt.value;
                }).length;
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.iconSymbol} {opt.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filter Tag Eskul (Korelasi Data Master Eskul) */}
          <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
            <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-indigo-900 whitespace-nowrap">Tag Eskul:</span>
            <select
              value={filterEskul}
              onChange={(e) => setFilterEskul(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[130px] truncate"
              title="Filter transaksi yang terkorelasi dengan Data Master Eskul"
            >
              <option value="all">Semua ({data.length})</option>
              <option value="tagged">🎯 Ter-Tag Eskul</option>
              {effectiveEskulList.map((esk) => {
                const count = data.filter((d) => {
                  if (d.tipe_transaksi !== 'Pengeluaran') return false;
                  const c = findCorrelatedMasterEskul(d, effectiveEskulList);
                  return (d.eskulId || c?.id) === esk.id;
                }).length;
                return (
                  <option key={esk.id} value={esk.id}>
                    {esk.namaEskul || 'Eskul'} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Action Controls & Collapse/Expand */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unified Collapse / Expand All Toggle Button */}
          {data.length > 0 && (
            <button
              type="button"
              onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-2xs cursor-pointer ${
                isAllExpanded
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-white hover:bg-indigo-50/80 text-indigo-700 border-indigo-200 hover:border-indigo-300'
              }`}
              title={isAllExpanded ? "Tutup (collapse) semua rincian barang/jasa" : "Buka (expand) semua rincian barang/jasa"}
            >
              {isAllExpanded ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>Tutup Semua Rincian</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Buka Semua Rincian</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleAddParentTransaction}
            disabled={readOnly}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Transaksi
          </button>

          {data.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={readOnly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Hapus Semua Data Transaksi"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 w-28">Tanggal</th>
              <th className="py-3 px-3 w-24">No. BKU</th>
              <th className="py-3 px-3 w-32">Tipe</th>
              <th className="py-3 px-3 w-44 text-left">Klasifikasi &amp; Tag Eskul</th>
              <th className="py-3 px-4">Deskripsi / Uraian Utama</th>
              <th className="py-3 px-3 w-24 text-center">
                <button
                  type="button"
                  onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
                  className="inline-flex items-center gap-1 hover:text-indigo-700 font-semibold cursor-pointer uppercase tracking-wider text-[11px]"
                  title={isAllExpanded ? "Klik untuk tutup semua rincian" : "Klik untuk buka semua rincian"}
                >
                  <span>Rincian</span>
                  {isAllExpanded ? (
                    <ChevronsUp className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ChevronsDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
              </th>
              <th className="py-3 px-4 w-36 text-right">Pemasukan (Rp)</th>
              <th className="py-3 px-4 w-36 text-right">Pengeluaran (Rp)</th>
              <th className="py-3 px-3 w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="space-y-2">
                    <Boxes className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-medium text-slate-600">Belum ada data transaksi atau data kosong.</p>
                    <p className="text-xs text-slate-400">Gunakan tombol "Upload File BKU & RKAS" atau "Tambah Transaksi" di atas.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const parentIdx = data.findIndex((d) => d === item);
                const isExpanded = !!expandedRows[parentIdx];
                const isPemasukan = item.tipe_transaksi === 'Pemasukan';

                return (
                  <React.Fragment key={parentIdx}>
                    {/* Parent Row */}
                    <tr
                      className={`transition-colors select-none ${
                        isExpanded
                          ? isPemasukan
                            ? 'bg-emerald-50/70'
                            : 'bg-indigo-50/60'
                          : isPemasukan
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-3 text-center text-slate-400 font-mono text-[11px] cursor-pointer"
                      >
                        {parentIdx + 1}
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap cursor-pointer"
                      >
                        {item.tanggal}
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-3 cursor-pointer"
                      >
                        {item.no_bku !== '-' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-800 text-amber-300">
                            {item.no_bku}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-3 whitespace-nowrap cursor-pointer"
                      >
                        {isPemasukan ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ArrowDownLeft className="w-3 h-3" />
                            Pemasukan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            <ArrowUpRight className="w-3 h-3" />
                            Pengeluaran
                          </span>
                        )}
                      </td>
                      {/* Kolom Klasifikasi SPJ & Tag Eskul */}
                      <td
                        className="py-3 px-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isPemasukan ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Non-SPJ
                          </span>
                        ) : (
                          <>
                            {/* 1. Klasifikasi SPJ Dropdown (First child of td to preserve DOM hierarchy) */}
                            <div className="relative inline-flex items-center">
                              {(() => {
                                const currentKlas = item.klasifikasi || detectDefaultKlasifikasiSPJ(
                                  item.rincian_barang[0]?.uraian_barang || '',
                                  item.keterangan || '',
                                  item.rincian_barang[0]?.kode_rekening || '',
                                  item.kode_kegiatan || ''
                                );
                                return (
                                  <>
                                    <select
                                      value={currentKlas}
                                      onChange={(e) => handleKlasifikasiChange(parentIdx, e.target.value as KlasifikasiSPJ)}
                                      className={`text-[11px] font-bold rounded-lg pl-2 pr-6 py-1 border cursor-pointer transition-all shadow-2xs focus:ring-2 focus:ring-offset-1 focus:outline-none appearance-none ${getKlasifikasiBadgeClass(currentKlas)}`}
                                      title="Pilih Klasifikasi Sub-Menu SPJ untuk BNU ini"
                                    >
                                      {KLASIFIKASI_SPJ_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-medium text-xs">
                                          {opt.iconSymbol} {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-current" />
                                  </>
                                );
                              })()}
                            </div>

                            {/* 2. Tag Eskul Dinamis Berdasarkan Data Master Eskul */}
                            {(() => {
                              const correlated = findCorrelatedMasterEskul(item, effectiveEskulList);
                              const currentKlas = item.klasifikasi || detectDefaultKlasifikasiSPJ(
                                item.rincian_barang[0]?.uraian_barang || '',
                                item.keterangan || '',
                                item.rincian_barang[0]?.kode_rekening || '',
                                item.kode_kegiatan || ''
                              );
                              const isLikelyEskul =
                                !!correlated ||
                                currentKlas === 'Ekstrakurikuler' ||
                                /eskul|ekstrakulikuler|ekstrakurikuler|pelatih|pramuka|drumband|tari|futsal|bulutangkis|latihan/i.test(
                                  `${item.keterangan || ''} ${item.rincian_barang[0]?.uraian_barang || ''}`
                                );

                              if (correlated) {
                                return (
                                  <div className="mt-1 flex items-center gap-1">
                                    <div className="relative inline-flex items-center group">
                                      <div
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer shadow-2xs ${
                                          item.eskulId
                                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                        }`}
                                        title={`Terkorelasi dengan Master Eskul:\n• ${correlated.namaEskul || '-'}\n• Pelatih: ${item.pelatihNama ? `${item.pelatihNama} (Khusus Transaksi Ini)` : (correlated.namaPelatih || '-')}\n• Honor: ${formatRupiah(correlated.honorPerKegiatan || 75000)}/kegiatan\n(Klik untuk ganti atau lepas tag)`}
                                      >
                                        <Trophy className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                                        <span className="max-w-[125px] truncate">
                                          {(correlated.namaEskul || '').replace(/^Ekstrakurikuler\s+/i, '').replace(/^Seni\s+/i, '')}
                                          {item.pelatihNama ? ` (${item.pelatihNama})` : ''}
                                        </span>
                                        <ChevronDown className="w-2.5 h-2.5 opacity-60 text-slate-500" />
                                      </div>
                                      <select
                                        value={
                                          item.pelatihNama
                                            ? `${item.eskulId}:::${item.pelatihNama}`
                                            : item.eskulId || correlated.id
                                        }
                                        onChange={(e) => handleEskulTagChange(parentIdx, e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-xs"
                                        title="Ganti Tag Eskul atau Tentukan Pelatih Tertentu"
                                      >
                                         <optgroup label="Tautkan dengan Data Master Eskul:">
                                          {effectiveEskulList.map((esk) => {
                                            const coaches = getCoachesFromEskul(esk);
                                            if (coaches.length > 1) {
                                              return (
                                                <React.Fragment key={esk.id}>
                                                  {coaches.map((c, cIdx) => (
                                                    <option
                                                      key={`${esk.id}-${c.id || cIdx}`}
                                                      value={`${esk.id}:::${c.nama}`}
                                                    >
                                                      🏷️ {esk.namaEskul} - Pelatih: {c.nama} {c.peran ? `(${c.peran})` : `(Pelatih ${cIdx + 1})`}
                                                    </option>
                                                  ))}
                                                </React.Fragment>
                                              );
                                            }
                                            return (
                                              <option key={esk.id} value={esk.id}>
                                                🏷️ {esk.namaEskul} - Pelatih: {esk.namaPelatih || '-'}
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                        <option value="none">❌ Lepas Tag Eskul (Hapus Korelasi)</option>
                                      </select>
                                    </div>
                                    {onNavigateToEskul && (
                                      <button
                                        type="button"
                                        onClick={() => onNavigateToEskul(correlated.id)}
                                        className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                        title={`Buka LPJ Eskul ${correlated.namaEskul || ''}`}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <div className="mt-1 flex items-center">
                                  <div className="relative inline-flex items-center">
                                    <div
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                                        isLikelyEskul
                                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-dashed border-amber-300 font-semibold'
                                          : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-dashed border-slate-200'
                                      }`}
                                      title="Hubungkan transaksi ini dengan Data Master Eskul"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>Tag Eskul</span>
                                    </div>
                                    <select
                                      value=""
                                      onChange={(e) => handleEskulTagChange(parentIdx, e.target.value)}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-xs"
                                      title="Pilih Ekstrakurikuler atau Pelatih dari Data Master"
                                    >
                                      <option value="" disabled>-- Pilih Eskul / Pelatih dari Data Master --</option>
                                      {effectiveEskulList.map((esk) => {
                                        const coaches = getCoachesFromEskul(esk);
                                        if (coaches.length > 1) {
                                          return (
                                            <React.Fragment key={esk.id}>
                                              {coaches.map((c, cIdx) => (
                                                <option
                                                  key={`${esk.id}-${c.id || cIdx}`}
                                                  value={`${esk.id}:::${c.nama}`}
                                                >
                                                  🏷️ {esk.namaEskul} - Pelatih: {c.nama} {c.peran ? `(${c.peran})` : `(Pelatih ${cIdx + 1})`}
                                                </option>
                                              ))}
                                            </React.Fragment>
                                          );
                                        }
                                        return (
                                          <option key={esk.id} value={esk.id}>
                                            🏷️ {esk.namaEskul} - Pelatih: {esk.namaPelatih || '-'}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.kode_kegiatan && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              {item.kode_kegiatan}
                            </span>
                          )}
                          {item.has_cross_month && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title={`Transaksi ini mencocokkan rincian RKAS dari ${item.cross_month_source || 'bulan lain'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              Lintas Bulan: RKAS {item.cross_month_source}
                            </span>
                          )}
                          {(() => {
                            const correlated = findCorrelatedMasterEskul(item, effectiveEskulList);
                            if (!correlated) return null;
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title={`Terkorelasi dengan Data Master Eskul: ${correlated.namaEskul || '-'} (Pelatih: ${correlated.namaPelatih || '-'} | Honor: ${formatRupiah(correlated.honorPerKegiatan || 75000)}/kegiatan)`}
                              >
                                <Trophy className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                <span>{correlated.namaEskul || 'Eskul'}</span>
                                {correlated.namaPelatih && (
                                  <span className="text-[9px] text-indigo-500 font-normal">({correlated.namaPelatih})</span>
                                )}
                              </span>
                            );
                          })()}
                          <span className="font-semibold text-slate-900">
                            {item.rincian_barang.length === 1
                              ? item.rincian_barang[0].uraian_barang
                              : item.keterangan || `${item.rincian_barang[0]?.uraian_barang} (+${item.rincian_barang.length - 1} item lainnya)`}
                          </span>
                        </div>
                        {item.rincian_barang.length > 1 && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Terdiri dari {item.rincian_barang.length} rincian barang/jasa (Klik untuk buka)
                          </div>
                        )}
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-3 text-center cursor-pointer"
                      >
                        <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-mono text-[11px]">
                          {item.rincian_barang.length}
                        </span>
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap cursor-pointer"
                      >
                        {item.total_pemasukan_bku > 0 ? formatRupiah(item.total_pemasukan_bku) : '-'}
                      </td>
                      <td
                        onClick={() => toggleRow(parentIdx)}
                        className="py-3 px-4 text-right font-mono font-bold text-rose-700 whitespace-nowrap cursor-pointer"
                      >
                        {item.total_pengeluaran_bku > 0 ? formatRupiah(item.total_pengeluaran_bku) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleRow(parentIdx)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title={isExpanded ? 'Tutup Rincian' : 'Buka Rincian'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-800" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingParentIdx(parentIdx);
                            }}
                            className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus Transaksi Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Child / Sub-Table Row (Dropdown / Expandable) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/95 border-b border-slate-200">
                        <td colSpan={10} className="p-3 pl-6 sm:pl-10">
                          <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                                <span>Rincian Item (No. BKU: {item.no_bku})</span>
                                <span className="text-slate-400">|</span>
                                <span className="font-normal text-slate-600 text-[11px]">
                                  Input / Ubah Volume & Satuan langsung pada tabel
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddChild(parentIdx)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-emerald-600" />
                                Tambah Item
                              </button>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-semibold">
                                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                                    <th className="py-2.5 px-3 w-36">Kode Rekening</th>
                                    <th className="py-2.5 px-3 min-w-[200px]">Uraian Barang / Kegiatan</th>
                                    <th className="py-2.5 px-3 w-28 text-center bg-blue-50/50 text-blue-900">
                                      Input Volume
                                    </th>
                                    <th className="py-2.5 px-3 w-36 bg-blue-50/50 text-blue-900">
                                      Input Satuan (Dropdown)
                                    </th>
                                    <th className="py-2.5 px-3 w-32 text-right">Tarif Satuan (Rp)</th>
                                    <th className="py-2.5 px-3 w-32 text-right">Jumlah Total (Rp)</th>
                                    <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {item.rincian_barang.map((child, childIdx) => {
                                    return (
                                      <tr key={childIdx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                          {childIdx + 1}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono text-slate-700">
                                          <input
                                            type="text"
                                            value={child.kode_rekening}
                                            onChange={(e) =>
                                              handleUpdateChild(parentIdx, childIdx, 'kode_rekening', e.target.value)
                                            }
                                            className="w-full px-1.5 py-1 text-xs font-mono bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded transition-colors"
                                          />
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-slate-800">
                                          <input
                                            type="text"
                                            value={child.uraian_barang}
                                            onChange={(e) =>
                                              handleUpdateChild(parentIdx, childIdx, 'uraian_barang', e.target.value)
                                            }
                                            className="w-full px-1.5 py-1 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded transition-colors"
                                          />
                                          {child.is_cross_month && (
                                            <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-indigo-700">
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                                                <span>🔗</span>
                                                <span>Sumber RKAS: {child.rkas_source_month || 'Bulan Lain'}</span>
                                                {child.rkas_matched_uraian && child.rkas_matched_uraian !== child.uraian_barang && (
                                                  <span className="text-slate-500 font-normal truncate max-w-xs">
                                                    ({child.rkas_matched_uraian})
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          )}
                                        </td>

                                        {/* Input Volume */}
                                        <td className="py-2.5 px-3 bg-blue-50/30">
                                          <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="Vol"
                                            value={child.volume !== null ? child.volume : ''}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? null : Number(e.target.value);
                                              handleUpdateChild(parentIdx, childIdx, 'volume', val);
                                            }}
                                            className="w-full px-2 py-1 text-xs text-center font-bold text-slate-900 bg-white border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded-md shadow-2xs"
                                          />
                                        </td>

                                        {/* Dropdown Input Satuan */}
                                        <td className="py-2.5 px-3 bg-blue-50/30">
                                          <div className="flex items-center gap-1">
                                            <select
                                              value={
                                                child.satuan && COMMON_SATUAN_OPTIONS.includes(child.satuan)
                                                  ? child.satuan
                                                  : child.satuan
                                                  ? 'custom'
                                                  : ''
                                              }
                                              onChange={(e) => {
                                                const selected = e.target.value;
                                                if (selected === 'custom') {
                                                  handleUpdateChild(parentIdx, childIdx, 'satuan', 'pcs');
                                                } else {
                                                  handleUpdateChild(
                                                    parentIdx,
                                                    childIdx,
                                                    'satuan',
                                                    selected === '' ? null : selected
                                                  );
                                                }
                                              }}
                                              className="w-full px-2 py-1 text-xs font-medium text-slate-800 bg-white border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded-md shadow-2xs cursor-pointer"
                                            >
                                              <option value="">-- Pilih Satuan --</option>
                                              {COMMON_SATUAN_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                  {opt}
                                                </option>
                                              ))}
                                              <option value="custom">✍️ Tulis Sendiri...</option>
                                            </select>
                                          </div>
                                          {/* If custom satuan entered */}
                                          {child.satuan && !COMMON_SATUAN_OPTIONS.includes(child.satuan) && (
                                            <input
                                              type="text"
                                              placeholder="Tulis satuan..."
                                              value={child.satuan}
                                              onChange={(e) =>
                                                handleUpdateChild(parentIdx, childIdx, 'satuan', e.target.value)
                                              }
                                              className="mt-1 w-full px-2 py-0.5 text-xs bg-white border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                                            />
                                          )}
                                        </td>

                                        {/* Tarif Satuan Input */}
                                        <td className="py-2.5 px-3 text-right font-mono">
                                          <input
                                            type="number"
                                            min="0"
                                            placeholder="Tarif (Rp)"
                                            value={child.harga_satuan !== null ? child.harga_satuan : ''}
                                            onChange={(e) => {
                                              const val = e.target.value === '' ? null : Number(e.target.value);
                                              handleUpdateChild(parentIdx, childIdx, 'harga_satuan', val);
                                            }}
                                            className="w-full px-2 py-1 text-xs text-right font-mono bg-white border border-slate-300 focus:border-slate-500 rounded-md shadow-2xs"
                                          />
                                        </td>

                                        {/* Jumlah Total */}
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                          <input
                                            type="number"
                                            min="0"
                                            value={child.jumlah_transaksi}
                                            onChange={(e) => {
                                              const val = Number(e.target.value) || 0;
                                              handleUpdateChild(parentIdx, childIdx, 'jumlah_transaksi', val);
                                            }}
                                            className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-md shadow-2xs"
                                          />
                                        </td>

                                        {/* Delete Child Button */}
                                        <td className="py-2.5 px-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteChild(parentIdx, childIdx)}
                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                            title="Hapus Item Ini"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal for Delete Single Parent Transaction */}
      {deletingParentIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Rekord Transaksi Ini?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transaksi <strong>{data[deletingParentIdx]?.no_bku}</strong> ({data[deletingParentIdx]?.rincian_barang[0]?.uraian_barang}) beserta seluruh rinciannya akan dihapus permanen.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingParentIdx(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteParent(deletingParentIdx)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Hapus Transaksi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete All Data */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hapus Seluruh Data Transaksi?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Semua {data.length} transaksi pada tabel akan dikosongkan. Anda dapat memuat kembali data sampel atau mengupload file baru kapan saja.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAll();
                  setShowDeleteAllModal(false);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus Semua Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
