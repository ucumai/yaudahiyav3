import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  MasterEskul,
  SchoolMetadata,
  TransaksiBKU,
  MasterGuru,
  MasterSiswa,
  MonthlyArchive,
  EskulAnggota,
  EskulPelatihHonor,
  EskulPresensiPelatih,
  EskulPresensiSiswa,
  EskulPertemuanKegiatan,
  EskulProgramLaporanConfig,
  MonthEskulRecord
} from '../../types';
import { KopSuratResmi } from '../common/KopSuratResmi';
import { formatRupiah } from '../SummaryCards';
import { terbilang } from '../../utils/terbilang';
import { findCorrelatedMasterEskul } from '../../utils/klasifikasiSpjHelper';
import { getCoachesFromEskul } from '../master/EskulMasterTab';
import { EskulReportModal } from '../master/EskulReportModal';
import { getPramukaAgendaByMonth } from '../master/PramukaProgramTahunanDocument';
import { generateWeeklyMateriFromProta, generateWeeklyMateriForAnyEskul } from '../../utils/pramukaProtaIntegration';
import { findEskulProtaProfile } from '../../data/eskulProtaDataBank';
import {
  saveEskulToFirestore,
  fetchEskulFromFirestore,
  subscribeToEskulData,
  CloudSyncStatus
} from '../../lib/firebaseSync';
import { useSchool } from '../../context/SchoolContext';
import { readLS, writeLS } from '../../lib/schoolStorage';
import {
  Trophy,
  Printer,
  Download,
  Calendar,
  Users,
  Award,
  CreditCard,
  Building2,
  FileText,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  UserCheck,
  Edit3,
  FileCheck2,
  RotateCcw,
  Cloud,
  RefreshCw,
  UploadCloud,
  FileSpreadsheet,
  Plus,
  Trash2,
  Eye,
  Camera,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Clock,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Wand2,
  Receipt
} from 'lucide-react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Presets untuk materi dinamis program eskul
const DYNAMIC_PROGRAM_TEMPLATES: Record<string, {
  latarBelakang: string;
  tujuan: string[];
  materiMingguan: string[];
  hasilManfaat: string[];
  kendala: string[];
  solusi: string[];
}> = {
  tari: {
    latarBelakang: 'Ekstrakurikuler seni tari merupakan kegiatan pengembangan diri peserta didik yang bertujuan untuk menyalurkan minat dan bakat di bidang seni budaya daerah. Melalui kegiatan tari, siswa mengembangkan kepekaan rasa, kelenturan motorik, serta melestarikan budaya bangsa.',
    tujuan: [
      'Mengembangkan bakat dan minat peserta didik di bidang seni tari tradisi dan kreasi.',
      'Meningkatkan kemampuan gerak dasar (wiraga), keselarasan musik (wirama), dan ekspresi (wirasa).',
      'Menumbuhkan rasa percaya diri dan kedisiplinan berpenampilan di depan umum.',
      'Mempersiapkan tim tari sekolah untuk pergelaran seni dan FLS2N.'
    ],
    materiMingguan: [
      'Pengenalan unsur tari (wiraga, wirama, wirasa) dan pemanasan kelenturan tubuh.',
      'Teknik gerak dasar kepala, bahu, tangan (nyempurit, ngrayung) dan langkah kaki.',
      'Latihan sinkronisasi gerak dengan iringan musik dan pola lantai melingkar/diagonal.',
      'Penjiwaan gerak utuh (ekspresi mimik wajah), evaluasi kelenturan dan gladi tampil.'
    ],
    hasilManfaat: [
      'Siswa menguasai variasi gerak tari dasar dengan ketukan irama yang serasi.',
      'Tumbuhnya rasa percaya diri siswa saat berpartisipasi dalam pementasan sekolah.',
      'Terbentuknya kekompakan tim dalam menjaga formasi dan pola lantai.'
    ],
    kendala: [
      'Tingkat kelenturan tubuh peserta didik bervariasi sehingga memerlukan pembinaan berulang.',
      'Ruang kesenian terkadang terbagi dengan kegiatan ekstrakurikuler lain.'
    ],
    solusi: [
      'Memberikan bimbingan terfokus secara berkelompok bagi siswa pemula.',
      'Menjadwalkan pembagian waktu ruangan secara tertib dan disiplin.'
    ]
  },
  pramuka: {
    latarBelakang: 'Latihan rutin kepramukaan Gugus Depan pangkalan Sekolah Dasar merupakan pilar pendidikan kepanduan untuk menanamkan kedisiplinan, kemandirian, kepemimpinan, patriotisme, serta kecakapan hidup (life skills) sesuai Dasa Darma dan Tri Satya.',
    tujuan: [
      'Meningkatkan pemahaman mengenai kode kehormatan dan materi kepramukaan (Siaga & Penggalang).',
      'Melatih keterampilan bertahan hidup, baris berbaris (PBB), dan kerja sama regu.',
      'Membangun jiwa kepemimpinan serta kesiapsiagaan menghadapi berbagai tantangan lingkungan.',
      'Mempersiapkan anggota pramuka untuk mengikuti kegiatan Jambore dan Lomba Tingkat (LT).'
    ],
    materiMingguan: [
      'Materi PBB dasar (sikap sempurna, penghormatan, hadap kanan/kiri, langkah tegap).',
      'Pioneering dan tali temali praktis (simpul hidup, simpul mati, simpul pangkal, simpul jangkar).',
      'Pengenalan sandi (Morse dan Semaphore) serta dinamika kelompok/games kekompakan.',
      'Tata cara upacara penutupan latihan, penjelajahan mini (wide game) dan apel siaga.'
    ],
    hasilManfaat: [
      'Kedisiplinan dan rasa tanggung jawab siswa meningkat dalam kegiatan harian di sekolah.',
      'Siswa memahami fungsi praktis tali temali dan sandi dalam situasi kepanduan.',
      'Terbangunnya solidaritas antaranggota regu pramuka.'
    ],
    kendala: [
      'Cuaca hujan yang kadang membatasi kegiatan latihan di lapangan terbuka.',
      'Perbedaan daya tangkap siswa terhadap materi sandi dan isyarat morse.'
    ],
    solusi: [
      'Mengalihkan latihan ke selasar/teras kelas beratap saat terjadi hujan lebat.',
      'Memperbanyak metode kuis interaktif dan simulasi permainan yang menyenangkan.'
    ]
  },
  pramuka_penggalang: {
    latarBelakang: 'Latihan rutin kepramukaan Gugus Depan pangkalan Sekolah Dasar merupakan pilar pendidikan kepanduan untuk menanamkan kedisiplinan, kemandirian, kepemimpinan, patriotisme, serta kecakapan hidup (life skills) sesuai Dasa Darma dan Tri Satya bagi Pramuka Penggalang (Kelas 4-6).',
    tujuan: [
      'Meningkatkan pemahaman dan pengamalan Tri Satya serta Dasa Darma dalam kehidupan nyata.',
      'Melatih keterampilan teknik kepramukaan (PBB Bertongkat, Pioneering Tandu, Sandi Morse/Semaphore, Navigasi Kompas).',
      'Membangun jiwa kepemimpinan dalam sistem beregu (Pinru dan Wapinru).',
      'Mempersiapkan regu inti berprestasi dalam ajang Lomba Tingkat (LT) dan Jambore Ranting.'
    ],
    materiMingguan: [
      'Latihan PBB Bertongkat dan formasi barisan upacara angkare.',
      'Pioneering terapan (ikatan palang, silang, canggah, pembuatan tandu darurat & tiang bendera).',
      'Komunikasi sandi lapangan (Sandi Morse peluit/senter dan Semaphore bendera).',
      'Navigasi darat (kompas bidik, tanda jejak, peta pita) dan PPGD/P3K praktis.'
    ],
    hasilManfaat: [
      'Kedisiplinan, ketangguhan fisik, dan kemandirian siswa penggalang terasah optimal.',
      'Terbangunnya kekompakan regu (patrol system) dalam memecahkan masalah di lapangan.',
      'Kesiapan mental dan fisik menghadapi kompetisi kepanduan antarpangkalan.'
    ],
    kendala: [
      'Cuaca ekstrem saat simulasi pioneering lapangan atau penjelajahan alam.',
      'Tingkat ketelitian membaca sandi morse dan perhitungan azimut kompas bidik.'
    ],
    solusi: [
      'Mengalihkan materi teori sandi, simpul tali, dan P3K ke aula beratap saat hujan lebat.',
      'Menerapkan metode kuis kompetisi antarrgu dan relai pesan berantai yang menyenangkan.'
    ]
  },
  pramuka_siaga: {
    latarBelakang: 'Pendidikan kepramukaan Pramuka Siaga (Kelas 1-3 SD) berfokus pada pembentukan budi pekerti luhur, keceriaan, kasih sayang terhadap keluarga, kepatuhan pada aturan, serta pembiasaan hidup bersih dan rukun sesuai Dwi Satya dan Dwi Darma.',
    tujuan: [
      'Mengenal dan mengamalkan kode kehormatan Dwi Satya dan Dwi Darma dalam kehidupan sehari-hari.',
      'Menanamkan rasa cinta tanah air, bendera merah putih, dan lagu kebangsaan melalui permainan edukatif gembira.',
      'Melatih kemandirian pribadi, kerapian seragam, serta kebersihan diri dan lingkungan sekolah.',
      'Mempersiapkan anggota perindukan siaga untuk unjuk ketangkasan dalam ajang Pesta Siaga.'
    ],
    materiMingguan: [
      'Upacara pembukaan dan penutupan latihan formasi lingkaran bersama Yanda dan Bunda.',
      'Simpul dasar praktis siaga (simpul hidup, simpul mati) dan kerapian melipat kacu merah putih.',
      'Permainan edukatif kekompakan barung (estafet warna, tebak arah mata angin sederhana).',
      'Pengenalan lagu kepanduan ceria, dongeng budi pekerti teladan, dan hasta karya ramah lingkungan.'
    ],
    hasilManfaat: [
      'Siswa siaga tumbuh menjadi pribadi penurut, berbakti kepada orang tua, dan santun kepada guru.',
      'Terbangunnya rasa percaya diri, keceriaan, dan kerja sama ramah dalam ikatan Barung.',
      'Kemandirian siswa dalam merawat seragam dan perlengkapan sekolah meningkat nyata.'
    ],
    kendala: [
      'Daya konsentrasi anak usia siaga (7-10 tahun) yang dinamis dan cepat merasa lelah.',
      'Perbedaan kesiapan fisik dan kemandirian awal saat berkegiatan aktif di luar kelas.'
    ],
    solusi: [
      'Menerapkan pendekatan belajar sambil bermain (learning by doing) yang riang gembira.',
      'Memberikan jeda istirahat teratur, reward stiker bintang, dan tepuk pramuka penyemangat.'
    ]
  },
  bulutangkis: {
    latarBelakang: 'Ekstrakurikuler bulutangkis bertujuan membina kebugaran fisik, refleks, daya tahan, serta sportivitas siswa dalam cabang olahraga raket populer, sekaligus menjaring bibit atlet pelajar untuk O2SN.',
    tujuan: [
      'Menguasai teknik dasar memegang raket (forehand & backhand grip).',
      'Melatih kelincahan olah kaki (footwork) dan penempatan posisi di lapangan.',
      'Meningkatkan akurasi pukulan lob, drop shot, netting, dan smash.',
      'Memahami peraturan resmi pertandingan BWF tunggal dan ganda.'
    ],
    materiMingguan: [
      'Pemanasan kelincahan, latihan pegangan raket dan bayangan pukulan (shadow drill).',
      'Latihan servis pendek/panjang dan pukulan lob melambung ke garis belakang.',
      'Latihan teknik netting tipis serta penempatan bola menyilang (drop shot).',
      'Simulasi tanding mini (game 11 poin) dan evaluasi stamina serta sportivitas pemain.'
    ],
    hasilManfaat: [
      'Stamina fisik, kelincahan, dan koordinasi mata-tangan siswa meningkat pesat.',
      'Siswa memahami etika bertanding dan menghormati keputusan wasit/rekan.',
      'Terbentuknya pemain unggulan untuk seleksi lomba tingkat kecamatan.'
    ],
    kendala: [
      'Keterbatasan jumlah lapangan bulutangkis sehingga siswa harus bergantian.',
      'Kondisi angin apabila latihan dilakukan di lapangan semi-terbuka.'
    ],
    solusi: [
      'Menerapkan sistem rotasi latihan bergiliran dengan pos drill teknik.',
      'Menjadwalkan latihan pada pagi hari saat hembusan angin masih minim.'
    ]
  },
  futsal: {
    latarBelakang: 'Ekstrakurikuler futsal merupakan wahana pembinaan fisik, strategi tim, dan kecepatan berpikir siswa dalam permainan sepak bola mini dalam ruangan yang mengedepankan fair play dan kekompakan.',
    tujuan: [
      'Melatih teknik dasar passing menggunakan kaki bagian dalam, kontrol bola, dan dribbling.',
      'Meningkatkan kerja sama tim, komunikasi saat transisi menyerang dan bertahan.',
      'Menanamkan nilai-nilai fair play, disiplin latihan, dan mental pantang menyerah.',
      'Menyiapkan tim futsal sekolah untuk turnamen antarpelajar tingkat gugus/kecamatan.'
    ],
    materiMingguan: [
      'Pemanasan koordinasi, teknik dasar passing pendek kaki bagian dalam dan kontrol bola telapak.',
      'Teknik dribbling cepat melewati rintangan corong dan latihan tembakan (shooting) ke gawang.',
      'Latihan formasi 1-2-1 (diamond), pergerakan tanpa bola, dan rotasi pertahanan.',
      'Mini tournament internal antartim eskul serta evaluasi strategi permainan.'
    ],
    hasilManfaat: [
      'Kemampuan kontrol bola dan akurasi operan siswa meningkat signifikan.',
      'Kekompakan komunikasi antarpemain di dalam dan luar lapangan terjalin baik.',
      'Kebugaran kardiovaskular siswa terpelihara optimal.'
    ],
    kendala: [
      'Siswa kadang terbawa emosi saat permainan mini match berlangsung sengit.',
      'Sepatu dan perlengkapan pengaman (shinguard) beberapa siswa belum seragam.'
    ],
    solusi: [
      'Pelatih menekankan aturan fair play dan sanksi kartu bagi tindakan tidak sportif.',
      'Menyediakan rompi dan deker cadangan milik sekolah untuk keselamatan siswa.'
    ]
  },
  drumband: {
    latarBelakang: 'Ekstrakurikuler drumband/marching band memadukan kedisiplinan baris berbaris dengan keterampilan musikal instrumen perkusi dan melodi, memperkuat citra dan kemeriahan upacara atau pawai resmi sekolah.',
    tujuan: [
      'Mengenal teknik memukul instrumen perkusi (snare drum, bass drum, trio, cymbal) dan melodi (belira/pianika).',
      'Melatih kepekaan tempo, ketukan ritmis, dan dinamika suara ensambel.',
      'Menggabungkan permainan alat musik dengan langkah baris berbaris (marching drill).',
      'Mempersiapkan penampilan perpisahan, hari kemerdekaan, dan lomba drumband.'
    ],
    materiMingguan: [
      'Penyelarasan nada instrumen, latihan dasar ketukan tempo (rudiment dasar snare & belira).',
      'Latihan lagu wajib nasional dan mars sekolah per kelompok instrumen.',
      'Penggabungan (tutti) seluruh instrumen perkusi dan melodi secara serempak.',
      'Latihan berjalan (marching) formasi lurus dan variasi manuver sambil memainkan instrumen.'
    ],
    hasilManfaat: [
      'Siswa mampu membaca tempo dan bermain bersama dalam komposisi ensambel yang harmonis.',
      'Kedisiplinan langkah baris berbaris saat memainkan alat musik terbentuk dengan baik.',
      'Meningkatnya kebanggaan siswa menjadi duta musikal sekolah.'
    ],
    kendala: [
      'Perlu perawatan rutin pada baut dan stik instrumen agar suara tetap optimal.',
      'Perlu ketelitian tinggi dalam menyelaraskan tempo snare dan bass drum.'
    ],
    solusi: [
      'Melakukan pengecekan alat sebelum dan sesudah latihan secara berkala.',
      'Menggunakan metronom panduan suara pada awal sesi latihan tempo.'
    ]
  }
};

// Kurikulum Silabus Progresif 4 Tahap per Bulan (Materi Dinamis Minggu I s.d. IV)
interface EskulProgressiveCurriculum {
  fase: string;
  materi: [string, string, string, string];
  fokusBulanan: string;
}

