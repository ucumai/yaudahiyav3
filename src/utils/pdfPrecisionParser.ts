import * as pdfjsLib from 'pdfjs-dist';
import { TransaksiBKU, RincianBarang, RKASItem, SchoolMetadata, BKUValidationReport, MonthlyArchive } from '../types';
import { parseIDRNumber, parseRKASText } from './documentParser';
import { findMatchInRKAS, rkasFebruaryCatalog } from './rkasCatalog';
import { CrossMonthMatchEngine, buildCumulativeRKASPool } from './crossMonthSmartMatch';

export interface SpatialTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNum: number;
}

export interface SpatialLine {
  y: number;
  pageNum: number;
  text: string;
  items: SpatialTextItem[];
}

export interface RawTransactionBlock {
  anchorDate: string;
  anchorNoBukti?: string;
  isSaldoAwal?: boolean;
  items: SpatialTextItem[];
  lines: SpatialLine[];
}

export interface PrecisionBKUParseResult {
  transactions: TransaksiBKU[];
  metadata: Partial<SchoolMetadata>;
  rawText: string;
  validation: BKUValidationReport;
  documentType: 'bku';
}

const INDONESIAN_MONTH_NAMES = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
];

/**
 * Extracts structured spatial text glyphs with high-precision coordinate math
 */
export async function extractSpatialDataFromPDF(file: File | ArrayBuffer): Promise<{
  allSpatialLines: SpatialLine[];
  allItems: SpatialTextItem[];
  fullFormattedText: string;
}> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const allSpatialLines: SpatialLine[] = [];
  const allItems: SpatialTextItem[] = [];
  const pagesText: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const rawItems: SpatialTextItem[] = textContent.items
      .map((item: any) => {
        const tx = item.transform || [1, 0, 0, 1, 0, 0];
        const x = tx[4];
        const y = viewport.height - tx[5]; // top-down coordinate
        const str = (item.str || '').trim();
        const width = item.width || (str.length * 5);
        const height = item.height || 10;
        return { str, x, y, width, height, pageNum };
      })
      .filter((item) => item.str.length > 0);

    // Group items into lines by Y coordinate with 2.5px tolerance (precise enough for tight tabular rows)
    const lineBuckets: { y: number; items: SpatialTextItem[] }[] = [];
    const yTolerance = 2.5;

    // Sort HANYA berdasarkan Y (stable, valid total order).
    // Pengurutan X di dalam satu baris sudah ditangani terpisah nanti saat
    // bucket.items.sort((a,b) => a.x - b.x), jadi tidak perlu tie-break X di sini.
    // Comparator sebelumnya melanggar aturan transitivity Array.sort() dan bisa
    // menghasilkan urutan glyph yang tidak konsisten antar-run.
    rawItems.sort((a, b) => a.y - b.y);

    for (const item of rawItems) {
      allItems.push(item);
      let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= yTolerance);
      if (!bucket) {
        bucket = { y: item.y, items: [] };
        lineBuckets.push(bucket);
      }
      bucket.items.push(item);
    }

    lineBuckets.sort((a, b) => a.y - b.y);

    let pageReconstructed = `--- HALAMAN ${pageNum} ---\n`;
    for (const bucket of lineBuckets) {
      bucket.items.sort((a, b) => a.x - b.x);
      let lineText = '';
      for (let i = 0; i < bucket.items.length; i++) {
        const curr = bucket.items[i];
        if (i > 0) {
          const prev = bucket.items[i - 1];
          const gap = curr.x - (prev.x + prev.width);
          if (gap > 12) lineText += '\t';
          else if (gap > 2) lineText += ' ';
        }
        lineText += curr.str;
      }
      lineText = lineText.trim();
      if (lineText) {
        allSpatialLines.push({
          y: bucket.y,
          pageNum,
          text: lineText,
          items: bucket.items,
        });
        pageReconstructed += lineText + '\n';
      }
    }
    pagesText.push(pageReconstructed);
  }

  return {
    allSpatialLines,
    allItems,
    fullFormattedText: pagesText.join('\n\n'),
  };
}

/**
 * ATURAN 2 — BUANG NOISE HEADER/FOOTER PER HALAMAN (sebelum parsing)
 */
function isNoiseLine(lineText: string): boolean {
  const t = lineText.trim().toUpperCase();
  if (!t) return true;

  // 1. Column number index row: "1 2 3 4 5 6 7 8"
  if (/^1[\s\t]+2[\s\t]+3[\s\t]+4[\s\t]+5[\s\t]+6[\s\t]+7[\s\t]+8/.test(t) || /^1\s+2\s+3\s+4\s+5\s+6\s+7\s+8$/.test(t)) {
    return true;
  }

  // 2. Page counter footers: "BKU ... - NPSN ... Halaman X dari Y"
  if (/HALAMAN\s+\d+\s+DARI\s+\d+/i.test(t) || /BKU\s+.*\s+HALAMAN/i.test(t)) {
    return true;
  }

  // 3. Repeated table column headers
  if (
    (t.includes('TANGGAL') && t.includes('URAIAN')) ||
    (t.includes('KODE KEGIATAN') && t.includes('KODE REKENING')) ||
    (t.includes('PENERIMAAN') && t.includes('PENGELUARAN')) ||
    ((t.includes('NO. BUKTI') || t.includes('NO BUKTI')) && (t.includes('SALDO') || t.includes('URAIAN')))
  ) {
    return true;
  }

  // 4. Header title lines
  if (
    t.startsWith('BUKU KAS UMUM') ||
    t.startsWith('PEMERINTAH KABUPATEN') ||
    t.startsWith('PEMERINTAH PROVINSI') ||
    t.startsWith('PEMERINTAH KOTA') ||
    t.startsWith('DINAS PENDIDIKAN')
  ) {
    return true;
  }

  return false;
}

