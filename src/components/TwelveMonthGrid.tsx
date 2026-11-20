import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Trash2,
  Upload,
  Package,
  Brush,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileSpreadsheet,
  Layers
} from 'lucide-react';
import { MonthlyArchive, SchoolMetadata } from '../types';
import { MONTH_NAMES_ID } from '../utils/monthArchiveUtils';
import { formatRupiah } from './SummaryCards';
import { useSchool } from '../context/SchoolContext';

interface TwelveMonthGridProps {
  /** Map dari index bulan (1-12) ke MonthlyArchive (atau null jika belum ada) */
  monthlyStore: Record<number, MonthlyArchive | null>;
  /** Index bulan yang sedang aktif dipilih (1-12) */
  activeMonthIndex: number;
  /** Callback saat pengguna mengklik salah satu kartu bulan */
  onSelectMonthIndex: (monthIndex: number) => void;
  /** Callback saat pengguna menghapus data bulan tertentu */
  onDeleteMonthIndex: (monthIndex: number) => void;
  /** Callback opsional untuk memicu upload khusus bulan aktif */
  onTriggerUploadForMonth?: (monthIndex: number) => void;
  /** Mode tampilan kompak untuk disematkan di header LPJ atau tabel */
  compact?: boolean;
  className?: string;
}

