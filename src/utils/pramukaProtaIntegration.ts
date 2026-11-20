import { MasterEskul } from '../types';
import {
  getPramukaAgendaByMonth,
  PramukaHeaderConfig,
  PramukaMatrixItem
} from '../components/master/PramukaProgramTahunanDocument';
import { findEskulProtaProfile, ALL_ESKUL_PROTA_PROFILES, EskulProtaProfile } from '../data/eskulProtaDataBank';

/**
 * Bank materi mingguan berbasis butir-butir Program Tahunan (PROTA) resmi.
 * Setiap butir PROTA diurai menjadi modul latihan spesifik untuk Minggu 1 - 4.
 */
interface ProtaMateriModule {
  keyword: string;
  subtopics: [string, string, string, string];
}

const PENGGALANG_PROTA_MODULES: ProtaMateriModule[] = [
  {
    keyword: 'pbb',
    subtopics: [
      'Upacara pembukaan latihan formasi angkare, penghormatan bendera, pengucapan Tri Satya & Dasa Darma, serta PBB dasar sikap sempurna dan istirahat.',
      'Latihan PBB gerak berjalan (langkah tegap, periksa kerapian seragam pramuka lengkap, balik kanan/kiri berbanjar), kedisiplinan dan pembiasaan tertib barisan regu.',
      'Latihan PBB bertongkat (sikap siap bertongkat, pasang tongkat, dan lencang kanan bertongkat) melatih keseragaman regu.',
      'Tata upacara penutupan latihan formasi angkare, evaluasi kedisiplinan barisan penggalang, dan penataan sanggar.'
    ]
  },
  {
    keyword: 'tali',
    subtopics: [
      'Keterampilan tali temali simpul dasar (simpul hidup, mati, anyam, pangkal, jangkar) dan teknik ikatan palang pada tongkat pramuka.',
      'Pioneering aplikatif terapan (pembuatan tandu darurat mitela, tiang bendera regu, atau gapura mini) antarrgu.',
      'Komunikasi sandi lapangan: Sandi Morse menggunakan ketukan peluit/senter dan pengenalan alfabet sandi bendera Semaphore.',
      'Uji ketangkasan pioneering kecepatan dan perlombaan transmisi sandi morse/semaphore antarrgu penggalang.'
    ]
  },
  {
    keyword: 'p3k',
    subtopics: [
      'Pengenalan obat-obatan darurat standar kotak P3K, antiseptik, dan penanganan awal luka gores atau memar di lapangan.',
      'Praktik teknik pembalutan luka kepala, lengan, dan sendi menggunakan kain segitiga mitela secara berpasangan.',
      'Simulasi tanggap darurat kecelakaan lapangan dan pembuatan tandu darurat cepat menggunakan 2 tongkat pramuka dan tali.',
      'Uji simulasi evakuasi korban luka ringan menuju posko kesehatan sekolah dan evaluasi keselamatan tim.'
    ]
  },
  {
    keyword: 'jelajah',
    subtopics: [
      'Pengenalan kompas bidik, menentukan 16 arah mata angin, dan orientasi medan lingkungan terbuka sekolah.',
      'Mengenal tanda-tanda jejak menggunakan ranting pohon, batu, dan goresan rumput untuk penjelajahan alam.',
      'Simulasi penjelajahan alam terbuka mini (wide game 4 pos jelajah) melatih kekompakan dan kepemimpinan regu.',
      'Evaluasi ketepatan tiba di pos tujuan, pemetaan rute pita sederhana, dan pengecekan kelengkapan regu.'
    ]
  },
  {
    keyword: 'penerimaan',
    subtopics: [
      'Orientasi pangkalan Gugus Depan, pengenalan sejarah kepramukaan, dan tata cara mengenakan seragam pramuka penggalang lengkap.',
      'Musyawarah pembentukan regu baru putra/putri, pemilihan Pinru dan Wapinru, penyusunan yel-yel regu, dan pembagian tugas sanggar.',
      'Pembuatan atribut nama regu, bendera regu, dan tata tertib kesepakatan sanggar regu penggalang.',
      'Apel penyambutan anggota penggalang baru dan permainan besar keakraban regu di lapangan sekolah.'
    ]
  },
  {
    keyword: 'sku',
    subtopics: [
      'Pendalaman butir-butir SKU Penggalang Ramu/Rakit bidang keagamaan, toleransi, dan patriotisme kebangsaan.',
      'Pendalaman butir-butir SKU bidang keterampilan fisik, baris-berbaris, teknik kepramukaan, dan kebersihan lingkungan.',
      'Simulasi pengujian mandiri butir SKU antarteman sebaya dalam regu dipandu Pinru.',
      'Ujian verifikasi langsung butir Syarat Kecakapan Umum (SKU) oleh Pembina Gugus Depan secara objektif.'
    ]
  },
  {
    keyword: 'pelantikan',
    subtopics: [
      'Pemeriksaan portofolio kecakapan khusus 10 TKK wajib (menabung, pppk, juru masak, gerak jalan) dan unjuk karya.',
      'Praktik unjuk kemahiran kecakapan khusus di depan tim penguji pembina pangkalan.',
      'Gladi bersih tata cara upacara resmi pelantikan kenaikan tingkat penggalang.',
      'Upacara resmi pelantikan kenaikan tingkat penggalang, penyematan tanda SKU/TKK baru, dan doa bersama.'
    ]
  },
  {
    keyword: 'tkk',
    subtopics: [
      'Sosialisasi 10 Tanda Kecakapan Khusus (TKK) Wajib Penggalang dan pemilihan target TKK perorangan.',
      'Latihan kemahiran TKK juru kebun, pengatur ruangan, dan gerak jalan regu.',
      'Ujian portofolio dan verifikasi praktik kecakapan khusus oleh Pembina Gugus Depan.',
      'Penyematan tanda TKK penggalang dan pencatatan dalam buku saku anggota.'
    ]
  },
  {
    keyword: 'hari pramuka',
    subtopics: [
      'Latihan intensif formasi upacara bendera khusus peringatan Hari Pramuka ke-64 dan HUT Kemerdekaan RI.',
      'Lomba ketangkasan antarrgu: PBB indah variasi, kerapian seragam, dan yel-yel patriotik tingkat gugus depan.',
      'Partisipasi upacara peringatan Hari Pramuka / HUT RI dan malam renungan ulang janji Tri Satya.',
      'Pemberian apresiasi regu terdisiplin dan refleksi nilai-nilai Dasa Darma dalam kehidupan sehari-hari.'
    ]
  },
  {
    keyword: 'kemah',
    subtopics: [
      'Kesiapan perlengkapan perkemahan regu, teknik cepat mendirikan tenda dome/regu yang kokoh dan rapi.',
      'Tata tertib kehidupan perkemahan, sanitasi tenda, dan memasak mandiri antar-regu penggalang.',
      'Pelaksanaan Perkemahan Sabtu-Minggu (PERSAMI), upacara api unggun edukatif, dan malam unjuk kreasi budaya.',
      'Operasi semut pembersihan bumi perkemahan, pembongkaran tenda, upacara penutupan, dan evaluasi kemandirian.'
    ]
  },
  {
    keyword: 'persami',
    subtopics: [
      'Pembekalan perlengkapan pribadi dan regu menghadapi Perkemahan Sabtu-Minggu (PERSAMI).',
      'Praktik mendirikan tenda dan penataan kavling tenda regu di lapangan pangkalan.',
      'Kegiatan PERSAMI: api unggun edukatif, renungan malam, dan ketangkasan kepanduan beregu.',
      'Operasi bersih lapangan perkemahan, upacara penutupan PERSAMI, dan pembagian sertifikat partisipasi.'
    ]
  },
  {
    keyword: 'lomba',
    subtopics: [
      'Seleksi anggota dan pembekalan tekpram intensif persiapan ajang Lomba Tingkat (LT-2) Kwartir Ranting.',
      'Pendalaman materi lomba: PBB variasi indah, pionering kecepatan, morse/semaphore tempo tinggi, dan navigasi.',
      'Simulasi uji tanding seluruh materi lomba bersama pelatih pendamping.',
      'Pemberangkatan kontingen regu inti lomba, partisipasi aktif, dan evaluasi hasil prestasi.'
    ]
  },
  {
    keyword: 'lt',
    subtopics: [
      'Seleksi anggota dan pembekalan tekpram intensif persiapan ajang Lomba Tingkat (LT-2) Kwartir Ranting.',
      'Pendalaman materi lomba: PBB variasi indah, pionering kecepatan, morse/semaphore tempo tinggi, dan navigasi.',
      'Simulasi uji tanding seluruh materi lomba bersama pelatih pendamping.',
      'Pemberangkatan kontingen regu inti lomba, partisipasi aktif, dan evaluasi hasil prestasi.'
    ]
  },
  {
    keyword: 'bakti',
    subtopics: [
      'Sosialisasi aksi Pramuka Peduli Lingkungan dan pembagian zona kerja bakti per regu di area sekolah.',
      'Gotong royong membersihkan selokan, pemilahan sampah organik/anorganik, dan pembersihan sanggar.',
      'Aksi penanaman bibit tanaman penghijauan dan apotek hidup sekolah oleh seluruh regu penggalang.',
      'Refleksi kepedulian lingkungan hidup berlandaskan Dasa Darma kedua: Cinta alam dan kasih sayang sesama manusia.'
    ]
  },
  {
    keyword: 'evaluasi',
    subtopics: [
      'Rekapitulasi presensi kehadiran latihan mingguan dan catatan perkembangan anggota regu penggalang.',
      'Evaluasi ketercapaian target program kerja tahunan semester berjalan bersama dewan pembina.',
      'Musyawarah dewan penggalang pangkalan penyampaian aspirasi anggota regu untuk semester mendatang.',
      'Penataan, inventarisasi perlengkapan sanggar pramuka, dan doa bersama penutup semester.'
    ]
  }
];

