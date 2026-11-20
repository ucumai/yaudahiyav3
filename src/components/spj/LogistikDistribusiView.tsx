import React, { useState, useMemo, useEffect } from 'react';
import { TransaksiBKU, SchoolMetadata, MasterGuru, LogistikBarang, DokumenLogistikConfig } from '../../types';
import { DokumenTripartitGuru, DokumenGuruData } from './DokumenTripartitGuru';
import { OpnamePersediaanView } from './OpnamePersediaanView';
import { formatNomorSuratKedinasan, parseTanggalBAST } from '../../utils/logistikUtils';
import {
  Package,
  Brush,
  FileCheck2,
  Printer,
  Sparkles,
  Sliders,
  RefreshCw,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  UserCheck
} from 'lucide-react';

interface LogistikDistribusiViewProps {
  data: TransaksiBKU[];
  metadata: SchoolMetadata;
  teachers: MasterGuru[];
  defaultKategori?: 'ATK' | 'ALKEB' | 'SEMUA';
}

export const LogistikDistribusiView: React.FC<LogistikDistribusiViewProps> = ({
  data,
  metadata,
  teachers,
  defaultKategori = 'SEMUA'
}) => {
  const [filterKategori, setFilterKategori] = useState<'SEMUA' | 'ATK' | 'ALKEB'>(defaultKategori);
  const [activeTab, setActiveTab] = useState<'dokumen-guru' | 'opname' | 'matriks'>('dokumen-guru');
  
  // Konfigurasi Dokumen Kedinasan
  const [config, setConfig] = useState<DokumenLogistikConfig>({
    noMintaStart: filterKategori === 'ALKEB' ? 426 : 174,
    tglMinta: 'Jumat, 10 April 2026',
    tglVerif: 'Sabtu, 11 April 2026',
    tglBA: '2026-04-13',
    namaVerifikator: 'Drs. H. Mulyadi Kartasasmita',
    nipVerifikator: '197108151996031002',
    jabatanVerifikator: 'Ketua Tim PBJ / Verifikator',
    namaPengurusBarang: 'Nurhayati, S.Pd.',
    nipPengurusBarang: '198804152014032002',
    jabatanPengurusBarang: 'Pengurus Barang / Pengelola Persediaan',
    kotaKecamatan: metadata.desaKecamatan ? metadata.desaKecamatan.split(',')[1]?.trim() || 'Bogor' : 'Bogor'
  });

  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [isPrintAllMode, setIsPrintAllMode] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // 1. Ekstrak Daftar Barang Logistik dari BKU
  const initialBarangList: LogistikBarang[] = useMemo(() => {
    const list: LogistikBarang[] = [];
    const atkKeywords = ['atk', 'alat tulis', 'kertas', 'hvs', 'spidol', 'pulpen', 'tinta', 'buku', 'map', 'lakban', 'amplop'];
    const alkebKeywords = ['kebersihan', 'alkeb', 'sabun', 'pel', 'sapu', 'desinfektan', 'karbol', 'deterjen', 'wipol', 'kamper', 'tisu', 'plastik sampah', 'pengki'];

    data.forEach((tx) => {
      if (tx.tipe_transaksi === 'Pengeluaran') {
        tx.rincian_barang.forEach((item, idx) => {
          const uraianLower = (item.uraian_barang || '').toLowerCase();
          const ketLower = (tx.keterangan || '').toLowerCase();
          const kode = item.kode_rekening || '';

          const isAtk = atkKeywords.some(k => uraianLower.includes(k) || ketLower.includes(k) || kode.includes('0024') || kode.includes('0025'));
          const isAlkeb = alkebKeywords.some(k => uraianLower.includes(k) || ketLower.includes(k) || kode.includes('0028') || kode.includes('0030'));

          if (isAtk || isAlkeb) {
            const kategori: 'ATK' | 'ALKEB' = isAlkeb ? 'ALKEB' : 'ATK';
            list.push({
              id: `${tx.no_bku || 'BNU'}-${idx}-${kategori}`,
              namaBarang: item.uraian_barang || 'Barang Persediaan BOSP',
              spesifikasi: `Belanja ${tx.tanggal.split('-')[1] ? ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(tx.tanggal.split('-')[1]) - 1] || 'Februari' : 'Februari'}`,
              kategori,
              satuan: item.satuan || 'buah',
              totalVolume: item.volume || 1,
              sisaLalu: 0,
              hargaSatuan: item.harga_satuan || item.jumlah_transaksi,
              kodeRekening: item.kode_rekening || (kategori === 'ATK' ? '5.1.02.01.01.0024' : '5.1.02.01.01.0028'),
              kodeKegiatan: '06.05.08.',
              tanggalBelanja: tx.tanggal,
              noBku: tx.no_bku,
              keperluanDefault: kategori === 'ATK' ? 'Kegiatan Belajar Mengajar & Administrasi' : 'Operasional Sanitasi & Kebersihan Sekolah',
              alokasi: []
            });
          }
        });
      }
    });

    // Default sample fallback if no BKU match found
    if (list.length === 0) {
      list.push(
        {
          id: 'def-atk-1',
          namaBarang: 'Spidol Whiteboard Hitam (Snowman Boardmarker)',
          spesifikasi: 'Belanja Maret',
          kategori: 'ATK',
          satuan: 'buah',
          totalVolume: 12,
          sisaLalu: 0,
          hargaSatuan: 9500,
          kodeRekening: '5.1.02.01.01.0024',
          kodeKegiatan: '06.05.08.',
          tanggalBelanja: '06-03-2026',
          noBku: 'BNU-08',
          keperluanDefault: 'mengajar',
          alokasi: []
        },
        {
          id: 'def-atk-2',
          namaBarang: 'Kertas HVS F4 70gr (PaperOne)',
          spesifikasi: 'Belanja Maret',
          kategori: 'ATK',
          satuan: 'rim',
          totalVolume: 8,
          sisaLalu: 0,
          hargaSatuan: 55000,
          kodeRekening: '5.1.02.01.01.0024',
          kodeKegiatan: '06.05.08.',
          tanggalBelanja: '06-03-2026',
          noBku: 'BNU-08',
          keperluanDefault: 'administrasi kelas',
          alokasi: []
        },
        {
          id: 'def-alk-1',
          namaBarang: 'Kamper-Isi 6 pcs',
          spesifikasi: 'Belanja Maret',
          kategori: 'ALKEB',
          satuan: 'bungkus',
          totalVolume: 2,
          sisaLalu: 0,
          hargaSatuan: 18000,
          kodeRekening: '5.1.02.01.01.0028',
          kodeKegiatan: '06.05.09.',
          tanggalBelanja: '15-03-2026',
          noBku: 'BNU-09',
          keperluanDefault: 'kebersihan toilet',
          alokasi: []
        },
        {
          id: 'def-alk-2',
          namaBarang: 'Sabun Cuci Tangan-Refill, kemasan 200 ml',
          spesifikasi: 'Belanja Maret',
          kategori: 'ALKEB',
          satuan: 'pouch',
          totalVolume: 4,
          sisaLalu: 0,
          hargaSatuan: 15000,
          kodeRekening: '5.1.02.01.01.0028',
          kodeKegiatan: '06.05.09.',
          tanggalBelanja: '15-03-2026',
          noBku: 'BNU-09',
          keperluanDefault: 'sanitasi wastafel',
          alokasi: []
        },
        {
          id: 'def-alk-3',
          namaBarang: 'Sapu Lidi-Tangkai bahan kayu',
          spesifikasi: 'Belanja Maret',
          kategori: 'ALKEB',
          satuan: 'batang',
          totalVolume: 3,
          sisaLalu: 0,
          hargaSatuan: 22000,
          kodeRekening: '5.1.02.01.01.0028',
          kodeKegiatan: '06.05.09.',
          tanggalBelanja: '15-03-2026',
          noBku: 'BNU-09',
          keperluanDefault: 'kebersihan halaman',
          alokasi: []
        },
        {
          id: 'def-alk-4',
          namaBarang: 'Plastik Sampah-Ukuran 80 cm x 100 cm, isi 8 pcs',
          spesifikasi: 'Belanja Maret',
          kategori: 'ALKEB',
          satuan: 'pack',
          totalVolume: 3,
          sisaLalu: 0,
          hargaSatuan: 25000,
          kodeRekening: '5.1.02.01.01.0028',
          kodeKegiatan: '06.05.09.',
          tanggalBelanja: '15-03-2026',
          noBku: 'BNU-09',
          keperluanDefault: 'pembuangan sampah',
          alokasi: []
        },
        {
          id: 'def-alk-5',
          namaBarang: 'Pengki-Bahan Plastik Karet',
          spesifikasi: 'Belanja Maret',
          kategori: 'ALKEB',
          satuan: 'buah',
          totalVolume: 5,
          sisaLalu: 0,
          hargaSatuan: 28000,
          kodeRekening: '5.1.02.01.01.0028',
          kodeKegiatan: '06.05.09.',
          tanggalBelanja: '15-03-2026',
          noBku: 'BNU-09',
          keperluanDefault: 'kebersihan kelas',
          alokasi: []
        },
        {
          id: 'def-alk-6',
          namaBarang: 'Pel Lantai-Gagang bahan plastik',
          spesifikasi: 'Belanja Maret',
          kategori: 'ALKEB',
          satuan: 'set',
          totalVolume: 12,
          sisaLalu: 0,
          hargaSatuan: 45000,
          kodeRekening: '5.1.02.01.01.0028',
          kodeKegiatan: '06.05.09.',
          tanggalBelanja: '15-03-2026',
          noBku: 'BNU-09',
          keperluanDefault: 'kebersihan lantai',
          alokasi: []
        }
      );
    }

    return list;
  }, [data]);

  // State Barang dengan Alokasi Otomatis
  const [barangList, setBarangList] = useState<LogistikBarang[]>([]);

  // 2. LOGIKA DISTRIBUSI OTOMATIS (Persis Script GAS):
  // ATK -> dibagi rata ke Guru / Tendik (Kecuali Petugas Kebersihan)
  // ALKEB -> diberikan ke Petugas Kebersihan
  const autoDistributeItems = (rawItems: LogistikBarang[]) => {
    // Guru Penerima ATK (Bukan Kepala Sekolah, Bukan Petugas Kebersihan)
    const guruPenerimaAtk = teachers.filter(
      (t) => !(t.jabatan || '').toLowerCase().includes('kepala sekolah') && !(t.jabatan || '').toLowerCase().includes('kebersihan')
    );

    // Petugas Kebersihan Penerima ALKEB (Hanya dari Data Master)
    const petugasKebersihan = teachers.filter((t) => (t.jabatan || '').toLowerCase().includes('kebersihan'));

    return rawItems.map((item) => {
      const isAlkeb = item.kategori === 'ALKEB';
      const targetPenerima = isAlkeb ? petugasKebersihan : guruPenerimaAtk;
      const totalBelanja = item.totalVolume;

      if (targetPenerima.length === 0 || totalBelanja <= 0) {
        return { ...item, alokasi: [] };
      }

      // Rumus bagi rata & sisa lebih GAS:
      const jatahRata = Math.floor(totalBelanja / targetPenerima.length);
      const sisaLebih = totalBelanja % targetPenerima.length;

      const alokasi = targetPenerima.map((p, idx) => {
        const qtyFinal = isAlkeb ? totalBelanja : jatahRata + (idx < sisaLebih ? 1 : 0);
        return {
          personId: p.id,
          personName: p.nama,
          jabatan: p.jabatan,
          nip: p.nip,
          qty: qtyFinal,
          keperluan: item.keperluanDefault || (isAlkeb ? 'pemeliharaan sanitasi & kebersihan' : 'mengajar'),
          status: 'Disetujui' as const
        };
      });

      return { ...item, alokasi };
    });
  };

  // Inisialisasi awal alokasi
  useEffect(() => {
    const distributed = autoDistributeItems(initialBarangList);
    setBarangList(distributed);
  }, [initialBarangList, teachers]);

  // Filter barang sesuai kategori yang dipilih pengguna
  const filteredBarangList = useMemo(() => {
    if (filterKategori === 'SEMUA') return barangList;
    return barangList.filter((b) => b.kategori === filterKategori);
  }, [barangList, filterKategori]);

  // Daftar guru/personel unik yang menerima alokasi barang
  const recipientList = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; jabatan: string; nip: string; totalItems: number }>();

    filteredBarangList.forEach((b) => {
      b.alokasi.forEach((al) => {
        if (al.qty > 0 && al.status === 'Disetujui') {
          const existing = map.get(al.personId);
          if (existing) {
            existing.totalItems += 1;
          } else {
            map.set(al.personId, {
              id: al.personId,
              nama: al.personName,
              jabatan: al.jabatan,
              nip: al.nip,
              totalItems: 1
            });
          }
        }
      });
    });

    return Array.from(map.values());
  }, [filteredBarangList]);

  // Set default selected person jika belum terpilih
  useEffect(() => {
    if (recipientList.length > 0) {
      if (!selectedPersonId || !recipientList.some((r) => r.id === selectedPersonId)) {
        setSelectedPersonId(recipientList[0].id);
      }
    }
  }, [recipientList, selectedPersonId]);

  // 3. Susun data Dokumen Tripartit untuk setiap guru
  // Penomoran paralel kedinasan: noPermintaan = Start + i, noVerif = Start + Total + i, noBAST = Start + 2*Total + i
  const allGuruDocuments: DokumenGuruData[] = useMemo(() => {
    const totalGuru = recipientList.length;
    const noAwal = Number(config.noMintaStart) || 174;

    return recipientList.map((recip, idx) => {
      // Ambil daftar barang yang diterima oleh guru ini
      const items = filteredBarangList
        .map((b) => {
          const alloc = b.alokasi.find((a) => a.personId === recip.id && a.qty > 0 && a.status === 'Disetujui');
          if (alloc) {
            return {
              no: 0,
              namaBarang: b.namaBarang,
              spesifikasi: b.spesifikasi || '-',
              jumlah: alloc.qty,
              satuan: b.satuan || 'buah',
              keperluan: alloc.keperluan || b.keperluanDefault || '-'
            };
          }
          return null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .map((it, i) => ({ ...it, no: i + 1 }));

      return {
        personId: recip.id,
        namaGuru: recip.nama,
        nip: recip.nip,
        jabatan: recip.jabatan,
        noPermintaan: noAwal + idx,
        noVerifikasi: noAwal + totalGuru + idx,
        noBast: noAwal + (2 * totalGuru) + idx,
        items
      };
    });
  }, [recipientList, filteredBarangList, config.noMintaStart]);

  // Data dokumen guru yang saat ini aktif
  const currentGuruDoc = allGuruDocuments.find((d) => d.personId === selectedPersonId) || allGuruDocuments[0];

  const handlePrintSingle = () => {
    setIsPrintAllMode(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintAll = () => {
    setIsPrintAllMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintAllMode(false);
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls - No Print */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Logistik &amp; SPJ Barang
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">Permintaan, Verifikasi, BAST &amp; Opname</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Distribusi Logistik ATK / ALKEB &amp; BAST Per Guru
            </h2>
          </div>

          {/* Quick Config & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kategori Switch */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setFilterKategori('SEMUA')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterKategori === 'SEMUA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({barangList.length})
              </button>
              <button
                onClick={() => {
                  setFilterKategori('ATK');
                  setConfig(c => ({ ...c, noMintaStart: 174 }));
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterKategori === 'ATK' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ATK Guru
              </button>
              <button
                onClick={() => {
                  setFilterKategori('ALKEB');
                  setConfig(c => ({ ...c, noMintaStart: 426 }));
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterKategori === 'ALKEB' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alkeb Kebersihan
              </button>
            </div>

            {/* Tombol Pengaturan Administrasi */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              Nomor &amp; Tanggal Surat
            </button>

            {/* Tombol Cetak Dokumen Aktif */}
            <button
              onClick={handlePrintSingle}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Guru Terpilih
            </button>

            {/* Tombol Cetak SEMUA Dokumen Guru */}
            <button
              onClick={handlePrintAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Semua Guru ({recipientList.length})
            </button>
          </div>
        </div>

        {/* Sub-Tabs View */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dokumen-guru')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dokumen-guru'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              1. Dokumen Terpadu (Permintaan, Verifikasi, BAST)
            </button>

            <button
              onClick={() => setActiveTab('opname')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'opname'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              2. Buku Stock Opname Persediaan
            </button>

            <button
              onClick={() => setActiveTab('matriks')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matriks'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              3. Matriks Alokasi &amp; Jatah Barang
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Mulai No: <strong>{config.noMintaStart}</strong> &bull; Total Penerima: <strong>{recipientList.length} Org</strong>
          </div>
        </div>
      </div>

      {/* Modal / Dialog Konfigurasi Administrasi Nomor & Tanggal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Pengaturan Penomoran &amp; Tanggal Surat Kedinasan
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sistem akan merunut otomatis: Nomor Permintaan (+0), Verifikasi (+N), dan BAST (+2N) per file guru.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  🔢 Mulai Nomor Urut Surat (Angka Saja):
                </label>
                <input
                  type="number"
                  value={config.noMintaStart}
                  onChange={(e) => setConfig({ ...config, noMintaStart: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: 141, 174, 426"
                />
                <span className="text-[10px] text-slate-400 italic">
                  * Format hasil: 800.1.11.1/{config.noMintaStart}-{metadata.npsn || '20200235'}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  📅 1. Tanggal Surat Permintaan Barang:
                </label>
                <input
                  type="text"
                  value={config.tglMinta}
                  onChange={(e) => setConfig({ ...config, tglMinta: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Jumat, 10 April 2026"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  📅 2. Tanggal Lembar Verifikasi:
                </label>
                <input
                  type="text"
                  value={config.tglVerif}
                  onChange={(e) => setConfig({ ...config, tglVerif: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Sabtu, 11 April 2026"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  📅 3. Tanggal Pelaksanaan BAST (Kalender):
                </label>
                <input
                  type="date"
                  value={config.tglBA}
                  onChange={(e) => setConfig({ ...config, tglBA: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-[10.5px] text-blue-900 italic">
                  <strong>Narasi BAST Terbilang:</strong> &ldquo;{parseTanggalBAST(config.tglBA).fullNarasi}&rdquo;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Verifikator PBJ:</label>
                  <input
                    type="text"
                    value={config.namaVerifikator}
                    onChange={(e) => setConfig({ ...config, namaVerifikator: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIP Verifikator:</label>
                  <input
                    type="text"
                    value={config.nipVerifikator}
                    onChange={(e) => setConfig({ ...config, nipVerifikator: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 1: DOKUMEN TRIPARTIT GURU (Permintaan, Verifikasi, BAST) */}
      {/* ======================================================================= */}
      {activeTab === 'dokumen-guru' && (
        <div className="space-y-6">
          {/* Guru Selector Bar - No Print */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs no-print">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Pilih Personel / Guru Pemohon:
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                (Menampilkan {recipientList.length} guru/staf terdaftar)
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {recipientList.map((recip) => {
                const isSelected = recip.id === selectedPersonId;
                return (
                  <button
                    key={recip.id}
                    onClick={() => setSelectedPersonId(recip.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-900 text-white font-bold shadow-xs ring-1 ring-indigo-950'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <UserCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <div className="leading-tight truncate">{recip.nama}</div>
                      <div className={`text-[9.5px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {recip.jabatan}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Render Mode: Single Guru View vs Print All Mode */}
          {isPrintAllMode ? (
            /* Mode Cetak Semua Guru */
            <div className="space-y-12">
              {allGuruDocuments.map((gDoc) => (
                <div key={gDoc.personId} className="print:break-after-page">
                  <DokumenTripartitGuru
                    guruData={gDoc}
                    metadata={metadata}
                    tglMinta={config.tglMinta}
                    tglVerif={config.tglVerif}
                    tglBA={config.tglBA}
                    namaVerifikator={config.namaVerifikator}
                    nipVerifikator={config.nipVerifikator}
                    namaPengurusBarang={config.namaPengurusBarang}
                    nipPengurusBarang={config.nipPengurusBarang}
                    kotaKecamatan={config.kotaKecamatan}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Mode Tampil & Cetak Guru Terpilih */
            currentGuruDoc && (
              <div className="max-w-4xl mx-auto">
                <DokumenTripartitGuru
                  guruData={currentGuruDoc}
                  metadata={metadata}
                  tglMinta={config.tglMinta}
                  tglVerif={config.tglVerif}
                  tglBA={config.tglBA}
                  namaVerifikator={config.namaVerifikator}
                  nipVerifikator={config.nipVerifikator}
                  namaPengurusBarang={config.namaPengurusBarang}
                  nipPengurusBarang={config.nipPengurusBarang}
                  kotaKecamatan={config.kotaKecamatan}
                />
              </div>
            )
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: OPNAME FISIK PERSEDIAAN */}
      {/* ======================================================================= */}
      {activeTab === 'opname' && (
        <OpnamePersediaanView
          barangList={filteredBarangList}
          teachers={teachers}
          metadata={metadata}
          periodeText={metadata.bulanTahun}
          tanggalCetak={config.tglVerif}
          namaPengurusBarang={config.namaPengurusBarang}
          nipPengurusBarang={config.nipPengurusBarang}
        />
      )}

      {/* ======================================================================= */}
      {/* TAB 3: MATRIKS ALOKASI & DISTRIBUSI KUSTOM */}
      {/* ======================================================================= */}
      {activeTab === 'matriks' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Matriks Pembagian Jatah Barang ke Personel
              </h3>
              <p className="text-xs text-slate-500">
                Anda dapat menyesuaikan pembagian kuantitas barang secara manual jika diperlukan.
              </p>
            </div>

            <button
              onClick={() => {
                const distributed = autoDistributeItems(initialBarangList);
                setBarangList(distributed);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Distribusi Otomatis
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 text-xs">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="p-2 border text-center w-8">No</th>
                  <th className="p-2 border text-left">Nama Barang</th>
                  <th className="p-2 border text-center w-20">Kategori</th>
                  <th className="p-2 border text-center w-20">Total Vol</th>
                  <th className="p-2 border text-left">Rincian Alokasi Penerima &amp; Jatah</th>
                </tr>
              </thead>
              <tbody>
                {filteredBarangList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2 border text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border font-semibold text-slate-900">
                      {item.namaBarang}
                      <span className="text-[10px] text-slate-500 block font-normal">
                        Satuan: {item.satuan} &bull; {item.spesifikasi}
                      </span>
                    </td>
                    <td className="p-2 border text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.kategori === 'ALKEB' ? 'bg-cyan-100 text-cyan-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {item.kategori}
                      </span>
                    </td>
                    <td className="p-2 border text-center font-mono font-bold text-slate-900">
                      {item.totalVolume} {item.satuan}
                    </td>
                    <td className="p-2 border">
                      <div className="flex flex-wrap gap-1.5">
                        {item.alokasi.map((al, aIdx) => (
                          <div
                            key={aIdx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[11px]"
                          >
                            <span className="font-medium text-slate-800">{al.personName.split(',')[0]}:</span>
                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1 rounded">
                              {al.qty} {item.satuan}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
