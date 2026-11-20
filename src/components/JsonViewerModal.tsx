import React, { useState } from 'react';
import { TransaksiBKU } from '../types';
import { X, Copy, Check, Download, Code2, Eye } from 'lucide-react';

interface JsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TransaksiBKU[];
  onCopyJson: () => void;
  onDownloadJson: () => void;
  isCopied: boolean;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({
  isOpen,
  onClose,
  data,
  onCopyJson,
  onDownloadJson,
  isCopied
}) => {
  const [activeTab, setActiveTab] = useState<'clean' | 'formatted'>('clean');

  if (!isOpen) return null;

  // Clean data matching exactly the user's requested JSON format
  const cleanJsonData = data.map(({ tanggal, no_bku, tipe_transaksi, total_pemasukan_bku, total_pengeluaran_bku, rincian_barang }) => ({
    tanggal,
    no_bku,
    tipe_transaksi,
    total_pemasukan_bku,
    total_pengeluaran_bku,
    rincian_barang: rincian_barang.map(({ kode_rekening, uraian_barang, volume, satuan, harga_satuan, jumlah_transaksi }) => ({
      kode_rekening,
      uraian_barang,
      volume,
      satuan,
      harga_satuan,
      jumlah_transaksi
    }))
  }));

  const jsonString = JSON.stringify(cleanJsonData, null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Struktur Output JSON (Parent-Child)</h2>
              <p className="text-xs text-slate-400">
                Sesuai dengan 5 Aturan Logika Rekonsiliasi BKU & RKAS BOSP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Tersalin!' : 'Salin JSON'}
            </button>

            <button
              onClick={onDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .json
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-emerald-300 select-all">
          <pre className="leading-relaxed whitespace-pre-wrap">{jsonString}</pre>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Total Record BKU: {cleanJsonData.length} entitas Parent</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
