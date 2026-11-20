import { TransaksiBKU, RincianBarang, RKASItem, MonthlyArchive } from '../types';
import { findMatchInRKAS, normalizeText, rkasFebruaryCatalog } from './rkasCatalog';
import { CrossMonthMatchEngine, buildCumulativeRKASPool } from './crossMonthSmartMatch';
import { MONTH_NAMES_ID } from './monthArchiveUtils';
import * as XLSX from 'xlsx';

// Parse raw RKAS tabular text or CSV into structured RKAS items
export function parseRKASText(text: string, defaultMonthIndex: number = 2): RKASItem[] {
  const items: RKASItem[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Look for lines containing code and price
    // Format e.g. 5.1.02.01.01.0030 06. 05. 09. Cairan Pembersih Kaca-Kemasan isi 500 ml 12 botol 23.300 279.600
    const codeMatch = trimmed.match(/(5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4})/);
    if (codeMatch) {
      const kodeRekening = codeMatch[1];
      
      // Look for volume, satuan, and tarif
      // e.g., "12 botol 23.300" or "4 orang / hari 150.000" or "1 unit 20.000.000"
      const numberMatches = [...trimmed.matchAll(/([\d.]+)/g)].map((m) => m[1]);
      
      // Extract units like: orang / hari, botol, buah, box, unit, galon, pack, pcs, meter, per bungkus, bulan, per bulan
      const unitMatch = trimmed.match(
        /(orang\s*\/\s*hari|orang|box|botol|buah|unit|galon|pack|pcs|meter|per\s*bungkus|bulan|per\s*bulan|rim|lembar|kotak|set|paket)/i
      );

      // Clean uraian text
      let uraian = trimmed
        .replace(/^[0-9]+\.\s*/, '') // remove line numbering e.g. "24."
        .replace(/(5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4})/, '')
        .replace(/\b\d{2}\.\s*\d{2}\.\s*\d{2}\.\b/g, '') // remove program code like 06. 05. 09.
        .replace(/\d+([.,]\d+)?\s*(orang\s*\/\s*hari|orang|box|botol|buah|unit|galon|pack|pcs|meter|per\s*bungkus|bulan|per\s*bulan|rim|lembar|kotak|set|paket)/i, '')
        .replace(/[\d.,]{3,}/g, '') // remove large amounts
        .replace(/\s+/g, ' ')
        .trim();

      const satuan = unitMatch ? unitMatch[1].trim() : 'unit';
      
      // Estimate volume and tarif
      let volume = 1;
      let tarif = 0;
      let jumlah = 0;

      // Extract numbers
      const validNumbers = numberMatches
        .map((n) => parseInt(n.replace(/\./g, ''), 10))
        .filter((n) => !isNaN(n) && n > 0);

      if (validNumbers.length >= 2) {
        jumlah = validNumbers[validNumbers.length - 1];
        tarif = validNumbers[validNumbers.length - 2];
        if (validNumbers.length >= 3) {
          volume = validNumbers[validNumbers.length - 3];
        } else if (tarif > 0 && jumlah > 0) {
          volume = Math.round(jumlah / tarif);
        }
      }

      if (uraian.length > 2) {
        const itemVol = volume || 1;
        const itemTarif = tarif || jumlah;
        const itemJumlah = jumlah || (itemTarif * itemVol);
        items.push({
          id: `rkas_${items.length + 1}_${Math.random().toString(36).slice(2, 6)}`,
          kode_rekening: kodeRekening,
          kode_program: '',
          uraian,
          volume: itemVol,
          satuan,
          tarif_harga: itemTarif,
          jumlah: itemJumlah,
          bulan: MONTH_NAMES_ID[defaultMonthIndex - 1] || 'Februari',
          monthIndex: defaultMonthIndex,
          sisa_volume: itemVol,
          sisa_jumlah: itemJumlah
        });
      }
    }
  }

  return items.length > 0 ? items : rkasFebruaryCatalog;
}

