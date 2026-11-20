import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  Upload,
  ArrowRight,
  Package,
  Brush,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Clock,
  Plus,
  AlertTriangle,
  FolderSync,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { MonthlyArchive, TransaksiBKU, SchoolMetadata } from '../types';
import { formatRupiah } from './SummaryCards';

interface MonthlyArchiveCardsProps {
  archives: MonthlyArchive[];
  activeMonthId: string | null;
  onSelectMonth: (monthId: string) => void;
  onDeleteMonth: (monthId: string) => void;
  onAddNewMonthUpload?: () => void;
  onSaveCurrentToActiveMonth?: () => void;
  onRenameMonth?: (monthId: string, newBulanTahun: string) => void;
  className?: string;
  compact?: boolean; // For display inside LPJ views
}

export const MonthlyArchiveCards: React.FC<MonthlyArchiveCardsProps> = ({
  archives,
  activeMonthId,
  onSelectMonth,
  onDeleteMonth,
  onAddNewMonthUpload,
  onSaveCurrentToActiveMonth,
  onRenameMonth,
  className = '',
  compact = false
}) => {
  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!archives || archives.length === 0) {
    return null;
  }

  const handleStartRename = (arch: MonthlyArchive, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMonthId(arch.id);
    setEditTitleInput(arch.bulanTahun);
  };

  const handleSaveRename = (monthId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitleInput.trim() && onRenameMonth) {
      onRenameMonth(monthId, editTitleInput.trim());
    }
    setEditingMonthId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMonthId(null);
  };

  const handleDeleteClick = (monthId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(monthId);
  };

  const handleConfirmDelete = (monthId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteMonth(monthId);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  // Compact Mode (for LPJ ATK & LPJ ALKEB / BAST tabs)
  if (compact) {
    return (
      <div className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Pilih Periode / Bulan BKU yang Diunggah
              </h4>
              <p className="text-[11px] text-slate-500">
                Tersedia {archives.length} bulan data BKU tersimpan. Klik untuk ganti bulan laporan:
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {archives.map((arch) => {
            const isActive = arch.id === activeMonthId || arch.bulanTahun === activeMonthId;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => onSelectMonth(arch.id)}
                className={`text-left p-3 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isActive
                    ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      {arch.bulanTahun}
                    </span>
                  </div>
                  {isActive ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Klik untuk pilih</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 mb-2">
                  <span className="font-semibold text-slate-700">
                    {arch.transactionCount} Transaksi
                  </span>
                  <span>•</span>
                  <span className="text-slate-500">
                    Pengeluaran: <strong className="text-slate-800">{formatRupiah(arch.totalPengeluaran)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/60 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    ATK: {arch.atkItemCount} ({formatRupiah(arch.atkTotalNominal)})
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-medium flex items-center gap-1">
                    <Brush className="w-3 h-3" />
                    ALKEB: {arch.alkebItemCount} ({formatRupiah(arch.alkebTotalNominal)})
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard Full View for Processor / FileUpload Section
  return (
    <div className={`bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden mb-6 ${className}`}>
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Arsip & Manajemen Bulan BKU Terunggah
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {archives.length} Bulan Tersimpan
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Setiap file BKU & RKAS yang diunggah otomatis tersimpan di sini. Klik kartu bulan untuk beralih dan melihat data ekstraksi, kwitansi, serta LPJ ATK & ALKEB secara instan.
              </p>
            </div>
          </div>

          {onAddNewMonthUpload && (
            <button
              type="button"
              onClick={onAddNewMonthUpload}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-sm transition-all hover:shadow-emerald-500/25 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Upload Bulan Baru
            </button>
          )}
        </div>

        {/* Monthly Archive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {archives.map((arch) => {
            const isActive = arch.id === activeMonthId || arch.bulanTahun === activeMonthId;
            const isEditing = editingMonthId === arch.id;
            const isDeleting = deleteConfirmId === arch.id;

            return (
              <div
                key={arch.id}
                onClick={() => !isEditing && !isDeleting && onSelectMonth(arch.id)}
                className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? 'bg-white/15 border-emerald-400/80 shadow-lg shadow-emerald-950/40 ring-2 ring-emerald-400/30'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Active Glow Badge */}
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-bold shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sedang Aktif
                  </div>
                )}

                <div>
                  {/* Title & Edit */}
                  <div className="flex items-center justify-between gap-2 mb-2 pr-24">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          className="px-2 py-1 text-xs bg-slate-900 border border-emerald-400 rounded text-white w-full focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(arch.id, e)}
                          className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h4 className="text-sm font-bold text-white tracking-wide">
                          {arch.bulanTahun}
                        </h4>
                        {onRenameMonth && (
                          <button
                            type="button"
                            title="Ubah nama bulan"
                            onClick={(e) => handleStartRename(arch, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-emerald-300 transition-opacity text-slate-400"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upload timestamp & source file */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mb-3">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {arch.uploadedAt}
                    </span>
                    {arch.bkuFileName && (
                      <span className="truncate max-w-[140px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded text-[10px]">
                        📄 {arch.bkuFileName}
                      </span>
                    )}
                  </div>

                  {/* Financial Snapshot */}
                  <div className="bg-black/30 rounded-lg p-2.5 mb-3 space-y-1.5 text-xs border border-white/5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Total Pengeluaran:</span>
                      <strong className="text-rose-300 font-mono font-semibold">
                        {formatRupiah(arch.totalPengeluaran)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Total Penerimaan:</span>
                      <strong className="text-emerald-300 font-mono font-semibold">
                        {formatRupiah(arch.totalPenerimaan)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/10">
                      <span className="text-[11px] text-slate-400">Saldo Akhir:</span>
                      <strong className="text-white font-mono font-bold">
                        {formatRupiah(arch.saldoAkhir)}
                      </strong>
                    </div>
                  </div>

                  {/* Sub-Badges: ATK, ALKEB, Transaksi */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/20 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      <strong>{arch.atkItemCount}</strong> ATK ({formatRupiah(arch.atkTotalNominal)})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/20 flex items-center gap-1">
                      <Brush className="w-3 h-3" />
                      <strong>{arch.alkebItemCount}</strong> ALKEB ({formatRupiah(arch.alkebTotalNominal)})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/20">
                      <strong>{arch.transactionCount}</strong> BKU ({arch.itemCount} Item)
                    </span>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  {isDeleting ? (
                    <div className="flex items-center justify-between w-full gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                      <span className="text-rose-300 font-medium text-[11px]">Hapus bulan ini?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleConfirmDelete(arch.id, e)}
                          className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px]"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMonth(arch.id);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isActive ? 'Sedang Ditampilkan' : 'Buka Data Bulan Ini'}
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      {archives.length > 1 && (
                        <button
                          type="button"
                          title="Hapus arsip bulan ini"
                          onClick={(e) => handleDeleteClick(arch.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
