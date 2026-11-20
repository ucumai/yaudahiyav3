

const SATUAN_ANGKA = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

export function angkaKeTeks(n: number): string {
  if (n < 12) return SATUAN_ANGKA[n];
  if (n < 20) return `${angkaKeTeks(n - 10)} Belas`;
  if (n < 100) return `${angkaKeTeks(Math.floor(n / 10))} Puluh ${SATUAN_ANGKA[n % 10]}`.trim();
  if (n < 200) return `Seratus ${angkaKeTeks(n - 100)}`.trim();
  if (n < 1000) return `${angkaKeTeks(Math.floor(n / 100))} Ratus ${angkaKeTeks(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${angkaKeTeks(n - 1000)}`.trim();
  if (n < 1000000) return `${angkaKeTeks(Math.floor(n / 1000))} Ribu ${angkaKeTeks(n % 1000)}`.trim();
  return n.toString();
}

export function tahunKeTeks(tahun: number): string {
  // Misal 2026 -> Dua Ribu Dua Puluh Enam
  return angkaKeTeks(tahun);
}

export interface NarasiTanggalBAST {
  hari: string;
  tanggalAngka: string;
  bulan: string;
  tahun: string;
  tahunTerbilang: string;
  fullNarasi: string;
}

export function parseTanggalBAST(tglInput: string): NarasiTanggalBAST {
  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanArr = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  let dateObj = new Date();
  if (tglInput) {
    const parsed = new Date(tglInput);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  const hari = hariArr[dateObj.getDay()];
  const tanggalAngka = dateObj.getDate().toString();
  const bulan = bulanArr[dateObj.getMonth()];
  const tahunNum = dateObj.getFullYear();
  const tahunTerbilang = tahunKeTeks(tahunNum);

  const fullNarasi = `Pada hari ini ${hari} tanggal ${tanggalAngka} bulan ${bulan} tahun ${tahunTerbilang}, Kami yang bertanda tangan di bawah ini :`;

  return {
    hari,
    tanggalAngka,
    bulan,
    tahun: tahunNum.toString(),
    tahunTerbilang,
    fullNarasi
  };
}

/**
 * Format Nomor Surat Standar Kedinasan
 * Contoh: 800.1.11.1/174-20200235
 */
export function formatNomorSuratKedinasan(noUrut: number | string, npsn: string): string {
  const cleanNpsn = npsn || '20200235';
  return `800.1.11.1/${noUrut}-${cleanNpsn}`;
}
