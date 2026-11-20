import React from 'react';
import { TransaksiBKU, SchoolMetadata } from '../types';
import { formatRupiah } from './SummaryCards';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  CheckCircle2
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface DashboardViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenUploadModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  metadata
}) => {
  const totalPemasukan = data.reduce((acc, curr) => acc + (curr.total_pemasukan_bku || 0), 0);
  const totalPengeluaran = data.reduce((acc, curr) => acc + (curr.total_pengeluaran_bku || 0), 0);
  const sisaSaldo = totalPemasukan - totalPengeluaran;

  const totalBnuCount = data.filter((d) => d.tipe_transaksi === 'Pengeluaran' && d.no_bku !== '-').length;

  // Satuan Extraction completion count
  const satuanCompletedCount = React.useMemo(() => {
    let completed = 0;
    data.forEach((item) => {
      item.rincian_barang.forEach((child) => {
        if (child.satuan && child.volume) completed++;
      });
    });
    return completed;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sistem Terintegrasi BKU & RKAS BOSP
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Dashboard Keuangan {metadata.namaSekolah ? metadata.namaSekolah : 'Satuan Pendidikan'}
          </h1>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penerimaan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Penerimaan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-xl sm:text-2xl font-bold text-slate-900">
            {formatRupiah(totalPemasukan)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span>Saldo Awal Bank BOSP</span>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Belanja (BKU)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-xl sm:text-2xl font-bold text-rose-700">
            {formatRupiah(totalPengeluaran)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalBnuCount} Transaksi BNU Belanja
          </div>
        </div>

        {/* Saldo Kas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sisa Saldo Kas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-xl sm:text-2xl font-bold text-blue-800">
            {formatRupiah(sisaSaldo)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Saldo Tersedia di Rekening
          </div>
        </div>

        {/* Total Kwitansi */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kwitansi BNU Siap Cetak</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 font-mono text-xl sm:text-2xl font-bold text-slate-900">
            {totalBnuCount} <span className="text-xs font-sans text-slate-500 font-normal">Kwitansi</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            {satuanCompletedCount} Rincian Barang Lengkap
          </div>
        </div>
      </div>
    </div>
  );
};
