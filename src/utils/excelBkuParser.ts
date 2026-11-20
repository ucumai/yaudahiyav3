import * as XLSX from 'xlsx';
import { TransaksiBKU, RincianBarang, RKASItem, SchoolMetadata, MonthlyArchive } from '../types';
import { findMatchInRKAS, rkasFebruaryCatalog } from './rkasCatalog';
import { parseIDRNumber } from './documentParser';
import { MONTH_NAMES_ID } from './monthArchiveUtils';
import { detectDefaultKlasifikasiSPJ } from './klasifikasiSpjHelper';
import { CrossMonthMatchEngine, buildCumulativeRKASPool } from './crossMonthSmartMatch';

export interface ParsedExcelBKUResult {
  transactions: TransaksiBKU[];
  metadata: Partial<SchoolMetadata>;
  monthIndex: number; // 1 - 12
  monthYearString: string;
  totalPemasukan: number;
  totalPengeluaran: number;
}

/**
 * Converts Excel Serial Date number (e.g., 45446) or date string to DD-MM-YYYY and month/year info
 */
export function formatExcelDate(val: any): {
  formattedDate: string;
  monthIndex: number;
  year: number;
} {
  const defaultRes = {
    formattedDate: '01-06-2024',
    monthIndex: 6,
    year: 2024
  };

  if (val === null || val === undefined || val === '') {
    return defaultRes;
  }

  // If number (Excel Serial Date e.g. 45444 = 01/06/2024, 45446 = 03/06/2024)
  if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 20000 && Number(val) < 80000)) {
    const serial = typeof val === 'number' ? val : Number(val);
    // Excel epoch: 1899-12-30 due to 1900 leap year bug
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const targetDate = new Date(excelEpoch.getTime() + serial * 86400000);
    
    const d = String(targetDate.getUTCDate()).padStart(2, '0');
    const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const y = targetDate.getUTCFullYear();
    const monthIdx = targetDate.getUTCMonth() + 1;

    return {
      formattedDate: `${d}-${m}-${y}`,
      monthIndex: monthIdx,
      year: y
    };
  }

  // If already Date object
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return {
      formattedDate: `${d}-${m}-${y}`,
      monthIndex: val.getMonth() + 1,
      year: y
    };
  }

  // If String
  const str = String(val).trim();
  const dmyMatch = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = parseInt(dmyMatch[3], 10);
    const monthIdx = parseInt(m, 10);
    return {
      formattedDate: `${d}-${m}-${y}`,
      monthIndex: monthIdx >= 1 && monthIdx <= 12 ? monthIdx : 6,
      year: y
    };
  }

  const ymdMatch = str.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    const monthIdx = parseInt(m, 10);
    return {
      formattedDate: `${d}-${m}-${y}`,
      monthIndex: monthIdx >= 1 && monthIdx <= 12 ? monthIdx : 6,
      year: y
    };
  }

  return defaultRes;
}

/**
 * Clean multi-line Kode Rekening into standard single line.
 * Rule: "5.1.02.01.01.\n00\n26" -> "5.1.02.01.01.0026"
 * Rule: "5.1.02.03.02.\n01\n20" -> "5.1.02.03.02.0120"
 * Rule: "5.1.02.03.02.0" + "120" -> "5.1.02.03.02.0120"
 */
export function cleanKodeRekening(rawVal: any): string {
  if (!rawVal) return '-';
  const str = String(rawVal);
  
  // Remove all newlines, carriage returns, and tabs
  const noNewLines = str.replace(/[\r\n\t\s]+/g, '');
  
  // Clean dots
  let cleaned = noNewLines.replace(/\.+/g, '.').trim();

  // If starts with 5.
  const idx5 = cleaned.indexOf('5.');
  if (idx5 !== -1) {
    cleaned = cleaned.slice(idx5);
  }

  // If it ends with a dot, strip it
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned || '-';
}

/**
 * Clean Kode Kegiatan into standard format (e.g. 08.04.06. or 06.05.08)
 */
export function cleanKodeKegiatan(rawVal: any): string | undefined {
  if (!rawVal) return undefined;
  const cleaned = String(rawVal).replace(/[\r\n\t\s]+/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '0') return undefined;
  return cleaned;
}

/**
 * Parses an Excel WorkBook (.xlsx / .xls) specifically according to user rules:
 * Rule 1: Only extract rows where NO. BUKTI contains 'BNU' (case-insensitive). Skip empty or non-BNU rows.
 * Rule 2: Clean Kode Rekening multi-line into 1 line (e.g. "5.1.02.01.01.\n00\n26" -> "5.1.02.01.01.0026").
 * Rule 3: Extract Uraian column.
 * Rule 4: Extract Pengeluaran column (after Penerimaan column).
 */