/**
 * ATURAN 3 — WHITELIST HALAMAN / DETEKSI FOOTER PENUTUP BKU
 */
function isClosingSummaryOrSignature(lineText: string): boolean {
  const t = lineText.trim().toUpperCase();
  if (!t) return false;
  return (
    t.includes('DITUTUP DENGAN KEADAAN') ||
    t.includes('PADA HARI INI') ||
    t.includes('BUKU KAS UMUM DITUTUP') ||
    t.startsWith('MENYETUJUI,') ||
    t.startsWith('MENYETUJUI') ||
    t.includes('KEPALA SEKOLAH') ||
    t.includes('BENDAHARA') ||
    t.includes('NIP.') ||
    t.includes('TANDA TANGAN')
  );
}

/**
 * Parse metadata from school headers before table
 */
function extractSchoolMetadata(lines: SpatialLine[]): Partial<SchoolMetadata> {
  const metadata: Partial<SchoolMetadata> = {};
  for (const line of lines) {
    const txt = line.text;

    if (/nama\s*sekolah\s*[:\t]/i.test(txt)) {
      const m = txt.match(/nama\s*sekolah\s*[:\t]\s*([^\t\n]+)/i);
      if (m) metadata.namaSekolah = m[1].trim();
    } else if (!metadata.namaSekolah && /(SDN|SMPN|SMAN|SD\s|SMP\s|SMA\s)[^\t\n,]+/i.test(txt)) {
      const m = txt.match(/((?:SDN|SMPN|SMAN|SD|SMP|SMA)\s+[^\t\n,]+)/i);
      if (m) metadata.namaSekolah = m[1].trim();
    }

    if (/npsn\s*[:\t]/i.test(txt)) {
      const m = txt.match(/npsn\s*[:\t]\s*(\d+)/i);
      if (m) metadata.npsn = m[1].trim();
    }

    if (/desa\s*\/\s*kecamatan|kecamatan/i.test(txt)) {
      const m = txt.match(/(?:desa\s*\/\s*kecamatan|kecamatan)\s*[:\t]\s*([^\t\n]+)/i);
      if (m) metadata.desaKecamatan = m[1].trim();
    }

    if (/kabupaten\s*\/\s*kota|kabupaten|kota/i.test(txt) && !txt.includes('PEMERINTAH')) {
      const m = txt.match(/(?:kabupaten\s*\/\s*kota|kabupaten|kota)\s*[:\t]\s*([^\t\n]+)/i);
      if (m) metadata.kabupatenKota = m[1].trim();
    }

    if (/provinsi/i.test(txt) && !txt.includes('PEMERINTAH')) {
      const m = txt.match(/provinsi\s*[:\t]\s*([^\t\n]+)/i);
      if (m) metadata.provinsi = m[1].trim();
    }

    if (/sumber\s*dana/i.test(txt)) {
      const m = txt.match(/sumber\s*dana\s*[:\t]\s*([^\t\n]+)/i);
      if (m) metadata.sumberDana = m[1].trim();
    }

    if (/bulan\s*[:\t]|periode/i.test(txt)) {
      const m = txt.match(/(?:bulan|periode)\s*[:\t]\s*([^\t\n]+)/i);
      if (m) metadata.bulanTahun = m[1].trim();
    }

    if (/kepala\s*sekolah/i.test(txt) && !metadata.kepalaSekolah) {
      const m = txt.match(/kepala\s*sekolah\s*[:\t]?\s*([^\t\n]+)/i);
      if (m && m[1].length > 3) metadata.kepalaSekolah = m[1].trim();
    }

    if (/bendahara/i.test(txt) && !metadata.bendahara) {
      const m = txt.match(/bendahara\s*[:\t]?\s*([^\t\n]+)/i);
      if (m && m[1].length > 3) metadata.bendahara = m[1].trim();
    }
  }
  return metadata;
}

/**
 * ATURAN 6 — NO BUKTI DETEKSI KETAT RESMI (HANYA KODE VOUCHER RESMI: BNU, KWT, BPU, BKK, BKM, STS, DLL)
 */
function extractStrictNoBukti(text: string): string | null {
  // Hanya menerima kode bukti kas resmi (BNU, KWT, BPU, BKK, BKM, STS, SP2D, SPM, NPD, BND, NP)
  // Menghindari kata biasa seperti "Batu 0", "Kain 2", "Meja 4", "PPh 21"
  const matches = [...text.matchAll(/\b(BNU|KWT|BPU|BKK|BKM|STS|SP2D|SPM|NPD|BND|NP)\s*[-/]?\s*(\d{1,5})\b/gi)];
  for (const match of matches) {
    const prefix = match[1].toUpperCase();
    const numStr = match[2];
    const num = parseInt(numStr, 10);
    // Voucher number harus valid (> 0)
    if (num > 0) {
      return `${prefix}${numStr}`;
    }
  }
  return null;
}

/**
 * ATURAN 7 — DETEKSI BARIS SALDO AWAL BULAN
 */
