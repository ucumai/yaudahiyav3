import React, { useState, useMemo, useEffect } from 'react';
import { SchoolMetadata, LogistikBarang, MasterGuru } from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { useSchool } from '../../context/SchoolContext';
import { readLS, writeLS } from '../../lib/schoolStorage';
import {
  Printer,
  Download,
  PackageCheck,
  Layers,
  Sliders,
  FileText,
  Maximize2,
  RotateCw,
  Eye,
  EyeOff,
  Edit3,
  Calendar,
  Users,
  UserCheck,
  Undo2
} from 'lucide-react';

export interface OpnamePrintSettings {
  paperSize: 'A4' | 'F4' | 'Letter';
  orientation: 'landscape' | 'portrait';
  marginPreset: 'compact' | 'normal' | 'spacious' | 'custom';
  marginMm: number;
  tableDensity: 'super-compact' | 'compact' | 'normal' | 'spacious';
  signatureSpacing: 'compact' | 'normal' | 'wide' | 'extra-wide';
  signatureHeightPx: number;
  showKop: boolean;
  showNarasi: boolean;
  onlyActiveRecipients: boolean;
}

const DEFAULT_OPNAME_PRINT_SETTINGS: OpnamePrintSettings = {
  paperSize: 'A4',
  orientation: 'landscape',
  marginPreset: 'compact',
  marginMm: 8,
  tableDensity: 'compact',
  signatureSpacing: 'normal',
  signatureHeightPx: 75,
  showKop: true,
  showNarasi: true,
  onlyActiveRecipients: true,
};

const STORAGE_KEY = 'opname_print_settings_v1';

interface OpnamePersediaanViewProps {
  barangList: LogistikBarang[];
  teachers: MasterGuru[];
  metadata: SchoolMetadata;
  periodeText?: string;
  tanggalCetak?: string;
  namaPengurusBarang?: string;
  nipPengurusBarang?: string;
}

