import React from 'react';
import { TransaksiBKU, SchoolMetadata } from '../types';
import { formatRupiah } from './SummaryCards';
import { terbilang } from '../utils/terbilang';
import { Building2 } from 'lucide-react';

export type PaperSize = 'A4' | 'F4';
export type DensityMode = 'auto' | 'normal' | 'compact' | 'tight';

interface SingleKwitansiProps {
  transaction: TransaksiBKU;
  metadata: SchoolMetadata;
  customKota?: string;
  customTanggalCetak?: string;
  paperSize?: PaperSize;
  density?: DensityMode;
}

export const SingleKwitansi: React.FC<SingleKwitansiProps> = ({
  transaction,
  metadata,
  customKota = 'Bogor',
  customTanggalCetak,
  paperSize = 'A4',
  density = 'auto'
}) => {
  const nominal = transaction.total_pengeluaran_bku > 0
    ? transaction.total_pengeluaran_bku
    : transaction.total_pemasukan_bku;

  const terbilangStr = terbilang(nominal);
  const itemCount = transaction.rincian_barang.length;

  // Determine effective density
  let effectiveDensity: 'normal' | 'compact' | 'tight' = 'normal';
  if (density === 'auto') {
    if (itemCount > 8) {
      effectiveDensity = 'tight';
    } else if (itemCount > 3) {
      effectiveDensity = 'compact';
    } else {
      effectiveDensity = 'normal';
    }
  } else {
    effectiveDensity = density as 'normal' | 'compact' | 'tight';
  }

  const primaryKodeRekening = transaction.rincian_barang[0]?.kode_rekening || '-';

  // Spacing styling classes depending on density
  const headerPadding = effectiveDensity === 'tight' ? 'pb-1.5 mb-2' : effectiveDensity === 'compact' ? 'pb-2 mb-3' : 'pb-3 mb-4';
  const logoSize = effectiveDensity === 'tight' ? 'w-11 h-11' : effectiveDensity === 'compact' ? 'w-12 h-12' : 'w-14 h-14';
  const titleMargin = effectiveDensity === 'tight' ? 'my-1' : effectiveDensity === 'compact' ? 'my-2' : 'my-3';
  const formSpacing = effectiveDensity === 'tight' ? 'space-y-1 text-xs' : effectiveDensity === 'compact' ? 'space-y-1.5 text-xs' : 'space-y-2.5 text-xs sm:text-sm';
  const tableCellPad = effectiveDensity === 'tight' ? 'py-0.5 px-2 text-[10px]' : effectiveDensity === 'compact' ? 'py-1 px-2.5 text-[11px]' : 'py-1.5 px-3 text-xs';
  const signatureHeight = effectiveDensity === 'tight' ? 'h-34' : effectiveDensity === 'compact' ? 'h-38' : 'h-46';
  const containerPadding = effectiveDensity === 'tight' ? 'p-4 sm:p-5' : effectiveDensity === 'compact' ? 'p-5 sm:p-6' : 'p-6 sm:p-8';

  return (
    <div
      className={`kwitansi-page ${paperSize === 'F4' ? 'paper-f4 paper-container-f4' : 'paper-a4 paper-container-a4'} bg-white text-slate-900 ${containerPadding} rounded-lg border border-slate-900 shadow-sm mx-auto font-serif transition-all`}
    >
      {/* Header / Kop Kwitansi Resmi Sekolah */}
      <div className={`border-b-2 border-slate-900 ${headerPadding}`}>
        <div className="flex items-center justify-between gap-3">
          <div className={`${logoSize} flex items-center justify-center border border-slate-400 rounded bg-white text-slate-700 shrink-0 print:border-black overflow-hidden p-0.5`}>
            {metadata.logoUrl ? (
              <img
                src={metadata.logoUrl}
                alt="Logo Sekolah"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className="w-6 h-6 text-slate-800" />
            )}
          </div>

          <div className="text-center flex-1">
            <p className="text-[10px] sm:text-[11px] uppercase font-sans tracking-wider text-slate-600 font-semibold leading-tight">
              Pemerintah {metadata.provinsi} &bull; Dinas Pendidikan {metadata.kabupatenKota}
            </p>
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight font-sans text-slate-900 leading-tight">
              {metadata.namaSekolah}
            </h1>
            <p className="text-[10px] sm:text-[11px] font-sans text-slate-600 leading-tight">
              NPSN: {metadata.npsn} &bull; Alamat: {metadata.desaKecamatan}, {metadata.kabupatenKota}
            </p>
            <p className="text-[9px] sm:text-[10px] font-sans text-slate-500 font-medium leading-tight">
              Sumber Dana: {metadata.sumberDana} &bull; Tahun Anggaran {metadata.bulanTahun.split(' ')[1] || '2026'}
            </p>
          </div>

          <div className="text-right shrink-0 border border-slate-900 px-2.5 py-1.5 rounded bg-slate-50 font-sans print:border-black">
            <div className="text-[9px] text-slate-500 uppercase font-bold">No. BKU / BNU</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-slate-900">
              {transaction.no_bku !== '-' ? transaction.no_bku : 'KAS-MASUK'}
            </div>
          </div>
        </div>
      </div>

      {/* Kwitansi Title */}
      <div className={`text-center ${titleMargin}`}>
        <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-slate-900 underline underline-offset-2 sm:underline-offset-4 decoration-2">
          KWITANSI / BUKTI PEMBAYARAN PENGELUARAN
        </h2>
        <p className="text-[10px] sm:text-xs font-sans text-slate-600 mt-0.5 font-medium">
          Nomor Bukti: {transaction.no_bku !== '-' ? `${transaction.no_bku}/BOSP/${metadata.bulanTahun.replace(' ', '/')}` : 'NON-BNU'}
        </p>
      </div>

      {/* Main Form Fields */}
      <div className={`${formSpacing} font-sans mt-2`}>
        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-3 font-semibold text-slate-700">Sudah Terima Dari</div>
          <div className="col-span-1 text-center font-bold">:</div>
          <div className="col-span-8 font-medium text-slate-900 truncate">
            Bendahara BOSP {metadata.namaSekolah}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-3 font-semibold text-slate-700">Uang Sejumlah</div>
          <div className="col-span-1 text-center font-bold">:</div>
          <div className="col-span-8">
            <div className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs sm:text-sm inline-block print:bg-slate-50 print:border-black">
              {formatRupiah(nominal)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-3 font-semibold text-slate-700">Terbilang</div>
          <div className="col-span-1 text-center font-bold">:</div>
          <div className="col-span-8 font-semibold italic text-slate-900 bg-amber-50/70 px-2 py-0.5 border border-amber-200 rounded print:bg-white print:border-slate-400 text-[11px] sm:text-xs">
            "{terbilangStr}"
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-3 font-semibold text-slate-700">Untuk Pembayaran</div>
          <div className="col-span-1 text-center font-bold">:</div>
          <div className="col-span-8 text-slate-900 font-medium">
            {transaction.keterangan || transaction.rincian_barang[0]?.uraian_barang || 'Belanja Keperluan Operasional Sekolah BOSP'}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-baseline">
          <div className="col-span-3 font-semibold text-slate-700">Kode Rekening</div>
          <div className="col-span-1 text-center font-bold">:</div>
          <div className="col-span-8 font-mono text-slate-800 text-[11px] truncate">
            {primaryKodeRekening} &mdash; {transaction.rincian_barang[0]?.uraian_barang}
          </div>
        </div>
      </div>

      {/* Rincian Barang / Jasa Table */}
      <div className="mt-2.5 border border-slate-300 rounded overflow-hidden print:border-black">
        <div className="px-2.5 py-1 bg-slate-100 font-sans font-bold text-[10px] sm:text-[11px] text-slate-800 border-b border-slate-300 flex items-center justify-between print:bg-slate-200 print:border-black">
          <span>Rincian Barang / Jasa yang Diterima</span>
          <span className="font-normal text-slate-600">
            Total {transaction.rincian_barang.length} Item
          </span>
        </div>

        <table className="w-full text-left font-sans border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-[10px] print:border-black">
              <th className="py-1 px-2 w-7 text-center border-r border-slate-300 print:border-black">No</th>
              <th className="py-1 px-2.5 border-r border-slate-300 print:border-black">Nama Barang / Uraian Kegiatan</th>
              <th className="py-1 px-2 w-14 text-center border-r border-slate-300 print:border-black">Volume</th>
              <th className="py-1 px-2 w-16 border-r border-slate-300 print:border-black">Satuan</th>
              <th className="py-1 px-2.5 w-24 text-right border-r border-slate-300 print:border-black">Harga Satuan</th>
              <th className="py-1 px-2.5 w-28 text-right">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 print:divide-black">
            {transaction.rincian_barang.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/40">
                <td className={`${tableCellPad} text-center font-mono border-r border-slate-200 text-slate-600 print:border-black`}>
                  {idx + 1}
                </td>
                <td className={`${tableCellPad} font-medium text-slate-900 border-r border-slate-200 print:border-black`}>
                  {item.uraian_barang}
                </td>
                <td className={`${tableCellPad} text-center font-mono font-semibold text-slate-800 border-r border-slate-200 print:border-black`}>
                  {item.volume !== null ? item.volume : '-'}
                </td>
                <td className={`${tableCellPad} text-slate-700 border-r border-slate-200 print:border-black`}>
                  {item.satuan !== null ? item.satuan : '-'}
                </td>
                <td className={`${tableCellPad} text-right font-mono text-slate-800 border-r border-slate-200 print:border-black`}>
                  {item.harga_satuan !== null ? formatRupiah(item.harga_satuan) : '-'}
                </td>
                <td className={`${tableCellPad} text-right font-mono font-semibold text-slate-900`}>
                  {formatRupiah(item.jumlah_transaksi)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t border-slate-400 text-slate-900 print:bg-slate-100 print:border-black">
              <td colSpan={5} className="py-1 px-2.5 text-right font-sans uppercase text-[10px] border-r border-slate-300 print:border-black">
                Total Pembayaran:
              </td>
              <td className="py-1 px-2.5 text-right font-mono text-xs font-bold text-slate-900">
                {formatRupiah(nominal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tanggal & Tempat Cetak */}
      <div className="mt-2.5 text-right font-sans text-[11px] text-slate-700 font-medium">
        {customKota}, {customTanggalCetak || transaction.tanggal || '06 Februari 2026'}
      </div>

      {/* 2 Signature Blocks (Tanda Tangan Pejabat: Kepala Sekolah & Bendahara) */}
      <div className="mt-2 grid grid-cols-2 gap-6 text-center font-sans text-xs">
        {/* 1. Setuju Dibayar Kepala Sekolah */}
        <div className={`flex flex-col justify-between ${signatureHeight} p-2 border border-slate-200 rounded print:border-none`}>
          <div>
            <p className="font-semibold text-slate-600 uppercase text-[10px]">Setuju Dibayar,</p>
            <p className="font-bold text-slate-900 text-[11px]">Kepala Sekolah</p>
          </div>

          <div className="my-auto text-[9px] text-slate-400 italic print:hidden">
            (Tanda Tangan & Stempel)
          </div>

          <div className="pt-1 border-t border-slate-300 print:border-black">
            <p className="font-bold text-slate-900 underline text-[11px] truncate">{metadata.kepalaSekolah}</p>
            <p className="text-[9px] text-slate-600 font-mono">NIP. {metadata.nipKepalaSekolah}</p>
          </div>
        </div>

        {/* 2. Lunas Dibayar Bendahara */}
        <div className={`flex flex-col justify-between ${signatureHeight} p-2 border border-slate-200 rounded print:border-none`}>
          <div>
            <p className="font-semibold text-slate-600 uppercase text-[10px]">Lunas Dibayar,</p>
            <p className="font-bold text-slate-900 text-[11px]">Bendahara BOSP</p>
          </div>

          <div className="my-auto text-[9px] text-slate-400 italic print:hidden">
            (Tanda Tangan)
          </div>

          <div className="pt-1 border-t border-slate-300 print:border-black">
            <p className="font-bold text-slate-900 underline text-[11px] truncate">{metadata.bendahara}</p>
            <p className="text-[9px] text-slate-600 font-mono">NIP. {metadata.nipBendahara}</p>
          </div>
        </div>
      </div>

      {/* Footer Info Kwitansi */}
      <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] font-sans text-slate-400 print:text-black">
        <span>Sistem Pembukuan BKU & RKAS BOSP &bull; Pas 1 Halaman {paperSize} (Fit Paper)</span>
        <span className="font-mono">BNU: {transaction.no_bku} | Arsip SPJ BOSP</span>
      </div>
    </div>
  );
};