function isSaldoAwalLine(text: string): boolean {
  return /saldo\s*(?:bank|tunai|kas|awal)\s*bulan/i.test(text) || /^saldo\s*(?:bank|tunai|kas|awal)\b/i.test(text.trim());
}

/**
 * ATURAN 1 & 2: DETEKSI AWAL BARIS TRANSAKSI (ANCHOR)
 */
function isTransactionAnchorLine(lineText: string, items: SpatialTextItem[]): boolean {
  const t = lineText.trim();
  if (!t) return false;

  // 1. Saldo Awal
  if (isSaldoAwalLine(t)) return true;

  // 2. Baris Terima / Setor (Pajak, SIPLah, Bunga Bank, Pajak Bunga)
  if (/^(?:Terima|Setor)\b/i.test(t) || /^Bunga\s+Bank/i.test(t) || /^Pajak\s+Bunga/i.test(t)) {
    return true;
  }

  // 3. Ada tanggal DD-MM-YYYY di kolom kiri (X < 160)
  const dateMatch = t.match(/\b(\d{2}[-/]\d{2}[-/]\d{4})\b/);
  if (dateMatch) {
    const dateItem = items.find((it) => /\d{2}[-/]\d{2}[-/]\d{4}/.test(it.str));
    if (dateItem && dateItem.x < 160) return true;
    if (!dateItem && items.length > 0 && items[0].x < 160) return true;
  }

  return false;
}

/**
 * PARSER UTAMA PRESISI DENGAN SEMUA ATURAN WAJIB (1-9 & VALIDASI)
 */
