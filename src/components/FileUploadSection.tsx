import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  Layers,
  HelpCircle,
  Trash2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TransaksiBKU, RKASItem, SchoolMetadata, BKUValidationReport, MonthlyArchive } from '../types';
import { mergeBKUWithRKAS, parseRKASText, parseExcelOrCsvFile } from '../utils/documentParser';
import { rkasFebruaryCatalog, findMatchInRKAS } from '../utils/rkasCatalog';
import { sampleBKUText, sampleRKASText } from '../data/sampleTextData';
import { processUploadedFile, FilePayload } from '../utils/fileHelpers';
import { parseBKUPDFPrecision, parseRKASPDFPrecision } from '../utils/pdfPrecisionParser';
import { parseBKUExcelWorkbook, parseRKASExcelWorkbook } from '../utils/excelBkuParser';
import { MonthlyArchiveCards } from './MonthlyArchiveCards';
import { useSchool } from '../context/SchoolContext';

interface FileUploadSectionProps {
  currentData: TransaksiBKU[];
  onDataGenerated: (
    data: TransaksiBKU[],
    customMetadata?: Partial<SchoolMetadata>,
    fileInfo?: { bkuFileName?: string; rkasFileName?: string },
    rkasItems?: RKASItem[]
  ) => void;
  onResetDefault: () => void;
  onClearData: () => void;
  currentDataCount?: number;
  monthlyArchives?: MonthlyArchive[];
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  activeMonthId?: string | null;
  onSelectMonth?: (monthId: string) => void;
  onDeleteMonth?: (monthId: string) => void;
  onRenameMonth?: (monthId: string, newTitle: string) => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  currentData,
  onDataGenerated,
  onResetDefault,
  onClearData,
  monthlyArchives = [],
  monthlyStore,
  activeMonthIndex,
  activeMonthId = null,
  onSelectMonth,
  onDeleteMonth,
  onRenameMonth,
}) => {
  const { readOnly } = useSchool();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [bkuFile, setBkuFile] = useState<File | null>(null);
  const [rkasFile, setRkasFile] = useState<File | null>(null);
  const [bkuPayload, setBkuPayload] = useState<FilePayload | null>(null);
  const [rkasPayload, setRkasPayload] = useState<FilePayload | null>(null);

  const [bkuText, setBkuText] = useState<string>('');
  const [rkasText, setRkasText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  const [officialDocTotals, setOfficialDocTotals] = useState<{
    officialPenerimaan?: number;
    officialPengeluaran?: number;
  } | null>(null);
  const [showValidationBanner, setShowValidationBanner] = useState<boolean>(false);
  const [isDragOverBku, setIsDragOverBku] = useState<boolean>(false);
  const [isDragOverRkas, setIsDragOverRkas] = useState<boolean>(false);

  const bkuInputRef = useRef<HTMLInputElement>(null);
  const rkasInputRef = useRef<HTMLInputElement>(null);

  // Live calculations derived directly and reactively from currentData in the table
  const liveParsedPenerimaan = currentData
    .filter((d) => d.tipe_transaksi === 'Pemasukan')
    .reduce((acc, d) => acc + (d.total_pemasukan_bku || 0), 0);

  const liveParsedPengeluaran = currentData
    .filter((d) => d.tipe_transaksi === 'Pengeluaran')
    .reduce((acc, d) => {
      const rincianSum = d.rincian_barang?.reduce((subAcc, r) => subAcc + (r.jumlah_transaksi || 0), 0) || 0;
      return acc + (rincianSum > 0 ? rincianSum : (d.total_pengeluaran_bku || 0));
    }, 0);

  const liveSisaSaldo = liveParsedPenerimaan - liveParsedPengeluaran;
  const liveTotalItems = currentData.reduce((acc, d) => acc + (d.rincian_barang ? d.rincian_barang.length : 0), 0);

  // Dynamic real-time validation against official document numbers
  const hasOfficialDoc = officialDocTotals !== null && (officialDocTotals.officialPengeluaran !== undefined || officialDocTotals.officialPenerimaan !== undefined);

  let isLiveValid = true;
  let liveDiffPengeluaran: number | undefined = undefined;
  let liveDiffPenerimaan: number | undefined = undefined;
  let liveStatusMessage = `Data Tabel Aktif: ${currentData.length} transaksi (${liveTotalItems} rincian item barang/jasa).`;

  if (hasOfficialDoc) {
    if (officialDocTotals.officialPengeluaran !== undefined) {
      liveDiffPengeluaran = liveParsedPengeluaran - officialDocTotals.officialPengeluaran;
      if (liveDiffPengeluaran !== 0) {
        isLiveValid = false;
      }
    }
    if (officialDocTotals.officialPenerimaan !== undefined) {
      liveDiffPenerimaan = liveParsedPenerimaan - officialDocTotals.officialPenerimaan;
      if (liveDiffPenerimaan !== 0) {
        isLiveValid = false;
      }
    }

    if (isLiveValid) {
      liveStatusMessage = `Validasi Otomatis Berhasil (100% Cocok): Total pengeluaran tabel Rp ${liveParsedPengeluaran.toLocaleString('id-ID')} dan penerimaan Rp ${liveParsedPenerimaan.toLocaleString('id-ID')} tepat sesuai dengan dokumen resmi BKU.`;
    } else {
      const parts: string[] = [];
      if (liveDiffPengeluaran !== undefined && liveDiffPengeluaran !== 0) {
        parts.push(`Selisih Pengeluaran Rp ${Math.abs(liveDiffPengeluaran).toLocaleString('id-ID')} (Probabilitas di luar pengeluaran belanja tabel, seperti setoran pajak PPN/PPh, SIPLah, atau item non-belanja). Tabel Aktif: Rp ${liveParsedPengeluaran.toLocaleString('id-ID')} vs Total Dokumen: Rp ${officialDocTotals.officialPengeluaran?.toLocaleString('id-ID')}`);
      }
      if (liveDiffPenerimaan !== undefined && liveDiffPenerimaan !== 0) {
        parts.push(`Selisih Penerimaan Rp ${Math.abs(liveDiffPenerimaan).toLocaleString('id-ID')} (Tabel Aktif: Rp ${liveParsedPenerimaan.toLocaleString('id-ID')} vs Total Dokumen: Rp ${officialDocTotals.officialPenerimaan?.toLocaleString('id-ID')})`);
      }
      liveStatusMessage = `INFO REKONSILIASI: ${parts.join(' | ')}`;
    }
  }

  const handleBkuFileChange = async (file: File) => {
    if (readOnly) return;
    setBkuFile(file);
    setShowValidationBanner(false);
    try {
      const payload = await processUploadedFile(file);
      setBkuPayload(payload);
      if (payload.text) {
        setBkuText(payload.text);
      }
      setProcessStatus(`File BKU siap diproses: ${file.name}`);
    } catch (err: any) {
      console.error('Error reading BKU file:', err);
      setProcessStatus(`Gagal membaca file BKU: ${err.message}`);
    }
  };

  const handleRkasFileChange = async (file: File) => {
    if (readOnly) return;
    setRkasFile(file);
    try {
      const payload = await processUploadedFile(file);
      setRkasPayload(payload);
      if (payload.text) {
        setRkasText(payload.text);
      }
      setProcessStatus(`File RKAS siap diproses: ${file.name}`);
    } catch (err: any) {
      console.error('Error reading RKAS file:', err);
      setProcessStatus(`Gagal membaca file RKAS: ${err.message}`);
    }
  };

  const handleClearAll = () => {
    if (readOnly) return;
    setBkuFile(null);
    setRkasFile(null);
    setBkuPayload(null);
    setRkasPayload(null);
    setBkuText('');
    setRkasText('');
    setProcessStatus(null);
    setOfficialDocTotals(null);
    setShowValidationBanner(false);
    if (bkuInputRef.current) bkuInputRef.current.value = '';
    if (rkasInputRef.current) rkasInputRef.current.value = '';
    onClearData();
  };

  const handleResetDefault = () => {
    if (readOnly) return;
    setBkuFile(null);
    setRkasFile(null);
    setBkuPayload(null);
    setRkasPayload(null);
    setBkuText('');
    setRkasText('');
    setProcessStatus(null);
    setOfficialDocTotals(null);
    setShowValidationBanner(false);
    if (bkuInputRef.current) bkuInputRef.current.value = '';
    if (rkasInputRef.current) rkasInputRef.current.value = '';
    onResetDefault();
  };

  const handleGenerate = async () => {
    if (readOnly) return;
    setIsProcessing(true);
    setShowValidationBanner(false);
    setProcessStatus('Memproses & mengekstrak data BKU dengan Coordinate-Precision Anchor...');

    try {
      const hasBku = bkuPayload || bkuText.trim() || bkuFile;
      const hasRkas = rkasPayload || rkasText.trim() || rkasFile;

      if (!hasBku && !hasRkas) {
        throw new Error('Harap unggah file BKU & RKAS atau tempel teks dokumen terlebih dahulu.');
      }

      // 1. PRIMARY: Client-Side Precision Coordinate/Excel/Text Parser (Instant, 100% reliable, offline-ready)
      const existingMonthlyRkas = monthlyStore?.[activeMonthIndex]?.rkasItems;
      let rkasCatalog: RKASItem[] = (existingMonthlyRkas && existingMonthlyRkas.length > 0)
        ? existingMonthlyRkas
        : rkasFebruaryCatalog;

      // Extract RKAS catalog from Excel, PDF, or text
      if (rkasFile && (rkasFile.name.endsWith('.xlsx') || rkasFile.name.endsWith('.xls') || rkasFile.name.endsWith('.csv'))) {
        try {
          const rkasBuffer = await rkasFile.arrayBuffer();
          const rkasWb = XLSX.read(rkasBuffer, { type: 'array' });
          const parsedRkas = parseRKASExcelWorkbook(rkasWb, activeMonthIndex);
          if (parsedRkas.length > 0) {
            rkasCatalog = parsedRkas;
          }
        } catch (e) {
          console.warn('RKAS Excel parsing note:', e);
        }
      } else if (rkasFile && rkasFile.name.endsWith('.pdf')) {
        try {
          const precisionRkas = await parseRKASPDFPrecision(rkasFile, activeMonthIndex);
          if (precisionRkas.rkasItems && precisionRkas.rkasItems.length > 0) {
            rkasCatalog = precisionRkas.rkasItems;
          }
        } catch (e) {
          console.warn('RKAS precision PDF parsing note:', e);
        }
      }

      const effectiveRkasText = (rkasText || rkasPayload?.text || '').trim();
      if (effectiveRkasText && rkasCatalog === rkasFebruaryCatalog) {
        const parsedRkas = parseRKASText(effectiveRkasText, activeMonthIndex);
        if (parsedRkas.length > 0) {
          rkasCatalog = parsedRkas;
        }
      }

      let generatedData: TransaksiBKU[] = [];
      let extractedMetadata: Partial<SchoolMetadata> | undefined = undefined;
      let reportedValidation: BKUValidationReport | null = null;

      const parseOptions = {
        targetMonthIndex: activeMonthIndex,
        monthlyArchives: monthlyStore
      };

      // Extract BKU transactions from Excel (.xlsx / .xls) with 100% accuracy to user rules
      if (bkuFile && (bkuFile.name.endsWith('.xlsx') || bkuFile.name.endsWith('.xls') || bkuFile.name.endsWith('.csv'))) {
        try {
          const bkuBuffer = await bkuFile.arrayBuffer();
          const bkuWb = XLSX.read(bkuBuffer, { type: 'array' });
          const excelResult = parseBKUExcelWorkbook(bkuWb, rkasCatalog, parseOptions);
          if (excelResult.transactions && excelResult.transactions.length > 0) {
            generatedData = excelResult.transactions;
            extractedMetadata = excelResult.metadata;
          }
        } catch (excelErr) {
          console.warn('BKU Excel parser note:', excelErr);
        }
      }

      // Extract BKU transactions from PDF using Precision Spatial parser
      if (generatedData.length === 0 && bkuFile && bkuFile.name.endsWith('.pdf')) {
        try {
          const precisionBku = await parseBKUPDFPrecision(bkuFile, rkasCatalog, parseOptions);
          if (precisionBku.transactions && precisionBku.transactions.length > 0) {
            generatedData = precisionBku.transactions;
            extractedMetadata = precisionBku.metadata;
            reportedValidation = precisionBku.validation;
          }
        } catch (pdfErr) {
          console.warn('BKU precision PDF parser note:', pdfErr);
        }
      }

      // If text exists or non-PDF (Excel/CSV/Text), extract via rule engine
      if (generatedData.length === 0) {
        const effectiveBkuText = (bkuText || bkuPayload?.text || '').trim();
        if (effectiveBkuText) {
          generatedData = mergeBKUWithRKAS(effectiveBkuText, rkasCatalog, parseOptions);
        }
      }

      // If local deterministic parser succeeded, populate data immediately
      if (generatedData.length > 0) {
        // Guarantee that satuan, tarif_harga, and volume are resolved from RKAS catalog whenever available
        generatedData.forEach((item) => {
          if (item.tipe_transaksi === 'Pengeluaran') {
            item.rincian_barang.forEach((child) => {
              if (child.is_cross_month) return; // Keep cross-month metadata intact
              const matched = findMatchInRKAS(child.kode_rekening, child.uraian_barang, rkasCatalog);
              if (matched) {
                // If child currently has default volume 1 and equal harga_satuan to total
                if (
                  matched.tarif_harga &&
                  matched.tarif_harga > 0 &&
                  (child.harga_satuan === child.jumlah_transaksi || !child.harga_satuan || child.volume === 1)
                ) {
                  const calculatedVol = Math.round(child.jumlah_transaksi / matched.tarif_harga);
                  child.volume = calculatedVol > 0 ? calculatedVol : matched.volume;
                  child.harga_satuan = matched.tarif_harga;
                  child.satuan = matched.satuan || child.satuan || 'buah';
                }
                if (!child.satuan && matched.satuan) {
                  child.satuan = matched.satuan;
                }
                if (matched.kode_rekening && (!child.kode_rekening || child.kode_rekening === '-' || child.kode_rekening.length < matched.kode_rekening.length)) {
                  child.kode_rekening = matched.kode_rekening;
                }
              }
            });
          }
        });

        console.log('%c🚀 [APPLY TO TABLE] DATA DITERAPKAN KE TABEL TRANSAKSI & SPJ:', 'background: #15803d; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;', generatedData);

        // Render data immediately to table view (NEVER BLOCK)
        onDataGenerated(
          generatedData,
          extractedMetadata,
          {
            bkuFileName: bkuFile?.name || (bkuPayload?.name !== 'bku_sample.txt' ? bkuPayload?.name : undefined),
            rkasFileName: rkasFile?.name || (rkasPayload?.name !== 'rkas_sample.txt' ? rkasPayload?.name : undefined)
          },
          rkasCatalog
        );

        if (reportedValidation) {
          setOfficialDocTotals({
            officialPengeluaran: reportedValidation.officialPengeluaran,
            officialPenerimaan: reportedValidation.officialPenerimaan,
          });
          setShowValidationBanner(true);

          if (!reportedValidation.isValid) {
            console.warn('BKU Validation Notice:', reportedValidation.statusMessage);
            setProcessStatus(`Selesai diekstrak (${generatedData.length} transaksi). Perhatian: Terdapat selisih nominal dengan baris Jumlah resmi.`);
          } else {
            setProcessStatus(`Sukses! Berhasil mengekstrak ${generatedData.length} transaksi secara presisi dari dokumen (100% Cocok).`);
          }
        } else {
          setShowValidationBanner(false);
          setProcessStatus(`Sukses! Berhasil mengekstrak ${generatedData.length} transaksi dari dokumen.`);
        }

        setIsProcessing(false);
        return;
      }

      if (generatedData.length === 0 && rkasCatalog && rkasCatalog.length > 0) {
        generatedData = rkasCatalog.map((item, idx) => ({
          tanggal: `15-${String(activeMonthIndex).padStart(2, '0')}-2026`,
          no_bku: `RKAS-${String(idx + 1).padStart(3, '0')}`,
          tipe_transaksi: 'Pengeluaran',
          total_pemasukan_bku: 0,
          total_pengeluaran_bku: item.jumlah || (item.volume * item.tarif_harga),
          rincian_barang: [{
            kode_rekening: item.kode_rekening,
            uraian_barang: item.uraian,
            volume: item.volume,
            satuan: item.satuan,
            harga_satuan: item.tarif_harga,
            jumlah_transaksi: item.jumlah || (item.volume * item.tarif_harga),
            kode_kegiatan: item.kode_program,
            match_note: 'Rincian Belanja Anggaran RKAS Sekolah'
          }],
          kode_kegiatan: item.kode_program,
          klasifikasi: 'Lainnya'
        }));

        onDataGenerated(
          generatedData,
          extractedMetadata,
          {
            rkasFileName: rkasFile?.name || (rkasPayload?.name !== 'rkas_sample.txt' ? rkasPayload?.name : undefined)
          },
          rkasCatalog
        );
        setShowValidationBanner(false);
        setProcessStatus(`Sukses memuat ${generatedData.length} rincian belanja dari RKAS.`);
        setIsProcessing(false);
        return;
      }

      throw new Error('Tidak ada baris transaksi yang berhasil diekstrak dari dokumen yang diberikan. Pastikan file berisi tabel BKU yang valid atau gunakan menu Tempel Teks untuk input langsung.');
    } catch (error: any) {
      console.error('Processing error:', error);
      setProcessStatus(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {monthlyArchives && monthlyArchives.length > 0 && onSelectMonth && onDeleteMonth && (
        <MonthlyArchiveCards
          archives={monthlyArchives}
          activeMonthId={activeMonthId}
          onSelectMonth={onSelectMonth}
          onDeleteMonth={onDeleteMonth}
          onRenameMonth={onRenameMonth}
          onAddNewMonthUpload={() => {
            setActiveTab('upload');
            // Scroll to upload box smoothly
            const el = document.getElementById('bku-upload-box-container');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      <div id="bku-upload-box-container" className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Input & Ekstraksi Dokumen Mentah (BKU + RKAS)
            </h2>
            <p className="text-xs text-slate-500">
              Upload file PDF, Excel, CSV, atau Teks langsung untuk generate tabel & JSON
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tempel Teks / OCR
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {activeTab === 'upload' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BKU Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!readOnly) setIsDragOverBku(true);
              }}
              onDragLeave={() => setIsDragOverBku(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverBku(false);
                if (!readOnly && e.dataTransfer.files?.[0]) {
                  handleBkuFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => !readOnly && bkuInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isDragOverBku
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                  : bkuFile
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={bkuInputRef}
                type="file"
                disabled={readOnly}
                accept=".xlsx,.xls,.csv,.txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (!readOnly && e.target.files?.[0]) {
                    handleBkuFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                1. Dokumen Buku Kas Umum (BKU)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {bkuFile ? (
                  <span className="font-semibold text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {bkuFile.name} ({(bkuFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  'Tarik & lepas file BKU (.xlsx, .csv, .txt, .pdf) atau klik untuk memilih'
                )}
              </p>
              <div className="text-[10px] text-slate-400 mt-2">
                * Sumber dasar utama transaksi belanja dan penerimaan
              </div>
            </div>

            {/* RKAS Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!readOnly) setIsDragOverRkas(true);
              }}
              onDragLeave={() => setIsDragOverRkas(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverRkas(false);
                if (!readOnly && e.dataTransfer.files?.[0]) {
                  handleRkasFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => !readOnly && rkasInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                readOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isDragOverRkas
                  ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                  : rkasFile
                  ? 'border-blue-400 bg-blue-50/30'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={rkasInputRef}
                type="file"
                disabled={readOnly}
                accept=".xlsx,.xls,.csv,.txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (!readOnly && e.target.files?.[0]) {
                    handleRkasFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 mx-auto flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                2. Dokumen Kertas Kerja (RKAS)
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {rkasFile ? (
                  <span className="font-semibold text-blue-700 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    {rkasFile.name} ({(rkasFile.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  'Tarik & lepas file RKAS (.xlsx, .csv, .txt, .pdf) atau klik untuk memilih'
                )}
              </p>
              <div className="text-[10px] text-blue-600 font-medium mt-2">
                ✓ Satuan, Volume & Tarif akan diekstrak langsung dari file ini (tidak null)
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Data Mentah / OCR Teks BKU:</span>
                <span className="text-[11px] text-slate-400 font-normal">Teks Transaksi BKU</span>
              </label>
              <textarea
                rows={5}
                disabled={readOnly}
                value={bkuText}
                onChange={(e) => setBkuText(e.target.value)}
                placeholder="Tempel baris teks transaksi BKU di sini..."
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Data Mentah / OCR Teks RKAS:</span>
                <span className="text-[11px] text-blue-600 font-medium">Katalog Satuan & Tarif</span>
              </label>
              <textarea
                rows={5}
                disabled={readOnly}
                value={rkasText}
                onChange={(e) => setRkasText(e.target.value)}
                placeholder="Tempel baris rincian RKAS di sini..."
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
              />
            </div>
          </div>
        )}

        {/* Action Controls & Status */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${currentData.length > 0 || isLiveValid ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
            <span>
              {processStatus || (currentData.length > 0 ? `Tabel aktif memuat ${currentData.length} transaksi (${liveTotalItems} rincian item).` : 'Siap memproses dokumen BKU dan mencocokkan Satuan dari RKAS.')}
            </span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={readOnly || isProcessing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Mengekstrak Data...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                Proses & Generate ke Tabel
              </>
            )}
          </button>
        </div>

        {/* 6) VALIDASI OTOMATIS REAL-TIME REPORT BANNER */}
        {showValidationBanner && (
          <div className={`mt-4 p-3.5 rounded-xl border text-xs transition-all ${
            isLiveValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200/80 text-amber-950'
          }`}>
            <div className="flex items-start gap-2.5">
              {isLiveValid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>
                    {isLiveValid
                      ? 'Validasi Otomatis Berhasil (100% Cocok)'
                      : 'Informasi Rekonsiliasi: Probabilitas di Luar Pengeluaran Belanja (Pajak dll)'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    isLiveValid ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-900 border border-amber-300'
                  }`}>
                    {isLiveValid ? 'MATCH' : 'DILUAR BELANJA / PAJAK'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-700">
                  {liveStatusMessage}
                </p>

                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/60 font-mono text-[11px]">
                  <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                    <span className="text-slate-500 block text-[10px]">Total Penerimaan:</span>
                    <span className="font-bold text-slate-900">Rp {liveParsedPenerimaan.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                    <span className="text-slate-500 block text-[10px]">Total Pengeluaran Belanja Tabel:</span>
                    <span className="font-bold text-slate-900">Rp {liveParsedPengeluaran.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-white/70 p-2 rounded border border-emerald-200/60 bg-emerald-50/50">
                    <span className="text-emerald-700 block text-[10px] font-semibold">Sisa Saldo (Tabel):</span>
                    <span className="font-bold text-emerald-800">Rp {liveSisaSaldo.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                    <span className="text-slate-500 block text-[10px]">Total Resmi Dokumen BKU:</span>
                    <span className="font-bold text-slate-900">
                      {officialDocTotals?.officialPengeluaran !== undefined
                        ? `Rp ${officialDocTotals.officialPengeluaran.toLocaleString('id-ID')}`
                        : '-'}
                    </span>
                  </div>
                  <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                    <span className="text-slate-500 block text-[10px] truncate" title="Probabilitas di luar belanja tabel seperti setoran PPN/PPh, SIPLah, atau non-pengeluaran">
                      Probabilitas Diluar Belanja:
                    </span>
                    <span className={`font-bold ${liveDiffPengeluaran && liveDiffPengeluaran !== 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {liveDiffPengeluaran !== undefined
                        ? `Rp ${Math.abs(liveDiffPengeluaran).toLocaleString('id-ID')}`
                        : 'Rp 0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};
