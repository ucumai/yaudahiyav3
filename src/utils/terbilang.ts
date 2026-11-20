/**
 * Helper function to convert numeric Indonesian Rupiah to formal Terbilang text
 * e.g., 990000 -> "Sembilan Ratus Sembilan Puluh Ribu Rupiah"
 */

const satuanWords = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function convertUnderThousand(num: number): string {
  if (num === 0) return '';
  if (num < 12) return satuanWords[num];
  if (num < 20) return satuanWords[num - 10] + ' Belas';
  if (num < 100) return satuanWords[Math.floor(num / 10)] + ' Puluh' + (num % 10 !== 0 ? ' ' + satuanWords[num % 10] : '');
  if (num < 200) return 'Seratus' + (num % 100 !== 0 ? ' ' + convertUnderThousand(num % 100) : '');
  return satuanWords[Math.floor(num / 100)] + ' Ratus' + (num % 100 !== 0 ? ' ' + convertUnderThousand(num % 100) : '');
}

export function terbilang(nominal: number): string {
  if (isNaN(nominal) || nominal === 0) return 'Nol Rupiah';
  if (nominal < 0) return 'Minus ' + terbilang(Math.abs(nominal));

  nominal = Math.floor(nominal);

  let result = '';

  // Triliun
  if (nominal >= 1000000000000) {
    const triliun = Math.floor(nominal / 1000000000000);
    result += convertUnderThousand(triliun) + ' Triliun ';
    nominal %= 1000000000000;
  }

  // Milyar
  if (nominal >= 1000000000) {
    const milyar = Math.floor(nominal / 1000000000);
    result += convertUnderThousand(milyar) + ' Milyar ';
    nominal %= 1000000000;
  }

  // Juta
  if (nominal >= 1000000) {
    const juta = Math.floor(nominal / 1000000);
    result += convertUnderThousand(juta) + ' Juta ';
    nominal %= 1000000;
  }

  // Ribu
  if (nominal >= 1000) {
    const ribu = Math.floor(nominal / 1000);
    if (ribu === 1) {
      result += 'Seribu ';
    } else {
      result += convertUnderThousand(ribu) + ' Ribu ';
    }
    nominal %= 1000;
  }

  // Sisa ratusan
  if (nominal > 0) {
    result += convertUnderThousand(nominal) + ' ';
  }

  return result.trim().replace(/\s+/g, ' ') + ' Rupiah';
}