export function parseBKUExcelWorkbook(
  workbook: XLSX.WorkBook,
  rkasCatalog: RKASItem[] = rkasFebruaryCatalog,
  options?: {
    targetMonthIndex?: number;
    monthlyArchives?: Record<number, MonthlyArchive | null>;
  }
): ParsedExcelBKUResult {
  // Use first sheet or search for sheet named BKU
  let targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  for (const sName of workbook.SheetNames) {
    if (/bku|kas\s*umum|transaksi/i.test(sName)) {
      targetSheet = workbook.Sheets[sName];
      break;
    }
  }

  // Convert worksheet to raw 2D array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(targetSheet, {
    header: 1,
    defval: '',
    raw: true
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      transactions: [],
      metadata: {},
      monthIndex: 2,
      monthYearString: 'Februari 2026',
      totalPemasukan: 0,
      totalPengeluaran: 0
    };
  }

  // 1. Detect header row by looking for key headers: NO. BUKTI, TANGGAL, URAIAN, PENGELUARAN
  let headerRowIndex = -1;
  let colTanggal = 0;
  let colKodeKegiatan = 1;
  let colKodeRekening = 2;
  let colNoBukti = 3;
  let colUraian = 4;
  let colPenerimaan = 5;
  let colPengeluaran = 6;
  let colSaldo = 7;

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    const rowText = row.map((c) => String(c).toUpperCase()).join(' ');

    if (rowText.includes('BUKTI') || (rowText.includes('URAIAN') && rowText.includes('PENGELUARAN'))) {
      headerRowIndex = r;

      // Identify exact column indices
      row.forEach((cellVal, cIdx) => {
        const hText = String(cellVal).toUpperCase().replace(/[\r\n\s]+/g, ' ').trim();
        if (hText.includes('TANGGAL') || hText === 'TGL') {
          colTanggal = cIdx;
        } else if (hText.includes('KEGIATAN') || hText.includes('KODE KEG')) {
          colKodeKegiatan = cIdx;
        } else if (hText.includes('REKENING') || hText.includes('KODE REK')) {
          colKodeRekening = cIdx;
        } else if (hText.includes('BUKTI') || hText.includes('NO. BUKTI') || hText.includes('BNU')) {
          colNoBukti = cIdx;
        } else if (hText.includes('URAIAN') || hText.includes('KETERANGAN')) {
          colUraian = cIdx;
        } else if (hText.includes('PENERIMAAN') || hText.includes('DEBET') || hText.includes('MASUK')) {
          colPenerimaan = cIdx;
        } else if (hText.includes('PENGELUARAN') || hText.includes('KREDIT') || hText.includes('KELUAR')) {
          colPengeluaran = cIdx;
        } else if (hText.includes('SALDO')) {
          colSaldo = cIdx;
        }
      });
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;

  // 2. Scan metadata from top headers (School Name, Month, NPSN)
  let detectedMonthIndex = 0;
  let detectedYear = 2024;
  const extractedMeta: Partial<SchoolMetadata> = {};

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const rowStr = rawRows[r].map((c) => String(c)).join(' ');
    // Check for month names (Januari, Februari, Maret, Mei, Juni, Juli, etc.)
    MONTH_NAMES_ID.forEach((mName, idx) => {
      if (new RegExp(`\\b${mName}\\b`, 'i').test(rowStr)) {
        detectedMonthIndex = idx + 1;
      }
    });
    const yrMatch = rowStr.match(/\b(202[4-9])\b/);
    if (yrMatch) {
      detectedYear = parseInt(yrMatch[1], 10);
    }
  }

  // 3. Process data rows with user's rules
  interface RawExtractedItem {
    tanggal: string;
    dateMonthIdx: number;
    dateYear: number;
    kodeKegiatan?: string;
    kodeRekening: string;
    noBukti: string;
    uraian: string;
    penerimaan: number;
    pengeluaran: number;
  }

  const rawExtractedItems: RawExtractedItem[] = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Check if row is purely numbers 1 2 3 4 5 6 7 8 (column index row)
    const combinedRowStr = row.map((c) => String(c).trim()).join('');
    if (/^[1-8]+$/.test(combinedRowStr)) continue;

    // RULE 1: Extract any row with valid transactions, whether No. Bukti has BNU, KWT, BPU, number, or is empty
    const noBuktiRaw = row[colNoBukti];
    const noBuktiStr = String(noBuktiRaw || '').trim();

    // Check if row is a summary / header / total row or page footer
    const uraianRaw = row[colUraian];
    const uraian = String(uraianRaw || '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!uraian) continue;

    // Skip summary / balance / total rows
    if (/^(jumlah|total|saldo\s*awal|saldo\s*akhir|sisa\s*kas|penutupan\s*kas|buku\s*kas\s*umum|halaman)\b/i.test(uraian)) {
      continue;
    }
    // Skip tax transfer lines (terima/setor PPN/PPh)
    if (/terima\s*ppn|setor\s*ppn|terima\s*pph|setor\s*pph|pajak\s*bunga/i.test(uraian)) {
      continue;
    }

    // Extract amounts
    const pengeluaranRaw = row[colPengeluaran];
    const penerimaanRaw = row[colPenerimaan];
    const pengeluaran = parseIDRNumber(pengeluaranRaw);
    const penerimaan = parseIDRNumber(penerimaanRaw);

    // If both pengeluaran and penerimaan are 0 or empty, skip non-transaction row
    if (pengeluaran <= 0 && penerimaan <= 0) {
      continue;
    }

    // Standardize or assign clean No Bukti
    let standardizedNoBukti = noBuktiStr;
    if (!standardizedNoBukti || standardizedNoBukti === '-' || standardizedNoBukti === '0') {
      standardizedNoBukti = `BKU-${r + 1}`;
    } else {
      const bnuMatch = standardizedNoBukti.match(/\b([A-Z]{2,4}\s*[-/]?\s*\d+)/i);
      if (bnuMatch) {
        standardizedNoBukti = bnuMatch[1].replace(/\s+/g, '').toUpperCase();
      }
    }

    // RULE 2: KODE Rekening may have nextlines or be split across columns before colNoBukti
    let kodeRekeningRaw = row[colKodeRekening];
    if (colNoBukti > colKodeRekening + 1) {
      const parts: string[] = [];
      for (let c = colKodeRekening; c < colNoBukti; c++) {
        const v = String(row[c] || '').trim();
        if (v) parts.push(v);
      }
      kodeRekeningRaw = parts.join('.');
    }
    const kodeRekening = cleanKodeRekening(kodeRekeningRaw);

    // Extract Date
    const tanggalRaw = row[colTanggal];
    const dateInfo = formatExcelDate(tanggalRaw);

    // Extract Kode Kegiatan
    const kodeKegiatanRaw = row[colKodeKegiatan];
    const kodeKegiatan = cleanKodeKegiatan(kodeKegiatanRaw);

    rawExtractedItems.push({
      tanggal: dateInfo.formattedDate,
      dateMonthIdx: dateInfo.monthIndex,
      dateYear: dateInfo.year,
      kodeKegiatan,
      kodeRekening,
      noBukti: standardizedNoBukti,
      uraian,
      penerimaan,
      pengeluaran
    });
  }

  // Determine Month and Year from the majority of BNU transactions
  if (rawExtractedItems.length > 0) {
    const monthCounts: Record<number, number> = {};
    const yearCounts: Record<number, number> = {};

    for (const it of rawExtractedItems) {
      if (it.dateMonthIdx >= 1 && it.dateMonthIdx <= 12) {
        monthCounts[it.dateMonthIdx] = (monthCounts[it.dateMonthIdx] || 0) + 1;
      }
      if (it.dateYear >= 2020) {
        yearCounts[it.dateYear] = (yearCounts[it.dateYear] || 0) + 1;
      }
    }

    let bestMonth = 6;
    let maxMonthCount = 0;
    for (const [m, count] of Object.entries(monthCounts)) {
      if (count > maxMonthCount) {
        maxMonthCount = count;
        bestMonth = parseInt(m, 10);
      }
    }

    let bestYear = 2024;
    let maxYearCount = 0;
    for (const [y, count] of Object.entries(yearCounts)) {
      if (count > maxYearCount) {
        maxYearCount = count;
        bestYear = parseInt(y, 10);
      }
    }

    detectedMonthIndex = bestMonth;
    detectedYear = bestYear;
  } else if (detectedMonthIndex === 0) {
    detectedMonthIndex = 6; // Default Juni
  }

  const finalMonthName = MONTH_NAMES_ID[detectedMonthIndex - 1] || 'Juni';
  const monthYearString = `${finalMonthName} ${detectedYear}`;
  extractedMeta.bulanTahun = monthYearString;

  // 4. Group items by NO. BUKTI (BNU) into Parent-Child structure
  const groupedResult: TransaksiBKU[] = [];
  const bnuMap = new Map<string, TransaksiBKU>();

  let totalPengeluaranAcc = 0;
  let totalPemasukanAcc = 0;

  console.group('%c📊 [EXTRACT DOKUMEN BKU & RKAS] PROSES EKSTRAKSI DATA', 'background: #0284c7; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log('📌 Total Baris Terbaca di Sheet Excel:', rawRows.length);
  console.log('📌 Header Terdeteksi:', {
    colTanggal,
    colKodeKegiatan,
    colKodeRekening,
    colNoBukti,
    colUraian,
    colPenerimaan,
    colPengeluaran,
    colSaldo
  });
  console.log('📌 Total Baris BNU Ditemukan:', rawExtractedItems.length);
  console.log('📌 Katalog RKAS yang Digunakan (Total Item):', rkasCatalog.length);
  console.table(rawExtractedItems.map((r, i) => ({
    '#': i + 1,
    'No BKU': r.noBukti,
    'Tgl': r.tanggal,
    'Kode Rekening': r.kodeRekening,
    'Uraian': r.uraian,
    'Pengeluaran (Rp)': r.pengeluaran,
    'Penerimaan (Rp)': r.penerimaan,
  })));

  // Inisialisasi Mesin Pencocokan Lintas Bulan (Cross-Month Smart Match Engine)
  const finalMonthIdx = options?.targetMonthIndex || detectedMonthIndex || 2;
  const masterCumulativePool = buildCumulativeRKASPool(rkasCatalog, options?.monthlyArchives, undefined, finalMonthIdx);
  const matchEngine = new CrossMonthMatchEngine(masterCumulativePool, finalMonthIdx);

  console.log('📌 Mesin Pencocokan Lintas Bulan Diaktifkan:', {
    targetMonth: finalMonthIdx,
    masterPoolSize: masterCumulativePool.length,
    rawItems: rawExtractedItems.length
  });

  for (const item of rawExtractedItems) {
    totalPengeluaranAcc += item.pengeluaran;
    totalPemasukanAcc += item.penerimaan;

    const isPemasukan = item.penerimaan > 0 && item.pengeluaran === 0;

    let rincian: RincianBarang;
    let isCrossMonth = false;
    let sourceMonthName: string | undefined = undefined;

    if (isPemasukan) {
      rincian = {
        kode_rekening: item.kodeRekening && item.kodeRekening !== '-' ? item.kodeRekening : '4.1.01.01.01.0001',
        uraian_barang: item.uraian,
        volume: 1,
        satuan: 'transaksi',
        harga_satuan: item.penerimaan,
        jumlah_transaksi: item.penerimaan,
        kode_kegiatan: item.kodeKegiatan,
      };
    } else {
      // Cross-match cerdas lintas bulan dengan pelacakan sisa kuota (FIFO Carry-Over)
      const smartMatch = matchEngine.matchTransactionItem({
        kodeRekening: item.kodeRekening,
        uraian: item.uraian,
        nominal: item.pengeluaran,
        targetMonthIndex: finalMonthIdx,
        noBukti: item.noBukti
      });

      isCrossMonth = smartMatch.isCrossMonth;
      sourceMonthName = smartMatch.sourceMonthName;

      const finalKodeRek = smartMatch.kodeRekening ||
        (item.kodeRekening !== '-' && item.kodeRekening.length > 5 ? item.kodeRekening : '5.1.02.03.02.0120');

      rincian = {
        kode_rekening: finalKodeRek,
        uraian_barang: item.uraian,
        volume: smartMatch.volume,
        satuan: smartMatch.satuan,
        harga_satuan: smartMatch.hargaSatuan,
        jumlah_transaksi: item.pengeluaran,
        kode_kegiatan: item.kodeKegiatan || smartMatch.kodeKegiatan,
        is_cross_month: smartMatch.isCrossMonth,
        rkas_source_month: smartMatch.sourceMonthName,
        rkas_source_month_index: smartMatch.sourceMonthIndex,
        rkas_matched_uraian: smartMatch.matchedItem?.uraian,
        match_note: smartMatch.matchNote
      };

      console.log(`🔍 [CROSS-MONTH MATCHING] Uraian: "${item.uraian}" | No BKU: ${item.noBukti}`, {
        'BKU Kode Rek': item.kodeRekening,
        'BKU Nominal': item.pengeluaran,
        'Hasil Match': smartMatch.matchedItem ? `${smartMatch.matchedItem.uraian} (${smartMatch.volume} ${smartMatch.satuan})` : 'TIDAK COCOK',
        'Lintas Bulan?': smartMatch.isCrossMonth,
        'Asal RKAS Bulan': smartMatch.sourceMonthName,
        'Tier': smartMatch.matchTier,
        'Catatan': smartMatch.matchNote || '-'
      });
    }

    const existingParent = bnuMap.get(item.noBukti);
    if (existingParent) {
      if (isPemasukan) {
        existingParent.total_pemasukan_bku += item.penerimaan;
      } else {
        existingParent.total_pengeluaran_bku += item.pengeluaran;
      }
      existingParent.rincian_barang.push(rincian);
      if (isCrossMonth) {
        existingParent.has_cross_month = true;
        existingParent.cross_month_source = sourceMonthName;
      }
    } else {
      const autoKlasifikasi = detectDefaultKlasifikasiSPJ(
        item.uraian,
        '',
        item.kodeRekening,
        item.kodeKegiatan
      );
      const newParent: TransaksiBKU = {
        tanggal: item.tanggal,
        no_bku: item.noBukti,
        tipe_transaksi: isPemasukan ? 'Pemasukan' : 'Pengeluaran',
        total_pemasukan_bku: isPemasukan ? item.penerimaan : 0,
        total_pengeluaran_bku: isPemasukan ? 0 : item.pengeluaran,
        rincian_barang: [rincian],
        keterangan: item.uraian,
        kode_kegiatan: item.kodeKegiatan,
        klasifikasi: autoKlasifikasi,
        has_cross_month: isCrossMonth,
        cross_month_source: sourceMonthName
      };
      bnuMap.set(item.noBukti, newParent);
      groupedResult.push(newParent);
    }
  }

  console.log('✅ HASIL AKHIR TRANSAKSI (SIAP DITAMPILKAN DI TABEL):', groupedResult);
  console.groupEnd();

  return {
    transactions: groupedResult,
    metadata: extractedMeta,
    monthIndex: detectedMonthIndex,
    monthYearString,
    totalPemasukan: totalPemasukanAcc,
    totalPengeluaran: totalPengeluaranAcc
  };
}