export const OpnamePersediaanView: React.FC<OpnamePersediaanViewProps> = ({
  barangList,
  teachers,
  metadata,
  periodeText = 'FEBRUARI 2026',
  tanggalCetak = '28 Februari 2026',
  namaPengurusBarang = 'Nurhayati, S.Pd.',
  nipPengurusBarang = '198804152014032002'
}) => {
  const { schoolId } = useSchool();
  // Submenu filter kategori: 'ALL' (Semua), 'ATK' (Khusus ATK), 'ALKEB' (Khusus Alat Kebersihan)
  const [filterKategori, setFilterKategori] = useState<'ALL' | 'ATK' | 'ALKEB'>('ALL');

  // Drawer / Toggle Pengaturan Printout
  const [showPrintSettings, setShowPrintSettings] = useState<boolean>(false);
  const [showOfficialEditor, setShowOfficialEditor] = useState<boolean>(false);

  // State Pengaturan Cetak dengan persistensi LocalStorage per sekolah
  const [printSettings, setPrintSettings] = useState<OpnamePrintSettings>(() => {
    const saved = readLS<Partial<OpnamePrintSettings> | null>(schoolId, STORAGE_KEY, null);
    if (saved) {
      return { ...DEFAULT_OPNAME_PRINT_SETTINGS, ...saved };
    }
    return DEFAULT_OPNAME_PRINT_SETTINGS;
  });

  // State Override Dokumen (Periode, Tanggal, Pejabat)
  const [docPeriode, setDocPeriode] = useState<string>(periodeText);
  const [docTanggal, setDocTanggal] = useState<string>(tanggalCetak);
  const [docNamaPengurus, setDocNamaPengurus] = useState<string>(namaPengurusBarang);
  const [docNipPengurus, setDocNipPengurus] = useState<string>(nipPengurusBarang);
  const [docNamaBendahara, setDocNamaBendahara] = useState<string>(metadata.bendahara || 'Siti Aminah, S.Pd.');
  const [docNipBendahara, setDocNipBendahara] = useState<string>(metadata.nipBendahara || '198503202010012015');
  const [docNamaKepsek, setDocNamaKepsek] = useState<string>(metadata.kepalaSekolah || 'Drs. H. Mulyadi, M.Pd.');
  const [docNipKepsek, setDocNipKepsek] = useState<string>(metadata.nipKepalaSekolah || '196805121993031004');

  // Sinkronisasi bila props awal berubah
  useEffect(() => {
    if (periodeText) setDocPeriode(periodeText);
  }, [periodeText]);

  useEffect(() => {
    if (tanggalCetak) setDocTanggal(tanggalCetak);
  }, [tanggalCetak]);

  useEffect(() => {
    if (namaPengurusBarang) setDocNamaPengurus(namaPengurusBarang);
    if (nipPengurusBarang) setDocNipPengurus(nipPengurusBarang);
  }, [namaPengurusBarang, nipPengurusBarang]);

  useEffect(() => {
    if (metadata.bendahara) setDocNamaBendahara(metadata.bendahara);
    if (metadata.nipBendahara) setDocNipBendahara(metadata.nipBendahara);
    if (metadata.kepalaSekolah) setDocNamaKepsek(metadata.kepalaSekolah);
    if (metadata.nipKepalaSekolah) setDocNipKepsek(metadata.nipKepalaSekolah);
  }, [metadata]);

  const updatePrintSettings = (updates: Partial<OpnamePrintSettings>) => {
    setPrintSettings((prev) => {
      const next = { ...prev, ...updates };
      writeLS(schoolId, STORAGE_KEY, next);
      return next;
    });
  };

  const handleResetPrintSettings = () => {
    setPrintSettings(DEFAULT_OPNAME_PRINT_SETTINGS);
    writeLS(schoolId, STORAGE_KEY, DEFAULT_OPNAME_PRINT_SETTINGS);
  };

  // Helper identifikasi kategori barang persediaan
  const isItemAtk = (item: LogistikBarang): boolean => {
    if (item.kategori === 'ATK') return true;
    if (item.kategori === 'ALKEB') return false;
    const nama = (item.namaBarang || '').toLowerCase();
    return !/(sapu|pel|pembersih|sabun|karbol|sikat|kemoceng|super\s*pel|rinso|sunlight|wipol|bayclin|detergen|tempat\s*sampah|plastik\s*sampah|kamper|pengharum)/i.test(nama);
  };

  const isItemAlkeb = (item: LogistikBarang): boolean => {
    if (item.kategori === 'ALKEB') return true;
    if (item.kategori === 'ATK') return false;
    const nama = (item.namaBarang || '').toLowerCase();
    return /(sapu|pel|pembersih|sabun|karbol|sikat|kemoceng|super\s*pel|rinso|sunlight|wipol|bayclin|detergen|tempat\s*sampah|plastik\s*sampah|kamper|pengharum)/i.test(nama);
  };

  // Hitung jumlah item per kategori
  const countAll = barangList.length;
  const countAtk = useMemo(() => barangList.filter(isItemAtk).length, [barangList]);
  const countAlkeb = useMemo(() => barangList.filter(isItemAlkeb).length, [barangList]);

  // Daftar barang yang ditampilkan sesuai submenu filter
  const filteredBarangList = useMemo(() => {
    if (filterKategori === 'ATK') return barangList.filter(isItemAtk);
    if (filterKategori === 'ALKEB') return barangList.filter(isItemAlkeb);
    return barangList;
  }, [barangList, filterKategori]);

  // Ambil daftar personel unik yang menerima barang (bukan kepala sekolah murni)
  const basePenerimaList = useMemo(() => {
    return teachers.filter((t) => !t.jabatan.toLowerCase().includes('kepala sekolah'));
  }, [teachers]);

  // Kolom penerima: opsi ringkas (hanya penerima aktif) vs lengkap (semua penerima)
  const effectivePenerimaList = useMemo(() => {
    if (!printSettings.onlyActiveRecipients) {
      return basePenerimaList;
    }
    const activeRecipients = basePenerimaList.filter((p) => {
      return filteredBarangList.some((item) => {
        const alloc = item.alokasi.find((a) => a.personId === p.id || a.personName === p.nama);
        return alloc && alloc.qty > 0;
      });
    });
    return activeRecipients.length > 0 ? activeRecipients : basePenerimaList;
  }, [basePenerimaList, filteredBarangList, printSettings.onlyActiveRecipients]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const handleExportCsv = () => {
    let header = 'No,Tanggal,Kode Kegiatan,Uraian Barang,Kategori,Sisa Lalu,Belanja Masuk';
    effectivePenerimaList.forEach((p) => {
      header += `,"${p.jabatan} (${p.nama})"`;
    });
    header += ',Total Pemakaian,Sisa Akhir Stok\n';

    const rows = filteredBarangList.map((item, idx) => {
      const totalMasuk = item.totalVolume;
      const sisaLalu = item.sisaLalu || 0;
      let totalKeluar = 0;
      
      const alokasiCols = effectivePenerimaList.map((p) => {
        const alloc = item.alokasi.find((a) => a.personId === p.id || a.personName === p.nama);
        const qty = alloc ? alloc.qty : 0;
        totalKeluar += qty;
        return qty;
      });

      const sisaAkhir = (sisaLalu + totalMasuk) - totalKeluar;
      const kat = item.kategori || (isItemAtk(item) ? 'ATK' : 'ALKEB');

      return `"${idx + 1}","${item.tanggalBelanja || '-'}","${item.kodeKegiatan || item.kodeRekening}","${item.namaBarang}","${kat}","${sisaLalu}","${totalMasuk}",${alokasiCols.join(',')},"${totalKeluar}","${sisaAkhir}"`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = filterKategori === 'ALL' ? 'GABUNGAN' : filterKategori;
    a.download = `Buku_Opname_Persediaan_${suffix}_${metadata.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}_${docPeriode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSubTitleText = () => {
    if (filterKategori === 'ATK') return 'KLASIFIKASI: KHUSUS ALAT TULIS KANTOR (ATK)';
    if (filterKategori === 'ALKEB') return 'KLASIFIKASI: KHUSUS ALAT KEBERSIHAN (ALKEB)';
    return 'KLASIFIKASI: SEMUA PERSEDIAAN (ATK & ALAT KEBERSIHAN)';
  };

  const getNarasiOpname = () => {
    if (filterKategori === 'ATK') {
      return '* Seluruh barang persediaan habis pakai berupa Alat Tulis Kantor (ATK) telah diperiksa secara fisik di ruang inventaris/gudang sekolah dan didistribusikan secara tertib kepada masing-masing guru, kelas, dan penanggung jawab operasional kegiatan KBM.';
    }
    if (filterKategori === 'ALKEB') {
      return '* Seluruh barang persediaan habis pakai berupa Alat Kebersihan (ALKEB) telah diperiksa secara fisik di ruang inventaris/gudang sekolah dan didistribusikan secara tertib kepada petugas kebersihan, penjaga sekolah, dan penanggung jawab kebersihan lingkungan.';
    }
    return '* Seluruh barang persediaan habis pakai (Alat Tulis Kantor & Alat Kebersihan) telah diperiksa secara fisik di ruang inventaris/gudang sekolah dan didistribusikan secara tertib kepada masing-masing penanggung jawab ruangan, kelas, dan operasional kebersihan.';
  };

  // Perhitungan CSS Media Print
  let paperSizeRule = 'A4 landscape';
  if (printSettings.paperSize === 'F4') {
    paperSizeRule = printSettings.orientation === 'landscape' ? '330mm 215mm' : '215mm 330mm';
  } else if (printSettings.paperSize === 'Letter') {
    paperSizeRule = printSettings.orientation === 'landscape' ? 'letter landscape' : 'letter portrait';
  } else {
    paperSizeRule = printSettings.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  }

  const marginMm = printSettings.marginMm;

  // Konfigurasi Kepadatan & Ukuran Font Tabel Opname
  const densityStyles = useMemo(() => {
    switch (printSettings.tableDensity) {
      case 'super-compact':
        return {
          tableText: 'text-[8.5px] print:text-[7pt] leading-tight',
          cellPadding: 'py-0.5 px-1',
          headerText: 'text-[8px] print:text-[6.8pt]',
          headerSubText: 'text-[7px] print:text-[6pt]',
          noWidth: 'w-6',
          dateWidth: 'w-16',
          codeWidth: 'w-16',
          descWidth: 'min-w-[110px]',
          numWidth: 'w-10',
          teacherWidth: 'min-w-[50px] max-w-[65px]'
        };
      case 'spacious':
        return {
          tableText: 'text-[11px] print:text-[9.5pt] leading-relaxed',
          cellPadding: 'py-2 px-2',
          headerText: 'text-[11px] print:text-[9pt]',
          headerSubText: 'text-[9.5px] print:text-[8pt]',
          noWidth: 'w-9',
          dateWidth: 'w-24',
          codeWidth: 'w-24',
          descWidth: 'min-w-[170px]',
          numWidth: 'w-16',
          teacherWidth: 'min-w-[85px] max-w-[100px]'
        };
      case 'normal':
        return {
          tableText: 'text-[10px] print:text-[8.5pt] leading-normal',
          cellPadding: 'py-1.5 px-1.5',
          headerText: 'text-[9.5px] print:text-[8pt]',
          headerSubText: 'text-[8.5px] print:text-[7pt]',
          noWidth: 'w-8',
          dateWidth: 'w-20',
          codeWidth: 'w-20',
          descWidth: 'min-w-[145px]',
          numWidth: 'w-14',
          teacherWidth: 'min-w-[70px] max-w-[85px]'
        };
      case 'compact':
      default:
        return {
          tableText: 'text-[9px] print:text-[7.8pt] leading-tight',
          cellPadding: 'py-1 px-1',
          headerText: 'text-[8.8px] print:text-[7.5pt]',
          headerSubText: 'text-[7.8px] print:text-[6.5pt]',
          noWidth: 'w-7',
          dateWidth: 'w-18',
          codeWidth: 'w-18',
          descWidth: 'min-w-[130px]',
          numWidth: 'w-12',
          teacherWidth: 'min-w-[60px] max-w-[75px]'
        };
    }
  }, [printSettings.tableDensity]);

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS for Opname */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${paperSizeRule};
                margin: ${marginMm}mm ${marginMm}mm;
              }
              body, html {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .a4-print-sheet {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: 0 !important;
                height: auto !important;
                max-height: none !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
              }
              table.opname-table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              table.opname-table thead {
                display: table-header-group !important;
              }
              table.opname-table tbody {
                display: table-row-group !important;
              }
              table.opname-table tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: auto !important;
              }
              table.opname-table td, table.opname-table th {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .opname-signatures {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-top: 1.5rem !important;
              }
              .opname-signature-space {
                height: ${printSettings.signatureHeightPx}px !important;
              }
            }
          `
        }}
      />

      {/* Action Header & Printout Toolbar - No Print */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              Buku Rekapitulasi Stock Opname Persediaan Barang
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Laporan fisik saldo awal, penambahan belanja BOSP, distribusi pemakaian ke masing-masing guru/petugas, dan sisa stok akhir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Tombol Buka/Tutup Pengaturan Printout */}
            <button
              type="button"
              onClick={() => setShowPrintSettings(!showPrintSettings)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer border ${
                showPrintSettings
                  ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Atur Ukuran Kertas, Orientasi, Margin, Ukuran Font, dan Kolom Cetak Opname"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>{showPrintSettings ? 'Tutup Pengaturan Cetak' : 'Pengaturan Cetak Opname'}</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                {printSettings.paperSize} &bull; {printSettings.orientation === 'landscape' ? 'Lanskap' : 'Potret'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV {filterKategori !== 'ALL' ? `(${filterKategori})` : ''}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak PDF {filterKategori !== 'ALL' ? `(${filterKategori})` : 'Opname'}
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* DRAWER PENGATURAN PRINTOUT HALAMAN OPNAME */}
        {/* ======================================================================= */}
        {showPrintSettings && (
          <div className="pt-4 border-t border-slate-200 bg-slate-50/80 -mx-4 -mb-4 p-4 sm:p-5 sm:-mx-5 sm:-mb-5 rounded-b-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Panel Konfigurasi Cetak Halaman Opname Persediaan
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md font-mono">
                  {printSettings.paperSize} &bull; {printSettings.orientation === 'landscape' ? 'Lanskap' : 'Potret'} &bull; Margin {printSettings.marginMm}mm &bull; TTD {printSettings.signatureHeightPx}px
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOfficialEditor(!showOfficialEditor)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    showOfficialEditor
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Edit3 className="w-3 h-3 text-amber-600" />
                  <span>{showOfficialEditor ? 'Sembunyikan Form Pejabat' : 'Ubah Pejabat & Tanggal'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetPrintSettings}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="Kembalikan semua pengaturan printout ke standar rekomendasi"
                >
                  <Undo2 className="w-3 h-3 text-slate-500" />
                  <span>Reset Standar</span>
                </button>
              </div>
            </div>

            {/* Grid 4 Kolom Pengaturan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Ukuran Kertas & Orientasi */}
              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Ukuran &amp; Orientasi Kertas:
                </label>
                
                {/* Paper Size */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['A4', 'F4', 'Letter'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updatePrintSettings({ paperSize: sz })}
                      className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                        printSettings.paperSize === sz
                          ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {sz === 'F4' ? 'F4 / Folio' : sz}
                    </button>
                  ))}
                </div>

                {/* Orientation */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => updatePrintSettings({ orientation: 'landscape' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printSettings.orientation === 'landscape'
                        ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Lanskap (Mendatar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePrintSettings({ orientation: 'portrait' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      printSettings.orientation === 'portrait'
                        ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Potret (Tegak)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {printSettings.paperSize === 'F4' ? 'HVS Folio kedinasan (215 × 330 mm) - Sangat cocok untuk tabel lebar.' : 'A4 Standar nasional (210 × 297 mm).'}
                </p>
              </div>

              {/* 2. Margin Halaman Cetak */}
              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                    Margin Halaman Cetak:
                  </label>
                  <span className="text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {printSettings.marginMm} mm
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'compact', label: 'Sempit', val: 8 },
                    { id: 'normal', label: 'Normal', val: 12 },
                    { id: 'spacious', label: 'Lapang', val: 18 }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updatePrintSettings({ marginPreset: m.id as any, marginMm: m.val })}
                      className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                        printSettings.marginMm === m.val
                          ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.label} ({m.val}mm)
                    </button>
                  ))}
                </div>

                {/* Slider Margin */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400">Slider:</span>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={printSettings.marginMm}
                    onChange={(e) => updatePrintSettings({ marginPreset: 'custom', marginMm: Number(e.target.value) })}
                    className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Margin "Sempit (8mm)" memberikan ruang maksimal agar tabel tidak terpotong.
                </p>
              </div>

              {/* 3. Kerapatan Tabel & Ukuran Font */}
              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Kerapatan &amp; Ukuran Teks:
                </label>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'super-compact', label: 'Super Mini (8pt)' },
                    { id: 'compact', label: 'Kompak (9pt)' },
                    { id: 'normal', label: 'Normal (10pt)' },
                    { id: 'spacious', label: 'Lapang (11pt)' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => updatePrintSettings({ tableDensity: d.id as any })}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                        printSettings.tableDensity === d.id
                          ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {/* Toggle Kolom Penerima */}
                <div className="pt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => updatePrintSettings({ onlyActiveRecipients: !printSettings.onlyActiveRecipients })}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                      printSettings.onlyActiveRecipients
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hanya Guru Penerima</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      {printSettings.onlyActiveRecipients ? 'Aktif' : 'Semua Guru'}
                    </span>
                  </button>
                  <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">
                    {printSettings.onlyActiveRecipients
                      ? `Menampilkan ${effectivePenerimaList.length} guru penerima jatah riil (tabel lebih ringkas).`
                      : `Menampilkan seluruh ${basePenerimaList.length} guru/personel sekolah.`}
                  </p>
                </div>
              </div>

              {/* 4. Spasi Tanda Tangan & Elemen Dokumen */}
              <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Tinggi Ruang TTD:
                  </label>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {printSettings.signatureHeightPx} px
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'compact', label: '50px', h: 50 },
                    { id: 'normal', label: '75px', h: 75 },
                    { id: 'wide', label: '100px', h: 100 }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => updatePrintSettings({ signatureHeightPx: s.h, signatureSpacing: s.id as any })}
                      className={`py-1.5 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                        printSettings.signatureHeightPx === s.h
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Slider TTD */}
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-400">Slider:</span>
                  <input
                    type="range"
                    min="40"
                    max="140"
                    step="5"
                    value={printSettings.signatureHeightPx}
                    onChange={(e) => updatePrintSettings({ signatureHeightPx: Number(e.target.value) })}
                    className="flex-1 accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Toggle Kop & Narasi */}
                <div className="pt-1.5 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updatePrintSettings({ showKop: !printSettings.showKop })}
                    className={`py-1 px-1.5 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      printSettings.showKop
                        ? 'bg-slate-100 text-slate-900 border-slate-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {printSettings.showKop ? <Eye className="w-3 h-3 text-slate-600" /> : <EyeOff className="w-3 h-3 text-rose-600" />}
                    <span>{printSettings.showKop ? 'Kop: Ada' : 'Kop: Tutup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updatePrintSettings({ showNarasi: !printSettings.showNarasi })}
                    className={`py-1 px-1.5 rounded-lg text-[10.5px] font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      printSettings.showNarasi
                        ? 'bg-slate-100 text-slate-900 border-slate-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {printSettings.showNarasi ? <Eye className="w-3 h-3 text-slate-600" /> : <EyeOff className="w-3 h-3 text-rose-600" />}
                    <span>{printSettings.showNarasi ? 'Catatan: Ada' : 'Catatan: Tutup'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Form Editor Pejabat & Tanggal Cetak (Collapsible) */}
            {showOfficialEditor && (
              <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Penyesuaian Data Pejabat Pengesahan &amp; Tanggal Opname (Langsung pada Printout):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Periode Laporan:</label>
                    <input
                      type="text"
                      value={docPeriode}
                      onChange={(e) => setDocPeriode(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                      placeholder="Contoh: FEBRUARI 2026"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tanggal Cetak / Opname:</label>
                    <input
                      type="text"
                      value={docTanggal}
                      onChange={(e) => setDocTanggal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                      placeholder="Contoh: 28 Februari 2026"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Pengurus Barang:</label>
                    <input
                      type="text"
                      value={docNamaPengurus}
                      onChange={(e) => setDocNamaPengurus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">NIP Pengurus Barang:</label>
                    <input
                      type="text"
                      value={docNipPengurus}
                      onChange={(e) => setDocNipPengurus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Bendahara BOSP:</label>
                    <input
                      type="text"
                      value={docNamaBendahara}
                      onChange={(e) => setDocNamaBendahara(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">NIP Bendahara BOSP:</label>
                    <input
                      type="text"
                      value={docNipBendahara}
                      onChange={(e) => setDocNipBendahara(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Kepala Sekolah:</label>
                    <input
                      type="text"
                      value={docNamaKepsek}
                      onChange={(e) => setDocNamaKepsek(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">NIP Kepala Sekolah:</label>
                    <input
                      type="text"
                      value={docNipKepsek}
                      onChange={(e) => setDocNipKepsek(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBMENU FILTER KATEGORI UNTUK OUTPUT CETAK & PDF */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Kategori Dokumen Opname:</span>
          </div>

          {/* Submenu Tabs Pill */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterKategori('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterKategori === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>Semua Persediaan</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterKategori('ATK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterKategori === 'ATK'
                  ? 'bg-white text-teal-900 shadow-xs border border-teal-300'
                  : 'text-slate-600 hover:text-teal-900 hover:bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>Khusus ATK</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-100 text-teal-800 font-mono">
                {countAtk}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterKategori('ALKEB')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterKategori === 'ALKEB'
                  ? 'bg-white text-cyan-900 shadow-xs border border-cyan-300'
                  : 'text-slate-600 hover:text-cyan-900 hover:bg-white/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Khusus Alat Kebersihan</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-mono">
                {countAlkeb}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet (Landscape/Portrait Dinamis) */}
      <div
        style={{
          padding: `${marginMm * 1.1}mm`,
          maxWidth: printSettings.orientation === 'portrait' ? '215mm' : '100%'
        }}
        className="a4-print-sheet bg-white border border-slate-300 rounded-2xl shadow-sm print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 mx-auto font-sans text-black leading-relaxed overflow-x-auto print:max-w-none print:w-full transition-all"
      >
        {/* Kop Resmi Sekolah (Bisa Ditampilkan / Disembunyikan) */}
        {printSettings.showKop && (
          <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-4" />
        )}

        {/* Title & Metadata Periode */}
        <div className="text-center space-y-1 mb-4">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider underline text-slate-950">
            BUKU REKAPITULASI STOCK OPNAME BARANG PERSEDIAAN
          </h3>
          <p className="text-[11px] font-bold text-slate-700 uppercase">
            SUMBER DANA: BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) &bull; PERIODE {docPeriode}
          </p>
          <p className="text-[10px] font-bold text-indigo-900 uppercase">
            {getSubTitleText()}
          </p>
        </div>

        {/* Opname Matrix Table dengan Kepadatan Dinamis */}
        <table className={`opname-table w-full border-collapse border border-slate-900 ${densityStyles.tableText}`}>
          <thead className="bg-slate-100 font-bold text-slate-900 border-b border-slate-900">
            <tr>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.noWidth}`}>
                No
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.dateWidth}`}>
                Tanggal Belanja
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.codeWidth}`}>
                Kode Kegiatan
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-left ${densityStyles.descWidth}`}>
                Uraian Barang Persediaan
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.numWidth}`}>
                Sisa Bulan Lalu
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.numWidth}`}>
                Belanja Masuk
              </th>
              <th colSpan={effectivePenerimaList.length} className={`border border-slate-900 ${densityStyles.cellPadding} text-center bg-slate-200`}>
                Distribusi Pemakaian Barang ke Personel / Guru / Staf
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.numWidth} bg-amber-50`}>
                Total Keluar
              </th>
              <th rowSpan={2} className={`border border-slate-900 ${densityStyles.cellPadding} text-center ${densityStyles.numWidth} bg-emerald-50`}>
                Sisa Akhir Stok
              </th>
            </tr>
            <tr>
              {effectivePenerimaList.map((p) => (
                <th key={p.id} className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-normal ${densityStyles.teacherWidth}`}>
                  <div className={`font-bold text-slate-900 truncate ${densityStyles.headerText}`} title={p.jabatan}>
                    {p.jabatan.replace('Guru Kelas ', 'Kls ').replace('Petugas ', '').replace('Operator ', 'Ops ')}
                  </div>
                  <div className={`text-slate-500 truncate ${densityStyles.headerSubText}`} title={p.nama}>
                    {p.nama.split(',')[0].split(' ')[0]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBarangList.length > 0 ? (
              filteredBarangList.map((item, idx) => {
                const totalMasuk = item.totalVolume;
                const sisaLalu = item.sisaLalu || 0;
                let totalKeluar = 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono`}>
                      {idx + 1}
                    </td>
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono`}>
                      {item.tanggalBelanja || '06-02-2026'}
                    </td>
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono text-slate-700`}>
                      {item.kodeKegiatan || '06.05.08.'}
                    </td>
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} font-medium text-slate-900`}>
                      {item.namaBarang}
                      <span className="text-[85%] text-slate-500 ml-1">({item.satuan})</span>
                    </td>
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono text-slate-600`}>
                      {sisaLalu}
                    </td>
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono font-bold text-indigo-900`}>
                      {totalMasuk}
                    </td>

                    {/* Alokasi per Guru / Personel */}
                    {effectivePenerimaList.map((p) => {
                      const alloc = item.alokasi.find((a) => a.personId === p.id || a.personName === p.nama);
                      const qty = alloc ? alloc.qty : 0;
                      totalKeluar += qty;

                      return (
                        <td
                          key={p.id}
                          className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono ${
                            qty > 0 ? 'font-bold text-slate-900 bg-blue-50/30' : 'text-slate-300'
                          }`}
                        >
                          {qty > 0 ? qty : '-'}
                        </td>
                      );
                    })}

                    {/* Total Keluar */}
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono font-bold text-amber-900 bg-amber-50/40`}>
                      {totalKeluar}
                    </td>

                    {/* Sisa Akhir */}
                    <td className={`border border-slate-900 ${densityStyles.cellPadding} text-center font-mono font-bold text-emerald-900 bg-emerald-50/40`}>
                      {(sisaLalu + totalMasuk) - totalKeluar}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={effectivePenerimaList.length + 8} className="border border-slate-900 p-4 text-center text-slate-500 italic">
                  Tidak ada barang persediaan untuk kategori {filterKategori === 'ATK' ? 'Alat Tulis Kantor (ATK)' : filterKategori === 'ALKEB' ? 'Alat Kebersihan (ALKEB)' : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Narasi Opname Fisik Gudang (Bisa Ditampilkan / Disembunyikan) */}
        {printSettings.showNarasi && (
          <div className="mt-3 border border-slate-300 p-2 rounded-lg text-[9.5px] print:text-[8pt] text-slate-700 bg-slate-50/50 print:bg-transparent print:border-none print:p-0">
            <p className="italic">
              {getNarasiOpname()}
            </p>
          </div>
        )}

        {/* Tanda Tangan 3 Pihak Opname dengan Spasi Tinggi Dinamis */}
        <div className="opname-signatures pt-6 text-xs font-sans">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-slate-600 font-medium text-[11px] print:text-[9pt]">
                  Pengurus Barang / Pengelola Persediaan,
                </p>
              </div>
              <div
                style={{ height: `${printSettings.signatureHeightPx}px` }}
                className="opname-signature-space flex items-center justify-center"
              />
              <div>
                <p className="font-bold text-slate-950 underline text-[11px] print:text-[9.5pt]">
                  {docNamaPengurus}
                </p>
                <p className="text-[10px] print:text-[8pt] text-slate-700 font-mono">
                  NIP. {docNipPengurus}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <p className="text-slate-600 font-medium text-[11px] print:text-[9pt]">Lunas Dibayar,</p>
                <p className="font-bold text-slate-900 text-[11px] print:text-[9pt]">Bendahara BOSP</p>
              </div>
              <div
                style={{ height: `${printSettings.signatureHeightPx}px` }}
                className="opname-signature-space flex items-center justify-center"
              />
              <div>
                <p className="font-bold text-slate-950 underline text-[11px] print:text-[9.5pt]">
                  {docNamaBendahara}
                </p>
                <p className="text-[10px] print:text-[8pt] text-slate-700 font-mono">
                  NIP. {docNipBendahara}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <p className="text-slate-600 font-medium text-[11px] print:text-[9pt]">
                  {metadata.desaKecamatan || 'Bogor'}, {docTanggal}
                </p>
                <p className="font-bold text-slate-900 text-[11px] print:text-[9pt]">
                  Kepala Satuan Pendidikan
                </p>
              </div>
              <div
                style={{ height: `${printSettings.signatureHeightPx}px` }}
                className="opname-signature-space flex items-center justify-center"
              />
              <div>
                <p className="font-bold text-slate-950 underline text-[11px] print:text-[9.5pt]">
                  {docNamaKepsek}
                </p>
                <p className="text-[10px] print:text-[8pt] text-slate-700 font-mono">
                  NIP. {docNipKepsek}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
