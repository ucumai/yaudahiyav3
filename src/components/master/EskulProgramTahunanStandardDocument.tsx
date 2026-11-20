import React from 'react';
import { MasterEskul, SchoolMetadata, TransaksiBKU } from '../../types';
import { formatRupiah } from '../SummaryCards';
import { getCoachesFromEskul } from './EskulMasterTab';
import { getThematicEskulProtaMatrix, generateWeeklyMateriForAnyEskul } from '../../utils/pramukaProtaIntegration';
import { findEskulProtaProfile } from '../../data/eskulProtaDataBank';
import { OfficialSignatures } from '../common/OfficialDocLayout';

interface EskulProgramTahunanStandardDocumentProps {
  eskul: MasterEskul;
  metadata: SchoolMetadata;
  bkuData?: TransaksiBKU[];
}

export const EskulProgramTahunanStandardDocument: React.FC<EskulProgramTahunanStandardDocumentProps> = ({
  eskul,
  metadata,
  bkuData = []
}) => {
  const tahunAnggaran = metadata?.tahunAnggaran || '2025';
  const namaSekolah = (metadata?.namaSekolah || 'SEKOLAH DASAR').toUpperCase();
  const namaEskulUpper = (eskul?.namaEskul || 'EKSTRAKURIKULER').toUpperCase();
  const kota = metadata?.desaKecamatan || metadata?.kabupatenKota || 'Bogor';

  const coaches = getCoachesFromEskul(eskul);
  const coachNames = coaches.length > 0
    ? coaches.map((c) => c.nama).join(', ')
    : eskul.namaPelatih || '-';

  const honorPerKegiatan = Number(eskul.honorPerKegiatan) || 75000;
  const totalVolumePertemuan = 48; // 4x sebulan x 12 bulan
  const totalAnggaranHonor = totalVolumePertemuan * honorPerKegiatan;

  // Profil eskul dari database / bank data
  const profile = findEskulProtaProfile(eskul.namaEskul, eskul.kategori);

  // Ambil matriks 12 bulan dari matriksProtaCustom jika ada, jika tidak pakai getThematicEskulProtaMatrix
  const matriksData = React.useMemo(() => {
    if (eskul.matriksProtaCustom && eskul.matriksProtaCustom.length > 0) {
      return eskul.matriksProtaCustom.map((m, idx) => ({
        no: idx + 1,
        text: m.text,
        months: m.months,
        keterangan: m.keterangan || (m.months.length === 12 ? 'Rutin' : 'Terjadwal')
      }));
    }
    return getThematicEskulProtaMatrix(eskul);
  }, [eskul]);

  // Latar Belakang dinamis berbasis eskul
  const latarBelakangText = eskul.deskripsiProgram || profile?.deskripsiProgram || (
    `Ekstrakurikuler ${eskul.namaEskul} merupakan kegiatan pengembangan diri peserta didik di ${metadata?.namaSekolah || 'Sekolah Dasar'} yang bertujuan untuk menyalurkan minat, bakat, serta potensi di bidang ${eskul.kategori.toLowerCase()}. Melalui kegiatan ${eskul.namaEskul}, peserta didik dapat mengembangkan kreativitas, kepekaan rasa, kemampuan fisik-motorik, serta menumbuhkan kecintaan terhadap nilai-nilai budi pekerti luhur dan budaya bangsa.`
  );

  // Tujuan kegiatan dinamis
  const tujuanKegiatanList = (profile?.sasaranPrestasi && profile.sasaranPrestasi.length > 0) ? profile.sasaranPrestasi : [
    `Mengembangkan bakat dan minat peserta didik di bidang ${eskul.namaEskul.toLowerCase()}.`,
    'Meningkatkan kemampuan teknik dasar, keterampilan motorik, dan ekspresi positif.',
    'Menumbuhkan sikap disiplin, percaya diri, sportivitas, dan kerja sama antarsiswa.',
    'Mempersiapkan fisik, mental, serta ketangkasan dalam menghadapi berbagai tantangan belajar.',
    'Mempersiapkan peserta didik untuk tampil dan berprestasi pada kegiatan atau perlombaan resmi sekolah.'
  ];

  return (
    <div className="eskul-prota-multipage space-y-8 print:space-y-0 text-black font-sans leading-relaxed text-[13px] print:text-[12px]">
      
      {/* ========================================================================= */}
      {/* LEMBAR 1 / HALAMAN 1 (FORMAT SESUAI REFERENSI GAMBAR RESMI)               */}
      {/* ========================================================================= */}
      <div className="official-doc-page bg-white p-8 sm:p-12 print:p-0 print:m-0 border border-slate-200 print:border-none shadow-xs print:shadow-none min-h-[297mm] print:min-h-0 print:break-after-page space-y-6">
        {/* HEADER TERPUSAT (PERSIS CONTOH GAMBAR) */}
        <div className="text-center space-y-1.5 pt-4 pb-6">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-black">
            PROGRAM EKSTRAKURIKULER {namaEskulUpper}
          </h1>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
            TAHUN {tahunAnggaran}
          </h2>
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-black">
            {namaSekolah}
          </h3>
        </div>

        {/* A. LATAR BELAKANG */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            A. LATAR BELAKANG
          </h4>
          <p className="text-justify leading-relaxed indent-8">
            {latarBelakangText}
          </p>
          <p className="text-justify leading-relaxed indent-8">
            Kegiatan ini diselenggarakan secara terprogram dan berkesinambungan guna membentuk generasi pelajar yang sehat jasmani, berakhlak mulia, memiliki kemandirian, serta menjunjung tinggi sportivitas sejalan dengan penguatan Profil Pelajar Pancasila.
          </p>
        </div>

        {/* B. TUJUAN KEGIATAN */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            B. TUJUAN KEGIATAN
          </h4>
          <ol className="list-decimal pl-6 space-y-1.5 text-justify">
            {tujuanKegiatanList.map((tujuan, idx) => (
              <li key={idx} className="pl-1">
                {tujuan}
              </li>
            ))}
          </ol>
        </div>

        {/* C. SASARAN */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            C. SASARAN
          </h4>
          <p className="text-justify leading-relaxed">
            Peserta didik {metadata?.namaSekolah || 'Sekolah Dasar'} kelas I sampai kelas VI yang memiliki minat, bakat, dan komitmen dalam mengikuti kegiatan ekstrakurikuler {eskul.namaEskul} (disesuaikan dengan kondisi dan daya tampung sekolah).
          </p>
        </div>

        {/* D. WAKTU DAN FREKUENSI */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            D. WAKTU DAN FREKUENSI
          </h4>
          <div className="pl-2 space-y-1.5 text-slate-900 font-medium">
            <div className="flex items-start gap-2">
              <span className="text-black font-bold">&bull;</span>
              <span><strong>Tahun Pelaksanaan :</strong> Januari &ndash; Desember {tahunAnggaran}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-black font-bold">&bull;</span>
              <span><strong>Frekuensi :</strong> 4 kali pertemuan setiap bulan (Total {totalVolumePertemuan} pertemuan/tahun)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-black font-bold">&bull;</span>
              <span><strong>Pelaksanaan :</strong> 1 kali setiap minggu ({eskul.jadwalLatihan || 'Setiap Sabtu, 08.00 - 10.00 WIB'})</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-black font-bold">&bull;</span>
              <span><strong>Tempat :</strong> {eskul.lokasi || 'Aula / Lapangan / Ruang Kesenian Sekolah'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR 2 / HALAMAN 2: DASAR HUKUM & STRUKTUR PENGORGANISASIAN             */}
      {/* ========================================================================= */}
      <div className="official-doc-page bg-white p-8 sm:p-12 print:p-0 print:m-0 border border-slate-200 print:border-none shadow-xs print:shadow-none min-h-[297mm] print:min-h-0 print:break-after-page space-y-6">
        
        {/* E. DASAR HUKUM & LANDASAN OPERASIONAL */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            E. DASAR HUKUM DAN LANDASAN OPERASIONAL
          </h4>
          <ol className="list-decimal pl-6 space-y-1.5 text-justify">
            <li className="pl-1">
              Undang-Undang Republik Indonesia Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.
            </li>
            <li className="pl-1">
              Peraturan Menteri Pendidikan dan Kebudayaan Nomor 62 Tahun 2014 tentang Kegiatan Ekstrakurikuler pada Pendidikan Dasar dan Pendidikan Menengah.
            </li>
            <li className="pl-1">
              Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi tentang Petunjuk Teknis Pengelolaan Dana Bantuan Operasional Satuan Pendidikan (BOSP) Reguler Tahun Anggaran {tahunAnggaran}.
            </li>
            <li className="pl-1">
              Kurikulum Satuan Pendidikan (KSP) dan Rencana Kegiatan dan Anggaran Sekolah (RKAS) {metadata?.namaSekolah || 'SD Negeri Contoh'} Tahun Anggaran {tahunAnggaran}.
            </li>
          </ol>
        </div>

        {/* F. STRUKTUR ORGANISASI & MANAJEMEN PEMBINAAN */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            F. STRUKTUR ORGANISASI DAN PEMBINA
          </h4>
          <p className="text-justify leading-relaxed">
            Susunan personalia penanggung jawab, guru pembina, instruktur/pelatih, serta kepengurusan ekstrakurikuler {eskul.namaEskul} adalah sebagai berikut:
          </p>

          <table className="w-full border-collapse border border-black text-xs mt-2">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 w-48 text-left">Jabatan / Peran</th>
                <th className="border border-black p-2 text-left">Nama Personalia</th>
                <th className="border border-black p-2 w-52 text-left">Keterangan / Tugas</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center font-bold">1</td>
                <td className="border border-black p-2 font-bold">Penanggung Jawab</td>
                <td className="border border-black p-2 font-semibold">{metadata?.kepalaSekolah || 'Kepala Sekolah'}</td>
                <td className="border border-black p-2">Kepala Satuan Pendidikan</td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-center font-bold">2</td>
                <td className="border border-black p-2 font-bold">Guru Pembina</td>
                <td className="border border-black p-2 font-semibold">
                  {eskul.namaPembina && eskul.namaPembina !== '-'
                    ? `${eskul.namaPembina} ${eskul.nipPembina ? `(NIP. ${eskul.nipPembina})` : ''}`
                    : metadata?.namaBendahara || 'Pembina Eskul'}
                </td>
                <td className="border border-black p-2">Koordinator Administrasi &amp; Pendampingan</td>
              </tr>
              {coaches.map((c, idx) => (
                <tr key={c.id || idx}>
                  <td className="border border-black p-2 text-center font-bold">{idx + 3}</td>
                  <td className="border border-black p-2 font-bold">{c.peran || `Pelatih / Instruktur ${idx + 1}`}</td>
                  <td className="border border-black p-2 font-semibold">{c.nama} {c.noHp ? `(${c.noHp})` : ''}</td>
                  <td className="border border-black p-2">Instruktur Teknis Lapangan (Honor BKU BOSP)</td>
                </tr>
              ))}
              <tr>
                <td className="border border-black p-2 text-center font-bold">{coaches.length + 3}</td>
                <td className="border border-black p-2 font-bold">Peserta Didik</td>
                <td className="border border-black p-2">
                  {(eskul.anggotaSiswa || []).length > 0
                    ? `${(eskul.anggotaSiswa || []).length} Siswa Terdaftar`
                    : 'Peserta Didik Kelas I - VI Terpilih'}
                </td>
                <td className="border border-black p-2">Anggota Aktif Latihan Rutin</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* G. TATA TERTIB & KETENTUAN LATIHAN */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            G. TATA TERTIB DAN KETENTUAN LATIHAN
          </h4>
          <ol className="list-decimal pl-6 space-y-1.5 text-justify">
            <li className="pl-1">
              Peserta didik wajib hadir tepat waktu selambat-lambatnya 10 menit sebelum jadwal latihan dimulai.
            </li>
            <li className="pl-1">
              Mengenakan seragam / pakaian latihan yang bersih, rapi, dan sesuai dengan ketentuan cabang ekstrakurikuler.
            </li>
            <li className="pl-1">
              Menjaga kebersihan lingkungan sekolah, merawat fasilitas latihan, dan menyimpan kembali perlengkapan ke tempat semula setelah kegiatan selesai.
            </li>
            <li className="pl-1">
              Menjunjung tinggi rasa saling menghargai, sportivitas, etika berbicara, dan keselamatan diri maupun sesama teman.
            </li>
          </ol>
        </div>

        {/* H. SARANA DAN PRASARANA PENDUKUNG */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            H. SARANA DAN PRASARANA PENDUKUNG
          </h4>
          <p className="text-justify leading-relaxed">
            Untuk menunjang efektivitas dan ketercapaian target pembinaan, pihak sekolah menyediakan fasilitas latihan di <strong>{eskul.lokasi || 'Aula / Lapangan / Ruang Kesenian'}</strong> serta peralatan teknis pendukung yang dipelihara secara berkala melalui alokasi dana BOSP reguler.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR 3 / HALAMAN 3: BAB III. MATRIKS PROGRAM TAHUNAN (12 BULAN)         */}
      {/* ========================================================================= */}
      <div className="official-doc-page bg-white p-8 sm:p-12 print:p-0 print:m-0 border border-slate-200 print:border-none shadow-xs print:shadow-none min-h-[297mm] print:min-h-0 print:break-after-page space-y-6">
        <div className="text-center space-y-1 pb-4 border-b-2 border-black">
          <h3 className="text-base font-black uppercase tracking-wider text-black">
            BAB III &bull; MATRIKS PROGRAM KERJA TAHUNAN (12 BULAN)
          </h3>
          <p className="text-xs font-bold uppercase text-slate-800">
            DISTRIBUSI JADWAL PELAKSANAAN KEGIATAN BULAN I S.D. XII TAHUN ANGGARAN {tahunAnggaran}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-justify leading-relaxed">
            Matriks distribusi rencana kegiatan tahunan di bawah ini menjadi pedoman operasional bagi pelatih dan guru pembina dalam menyusun silabus latihan mingguan, absensi presensi, serta laporan pertanggungjawaban bulanan:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-xs font-sans">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-black p-2 w-10" rowSpan={2}>No</th>
                  <th className="border border-black p-2 min-w-[220px] text-left" rowSpan={2}>
                    Uraian Rencana Kegiatan / Program Kerja
                  </th>
                  <th className="border border-black p-1" colSpan={12}>
                    Bulan Pelaksanaan (I s.d. XII)
                  </th>
                  <th className="border border-black p-2 w-24 text-center" rowSpan={2}>
                    Keterangan
                  </th>
                </tr>
                <tr className="bg-slate-50 text-[11px] font-bold">
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((m) => (
                    <th key={m} className="border border-black p-1 w-6 text-center">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriksData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="border border-black p-2 text-center font-mono font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-black p-2 font-medium leading-tight">
                      {item.text}
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <td key={m} className="border border-black p-1 text-center font-bold text-black">
                        {item.months.includes(m) ? '✓' : ''}
                      </td>
                    ))}
                    <td className="border border-black p-2 text-center text-[11px] font-mono">
                      {item.keterangan || (item.months.length === 12 ? 'Rutin' : 'Terjadwal')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-600 italic pt-2">
            * Keterangan: Angka romawi I s.d. XII mewakili bulan Januari sampai dengan Desember. Tanda centang (✓) menandakan waktu aktif pelaksanaan program kerja.
          </p>

          {/* TABEL RINCIAN MATERI MINGGUAN PER BULAN (100% SINKRON DENGAN CENTANG BULAN DI ATAS) */}
          <div className="pt-4 space-y-2">
            <h4 className="font-bold text-xs text-black uppercase tracking-wider">
              RINCIAN SILABUS &amp; MATERI LATIHAN MINGGUAN (SINKRON DENGAN MATRIKS PROTA)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-black p-1.5 w-20">Bulan</th>
                    <th className="border border-black p-1.5 w-44 text-left">Fokus Program Dicentang</th>
                    <th className="border border-black p-1.5 text-left">Rencana Materi Mingguan (Pekan I - IV)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                  ].map((bName, mIdx) => {
                    const monthNum = mIdx + 1;
                    const checkedItems = (eskul.matriksProtaCustom || matriksData)
                      .filter((m) => (m.text || '').trim().length > 0 && Array.isArray(m.months) && m.months.includes(monthNum))
                      .map((m) => m.text);

                    const weekly = generateWeeklyMateriForAnyEskul(mIdx, eskul);

                    return (
                      <tr key={bName} className={mIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="border border-black p-1.5 text-center font-bold align-top bg-slate-100/50">
                          {bName}
                          <span className="block text-[9.5px] font-normal text-slate-500 font-mono">Bulan {monthNum}</span>
                        </td>
                        <td className="border border-black p-1.5 align-top text-slate-800">
                          {checkedItems.length > 0 ? (
                            <ul className="list-disc pl-3.5 space-y-0.5">
                              {checkedItems.map((ci, cIdx) => (
                                <li key={cIdx} className="font-semibold text-black leading-tight">
                                  {ci}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">- Kegiatan Mandiri / Libur Semester -</span>
                          )}
                        </td>
                        <td className="border border-black p-1.5 align-top space-y-0.5 leading-snug">
                          <div><span className="font-bold text-[10px] text-black">Pekan 1:</span> {weekly[0]}</div>
                          <div><span className="font-bold text-[10px] text-black">Pekan 2:</span> {weekly[1]}</div>
                          <div><span className="font-bold text-[10px] text-black">Pekan 3:</span> {weekly[2]}</div>
                          <div><span className="font-bold text-[10px] text-black">Pekan 4:</span> {weekly[3]}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR 4 / HALAMAN 4: BAB IV. AGENDA BESAR & ESTIMASI ANGGARAN (RAB BOSP)  */}
      {/* ========================================================================= */}
      <div className="official-doc-page bg-white p-8 sm:p-12 print:p-0 print:m-0 border border-slate-200 print:border-none shadow-xs print:shadow-none min-h-[297mm] print:min-h-0 print:break-after-page space-y-6">
        <div className="text-center space-y-1 pb-4 border-b-2 border-black">
          <h3 className="text-base font-black uppercase tracking-wider text-black">
            BAB IV &bull; AGENDA UNGGULAN &amp; ESTIMASI PEMBIAYAAN (RAB)
          </h3>
          <p className="text-xs font-bold uppercase text-slate-800">
            SUMBER DANA BANTUAN OPERASIONAL SATUAN PENDIDIKAN (BOSP) TAHUN {tahunAnggaran}
          </p>
        </div>

        {/* A. AGENDA KEGIATAN UNGGULAN TAHUNAN */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            A. AGENDA KEGIATAN UNGGULAN &amp; INSIDENTAL TAHUNAN
          </h4>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 text-left">Nama Agenda / Kegiatan Unggulan</th>
                <th className="border border-black p-2 w-28">Waktu (Bulan)</th>
                <th className="border border-black p-2 w-40 text-left">Lokasi / Tempat</th>
                <th className="border border-black p-2 w-36 text-left">Sasaran Peserta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center font-bold">1</td>
                <td className="border border-black p-2 font-bold">Penerimaan &amp; Orientasi Anggota Baru</td>
                <td className="border border-black p-2 text-center">Juli</td>
                <td className="border border-black p-2">{eskul.lokasi || 'Lingkungan Sekolah'}</td>
                <td className="border border-black p-2">Peserta Didik Baru</td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-center font-bold">2</td>
                <td className="border border-black p-2 font-bold">Pentas Unjuk Gelar Kreativitas / Latihan Tanding</td>
                <td className="border border-black p-2 text-center">Oktober</td>
                <td className="border border-black p-2">Aula / Lapangan Sekolah</td>
                <td className="border border-black p-2">Seluruh Anggota</td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-center font-bold">3</td>
                <td className="border border-black p-2 font-bold">Partisipasi Ajang Perlombaan / Festival Resmi</td>
                <td className="border border-black p-2 text-center">November</td>
                <td className="border border-black p-2">Tingkat Kecamatan / Kota</td>
                <td className="border border-black p-2">Tim Inti Terpilih</td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-center font-bold">4</td>
                <td className="border border-black p-2 font-bold">Ujian Kenaikan Tingkat / Evaluasi Akhir Tahun</td>
                <td className="border border-black p-2 text-center">Desember</td>
                <td className="border border-black p-2">Sekolah</td>
                <td className="border border-black p-2">Seluruh Anggota</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* B. ESTIMASI ANGGARAN (RAB BOSP) */}
        <div className="space-y-2 pt-3">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            B. RENCANA ANGGARAN BIAYA (RAB) TAHUNAN BOSP
          </h4>
          <p className="text-justify leading-relaxed">
            Estimasi alokasi dana BOSP reguler untuk mendukung penyelenggaraan kegiatan ekstrakurikuler <strong>{eskul.namaEskul}</strong> selama satu tahun ajaran ({tahunAnggaran}) adalah sebagai berikut:
          </p>

          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 text-left">Uraian Kebutuhan Anggaran</th>
                <th className="border border-black p-2 w-16">Volume</th>
                <th className="border border-black p-2 w-20">Satuan</th>
                <th className="border border-black p-2 w-28 text-right">Tarif Satuan</th>
                <th className="border border-black p-2 w-32 text-right">Total Anggaran</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center font-bold">1</td>
                <td className="border border-black p-2 font-medium">
                  Honorarium Jasa Instruktur / Pelatih Ekstrakurikuler {eskul.namaEskul}
                </td>
                <td className="border border-black p-2 text-center font-mono">{totalVolumePertemuan}</td>
                <td className="border border-black p-2 text-center">Kegiatan</td>
                <td className="border border-black p-2 text-right font-mono">{formatRupiah(honorPerKegiatan)}</td>
                <td className="border border-black p-2 text-right font-mono font-bold">{formatRupiah(totalAnggaranHonor)}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 text-center font-bold">2</td>
                <td className="border border-black p-2 font-medium">
                  Pemeliharaan Sarana, Prasarana &amp; Alat Latihan Penunjang
                </td>
                <td className="border border-black p-2 text-center font-mono">1</td>
                <td className="border border-black p-2 text-center">Paket</td>
                <td className="border border-black p-2 text-right font-mono">Sesuai RKAS</td>
                <td className="border border-black p-2 text-right font-mono font-bold">Alokasi BOSP</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={5} className="border border-black p-2 text-right uppercase">
                  Total Estimasi Anggaran Honor Pelatih Tahunan
                </td>
                <td className="border border-black p-2 text-right font-mono font-black text-black">
                  {formatRupiah(totalAnggaranHonor)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* C. MEKANISME PELAPORAN */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            C. MEKANISME PELAPORAN SPJ / LPJ
          </h4>
          <p className="text-justify leading-relaxed">
            Realisasi pencairan dana honorarium pelatih dilakukan setiap bulan berdasarkan verifikasi absensi presensi siswa, tanda tangan kehadiran pelatih pada jurnal mingguan, serta kelengkapan kwitansi dan bukti foto dokumentasi kegiatan yang sah.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEMBAR 5 / HALAMAN 5: BAB V. EVALUASI, PENUTUP & LEMBAR PENGESAHAN RESMI   */}
      {/* ========================================================================= */}
      <div className="official-doc-page bg-white p-8 sm:p-12 print:p-0 print:m-0 border border-slate-200 print:border-none shadow-xs print:shadow-none min-h-[297mm] print:min-h-0 space-y-6">
        <div className="text-center space-y-1 pb-4 border-b-2 border-black">
          <h3 className="text-base font-black uppercase tracking-wider text-black">
            BAB V &bull; EVALUASI DAN PENUTUP
          </h3>
          <p className="text-xs font-bold uppercase text-slate-800">
            TOLOK UKUR KEBERHASILAN DAN LEMBAR PENGESAHAN RESMI
          </p>
        </div>

        {/* A. INDIKATOR KEBERHASILAN */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            A. INDIKATOR KEBERHASILAN PROGRAM
          </h4>
          <ol className="list-decimal pl-6 space-y-1.5 text-justify">
            <li className="pl-1">
              Tingkat kehadiran dan partisipasi aktif peserta didik mencapai sekurang-kurangnya 85% dari total 48 kali pertemuan latihan tahunan.
            </li>
            <li className="pl-1">
              Peserta didik menguasai materi teknis dasar dan lanjutan sesuai silabus kurikulum {eskul.namaEskul}.
            </li>
            <li className="pl-1">
              Terwujudnya peningkatan karakter disiplin, percaya diri, kerja sama regu, dan sportivitas siswa.
            </li>
            <li className="pl-1">
              Mampu menampilkan unjuk kebolehan dan berprestasi pada ajang festival, turnamen, atau lomba resmi antarsekolah.
            </li>
          </ol>
        </div>

        {/* B. SISTEM MONITORING & EVALUASI */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            B. SISTEM MONITORING DAN EVALUASI
          </h4>
          <p className="text-justify leading-relaxed">
            Evaluasi berkala diselenggarakan dalam 3 (tiga) tahapan:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-justify">
            <li><strong>Evaluasi Bulanan:</strong> Rekap presensi, jurnal latihan pelatih, dan verifikasi SPJ LPJ bulanan.</li>
            <li><strong>Evaluasi Tengah Tahun (Semester):</strong> Penilaian capaian keterampilan siswa dan koordinasi pembina bersama kepala sekolah.</li>
            <li><strong>Evaluasi Akhir Tahun:</strong> Penyusunan laporan pertanggungjawaban tahunan dan apresiasi prestasi siswa.</li>
          </ul>
        </div>

        {/* C. PENUTUP */}
        <div className="space-y-2 pt-2">
          <h4 className="font-bold text-sm text-black uppercase tracking-wide">
            C. PENUTUP
          </h4>
          <p className="text-justify leading-relaxed indent-8">
            Dokumen Program Kerja Tahunan (PROTA) Ekstrakurikuler {eskul.namaEskul} ini disusun dengan penuh tanggung jawab sebagai pedoman pelaksanaan pembinaan minat dan bakat peserta didik di {metadata?.namaSekolah || 'Sekolah Dasar'} Tahun Anggaran {tahunAnggaran}. Keberhasilan program ini sangat bergantung pada dedikasi para pelatih, dukungan dewan guru, partisipasi aktif siswa, serta kerja sama harmonis dengan para orang tua/wali murid.
          </p>
        </div>

        {/* LEMBAR PENGESAHAN DOKUMEN / TANDA TANGAN RESMI */}
        <div className="pt-6">
          <OfficialSignatures
            kota={kota}
            tanggalSurat={`15 Juli ${tahunAnggaran.slice(0, 4)}`}
            leftPerson={{
              label: 'Mengetahui,\nKepala Sekolah',
              nama: metadata?.kepalaSekolah || 'MAHBUBILLAH, S.Pd',
              nip: metadata?.nipKepalaSekolah || '196710151988031006',
            }}
            rightPerson={{
              label: 'Guru Pembina Ekstrakurikuler,',
              nama: eskul.namaPembina && eskul.namaPembina !== '-'
                ? eskul.namaPembina
                : coachNames,
              nip: eskul.nipPembina && eskul.nipPembina !== '-'
                ? eskul.nipPembina
                : '-',
            }}
          />
        </div>
      </div>

    </div>
  );
};
