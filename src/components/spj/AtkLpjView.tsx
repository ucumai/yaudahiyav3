import React, { useState, useMemo, useEffect } from 'react';
import { TransaksiBKU, SchoolMetadata, LogistikBarang, MonthlyArchive } from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { PrintConfigToolbar } from '../common/PrintConfigToolbar';
import { formatRupiah } from '../SummaryCards';
import { MonthlyArchiveCards } from '../MonthlyArchiveCards';
import {
  FileText,
  Printer,
  Download,
  Search,
  Package,
  CheckCircle2,
  Calendar,
  Building2,
  Tag,
  PenTool,
  Info,
  Sparkles
} from 'lucide-react';

interface AtkLpjViewProps {
  data: TransaksiBKU[];
  barangList?: LogistikBarang[];
  metadata: SchoolMetadata;
  namaPengurusBarang?: string;
  nipPengurusBarang?: string;
  onOpenBastDocs?: () => void;
  monthlyArchives?: MonthlyArchive[];
  activeMonthId?: string | null;
  onSelectMonth?: (monthId: string) => void;
}

interface AtkItemRow {
  id: string;
  noBku: string;
  tanggal: string;
  kodeRekening: string;
  namaBarang: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  total: number;
  penerima: string;
  keterangan: string;
}

export const AtkLpjView: React.FC<AtkLpjViewProps> = ({
  data,
  barangList,
  metadata,
  namaPengurusBarang,
  nipPengurusBarang,
  onOpenBastDocs,
  monthlyArchives,
  activeMonthId,
  onSelectMonth
}) => {
  const [judulLaporan, setJudulLaporan] = useState('LAPORAN PERTANGGUNGJAWABAN (LPJ) BELANJA ALAT TULIS KANTOR (ATK)');
  const [namaKegiatan, setNamaKegiatan] = useState('Pengadaan Perlengkapan Administrasi & Kegiatan Pembelajaran Siswa');
  const [tanggalLaporan, setTanggalLaporan] = useState(metadata.bulanTahun ? `28 ${metadata.bulanTahun}` : '28 Februari 2026');
  const [namaToko, setNamaToko] = useState('Toko Buku & ATK Barokah Jaya');
  const [noNota, setNoNota] = useState('INV/ATK/2026/02-08');

  // Update date when metadata.bulanTahun changes
  useEffect(() => {
    if (metadata.bulanTahun) {
      setTanggalLaporan(`28 ${metadata.bulanTahun}`);
    }
  }, [metadata.bulanTahun]);

  // Filter items matching ATK (prefer synchronized barangList)
  const atkRows: AtkItemRow[] = useMemo(() => {
    if (barangList && barangList.length > 0) {
      return barangList
        .filter((b) => b.kategori === 'ATK')
        .map((b) => {
          const recipients = b.alokasi
            .filter((a) => a.qty > 0)
            .map((a) => a.personName)
            .slice(0, 3)
            .join(', ');

          return {
            id: b.id,
            noBku: b.noBku || '-',
            tanggal: b.tanggalBelanja || '-',
            kodeRekening: b.kodeRekening,
            namaBarang: b.namaBarang,
            volume: b.totalVolume,
            satuan: b.satuan,
            hargaSatuan: b.hargaSatuan,
            total: b.totalVolume * b.hargaSatuan,
            penerima: recipients || 'Dewan Guru & Staf Administrasi',
            keterangan: b.keperluanDefault || 'Digunakan untuk operasional KBM & administrasi kantor'
          };
        });
    }

    const list: AtkItemRow[] = [];
    const keywords = ['atk', 'alat tulis', 'kertas', 'hvs', 'spidol', 'pulpen', 'tinta', 'buku', 'map', 'lakban', 'amplop', 'penjilidan', 'fotocopy', 'karton', 'lem', 'gunting', 'penggaris', 'stapler', 'staples', 'clip', 'penghapus'];
    const nonBarangKeywords = ['jasa', 'honor', 'honorarium', 'pelatih', 'narasumber', 'transport', 'perjalanan', 'konsumsi', 'snack', 'makan', 'sewa', 'listrik', 'air', 'internet', 'gaji'];

    data.forEach((tx) => {
      if (tx.tipe_transaksi === 'Pengeluaran') {
        const txItems = (tx.rincian_barang && tx.rincian_barang.length > 0)
          ? tx.rincian_barang
          : [{
              kode_rekening: '5.1.02.01.01.0024',
              uraian_barang: tx.keterangan || 'Belanja ATK',
              volume: 1,
              satuan: 'paket',
              harga_satuan: tx.total_pengeluaran_bku,
              jumlah_transaksi: tx.total_pengeluaran_bku
            }];

        txItems.forEach((item, idx) => {
          const uraianLower = (item.uraian_barang || '').toLowerCase();
          const isNonBarang = nonBarangKeywords.some(k => uraianLower.includes(k));
          if (isNonBarang) return;

          const isItemMatch = keywords.some(k => 
            uraianLower.includes(k) || 
            (item.kode_rekening || '').includes('0024') ||
            (item.kode_rekening || '').includes('0025')
          );

          if (isItemMatch) {
            list.push({
              id: `${tx.no_bku}-${idx}`,
              noBku: tx.no_bku,
              tanggal: tx.tanggal,
              kodeRekening: item.kode_rekening || '5.1.02.01.01.0024',
              namaBarang: item.uraian_barang || 'Kertas HVS A4 70gr & Perlengkapan ATK',
              volume: item.volume || 1,
              satuan: item.satuan || 'buah',
              hargaSatuan: item.harga_satuan || item.jumlah_transaksi,
              total: item.jumlah_transaksi,
              penerima: 'Guru / Tenaga Administrasi Sekolah',
              keterangan: 'Digunakan untuk operasional KBM & administrasi kantor'
            });
          }
        });
      }
    });

    return list;
  }, [data, barangList]);

  const totalBiayaAtk = atkRows.reduce((acc, curr) => acc + curr.total, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = 'No,No BKU,Tanggal,Kode Rekening,Nama Barang ATK,Volume,Satuan,Harga Satuan (Rp),Total (Rp),Pengguna/Penerima,Keterangan\n';
    const rows = atkRows
      .map(
        (r, i) =>
          `"${i + 1}","${r.noBku}","${r.tanggal}","${r.kodeRekening}","${r.namaBarang}","${r.volume}","${r.satuan}","${r.hargaSatuan}","${r.total}","${r.penerima}","${r.keterangan}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LPJ_ATK_BOSP_${metadata.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PrintConfigToolbar title="Pengaturan Margin & Cetak LPJ ATK" />
      {/* Monthly Archive Selector for multi-month switching */}
      {monthlyArchives && monthlyArchives.length > 0 && onSelectMonth && (
        <div className="no-print">
          <MonthlyArchiveCards
            compact={true}
            archives={monthlyArchives}
            activeMonthId={activeMonthId || null}
            onSelectMonth={onSelectMonth}
            onDeleteMonth={() => {}}
          />
        </div>
      )}

      {/* Quick Access to BAST & Opname Per Guru */}
      {onOpenBastDocs && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print border border-teal-800/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 mb-1">
              <Sparkles className="w-3 h-3" />
              Generator Dokumen Terpadu Per Guru
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white">
              Cetak Surat Permintaan, Verifikasi &amp; BAST Barang ATK Per Guru
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Sistem telah mendistribusikan jatah barang ATK ke setiap guru dan staf secara otomatis berikut Buku Stock Opname.
            </p>
          </div>
          <button
            onClick={onOpenBastDocs}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Buka BAST &amp; Opname Per Guru &rarr;
          </button>
        </div>
      )}

      {/* Settings Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Judul Dokumen LPJ:
              </label>
              <input
                type="text"
                value={judulLaporan}
                onChange={(e) => setJudulLaporan(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Rekanan / Toko Penyedia:
              </label>
              <input
                type="text"
                value={namaToko}
                onChange={(e) => setNamaToko(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Tanggal Dokumen:
              </label>
              <input
                type="text"
                value={tanggalLaporan}
                onChange={(e) => setTanggalLaporan(e.target.value)}
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
              Cetak LPJ ATK
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 max-w-5xl mx-auto font-sans text-slate-900 text-xs sm:text-[12px] leading-relaxed">
        {/* Kop Resmi */}
        <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-4" />

        {/* Title */}
        <div className="text-center space-y-1 mb-5">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider underline text-slate-900">
            {judulLaporan}
          </h3>
          <p className="text-[11.5px] font-bold text-slate-700 uppercase">
            SUMBER DANA: BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) &bull; TAHUN ANGGARAN 2026
          </p>
          <p className="text-[10.5px] text-slate-500 font-mono">
            Kegiatan: {namaKegiatan} &bull; Periode: {metadata.bulanTahun}
          </p>
        </div>

        {/* Narasi Ringkas LPJ */}
        <div className="mb-4 bg-slate-50 border border-slate-200 p-3 rounded-lg print:border-none print:p-0 print:bg-transparent text-[11px] text-slate-700 space-y-1">
          <p>
            Telah dilaksanakan belanja pengadaan Alat Tulis Kantor (ATK) dan perlengkapan administrasi pembelajaran untuk mendukung kelancaran proses belajar mengajar serta tertib administrasi sekolah pada <strong>{metadata.namaSekolah}</strong> dengan rincian penerimaan dan pendistribusian barang sebagai berikut:
          </p>
        </div>

        {/* Table Rincian Barang ATK */}
        <table className="w-full border border-slate-300 text-[11px]">
          <thead className="bg-slate-100 font-bold text-slate-900 border-b-2 border-slate-300">
            <tr>
              <th className="border border-slate-300 p-1.5 text-center w-7">No</th>
              <th className="border border-slate-300 p-1.5 text-center w-14">No. BKU</th>
              <th className="border border-slate-300 p-1.5 text-center w-24">Kode Rek.</th>
              <th className="border border-slate-300 p-1.5 text-left">Nama Barang / Spesifikasi ATK</th>
              <th className="border border-slate-300 p-1.5 text-center w-14">Volume</th>
              <th className="border border-slate-300 p-1.5 text-right w-20">Harga (Rp)</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Jumlah (Rp)</th>
              <th className="border border-slate-300 p-1.5 text-left w-32">Peruntukan / Pengguna</th>
            </tr>
          </thead>
          <tbody>
            {atkRows.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                <td className="border border-slate-300 p-1.5 text-center font-mono font-bold text-indigo-900">
                  {item.noBku}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono text-[9.5px] text-slate-600">
                  {item.kodeRekening}
                </td>
                <td className="border border-slate-300 p-1.5">
                  <span className="font-semibold text-slate-900">{item.namaBarang}</span>
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono">
                  {item.volume} {item.satuan}
                </td>
                <td className="border border-slate-300 p-1.5 text-right font-mono">
                  {formatRupiah(item.hargaSatuan)}
                </td>
                <td className="border border-slate-300 p-1.5 text-right font-mono font-bold text-slate-900">
                  {formatRupiah(item.total)}
                </td>
                <td className="border border-slate-300 p-1.5 text-[10px] text-slate-600">
                  {item.penerima}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <tr>
              <td colSpan={6} className="border border-slate-300 p-2 text-right text-slate-900">
                TOTAL REALISASI BELANJA ATK:
              </td>
              <td className="border border-slate-300 p-2 text-right font-mono text-emerald-900 font-bold">
                {formatRupiah(totalBiayaAtk)}
              </td>
              <td className="border border-slate-300 p-2 bg-slate-200/50"></td>
            </tr>
          </tfoot>
        </table>

        {/* Berita Acara Penerimaan Barang */}
        <div className="mt-4 border border-slate-200 p-3 rounded-lg text-[10.5px] text-slate-700 bg-slate-50/50 print:bg-transparent print:border-none print:p-0">
          <p className="font-bold text-slate-800 mb-0.5">Catatan Pemeriksaan & Penerimaan Barang (PPHP / Pengurus Barang):</p>
          <p className="italic">
            Barang-barang ATK tersebut di atas telah diperiksa kelengkapan, kuantitas, dan mutunya, diterima dalam keadaan baik serta telah dibukukan ke dalam Buku Inventaris/Persediaan Barang Sekolah.
          </p>
        </div>

        {/* Tanda Tangan 3 Pihak: Pengurus Barang, Bendahara, Kepala Sekolah */}
        <div className="pt-8 text-xs font-sans">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-16">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">Pengurus Barang / PPHP,</p>
                <p className="font-bold text-slate-900">Petugas Penerima Barang</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 underline">{namaPengurusBarang || 'Nurhayati, S.Pd.'}</p>
                <p className="text-[10px] text-slate-600 font-mono">
                  {nipPengurusBarang && nipPengurusBarang !== '-' ? `NIP. ${nipPengurusBarang}` : 'NIP. 198804152014032002'}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-slate-600 font-medium text-[11px]">Lunas Dibayar,</p>
                <p className="font-bold text-slate-900">Bendahara BOSP</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 underline">{metadata.bendahara}</p>
                <p className="text-[10px] text-slate-600 font-mono">NIP. {metadata.nipBendahara}</p>
              </div>
            </div>

            <div className="space-y-16">
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