const SIAGA_PROTA_MODULES: ProtaMateriModule[] = [
  {
    keyword: 'rutin',
    subtopics: [
      'Upacara pembukaan perindukan formasi lingkaran ceria, pengucapan Dwi Satya & Dwi Darma, serta pembiasaan salam pramuka dan kerapian kacu.',
      'Pengamalan Dwi Darma melalui dongeng budi pekerti kasih sayang keluarga, lagu kepanduan siaga gembira, dan tata tertib perindukan.',
      'Latihan baris-berbaris dasar siaga ceria (sikap siap, istirahat, setengah lengan lencang kanan) dan kekompakan Barung warna.',
      'Upacara penutupan perindukan lingkaran ceria, lagu perpisahan gembira, dan doa penutup bersama Yanda dan Bunda.'
    ]
  },
  {
    keyword: 'keterampilan',
    subtopics: [
      'Pengenalan tali siaga, praktik simpul dasar praktis (simpul hidup dan simpul mati untuk tali tenda/kacu), serta lomba simpul Barung.',
      'Permainan edukatif tali temali ceria dan kerapian menggulung tali Barung warna masing-masing.',
      'Permainan edukatif kekompakan Barung warna (merah, hijau, kuning, biru), estafet kelereng, dan kerja sama tim.',
      'Pengenalan arah mata angin sederhana (utara, timur, selatan, barat) melalui nyanyian dan gerak ceria.'
    ]
  },
  {
    keyword: 'p3k',
    subtopics: [
      'Edukasi kebersihan kuku dan pakaian seragam, senam ceria siaga, serta praktik mencuci tangan 6 langkah bersih.',
      'Pengenalan isi kotak obat darurat sederhana, plester cepat, dan penanganan luka gores ringan saat bermain.',
      'Praktik merawat tubuh sehat, pembiasaan membawa bekal makanan bergizi, dan minum air putih teratur.',
      'Senam kesegaran jasmani siaga ceria bersama Yanda dan Bunda serta permainan tanggap sehat.'
    ]
  },
  {
    keyword: 'sehat',
    subtopics: [
      'Edukasi kebersihan diri, mencuci tangan bersabun, dan menjaga kerapian seragam siaga lengkap.',
      'Pengenalan plester luka dan cara merawat luka gores ringan secara mandiri saat beraktivitas.',
      'Mengenal makanan 4 sehat 5 sempurna dan pembiasaan sarapan sehat sebelum berangkat sekolah.',
      'Permainan gerak ceria dan senam sehat perindukan siaga di halaman sekolah.'
    ]
  },
  {
    keyword: 'penerimaan',
    subtopics: [
      'Penyambutan adik-adik calon Siaga kelas 1–3 dengan lagu-lagu gembira kepanduan dan pengenalan Yanda/Bunda pembina.',
      'Musyawarah pembagian kelompok Barung warna ceria (Merah, Hijau, Kuning, Biru, Putih).',
      'Pemilihan Pemimpin Barung (Pinrung) dan Wakil Pemimpin Barung (Wapinrung) secara ceria.',
      'Pengenalan salam pramuka, tepuk pramuka riang, dan apel perindukan pertama.'
    ]
  },
  {
    keyword: 'sku',
    subtopics: [
      'Belajar bersama butir-butir SKU Siaga Mula (doa harian, nama pahlawan nasional, lambang Garuda dan bendera merah putih).',
      'Latihan pengucapan sila Pancasila, hafalan lagu kebangsaan Indonesia Raya, dan salam kebangsaan.',
      'Ujian ramah dan menyenangkan butir SKU oleh Yanda dan Bunda secara perorangan.',
      'Pengisian paraf buku catatan saku kecakapan siaga dan apresiasi bintang kemajuan anak.'
    ]
  },
  {
    keyword: 'pelantikan',
    subtopics: [
      'Pemeriksaan portofolio kecakapan khusus siaga (menabung, sholat/ibadah, kebersihan kamar) bersama orang tua.',
      'Gladi bersih tata cara upacara pelantikan kenaikan tingkat di tengah lingkaran perindukan.',
      'Upacara sakral pelantikan kenaikan tingkat Siaga Mula ke Bantu/Tata dengan penuh kasih sayang.',
      'Penyematan tanda SKU/TKK baru di seragam siaga dan pemberian selamat antarteman barung.'
    ]
  },
  {
    keyword: 'pesta siaga',
    subtopics: [
      'Latihan materi taman Pesta Siaga: taman ketaqwaan, taman toleransi, dan taman ketangkasan ceria.',
      'Latihan gerak lagu kepramukaan riang dan yel-yel kekompakan kontingen Barung sekolah.',
      'Simulasi perlombaan mini antartaman bersama pembina pendamping di lapangan sekolah.',
      'Pemberangkatan kontingen Barung ke ajang Pesta Siaga Kwarran dengan semangat ceria dan sportivitas.'
    ]
  },
  {
    keyword: 'persari',
    subtopics: [
      'Pengenalan konsep perkemahan satu hari (Persari), membawa tikar, dan bekal sehat dari rumah.',
      'Praktik mendirikan tenda kecil ceria dan menghias sudut pangkalan barung warna-warni.',
      'Pesta seni barung siaga: unjuk gerak lagu, dongeng lucu, dan estafet bola gembira.',
      'Santap siang bersama di tikar perindukan, operasi semut bersih lapangan, dan penutupan ceria.'
    ]
  },
  {
    keyword: 'jalan ceria',
    subtopics: [
      'Jalan santai ceria mengamati lingkungan alam terbuka sekitar sekolah yang aman dan hijau.',
      'Mengamati dan mengumpulkan aneka ragam dedaunan dan bunga liar di sepanjang lintasan jalan.',
      'Membuat kreasi kolase daun alam hasil penjelajahan santai bersama teman sebarung di kelas.',
      'Refleksi rasa syukur kepada Tuhan Yang Maha Esa atas keindahan alam dan ciptaan-Nya.'
    ]
  },
  {
    keyword: 'bakti',
    subtopics: [
      'Pembiasaan membuang sampah pada tempatnya dan memisahkan sampah plastik serta daun kering.',
      'Gotong royong merawat kebun bunga sekolah dan menyiram tanaman pot perindukan bersama-sama.',
      'Aksi semut memungut sampah di sekitar lapangan sekolah melatih kepedulian lingkungan.',
      'Edukasi menyayangi tanaman dan hewan ciptaan Tuhan berlandaskan nilai Dwi Darma.'
    ]
  },
  {
    keyword: 'hari pramuka',
    subtopics: [
      'Mengenal lambang Tunas Kelapa Gerakan Pramuka dan kisah Baden Powell ramah anak.',
      'Latihan apel lingkaran khusus peringatan Hari Pramuka ke-64 dan lagu kepanduan ceria.',
      'Lomba permainan tradisional gembira (membawa kelereng, balap bakiak siaga, dan makan kerupuk).',
      'Apel gembira peringatan kemerdekaan, pembagian bingkisan barung, dan santap bersama.'
    ]
  },
  {
    keyword: 'evaluasi',
    subtopics: [
      'Rekapitulasi bintang kehadiran latihan siaga ceria selama satu semester bersama Yanda dan Bunda.',
      'Refleksi pengamalan Dwi Darma: berbakti kepada ayah bundanya dan berani serta tidak putus asa.',
      'Pesta barung kecil penutup semester, berbagi kudapan sehat bersama seluruh anggota perindukan.',
      'Doa syukur bersama dan pembagian catatan perkembangan kecakapan siaga ke orang tua.'
    ]
  }
];