export const TwelveMonthGrid: React.FC<TwelveMonthGridProps> = ({
  monthlyStore,
  activeMonthIndex,
  onSelectMonthIndex,
  onDeleteMonthIndex,
  onTriggerUploadForMonth,
  compact = false,
  className = ''
}) => {
  const { readOnly } = useSchool();
  const [deleteConfirmMonth, setDeleteConfirmMonth] = useState<number | null>(null);

  // Hitung total bulan yang sudah terisi data
  const filledMonthsCount = Object.values(monthlyStore).filter(Boolean).length;

  const handleDeleteClick = (monthIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    setDeleteConfirmMonth(monthIdx);
  };

  const handleConfirmDelete = (monthIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    onDeleteMonthIndex(monthIdx);
    setDeleteConfirmMonth(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmMonth(null);
  };

  // ----------------------------------------------------
  // COMPACT MODE (Untuk disematkan di Tab LPJ ATK & ALKEB)
  // ----------------------------------------------------
  if (compact) {
    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">
                Pilih Bulan Laporan (12 Bulan Kalender BKU)
              </span>
              <span className="text-[11px] text-slate-500 ml-2 font-medium">
                • {filledMonthsCount} dari 12 bulan telah diunggah
              </span>
            </div>
          </div>
        </div>

        {/* 12 Mini Chips / Small Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MONTH_NAMES_ID.map((name, idx) => {
            const monthNumber = idx + 1;
            const archive = monthlyStore[monthNumber];
            const hasData = !!archive && archive.data && archive.data.length > 0;
            const isActive = activeMonthIndex === monthNumber;

            return (
              <button
                key={monthNumber}
                type="button"
                onClick={() => onSelectMonthIndex(monthNumber)}
                className={`p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : hasData
                    ? 'bg-slate-50 hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300'
                    : 'bg-white/60 hover:bg-slate-50 border-dashed border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {monthNumber < 10 ? `0${monthNumber}` : monthNumber}
                  </span>
                  {isActive ? (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Aktif
                    </span>
                  ) : hasData ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Data tersedia" />
                  ) : (
                    <span className="text-[9px] text-slate-400">Kosong</span>
                  )}
                </div>

                <div className="font-bold text-xs text-slate-800 truncate mb-1">
                  {name}
                </div>

                {hasData ? (
                  <div className="text-[10px] text-emerald-700 font-semibold font-mono truncate">
                    {formatRupiah(archive.totalPengeluaran)}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic truncate">
                    Belum ada data
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // FULL 12-MONTH CARDS GRID (Untuk Pengolah BKU & RKAS) - COMPACT & SLEEK
  // ----------------------------------------------------
  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-800/80 relative overflow-hidden ${className}`}>
      {/* Visual Ambient Blur Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
        {/* Compact Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Pilih Bulan BKU &amp; RKAS (12 Bulan)
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                  {filledMonthsCount} / 12 Terisi
                </span>
                <span className="text-[11px] text-slate-300 hidden md:inline">
                  • Aktif: <strong className="text-emerald-300 font-bold">{MONTH_NAMES_ID[activeMonthIndex - 1]} 2026</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {monthlyStore[activeMonthIndex]?.bkuFileName && (
              <span className="hidden sm:inline-block text-slate-400 font-mono text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5">
                📄 {monthlyStore[activeMonthIndex]?.bkuFileName}
              </span>
            )}
            {onTriggerUploadForMonth && !readOnly && (
              <button
                type="button"
                onClick={() => onTriggerUploadForMonth(activeMonthIndex)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                Upload {MONTH_NAMES_ID[activeMonthIndex - 1]}
              </button>
            )}
          </div>
        </div>

        {/* 12 Month Cards Grid (Compact 6 cols on LG, 4 on MD, 3 on SM, 2 on Mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {MONTH_NAMES_ID.map((name, idx) => {
            const monthNumber = idx + 1;
            const archive = monthlyStore[monthNumber];
            const hasData = !!archive && archive.data && archive.data.length > 0;
            const isActive = activeMonthIndex === monthNumber;
            const isDeleting = deleteConfirmMonth === monthNumber;

            return (
              <div
                key={monthNumber}
                onClick={() => !isDeleting && onSelectMonthIndex(monthNumber)}
                className={`rounded-xl border p-2.5 transition-all relative flex flex-col justify-between cursor-pointer min-h-[78px] ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400 shadow-xs ring-2 ring-emerald-400/40'
                    : hasData
                    ? 'bg-white/5 hover:bg-white/10 border-white/15 hover:border-emerald-400/50'
                    : 'bg-white/[0.02] hover:bg-white/5 border-dashed border-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Top Row: Month Number & Status Badge */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[10px] font-bold px-1 py-0.2 rounded ${
                        isActive
                          ? 'bg-emerald-400 text-slate-950'
                          : hasData
                          ? 'bg-slate-800 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {monthNumber < 10 ? `0${monthNumber}` : monthNumber}
                    </span>
                    <span className="text-xs font-bold text-white truncate">
                      {name}
                    </span>
                  </div>

                  {isActive ? (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Aktif
                    </span>
                  ) : hasData ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Data tersedia" />
                  ) : (
                    <span className="text-[9px] text-slate-400">Kosong</span>
                  )}
                </div>

                {/* Content: Nominal & Trx info */}
                <div className="my-0.5">
                  {hasData ? (
                    <div>
                      <div className="text-[11px] font-mono font-bold text-emerald-300 truncate">
                        {formatRupiah(archive.totalPengeluaran)}
                      </div>
                      <div className="text-[9px] text-slate-300 flex items-center gap-1 mt-0.5">
                        <span>{archive.transactionCount} Trx</span>
                        <span>•</span>
                        <span className="text-blue-300">{archive.atkItemCount} ATK</span>
                        <span>•</span>
                        <span className="text-cyan-300">{archive.alkebItemCount} ALK</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic truncate">
                      Belum ada BKU
                    </p>
                  )}
                </div>

                {/* Bottom Action Area */}
                <div className="pt-1 border-t border-white/10 flex items-center justify-between gap-1 text-[10px]">
                  {isDeleting ? (
                    <div
                      className="flex items-center justify-between w-full gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-rose-300 font-bold text-[9px]">Hapus?</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleConfirmDelete(monthNumber, e)}
                          className="px-1.5 py-0.2 rounded bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold cursor-pointer"
                        >
                          Ya
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[9px] cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`font-medium flex items-center gap-0.5 ${
                          isActive
                            ? 'text-emerald-300'
                            : hasData
                            ? 'text-slate-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {isActive ? 'Dipilih' : hasData ? 'Buka' : 'Pilih'}
                        <ArrowRight className="w-2 h-2" />
                      </span>

                      {hasData && !readOnly && (
                        <button
                          type="button"
                          title={`Hapus data bulan ${name}`}
                          onClick={(e) => handleDeleteClick(monthNumber, e)}
                          className="p-0.5 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
