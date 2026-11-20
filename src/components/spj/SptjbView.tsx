import React, { useState, useMemo } from 'react';
import { TransaksiBKU, SchoolMetadata } from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { formatRupiah } from '../SummaryCards';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';

interface SptjbViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
}

export const SptjbView: React.FC<SptjbViewProps> = ({ data, metadata }) => {
  const [nomorSptjb, setNomorSptjb] = useState('421.2/028/SPTJB-BOSP/II/2026');
  const [tanggalSptjb, setTanggalSptjb] = useState('28 Februari 2026');
  const [tahapBosp, setTahapBosp] = useState('Tahap I (Januari - Juni)');
  const [tahunAnggaran, setTahunAnggaran] = useState('2026');

  // Filter transactions
  const pengeluaranList = useMemo(() => {
    return data.filter((d) => d.tipe_transaksi === 'Pengeluaran');
  }, [data]);

  const totalPemasukan = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.total_pemasukan_bku || 0), 0);
  }, [data]);

  const totalPengeluaran = useMemo(() => {
    return pengeluaranList.reduce((acc, curr) => acc + (curr.total_pengeluaran_bku || 0), 0);
  }, [pengeluaranList]);

  const sisaSaldo = totalPemasukan - totalPengeluaran;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  const handleDownloadTxt = () => {
    const text = `
SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTJB)
BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP)
TAHUN ANGGARAN ${tahunAnggaran}
Nomor: ${nomorSptjb}

Yang bertanda tangan di bawah ini:
Nama                    : ${metadata.kepalaSekolah}
NIP                     : ${metadata.nipKepalaSekolah}
Jabatan                 : Kepala Sekolah ${metadata.namaSekolah}
NPSN                    : ${metadata.npsn}
Alamat Satuan Pendidikan: ${metadata.alamatLengkap || metadata.desaKecamatan}

Menyatakan dengan sesungguhnya bahwa:
1. Bertanggung jawab penuh atas penggunaan dan realisasi dana Bantuan Operasional Satuan Pendidikan (BOSP) ${tahapBosp} Tahun Anggaran ${tahunAnggaran} sebesar:
   - Jumlah Penerimaan Kas  : ${formatRupiah(totalPemasukan)}
   - Jumlah Belanja / SPJ   : ${formatRupiah(totalPengeluaran)}
   - Sisa Saldo Kas / Bank  : ${formatRupiah(sisaSaldo)}

2. Pengeluaran dana tersebut di atas telah dibukukan dalam Buku Kas Umum (BKU), didukung dengan bukti pengeluaran yang lengkap dan sah (Kwitansi, Faktur/Nota, SPTJB, Tanda Terima) sesuai peraturan perundang-undangan.

3. Bukti-bukti pengeluaran tersebut disimpan pada Satuan Pendidikan untuk kelengkapan administrasi pemeriksaan oleh aparat pengawas fungsional (Inspektorat / BPK).

4. Apabila di kemudian hari terbukti terdapat kekeliruan atau ketidaksesuaian yang merugikan keuangan Negara/Daerah, kami bersedia bertanggung jawab sepenuhnya dan menyetorkan kembali ke Kas Daerah/Negara.

${metadata.desaKecamatan || 'Bogor'}, ${tanggalSptjb}

Kepala Satuan Pendidikan,
${metadata.namaSekolah}



${metadata.kepalaSekolah}
NIP. ${metadata.nipKepalaSekolah}
    `.trim();

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPTJB_BOSP_${metadata.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}_2026.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar - No Print */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nomor Surat SPTJB:
              </label>
              <input
                type="text"
                value={nomorSptjb}
                onChange={(e) => setNomorSptjb(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tanggal Penetapan:
              </label>
              <input
                type="text"
                value={tanggalSptjb}
                onChange={(e) => setTanggalSptjb(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tahap Penyaluran BOSP:
              </label>
              <input
                type="text"
                value={tahapBosp}
                onChange={(e) => setTahapBosp(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export TXT
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF SPTJB
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-slate-300 rounded-2xl p-8 sm:p-12 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 max-w-4xl mx-auto font-serif text-slate-900 text-xs sm:text-[13px] leading-relaxed">
        {/* Kop Surat Resmi */}
        <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-6" />

        {/* Title Header */}
        <div className="text-center space-y-1 mb-8">
          <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider underline font-sans text-slate-900">
            SURAT PERNYATAAN TANGGUNG JAWAB BELANJA (SPTJB)
          </h3>
          <p className="text-xs font-sans font-bold text-slate-700 uppercase">
            BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) REGULER
          </p>
          <p className="text-[11px] font-sans font-mono text-slate-600">
            Nomor: {nomorSptjb}
          </p>
        </div>

        {/* Isi Surat */}
        <div className="space-y-4 font-sans text-[12.5px] leading-relaxed">
          <p>Yang bertanda tangan di bawah ini:</p>

          <table className="w-full pl-4">
            <tbody>
              <tr>
                <td className="w-48 py-1 font-medium text-slate-700">1. Nama Lengkap</td>
                <td className="w-4 py-1">:</td>
                <td className="py-1 font-bold text-slate-900">{metadata.kepalaSekolah}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-slate-700">2. NIP</td>
                <td className="py-1">:</td>
                <td className="py-1 font-mono text-slate-900">{metadata.nipKepalaSekolah}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-slate-700">3. Jabatan</td>
                <td className="py-1">:</td>
                <td className="py-1 text-slate-900">Kepala {metadata.namaSekolah}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-slate-700">4. NPSN</td>
                <td className="py-1">:</td>
                <td className="py-1 font-mono text-slate-900">{metadata.npsn}</td>
              </tr>
              <tr>
                <td className="py-1 font-medium text-slate-700">5. Alamat Satuan Pendidikan</td>
                <td className="py-1">:</td>
                <td className="py-1 text-slate-800">{metadata.alamatLengkap || metadata.desaKecamatan}</td>
              </tr>
            </tbody>
          </table>

          <p className="pt-2 text-justify">
            Dengan ini menyatakan dengan sesungguhnya bahwa saya bertanggung jawab penuh atas penggunaan dan pertanggungjawaban dana Bantuan Operasional Satuan Pendidikan (BOSP) {tahapBosp} Tahun Anggaran {tahunAnggaran} dengan rincian realisasi keuangan sebagai berikut:
          </p>

          {/* Rincian Kas Table */}
          <table className="w-full border border-slate-300 my-3 text-xs">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-10">No</th>
                <th className="border border-slate-300 p-2 text-left">Uraian Rekapitulasi Kas BOSP</th>
                <th className="border border-slate-300 p-2 text-right w-44">Jumlah Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2 text-center font-mono">1</td>
                <td className="border border-slate-300 p-2 font-medium">Penerimaan Dana Kas BOSP (Saldo Bank Awal + Penyaluran)</td>
                <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
                  {formatRupiah(totalPemasukan)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2 text-center font-mono">2</td>
                <td className="border border-slate-300 p-2 font-medium">Total Realisasi Belanja Operasional ({pengeluaranList.length} Transaksi BKU/BNU)</td>
                <td className="border border-slate-300 p-2 text-right font-mono font-bold text-rose-800">
                  {formatRupiah(totalPengeluaran)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-300 p-2 text-center font-mono">3</td>
                <td className="border border-slate-300 p-2 text-slate-800">Sisa Saldo Kas / Bank per Akhir Periode BKU</td>
                <td className="border border-slate-300 p-2 text-right font-mono text-emerald-800">
                  {formatRupiah(sisaSaldo)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-justify leading-relaxed">
            Bukti-bukti pengeluaran yang sah dan lengkap berupa Kwitansi Pengeluaran BNU, Nota/Faktur Pembelian, Daftar Tanda Terima Honorarium, Berita Acara Penerimaan Barang, dan berkas pendukung lainnya telah diverifikasi dan disimpan secara tertib pada arsip Satuan Pendidikan untuk keperluan audit/pemeriksaan oleh aparat pengawas fungsional (Inspektorat / BPK).
          </p>

          <p className="text-justify leading-relaxed">
            Demikian Surat Pernyataan Tanggung Jawab Belanja (SPTJB) ini dibuat dengan sebenarnya dan penuh rasa tanggung jawab.
          </p>
        </div>

        {/* Tanda Tangan */}
        <div className="pt-10 font-sans text-xs">
          <div className="flex justify-between items-end">
            <div className="space-y-16 text-center w-64">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">Mengetahui / Memverifikasi,</p>
                <p className="font-bold text-slate-900">Bendahara BOSP</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 underline">{metadata.bendahara}</p>
                <p className="text-[10px] text-slate-600 font-mono">NIP. {metadata.nipBendahara}</p>
              </div>
            </div>

            <div className="space-y-16 text-center w-64">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">{metadata.desaKecamatan || 'Bogor'}, {tanggalSptjb}</p>
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