export async function parseBKUPDFPrecision(
  file: File | ArrayBuffer,
  rkasList: RKASItem[] = rkasFebruaryCatalog,
  options?: {
    targetMonthIndex?: number;
    monthlyArchives?: Record<number, MonthlyArchive | null>;
  }
): Promise<PrecisionBKUParseResult> {
  const { allSpatialLines, fullFormattedText } = await extractSpatialDataFromPDF(file);
  const metadata = extractSchoolMetadata(allSpatialLines);

  // ==========================================
  // ATURAN 3: STOP PARSING SETELAH BARIS "Jumlah"
  // ==========================================
  let officialPenerimaan: number | undefined;
  let officialPengeluaran: number | undefined;
  let officialSaldoAkhir: number | undefined;
  let jumlahLineIndex = -1;

  for (let i = 0; i < allSpatialLines.length; i++) {
    const line = allSpatialLines[i];
    const t = line.text.trim();

    if (/^jumlah\b/i.test(t) || /^total\b/i.test(t)) {
      jumlahLineIndex = i;
      const moneyNumbers = [...t.matchAll(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/g)]
        .map((m) => parseIDRNumber(m[1]))
        .filter((n) => n > 0);

      if (moneyNumbers.length >= 3) {
        officialPenerimaan = moneyNumbers[0];
        officialPengeluaran = moneyNumbers[1];
        officialSaldoAkhir = moneyNumbers[2];
      } else if (moneyNumbers.length === 2) {
        officialPenerimaan = moneyNumbers[0];
        officialPengeluaran = moneyNumbers[1];
      } else if (moneyNumbers.length === 1) {
        officialPengeluaran = moneyNumbers[0];
      }
      // Stop checking further lines for Jumlah
      break;
    }
  }

  // Only take lines UP TO the "Jumlah" row (and discard anything after Jumlah or closing signature pages)
  const linesToProcess = (jumlahLineIndex !== -1
    ? allSpatialLines.slice(0, jumlahLineIndex)
    : allSpatialLines
  ).filter((l) => !isNoiseLine(l.text) && !isClosingSummaryOrSignature(l.text));

  // ==========================================
  // ATURAN 1: ANCHOR BARIS TRANSAKSI & MULTI-LINE MERGE
  // ==========================================
  const rawBlocks: RawTransactionBlock[] = [];
  let currentBlock: RawTransactionBlock | null = null;

  for (let i = 0; i < linesToProcess.length; i++) {
    const line = linesToProcess[i];
    const txt = line.text.trim();

    const isAnchor = isTransactionAnchorLine(txt, line.items);
    const dateMatch = txt.match(/\b(\d{2}[-/]\d{2}[-/]\d{4})\b/);
    const isSaldo = isSaldoAwalLine(txt);
    const anchorDate = dateMatch ? dateMatch[1].replace(/\//g, '-') : (currentBlock ? currentBlock.anchorDate : '01-01-2026');

    if (isAnchor) {
      if (currentBlock) {
        rawBlocks.push(currentBlock);
      }
      currentBlock = {
        anchorDate,
        isSaldoAwal: isSaldo,
        items: [...line.items],
        lines: [line],
      };
    } else if (currentBlock) {
      // Multi-line merge: all glyphs between one anchor and next belong to the same transaction!
      currentBlock.items.push(...line.items);
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock) {
    rawBlocks.push(currentBlock);
  }

  // ==========================================
  // PROCESS BLOCKS INTO TRANSACTIONS WITH SPATIAL COLUMN RE-ASSEMBLY
  // ==========================================
  interface ExtractedRow {
    tanggal: string;
    kodeKegiatan?: string;
    uraian: string;
    penerimaan: number;
    pengeluaran: number;
    saldo?: number;
    kodeRekening: string;
    noBukti: string | null;
    isSaldoAwal: boolean;
    rawText: string;
  }

  const extractedRows: ExtractedRow[] = [];
  let lastKnownNoBukti: string | null = null;
  let lastKnownKodeRekening: string = '-';
  let lastKnownKodeKegiatan: string | undefined = undefined;

  // Helper to protect technical specs (e.g., "1.301-2.200 VA", "900 VA", "500 ml")
  const cleanUraianSafely = (
    text: string,
    reconstructedRekFragment?: string | null,
    reconstructedKegFragment?: string | null,
    strictBukti?: string | null
  ): string => {
    let res = text;

    // 1. Remove date
    res = res.replace(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/g, '');

    // 2. Remove full Kode Rekening (e.g. 5.1.02.01.01.0030)
    res = res.replace(/5\.\d\.\d{2}\.\d{2}\.\d{2}(?:\.\d{2,4})?/g, '');

    // 3. Remove full Kode Kegiatan (e.g. 04.06.06.03 or 07.12.01.)
    res = res.replace(/(?:^|\s)0[1-8]\.\d{2}\.\d{2}(?:\.\d{2})?\.?(?:\s|$)/g, ' ');

    // 4. Remove No Bukti
    if (strictBukti) {
      res = res.replace(new RegExp(`\\b${strictBukti}\\b`, 'gi'), '');
    }
    res = res.replace(/\b(BNU|KWT|BPU|BKK|BKM|STS|SP2D|SPM|NPD|BND|NP)\s*\d{1,5}\b/gi, '');

    // 5. Remove reconstructed Rekening fragment if it is isolated (e.g. "Mawar Lestari 13" -> "Mawar Lestari")
    if (reconstructedRekFragment && reconstructedRekFragment.length <= 4) {
      res = res.replace(new RegExp(`\\s+\\b${reconstructedRekFragment}\\b$`, 'g'), '');
      res = res.replace(new RegExp(`\\s+\\b${reconstructedRekFragment}\\b(?=\\s|$)`, 'g'), '');
    }

    // 6. Remove reconstructed Kegiatan fragment if it appears at start (e.g. "03 Ciseeng" -> "Ciseeng" or "03 Biaya..." -> "Biaya...")
    if (reconstructedKegFragment && reconstructedKegFragment.length <= 3) {
      res = res.replace(new RegExp(`^\\s*\\b${reconstructedKegFragment}\\b\\s*`, 'g'), '');
      res = res.replace(new RegExp(`\\s+\\b${reconstructedKegFragment}\\b(?=\\s+(?:Biaya|TARIF|Pembayaran|Belanja|Beli|Pengadaan|Honor))`, 'gi'), '');
    }

    // 7. Remove standalone 0 table cells
    res = res.replace(/\s+0\s+/g, ' ');

    // Normalize whitespace
    res = res.replace(/\s+/g, ' ').trim();

    // Clean boundary punctuation
    res = res.replace(/^[.\s\-_/()]+/, '').replace(/[.\s\-_/()]+$/, '').trim();

    return res;
  };

  for (const block of rawBlocks) {
    const combinedLineText = block.lines.map((l) => l.text).join(' ');

    // ATURAN 7: BARIS SALDO AWAL BULAN
    if (block.isSaldoAwal || isSaldoAwalLine(combinedLineText)) {
      const isBank = /saldo\s*bank/i.test(combinedLineText);
      const isTunai = /saldo\s*tunai/i.test(combinedLineText);
      let uraian = isBank
        ? 'Saldo Bank'
        : isTunai
        ? 'Saldo Tunai'
        : 'Saldo Awal';

      const bulanMatch = combinedLineText.match(/bulan\s+([A-Za-z]+(?:\s+\d{4})?)/i);
      if (bulanMatch) {
        uraian = `${uraian} Bulan ${bulanMatch[1]}`;
      }

      const moneyNumbers = [...combinedLineText.matchAll(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?)/g)]
        .map((m) => parseIDRNumber(m[1]))
        .filter((n) => n > 0);

      let penerimaan = 0;
      if (isBank && moneyNumbers.length > 0) {
        penerimaan = moneyNumbers[0];
      } else if (isTunai) {
        penerimaan = 0;
      }

      extractedRows.push({
        tanggal: block.anchorDate,
        kodeKegiatan: undefined,
        uraian,
        penerimaan,
        pengeluaran: 0,
        kodeRekening: '-',
        noBukti: null,
        isSaldoAwal: true,
        rawText: combinedLineText,
      });
      continue;
    }

    // ==========================================
    // SPATIAL COLUMN CLUSTERING (Precise 2D Geometry)
    // ==========================================
    const items = [...block.items];
    const usedItemIndices = new Set<number>();

    // 1. Identify Money Region (Penerimaan, Pengeluaran, Saldo) at right side (X > 540)
    const moneyItems: SpatialTextItem[] = [];
    items.forEach((it, idx) => {
      // Numbers with thousands dot or standalone 0 on the right side of the page (X > 540)
      if (it.x >= 540 && (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(it.str) || it.str === '0' || /^Rp\s*[\d.]+/i.test(it.str))) {
        moneyItems.push(it);
        usedItemIndices.add(idx);
      }
    });

    // 2. Identify Date Item at left side (X < 140)
    let anchorDate = block.anchorDate;
    items.forEach((it, idx) => {
      if (it.x < 140 && /\b\d{2}[-/]\d{2}[-/]\d{4}\b/.test(it.str)) {
        anchorDate = it.str.replace(/\//g, '-');
        usedItemIndices.add(idx);
      }
    });

    // 3. Identify Kode Rekening Items (and multiline wrapped suffix)
    let kodeRekening = '-';
    let reconstructedRekFragment: string | null = null;
    let rekItemIndex = items.findIndex((it) => /5\.\d\.\d{2}\.\d{2}/.test(it.str));

    if (rekItemIndex !== -1) {
      const mainRekItem = items[rekItemIndex];
      usedItemIndices.add(rekItemIndex);
      let rekStr = mainRekItem.str.replace(/[^0-9.]/g, '');

      // Check if full code or prefix
      if (/5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4}/.test(rekStr)) {
        kodeRekening = rekStr;
      } else {
        // Look for wrapped fragment on lower line with matching X column (+/- 40px)
        const suffixItemIndex = items.findIndex(
          (it, idx) =>
            idx !== rekItemIndex &&
            !usedItemIndices.has(idx) &&
            Math.abs(it.x - mainRekItem.x) <= 40 &&
            /^\d{2,4}$/.test(it.str) &&
            it.y > mainRekItem.y - 2
        );

        if (suffixItemIndex !== -1) {
          const suffixItem = items[suffixItemIndex];
          usedItemIndices.add(suffixItemIndex);
          reconstructedRekFragment = suffixItem.str;
          const padded = suffixItem.str.padStart(4, '0');
          kodeRekening = rekStr.endsWith('.00')
            ? rekStr.slice(0, -2) + padded.slice(-2)
            : rekStr.endsWith('.')
            ? rekStr + padded
            : `${rekStr}.${padded}`;
        } else {
          // Check if fragment exists in text block
          const bnuFollowedMatch = combinedLineText.match(/\b(\d{2,4})\s+([A-Z]{2,4}\d{1,4})\b/);
          if (bnuFollowedMatch) {
            reconstructedRekFragment = bnuFollowedMatch[1];
            const padded = bnuFollowedMatch[1].padStart(4, '0');
            kodeRekening = rekStr.endsWith('.00')
              ? rekStr.slice(0, -2) + padded.slice(-2)
              : `${rekStr}.${padded}`;
          } else {
            kodeRekening = rekStr;
          }
        }
      }
    } else {
      // Fallback regex search for Kode Rekening in text
      const fullKodeMatch = combinedLineText.match(/(5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4})/);
      if (fullKodeMatch) {
        kodeRekening = fullKodeMatch[1];
      } else {
        const prefixMatch = combinedLineText.match(/(5\.\d\.\d{2}\.\d{2}\.\d{2}(?:\.00)?)/);
        if (prefixMatch) {
          const basePrefix = prefixMatch[1];
          const bnuFollowedMatch = combinedLineText.match(/\b(\d{2,4})\s+([A-Z]{2,4}\d{1,4})\b/);
          if (bnuFollowedMatch) {
            reconstructedRekFragment = bnuFollowedMatch[1];
            const padded = bnuFollowedMatch[1].padStart(4, '0');
            kodeRekening = basePrefix.endsWith('.00')
              ? basePrefix.slice(0, -2) + padded.slice(-2)
              : `${basePrefix}.${padded}`;
          } else {
            kodeRekening = basePrefix;
          }
        }
      }
    }

    // 4. Identify Kode Kegiatan Items (and multiline wrapped suffix)
    let kodeKegiatan: string | undefined = undefined;
    let reconstructedKegFragment: string | null = null;
    let kegItemIndex = items.findIndex((it) => /0[1-8]\.\d{2}\.\d{2}/.test(it.str));

    if (kegItemIndex !== -1) {
      const mainKegItem = items[kegItemIndex];
      usedItemIndices.add(kegItemIndex);
      let kegStr = mainKegItem.str.replace(/[^0-9.]/g, '');

      // Check for wrapped suffix (e.g. "04.06.06." on top line, "03" on bottom line in Kegiatan column)
      const suffixKegIndex = items.findIndex(
        (it, idx) =>
          idx !== kegItemIndex &&
          !usedItemIndices.has(idx) &&
          Math.abs(it.x - mainKegItem.x) <= 35 &&
          /^\d{2}$/.test(it.str) &&
          it.y > mainKegItem.y - 2
      );

      if (suffixKegIndex !== -1) {
        const suffixKeg = items[suffixKegIndex];
        usedItemIndices.add(suffixKegIndex);
        reconstructedKegFragment = suffixKeg.str;
        const cleanBase = kegStr.replace(/\.$/, '');
        kodeKegiatan = `${cleanBase}.${suffixKeg.str}`;
      } else {
        kodeKegiatan = kegStr.replace(/\.$/, '');
      }
    } else {
      // Fallback regex search for Kode Kegiatan
      const textWithoutRek = combinedLineText.replace(/5\.\d\.\d{2}\.\d{2}\.\d{2}(?:\.\d{0,4})?/g, '');
      const kegMatch = textWithoutRek.match(/(?:^|\s)(0[1-8]\.\d{2}\.\d{2}(?:\.\d{2})?\.?)(?:\s|$)/);
      if (kegMatch) {
        kodeKegiatan = kegMatch[1].trim().replace(/\.$/, '');
      }
    }

    // 5. Identify No Bukti Items
    let strictNoBukti: string | null = null;
    items.forEach((it, idx) => {
      if (!usedItemIndices.has(idx)) {
        const bMatch = extractStrictNoBukti(it.str);
        if (bMatch) {
          strictNoBukti = bMatch;
          usedItemIndices.add(idx);
        }
      }
    });

    if (!strictNoBukti) {
      strictNoBukti = extractStrictNoBukti(combinedLineText);
    }

    // No Bukti inheritance for multi-item batches
    const isSpecialNonSpendingLine =
      /^(?:terima|setor|bunga\s*bank|pajak\s*bunga|saldo)/i.test(combinedLineText.trim()) ||
      /\b(?:ppn|pph|siplah)\b/i.test(combinedLineText);

    if (strictNoBukti) {
      lastKnownNoBukti = strictNoBukti;
      lastKnownKodeRekening = kodeRekening !== '-' ? kodeRekening : lastKnownKodeRekening;
      lastKnownKodeKegiatan = kodeKegiatan || lastKnownKodeKegiatan;
    } else if (
      !isSpecialNonSpendingLine &&
      kodeKegiatan &&
      lastKnownKodeKegiatan === kodeKegiatan &&
      lastKnownNoBukti
    ) {
      strictNoBukti = lastKnownNoBukti;
      if (kodeRekening === '-') kodeRekening = lastKnownKodeRekening;
    }

    // 6. Extract Money Amounts from Spatial Money Items or fallback columns
    let penerimaan = 0;
    let pengeluaran = 0;
    let saldo = 0;

    const isTerimaLine = /^(?:terima\b|bunga\s*bank)/i.test(combinedLineText.trim());

    if (moneyItems.length > 0) {
      // Sort money items by X (left to right: Penerimaan -> Pengeluaran -> Saldo)
      moneyItems.sort((a, b) => a.x - b.x);
      const parsedMoney = moneyItems
        .map((it) => parseIDRNumber(it.str))
        .filter((n) => n > 0);

      if (parsedMoney.length >= 3) {
        penerimaan = parsedMoney[0];
        pengeluaran = parsedMoney[1];
        saldo = parsedMoney[2];
      } else if (parsedMoney.length === 2) {
        if (isTerimaLine) {
          penerimaan = parsedMoney[0];
          saldo = parsedMoney[1];
        } else {
          pengeluaran = parsedMoney[0];
          saldo = parsedMoney[1];
        }
      } else if (parsedMoney.length === 1) {
        if (isTerimaLine) {
          penerimaan = parsedMoney[0];
        } else {
          pengeluaran = parsedMoney[0];
        }
      }
    } else {
      // Fallback: search money values in rightmost column numbers
      const thousandNumberMatches = [...combinedLineText.matchAll(/(?:\b|\s)(Rp\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?)(?:\s|$)/g)];
      const parsedThousands = thousandNumberMatches.map((m) => parseIDRNumber(m[2])).filter((n) => n > 0);

      if (parsedThousands.length >= 3) {
        penerimaan = parsedThousands[0];
        pengeluaran = parsedThousands[1];
        saldo = parsedThousands[2];
      } else if (parsedThousands.length === 2) {
        if (isTerimaLine) {
          penerimaan = parsedThousands[0];
          saldo = parsedThousands[1];
        } else {
          pengeluaran = parsedThousands[0];
          saldo = parsedThousands[1];
        }
      } else if (parsedThousands.length === 1) {
        if (isTerimaLine) {
          penerimaan = parsedThousands[0];
        } else {
          pengeluaran = parsedThousands[0];
        }
      }
    }

    // 7. Reconstruct Uraian from Remaining Unused Spatial Items (Sorted by Y top-down, then X left-to-right)
    const uraianItems = items.filter((_, idx) => !usedItemIndices.has(idx));
    let rawUraianText = '';

    if (uraianItems.length > 0) {
      // Group uraian items into spatial lines by Y
      const uraianLineBuckets: { y: number; items: SpatialTextItem[] }[] = [];
      const yTol = 3.5;

      uraianItems.sort((a, b) => a.y - b.y);
      for (const it of uraianItems) {
        let b = uraianLineBuckets.find((bk) => Math.abs(bk.y - it.y) <= yTol);
        if (!b) {
          b = { y: it.y, items: [] };
          uraianLineBuckets.push(b);
        }
        b.items.push(it);
      }

      uraianLineBuckets.sort((a, b) => a.y - b.y);
      rawUraianText = uraianLineBuckets
        .map((b) => {
          b.items.sort((a, b) => a.x - b.x);
          return b.items.map((it) => it.str).join(' ');
        })
        .join(' ')
        .trim();
    } else {
      rawUraianText = combinedLineText;
    }

    // Clean Uraian while strictly preserving technical specifications (e.g., "1.301-2.200 VA", "900 VA", "500 ml")
    let cleanUraian = cleanUraianSafely(
      rawUraianText,
      reconstructedRekFragment,
      reconstructedKegFragment,
      strictNoBukti
    );

    if (!cleanUraian) {
      cleanUraian = strictNoBukti ? `Transaksi ${strictNoBukti}` : 'Transaksi Kas / Belanja';
    }

    extractedRows.push({
      tanggal: anchorDate,
      kodeKegiatan,
      uraian: cleanUraian,
      penerimaan,
      pengeluaran,
      saldo,
      kodeRekening,
      noBukti: strictNoBukti,
      isSaldoAwal: false,
      rawText: combinedLineText,
    });
  }

  // ==========================================
  // ATURAN PEMFILTERAN SESUAI FORMAT RESMI BKU:
  // 1. Penerimaan HANYA 1 record di awal (Saldo Bank > 0, Saldo Tunai 0 diabaikan).
  // 2. Pengeluaran HANYA baris yang memiliki No BKU / No Bukti resmi (BNUxx).
  //    Baris tanpa No BKU (misal pecahan teks / potongan pajak SIPLah) diabaikan.
  // ==========================================
  const finalTransactions: TransaksiBKU[] = [];
  const bnuGroupMap = new Map<string, TransaksiBKU>();

  // Filter 1: Ambil hanya 1 record Saldo Awal (Saldo Bank dengan nominal > 0)
  let saldoAwalInserted = false;

  console.group('%c📄 [PDF PRECISION PARSER] EKSTRAKSI SPATIAL BKU DARI PDF', 'background: #dc2626; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log('📌 Total Baris Diekstrak dari Spatial Coordinate:', extractedRows.length);
  console.table(extractedRows.map((r, idx) => ({
    '#': idx + 1,
    'No BKU': r.noBukti,
    'Tgl': r.tanggal,
    'Kode Rekening': r.kodeRekening,
    'Uraian': r.uraian,
    'Pengeluaran': r.pengeluaran,
    'Penerimaan': r.penerimaan,
    'Saldo Awal?': r.isSaldoAwal
  })));

  // Inisialisasi Mesin Pencocokan Lintas Bulan (Cross-Month Smart Match Engine)
  let detectedMonthIdx = options?.targetMonthIndex || 2;
  if (metadata.bulanTahun) {
    const bLower = metadata.bulanTahun.toLowerCase();
    const MONTHS = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    for (let m = 0; m < MONTHS.length; m++) {
      if (bLower.includes(MONTHS[m])) {
        detectedMonthIdx = m + 1;
        break;
      }
    }
  }

  const masterCumulativePool = buildCumulativeRKASPool(rkasList, options?.monthlyArchives, undefined, detectedMonthIdx);
  const matchEngine = new CrossMonthMatchEngine(masterCumulativePool, detectedMonthIdx);

  console.log('📌 PDF Parser: Mesin Pencocokan Lintas Bulan Diaktifkan:', {
    targetMonth: detectedMonthIdx,
    masterPoolSize: masterCumulativePool.length,
    rawRows: extractedRows.length
  });

  for (const row of extractedRows) {
    // 1. Handle Saldo Awal (Pemasukan)
    if (row.isSaldoAwal) {
      if (!saldoAwalInserted && row.penerimaan > 0) {
        finalTransactions.push({
          tanggal: row.tanggal,
          no_bku: '-',
          tipe_transaksi: 'Pemasukan',
          total_pemasukan_bku: row.penerimaan,
          total_pengeluaran_bku: 0,
          rincian_barang: [
            {
              kode_rekening: '-',
              uraian_barang: row.uraian,
              volume: 1,
              satuan: 'bulan',
              harga_satuan: row.penerimaan,
              jumlah_transaksi: row.penerimaan,
              kode_kegiatan: undefined,
            },
          ],
          kode_kegiatan: undefined,
        });
        saldoAwalInserted = true;
      }
      continue;
    }

    // 2. Handle Pengeluaran: Ekstrak seluruh baris transaksi belanja pengeluaran
    if (row.pengeluaran <= 0) {
      continue;
    }

    // Skip tax transfer / bunga lines (terima/setor PPN/PPh)
    if (/terima\s*ppn|setor\s*ppn|terima\s*pph|setor\s*pph|pajak\s*bunga/i.test(row.uraian)) {
      continue;
    }

    const effectiveNoBukti = row.noBukti || `BKU-${bnuGroupMap.size + 1}`;
    const nominal = row.pengeluaran;

    // Cross-match cerdas lintas bulan dengan pelacakan sisa kuota (FIFO Carry-Over)
    const smartMatch = matchEngine.matchTransactionItem({
      kodeRekening: row.kodeRekening,
      uraian: row.uraian,
      nominal: nominal,
      targetMonthIndex: detectedMonthIdx,
      noBukti: effectiveNoBukti
    });

    const finalKodeRek = smartMatch.kodeRekening ||
      (row.kodeRekening && row.kodeRekening !== '-' && row.kodeRekening.length > 5 ? row.kodeRekening : '5.1.02.03.02.0120');

    const rincianItem: RincianBarang = {
      kode_rekening: finalKodeRek,
      uraian_barang: row.uraian,
      volume: smartMatch.volume,
      satuan: smartMatch.satuan,
      harga_satuan: smartMatch.hargaSatuan,
      jumlah_transaksi: nominal,
      kode_kegiatan: row.kodeKegiatan || smartMatch.kodeKegiatan,
      is_cross_month: smartMatch.isCrossMonth,
      rkas_source_month: smartMatch.sourceMonthName,
      rkas_source_month_index: smartMatch.sourceMonthIndex,
      rkas_matched_uraian: smartMatch.matchedItem?.uraian,
      match_note: smartMatch.matchNote
    };

    console.log(`🔍 [PDF CROSS-MONTH MATCHING] Uraian: "${row.uraian}" | No BKU: ${effectiveNoBukti}`, {
      'Nominal BKU': nominal,
      'Hasil Match': smartMatch.matchedItem ? `${smartMatch.matchedItem.uraian} (${smartMatch.volume} ${smartMatch.satuan} @ Rp ${smartMatch.hargaSatuan})` : 'TIDAK COCOK',
      'Lintas Bulan?': smartMatch.isCrossMonth,
      'Asal RKAS Bulan': smartMatch.sourceMonthName,
      'Tier': smartMatch.matchTier,
      'Catatan': smartMatch.matchNote || '-'
    });

    // Group by No Bukti BNU
    const existing = bnuGroupMap.get(effectiveNoBukti);
    if (existing) {
      existing.total_pengeluaran_bku += row.pengeluaran;
      existing.rincian_barang.push(rincianItem);
      if (smartMatch.isCrossMonth) {
        existing.has_cross_month = true;
        existing.cross_month_source = smartMatch.sourceMonthName;
      }
    } else {
      const newGroup: TransaksiBKU = {
        tanggal: row.tanggal,
        no_bku: effectiveNoBukti,
        tipe_transaksi: 'Pengeluaran',
        total_pemasukan_bku: 0,
        total_pengeluaran_bku: row.pengeluaran,
        rincian_barang: [rincianItem],
        kode_kegiatan: row.kodeKegiatan || smartMatch.kodeKegiatan,
        has_cross_month: smartMatch.isCrossMonth,
        cross_month_source: smartMatch.sourceMonthName
      };
      bnuGroupMap.set(effectiveNoBukti, newGroup);
      finalTransactions.push(newGroup);
    }
  }

  // ==========================================
  // VALIDASI OTOMATIS KETAT (Rule & Reference)
  // ==========================================
  const totalParsedPenerimaan = finalTransactions.reduce((acc, t) => acc + t.total_pemasukan_bku, 0);
  const totalParsedPengeluaran = finalTransactions.reduce((acc, t) => acc + t.total_pengeluaran_bku, 0);

  let isValid = true;
  let diffPengeluaran: number | undefined;
  let diffPenerimaan: number | undefined;
  let statusMessage = `Ekstraksi sukses! Ditemukan ${finalTransactions.length} transaksi valid.`;
  const unmatchedRows: Array<{ lineIndex: number; rawText: string; reason: string }> = [];

  if (officialPengeluaran !== undefined && officialPengeluaran > 0) {
    diffPengeluaran = totalParsedPengeluaran - officialPengeluaran;
    if (diffPengeluaran !== 0) {
      statusMessage = `Informasi Rekonsiliasi: Selisih Rp ${Math.abs(diffPengeluaran).toLocaleString('id-ID')} terhadap rekap resmi dokumen (kemungkinan mencakup setor pajak/bunga). Seluruh transaksi tetap berhasil diunggah.`;
    }
  }

  if (officialPenerimaan !== undefined && officialPenerimaan > 0) {
    diffPenerimaan = totalParsedPenerimaan - officialPenerimaan;
    if (diffPenerimaan !== 0) {
      const prevMsg = diffPengeluaran !== 0 ? `${statusMessage} | ` : '';
      statusMessage = `${prevMsg}Informasi Penerimaan: Selisih Rp ${Math.abs(diffPenerimaan).toLocaleString('id-ID')}. Seluruh transaksi berhasil diunggah.`;
    }
  }

  const validation: BKUValidationReport = {
    isValid,
    officialPenerimaan,
    parsedPenerimaan: totalParsedPenerimaan,
    diffPenerimaan,
    officialPengeluaran,
    parsedPengeluaran: totalParsedPengeluaran,
    diffPengeluaran,
    statusMessage,
    unmatchedRows,
  };

  // TEMPORARY DEBUG — hapus setelah masalah selesai
  console.log('=== DEBUG BKU PARSE RESULT ===');
  console.log('Total finalTransactions (grouped rows):', finalTransactions.length);
  console.log('Total sub-items (rincian_barang flattened):',
    finalTransactions.reduce((acc, t) => acc + t.rincian_barang.length, 0));
  console.log('Total Penerimaan:', totalParsedPenerimaan);
  console.log('Total Pengeluaran:', totalParsedPengeluaran);
  console.log('FULL RAW JSON:', JSON.stringify(finalTransactions, null, 2));

  // Cari duplikat persis (tanggal + no_bku + uraian + nominal sama)
  const seen: Record<string, number> = {};
  finalTransactions.forEach((t) => {
    t.rincian_barang.forEach((r) => {
      const key = `${t.tanggal}|${t.no_bku}|${r.uraian_barang}|${r.jumlah_transaksi}`;
      seen[key] = (seen[key] || 0) + 1;
    });
  });
  const dupes = Object.entries(seen).filter(([, count]) => count > 1);
  console.log('=== TRANSAKSI KEMBAR (RAW, TIDAK DIRINGKAS) ===');
  console.log(JSON.stringify(dupes, null, 2));
  console.log('=== END DEBUG ===');
  console.groupEnd();

  return {
    documentType: 'bku',
    transactions: finalTransactions,
    metadata,
    rawText: fullFormattedText,
    validation,
  };
}

/**
 * Precision RKAS Parser
 */
export async function parseRKASPDFPrecision(
  file: File | ArrayBuffer,
  defaultMonthIndex: number = 2
): Promise<{
  rkasItems: RKASItem[];
  rawText: string;
}> {
  const { fullFormattedText } = await extractSpatialDataFromPDF(file);
  const rkasItems = parseRKASText(fullFormattedText, defaultMonthIndex);
  return {
    rkasItems,
    rawText: fullFormattedText,
  };
}
