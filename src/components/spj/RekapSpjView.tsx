import React, { useState, useMemo } from 'react';
import { TransaksiBKU, SchoolMetadata } from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { formatRupiah } from '../SummaryCards';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  Tag
} from 'lucide-react';

interface RekapSpjViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
}

export const RekapSpjView: React.FC<RekapSpjViewProps> = ({ data, metadata }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tanggalLaporan, setTanggalLaporan] = useState('28 Februari 2026');

  const pengeluaranList = useMemo(() => {
    return data.filter((d) => d.tipe_transaksi === 'Pengeluaran');
  }, [data]);

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return pengeluaranList;
    const term = searchTerm.toLowerCase();
    return pengeluaranList.filter(
      (tx) =>
        (tx.no_bku && tx.no_bku.toLowerCase().includes(term)) ||
        (tx.keterangan || '').toLowerCase().includes(term) ||
        (tx.rincian_barang || []).some(
          (r) =>
            (r.kode_rekening && r.kode_rekening.toLowerCase().includes(term)) ||
            (r.uraian_barang && r.uraian_barang.toLowerCase().includes(term))
        )
    );
  }, [pengeluaranList, searchTerm]);

  const totalFilteredNominal = useMemo(() => {
    return filteredList.reduce((acc, curr) => acc + curr.total_pengeluaran_bku, 0);
  }, [filteredList]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = 'No,Tanggal,No BKU,Kode Rekening,Uraian Barang/Jasa,Volume,Satuan,Harga Satuan (Rp),Total Transaksi (Rp),Status Berkas SPJ\n';
    let rowIdx = 1;
    const rows: string[] = [];

    filteredList.forEach((tx) => {
      tx.rincian_barang.forEach((child) => {
        rows.push(
          `"${rowIdx++}","${tx.tanggal}","${tx.no_bku}","${child.kode_rekening}","${child.uraian_barang}","${child.volume || 1}","${child.satuan || 'Pkt'}","${child.harga_satuan || child.jumlah_transaksi}","${child.jumlah_transaksi}","Lengkap (Kwitansi BNU & Faktur)"`
        );
      });
    });

    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_SPJ_BOSP_${metadata.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}_2026.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari no BKU, kode rekening, uraian belanja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Rekap SPJ
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 max-w-5xl mx-auto font-sans text-slate-900 text-xs sm:text-[12px] leading-relaxed">
        {/* Kop Surat */}
        <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-4" />

        {/* Title */}
        <div className="text-center space-y-1 mb-5">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider underline text-slate-900">
            REKAPITULASI BUKTI SURAT PERTANGGUNGJAWABAN (SPJ) BELANJA BOSP
          </h3>
          <p className="text-[11.5px] font-bold text-slate-700 uppercase">
            SUMBER DANA: {metadata.sumberDana} &bull; BULAN / PERIODE: {metadata.bulanTahun}
          </p>
        </div>

        {/* Table of SPJ items */}
        <table className="w-full border border-slate-300 text-[11px]">
          <thead className="bg-slate-100 font-bold text-slate-900 border-b-2 border-slate-300">
            <tr>
              <th className="border border-slate-300 p-1.5 text-center w-7">No</th>
              <th className="border border-slate-300 p-1.5 text-center w-20">Tanggal</th>
              <th className="border border-slate-300 p-1.5 text-center w-16">No. BKU</th>
              <th className="border border-slate-300 p-1.5 text-center w-28">Kode Rekening</th>
              <th className="border border-slate-300 p-1.5 text-left">Uraian Transaksi / Belanja</th>
              <th className="border border-slate-300 p-1.5 text-center w-16">Volume</th>
              <th className="border border-slate-300 p-1.5 text-right w-20">Tarif (Rp)</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Jumlah SPJ (Rp)</th>
              <th className="border border-slate-300 p-1.5 text-center w-24">Status Berkas</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                  Tidak ditemukan transaksi belanja SPJ.
                </td>
              </tr>
            ) : (
              filteredList.map((tx, txIdx) => (
                <React.Fragment key={tx.no_bku || txIdx}>
                  {tx.rincian_barang.map((item, itemIdx) => (
                    <tr key={`${tx.no_bku}-${itemIdx}`} className="hover:bg-slate-50 print:hover:bg-transparent">
                      {itemIdx === 0 && (
                        <>
                          <td rowSpan={tx.rincian_barang.length} className="border border-slate-300 p-1.5 text-center font-mono align-top">
                            {txIdx + 1}
                          </td>
                          <td rowSpan={tx.rincian_barang.length} className="border border-slate-300 p-1.5 text-center font-mono align-top">
                            {tx.tanggal}
                          </td>
                          <td rowSpan={tx.rincian_barang.length} className="border border-slate-300 p-1.5 text-center font-mono font-bold text-indigo-900 align-top">
                            {tx.no_bku}
                          </td>
                        </>
                      )}
                      <td className="border border-slate-300 p-1.5 font-mono text-[10px] text-slate-700 text-center">
                        {item.kode_rekening}
                      </td>
                      <td className="border border-slate-300 p-1.5">
                        <span className="font-semibold text-slate-900">{item.uraian_barang}</span>
                      </td>
                      <td className="border border-slate-300 p-1.5 text-center font-mono text-[10.5px]">
                        {item.volume ? `${item.volume} ${item.satuan || ''}` : '-'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-[10.5px]">
                        {item.harga_satuan ? formatRupiah(item.harga_satuan) : '-'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900 text-[10.5px]">
                        {formatRupiah(item.jumlah_transaksi)}
                      </td>
                      {itemIdx === 0 && (
                        <td rowSpan={tx.rincian_barang.length} className="border border-slate-300 p-1.5 text-center align-middle">
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Lengkap
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <tr>
              <td colSpan={7} className="border border-slate-300 p-2 text-right text-slate-900">
                TOTAL REALISASI SPJ BELANJA BOSP:
              </td>
              <td className="border border-slate-300 p-2 text-right font-mono text-emerald-900 font-bold">
                {formatRupiah(totalFilteredNominal)}
              </td>
              <td className="border border-slate-300 p-2 bg-slate-200/50"></td>
            </tr>
          </tfoot>
        </table>

        {/* TTD */}
        <div className="pt-8 text-xs font-sans">
          <div className="flex justify-between items-end">
            <div className="space-y-16 text-center w-64">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">Dibuat & Diverifikasi Oleh,</p>
                <p className="font-bold text-slate-900">Bendahara BOSP</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 underline">{metadata.bendahara}</p>
                <p className="text-[10px] text-slate-600 font-mono">NIP. {metadata.nipBendahara}</p>
              </div>
            </div>

            <div className="space-y-16 text-center w-64">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">{metadata.desaKecamatan || 'Bogor'}, {tanggalLaporan}</p>
                <p className="font-bold text-slate-900">Kepala Satuan Pendidikan</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 underline">{metadata.kepalaSekolah}</p>
                <p className="text-[10px] text-slate-600 font-mono">NIP. {metadata.nipKepalaSekolah}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
