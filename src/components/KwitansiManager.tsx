import React, { useState, useMemo, useEffect } from 'react';
import { TransaksiBKU, SchoolMetadata } from '../types';
import { SingleKwitansi, PaperSize, DensityMode } from './SingleKwitansi';
import { formatRupiah } from './SummaryCards';
import {
  Printer,
  Receipt,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  FileText,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface KwitansiManagerProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  onUpdateMetadata: (newMetadata: SchoolMetadata) => void;
}

export const KwitansiManager: React.FC<KwitansiManagerProps> = ({
  data,
  metadata,
  onUpdateMetadata
}) => {
  // Only include Pengeluaran with valid BNU
  const kwitansiList = useMemo(() => {
    return data.filter((item) => item.tipe_transaksi === 'Pengeluaran');
  }, [data]);

  const [selectedBnuIndex, setSelectedBnuIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Paper & Layout settings
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [densityMode, setDensityMode] = useState<DensityMode>('auto');

  // Custom metadata overrides for Kwitansi
  const [customKota, setCustomKota] = useState<string>('Bogor');
  const [customTanggal, setCustomTanggal] = useState<string>('06 Februari 2026');

  // Dynamically update @page print rules for A4 vs F4
  useEffect(() => {
    let styleEl = document.getElementById('dynamic-print-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-page-style';
      document.head.appendChild(styleEl);
    }

    if (paperSize === 'F4') {
      styleEl.innerHTML = `
        @media print {
          @page {
            size: 215mm 315mm portrait !important;
            margin: 8mm 10mm !important;
          }
        }
      `;
    } else {
      styleEl.innerHTML = `
        @media print {
          @page {
            size: 210mm 297mm portrait !important;
            margin: 8mm 10mm !important;
          }
        }
      `;
    }
  }, [paperSize]);

  // Filtered BNU items based on search
  const filteredKwitansi = useMemo(() => {
    if (!searchTerm.trim()) return kwitansiList;
    const term = searchTerm.toLowerCase();
    return kwitansiList.filter(
      (item) =>
        (item.no_bku && item.no_bku.toLowerCase().includes(term)) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(term)) ||
        (item.rincian_barang || []).some((b) => b.uraian_barang && b.uraian_barang.toLowerCase().includes(term))
    );
  }, [kwitansiList, searchTerm]);

  const activeTransaction = filteredKwitansi[selectedBnuIndex] || filteredKwitansi[0] || kwitansiList[0];

  const totalPengeluaranAll = useMemo(() => {
    return kwitansiList.reduce((acc, curr) => acc + curr.total_pengeluaran_bku, 0);
  }, [kwitansiList]);

  const handlePrint = () => {
    window.print();
  };

  const handleNext = () => {
    if (selectedBnuIndex < filteredKwitansi.length - 1) {
      setSelectedBnuIndex(selectedBnuIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedBnuIndex > 0) {
      setSelectedBnuIndex(selectedBnuIndex - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Hidden on Print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Generator Kwitansi Pengeluaran BOSP
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Fit 1 Halaman ({paperSize})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tersedia <strong>{kwitansiList.length} Kwitansi</strong> BNU &bull; Terbilang Rupiah Otomatis &bull; TTD Kepala Sekolah & Bendahara
            </p>
          </div>
        </div>

        {/* Paper Selector, Density & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pilihan Kertas A4 vs F4 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <span className="text-[11px] text-slate-500 px-2 font-sans font-normal hidden sm:inline">
              Kertas:
            </span>
            <button
              type="button"
              onClick={() => setPaperSize('A4')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                paperSize === 'A4'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ukuran A4 Standar (210 x 297 mm)"
            >
              A4 (210×297)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('F4')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                paperSize === 'F4'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ukuran F4 / Folio (215 x 330 mm)"
            >
              F4 / Folio (215×330)
            </button>
          </div>

          {/* Density Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <span className="text-[11px] text-slate-500 px-2 font-sans font-normal hidden md:inline">
              Kerapatan:
            </span>
            <select
              value={densityMode}
              onChange={(e) => setDensityMode(e.target.value as DensityMode)}
              className="bg-transparent text-xs font-semibold text-slate-800 pr-1 py-1 focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto-Fit (Rekomendasi)</option>
              <option value="normal">Normal (Item Sedikit)</option>
              <option value="compact">Ringkas (Sedang)</option>
              <option value="tight">Sangat Padat (Banyak Item)</option>
            </select>
          </div>

          {/* View Mode switch */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Per BNU
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Semua ({kwitansiList.length})
            </button>
          </div>

          {/* Pejabat Settings */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isSettingsOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Pengaturan TTD
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {viewMode === 'single' ? `Cetak (${paperSize})` : `Cetak Semua (${paperSize})`}
          </button>
        </div>
      </div>

      {/* Settings Drawer (Pejabat & Penandatangan) */}
      {isSettingsOpen && (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 shadow-inner no-print animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              Pengaturan Penandatangan, Tempat, & Format Kertas
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Kepala Sekolah */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={metadata.kepalaSekolah}
                onChange={(e) => onUpdateMetadata({ ...metadata, kepalaSekolah: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <label className="font-semibold text-slate-700 block pt-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={metadata.nipKepalaSekolah}
                onChange={(e) => onUpdateMetadata({ ...metadata, nipKepalaSekolah: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>

            {/* Bendahara */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Nama Bendahara BOSP</label>
              <input
                type="text"
                value={metadata.bendahara}
                onChange={(e) => onUpdateMetadata({ ...metadata, bendahara: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <label className="font-semibold text-slate-700 block pt-1">NIP Bendahara</label>
              <input
                type="text"
                value={metadata.nipBendahara}
                onChange={(e) => onUpdateMetadata({ ...metadata, nipBendahara: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>

            {/* Tempat & Tanggal Cetak */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Tempat / Kota Pembuatan</label>
              <input
                type="text"
                value={customKota}
                onChange={(e) => setCustomKota(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
              <label className="font-semibold text-slate-700 block pt-1">Tanggal Cetak Kwitansi</label>
              <input
                type="text"
                value={customTanggal}
                onChange={(e) => setCustomTanggal(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>

            {/* Info Sumber Dana */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Nama Sekolah</label>
              <input
                type="text"
                value={metadata.namaSekolah}
                onChange={(e) => onUpdateMetadata({ ...metadata, namaSekolah: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
              />
              <label className="font-semibold text-slate-700 block pt-1">Sumber Dana</label>
              <input
                type="text"
                value={metadata.sumberDana}
                onChange={(e) => onUpdateMetadata({ ...metadata, sumberDana: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Kwitansi Selector & Navigation Bar (Single View Only) */}
      {viewMode === 'single' && (
        <div className="bg-slate-900 text-white rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md no-print">
          {/* Search box & selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari BNU / Belanja..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedBnuIndex(0);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>

            <select
              value={selectedBnuIndex}
              onChange={(e) => setSelectedBnuIndex(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-800 border border-slate-700 rounded-lg text-amber-300 focus:outline-none cursor-pointer"
            >
              {filteredKwitansi.map((item, idx) => (
                <option key={idx} value={idx}>
                  {item.no_bku} - {item.rincian_barang[0]?.uraian_barang.slice(0, 35)} ({formatRupiah(item.total_pengeluaran_bku)})
                </option>
              ))}
            </select>
          </div>

          {/* Paper specs & Item Count indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono text-[11px] text-amber-300">
              {activeTransaction?.rincian_barang.length || 0} Item
            </span>
            <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono text-[11px] text-cyan-300">
              {paperSize} ({paperSize === 'A4' ? '210×297 mm' : '215×330 mm'})
            </span>
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={selectedBnuIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </button>

            <span className="text-xs font-mono font-bold text-slate-300 px-2">
              {filteredKwitansi.length > 0 ? selectedBnuIndex + 1 : 0} / {filteredKwitansi.length}
            </span>

            <button
              onClick={handleNext}
              disabled={selectedBnuIndex >= filteredKwitansi.length - 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Berikutnya
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Kwitansi Display Area with Realistic Sheet Boundary */}
      {viewMode === 'single' ? (
        activeTransaction ? (
          <div className="bg-slate-200/80 p-4 sm:p-8 rounded-2xl border border-slate-300 shadow-inner flex flex-col items-center">
            {/* Paper Sheet Frame */}
            <div className="w-full flex justify-center">
              <SingleKwitansi
                transaction={activeTransaction}
                metadata={metadata}
                customKota={customKota}
                customTanggalCetak={customTanggal}
                paperSize={paperSize}
                density={densityMode}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500">
            Tidak ada kwitansi yang sesuai dengan pencarian.
          </div>
        )
      ) : (
        /* Batch View - All Kwitansi */
        <div className="space-y-8">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-xs flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-700" />
              <span>
                Menampilkan <strong>{kwitansiList.length} Kwitansi Pengeluaran</strong> (Total:{' '}
                <strong>{formatRupiah(totalPengeluaranAll)}</strong>). Format Kertas:{' '}
                <strong>{paperSize} ({paperSize === 'A4' ? '210 × 297 mm' : '215 × 330 mm'})</strong> dengan Auto-Fit 1 Halaman per lembar kwitansi.
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Semua ({paperSize})
            </button>
          </div>

          {kwitansiList.map((trans, idx) => (
            <div
              key={idx}
              className="bg-slate-200/70 p-4 sm:p-8 rounded-2xl border border-slate-300 shadow-inner print:p-0 print:border-none print:bg-white flex flex-col items-center"
            >
              <SingleKwitansi
                transaction={trans}
                metadata={metadata}
                customKota={customKota}
                customTanggalCetak={customTanggal}
                paperSize={paperSize}
                density={densityMode}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
