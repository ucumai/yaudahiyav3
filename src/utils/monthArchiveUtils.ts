import { TransaksiBKU, SchoolMetadata, MonthlyArchive, RKASItem } from '../types';

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

/**
 * Mendapatkan index bulan (1-12) dari nama bulan atau string
 */
export function getMonthIndexFromName(monthNameOrStr: string): number {
  if (!monthNameOrStr) return 2; // Default Februari
  const clean = monthNameOrStr.trim().toLowerCase();
  for (let i = 0; i < MONTH_NAMES_ID.length; i++) {
    if (clean.includes(MONTH_NAMES_ID[i].toLowerCase())) {
      return i + 1;
    }
  }
  // Try month number match (01, 02, etc.)
  const numMatch = clean.match(/\b(0?[1-9]|1[0-2])\b/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return 2;
}

/**
 * Mendeteksi Nama Bulan, Nomor Bulan (1-12) & Tahun dari Transaksi, Metadata, atau Nama File
 */
export function detectMonthYearFromData(
  data: TransaksiBKU[],
  fallbackBulanTahun?: string,
  fileName?: string
): { bulanTahun: string; bulan: string; tahun: string; monthIndex: number } {
  // 1. Coba dari fallbackBulanTahun jika ada dan eksplisit
  if (fallbackBulanTahun && fallbackBulanTahun.trim() && !/default/i.test(fallbackBulanTahun)) {
    const clean = fallbackBulanTahun.trim();
    for (let i = 0; i < MONTH_NAMES_ID.length; i++) {
      if (new RegExp(MONTH_NAMES_ID[i], 'i').test(clean)) {
        const yearMatch = clean.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : '2026';
        return {
          bulanTahun: `${MONTH_NAMES_ID[i]} ${year}`,
          bulan: MONTH_NAMES_ID[i],
          tahun: year,
          monthIndex: i + 1
        };
      }
    }
  }

  // 2. Coba deteksi dari nama file (misal: "BKU_Februari_2026.pdf" atau "BKU_Januari.pdf")
  if (fileName) {
    for (let i = 0; i < MONTH_NAMES_ID.length; i++) {
      if (new RegExp(MONTH_NAMES_ID[i], 'i').test(fileName)) {
        const yearMatch = fileName.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : '2026';
        return {
          bulanTahun: `${MONTH_NAMES_ID[i]} ${year}`,
          bulan: MONTH_NAMES_ID[i],
          tahun: year,
          monthIndex: i + 1
        };
      }
    }
  }

  // 3. Analisis tanggal di dalam list data transaksi
  if (data && data.length > 0) {
    const monthFreq: Record<number, number> = {};
    let dominantYear = '2026';

    for (const tx of data) {
      if (!tx.tanggal) continue;
      // Format DD-MM-YYYY atau YYYY-MM-DD
      const dmy = tx.tanggal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (dmy) {
        const m = parseInt(dmy[2], 10);
        dominantYear = dmy[3];
        if (m >= 1 && m <= 12) {
          monthFreq[m] = (monthFreq[m] || 0) + 1;
        }
      } else {
        const ymd = tx.tanggal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymd) {
          dominantYear = ymd[1];
          const m = parseInt(ymd[2], 10);
          if (m >= 1 && m <= 12) {
            monthFreq[m] = (monthFreq[m] || 0) + 1;
          }
        }
      }
    }

    let topMonth = 2; // Default Februari
    let maxCount = 0;
    for (const [mStr, count] of Object.entries(monthFreq)) {
      const m = parseInt(mStr, 10);
      if (count > maxCount) {
        maxCount = count;
        topMonth = m;
      }
    }

    const bulanName = MONTH_NAMES_ID[topMonth - 1] || 'Februari';
    return {
      bulanTahun: `${bulanName} ${dominantYear}`,
      bulan: bulanName,
      tahun: dominantYear,
      monthIndex: topMonth
    };
  }

  return {
    bulanTahun: 'Februari 2026',
    bulan: 'Februari',
    tahun: '2026',
    monthIndex: 2
  };
}

/**
 * Filter item ATK dari transaksi
 */