const MONTH_ESKUL_PROGRESSIVE_CURRICULUM: Record<string, Record<number, EskulProgressiveCurriculum>> = {
  tari: {
    0: { // Januari
      fase: 'Fondasi Awal & Orientasi Gerak Semester Genap',
      fokusBulanan: 'Penguatan kelenturan tubuh dan pemantapan ragam gerak kepala serta tangan.',
      materi: [
        'Pemanasan kelenturan, pembentukan postur tubuh tegap dan pengenalan hitungan tempo 4/4 dasar.',
        'Drill gerak dasar kepala (gileg, godeg) dan teknik tangan (nyempurit, ngrayung) secara simetris.',
        'Latihan sinkronisasi ayunan selendang/sampur dengan langkah kaki perlahan mengikuti iringan kendang.',
        'Evaluasi koordinasi wiraga mandiri, peregangan pendinginan dan review tempo hitungan bersama.'
      ]
    },
    1: { // Februari
      fase: 'Eksplorasi Ruang & Pola Lantai Sederhana',
      fokusBulanan: 'Pengembangan kelincahan perpindahan posisi dan keserasian kelompok.',
      materi: [
        'Pemanasan dinamis dan pengulangan kombinasi gerak tangan-kaki dari pekan sebelumnya.',
        'Latihan perpindahan formasi baris lurus menjadi formasi melingkar secara bertahap dan rapi.',
        'Sinkronisasi tempo musik bertempo sedang dengan aksen gerak patah-patah dan mengalir.',
        'Simulasi pementasan mini per regu penari 4 orang untuk melatih rasa percaya diri dan senyum.'
      ]
    },
    2: { // Maret
      fase: 'Pendalaman Wirasa & Ekspresi Karakter Tari',
      fokusBulanan: 'Penjiwaan ekspresi mimik wajah dan keselarasan wiraga-wirama.',
      materi: [
        'Pemanasan relaksasi otot wajah, leher, dan pinggul untuk kelenturan gerak ekspresif.',
        'Drill ekspresi mata (lirik kanan-kiri) dan dinamika tempo gerak cepat-lambat sesuai ketukan bonang.',
        'Penggabungan babak tari pembuka dengan babak inti menggunakan properti tari sekolah.',
        'Unjuk kerja kelompok dan evaluasi detail kerapian posisi selendang saat berputar.'
      ]
    },
    3: { // April
      fase: 'Penguatan Dinamika Kelompok & Transisi Cepat',
      fokusBulanan: 'Kelancaran transisi gerak cepat dan kekompakan hentakan kaki.',
      materi: [
        'Latihan kelincahan gerak kaki (lumaksana) dan sinkronisasi hentakan dengan pola kendang.',
        'Latihan formasi pola diagonal dan zig-zag dengan transisi cepat tanpa tabrakan antarsiswa.',
        'Penyesuaian tata gerak dengan iringan gamelan/audio rekaman resolusi penuh.',
        'Evaluasi ketepatan waktu pergantian ragam gerak dan kekompakan visual seluruh anggota.'
      ]
    },
    4: { // Mei
      fase: 'Persiapan Pergelaran Seni / FLS2N (Gladi Kotor)',
      fokusBulanan: 'Penguasaan repertoar tari secara utuh dari awal sampai akhir tanpa henti.',
      materi: [
        'Pemanasan menyeluruh dan penataan posisi panggung sesuai ukuran sebenarnya.',
        'Gladi kotor babak 1 dan babak 2 dengan pemantapan ketepatan posisi sudut pandang penonton.',
        'Latihan ketahanan fisik menari secara berurutan selama 7-10 menit dengan senyum terjaga.',
        'Pengambilan nilai unjuk rasa seni tari per kelompok dan pencatatan catatan koreksi pelatih.'
      ]
    },
    5: { // Juni
      fase: 'Apresiasi & Refleksi Capaian Akhir Tahun',
      fokusBulanan: 'Evaluasi total capaian gerak dan apresiasi unjuk bakat siswa.',
      materi: [
        'Peregangan santai dan review gerakan favorit yang telah dipelajari sepanjang semester.',
        'Pementasan unjuk seni internal di hadapan dewan guru dan teman sebaya.',
        'Sesi refleksi, berbagi pengalaman belajar seni tari tradisional, dan umpan balik pelatih.',
        'Pembersihan serta inventarisasi sampur, mahkota, dan perlengkapan tari sekolah.'
      ]
    },
    6: { // Juli
      fase: 'Penerimaan Anggota Baru & Pengenalan Seni Tradisi',
      fokusBulanan: 'Orientasi keindahan seni tari dan pengenalan anatomi dasar gerak.',
      materi: [
        'Ice breaking penyambutan anggota baru, penjelasan nilai filosofis seni tari daerah.',
        'Latihan postur berdiri tegak, posisi jari tangan dasar (ngithing, nyempurit) dan sikap hormat.',
        'Mengenal irama musik tradisional dan ketukan dasar gong serta kendang.',
        'Latihan gerakan pembuka sederhana secara bersama-sama dalam satu lingkaran besar.'
      ]
    },
    7: { // Agustus
      fase: 'Penguatan Sikap & Kemeriahan HUT Kemerdekaan',
      fokusBulanan: 'Latihan tari bertema kepahlawanan / kreasi nusantara untuk pentas kemerdekaan.',
      materi: [
        'Latihan gerak bersemangat dan langkah tegap bertema tarian nusantara kreasi.',
        'Sinkronisasi formasi dinamis membentuk angka atau barisan rapi untuk pawai/pentas kemerdekaan.',
        'Gladi bersih pementasan peringatan 17 Agustus di hadapan seluruh warga sekolah.',
        'Evaluasi penampilan pasca-acara kemerdekaan dan apresiasi semangat juang anggota.'
      ]
    },
    8: { // September
      fase: 'Variasi Ragam Gerak Lanjutan',
      fokusBulanan: 'Peningkatan kesulitan gerak tangan dan putaran tubuh berirama.',
      materi: [
        'Pemanasan koordinasi gerak putar kepala dan lambaian selendang berirama cepat.',
        'Latihan teknik berputar (kenser) dengan menjaga keseimbangan tubuh dan fokus pandangan.',
        'Penggabungan gerak duduk dan gerak berdiri secara mulus mengikuti dinamika tempo musik.',
        'Evaluasi kekompakan tinggi-rendah level gerak (tingkat rendah, sedang, tinggi).'
      ]
    },
    9: { // Oktober
      fase: 'Sinkronisasi Tempo & Pola Rampak',
      fokusBulanan: 'Membangun efek visual gerak serempak (rampak) yang rapi dan memukau.',
      materi: [
        'Latihan aksen gerak serentak (canon/bergantian dan unison/bersama) antar barisan depan-belakang.',
        'Pematangan tempo irama cepat tanpa mengurangi kehalusan detail gerak jari jemari.',
        'Simulasi latihan dengan kostum latihan lengkap agar terbiasa dengan berat kain/properti.',
        'Pengamatan video latihan mandiri untuk koreksi keselarasan sudut tangan antaranggota.'
      ]
    },
    10: { // November
      fase: 'Pematangan Karya Tari Semester Ganjil',
      fokusBulanan: 'Gladi utuh repertoire karya tari dan penguatan daya tahan panggung.',
      materi: [
        'Pemanasan stamina kardio dan latihan fokus konsentrasi panggung.',
        'Run-through tarian secara utuh dari awal sampai penutup dengan iringan rekaman tanpa jeda.',
        'Koreksi mikro pada ekspresi wajah, kesigapan mata, dan kesiapan jika ada selendang terlepas.',
        'Simulasi pementasan akhir tahun dan gladi bersih lengkap dengan pencahayaan panggung.'
      ]
    },
    11: { // Desember
      fase: 'Unjuk Gelar Semester & Rekapitulasi Pembinaan',
      fokusBulanan: 'Evaluasi akhir tahun dan pameran karya tari di hadapan orang tua/sekolah.',
      materi: [
        'Pemanasan relaksasi dan persiapan mental penampilan penutup tahun.',
        'Pementasan tari persembahan pada acara pembagian rapor atau pentas seni sekolah.',
        'Pemberian piagam apresiasi dan catatan portofolio capaian gerak siswa per individu.',
        'Penyusunan rencana karya tari tradisi baru untuk program latihan tahun berikutnya.'
      ]
    }
  },
  pramuka: {
    0: { // Januari
      fase: 'Revitalisasi Kode Kehormatan & PBB Sikap Sempurna',
      fokusBulanan: 'Penanaman kedisiplinan dan penguatan baris-berbaris dasar.',
      materi: [
        'Upacara pembukaan latihan, pengucapan Dwi Darma/Dasa Darma dan apel kesiapan seragam.',
        'Latihan PBB di tempat (sikap sempurna, istirahat di tempat, periksa kerapian, dan lencang kanan).',
        'Latihan langkah tegap, jalan di tempat, dan hadap kanan/hadap kiri dengan hentakan kompak.',
        'Upacara penutupan latihan dan pembagian tugas piket kebersihan sanggar pramuka.'
      ]
    },
    1: { // Februari
      fase: 'Pioneering Tingkat Dasar (Tali Temali Praktis)',
      fokusBulanan: 'Penguasaan 5 simpul pokok kepanduan dan ketangkasan regu.',
      materi: [
        'Pengenalan jenis tali pramuka dan praktik simpul hidup, simpul mati, dan simpul anyam.',
        'Praktik simpul pangkal dan simpul jangkar menggunakan tongkat pramuka per regu.',
        'Lomba kecepatan membuat tiang bendera darurat (pioneering 2 tongkat) antarrgu.',
        'Evaluasi kekuatan ikatan dan kerapian gulungan tali pasca kegiatan latihan.'
      ]
    },
    2: { // Maret
      fase: 'Sandi Komunikasi Lapangan (Morse & Semaphore Dasar)',
      fokusBulanan: 'Penguasaan sandi visual dan audio untuk ketangkasan intelijen kepanduan.',
      materi: [
        'Pengenalan alfabet sandi Morse menggunakan peluit dan senter (ketukan pendek & panjang).',
        'Praktik gerakan bendera semaphore alfabet A sampai G dengan posisi lengan presisi.',
        'Game detektif kata rahasia: Memecahkan pesan tersembunyi antarrgu di lapangan sekolah.',
        'Refleksi ketelitian membaca sandi dan penguatan kerja sama regu.'
      ]
    },
    3: { // April
      fase: 'Navigasi Darat, Kompas & Tanda Jejak Alam',
      fokusBulanan: 'Membaca arah mata angin dan orientasi medan lingkungan sekolah.',
      materi: [
        'Pengenalan 16 arah mata angin, bagian-bagian kompas bidik, dan cara menentukan arah utara.',
        'Mengenal tanda-tanda jejak menggunakan ranting pohon, batu, dan goresan rumput.',
        'Simulasi penjelajahan mini (wide game) mencari pos dengan panduan tanda jejak tersembunyi.',
        'Evaluasi ketepatan tiba di pos tujuan dan pengecekan kelengkapan anggota regu.'
      ]
    },
    4: { // Mei
      fase: 'Pertolongan Pertama Pada Kecelakaan (P3K) & Mitigasi',
      fokusBulanan: 'Kecakapan hidup tanggap darurat dan perawatan luka ringan.',
      materi: [
        'Pengenalan isi kotak P3K standar dan cara membersihkan luka lecet/goresan.',
        'Praktik pembalutan luka kepala dan lengan menggunakan kain mitela segitiga.',
        'Simulasi pembuatan tandu darurat menggunakan 2 tongkat pramuka dan tali.',
        'Uji simulasi evakuasi korban kecelakaan ringan di lingkungan sekolah.'
      ]
    },
    5: { // Juni
      fase: 'Kemandirian Berkemah & Evaluasi Kenaikan Tingkat (SKU)',
      fokusBulanan: 'Kesiapan mendirikan tenda dan pengujian butir SKU Siaga/Penggalang.',
      materi: [
        'Teknik mendirikan dan membongkar tenda dome/regu secara cepat, rapi, dan kokoh.',
        'Pengujian butir SKU (Syarat Kecakapan Umum) oleh pembina secara objektif per anggota.',
        'Latihan api unggun mini, penampilan yel-yel kreasi per regu dan pentas budaya.',
        'Upacara pelantikan kenaikan tingkat pramuka dan doa bersama penutup tahun ajaran.'
      ]
    },
    6: { // Juli
      fase: 'Penerimaan Tamu Penggalang / Siaga Baru',
      fokusBulanan: 'Sosialisasi organisasi gugus depan dan penanaman rasa persaudaraan.',
      materi: [
        'Upacara penyambutan anggota baru Gugus Depan dan pengenalan struktur pembina sekolah.',
        'Pembentukan nama regu putra/putri, pemilihan pratama/pimpinan regu (Pinru), dan cipta yel-yel.',
        'Permainan besar kepanduan (kim rasa, kim lihat, kim raba) yang melatih kepekaan panca indera.',
        'Apel sore dan pembagian atribut kelengkapan kacu dan tanda pengenal regu.'
      ]
    },
    7: { // Agustus
      fase: 'Peringatan Hari Pramuka (14 Agustus) & Kemah Bakti',
      fokusBulanan: 'Refleksi Tri Satya & Dasa Darma melalui kegiatan bakti lingkungan sekolah.',
      materi: [
        'Latihan formasi upacara bendera khusus peringatan Hari Pramuka ke-64.',
        'Aksi baksos bersih lingkungan sekolah dan penanaman pohon apotek hidup per regu.',
        'Lomba baris-berbaris variasi indah tingkat gugus depan sekolah.',
        'Upacara renungan ulang janji kepanduan dan apresiasi regu terdisiplin.'
      ]
    },
    8: { // September
      fase: 'Semaphore Lanjutan & Sandi Kotak / Rumput',
      fokusBulanan: 'Pengembangan kemampuan transmisi pesan cepat dan sandi sandi lanjutan.',
      materi: [
        'Pelatihan bendera semaphore lingkaran alfabet H sampai N dengan kecepatan tempo ditingkatkan.',
        'Praktik menulis dan memecahkan sandi kotak 1, kotak 2, serta sandi rumput.',
        'Lomba adu cepat relai pesan semaphore dari jarak 50 meter antarrgu.',
        'Koreksi sudut tangan semaphore dan penyempurnaan teknik ayunan bendera.'
      ]
    },
    9: { // Oktober
      fase: 'Pioneering Terapan (Kreasi Meja Makan & Rak Sepatu)',
      fokusBulanan: 'Keterampilan pertukangan tali temali untuk perlengkapan bumi perkemahan.',
      materi: [
        'Praktik ikatan palang, ikatan silang, dan ikatan canggah dengan ketegangan tali maksimal.',
        'Pengerjaan proyek kelompok: Membuat miniatur rak sepatu atau menara pandang 3 kaki.',
        'Uji kekuatan beban konstruksi miniatur tongkat dan penilaian kekompakan regu.',
        'Pembongkaran dan penataan ulang tali pramuka dengan simpul rantai anti-kusut.'
      ]
    },
    10: { // November
      fase: 'Persiapan Lomba Tingkat (LT) / Jambore Ranting',
      fokusBulanan: 'Pemusatan latihan ketangkasan regu inti dan uji mental kompetisi.',
      materi: [
        'Drill PBB tongkat dengan aba-aba tegas dan gerakan bervariasi tanpa henti.',
        'Simulasi pos tantangan komprehensif: PBB, sandi morse, pioneering, dan P3K dalam waktu terbatas.',
        'Uji kekompakan yel-yel regu dan penguatan rasa percaya diri menghadapi juri lomba.',
        'Briefing kesiapan fisik, mental, dan perlengkapan regu untuk ajang perlombaan.'
      ]
    },
    11: { // Desember
      fase: 'Penjelajahan Alam Terbuka & Evaluasi Akhir Tahun',
      fokusBulanan: 'Aplikasi seluruh materi kepramukaan dalam kegiatan penjelajahan alam nyata.',
      materi: [
        'Pemeriksaan perbekalan, obat-obatan pribadi, dan arahan keselamatan penjelajahan luar kelas.',
        'Penjelajahan rute 3 km dengan pos-pos pemecahan sandi, menaksir tinggi pohon, dan lebar sungai.',
        'Memasak rimba darurat (membuat makanan hangat sederhana secara higienis per regu).',
        'Upacara penutupan latihan akhir tahun, rekapitulasi bintang kecakapan dan apresiasi pembina.'
      ]
    }
  },
  pramuka_penggalang: {
    0: {
      fase: 'Revitalisasi Kode Kehormatan & PBB Sikap Sempurna',
      fokusBulanan: 'Penanaman kedisiplinan dan penguatan baris-berbaris dasar Penggalang.',
      materi: [
        'Upacara pembukaan latihan formasi angkare, pengucapan Tri Satya & Dasa Darma.',
        'Latihan PBB di tempat (sikap sempurna, istirahat di tempat, periksa kerapian, dan lencang kanan).',
        'Latihan langkah tegap, jalan di tempat, dan hadap kanan/hadap kiri dengan hentakan kompak.',
        'Upacara penutupan latihan dan pembagian tugas piket kebersihan sanggar pramuka.'
      ]
    },
    1: {
      fase: 'Pioneering Tingkat Dasar (Tali Temali Praktis Penggalang)',
      fokusBulanan: 'Penguasaan 5 simpul pokok kepanduan dan ketangkasan regu.',
      materi: [
        'Pengenalan jenis tali pramuka dan praktik simpul hidup, simpul mati, dan simpul anyam.',
        'Praktik simpul pangkal dan simpul jangkar menggunakan tongkat pramuka per regu.',
        'Lomba kecepatan membuat tiang bendera darurat (pioneering 2 tongkat) antarrgu.',
        'Evaluasi kekuatan ikatan dan kerapian gulungan tali pasca kegiatan latihan.'
      ]
    },
    2: {
      fase: 'Sandi Komunikasi Lapangan (Morse & Semaphore Dasar)',
      fokusBulanan: 'Penguasaan sandi visual dan audio untuk ketangkasan intelijen kepanduan.',
      materi: [
        'Pengenalan alfabet sandi Morse menggunakan peluit dan senter (ketukan pendek & panjang).',
        'Praktik gerakan bendera semaphore alfabet A sampai G dengan posisi lengan presisi.',
        'Game detektif kata rahasia: Memecahkan pesan tersembunyi antarrgu di lapangan sekolah.',
        'Refleksi ketelitian membaca sandi dan penguatan kerja sama regu.'
      ]
    },
    3: {
      fase: 'Navigasi Darat, Kompas & Tanda Jejak Alam',
      fokusBulanan: 'Membaca arah mata angin dan orientasi medan lingkungan sekolah.',
      materi: [
        'Pengenalan 16 arah mata angin, bagian-bagian kompas bidik, dan cara menentukan arah utara.',
        'Mengenal tanda-tanda jejak menggunakan ranting pohon, batu, dan goresan rumput.',
        'Simulasi penjelajahan mini (wide game) mencari pos dengan panduan tanda jejak tersembunyi.',
        'Evaluasi ketepatan tiba di pos tujuan dan pengecekan kelengkapan anggota regu.'
      ]
    },
    4: {
      fase: 'Pertolongan Pertama Pada Kecelakaan (P3K) & Mitigasi',
      fokusBulanan: 'Kecakapan hidup tanggap darurat dan perawatan luka ringan.',
      materi: [
        'Pengenalan isi kotak P3K standar dan cara membersihkan luka lecet/goresan.',
        'Praktik pembalutan luka kepala dan lengan menggunakan kain mitela segitiga.',
        'Simulasi pembuatan tandu darurat menggunakan 2 tongkat pramuka dan tali.',
        'Uji simulasi evakuasi korban kecelakaan ringan di lingkungan sekolah.'
      ]
    },
    5: {
      fase: 'Kemandirian Berkemah & Evaluasi Kenaikan Tingkat (SKU)',
      fokusBulanan: 'Kesiapan mendirikan tenda dan pengujian butir SKU Penggalang (Ramu, Rakit, Terap).',
      materi: [
        'Teknik mendirikan dan membongkar tenda dome/regu secara cepat, rapi, dan kokoh.',
        'Pengujian butir SKU (Syarat Kecakapan Umum) oleh pembina secara objektif per anggota.',
        'Latihan api unggun mini, penampilan yel-yel kreasi per regu dan pentas budaya.',
        'Upacara pelantikan kenaikan tingkat pramuka dan doa bersama penutup tahun ajaran.'
      ]
    },
    6: {
      fase: 'Penerimaan Tamu Penggalang Baru & Pembentukan Regu',
      fokusBulanan: 'Sosialisasi organisasi pasukan penggalang dan penanaman rasa persaudaraan.',
      materi: [
        'Upacara penyambutan anggota baru Gugus Depan dan pengenalan struktur pembina sekolah.',
        'Pembentukan nama regu putra (hewan)/putri (bunga), pemilihan Pratama/Pinru, dan cipta yel-yel.',
        'Permainan besar kepanduan (kim rasa, kim lihat, kim raba) yang melatih kepekaan panca indera.',
        'Apel sore dan pembagian atribut kelengkapan kacu dan tanda pengenal regu.'
      ]
    },
    7: {
      fase: 'Peringatan Hari Pramuka (14 Agustus) & Kemah Bakti',
      fokusBulanan: 'Refleksi Tri Satya & Dasa Darma melalui kegiatan bakti lingkungan sekolah.',
      materi: [
        'Latihan formasi upacara bendera khusus peringatan Hari Pramuka ke-64.',
        'Aksi baksos bersih lingkungan sekolah dan penanaman pohon apotek hidup per regu.',
        'Lomba baris-berbaris variasi indah tingkat gugus depan sekolah.',
        'Upacara renungan ulang janji kepanduan dan apresiasi regu terdisiplin.'
      ]
    },
    8: {
      fase: 'Semaphore Lanjutan & Sandi Kotak / Rumput',
      fokusBulanan: 'Pengembangan kemampuan transmisi pesan cepat dan sandi sandi lanjutan.',
      materi: [
        'Pelatihan bendera semaphore lingkaran alfabet H sampai N dengan kecepatan tempo ditingkatkan.',
        'Praktik menulis dan memecahkan sandi kotak 1, kotak 2, serta sandi rumput.',
        'Lomba adu cepat relai pesan semaphore dari jarak 50 meter antarrgu.',
        'Koreksi sudut tangan semaphore dan penyempurnaan teknik ayunan bendera.'
      ]
    },
    9: {
      fase: 'Pioneering Terapan (Kreasi Meja Makan & Rak Sepatu)',
      fokusBulanan: 'Keterampilan pertukangan tali temali untuk perlengkapan bumi perkemahan.',
      materi: [
        'Praktik ikatan palang, ikatan silang, dan ikatan canggah dengan ketegangan tali maksimal.',
        'Pengerjaan proyek kelompok: Membuat miniatur rak sepatu atau menara pandang 3 kaki.',
        'Uji kekuatan beban konstruksi miniatur tongkat dan penilaian kekompakan regu.',
        'Pembongkaran dan penataan ulang tali pramuka dengan simpul rantai anti-kusut.'
      ]
    },
    10: {
      fase: 'Persiapan Lomba Tingkat (LT) / Jambore Ranting',
      fokusBulanan: 'Pemusatan latihan ketangkasan regu inti dan uji mental kompetisi.',
      materi: [
        'Drill PBB tongkat dengan aba-aba tegas dan gerakan bervariasi tanpa henti.',
        'Simulasi pos tantangan komprehensif: PBB, sandi morse, pioneering, dan P3K dalam waktu terbatas.',
        'Uji kekompakan yel-yel regu dan penguatan rasa percaya diri menghadapi juri lomba.',
        'Briefing kesiapan fisik, mental, dan perlengkapan regu untuk ajang perlombaan.'
      ]
    },
    11: {
      fase: 'Penjelajahan Alam Terbuka & Evaluasi Akhir Tahun',
      fokusBulanan: 'Aplikasi seluruh materi kepramukaan dalam kegiatan penjelajahan alam nyata.',
      materi: [
        'Pemeriksaan perbekalan, obat-obatan pribadi, dan arahan keselamatan penjelajahan luar kelas.',
        'Penjelajahan rute 3 km dengan pos-pos pemecahan sandi, menaksir tinggi pohon, dan lebar sungai.',
        'Memasak rimba darurat (membuat makanan hangat sederhana secara higienis per regu).',
        'Upacara penutupan latihan akhir tahun, rekapitulasi bintang kecakapan dan apresiasi pembina.'
      ]
    }
  },
  pramuka_siaga: {
    0: {
      fase: 'Upacara Lingkaran, Dwi Darma & Pengenalan Barung',
      fokusBulanan: 'Penanaman nilai kepatuhan, kasih sayang, dan pembagian barung warna.',
      materi: [
        'Upacara pembukaan latihan formasi lingkaran bersama Yanda dan Bunda.',
        'Pengucapan Dwi Satya dan Dwi Darma dengan sikap khidmat ceria.',
        'Permainan Siaga Tangkas: Mengenal anggota kawan dalam satu Barung.',
        'Upacara penutupan lingkaran dan salam perpisahan kepramukaan.'
      ]
    },
    1: {
      fase: 'Simpul Dasar Siaga (Simpul Hidup & Mati)',
      fokusBulanan: 'Keterampilan tali temali paling dasar untuk kerapian pribadi.',
      materi: [
        'Mengenal tali pramuka siaga dan cara menggulung rapi tanpa kusut.',
        'Praktik membuat simpul hidup untuk mengikat tiang permainan sederhana.',
        'Praktik membuat simpul mati untuk menyambung dua utas tali seimbang.',
        'Lomba estafet membuat simpul mati antarbung yang menyenangkan.'
      ]
    },
    2: {
      fase: 'Arah Mata Angin Dasar & Permainan Edukatif',
      fokusBulanan: 'Mengenal 4 arah utama mata angin dan melatih motorik kasar.',
      materi: [
        'Mengenal arah terbit dan terbenam matahari (Timur, Barat, Utara, Selatan).',
        'Permainan Kompas Siaga: Melompat ke arah mata angin sesuai aba-aba Yanda.',
        'Menyanyikan lagu-lagu kepanduan siaga gembira dengan tepuk tangan berirama.',
        'Refleksi ketertiban barung dan kebersihan lapangan latihan.'
      ]
    },
    3: {
      fase: 'Budi Pekerti, Kerapian Seragam & Membantu Keluarga',
      fokusBulanan: 'Penerapan Dwi Darma dalam kehidupan sehari-hari di rumah dan sekolah.',
      materi: [
        'Pemeriksaan kerapian seragam siaga, kacu merah putih, dan tanda barung warna.',
        'Praktik melipat pakaian/seragam sekolah secara mandiri tanpa bantuan.',
        'Cerita dongeng teladan: Berbakti kepada ayah bunda dan rukun bersama kawan.',
        'Tugas mandiri siaga: Mencatat perbuatan baik membantu orang tua di rumah.'
      ]
    },
    4: {
      fase: 'Pertolongan Pertama Sederhana (P3K Siaga)',
      fokusBulanan: 'Mengenal perawatan luka ringan dan kebiasaan hidup bersih.',
      materi: [
        'Mengenal 6 langkah mencuci tangan pakai sabun secara bersih higienis.',
        'Praktik merawat luka lecet/goresan kecil dan menempelkan plester luka.',
        'Simulasi memanggil bantuan guru atau orang dewasa saat ada teman terjatuh.',
        'Game pesan berbisik tentang nomor darurat dan nama obat luka ringan.'
      ]
    },
    5: {
      fase: 'Pengujian Butir SKU Siaga & Upacara Kenaikan Tingkat',
      fokusBulanan: 'Evaluasi Syarat Kecakapan Umum (Siaga Mula, Bantu, Tata).',
      materi: [
        'Uji butir SKU Siaga Mula/Bantu oleh Yanda dan Bunda secara ramah.',
        'Praktik unjuk kecakapan hafalan doa harian dan lagu kebangsaan.',
        'Pesta unjuk bakat siaga: Bernyanyi, berpantun, dan peragaan busana adat mini.',
        'Upacara pelantikan kenaikan tingkat Siaga dan penyematan lencana manggar hijau.'
      ]
    },
    6: {
      fase: 'Penerimaan Calon Siaga Baru & Pengenalan Perindukan',
      fokusBulanan: 'Adaptasi siswa kelas rendah (kelas 1-2) ke dunia kepramukaan siaga.',
      materi: [
        'Upacara selamat datang calon anggota siaga baru dari kelas 1 SD.',
        'Pembentukan Barung baru (Barung Merah, Hijau, Kuning, Putih) dan memilih Pinrung.',
        'Pengenalan panggilan ramah perindukan: Yanda, Bunda, Pakcik, dan Bucik.',
        'Permainan besar lingkaran gembira: Tebak suara binatang dan tepuk siaga.'
      ]
    },
    7: {
      fase: 'Peringatan Hari Pramuka & Karnaval Pesta Siaga',
      fokusBulanan: 'Merayakan Hari Pramuka ke-64 dengan semangat kebangsaan gembira.',
      materi: [
        'Mengikuti upacara bendera peringatan Hari Pramuka dengan khidmat ceria.',
        'Lomba mewarnai lambang Gerakan Pramuka (Tunas Kelapa) antarbung.',
        'Karnaval kostum kreatif bertema pahlawan nasional di lingkungan sekolah.',
        'Pemberian bingkisan apresiasi barung paling kompak dan rapi.'
      ]
    },
    8: {
      fase: 'Lagu Wajib Nasional & Permainan Panca Indera (KIM Siaga)',
      fokusBulanan: 'Pengasahan kepekaan panca indera melalui permainan KIM yang edukatif.',
      materi: [
        'Latihan menyanyikan lagu Indonesia Raya 1 bait dan Satu Nusa Satu Bangsa.',
        'Permainan KIM Lihat: Mengingat 10 benda yang diperlihatkan selama 1 menit.',
        'Permainan KIM Raba: Menebak jenis buah/benda dalam kotak tertutup.',
        'Refleksi ketelitian dan saling menghargai pendapat kawan sebarung.'
      ]
    },
    9: {
      fase: 'Keterampilan Hasta Karya Ramah Lingkungan',
      fokusBulanan: 'Pemanfaatan barang bekas sederhana menjadi kerajinan tangan bernilai.',
      materi: [
        'Mengumpulkan sampah botol plastik bersih dan kardus bekas di sekolah.',
        'Praktik membuat tempat pensil hias menggunakan botol plastik dan kertas warna.',
        'Pameran mini hasta karya barung di selasar kelas sekolah.',
        'Edukasi memilah sampah organik dan anorganik di tempat sampah sekolah.'
      ]
    },
    10: {
      fase: 'Latihan Ketangkasan Pesta Siaga Tingkat Ranting',
      fokusBulanan: 'Simulasi pos-pos lomba ketangkasan Pesta Siaga antarsatuan.',
      materi: [
        'Simulasi Pos Ketangkasan: Lempar bola keranjang dan berjalan di atas garis lurus.',
        'Simulasi Pos Keagamaan: Hafalan surat pendek atau doa harian pilihan.',
        'Simulasi Pos Kerapian: Cepat dan tepat memakai perlengkapan seragam siaga.',
        'Briefing semangat sportivitas dan kegembiraan mengikuti Pesta Siaga.'
      ]
    },
    11: {
      fase: 'Wisata Edukasi Alam & Refleksi Akhir Tahun Perindukan',
      fokusBulanan: 'Mengenal keanekaragaman tanaman sekolah dan apresiasi pembina.',
      materi: [
        'Jalan santai mengelilingi taman sekolah dan mencatat 5 jenis pohon per barung.',
        'Piknik bersama: Makan bekal sehat bersama Yanda, Bunda, dan kawan sebarung.',
        'Pemberian apresiasi Barung Teladan dan Bintang Tahunan Perindukan Siaga.',
        'Upacara penutupan perindukan akhir tahun ajaran dengan formasi lingkaran penuh haru.'
      ]
    }
  },
  bulutangkis: {
    0: { // Januari
      fase: 'Pembentukan Fisik Dasar & Pengenalan Raket',
      fokusBulanan: 'Penguatan otot pergelangan tangan, stamina kardio, dan grip raket.',
      materi: [
        'Pemanasan dinamis, lari zig-zag kelincahan (shuttle run) dan pengenalan raket standar.',
        'Latihan teknik memegang raket (forehand & backhand grip) serta drill menimang kok (juggling).',
        'Latihan servis pendek forehand dengan target sasaran kotak depan secara akurat.',
        'Pendinginan, peregangan otot lengan dan instruksi perawatan senar raket.'
      ]
    },
    1: { // Februari
      fase: 'Olah Kaki (Footwork) & Pukulan Lob Melambung',
      fokusBulanan: 'Kelincahan langkah ke empat sudut lapangan dan kekuatan pukulan lob.',
      materi: [
        'Footwork drill 6 titik lapangan tanpa raket untuk pembiasaan langkah cepat dan kembali ke tengah.',
        'Latihan pukulan lob bertahan (clear lob) dari baseline belakang ke garis belakang lawan.',
        'Latihan kombinasi footwork maju-mundur diselingi pukulan overhead lob bergantian.',
        'Simulasi game reli panjang 15 pukulan tanpa mati untuk melatih konsistensi bola.'
      ]
    },
    2: { // Maret
      fase: 'Teknik Permainan Depan Net (Netting Tipis)',
      fokusBulanan: 'Kepekaan sentuhan ujung raket dan pergerakan cepat mendekati net.',
      materi: [
        'Pemanasan reflek pergelangan tangan dan latihan stepping cepat mendekati net.',
        'Latihan teknik netting silang (cross net) dan netting lurus tipis setinggi pita net.',
        'Latihan mengantisipasi bola netting lawan dengan dorongan flick service mendadak.',
        'Mini games netting area kotak depan (game 11 poin).'
      ]
    },
    3: { // April
      fase: 'Pukulan Menyerang (Drop Shot & Smash Ringan)',
      fokusBulanan: 'Peralihan dari pukulan bertahan ke skema serangan tajam.',
      materi: [
        'Drill drop shot tajam menipu dari garis belakang yang mendarat tepat di area depan net lawan.',
        'Teknik ayunan smash lurus dengan loncatan ringan (jump smash sederhana) dan titik kontak kok di atas.',
        'Pola latihan serangan: Lob lawan disambut drop shot, diikuti sambaran di depan net.',
        'Evaluasi ketepatan timing perkenaan kok dan akurasi sudut jatuh bola.'
      ]
    },
    4: { // Mei
      fase: 'Strategi Bermain Ganda & Rotasi Lapangan',
      fokusBulanan: 'Komunikasi pasangan ganda, pembagian wilayah depan-belakang.',
      materi: [
        'Penjelasan sistem rotasi ganda: Formasi menyerang (depan-belakang) dan formasi bertahan (kiri-kanan).',
        'Drill servis pendek ganda, pengembalian servis agresif (push/drive) menyusur net.',
        'Simulasi tanding ganda dengan aturan resmi BWF sistem reli poin 21.',
        'Evaluasi kerja sama tim ganda dan perbaikan kesalahan komunikasi antarpemain.'
      ]
    },
    5: { // Juni
      fase: 'Turnamen Internal Sekolah (Liga Mini Eskul)',
      fokusBulanan: 'Uji kompetisi nyata, ketahanan mental bertanding, dan sportivitas.',
      materi: [
        'Pengundian bagan turnamen internal tunggal putra/putri dan ganda campuran.',
        'Babak penyisihan turnamen internal dengan penerapan disiplin wasit garis dan pencatat skor.',
        'Babak semifinal dan final turnamen mini serta perebutan gelar juara eskul.',
        'Penyerahan sertifikat keaktifan atlet sekolah dan review catatan teknik per siswa.'
      ]
    },
    6: { // Juli
      fase: 'Perekrutan Atlet Pemula & Pengenalan Regulasi',
      fokusBulanan: 'Pengenalan garis lapangan, tata krama bertanding, dan penyesuaian grip.',
      materi: [
        'Pengenalan ukuran lapangan bulutangkis, fungsi garis tunggal dan ganda, serta etika berjabat tangan.',
        'Drill menimang kok sisi forehand dan backhand minimal 50 kali tanpa terjatuh.',
        'Latihan ayunan raket kosong berulang untuk membentuk memori otot (shadow swing).',
        'Refleksi sesi perdana dan arahan pemakaian sepatu olahraga yang berdaya cengkeram aman.'
      ]
    },
    7: { // Agustus
      fase: 'Pukulan Drive Datar Cepat & Refleks Bertahan',
      fokusBulanan: 'Peningkatan kecepatan reaksi bola datar di area tengah lapangan.',
      materi: [
        'Pemanasan reflek cepat dengan lemparan bola tenis/kok jarak dekat.',
        'Latihan drive lurus dan drive silang dengan raket berada di atas setinggi dada.',
        'Latihan mengembalikan pukulan smash lawan dengan defense mengangkat atau memblok tipis ke net.',
        'Game adu drive cepat berpasangan 2 lawan 2 dengan tempo tinggi.'
      ]
    },
    8: { // September
      fase: 'Pematangan Pukulan Servis Akurat & Variasi Serangan',
      fokusBulanan: 'Meminimalkan kesalahan sendiri pada servis dan pengembalian bola pertama.',
      materi: [
        'Latihan servis pendek forehand/backhand menempel bibir net sebanyak 50 kok per siswa.',
        'Latihan variasi servis panjang mengejutkan (flick serve) ke sudut belakang lawan.',
        'Drill pengembalian servis dengan dorongan cepat ke tubuh lawan (body smash drive).',
        'Evaluasi statistik keberhasilan servis dan pengembalian servis per siswa.'
      ]
    },
    9: { // Oktober
      fase: 'Pola Permainan Tunggal (Single Court Coverage)',
      fokusBulanan: 'Daya tahan fisik menguasai seluruh lapangan dan variasi pukulan.',
      materi: [
        'Pola latihan sudut ke sudut (cross corner): Lob belakang, drop silang, net lurus, angkat lob.',
        'Latihan menjaga stamina pernapasan saat reli panjang di atas 20 pukulan.',
        'Simulasi pertandingan tunggal satu set 21 poin dengan pencatatan kesalahan unforced errors.',
        'Analisis taktik bermain: Menemukan kelemahan posisi lawan di lapangan.'
      ]
    },
    10: { // November
      fase: 'Persiapan Seleksi O2SN Tingkat Kecamatan',
      fokusBulanan: 'Simulasi tanding bertekanan tinggi dan pemantapan pukulan andalan.',
      materi: [
        'Pemanasan intensif dengan drill shadow footwork 3 menit tanpa henti.',
        'Simulasi tanding seleksi O2SN dengan suasana kompetitif dipimpin wasit resmi guru olahraga.',
        'Latihan khusus pengasahan pukulan andalan (finishing shot) masing-masing calon atlet.',
        'Briefing nutrisi, hidrasi, dan manajemen istirahat menjelang pertandingan resmi.'
      ]
    },
    11: { // Desember
      fase: 'Uji Kebugaran Fisik & Evaluasi Tahunan',
      fokusBulanan: 'Pengukuran kemajuan kebugaran fisik dan penyusunan profil atlet.',
      materi: [
        'Tes kebugaran jasmani pelajar (bleep test / lari bolak balik dan tes kelenturan sit-and-reach).',
        'Uji akurasi teknik pukulan (lob, drop, net, smash) ke sasaran bernilai di lapangan.',
        'Penyampaian rapor perkembangan teknik bulutangkis kepada siswa dan orang tua.',
        'Perawatan fasilitas lapangan sekolah, pembersihan karpet/lantai, dan penyimpanan kok.'
      ]
    }
  },
  futsal: {
    0: { // Januari
      fase: 'Fondasi Ball Feeling, Passing Pendek & Kontrol Telapak Kaki',
      fokusBulanan: 'Penguasaan bola spesifik futsal yang minim pantulan.',
      materi: [
        'Pemanasan dinamis, peregangan otot paha/betis, dan latihan kelincahan tangga (agility ladder).',
        'Drill sentuhan bola (ball feeling) menggunakan sol sepatu futsal (sole of the foot control).',
        'Latihan passing pendek mendatar berpasangan jarak 3-5 meter dengan kaki bagian dalam.',
        'Game rondo 4 vs 1 (kucing-kucingan) satu sentuhan untuk melatih reflek operan cepat.'
      ]
    },
    1: { // Februari
      fase: 'Dribbling Cepat & Shielding (Melindungi Bola)',
      fokusBulanan: 'Menggiring bola di ruang sempit dan proteksi dari sergapan lawan.',
      materi: [
        'Dribbling zig-zag melewati deretan corong menggunakan kaki kanan dan kiri bergantian.',
        'Teknik melindungi bola (shielding) dengan menempatkan badan di antara lawan dan bola.',
        'Latihan 1 vs 1 melewati pemain bertahan dan melakukan tembakan mendatar ke gawang.',
        'Mini game 3 vs 3 lapangan kecil dengan batas maksimal 3 sentuhan per pemain.'
      ]
    },
    2: { // Maret
      fase: 'Teknik Menembak (Shooting) Akurat & Ujung Kaki (Toe Poke)',
      fokusBulanan: 'Penyelesaian akhir cepat menggunakan punggung kaki dan moncong sepatu.',
      materi: [
        'Drill tembakan keras menggunakan punggung kaki (instep drive) mengarah ke sudut gawang.',
        'Teknik tembakan khas futsal menggunakan moncong sepatu (toe poke) untuk tembakan mendadak.',
        'Skema serangan 2 lawan 1: Operan satu-dua (one-two pass / wall pass) diakhiri tembakan langsung.',
        'Latihan kiper futsal: Posisi siap, menutup ruang tembak (split jump save) dan lemparan cepat.'
      ]
    },
    3: { // April
      fase: 'Formasi Taktik 1-2-1 (Diamond) & Rotasi Dasar',
      fokusBulanan: 'Pemahaman peran anchor (bertahan), flank (sayap), dan pivot (penyerang depan).',
      materi: [
        'Pengenalan posisi diamond futsal: Pembagian tugas anchor, flank kiri-kanan, dan pivot.',
        'Latihan pergerakan rotasi dasar saat menguasai bola (pergerakan tanpa bola / V-cut move).',
        'Latihan skema transisi dari menyerang langsung kembali menutup celah pertahanan.',
        'Simulasi game 5 vs 5 berdurasi 2 x 10 menit dengan fokus kedisiplinan posisi formasi.'
      ]
    },
    4: { // Mei
      fase: 'Eksekusi Bola Mati (Set-Piece / Kick-In & Corner)',
      fokusBulanan: 'Memaksimalkan peluang gol dari tendangan ke dalam dan sepak pojok.',
      materi: [
        'Aturan tendangan ke dalam (kick-in): Bola diam di atas garis dan batas waktu 4 detik.',
        'Skema sepak pojok variasi: Operan mendatar ke area luar kotak penalti untuk tembakan voli.',
        'Latihan pagar betis dan antisipasi tendangan bebas langsung/tidak langsung.',
        'Uji simulasi eksekusi set-piece berulang hingga tercipta gol yang terorganisir.'
      ]
    },
    5: { // Juni
      fase: 'Turnamen Futsal Antarkelas (Classmeeting)',
      fokusBulanan: 'Aplikasi nilai sportivitas, fair play, dan kekompakan tim.',
      materi: [
        'Penyusunan tim dan koordinasi teknis pertandingan persahabatan antarkelas.',
        'Pelaksanaan turnamen futsal mini dipimpin wasit guru olahraga sekolah.',
        'Penguatan aturan fair play, larangan sliding tackle berbahaya, dan saling respek.',
        'Evaluasi performa tim, penyerahan medali penghargaan dan doa penutup semester.'
      ]
    },
    6: { // Juli
      fase: 'Pengenalan Futsal Modern & Tes Kebugaran Pemula',
      fokusBulanan: 'Adaptasi lapangan vinyl/semen dan aturan dasar pertandingan.',
      materi: [
        'Pengenalan dimensi lapangan futsal, bola ukuran 4 low-bounce, dan pemakaian deker pelindung.',
        'Latihan lari akselerasi pendek dan pengereman mendadak untuk keamanan lutut.',
        'Drill passing dasar berpasangan dan teknik kontrol bola menggunakan telapak kaki.',
        'Pendinginan teratur dan penjelasan etika saling menghargai antaranggota regu.'
      ]
    },
    7: { // Agustus
      fase: 'Transisi Cepat (Counter Attack) & Pertahanan Rapat',
      fokusBulanan: 'Memanfaatkan celah serangan balik cepat saat lawan kehilangan bola.',
      materi: [
        'Latihan serangan balik kilat 3 lawan 2 dengan lebar lapangan maksimal.',
        'Teknik pertahanan zona man-to-man switching saat pemain lawan bertukar posisi.',
        'Simulasi situasi transisi kritis: Merebut bola di area pertahanan dan langsung menusuk ke gawang.',
        'Refleksi efektivitas komunikasi verbal antarpemain di lapangan.'
      ]
    },
    8: { // September
      fase: 'Keterampilan Pivot (Pemain Depan Pemantul Bola)',
      fokusBulanan: 'Pemain pivot menahan bola membelakangi gawang lawan dan membagikan assist.',
      materi: [
        'Teknik pivot menerima bola bawah tekanan bek lawan menggunakan telapak kaki.',
        'Gerakan pivot berputar (turning move) untuk melepaskan tembakan balik badan.',
        'Variasi umpan pantul pivot kepada pemain flank yang datang berlari dari belakang (lay-off pass).',
        'Game fokus peran pivot 4 vs 4 di separuh lapangan.'
      ]
    },
    9: { // Oktober
      fase: 'Power Play Sederhana & Pressing Tinggi (High Pressing)',
      fokusBulanan: 'Menekan lawan di sepertiga akhir lapangan untuk merebut bola lebih dekat.',
      materi: [
        'Taktik high pressing serentak saat lawan melakukan lemparan kiper atau tendangan ke dalam.',
        'Pengenalan situasi power play ketika tim membutuhkan gol di menit-menit akhir pertandingan.',
        'Latihan pengambilan keputusan cepat di bawah tekanan ruang sempit dan waktu 4 detik.',
        'Simulasi game situasi khusus skor tertinggal di sisa waktu 3 menit.'
      ]
    },
    10: { // November
      fase: 'Pematangan Tim Inti Sekolah untuk Turnamen Pelajar',
      fokusBulanan: 'Solidaritas mental bertanding dan efisiensi konversi peluang menjadi gol.',
      materi: [
        'Pematangan strategi tim inti melawan tim sparring partner/alumni sekolah.',
        'Latihan adu penalti futsal (titik penalti 6 meter dan 10 meter second penalty).',
        'Analisis taktik permainan melalui evaluasi papan strategi taktik futsal.',
        'Pengkondisian fisik prima dan instruksi keselamatan serta sportivitas bertanding.'
      ]
    },
    11: { // Desember
      fase: 'Evaluasi Statistik Capaian & Rekreasi Olahraga',
      fokusBulanan: 'Refleksi perkembangan teknik individu dan apresiasi semangat juang siswa.',
      materi: [
        'Uji keterampilan individu: Ketepatan passing sasaran kecil, waktu dribbling, dan power tembakan.',
        'Pertandingan rekreasi futsal santai mempererat kekeluargaan seluruh anggota eskul.',
        'Pemberian piagam pemain terdisiplin, pencetak gol terbanyak, dan pemain paling berkembang.',
        'Pengecekan dan pembersihan perlengkapan bola futsal, rompi, corong, dan gawang sekolah.'
      ]
    }
  },
  drumband: {
    0: { // Januari
      fase: 'Dasar Rudiment Ketukan & Penyelarasan Pitch Nada',
      fokusBulanan: 'Penguasaan pegangan stik (match grip) dan ketukan dasar snare serta belira.',
      materi: [
        'Pemanasan pergelangan tangan, pengenalan anatomi instrumen perkusi dan belira.',
        'Latihan rudiment dasar snare drum: Single stroke roll, double stroke roll, dan paradiddle bertempo lambat.',
        'Latihan fingering tangga nada C Mayor pada instrumen belira/glockenspiel.',
        'Penyatuan ketukan snare drum dan dentuman bass drum pada hitungan pertama (downbeat).'
      ]
    },
    1: { // Februari
      fase: 'Sinkronisasi Tempo Kelompok Instrumen',
      fokusBulanan: 'Memadukan bagian perkusi (battery) dengan bagian instrumen melodi (pit).',
      materi: [
        'Latihan lagu mars sekolah per seksi terpisah (seksi perkusi di lapangan, seksi belira di ruang musik).',
        'Latihan dinamika suara: Forte (keras), piano (lembut), crescendo (berangsur keras) dan decrescendo.',
        'Penggabungan (tutti) seksi perkusi dan belira memainkan lagu mars secara berulang dengan panduan metronom.',
        'Evaluasi keharmonisan nada dan keselarasan tempo tanpa ada instrumen yang terburu-buru.'
      ]
    },
    2: { // Maret
      fase: 'Latihan Berjalan (Marching Drill) Tanpa Alat',
      fokusBulanan: 'Kedisiplinan langkah kaki kiri-kanan serempak sesuai irama ketukan.',
      materi: [
        'Latihan langkah tegap ke depan dengan tumit mendarat pertama (roll step marching).',
        'Sinkronisasi ayunan langkah kaki dengan ketukan dasar bass drum (langkah kiri pada hitungan ganjil).',
        'Latihan manuver berputar di tempat (mark time), hadap kanan/kiri saat barisan sedang berhenti.',
        'Koreksi jarak lencang depan dan lencang kanan antarpersonel barisan drumband.'
      ]
    },
    3: { // April
      fase: 'Penggabungan Memainkan Alat Sambil Berjalan Perlahan',
      fokusBulanan: 'Menjaga konsentrasi memainkan lagu saat tubuh bergerak melangkah.',
      materi: [
        'Pemasangan harness/carrier alat pada pundak siswa dengan posisi seimbang dan aman.',
        'Latihan berjalan perlahan 8 langkah ke depan sambil memainkan pukulan single stroke ritmis.',
        'Latihan memainkan birama pembuka lagu wajib nasional sambil menjaga formasi barisan tetap lurus.',
        'Peregangan otot pundak, punggung, dan evaluasi kestabilan alat saat digendong.'
      ]
    },
    4: { // Mei
      fase: 'Formasi Manuver Lapangan & Peran Gitapati / Mayoret',
      fokusBulanan: 'Kepatuhan terhadap komando tongkat mayoret dan peluit gitapati.',
      materi: [
        'Pengenalan tanda aba-aba tongkat mayoret (mulai lagu, henti lagu, hormat, belok kanan/kiri).',
        'Latihan manuver barisan: Formasi jalan berbanjar 4 menjadi berbanjar 2 secara mulus.',
        'Latihan variasi visual gerak instrumen (horn line/stick visual flash) yang seragam dan atraktif.',
        'Simulasi penampilan display mini di lapangan utama sekolah.'
      ]
    },
    5: { // Juni
      fase: 'Pentas Akhir Tahun / Pelepasan Siswa Kelas VI',
      fokusBulanan: 'Unjuk performa musikal prima mengiringi prosesi pelepasan sekolah.',
      materi: [
        'Gladi kotor penyesuaian tata letak panggung prosesi upacara pelepasan siswa.',
        'Gladi bersih membawakan 3 repertoar lagu resmi sekolah dan lagu nasional pilihan.',
        'Penampilan resmi drumband pada prosesi pelepasan siswa dengan seragam unit lengkap.',
        'Evaluasi penampilan, pembersihan instrumen, dan penyimpanan alat di lemari musik.'
      ]
    },
    6: { // Juli
      fase: 'Audisi & Pembagian Pos Alat Anggota Baru',
      fokusBulanan: 'Penetapan posisi instrumen sesuai postur tubuh dan kepekaan ritmis siswa.',
      materi: [
        'Demonstrasi suara masing-masing instrumen (snare drum, tenor drum, bass drum, cymbal, belira).',
        'Tes kepekaan ritme: Mengikuti ketukan tempo pelatih dengan tepukan tangan per siswa.',
        'Penetapan resmi penempatan instrumen bagi setiap anggota baru eskul drumband.',
        'Pengenalan etika pemeliharaan alat: Cara memegang, meletakkan, dan menyimpan instrumen dengan benar.'
      ]
    },
    7: { // Agustus
      fase: 'Persiapan Pawai Hari Kemerdekaan 17 Agustus',
      fokusBulanan: 'Pemusatan latihan parade barisan menempuh jarak jauh membawakan lagu perjuangan.',
      materi: [
        'Latihan intensif lagu Hari Merdeka (17 Agustus) dan Maju Tak Gentar secara berulang.',
        'Latihan ketahanan fisik parade berjalan keliling rute sejauh 1-2 km di sekitar sekolah.',
        'Penyelarasan atraksi tongkat mayoret dengan hentakan cymbal dan bass drum.',
        'Penampilan pawai resmi kemerdekaan dan apresiasi dedikasi seluruh kru drumband.'
      ]
    },
    8: { // September
      fase: 'Pengayaan Repertoar Lagu Populer / Daerah',
      fokusBulanan: 'Memperkaya variasi lagu agar penampilan drumband lebih dinamis dan menghibur.',
      materi: [
        'Pengenalan partitur not angka lagu daerah Jawa Barat/Nusantara pada instrumen belira.',
        'Penyusunan aransemen pukulan snare dan bass drum yang lebih ceria dan bervariasi.',
        'Latihan seksi per seksi untuk memastikan ketepatan harmoni akor melodi.',
        'Penggabungan utuh lagu baru dan pencatatan perbaikan nada yang sumbang.'
      ]
    },
    9: { // Oktober
      fase: 'Pola Formasi Khusus & Atraksi Visual',
      fokusBulanan: 'Menciptakan konfigurasi bentuk huruf/pola lantai saat parade berjalan.',
      materi: [
        'Latihan langkah menyilang dan transisi membuka barisan membentuk formasi lingkaran besar.',
        'Latihan atraksi lempar stik snare sederhana dan putaran stik bass drum yang selaras.',
        'Koreksi ketegakan sikap tubuh siswa saat memainkan instrumen di depan dewan juri/penonton.',
        'Evaluasi kekompakan visual gerakan seluruh anggota unit drumband.'
      ]
    },
    10: { // November
      fase: 'Pemusatan Latihan Ajang Kompetisi / Lomba Drumband',
      fokusBulanan: 'Penyempurnaan tempo stabil, artikulasi pukulan jelas, dan keseragaman tempo.',
      materi: [
        'Pengecekan dan penyetelan ulang (tuning) membran snare drum dan bass drum agar suaranya bulat.',
        'Drill parade unjuk gelar dengan simulasi pembatasan waktu tampil maksimal 10 menit.',
        'Latihan kesigapan sikap hormat juri dipimpin oleh mayoret utama dan gitapati.',
        'Penguatan mental juang dan rasa bangga mewakili nama baik sekolah di ajang perlombaan.'
      ]
    },
    11: { // Desember
      fase: 'Pemeliharaan Total Instrumen & Evaluasi Capaian Tahunan',
      fokusBulanan: 'Perawatan berkala seluruh aset instrumen dan apresiasi pengurus unit.',
      materi: [
        'Pembongkaran, pelumasan baut ring, pembersihan karat, dan pengelapan seluruh membran drum.',
        'Pengecekan kelayakan senar snare, karet peredam belira, dan penggantian stik yang retak.',
        'Penyusunan inventaris resmi aset drumband sekolah dan catatan kebutuhan penambahan alat.',
        'Rapat evaluasi tahunan pembina dan pemberian piagam penghargaan bagi anggota berprestasi.'
      ]
    }
  }
};

