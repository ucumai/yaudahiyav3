import { KlasifikasiSPJ, TransaksiBKU, MasterEskul } from '../types';

export interface KlasifikasiOption {
  value: KlasifikasiSPJ;
  label: string;
  shortLabel: string;
  badgeClass: string;
  pillClass: string;
  description: string;
  iconSymbol: string;
}

export const KLASIFIKASI_SPJ_OPTIONS: KlasifikasiOption[] = [
  {
    value: 'Honorarium',
    label: 'Honorarium',
    shortLabel: 'Honor',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200/70',
    pillClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Honorarium guru, pelatih eskul, narasumber, transport panitia & PPh 21',
    iconSymbol: '💼'
  },
  {
    value: 'Ekstrakurikuler',
    label: 'Ekstrakurikuler',
    shortLabel: 'Eskul',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200/70',
    pillClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Kegiatan ekstrakurikuler, honor pelatih eskul, pembinaan minat bakat',
    iconSymbol: '🏆'
  },
  {
    value: 'ATK',
    label: 'ATK',
    shortLabel: 'ATK',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200/70',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Alat Tulis Kantor, Kertas HVS, Tinta Printer, Map, Administrasi Kantor',
    iconSymbol: '📦'
  },
  {
    value: 'ALKEB',
    label: 'ALKEB',
    shortLabel: 'ALKEB',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200/70',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Alat Kebersihan, Pembersih Lantai, Sabun, Sapu, Pel, Trash Bag',
    iconSymbol: '🧹'
  },
  {
    value: 'Kegiatan',
    label: 'Kegiatan',
    shortLabel: 'Kegiatan',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200/70',
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Cetak Soal, Ujian/Asesmen, Konsumsi Rapat, Spanduk, Lomba, PPDB',
    iconSymbol: '🎯'
  },
  {
    value: 'Perbaikan',
    label: 'Perbaikan',
    shortLabel: 'Perbaikan',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200/70',
    pillClass: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Pemeliharaan Sarpras, Service Komputer/Printer/AC, Bahan Perbaikan',
    iconSymbol: '🔧'
  },
  {
    value: 'Komunitas Belajar',
    label: 'Komunitas Belajar',
    shortLabel: 'Kombel',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200/70',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Pekan Pembinaan, Komunitas Belajar (Kombel), PMM, KKG & Diseminasi Guru',
    iconSymbol: '👥'
  },
  {
    value: 'Lainnya',
    label: 'Lainnya',
    shortLabel: 'Lainnya',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/70',
    pillClass: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Belanja umum lainnya (Daya & Jasa, Langganan Internet, Listrik, dsb)',
    iconSymbol: '📄'
  }
];

export function getKlasifikasiBadgeClass(klasifikasi?: KlasifikasiSPJ): string {
  const match = KLASIFIKASI_SPJ_OPTIONS.find((opt) => opt.value === klasifikasi);
  return match?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-300';
}

export function getKlasifikasiPillClass(klasifikasi?: KlasifikasiSPJ): string {
  const match = KLASIFIKASI_SPJ_OPTIONS.find((opt) => opt.value === klasifikasi);
  return match?.pillClass || 'bg-slate-50 text-slate-700 border-slate-200';
}

export function getKlasifikasiIcon(klasifikasi?: KlasifikasiSPJ): string {
  const match = KLASIFIKASI_SPJ_OPTIONS.find((opt) => opt.value === klasifikasi);
  return match?.iconSymbol || '📄';
}

/**
 * Otomatis mendeteksi klasifikasi SPJ transaksi BKU berdasarkan:
 * - Uraian barang / rincian barang
 * - Keterangan transaksi BKU
 * - Kode rekening
 * - Kode kegiatan BKU
 */
