import React, { useState, useMemo } from 'react';
import {
  MasterEskul,
  SchoolMetadata,
  MasterGuru,
  MasterSiswa,
  EskulProtaConfig,
  EskulProtaMatriksItem
} from '../../types';
import { formatRupiah } from '../SummaryCards';
import { getCoachesFromEskul } from '../master/EskulMasterTab';
import { OfficialSignatures } from '../common/OfficialDocLayout';
import { generateWeeklyMateriForAnyEskul } from '../../utils/pramukaProtaIntegration';
import {
  Printer,
  Sparkles,
  Award,
  Calendar,
  Users,
  Building2,
  FileText,
  CheckCircle2,
  Edit3,
  Check,
  Compass,
  Tent,
  BookOpen,
  Bookmark,
  ShieldCheck,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

interface EskulProtaViewProps {
  eskul: MasterEskul;
  allEskulList: MasterEskul[];
  metadata: SchoolMetadata;
  teachers?: MasterGuru[];
  students?: MasterSiswa[];
  onSelectEskul: (eskulId: string) => void;
  golonganPramuka: 'Penggalang' | 'Siaga';
  onChangeGolonganPramuka?: (gol: 'Penggalang' | 'Siaga') => void;
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const generateDefaultProtaConfig = (
  eskul: MasterEskul,
  metadata: SchoolMetadata,
  golonganPramuka: 'Penggalang' | 'Siaga' = 'Penggalang'
): EskulProtaConfig => {
  const isPramuka = (eskul.namaEskul || '').toLowerCase().includes('pramuka');
  const year = metadata.tahunAnggaran || '2025';
  const sekolah = metadata.namaSekolah || 'SD NEGERI CONTOH';
  const kota = metadata.desaKecamatan || metadata.kabupatenKota || 'Bogor';
  const honorSatuan = Number(eskul.honorPerKegiatan) || 75000;

  if (isPramuka) {
    if (golonganPramuka === 'Siaga') {
      const matriksSiaga: EskulProtaMatriksItem[] = [
        {
          bulanIndex: 0,
          bulanNama: 'Januari',
          fase: 'Upacara Lingkaran & Kode Kehormatan Siaga',
          fokusKompetensi: 'Pengamalan Dwi Darma, Dwi Satya & kerapian seragam Siaga',
          materiMinggu1: 'Upacara lingkaran Siaga (Yanda/Bunda di tengah) & pengucapan Dwi Darma',
          materiMinggu2: 'Latihan gerak dasar di tempat: Sikap sempurna, istirahat & lencang depan barung',
          materiMinggu3: 'Menyanyikan lagu-lagu kepanduan Siaga ceria & tepuk Siaga',
          materiMinggu4: 'Upacara penutupan latihan perindukan & pembagian piket kerapian barung',
          targetOutput: 'Siswa memahami tata tertib upacara lingkaran & hafal Dwi Darma'
        },
        {
          bulanIndex: 1,
          bulanNama: 'Februari',
          fase: 'Tali Temali Praktis & Kemandirian Diri',
          fokusKompetensi: 'Penguasaan simpul dasar untuk tali sepatu dan kacu Siaga',
          materiMinggu1: 'Mengenal simpul hidup dan simpul mati menggunakan tali pramuka Siaga',
          materiMinggu2: 'Praktik mandiri melipat kacu/setangan leher & mengikat tali sepatu',
          materiMinggu3: 'Lomba cepat & rapi memakai atribut seragam Siaga antarbarung',
          materiMinggu4: 'Evaluasi kebersihan kuku, kerapian pakaian, dan perawatan kacu',
          targetOutput: 'Kemandirian siswa mengenakan seragam pramuka lengkap secara benar'
        },
        {
          bulanIndex: 2,
          bulanNama: 'Maret',
          fase: 'Arah Mata Angin Pokok & Kepekaan Alam',
          fokusKompetensi: 'Mengenal 4 arah mata angin utama dan tanda-tanda cuaca',
          materiMinggu1: 'Mengenal arah terbit & terbenamnya matahari melalui lagu arah mata angin',
          materiMinggu2: 'Praktik menunjuk arah Utara, Timur, Selatan, Barat di halaman sekolah',
          materiMinggu3: 'Permainan Barung: Langkah komando arah mata angin dari Yanda/Bunda',
          materiMinggu4: 'Mengenal tanda-tanda alam sederhana (cerah, mendung, hujan) & mitigasi',
          targetOutput: 'Siswa mampu menunjukkan 4 arah mata angin utama tanpa ragu'
        },
        {
          bulanIndex: 3,
          bulanNama: 'April',
          fase: 'Permainan Besar Siaga & Pengasahan Indra (KIM)',
          fokusKompetensi: 'Melatih konsentrasi panca indera lewat permainan edukatif Siaga',
          materiMinggu1: 'Permainan KIM Lihat: Mengingat 10 benda sekolah dalam waktu 1 menit',
          materiMinggu2: 'Permainan KIM Raba & Rasa: Menebak isi kantung rahasia & rasa buah',
          materiMinggu3: 'Estafet membawa bola kelereng/tongkat barung untuk koordinasi motorik',
          materiMinggu4: 'Refleksi keceriaan bermain bersama & apresiasi barung paling kompak',
          targetOutput: 'Peningkatan daya ingat sensorik dan kekompakan sesama anggota barung'
        },
        {
          bulanIndex: 4,
          bulanNama: 'Mei',
          fase: 'Peduli Lingkungan & Pertolongan Pertama Kecil',
          fokusKompetensi: 'Keterampilan cuci tangan higienis dan pertolongan luka lecet',
          materiMinggu1: 'Praktik mencuci tangan 6 langkah dengan air mengalir dan sabun',
          materiMinggu2: 'Mengenal isi kotak P3K Siaga: Plester, minyak kayu putih, antiseptik',
          materiMinggu3: 'Simulasi menolong teman yang terjatuh di halaman & memasang plester',
          materiMinggu4: 'Aksi Barung Bersih: Memilah sampah organik/anorganik di taman sekolah',
          targetOutput: 'Siswa memiliki kepekaan tolong-menolong dan peduli kebersihan sekolah'
        },
        {
          bulanIndex: 5,
          bulanNama: 'Juni',
          fase: 'Uji SKU Siaga Mula & Persiapan Pesta Siaga',
          fokusKompetensi: 'Penyelesaian butir SKU Siaga Mula/Bantu dan unjuk kreativitas',
          materiMinggu1: 'Pengujian butir SKU Siaga Mula (rukun agama, Dwi Satya, menabung)',
          materiMinggu2: 'Latihan pentas gerak dan lagu kreasi perindukan Siaga',
          materiMinggu3: 'Simulasi pos tantangan ketangkasan Pesta Siaga tingkat pangkalan',
          materiMinggu4: 'Upacara pelantikan kenaikan tingkat Siaga Mula dan doa bersama',
          targetOutput: 'Penyematan tanda TKU Siaga Mula bagi anggota yang lulus uji kecakapan'
        },
        {
          bulanIndex: 6,
          bulanNama: 'Juli',
          fase: 'Penerimaan Anggota Baru Perindukan Siaga',
          fokusKompetensi: 'Orientasi menyenangkan bagi adik-adik kelas 1-3 yang baru bergabung',
          materiMinggu1: 'Penyambutan ramah siswa baru oleh Yanda, Bunda, Pakcik, dan Bucik',
          materiMinggu2: 'Pembagian anggota ke dalam Barung warna (Merah, Hijau, Kuning, Biru)',
          materiMinggu3: 'Pemilihan Pemimpin Barung (Pinrung) & cipta yel-yel Barung gembira',
          materiMinggu4: 'Permainan lingkaran besar: Berkenalan lewat lagu & tepuk pramuka',
          targetOutput: 'Terbentuknya formasi Barung perindukan Siaga yang solid dan ceria'
        },
        {
          bulanIndex: 7,
          bulanNama: 'Agustus',
          fase: 'Semarak Hari Pramuka & Lambang Negara',
          fokusKompetensi: 'Menghayati arti Tunas Kelapa dan rasa cinta tanah air',
          materiMinggu1: 'Mengenal arti lambang Gerakan Pramuka (Tunas Kelapa yang serbaguna)',
          materiMinggu2: 'Praktik sikap hormat bendera Merah Putih dalam upacara bendera resmi',
          materiMinggu3: 'Lomba mewarnai lambang Tunas Kelapa dan Garuda Pancasila antarbArung',
          materiMinggu4: 'Pawai Siaga ceria berkeliling sekolah dalam rangka Hari Pramuka ke-64',
          targetOutput: 'Tumbuhnya rasa bangga dan nasionalisme sejak usia dini'
        },
        {
          bulanIndex: 8,
          bulanNama: 'September',
          fase: 'PBB Siaga Ceria & Kepatuhan Aba-Aba',
          fokusKompetensi: 'Ketertiban langkah dan kesigapan merespons komando Yanda/Bunda',
          materiMinggu1: 'Latihan setengah lengan lencang kanan & lencang depan barisan barung',
          materiMinggu2: 'Latihan hadap kanan/kiri dengan panduan irama lagu berhitung Siaga',
          materiMinggu3: 'Latihan berbaris jalan berbanjar dua tanpa saling mendahului',
          materiMinggu4: 'Pemberian penghargaan barung terdisiplin dan terkompak bulan ini',
          targetOutput: 'Sikap disiplin dan keteraturan baris-berbaris Siaga yang harmonis'
        },
        {
          bulanIndex: 9,
          bulanNama: 'Oktober',
          fase: 'Hasta Karya Siaga & Hemat Energi',
          fokusKompetensi: 'Kreativitas membuat kerajinan tangan dan pembiasaan hemat energi',
          materiMinggu1: 'Membuat karya hasta karya dari daun kering / kertas lipat origami bertema alam',
          materiMinggu2: 'Membiasakan mematikan kran air dan lampu kelas setelah pembelajaran',
          materiMinggu3: 'Latihan mandiri menata tas sekolah dan alat tulis dengan rapi',
          materiMinggu4: 'Pameran mini karya hasta karya Barung di selasar sanggar pramuka',
          targetOutput: 'Peningkatan kreativitas motorik halus dan karakter peduli lingkungan'
        },
        {
          bulanIndex: 10,
          bulanNama: 'November',
          fase: 'Gemar Menabung & Tolong Menolong',
          fokusKompetensi: 'Pengamalan Dwi Darma: Siaga berbakti dan tidak putus asa',
          materiMinggu1: 'Mengenal pecahan mata uang rupiah & menyisihkan uang saku untuk tabungan',
          materiMinggu2: 'Mendengarkan kisah teladan pahlawan nasional & nilai tolong-menolong',
          materiMinggu3: 'Simulasi pasar Siaga mini: Membeli alat tulis secara jujur & tertib',
          materiMinggu4: 'Pemeriksaan buku tabungan Siaga & apresiasi anggota yang rajin menabung',
          targetOutput: 'Terbentuknya kebiasaan hemat, gemar menabung, dan kejujuran'
        },
        {
          bulanIndex: 11,
          bulanNama: 'Desember',
          fase: 'Pesta Siaga Akhir Tahun & Pelantikan Siaga Tata',
          fokusKompetensi: 'Evaluasi total capaian SKU Siaga dan rekreasi edukatif perindukan',
          materiMinggu1: 'Pentas ceria perindukan: Pertunjukan gerak tari kreasi & yel barung',
          materiMinggu2: 'Upacara pelantikan Siaga Tata bagi anggota yang menyelesaikan SKU',
          materiMinggu3: 'Piknik edukatif / rekreasi hijau di taman sekolah bersama seluruh barung',
          materiMinggu4: 'Doa syukur penutup tahun ajaran & pemberian tanda bintang kehadiran',
          targetOutput: 'Rekapitulasi capaian kecakapan Siaga dan perayaan keceriaan tahunan'
        }
      ];

      return {
        judulProta: `PROGRAM TAHUNAN GERAKAN PRAMUKA GUGUS DEPAN - PERINDUKAN SIAGA`,
        tahunAnggaran: year,
        subGolongan: 'Siaga',
        nomorGugusDepan: eskul.nomorGudep || 'Gudep 01.001 - 01.002',
        latarBelakang: `Gerakan Pramuka pangkalan ${sekolah} merupakan wadah utama pembinaan karakter, budi pekerti, dan keterampilan peserta didik. Pada golongan Perindukan Siaga (usia 7-10 tahun / Kelas 1-3 SD), pendidikan kepramukaan diselenggarakan dengan prinsip dasar kepramukaan dan metode kepramukaan yang menekankan prinsip "Bermain Sambil Belajar" (Learning by Doing). Program tahunan ini dirancang sebagai panduan operasional pembinaan selama satu tahun ajaran agar materi latihan mingguan terlaksana secara sistematis, terukur, menggembirakan, dan selaras dengan pemenuhan Syarat Kecakapan Umum (SKU) Siaga Mula, Bantu, dan Tata.`,
        dasarHukum: [
          'Undang-Undang Republik Indonesia Nomor 12 Tahun 2010 tentang Gerakan Pramuka.',
          'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.',
          'Permendikbud Nomor 62 Tahun 2014 tentang Kegiatan Ekstrakurikuler pada Pendidikan Dasar dan Pendidikan Menengah.',
          'Permendikbud Nomor 63 Tahun 2014 tentang Pendidikan Kepramukaan sebagai Kegiatan Ekstrakurikuler Wajib.',
          'Keputusan Kwartir Nasional Gerakan Pramuka tentang Petunjuk Penyelenggaraan Gugus Depan dan SKU Siaga.'
        ],
        visiMisi: `VISI: Terwujudnya Pramuka Siaga yang berakhlak mulia, ceria, mandiri, patuh pada orang tua dan pembina, serta berjiwa patriotik.\nMISI: 1) Menyelenggarakan latihan perindukan yang edukatif dan rekreatif; 2) Menanamkan pengamalan Dwi Satya dan Dwi Darma dalam kehidupan sehari-hari; 3) Mendorong penyelesaian butir-butir SKU Siaga Mula, Bantu, dan Tata secara konsisten.`,
        tujuanProgram: [
          'Menanamkan nilai-nilai moral, spiritual, dan etika kepanduan sesuai kode kehormatan Dwi Satya dan Dwi Darma.',
          'Melatih kemandirian dasar peserta didik seperti kerapian diri, simpul tali praktis, dan kebersihan lingkungan.',
          'Mengembangkan rasa percaya diri, keberanian berbicara, dan kemampuan bekerja sama dalam perindukan/barung.',
          'Memfasilitasi pencapaian tanda kecakapan umum (TKU) Siaga Mula, Bantu, hingga Siaga Tata.',
          'Mempersiapkan anggota perindukan untuk berpartisipasi aktif dalam kegiatan Pesta Siaga tingkat Gugus/Kwartir Ranting.'
        ],
        sasaranPeserta: `Peserta didik Kelas 1, 2, dan 3 ${sekolah} yang tergabung dalam Perindukan Siaga (estimasi 20-40 siswa terbagi ke dalam Barung Merah, Hijau, Kuning, Biru).`,
        jadwalDanTempat: `${eskul.jadwalLatihan || 'Setiap Hari Jumat, Pukul 13.30 - 15.00 WIB'} di ${eskul.lokasi || 'Halaman / Aula Sekolah'}.`,
        matriksTahunan: matriksSiaga,
        kegiatanBesarTahunan: [
          { nama: 'Penerimaan Tamu Siaga Baru', waktu: 'Juli', tempat: 'Halaman Sekolah', sasaran: 'Siswa Baru Kelas 1-3' },
          { nama: 'Peringatan Hari Pramuka ke-64 & Karnaval Siaga', waktu: 'Agustus', tempat: 'Lapangan Sekolah', sasaran: 'Seluruh Barung' },
          { nama: 'Pesta Siaga Tingkat Gugus Depan / Ranting', waktu: 'Oktober', tempat: 'Bumi Perkemahan / Sekolah', sasaran: 'Barung Terpilih' },
          { nama: 'Ujian Kenaikan Tingkat & Rekreasi Perindukan', waktu: 'Desember', tempat: 'Taman Sekolah', sasaran: 'Seluruh Anggota' }
        ],
        rabTahunan: [
          { uraian: 'Honorarium Pelatih Ekstrakurikuler Siaga (12 Bulan @ 4 Pertemuan)', volume: 48, satuan: 'kali kegiatan', hargaSatuan: honorSatuan, total: 48 * honorSatuan },
          { uraian: 'Pengadaan Buku SKU Siaga, Kacu & Tali Pramuka', volume: 1, satuan: 'paket', hargaSatuan: 350000, total: 350000 },
          { uraian: 'Konsumsi & Perlengkapan Pesta Siaga Internal', volume: 1, satuan: 'kegiatan', hargaSatuan: 500000, total: 500000 }
        ],
        tempatPembuatan: kota,
        tanggalPengesahan: `15 Juli ${year}`
      };
    }

    // Default: Pramuka Penggalang
    const matriksPenggalang: EskulProtaMatriksItem[] = [
      {
        bulanIndex: 0,
        bulanNama: 'Januari',
        fase: 'Kode Kehormatan & PBB Sikap Sempurna Tongkat',
        fokusKompetensi: 'Pengamalan Tri Satya, Dasa Darma & baris-berbaris dasar bertongkat',
        materiMinggu1: 'Upacara pembukaan formasi Angkare (bentuk U) & pembacaan Tri Satya-Dasa Darma',
        materiMinggu2: 'PBB di tempat: Sikap sempurna, istirahat, periksa kerapian & lencang kanan',
        materiMinggu3: 'PBB tongkat pramuka: Membawa tongkat, menyandang tongkat, dan hormat tongkat',
        materiMinggu4: 'Latihan langkah tegap, jalan di tempat & upacara penutupan formasi Angkare',
        targetOutput: 'Siswa menguasai tata upacara penggalang dan PBB tongkat dengan hentakan mantap'
      },
      {
        bulanIndex: 1,
        bulanNama: 'Februari',
        fase: 'Pioneering Tingkat Dasar (Tali Temali Praktis)',
        fokusKompetensi: 'Penguasaan 5 simpul pokok kepanduan dan ketangkasan regu',
        materiMinggu1: 'Mengenal jenis tali pandu, praktik simpul hidup, simpul mati, dan simpul anyam',
        materiMinggu2: 'Praktik simpul pangkal dan simpul jangkar menggunakan tongkat pramuka',
        materiMinggu3: 'Ikatan palang dan ikatan silang: Membuat tiang bendera darurat (2 tongkat)',
        materiMinggu4: 'Lomba ketepatan dan kekuatan ikatan pioneering darurat antarrgu',
        targetOutput: 'Kecakapan regu mendirikan konstruksi pionering dasar secara mandiri'
      },
      {
        bulanIndex: 2,
        bulanNama: 'Maret',
        fase: 'Komunikasi Sandi Lapangan (Morse & Semaphore Dasar)',
        fokusKompetensi: 'Penguasaan sandi audio (peluit) dan visual (bendera) untuk intelijen kepanduan',
        materiMinggu1: 'Alfabet sandi Morse menggunakan peluit (titik/ketukan pendek & setrip/panjang)',
        materiMinggu2: 'Praktik bendera Semaphore lingkaran 1: Huruf A sampai G dengan posisi lengan presisi',
        materiMinggu3: 'Relai sandi Morse dan Semaphore: Memecahkan pesan tersembunyi di lapangan',
        materiMinggu4: 'Evaluasi ketelitian membaca isyarat sandi dan kekompakan kerja sama regu',
        targetOutput: 'Kemampuan mengirim dan menerjemahkan kalimat sandi morse/semaphore secara akurat'
      },
      {
        bulanIndex: 3,
        bulanNama: 'April',
        fase: 'Navigasi Darat, Kompas Bidik & Tanda Jejak Alam',
        fokusKompetensi: 'Membaca 16 arah mata angin, azimut/back-azimut, dan orientasi medan',
        materiMinggu1: 'Pengenalan kompas bidik, dial, jarum magnetis, dan cara membidik sasaran',
        materiMinggu2: 'Mengenal tanda-tanda jejak menggunakan rumput, batu, dan goresan ranting',
        materiMinggu3: 'Simulasi wide game mini: Menjelajah pos dengan peta petunjuk dan tanda jejak',
        materiMinggu4: 'Uji ketepatan kembali ke titik kumpul dengan kompas dan perhitungan langkah',
        targetOutput: 'Siswa mampu menentukan arah menggunakan kompas dan membaca rute jejak alam'
      },
      {
        bulanIndex: 4,
        bulanNama: 'Mei',
        fase: 'Pertolongan Pertama (P3K) & Evakuasi Tandu Bambu',
        fokusKompetensi: 'Keterampilan medis darurat lapangan dan teknik evakuasi korban luka',
        materiMinggu1: 'Isi kotak P3K standar, sterilisasi luka lecet, dan penanganan luka bakar ringan',
        materiMinggu2: 'Praktik pembalutan luka kepala, siku, dan lutut menggunakan kain mitela',
        materiMinggu3: 'Pembuatan tandu darurat menggunakan 2 tongkat pramuka dan tali temali',
        materiMinggu4: 'Simulasi evakuasi korban kecelakaan di medan sempit secara hati-hati',
        targetOutput: 'Kesiapsiagaan anggota memberikan pertolongan pertama pada kecelakaan di sekolah'
      },
      {
        bulanIndex: 5,
        bulanNama: 'Juni',
        fase: 'Kemandirian Berkemah & Uji SKU Ramu / Rakit',
        fokusKompetensi: 'Keterampilan mendirikan tenda dan penyelesaian target SKU Penggalang',
        materiMinggu1: 'Teknik mendirikan dan membongkar tenda regu / dome secara kokoh dan rapi',
        materiMinggu2: 'Pengujian butir SKU Penggalang Ramu dan Rakit oleh dewan pembina',
        materiMinggu3: 'Simulasi api unggun mini, cipta yel-yel kreasi regu & atraksi unjuk bakat',
        materiMinggu4: 'Upacara pelantikan kenaikan tingkat SKU Ramu/Rakit dan penutupan semester',
        targetOutput: 'Penyematan tanda kenaikan tingkat TKU Penggalang Ramu/Rakit'
      },
      {
        bulanIndex: 6,
        bulanNama: 'Juli',
        fase: 'Penerimaan Tamu Penggalang & Pengorganisasian Regu',
        fokusKompetensi: 'Sosialisasi sistem beregu (Patrol System) dan regenerasi kepemimpinan',
        materiMinggu1: 'Penyambutan tamu Penggalang dari golongan Siaga / siswa baru kelas 4',
        materiMinggu2: 'Pembentukan regu putra (nama hewan) & putri (nama bunga) serta yel-yel',
        materiMinggu3: 'Musyawarah pemilihan Pratama, Pemimpin Regu (Pinru), dan Wapinru',
        materiMinggu4: 'Penyerahan bendera regu, kacu penggalang, dan apel pembukaan semester ganjil',
        targetOutput: 'Terbentuknya dewan pasukan dan struktur regu Penggalang yang aktif'
      },
      {
        bulanIndex: 7,
        bulanNama: 'Agustus',
        fase: 'Peringatan Hari Pramuka (14 Agustus) & Kemah Bakti',
        fokusKompetensi: 'Internalisasi nilai patriotisme, Tri Satya & Dasa Darma di tengah masyarakat',
        materiMinggu1: 'Latihan gladi kotor dan bersih upacara Hari Pramuka ke-64 di lapangan',
        materiMinggu2: 'Aksi bakti sosial kebersihan lingkungan pangkalan & penghijauan sekolah',
        materiMinggu3: 'Lomba ketangkasan baris-berbaris variasi tongkat antarregu',
        materiMinggu4: 'Malam renungan ulang janji kepramukaan dan syukuran peringatan Hari Pramuka',
        targetOutput: 'Peningkatan rasa bangga menjadi anggota Pramuka dan dedikasi sosial tinggi'
      },
      {
        bulanIndex: 8,
        bulanNama: 'September',
        fase: 'Sandi Kotak, Sandi Rumput & Semaphore Lanjutan',
        fokusKompetensi: 'Kecepatan pengiriman informasi rahasia dan daya nalar intelijen',
        materiMinggu1: 'Pembacaan dan penulisan sandi kotak 1, kotak 2, serta sandi rumput',
        materiMinggu2: 'Pelatihan Semaphore lingkaran 2 (H sampai N) dan lingkaran 3 (O sampai Z)',
        materiMinggu3: 'Lomba adu cepat relai pesan Semaphore jarak jauh 50 meter antarregu',
        materiMinggu4: 'Koreksi sudut ayunan bendera Semaphore dan ujian ketangkasan membaca sandi',
        targetOutput: 'Kelancaran seluruh anggota regu mengirimkan pesan sandi kompleks'
      },
      {
        bulanIndex: 9,
        bulanNama: 'Oktober',
        fase: 'Pioneering Terapan (Kreasi Gapura & Menara Pandang)',
        fokusKompetensi: 'Teknik pertukangan tali tingkat lanjut untuk perlengkapan perkemahan',
        materiMinggu1: 'Praktik ikatan canggah (menyambung dua tongkat tegak lurus)',
        materiMinggu2: 'Proyek kelompok: Membuat tiang bendera kaki tiga (tripod) mandiri',
        materiMinggu3: 'Membuat miniatur menara pandang atau gapura tenda menggunakan simpul rantai',
        materiMinggu4: 'Uji beban dan estetika konstruksi pioneering yang kokoh dan estetis',
        targetOutput: 'Penguasaan ikatan canggah dan kesiapan membuat instalasi perkemahan'
      },
      {
        bulanIndex: 10,
        bulanNama: 'November',
        fase: 'Persiapan Lomba Tingkat (LT) / Jambore Ranting',
        fokusKompetensi: 'Pemusatan latihan regu inti dan uji ketahanan fisik-mental kompetisi',
        materiMinggu1: 'Drill PBB tongkat variasi indah dengan ketukan tempo cepat dan tegas',
        materiMinggu2: 'Simulasi pos tantangan komprehensif: PBB, Morse, Semaphore, Tandu & P3K',
        materiMinggu3: 'Latihan menaksir tinggi pohon, menaksir lebar sungai, dan pembuatan peta pita',
        materiMinggu4: 'Uji kekompakan regu inti dan simulasi mental di hadapan dewan juri',
        targetOutput: 'Kesiapan kontingen sekolah menghadapi ajang Lomba Tingkat Penggalang'
      },
      {
        bulanIndex: 11,
        bulanNama: 'Desember',
        fase: 'Penjelajahan Rimba (Wide Game) & Evaluasi Tahunan',
        fokusKompetensi: 'Aplikasi total kecakapan hidup kepanduan di alam terbuka',
        materiMinggu1: 'Pengarahan rute penjelajahan alam 3-5 km dan keselamatan medan',
        materiMinggu2: 'Praktik memasak rimba (survival cooking) per regu menggunakan kompor darurat',
        materiMinggu3: 'Penjelajahan lintas alam melewati pos rintangan, morse, dan peta lokasi',
        materiMinggu4: 'Upacara penutupan latihan akhir tahun, refleksi Dasa Darma, dan apresiasi regu',
        targetOutput: 'Penyelesaian agenda tahunan dan pematangan karakter kepemimpinan regu'
      }
    ];

    return {
      judulProta: `PROGRAM KERJA & SILABUS TAHUNAN GERAKAN PRAMUKA - PASUKAN PENGGALANG`,
      tahunAnggaran: year,
      subGolongan: 'Penggalang',
      nomorGugusDepan: eskul.nomorGudep || 'Gudep 01.001 - 01.002',
      latarBelakang: `Gerakan Pramuka Gugus Depan pangkalan ${sekolah} merupakan pilar utama pendidikan watak, kedisiplinan, kepemimpinan, dan patriotisme bagi generasi muda. Pasukan Penggalang (usia 11-15 tahun / Kelas 4-6 SD) dididik dengan metode kepramukaan modern yang menitikberatkan pada sistem beregu (Patrol System), belajar di alam terbuka, kemandirian memecahkan masalah, serta komitmen terhadap Tri Satya dan Dasa Darma. Program tahunan ini disusun sebagai kerangka kerja operasional pembinaan selama satu tahun pelajaran agar target pencapaian SKU (Ramu, Rakit, Terap), SKK (Syarat Kecakapan Khusus), dan prestasi dalam ajang perlombaan kepramukaan tercapai secara terencana, konsisten, dan akuntabel.`,
      dasarHukum: [
        'Undang-Undang Republik Indonesia Nomor 12 Tahun 2010 tentang Gerakan Pramuka.',
        'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.',
        'Permendikbud Nomor 62 Tahun 2014 tentang Kegiatan Ekstrakurikuler pada Pendidikan Dasar dan Pendidikan Menengah.',
        'Permendikbud Nomor 63 Tahun 2014 tentang Pendidikan Kepramukaan sebagai Ekstrakurikuler Wajib.',
        'Keputusan Kwartir Nasional Gerakan Pramuka tentang Syarat Kecakapan Umum (SKU) Golongan Penggalang.'
      ],
      visiMisi: `VISI: Membentuk pramuka penggalang yang bertakwa, berkarakter tangguh, trampil, disiplin, berjiwa pemimpin, dan cinta tanah air.\nMISI: 1) Melaksanakan latihan kepanduan terstruktur berbasis sistem beregu; 2) Menumbuhkan keterampilan survival, pioneering, dan komunikasi sandi lapangan; 3) Mengantarkan peserta didik mencapai tingkatan Penggalang Ramu, Rakit, Terap, hingga Pramuka Garuda.`,
      tujuanProgram: [
        'Meningkatkan penghayatan dan pengamalan kode kehormatan Tri Satya dan Dasa Darma Pramuka.',
        'Melatih kecakapan kepanduan (scouting skills): PBB tongkat, pioneering, kompas, morse, semaphore, dan P3K.',
        'Membangun jiwa kepemimpinan, kerja sama regu, dan kemandirian bertahan di alam terbuka.',
        'Mendorong pencapaian Syarat Kecakapan Umum (SKU) Penggalang Ramu dan Rakit secara optimal.',
        'Mempersiapkan regu inti pangkalan untuk berpartisipasi dan berprestasi pada Lomba Tingkat (LT) dan Jambore.'
      ],
      sasaranPeserta: `Peserta didik Kelas 4, 5, dan 6 ${sekolah} yang tergabung dalam Pasukan Penggalang Putra dan Putri (Regu Garuda, Rajawali, Mawar, Melati).`,
      jadwalDanTempat: `${eskul.jadwalLatihan || 'Setiap Hari Sabtu, Pukul 08.00 - 10.00 WIB'} di ${eskul.lokasi || 'Lapangan Utama & Sanggar Pramuka Sekolah'}.`,
      matriksTahunan: matriksPenggalang,
      kegiatanBesarTahunan: [
        { nama: 'Penerimaan Tamu Penggalang & Pelantikan Regu', waktu: 'Juli', tempat: 'Halaman Sekolah', sasaran: 'Siswa Kelas 4 Baru' },
        { nama: 'Peringatan Hari Pramuka ke-64 & Aksi Bakti', waktu: 'Agustus', tempat: 'Lapangan Upacara', sasaran: 'Seluruh Pasukan' },
        { nama: 'Giat Prestasi / Simulasi Lomba Tingkat (LT)', waktu: 'Oktober', tempat: 'Lingkungan Sekolah', sasaran: 'Regu Inti Pasukan' },
        { nama: 'Perkemahan Akhir Tahun & Penjelajahan Rimba', waktu: 'Desember', tempat: 'Bumi Perkemahan', sasaran: 'Seluruh Anggota' }
      ],
      rabTahunan: [
        { uraian: 'Honorarium Pelatih Ekstrakurikuler Penggalang (12 Bulan @ 4 Pertemuan)', volume: 48, satuan: 'kali kegiatan', hargaSatuan: honorSatuan, total: 48 * honorSatuan },
        { uraian: 'Pengadaan Tongkat Pramuka, Tali Pandu, dan Bendera Semaphore', volume: 1, satuan: 'paket', hargaSatuan: 450000, total: 450000 },
        { uraian: 'Perlengkapan Kotak Obat P3K & Kain Mitela Darurat', volume: 1, satuan: 'paket', hargaSatuan: 200000, total: 200000 },
        { uraian: 'Operasional Perkemahan Akhir Tahun / Penjelajahan', volume: 1, satuan: 'kegiatan', hargaSatuan: 750000, total: 750000 }
      ],
      tempatPembuatan: kota,
      tanggalPengesahan: `15 Juli ${year}`
    };
  }

  // Generic / Eskul Lain (Tari, Olahraga, Drumband, dll)
  const eskulName = eskul.namaEskul || 'Ekstrakurikuler';
  const genericMatriks: EskulProtaMatriksItem[] = NAMA_BULAN.map((bulan, idx) => {
    const weekly = generateWeeklyMateriForAnyEskul(idx, eskul);
    const activeCustom = (eskul.matriksProtaCustom || []).filter(
      (m) => (m.text || '').trim().length > 0 && Array.isArray(m.months) && m.months.includes(idx + 1)
    );
    const faseTitle = activeCustom.length > 0
      ? activeCustom.map((m) => m.text).join(' & ')
      : `Pembinaan Fase ${idx + 1}: ${bulan} ${year}`;

    return {
      bulanIndex: idx,
      bulanNama: bulan,
      fase: faseTitle,
      fokusKompetensi: `Penguasaan materi bertahap, disiplin dan koordinasi anggota pada bidang ${eskulName}`,
      materiMinggu1: weekly[0],
      materiMinggu2: weekly[1],
      materiMinggu3: weekly[2],
      materiMinggu4: weekly[3],
      targetOutput: `Peningkatan kemahiran teknis siswa sebesar 85% dari target modul ${bulan}.`
    };
  });

  return {
    judulProta: `PROGRAM KERJA & SILABUS TAHUNAN EKSTRAKURIKULER ${eskulName.toUpperCase()}`,
    tahunAnggaran: year,
    subGolongan: 'Umum',
    latarBelakang: `Kegiatan ekstrakurikuler ${eskulName} di ${sekolah} diselenggarakan sebagai wahana pengembangan bakat, minat, kreativitas, kebugaran fisik, serta pembentukan karakter Profil Pelajar Pancasila. Program tahunan ini disusun sebagai pedoman terarah selama satu tahun pelajaran ${year} agar seluruh proses pembinaan berlangsung konsisten, berorientasi prestasi, dan akuntabel.`,
    dasarHukum: [
      'Undang-Undang Republik Indonesia Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.',
      'Permendikbud Nomor 62 Tahun 2014 tentang Kegiatan Ekstrakurikuler pada Pendidikan Dasar dan Menengah.',
      'Permendikbudristek Nomor 12 Tahun 2024 tentang Kurikulum pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Menengah.',
      `Program Kerja Sekolah dan RKAS BOSP ${sekolah} Tahun Anggaran ${year}.`
    ],
    visiMisi: `VISI: Terwujudnya peserta didik yang terampil, berprestasi, percaya diri, dan berkarakter unggul dalam bidang ${eskulName}.\nMISI: 1) Melaksanakan latihan terjadwal secara disiplin; 2) Membina kerja sama tim dan sportivitas; 3) Berpartisipasi aktif dalam perlombaan O2SN / FLS2N / festival seni antarpelajar.`,
    tujuanProgram: [
      `Menumbuhkembangkan minat dan potensi unik peserta didik di bidang ${eskulName}.`,
      `Membentuk kedisiplinan, ketangguhan mental, dan sportivitas tinggi.`,
      `Mempersiapkan tim/peserta didik sekolah untuk ajang perlombaan dan festival tingkat kecamatan/kabupaten.`,
      `Mendukung terwujudnya Profil Pelajar Pancasila yang mandiri dan bergotong royong.`
    ],
    sasaranPeserta: `Seluruh peserta didik ${sekolah} yang memiliki minat dan mendaftar pada kegiatan ekstrakurikuler ${eskulName}.`,
    jadwalDanTempat: `${eskul.jadwalLatihan || 'Setiap Minggu'} di ${eskul.lokasi || 'Lingkungan Sekolah'}.`,
    matriksTahunan: genericMatriks,
    kegiatanBesarTahunan: [
      { nama: `Perekrutan & Orientasi Anggota Baru ${eskulName}`, waktu: 'Juli', tempat: eskul.lokasi || 'Sekolah', sasaran: 'Siswa Baru' },
      { nama: `Pentas Seni / Kemeriahan HUT Kemerdekaan`, waktu: 'Agustus', tempat: 'Panggung Sekolah', sasaran: 'Warga Sekolah' },
      { nama: `Simulasi Tanding / Gladi Gelar Kompetisi`, waktu: 'November', tempat: eskul.lokasi || 'Sekolah', sasaran: 'Tim Inti' },
      { nama: `Unjuk Karya Akhir Tahun & Apresiasi`, waktu: 'Desember', tempat: 'Aula Sekolah', sasaran: 'Seluruh Anggota' }
    ],
    rabTahunan: [
      { uraian: `Honorarium Pelatih Ekstrakurikuler ${eskulName} (12 Bulan @ 4 Pertemuan)`, volume: 48, satuan: 'kali kegiatan', hargaSatuan: honorSatuan, total: 48 * honorSatuan },
      { uraian: `Pengadaan / Perawatan Perlengkapan Latihan ${eskulName}`, volume: 1, satuan: 'paket', hargaSatuan: 500000, total: 500000 }
    ],
    tempatPembuatan: kota,
    tanggalPengesahan: `15 Juli ${year}`
  };
};

export const EskulProtaView: React.FC<EskulProtaViewProps> = ({
  eskul,
  allEskulList,
  metadata,
  onSelectEskul,
  golonganPramuka,
  onChangeGolonganPramuka
}) => {
  const isPramuka = useMemo(() => {
    return (eskul?.namaEskul || '').toLowerCase().includes('pramuka');
  }, [eskul]);

  // Active Prota State
  const [protaData, setProtaData] = useState<EskulProtaConfig>(() => {
    return generateDefaultProtaConfig(eskul, metadata, golonganPramuka);
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync when eskul or golongan changes
  React.useEffect(() => {
    setProtaData(generateDefaultProtaConfig(eskul, metadata, golonganPramuka));
  }, [eskul, golonganPramuka, metadata]);

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerateAi = () => {
    const refreshed = generateDefaultProtaConfig(eskul, metadata, golonganPramuka);
    setProtaData(refreshed);
    setSuccessToast(`✨ Dokumen Program Tahunan (PROTA) berhasil diselaraskan otomatis dengan AI!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const totalHonorTahunan = useMemo(() => {
    return protaData.rabTahunan.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [protaData.rabTahunan]);

  const coaches = useMemo(() => {
    return getCoachesFromEskul(eskul);
  }, [eskul]);

  return (
    <div className="space-y-6">
      {/* 1. TOP CONTROLS & ESKUL SELECTOR (NO PRINT) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Dokumen Program Kerja &amp; Silabus Tahunan (PROTA)
                </h2>
                <p className="text-xs text-slate-500">
                  Format resmi kedinasan sekolah (Cover, Lembar Pengesahan, Bab I-V, Matriks 12 Bulan &amp; RAB).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRegenerateAi}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer active:scale-95 transition-all"
              title="Perbarui & Sinkronkan Prota dengan Kurikulum Standar"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              AI Sinkronkan PROTA
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isEditing
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditing ? 'Selesai Mengedit' : 'Edit Narasi PROTA'}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Cetak PROTA (Kertas A4)
            </button>
          </div>
        </div>

        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successToast}
          </div>
        )}

        {/* SELECTOR ESKUL & GOLONGAN PRAMUKA */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Pilih Ekstrakurikuler:</span>
            <select
              value={eskul.id}
              onChange={(e) => onSelectEskul(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allEskulList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.namaEskul} ({e.kategori})
                </option>
              ))}
            </select>
          </div>

          {/* TOGGLE KHUSUS PRAMUKA (PENGGALANG VS SIAGA) */}
          {isPramuka && (
            <div className="flex items-center gap-1.5 p-1 bg-amber-50/80 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-bold text-amber-900 px-2 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-700" />
                Golongan Pramuka:
              </span>
              <button
                type="button"
                onClick={() => onChangeGolonganPramuka && onChangeGolonganPramuka('Penggalang')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  golonganPramuka === 'Penggalang'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                <span>⚜️</span> Pasukan Penggalang (Kls 4-6)
              </button>
              <button
                type="button"
                onClick={() => onChangeGolonganPramuka && onChangeGolonganPramuka('Siaga')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  golonganPramuka === 'Siaga'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}
              >
                <span>🍀</span> Perindukan Siaga (Kls 1-3)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. FORM EDITING PANEL (JIKA MODE EDIT AKTIF) */}
      {isEditing && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-2xs no-print space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-700" /> Form Sunting Narasi &amp; Visi Misi Program Tahunan
            </h3>
            <span className="text-[10px] text-amber-800 font-semibold">Perubahan akan langsung tercermin pada lembar cetak A4</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Judul Dokumen Prota:</label>
              <input
                type="text"
                value={protaData.judulProta}
                onChange={(e) => setProtaData({ ...protaData, judulProta: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Jadwal &amp; Lokasi Latihan:</label>
              <input
                type="text"
                value={protaData.jadwalDanTempat}
                onChange={(e) => setProtaData({ ...protaData, jadwalDanTempat: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Bab I - Latar Belakang:</label>
              <textarea
                rows={3}
                value={protaData.latarBelakang}
                onChange={(e) => setProtaData({ ...protaData, latarBelakang: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Visi &amp; Misi:</label>
              <textarea
                rows={4}
                value={protaData.visiMisi}
                onChange={(e) => setProtaData({ ...protaData, visiMisi: e.target.value })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tujuan Program (Satu baris per poin):</label>
              <textarea
                rows={4}
                value={protaData.tujuanProgram.join('\n')}
                onChange={(e) => setProtaData({ ...protaData, tujuanProgram: e.target.value.split('\n') })}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. DOKUMEN CETAK A4 RESMI KEDINASAN (PRINT PREVIEW) */}
      <div className="official-doc-page bg-white border border-slate-300 rounded-none p-8 sm:p-14 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 max-w-4xl mx-auto font-serif text-black text-xs sm:text-[13px] leading-relaxed space-y-12">
        
        {/* ============================================================== */}
        {/* BAGIAN 1: HALAMAN JUDUL / COVER DOKUMEN PROGRAM TAHUNAN        */}
        {/* ============================================================== */}
        <section className="print:break-after-page min-h-[900px] flex flex-col justify-between text-center p-8 border-4 border-double border-slate-800 rounded-xl my-4">
          {/* Header Cover */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest font-sans font-bold text-slate-600">
              PEMERINTAH {metadata.provinsi || 'JAWA BARAT'} &bull; DINAS PENDIDIKAN {metadata.kabupatenKota || 'KABUPATEN BOGOR'}
            </p>
            <h1 className="text-lg sm:text-2xl font-bold uppercase font-sans tracking-wide text-slate-900">
              {metadata.namaSekolah || 'SD NEGERI CONTOH'}
            </h1>
            <p className="text-[11px] font-sans text-slate-500">
              NPSN: {metadata.npsn || '10203040'} &bull; Alamat: {metadata.desaKecamatan || 'Kecamatan'}, {metadata.kabupatenKota || 'Kabupaten Bogor'}
            </p>
            <div className="w-32 h-1 bg-slate-900 mx-auto mt-2"></div>
          </div>

          {/* Logo Tengah */}
          <div className="my-8 flex flex-col items-center justify-center">
            <div className="w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center border-2 border-slate-800 rounded-2xl p-2 bg-slate-50 shadow-xs overflow-hidden">
              {metadata.logoUrl ? (
                <img
                  src={metadata.logoUrl}
                  alt="Logo Sekolah"
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : isPramuka ? (
                <div className="text-amber-800 flex flex-col items-center">
                  <Compass className="w-16 h-16" />
                  <span className="text-[9px] font-bold mt-1 font-sans">GERAKAN PRAMUKA</span>
                </div>
              ) : (
                <Building2 className="w-16 h-16 text-slate-700" />
              )}
            </div>
            {isPramuka && (
              <span className="mt-3 text-xs font-bold font-sans tracking-widest px-3 py-1 bg-slate-100 rounded-full border border-slate-300">
                GUGUS DEPAN: {protaData.nomorGugusDepan || '01.001 - 01.002'}
              </span>
            )}
          </div>

          {/* Judul Besar Prota */}
          <div className="space-y-3 font-sans my-4">
            <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-slate-900">
              DOKUMEN PROGRAM TAHUNAN (PROTA)
            </h2>
            <h3 className="text-base sm:text-lg font-bold uppercase text-indigo-950 underline decoration-2">
              {protaData.judulProta}
            </h3>
            {isPramuka && (
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                SATUAN PENDIDIKAN DASAR &bull; GOLONGAN {golonganPramuka.toUpperCase()}
              </p>
            )}
            <p className="text-sm font-bold text-slate-700 uppercase tracking-widest pt-2">
              TAHUN PELAJARAN / ANGGARAN {metadata.tahunAnggaran || '2025'}
            </p>
          </div>

          {/* Footer Cover */}
          <div className="pt-8 border-t-2 border-slate-800 font-sans text-xs space-y-1">
            <p className="font-bold uppercase tracking-wider text-slate-900">
              TIM PEMBINA EKSTRAKURIKULER {eskul.namaEskul.toUpperCase()}
            </p>
            <p className="text-slate-600 font-medium">
              {metadata.namaSekolah || 'SD NEGERI CONTOH'} &bull; {metadata.kabupatenKota || 'KABUPATEN BOGOR'}
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 2: LEMBAR PENGESAHAN KEDINASAN                          */}
        {/* ============================================================== */}
        <section className="print:break-after-page space-y-6 pt-6">
          <div className="text-center font-sans space-y-1 pb-4 border-b-2 border-slate-900">
            <h3 className="text-base font-bold uppercase tracking-wide">
              LEMBAR PENGESAHAN DOKUMEN PROGRAM TAHUNAN
            </h3>
            <p className="text-xs font-semibold text-slate-700 uppercase">
              EKSTRAKURIKULER {eskul.namaEskul.toUpperCase()} {isPramuka ? `(GOLONGAN ${golonganPramuka.toUpperCase()})` : ''}
            </p>
            <p className="text-xs text-slate-600 uppercase">
              {(metadata.namaSekolah || 'SD NEGERI CONTOH').toUpperCase()} &bull; TAHUN {metadata.tahunAnggaran || '2025'}
            </p>
          </div>

          <div className="space-y-4 text-justify font-sans text-xs leading-relaxed pt-2">
            <p>
              Program Kerja dan Silabus Tahunan Kegiatan Ekstrakurikuler <strong>{eskul.namaEskul} {isPramuka ? `(Golongan ${golonganPramuka})` : ''}</strong> pangkalan <strong>{metadata.namaSekolah || 'SD Negeri Contoh'}</strong> Tahun Pelajaran / Anggaran <strong>{metadata.tahunAnggaran || '2025'}</strong> telah diteliti, diperiksa, dan disetujui untuk diberlakukan sebagai pedoman resmi pelaksanaan kegiatan pembinaan siswa, rencana latihan 48 pertemuan mingguan, serta pertanggungjawaban dana BOSP reguler.
            </p>

            <table className="w-full text-xs font-sans mt-4">
              <tbody>
                <tr>
                  <td className="w-44 py-1 font-semibold text-slate-700">Satuan Pendidikan</td>
                  <td className="w-4 py-1">:</td>
                  <td className="py-1 font-bold text-slate-900">{metadata.namaSekolah || 'SD Negeri Contoh'}</td>
                </tr>
                {isPramuka && (
                  <tr>
                    <td className="py-1 font-semibold text-slate-700">Gugus Depan</td>
                    <td className="py-1">:</td>
                    <td className="py-1 font-bold text-slate-900">{protaData.nomorGugusDepan || '01.001 - 01.002'}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1 font-semibold text-slate-700">Guru Pembina</td>
                  <td className="py-1">:</td>
                  <td className="py-1 font-bold text-slate-900">
                    {eskul.namaPembina || metadata.namaBendahara || 'Pembina Ekstrakurikuler'} (NIP. {eskul.nipPembina || '-'})
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold text-slate-700">Pelatih / Instruktur</td>
                  <td className="py-1">:</td>
                  <td className="py-1 font-bold text-slate-900">
                    {coaches.map((c) => c.nama).join(', ') || eskul.namaPelatih}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold text-slate-700">Alokasi Latihan</td>
                  <td className="py-1">:</td>
                  <td className="py-1 text-slate-900 font-medium">48 kali pertemuan / tahun (4 kali per bulan)</td>
                </tr>
                <tr>
                  <td className="py-1 font-semibold text-slate-700">Sumber Pendanaan</td>
                  <td className="py-1">:</td>
                  <td className="py-1 text-slate-900 font-medium">Bantuan Operasional Satuan Pendidikan (BOSP) Reguler</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-12 grid grid-cols-2 gap-8 font-sans text-xs">
            <div>
              <p>Mengetahui / Mengesahkan,</p>
              <p className="font-bold text-slate-900">
                {isPramuka ? 'Ketua Mabigus / Kepala Sekolah' : 'Kepala Sekolah'},
              </p>
              <div className="h-24"></div>
              <p className="font-bold underline text-slate-900">{metadata.kepalaSekolah || 'MAHBUBILLAH, S.Pd'}</p>
              <p>NIP. {metadata.nipKepalaSekolah || '196710151988031006'}</p>
            </div>

            <div className="text-right">
              <p>Ditetapkan di : {protaData.tempatPembuatan}</p>
              <p className="font-bold text-slate-900">
                {isPramuka ? `Pembina ${golonganPramuka},` : 'Guru Pembina Ekstrakurikuler,'}
              </p>
              <div className="h-24"></div>
              <p className="font-bold underline text-slate-900">
                {eskul.namaPembina || metadata.namaBendahara || 'Pembina Eskul'}
              </p>
              <p>NIP. {eskul.nipPembina || '-'}</p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 3: KATA PENGANTAR                                       */}
        {/* ============================================================== */}
        <section className="print:break-after-page space-y-4 pt-6">
          <div className="text-center font-sans pb-3 border-b border-slate-400">
            <h3 className="text-base font-bold uppercase tracking-wider">KATA PENGANTAR</h3>
          </div>

          <div className="space-y-3 text-justify font-serif leading-relaxed text-xs sm:text-[13px]">
            <p>
              Puji dan syukur senantiasa kita panjatkan ke hadirat Allah SWT, Tuhan Yang Maha Esa, karena atas limpahan rahmat, taufik, dan hidayah-Nya, Dokumen <strong>Program Kerja dan Silabus Tahunan (PROTA) Ekstrakurikuler {eskul.namaEskul} {isPramuka ? `Golongan ${golonganPramuka}` : ''}</strong> {metadata.namaSekolah || 'SD Negeri Contoh'} Tahun Anggaran {metadata.tahunAnggaran || '2025'} ini dapat diselesaikan dengan baik.
            </p>
            <p>
              Penyusunan Program Tahunan ini dimaksudkan sebagai pedoman operasional dan arah kebijakan bagi para pembina, pelatih, serta pihak sekolah dalam merencanakan, melaksanakan, dan mengevaluasi kegiatan latihan ekstrakurikuler selama satu tahun ajaran. Melalui pembinaan yang teratur, berjenjang, dan berkelanjutan, diharapkan bakat, minat, kedisiplinan, serta karakter Profil Pelajar Pancasila peserta didik dapat berkembang secara optimal.
            </p>
            <p>
              Dokumen ini memuat landasan hukum, maksud dan tujuan, susunan kepengurusan, matriks rencana kegiatan mingguan selama 12 bulan (Januari s.d. Desember), agenda kegiatan khusus tahunan, serta estimasi Rencana Anggaran Biaya (RAB) yang bersumber dari dana BOSP.
            </p>
            <p>
              Kami menyampaikan ucapan terima kasih dan apresiasi yang setinggi-tingginya kepada Kepala Sekolah, Dewan Guru, Komite Sekolah, para pelatih, serta seluruh orang tua peserta didik atas dukungan moril maupun materiil yang diberikan demi kelancaran kegiatan ekstrakurikuler ini. Semoga program kerja yang telah direncanakan ini dapat terealisasi secara maksimal demi kemajuan prestasi sekolah.
            </p>
          </div>

          <div className="pt-8 text-right font-sans text-xs">
            <p>{protaData.tempatPembuatan}, {protaData.tanggalPengesahan}</p>
            <p className="font-bold text-slate-900 mt-1">Tim Penyusun / Pembina Ekstrakurikuler</p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 4: BAB I - PENDAHULUAN                                  */}
        {/* ============================================================== */}
        <section className="print:break-after-page space-y-4 pt-4">
          <div className="text-center font-sans pb-2 border-b-2 border-slate-900 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wider">BAB I &bull; PENDAHULUAN</h3>
          </div>

          <div className="space-y-4 font-sans text-xs leading-relaxed text-justify">
            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">A. Latar Belakang</h4>
              <p>{protaData.latarBelakang}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">B. Dasar Hukum</h4>
              <ol className="list-decimal pl-5 space-y-1">
                {protaData.dasarHukum.map((dh, idx) => (
                  <li key={idx}>{dh}</li>
                ))}
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">C. Visi dan Misi Pembinaan</h4>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line text-slate-800">
                {protaData.visiMisi}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">D. Maksud dan Tujuan</h4>
              <ol className="list-decimal pl-5 space-y-1">
                {protaData.tujuanProgram.map((tp, idx) => (
                  <li key={idx}>{tp}</li>
                ))}
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">E. Sasaran Peserta Didik</h4>
              <p>{protaData.sasaranPeserta}</p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 5: BAB II - PENGORGANISASIAN & MANAJEMEN LATIHAN        */}
        {/* ============================================================== */}
        <section className="print:break-after-page space-y-4 pt-4">
          <div className="text-center font-sans pb-2 border-b-2 border-slate-900 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wider">BAB II &bull; PENGORGANISASIAN &amp; MANAJEMEN LATIHAN</h3>
          </div>

          <div className="space-y-4 font-sans text-xs leading-relaxed text-justify">
            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1.5">A. Struktur Kepengurusan &amp; Pembina</h4>
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-black p-2 w-12">No</th>
                    <th className="border border-black p-2">Jabatan / Peran</th>
                    <th className="border border-black p-2">Nama Pejabat / Pelatih</th>
                    <th className="border border-black p-2 w-48">Keterangan / Tugas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-center">1</td>
                    <td className="border border-black p-2 font-bold">Penanggung Jawab</td>
                    <td className="border border-black p-2">{metadata.kepalaSekolah || 'Kepala Sekolah'}</td>
                    <td className="border border-black p-2">Kepala Satuan Pendidikan / Kamabigus</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2 text-center">2</td>
                    <td className="border border-black p-2 font-bold">Guru Pembina</td>
                    <td className="border border-black p-2">{eskul.namaPembina || metadata.namaBendahara}</td>
                    <td className="border border-black p-2">Koordinator Kegiatan &amp; Administrasi</td>
                  </tr>
                  {coaches.map((c, idx) => (
                    <tr key={c.id || idx}>
                      <td className="border border-black p-2 text-center">{idx + 3}</td>
                      <td className="border border-black p-2 font-bold">{c.peran || `Pelatih ${idx + 1}`}</td>
                      <td className="border border-black p-2">{c.nama}</td>
                      <td className="border border-black p-2">Instruktur Teknis Lapangan (Honor BOSP)</td>
                    </tr>
                  ))}
                  {isPramuka && (
                    <tr>
                      <td className="border border-black p-2 text-center">{coaches.length + 3}</td>
                      <td className="border border-black p-2 font-bold">
                        {golonganPramuka === 'Penggalang' ? 'Pratama / Pinru' : 'Sulung / Pinrung'}
                      </td>
                      <td className="border border-black p-2">Pengurus Dewan Siswa Terpilih</td>
                      <td className="border border-black p-2">Pemimpin Regu / Barung Siswa</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">B. Waktu, Jadwal, dan Tempat Latihan</h4>
              <p>
                Pelaksanaan latihan rutin diselenggarakan sebanyak <strong>4 kali pertemuan per bulan</strong> (total <strong>48 kali pertemuan dalam satu tahun ajaran</strong>) dengan rincian jadwal sebagai berikut:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Waktu Pelaksanaan :</strong> {protaData.jadwalDanTempat}</li>
                <li><strong>Tempat / Fasilitas :</strong> {eskul.lokasi || 'Halaman & Aula Sekolah'}</li>
                <li><strong>Durasi Latihan :</strong> 120 Menit (2 Jam Pelatihan per pertemuan)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">C. Sarana dan Prasarana Pendukung</h4>
              <p>
                Guna menunjang efektivitas latihan, sekolah menyediakan fasilitas dan peralatan latihan yang dipelihara secara berkala melalui alokasi dana BOSP reguler, meliputi peralatan teknis, sarana keselamatan/P3K, dan sanggar penyimpanan alat.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 6: BAB III - MATRIKS SILABUS TAHUNAN 12 BULAN           */}
        {/* ============================================================== */}
        <section className="print:break-after-page space-y-4 pt-4">
          <div className="text-center font-sans pb-2 border-b-2 border-slate-900 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wider">
              BAB III &bull; MATRIKS SILABUS &amp; PROGRAM KERJA TAHUNAN (12 BULAN)
            </h3>
            <p className="text-xs text-slate-700 font-semibold uppercase">
              Rincian Silabus Latihan Mingguan (Minggu I s.d. IV) Tahun Anggaran {metadata.tahunAnggaran || '2025'}
            </p>
          </div>

          <div className="space-y-4 font-sans text-xs">
            <p className="text-justify leading-relaxed">
              Matriks silabus latihan mingguan berikut menjadi acuan materi dasar bagi pelatih dalam menyusun daftar hadir, agenda mingguan, serta bukti pelaporan SPJ LPJ bulanan:
            </p>

            <table className="w-full border-collapse border border-black text-[11px] font-sans">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-black p-1.5 w-14">Bulan</th>
                  <th className="border border-black p-1.5 w-36">Fase &amp; Fokus</th>
                  <th className="border border-black p-1.5">Uraian Materi Mingguan (Pekan I - IV)</th>
                  <th className="border border-black p-1.5 w-32">Target Capaian</th>
                </tr>
              </thead>
              <tbody>
                {protaData.matriksTahunan.map((m) => (
                  <tr key={m.bulanIndex} className="align-top">
                    <td className="border border-black p-1.5 text-center font-bold">
                      {m.bulanNama}
                    </td>
                    <td className="border border-black p-1.5">
                      <p className="font-bold text-slate-900">{m.fase}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{m.fokusKompetensi}</p>
                    </td>
                    <td className="border border-black p-1.5 space-y-1">
                      <div><span className="font-semibold text-slate-800">I.</span> {m.materiMinggu1}</div>
                      <div><span className="font-semibold text-slate-800">II.</span> {m.materiMinggu2}</div>
                      <div><span className="font-semibold text-slate-800">III.</span> {m.materiMinggu3}</div>
                      <div><span className="font-semibold text-slate-800">IV.</span> {m.materiMinggu4}</div>
                    </td>
                    <td className="border border-black p-1.5 text-[10px] text-slate-800">
                      {m.targetOutput}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tabel Agenda Kegiatan Unggulan Tahunan */}
            <div className="pt-4">
              <h4 className="font-bold text-slate-900 uppercase mb-2">
                D. Agenda Kegiatan Unggulan &amp; Insidental Tahunan
              </h4>
              <table className="w-full border-collapse border border-black text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-black p-2 w-10">No</th>
                    <th className="border border-black p-2">Nama Agenda / Kegiatan Besar</th>
                    <th className="border border-black p-2 w-28">Waktu (Bulan)</th>
                    <th className="border border-black p-2 w-40">Lokasi / Tempat</th>
                    <th className="border border-black p-2 w-36">Sasaran Peserta</th>
                  </tr>
                </thead>
                <tbody>
                  {protaData.kegiatanBesarTahunan.map((kg, idx) => (
                    <tr key={idx}>
                      <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-2 font-bold text-slate-900">{kg.nama}</td>
                      <td className="border border-black p-2 text-center">{kg.waktu}</td>
                      <td className="border border-black p-2">{kg.tempat}</td>
                      <td className="border border-black p-2 text-slate-700">{kg.sasaran}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 7: BAB IV - RENCANA ANGGARAN BIAYA (RAB) TAHUNAN        */}
        {/* ============================================================== */}
        <section className="print:break-after-page space-y-4 pt-4">
          <div className="text-center font-sans pb-2 border-b-2 border-slate-900 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wider">
              BAB IV &bull; RENCANA ANGGARAN BIAYA (RAB) ESTIMASI PEMBIAYAAN TAHUNAN
            </h3>
            <p className="text-xs text-slate-700 font-semibold uppercase">
              Sumber Dana Bantuan Operasional Satuan Pendidikan (BOSP) Reguler Tahun {metadata.tahunAnggaran || '2025'}
            </p>
          </div>

          <div className="space-y-4 font-sans text-xs leading-relaxed text-justify">
            <p>
              Estimasi pembiayaan untuk menunjang keterlaksanaan kegiatan ekstrakurikuler <strong>{eskul.namaEskul} {isPramuka ? `(Golongan ${golonganPramuka})` : ''}</strong> selama satu tahun pelajaran dialokasikan pada Rencana Kegiatan dan Anggaran Sekolah (RKAS) BOSP dengan rincian kebutuhan sebagai berikut:
            </p>

            <table className="w-full border-collapse border border-black text-xs font-sans">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-black p-2 w-10">No</th>
                  <th className="border border-black p-2">Uraian Kebutuhan Anggaran</th>
                  <th className="border border-black p-2 w-16">Volume</th>
                  <th className="border border-black p-2 w-28">Satuan</th>
                  <th className="border border-black p-2 w-28">Tarif Satuan</th>
                  <th className="border border-black p-2 w-32">Total Anggaran</th>
                </tr>
              </thead>
              <tbody>
                {protaData.rabTahunan.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-2 font-medium">{item.uraian}</td>
                    <td className="border border-black p-2 text-center font-mono">{item.volume}</td>
                    <td className="border border-black p-2 text-center text-slate-700">{item.satuan}</td>
                    <td className="border border-black p-2 text-right font-mono">{formatRupiah(item.hargaSatuan)}</td>
                    <td className="border border-black p-2 text-right font-mono font-bold">{formatRupiah(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={5} className="border border-black p-2 text-right uppercase">
                    Total Estimasi Anggaran Tahunan
                  </td>
                  <td className="border border-black p-2 text-right font-mono text-indigo-950 font-bold">
                    {formatRupiah(totalHonorTahunan)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="text-[11px] text-slate-600 italic">
              * Catatan: Realisasi pencairan honorarium pelatih dilakukan setiap bulan berdasarkan bukti daftar hadir (absensi) dan kwitansi penerimaan honor yang sah sesuai ketentuan perpajakan PPh Pasal 21.
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* BAGIAN 8: BAB V - EVALUASI & PENUTUP                           */}
        {/* ============================================================== */}
        <section className="space-y-4 pt-4">
          <div className="text-center font-sans pb-2 border-b-2 border-slate-900 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wider">BAB V &bull; EVALUASI &amp; PENUTUP</h3>
          </div>

          <div className="space-y-4 font-sans text-xs leading-relaxed text-justify">
            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">A. Mekanisme Evaluasi &amp; Pelaporan</h4>
              <p>
                Evaluasi pelaksanaan program kerja dilakukan secara berkala melalui:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li><strong>Evaluasi Bulanan :</strong> Rekapitulasi daftar hadir siswa dan pelatih, jurnal latihan mingguan, serta kelengkapan SPJ honor.</li>
                <li><strong>Evaluasi Semester :</strong> Pengujian butir Syarat Kecakapan Umum (SKU) / tes kemahiran teknik siswa, serta rapat koordinasi pembina dan kepala sekolah.</li>
                <li><strong>Evaluasi Akhir Tahun :</strong> Penyusunan Laporan Pertanggungjawaban (LPJ) tahunan pangkalan dan penetapan kenaikan tingkat anggota.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase mb-1">B. Penutup</h4>
              <p>
                Dokumen Program Kerja dan Silabus Tahunan (PROTA) Ekstrakurikuler {eskul.namaEskul} {isPramuka ? `(Golongan ${golonganPramuka})` : ''} ini disusun sebagai pedoman terpadu untuk mencapai visi dan misi pendidikan karakter di {metadata.namaSekolah || 'SD Negeri Contoh'}. Keberhasilan implementasi program ini sangat ditentukan oleh komitmen pelatih, dukungan penuh dewan guru, antusiasme peserta didik, serta sinergi yang harmonis dengan para orang tua siswa. Semoga Allah SWT senantiasa memberikan bimbingan dan kemudahan dalam mencetak generasi penerus bangsa yang unggul, berakhlak mulia, dan berprestasi.
              </p>
            </div>
          </div>

          {/* Tanda Tangan Penutup */}
          <OfficialSignatures
            kota={protaData.tempatPembuatan}
            tanggalSurat={protaData.tanggalPengesahan}
            leftPerson={{
              label: isPramuka ? 'Ketua Mabigus / Kepala Sekolah' : 'Kepala Sekolah',
              nama: metadata.kepalaSekolah || 'MAHBUBILLAH, S.Pd',
              nip: metadata.nipKepalaSekolah || '196710151988031006',
            }}
            rightPerson={{
              label: isPramuka ? `Pembina ${golonganPramuka}` : 'Guru Pembina Ekstrakurikuler',
              nama: eskul.namaPembina || metadata.namaBendahara || 'Pembina Eskul',
              nip: eskul.nipPembina || '-',
            }}
          />
        </section>

      </div>
    </div>
  );
};
