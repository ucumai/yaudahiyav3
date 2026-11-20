import React, { useState } from 'react';
import { Upload, FileText, Sparkles, AlertTriangle, Check, RefreshCw, X, FileSpreadsheet, ArrowRight, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import { processUploadedFile, FilePayload } from '../utils/fileHelpers';
import { sampleBKUText, sampleRKASText } from '../data/sampleTextData';
import { TransaksiBKU, SchoolMetadata, RKASItem, MonthlyArchive } from '../types';
import { parseBKUExcelWorkbook, parseRKASExcelWorkbook } from '../utils/excelBkuParser';
import { parseBKUPDFPrecision, parseRKASPDFPrecision } from '../utils/pdfPrecisionParser';
import { mergeBKUWithRKAS, parseRKASText } from '../utils/documentParser';
import { rkasFebruaryCatalog } from '../utils/rkasCatalog';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataGenerated: (
    data: TransaksiBKU[],
    customMetadata?: Partial<SchoolMetadata>,
    fileInfo?: { bkuFileName?: string; rkasFileName?: string },
    rkasItems?: RKASItem[]
  ) => void;
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataGenerated,
  monthlyStore,
  activeMonthIndex
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  
  // File states
  const [rawBkuFile, setRawBkuFile] = useState<File | null>(null);
  const [rawRkasFile, setRawRkasFile] = useState<File | null>(null);
  const [bkuFile, setBkuFile] = useState<FilePayload | null>(null);
  const [rkasFile, setRkasFile] = useState<FilePayload | null>(null);
  const [bkuFileName, setBkuFileName] = useState<string>('');
  const [rkasFileName, setRkasFileName] = useState<string>('');

  // Paste text states
  const [bkuText, setBkuText] = useState<string>('');
  const [rkasText, setRkasText] = useState<string>('');

  // Processing state
  const [isLoading, setIsLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBkuFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setRawBkuFile(file);
      setBkuFileName(file.name);
      const payload = await processUploadedFile(file);
      setBkuFile(payload);
      if (payload.text) {
        setBkuText(payload.text);
      }
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Gagal membaca file BKU: ${err.message}`);
    }
  };

  const handleRkasFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setRawRkasFile(file);
      setRkasFileName(file.name);
      const payload = await processUploadedFile(file);
      setRkasFile(payload);
      if (payload.text) {
        setRkasText(payload.text);
      }
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Gagal membaca file RKAS: ${err.message}`);
    }
  };

  const handleLoadSample = () => {
    setBkuText(sampleBKUText);
    setRkasText(sampleRKASText);
    setActiveTab('paste');
    setErrorMessage(null);
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    setProgressStep('Mempersiapkan dokumen BKU & RKAS...');

    const parseOptions = {
      targetMonthIndex: activeMonthIndex,
      monthlyArchives: monthlyStore
    };

    try {
      // 1. FAST-PATH: Direct Excel Parser (.xlsx / .xls / .csv)
      if (
        activeTab === 'upload' &&
        rawBkuFile &&
        (rawBkuFile.name.endsWith('.xlsx') || rawBkuFile.name.endsWith('.xls') || rawBkuFile.name.endsWith('.csv'))
      ) {
        setProgressStep('Mengekstrak data transaksi BKU dari file Excel dengan Mesin Pencocokan Lintas Bulan...');
        const bkuBuffer = await rawBkuFile.arrayBuffer();
        const bkuWorkbook = XLSX.read(bkuBuffer, { type: 'array' });

        const existingMonthlyRkas = monthlyStore?.[activeMonthIndex]?.rkasItems;
        let customRkasCatalog: RKASItem[] = (existingMonthlyRkas && existingMonthlyRkas.length > 0)
          ? existingMonthlyRkas
          : rkasFebruaryCatalog;

        if (
          rawRkasFile &&
          (rawRkasFile.name.endsWith('.xlsx') || rawRkasFile.name.endsWith('.xls') || rawRkasFile.name.endsWith('.csv'))
        ) {
          const rkasBuffer = await rawRkasFile.arrayBuffer();
          const rkasWorkbook = XLSX.read(rkasBuffer, { type: 'array' });
          const parsedRkas = parseRKASExcelWorkbook(rkasWorkbook, activeMonthIndex);
          if (parsedRkas.length > 0) {
            customRkasCatalog = parsedRkas;
          }
        } else if (rawRkasFile && rawRkasFile.name.endsWith('.pdf')) {
          const precisionRkas = await parseRKASPDFPrecision(rawRkasFile, activeMonthIndex);
          if (precisionRkas.rkasItems && precisionRkas.rkasItems.length > 0) {
            customRkasCatalog = precisionRkas.rkasItems;
          }
        }

        const excelParsedResult = parseBKUExcelWorkbook(bkuWorkbook, customRkasCatalog, parseOptions);

        if (excelParsedResult.transactions && excelParsedResult.transactions.length > 0) {
          onDataGenerated(
            excelParsedResult.transactions,
            excelParsedResult.metadata,
            {
              bkuFileName: bkuFileName || undefined,
              rkasFileName: rkasFileName || undefined
            },
            customRkasCatalog
          );
          onClose();
          return;
        }
      }

      // 2. FAST-PATH: Direct PDF Parser (.pdf)
      if (
        activeTab === 'upload' &&
        rawBkuFile &&
        rawBkuFile.name.endsWith('.pdf')
      ) {
        setProgressStep('Mengekstrak data BKU presisi PDF dengan Mesin Pencocokan Lintas Bulan...');
        const existingMonthlyRkas = monthlyStore?.[activeMonthIndex]?.rkasItems;
        let customRkasCatalog: RKASItem[] = (existingMonthlyRkas && existingMonthlyRkas.length > 0)
          ? existingMonthlyRkas
          : rkasFebruaryCatalog;

        if (rawRkasFile && rawRkasFile.name.endsWith('.pdf')) {
          const precisionRkas = await parseRKASPDFPrecision(rawRkasFile, activeMonthIndex);
          if (precisionRkas.rkasItems && precisionRkas.rkasItems.length > 0) {
            customRkasCatalog = precisionRkas.rkasItems;
          }
        } else if (
          rawRkasFile &&
          (rawRkasFile.name.endsWith('.xlsx') || rawRkasFile.name.endsWith('.xls') || rawRkasFile.name.endsWith('.csv'))
        ) {
          const rkasBuffer = await rawRkasFile.arrayBuffer();
          const rkasWorkbook = XLSX.read(rkasBuffer, { type: 'array' });
          const parsedRkas = parseRKASExcelWorkbook(rkasWorkbook, activeMonthIndex);
          if (parsedRkas.length > 0) {
            customRkasCatalog = parsedRkas;
          }
        }
        const pdfResult = await parseBKUPDFPrecision(rawBkuFile, customRkasCatalog, parseOptions);
        if (pdfResult.transactions && pdfResult.transactions.length > 0) {
          onDataGenerated(
            pdfResult.transactions,
            pdfResult.metadata,
            {
              bkuFileName: bkuFileName || undefined,
              rkasFileName: rkasFileName || undefined
            },
            customRkasCatalog
          );
          onClose();
          return;
        }
      }

      // 3. FAST-PATH: Text Paste
      if (activeTab === 'paste' && bkuText.trim()) {
        setProgressStep('Menganalisis teks BKU dengan Mesin Pencocokan Lintas Bulan...');
        const existingMonthlyRkas = monthlyStore?.[activeMonthIndex]?.rkasItems;
        let customRkas = (existingMonthlyRkas && existingMonthlyRkas.length > 0)
          ? existingMonthlyRkas
          : rkasFebruaryCatalog;

        if (rkasText.trim()) {
          const parsed = parseRKASText(rkasText.trim(), activeMonthIndex);
          if (parsed.length > 0) customRkas = parsed;
        }
        const textResult = mergeBKUWithRKAS(bkuText.trim(), customRkas, parseOptions);
        if (textResult.length > 0) {
          onDataGenerated(
            textResult,
            undefined,
            {
              bkuFileName: 'Teks BKU Manual',
              rkasFileName: rkasText.trim() ? 'Teks RKAS Manual' : undefined
            },
            customRkas
          );
          onClose();
          return;
        }
      }

      // 3.5. FAST-PATH: RKAS Upload Only (or text paste only)
      if (activeTab === 'upload' && !rawBkuFile && rawRkasFile) {
        setProgressStep('Mengekstrak rincian anggaran belanja dari file RKAS...');
        let customRkasCatalog: RKASItem[] = [];
        if (rawRkasFile.name.endsWith('.xlsx') || rawRkasFile.name.endsWith('.xls') || rawRkasFile.name.endsWith('.csv')) {
          const rkasBuffer = await rawRkasFile.arrayBuffer();
          const rkasWorkbook = XLSX.read(rkasBuffer, { type: 'array' });
          customRkasCatalog = parseRKASExcelWorkbook(rkasWorkbook, activeMonthIndex);
        } else if (rawRkasFile.name.endsWith('.pdf')) {
          const precisionRkas = await parseRKASPDFPrecision(rawRkasFile, activeMonthIndex);
          customRkasCatalog = precisionRkas.rkasItems || [];
        }

        if (customRkasCatalog.length > 0) {
          const generatedTransactions: TransaksiBKU[] = customRkasCatalog.map((item, idx) => ({
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
              match_note: 'Rincian Belanja Anggaran RKAS'
            }],
            kode_kegiatan: item.kode_program,
            klasifikasi: 'Lainnya'
          }));

          onDataGenerated(
            generatedTransactions,
            undefined,
            {
              rkasFileName: rkasFileName || undefined
            },
            customRkasCatalog
          );
          onClose();
          return;
        }
      }

      if (activeTab === 'paste' && !bkuText.trim() && rkasText.trim()) {
        const parsed = parseRKASText(rkasText.trim());
        if (parsed.length > 0) {
          const generatedTransactions: TransaksiBKU[] = parsed.map((item, idx) => ({
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
              match_note: 'Rincian Belanja Anggaran RKAS'
            }],
            kode_kegiatan: item.kode_program,
            klasifikasi: 'Lainnya'
          }));

          onDataGenerated(
            generatedTransactions,
            undefined,
            {
              rkasFileName: 'Teks RKAS Manual'
            },
            parsed
          );
          onClose();
          return;
        }
      }

      // 4. Validasi Dokumen: Jika format berkas belum dikenali
      const hasBku = (activeTab === 'upload' && bkuFile) || (activeTab === 'paste' && bkuText.trim());
      const hasRkas = (activeTab === 'upload' && rkasFile) || (activeTab === 'paste' && rkasText.trim());

      if (!hasBku && !hasRkas) {
        throw new Error('Harap lampirkan dokumen BKU atau RKAS terlebih dahulu.');
      }

      throw new Error(
        'Format dokumen belum dapat dikenali atau transaksi tidak ditemukan. Pastikan Anda mengunggah file Excel (.xlsx) atau PDF (.pdf) standar BKU/RKAS BOSP Kemendikbud.'
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses dokumen.');
    } finally {
      setIsLoading(false);
      setProgressStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Upload & Ekstrak Data Dokumen BKU & RKAS
              </h2>
              <p className="text-xs text-slate-500">
                Otomatis rekonsiliasi Parent-Child, ambil Satuan & Volume dari RKAS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Method Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Upload File (PDF / Excel / CSV / TXT)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Paste Teks / OCR Langsung
              </button>
            </div>

            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Gunakan Teks Sampel SDN Babakan 04
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Peringatan:</strong> {errorMessage}
              </div>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BKU Upload Box */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 bg-slate-50/50 text-center transition-colors">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  1. Dokumen Buku Kas Umum (BKU)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  PDF, Excel (.xlsx, .xls), CSV, atau TXT
                </p>

                <input
                  type="file"
                  id="bku-file-input"
                  accept=".pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handleBkuFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="bku-file-input"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-2xs cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {bkuFileName ? 'Ganti File BKU' : 'Pilih File BKU'}
                </label>

                {bkuFileName && (
                  <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-medium flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate max-w-[200px]">{bkuFileName}</span>
                  </div>
                )}
              </div>

              {/* RKAS Upload Box */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 bg-slate-50/50 text-center transition-colors">
                <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  2. Dokumen Kertas Kerja (RKAS)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  PDF, Excel (.xlsx, .xls), CSV, atau TXT
                </p>

                <input
                  type="file"
                  id="rkas-file-input"
                  accept=".pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handleRkasFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="rkas-file-input"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-2xs cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {rkasFileName ? 'Ganti File RKAS' : 'Pilih File RKAS'}
                </label>

                {rkasFileName && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs font-medium flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate max-w-[200px]">{rkasFileName}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teks / OCR Dokumen BKU
                </label>
                <textarea
                  rows={9}
                  value={bkuText}
                  onChange={(e) => setBkuText(e.target.value)}
                  placeholder="Paste tabel atau teks BKU di sini..."
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teks / OCR Dokumen RKAS
                </label>
                <textarea
                  rows={9}
                  value={rkasText}
                  onChange={(e) => setRkasText(e.target.value)}
                  placeholder="Paste tabel atau teks RKAS di sini..."
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Guarantee Note */}
          <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Logika Pemrosesan Otomatis:
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
              <li>File PDF diproses secara aman tanpa menghasilkan karakter binary rusak.</li>
              <li>Data Satuan & Volume akan dicocokkan otomatis dari tabel RKAS.</li>
              <li>Pajak SIPLah dan Bunga Bank diabaikan dari daftar belanja fisik.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isLoading ? (
              <span className="flex items-center gap-2 text-emerald-700 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {progressStep}
              </span>
            ) : (
              'Siap memproses data'
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Data ke Tabel
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