export function detectDefaultKlasifikasiSPJ(
  uraian: string = '',
  keterangan: string = '',
  kodeRekening: string = '',
  kodeKegiatan: string = ''
): KlasifikasiSPJ {
  const text = `${uraian} ${keterangan} ${kodeRekening} ${kodeKegiatan}`.toLowerCase();

  // 1. Honorarium: Guru, gaji, honor, instruktur, pelatih, narasumber, transport panitia, upah
  if (
    /honor|gaji|upah|pelatih|instruktur|narasumber|pemateri|jasa kerja|jasa ptk|guru\b|wali kelas|transport panitia|transport petugas|insentif/i.test(text) ||
    /5\.1\.02\.02|5\.1\.02\.04/i.test(text) ||
    /07\.12\.01/i.test(text)
  ) {
    return 'Honorarium';
  }

  // 2. ALKEB: Alat kebersihan & sanitasi
  if (
    /kebersihan|alkeb|sabun|pel\b|sapu|desinfektan|karbol|deterjen|wipol|kamper|tisu|plastik sampah|pengki|sikat|pembersih|keset|kemoceng|handsanitizer|sanitasi|trash bag|lap pel|ember|kamper/i.test(text) ||
    /0028|0030/i.test(text)
  ) {
    return 'ALKEB';
  }

  // 3. ATK: Alat tulis kantor, kertas, map, spidol, pulpen, buku, toner, tinta printer, dll
  if (
    /atk\b|alat tulis|hvs|kertas|folio|spidol|pulpen|ballpoint|pena\b|buku\b|map\b|toner|tinta|bku|kuitansi|kwitansi|amplop|binder|stapler|hecter|stempel|gunting|penggaris|penghapus|lakban|lem\b|post it|tipex|cartridge/i.test(text) ||
    /0024|0025/i.test(text)
  ) {
    return 'ATK';
  }

  // 4. Perbaikan / Pemeliharaan: Servis, service, rehab, renovasi, pengecatan, perbaikan kran, ac, genteng, kusen, kunci, tukang
  if (
    /perbaikan|pemeliharaan|servis|service|rehab|renovasi|cat\b|pengecatan|ganti kran|kran air|instalasi listrik|ac\b|genteng|kusen|kunci|bengkel/i.test(text) ||
    /5\.1\.02\.03/i.test(text)
  ) {
    return 'Perbaikan';
  }

  // 5. Komunitas Belajar: Kombel, pekan pembinaan, komunitas belajar, kkg, mgmp, diseminasi guru, pmm
  if (
    /kombel|komunitas belajar|pekan pembinaan|pembinaan guru|pembinaan rutin|kkg\b|mgmp\b|berbagi praktik baik/i.test(text)
  ) {
    return 'Komunitas Belajar';
  }

  // 6. Kegiatan: Ujian, asesmen, anbk, cetak soal, konsumsi, makan, minum, snack, rapat, lomba, spanduk, banner, eskul, kepramukaan, ppdb, mpls, workshop
  if (
    /kegiatan|ujian|asesmen|anbk|soal|cetak|penggandaan|fotocopy|snack|makan|minum|konsumsi|kue|katering|catering|nasi kotak|spanduk|banner|co-card|id card|lomba|eskul|ekstrakurikuler|pramuka|ppdb|mpls|workshop|rapat/i.test(text) ||
    /08\.04\.06/i.test(text)
  ) {
    return 'Kegiatan';
  }

  return 'Lainnya';
}

/**
 * Memastikan setiap transaksi BKU memiliki properti `klasifikasi`.
 * Jika belum ada, auto-detect berdasarkan isi transaksi.
 */
export function ensureTransactionsClassification(transactions: TransaksiBKU[]): TransaksiBKU[] {
  return transactions.map((tx) => {
    if (tx.klasifikasi) {
      return tx;
    }
    const firstItem = tx.rincian_barang?.[0];
    const autoKlasifikasi = detectDefaultKlasifikasiSPJ(
      firstItem?.uraian_barang || '',
      tx.keterangan || '',
      firstItem?.kode_rekening || '',
      tx.kode_kegiatan || ''
    );
    return {
      ...tx,
      klasifikasi: autoKlasifikasi
    };
  });
}

/**
 * Mencocokkan transaksi BKU dengan Data Master Eskul
 * 1. Prioritas ID eksplisit jika sudah ditag (tx.eskulId)
 * 2. Cocokkan No. BKU Terkait pada Master Eskul
 * 3. Cocokkan Kata Kunci BKU pada Master Eskul
 * 4. Cocokkan Nama Eskul / Kategori / Nama Pelatih di uraian transaksi
 */
