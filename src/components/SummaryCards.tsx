import React from 'react';
import { TransaksiBKU } from '../types';
import { ArrowDownLeft, ArrowUpRight, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';

interface SummaryCardsProps {
  data: TransaksiBKU[];
}

export const formatRupiah = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => {
  const totalPemasukan = data.reduce((acc, curr) => acc + curr.total_pemasukan_bku, 0);
  const totalPengeluaran = data.reduce((acc, curr) => acc + curr.total_pengeluaran_bku, 0);
  const totalItems = data.reduce((acc, curr) => acc + curr.rincian_barang.length, 0);
  
  // Count items matched to RKAS (having volume, satuan, and harga_satuan)
  const matchedItems = data.reduce(
    (acc, curr) =>
      acc +
      curr.rincian_barang.filter(
        (b) => b.volume !== null && b.satuan !== null && b.harga_satuan !== null
      ).length,
    0
  );

  const saldoAkhir = totalPemasukan - totalPengeluaran;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Pemasukan Card */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Total Pemasukan BKU
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl font-bold text-emerald-950 font-mono">
            {formatRupiah(totalPemasukan)}
          </div>
          <p className="text-xs text-emerald-700 mt-0.5">
            1 Transaksi Penerimaan Saldo Bank
          </p>
        </div>
      </div>

      {/* Pengeluaran Card */}
      <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
            Total Belanja BNU
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl font-bold text-rose-950 font-mono">
            {formatRupiah(totalPengeluaran)}
          </div>
          <p className="text-xs text-rose-700 mt-0.5">
            27 Nomor BKU (BNU01 - BNU27)
          </p>
        </div>
      </div>

      {/* Saldo Kas */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
            Posisi Kas / Saldo
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl font-bold text-indigo-950 font-mono">
            {formatRupiah(saldoAkhir)}
          </div>
          <p className="text-xs text-indigo-700 mt-0.5">
            Sesuai penutupan BKU 28 Feb 2026
          </p>
        </div>
      </div>

      {/* Rekonsiliasi RKAS Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Status Mapping RKAS
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xl font-bold text-slate-900 font-mono">
            {matchedItems} <span className="text-xs font-normal text-slate-500">/ {totalItems} item barang</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{Math.round((matchedItems / totalItems) * 100)}% terpetakan volume & tarif RKAS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