/**
 * Mencari modul latihan dari daftar kata kunci kegiatan PROTA
 */
function findModuleForAgenda(kegiatan: string, isSiaga: boolean): ProtaMateriModule | null {
  const bank = isSiaga ? SIAGA_PROTA_MODULES : PENGGALANG_PROTA_MODULES;
  const text = kegiatan.toLowerCase();
  
  for (const mod of bank) {
    if (text.includes(mod.keyword)) {
      return mod;
    }
  }
  return null;
}

/**
 * GENERATOR MATERI MINGGUAN TERINTEGRASI PROTA
 * Menghasilkan tepat 4 materi mingguan yang 100% DEPENDEN dari jadwal Program Tahunan (PROTA) bulan terkait.
 */
export function generateWeeklyMateriFromProta(
  monthIndex: number,
  isSiaga: boolean,
  eskul?: MasterEskul,
  config?: PramukaHeaderConfig
): [string, string, string, string] {
  // 1. Ambil agenda kegiatan PROTA yang AKTIF ([✓]) di bulan ini
  const agendas: PramukaMatrixItem[] = getPramukaAgendaByMonth(monthIndex, isSiaga, eskul, config);

  // Fallback default jika agenda PROTA kosong di bulan ini
  if (!agendas || agendas.length === 0) {
    if (isSiaga) {
      return [
        'Upacara pembukaan perindukan formasi lingkaran ceria, pengucapan Dwi Satya & Dwi Darma, dan pembiasaan kerapian kacu merah putih.',
        'Latihan ketangkasan dasar kepramukaan siaga, permainan kekompakan Barung warna, dan dongeng budi pekerti kepanduan.',
        'Pengenalan simpul praktis siaga (simpul mati & hidup) serta permainan edukatif ketangkasan panca indera.',
        'Upacara penutupan perindukan, evaluasi ketertiban barisan Barung warna, dan doa bersama Yanda/Bunda.'
      ];
    }
    return [
      'Upacara pembukaan latihan formasi angkare, penghormatan bendera, pengucapan Tri Satya & Dasa Darma, serta PBB dasar sikap sempurna.',
      'Latihan PBB gerak berjalan (langkah tegap, balik kanan/kiri berbanjar) dan penanaman kedisiplinan regu penggalang.',
      'Keterampilan teknik kepramukaan (tali temali simpul pokok, ikatan palang tongkat, dan pengenalan sandi komunikasi lapangan).',
      'Pioneering aplikatif pembuatan tandu darurat regu, evaluasi kekompakan sanggar, dan apel penutupan latihan.'
    ];
  }

  // 2. Jika ada 1 agenda terjadwal di bulan ini: pecah 4 pekan dari modul tersebut
  if (agendas.length === 1) {
    const mod = findModuleForAgenda(agendas[0].kegiatan, isSiaga);
    if (mod) return [...mod.subtopics];
    const nama = agendas[0].kegiatan;
    return [
      `Pengenalan orientasi dan teori dasar materi: ${nama}.`,
      `Praktik drill keterampilan mandiri dan pendalaman materi: ${nama}.`,
      `Aplikasi terapan secara beregu/perindukan materi: ${nama}.`,
      `Evaluasi ketepatan capaian, unjuk kerja kelompok, dan refleksi: ${nama}.`
    ];
  }

  // 3. Jika ada 2 agenda terjadwal di bulan ini (kasus paling umum, e.g. Bulan April: Rutin PBB + Tekpram Tali Temali):
  //    Agenda 1 mengisi Minggu 1 & 2
  //    Agenda 2 mengisi Minggu 3 & 4
  if (agendas.length === 2) {
    const mod1 = findModuleForAgenda(agendas[0].kegiatan, isSiaga);
    const mod2 = findModuleForAgenda(agendas[1].kegiatan, isSiaga);

    const m1 = mod1 ? mod1.subtopics[0] : `Pendalaman materi awal: ${agendas[0].kegiatan}.`;
    const m2 = mod1 ? mod1.subtopics[1] : `Pemantapan praktik dan kekompakan regu: ${agendas[0].kegiatan}.`;
    const m3 = mod2 ? mod2.subtopics[0] : `Pengenalan dan latihan teknik: ${agendas[1].kegiatan}.`;
    const m4 = mod2 ? mod2.subtopics[1] : `Penerapan terapan dan evaluasi unjuk kerja: ${agendas[1].kegiatan}.`;

    return [m1, m2, m3, m4];
  }

  // 4. Jika ada 3 agenda terjadwal di bulan ini:
  //    Agenda 1 mengisi Minggu 1 & 2
  //    Agenda 2 mengisi Minggu 3
  //    Agenda 3 mengisi Minggu 4
  if (agendas.length === 3) {
    const mod1 = findModuleForAgenda(agendas[0].kegiatan, isSiaga);
    const mod2 = findModuleForAgenda(agendas[1].kegiatan, isSiaga);
    const mod3 = findModuleForAgenda(agendas[2].kegiatan, isSiaga);

    const m1 = mod1 ? mod1.subtopics[0] : `Latihan dasar materi: ${agendas[0].kegiatan}.`;
    const m2 = mod1 ? mod1.subtopics[1] : `Pendalaman praktik: ${agendas[0].kegiatan}.`;
    const m3 = mod2 ? mod2.subtopics[0] : `Latihan keterampilan: ${agendas[1].kegiatan}.`;
    const m4 = mod3 ? mod3.subtopics[0] : `Pelaksanaan dan evaluasi: ${agendas[2].kegiatan}.`;

    return [m1, m2, m3, m4];
  }

  // 5. Jika ada 4 atau lebih agenda terjadwal di bulan ini:
  //    Masing-masing agenda mengisi 1 minggu
  const mList: string[] = [];
  for (let i = 0; i < 4; i++) {
    const ag = agendas[i] || agendas[agendas.length - 1];
    const mod = findModuleForAgenda(ag.kegiatan, isSiaga);
    mList.push(mod ? mod.subtopics[0] : `Latihan terarah materi: ${ag.kegiatan}.`);
  }
  return [mList[0], mList[1], mList[2], mList[3]];
}