export function findCorrelatedMasterEskul(
  tx: TransaksiBKU,
  eskuls: MasterEskul[]
): MasterEskul | undefined {
  if (!eskuls || eskuls.length === 0) return undefined;

  // 1. Explicit ID
  if (tx.eskulId) {
    const direct = eskuls.find((e) => e.id === tx.eskulId);
    if (direct) return direct;
  }

  const textToSearch = [
    tx.keterangan || '',
    tx.kode_kegiatan || '',
    tx.no_bku || '',
    ...(tx.rincian_barang || []).map((r) => `${r?.uraian_barang || ''} ${r?.kode_rekening || ''}`)
  ]
    .join(' ')
    .toLowerCase();

  // 2. Check noBkuTerkait if set on master eskul
  const matchBku = eskuls.find(
    (e) =>
      e.noBkuTerkait &&
      typeof e.noBkuTerkait === 'string' &&
      e.noBkuTerkait.trim() &&
      tx.no_bku &&
      tx.no_bku.toLowerCase().includes(e.noBkuTerkait.toLowerCase().trim())
  );
  if (matchBku) return matchBku;

  // 3. Check kataKunciBKU on master eskul
  const matchKeyword = eskuls.find((e) => {
    if (!e.kataKunciBKU || typeof e.kataKunciBKU !== 'string' || !e.kataKunciBKU.trim()) return false;
    const kw = e.kataKunciBKU.toLowerCase().trim();
    return textToSearch.includes(kw);
  });
  if (matchKeyword) return matchKeyword;

  // 4. Check namaEskul & common alias (pramuka, drumband, tari, bulutangkis, futsal, dll)
  for (const eskul of eskuls) {
    const rawName = (eskul?.namaEskul || '').toLowerCase().trim();
    if (!rawName) continue;

    if (textToSearch.includes(rawName)) return eskul;

    // Check distinct tokens from name
    const tokens = rawName
      .replace(/ekstrakurikuler|ekstrakulikuler|seni|junior|gudep|gerakan|pelajar/g, '')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 3);

    for (const t of tokens) {
      if (textToSearch.includes(t)) return eskul;
    }

    // Check namaPelatih
    if (eskul.namaPelatih && typeof eskul.namaPelatih === 'string' && eskul.namaPelatih.trim().length > 3) {
      const pelatihTokens = eskul.namaPelatih
        .toLowerCase()
        .split(/[\s&,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 3);
      for (const pt of pelatihTokens) {
        if (textToSearch.includes(pt)) return eskul;
      }
    }
  }

  // 5. Special fallback checks for common standard eskul keywords
  if (textToSearch.includes('pramuka') || textToSearch.includes('siaga') || textToSearch.includes('penggalang')) {
    if (textToSearch.includes('siaga')) {
      const siagaEskul = eskuls.find((e) => (e?.namaEskul || '').toLowerCase().includes('siaga'));
      if (siagaEskul) return siagaEskul;
    }
    if (textToSearch.includes('penggalang')) {
      const penggalangEskul = eskuls.find((e) => (e?.namaEskul || '').toLowerCase().includes('penggalang'));
      if (penggalangEskul) return penggalangEskul;
    }
    return eskuls.find(
      (e) => (e?.namaEskul || '').toLowerCase().includes('pramuka') || e?.kategori === 'Kepanduan'
    );
  }
  if (textToSearch.includes('drumband') || textToSearch.includes('marching')) {
    return eskuls.find(
      (e) =>
        (e?.namaEskul || '').toLowerCase().includes('drumband') ||
        (e?.namaEskul || '').toLowerCase().includes('marching')
    );
  }
  if (textToSearch.includes('tari')) {
    return eskuls.find((e) => (e?.namaEskul || '').toLowerCase().includes('tari'));
  }
  if (textToSearch.includes('bulutangkis') || textToSearch.includes('badminton')) {
    return eskuls.find(
      (e) =>
        (e?.namaEskul || '').toLowerCase().includes('bulutangkis') ||
        (e?.namaEskul || '').toLowerCase().includes('badminton')
    );
  }
  if (textToSearch.includes('futsal') || textToSearch.includes('sepak bola')) {
    return eskuls.find(
      (e) => (e?.namaEskul || '').toLowerCase().includes('futsal') || (e?.namaEskul || '').toLowerCase().includes('bola')
    );
  }

  return undefined;
}