/**
 * Mencari transaksi BKU yang bertag atau berkorelasi dengan eskul tertentu
 */
export const findHonorTransactionsForEskul = (
  eskul: MasterEskul,
  txList: TransaksiBKU[]
): TransaksiBKU[] => {
  if (!eskul || !txList || txList.length === 0) return [];

  const eskulNameClean = (eskul.namaEskul || '').toLowerCase().trim();
  const eskulKwClean = (eskul.kataKunciBKU || '').toLowerCase().trim();
  const eskulNoBkuClean = (eskul.noBkuTerkait || '').toLowerCase().trim();

  return txList.filter((tx) => {
    if (!tx) return false;
    // 1. Explicit eskulId
    if (tx.eskulId && tx.eskulId === eskul.id) return true;

    // 2. Correlated via master eskul finder
    const matched = findCorrelatedMasterEskul(tx, [eskul]);
    if (matched && matched.id === eskul.id) return true;

    // 3. Matched by noBkuTerkait
    if (eskulNoBkuClean && tx.no_bku && tx.no_bku.toLowerCase().trim() === eskulNoBkuClean) {
      return true;
    }

    // 4. Matched by kataKunciBKU
    const txText = `${tx.keterangan || ''} ${(tx.rincian_barang || []).map((r) => r.uraian_barang || '').join(' ')}`.toLowerCase();
    if (eskulKwClean && txText.includes(eskulKwClean)) {
      return true;
    }

    // 5. Matched by exact name if length > 3
    if (eskulNameClean && eskulNameClean.length > 3 && txText.includes(eskulNameClean)) {
      return true;
    }

    return false;
  });
};

interface EskulLpjViewProps {
  eskulList: MasterEskul[];
  metadata: SchoolMetadata;
  bkuData: TransaksiBKU[];
  teachers: MasterGuru[];
  students: MasterSiswa[];
  selectedEskulId?: string;
  onSelectEskulId?: (id: string) => void;
  onUpdateEskul?: (newList: MasterEskul[]) => void;
  monthlyStore?: Record<number, MonthlyArchive | null>;
  activeMonthIndex?: number;
  onSelectMonthIndex?: (monthIndex: number) => void;
}