export interface ThematicMatrixRow {
  no: number;
  text: string;
  months: number[];
  keterangan?: string;
}

/**
 * Generator matriks distribusi 12 bulan (Januari - Desember) tematik untuk seluruh rumpun eskul.
 * Mengambil data kurikulum autentik dari bank data (Silat, Futsal, Bulutangkis, Qasidah, BTQ, Voli, Catur, Paskibra, Drumband, PMR, Taekwondo, dll).
 */
export function getThematicEskulProtaMatrix(eskul: MasterEskul): ThematicMatrixRow[] {
  // 1. Cek jika pengguna telah menyusun/menyimpan matriks kustom per eskul
  if (eskul.matriksProtaCustom && eskul.matriksProtaCustom.length > 0) {
    return eskul.matriksProtaCustom.map((m, idx) => ({
      no: idx + 1,
      text: m.text,
      months: m.months,
      keterangan: m.keterangan || (m.months.length === 12 ? 'Rutin' : 'Terjadwal')
    }));
  }

  // 2. Cek bank data kurikulum eskul
  const profile = findEskulProtaProfile(eskul.namaEskul, eskul.kategori);
  if (profile && profile.matriksTahunan && profile.matriksTahunan.length > 0) {
    return profile.matriksTahunan.map((m) => ({
      no: m.no,
      text: m.kegiatan,
      months: m.months,
      keterangan: m.keterangan
    }));
  }

  const name = (eskul.namaEskul || '').toLowerCase();
  const kategori = eskul.kategori || 'Olahraga';

  if (kategori === 'Olahraga' || name.includes('futsal') || name.includes('silat') || name.includes('bola') || name.includes('badminton') || name.includes('renang') || name.includes('voli') || name.includes('taekwondo') || name.includes('karate')) {
    return [
      { no: 1, text: 'Penerimaan Anggota & Pengenalan Aturan Disiplin Olahraga', months: [7, 8], keterangan: 'Awal TA' },
      { no: 2, text: 'Pengondisian Fisik Dasar, Kelenturan & Ketahanan Kardio', months: [7, 8, 9], keterangan: 'Kebugaran' },
      { no: 3, text: 'Latihan Rutin Penguasaan Teknik Dasar & Olah Gerak Spesifik', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, text: 'Pendalaman Taktik, Koordinasi Formasi Tim & Transisi Lapangan', months: [9, 10, 11, 1, 2, 3], keterangan: 'Taktik' },
      { no: 5, text: 'Simulasi Pertandingan Internal (Internal Game / Sparring Partner)', months: [10, 12, 3, 5], keterangan: 'Sparring' },
      { no: 6, text: 'Uji Coba Tanding (Friendly Match) Antar-Sekolah Mitra', months: [11, 4], keterangan: 'Uji Coba' },
      { no: 7, text: 'Persiapan & Keikutsertaan Ajang Kompetisi Resmi Pelajar / O2SN', months: [10, 2, 5], keterangan: 'Turnamen' },
      { no: 8, text: 'Evaluasi Capaian Atlet, Tes Kebugaran Akhir & Penutupan Semester', months: [6, 12], keterangan: 'Evaluasi' },
    ];
  }

  if (kategori === 'Seni & Budaya' || name.includes('tari') || name.includes('musik') || name.includes('angklung') || name.includes('paduan') || name.includes('lukis') || name.includes('marching') || name.includes('karawitan') || name.includes('pianika')) {
    return [
      { no: 1, text: 'Registrasi Anggota & Pengenalan Karakteristik Seni Budaya', months: [7, 8], keterangan: 'Pengenalan' },
      { no: 2, text: 'Latihan Dasar Olah Tubuh / Olah Vokal & Pengenalan Tangga Nada/Irama', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, text: 'Latihan Rutin Penguasaan Repertoar & Ragam Gerak Pokok Mingguan', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, text: 'Pemantapan Pola Lantai, Harmonisasi Ensembel & Penjiwaan Karya', months: [9, 10, 11, 1, 2, 3], keterangan: 'Harmonisasi' },
      { no: 5, text: 'Gladi Internal & Simulasi Penampilan Mini di Hadapan Teman Sebaya', months: [10, 12, 3, 5], keterangan: 'Gladi' },
      { no: 6, text: 'Pentas Seni Sekolah & Pengisian Acara Peringatan Hari Besar Nasional', months: [11, 4], keterangan: 'Pentas' },
      { no: 7, text: 'Keikutsertaan Festival Seni Pelajar Resmi / FLS2N Tingkat Kecamatan & Kota', months: [10, 2, 5], keterangan: 'Festival' },
      { no: 8, text: 'Evaluasi Portofolio Penampilan, Rekaman Karya Seni & Apresiasi Akhir Tahun', months: [6, 12], keterangan: 'Evaluasi' },
    ];
  }

  // Standar Dinamis
  return [
    { no: 1, text: 'Pendaftaran & Orientasi Calon Anggota Baru', months: [7, 8], keterangan: 'Orientasi' },
    { no: 2, text: 'Pengenalan Materi Dasar & Pembiasaan Karakter Disiplin', months: [7, 8, 9], keterangan: 'Dasar' },
    { no: 3, text: 'Latihan Rutin Mingguan Terjadwal Sesuai Silabus Kurikulum', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
    { no: 4, text: 'Pendalaman Keterampilan Lanjutan & Penguatan Kerja Sama Kelompok', months: [9, 10, 11, 1, 2, 3], keterangan: 'Lanjutan' },
    { no: 5, text: 'Uji Capaian Keterampilan Internal & Simulasi Lapangan', months: [10, 12, 3, 5], keterangan: 'Ujian' },
    { no: 6, text: 'Pementasan / Penampilan Kreativitas Siswa dalam Ajang Sekolah', months: [11, 4], keterangan: 'Pentas' },
    { no: 7, text: 'Partisipasi dalam Kegiatan & Lomba Resmi Tingkat Pelajar', months: [10, 2, 5], keterangan: 'Lomba' },
    { no: 8, text: 'Evaluasi Perkembangan Anggota & Laporan Pertanggungjawaban Tahunan', months: [6, 12], keterangan: 'Evaluasi' },
  ];
}

/**
 * GENERATOR MATERI MINGGUAN UNIVERSAL TERHUBUNG DENGAN PROTA
 * Berlaku untuk SELURUH Ekstrakurikuler:
 * Pramuka, Silat, Futsal, Bulutangkis, Qasidah, BTQ, Voli, Catur, Paskibra, Drumband, PMR, Taekwondo, dll.
 * Menjamin materi mingguan (Minggu 1 s.d. 4) 100% sinkron dan dependensi langsung dengan agenda bulan di PROTA.
 */
export function generateWeeklyMateriForAnyEskul(
  monthIndex: number,
  eskul: MasterEskul,
  isSiaga: boolean = false,
  config?: PramukaHeaderConfig
): [string, string, string, string] {
  const monthNum = monthIndex + 1; // 1 = Jan, 12 = Des

  // 1. JIKA ADA MATRIKS PROTA CUSTOM (DARI FORM / GENERATE AI USER)
  // Sinkronkan 100% dengan centang bulan yang dipilih user
  if (Array.isArray(eskul.matriksProtaCustom) && eskul.matriksProtaCustom.length > 0) {
    const activeItems = eskul.matriksProtaCustom
      .filter((m) => (m.text || '').trim().length > 0 && Array.isArray(m.months) && m.months.includes(monthNum))
      .map((m) => m.text.trim());

    if (activeItems.length > 0) {
      if (activeItems.length === 1) {
        const item = activeItems[0];
        return [
          `Pengenalan konsep, pemanasan fisik dan teori dasar materi: ${item}.`,
          `Praktik drill teknik bertahap & pengondisian fisik: ${item}.`,
          `Penerapan simulasi terapan dan koordinasi tim: ${item}.`,
          `Evaluasi ketuntasan kompetensi & uji unjuk kerja: ${item}.`
        ];
      }
      if (activeItems.length === 2) {
        return [
          `Pengenalan konsep & materi dasar: ${activeItems[0]}.`,
          `Praktik drill & pendalaman teknik: ${activeItems[0]}.`,
          `Latihan praktik materi: ${activeItems[1]}.`,
          `Simulasi terapan & evaluasi unjuk kerja terpadu: ${activeItems[1]}.`
        ];
      }
      if (activeItems.length === 3) {
        return [
          `Latihan dan pemantapan materi: ${activeItems[0]}.`,
          `Latihan dan praktik materi: ${activeItems[1]}.`,
          `Latihan dan simulasi materi: ${activeItems[2]}.`,
          `Evaluasi komprehensif capaian unjuk kerja: ${activeItems[0]}, ${activeItems[1]}, dan ${activeItems[2]}.`
        ];
      }
      // >= 4 item aktif pada bulan ini
      return [
        `Latihan dan penguasaan materi: ${activeItems[0]}.`,
        `Latihan dan pendalaman materi: ${activeItems[1]}.`,
        `Latihan dan pemantapan teknik: ${activeItems[2]}.`,
        `Latihan simulasi terapan & evaluasi capaian: ${activeItems[3] || activeItems[0]}.`
      ];
    }
  }

  const isPramuka = (eskul.namaEskul || '').toLowerCase().includes('pramuka') || eskul.kategori === 'Kepanduan';

  // 2. Kasus Pramuka (Siaga / Penggalang) - jika tidak ada matriks custom
  if (isPramuka) {
    return generateWeeklyMateriFromProta(monthIndex, isSiaga, eskul, config);
  }

  // 3. Cek apakah ada di bank data kurikulum eskul (Pencak Silat, Futsal, Bulutangkis, Qasidah, BTQ, Voli, Catur, Paskibra, Drumband, PMR, Taekwondo)
  const profile = findEskulProtaProfile(eskul.namaEskul, eskul.kategori);
  if (profile && profile.kurikulum12Bulan && profile.kurikulum12Bulan[monthIndex]) {
    const monthData = profile.kurikulum12Bulan[monthIndex];
    if (monthData.materiMinggu && monthData.materiMinggu.length === 4) {
      return [...monthData.materiMinggu] as [string, string, string, string];
    }
  }

  // 4. Fallback jika ada kata kunci khusus di master eskul
  const keywords = eskul.tujuanTahunanKeywords ? eskul.tujuanTahunanKeywords.split(',').map((k) => k.trim()).filter(Boolean) : [];
  const nama = eskul.namaEskul || 'Ekstrakurikuler';

  if (keywords.length > 0) {
    const kw = keywords[monthIndex % keywords.length] || keywords[0];
    return [
      `Pengenalan, teori dasar dan pemanasan terarah materi: ${kw} (${nama}).`,
      `Praktik drill keterampilan bertahap dan koordinasi tim: ${kw}.`,
      `Penerapan simulasi terapan dan uji coba penguasaan teknik: ${kw}.`,
      `Evaluasi ketuntasan unjuk kerja, refleksi kelompok, dan apresiasi materi: ${kw}.`
    ];
  }

  // 5. Default dinamis berbasis nama eskul
  return [
    `Pemanasan fisik terarah, pengenalan konsep dan teknik dasar latihan ${nama}.`,
    `Pendalaman materi teknik lanjutan dan pembiasaan koordinasi gerak/keterampilan ${nama}.`,
    `Aplikasi terapan simulasi permainan/penampilan kelompok menguji ketangkasan peserta ${nama}.`,
    `Evaluasi unjuk kerja mingguan, pembinaan kedisiplinan dan apresiasi capaian peserta didik ${nama}.`
  ];
}

/**
 * GENERATOR AI MATRIKS PROGRAM KERJA TAHUNAN (PROTA) 12 BULAN
 * Berbasis input nama eskul (sebagai basic prompt) dan kategori.
 * Menjamin jika ada N baris (misal 9, 10, atau berapapun field baru yang ditambahkan user),
 * seluruh N baris ter-generate ulang dengan variasi dan centang bulan yang dinamis tanpa menghilangkan baris baru.
 */
export function generateDynamicProtaMatrix(
  eskulName: string,
  kategori?: string,
  targetCount: number = 9,
  variationSeed: number = 0
): { text: string; months: number[]; keterangan: string }[] {
  const cleanName = (eskulName || 'Ekstrakurikuler').trim();
  const profile = findEskulProtaProfile(cleanName, kategori);

  let baseList: { text: string; months: number[]; keterangan: string }[] = [];

  if (profile && profile.matriksTahunan && profile.matriksTahunan.length > 0) {
    baseList = profile.matriksTahunan.map((m) => ({
      text: m.kegiatan,
      months: [...m.months],
      keterangan: m.keterangan || (m.months.length === 12 ? 'Rutin' : 'Terjadwal')
    }));
  } else {
    // Fallback template terpadu berbasis nama & kategori
    baseList = [
      { text: `Penerimaan & Orientasi Anggota Baru Ekstrakurikuler ${cleanName}`, months: [7, 8], keterangan: 'Orientasi' },
      { text: `Pengondisian Fisik Dasar & Pembentukan Karakter Disiplin ${cleanName}`, months: [7, 8, 9], keterangan: 'Fisik' },
      { text: `Latihan Rutin Mingguan & Penguasaan Materi Pokok ${cleanName}`, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { text: `Pendalaman Keterampilan Lanjutan & Koordinasi Regu ${cleanName}`, months: [9, 10, 11, 1, 2, 3], keterangan: 'Teknik' },
      { text: `Simulasi Unjuk Kebolehan / Latihan Tanding Internal ${cleanName}`, months: [10, 12, 3, 5], keterangan: 'Simulasi' },
      { text: `Uji Coba Bersama Mitra / Penampilan Pentas Unjuk Gelar Sekolah`, months: [11, 4], keterangan: 'Pentas' },
      { text: `Persiapan & Keikutsertaan Ajang Perlombaan / Festival Pelajar Resmi`, months: [10, 2, 5], keterangan: 'Lomba' },
      { text: `Ujian Kenaikan Tingkat / Sertifikasi & Pengujian Kompetensi Siswa`, months: [11, 5], keterangan: 'Ujian' },
      { text: `Evaluasi Capaian Pembinaan, Tes Kebugaran & Rekapitulasi Tahunan`, months: [6, 12], keterangan: 'Evaluasi' }
    ];
  }

  // Bank kegiatan suplemen jika user menambah baris (targetCount > baseList.length)
  const poolSuplemen: { text: string; months: number[]; keterangan: string }[] = [
    { text: `Workshop & Pembekalan Khusus Bersama Instruktur / Narasumber Tamu ${cleanName}`, months: [9, 2], keterangan: 'Workshop' },
    { text: `Kegiatan Bakti Sosial, Pengabdian Lingkungan & Aksi Peduli ${cleanName}`, months: [10, 3], keterangan: 'Baksos' },
    { text: `Pentas Unjuk Gelar Kreativitas & Pameran Karya Akhir Semester`, months: [12, 6], keterangan: 'Showcase' },
    { text: `Pemusatan Latihan Intensif (Training Center) Menjelang Kejuaraan Resmi`, months: [1, 2, 8], keterangan: 'Intensif' },
    { text: `Latihan Gabungan & Studi Komparasi Antar-Gugus / Sekolah Mitra`, months: [11, 4], keterangan: 'Latgab' },
    { text: `Perekrutan Calon Pengurus Inti & Pelatihan Kepemimpinan Kader Muda`, months: [7, 1], keterangan: 'Kaderisasi' },
    { text: `Pemberian Apresiasi / Awarding Night Siswa Berprestasi & Refleksi Tahunan`, months: [6, 12], keterangan: 'Apresiasi' },
    { text: `Pemeriksaan, Inventarisasi & Pemeliharaan Berkala Sarana Prasarana Latihan`, months: [7, 10, 1, 4], keterangan: 'Inventaris' }
  ];

  // Variasi frasa dinamis ketika tombol AI diklik berulang kali
  const prefixes = [
    '',
    'Pemantapan Terpadu: ',
    'Program Unggulan: ',
    'Penguatan Intensif: ',
    'Akselerasi Kompetensi: '
  ];
  const prefix = prefixes[variationSeed % prefixes.length];

  const result: { text: string; months: number[]; keterangan: string }[] = [];

  for (let i = 0; i < targetCount; i++) {
    if (i < baseList.length) {
      const item = baseList[i];
      let newText = item.text;
      if (prefix && !newText.startsWith(prefix)) {
        newText = `${prefix}${newText}`;
      }
      result.push({
        text: newText,
        months: [...item.months],
        keterangan: item.keterangan
      });
    } else {
      const supIdx = (i - baseList.length) % poolSuplemen.length;
      const sup = poolSuplemen[supIdx];
      result.push({
        text: prefix ? `${prefix}${sup.text}` : sup.text,
        months: [...sup.months],
        keterangan: sup.keterangan
      });
    }
  }

  return result;
}

