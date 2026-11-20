import { RKASItem, RincianBarang, TransaksiBKU, MonthlyArchive } from '../types';
import { normalizeText, normalizeKodeRekening, rkasFebruaryCatalog } from './rkasCatalog';
import { MONTH_NAMES_ID } from './monthArchiveUtils';

export interface SmartMatchResult {
  matchedItem: RKASItem | null;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  kodeRekening: string;
  kodeKegiatan?: string;
  isCrossMonth: boolean;
  sourceMonthName?: string;
  sourceMonthIndex?: number;
  matchTier: 'same_month' | 'prior_month_fifo' | 'global_pool' | 'future_month' | 'none';
  matchNote?: string;
}

// Kamus kata henti umum transaksi belanja sekolah agar tidak menghasilkan token match palsu
const TRANSACTION_STOP_WORDS = new Set([
  'pembayaran', 'belanja', 'pembelian', 'pengadaan', 'biaya', 'ongkos',
  'keperluan', 'kegiatan', 'kebutuhan', 'operasional', 'bosp', 'dana',
  'tahun', 'anggaran', 'untuk', 'dan', 'yang', 'atau', 'pada', 'di',
  'ke', 'dari', 'dengan', 'sdn', 'sekolah', 'tahap', 'semester', 'bulan',
  'honor', 'honorarium', 'transaksi', 'rincian', 'kertas', 'kerja'
]);

/**
 * Normalisasi sinonim kata barang & jasa sekolah agar pencocokan teks lebih cerdas
 */
