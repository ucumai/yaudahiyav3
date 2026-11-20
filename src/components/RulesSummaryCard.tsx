import React, { useState } from 'react';
import { ShieldCheck, Info, ChevronDown, ChevronUp, Database, Layers, GitMerge, FileCheck } from 'lucide-react';

export const RulesSummaryCard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">
              Prinsip & Logika Rekonsiliasi yang Diterapkan
            </h3>
            <p className="text-[11px] text-slate-500">
              5 Aturan ketat pemrosesan data BKU & RKAS BOSP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>{isOpen ? 'Sembunyikan' : 'Lihat Aturan'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-700 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                1. Base Data adalah BKU (Strict Inner Join)
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Hanya data yang tercatat di file BKU yang dimasukkan. Transaksi pajak (Terima/Setor PPN/PPh) dan bunga bank diabaikan dari daftar belanja fisik.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                2. Klasifikasi Pemasukan
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Transaksi dengan nilai di kolom PENERIMAAN diklasifikasikan sebagai Pemasukan, dengan nilai volume, satuan, dan harga_satuan bernilai <code>null</code>.
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                3. Pengelompokan Nomor BKU (BNU)
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Setiap belanja dikelompokkan per Nomor BKU (misal BNU08 memiliki 14 item ATK, BNU09 memiliki 16 item kebersihan).
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                <GitMerge className="w-3.5 h-3.5 text-purple-600" />
                4. Merge dengan RKAS untuk Rincian
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Pencocokan Uraian & Kode Rekening dengan RKAS untuk mengekstrak Volume, Satuan, dan Tarif Harga. Jika tidak ada di RKAS bulan ini, bernilai <code>null</code> tanpa mengarang.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
