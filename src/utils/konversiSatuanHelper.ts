/**
 * Helper Konversi Satuan Pembelian (Grosir/Pack/Lusin) ke Satuan Distribusi Guru (Pcs/Buah/Batang)
 * Digunakan pada LPJ ATK & ALKEB BOSP
 */

export interface KonversiDistribusi {
  satuanBeli: string;
  faktorKonversi: number; // Misal 1 lusin = 12, 1 pack = 12
  satuanDistribusi: string; // 'pcs' / 'buah' / 'batang'
}

/**
 * Aturan konversi default berbasis nama barang dan satuan beli
 */
export function detectDefaultKonversi(satuanBeli: string, namaBarang: string = ''): { faktor: number; satuanDistribusi: string } {
  const sat = (satuanBeli || '').toLowerCase().trim();
  const nama = (namaBarang || '').toLowerCase();

  // 1. Satuan LUSIN -> Selalu 12 pcs / buah / batang
  if (sat.includes('lusin') || sat.includes('lsn') || sat.includes('doz') || sat.includes('dozen')) {
    if (nama.includes('spidol') || nama.includes('pulpen') || nama.includes('pena') || nama.includes('pensil') || nama.includes('ballpoint')) {
      return { faktor: 12, satuanDistribusi: 'batang' };
    }
    return { faktor: 12, satuanDistribusi: 'pcs' };
  }

  // 2. Satuan PACK / PAK
  if (sat.includes('pack') || sat.includes('pak') || sat.includes('bungkus') || sat.includes('bks')) {
    // Spidol whiteboard, pulpen, pensil biasanya 12 batang per pack
    if (nama.includes('spidol') || nama.includes('pulpen') || nama.includes('pena') || nama.includes('pensil') || nama.includes('ballpoint') || nama.includes('crayon') || nama.includes('marker')) {
      return { faktor: 12, satuanDistribusi: 'batang' };
    }
    // Baterai, klip kertas, kapur, lem stik
    if (nama.includes('baterai') || nama.includes('klip') || nama.includes('paper clip') || nama.includes('penjepit') || nama.includes('penghapus')) {
      return { faktor: 10, satuanDistribusi: 'pcs' };
    }
    // Masker, sarung tangan plastik
    if (nama.includes('masker') || nama.includes('sarung tangan')) {
      return { faktor: 50, satuanDistribusi: 'pcs' };
    }
    // Default pack lainnya
    return { faktor: 12, satuanDistribusi: 'pcs' };
  }

  // 3. Satuan BOX / DUS
  if (sat.includes('box') || sat.includes('dus') || sat.includes('kotak')) {
    if (nama.includes('spidol') || nama.includes('pulpen') || nama.includes('pena') || nama.includes('pensil') || nama.includes('ballpoint')) {
      return { faktor: 12, satuanDistribusi: 'batang' };
    }
    if (nama.includes('kapur') || nama.includes('chalk')) {
      return { faktor: 50, satuanDistribusi: 'batang' };
    }
    if (nama.includes('klip') || nama.includes('trigonal')) {
      return { faktor: 10, satuanDistribusi: 'kotak kecil' };
    }
    if (nama.includes('sabun') || nama.includes('desinfektan') || nama.includes('karbol') || nama.includes('handwash')) {
      return { faktor: 12, satuanDistribusi: 'botol' };
    }
    if (nama.includes('tisu') || nama.includes('tissue')) {
      return { faktor: 12, satuanDistribusi: 'pack' };
    }
    return { faktor: 12, satuanDistribusi: 'buah' };
  }

  // 4. Satuan GROSS (144 pcs)
  if (sat.includes('gross') || sat.includes('gros')) {
    return { faktor: 144, satuanDistribusi: 'pcs' };
  }

  // 5. Satuan KODI (20 pcs)
  if (sat.includes('kodi')) {
    return { faktor: 20, satuanDistribusi: 'lembar' };
  }

  // 6. Satuan RIM (Kertas) - jika dibagikan per rim, tetap 1 rim, tapi jika dibagikan lembaran bisa 500
  if (sat.includes('rim')) {
    // Di sekolah biasanya kertas dibagikan per rim ke ruang guru / kelas, jadi tetap 1 rim
    return { faktor: 1, satuanDistribusi: 'rim' };
  }

  // 7. Satuan SET
  if (sat.includes('set')) {
    return { faktor: 1, satuanDistribusi: 'set' };
  }

  // 8. Satuan eceran standar (buah, botol, lembar, galon, meter, roll, paket, unit, pcs)
  return { faktor: 1, satuanDistribusi: sat || 'buah' };
}

/**
 * Cek apakah satuan barang ini tergolong kemasan grosir/kelipatan yang layak di-convert
 */
export function isKemasanGrosir(satuan: string): boolean {
  const s = (satuan || '').toLowerCase().trim();
  return (
    s.includes('lusin') ||
    s.includes('lsn') ||
    s.includes('pack') ||
    s.includes('pak') ||
    s.includes('box') ||
    s.includes('dus') ||
    s.includes('kotak') ||
    s.includes('gross') ||
    s.includes('kodi')
  );
}