export function normalizeSynonyms(text: string): string {
  let cleaned = normalizeText(text);

  // Kamus sinonim barang / kegiatan operasional sekolah
  const synonymRules: Array<[RegExp, string]> = [
    // Alat Kebersihan
    [/\b(alat\s*pel|kain\s*pel|pelan)\b/g, 'pel'],
    [/\b(sabun\s*cuci\s*tangan|sabun\s*tangan|cuci\s*tangan)\b/g, 'hand soap'],
    [/\b(pembersih\s*lantai|karbol|wipol|sos|super\s*pel)\b/g, 'pembersih lantai'],
    [/\b(sapu\s*ijuk|sapu\s*lantai|sapu\s*nilon)\b/g, 'sapu'],
    [/\b(sapu\s*lidi\s*tangkai|sapu\s*lidi\s*gagang)\b/g, 'sapu lidi tangkai'],
    [/\b(tempat\s*sampah|tong\s*sampah|bak\s*sampah)\b/g, 'tempat sampah'],
    [/\b(plastik\s*sampah|kantong\s*sampah|trash\s*bag)\b/g, 'kantong sampah'],
    [/\b(tisu\s*toilet|tissue\s*gulung|tisu\s*roll)\b/g, 'tisu roll'],

    // ATK
    [/\b(kertas\s*hvs|hvs\s*kertas|kertas\s*fotocopy)\b/g, 'kertas hvs'],
    [/\b(70\s*gr|70\s*gram|70gsm)\b/g, '70gr'],
    [/\b(80\s*gr|80\s*gram|80gsm)\b/g, '80gr'],
    [/\b(pulpen|bolpoin|ballpoint|pena)\b/g, 'ballpoint'],
    [/\b(spidol\s*wb|spidol\s*whiteboard|spidol\s*papan)\b/g, 'spidol whiteboard'],
    [/\b(tinta\s*spidol|refill\s*spidol)\b/g, 'tinta spidol'],
    [/\b(tinta\s*printer|tinta\s*epson|tinta\s*canon)\b/g, 'tinta printer'],
    [/\b(buku\s*tulis|buku\s*catatan)\b/g, 'buku'],
    [/\b(map\s*kertas|map\s*folio|stopmap)\b/g, 'map'],

    // Operasional & Daya
    [/\b(tagihan\s*listrik|pembayaran\s*listrik|token\s*listrik|pln)\b/g, 'listrik'],
    [/\b(tagihan\s*internet|langganan\s*wifi|indihome|speedy)\b/g, 'internet'],
    [/\b(honorarium|pembayaran\s*honor|gaji)\b/g, 'honor'],
    [/\b(konsumsi|snack\s*makan|kue\s*kotak|snack\s*box)\b/g, 'konsumsi snack']
  ];

  for (const [regex, replacement] of synonymRules) {
    cleaned = cleaned.replace(regex, replacement);
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Ekstraksi volume, satuan, dan tarif eksplisit dari teks uraian BKU
 * Contoh:
 * - "Pembelian Kertas HVS 5 rim" -> vol: 5, satuan: 'rim'
 * - "Belanja Konsumsi Rapat 25 Kotak" -> vol: 25, satuan: 'kotak'
 * - "Pembelian Spidol Whiteboard 12 Buah @ 15.000" -> vol: 12, satuan: 'buah', tarif: 15000
 */
export function extractVolumeAndSatuanFromUraian(
  uraian: string,
  nominal: number
): {
  volume: number;
  satuan: string;
  hargaSatuan: number;
  hasExtractedQty: boolean;
} {
  if (!uraian) {
    return { volume: 1, satuan: 'buah', hargaSatuan: nominal, hasExtractedQty: false };
  }

  const unitPatterns =
    '(?:rim|botol|buah|pcs|kotak|box|pack|dus|lembar|keping|roll|rol|set|paket|meter|bulan|per\\s*bulan|orang|orang\\s*\\/\\s*hari|unit|galon|liter|kg|buku|tabung|sachet)';

  // Pattern: [Angka] [Satuan]
  const qtyUnitRegex = new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s*(${unitPatterns})\\b`, 'i');
  const matchQty = uraian.match(qtyUnitRegex);

  // Pattern: @ [Harga]
  const atPriceRegex = /@\s*(?:rp\.?)?\s*([\d.]+)/i;
  const matchAt = uraian.match(atPriceRegex);

  let extractedVol = 0;
  let extractedSat = '';
  let extractedTarif = 0;

  if (matchQty) {
    const rawNum = matchQty[1].replace(',', '.');
    const parsedNum = parseFloat(rawNum);
    if (parsedNum > 0 && parsedNum < 100000) {
      extractedVol = parsedNum;
      extractedSat = matchQty[2].trim().toLowerCase();
    }
  }

  if (matchAt) {
    const rawPrice = matchAt[1].replace(/\./g, '');
    const parsedPrice = parseInt(rawPrice, 10);
    if (parsedPrice > 0) {
      extractedTarif = parsedPrice;
    }
  }

  if (extractedVol > 0 && nominal > 0) {
    if (extractedTarif > 0 && Math.abs(extractedVol * extractedTarif - nominal) < 10) {
      return {
        volume: extractedVol,
        satuan: extractedSat || 'buah',
        hargaSatuan: extractedTarif,
        hasExtractedQty: true
      };
    }
    const calcPrice = Math.round(nominal / extractedVol);
    return {
      volume: extractedVol,
      satuan: extractedSat || 'buah',
      hargaSatuan: calcPrice > 0 ? calcPrice : nominal,
      hasExtractedQty: true
    };
  }

  return { volume: 1, satuan: 'buah', hargaSatuan: nominal, hasExtractedQty: false };
}

/**
 * Menghitung skor kemiripan antara transaksi BKU dan item RKAS (0 - 100+)
 */
export function calculateMatchScore(
  bkuKodeRek: string,
  bkuUraian: string,
  bkuNominal: number,
  rkasItem: RKASItem
): { score: number; matchTierName: string } {
  const normBkuUraian = normalizeSynonyms(bkuUraian);
  const normRkasUraian = normalizeSynonyms(rkasItem.uraian);
  const cleanBkuKode = normalizeKodeRekening(bkuKodeRek);
  const cleanRkasKode = normalizeKodeRekening(rkasItem.kode_rekening);

  if (!normBkuUraian || !normRkasUraian) {
    return { score: 0, matchTierName: 'none' };
  }

  let score = 0;
  let matchTierName = 'none';

  // 1. Uraian Exact Match
  if (normBkuUraian === normRkasUraian) {
    score += 100;
    matchTierName = 'exact_uraian';
  } else if (normBkuUraian.includes(normRkasUraian) || normRkasUraian.includes(normRkuUraianSafe(normBkuUraian, normRkasUraian))) {
    score += 70;
    matchTierName = 'substring_uraian';
  } else {
    // Token overlap dengan eliminasi kata henti umum
    const bkuTokens = normBkuUraian
      .split(' ')
      .filter((t) => t.length > 2 && !TRANSACTION_STOP_WORDS.has(t));
    const rkasTokens = normRkasUraian
      .split(' ')
      .filter((t) => t.length > 2 && !TRANSACTION_STOP_WORDS.has(t));

    let matchCount = 0;
    for (const bt of bkuTokens) {
      if (rkasTokens.includes(bt)) matchCount++;
    }

    if (matchCount > 0 && Math.max(bkuTokens.length, rkasTokens.length) > 0) {
      const overlapRatio = matchCount / Math.max(bkuTokens.length, rkasTokens.length);
      score += Math.round(overlapRatio * 60);
      matchTierName = 'token_overlap';
    }
  }

  // 2. Kode Rekening Agreement
  if (cleanBkuKode && cleanRkasKode && cleanBkuKode !== '-') {
    if (cleanBkuKode === cleanRkasKode) {
      score += 40;
    } else if (cleanBkuKode.startsWith(cleanRkasKode) || cleanRkasKode.startsWith(cleanBkuKode)) {
      score += 30;
    } else if (cleanBkuKode.slice(0, 8) === cleanRkasKode.slice(0, 8)) {
      score += 20;
    }
  }

  // 3. Mathematical Nominal Fit (Harga Satuan / Kelipatan)
  if (bkuNominal > 0 && rkasItem.tarif_harga > 0) {
    if (bkuNominal === rkasItem.jumlah) {
      score += 35;
    } else if (bkuNominal === rkasItem.tarif_harga) {
      score += 25;
    } else if (bkuNominal % rkasItem.tarif_harga === 0) {
      const vol = Math.round(bkuNominal / rkasItem.tarif_harga);
      if (vol > 0 && vol <= (rkasItem.volume || 100)) {
        score += 20;
      }
    }
  }

  return { score, matchTierName };
}

function normRkuUraianSafe(bku: string, rkas: string): string {
  return rkas.length > 3 && bku.includes(rkas) ? rkas : '';
}

/**
 * Mesin Pencocokan Lintas Bulan (Cross-Month Smart Match Engine)
 * Menyelesaikan masalah transaksi BKU di bulan berjalan yang mentransaksikan
 * rincian belanja RKAS yang dianggarkan di bulan-bulan sebelumnya (FIFO Carry-Over).
 */
export class CrossMonthMatchEngine {
  private rkasPool: RKASItem[] = [];
  private defaultTargetMonth: number = 2; // Default Februari

  constructor(initialPool: RKASItem[] = [], defaultTargetMonth: number = 2) {
    this.defaultTargetMonth = defaultTargetMonth;
    this.initializePool(initialPool);
  }

  /**
   * Inisialisasi pool RKAS dengan saldo sisa awal
   */
  public initializePool(items: RKASItem[]): void {
    this.rkasPool = items.map((it, idx) => {
      const monthIdx = it.monthIndex || (it.bulan ? this.getMonthIndexFromName(it.bulan) : undefined);
      const bulanName = it.bulan || (monthIdx ? MONTH_NAMES_ID[monthIdx - 1] : undefined);

      return {
        ...it,
        id: it.id || `rkas_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`,
        monthIndex: monthIdx,
        bulan: bulanName,
        sisa_volume: it.sisa_volume !== undefined ? it.sisa_volume : (it.volume || 1),
        sisa_jumlah: it.sisa_jumlah !== undefined ? it.sisa_jumlah : (it.jumlah || (it.tarif_harga || 0) * (it.volume || 1)),
        terserap_di: it.terserap_di ? [...it.terserap_di] : []
      };
    });
  }

  private getMonthIndexFromName(name: string): number {
    const clean = name.trim().toLowerCase();
    for (let i = 0; i < MONTH_NAMES_ID.length; i++) {
      if (clean.includes(MONTH_NAMES_ID[i].toLowerCase())) {
        return i + 1;
      }
    }
    return 2;
  }

  /**
   * Cari pasangan RKAS untuk transaksi BKU menggunakan aturan prioritas lintas bulan:
   * 1. Bulan yang sama (Current Month)
   * 2. Bulan-bulan sebelumnya secara FIFO (Prior Month Carry-Over: Bulan 1, 2, ..., targetMonth - 1)
   * 3. Pool global tanpa batas bulan
   * 4. Bulan berikutnya (Advance Realization)
   */
  public matchTransactionItem(params: {
    kodeRekening: string;
    uraian: string;
    nominal: number;
    targetMonthIndex?: number;
    noBukti?: string;
  }): SmartMatchResult {
    const targetMonth = params.targetMonthIndex || this.defaultTargetMonth;
    const targetMonthName = MONTH_NAMES_ID[targetMonth - 1] || 'Februari';

    // Filter kandidat yang masih memiliki kuota sisa (atau jika belum ter-set, gunakan semua)
    const availablePool = this.rkasPool.filter((item) => {
      const sisaVol = item.sisa_volume !== undefined ? item.sisa_volume : item.volume;
      const sisaJml = item.sisa_jumlah !== undefined ? item.sisa_jumlah : item.jumlah;
      return sisaVol > 0 || sisaJml > 0;
    });

    const candidatePool = availablePool.length > 0 ? availablePool : this.rkasPool;

    // Hitung skor untuk semua kandidat
    interface EvaluatedCandidate {
      item: RKASItem;
      rawScore: number;
      finalScore: number;
      tier: 'same_month' | 'prior_month_fifo' | 'global_pool' | 'future_month';
      itemMonth: number;
      matchTierName: string;
    }

    const evaluated: EvaluatedCandidate[] = [];

    for (const item of candidatePool) {
      const { score: rawScore, matchTierName } = calculateMatchScore(
        params.kodeRekening,
        params.uraian,
        params.nominal,
        item
      );

      // Hanya proses item dengan skor dasar kemiripan minimal
      if (rawScore < 20) continue;

      const itemMonth = item.monthIndex || (item.bulan ? this.getMonthIndexFromName(item.bulan) : 0);
      let tier: 'same_month' | 'prior_month_fifo' | 'global_pool' | 'future_month' = 'global_pool';
      let tierBoost = 0;

      if (itemMonth === targetMonth) {
        // Prioritas 1: Bulan Berjalan (Dominan dan diutamakan tanpa tertukar bulan lalu)
        tier = 'same_month';
        tierBoost = 100;
      } else if (itemMonth > 0 && itemMonth < targetMonth) {
        // Prioritas 2: Bulan Sebelumnya (FIFO Carry-Over)
        // Hanya diizinkan jika kesamaan nama barang substansial (skor minimal 45)
        // guna mencegah penyerapan salah sasaran dari RKAS bulan sebelumnya
        if (rawScore < 45) continue;
        tier = 'prior_month_fifo';
        const age = targetMonth - itemMonth;
        tierBoost = 25 - Math.min(age, 3) * 2;
      } else if (!itemMonth || itemMonth === 0) {
        // Prioritas 3: Global Pool
        if (rawScore < 40) continue;
        tier = 'global_pool';
        tierBoost = 15;
      } else {
        // Prioritas 4: Bulan Masa Depan
        if (rawScore < 50) continue;
        tier = 'future_month';
        tierBoost = 5;
      }

      evaluated.push({
        item,
        rawScore,
        finalScore: rawScore + tierBoost,
        tier,
        itemMonth,
        matchTierName
      });
    }

    // Urutkan kandidat berdasarkan finalScore tertinggi
    evaluated.sort((a, b) => b.finalScore - a.finalScore);

    const best = evaluated.length > 0 ? evaluated[0] : null;

    // Periksa apakah ada uraian BKU yang secara eksplisit memuat volume dan satuan
    const extractedFromUraian = extractVolumeAndSatuanFromUraian(params.uraian, params.nominal);

    if (!best || best.rawScore < 30) {
      // Tidak ditemukan kecocokan RKAS yang meyakinkan
      let fallbackVol = extractedFromUraian.hasExtractedQty ? extractedFromUraian.volume : 1;
      let fallbackSat = extractedFromUraian.hasExtractedQty ? extractedFromUraian.satuan : 'buah';
      let fallbackTarif = extractedFromUraian.hasExtractedQty ? extractedFromUraian.hargaSatuan : params.nominal;

      return {
        matchedItem: null,
        volume: fallbackVol,
        satuan: fallbackSat,
        hargaSatuan: fallbackTarif,
        kodeRekening: params.kodeRekening !== '-' ? params.kodeRekening : '5.1.02.03.02.0120',
        isCrossMonth: false,
        matchTier: 'none'
      };
    }

    const matchedItem = best.item;
    // Hanya anggap lintas bulan jika benar-benar berasal dari bulan berbeda dan bukan bulan berjalan
    const isCrossMonth = best.itemMonth > 0 && best.itemMonth !== targetMonth && best.tier === 'prior_month_fifo';
    const sourceMonthName = best.itemMonth > 0 ? MONTH_NAMES_ID[best.itemMonth - 1] : targetMonthName;

    // -------------------------------------------------------------------------
    // PERHITUNGAN VOLUME, SATUAN & HARGA SATUAN DENGAN INTEGRITAS MATEMATIKA 100%
    // -------------------------------------------------------------------------
    let volume = 1;
    let satuan = matchedItem.satuan || 'buah';
    let hargaSatuan = params.nominal;

    // Kasus 1: Teks BKU memuat kuantitas eksplisit (misal: "5 rim", "12 botol", "25 kotak")
    if (extractedFromUraian.hasExtractedQty && extractedFromUraian.volume > 0) {
      volume = extractedFromUraian.volume;
      satuan = extractedFromUraian.satuan || matchedItem.satuan || 'buah';
      hargaSatuan = extractedFromUraian.hargaSatuan;
    }
    // Kasus 2: Cocok dengan tarif harga satuan RKAS dan habis dibagi bulat (Clean Multiple)
    else if (matchedItem.tarif_harga && matchedItem.tarif_harga > 0 && params.nominal % matchedItem.tarif_harga === 0) {
      volume = Math.max(1, Math.round(params.nominal / matchedItem.tarif_harga));
      hargaSatuan = matchedItem.tarif_harga;
      satuan = matchedItem.satuan || 'buah';
    }
    // Kasus 3: Nominal sama persis dengan total pagu item RKAS
    else if (params.nominal === matchedItem.jumlah && matchedItem.volume && matchedItem.volume > 0) {
      volume = matchedItem.volume;
      hargaSatuan = matchedItem.tarif_harga || Math.round(params.nominal / volume);
      satuan = matchedItem.satuan || 'buah';
    }
    // Kasus 4: Nominal habis dibagi dengan volume RKAS
    else if (matchedItem.volume && matchedItem.volume > 0 && params.nominal % matchedItem.volume === 0) {
      volume = matchedItem.volume;
      hargaSatuan = params.nominal / volume;
      satuan = matchedItem.satuan || 'buah';
    }
    // Kasus 5: Nominal mendekati kelipatan tarif RKAS (toleransi deviasi < 3%)
    else if (matchedItem.tarif_harga && matchedItem.tarif_harga > 0) {
      const approxVol = Math.round(params.nominal / matchedItem.tarif_harga);
      if (approxVol > 0 && Math.abs(approxVol * matchedItem.tarif_harga - params.nominal) / params.nominal < 0.03) {
        volume = approxVol;
        hargaSatuan = Math.round(params.nominal / volume);
      } else {
        // Tetap volume 1 agar volume * hargaSatuan = nominal 100% konsisten
        volume = 1;
        hargaSatuan = params.nominal;
      }
      satuan = matchedItem.satuan || 'buah';
    }
    // Kasus 6: Fallback aman
    else {
      volume = 1;
      hargaSatuan = params.nominal;
      satuan = matchedItem.satuan || 'buah';
    }

    // Koreksi akhir: pastikan volume minimal 1 dan tidak pernah menghasilkan NaN / 0
    if (volume <= 0 || isNaN(volume)) volume = 1;
    if (hargaSatuan <= 0 || isNaN(hargaSatuan)) hargaSatuan = params.nominal;

    // Kurangi sisa kuota (Budget Consumption Tracking)
    if (matchedItem.sisa_volume !== undefined) {
      matchedItem.sisa_volume = Math.max(0, matchedItem.sisa_volume - volume);
    }
    if (matchedItem.sisa_jumlah !== undefined) {
      matchedItem.sisa_jumlah = Math.max(0, matchedItem.sisa_jumlah - params.nominal);
    }

    // Catat riwayat penyerapan
    if (!matchedItem.terserap_di) matchedItem.terserap_di = [];
    matchedItem.terserap_di.push({
      bulan: targetMonthName,
      monthIndex: targetMonth,
      no_bku: params.noBukti || '-',
      volume,
      nominal: params.nominal
    });

    const explanation = isCrossMonth
      ? `Menyerap sisa RKAS Bulan ${sourceMonthName} (${matchedItem.uraian} @ Rp ${hargaSatuan.toLocaleString('id-ID')})`
      : undefined;

    return {
      matchedItem,
      volume,
      satuan: satuan || 'buah',
      hargaSatuan,
      kodeRekening: matchedItem.kode_rekening || params.kodeRekening,
      kodeKegiatan: matchedItem.kode_program,
      isCrossMonth,
      sourceMonthName,
      sourceMonthIndex: best.itemMonth > 0 ? best.itemMonth : undefined,
      matchTier: best.tier,
      matchNote: explanation
    };
  }

  /**
   * Ambil salinan pool saat ini beserta sisa anggaran
   */
  public getPool(): RKASItem[] {
    return [...this.rkasPool];
  }

  /**
   * Ringkasan statistik penyerapan lintas bulan
   */
  public getStats(): {
    totalItems: number;
    absorbedItems: number;
    remainingVolume: number;
    remainingBudget: number;
  } {
    let absorbedCount = 0;
    let remVol = 0;
    let remBudget = 0;

    for (const item of this.rkasPool) {
      if (item.terserap_di && item.terserap_di.length > 0) absorbedCount++;
      remVol += item.sisa_volume ?? item.volume ?? 0;
      remBudget += item.sisa_jumlah ?? item.jumlah ?? 0;
    }

    return {
      totalItems: this.rkasPool.length,
      absorbedItems: absorbedCount,
      remainingVolume: remVol,
      remainingBudget: remBudget
    };
  }
}

/**
 * Membangun Master Cumulative RKAS Pool dari berbagai sumber:
 * - Katalog RKAS hasil upload saat ini (diberikan targetMonthIndex aktif sebagai default)
 * - Arsip bulanan yang tersimpan di monthlyStore (Januari - Desember)
 * - Fallback katalog default
 */
export function buildCumulativeRKASPool(
  currentRkasCatalog: RKASItem[] = [],
  monthlyArchives?: Record<number, MonthlyArchive | null>,
  extraCatalog?: RKASItem[],
  targetMonthIndex: number = 2
): RKASItem[] {
  const masterPool: RKASItem[] = [];
  const itemSignatureSet = new Set<string>();

  const addUniqueItem = (item: RKASItem, defaultMonthIdx?: number) => {
    const normName = normalizeText(item.uraian || '');
    const cleanKode = normalizeKodeRekening(item.kode_rekening || '');
    const mIdx = item.monthIndex || defaultMonthIdx || (item.bulan ? getMonthIndex(item.bulan) : undefined);
    const signature = `${cleanKode}__${normName}__${mIdx || 'global'}`;

    if (!itemSignatureSet.has(signature) && normName.length > 1) {
      itemSignatureSet.add(signature);
      masterPool.push({
        ...item,
        id: item.id || `rkas_pool_${masterPool.length + 1}`,
        monthIndex: mIdx,
        bulan: item.bulan || (mIdx ? MONTH_NAMES_ID[mIdx - 1] : undefined),
        sisa_volume: item.sisa_volume !== undefined ? item.sisa_volume : item.volume,
        sisa_jumlah: item.sisa_jumlah !== undefined ? item.sisa_jumlah : item.jumlah
      });
    }
  };

  function getMonthIndex(name: string): number {
    const clean = name.trim().toLowerCase();
    for (let i = 0; i < MONTH_NAMES_ID.length; i++) {
      if (clean.includes(MONTH_NAMES_ID[i].toLowerCase())) {
        return i + 1;
      }
    }
    return targetMonthIndex;
  }

  // 1. Tambahkan item RKAS dari katalog saat ini (prioritas tinggi sesuai targetMonthIndex)
  if (Array.isArray(currentRkasCatalog) && currentRkasCatalog.length > 0) {
    for (const item of currentRkasCatalog) {
      addUniqueItem(item, targetMonthIndex);
    }
  }

  // 2. Tambahkan item RKAS dari arsip bulanan (monthlyArchives)
  if (monthlyArchives && typeof monthlyArchives === 'object') {
    for (let m = 1; m <= 12; m++) {
      const archive = monthlyArchives[m];
      if (archive && Array.isArray(archive.rkasItems) && archive.rkasItems.length > 0) {
        for (const item of archive.rkasItems) {
          addUniqueItem(item, m);
        }
      }
    }
  }

  // 3. Tambahkan extraCatalog jika disediakan
  if (Array.isArray(extraCatalog) && extraCatalog.length > 0) {
    for (const item of extraCatalog) {
      addUniqueItem(item, targetMonthIndex);
    }
  }

  // 4. Jika pool masih kosong, gunakan default rkasFebruaryCatalog untuk targetMonthIndex
  if (masterPool.length === 0) {
    for (const item of rkasFebruaryCatalog) {
      addUniqueItem(item, targetMonthIndex);
    }
  }

  return masterPool;
}
