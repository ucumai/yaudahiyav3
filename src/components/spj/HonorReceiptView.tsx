import React, { useState, useMemo } from 'react';
import { TransaksiBKU, SchoolMetadata, MasterEskul, MasterGuru } from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { formatRupiah } from '../SummaryCards';
import {
  CreditCard,
  Printer,
  Download,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  Percent
} from 'lucide-react';

interface HonorReceiptViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  eskulList: MasterEskul[];
  teachers: MasterGuru[];
}

interface HonorItemRow {
  id: string;
  noBku: string;
  tanggal: string;
  namaPenerima: string;
  jabatan: string;
  golongan: string;
  npwp: string;
  uraianTugas: string;
  volume: number;
  satuan: string;
  tarif: number;
  bruto: number;
  persenPph: number;
  potonganPph: number;
  netto: number;
  noRekening: string;
  bank: string;
}

export const HonorReceiptView: React.FC<HonorReceiptViewProps> = ({
  data,
  metadata,
  eskulList,
  teachers
}) => {
  const [judulKegiatan, setJudulKegiatan] = useState(
    'HONORARIUM JASA PELATIH EKSTRAKURIKULER & GURU TIDAK TETAP'
  );
  const [tanggalDokumen, setTanggalDokumen] = useState('28 Februari 2026');
  const [pphSetting, setPphSetting] = useState<'otomatis' | 'nol' | 'lima_persen'>('otomatis');

  // Compute honor rows from BKU & Eskul Master
  const honorRows: HonorItemRow[] = useMemo(() => {
    const list: HonorItemRow[] = [];

    // 1. From Eskul List linked or matched to BKU
    eskulList.forEach((eskul, idx) => {
      const matchTx = (data || []).find((tx) => {
        if (eskul.noBkuTerkait && tx.no_bku === eskul.noBkuTerkait) return true;
        if (eskul.kataKunciBKU && typeof eskul.kataKunciBKU === 'string' && (tx.keterangan || '').toLowerCase().includes(eskul.kataKunciBKU.toLowerCase())) {
          return true;
        }
        const nameLower = (eskul.namaEskul || '').toLowerCase();
        return (
          (nameLower && (tx.keterangan || '').toLowerCase().includes(nameLower)) ||
          (tx.rincian_barang || []).some((r) => nameLower && (r.uraian_barang || '').toLowerCase().includes(nameLower))
        );
      });

      const itemDetail = matchTx?.rincian_barang?.[0];
      const volume = itemDetail?.volume || 4;
      const satuan = itemDetail?.satuan || 'kegiatan';
      const tarif = itemDetail?.harga_satuan || eskul?.honorPerKegiatan || 75000;
      const bruto = matchTx ? matchTx.total_pengeluaran_bku : volume * tarif;

      // PPh rate
      let persenPph = 0;
      if (pphSetting === 'lima_persen') persenPph = 5;
      else if (pphSetting === 'nol') persenPph = 0;
      else {
        // Non-PNS pelatih with standard SBM often exempt if under PTKP or 5% if NPWP provided
        persenPph = 0; // Default under PTKP for non-PNS monthly SBM
      }

      const potonganPph = Math.round((bruto * persenPph) / 100);
      const netto = bruto - potonganPph;

      list.push({
        id: `eskul-${eskul.id}`,
        noBku: matchTx ? matchTx.no_bku : (eskul.noBkuTerkait || `BNU-0${idx + 3}`),
        tanggal: matchTx ? matchTx.tanggal : '25-02-2026',
        namaPenerima: eskul.namaPelatih || 'Pelatih Ekstrakurikuler',
        jabatan: `Pelatih ${eskul.namaEskul}`,
        golongan: 'Non-ASN',
        npwp: '-',
        uraianTugas: itemDetail?.uraian_barang || `Honorarium Instruktur/Pelatih Ekstrakurikuler ${eskul.namaEskul}`,
        volume,
        satuan,
        tarif,
        bruto,
        persenPph,
        potonganPph,
        netto,
        noRekening: eskul.noRekeningPelatih || '-',
        bank: eskul.bankPelatih || 'Bank BJB'
      });
    });

    // 2. Also check if there are other BKU transactions with "Honor" or "Jasa" not already matched
    data.forEach((tx) => {
      if (tx.tipe_transaksi === 'Pengeluaran') {
        const isAlreadyAdded = list.some((item) => item.noBku === tx.no_bku);
        if (!isAlreadyAdded) {
          const isHonorTx =
            tx.klasifikasi === 'Honorarium' ||
            tx.klasifikasi === 'Ekstrakurikuler' ||
            (tx.keterangan && tx.keterangan.toLowerCase().includes('honor')) ||
            (tx.keterangan && tx.keterangan.toLowerCase().includes('jasa')) ||
            (tx.keterangan && tx.keterangan.toLowerCase().includes('pelatih')) ||
            (tx.rincian_barang || []).some((r) => (r.kode_rekening || '').includes('0029') || (r.kode_rekening || '').includes('0013'));

          if (isHonorTx) {
            const firstItem = tx.rincian_barang[0];
            const volume = firstItem?.volume || 1;
            const satuan = firstItem?.satuan || 'orang / bln';
            const tarif = firstItem?.harga_satuan || tx.total_pengeluaran_bku;
            const bruto = tx.total_pengeluaran_bku;
            const persenPph = 0;
            const potonganPph = 0;
            const netto = bruto - potonganPph;

            list.push({
              id: `bku-${tx.no_bku}`,
              noBku: tx.no_bku,
              tanggal: tx.tanggal,
              namaPenerima: 'Penerima Honor Jasa Terkait',
              jabatan: 'Tenaga Ahli / Instruktur',
              golongan: 'Non-ASN',
              npwp: '-',
              uraianTugas: firstItem?.uraian_barang || tx.keterangan || 'Honorarium Jasa Pelaksana',
              volume,
              satuan,
              tarif,
              bruto,
              persenPph,
              potonganPph,
              netto,
              noRekening: '-',
              bank: 'BJB'
            });
          }
        }
      }
    });

    return list;
  }, [eskulList, data, pphSetting]);

  const totalBruto = honorRows.reduce((acc, curr) => acc + curr.bruto, 0);
  const totalPph = honorRows.reduce((acc, curr) => acc + curr.potonganPph, 0);
  const totalNetto = honorRows.reduce((acc, curr) => acc + curr.netto, 0);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const handleExportCsv = () => {
    const headers = 'No,No BKU,Nama Penerima,Jabatan/Tugas,Golongan,NPWP,Volume,Satuan,Tarif Satuan (Rp),Jumlah Bruto (Rp),PPh (Rp),Jumlah Netto (Rp),Bank / Rekening\n';
    const rows = honorRows
      .map(
        (h, i) =>
          `"${i + 1}","${h.noBku}","${h.namaPenerima}","${h.jabatan}","${h.golongan}","${h.npwp}","${h.volume}","${h.satuan}","${h.tarif}","${h.bruto}","${h.potonganPph}","${h.netto}","${h.bank} ${h.noRekening}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tanda_Terima_Honor_BOSP_${metadata.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Settings Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Judul Daftar Penerimaan Honor:
              </label>
              <input
                type="text"
                value={judulKegiatan}
                onChange={(e) => setJudulKegiatan(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tanggal Tanda Terima:
              </label>
              <input
                type="text"
                value={tanggalDokumen}
                onChange={(e) => setTanggalDokumen(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Daftar Honor
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="a4-print-sheet bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 max-w-5xl mx-auto font-sans text-slate-900 text-xs sm:text-[12px] leading-relaxed print:max-w-none print:w-full">
        {/* Kop Resmi */}
        <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-4" />

        {/* Title */}
        <div className="text-center space-y-1 mb-5">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider underline text-slate-900">
            DAFTAR TANDA TERIMA HONORARIUM / JASA PELAKSANA
          </h3>
          <p className="text-[11.5px] font-bold text-slate-700 uppercase">
            SUMBER DANA: BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) &bull; TAHUN 2026
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            {judulKegiatan} &bull; Periode {metadata.bulanTahun}
          </p>
        </div>

        {/* Table List */}
        <table className="w-full border border-slate-300 text-[11px]">
          <thead className="bg-slate-100 font-bold text-slate-900 border-b-2 border-slate-300">
            <tr>
              <th className="border border-slate-300 p-1.5 text-center w-7">No</th>
              <th className="border border-slate-300 p-1.5 text-left">Nama Penerima & Jabatan</th>
              <th className="border border-slate-300 p-1.5 text-center w-14">No. BKU</th>
              <th className="border border-slate-300 p-1.5 text-center w-16">Volume</th>
              <th className="border border-slate-300 p-1.5 text-right w-20">Tarif (Rp)</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Jumlah Bruto</th>
              <th className="border border-slate-300 p-1.5 text-right w-16">PPh 21</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Diterima (Netto)</th>
              <th className="border border-slate-300 p-1.5 text-center w-28">Tanda Tangan</th>
            </tr>
          </thead>
          <tbody>
            {honorRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="border border-slate-300 p-4 text-center text-slate-400 italic">
                  Tidak ditemukan data honor/pelatih yang tercatat.
                </td>
              </tr>
            ) : (
              honorRows.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                  <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5">
                    <p className="font-bold text-slate-900">{row.namaPenerima}</p>
                    <p className="text-[10px] text-slate-500">
                      {row.jabatan} &bull; Rek: {row.bank} ({row.noRekening})
                    </p>
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-indigo-900">
                    {row.noBku}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-mono">
                    {row.volume} {row.satuan}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono">
                    {formatRupiah(row.tarif)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(row.bruto)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-600">
                    {row.potonganPph > 0 ? formatRupiah(row.potonganPph) : '-'}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-emerald-900">
                    {formatRupiah(row.netto)}
                  </td>
                  <td className="border border-slate-300 p-1.5 align-bottom">
                    <div className="h-10 flex flex-col justify-between">
                      <span className="text-[9px] font-mono text-slate-400">{idx + 1}. .........</span>
                      <span className="text-[9px] text-right text-slate-400 font-mono"></span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <tr>
              <td colSpan={5} className="border border-slate-300 p-2 text-right text-slate-900">
                JUMLAH TOTAL PENERIMAAN HONOR:
              </td>
              <td className="border border-slate-300 p-2 text-right font-mono text-slate-900 font-bold">
                {formatRupiah(totalBruto)}
              </td>
              <td className="border border-slate-300 p-2 text-right font-mono text-slate-700 font-bold">
                {totalPph > 0 ? formatRupiah(totalPph) : 'Rp 0'}
              </td>
              <td className="border border-slate-300 p-2 text-right font-mono text-emerald-900 font-bold">
                {formatRupiah(totalNetto)}
              </td>
              <td className="border border-slate-300 p-2 bg-slate-200/50"></td>
            </tr>
          </tfoot>
        </table>

        {/* TTD Lembar */}
        <div className="pt-8 text-xs font-sans">
          <div className="flex justify-between items-end">
            <div className="space-y-16 text-center w-64">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">Lunas Dibayar,</p>
                <p className="font-bold text-slate-900">Bendahara BOSP</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 underline">{metadata.bendahara}</p>
                <p className="text-[10px] text-slate-600 font-mono">NIP. {metadata.nipBendahara}</p>
              </div>
            </div>

            <div className="space-y-16 text-center w-64">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">{metadata.desaKecamatan || 'Bogor'}, {tanggalDokumen}</p>
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