// Clean number parser from ID format (e.g. "125.725.000" -> 125725000)
export function parseIDRNumber(str: string | number | null | undefined): number {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  const clean = str.toString().replace(/[^\d]/g, '');
  return parseInt(clean, 10) || 0;
}

// Merge raw BKU lines with parsed RKAS catalog according to 5 strict rules
export function mergeBKUWithRKAS(
  bkuTextOrRows: string,
  rkasList: RKASItem[] = rkasFebruaryCatalog,
  options?: {
    targetMonthIndex?: number;
    monthlyArchives?: Record<number, MonthlyArchive | null>;
  }
): TransaksiBKU[] {
  // If parsing raw text line by line
  const lines = bkuTextOrRows.split('\n');
  const rawEntries: Array<{
    tanggal: string;
    kodeKegiatan?: string;
    kodeRekening?: string;
    noBukti: string;
    uraian: string;
    penerimaan: number;
    pengeluaran: number;
  }> = [];

  // Group lines into multi-line transaction blocks anchored by date or Saldo
  interface TextBlock {
    anchorDate: string;
    lines: string[];
    isSaldoAwal: boolean;
  }

  const blocks: TextBlock[] = [];
  let curBlock: TextBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Filter out table headers, footers, column numbers
    if (
      /^1[\s\t]+2[\s\t]+3[\s\t]+4[\s\t]+5/i.test(trimmed) ||
      /^1\s+2\s+3\s+4\s+5\s+6\s+7\s+8$/i.test(trimmed) ||
      /Halaman\s+\d+\s+dari\s+\d+/i.test(trimmed) ||
      /BKU\s+.*\s+Halaman/i.test(trimmed) ||
      /BUKU KAS UMUM|PEMERINTAH|DINAS PENDIDIKAN|Menyetujui|Kepala Sekolah|Bendahara/i.test(trimmed) ||
      ((trimmed.includes('TANGGAL') || trimmed.includes('Tanggal')) && (trimmed.includes('URAIAN') || trimmed.includes('Uraian')))
    ) {
      continue;
    }

    // Check for tax lines
    if (/terima\s*ppn|setor\s*ppn|terima\s*pph|setor\s*pph|pajak\s*bunga/i.test(trimmed)) {
      continue;
    }

    // Check if line is anchored by a date
    const dateMatch = trimmed.match(/\b(\d{2}[-/]\d{2}[-/]\d{4})\b/);
    const isSaldoAwal = /saldo\s*(?:bank|tunai|kas|awal)/i.test(trimmed);

    if (dateMatch || isSaldoAwal) {
      if (curBlock) blocks.push(curBlock);
      curBlock = {
        anchorDate: dateMatch ? dateMatch[1].replace(/\//g, '-') : '01-01-2026',
        lines: [trimmed],
        isSaldoAwal: Boolean(isSaldoAwal),
      };
    } else if (curBlock) {
      curBlock.lines.push(trimmed);
    }
  }

  if (curBlock) blocks.push(curBlock);

  for (const block of blocks) {
    const combined = block.lines.join(' ');

    // 5) NO BUKTI
    const bnuMatch = combined.match(/\b([A-Z]{2,4}\s*[-/]?\s*\d{1,5})\b/i);
    const noBukti = bnuMatch ? bnuMatch[1].replace(/\s+/g, '').toUpperCase() : '-';

    // 4) PISAHKAN KODE KEGIATAN DARI URAIAN (Termasuk potongan suffix e.g. "04.06.06." + "03")
    let kodeKegiatan: string | undefined = undefined;
    let reconstructedKegFragment: string | null = null;
    const kegiatanMatch = combined.match(/\b(0[1-8]\.\d{2}\.\d{2}(?:\.\d{2})?\.?)\b/);

    if (kegiatanMatch) {
      let baseKeg = kegiatanMatch[1].replace(/\.$/, '');
      // Check if there is an orphan 2-digit number following or preceding
      const orphanKeg = combined.match(/(?:^|\s)(0[1-8]\.\d{2}\.\d{2}\.?)\s+(?:[^\d]*\s+)?(\d{2})\b/);
      if (orphanKeg && orphanKeg[2].length === 2 && !kegiatanMatch[1].includes('.' + orphanKeg[2])) {
        reconstructedKegFragment = orphanKeg[2];
        kodeKegiatan = `${baseKeg}.${orphanKeg[2]}`;
      } else {
        kodeKegiatan = baseKeg;
      }
    }

    // 3) REKONSTRUKSI KODE REKENING YANG TERPOTONG BARIS
    let kodeRekening = '-';
    let reconstructedRekFragment: string | null = null;

    const fullKodeMatch = combined.match(/(5\.\d\.\d{2}\.\d{2}\.\d{2}\.\d{4})/);
    if (fullKodeMatch) {
      kodeRekening = fullKodeMatch[1];
    } else {
      const partialKodeMatch = combined.match(/(5\.\d\.\d{2}\.\d{2}\.\d{2}(?:\.00)?)/);
      if (partialKodeMatch) {
        const basePrefix = partialKodeMatch[1];
        // Cari angka 2-4 digit yang berada sebelum No Bukti atau di baris potongan
        const bnuFollowedMatch = combined.match(/\b(\d{2,4})\s+([A-Z]{2,4}\s*[-/]?\s*\d{1,5})\b/i);
        if (bnuFollowedMatch) {
          reconstructedRekFragment = bnuFollowedMatch[1];
          const padded = bnuFollowedMatch[1].padStart(4, '0');
          kodeRekening = basePrefix.endsWith('.00')
            ? basePrefix.slice(0, -2) + padded.slice(-2)
            : `${basePrefix}.${padded}`;
        } else {
          const orphanMatch = combined.match(/(?:5\.\d\.\d{2}\.\d{2}\.\d{2}(?:\.00)?)\s+(?:[^\d]*\s+)?(\d{2,4})\b/);
          if (orphanMatch && orphanMatch[1].length <= 4) {
            reconstructedRekFragment = orphanMatch[1];
            const padded = orphanMatch[1].padStart(4, '0');
            kodeRekening = basePrefix.endsWith('.00')
              ? basePrefix.slice(0, -2) + padded.slice(-2)
              : `${basePrefix}.${padded}`;
          } else {
            kodeRekening = basePrefix;
          }
        }
      }
    }

    const isPemasukan = block.isSaldoAwal || /saldo\s*(?:bank|tunai|kas|awal)/i.test(combined) || /terima\s*dana\s*bos/i.test(combined);

    // Extract IDR Amounts from money columns (protecting technical specifications like "1.301-2.200 VA", "900 VA")
    // Hide technical specs temporarily to avoid false positive money matches
    const textWithoutTechSpecs = combined
      .replace(/\b\d{1,3}(?:\.\d{3})*\s*[-–]\s*\d{1,3}(?:\.\d{3})*\s*(?:VA|Watt|W|V|Volt|ml|gr|gram|kg|pcs|lembar|rim)?/gi, ' [SPEC_RANGE] ')
      .replace(/\b\d{1,4}\s*(?:VA|Watt|Volt|ml|gr|gram|kg|pcs|lembar|rim|cm|meter|inch)\b/gi, ' [SPEC_UNIT] ');

    const moneyRegex = /(?:\b|\s)(Rp\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d+)?)(?:\s|$)/g;
    const rawNumbers: number[] = [];

    for (const match of textWithoutTechSpecs.matchAll(moneyRegex)) {
      const numStr = match[2];
      const val = parseIDRNumber(numStr);
      if (
        val > 0 &&
        numStr !== block.anchorDate &&
        numStr !== reconstructedRekFragment &&
        !(val < 100 && !match[1])
      ) {
        rawNumbers.push(val);
      }
    }

    let penerimaan = 0;
    let pengeluaran = 0;

    if (isPemasukan) {
      penerimaan = rawNumbers.length > 0 ? rawNumbers[0] : 0;
    } else {
      pengeluaran = rawNumbers.length > 0 ? rawNumbers[0] : 0;
    }

    // Clean description / uraian safely
    let uraian = combined
      .replace(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/g, '')
      .replace(/\b[A-Z]{2,4}\s*[-/]?\s*\d{1,5}\b/gi, '')
      .replace(/(5\.\d\.\d{2}\.\d{2}\.\d{2}(?:\.\d{2,4})?)/g, '')
      .replace(/(?:^|\s)0[1-8]\.\d{2}\.\d{2}(?:\.\d{2})?\.?(?:\s|$)/g, ' ');

    // Strip nominal amounts ONLY if they matched parsed transaction money (prevent stripping 1.301-2.200 VA)
    if (rawNumbers.length > 0) {
      for (const num of rawNumbers) {
        const formattedDot = num.toLocaleString('id-ID');
        uraian = uraian.replace(new RegExp(`(?:Rp\\s*)?\\b${formattedDot.replace(/\./g, '\\.')}\\b`, 'g'), ' ');
      }
    }

    // Strip isolated reconstructed fragments
    if (reconstructedRekFragment && reconstructedRekFragment.length <= 4) {
      uraian = uraian.replace(new RegExp(`\\s+\\b${reconstructedRekFragment}\\b$`, 'g'), '');
      uraian = uraian.replace(new RegExp(`\\s+\\b${reconstructedRekFragment}\\b(?=\\s|$)`, 'g'), '');
    }

    if (reconstructedKegFragment && reconstructedKegFragment.length <= 3) {
      uraian = uraian.replace(new RegExp(`^\\s*\\b${reconstructedKegFragment}\\b\\s*`, 'g'), '');
      uraian = uraian.replace(new RegExp(`\\s+\\b${reconstructedKegFragment}\\b(?=\\s+(?:Biaya|TARIF|Pembayaran|Belanja|Beli|Pengadaan|Honor))`, 'gi'), '');
    }

    uraian = uraian.replace(/\s+/g, ' ').replace(/^[.\s\-_/()]+/, '').replace(/[.\s\-_/()]+$/, '').trim();

    if (!uraian && (penerimaan > 0 || pengeluaran > 0)) {
      uraian = isPemasukan ? 'Saldo Kas / Bank' : `Transaksi ${noBukti !== '-' ? noBukti : 'Belanja'}`;
    }

    if (uraian && (penerimaan > 0 || pengeluaran > 0)) {
      rawEntries.push({
        tanggal: block.anchorDate,
        kodeKegiatan,
        kodeRekening,
        noBukti,
        uraian,
        penerimaan,
        pengeluaran,
      });
    }
  }

  // If no lines parsed (e.g. invalid text), return standard fallback or empty
  if (rawEntries.length === 0) {
    return [];
  }

  // Group into Parent-Child according to Rule 2, 3, 4, 5
  const result: TransaksiBKU[] = [];
  const bnuMap = new Map<string, TransaksiBKU>();

  console.group('%c📑 [PARSER DOKUMEN TEKS BKU & RKAS]', 'background: #6366f1; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log('📌 Total Raw Baris Terbaca:', rawEntries.length);
  console.table(rawEntries);

  const targetMonthIdx = options?.targetMonthIndex || 2;
  const masterCumulativePool = buildCumulativeRKASPool(rkasList, options?.monthlyArchives, undefined, targetMonthIdx);
  const matchEngine = new CrossMonthMatchEngine(masterCumulativePool, targetMonthIdx);

  for (const entry of rawEntries) {
    const isPemasukan = entry.penerimaan > 0;

    let rincianItem: RincianBarang;
    let isCrossMonth = false;
    let sourceMonthName: string | undefined = undefined;

    if (isPemasukan) {
      rincianItem = {
        kode_rekening: entry.kodeRekening || '-',
        uraian_barang: entry.uraian,
        volume: 1,
        satuan: 'bulan',
        harga_satuan: entry.penerimaan,
        jumlah_transaksi: entry.penerimaan,
        kode_kegiatan: entry.kodeKegiatan,
      };
    } else {
      // Cross-match cerdas lintas bulan
      const smartMatch = matchEngine.matchTransactionItem({
        kodeRekening: entry.kodeRekening || '-',
        uraian: entry.uraian,
        nominal: entry.pengeluaran,
        targetMonthIndex: targetMonthIdx,
        noBukti: entry.noBukti
      });

      isCrossMonth = smartMatch.isCrossMonth;
      sourceMonthName = smartMatch.sourceMonthName;

      rincianItem = {
        kode_rekening: smartMatch.kodeRekening || (entry.kodeRekening || '-'),
        uraian_barang: entry.uraian,
        volume: smartMatch.volume,
        satuan: smartMatch.satuan,
        harga_satuan: smartMatch.hargaSatuan,
        jumlah_transaksi: entry.pengeluaran,
        kode_kegiatan: entry.kodeKegiatan || smartMatch.kodeKegiatan,
        is_cross_month: smartMatch.isCrossMonth,
        rkas_source_month: smartMatch.sourceMonthName,
        rkas_source_month_index: smartMatch.sourceMonthIndex,
        rkas_matched_uraian: smartMatch.matchedItem?.uraian,
        match_note: smartMatch.matchNote
      };

      console.log(`🔍 [TEXT CROSS-MONTH MATCHING] Uraian: "${entry.uraian}" | No BKU: ${entry.noBukti}`, {
        'Pengeluaran': entry.pengeluaran,
        'Hasil Match': smartMatch.matchedItem ? `${smartMatch.matchedItem.uraian} (${smartMatch.volume} ${smartMatch.satuan})` : 'TIDAK COCOK',
        'Lintas Bulan?': smartMatch.isCrossMonth,
        'Asal RKAS Bulan': smartMatch.sourceMonthName
      });
    }

    if (isPemasukan || entry.noBukti === '-') {
      result.push({
        tanggal: entry.tanggal,
        no_bku: entry.noBukti,
        tipe_transaksi: isPemasukan ? 'Pemasukan' : 'Pengeluaran',
        total_pemasukan_bku: entry.penerimaan,
        total_pengeluaran_bku: entry.pengeluaran,
        rincian_barang: [rincianItem],
        keterangan: entry.uraian,
        kode_kegiatan: entry.kodeKegiatan,
        has_cross_month: isCrossMonth,
        cross_month_source: sourceMonthName
      });
    } else {
      // Group by BNU
      const existing = bnuMap.get(entry.noBukti);
      if (existing) {
        existing.total_pengeluaran_bku += entry.pengeluaran;
        existing.rincian_barang.push(rincianItem);
        if (!existing.keterangan && entry.uraian) {
          existing.keterangan = entry.uraian;
        }
        if (isCrossMonth) {
          existing.has_cross_month = true;
          existing.cross_month_source = sourceMonthName;
        }
      } else {
        const newGroup: TransaksiBKU = {
          tanggal: entry.tanggal,
          no_bku: entry.noBukti,
          tipe_transaksi: 'Pengeluaran',
          total_pemasukan_bku: 0,
          total_pengeluaran_bku: entry.pengeluaran,
          rincian_barang: [rincianItem],
          keterangan: entry.uraian,
          kode_kegiatan: entry.kodeKegiatan,
          has_cross_month: isCrossMonth,
          cross_month_source: sourceMonthName
        };
        bnuMap.set(entry.noBukti, newGroup);
        result.push(newGroup);
      }
    }
  }

  console.log('✅ HASIL AKHIR DARI TEKS DOKUMEN:', result);
  console.groupEnd();

  return result;
}

// Parse Excel or CSV file
export async function parseExcelOrCsvFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const text = XLSX.utils.sheet_to_csv(worksheet);
        resolve(text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