export function getAtkStatsFromData(data: TransaksiBKU[]): { count: number; total: number } {
  let count = 0;
  let total = 0;
  const keywords = ['atk', 'alat tulis', 'kertas', 'hvs', 'spidol', 'pulpen', 'tinta', 'buku', 'map', 'lakban', 'amplop', 'penjilidan', 'fotocopy', 'karton', 'lem', 'gunting', 'penggaris', 'stapler', 'staples', 'clip', 'penghapus'];
  const nonBarangKeywords = ['jasa', 'honor', 'honorarium', 'pelatih', 'transport', 'perjalanan', 'konsumsi', 'makan', 'sewa', 'listrik', 'air', 'internet'];

  data.forEach((tx) => {
    if (tx.tipe_transaksi === 'Pengeluaran') {
      const items = (tx.rincian_barang && tx.rincian_barang.length > 0)
        ? tx.rincian_barang
        : [{
            kode_rekening: '5.1.02.01.01.0024',
            uraian_barang: tx.keterangan || 'Belanja ATK',
            volume: 1,
            satuan: 'paket',
            harga_satuan: tx.total_pengeluaran_bku,
            jumlah_transaksi: tx.total_pengeluaran_bku
          }];

      items.forEach((item) => {
        const u = (item.uraian_barang || '').toLowerCase();
        if (nonBarangKeywords.some((k) => u.includes(k))) return;

        const isMatch = keywords.some((k) => u.includes(k) || (item.kode_rekening || '').includes('0024') || (item.kode_rekening || '').includes('0025'));
        if (isMatch) {
          count += 1;
          total += item.jumlah_transaksi;
        }
      });
    }
  });

  return { count, total };
}

/**
 * Filter item ALKEB dari transaksi
 */
export function getAlkebStatsFromData(data: TransaksiBKU[]): { count: number; total: number } {
  let count = 0;
  let total = 0;
  const keywords = ['kebersihan', 'alkeb', 'sabun', 'pel', 'sapu', 'desinfektan', 'karbol', 'deterjen', 'wipol', 'kamper', 'tisu', 'plastik sampah', 'sanitasi', 'pengki', 'sikat', 'pembersih', 'keset', 'kemoceng', 'handsanitizer', 'trash bag'];
  const nonBarangKeywords = ['jasa', 'honor', 'honorarium', 'pelatih', 'transport', 'perjalanan', 'konsumsi', 'makan', 'sewa', 'listrik', 'air', 'internet'];

  data.forEach((tx) => {
    if (tx.tipe_transaksi === 'Pengeluaran') {
      const items = (tx.rincian_barang && tx.rincian_barang.length > 0)
        ? tx.rincian_barang
        : [{
            kode_rekening: '5.1.02.01.01.0028',
            uraian_barang: tx.keterangan || 'Belanja Alat Kebersihan',
            volume: 1,
            satuan: 'paket',
            harga_satuan: tx.total_pengeluaran_bku,
            jumlah_transaksi: tx.total_pengeluaran_bku
          }];

      items.forEach((item) => {
        const u = (item.uraian_barang || '').toLowerCase();
        if (nonBarangKeywords.some((k) => u.includes(k))) return;

        const isMatch = keywords.some((k) => u.includes(k) || (item.kode_rekening || '').includes('0028') || (item.kode_rekening || '').includes('0030'));
        if (isMatch) {
          count += 1;
          total += item.jumlah_transaksi;
        }
      });
    }
  });

  return { count, total };
}

/**
 * Membuat Objek MonthlyArchive lengkap dari data & metadata
 */
export function createMonthlyArchive(
  data: TransaksiBKU[],
  metadata: Partial<SchoolMetadata>,
  options?: {
    customBulanTahun?: string;
    bkuFileName?: string;
    rkasFileName?: string;
    id?: string;
    rkasItems?: RKASItem[];
  }
): MonthlyArchive {
  const { bulanTahun, bulan, tahun } = detectMonthYearFromData(
    data,
    options?.customBulanTahun || metadata.bulanTahun,
    options?.bkuFileName
  );

  const totalPenerimaan = data
    .filter((d) => d.tipe_transaksi === 'Pemasukan')
    .reduce((acc, d) => acc + (d.total_pemasukan_bku || 0), 0);

  const totalPengeluaran = data
    .filter((d) => d.tipe_transaksi === 'Pengeluaran')
    .reduce((acc, d) => {
      const rSum = d.rincian_barang?.reduce((subAcc, r) => subAcc + (r.jumlah_transaksi || 0), 0) || 0;
      return acc + (rSum > 0 ? rSum : (d.total_pengeluaran_bku || 0));
    }, 0);

  const itemCount = data.reduce((acc, d) => acc + (d.rincian_barang ? d.rincian_barang.length : 0), 0);
  const atkStats = getAtkStatsFromData(data);
  const alkebStats = getAlkebStatsFromData(data);

  const id = options?.id || `${tahun}-${(bulan || '').toLowerCase()}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    id,
    bulanTahun,
    bulan,
    tahun,
    uploadedAt: `${dateStr}, ${timeStr}`,
    bkuFileName: options?.bkuFileName,
    rkasFileName: options?.rkasFileName,
    data,
    rkasItems: options?.rkasItems,
    metadata: {
      ...metadata,
      bulanTahun
    },
    totalPenerimaan,
    totalPengeluaran,
    saldoAkhir: totalPenerimaan - totalPengeluaran,
    transactionCount: data.length,
    itemCount,
    atkItemCount: atkStats.count,
    atkTotalNominal: atkStats.total,
    alkebItemCount: alkebStats.count,
    alkebTotalNominal: alkebStats.total,
    isVerified: true
  };
}