/**
 * Advanced parser untuk file Excel RKAS / Kertas Kerja Belanja Sekolah
 * Menggunakan "Dynamic Header Detection" (Ide 1) untuk mendeteksi posisi kolom
 * secara otomatis (Uraian, Volume, Satuan, Tarif Satuan, Jumlah) terlepas dari
 * berbagai variasi format convert PDF-ke-Excel (format 8 kolom, 14 kolom, 16 kolom,
 * pergeseran Kolom I vs Kolom J, dll).
 */
export function parseRKASExcelWorkbook(workbook: XLSX.WorkBook, defaultMonthIndex: number = 2): RKASItem[] {
  let targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  for (const sName of workbook.SheetNames) {
    if (/rkas|kertas\s*kerja|anggaran/i.test(sName)) {
      targetSheet = workbook.Sheets[sName];
      break;
    }
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(targetSheet, {
    header: 1,
    defval: '',
    raw: true
  });

  if (!rawRows || rawRows.length === 0) return [];

  // Kamus satuan resmi barang & jasa sekolah
  const UNIT_REGEX = /^(buah|botol|pcs|rim|dus|bendel|kotak|pack|galon|meter|unit|orang|orang\s*\/\s*hari|kwh|transaksi|paket|buah\/pcs|bulan|per\s*bulan|keping|lembar|pail|lusin|box|rol|roll|set|pasang|buku|tabung|koli|kg|gram|liter|tube|batang|sachet|kaleng)$/i;

  // -------------------------------------------------------------------------
  // LANGKAH 1: DYNAMIC HEADER DETECTION (IDE 1)
  // Scan baris-baris awal (baris 0 - 45) untuk mendeteksi indeks kolom dinamis
  // -------------------------------------------------------------------------
  const colMap = {
    colNoUrut: -1,
    colKodeRek: -1,
    colKodeProg: -1,
    colUraian: -1,
    colVolume: -1,
    colSatuan: -1,
    colTarif: -1,
    colJumlah: -1,
    colBulan: -1,
    isDetected: false
  };

  const headerRowIndices = new Set<number>();

  for (let r = 0; r < Math.min(rawRows.length, 45); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let rowHasUraian = false;
    let rowHasVolOrSat = false;
    let rowHasTarifOrJumlah = false;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      const cellLower = cellVal.toLowerCase();
      if (!cellVal) continue;

      // 1. Kolom Uraian
      if (/^uraian(\s*barang|\s*kegiatan)?$/i.test(cellLower) || (/uraian/i.test(cellLower) && !cellLower.includes('kode'))) {
        rowHasUraian = true;
        if (colMap.colUraian === -1) colMap.colUraian = c;
      }
      // 2. Kolom Volume
      if (/^(volume|vol|qty|koefisien|kuantitas)$/i.test(cellLower) || (cellLower.includes('volume') && !cellLower.includes('perhitungan'))) {
        rowHasVolOrSat = true;
        if (colMap.colVolume === -1) colMap.colVolume = c;
      }
      // 3. Kolom Satuan
      if (/^satuan$/i.test(cellLower) || (cellLower.includes('satuan') && !cellLower.includes('harga') && !cellLower.includes('perhitungan'))) {
        rowHasVolOrSat = true;
        if (colMap.colSatuan === -1) colMap.colSatuan = c;
      }
      // 4. Kolom Tarif Satuan
      if (/^(tarif|tarif\s*harga|harga\s*satuan|tarif\s*satuan)$/i.test(cellLower) || (cellLower.includes('tarif') && !cellLower.includes('pajak'))) {
        rowHasTarifOrJumlah = true;
        if (colMap.colTarif === -1) colMap.colTarif = c;
      }
      // 5. Kolom Jumlah / Total
      if (/^(jumlah|total|pagu)$/i.test(cellLower) || (cellLower.includes('jumlah') && !cellLower.includes('perhitungan') && !cellLower.includes('penerimaan'))) {
        rowHasTarifOrJumlah = true;
        if (colMap.colJumlah === -1 || c > colMap.colJumlah) colMap.colJumlah = c;
      }
      // 6. Kolom Kode Rekening & Program
      if (/kode\s*rek/i.test(cellLower) && colMap.colKodeRek === -1) {
        colMap.colKodeRek = c;
      }
      if (/kode\s*prog/i.test(cellLower) && colMap.colKodeProg === -1) {
        colMap.colKodeProg = c;
      }
      if (/no(\.|\s*urut)?$/i.test(cellLower) && colMap.colNoUrut === -1) {
        colMap.colNoUrut = c;
      }
    }

    if ((rowHasUraian && (rowHasVolOrSat || rowHasTarifOrJumlah)) || (rowHasVolOrSat && rowHasTarifOrJumlah)) {
      headerRowIndices.add(r);
      // Cek baris berikutnya jika header di-merge 2 baris (misal: "Rincian Perhitungan" -> "Volume | Satuan")
      const nextRow = rawRows[r + 1];
      if (Array.isArray(nextRow)) {
        for (let nc = 0; nc < nextRow.length; nc++) {
          const nVal = String(nextRow[nc] || '').trim().toLowerCase();
          if (/^(volume|vol|qty|koefisien)$/i.test(nVal) && colMap.colVolume === -1) {
            colMap.colVolume = nc;
            headerRowIndices.add(r + 1);
          }
          if (/^satuan$/i.test(nVal) && colMap.colSatuan === -1) {
            colMap.colSatuan = nc;
            headerRowIndices.add(r + 1);
          }
          if (/(tarif|harga\s*satuan|tarif\s*harga)/i.test(nVal) && colMap.colTarif === -1) {
            colMap.colTarif = nc;
            headerRowIndices.add(r + 1);
          }
        }
      }
    }
  }

  // Tandai seluruh baris header yang berulang di tengah sheet
  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    const rowJoined = row.map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      (rowJoined.includes('uraian') && rowJoined.includes('volume')) ||
      (rowJoined.includes('kode rekening') && rowJoined.includes('kode program')) ||
      (rowJoined.includes('rincian perhitungan') && rowJoined.includes('satuan'))
    ) {
      headerRowIndices.add(r);
    }
  }

  if (colMap.colUraian !== -1 && (colMap.colVolume !== -1 || colMap.colSatuan !== -1 || colMap.colTarif !== -1)) {
    colMap.isDetected = true;
  }

  console.log('🔍 [RKAS Header Detection]', {
    isDetected: colMap.isDetected,
    colUraian: colMap.colUraian,
    colVolume: colMap.colVolume,
    colSatuan: colMap.colSatuan,
    colTarif: colMap.colTarif,
    colJumlah: colMap.colJumlah,
    headerRows: Array.from(headerRowIndices)
  });

  // -------------------------------------------------------------------------
  // LANGKAH 2: EKSTRAKSI BARIS DATA
  // -------------------------------------------------------------------------
  const items: RKASItem[] = [];
  let lastActiveKodeRek = '5.1.02.03.02.0120';
  let lastActiveKodeProg = '';
  let activeMonthName = MONTH_NAMES_ID[defaultMonthIndex - 1] || 'Februari';
  let activeMonthIndex = defaultMonthIndex;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    if (headerRowIndices.has(r)) continue;

    const rowText = row.map((c) => String(c || '').trim()).join(' ');
    // Lewati baris judul atas / rekapitulasi penerimaan
    if (/TOTAL\s*PENERIMAAN|SUMBER\s*DANA|RINCIAN\s*KERTAS\s*KERJA|TAHUN\s*ANGGARAN|NPSN\s*:/i.test(rowText)) {
      continue;
    }

    // Deteksi pergantian section bulan (misal "Bulan Januari", "Bulan Februari", dll)
    for (let m = 0; m < MONTH_NAMES_ID.length; m++) {
      const mName = MONTH_NAMES_ID[m].toLowerCase();
      if (new RegExp(`\\b(bulan\\s*)?${mName}\\b`, 'i').test(rowText) && (row.length <= 4 || rowText.length < 35)) {
        activeMonthName = MONTH_NAMES_ID[m];
        activeMonthIndex = m + 1;
        break;
      }
    }
    if (colMap.colBulan !== -1 && row[colMap.colBulan]) {
      const valBulan = String(row[colMap.colBulan]).toLowerCase();
      for (let m = 0; m < MONTH_NAMES_ID.length; m++) {
        if (valBulan.includes(MONTH_NAMES_ID[m].toLowerCase())) {
          activeMonthName = MONTH_NAMES_ID[m];
          activeMonthIndex = m + 1;
          break;
        }
      }
    }

    // 1. Ekstraksi Kode Rekening
    let foundKodeRek = '';
    if (colMap.colKodeRek !== -1 && row[colMap.colKodeRek]) {
      const clean = cleanKodeRekening(String(row[colMap.colKodeRek]));
      if (/5(?:\.\d+)+/.test(clean)) foundKodeRek = clean;
    }
    if (!foundKodeRek) {
      for (let c = 0; c <= Math.min(row.length - 1, 5); c++) {
        const val = String(row[c] || '').trim();
        const clean = cleanKodeRekening(val);
        if (clean && clean !== '-' && /5(?:\.\d+)+/.test(clean)) {
          foundKodeRek = clean;
          break;
        }
      }
    }
    // Fallback: gabungan kolom 1, 2, 3 jika dipisah
    if (!foundKodeRek) {
      const parts: string[] = [];
      for (let c = 1; c <= 3; c++) {
        const v = String(row[c] || '').trim();
        if (v) parts.push(v);
      }
      const comb = cleanKodeRekening(parts.join('.'));
      if (comb && /5(?:\.\d+)+/.test(comb)) foundKodeRek = comb;
    }
    if (foundKodeRek) {
      lastActiveKodeRek = foundKodeRek;
    }

    // 2. Ekstraksi Kode Program
    if (colMap.colKodeProg !== -1 && row[colMap.colKodeProg]) {
      const p = String(row[colMap.colKodeProg]).trim();
      if (/^\d{2}/.test(p)) lastActiveKodeProg = p;
    } else {
      for (let c = 1; c <= Math.min(row.length - 1, 8); c++) {
        const p = String(row[c] || '').trim();
        if (/^\d{2}\.\s*\d{2}/.test(p)) {
          lastActiveKodeProg = p;
          break;
        }
      }
    }

    // 3. Ekstraksi Uraian Barang
    let uraian = '';
    let uraianColIndex = -1;

    if (colMap.isDetected && colMap.colUraian !== -1 && row[colMap.colUraian]) {
      uraian = String(row[colMap.colUraian]).trim();
      uraianColIndex = colMap.colUraian;
    }

    // Jika belum ketemu dari header, cari teks uraian
    if (!uraian || uraian.length < 2) {
      // Prioritas: Kolom D (index 3), Kolom I (index 8), Kolom J (index 9)
      for (const c of [3, 8, 9, 2, 4, 10]) {
        const val = String(row[c] || '').trim();
        if (
          val.length > 2 &&
          !/^\d+$/.test(val) &&
          !/5\.\d+/.test(val) &&
          !/^\d{2}\.\s*\d{2}/.test(val) &&
          !/KODE|REKENING|URAIAN|RINCIAN|PROGRAM|TARIF|VOLUME|JUMLAH|TOTAL/i.test(val)
        ) {
          uraian = val;
          uraianColIndex = c;
          break;
        }
      }
    }

    if (!uraian || uraian.length < 2) continue;

    // Lewati baris kategori standar atau header kelompok kegiatan
    if (
      /KODE\s*REKENING|URAIAN|RINCIAN\s*PERHITUNGAN|NO\.\s*URUT|JUMLAH\s*TOTAL/i.test(uraian) ||
      /^Standar\s+[A-Z]/i.test(uraian) ||
      /^Pelaksanaan\s+Kegiatan\s+[A-Z]/i.test(uraian) ||
      /^Pengembangan\s+standar/i.test(uraian) ||
      /^Pemeliharaan\s+Sarana/i.test(uraian) ||
      /^Pembayaran\s+Honor\s+Tenaga/i.test(uraian) ||
      /^Pembelian\s+Bahan\s+Habis\s+Pakai\s+untuk\s+mendukung/i.test(uraian)
    ) {
      continue;
    }

    // -----------------------------------------------------------------------
    // 4. Ekstraksi Volume, Satuan, Tarif Satuan, & Jumlah (Adaptive + Ide 1)
    // -----------------------------------------------------------------------
    let volume = 0;
    let satuan = '';
    let tarif = 0;
    let jumlah = 0;

    // A. Jika Header Berhasil Dideteksi secara Dinamis:
    if (colMap.isDetected) {
      if (colMap.colVolume !== -1 && row[colMap.colVolume] !== undefined) {
        const parsed = parseInt(String(row[colMap.colVolume]).replace(/[^\d]/g, ''), 10);
        if (parsed > 0 && parsed < 100000) volume = parsed;
      }
      if (colMap.colSatuan !== -1 && row[colMap.colSatuan]) {
        const s = String(row[colMap.colSatuan]).trim();
        if (s && !/^\d+$/.test(s)) satuan = s;
      }
      if (colMap.colTarif !== -1 && row[colMap.colTarif] !== undefined) {
        const t = parseIDRNumber(row[colMap.colTarif]);
        if (t > 0) tarif = t;
      }
      if (colMap.colJumlah !== -1 && row[colMap.colJumlah] !== undefined) {
        const j = parseIDRNumber(row[colMap.colJumlah]);
        if (j > 0) jumlah = j;
      }
    }

    // B. Fallback / Penyesuaian Offset Berdasarkan Posisi Uraian (Jika Kolom I -> geser -1)
    if (!volume || !satuan || !tarif) {
      if (uraianColIndex === 3) {
        // Format Kompak 8 Kolom (Gambar 1: Uraian di Kolom D / index 3)
        // Vol = E (4), Sat = F (5), Tarif = G (6), Jumlah = H (7)
        if (!volume && row[4] !== undefined) {
          volume = parseInt(String(row[4]).replace(/[^\d]/g, ''), 10) || 0;
        }
        if (!satuan && row[5]) {
          satuan = String(row[5]).trim();
        }
        if (!tarif && row[6] !== undefined) {
          tarif = parseIDRNumber(row[6]);
        }
        if (!jumlah && row[7] !== undefined) {
          jumlah = parseIDRNumber(row[7]);
        }
      } else if (uraianColIndex === 8) {
        // Uraian di Kolom I (index 8): index Volume dan Satuan dikurangi 1 kolom
        const candidateVolCols = [13, 14, 12];
        for (const c of candidateVolCols) {
          const v = parseInt(String(row[c] || '').replace(/[^\d]/g, ''), 10);
          if (v > 0 && v < 100000) { volume = v; break; }
        }
        const candidateSatCols = [15, 14, 16];
        for (const c of candidateSatCols) {
          const s = String(row[c] || '').trim();
          if (UNIT_REGEX.test(s)) { satuan = s; break; }
        }
        const candidateTarifCols = [16, 17, 15];
        for (const c of candidateTarifCols) {
          const t = parseIDRNumber(row[c]);
          if (t > 0) { tarif = t; break; }
        }
        const candidateJumlahCols = [18, 19, 17];
        for (const c of candidateJumlahCols) {
          const j = parseIDRNumber(row[c]);
          if (j > 0 && j >= tarif) { jumlah = j; break; }
        }
      } else if (uraianColIndex === 9) {
        // Uraian di Kolom J (index 9)
        const candidateVolCols = [14, 15, 13];
        for (const c of candidateVolCols) {
          const v = parseInt(String(row[c] || '').replace(/[^\d]/g, ''), 10);
          if (v > 0 && v < 100000) { volume = v; break; }
        }
        const candidateSatCols = [16, 15, 17];
        for (const c of candidateSatCols) {
          const s = String(row[c] || '').trim();
          if (UNIT_REGEX.test(s)) { satuan = s; break; }
        }
        const candidateTarifCols = [17, 18, 16];
        for (const c of candidateTarifCols) {
          const t = parseIDRNumber(row[c]);
          if (t > 0) { tarif = t; break; }
        }
        const candidateJumlahCols = [19, 20, 18];
        for (const c of candidateJumlahCols) {
          const j = parseIDRNumber(row[c]);
          if (j > 0 && j >= tarif) { jumlah = j; break; }
        }
      }
    }

    // C. Verifikasi Satuan via Kamus Unit Resmi (jika belum valid)
    if (!satuan || !UNIT_REGEX.test(satuan)) {
      for (let c = Math.max(0, uraianColIndex + 1); c < Math.min(row.length, 22); c++) {
        const valStr = String(row[c] || '').trim();
        if (UNIT_REGEX.test(valStr)) {
          satuan = valStr;
          // Bila volume belum terbaca, cek kolom tepat di sebelah kirinya
          if (!volume && c > 0) {
            const v = parseInt(String(row[c - 1] || '').replace(/[^\d]/g, ''), 10);
            if (v > 0 && v < 100000) volume = v;
          }
          // Bila tarif belum terbaca, cek kolom tepat di sebelah kanannya
          if (!tarif && c + 1 < row.length) {
            const t = parseIDRNumber(row[c + 1]);
            if (t > 0) tarif = t;
          }
          break;
        }
      }
    }

    // D. Normalisasi Nilai Angka Matematika (Self-Healing)
    // Jika tarif dan jumlah tertukar (misal tarif > jumlah)
    if (tarif > 0 && jumlah > 0 && tarif > jumlah) {
      const temp = tarif;
      tarif = jumlah;
      jumlah = temp;
    }

    // Jika tarif mengambil nilai jumlah total (padahal volume > 1)
    if (volume > 1 && jumlah > 0 && (!tarif || tarif === jumlah)) {
      tarif = Math.round(jumlah / volume);
    } else if (volume > 0 && tarif > 0 && !jumlah) {
      jumlah = volume * tarif;
    } else if (jumlah > 0 && tarif > 0 && !volume) {
      volume = Math.round(jumlah / tarif);
    } else if (jumlah > 0 && volume > 0 && !tarif) {
      tarif = Math.round(jumlah / volume);
    }

    // Hanya simpan item jika memiliki uraian dan data angka yang valid
    if (uraian && (tarif > 0 || jumlah > 0 || volume > 0)) {
      const finalVol = volume || 1;
      const finalTarif = tarif || jumlah;
      const finalJml = jumlah || (finalTarif * finalVol);
      items.push({
        id: `rkas_${items.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
        kode_rekening: lastActiveKodeRek || '5.1.02.03.02.0120',
        kode_program: lastActiveKodeProg,
        uraian,
        volume: finalVol,
        satuan: satuan || 'buah',
        tarif_harga: finalTarif,
        jumlah: finalJml,
        bulan: activeMonthName,
        monthIndex: activeMonthIndex,
        sisa_volume: finalVol,
        sisa_jumlah: finalJml
      });
    }
  }

  console.group('%c📑 [EXTRACT RKAS FILE] PROSES EKSTRAKSI RKAS EXCEL', 'background: #10b981; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log('📌 Total Item RKAS Berhasil Diekstrak:', items.length);
  console.table(items.slice(0, 25).map((it, idx) => ({
    '#': idx + 1,
    'Kode Rek': it.kode_rekening,
    'Uraian RKAS': it.uraian,
    'Vol': it.volume,
    'Satuan': it.satuan,
    'Tarif Satuan (Rp)': it.tarif_harga,
    'Total (Rp)': it.jumlah
  })));
  console.groupEnd();

  return items;
}