export const EskulLpjView: React.FC<EskulLpjViewProps> = ({
  eskulList = [],
  metadata,
  bkuData = [],
  teachers = [],
  students = [],
  selectedEskulId,
  onSelectEskulId,
  onUpdateEskul,
  monthlyStore,
  activeMonthIndex,
  onSelectMonthIndex
}) => {
  // State navigasi bulan & eskul (currentMonthIndex: 0-indexed, 0 = Januari, 1 = Februari, ..., 11 = Desember)
  // Catatan: prop activeMonthIndex dari App.tsx adalah 1-indexed (1 = Januari ... 12 = Desember)
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(() => {
    if (activeMonthIndex !== undefined && activeMonthIndex >= 1 && activeMonthIndex <= 12) {
      return activeMonthIndex - 1;
    }
    return new Date().getMonth();
  });
  const [activeEskulId, setActiveEskulId] = useState<string>(
    selectedEskulId || eskulList[0]?.id || ''
  );
  const [activeSubTab, setActiveSubTab] = useState<'honor' | 'presensi' | 'laporan' | 'cetak'>('honor');
  const [printDocSelection, setPrintDocSelection] = useState<'all' | 'honor' | 'kwitansi' | 'hadir_pelatih' | 'hadir_siswa' | 'laporan' | 'program' | 'all_with_prota'>('all');
  const [isAnnualReportOpen, setIsAnnualReportOpen] = useState<boolean>(false);
  // Golongan Kepramukaan di SD: Penggalang (Kls 4-6) vs Siaga (Kls 1-3)
  const [golonganPramuka, setGolonganPramuka] = useState<'penggalang' | 'siaga'>('penggalang');
  const [pramukaMaterialFilter, setPramukaMaterialFilter] = useState<'all' | 'penggalang' | 'siaga'>('all');

  // Firestore Sync & School Context
  const { schoolId, readOnly } = useSchool();
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
  const [isSubmittingCloud, setIsSubmittingCloud] = useState<boolean>(false);
  const isSwitchingRef = useRef<boolean>(false);

  // AI Generator State for Eskul
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Store eskul records per recordKey `${monthIndex}_${eskulId}`
  const [eskulStore, setEskulStore] = useState<Record<string, MonthEskulRecord>>(() => {
    const saved = readLS<Record<string, MonthEskulRecord>>(schoolId, 'eskul_store', {});
    return saved && typeof saved === 'object' ? saved : {};
  });

  // Master Siswa khusus per Eskul (Record<eskulId, EskulAnggota[]>)
  const [masterSiswaEskulMap, setMasterSiswaEskulMap] = useState<Record<string, EskulAnggota[]>>({});

  // Synchronize incoming props (activeMonthIndex is 1-indexed: 1..12)
  useEffect(() => {
    if (activeMonthIndex !== undefined && activeMonthIndex >= 1 && activeMonthIndex <= 12) {
      const month0 = activeMonthIndex - 1;
      if (month0 !== currentMonthIndex && !isSwitchingRef.current) {
        setCurrentMonthIndex(month0);
      }
    }
  }, [activeMonthIndex, currentMonthIndex]);

  useEffect(() => {
    if (selectedEskulId && selectedEskulId !== activeEskulId) {
      setActiveEskulId(selectedEskulId);
    }
  }, [selectedEskulId]);

  // Murni hanya ambil data dari Master Eskul yang diinput pengguna
  const effectiveEskulList = useMemo(() => {
    if (eskulList && Array.isArray(eskulList) && eskulList.length > 0) return eskulList;
    const saved = readLS<MasterEskul[]>(schoolId, 'master_eskul', []);
    if (Array.isArray(saved) && saved.length > 0) return saved;
    return eskulList || [];
  }, [eskulList, schoolId]);

  // Seluruh transaksi BKU untuk bulan terpilih (0-indexed currentMonthIndex)
  const currentMonthTransactions = useMemo(() => {
    const monthNum = currentMonthIndex + 1; // 1 to 12
    const archive = monthlyStore?.[monthNum];
    if (archive?.data && archive.data.length > 0) {
      return archive.data;
    }
    // Fallback: Jika bkuData prop aktif untuk bulan ini (activeMonthIndex is 1 to 12)
    if (activeMonthIndex === monthNum && bkuData && bkuData.length > 0) {
      return bkuData;
    }
    return [];
  }, [monthlyStore, currentMonthIndex, activeMonthIndex, bkuData]);

  // HANYA menampilkan eskul yang SUDAH di-set tag-nya di BKU / RKAS untuk bulan yang aktif
  // Jika tersedia 2 tag dengan eskul sama dan pelatih berbeda, ambil 1 eskul saja (tanpa duplikasi).
  const taggedEskulInCurrentMonth = useMemo(() => {
    const filtered = effectiveEskulList.filter((eskul) => {
      const txsInMonth = findHonorTransactionsForEskul(eskul, currentMonthTransactions);
      const isSaved = eskulStore[`${currentMonthIndex}_${eskul.id}`]?.isSubmitted;
      return txsInMonth.length > 0 || isSaved;
    });
    return filtered;
  }, [effectiveEskulList, currentMonthTransactions, currentMonthIndex, eskulStore]);

  const fallbackEmptyEskul: MasterEskul = useMemo(() => ({
    id: 'empty-eskul',
    namaEskul: 'Belum Ada Ekstrakurikuler',
    kategori: 'Lainnya',
    namaPembina: metadata.namaBendahara || 'Pembina Eskul',
    namaPelatih: 'Pelatih Eskul',
    honorPerKegiatan: 75000,
    jadwalLatihan: 'Setiap Hari Kegiatan',
    lokasi: 'Sekolah',
    anggotaSiswa: []
  }), [metadata]);

  const currentEskul: MasterEskul = useMemo(() => {
    // Prioritaskan eskul yang memang memiliki tag BKU di bulan ini
    if (taggedEskulInCurrentMonth.length > 0) {
      const found = taggedEskulInCurrentMonth.find((e) => e.id === activeEskulId);
      return found || taggedEskulInCurrentMonth[0];
    }
    if (effectiveEskulList.length > 0) {
      const found = effectiveEskulList.find((e) => e.id === activeEskulId);
      return found || effectiveEskulList[0];
    }
    return fallbackEmptyEskul;
  }, [taggedEskulInCurrentMonth, effectiveEskulList, activeEskulId, fallbackEmptyEskul]);

  // Sinkronkan activeEskulId jika eskul saat ini tidak ada dalam daftar yang bertag di bulan berjalan
  useEffect(() => {
    if (taggedEskulInCurrentMonth.length > 0 && !taggedEskulInCurrentMonth.some((e) => e.id === activeEskulId)) {
      const firstAvailable = taggedEskulInCurrentMonth[0];
      setActiveEskulId(firstAvailable.id);
      if (onSelectEskulId) onSelectEskulId(firstAvailable.id);
    }
  }, [taggedEskulInCurrentMonth, activeEskulId, onSelectEskulId]);

  // Current record key: e.g. "2_eskul-tari" (Maret - Tari)
  const currentRecordKey = useMemo(() => {
    return `${currentMonthIndex}_${currentEskul?.id || 'default'}`;
  }, [currentMonthIndex, currentEskul?.id]);

  // Transaksi BKU khusus untuk eskul yang sedang aktif di bulan terpilih
  const currentEskulTransactions = useMemo(() => {
    return findHonorTransactionsForEskul(currentEskul, currentMonthTransactions);
  }, [currentEskul, currentMonthTransactions]);

  const currentPrimaryTx = useMemo(() => {
    return currentEskulTransactions.length > 0 ? currentEskulTransactions[0] : null;
  }, [currentEskulTransactions]);

  const hasBkuInCurrentMonth = currentEskulTransactions.length > 0;

  // Korelasi Program Kerja Tahunan dengan Realisasi Bulan Ini (Minimal, Umum & Mendalam)
  const isPramukaEskul = (currentEskul.namaEskul || '').toLowerCase().includes('pramuka') || currentEskul.kategori === 'Kepanduan';
  const isSiagaEskul = (currentEskul.namaEskul || '').toLowerCase().includes('siaga');

  // Agenda Tahunan Siaga & Penggalang
  const pramukaSiagaAgendas = useMemo(() => {
    return getPramukaAgendaByMonth(currentMonthIndex, true).map((a) => a.kegiatan);
  }, [currentMonthIndex]);

  const pramukaPenggalangAgendas = useMemo(() => {
    return getPramukaAgendaByMonth(currentMonthIndex, false).map((a) => a.kegiatan);
  }, [currentMonthIndex]);

  // Materi Mingguan Siaga & Penggalang Terintegrasi Langsung dengan PROTA
  const siagaTemplateMateri = useMemo(() => {
    return generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul, true);
  }, [currentMonthIndex, currentEskul]);

  const penggalangTemplateMateri = useMemo(() => {
    return generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul, false);
  }, [currentMonthIndex, currentEskul]);

  const monthlyScheduledAgendas = useMemo(() => {
    const monthNum = currentMonthIndex + 1; // 1 s.d. 12

    // 1. PRIORITAS UTAMA: Matriks PROTA Custom dari Data Master yang dicentang oleh user
    if (Array.isArray(currentEskul?.matriksProtaCustom) && currentEskul.matriksProtaCustom.length > 0) {
      const activeCustomItems = currentEskul.matriksProtaCustom
        .filter((m) => (m.text || '').trim().length > 0 && Array.isArray(m.months) && m.months.includes(monthNum))
        .map((m) => m.text.trim());

      if (activeCustomItems.length > 0) {
        return activeCustomItems;
      }
    }

    if (isPramukaEskul) {
      return [...pramukaSiagaAgendas, ...pramukaPenggalangAgendas];
    }

    const profile = findEskulProtaProfile(currentEskul?.namaEskul || '', currentEskul?.kategori);
    if (profile && profile.kurikulum12Bulan && profile.kurikulum12Bulan[currentMonthIndex]) {
      const monthData = profile.kurikulum12Bulan[currentMonthIndex];
      return [
        monthData.fokusBulanan,
        ...monthData.materiMinggu.map((m) => m.split(':')[0] || m.slice(0, 50))
      ];
    }

    const cleanName = currentEskul?.namaEskul || 'Ekstrakurikuler';
    const defaultGeneralAgendas = [
      `Latihan Rutin Mingguan & Penguatan Fisik Dasar ${cleanName}`,
      `Pendalaman Teknik & Keterampilan Khusus ${cleanName}`,
      `Simulasi Unjuk Kerja & Pembinaan Disiplin Siswa`,
      `Evaluasi Capaian Pembinaan & Refleksi Bulanan`
    ];

    if (currentMonthIndex === 6 || currentMonthIndex === 7) {
      return [`Penerimaan Anggota Baru & Orientasi Awal ${cleanName}`, ...defaultGeneralAgendas.slice(0, 3)];
    }
    if (currentMonthIndex === 7) {
      return [`Lomba / Penampilan Peringatan HUT RI ${cleanName}`, ...defaultGeneralAgendas.slice(0, 3)];
    }
    if (currentMonthIndex === 5 || currentMonthIndex === 11) {
      return [...defaultGeneralAgendas.slice(0, 2), `Uji Coba / Unjuk Kebolehan ${cleanName}`, 'Evaluasi & Rekapitulasi Semester'];
    }
    return defaultGeneralAgendas;
  }, [isPramukaEskul, pramukaSiagaAgendas, pramukaPenggalangAgendas, currentMonthIndex, currentEskul]);

  // Template key detection (tari, pramuka_penggalang, pramuka_siaga, bulutangkis, futsal, drumband)
  const eskulTypeKey = useMemo(() => {
    const name = (currentEskul?.namaEskul || '').toLowerCase();
    const isPramuka = name.includes('pramuka') || currentEskul?.kategori === 'Kepanduan';
    if (isPramuka) {
      return 'pramuka_penggalang';
    }
    if (name.includes('tari')) return 'tari';
    if (name.includes('bulutangkis') || name.includes('badminton')) return 'bulutangkis';
    if (name.includes('futsal') || name.includes('sepak bola') || name.includes('mini soccer')) return 'futsal';
    if (name.includes('drumband') || name.includes('marching')) return 'drumband';
    return 'tari';
  }, [currentEskul]);

  // Generate Default Fresh Record for Month + Eskul (Clean Slate - No Stall Data!)
  const generateCleanRecord = (monthIdx: number, eskul?: MasterEskul | null): MonthEskulRecord => {
    const safeEskul = eskul || currentEskul || fallbackEmptyEskul;
    const template = DYNAMIC_PROGRAM_TEMPLATES[eskulTypeKey] || DYNAMIC_PROGRAM_TEMPLATES.tari;
    const monthName = NAMA_BULAN[monthIdx];
    const year = metadata.tahunAnggaran || '2025';

    // Dapatkan data BKU target bulan ini (targetMonthNum is 1 to 12)
    const targetMonthNum = monthIdx + 1;
    const targetArchive = monthlyStore?.[targetMonthNum];
    const targetMonthTxs = (targetArchive?.data && targetArchive.data.length > 0)
      ? targetArchive.data
      : (activeMonthIndex === targetMonthNum ? bkuData : []);

    const matchedTxs = findHonorTransactionsForEskul(safeEskul, targetMonthTxs);
    const hasBkuHonor = matchedTxs.length > 0;

    let realHk = 0;
    let honorSatuan = Number(safeEskul?.honorPerKegiatan) || 75000;
    let primaryTx: TransaksiBKU | null = null;

    if (hasBkuHonor) {
      primaryTx = matchedTxs[0];
      const rincian = primaryTx.rincian_barang?.[0];
      if (rincian?.harga_satuan && Number(rincian.harga_satuan) > 0) {
        honorSatuan = Number(rincian.harga_satuan);
      }

      let calcHk = Number(rincian?.volume);
      if (!calcHk || isNaN(calcHk) || calcHk <= 0) {
        if (primaryTx.total_pengeluaran_bku && honorSatuan > 0) {
          calcHk = Math.round(primaryTx.total_pengeluaran_bku / honorSatuan);
        } else {
          calcHk = 4;
        }
      }
      realHk = Math.max(1, Math.min(calcHk, 4));
    } else {
      realHk = 0;
    }

    // 1. Honor Pelatih Default (0 HK jika tidak ada rencana/realisasi di BKU bulan ini)
    let defaultPelatihList: EskulPelatihHonor[] = [];
    const masterCoaches = getCoachesFromEskul(safeEskul);

    if (masterCoaches.length > 0) {
      defaultPelatihList = masterCoaches.map((p, idx) => {
        // Cari apakah ada transaksi BKU spesifik untuk pelatih ini
        const specificTx = matchedTxs.find(
          (tx) =>
            (tx.pelatihNama && tx.pelatihNama.toLowerCase().trim() === p.nama.toLowerCase().trim()) ||
            (tx.keterangan && tx.keterangan.toLowerCase().includes(p.nama.toLowerCase().trim())) ||
            (tx.rincian_barang && tx.rincian_barang.some((r) => (r.uraian_barang || '').toLowerCase().includes(p.nama.toLowerCase().trim())))
        ) || (matchedTxs.length > 1 ? matchedTxs[idx] : matchedTxs[0]);

        let coachHk = realHk;
        let coachSatuan = p.honorPerKegiatan || honorSatuan;

        if (specificTx) {
          const r = specificTx.rincian_barang?.[0];
          if (r?.harga_satuan && Number(r.harga_satuan) > 0) {
            coachSatuan = Number(r.harga_satuan);
          }
          let cHk = Number(r?.volume);
          if (!cHk || isNaN(cHk) || cHk <= 0) {
            if (specificTx.total_pengeluaran_bku && coachSatuan > 0) {
              cHk = Math.round(specificTx.total_pengeluaran_bku / coachSatuan);
            }
          }
          if (cHk && cHk > 0) {
            coachHk = Math.max(1, Math.min(cHk, 8));
          }
        } else if (!hasBkuHonor) {
          coachHk = 0;
        }

        return {
          id: p.id || `pelatih-${idx + 1}-${eskul.id}`,
          nama: p.nama,
          jabatan: p.peran || (idx === 0 ? 'Pelatih Utama' : `Pelatih ${idx + 1}`),
          hk: coachHk,
          satuan: coachSatuan,
          pph21Persen: 6,
          hasNpwp: false
        };
      });
    }

    // Jika di Master Eskul pelatihnya baru 1 atau belum terdaftar 2, tapi di BKU ada 2 atau lebih transaksi honor bertag eskul ini
    if (defaultPelatihList.length <= 1 && matchedTxs.length > 1) {
      defaultPelatihList = matchedTxs.map((tx, idx) => {
        const coachName =
          tx.pelatihNama ||
          (idx === 0 ? (eskul.namaPelatih || 'Pelatih 1') : `Pelatih ${idx + 1}`);
        const r = tx.rincian_barang?.[0];
        let cSatuan = Number(r?.harga_satuan) || honorSatuan;
        let cHk = Number(r?.volume) || (tx.total_pengeluaran_bku && cSatuan > 0 ? Math.round(tx.total_pengeluaran_bku / cSatuan) : 4);
        return {
          id: `pelatih-bku-${idx + 1}-${eskul.id}`,
          nama: coachName,
          jabatan: idx === 0 ? 'Pelatih Utama' : `Pelatih ${idx + 1}`,
          hk: Math.max(1, Math.min(cHk, 8)),
          satuan: cSatuan,
          pph21Persen: 6,
          hasNpwp: false
        };
      });
    }

    // 2. Presensi Pelatih (Minggu I - IV)
    const defaultPresensiPelatih: EskulPresensiPelatih[] = defaultPelatihList.map((p) => ({
      pelatihId: p.id,
      nama: p.nama,
      jabatan: p.jabatan,
      minggu1: realHk >= 1,
      minggu2: realHk >= 2,
      minggu3: realHk >= 3,
      minggu4: realHk >= 4,
      keterangan: hasBkuHonor
        ? realHk === 4
          ? 'Hadir Penuh'
          : `Hadir ${realHk} Pertemuan (BKU ${primaryTx?.no_bku || '-'})`
        : 'Tidak ada realisasi anggaran honor di bulan ini'
    }));

    // 3. Siswa Anggota (Gunakan master siswa eskul jika ada, atau sample siswa dari master)
    const existingAnggota = masterSiswaEskulMap[eskul.id] || eskul.anggotaSiswa || [];
    let initialSiswaPresensi: EskulPresensiSiswa[] = [];

    const hadirStatus = (mIdx: number): 'H' | 'S' | 'I' | 'A' | '' =>
      hasBkuHonor ? (realHk >= mIdx ? 'H' : '') : '';
    const ketSiswa = hasBkuHonor ? (realHk > 0 ? 'Hadir' : 'Libur') : 'Tidak Ada Kegiatan';

    if (existingAnggota.length > 0) {
      initialSiswaPresensi = existingAnggota.map((s, idx) => ({
        siswaId: s.id || `siswa-${idx}`,
        nama: s.nama,
        kelas: s.kelas,
        jenisKelamin: s.jenisKelamin,
        minggu1: hadirStatus(1),
        minggu2: hadirStatus(2),
        minggu3: hadirStatus(3),
        minggu4: hadirStatus(4),
        keterangan: ketSiswa
      }));
    } else if (students && students.length > 0) {
      initialSiswaPresensi = students.slice(0, 20).map((s, idx) => ({
        siswaId: s.id || `siswa-${idx}`,
        nama: s.nama,
        kelas: s.kelas || 'Kelas 4 A',
        jenisKelamin: s.jenisKelamin || 'L',
        minggu1: hadirStatus(1),
        minggu2: hadirStatus(2),
        minggu3: hadirStatus(3),
        minggu4: hadirStatus(4),
        keterangan: ketSiswa
      }));
    } else {
      // Default sample siswa persis contoh lampiran (Arency, Arenta, Kamila, Nabil, dll)
      const sampleNames = [
        { nama: 'ARENCY', kls: 'Kelas 6 B' },
        { nama: 'ARENTA', kls: 'Kelas 6 B' },
        { nama: 'KAMILA', kls: 'Kelas 6 B' },
        { nama: 'NABIL', kls: 'Kelas 6 B' },
        { nama: 'ZAHRA', kls: 'Kelas 6 B' },
        { nama: 'IRHAS', kls: 'Kelas 6 B' },
        { nama: 'FATHAN', kls: 'Kelas 6 B' },
        { nama: 'RAFLI', kls: 'Kelas 6 B' },
        { nama: 'SANDI', kls: 'Kelas 5 A' },
        { nama: 'HUSNI', kls: 'Kelas 5 A' },
        { nama: 'INDAH', kls: 'Kelas 4 B' },
        { nama: 'KEKEY', kls: 'Kelas 4 A' },
        { nama: 'VANESA', kls: 'Kelas 4 A' },
        { nama: 'SASKIYA', kls: 'Kelas 4 A' },
        { nama: 'ADEL', kls: 'Kelas 4 A' },
        { nama: 'ZIDAN', kls: 'Kelas 4 A' }
      ];
      initialSiswaPresensi = sampleNames.map((s, idx) => ({
        siswaId: `sample-siswa-${idx + 1}`,
        nama: s.nama,
        kelas: s.kls,
        minggu1: hadirStatus(1),
        minggu2: hadirStatus(2),
        minggu3: hadirStatus(3),
        minggu4: hadirStatus(4),
        keterangan: ketSiswa
      }));
    }

    // 4. Pertemuan Kegiatan Dinamis (Sesuai volume HK real BKU & Matriks PROTA)
    const hariJadwal = eskul.jadwalLatihan?.split(',')[0]?.replace('Setiap', '')?.trim() || 'Sabtu';
    const jamJadwal = eskul.jadwalLatihan?.includes(',')
      ? eskul.jadwalLatihan.split(',')[1]?.trim()
      : '08.00 - 10.00 WIB';

    const isCurrentPramuka = (safeEskul.namaEskul || '').toLowerCase().includes('pramuka') || safeEskul.kategori === 'Kepanduan';
    const weeklyUniversalMateri = generateWeeklyMateriForAnyEskul(monthIdx, safeEskul);
    const penggalangProtaMateri = isCurrentPramuka
      ? generateWeeklyMateriForAnyEskul(monthIdx, safeEskul, false)
      : weeklyUniversalMateri;
    const siagaProtaMateri = isCurrentPramuka
      ? generateWeeklyMateriForAnyEskul(monthIdx, safeEskul, true)
      : weeklyUniversalMateri;

    const defaultPertemuan: EskulPertemuanKegiatan[] = [1, 2, 3, 4].map((mIdx) => {
      const dayCalc = mIdx * 7 - 6;
      const pMat = penggalangProtaMateri[mIdx - 1] || 'Latihan keterampilan dan evaluasi mingguan.';
      const sMat = siagaProtaMateri[mIdx - 1] || 'Latihan budi pekerti dan permainan ceria.';
      return {
        mingguKe: mIdx,
        tanggal: `${dayCalc} ${monthName} ${year}`,
        hari: hariJadwal,
        waktu: jamJadwal,
        tempat: eskul.lokasi || 'Lapangan / Ruang Kesenian Sekolah',
        materi: isCurrentPramuka ? pMat : (weeklyUniversalMateri[mIdx - 1] || 'Latihan keterampilan dan evaluasi mingguan.'),
        materiPenggalang: isCurrentPramuka ? pMat : undefined,
        materiSiaga: isCurrentPramuka ? sMat : undefined,
        penanggungJawab: eskul.namaPelatih || 'Pelatih Ekstrakurikuler',
        pesertaInfo: hasBkuHonor
          ? `${initialSiswaPresensi.length} Siswa Terdaftar`
          : 'Nihil / Tidak ada realisasi kegiatan di BKU bulan ini'
      };
    });

    // 5. Narasi Laporan Program
    const defaultProgramConfig: EskulProgramLaporanConfig = {
      judulLaporan: `Laporan Latihan Bulanan Ekstrakurikuler ${eskul.namaEskul}`,
      bulanNama: monthName,
      tahunAnggaran: year,
      latarBelakang: template.latarBelakang,
      tujuanLatihan: [...template.tujuan],
      hasilDanManfaat: [...template.hasilManfaat],
      kendala: [...template.kendala],
      solusi: [...template.solusi],
      nomorSurat: `421.2/${String(monthIdx + 1).padStart(2, '0')}/LPJ-ESKUL/${year}`,
      tanggalSurat: `28 ${monthName} ${year}`,
      tempatPembuatan: metadata.desaKecamatan || 'Bogor',
      penutup: hasBkuHonor
        ? `Latihan bulanan ekstrakurikuler ${eskul.namaEskul} ini memberikan banyak manfaat bagi pembentukan karakter, kedisiplinan, dan potensi peserta didik. Diharapkan kegiatan ini dapat terus terlaksana secara berkesinambungan.`
        : `Pada bulan ${monthName} ${year}, kegiatan ekstrakurikuler ${eskul.namaEskul} tidak merealisasikan alokasi anggaran honor pelatih pada BKU/BOSP.`
    };

    return {
      recordKey: `${monthIdx}_${eskul.id}`,
      monthIndex: monthIdx,
      monthName,
      eskulId: eskul.id,
      namaEskul: eskul.namaEskul,
      isSubmitted: false,
      honorPelatihList: defaultPelatihList,
      presensiPelatihList: defaultPresensiPelatih,
      presensiSiswaList: initialSiswaPresensi,
      pertemuanList: defaultPertemuan,
      programConfig: defaultProgramConfig,
      updatedAt: new Date().toISOString()
    };
  };

  // Active Month Eskul Record State
  const [activeRecord, setActiveRecord] = useState<MonthEskulRecord>(() => {
    const existing = eskulStore[currentRecordKey];
    if (existing) return existing;
    return generateCleanRecord(currentMonthIndex, currentEskul);
  });

  // Teks Pendahuluan Terpadu Khusus Pramuka SD (Siaga & Penggalang)
  const pendahuluanText = useMemo(() => {
    if (isPramukaEskul) {
      return `Pendidikan kepramukaan di Gugus Depan / Pangkalan ${metadata.namaSekolah || 'SD Negeri'} diselenggarakan secara terpadu membina 2 (dua) tingkatan usia peserta didik: (1) Perindukan Siaga (Kelas 1–3 SD) yang menitikberatkan pada pembentukan budi pekerti luhur, keceriaan, kasih sayang terhadap keluarga, kepatuhan pada aturan, serta pembiasaan hidup tertib dan rukun sesuai kode kehormatan Dwi Satya dan Dwi Darma; serta (2) Pasukan Penggalang (Kelas 4–6 SD) yang menitikberatkan pada pembentukan kepemimpinan beregu mandiri (patrol system), kedisiplinan baris-berbaris, ketahanan fisik mental, dan penguasaan teknik kepramukaan (Tekpram) berlandaskan Tri Satya dan Dasa Darma. Pada bulan ${NAMA_BULAN[currentMonthIndex]} ${metadata.tahunAnggaran || '2025/2026'}, seluruh pembinaan terlaksana harmonis mendukung penguatan karakter Profil Pelajar Pancasila.`;
    }
    return activeRecord?.programConfig?.latarBelakang || '';
  }, [isPramukaEskul, metadata.namaSekolah, metadata.tahunAnggaran, currentMonthIndex, activeRecord?.programConfig?.latarBelakang]);

  // Helper to fetch from Firestore on mount (async-unmount-safe)
  useEffect(() => {
    let isCancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function loadCloudData() {
      try {
        const cloudData = await fetchEskulFromFirestore(schoolId);
        if (isCancelled) return;
        if (cloudData && cloudData.records) {
          setEskulStore((prev) => {
            const merged = { ...prev, ...cloudData.records };
            writeLS(schoolId, 'eskul_store', merged);
            return merged;
          });
          if (cloudData.masterSiswaEskul) {
            setMasterSiswaEskulMap(cloudData.masterSiswaEskul);
          }
        }
      } catch (err) {
        console.warn('Error fetching eskul data:', err);
      }

      if (isCancelled) return;

      unsubscribe = subscribeToEskulData(
        schoolId,
        (payload) => {
          if (isCancelled) return;
          if (payload && payload.records) {
            setEskulStore((prev) => ({ ...prev, ...payload.records }));
            if (payload.masterSiswaEskul) {
              setMasterSiswaEskulMap(payload.masterSiswaEskul);
            }
          }
        },
        (status) => {
          if (!isCancelled) setCloudSyncStatus(status);
        }
      );

      if (isCancelled && unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
    }

    loadCloudData();
    return () => {
      isCancelled = true;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
    };
  }, [schoolId]);

  // ZERO-STALL SWITCH LOGIC: When month or eskul changes, cleanly switch data
  const handleSelectMonthAndEskul = (targetMonth: number, targetEskulId: string) => {
    isSwitchingRef.current = true;
    setCurrentMonthIndex(targetMonth);

    // CRITICAL: Notify parent with 1-indexed month number (1 to 12)
    if (onSelectMonthIndex) {
      onSelectMonthIndex(targetMonth + 1);
    }

    // Ambil data BKU untuk bulan target (targetMonthNum is 1 to 12)
    const targetMonthNum = targetMonth + 1;
    const targetArchive = monthlyStore?.[targetMonthNum];
    const targetMonthTxs = (targetArchive?.data && targetArchive.data.length > 0)
      ? targetArchive.data
      : (activeMonthIndex === targetMonthNum ? bkuData : []);

    // Tetap pertahankan targetEskulId yang sedang dilihat pengguna
    setActiveEskulId(targetEskulId);
    if (onSelectEskulId) onSelectEskulId(targetEskulId);

    const targetEskul = effectiveEskulList.find((e) => e.id === targetEskulId) || effectiveEskulList[0];
    const targetKey = `${targetMonth}_${targetEskul.id}`;

    const savedRecord = eskulStore[targetKey];
    if (savedRecord && savedRecord.isSubmitted) {
      // Restore submitted data perfectly
      setActiveRecord(savedRecord);
    } else {
      // Fresh clean slate without any leftover or stall data from previous month/eskul
      const fresh = generateCleanRecord(targetMonth, targetEskul);
      setActiveRecord(fresh);
    }

    setTimeout(() => {
      isSwitchingRef.current = false;
    }, 200);
  };

  // Re-sync active record if currentRecordKey or currentMonthTransactions changes and not switching
  useEffect(() => {
    if (!isSwitchingRef.current) {
      const savedRecord = eskulStore[currentRecordKey];
      if (savedRecord && savedRecord.isSubmitted) {
        setActiveRecord(savedRecord);
      } else {
        setActiveRecord(generateCleanRecord(currentMonthIndex, currentEskul));
      }
    }
  }, [currentRecordKey, currentMonthTransactions]);

  // Handler: Submit / Simpan Permanen ke Firebase Cloud
  const handleSubmitMonthEskul = async () => {
    if (readOnly) return;
    setIsSubmittingCloud(true);
    try {
      const updatedRecord: MonthEskulRecord = {
        ...activeRecord,
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newStore = {
        ...eskulStore,
        [currentRecordKey]: updatedRecord
      };

      setEskulStore(newStore);
      setActiveRecord(updatedRecord);

      writeLS(schoolId, 'eskul_store', newStore);

      await saveEskulToFirestore(schoolId, newStore, masterSiswaEskulMap, (status) =>
        setCloudSyncStatus(status)
      );
    } catch (error) {
      console.error('Error submitting eskul record to Firebase:', error);
    } finally {
      setIsSubmittingCloud(false);
    }
  };

  // Handler: Batalkan Submit (Kembali ke status draf)
  const handleResetToDraft = async () => {
    if (readOnly) return;
    if (!window.confirm(`Batalkan status submit untuk LPJ ${currentEskul.namaEskul} Bulan ${NAMA_BULAN[currentMonthIndex]}?`)) {
      return;
    }
    const updatedRecord: MonthEskulRecord = {
      ...activeRecord,
      isSubmitted: false,
      submittedAt: undefined,
      updatedAt: new Date().toISOString()
    };

    const newStore = {
      ...eskulStore,
      [currentRecordKey]: updatedRecord
    };

    setEskulStore(newStore);
    setActiveRecord(updatedRecord);

    writeLS(schoolId, 'eskul_store', newStore);

    await saveEskulToFirestore(schoolId, newStore, masterSiswaEskulMap, (status) =>
      setCloudSyncStatus(status)
    );
  };

  // ==========================================
  // EXCEL / CSV IMPORT & EXPORT SISWA
  // ==========================================
  const handleDownloadTemplateExcel = () => {
    const templateData = [
      { No: 1, Nama: 'ARENCY', Kelas: 'Kelas 6 B', JenisKelamin: 'P' },
      { No: 2, Nama: 'ARENTA', Kelas: 'Kelas 6 B', JenisKelamin: 'P' },
      { No: 3, Nama: 'KAMILA', Kelas: 'Kelas 6 B', JenisKelamin: 'P' },
      { No: 4, Nama: 'NABIL', Kelas: 'Kelas 6 B', JenisKelamin: 'L' },
      { No: 5, Nama: 'ZAHRA', Kelas: 'Kelas 6 B', JenisKelamin: 'P' }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
    XLSX.writeFile(wb, `Template_Siswa_Eskul_${currentEskul.namaEskul.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const handleExportSiswaExcel = () => {
    const exportRows = activeRecord.presensiSiswaList.map((s, idx) => ({
      No: idx + 1,
      Nama: s.nama,
      Kelas: s.kelas,
      JenisKelamin: s.jenisKelamin || '-',
      Minggu_I: s.minggu1 || 'H',
      Minggu_II: s.minggu2 || 'H',
      Minggu_III: s.minggu3 || 'H',
      Minggu_IV: s.minggu4 || 'H',
      Keterangan: s.keterangan || 'Hadir'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi_Siswa');
    XLSX.writeFile(
      wb,
      `Presensi_${currentEskul.namaEskul.replace(/[^a-zA-Z0-9]/g, '_')}_${NAMA_BULAN[currentMonthIndex]}_${metadata.tahunAnggaran || '2025'}.xlsx`
    );
  };

  const handleImportSiswaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('File tidak berisi data atau format tidak sesuai.');
          return;
        }

        const newPresensiSiswa: EskulPresensiSiswa[] = rawJson.map((row, idx) => {
          const nama = row['Nama'] || row['Nama Siswa'] || row['NAMA'] || row['siswa'] || `Siswa ${idx + 1}`;
          const kelas = row['Kelas'] || row['Kls'] || row['KELAS'] || 'Kelas 4 A';
          const jk = (row['JenisKelamin'] || row['JK'] || row['L/P'] || 'L').toString().toUpperCase().trim();
          const m1 = row['Minggu_I'] || row['I'] || 'H';
          const m2 = row['Minggu_II'] || row['II'] || 'H';
          const m3 = row['Minggu_III'] || row['III'] || 'H';
          const m4 = row['Minggu_IV'] || row['IV'] || 'H';

          return {
            siswaId: `import-${Date.now()}-${idx}`,
            nama: String(nama).trim().toUpperCase(),
            kelas: String(kelas).trim(),
            jenisKelamin: jk.startsWith('P') ? 'P' : 'L',
            minggu1: m1 as any,
            minggu2: m2 as any,
            minggu3: m3 as any,
            minggu4: m4 as any,
            keterangan: 'Hadir'
          };
        });

        // Update active record presensi siswa
        setActiveRecord((prev) => ({
          ...prev,
          presensiSiswaList: newPresensiSiswa,
          pertemuanList: prev.pertemuanList.map((p) => ({
            ...p,
            pesertaInfo: `${newPresensiSiswa.length} Siswa Terdaftar`
          }))
        }));

        // Simpan ke Master Siswa Eskul Map
        const convertedAnggota: EskulAnggota[] = newPresensiSiswa.map((s, idx) => ({
          id: s.siswaId,
          nisn: `00${idx + 10000000}`,
          nama: s.nama,
          kelas: s.kelas,
          jenisKelamin: (s.jenisKelamin as any) || 'L',
          peran: 'Anggota',
          keaktifan: 'Aktif'
        }));

        const updatedMasterMap = {
          ...masterSiswaEskulMap,
          [currentEskul.id]: convertedAnggota
        };
        setMasterSiswaEskulMap(updatedMasterMap);

        // Auto sync updated student roster to Firebase
        if (!readOnly) {
          saveEskulToFirestore(schoolId, eskulStore, updatedMasterMap);
        }

        alert(`Berhasil mengimpor ${newPresensiSiswa.length} data siswa untuk eskul ${currentEskul.namaEskul}!`);
      } catch (err: any) {
        console.error('Gagal membaca file Excel/CSV siswa:', err);
        alert('Format file gagal diproses. Pastikan file adalah format Excel (.xlsx, .xls) atau CSV.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Quick action: Set Semua Siswa Hadir (I - IV Hadir)
  const handleSetAllSiswaHadir = () => {
    if (readOnly) return;
    setActiveRecord((prev) => ({
      ...prev,
      presensiSiswaList: prev.presensiSiswaList.map((s) => ({
        ...s,
        minggu1: 'H',
        minggu2: 'H',
        minggu3: 'H',
        minggu4: 'H',
        keterangan: 'Hadir Penuh'
      }))
    }));
  };

  // Photo upload handler for weekly meetings
  const handleUploadPertemuanFoto = (mIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto terlalu besar. Harap pilih foto di bawah 2MB agar laporan ringan dicetak.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setActiveRecord((prev) => ({
        ...prev,
        pertemuanList: prev.pertemuanList.map((p, idx) =>
          idx === mIdx ? { ...p, fotoDokumentasi: base64 } : p
        )
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePertemuanFoto = (mIdx: number) => {
    setActiveRecord((prev) => ({
      ...prev,
      pertemuanList: prev.pertemuanList.map((p, idx) =>
        idx === mIdx ? { ...p, fotoDokumentasi: undefined } : p
      )
    }));
  };

  // ==========================================
  // AI GENERATOR OTOMATIS: MATERI MINGGUAN & NARASI
  // ==========================================

  // 1. AI Otomatisasi Silabus & Uraian Materi Mingguan (Minggu I - IV) - Dependensi Langsung dari PROTA
  const handleAiGenerateMateriMingguan = () => {
    setIsAiGenerating(true);
    setAiSuccessMessage(null);

    // KASUS KHUSUS PRAMUKA: Selaras 100% dengan Program Tahunan (PROTA) Siaga & Penggalang
    if (isPramukaEskul) {
      const penggalangMat = generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul, false);
      const siagaMat = generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul, true);

      setActiveRecord((prev) => ({
        ...prev,
        pertemuanList: prev.pertemuanList.map((p, idx) => ({
          ...p,
          materi: penggalangMat[idx] || p.materi,
          materiPenggalang: penggalangMat[idx] || p.materiPenggalang,
          materiSiaga: siagaMat[idx] || p.materiSiaga
        }))
      }));

      setIsAiGenerating(false);
      setAiSuccessMessage(`✨ Silabus 4 Pekan Pramuka (Siaga & Penggalang) bulan ${NAMA_BULAN[currentMonthIndex]} berhasil disinkronkan langsung dari Jadwal PROTA!`);
      setTimeout(() => setAiSuccessMessage(null), 4000);
      return;
    }

    // SELURUH ESKUL (Silat, Futsal, Bulutangkis, Qasidah, BTQ, Voli, Catur, Paskibra, Drumband, PMR, Taekwondo, dll.)
    const newMateri = generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul);

    setActiveRecord((prev) => ({
      ...prev,
      pertemuanList: prev.pertemuanList.map((p, idx) => ({
        ...p,
        materi: newMateri[idx] || p.materi
      }))
    }));

    setIsAiGenerating(false);
    setAiSuccessMessage(`✨ Silabus 4 Pekan ${currentEskul?.namaEskul || 'Ekstrakurikuler'} bulan ${NAMA_BULAN[currentMonthIndex]} berhasil disinkronkan dari Kurikulum PROTA!`);
    setTimeout(() => setAiSuccessMessage(null), 4000);
  };

  // 2. AI Regenerate Variasi Materi per Baris Minggu Tertentu (Pilihan Cepat)
  const handleRegenerateMateriSingleWeek = (mIdx: number) => {
    const mingguKe = mIdx + 1;

    // Untuk Pramuka: ambil variasi materi dari PROTA bulan berjalan
    if (isPramukaEskul) {
      const pMats = generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul, false);
      const sMats = generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul, true);

      setActiveRecord((prev) => ({
        ...prev,
        pertemuanList: prev.pertemuanList.map((p, idx) =>
          idx === mIdx
            ? {
                ...p,
                materi: pMats[mIdx] || p.materi,
                materiPenggalang: pMats[mIdx] || p.materiPenggalang,
                materiSiaga: sMats[mIdx] || p.materiSiaga
              }
            : p
        )
      }));

      setAiSuccessMessage(`✨ Materi Pramuka Minggu ke-${mingguKe} berhasil disinkronkan kembali dari PROTA!`);
      setTimeout(() => setAiSuccessMessage(null), 3000);
      return;
    }

    // Untuk Seluruh Eskul Umum
    const allMats = generateWeeklyMateriForAnyEskul(currentMonthIndex, currentEskul);
    if (allMats && allMats[mIdx]) {
      setActiveRecord((prev) => ({
        ...prev,
        pertemuanList: prev.pertemuanList.map((p, idx) =>
          idx === mIdx
            ? {
                ...p,
                materi: allMats[mIdx]
              }
            : p
        )
      }));
      setAiSuccessMessage(`✨ Materi Minggu ke-${mingguKe} ${currentEskul?.namaEskul || 'Eskul'} disinkronkan dengan kurikulum bulan ${NAMA_BULAN[currentMonthIndex]}.`);
      setTimeout(() => setAiSuccessMessage(null), 3000);
      return;
    }

    const eskulNama = currentEskul?.namaEskul || 'Ekstrakurikuler';
    const bulanNama = NAMA_BULAN[currentMonthIndex];

    const bankVariasi: Record<number, string[]> = {
      0: [
        `Pemanasan kelenturan, pembentukan postur tubuh tegap dan drill teknik fundamental ${eskulNama} tahap awal.`,
        `Review dasar pengenalan peralatan ${eskulNama}, pengkondisian fisik kardiovaskular, dan pembiasaan sikap sempurna.`,
        `Latihan koordinasi dasar motorik, pengenalan ritme/tempo, dan pembagian kelompok latihan terarah.`
      ],
      1: [
        `Drill peningkatan intensitas teknik inti ${eskulNama}, variasi langkah perpindahan posisi, dan koordinasi berpasangan.`,
        `Latihan transisi cepat, pembentukan formasi kelompok terpadu, dan pengasahan kelincahan manuver.`,
        `Pendalaman materi teknik lanjutan ${eskulNama} dengan penekanan pada ketepatan arah dan kekompakan tim.`
      ],
      2: [
        `Simulasi tanding mini / uji coba unjuk kebolehan ${eskulNama} dengan penerapan aturan resmi secara ketat.`,
        `Aplikasi skema kerja sama regu, latihan taktik ofensif/defensif, dan uji konsentrasi di bawah tekanan waktu.`,
        `Gladi pementasan babak inti ${eskulNama} dengan pemakaian perlengkapan lengkap dan penilaian estetika gerak.`
      ],
      3: [
        `Evaluasi komprehensif unjuk kerja per siswa, pencatatan nilai kemajuan teknik, pendinginan, dan evaluasi bulanan.`,
        `Uji unjuk keterampilan mandiri dan beregu, refleksi kekurangan bersama pelatih, serta penyiapan target bulan berikutnya.`,
        `Pementasan mini / game internal penutup bulan ${bulanNama}, apresiasi siswa berprestasi dan perapian perlengkapan.`
      ]
    };

    const opsi = bankVariasi[mIdx] || [
      `Latihan intensif materi pekan ke-${mingguKe} ekstrakurikuler ${eskulNama} dengan fokus peningkatan performa dan kedisiplinan.`
    ];
    const randomIndex = Math.floor(Math.random() * opsi.length);
    const selectedText = opsi[randomIndex];

    setActiveRecord((prev) => ({
      ...prev,
      pertemuanList: prev.pertemuanList.map((p, idx) =>
        idx === mIdx ? { ...p, materi: selectedText } : p
      )
    }));

    setAiSuccessMessage(`✨ Materi Minggu ke-${mingguKe} berhasil divariasikan otomatis!`);
    setTimeout(() => setAiSuccessMessage(null), 3000);
  };

  // 3. AI Otomatisasi Narasi Lengkap (Latar Belakang, Hasil, Kendala & Solusi)
  const handleAiGenerateNarasiEskul = () => {
    setIsAiGenerating(true);
    setAiSuccessMessage(null);

    const eskulNama = currentEskul.namaEskul;
    const sekolahNama = metadata.namaSekolah || 'Sekolah Dasar';
    const bulanNama = NAMA_BULAN[currentMonthIndex];
    const tahun = metadata.tahunAnggaran || '2025';
    const totalSiswa = activeRecord.presensiSiswaList.length;

    // Hitung rata-rata presensi kehadiran siswa aktif
    let totalKehadiran = 0;
    let totalSesi = totalSiswa * 4;
    activeRecord.presensiSiswaList.forEach((s) => {
      (['minggu1', 'minggu2', 'minggu3', 'minggu4'] as const).forEach((m) => {
        if (s[m] === 'H') totalKehadiran++;
      });
    });
    const persentaseHadir = totalSesi > 0 ? Math.round((totalKehadiran / totalSesi) * 100) : 95;

    // Ambil materi bulanan yang terisi
    const materiRingkasan = activeRecord.pertemuanList.map((p) => p.materi).join(' ');

    const templateLokal = DYNAMIC_PROGRAM_TEMPLATES[eskulTypeKey];

    // Generate Latar Belakang Komprehensif
    const generatedLatarBelakang = templateLokal?.latarBelakang
      ? `${templateLokal.latarBelakang} Pada bulan ${bulanNama} ${tahun}, pembinaan ekstrakurikuler ${eskulNama} di ${sekolahNama} difokuskan pada peningkatan kompetensi gerak/teknik siswa serta pemantapan karakter Profil Pelajar Pancasila yang mandiri dan berprestasi.`
      : `Kegiatan ekstrakurikuler ${eskulNama} di ${sekolahNama} merupakan salah satu wadah pembinaan minat, bakat, potensi non-akademis, dan pembentukan karakter peserta didik. Pelaksanaan latihan rutin pada bulan ${bulanNama} ${tahun} bertujuan untuk memfasilitasi perkembangan motorik, kedisiplinan, sportivitas, dan kerja sama tim secara terstruktur.`;

    // Generate Tujuan Latihan
    const generatedTujuan = templateLokal?.tujuan && templateLokal.tujuan.length > 0
      ? templateLokal.tujuan
      : [
          `Mengembangkan potensi, minat, dan bakat peserta didik dalam bidang ${eskulNama}.`,
          `Melatih kedisiplinan, ketahanan fisik, dan kemampuan bekerja sama dalam kelompok.`,
          `Mempersiapkan tim/peserta didik ${sekolahNama} untuk ajang kompetisi dan perlombaan antarpelajar.`
        ];

    // Generate Hasil & Manfaat Berdasarkan Data Presensi Nyata
    const generatedHasil = [
      `Tingkat kehadiran siswa pada bulan ${bulanNama} ${tahun} mencapai ${persentaseHadir}% (${totalKehadiran} kehadiran dari ${totalSesi} sesi latihan yang direncanakan), menunjukkan motivasi dan komitmen latihan yang sangat tinggi.`,
      `Peserta didik telah berhasil menguasai tahapan materi mingguan yang meliputi penguatan teknik dasar, sinkronisasi gerakan/taktik kelompok, serta kesiapan mental unjuk kemampuan.`,
      `Terbentuknya rasa saling percaya, toleransi antarteman, dan jiwa sportivitas tinggi yang berdampak positif pada ketertiban belajar di lingkungan ${sekolahNama}.`
    ];

    // Generate Kendala & Solusi Realistis
    const isMusimHujan = [0, 1, 10, 11].includes(currentMonthIndex);
    const kendalaRealistis: string[] = [];
    const solusiRealistis: string[] = [];

    if (isMusimHujan && (eskulTypeKey.startsWith('pramuka') || eskulTypeKey === 'futsal' || eskulTypeKey === 'bulutangkis')) {
      kendalaRealistis.push(`Curah hujan yang tinggi pada pertengahan bulan ${bulanNama} sempat membatasi pemanfaatan lapangan terbuka.`);
      solusiRealistis.push(`Pelatih secara adaptif mengalihkan kegiatan ke teras/selasar gedung sekolah beratap dengan materi teori strategi, taktik, dan drill teknik di ruang terbatas.`);
    } else {
      kendalaRealistis.push(`Tingkat penguasaan teknik dasar antarsiswa masih bervariasi antara siswa kelas bawah dan kelas atas.`);
      solusiRealistis.push(`Pelatih menerapkan metode peer-tutoring (tutor sebaya) dengan mendampingkan siswa yang lebih terampil untuk membimbing rekan sekelompoknya.`);
    }

    kendalaRealistis.push(`Keterbatasan waktu latihan setelah jam pembelajaran reguler sehingga rotasi alat/giliran harus sangat efisien.`);
    solusiRealistis.push(`Menerapkan manajemen waktu berbasis pos latihan terstruktur sehingga setiap siswa mendapatkan porsi praktik yang seimbang.`);

    // Generate Penutup
    const generatedPenutup = `Demikian laporan bulanan pelaksanaan kegiatan ekstrakurikuler ${eskulNama} ${sekolahNama} untuk bulan ${bulanNama} ${tahun} ini disusun secara objektif dan akuntabel. Melalui pembinaan rutin ini, diharapkan potensi dan karakter peserta didik terus bertumbuh secara optimal, serta menjadi bahan evaluasi guna meningkatkan mutu kegiatan ekstrakurikuler pada bulan-bulan berikutnya.`;

    setActiveRecord((prev) => ({
      ...prev,
      programConfig: {
        ...prev.programConfig,
        latarBelakang: generatedLatarBelakang,
        tujuanLatihan: generatedTujuan,
        hasilDanManfaat: generatedHasil,
        kendala: kendalaRealistis,
        solusi: solusiRealistis,
        penutup: generatedPenutup
      }
    }));

    setIsAiGenerating(false);
    setAiSuccessMessage(`✨ Narasi LPJ Ekstrakurikuler bulan ${bulanNama} berhasil disusun otomatis berdasarkan data eskul & presensi siswa!`);
    setTimeout(() => setAiSuccessMessage(null), 4000);
  };

  // Calculations for Honor Pelatih
  const honorSummary = useMemo(() => {
    let totalBruto = 0;
    let totalPph = 0;
    let totalNetto = 0;

    activeRecord.honorPelatihList.forEach((p) => {
      const bruto = p.hk * p.satuan;
      const pph = Math.round((bruto * p.pph21Persen) / 100);
      const netto = bruto - pph;
      totalBruto += bruto;
      totalPph += pph;
      totalNetto += netto;
    });

    return { totalBruto, totalPph, totalNetto };
  }, [activeRecord.honorPelatihList]);

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className={`space-y-6 ${isAnnualReportOpen ? 'print:hidden' : ''}`}>
        {/* MENU UTAMA NAVIGASI LPJ & PROGRAM TAHUNAN - SATU CARD DENGAN 1-4 CARD & CETAK PROTA DI AWAL, SERTA SELECTOR BULAN DI TEMPAT FORMAT TERPADU */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs no-print space-y-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* URUTAN 1: CETAK PROGRAM TAHUNAN DI AWAL PERTAMA */}
            <button
              type="button"
              onClick={() => setIsAnnualReportOpen(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              title="Buka Lembar Laporan Pertanggungjawaban (LPJ) & Dokumen Program Tahunan (PROTA) Lengkap"
            >
              <FileText className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">Cetak Program Tahunan</span>
            </button>

            {/* URUTAN 2: 1. HONOR & HADIR PELATIH */}
            <button
              type="button"
              onClick={() => setActiveSubTab('honor')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'honor'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">1. Honor &amp; Hadir Pelatih</span>
            </button>

            {/* URUTAN 3: 2. PRESENSI SISWA */}
            <button
              type="button"
              onClick={() => setActiveSubTab('presensi')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'presensi'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">2. Presensi Siswa ({activeRecord.presensiSiswaList.length})</span>
            </button>

            {/* URUTAN 4: 3. PROGRAM & LAPORAN BULANAN */}
            <button
              type="button"
              onClick={() => setActiveSubTab('laporan')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'laporan'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">3. Program &amp; Laporan Bulanan</span>
            </button>

            {/* URUTAN 5: 4. CETAK PAKET BERKAS A4 */}
            <button
              type="button"
              onClick={() => setActiveSubTab('cetak')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === 'cetak'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
              }`}
            >
              <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">4. Cetak Paket Berkas A4</span>
            </button>
          </div>

          {/* CARD BULAN TEPAT DI TEMPAT ELEMENT YANG DIHAPUS (FORMAT TERPADU PANGKALAN SD) */}
          <div className="pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Pilih Bulan Kegiatan (Tahun {metadata.tahunAnggaran || '2025'}):
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                *Data tersimpan unik per kombinasi bulan &amp; ekstrakurikuler
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
              {NAMA_BULAN.map((nama, idx) => {
                const isCurrent = currentMonthIndex === idx;
                const itemKey = `${idx}_${currentEskul.id}`;
                const isSaved = eskulStore[itemKey]?.isSubmitted;

                const monthNum = idx + 1;
                const monthArchive = monthlyStore?.[monthNum];
                const txs = (monthArchive?.data && monthArchive.data.length > 0)
                  ? monthArchive.data
                  : (activeMonthIndex === monthNum ? bkuData : []);

                const currentHasHonor = findHonorTransactionsForEskul(currentEskul, txs).length > 0;
                const otherHasHonorCount = effectiveEskulList.filter(
                  (e) => findHonorTransactionsForEskul(e, txs).length > 0
                ).length;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMonthAndEskul(idx, activeEskulId)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all cursor-pointer select-none ${
                      isCurrent
                        ? 'bg-indigo-900 text-white border-indigo-950 shadow-sm font-bold ring-2 ring-indigo-500/50 scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium'
                    }`}
                  >
                    <span className="text-xs leading-tight">{nama}</span>
                    <span
                      className={`text-[9px] font-mono mt-0.5 px-1.5 py-0.2 rounded-full ${
                        isSaved
                          ? isCurrent
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-100 text-emerald-800 font-bold'
                          : currentHasHonor
                          ? isCurrent
                            ? 'bg-emerald-400 text-emerald-950 font-bold'
                            : 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                          : otherHasHonorCount > 0
                          ? isCurrent
                            ? 'bg-indigo-700 text-indigo-100'
                            : 'bg-indigo-50 text-indigo-700'
                          : isCurrent
                          ? 'bg-indigo-800 text-indigo-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {isSaved
                        ? 'Cloud'
                        : currentHasHonor
                        ? 'Ada BKU'
                        : otherHasHonorCount > 0
                        ? `${otherHasHonorCount} Eskul`
                        : 'Nihil'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* 3. SELECTOR EKSTRAKURIKULER DINAMIS (Dropdown dinamis dari Data Master yang sudah di-input) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <label htmlFor="select-eskul-dropdown" className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pilih Ekstrakurikuler:
            </label>
          </div>

          <div className="flex flex-1 sm:justify-end items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <select
                id="select-eskul-dropdown"
                value={currentEskul.id}
                onChange={(e) => handleSelectMonthAndEskul(currentMonthIndex, e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer transition-all"
              >
                {taggedEskulInCurrentMonth.length > 0 ? (
                  taggedEskulInCurrentMonth.map((eskul) => {
                    const eskulKey = `${currentMonthIndex}_${eskul.id}`;
                    const isSaved = eskulStore[eskulKey]?.isSubmitted;
                    const txsInMonth = findHonorTransactionsForEskul(eskul, currentMonthTransactions);
                    const totalBku = txsInMonth.reduce((acc, t) => acc + (t.total_pengeluaran_bku || 0), 0);
                    const coaches = getCoachesFromEskul(eskul);
                    const coachLabel = coaches.length > 1
                      ? coaches.map((c) => c.nama).join(' & ')
                      : eskul.namaPelatih || '-';

                    return (
                      <option key={eskul.id} value={eskul.id}>
                        {eskul.namaEskul} [{eskul.kategori}] ● (Ada BKU: {formatRupiah(totalBku)}) {isSaved ? '✓ [Final]' : ''} - Pelatih: {coachLabel}
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="" disabled>
                      -- Belum ada eskul yang ditag di BKU {NAMA_BULAN[currentMonthIndex]} --
                    </option>
                    <optgroup label="Data Master Eskul (Belum ada tag BKU):">
                      {effectiveEskulList.map((eskul) => (
                        <option key={eskul.id} value={eskul.id}>
                          {eskul.namaEskul} [{eskul.kategori}] (Nihil di {NAMA_BULAN[currentMonthIndex]}) - Pelatih: {eskul.namaPelatih || '-'}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Status Badge Pelatih & Cloud */}
            <div className="hidden lg:flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {currentEskul.kategori}
              </span>
              <span className="text-xs text-slate-600">
                Pelatih:{' '}
                <strong className="text-slate-800">
                  {getCoachesFromEskul(currentEskul).length > 1
                    ? getCoachesFromEskul(currentEskul).map((c) => c.nama).join(' & ')
                    : currentEskul.namaPelatih || '-'}
                </strong>
              </span>
              {eskulStore[`${currentMonthIndex}_${currentEskul.id}`]?.isSubmitted && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Tersimpan
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONTENT PANELS PER SUB-TAB */}

      {/* 5. CONTENT PANELS PER SUB-TAB */}
      {/* TAB 1: HONOR & HADIR PELATIH */}
      {activeSubTab === 'honor' && (
        <div className="space-y-6">
          {/* NOTICE BANNER JIKA BULAN INI TIDAK ADA TRANSAKSI BKU UNTUK ESKUL TERPILIH */}
          {!hasBkuInCurrentMonth && !activeRecord.isSubmitted && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-900 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 border border-amber-200">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wide">
                      Tidak Ada Transaksi / Rencana Honor di Bulan {NAMA_BULAN[currentMonthIndex]}
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                      Nihil di BKU {NAMA_BULAN[currentMonthIndex]}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                    Pada BKU bulan <strong>{NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025'}</strong>, tidak ditemukan transaksi honor bertag atau berkorelasi dengan ekstrakurikuler <strong>{currentEskul.namaEskul}</strong>. Daftar hadir dan honor otomatis disetel <strong>0 Volume</strong> agar data tidak stall dan mencegah pelaporan SPJ fiktif.
                  </p>
                  {/* Tombol pintas jika ada eskul lain yang punya alokasi honor di bulan ini */}
                  {effectiveEskulList.some((e) => e.id !== currentEskul.id && findHonorTransactionsForEskul(e, currentMonthTransactions).length > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60 text-xs">
                      <span className="text-amber-800 font-semibold text-[11px]">Eskul yang memiliki realisasi honor di BKU {NAMA_BULAN[currentMonthIndex]}:</span>
                      {effectiveEskulList
                        .filter((e) => e.id !== currentEskul.id && findHonorTransactionsForEskul(e, currentMonthTransactions).length > 0)
                        .map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handleSelectMonthAndEskul(currentMonthIndex, e.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 cursor-pointer transition-colors"
                          >
                            Pindah ke {e.namaEskul}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasBkuInCurrentMonth && (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 text-emerald-900 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Terhubung Otomatis dengan Transaksi BKU ({NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025'})
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    No. BKU: <strong>{currentEskulTransactions[0]?.no_bku || '-'}</strong> ({currentEskulTransactions[0]?.tanggal || '-'}) &bull; Uraian: &ldquo;{currentEskulTransactions[0]?.keterangan || '-'}&rdquo;
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Total Realisasi BKU</span>
                <span className="text-sm font-bold font-mono text-emerald-800">
                  {formatRupiah(currentEskulTransactions.reduce((acc, t) => acc + (t.total_pengeluaran_bku || 0), 0))}
                </span>
              </div>
            </div>
          )}

          {/* DAFTAR HADIR PELATIH (Gambar 2) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Daftar Hadir Pelatih Ekstrakurikuler ({NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025'})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centang kehadiran pada Minggu I - IV untuk menghitung Volume kehadiran secara otomatis.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-y border-slate-200">
                    <th className="p-2.5 text-center w-12">NO</th>
                    <th className="p-2.5">NAMA PELATIH</th>
                    <th className="p-2.5 w-32">JABATAN</th>
                    <th className="p-2.5 text-center w-20">MINGGU I</th>
                    <th className="p-2.5 text-center w-20">MINGGU II</th>
                    <th className="p-2.5 text-center w-20">MINGGU III</th>
                    <th className="p-2.5 text-center w-20">MINGGU IV</th>
                    <th className="p-2.5 text-center w-20">VOLUME</th>
                    <th className="p-2.5 w-44">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRecord.presensiPelatihList.map((pelatih, pIdx) => {
                    const hkCount =
                      (pelatih.minggu1 ? 1 : 0) +
                      (pelatih.minggu2 ? 1 : 0) +
                      (pelatih.minggu3 ? 1 : 0) +
                      (pelatih.minggu4 ? 1 : 0);

                    return (
                      <tr key={pelatih.pelatihId} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-slate-500">{pIdx + 1}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={pelatih.nama}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setActiveRecord((prev) => ({
                                ...prev,
                                presensiPelatihList: prev.presensiPelatihList.map((item, idx) =>
                                  idx === pIdx ? { ...item, nama: newName } : item
                                ),
                                honorPelatihList: prev.honorPelatihList.map((item, idx) =>
                                  idx === pIdx ? { ...item, nama: newName } : item
                                )
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-1 rounded bg-slate-100 font-medium text-slate-700">
                            {pelatih.jabatan}
                          </span>
                        </td>
                        {([1, 2, 3, 4] as const).map((mNum) => {
                          const field = `minggu${mNum}` as const;
                          return (
                            <td key={mNum} className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={pelatih[field]}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  setActiveRecord((prev) => {
                                    const updatedPresensi = prev.presensiPelatihList.map((item, idx) => {
                                      if (idx !== pIdx) return item;
                                      return { ...item, [field]: val };
                                    });
                                    // Update HK pada honorPelatihList
                                    const newHk =
                                      (mNum === 1 ? (val ? 1 : 0) : pelatih.minggu1 ? 1 : 0) +
                                      (mNum === 2 ? (val ? 1 : 0) : pelatih.minggu2 ? 1 : 0) +
                                      (mNum === 3 ? (val ? 1 : 0) : pelatih.minggu3 ? 1 : 0) +
                                      (mNum === 4 ? (val ? 1 : 0) : pelatih.minggu4 ? 1 : 0);

                                    const updatedHonor = prev.honorPelatihList.map((hItem, idx) =>
                                      idx === pIdx ? { ...hItem, hk: newHk } : hItem
                                    );

                                    return {
                                      ...prev,
                                      presensiPelatihList: updatedPresensi,
                                      honorPelatihList: updatedHonor
                                    };
                                  });
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </td>
                          );
                        })}
                        <td className="p-2.5 text-center font-bold text-indigo-700 bg-indigo-50/50">
                          {hkCount}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={pelatih.keterangan || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setActiveRecord((prev) => ({
                                ...prev,
                                presensiPelatihList: prev.presensiPelatihList.map((item, idx) =>
                                  idx === pIdx ? { ...item, keterangan: val } : item
                                )
                              }));
                            }}
                            placeholder="Keterangan..."
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* URAIAN MATERI LATIHAN DINAMIS PER MINGGU (INTEGRASI LANGSUNG DENGAN JADWAL MINGGU I - IV & PROTA) */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    {isPramukaEskul
                      ? `Uraian Materi Latihan Mingguan (Siaga & Penggalang) - Dependen PROTA:`
                      : `Uraian Materi Latihan Dinamis (Minggu I - IV):`}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isPramukaEskul
                      ? `Silabus latihan mingguan Gugus Depan Pramuka untuk bulan ${NAMA_BULAN[currentMonthIndex]} disusun otomatis selaras dengan jadwal Program Tahunan (PROTA).`
                      : `Materi silabus latihan mingguan eskul ${currentEskul.namaEskul} untuk bulan ${NAMA_BULAN[currentMonthIndex]}. Terhubung otomatis dengan laporan kegiatan & cetak LPJ.`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiGenerateMateriMingguan}
                    disabled={isAiGenerating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer disabled:opacity-50 transition-colors"
                    title={isPramukaEskul ? "Generate materi Siaga & Penggalang dependen dari jadwal PROTA bulan ini" : "Generate otomatis seluruh materi latihan minggu I-IV"}
                  >
                    <Wand2 className="w-3 h-3 text-indigo-500" />
                    {isAiGenerating ? 'Menyusun...' : isPramukaEskul ? 'Generate dari PROTA' : 'Generate Materi Dinamis'}
                  </button>
                </div>
              </div>

              {/* Banner Korelasi Jadwal PROTA Khusus Pramuka */}
              {isPramukaEskul && (
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 mb-3 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold text-slate-900">
                        Jadwal Program Tahunan (PROTA) Bulan {NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025/2026'}:
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-500 mr-1">Tampilkan:</span>
                      <button
                        type="button"
                        onClick={() => setPramukaMaterialFilter('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          pramukaMaterialFilter === 'all'
                            ? 'bg-indigo-700 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setPramukaMaterialFilter('penggalang')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          pramukaMaterialFilter === 'penggalang'
                            ? 'bg-amber-800 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Penggalang (Kls 4–6)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPramukaMaterialFilter('siaga')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                          pramukaMaterialFilter === 'siaga'
                            ? 'bg-emerald-800 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Siaga (Kls 1–3)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-amber-900 font-bold flex items-center gap-1">
                          <span>⚜️</span> Pasukan Penggalang (Kelas 4–6)
                        </strong>
                        <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                          {pramukaPenggalangAgendas.length} Agenda PROTA
                        </span>
                      </div>
                      <ul className="space-y-0.5 text-slate-700">
                        {pramukaPenggalangAgendas.length > 0 ? (
                          pramukaPenggalangAgendas.map((ag, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{ag}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">Latihan Rutin Mingguan &amp; Penguatan PBB</li>
                        )}
                      </ul>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-emerald-900 font-bold flex items-center gap-1">
                          <span>🍀</span> Perindukan Siaga (Kelas 1–3)
                        </strong>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                          {pramukaSiagaAgendas.length} Agenda PROTA
                        </span>
                      </div>
                      <ul className="space-y-0.5 text-slate-700">
                        {pramukaSiagaAgendas.length > 0 ? (
                          pramukaSiagaAgendas.map((ag, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{ag}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-500 italic">Latihan Rutin Mingguan Ceria &amp; Budi Pekerti</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeRecord.pertemuanList.map((p, mIdx) => (
                  <div
                    key={p.mingguKe}
                    className="bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl p-3 space-y-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Minggu {p.mingguKe}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRegenerateMateriSingleWeek(mIdx)}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer hover:underline"
                        title={isPramukaEskul ? "Sinkronkan materi minggu ini dari PROTA" : "Variasikan materi pekan ini"}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        {isPramukaEskul ? 'Dari PROTA' : 'Variasi'}
                      </button>
                    </div>

                    {isPramukaEskul ? (
                      <div className="space-y-2">
                        {(pramukaMaterialFilter === 'all' || pramukaMaterialFilter === 'penggalang') && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-amber-900 flex items-center gap-1 block">
                              <span>⚜️</span> Penggalang (Kelas 4–6):
                            </label>
                            <textarea
                              rows={2}
                              value={p.materiPenggalang ?? p.materi ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActiveRecord((prev) => ({
                                  ...prev,
                                  pertemuanList: prev.pertemuanList.map((item, idx) =>
                                    idx === mIdx ? { ...item, materiPenggalang: val, materi: val } : item
                                  )
                                }));
                              }}
                              placeholder={`Materi Penggalang minggu ${p.mingguKe}...`}
                              className="w-full p-2 bg-white border border-amber-200/90 rounded-lg text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {(pramukaMaterialFilter === 'all' || pramukaMaterialFilter === 'siaga') && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-emerald-900 flex items-center gap-1 block">
                              <span>🍀</span> Siaga (Kelas 1–3):
                            </label>
                            <textarea
                              rows={2}
                              value={p.materiSiaga ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActiveRecord((prev) => ({
                                  ...prev,
                                  pertemuanList: prev.pertemuanList.map((item, idx) =>
                                    idx === mIdx ? { ...item, materiSiaga: val } : item
                                  )
                                }));
                              }}
                              placeholder={`Materi Siaga minggu ${p.mingguKe}...`}
                              className="w-full p-2 bg-white border border-emerald-200/90 rounded-lg text-xs leading-relaxed focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600 block">
                          Uraian Materi Latihan:
                        </label>
                        <textarea
                          rows={3}
                          value={p.materi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveRecord((prev) => ({
                              ...prev,
                              pertemuanList: prev.pertemuanList.map((item, idx) =>
                                idx === mIdx ? { ...item, materi: val } : item
                              )
                            }));
                          }}
                          placeholder={`Materi latihan minggu ${p.mingguKe}...`}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>Hari: <strong className="text-slate-700">{p.hari}</strong></span>
                      <span className="truncate max-w-[120px]" title={p.tempat}>Lokasi: {p.tempat}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TABEL PENERIMAAN HONOR PELATIH (Format Gambar 1) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Daftar Penerimaan Honorarium Pelatih Ekstrakurikuler
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format resmi BOSP: Satuan &times; HK dikurangi PPh 21 = Jumlah Diterima Netto.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newId = `pelatih-${Date.now()}`;
                    setActiveRecord((prev) => ({
                      ...prev,
                      honorPelatihList: [
                        ...prev.honorPelatihList,
                        {
                          id: newId,
                          nama: 'Pelatih Tambahan',
                          jabatan: 'Pelatih',
                          hk: 4,
                          satuan: currentEskul?.honorPerKegiatan || 75000,
                          pph21Persen: 6,
                          hasNpwp: false
                        }
                      ],
                      presensiPelatihList: [
                        ...prev.presensiPelatihList,
                        {
                          pelatihId: newId,
                          nama: 'Pelatih Tambahan',
                          jabatan: 'Pelatih',
                          minggu1: true,
                          minggu2: true,
                          minggu3: true,
                          minggu4: true,
                          keterangan: 'Hadir'
                        }
                      ]
                    }));
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Pelatih
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-y border-slate-200">
                    <th className="p-2.5 text-center w-12">NO</th>
                    <th className="p-2.5">NAMA</th>
                    <th className="p-2.5 text-center w-20">VOLUME</th>
                    <th className="p-2.5 text-right w-32">SATUAN</th>
                    <th className="p-2.5 text-right w-36">JUMLAH (BRUTO)</th>
                    <th className="p-2.5 text-center w-28">PPh 21 (%)</th>
                    <th className="p-2.5 text-right w-32">PPh 21 (Rp)</th>
                    <th className="p-2.5 text-right w-36">JML DITERIMA</th>
                    <th className="p-2.5 text-center w-12">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRecord.honorPelatihList.map((pelatih, idx) => {
                    const bruto = pelatih.hk * pelatih.satuan;
                    const pphNominal = Math.round((bruto * pelatih.pph21Persen) / 100);
                    const netto = bruto - pphNominal;

                    return (
                      <tr key={pelatih.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={pelatih.nama}
                            onChange={(e) => {
                              const v = e.target.value;
                              setActiveRecord((prev) => ({
                                ...prev,
                                honorPelatihList: prev.honorPelatihList.map((item, i) =>
                                  i === idx ? { ...item, nama: v } : item
                                )
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-900"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            max="31"
                            value={pelatih.hk}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              setActiveRecord((prev) => ({
                                ...prev,
                                honorPelatihList: prev.honorPelatihList.map((item, i) =>
                                  i === idx ? { ...item, hk: v } : item
                                )
                              }));
                            }}
                            className="w-14 px-2 py-1 text-center bg-white border border-slate-200 rounded text-xs font-mono font-bold"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="5000"
                            value={pelatih.satuan}
                            onChange={(e) => {
                              const v = Number(e.target.value) || 0;
                              setActiveRecord((prev) => ({
                                ...prev,
                                honorPelatihList: prev.honorPelatihList.map((item, i) =>
                                  i === idx ? { ...item, satuan: v } : item
                                )
                              }));
                            }}
                            className="w-28 px-2 py-1 text-right bg-white border border-slate-200 rounded text-xs font-mono font-semibold"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(bruto)}
                        </td>
                        <td className="p-2.5 text-center">
                          <select
                            value={pelatih.pph21Persen}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setActiveRecord((prev) => ({
                                ...prev,
                                honorPelatihList: prev.honorPelatihList.map((item, i) =>
                                  i === idx ? { ...item, pph21Persen: v } : item
                                )
                              }));
                            }}
                            aria-label="Pilih Persentase PPh 21"
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700"
                          >
                            <option value={6}>6% (Non-NPWP)</option>
                            <option value={5}>5% (NPWP)</option>
                            <option value={0}>0% (Bebas Pajak)</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-right font-mono text-amber-700">
                          {formatRupiah(pphNominal)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                          {formatRupiah(netto)}
                        </td>
                        <td className="p-2.5 text-center">
                          {activeRecord.honorPelatihList.length > 1 && (
                            <button
                              onClick={() => {
                                setActiveRecord((prev) => ({
                                  ...prev,
                                  honorPelatihList: prev.honorPelatihList.filter((_, i) => i !== idx),
                                  presensiPelatihList: prev.presensiPelatihList.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Hapus baris pelatih"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider">
                      JUMLAH TOTAL :
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      {formatRupiah(honorSummary.totalBruto)}
                    </td>
                    <td className="p-2.5 text-center">-</td>
                    <td className="p-2.5 text-right font-mono text-amber-800">
                      {formatRupiah(honorSummary.totalPph)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">
                      {formatRupiah(honorSummary.totalNetto)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Informasi Tanda Tangan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  Pihak yang Menyetujui Pembayaran (Setuju dibayar):
                </span>
                <p className="text-xs font-bold text-slate-800">
                  Kepala Sekolah: {metadata.kepalaSekolah || 'Kepala Sekolah'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  NIP. {metadata.nipKepalaSekolah || '-'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  Pihak Pembayar Honor (Lunas dibayar):
                </span>
                <p className="text-xs font-bold text-slate-800">
                  Bendahara BOSP: {metadata.namaBendahara || 'Bendahara Sekolah'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  NIP. {metadata.nipBendahara || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRESENSI SISWA (Import / Export Excel + Gambar 3) */}
      {activeSubTab === 'presensi' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Daftar Hadir Siswa Ekstrakurikuler {currentEskul.namaEskul}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bulan : {NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025'} &bull; Terdaftar {activeRecord.presensiSiswaList.length} Siswa
              </p>
            </div>

            {/* Action Bar: Download Template, Import Excel, Export Excel, Set Semua Hadir */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadTemplateExcel}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Download file contoh format Excel siswa"
              >
                <Download className="w-3.5 h-3.5" /> Template Excel
              </button>

              <label className={`px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-200 ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <UploadCloud className="w-3.5 h-3.5" /> Import Data Siswa (Excel/CSV)
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  disabled={readOnly}
                  onChange={handleImportSiswaFile}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleExportSiswaExcel}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                title="Export daftar siswa beserta status kehadiran"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
              </button>

              <button
                onClick={handleSetAllSiswaHadir}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Hadir Semua
              </button>
            </div>
          </div>

          {/* Quick Add Single Student */}
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Tambah Siswa Cepat:</span>
            <input
              type="text"
              id="new-student-name"
              placeholder="Nama Siswa Lengkap..."
              className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <input
              type="text"
              id="new-student-class"
              placeholder="Kelas (cth: Kelas 4 A)..."
              defaultValue="Kelas 4 A"
              className="w-36 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={() => {
                const nameInput = document.getElementById('new-student-name') as HTMLInputElement;
                const classInput = document.getElementById('new-student-class') as HTMLInputElement;
                if (!nameInput?.value.trim()) return;

                const newSiswa: EskulPresensiSiswa = {
                  siswaId: `siswa-manual-${Date.now()}`,
                  nama: nameInput.value.trim().toUpperCase(),
                  kelas: classInput?.value.trim() || 'Kelas 4 A',
                  minggu1: 'H',
                  minggu2: 'H',
                  minggu3: 'H',
                  minggu4: 'H',
                  keterangan: 'Hadir'
                };

                setActiveRecord((prev) => ({
                  ...prev,
                  presensiSiswaList: [...prev.presensiSiswaList, newSiswa]
                }));
                nameInput.value = '';
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>

          {/* TABEL PRESENSI SISWA (Format Gambar 3) */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-y border-slate-200">
                  <th className="p-2.5 text-center w-12">NO</th>
                  <th className="p-2.5">NAMA SISWA</th>
                  <th className="p-2.5 text-center w-28">KLS</th>
                  <th className="p-2.5 text-center w-20">MG I</th>
                  <th className="p-2.5 text-center w-20">MG II</th>
                  <th className="p-2.5 text-center w-20">MG III</th>
                  <th className="p-2.5 text-center w-20">MG IV</th>
                  <th className="p-2.5 w-36">KET</th>
                  <th className="p-2.5 text-center w-12">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeRecord.presensiSiswaList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Belum ada siswa terdaftar. Silakan gunakan tombol <strong>"Import Data Siswa"</strong> atau tambah manual di atas.
                    </td>
                  </tr>
                ) : (
                  activeRecord.presensiSiswaList.map((siswa, sIdx) => (
                    <tr key={siswa.siswaId} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-bold text-slate-500">{sIdx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={siswa.nama}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveRecord((prev) => ({
                              ...prev,
                              presensiSiswaList: prev.presensiSiswaList.map((item, idx) =>
                                idx === sIdx ? { ...item, nama: val } : item
                              )
                            }));
                          }}
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded text-xs font-semibold text-slate-900"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={siswa.kelas}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveRecord((prev) => ({
                              ...prev,
                              presensiSiswaList: prev.presensiSiswaList.map((item, idx) =>
                                idx === sIdx ? { ...item, kelas: val } : item
                              )
                            }));
                          }}
                          className="w-24 px-1.5 py-1 text-center bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded text-xs font-medium text-slate-700"
                        />
                      </td>
                      {([1, 2, 3, 4] as const).map((mNum) => {
                        const field = `minggu${mNum}` as const;
                        const statusVal = siswa[field];

                        return (
                          <td key={mNum} className="p-2 text-center">
                            <select
                              value={statusVal}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setActiveRecord((prev) => ({
                                  ...prev,
                                  presensiSiswaList: prev.presensiSiswaList.map((item, idx) =>
                                    idx === sIdx ? { ...item, [field]: val } : item
                                  )
                                }));
                              }}
                              aria-label={`Presensi Minggu ${mNum}`}
                              className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                                statusVal === 'H'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : statusVal === 'S'
                                  ? 'bg-amber-100 text-amber-800'
                                  : statusVal === 'I'
                                  ? 'bg-blue-100 text-blue-800'
                                  : statusVal === 'A'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <option value="H">H (Hadir)</option>
                              <option value="S">S (Sakit)</option>
                              <option value="I">I (Izin)</option>
                              <option value="A">A (Alpa)</option>
                            </select>
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <input
                          type="text"
                          value={siswa.keterangan || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActiveRecord((prev) => ({
                              ...prev,
                              presensiSiswaList: prev.presensiSiswaList.map((item, idx) =>
                                idx === sIdx ? { ...item, keterangan: val } : item
                              )
                            }));
                          }}
                          placeholder="Hadir / Sakit..."
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-300 rounded text-xs text-slate-600"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => {
                            setActiveRecord((prev) => ({
                              ...prev,
                              presensiSiswaList: prev.presensiSiswaList.filter((_, idx) => idx !== sIdx)
                            }));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Hapus siswa ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROGRAM DINAMIS & LAPORAN BULANAN (Sesuai PDF 1 & PDF 2) */}
      {activeSubTab === 'laporan' && (
        <div className="space-y-6">
          {/* BANNER NOTIFIKASI AI GENERATOR */}
          {aiSuccessMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}

          {/* KOTAK KORELASI PROGRAM KERJA TAHUNAN & REALISASI BULAN INI (Jelas & Mudah Dipahami Orang Awam) */}
          <div className="bg-gradient-to-br from-amber-50/80 via-white to-indigo-50/40 border-2 border-amber-300/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    I. Korelasi Program Kerja Tahunan &amp; Realisasi Bulan {NAMA_BULAN[currentMonthIndex]}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Sinkronisasi antara Matriks Rencana Tahunan dengan 4 Kali Latihan Mingguan di Lapangan
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 w-fit">
                {isPramukaEskul ? 'Format Terpadu: Siaga & Penggalang' : currentEskul.kategori}
              </span>
            </div>

            {/* A. Agenda Tahunan yang Terjadwal di Bulan Ini */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                A. Agenda Program Tahunan yang Terjadwal di Bulan {NAMA_BULAN[currentMonthIndex]}:
              </span>
              {isPramukaEskul ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kolom 1: Perindukan Siaga */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 pb-1 border-b border-emerald-200/80">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      Perindukan Siaga (Kelas 1–3 SD)
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {pramukaSiagaAgendas.map((agenda, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-emerald-100 font-medium text-slate-800 shadow-2xs">
                          <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">✓</span>
                          <span className="truncate">{agenda}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Kolom 2: Pasukan Penggalang */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950 pb-1 border-b border-amber-200/80">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                      Pasukan Penggalang (Kelas 4–6 SD)
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {pramukaPenggalangAgendas.map((agenda, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-amber-100 font-medium text-slate-800 shadow-2xs">
                          <span className="w-4 h-4 rounded bg-amber-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">✓</span>
                          <span className="truncate">{agenda}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {monthlyScheduledAgendas.map((agenda, aIdx) => (
                    <div
                      key={aIdx}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-amber-200 shadow-2xs font-medium text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        ✓
                      </span>
                      <span>{agenda}</span>
                      <span className="ml-auto text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Terealisasi
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B. Narasi Sintesis Keterlaksanaan 4 Sesi Pertemuan */}
            <div className="bg-white/95 border border-slate-200 rounded-xl p-4 space-y-3 text-xs leading-relaxed">
              <span className="font-bold text-slate-900 block uppercase tracking-wider">
                B. Narasi Resume Realisasi Pelaksanaan Latihan:
              </span>
              <p className="text-slate-700 text-justify">
                {isPramukaEskul ? (
                  <>
                    Berdasarkan Matriks Program Kerja Tahunan yang telah disahkan, pada bulan <strong>{NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025/2026'}</strong> telah direalisasikan <strong>4 (empat) kali pertemuan latihan rutin mingguan</strong> secara terprogram dan berjenjang meliputi pembinaan <strong>Perindukan Siaga (Kelas 1–3)</strong> dan <strong>Pasukan Penggalang (Kelas 4–6)</strong> dengan rincian materi:
                  </>
                ) : (
                  <>
                    Berdasarkan Matriks Program Kerja Tahunan yang telah disahkan, pada bulan <strong>{NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025/2026'}</strong> telah direalisasikan <strong>4 (empat) kali pertemuan latihan rutin mingguan</strong> secara terprogram dan mendalam untuk mencapai ketuntasan pembinaan karakter, kedisiplinan, serta kecakapan teknis peserta didik, dengan rincian materi:
                  </>
                )}
              </p>
              {isPramukaEskul ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-900 text-[11px] border-b border-slate-200 pb-1">
                        <span>Minggu ke-{idx + 1} ({activeRecord.pertemuanList[idx]?.tanggal || `Pertemuan ${idx + 1}`})</span>
                        <span className="text-[10px] text-slate-500 font-normal">{activeRecord.pertemuanList[idx]?.waktu || '14.00 - 16.00'}</span>
                      </div>
                      <div className="text-[11px] text-slate-700 space-y-1">
                        <p><strong className="text-emerald-800">• Siaga (Kls 1–3):</strong> {activeRecord.pertemuanList[idx]?.materiSiaga || siagaTemplateMateri[idx] || activeRecord.pertemuanList[idx]?.materi}</p>
                        <p><strong className="text-amber-900">• Penggalang (Kls 4–6):</strong> {activeRecord.pertemuanList[idx]?.materiPenggalang || penggalangTemplateMateri[idx] || activeRecord.pertemuanList[idx]?.materi}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-slate-800">
                  {activeRecord.pertemuanList.slice(0, 4).map((p) => (
                    <div key={p.mingguKe} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="font-bold text-indigo-900">Minggu {p.mingguKe} ({p.tanggal || 'Sesuai Jadwal'}):</span>{' '}
                      <span>{p.materi}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. Pertanggungjawaban Realisasi Anggaran BKU */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900 text-white p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>Pertanggungjawaban Honor Pelatih:</strong> 4 Kehadiran Terverifikasi x {formatRupiah(activeRecord.honorPelatihList[0]?.satuan || currentEskul.honorPerKegiatan || 75000)}
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-300 text-sm">
                Total: {formatRupiah((activeRecord.honorPelatihList[0]?.satuan || currentEskul.honorPerKegiatan || 75000) * 4)} (Sumber BKU BOSP)
              </span>
            </div>
          </div>

          {/* 4 PERTEMUAN MINGGUAN & FOTO DOKUMENTASI (Sesuai PDF 2) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  Pelaksanaan 4 Sesi Latihan &amp; Foto Dokumentasi (PDF 2)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Materi kegiatan dinamis untuk bulan {NAMA_BULAN[currentMonthIndex]}. Unggah foto dokumentasi kegiatan untuk lampiran resmi SPJ.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Preset: {currentEskul.namaEskul}
                </span>

                {/* Tombol AI Otomatisasi Materi Mingguan */}
                <button
                  type="button"
                  onClick={handleAiGenerateMateriMingguan}
                  disabled={isAiGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  title="Generate otomatis silabus 4 pekan materi latihan dinamis sesuai bulan terpilih"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-200" />
                  {isAiGenerating ? 'Menyusun Silabus...' : 'AI Generate Materi (Minggu I-IV)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRecord.pertemuanList.map((pertemuan, mIdx) => (
                <div
                  key={pertemuan.mingguKe}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                      Pertemuan Minggu {pertemuan.mingguKe}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      Hari: {pertemuan.hari}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">
                        Waktu / Tanggal:
                      </label>
                      <input
                        type="text"
                        value={pertemuan.tanggal}
                        onChange={(e) => {
                          const v = e.target.value;
                          setActiveRecord((prev) => ({
                            ...prev,
                            pertemuanList: prev.pertemuanList.map((p, idx) =>
                              idx === mIdx ? { ...p, tanggal: v } : p
                            )
                          }));
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-slate-600 block mb-0.5">
                        Tempat Latihan:
                      </label>
                      <input
                        type="text"
                        value={pertemuan.tempat}
                        onChange={(e) => {
                          const v = e.target.value;
                          setActiveRecord((prev) => ({
                            ...prev,
                            pertemuanList: prev.pertemuanList.map((p, idx) =>
                              idx === mIdx ? { ...p, tempat: v } : p
                            )
                          }));
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium"
                      />
                    </div>
                  </div>

                  {isPramukaEskul ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold text-slate-700 block">
                          Uraian Materi Latihan Mingguan (PROTA):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRegenerateMateriSingleWeek(mIdx)}
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer hover:underline"
                          title="Sinkronkan materi pekan ini dari PROTA"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Dari PROTA
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-amber-900 flex items-center gap-1 block">
                          <span>⚜️</span> Pasukan Penggalang (Kelas 4–6):
                        </label>
                        <textarea
                          rows={2}
                          value={pertemuan.materiPenggalang ?? pertemuan.materi ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setActiveRecord((prev) => ({
                              ...prev,
                              pertemuanList: prev.pertemuanList.map((p, idx) =>
                                idx === mIdx ? { ...p, materiPenggalang: v, materi: v } : p
                              )
                            }));
                          }}
                          placeholder={`Materi Penggalang minggu ${pertemuan.mingguKe}...`}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-200/90 rounded text-xs leading-relaxed focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-900 flex items-center gap-1 block">
                          <span>🍀</span> Perindukan Siaga (Kelas 1–3):
                        </label>
                        <textarea
                          rows={2}
                          value={pertemuan.materiSiaga ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setActiveRecord((prev) => ({
                              ...prev,
                              pertemuanList: prev.pertemuanList.map((p, idx) =>
                                idx === mIdx ? { ...p, materiSiaga: v } : p
                              )
                            }));
                          }}
                          placeholder={`Materi Siaga minggu ${pertemuan.mingguKe}...`}
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-200/90 rounded text-xs leading-relaxed focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10.5px] font-bold text-slate-600 block">
                          Uraian Materi Latihan Dinamis:
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRegenerateMateriSingleWeek(mIdx)}
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer hover:underline"
                          title="Variasikan materi pekan ini dengan AI"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          Variasi AI
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={pertemuan.materi}
                        onChange={(e) => {
                          const v = e.target.value;
                          setActiveRecord((prev) => ({
                            ...prev,
                            pertemuanList: prev.pertemuanList.map((p, idx) =>
                              idx === mIdx ? { ...p, materi: v } : p
                            )
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Foto Dokumentasi Upload Slot */}
                  <div>
                    <label className="text-[10.5px] font-bold text-slate-600 block mb-1">
                      Foto Dokumentasi Kegiatan:
                    </label>
                    {pertemuan.fotoDokumentasi ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-300 max-h-40 bg-slate-900">
                        <img
                          src={pertemuan.fotoDokumentasi}
                          alt={`Dokumentasi Minggu ${pertemuan.mingguKe}`}
                          className="w-full h-36 object-cover"
                        />
                        <button
                          onClick={() => handleRemovePertemuanFoto(mIdx)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md cursor-pointer"
                          title="Hapus foto ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg bg-white cursor-pointer transition-colors">
                        <Camera className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-600">
                          Upload Foto Latihan Minggu {pertemuan.mingguKe}
                        </span>
                        <span className="text-[9.5px] text-slate-400">Maks. 2MB (JPG/PNG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadPertemuanFoto(mIdx, e)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NARASI EVALUASI & STRUKTUR DOKUMEN LPJ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Narasi Latar Belakang, Hasil, Kendala &amp; Solusi (Dapat Diedit)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sintesis narasi LPJ otomatis diselaraskan dengan capaian presensi siswa, profil ekstrakurikuler, dan kondisi operasional sekolah.
                </p>
              </div>

              {/* Tombol AI Generate Narasi Bab LPJ */}
              <button
                type="button"
                onClick={handleAiGenerateNarasiEskul}
                disabled={isAiGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                title="Sintesis narasi Bab LPJ (Latar Belakang, Hasil, Kendala & Solusi) dengan AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                {isAiGenerating ? 'Menyusun Narasi...' : 'AI Generate Narasi LPJ'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Latar Belakang Kegiatan:
                </label>
                <textarea
                  rows={4}
                  value={activeRecord.programConfig.latarBelakang}
                  onChange={(e) => {
                    const v = e.target.value;
                    setActiveRecord((prev) => ({
                      ...prev,
                      programConfig: { ...prev.programConfig, latarBelakang: v }
                    }));
                  }}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kalimat Penutup Laporan:
                </label>
                <textarea
                  rows={4}
                  value={activeRecord.programConfig.penutup}
                  onChange={(e) => {
                    const v = e.target.value;
                    setActiveRecord((prev) => ({
                      ...prev,
                      programConfig: { ...prev.programConfig, penutup: v }
                    }));
                  }}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Hasil &amp; Manfaat Latihan (Poin-poin Capaian &amp; Presensi):
                </label>
                <textarea
                  rows={4}
                  value={activeRecord.programConfig.hasilDanManfaat.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    setActiveRecord((prev) => ({
                      ...prev,
                      programConfig: { ...prev.programConfig, hasilDanManfaat: lines }
                    }));
                  }}
                  placeholder="Satu poin per baris..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed font-mono"
                />
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kendala Lapangan:
                  </label>
                  <textarea
                    rows={2}
                    value={activeRecord.programConfig.kendala.join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      setActiveRecord((prev) => ({
                        ...prev,
                        programConfig: { ...prev.programConfig, kendala: lines }
                      }));
                    }}
                    placeholder="Satu kendala per baris..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Solusi &amp; Tindak Lanjut:
                  </label>
                  <textarea
                    rows={2}
                    value={activeRecord.programConfig.solusi.join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      setActiveRecord((prev) => ({
                        ...prev,
                        programConfig: { ...prev.programConfig, solusi: lines }
                      }));
                    }}
                    placeholder="Satu solusi per baris..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CETAK PAKET BERKAS RESMI (PRINT PREVIEW Sesuai Gambar 1, 2, 3 & PDF 1, 2) */}
      {activeSubTab === 'cetak' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Dokumen Cetak:</span>
              <select
                value={printDocSelection}
                onChange={(e) => setPrintDocSelection(e.target.value as any)}
                aria-label="Pilih Dokumen yang Ingin Dicetak"
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="all">Bundel Lengkap SPJ Bulanan (Dokumen 1 s.d. 4)</option>
                <option value="honor">1. Dokumen 1: Tanda Terima Honor Pelatih</option>
                <option value="kwitansi">
                  2. Dokumen 2: Kwitansi Pembayaran Honor ({activeRecord.honorPelatihList.length} Kwitansi)
                </option>
                <option value="hadir_pelatih">3. Dokumen 3: Daftar Hadir Pelatih</option>
                <option value="hadir_siswa">4. Dokumen 3: Daftar Hadir Siswa</option>
                <option value="laporan">5. Dokumen 4: Laporan Latihan Bulanan &amp; Foto Dokumentasi</option>
                <option value="program">6. Dokumen Tahunan: Program Kerja &amp; Silabus Tahunan</option>
                <option value="all_with_prota">7. Bundel Penuh (SPJ Bulanan 1-4 + Dokumen Tahunan)</option>
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-400" /> Cetak Dokumen Terpilih
            </button>
          </div>

          {/* PRINTABLE CONTAINER (KERTAS A4 DOKUMEN RESMI) */}
          <div className={`official-doc-page bg-white border border-slate-300 rounded-none p-8 sm:p-12 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 max-w-4xl mx-auto font-serif text-black text-xs sm:text-[13px] leading-relaxed space-y-12 ${isAnnualReportOpen ? 'print:hidden hidden' : ''}`}>
            {/* DOKUMEN 1: TANDA TERIMA HONOR PELATIH (Gambar 1) */}
            {(printDocSelection === 'all' || printDocSelection === 'honor') && (
              <section className="print:break-after-page text-black font-serif">
                <div className="text-center space-y-0.5 mb-6">
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
                    HONOR PELATIH EKSTRAKURIKULER {currentEskul.namaEskul.toUpperCase()}
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-black">
                    {(metadata.namaSekolah || 'SD NEGERI CONTOH').toUpperCase()}
                  </h4>
                  <p className="text-xs font-bold text-black uppercase">
                    TAHUN ANGGARAN {metadata.tahunAnggaran || '2025'}
                  </p>
                  <p className="text-xs font-bold text-black uppercase mt-2">
                    BULAN : {NAMA_BULAN[currentMonthIndex].toUpperCase()} {metadata.tahunAnggaran || '2025'}
                  </p>
                </div>

                <table className="w-full border-collapse border border-black text-xs mb-8">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold text-black">
                      <th className="border border-black p-2 w-10">NO</th>
                      <th className="border border-black p-2">NAMA</th>
                      <th className="border border-black p-2 w-20">VOLUME</th>
                      <th className="border border-black p-2 w-28">SATUAN</th>
                      <th className="border border-black p-2 w-32">JUMLAH</th>
                      <th className="border border-black p-2 w-28">PPh 21</th>
                      <th className="border border-black p-2 w-32">JML DITERIMA</th>
                      <th className="border border-black p-2 w-32">TANDA TANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecord.honorPelatihList.map((pelatih, idx) => {
                      const bruto = pelatih.hk * pelatih.satuan;
                      const pph = Math.round((bruto * pelatih.pph21Persen) / 100);
                      const netto = bruto - pph;

                      return (
                        <tr key={pelatih.id}>
                          <td className="border border-black p-2 text-center">{idx + 1}</td>
                          <td className="border border-black p-2 font-bold uppercase">
                            {pelatih.nama}
                          </td>
                          <td className="border border-black p-2 text-center font-mono">{pelatih.hk}</td>
                          <td className="border border-black p-2 text-right font-mono">
                            {formatRupiah(pelatih.satuan)}
                          </td>
                          <td className="border border-black p-2 text-right font-mono">
                            {formatRupiah(bruto)}
                          </td>
                          <td className="border border-black p-2 text-right font-mono">
                            {formatRupiah(pph)}
                          </td>
                          <td className="border border-black p-2 text-right font-mono font-bold">
                            {formatRupiah(netto)}
                          </td>
                          <td className="border border-black p-2 text-left align-top h-12">
                            <span className="text-[10px] text-slate-400">{idx + 1}. .........</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={4} className="border border-black p-2 text-left uppercase">
                        JUMLAH
                      </td>
                      <td className="border border-black p-2 text-right font-mono">
                        {formatRupiah(honorSummary.totalBruto)}
                      </td>
                      <td className="border border-black p-2 text-right font-mono">
                        {formatRupiah(honorSummary.totalPph)}
                      </td>
                      <td className="border border-black p-2 text-right font-mono">
                        {formatRupiah(honorSummary.totalNetto)}
                      </td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  </tfoot>
                </table>

                {/* Tanda Tangan Gambar 1 */}
                <div className="grid grid-cols-2 gap-8 text-xs pt-4 text-black">
                  <div>
                    <p>Setuju dibayar, ....................................</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{metadata.kepalaSekolah || 'MAHBUBILLAH, S.Pd'}</p>
                    <p>NIP. {metadata.nipKepalaSekolah || '196710151988031006'}</p>
                  </div>

                  <div>
                    <p>Lunas dibayar, 05/{String(currentMonthIndex + 1).padStart(2, '0')}/{metadata.tahunAnggaran || '2025'}</p>
                    <p className="font-bold">Bendahara</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{metadata.namaBendahara || 'RUKMIATI, S.Pd.SD'}</p>
                    <p>NIP. {metadata.nipBendahara || '196606111994022001'}</p>
                  </div>
                </div>
              </section>
            )}

            {/* DOKUMEN 2: KWITANSI INDIVIDUAL UNTUK SETIAP PELATIH (Jika ada 2 atau lebih pelatih, buatkan kwitansinya masing-masing) */}
            {(printDocSelection === 'all' || printDocSelection === 'kwitansi') && (
              <div className="space-y-12">
                {activeRecord.honorPelatihList.map((pelatih, pIdx) => {
                  const bruto = pelatih.hk * pelatih.satuan;
                  const pph = Math.round((bruto * pelatih.pph21Persen) / 100);
                  const netto = bruto - pph;

                  // Cari transaksi BKU spesifik untuk pelatih ini jika ada
                  const pelatihTx = currentEskulTransactions.find(
                    (tx) =>
                      (tx.pelatihNama && tx.pelatihNama.toLowerCase().trim() === pelatih.nama.toLowerCase().trim()) ||
                      (tx.keterangan && tx.keterangan.toLowerCase().includes(pelatih.nama.toLowerCase().trim())) ||
                      (tx.rincian_barang && tx.rincian_barang.some((r) => (r.uraian_barang || '').toLowerCase().includes(pelatih.nama.toLowerCase().trim())))
                  ) || (currentEskulTransactions.length > 1 ? currentEskulTransactions[pIdx] : currentPrimaryTx);

                  const specificBkuNo = pelatihTx?.no_bku && pelatihTx.no_bku !== '-' ? pelatihTx.no_bku : (currentPrimaryTx?.no_bku && currentPrimaryTx.no_bku !== '-' ? currentPrimaryTx.no_bku : 'BOSP');
                  const kwitansiNomor = `${specificBkuNo}/KW-PELATIH-${pIdx + 1}/${String(currentMonthIndex + 1).padStart(2, '0')}/${metadata.tahunAnggaran || '2025'}`;
                  const tglCetak = pelatihTx?.tanggal || currentPrimaryTx?.tanggal || `28/${String(currentMonthIndex + 1).padStart(2, '0')}/${metadata.tahunAnggaran || '2025'}`;

                  return (
                    <section
                      key={`kwitansi-print-${pelatih.id || pIdx}`}
                      className="print:break-after-page bg-white p-6 sm:p-8 border border-black font-serif text-black space-y-4"
                    >
                      {/* Kop Kwitansi Resmi Sekolah */}
                      <div className="border-b-2 border-black pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="w-14 h-14 flex items-center justify-center border border-black rounded bg-white text-black shrink-0 overflow-hidden p-0.5">
                            {metadata.logoUrl ? (
                              <img
                                src={metadata.logoUrl}
                                alt="Logo Sekolah"
                                className="max-h-full max-w-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-black" />
                            )}
                          </div>

                          <div className="text-center flex-1 font-serif">
                            <p className="text-[10px] sm:text-[11px] uppercase font-semibold tracking-wider text-black leading-tight">
                              PEMERINTAH {metadata.provinsi?.toUpperCase() || 'JAWA BARAT'} &bull; DINAS PENDIDIKAN {metadata.kabupatenKota?.toUpperCase() || 'KABUPATEN BOGOR'}
                            </p>
                            <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-black leading-tight">
                              {metadata.namaSekolah || 'SD NEGERI CONTOH'}
                            </h1>
                            <p className="text-[10px] sm:text-[11px] text-black leading-tight">
                              NPSN: {metadata.npsn || '10203040'} &bull; Alamat: {metadata.desaKecamatan || 'Kecamatan'}, {metadata.kabupatenKota || 'Kabupaten Bogor'}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-black font-medium leading-tight">
                              Sumber Dana: {metadata.sumberDana || 'BOSP Reguler'} &bull; Tahun Anggaran {metadata.tahunAnggaran || '2025'}
                            </p>
                          </div>

                          <div className="text-right shrink-0 border border-black px-2.5 py-1.5 rounded font-serif">
                            <div className="text-[9px] text-black uppercase font-bold">No. BKU</div>
                            <div className="text-xs sm:text-sm font-bold font-mono text-black">
                              {specificBkuNo !== 'BOSP' ? specificBkuNo : 'KAS-MASUK'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Judul & Nomor Bukti */}
                      <div className="text-center my-3">
                        <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide underline font-serif">
                          KWITANSI / BUKTI PEMBAYARAN PENGELUARAN
                        </h2>
                        <p className="text-[11px] font-serif font-medium text-black mt-0.5">
                          Nomor Bukti : <span className="font-mono font-bold text-black">{kwitansiNomor}</span>
                          {activeRecord.honorPelatihList.length > 1 && (
                            <span className="ml-2 font-bold px-1.5 py-0.2 border border-black text-[10px]">
                              Pelatih {pIdx + 1} dari {activeRecord.honorPelatihList.length}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Isi Formulir Kwitansi */}
                      <div className="space-y-2.5 text-xs sm:text-[13px] font-serif">
                        <div className="flex items-start">
                          <span className="w-36 sm:w-44 shrink-0 font-medium">Tahun Anggaran</span>
                          <span className="mr-2">:</span>
                          <span className="font-bold text-black">{metadata.tahunAnggaran || '2025'}</span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-36 sm:w-44 shrink-0 font-medium">Kode Rekening</span>
                          <span className="mr-2">:</span>
                          <span className="font-mono text-black font-semibold">
                            5.1.02.02.01.0026 (Belanja Jasa Tenaga Kependidikan / Pelatih Ekstrakurikuler)
                          </span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-36 sm:w-44 shrink-0 font-medium">Sudah Terima Dari</span>
                          <span className="mr-2">:</span>
                          <span className="font-bold text-black">
                            Bendahara BOSP {metadata.namaSekolah || 'SD NEGERI CONTOH'}
                          </span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-36 sm:w-44 shrink-0 font-medium">Uang Sejumlah</span>
                          <span className="mr-2">:</span>
                          <div className="flex-1">
                            <span className="font-mono font-bold text-sm sm:text-base text-black border border-black px-2.5 py-0.5 inline-block">
                              {formatRupiah(netto)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start">
                          <span className="w-36 sm:w-44 shrink-0 font-medium">Terbilang</span>
                          <span className="mr-2">:</span>
                          <span className="flex-1 font-semibold italic p-1.5 border border-black capitalize">
                            # {terbilang(netto)} rupiah #
                          </span>
                        </div>

                        <div className="flex items-start">
                          <span className="w-36 sm:w-44 shrink-0 font-medium">Untuk Pembayaran</span>
                          <span className="mr-2">:</span>
                          <span className="flex-1 leading-relaxed text-black font-medium">
                            Pembayaran Honorarium {pelatih.jabatan || 'Pelatih'} Ekstrakurikuler{' '}
                            <strong>{currentEskul.namaEskul}</strong> Bulan{' '}
                            <strong>{NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025'}</strong>{' '}
                            sebanyak <strong>{pelatih.hk}</strong> kali kegiatan/latihan @{' '}
                            {formatRupiah(pelatih.satuan)} (Bruto: {formatRupiah(bruto)}, PPh 21 {pelatih.pph21Persen}%: {formatRupiah(pph)}).
                          </span>
                        </div>
                      </div>

                      {/* Tabel Rincian Pembayaran Honor Pelatih */}
                      <table className="w-full border-collapse border border-black text-xs my-3">
                        <thead>
                          <tr className="bg-slate-100 text-center font-bold text-black">
                            <th className="border border-black p-1.5 w-10">No</th>
                            <th className="border border-black p-1.5">Uraian / Rincian Honorarium</th>
                            <th className="border border-black p-1.5 w-20">Volume</th>
                            <th className="border border-black p-1.5 w-28">Tarif Satuan</th>
                            <th className="border border-black p-1.5 w-28">Jumlah (Rp)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-1.5 text-center">1</td>
                            <td className="border border-black p-1.5">
                              Honor {pelatih.jabatan || 'Pelatih'} Eskul {currentEskul.namaEskul} a.n.{' '}
                              <strong>{pelatih.nama}</strong>
                            </td>
                            <td className="border border-black p-1.5 text-center font-mono">{pelatih.hk}</td>
                            <td className="border border-black p-1.5 text-right font-mono">{formatRupiah(pelatih.satuan)}</td>
                            <td className="border border-black p-1.5 text-right font-mono font-bold">{formatRupiah(bruto)}</td>
                          </tr>
                          {pph > 0 && (
                            <tr>
                              <td className="border border-black p-1.5 text-center">2</td>
                              <td className="border border-black p-1.5">
                                Potongan Pajak PPh Pasal 21 ({pelatih.pph21Persen}%)
                              </td>
                              <td className="border border-black p-1.5 text-center font-mono">-</td>
                              <td className="border border-black p-1.5 text-right font-mono">-</td>
                              <td className="border border-black p-1.5 text-right font-mono">({formatRupiah(pph)})</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold bg-slate-50 text-black">
                            <td colSpan={4} className="border border-black p-1.5 text-right uppercase">
                              Jumlah Bersih Diterima (Netto)
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-black font-bold">
                              {formatRupiah(netto)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      {/* Tanda Tangan 3 Pihak: Kepala Sekolah, Bendahara, Penerima Honor */}
                      <div className="pt-3 text-xs text-black">
                        <div className="text-right mb-2">
                          {metadata.kabupatenKota || 'Bogor'}, {tglCetak}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          {/* 1. Setuju dibayar: Kepala Sekolah */}
                          <div className="flex flex-col justify-between h-36">
                            <div>
                              <p className="text-[11px]">Setuju dibayar,</p>
                              <p className="font-bold">Kepala Sekolah</p>
                            </div>
                            <div>
                              <p className="font-bold underline">{metadata.kepalaSekolah || 'MAHBUBILLAH, S.Pd'}</p>
                              <p className="text-[10px] font-mono">NIP. {metadata.nipKepalaSekolah || '-'}</p>
                            </div>
                          </div>

                          {/* 2. Lunas dibayar: Bendahara */}
                          <div className="flex flex-col justify-between h-36">
                            <div>
                              <p className="text-[11px]">Lunas dibayar,</p>
                              <p className="font-bold">Bendahara BOSP</p>
                            </div>
                            <div>
                              <p className="font-bold underline">{metadata.namaBendahara || 'RUKMIATI, S.Pd.SD'}</p>
                              <p className="text-[10px] font-mono">NIP. {metadata.nipBendahara || '-'}</p>
                            </div>
                          </div>

                          {/* 3. Yang Menerima: Pelatih */}
                          <div className="flex flex-col justify-between h-36">
                            <div>
                              <p className="text-[11px]">Penerima Uang,</p>
                              <p className="font-bold">Pelatih / Instruktur</p>
                            </div>
                            <div>
                              <p className="font-bold underline">{pelatih.nama}</p>
                              <p className="text-[10px]">Pelatih Eskul {currentEskul.namaEskul}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* DOKUMEN 3: DAFTAR HADIR PELATIH (Gambar 2) */}
            {(printDocSelection === 'all' || printDocSelection === 'hadir_pelatih') && (
              <section className="print:break-after-page text-black font-serif">
                <div className="text-center space-y-0.5 mb-4">
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
                    DAFTAR HADIR PELATIH
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-black">
                    EKSTRAKURIKULER {currentEskul.namaEskul.toUpperCase()}
                  </h4>
                  <p className="text-xs font-bold text-black uppercase">
                    {(metadata.namaSekolah || 'SD NEGERI BABAKAN 01').toUpperCase()}
                  </p>
                </div>

                <div className="text-right text-xs font-bold mb-2 text-black">
                  BULAN : {NAMA_BULAN[currentMonthIndex].toUpperCase()} {metadata.tahunAnggaran || '2025'}
                </div>

                <table className="w-full border-collapse border border-black text-xs mb-8">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold text-black">
                      <th rowSpan={2} className="border border-black p-2 w-10">NO</th>
                      <th rowSpan={2} className="border border-black p-2">NAMA</th>
                      <th rowSpan={2} className="border border-black p-2 w-32">JABATAN</th>
                      <th colSpan={4} className="border border-black p-1.5">MINGGU</th>
                      <th rowSpan={2} className="border border-black p-2 w-28">KET</th>
                    </tr>
                    <tr className="bg-slate-100 text-center font-bold text-black">
                      <th className="border border-black p-1.5 w-16">I</th>
                      <th className="border border-black p-1.5 w-16">II</th>
                      <th className="border border-black p-1.5 w-16">III</th>
                      <th className="border border-black p-1.5 w-16">IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecord.presensiPelatihList.map((pelatih, idx) => (
                      <tr key={pelatih.pelatihId} className="h-10">
                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                        <td className="border border-black p-2 font-bold uppercase">{pelatih.nama}</td>
                        <td className="border border-black p-2 uppercase text-center">{pelatih.jabatan}</td>
                        <td className="border border-black p-2 text-center font-bold">
                          {pelatih.minggu1 ? '✓' : '-'}
                        </td>
                        <td className="border border-black p-2 text-center font-bold">
                          {pelatih.minggu2 ? '✓' : '-'}
                        </td>
                        <td className="border border-black p-2 text-center font-bold">
                          {pelatih.minggu3 ? '✓' : '-'}
                        </td>
                        <td className="border border-black p-2 text-center font-bold">
                          {pelatih.minggu4 ? '✓' : '-'}
                        </td>
                        <td className="border border-black p-2 text-center">{pelatih.keterangan || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tanda Tangan Gambar 2 */}
                <div className="flex justify-end text-xs pt-4 text-black">
                  <div className="text-center w-64">
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{metadata.kepalaSekolah || 'SUBUR, S.Pd.SD'}</p>
                    <p>NIP. {metadata.nipKepalaSekolah || '197002111993081001'}</p>
                  </div>
                </div>
              </section>
            )}

            {/* DOKUMEN 3: DAFTAR HADIR SISWA (Gambar 3) */}
            {(printDocSelection === 'all' || printDocSelection === 'hadir_siswa') && (
              <section className="print:break-after-page text-black font-serif">
                <div className="text-center space-y-0.5 mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                    DAFTAR HADIR SISWA EKSTRAKURIKULER {currentEskul.namaEskul.toUpperCase()}
                  </h3>
                  <p className="text-xs font-bold text-black uppercase">
                    {(metadata.namaSekolah || 'SD NEGERI CONTOH').toUpperCase()}
                  </p>
                </div>

                <div className="text-left text-xs font-bold mb-2 text-black">
                  BULAN : {NAMA_BULAN[currentMonthIndex].toUpperCase()} {metadata.tahunAnggaran || '2025'}
                </div>

                <table className="w-full border-collapse border border-black text-xs mb-8">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold text-black">
                      <th rowSpan={2} className="border border-black p-2 w-10">NO</th>
                      <th rowSpan={2} className="border border-black p-2">NAMA</th>
                      <th rowSpan={2} className="border border-black p-2 w-24">KLS</th>
                      <th colSpan={4} className="border border-black p-1.5">MINGGU KE</th>
                      <th rowSpan={2} className="border border-black p-2 w-24">KET</th>
                    </tr>
                    <tr className="bg-slate-100 text-center font-bold text-black">
                      <th className="border border-black p-1 w-12">I</th>
                      <th className="border border-black p-1 w-12">II</th>
                      <th className="border border-black p-1 w-12">III</th>
                      <th className="border border-black p-1 w-12">IV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecord.presensiSiswaList.map((siswa, idx) => (
                      <tr key={siswa.siswaId}>
                        <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-black p-1.5 font-bold uppercase">{siswa.nama}</td>
                        <td className="border border-black p-1.5 text-center">{siswa.kelas}</td>
                        <td className="border border-black p-1.5 text-center font-bold">{siswa.minggu1 || 'H'}</td>
                        <td className="border border-black p-1.5 text-center font-bold">{siswa.minggu2 || 'H'}</td>
                        <td className="border border-black p-1.5 text-center font-bold">{siswa.minggu3 || 'H'}</td>
                        <td className="border border-black p-1.5 text-center font-bold">{siswa.minggu4 || 'H'}</td>
                        <td className="border border-black p-1.5 text-center">{siswa.keterangan || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="grid grid-cols-2 gap-8 text-xs pt-4 text-black">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{metadata.kepalaSekolah}</p>
                    <p>NIP. {metadata.nipKepalaSekolah}</p>
                  </div>

                  <div className="text-right">
                    <p>{metadata.desaKecamatan || 'Bogor'}, {activeRecord.programConfig.tanggalSurat}</p>
                    <p className="font-bold">Guru Pembina / Pelatih</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">{currentEskul.namaPelatih}</p>
                    <p>(Instruktur Ekstrakurikuler)</p>
                  </div>
                </div>
              </section>
            )}

            {/* DOKUMEN 4: LAPORAN KEGIATAN & FOTO DOKUMENTASI (Sesuai PDF 2) */}
            {(printDocSelection === 'all' || printDocSelection === 'laporan') && (
              <section className="print:break-after-page space-y-5 text-black font-serif">
                <div className="text-center space-y-0.5 mb-5">
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
                    {isPramukaEskul
                      ? 'LAPORAN LATIHAN BULANAN PRAMUKA (SIAGA & PENGGALANG)'
                      : `LAPORAN LATIHAN BULANAN ${currentEskul.namaEskul.toUpperCase()}`}
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-black">
                    GUGUS DEPAN / PANGKALAN {(metadata.namaSekolah || 'SD NEGERI 01').toUpperCase()}
                  </h4>
                  <p className="text-xs font-bold text-black">
                    BULAN : {NAMA_BULAN[currentMonthIndex].toUpperCase()} {metadata.tahunAnggaran || '2025'}
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">I. PENDAHULUAN</h4>
                    <p className="text-justify leading-relaxed">{pendahuluanText}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">II. PELAKSANAAN LATIHAN</h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="w-28 py-0.5 font-medium whitespace-nowrap">- Kegiatan</td>
                          <td className="w-3 py-0.5 text-center">:</td>
                          <td className="py-0.5 font-bold">
                            {isPramukaEskul
                              ? 'Latihan Rutin Bulanan Pramuka (Perindukan Siaga & Pasukan Penggalang)'
                              : `Latihan Rutin Bulanan ${currentEskul.namaEskul}`}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-medium whitespace-nowrap">- Bulan</td>
                          <td className="py-0.5 text-center">:</td>
                          <td className="py-0.5">{NAMA_BULAN[currentMonthIndex]}, {metadata.tahunAnggaran || '2025'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-medium whitespace-nowrap">- Tempat</td>
                          <td className="py-0.5 text-center">:</td>
                          <td className="py-0.5">{currentEskul.lokasi || 'Lapangan Utama Sekolah'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-medium whitespace-nowrap">- Peserta</td>
                          <td className="py-0.5 text-center">:</td>
                          <td className="py-0.5">
                            {isPramukaEskul
                              ? `Seluruh Anggota Siaga (Kelas 1–3) & Penggalang (Kelas 4–6) - ${activeRecord.presensiSiswaList.length} Siswa Terdaftar`
                              : `Seluruh Anggota Eskul (${activeRecord.presensiSiswaList.length} Siswa Terdaftar)`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* III. KORELASI PROGRAM KERJA TAHUNAN & REALISASI BULANAN */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs uppercase mb-1">
                      III. KORELASI PROGRAM KERJA TAHUNAN DENGAN REALISASI BULAN {NAMA_BULAN[currentMonthIndex].toUpperCase()}
                    </h4>
                    {isPramukaEskul ? (
                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="font-bold mb-1">A. Agenda Program Tahunan yang Terjadwal di Bulan Ini:</p>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-bold mb-1">1. Perindukan Siaga (Kelas 1–3):</p>
                              <ul className="space-y-0.5">
                                {pramukaSiagaAgendas.map((a, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="font-bold shrink-0">[✓]</span>
                                    <span>{a}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="font-bold mb-1">2. Pasukan Penggalang (Kelas 4–6):</p>
                              <ul className="space-y-0.5">
                                {pramukaPenggalangAgendas.map((a, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="font-bold shrink-0">[✓]</span>
                                    <span>{a}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold mb-0.5">B. Narasi Resume Realisasi Pelaksanaan Latihan:</p>
                          <p className="text-justify leading-relaxed">
                            Berdasarkan Matriks Program Kerja Tahunan Gugus Depan, pada bulan {NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025/2026'} telah direalisasikan 4 (empat) kali pertemuan latihan rutin mingguan terpadu membina Perindukan Siaga (Kelas 1–3) dan Pasukan Penggalang (Kelas 4–6). Seluruh materi latihan terlaksana tertib sesuai jadwal dengan rata-rata kehadiran siswa {activeRecord.presensiSiswaList.length} orang dan 4 kali kehadiran pelatih/pembina terverifikasi.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <p className="font-bold mb-1">A. Agenda Program Tahunan yang Terjadwal di Bulan Ini:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {monthlyScheduledAgendas.map((agenda, aIdx) => (
                              <div key={aIdx} className="flex items-start gap-1.5">
                                <span className="font-bold shrink-0">[✓]</span>
                                <span>{agenda}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold mb-0.5">B. Narasi Resume Realisasi Pelaksanaan Latihan:</p>
                          <p className="text-justify leading-relaxed">
                            Berdasarkan Matriks Program Kerja Tahunan, pada bulan {NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025/2026'} telah direalisasikan 4 (empat) kali pertemuan latihan rutin mingguan terfokus dan mendalam untuk mencapai target pembinaan karakter, kedisiplinan, serta keterampilan teknis peserta didik. Seluruh sesi latihan terlaksana tertib sesuai jadwal dengan rata-rata kehadiran siswa {activeRecord.presensiSiswaList.length} orang dan 4 kali kehadiran pelatih resmi.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-2">IV. PELAKSANAAN KEGIATAN &amp; DOKUMENTASI FOTO (PDF 2)</h4>
                    <table className="w-full border border-black border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-center font-bold">
                          <th className="border border-black p-2 w-10 text-center">No</th>
                          <th className="border border-black p-2 w-44 text-center">Waktu</th>
                          <th className="border border-black p-2 text-center">Uraian Kegiatan &amp; Dokumentasi Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRecord.pertemuanList.map((p, idx) => (
                          <tr key={p.mingguKe}>
                            <td className="border border-black p-2 text-center font-bold align-top">{idx + 1}</td>
                            <td className="border border-black p-2 align-top">
                              <p className="font-bold">{p.hari}, {p.tanggal}</p>
                              <p className="text-[11px]">Waktu: {p.waktu}</p>
                              <p className="text-[11px]">Tempat: {p.tempat}</p>
                            </td>
                            <td className="border border-black p-2 align-top space-y-1">
                              {isPramukaEskul ? (
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-black">
                                    <span className="font-bold">&bull; Siaga (Kelas 1–3):</span> {p.materiSiaga || siagaTemplateMateri[idx] || p.materi}
                                  </p>
                                  <p className="font-semibold text-black">
                                    <span className="font-bold">&bull; Penggalang (Kelas 4–6):</span> {p.materiPenggalang || penggalangTemplateMateri[idx] || p.materi}
                                  </p>
                                  <p className="text-[11px] text-black">&bull; Penanggung jawab: {p.penanggungJawab}</p>
                                  <p className="text-[11px] text-black">&bull; Peserta: Regu &amp; Barung Lengkap</p>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-black">&bull; Materi: {p.materi}</p>
                                  <p className="text-[11px] text-black">&bull; Penanggung jawab: {p.penanggungJawab}</p>
                                  <p className="text-[11px] text-black">&bull; Peserta: {p.pesertaInfo}</p>
                                </div>
                              )}

                              {p.fotoDokumentasi && (
                                <div className="mt-2 border border-black p-1 max-w-sm">
                                  <img
                                    src={p.fotoDokumentasi}
                                    alt={`Foto Dokumentasi Minggu ${p.mingguKe}`}
                                    className="max-h-48 w-auto object-contain mx-auto"
                                  />
                                  <p className="text-[9.5px] text-center mt-1 italic">
                                    Dokumentasi Kegiatan Latihan Minggu ke-{p.mingguKe}
                                  </p>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">V. HASIL DAN MANFAAT LATIHAN</h4>
                    {isPramukaEskul ? (
                      <ul className="list-disc pl-5 space-y-0.5 text-black">
                        <li><strong>Tingkat Siaga:</strong> Penanaman budi pekerti luhur, pengamalan Dwi Satya &amp; Dwi Darma, kemandirian pribadi, dan keceriaan bersosialisasi dalam perindukan.</li>
                        <li><strong>Tingkat Penggalang:</strong> Kedisiplinan baris-berbaris (PBB bertongkat), penguasaan keterampilan teknik kepramukaan (Tekpram), dan kepemimpinan beregu mandiri.</li>
                        <li>Terbangunnya sinergi kekeluargaan dan semangat kepanduan di seluruh jenjang kelas sekolah dasar.</li>
                      </ul>
                    ) : (
                      <ul className="list-disc pl-5 space-y-0.5 text-black">
                        {activeRecord.programConfig.hasilDanManfaat.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {activeRecord.programConfig.kendala && activeRecord.programConfig.kendala.length > 0 && (
                    <div>
                      <h4 className="font-bold text-xs uppercase mb-1">VI. KENDALA DAN TINDAK LANJUT / SOLUSI</h4>
                      <ul className="list-disc pl-5 space-y-0.5 text-black">
                        {activeRecord.programConfig.kendala.map((k, i) => (
                          <React.Fragment key={i}>
                            <li><strong>Kendala:</strong> {k}</li>
                            <li><strong>Solusi:</strong> {activeRecord.programConfig.solusi[i] || '-'}</li>
                          </React.Fragment>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">
                      {activeRecord.programConfig.kendala && activeRecord.programConfig.kendala.length > 0 ? 'VII. PENUTUP' : 'VI. PENUTUP'}
                    </h4>
                    <p className="text-justify leading-relaxed">{activeRecord.programConfig.penutup}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs pt-8 text-black break-inside-avoid">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-20" />
                    <p className="font-bold underline">{metadata.kepalaSekolah}</p>
                    <p>NIP. {metadata.nipKepalaSekolah}</p>
                  </div>

                  <div className="text-right">
                    <p>{metadata.desaKecamatan || 'Bogor'}, {activeRecord.programConfig.tanggalSurat}</p>
                    <p className="font-bold">Pembina / Pelatih Ekstrakurikuler,</p>
                    <div className="h-20" />
                    <p className="font-bold underline">
                      {getCoachesFromEskul(currentEskul).length > 0
                        ? getCoachesFromEskul(currentEskul).map((c) => c.nama).join(' & ')
                        : (currentEskul.namaPembina || currentEskul.namaPelatih)}
                    </p>
                    <p>NIP. {currentEskul.nipPembina || '-'}</p>
                  </div>
                </div>
              </section>
            )}

            {/* DOKUMEN 5: PROGRAM KEGIATAN & SILABUS TAHUNAN (Sesuai PDF 1) */}
            {(printDocSelection === 'all_with_prota' || printDocSelection === 'program') && (
              <section className="print:break-after-page space-y-6 text-black font-serif">
                <div className="text-center space-y-1 py-4 border-b-2 border-black mb-6">
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-black">
                    {isPramukaEskul
                      ? 'PROGRAM KERJA & MATERI TAHUNAN PRAMUKA (SIAGA & PENGGALANG)'
                      : 'PROGRAM KERJA & MATERI TAHUNAN'}
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold uppercase text-black">
                    EKSTRAKURIKULER {currentEskul.namaEskul.toUpperCase()}
                  </h4>
                  <p className="text-xs font-bold text-black uppercase">
                    {(metadata.namaSekolah || 'SD NEGERI 01').toUpperCase()} &bull; TAHUN {metadata.tahunAnggaran || '2025'}
                  </p>
                </div>

                <div className="space-y-4 text-xs text-black">
                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">A. LATAR BELAKANG</h4>
                    <p className="text-justify leading-relaxed">{pendahuluanText}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">B. TUJUAN KEGIATAN</h4>
                    {isPramukaEskul ? (
                      <div className="space-y-1.5 pl-1">
                        <div>
                          <p className="font-bold text-black">1. Golongan Siaga (Kelas 1–3 SD):</p>
                          <ul className="list-disc pl-5 space-y-0.5">
                            <li>Mengenal dan mengamalkan kode kehormatan Dwi Satya &amp; Dwi Darma.</li>
                            <li>Menumbuhkan budi pekerti luhur, patuh pada orang tua &amp; guru, serta keceriaan bermain bersama.</li>
                            <li>Pencapaian Syarat Kecakapan Umum (SKU) Siaga Mula, Bantu, dan Tata.</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-bold text-black pt-1">2. Golongan Penggalang (Kelas 4–6 SD):</p>
                          <ul className="list-disc pl-5 space-y-0.5">
                            <li>Mengamalkan kode kehormatan Tri Satya &amp; Dasa Darma dalam kehidupan sehari-hari.</li>
                            <li>Membentuk kepemimpinan regu mandiri (patrol system) dan kedisiplinan baris-berbaris bertongkat.</li>
                            <li>Pencapaian Syarat Kecakapan Umum (SKU) Penggalang Ramu, Rakit, Terap dan SKK wajib kepanduan.</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <ol className="list-decimal pl-5 space-y-0.5">
                        {activeRecord.programConfig.tujuanLatihan.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">C. WAKTU DAN FREKUENSI</h4>
                    <p>&bull; Tahun Pelaksanaan : Januari – Desember {metadata.tahunAnggaran || '2025'}</p>
                    <p>&bull; Frekuensi : 4 kali pertemuan setiap bulan</p>
                    <p>&bull; Pelaksanaan : 1 kali setiap minggu ({currentEskul.jadwalLatihan || 'Setiap Hari Jumat, 14.00 - 16.00 WIB'})</p>
                    <p>&bull; Tempat : {currentEskul.lokasi || 'Lapangan Utama Sekolah'}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs uppercase mb-1">D. POLA MATERI MINGGUAN (BERLAKU SETIAP BULAN)</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Minggu ke-1 :</strong> Pengenalan materi, pemanasan dan latihan teknik gerak dasar</li>
                      <li><strong>Minggu ke-2 :</strong> Teknik gerak lanjutan, koordinasi tim dan pola formasi/lantai</li>
                      <li><strong>Minggu ke-3 :</strong> Latihan rangkaian gerak inti dan simulasi tanding/penampilan</li>
                      <li><strong>Minggu ke-4 :</strong> Latihan gerak utuh, ekspresi/penjiwaan, evaluasi dan apresiasi</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs pt-8 text-black break-inside-avoid">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah,</p>
                    <div className="h-20" />
                    <p className="font-bold underline">{metadata.kepalaSekolah}</p>
                    <p>NIP. {metadata.nipKepalaSekolah}</p>
                  </div>

                  <div className="text-right">
                    <p>Disusun di : {metadata.desaKecamatan || 'Bogor'}</p>
                    <p className="font-bold">Pembina Ekstrakurikuler,</p>
                    <div className="h-20" />
                    <p className="font-bold underline">{currentEskul.namaPembina || currentEskul.namaPelatih}</p>
                    <p>NIP. {currentEskul.nipPembina || '198203152010011012'}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

        {/* 5. TOMBOL UPDATE SIMPANAN CLOUD DI POSISI PALING BAWAH DENGAN NAMA 'SIMPAN DATA KE CLOUD' */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm no-print flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-800">
                  Sinkronisasi LPJ {currentEskul.namaEskul} ({NAMA_BULAN[currentMonthIndex]} {metadata.tahunAnggaran || '2025'})
                </h4>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeRecord.isSubmitted
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {activeRecord.isSubmitted ? 'Tersimpan di Cloud' : 'Draf Baru'}
                </span>
                {cloudSyncStatus === 'syncing' && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-indigo-600">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Menyinkronkan...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simpan seluruh lembar bukti, presensi siswa, kehadiran pelatih, dan tanda terima honor ke Cloud Firebase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {activeRecord.isSubmitted && (
              <button
                type="button"
                disabled={readOnly}
                onClick={handleResetToDraft}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Batalkan submit dan kembali ke draf"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kembalikan ke Draf</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmitMonthEskul}
              disabled={readOnly || isSubmittingCloud}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                activeRecord.isSubmitted
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              title="Simpan data LPJ eskul bulan ini ke Firebase Cloud"
            >
              {isSubmittingCloud ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span>Simpan Data ke Cloud</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL / DOKUMEN CETAK TAHUNAN ESKUL (RENDER DI LUAR DIV UTAMA UNTUK ISOLASI CETAK PENUH) */}
      {isAnnualReportOpen && (
        <EskulReportModal
          isOpen={isAnnualReportOpen}
          onClose={() => setIsAnnualReportOpen(false)}
          eskul={currentEskul}
          metadata={metadata}
          bkuData={bkuData}
        />
      )}
    </>
  );
};
