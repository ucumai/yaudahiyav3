/**
 * Bank Data Kurikulum Program Tahunan (PROTA) & Silabus Mingguan 12 Bulan Terpadu
 * untuk Seluruh Ekstrakurikuler Sekolah Dasar / Menengah:
 * 1. Pencak Silat
 * 2. Futsal & Sepak Bola
 * 3. Bulutangkis (Badminton)
 * 4. Qasidah / Rebana / Marawis
 * 5. BTQ & Tahfidz Al-Qur'an
 * 6. Bola Voli
 * 7. Pramuka (Siaga & Penggalang)
 * 8. Catur (Chess)
 * 9. Paskibra (Pasukan Pengibar Bendera)
 * 10. Drumband / Marching Band
 * 11. PMR (Palang Merah Remaja) & UKS
 * 12. Taekwondo
 */

export interface EskulMonthlyCurriculum {
  monthIndex: number; // 0 = Jan, 11 = Des
  monthName: string;
  fokusBulanan: string;
  materiMinggu: [string, string, string, string];
}

export interface EskulProtaProfile {
  id: string;
  namaStandard: string;
  aliases: string[];
  kategori: 'Olahraga' | 'Seni & Budaya' | 'Keagamaan' | 'Akademik' | 'Kepanduan' | 'Lainnya';
  deskripsiProgram: string;
  targetCapaian: string;
  sasaranPrestasi: string[];
  matriksTahunan: {
    no: number;
    kegiatan: string;
    months: number[]; // 1 - 12
    keterangan: string;
  }[];
  kurikulum12Bulan: EskulMonthlyCurriculum[];
}

export const ALL_ESKUL_PROTA_PROFILES: Record<string, EskulProtaProfile> = {
  // =========================================================================
  // 1. PENCAK SILAT
  // =========================================================================
  pencak_silat: {
    id: 'pencak_silat',
    namaStandard: 'Pencak Silat',
    aliases: ['silat', 'pencak', 'ipsi', 'tapak suci', 'merpati putih', 'psht', 'perisai diri'],
    kategori: 'Olahraga',
    deskripsiProgram:
      'Membina karakter berbudi pekerti luhur, ketangkasan beladiri warisan nusantara, kedisiplinan fisik, dan kesiapan bertanding pada ajang O2SN dan kejuaraan resmi IPSI.',
    targetCapaian:
      'Peserta menguasai kuda-kuda dasar, pukulan, tendangan, tangkisan, jurus tunggal baku IPSI, serta siap mengikuti turnamen tingkat kecamatan, kabupaten/kota, dan O2SN.',
    sasaranPrestasi: [
      'Penguasaan 8 arah mata angin kuda-kuda dan pola langkah baku',
      'Penguasaan Jurus Tunggal Baku IPSI kategori tangan kosong dan senjata',
      'Pembentukan refleks tangkisan, bantingan, dan kuncian beladiri praktis',
      'Meraih medali dalam ajang O2SN dan Kejuaraan Pencak Silat Pelajar'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Pendaftaran, Seleksi Fisik & Penanaman Adab Pesilat', months: [7, 8], keterangan: 'Awal TA' },
      { no: 2, kegiatan: 'Pembinaan Fisik Dasar, Kelenturan & Kuda-Kuda Pokok', months: [7, 8, 9], keterangan: 'Kebugaran' },
      { no: 3, kegiatan: 'Latihan Rutin Teknik Pukulan, Tendangan & Tangkisan', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Jurus Tunggal Baku IPSI & Pola Langkah', months: [9, 10, 11, 1, 2, 3], keterangan: 'Koreografi' },
      { no: 5, kegiatan: 'Simulasi Sambung / Sparring Tanding Menggunakan Body Protector', months: [10, 12, 3, 5], keterangan: 'Tanding' },
      { no: 6, kegiatan: 'Uji Kenaikan Tingkat Sabuk & Evaluasi Jurus Siswa', months: [11, 4], keterangan: 'Ujian' },
      { no: 7, kegiatan: 'Keikutsertaan Ajang O2SN & Turnamen Silat Antar-Pelajar', months: [10, 2, 5], keterangan: 'Kompetisi' },
      { no: 8, kegiatan: 'Evaluasi Tahunan, Rekapitulasi Prestasi & Apresiasi Pesilat', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Pemantapan Sikap Pasang & Kuda-Kuda 8 Arah Mata Angin',
        materiMinggu: [
          'Penguatan kuda-kuda dasar (depan, belakang, tengah, samping, silang) dan olah pernapasan.',
          'Latihan variasi pukulan lurus, bandul, tebak, dan sodok berpasangan melatih ketepatan sasaran.',
          'Drill tangkisan atas, bawah, luar, dalam dipadukan dengan elakan samping.',
          'Pola langkah lurus, gergaji (zig-zag), dan ladam berirama dipandu komando pelatih.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Variasi Tendangan, Tangkisan & Kecepatan Reaksi',
        materiMinggu: [
          'Latihan tendangan lurus (A), tendangan sabit (C), dan tendangan samping (T) pada target sasaran peching pad.',
          'Kombinasi tangkisan luar dilanjutkan serangan balasan pukulan tebak dan tendangan sabit cepat.',
          'Teknik hindaran dan elakan hadap/mundur menghindari serangan tendangan beruntun.',
          'Simulasi serangan-belaan berpasangan melatih refleks visual dan ketepatan jarak jangkau.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Pendalaman Jurus Tunggal Baku IPSI (Bagian Tangan Kosong)',
        materiMinggu: [
          'Hafalan dan pemantapan gerak 1 s.d. 3 Jurus Tunggal Baku IPSI kategori tangan kosong.',
          'Pendalaman gerak 4 s.d. 7 Jurus Tunggal: transisi kuda-kuda rendah dan ketegasan pandangan mata.',
          'Rangkaian gerak utuh tangan kosong 100 detik dengan penghayatan tenaga dan ketukan irama.',
          'Uji peragaan jurus tunggal perorangan di hadapan tim penguji dan evaluasi kebenaran gerak.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Teknik Bantingan, Kuncian & Jatuhan Selamat',
        materiMinggu: [
          'Pengenalan teknik jatuhan depan, belakang, dan samping yang aman untuk meminimalkan cedera.',
          'Teknik tangkapan tendangan kaki lawan dan sapuan rebah bawah merobohkan lawan.',
          'Latihan bantingan pinggang dan serokan kaki dengan teknik keselamatan matras.',
          'Simulasi pertahanan diri melepaskan diri dari kuncian pergelangan tangan dan pelukan.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Persiapan Kejuaraan O2SN & Simulasi Tanding Lengkap',
        materiMinggu: [
          'Sosialisasi aturan tanding IPSI terbaru: poin pukulan (1), tendangan (2), dan bantingan sah (3).',
          'Simulasi tanding 2 babak menggunakan body protector, pelindung kaki, dan kacamata wasit juri.',
          'Drill strategi menjaga jarak (in-out) dan mencuri poin tendangan sabit di akhir detik babak.',
          'Uji tanding internal dan evaluasi stamina fisik pesilat jelang seleksi O2SN.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Uji Kenaikan Tingkat Sabuk & Evaluasi Semester Genap',
        materiMinggu: [
          'Pengujian fisik ketahanan: push-up, sit-up, lari kelincahan shuttle run, dan kelenturan.',
          'Ujian peragaan jurus baku dan rangkaian teknik serang-bela wajib kenaikan tingkat.',
          'Uji mental spiritual kejuaraan, tata krama pesilat, dan adab hormat kepada sesama.',
          'Upacara tradisi penyematan sabuk baru, pembagian sertifikat, dan refleksi semester genap.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Penerimaan Anggota Baru & Pengenalan Filosofi Silat',
        materiMinggu: [
          'Demonstrasi atraksi beladiri silat penyambutan siswa baru dan perkenalan jajaran pelatih.',
          'Sosialisasi janji pesilat, adab perguruan, penghormatan IPSI, dan penataan seragam sakral.',
          'Latihan peregangan sendi, olah napas dasar, dan pembentukan postur tegap pesilat.',
          'Pengenalan kuda-kuda dasar tengah dan depan secara serentak bagi anggota pemula.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'PBB Silat, Kerapian Seragam & Semangat Kemerdekaan',
        materiMinggu: [
          'Latihan baris-berbaris pesilat, kesigapan sikap sempurna, dan penghormatan bendera merah putih.',
          'Latihan peragaan seni silat beregu untuk persiapan demonstrasi perayaan HUT RI di sekolah.',
          'Partisipasi penampilan seni beladiri kolosal pada puncak peringatan Hari Kemerdekaan.',
          'Evaluasi kerapian seragam, ketertiban absensi, dan pembentukan kelompok regu latihan.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Pengasahan Pukulan Kombinasi & Kecepatan Kaki',
        materiMinggu: [
          'Latihan kombinasi pukulan lurus ganda (jab-straight) disusul tendangan lurus cepat.',
          'Latihan kelincahan langkah segitiga dan gerak tipu melangkah untuk membuka ruang serangan.',
          'Drill tangkis tepis bawah dilanjutkan serangan lutut (dengkul) dan sodok dada.',
          'Uji ketahanan fisik pernapasan dan kelenturan split otot paha.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Pendalaman Jurus Senjata (Golok / Toya Bertongkat)',
        materiMinggu: [
          'Pengenalan senjata seni tradisi IPSI: keamanan toya rotan dan karakteristik golok tumpul.',
          'Gerak dasar pegangan toya (tongkat silat), putaran baling-baling, dan tusukan dua arah.',
          'Rangkaian gerak jurus toya baku IPSI nomor 1 s.d. 5 melatih koordinasi tangan dan mata.',
          'Simulasi peragaan seni tunggal senjata diiringi musik kendang pencak tradisional.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Try Out Tanding Antar-Perguruan & Mental Juara',
        materiMinggu: [
          'Latihan taktik serangan balik (counter-attack) memanfaatkan momentum serangan lawan yang meleset.',
          'Simulasi tanding sistem gugur dengan pengawasan wasit juri bersertifikat IPSI.',
          'Drill relaksasi mental tanding, manajemen nafas saat tertekan, dan sportivitas arena.',
          'Evaluasi catatan taktik per pesilat dan pemantapan teknik andalan masing-masing atlet.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Rekapitulasi Prestasi Tahunan & Penutupan Akhir Tahun',
        materiMinggu: [
          'Evaluasi performa latihan satu tahun penuh dan tes pengukuran kebugaran atlet penutup tahun.',
          'Pentas peragaan seni silat internal sekolah menampilkan seluruh tingkatan sabuk.',
          'Pemberian penghargaan kepada atlet terdisiplin dan pesilat paling berprestasi tahun ini.',
          'Pembersihan sanggar latihan, penyimpanan matras, dan doa bersama menyambut tahun baru.'
        ]
      }
    ]
  },

  // =========================================================================
  // 2. FUTSAL & SEPAK BOLA
  // =========================================================================
  futsal: {
    id: 'futsal',
    namaStandard: 'Futsal',
    aliases: ['futsal', 'sepak bola', 'soccer', 'football', 'mini soccer'],
    kategori: 'Olahraga',
    deskripsiProgram:
      'Membina keterampilan mengolah bola, taktik bermain cepat di lapangan terbatas, sportivitas tim, dan kesiapan mengikuti turnamen futsal pelajar antar-sekolah serta O2SN.',
    targetCapaian:
      'Siswa menguasai dasar passing sol sepatu, controlling, dribbling, shooting, formasi diamond 1-2-1, transisi cepat, dan menjuarai kejuaraan futsal tingkat kecamatan/kota.',
    sasaranPrestasi: [
      'Akurasi passing mendatar dan kontrol telapak kaki (sole control) di atas 85%',
      'Pemahaman formasi dasar Diamond (1-2-1) dan sistem pertahanan man-to-man',
      'Peningkatan daya tahan kardio dan kelincahan gerak tanpa bola (agility)',
      'Meraih trofi juara dalam turnamen futsal pelajar tingkat kecamatan dan kota'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Pendaftaran, Seleksi Pemain & Tes Fisik VO2Max Awal', months: [7, 8], keterangan: 'Seleksi' },
      { no: 2, kegiatan: 'Fundamental Ball Mastery, Kontrol Sol & Passing Akurat', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan Taktik, Dribbling & Shooting', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Formasi Diamond (1-2-1) & Rotasi Transisi', months: [9, 10, 11, 1, 2, 3], keterangan: 'Taktik' },
      { no: 5, kegiatan: 'Simulasi Internal Game (Sparring Kelas A vs Kelas B)', months: [10, 12, 3, 5], keterangan: 'Sparring' },
      { no: 6, kegiatan: 'Uji Coba Tanding (Friendly Match) Melawan Tim SD Mitra', months: [11, 4], keterangan: 'Uji Coba' },
      { no: 7, kegiatan: 'Keikutsertaan Turnamen Futsal Pelajar Resmi & O2SN', months: [10, 2, 5], keterangan: 'Turnamen' },
      { no: 8, kegiatan: 'Evaluasi Statistik Pemain & Rekapitulasi Capaian Akhir Tahun', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Passing Akurat & Kontrol Sol Sepatu (Sole Control)',
        materiMinggu: [
          'Drill passing mendatar pendek menggunakan kaki bagian dalam dengan target cone berjarak 5 meter.',
          'Teknik controlling menggunakan telapak sepatu (sole) untuk menghentikan laju bola futsal yang cepat.',
          'Latihan rondo (kucing-kucingan 4 vs 1) melatih kecepatan operan dan pergerakan membuka ruang.',
          'Mini game 3 vs 3 dua sentuhan (two touches only) melatih kecepatan berpikir dan operan cepat.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Dribbling Kelincahan & Shooting Terarah (Kicking Power)',
        materiMinggu: [
          'Dribbling zig-zag melewati deretan cone menggunakan kaki kanan dan kiri secara bergantian.',
          'Teknik shooting mendatar keras ke sudut bawah gawang menggunakan punggung kaki kura-kura.',
          'Kombinasi wall-pass (satu-dua) dilanjutkan eksekusi tembakan keras ke tiang jauh.',
          'Latihan tendangan bola mati (kick-in) dan eksekusi tendangan penalti melatih ketenangan mental.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Taktik Formasi Diamond 1-2-1 & Peran Anchor, Flank, Pivot',
        materiMinggu: [
          'Pengenalan posisi dan tanggung jawab pemain: Anchor (bertahan), Flank (sayap), dan Pivot (ujung tombak).',
          'Drill rotasi formasi Diamond: pergerakan Flank menusuk ke depan saat Anchor mengalirkan bola.',
          'Teknik pemain Pivot menahan bola dengan membelakangi gawang lawan dan membagi bola ke Flank.',
          'Simulasi permainan 5 vs 5 menerapkan skema rotasi Diamond dengan bimbingan pelatih di pinggir lapangan.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Teknik Penjaga Gawang (Goalkeeping) & Transisi Bertahan',
        materiMinggu: [
          'Teknik dasar kiper futsal: split save, blokade X, dan positioning mempersempit sudut tembak lawan.',
          'Lemparan akurat kiper untuk melancarkan serangan balik kilat (fast break counter attack).',
          'Transisi bertahan cepat saat kehilangan bola: prinsip menunda serangan lawan (delaying) dan man marking.',
          'Simulasi situasi serangan balik 3 lawan 2 dan 2 lawan 1 menguji kesiapan kiper dan anchor.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Set-Piece Bola Mati, Power Play & Persiapan Kejuaraan',
        materiMinggu: [
          'Variasi tendangan sudut (corner kick set-piece) mengarahkan bola ke tiang dua untuk sontekan tap-in.',
          'Skema lemparan ke dalam (kick-in variation) mengecoh tembok pertahanan lawan.',
          'Pengenalan strategi Power Play (5 pemain menyerang) saat tim membutuhkan gol di menit akhir.',
          'Simulasi tanding 2 x 15 menit menggunakan papan skor resmi dan evaluasi catatan taktik.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Turnamen Internal Antar-Kelas & Evaluasi Semester Genap',
        materiMinggu: [
          'Pengundian grup dan pertandingan babak penyisihan turnamen futsal internal sekolah.',
          'Babak semifinal dan perebutan juara 3 turnamen internal menjunjung tinggi nilai sportivitas.',
          'Partai final turnamen futsal sekolah, penyerahan trofi pencetak gol terbanyak (top scorer) dan tim terbaik.',
          'Evaluasi kebugaran pemain, tes kelincahan T-test, dan pembagian lembar evaluasi kemampuan bermain.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Penerimaan Anggota Baru & Pengenalan Lapangan Futsal',
        materiMinggu: [
          'Sosialisasi jadwal latihan, tata tertib pemakaian sepatu futsal sol karet, dan perlengkapan deker.',
          'Tes keterampilan dasar: menggiring bola lurus, menendang ke sasaran, dan kelincahan lari sprint.',
          'Pengenalan ukuran lapangan, garis out, area penalti kiper, dan aturan 4 detik kick-in futsal.',
          'Permainan ceria pengenalan bola (ball feeling) melatih sentuhan pertama yang lembut.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Fisik Ketahanan Kardio & Semangat Kebersamaan Tim',
        materiMinggu: [
          'Latihan interval training lari bolak-balik (beep test mini) membangun stamina paru-paru dan jantung.',
          'Latihan kelincahan tangga agility ladder: gerakan in-out, icky shuffle, dan hopscotch cepat.',
          'Lomba adu ketangkasan menggiring bola estafet antartim memeriahkan HUT Kemerdekaan RI.',
          'Peregangan otot komprehensif, edukasi hidrasi yang tepat bagi atlet cilik, dan evaluasi tim.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Passing Kombinasi Kecepatan Tinggi & Overlapping Flank',
        materiMinggu: [
          'Latihan passing kombinasi 3 pemain (triangular passing) bergerak tanpa henti.',
          'Gerakan overlapping Flank menyisir sisi luar lapangan untuk menerima umpan terobosan.',
          'Teknik shooting first-time (tendangan langsung tanpa kontrol) menyambar bola liar.',
          'Simulasi game setengah lapangan fokus pada penyelesaian akhir (finishing touch).'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Zonal Defense & Pressing Ketat di Daerah Lawan',
        materiMinggu: [
          'Latihan high pressing bersama-sama saat lawan menguasai bola di daerah pertahanan mereka.',
          'Teknik bertahan zona (zonal marking) menutup celah tengah lapangan agar lawan terdesak ke pinggir.',
          'Komunikasi antarpemain di lapangan: instruksi suara anchor memandu arah pergeseran tim.',
          'Simulasi tanding 5 vs 5 menerapkan pressing ketat sepanjang babak pertama.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Pertandingan Uji Coba (Friendly Match) & Taktik Pertandingan',
        materiMinggu: [
          'Pertandingan uji coba persahabatan tandang ke lapangan sekolah mitra tingkat kecamatan.',
          'Evaluasi video rekaman pertandingan uji coba: menganalisis kesalahan penempatan posisi pemain.',
          'Pembenahan transisi bertahan saat lawan melakukan serangan balik cepat.',
          'Pertandingan uji coba kandang leg kedua dan penguatan chemistry antarlini tim.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Apresiasi Tim, Evaluasi Tahunan & Perawatan Peralatan',
        materiMinggu: [
          'Rekapitulasi catatan gol, assist, dan persentase kehadiran latihan pemain selama satu tahun.',
          'Pemberian piagam penghargaan pemain paling berkembang dan atlet paling disiplin.',
          'Kerja bakti membersihkan bola futsal, merapikan gawang, dan mendata kelengkapan rompi tim.',
          'Pertandingan hiburan persahabatan antara tim futsal siswa melawan tim gabungan guru sekolah.'
        ]
      }
    ]
  },

  // =========================================================================
  // 3. BULUTANGKIS (BADMINTON)
  // =========================================================================
  bulutangkis: {
    id: 'bulutangkis',
    namaStandard: 'Bulutangkis',
    aliases: ['bulutangkis', 'badminton', 'bulu tangkis', 'raket'],
    kategori: 'Olahraga',
    deskripsiProgram:
      'Mengembangkan teknik pegangan raket, kelincahan footwork 6 sudut lapangan, variasi pukulan kok presisi, serta mental juara dalam turnamen O2SN bulutangkis.',
    targetCapaian:
      'Siswa menguasai servis pendek/panjang, lob tinggi, smash keras, dropshot halus, netting tipis, dan siap bertanding dalam nomor tunggal maupun ganda pelajar.',
    sasaranPrestasi: [
      'Penguasaan Forehand Grip dan Backhand Grip secara otomatis dan luwes',
      'Kelincahan Footwork 6 titik sudut lapangan kembali ke posisi tengah (base position)',
      'Akurasi penempatan kok pada pukulan lob serang dan dropshot menyilang',
      'Meraih juara pada ajang O2SN Bulutangkis tunggal putra/putri'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Pendaftaran, Seleksi Bakat & Pemeriksaan Kondisi Raket', months: [7, 8], keterangan: 'Seleksi' },
      { no: 2, kegiatan: 'Pengenalan Grip Dasar (Forehand/Backhand) & Shadow Footwork', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Servis, Lob, Netting, Dropshot & Smash', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Pola Pukulan Relli & Penempatan Sudut Kok', months: [9, 10, 11, 1, 2, 3], keterangan: 'Relli' },
      { no: 5, kegiatan: 'Simulasi Pertandingan Internal Tunggal (Single Match)', months: [10, 12, 3, 5], keterangan: 'Single' },
      { no: 6, kegiatan: 'Latihan Taktik Nomor Ganda (Double Rotation & Front-Back)', months: [11, 4], keterangan: 'Ganda' },
      { no: 7, kegiatan: 'Keikutsertaan Ajang O2SN & Turnamen Bulutangkis Pelajar', months: [10, 2, 5], keterangan: 'Kompetisi' },
      { no: 8, kegiatan: 'Evaluasi Tahunan Akurasi Pukulan & Rekapitulasi Prestasi', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Pegangan Raket (Grip) & Footwork Dasar 6 Titik Sudut',
        materiMinggu: [
          'Teknik Forehand grip (jabat tangan) dan Backhand grip (ibu jari menopang sisi raket pipih).',
          'Latihan memukul kok melambung sendiri secara berulang (juggling shuttlecock) melatih feeling.',
          'Shadow badminton footwork 2 langkah ke depan sudut kanan dan kiri menjangkau netting.',
          'Latihan kelincahan langkah mundur ke sudut belakang dan segera melangkah kembali ke titik tengah.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Akurasi Servis Pendek & Servis Panjang Melambung',
        materiMinggu: [
          'Teknik servis pendek backhand tipis di atas bibir net dengan sasaran garis depan lapangan.',
          'Teknik servis panjang forehand melambung tinggi ke garis belakang lapangan nomor tunggal.',
          'Drill servis berulang kali ke dalam target kardus sasaran melatih konsistensi arah kok.',
          'Simulasi servis dan penerimaan servis (return of serve) langsung menekan lawan.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Pukulan Lob Tinggi (Clear) & Dropshot Menyilang',
        materiMinggu: [
          'Teknik pukulan Overhead Lob dari baseline belakang melambung jauh ke baseline belakang lawan.',
          'Latihan pukulan Dropshot lurus mengecoh lawan dengan ayunan raket seperti melakukan smash.',
          'Variasi Dropshot menyilang (cross-court dropshot) tipis menjatuhkan kok di sudut depan net.',
          'Relli berpasangan: pemain A memukul lob tinggi, pemain B membalas dengan dropshot halus.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Teknik Permainan Netting Halus & Drive Cepat Mendatar',
        materiMinggu: [
          'Teknik menyentuh kok halus di bibir net (netting) agar kok bergulir tipis di atas pita net.',
          'Latihan memotong netting lawan dengan pukulan dorong silang (cross net shot).',
          'Pukulan Drive mendatar cepat sejajar net melatih kekuatan pergelangan tangan.',
          'Simulasi relli adu cepat di area depan lapangan menguji refleks pandangan mata.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Teknik Pukulan Smash Keras & Pertahanan (Defense)',
        materiMinggu: [
          'Latihan timing lompatan dan cambukan pergelangan tangan untuk pukulan Full Smash tajam menukik.',
          'Teknik mengembalikan smash lawan (defense return) mengangkat bola tinggi ke belakang atau mengarahkan ke net.',
          'Drill smash beruntun 3 kok berturut-turut melatih kekuatan bahu dan pernapasan.',
          'Simulasi pertandingan nomor tunggal sistem skor 21 poin reli poin BWF.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Turnamen Internal Tunggal & Uji Evaluasi Kebugaran',
        materiMinggu: [
          'Pengundian bagan pertandingan bulutangkis nomor tunggal putra dan putri internal sekolah.',
          'Babak penyisihan dan perempat final turnamen bulutangkis sekolah dipimpin wasit siswa.',
          'Babak semifinal dan final turnamen, penyerahan medali dan raket apresiasi bagi para juara.',
          'Tes kelincahan lari 6 titik lapangan dengan stopwatch dan evaluasi performa semester genap.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Penerimaan Anggota Baru & Pengenalan Lapangan',
        materiMinggu: [
          'Sosialisasi tata tertib pemakaian sepatu non-marking, jenis raket pemula, dan etika lapangan.',
          'Pengenalan garis batas lapangan untuk nomor tunggal (garis dalam) dan nomor ganda (garis luar).',
          'Latihan membiasakan pergelangan tangan luwes dengan mengayunkan raket membentuk angka 8.',
          'Permainan estafet membawa kok di atas daun raket melatih keseimbangan tangan.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Kekuatan Pergelangan Tangan & Agility Footwork Lincah',
        materiMinggu: [
          'Latihan skipping tali (lompat tali) 3 set x 100 putaran meningkatkan daya pegas pergelangan kaki.',
          'Latihan penguatan pergelangan tangan menggunakan raket berbeban (cover raket terpasang).',
          'Lomba ketangkasan juggling kok antartim merayakan peringatan kemerdekaan 17 Agustus.',
          'Peregangan otot lengan, bahu, paha, dan evaluasi ketahanan fisik anggota pemula.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Pola Relli Menyerang & Pukulan Underhand Lift',
        materiMinggu: [
          'Teknik mengangkat kok dari bawah bibir net ke pojok belakang lapangan (Underhand Clear/Lift).',
          'Pola serangan 3 pukulan: Servis pendek -> Menekan dengan drive -> Eksekusi smash ke sisi kosong.',
          'Latihan mengantisipasi arah pukulan lawan melalui pembacaan posisi badan lawan.',
          'Relli berpasangan mempertahankan kok melayang di udara tanpa jatuh minimal 20 pukulan berturut-turut.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Taktik Nomor Ganda (Double): Rotasi Depan-Belakang & Kiri-Kanan',
        materiMinggu: [
          'Pengenalan formasi ganda saat menyerang (Depan-Belakang) dan saat bertahan (Kiri-Kanan bersisian).',
          'Komunikasi antarpasangan ganda saat kok jatuh di area tengah lapangan.',
          'Drill servis ganda pendek menyasar sudut huruf T dan pengembalian drive agresif.',
          'Simulasi pertandingan nomor ganda 2 vs 2 melatih kekompakan dan rotasi posisi.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Simulasi Pertandingan Uji Coba & Manajemen Mental Bertanding',
        materiMinggu: [
          'Pertandingan persahabatan bulutangkis menghadapi tim sekolah dasar tetangga.',
          'Latihan mengelola ketenangan saat berada dalam kondisi skor kritis (setting poin 20-20).',
          'Drill pemulihan stamina cepat saat jeda interval poin 11 dan istirahat antargame.',
          'Evaluasi rekaman kelemahan footwork dan pembenahan arah pukulan kok yang sering keluar lapangan.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Apresiasi Atlet, Evaluasi Tahunan & Pemeliharaan Lapangan',
        materiMinggu: [
          'Tes akurasi penempatan kok ke dalam 4 kotak target lapangan penutup program tahunan.',
          'Pengumuman atlet bulutangkis terbaik tahun ajaran berjalan dan penyerahan piagam sekolah.',
          'Pemeriksaan dan pencatatan inventaris tiang net, tali net, dan penyimpanan sisa kok latihan.',
          'Pertandingan eksibisi ceria ganda campuran guru vs siswa dan doa syukur penutup tahun.'
        ]
      }
    ]
  },

  // =========================================================================
  // 4. QASIDAH / REBANA / MARAWIS
  // =========================================================================
  qasidah: {
    id: 'qasidah',
    namaStandard: 'Qasidah & Rebana',
    aliases: ['qasidah', 'rebana', 'marawis', 'hadroh', 'hadrah', 'sholawat', 'seni islami'],
    kategori: 'Seni & Budaya',
    deskripsiProgram:
      'Membina olah vokal lantunan sholawat nabi, penguasaan ketukan rebana hadroh (dasar, anakan, golb, kop), kekompakan harmonisasi irama, dan kesiapan tampil pada PHBI serta festival seni keagamaan.',
    targetCapaian:
      'Siswa menguasai teknik pukulan rebana terbang, backing vokal sholawat berirama, variasi kop-rol hadroh, serta mampu tampil percaya diri pada acara resmi sekolah dan festival.',
    sasaranPrestasi: [
      'Penguasaan ketukan pukulan rebana hadroh An-Nahdliyah (Banjari / Hadroh Klasik)',
      'Harmonisasi vokal utama (solois) dan koor (backing vokal) nada tinggi-rendah',
      'Kekompakan koreografi gerak rebana dan artikulasi syair sholawat',
      'Meraih juara dalam Festival Seni Qasidah & Hadroh Pelajar tingkat Kecamatan/Kabupaten'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Penerimaan Anggota Baru & Pengenalan Instrumen Rebana', months: [7, 8], keterangan: 'Pengenalan' },
      { no: 2, kegiatan: 'Latihan Dasar Pukulan Dung & Tak serta Olah Vokal Sholawat', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan Lagu Sholawat & Harmonisasi Rebana', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Variasi Pukulan Golb, Kop, Rol & Tam', months: [9, 10, 11, 1, 2, 3], keterangan: 'Variasi' },
      { no: 5, kegiatan: 'Pengisian Penampilan Acara PHBI (Maulid, Isra Miraj, Muharram)', months: [10, 12, 2, 4], keterangan: 'Pentas' },
      { no: 6, kegiatan: 'Koreografi Panggung & Kostum Pentas Seni Islami', months: [11, 3], keterangan: 'Koreografi' },
      { no: 7, kegiatan: 'Keikutsertaan Festival Seni Qasidah/Hadroh Pelajar (Pentas PAI)', months: [10, 2, 5], keterangan: 'Festival' },
      { no: 8, kegiatan: 'Evaluasi Tahunan, Rekaman Portofolio & Apresiasi Tim', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Teknik Dasar Pukulan Anakan & Kunci (Dung - Tak)',
        materiMinggu: [
          'Pengenalan posisi memegang rebana dengan tangan kiri dan memukul kulit rebana dengan telapak tangan kanan.',
          'Teknik pukulan Dung (suara rendah di tengah kulit) dan pukulan Tak (suara nyaring di tepi bingkai kayu).',
          'Latihan ketukan tempo lambat metronom pukulan dasar hadroh anakan (lambatan).',
          'Latihan ketukan pukulan kunci (penyeimbang ketukan anakan) dipadukan secara serentak berpasangan.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Lagu Sholawat Dasar & Pembagian Suara Koor',
        materiMinggu: [
          'Pelafalan makhraj syair Sholawat Sholatuminallah dan Tholaal Badru Alayna secara fasih.',
          'Pembagian tugas personel: Vokalis utama, penabuh rebana dasar, penabuh tam/dumblek, dan bass.',
          'Penggabungan vokal intro dan irama rebana pembuka bait pertama.',
          'Latihan transisi dari tempo lambat menuju tempo sedang diiringi backing vokal koor.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Variasi Pukulan Golb, Rol & Bass Hadroh',
        materiMinggu: [
          'Teknik pukulan variasi Golb (ketukan cepat rapat mengisi sela irama).',
          'Teknik pukulan Rol beruntun menggunakan jari jemari melatih kelenturan ketukan.',
          'Harmonisasi pukulan Bass hadroh dengan stik busa menghentak pada ketukan pertama tiap bait.',
          'Latihan membawakan lagu Sholawat Tibbil Qulub dengan variasi lengkap instrumen hadroh.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Pentas Peringatan Hari Besar Islam & Penampilan Sekolah',
        materiMinggu: [
          'Gladi bersih tata panggung, posisi mikrofon vokal, dan penempatan rebana saat pentas.',
          'Penampilan perdana tim qasidah/hadroh pada peringatan Isra Miraj di aula sekolah.',
          'Evaluasi performa panggung: ketepatan tempo nada, artikulasi syair, dan kekompakan seragam.',
          'Pemberian apresiasi kepada seluruh penabuh dan vokalis atas penampilan panggung yang tertib.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Lagu Qasidah Modern & Dinamika Irama Cepat (Mars Sholawat)',
        materiMinggu: [
          'Pengenalan lagu Mars Syubbanul Wathon dan Sholawat Nahdliyah berirama dinamis penuh semangat.',
          'Teknik pukulan tepuk ganda berbalasan antara regu rebana kanan dan regu rebana kiri.',
          'Pemberian variasi ketukan tam-tam berdering mengiringi klimaks lagu.',
          'Uji kekompakan membawakan 2 lagu berturut-turut tanpa menurunkan tempo ketukan.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Uji Kemahiran Penabuh & Evaluasi Semester Genap',
        materiMinggu: [
          'Ujian perorangan memukul ketukan dasar hadroh dan ketukan variasi tanpa iringan vokal.',
          'Tes vokal solo melafalkan syair qasidah dengan nada tinggi yang merdu.',
          'Perekaman portofolio video penampilan qasidah penutup semester untuk arsip sekolah.',
          'Pembersihan dan perawatan instrumen rebana, pemberian pelembap kulit terbang, dan evaluasi semester.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Penerimaan Anggota Baru & Pengenalan Instrumen Perkusi',
        materiMinggu: [
          'Demonstrasi atraksi tabuhan hadroh ceria menyambut siswa baru pada masa orientasi sekolah.',
          'Pendaftaran calon vokalis dan penabuh baru dari jenjang kelas 3 hingga kelas 5.',
          'Pengenalan jenis-jenis alat musik: Hadroh/Terbang, Tam, Keprak, Dumblek Calti, dan Bass Mika.',
          'Latihan pembiasaan ketukan irama sederhana menggunakan tepuk tangan bersama-sama.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Lagu Patriotik Islami & Semangat Kemerdekaan',
        materiMinggu: [
          'Penggabungan lagu sholawat dengan lagu perjuangan Hari Merdeka versi tabuhan hadroh bersemangat.',
          'Latihan formasi berdiri dan duduk bersila berbaris rapi di panggung upacara.',
          'Pementasan qasidah memeriahkan peringatan HUT Kemerdekaan RI tingkat sekolah.',
          'Evaluasi kedisiplinan jadwal kehadiran latihan dan pembagian buku kumpulan syair sholawat.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Pendalaman Vokal Solois & Cengkok Nada Qasidah',
        materiMinggu: [
          'Latihan teknik pernapasan diafragma bagi vokalis utama untuk mempertahankan nada panjang.',
          'Pelatihan cengkok qasidah khas melayu/timur tengah yang merdu dan syahdu.',
          'Penyesuaian tinggi nada (key) vokal utama dengan nada instrumen hadroh agar tidak sumbang.',
          'Latihan membawakan lagu Sholawat Burdah bait 1 s.d. 10 secara utuh.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Persiapan Pentas Maulid Nabi Muhammad SAW',
        materiMinggu: [
          'Pemantapan lagu utama perayaan Maulid: Ya Rasulallah Salamun Alaik dan Mahallul Qiyam.',
          'Latihan prosesi berdiri serentak (Mahallul Qiyam) dengan tabuhan rebana tempo cepat dan khusyuk.',
          'Penampilan utama tim hadroh pada puncak peringatan Maulid Nabi di hadapan orang tua siswa.',
          'Evaluasi kekhidmatan penampilan, pelafalan tajwid syair sholawat, dan tata krama panggung.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Persiapan Festival Seni Qasidah & Koreografi Hadroh',
        materiMinggu: [
          'Latihan koreografi gerakan mengangkat rebana serentak ke atas, kiri, dan kanan sesuai ketukan.',
          'Simulasi perlombaan: membawakan 1 lagu wajib dan 1 lagu pilihan sesuai juknis Festival Pentas PAI.',
          'Drill penilaian dewan juri: kekompakan tabuhan, kebersihan vokal, dan kerapian kostum busana muslim.',
          'Uji coba gladi panggung tertutup dihadiri oleh dewan guru pembina ekstrakurikuler.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Perekaman Album Mini Sekolah & Penutupan Program Tahunan',
        materiMinggu: [
          'Perekaman audio/video 3 lagu sholawat terbaik tim hadroh sekolah di studio mini multimedia.',
          'Pemberian piagam penghargaan vokalis terbaik dan penabuh paling konsisten tahun ini.',
          'Pengecekan fisik baut ring rebana, penggantian tali bass yang kendur, dan pembersihan instrumen.',
          'Doa bersama khataman sholawat dan refleksi capaian seni qasidah sekolah selama satu tahun.'
        ]
      }
    ]
  },

  // =========================================================================
  // 5. BACA TULIS AL-QUR'AN (BTQ) & TAHFIDZ
  // =========================================================================
  btq: {
    id: 'btq',
    namaStandard: 'BTQ & Tahfidz',
    aliases: ['btq', 'tahfidz', 'tahfidzul quran', 'baca tulis alquran', 'quran', 'mengaji', 'rohis'],
    kategori: 'Keagamaan',
    deskripsiProgram:
      'Membina kemampuan membaca Al-Qur\'an secara tartil berkaidah tajwid, menulis kaligrafi ayat suci secara indah, menghafal Juz 30 (Juz Amma), serta menanamkan akhlak karimah qur\'ani.',
    targetCapaian:
      'Siswa menguasai makharijul huruf, hukum tajwid nun mati/tanwin/mim mati/mad, tuntas hafalan surat pendek Juz 30, serta siap berkompetisi dalam ajang MHQ dan Kaligrafi Pentas PAI.',
    sasaranPrestasi: [
      'Kemampuan membaca Al-Qur\'an dengan lancar dan benar sesuai kaidah tajwid resmi',
      'Target tuntas hafalan Juz 30 (minimal Surat An-Naba s.d. An-Nas) dengan mutqin',
      'Keterampilan menulis kaidah khat naskhi kaligrafi ayat Al-Qur\'an dengan rapi',
      'Meraih juara pada ajang Musabaqah Hifdzil Qur\'an (MHQ) & MTQ tingkat Pelajar'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Pemetaan Kemampuan Awal (Placement Test) & Pembagian Halaqah', months: [7, 8], keterangan: 'Tes Awal' },
      { no: 2, kegiatan: 'Pembinaan Makharijul Huruf, Sifat Huruf & Adab Membaca Al-Qur\'an', months: [7, 8, 9], keterangan: 'Makhraj' },
      { no: 3, kegiatan: 'Setoran Rutin Mingguan Hafalan Juz 30 (Metode Tikrar & Talaqqi)', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Setoran' },
      { no: 4, kegiatan: 'Pendalaman Kaidah Tajwid (Nun Mati, Mim Mati, Idghom & Mad)', months: [9, 10, 11, 1, 2, 3], keterangan: 'Tajwid' },
      { no: 5, kegiatan: 'Latihan Menulis Huruf Hijaiyah Sambung & Khat Naskhi Kaligrafi', months: [10, 12, 3, 5], keterangan: 'Menulis' },
      { no: 6, kegiatan: 'Uji Tasmi\' Hafalan Al-Qur\'an Terbuka di Hadapan Orang Tua & Guru', months: [11, 4], keterangan: 'Tasmi\'' },
      { no: 7, kegiatan: 'Keikutsertaan Ajang MHQ / MTQ / Kaligrafi Tingkat Pelajar (Pentas PAI)', months: [10, 2, 5], keterangan: 'Musabaqah' },
      { no: 8, kegiatan: 'Munaqosyah Tahfidz Akhir Tahun, Wisuda Juz Amma & Evaluasi', months: [6, 12], keterangan: 'Wisuda' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Tajwid Hukum Nun Sukun & Tanwin (Idzhar, Idghom, Ikhfa, Iqlab)',
        materiMinggu: [
          'Pengenalan dan contoh bacaan Idzhar Halqi (jelas tanpa dengung) pada huruf halqiah.',
          'Praktik membaca Idghom Bighunnah (melebur berdengung) dan Idghom Bilaghunnah pada ayat pilihan.',
          'Pendalaman hukum Iqlab (menukar bunyi N menjadi M) dan hukum Ikhfa Haqiqi (menyamarkan bunyi).',
          'Setoran hafalan lanjutan Juz 30: Surat Al-Balad dan Asy-Syams disertai verifikasi tajwid pembina.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Hukum Mim Sukun & Ragam Tanda Waqaf',
        materiMinggu: [
          'Kaidah hukum Ikhfa Syafawi, Idghom Mimi, dan Idzhar Syafawi pada bacaan Al-Qur\'an.',
          'Mengenal tanda waqaf lazim, waqaf jaiz, saktah, dan cara berhenti yang benar pada akhir ayat.',
          'Latihan muraja\'ah (pengulangan) kelompok metode sambung ayat berantai.',
          'Setoran hafalan lanjutan Juz 30: Surat Al-Lail, Ad-Dhuha, dan Al-Insyirah secara tartil.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Kaidah Hukum Bacaan Mad (Mad Thobi\'i, Wajib Muttashil, Jaiz Munfashil)',
        materiMinggu: [
          'Membedakan panjang bacaan Mad Thobi\'i (2 harakat) dengan harakat pendek secara tepat.',
          'Praktik membaca Mad Wajib Muttashil (4-5 harakat) dan Mad Jaiz Munfashil saat membaca surat panjang.',
          'Pengenalan hukum Mad Lazim Mutsaqqal Kilmi (6 harakat) pada ayat khusus.',
          'Setoran hafalan Juz 30: Surat At-Tin, Al-\'Alaq, dan Al-Qadr secara mutqin.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Irama Murottal (Hijaz / Rost) & Persiapan Uji Tasmi\'',
        materiMinggu: [
          'Pengenalan nada irama murottal klasik (Irama Rost dan Hijaz) yang tenang dan khusyuk.',
          'Latihan pengaturan nafas panjang saat membaca ayat berturut-turut tanpa terputus.',
          'Simulasi Uji Tasmi\' mandiri 1 Juz penuh atau 10 surat berurutan di depan halaqah.',
          'Pelaksanaan Uji Tasmi\' Terbuka di mushola sekolah disaksikan pembina dan dewan guru.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Latihan Menulis Kaligrafi Kaidah Khat Naskhi',
        materiMinggu: [
          'Teknik memegang spidol/kalam kaligrafi miring dan kaidah garis dasar huruf hijaiyah.',
          'Praktik menyambung huruf hijaiyah di awal, tengah, dan akhir kata sesuai kaidah Khat Naskhi.',
          'Menulis ayat pendek pilihan (Ayat Kursi / Surat Al-Ikhlas) dengan harakat rapi di kertas gambar.',
          'Pemberian hiasan ornamen tepi (illumination border) pada karya kaligrafi santri.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Munaqosyah Tahfidz Semester Genap & Ujian Kenaikan Juz',
        materiMinggu: [
          'Pelaksanaan Ujian Munaqosyah Tahfidz: Pengujian 3 pertanyaan sambung ayat acak dari penguji.',
          'Penilaian aspek kelancaran hafalan (fashahah), kebenaran tajwid, dan adab penghafal Al-Qur\'an.',
          'Prosesi Wisuda Tahfidz Juz Amma sekolah, penyematan selempang santri, dan sertifikat resmi.',
          'Evaluasi rekapitulasi buku mutaba\'ah hafalan santri dan pesan motivasi menyambut libur semester.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Placement Test Santri Baru & Penataan Halaqah Mengaji',
        materiMinggu: [
          'Sosialisasi program tahfidz sekolah, target capaian hafalan per jenjang kelas, dan adab majelis.',
          'Placement test kemampuan membaca Al-Qur\'an (Jilid Iqro dasar, Al-Qur\'an tartil, atau Tahfidz pemula).',
          'Pembagian kelompok halaqah mengaji dibimbing guru pembina tahfidz bersertifikat.',
          'Pembagian buku mutaba\'ah yaumiyyah (buku pantauan setoran harian) bagi setiap santri.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Makharijul Huruf: Al-Halq (Tenggorokan) & Al-Lisan (Lidah)',
        materiMinggu: [
          'Praktik melafalkan 6 huruf tenggorokan (Hamzah, Ha, \'Ain, Haa, Ghoin, Kho) tanpa tertukar.',
          'Praktik melafalkan huruf lidah yang sering keliru: Dhad, Zha, Tsa, Sin, Syin, dan Shod.',
          'Metode Talaqqi (pembina mencontohkan dan santri menirukan serempak) Surat An-Nas s.d. Al-Kautsar.',
          'Lomba sambung ayat kemerdekaan antarkelompok halaqah memupuk kecintaan pada Al-Qur\'an.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Metode Tikrar (Pengulangan Mandiri) & Surat Al-Ma\'un s.d. Al-Fil',
        materiMinggu: [
          'Teknik menghafal mandiri metode Tikrar: membaca 1 ayat sebanyak 20 kali sebelum berpindah ke ayat berikutnya.',
          'Setoran hafalan Surat Al-Ma\'un, Quraisy, dan Al-Fil dengan pengawasan makhraj ketat.',
          'Latihan menulis imla\' (dikte) ayat-ayat pendek melatih kecermatan penulisan huruf hijaiyah.',
          'Muraja\'ah hafalan bersama pasangan sebaya (partner tahfidz) di serambi mushola.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Pendalaman Surat Al-Humazah s.d. At-Takatsur & Makna Ayat',
        materiMinggu: [
          'Talaqqi dan setoran hafalan Surat Al-Humazah, Al-\'Ashr, dan At-Takatsur.',
          'Tadabbur singkat makna kandungan surat: bahaya menggunjing dan pentingnya menghargai waktu.',
          'Latihan melafalkan hukum Qolqolah (pantulan Sugra dan Kubra) pada huruf Ba, Jim, Dal, Tha, Qaf.',
          'Uji kelancaran muraja\'ah seluruh surat pendek dari An-Nas hingga At-Takatsur tanpa melihat mushaf.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Persiapan Lomba MHQ & Kaligrafi Pentas PAI',
        materiMinggu: [
          'Simulasi perlombaan MHQ: latihan menjawab cepat soal sambung ayat, tebak nama surat, dan arti ayat.',
          'Pelatihan mental tampil di depan panggung: mengatur vokal mikrofon dan ketenangan bersuara.',
          'Bimbingan khusus kaligrafi bagi perwakilan santri: penggunaan tinta cina dan komposisi warna bingkai.',
          'Uji coba try out penilaian musabaqah internal dengan standar juri Kemenag.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Khataman Al-Qur\'an Bersama & Evaluasi Akhir Tahun',
        materiMinggu: [
          'Kegiatan Khataman Al-Qur\'an akbar bersama seluruh peserta ekstrakurikuler BTQ di mushola sekolah.',
          'Pembacaan doa Khotmil Qur\'an dan refleksi kemajuan hafalan masing-masing santri.',
          'Pemberian penghargaan sertifikat Bintang Tahfidz kepada santri dengan setoran terbanyak.',
          'Penyusunan laporan kemajuan hafalan kepada orang tua dan doa penutup akhir tahun ajaran.'
        ]
      }
    ]
  },

  // =========================================================================
  // 6. BOLA VOLI
  // =========================================================================
  voli: {
    id: 'voli',
    namaStandard: 'Bola Voli',
    aliases: ['voli', 'bola voli', 'volleyball', 'volley'],
    kategori: 'Olahraga',
    deskripsiProgram:
      'Membina kebugaran fisik, penguasaan passing bawah/atas, servis akurat, smash menukik, bendungan blocking, koordinasi formasi rotasi tim, dan kesiapan mengikuti kejuaraan voli pelajar O2SN.',
    targetCapaian:
      'Siswa menguasai passing bawah dan atas secara stabil, servis bawah/atas masuk area lawan, formasi posisi 1-6, serta mampu berkompetisi secara sportif dalam turnamen antar-sekolah.',
    sasaranPrestasi: [
      'Kemampuan passing bawah stabil menahan servis lawan (receive) minimal 10 kali relli',
      'Penguasaan passing atas empuk mengumpan spiker (toser / setter ball distribution)',
      'Penguasaan servis bawah dan servis mengapung (floating serve) menembus pertahanan lawan',
      'Meraih juara dalam turnamen Bola Voli Pelajar tingkat Kecamatan dan O2SN'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Pendaftaran, Seleksi Postur Fisik & Pengenalan Lapangan Voli', months: [7, 8], keterangan: 'Seleksi' },
      { no: 2, kegiatan: 'Latihan Dasar Passing Bawah Kuda-Kuda Rendah & Passing Atas', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan Servis, Smash, Blocking & Rotasi Tim', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Peran Setter (Pengumpan) & Spiker (Pemukul)', months: [9, 10, 11, 1, 2, 3], keterangan: 'Spesialisasi' },
      { no: 5, kegiatan: 'Simulasi Pertandingan Internal Game 6 vs 6 Sistem Rotasi', months: [10, 12, 3, 5], keterangan: 'Internal' },
      { no: 6, kegiatan: 'Pertandingan Persahabatan (Try Out) Menghadapi SD Mitra', months: [11, 4], keterangan: 'Uji Coba' },
      { no: 7, kegiatan: 'Keikutsertaan Ajang O2SN & Kejuaraan Bola Voli Pelajar', months: [10, 2, 5], keterangan: 'Turnamen' },
      { no: 8, kegiatan: 'Evaluasi Statistik Tim, Uji Kebugaran & Rekapitulasi Prestasi', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Passing Bawah Stabil & Kuda-Kuda Kaki Fleksibel',
        materiMinggu: [
          'Teknik merapatkan dan mengunci kedua ibu jari tangan lurus membentuk bidang pantul passing bawah.',
          'Posisi lutut ditekuk rendah (kuda-kuda fleksibel) menyerap pantulan bola voli.',
          'Drill passing bawah berpasangan jarak 3 meter mempertahankan bola tidak jatuh ke lantai.',
          'Latihan bergerak menyongsong datangnya bola (footwork maju, mundur, dan menyamping).'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Passing Atas Lembut & Pengenalan Posisi Setter (Toser)',
        materiMinggu: [
          'Teknik membuka sepuluh jari tangan membentuk mangkuk di atas kening untuk passing atas.',
          'Latihan melambungkan bola ke atas sendiri (self toss passing) melatih kelembutan pergelangan tangan.',
          'Drill passing atas mengarahkan bola ke posisi tiang net untuk umpan smash.',
          'Kombinasi bola pertama passing bawah diterima langsung diumpan melalui passing atas setter.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Akurasi Servis Bawah & Servis Atas (Floating Serve)',
        materiMinggu: [
          'Teknik servis bawah dengan ayunan lengan lurus dari belakang dan perkenaan kepalan tangan.',
          'Target servis bawah mengarahkan bola ke area belakang lapangan lawan (posisi 5 dan 1).',
          'Teknik servis atas: melempar bola setinggi 1 meter dan memukul dengan telapak tangan terbuka.',
          'Latihan 10 kali servis berturut-turut dengan target minimal 8 bola masuk melewati net.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Langkah Awalan Smash & Timing Pukulan di Udara',
        materiMinggu: [
          'Latihan langkah awalan smash 3 langkah (kiri-kanan-kiri atau kanan-kiri-kanan) dan tolakan dua kaki.',
          'Latihan ayunan tangan mencambuk bola di titik tertinggi lompatan di atas bibir net.',
          'Drill smash umpan bola lambung setter ke arah sudut tajam lapangan lawan.',
          'Pengenalan teknik penempatan bola tipuan (tip / ball placement) di sela blok lawan.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Teknik Bendungan (Blocking) & Formasi Rotasi Lapangan',
        materiMinggu: [
          'Teknik melompat tegak lurus dengan kedua telapak tangan terbuka lebar menghadang smash lawan.',
          'Latihan blocking tunggal dan blocking ganda (2 pemain merapat menutup sudut smash).',
          'Pengenalan 6 posisi lapangan (Posisi 1 Servis s.d. Posisi 6 Belakang Tengah) dan arah rotasi searah jarum jam.',
          'Simulasi pertandingan 6 vs 6 menerapkan aturan rotasi saat memenangkan bola servis.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Turnamen Voli Antar-Kelas & Evaluasi Semester Genap',
        materiMinggu: [
          'Pengundian bagan turnamen bola voli mini sekolah putra dan putri.',
          'Babak penyisihan turnamen voli internal dengan sistem skor 25 reli poin 2 set kemenangan.',
          'Babak final turnamen voli sekolah, penyerahan piala tim terbaik dan pemain terfavorit.',
          'Tes ketahanan vertikal jump (loncatan tegak), evaluasi teknik dasar, dan pembagian sertifikat.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Penerimaan Anggota Baru & Pengenalan Lapangan Voli',
        materiMinggu: [
          'Sosialisasi tata tertib latihan, ukuran bola voli ukuran 4 untuk usia sekolah dasar, dan ketinggian net.',
          'Tes kelenturan bahu, kecepatan lari sprint 20 meter, dan pengukuran tinggi badan siswa.',
          'Permainan melempar dan menangkap bola voli melatih kepekaan sentuhan bola (ball feeling).',
          'Latihan pembentukan kelompok regu latihan dan pengenalan nama-nama garis lapangan voli.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Kekuatan Otot Lengan & Daya Pegas Loncatan Kaki',
        materiMinggu: [
          'Latihan push-up, plank, dan lempar bola kedokteran untuk membangun kekuatan lengan dan bahu.',
          'Latihan squat jump dan box jump melatih daya ledak loncatan spiker di udara.',
          'Lomba estafet passing bola voli antartim menyemarakkan peringatan HUT Kemerdekaan RI.',
          'Edukasi keselamatan sendi lutut, pemanasan dinamis, dan pendinginan yang tepat.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Pola Pertahanan Belakang (Defending) & Penyelamatan Bola',
        materiMinggu: [
          'Latihan menjatuhkan badan menyelamatkan bola jatuh (dive / pancake defense).',
          'Penempatan posisi libero / pemain bertahan membaca arah smash keras lawan.',
          'Drill pertahanan menerima smash bertubi-tubi dari pelatih dan mengarahkan bola ke setter.',
          'Relli permainan bertahan panjang menguji keuletan dan pantang menyerah regu.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Kombinasi Serangan Cepat (Quick Attack & Semi Ball)',
        materiMinggu: [
          'Latihan smash bola cepat (quick smash) di posisi 3 melompat mendahului umpan toser.',
          'Variasi smash bola semi di posisi sayap (open spike) dari posisi 4 dan posisi 2.',
          'Komunikasi vokal saat memanggil bola: instruksi "Masuk", "Out", "Bebas", dan "Punya Saya".',
          'Simulasi taktik menyerang menghadapi variasi bendungan blok lawan.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Pertandingan Uji Coba (Try Out) Melawan Tim Sekolah Mitra',
        materiMinggu: [
          'Pertandingan uji coba persahabatan bola voli tandang ke lapangan sekolah mitra kecamatan.',
          'Evaluasi rekaman kesalahan servis out dan kesalahan komunikasi saat menerima bola tanggung.',
          'Pembenahan mental bertanding saat tim tertinggal poin di set penentuan.',
          'Pertandingan uji coba kandang leg kedua dengan dukungan suporter siswa sekolah.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Apresiasi Tim, Rekapitulasi Tahunan & Pemeliharaan Alat',
        materiMinggu: [
          'Evaluasi rekapitulasi data kehadiran dan peningkatan statistik akurasi teknik tiap pemain.',
          'Pemberian piagam spiker terbaik, setter paling kreatif, dan pemain terdisiplin tahun ini.',
          'Pemeriksaan tekanan angin bola voli, penyimpanan jaring net, dan perawatan tiang net.',
          'Pertandingan ekshibisi ceria tim bola voli siswa melawan tim gabungan dewan guru.'
        ]
      }
    ]
  },

  // =========================================================================
  // 7. CATUR (CHESS)
  // =========================================================================
  catur: {
    id: 'catur',
    namaStandard: 'Catur',
    aliases: ['catur', 'chess', 'percasi', 'klub catur'],
    kategori: 'Akademik',
    deskripsiProgram:
      'Mengasah daya berpikir strategis, konsentrasi tingkat tinggi, pemecahan masalah (problem solving), penguasaan taktik catur baku PERCASI, dan kesiapan mengikuti kejuaraan catur O2SN serta Kejurda.',
    targetCapaian:
      'Siswa menguasai notasi catur standar, pergerakan & nilai perwira, pembukaan e4/d4, taktik dasar (pin, fork, skewer, discovered attack), ending raja-benteng, dan turnamen catur cepat.',
    sasaranPrestasi: [
      'Pemahaman utuh notasi catur aljabar dan pencatatan langkah di lembar skor',
      'Penguasaan taktik kombinasi (Garpu/Fork, Pin, Tusukan/Skewer, Serangan Terbuka)',
      'Penguasaan prinsip pembukaan (Kuasai Pusat, Kembangkan Perwira, Amankan Raja)',
      'Meraih medali juara pada ajang O2SN Catur Pelajar tingkat Kecamatan dan Kota'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Pendaftaran, Seleksi Kemampuan Dasar & Pengenalan Papan Catur', months: [7, 8], keterangan: 'Pengenalan' },
      { no: 2, kegiatan: 'Pergerakan 6 Perwira, Nilai Bidak & Notasi Aljabar Standar', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Taktik, Problem Catur 1-3 Langkah & Jam Catur', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Teori Pembukaan (Opening e4, d4, Pertahanan Sisilia)', months: [9, 10, 11, 1, 2, 3], keterangan: 'Pembukaan' },
      { no: 5, kegiatan: 'Simulasi Turnamen Catur Internal Cepat (Rapid Chess 15 Menit)', months: [10, 12, 3, 5], keterangan: 'Turnamen' },
      { no: 6, kegiatan: 'Teknik Babak Akhir (Endgame): Mat Raja-Menteri & Raja-Benteng', months: [11, 4], keterangan: 'Endgame' },
      { no: 7, kegiatan: 'Keikutsertaan Ajang O2SN Catur Pelajar & Kejuaraan Daerah', months: [10, 2, 5], keterangan: 'Kompetisi' },
      { no: 8, kegiatan: 'Evaluasi Rating Internal, Analisis Partai & Rekapitulasi Tahunan', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Taktik Dasar Pin (Paku) & Fork (Garpu Kuda/Pion)',
        materiMinggu: [
          'Pengenalan taktik Pin (memaku perwira lawan agar tidak bisa bergerak melindungi raja/menteri).',
          'Pengenalan taktik Fork (garpuan kuda atau bidak menyerang 2 perwira berharga sekaligus).',
          'Latihan menyelesaikan 10 lembar soal puzzle catur tema Pin dan Fork dalam waktu 15 menit.',
          'Praktik bermain catur berpasangan menerapkan taktik mencari peluang garpuan kuda.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Taktik Skewer (Tusukan Sate) & Discovered Attack (Serangan Terbuka)',
        materiMinggu: [
          'Teknik Skewer: gajah atau benteng menyerang perwira berharga depan sehingga perwira belakang jatuh.',
          'Teknik Discovered Attack: menggeser perwira penutup untuk membuka ancaman maut perwira di belakangnya.',
          'Drill problem skak mat 2 langkah (Mate in 2) melatih imajinasi spasial papan catur.',
          'Simulasi partai catur cepat 10 menit menggunakan jam catur digital (chess clock).'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Prinsip Babak Pembukaan: Kuasai Pusat & Rokade Raja',
        materiMinggu: [
          'Tiga hukum emas pembukaan: Kuasai 4 petak pusat (e4, d4, e5, d5), kembangkan kuda/gajah, amankan raja.',
          'Teknik Rokade pendek (O-O) dan Rokade panjang (O-O-O) serta syarat sahnya rokade.',
          'Bahaya mengeluarkan menteri terlalu dini dan bahaya memindahkan bidak yang sama berulang kali.',
          'Praktik pembukaan Italia (Italian Game) dan Pembukaan Ruy Lopez (Spanish Opening).'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Teknik Babak Akhir (Endgame): Skak Mat Raja & Menteri / Benteng',
        materiMinggu: [
          'Teknik mengurung raja lawan ke tepi papan menggunakan Raja + Menteri (Queen Mate).',
          'Teknik memotong papan menggunakan Raja + Benteng (Rook Mate) langkah per langkah.',
          'Mengenal aturan Remis (Draw): Stalemate (pat), skak abadi, 50 langkah tanpa makan/pion, dan 3 kali posisi sama.',
          'Uji praktik babak akhir melawan pelatih menguji ketuntasan skak mat dalam batas 20 langkah.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Simulasi Sistem Swiss & Persiapan Kejuaraan O2SN',
        materiMinggu: [
          'Pengenalan aturan resmi FIDE / PERCASI: Touch-move (bidak dipegang harus jalan), pencatatan notasi.',
          'Simulasi turnamen catur sistem Swiss 5 babak (Rapid Chess 15 menit + increment 5 detik).',
          'Analisis partai pasca bertanding (post-mortem analysis) mengidentifikasi langkah blunder.',
          'Latihan ketenangan mental dan fokus pernapasan saat waktu di jam catur tersisa di bawah 1 menit.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Turnamen Catur Sekolah & Evaluasi Semester Genap',
        materiMinggu: [
          'Pelaksanaan Turnamen Catur Juara Sekolah babak 1 s.d. 3 sistem Swiss.',
          'Babak penentuan juara 4 dan 5, penyerahan medali Grandmaster Cilik Sekolah.',
          'Ujian teori notasi catur dan penyelesaian 20 problem taktik akhir semester.',
          'Evaluasi grafik perkembangan rating internal siswa dan pembagian buku kumpulan taktik catur.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Penerimaan Anggota Baru & Pengenalan Bidak Catur',
        materiMinggu: [
          'Pengenalan papan catur 64 petak hitam-putih, baris (rank 1-8), lajur (file a-h), dan diagonal.',
          'Cara melangkah dan memukul dari 6 perwira: Raja, Menteri, Benteng, Gajah, Kuda, dan Bidak (Pion).',
          'Nilai kekuatan bidak: Pion (1), Kuda (3), Gajah (3), Benteng (5), Menteri (9), Raja (tak terhingga).',
          'Permainan mini perang pion (Pawn Wars) melatih pemahaman promosi bidak di petak akhir.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Notasi Catur Aljabar & Perang Bidak Kemerdekaan',
        materiMinggu: [
          'Cara menuliskan notasi catur: K (King), Q (Queen), R (Rook), B (Bishop), N (Knight), x (makan), + (skak).',
          'Latihan membaca dan menuliskan langkah pada lembar skor catur (scoresheet).',
          'Lomba catur kilat (Blitz 5 menit) menyemarakkan peringatan HUT Kemerdekaan RI.',
          'Peregangan mata, senam konsentrasi otak kanan-kiri, dan evaluasi ketertiban ruang catur.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Pertahanan Hitam (French Defense & Caro-Kann)',
        materiMinggu: [
          'Prinsip bermain memegang buah hitam: meredam inisiatif putih dan menyerang balik sayap.',
          'Pengenalan Pertahanan Perancis (French Defense: 1. e4 e6 2. d4 d5).',
          'Pengenalan Pertahanan Caro-Kann (1. e4 c6 2. d4 d5) membangun rantai pion kokoh.',
          'Praktik bermain buah hitam melawan skema pembukaan putih melatih ketangguhan mental.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Taktik Tingkat Lanjut: Pengorbanan Perwira (Sacrifice)',
        materiMinggu: [
          'Konsep pengorbanan perwira (sacrifice) untuk membongkar pertahanan pelindung raja lawan.',
          'Pengorbanan gajah klasik di petak h7 (Greek Gift Sacrifice) membuka lajur serangan menteri.',
          'Latihan memecahkan studi taktik catur karya master dunia (Kasparov, Carlsen, Utut Adianto).',
          'Simulasi partai catur buta mini (Blindfold chess 10 langkah pertama) mengasah daya ingat visual.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Pertandingan Simultan Melawan Pelatih & Uji Coba',
        materiMinggu: [
          'Ekshibisi Catur Simultan: Pelatih melawan 10 siswa sekaligus secara bersamaan.',
          'Evaluasi ketahanan fokus masing-masing siswa saat menghadapi tekanan perwira pelatih.',
          'Latihan taktik babak tengah: menguasai lajur terbuka dengan benteng ganda.',
          'Simulasi pertandingan persahabatan catur online/offline menghadapi sekolah mitra.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Rekapitulasi Prestasi Tahunan & Perawatan Papan Catur',
        materiMinggu: [
          'Rekapitulasi rating performa dan penyusunan peringkat ranking catur sekolah akhir tahun.',
          'Pemberian penghargaan kepada pecatur paling tekun dan pemecah puzzle terbanyak.',
          'Pembersihan buah catur kayu, pemeriksaan kelayakan baterai jam catur digital, dan perapian papan.',
          'Kuis cerdas cermat sejarah catur dunia dan doa bersama penutup tahun ajaran.'
        ]
      }
    ]
  },

  // =========================================================================
  // 8. PASKIBRA (PASUKAN PENGIBAR BENDERA)
  // =========================================================================
  paskibra: {
    id: 'paskibra',
    namaStandard: 'Paskibra',
    aliases: ['paskibra', 'paskibraka', 'pbb', 'baris berbaris', 'tub', 'tata upacara'],
    kategori: 'Kepanduan',
    deskripsiProgram:
      'Membina kedisiplinan tinggi, sikap tegap kesatria, patriotisme kebangsaan, penguasaan PBB dasar statis & dinamis baku TNI/POLRI, serta formasi pengibaran bendera merah putih resmi.',
    targetCapaian:
      'Siswa menguasai PBB statis/dinamis, langkah tegap, formasi barisan 17-8-45, teknik bentang & lipat sang merah putih, serta siap tampil sebagai petugas upacara bendera dan lomba PBB.',
    sasaranPrestasi: [
      'Keseragaman PBB statis (sikap sempurna, hadap kanan/kiri, balik kanan, lencang kanan) berstandar militer',
      'Kerapian PBB berjalan (langkah tegap, langkah biasa, haluan kanan/kiri, melintang kanan/kiri)',
      'Penguasaan teknik pembentangan dan pengibaran bendera merah putih tanpa kendala terlilit',
      'Meraih juara dalam Lomba Ketangkasan Baris Berbaris (LKBB) tingkat Kecamatan/Kabupaten'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Penerimaan Anggota Baru & Orientasi Sikap Disiplin Paskibra', months: [7, 8], keterangan: 'Orientasi' },
      { no: 2, kegiatan: 'Latihan Dasar PBB Statis, Olah Postur Tubuh & Pandangan Mata', months: [7, 8, 9], keterangan: 'PBB Statis' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan PBB Berjalan, Langkah Tegap & Danton', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Intensif Formasi Pasukan Pengibar Bendera HUT RI (Pasukan 17-8-45)', months: [7, 8], keterangan: 'HUT RI' },
      { no: 5, kegiatan: 'Teknik Melipat, Membentang & Mengerek Bendera Merah Putih', months: [9, 10, 11, 1, 2, 3], keterangan: 'Teknik Tiang' },
      { no: 6, kegiatan: 'Latihan PBB Variasi & Formasi Kreatif untuk Ajang LKBB', months: [11, 3, 5], keterangan: 'Variasi' },
      { no: 7, kegiatan: 'Keikutsertaan Lomba Ketangkasan Baris Berbaris (LKBB) Pelajar', months: [10, 2, 5], keterangan: 'Kompetisi' },
      { no: 8, kegiatan: 'Pelantikan Korps Paskibra Sekolah, Evaluasi & Apresiasi', months: [6, 12], keterangan: 'Pelantikan' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'PBB Statis Presisi: Sikap Sempurna, Istirahat & Lencang Barisan',
        materiMinggu: [
          'Teknik sikap sempurna baku: tumit rapat sudut 45 derajat, dada dibusungkan, pandangan lurus ke depan.',
          'Latihan sikap istirahat di tempat dan istirahat parade dengan ketukan tangan serentak membahana.',
          'Presisi lencang kanan, lencang kiri, dan setengah lengan lencang kanan meluruskan saf barisan.',
          'Latihan hadap kanan, hadap kiri, dan balik kanan 3 ketukan tempo stabil tanpa bergoyang.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'PBB Dinamis Berjalan: Langkah Biasa & Langkah Tegap',
        materiMinggu: [
          'Latihan langkah tegap maju: ayunan lengan lurus 90 derajat ke depan, kaki hentak mantap setinggi betis.',
          'Transisi dari langkah biasa ke langkah tegap dan sebaliknya dipandu komando danton.',
          'Latihan langkah ke depan, langkah ke belakang, langkah ke kiri, dan langkah ke kanan 4 langkah.',
          'Drill keseragaman ayunan tangan dan derap hentakan sepatu seluruh saf pasukan.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Perubahan Arah Gerak: Haluan Kanan/Kiri & Melintang',
        materiMinggu: [
          'Teknik haluan kanan dan haluan kiri saat berjalan mengubah arah saf pasukan 90 derajat.',
          'Teknik melintang kanan dan melintang kiri saat berhenti maupun saat berjalan.',
          'Latihan buka barisan dan tutup barisan secara serempak dan tertib.',
          'Simulasi penugasan komandan peleton (Danton) melatih vokal aba-aba yang lantang dan berwibawa.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Teknik Melipat, Membentang & Menali Bendera Merah Putih',
        materiMinggu: [
          'Teknik melipat bendera merah putih formasi lipat 8 dengan posisi warna merah di dalam.',
          'Teknik pengerek, pembentang, dan pembawa baki bendera di tiang upacara utama.',
          'Latihan membentangkan bendera merah putih tanpa terbalik dan hentakan bentangan terdengar tegas.',
          'Pengikatan simpul tali tiang bendera yang kuat, aman, dan mudah dilepas saat upacara usai.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Latihan PBB Variasi Kreatif & Yel-Yel Kebangsaan',
        materiMinggu: [
          'Penyusunan koreografi PBB variasi indah: gerakan tepuk tangan, hentak kaki berirama, dan formasi piramida.',
          'Latihan yel-yel patriotik pembangkit semangat korps paskibra dengan vokal kompak.',
          'Penggabungan PBB baku 12 gerakan dasar dengan PBB variasi waktu 7 menit.',
          'Simulasi penampilan arena lomba LKBB dipantau dewan juri pembina.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Pelantikan Kenaikan Tingkat Korps & Evaluasi Semester Genap',
        materiMinggu: [
          'Uji ketahanan fisik jasmani paskibra: lari ketahanan 12 menit dan push-up tegap.',
          'Ujian teori peraturan baris-berbaris (Puskermil TNI) dan etika lambang negara.',
          'Upacara tradisi pelantikan kenaikan tingkat, pemasangan epolet bahu paskibra baru, dan siraman air kembang.',
          'Refleksi nilai kepemimpinan, evaluasi kedisiplinan semester genap, dan doa bersama.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Perekrutan Pasukan 17-8-45 Peringatan HUT RI',
        materiMinggu: [
          'Seleksi fisik tinggi badan proporsional dan postur tegap untuk pasukan pengibar bendera 17 Agustus.',
          'Pembagian formasi: Pasukan 17 (pemandu), Pasukan 8 (pengibar inti dan pembawa baki), Pasukan 45 (pengawal).',
          'Latihan dasar langkah tegap langkah perlahan (slow march) pembawa baki menaiki tangga inspektur.',
          'Pembentukan mental disiplin baja dan latihan fisik penguatan otot punggung.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Karantina Latihan Intensif & Pelaksanaan Upacara HUT RI Ke-80',
        materiMinggu: [
          'Gladi kotor upacara HUT RI di lapangan utama sekolah dipadukan dengan iringan korps musik drumband.',
          'Gladi bersih upacara penaikan dan penurunan bendera merah putih waktu sore hari.',
          'Upacara Pengukuhan resmi Pasukan Pengibar Bendera Pusaka (Paskibraka) Sekolah oleh Kepala Sekolah.',
          'Pelaksanaan tugas utama pengibaran bendera Merah Putih pada Upacara Detik-Detik Proklamasi 17 Agustus.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Evaluasi Penugasan HUT RI & Regenerasi Anggota Junior',
        materiMinggu: [
          'Evaluasi menyeluruh sukses penugasan pengibaran 17 Agustus dan pemberian piagam penghargaan sekolah.',
          'Penyusunan jadwal piket rutin petugas pengibar bendera setiap upacara hari Senin.',
          'Bimbingan kakak senior kepada anggota junior mengenai etika kerapian seragam dinas paskibra.',
          'Latihan olah vokal intonasi aba-aba komandan peleton di lapangan terbuka.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Persiapan Lomba Ketangkasan Baris Berbaris (LKBB)',
        materiMinggu: [
          'Pendalaman materi PBB dinamis: 4 langkah ke kanan, 4 langkah ke kiri, balik kanan henti.',
          'Latihan ketepatan tempo ketukan langkah 96 langkah per menit sesuai standar baku TNI.',
          'Drill keserasian seragam putih-putih, peci paskibra, sarung tangan putih, dan sepatu pantofel hitam.',
          'Simulasi batas waktu penampilan 8 menit di dalam kotak arena lomba 15x20 meter.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Keikutsertaan Ajang LKBB Pelajar & Mental Bertanding',
        materiMinggu: [
          'Uji coba arena lomba LKBB tingkat Kabupaten/Kota dengan dukungan dewan guru.',
          'Partisipasi dalam Kejuaraan LKBB Pelajar, menampilkan PBB baku dan variasi terbaik.',
          'Evaluasi lembar penilaian dewan juri mengenai kerapian saf dan ketegasan danton.',
          'Pemberian apresiasi piala/medali kepada seluruh anggota peleton paskibra.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Rekapitulasi Tahunan & Penataan Sanggar Paskibra',
        materiMinggu: [
          'Rekapitulasi data kehadiran dan evaluasi kedisiplinan anggota selama satu tahun penuh.',
          'Pembersihan tiang bendera latihan, pencucian kain bendera merah putih, dan penyimpanan perlengkapan baki.',
          'Musyawarah tahunan pergantian pengurus OSIS seksi Paskibra dan penyusunan target tahun depan.',
          'Acara keakraban keluarga besar Paskibra sekolah dan doa penutup akhir tahun.'
        ]
      }
    ]
  },

  // =========================================================================
  // 9. DRUMBAND / MARCHING BAND
  // =========================================================================
  drumband: {
    id: 'drumband',
    namaStandard: 'Drumband',
    aliases: ['drumband', 'marching band', 'drum band', 'marchingband', 'marching', 'marching corps', 'drumbbang'],
    kategori: 'Seni & Budaya',
    deskripsiProgram:
      'Membina harmonisasi musik perkusi dan melodi (Snare, Bass Drum, Tenor, Bell Lyra/Pianika), kedisiplinan langkah display berbaris, kepemimpinan Field Commander / Mayoret, dan parade karnaval.',
    targetCapaian:
      'Siswa menguasai teknik pukulan stick perkusi, tangga nada melodi bell lyra, gerakan atraksi mayoret, formasi display visual, dan siap tampil pada upacara resmi serta lomba drumband.',
    sasaranPrestasi: [
      'Sinkronisasi tempo ketukan perkusi (Snare, Quint/Tenor, Bass Drum, Cymbal) tanpa meleset',
      'Kelancaran membawakan lagu wajib nasional, lagu pop daerah, dan mars drumband',
      'Kerapian manuver langkah berbaris (marching drill) sambil memainkan alat musik',
      'Meraih juara pada ajang Grand Prix Marching Band Pelajar dan Parade Karnaval HUT RI'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Penerimaan Anggota, Tes Musikalitas & Penempatan Alat', months: [7, 8], keterangan: 'Audisi' },
      { no: 2, kegiatan: 'Latihan Dasar Pukulan Stick (Rudiment) & Tangga Nada Bell Lyra', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan Lagu Mars, Parade & Display Visual', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Latihan Gabungan Marching (Main Musik Sambil Melangkah Berbaris)', months: [9, 10, 11, 1, 2, 3], keterangan: 'Marching' },
      { no: 5, kegiatan: 'Penampilan Parade Karnaval Kemerdekaan 17 Agustus', months: [7, 8], keterangan: 'Karnaval' },
      { no: 6, kegiatan: 'Atraksi Koreografi Mayoret (Gitapati / Field Commander)', months: [11, 3], keterangan: 'Mayoret' },
      { no: 7, kegiatan: 'Keikutsertaan Festival / Kejurda Drumband Pelajar Tingkat Daerah', months: [10, 2, 5], keterangan: 'Festival' },
      { no: 8, kegiatan: 'Evaluasi Tahunan, Perawatan Unit Alat Musik & Apresiasi Tim', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Teknik Pukulan Rudiment Perkusi & Partitur Melodi 1',
        materiMinggu: [
          'Teknik pegangan stick Snare (Match grip) dan latihan Single Stroke 4/4 tempo metronom 100 bpm.',
          'Latihan Double Stroke (did-dle) dan Flam pada snare drum melatih kelenturan pergelangan tangan.',
          'Bagian Melodi (Bell Lyra & Pianika): Membaca notasi angka lagu Mars Pelajar Pancasila.',
          'Penggabungan section perkusi dan section melodi pada bait intro lagu pertama.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Harmonisasi Lagu Wajib Nasional (Maju Tak Gentar & Hari Merdeka)',
        materiMinggu: [
          'Pendalaman partitur lagu Maju Tak Gentar untuk seluruh section (Snare, Tenor, Bass 1-4, Bell Lyra).',
          'Teknik Bass Drum bertingkat (Tonal Bass): ketukan beruntun Bass 1, 2, 3, dan 4 menggelegar teratur.',
          'Latihan Cymbal memotong aksen ketukan forte pada puncak reff lagu.',
          'Penggabungan lagu secara utuh dalam posisi statis melingkar di lapangan sekolah.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Marching Drill: Bermain Musik Sambil Melangkah Tegap',
        materiMinggu: [
          'Latihan melangkah kaki kiri di ketukan ganjil (1 dan 3) dan kaki kanan di ketukan genap (2 dan 4).',
          'Latihan memainkan instrumen perkusi sambil berjalan lurus 20 meter menjaga jarak saf dan banjar.',
          'Section melodi: Latihan membawa bell lyra tegak lurus sambil memukul bilah logam saat berjalan.',
          'Simulasi parade lurus mengelilingi lintasan lapangan sekolah tanpa terputus.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Atraksi Tongkat Mayoret & Field Commander (Gitapati)',
        materiMinggu: [
          'Teknik putaran tongkat mayoret dasar (spin, lemparan mini toss, dan putaran angka 8).',
          'Isyarat tongkat mayoret untuk aba-aba: Berhenti, Siap Main, Mulai Melangkah, dan Hormat Kanan.',
          'Koreografi langkah anggun dan salam pembuka Field Commander di hadapan podium kehormatan.',
          'Simulasi keselarasan aba-aba mayoret memandu seluruh 40 personel korps drumband.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Formasi Display Lapangan (Bentuk Bintang, Huruf & Silang)',
        materiMinggu: [
          'Pengenalan denah lintasan formasi display (drill sheet) dari bentuk blok kotak ke bentuk huruf V.',
          'Manuver pergerakan section bass drum membentuk garis tengah membelah pasukan melodi.',
          'Latihan perubahan formasi display diiringi transisi lagu pop daerah nusantara (Yamko Rambe Yamko).',
          'Gladi bersih penampilan display visual durasi 10 menit di lapangan utama sekolah.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Konser Mini Akhir Tahun & Pemeliharaan Instrumen',
        materiMinggu: [
          'Penampilan Konser Mini Drumband Sekolah pada acara perpisahan dan pelepasan siswa kelas 6.',
          'Pemberian medali apresiasi pemain terbaik untuk masing-masing section instrumen.',
          'Pemeriksaan kelayakan head snare/bass drum, pengencangan baut lug, dan pembersihan bilah bell lyra.',
          'Penyusunan inventaris alat musik ke dalam ruang sanggar drumband dan evaluasi semester genap.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Audisi Pemain Baru & Pembagian Alat Musik',
        materiMinggu: [
          'Parade atraksi drumband memukau menyambut siswa baru pada masa pengenalan lingkungan sekolah.',
          'Audisi tes ritme ketukan (rhythm test) dan tes pendengaran nada bagi calon anggota baru.',
          'Penetapan formasi posisi: 8 Snare, 6 Tenor, 4 Bass Drum, 2 Cymbal, 12 Bell Lyra/Pianika, 2 Mayoret.',
          'Pembagian harness sabuk pengait alat dan pembiasaan postur membawa instrumen yang ergonomis.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Intensif Parade Karnaval Kemerdekaan HUT RI',
        materiMinggu: [
          'Latihan intensif fisik berjalan jarak jauh (endurance march 2 km) sambil memikul instrumen.',
          'Pemantapan lagu-lagu perjuangan: Hari Merdeka, Halo-Halo Bandung, dan Kebyar-Kebyar.',
          'Pengecekan kelengkapan kostum seragam drumband, topi shako, bulu unggas, dan sepatu boot putih.',
          'Penampilan utama memimpin barisan terdepan Parade Karnaval Kemerdekaan 17 Agustus tingkat kecamatan.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Lagu Baru Bertempo Cepat & Dinamika Bunyi (Forte-Piano)',
        materiMinggu: [
          'Pengenalan partitur lagu baru bertempo ceria 120 bpm (Lagu Manuk Dadali / Gundul Pacul).',
          'Latihan dinamika bunyi: bermain sangat lembut (pianissimo) kemudian meledak keras (fortissimo).',
          'Drill aksen ketukan roll snare rapat (buzz roll) mengiringi pergantian bait lagu.',
          'Uji kekompakan membawakan 3 lagu sambung menyambung (medley drumband).'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Colour Guard (Pasukan Bendera Visual) & Keselarasan Gerak',
        materiMinggu: [
          'Pengenalan teknik kibasan bendera Colour Guard (Flag toss, spin, dan formasi gelombang sutra).',
          'Penyelarasan kibasan bendera colour guard dengan aksen ketukan bass drum.',
          'Manuver penempatan colour guard di belakang formasi mayoret mempercantik estetika visual.',
          'Simulasi display panggung penuh melibatkan seluruh komponen alat musik dan bendera visual.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Persiapan Kejuaraan Drumband Pelajar Daerah',
        materiMinggu: [
          'Pemantapan materi juknis kejuaraan: Kategori Unjuk Gelar (Display) dan Kategori Parade (Street Parade).',
          'Drill penilaian dewan juri PDBI: Analisis Musik Perkusi, Analisis Melodi, dan Efek Visual Keseluruhan.',
          'Uji coba simulasi arena kompetisi di lapangan stadion mini kecamatan.',
          'Partisipasi dalam Kejuaraan Drumband Pelajar Daerah menampilkan performa terbaik.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Rekapitulasi Prestasi Tahunan & Perawatan Besar Unit Alat',
        materiMinggu: [
          'Pemberian piagam penghargaan sekolah kepada seluruh atlet dan ofisial korps drumband.',
          'Pembersihan total: pencucian harness sabuk, pengelapan bodi drum, dan pelumasan baut tuning.',
          'Penggantian stik drum yang retak dan pengepakan alat musik untuk persiapan libur akhir tahun.',
          'Doa bersama keluarga besar Drumband sekolah dan syukuran atas prestasi yang diraih.'
        ]
      }
    ]
  },

  // =========================================================================
  // 10. PALANG MERAH REMAJA (PMR) & UKS
  // =========================================================================
  pmr: {
    id: 'pmr',
    namaStandard: 'PMR (Palang Merah Remaja)',
    aliases: ['pmr', 'palang merah', 'palang merah remaja', 'uks', 'dokter kecil', 'dokcil', 'pmi'],
    kategori: 'Kepanduan',
    deskripsiProgram:
      'Menumbuhkan jiwa kemanusiaan berlandaskan 7 Prinsip Palang Merah, keterampilan Pertolongan Pertama (PP), perawatan kedaruratan luka/patah tulang, tandu darurat, mitigasi bencana, dan Jumbara.',
    targetCapaian:
      'Siswa menguasai prinsip dasar pertolongan pertama pada kecelakaan sekolah, pembalutan mitela, evakuasi tandu darurat, pola hidup bersih sehat, dan siap berlomba pada ajang Jumbara PMI.',
    sasaranPrestasi: [
      'Pemahaman 7 Prinsip Dasar Palang Merah dan Bulan Sabit Merah Internasional',
      'Keterampilan pembalutan mitela untuk luka perdarahan dan pembidaian patah tulang',
      'Kecepatan pembuatan tandu darurat (emergency stretcher) di bawah 3 menit dengan simpul mati kuat',
      'Meraih juara pada ajang Jumpa Bakti Gembira (Jumbara) PMR Mula tingkat Kota/Kabupaten'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Penerimaan Anggota PMR Mula & Pengenalan 7 Prinsip Palang Merah', months: [7, 8], keterangan: 'Prinsip' },
      { no: 2, kegiatan: 'Pengenalan Isi Kotak P3K Sekolah, Antiseptik & APD Medis', months: [7, 8, 9], keterangan: 'Alat P3K' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan Pertolongan Pertama, Pembalutan & Tandu', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Teknik Pembidaian Patah Tulang & Penanganan Korban Pingsan', months: [9, 10, 11, 1, 2, 3], keterangan: 'Pembidaian' },
      { no: 5, kegiatan: 'Pembuatan Tandu Darurat Menggunakan Bambu & Tali Pramuka/PMR', months: [10, 12, 3, 5], keterangan: 'Tandu' },
      { no: 6, kegiatan: 'Edukasi Kebersihan Diri, Cuci Tangan Higienis & Bakti Lingkungan', months: [11, 4], keterangan: 'PHBS' },
      { no: 7, kegiatan: 'Keikutsertaan Ajang Jumbara (Jumpa Bakti Gembira) PMR Pelajar', months: [10, 2, 5], keterangan: 'Jumbara' },
      { no: 8, kegiatan: 'Pelantikan Korps PMR Mula, Simulasi Bencana & Evaluasi Tahunan', months: [6, 12], keterangan: 'Pelantikan' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Pertolongan Pertama Luka Perdarahan & Pembalutan Mitela Kepala',
        materiMinggu: [
          'Prinsip dasar Pertolongan Pertama: Cek Respon, Hubungi Bantuan, dan Amankan Diri/Korban.',
          'Mengenal jenis luka: Luka lecet, luka sayat, dan teknik membersihkan luka dengan cairan steril/antiseptik.',
          'Praktik teknik pembalutan kain segitiga mitela untuk luka perdarahan di kepala (capitium).',
          'Latihan menenangkan korban cedera dan pencatatan riwayat pertolongan pada kartu korban.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Pembalutan Mitela Lengan, Telapak Tangan & Keseleo Sendi',
        materiMinggu: [
          'Teknik pembalutan mitela untuk cedera sendi pergelangan tangan dan telapak tangan.',
          'Pemasangan gendongan lengan (arm sling) menyangga lengan yang mengalami cedera bahu/siku.',
          'Penanganan cedera terkilir (keseleo) dengan metode R.I.C.E (Rest, Ice, Compression, Elevation).',
          'Simulasi penanganan siswa yang terjatuh di tangga sekolah secara cepat dan tanggap.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Penanganan Korban Pingsan, Syok & Mimisan (Epistaksis)',
        materiMinggu: [
          'Penanganan korban pingsan saat upacara bendera: memindahkan ke tempat teduh, melonggarkan kerah baju.',
          'Teknik posisi pemulihan (recovery position) miring mantap mencegah lidah menyumbat jalan nafas.',
          'Penanganan mimisan (hidung berdarah): posisi menunduk sedikit ke depan dan menekan cuping hidung.',
          'Edukasi tanda-tanda dehidrasi dan penyajian cairan oralit/isotonik pengganti cairan tubuh.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Teknik Pembidaian Patah Tulang (Fraktur) Lengan & Kaki',
        materiMinggu: [
          'Mengenal tanda-tanda patah tulang: nyeri hebat, bengkak, perubahan bentuk, dan sulit digerakkan.',
          'Prinsip pemasangan bidai kayu (spalk): melewati 2 sendi di atas dan di bawah area fraktur.',
          'Praktik pembidaian patah tulang lengan bawah menggunakan 2 bilah bidai dan ikatan mitela rapi.',
          'Pemeriksaan denyut nadi ujung jari (sirkulasi darah) setelah ikatan bidai terpasang.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Pembuatan Tandu Darurat Cepat & Teknik Evakuasi Korban',
        materiMinggu: [
          'Pengenalan bagian tandu: 2 batang bambu panjang 225 cm dan 2 tali tandu panjang 12 meter.',
          'Teknik simpul pangkal dan jaring anyaman tandu darurat (8 anak tandu) yang kokoh dan rapi.',
          'Latihan kecepatan membuat tandu darurat secara berpasangan dalam waktu di bawah 4 menit.',
          'Teknik mengangkat korban ke atas tandu dan mengangkut tandu secara serempak melangkah satu irama.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Pelantikan PMR Mula & Simulasi Penanggulangan Bencana',
        materiMinggu: [
          'Simulasi tanggap darurat gempa bumi sekolah: Drop, Cover, and Hold On serta evakuasi ke titik kumpul.',
          'Ujian uji kemahiran pertolongan pertama perorangan dan pembuatan tandu beregu.',
          'Upacara pelantikan anggota PMR Mula, penyematan pin Palang Merah dan syal slayer kuning PMR.',
          'Pemeriksaan stok obat ruang UKS sekolah, penataan tandu, dan refleksi kegiatan kemanusiaan.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Perekrutan Anggota Baru & Sejarah Palang Merah',
        materiMinggu: [
          'Pentas demonstrasi pertolongan pertama cepat pada masa pengenalan lingkungan sekolah bagi siswa baru.',
          'Mengenal kisah Jean Henry Dunant (Bapak Palang Merah Sedunia) dan pertempuran Solferino.',
          'Mengenal 7 Prinsip Dasar Gerakan: Kemanusiaan, Kesamaan, Kenetralan, Kemandirian, Kesukarelaan, Kesatuan, Kesemestaan.',
          'Pembagian regu piket ruang UKS sekolah mendampingi guru UKS melayani siswa yang sakit.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Petugas Medis Upacara Kemerdekaan & Kesehatan Diri',
        materiMinggu: [
          'Pembagian pos kesehatan dan penyiapan kantong medis darurat untuk Upacara 17 Agustus.',
          'Kesiapsiagaan mengawal jalannya upacara bendera dan evakuasi peserta upacara yang kelelahan.',
          'Edukasi Perilaku Hidup Bersih dan Sehat (PHBS) serta praktik cuci tangan 6 langkah WHO.',
          'Evaluasi kinerja posko kesehatan upacara dan pembersihan peralatan tandu.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Penanganan Luka Bakar Ringan, Sengatan Serangga & Alergi',
        materiMinggu: [
          'Penanganan luka bakar derajat 1 (tersiram air panas): mendinginkan dengan air mengalir selama 15 menit.',
          'Bahaya mitos mengoleskan pasta gigi/mentega pada luka bakar dan edukasi medis yang benar.',
          'Penanganan sengatan lebah/serangga di lingkungan kebun sekolah dan kompres dingin.',
          'Simulasi penanganan reaksi alergi gatal-gatal pada siswa saat kegiatan luar ruangan.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Persiapan Lomba Jumpa Bakti Gembira (Jumbara) PMR',
        materiMinggu: [
          'Pendalaman materi traveling Jumbara: Pos Kepalangmerahan, Pos Pertolongan Pertama, Pos Remaja Sehat Peduli Sesama.',
          'Drill kasus penanganan korban ganda (2 korban cedera sekaligus: 1 patah tulang, 1 pingsan).',
          'Latihan unjuk bakat seni kemanusiaan dan presentasi poster edukasi donor darah sukarela.',
          'Simulasi pos ujian traveling Jumbara dengan batas waktu pengerjaan 10 menit per pos.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Partisipasi Ajang Jumbara PMI & Bakti Sosial',
        materiMinggu: [
          'Keikutsertaan tim PMR sekolah dalam perkemahan Jumbara PMR Mula tingkat Kabupaten/Kota.',
          'Aksi bakti sosial membagikan paket kebersihan gigi dan sabun cuci tangan kepada masyarakat sekitar.',
          'Evaluasi pencapaian piala penghargaan Jumbara dan sharing pengalaman bersama kontingen lain.',
          'Pembuatan laporan pertanggungjawaban kegiatan Jumbara kepada pihak pimpinan sekolah.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Inventarisasi Obat UKS, Evaluasi Tahunan & Apresiasi Relawan',
        materiMinggu: [
          'Pemeriksaan masa kedaluwarsa (expired date) obat-obatan di lemari UKS dan pembuangan obat rusak.',
          'Rekapitulasi catatan buku kunjungan pasien UKS sekolah selama satu tahun ajaran.',
          'Pemberian piagam penghargaan Relawan Cilik Teladan kepada anggota PMR paling berdedikasi.',
          'Sterilisasi kotak P3K, pencucian mitela dan spalk, serta doa bersama penutup tahun.'
        ]
      }
    ]
  },

  // =========================================================================
  // 11. TAEKWONDO
  // =========================================================================
  taekwondo: {
    id: 'taekwondo',
    namaStandard: 'Taekwondo',
    aliases: ['taekwondo', 'tae kwon do', 'tkd', 'kyorugi', 'poomsae', 'beladiri korea'],
    kategori: 'Olahraga',
    deskripsiProgram:
      'Membina disiplin kesatria, fleksibilitas tendangan tinggi, penguasaan jurus Poomsae Taegeuk 1-8, ketangkasan pertarungan Kyorugi beregu/perorangan, dan ujian kenaikan sabuk geup resmi Taekwondo Indonesia.',
    targetCapaian:
      'Siswa menguasai kuda-kuda Sogi, pukulan Jireugi, tangkisan Makki, tendangan Ap Chagi/Dollyo Chagi/Yeop Chagi, Poomsae Taegeuk, dan siap berprestasi dalam kejuaraan O2SN serta Kejurda.',
    sasaranPrestasi: [
      'Fleksibilitas kelenturan kaki (split paha) dan kecepatan tendangan kombinasi',
      'Penguasaan jurus Poomsae Taegeuk 1 s.d. 4 dengan hentakan tenaga dan ketegasan gerak',
      'Penguasaan teknik tanding Kyorugi: tendangan memutar, serangan balik counter, dan timing poin',
      'Meraih medali emas dalam Kejurda Taekwondo Pelajar dan seleksi O2SN'
    ],
    matriksTahunan: [
      { no: 1, kegiatan: 'Penerimaan Anggota Baru & Penanaman Janji Taekwondo Indonesia', months: [7, 8], keterangan: 'Janji TKD' },
      { no: 2, kegiatan: 'Peregangan Kelenturan Otot Kaki, Kuda-Kuda Sogi & Pukulan Jireugi', months: [7, 8, 9], keterangan: 'Dasar' },
      { no: 3, kegiatan: 'Latihan Rutin Mingguan Tendangan (Chagi), Poomsae & Kyorugi', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], keterangan: 'Rutin' },
      { no: 4, kegiatan: 'Pendalaman Jurus Poomsae Taegeuk (Il Jang, Ee Jang, Sam Jang)', months: [9, 10, 11, 1, 2, 3], keterangan: 'Poomsae' },
      { no: 5, kegiatan: 'Simulasi Pertarungan Kyorugi Menggunakan Headguard & Body Armor', months: [10, 12, 3, 5], keterangan: 'Kyorugi' },
      { no: 6, kegiatan: 'Uji Kenaikan Tingkat Sabuk (UKT) Geup Pengda Taekwondo Indonesia', months: [11, 4], keterangan: 'UKT' },
      { no: 7, kegiatan: 'Keikutsertaan Kejuaraan Taekwondo Pelajar & Seleksi O2SN', months: [10, 2, 5], keterangan: 'Kejuaraan' },
      { no: 8, kegiatan: 'Evaluasi Tahunan, Rekapitulasi Medali & Tradisi Dojang Taekwondo', months: [6, 12], keterangan: 'Evaluasi' }
    ],
    kurikulum12Bulan: [
      {
        monthIndex: 0,
        monthName: 'Januari',
        fokusBulanan: 'Kuda-Kuda Sogi & Tangkisan Dasar Makki',
        materiMinggu: [
          'Penguatan kuda-kuda Ap Sogi (kuda-kuda jalan), Ap Koobi (kuda-kuda panjang), dan Dwit Koobi (kuda-kuda L).',
          'Latihan tangkisan bawah Arae Makki membendung serangan tendangan rendah.',
          'Latihan tangkisan tengah Momtong An Makki dan Momtong Bakkat Makki melindungi badan.',
          'Latihan tangkisan atas Olgul Makki melindungi kepala dari serangan pukulan/tendangan atas.'
        ]
      },
      {
        monthIndex: 1,
        monthName: 'Februari',
        fokusBulanan: 'Variasi Tendangan Dasar: Ap Chagi & Dollyo Chagi',
        materiMinggu: [
          'Teknik tendangan depan Ap Chagi menusuk ulu hati dengan perkenaan bantalan telapak kaki (apchuk).',
          'Teknik tendangan melingkar Dollyo Chagi menyasar pelindung dada dengan perkenaan punggung kaki (baldeung).',
          'Drill menendang target kicking target berulang 20 kali kaki kanan dan kaki kiri secara bergantian.',
          'Kombinasi langkah maju (step forward) dilanjutkan eksekusi tendangan Dollyo Chagi cepat.'
        ]
      },
      {
        monthIndex: 2,
        monthName: 'Maret',
        fokusBulanan: 'Pendalaman Jurus Poomsae Taegeuk 1 (Il Jang) & 2 (Ee Jang)',
        materiMinggu: [
          'Hafalan dan ketegasan gerak Poomsae Taegeuk Il Jang (melambangkan elemen Keon / Langit).',
          'Pendalaman Poomsae Taegeuk Ee Jang (melambangkan elemen Tae / Danau) fokus pada pukulan Olgul Jireugi.',
          'Latihan irama hentakan tenaga saat transisi dari tangkisan Arae Makki ke pukulan Momtong Baro Jireugi.',
          'Uji peragaan jurus perorangan di depan sabeum (pelatih) dan pembenahan arah pandangan mata.'
        ]
      },
      {
        monthIndex: 3,
        monthName: 'April',
        fokusBulanan: 'Tendangan Samping Yeop Chagi & Tendangan Cangkul Dwi Chagi',
        materiMinggu: [
          'Teknik tendangan samping Yeop Chagi mendorong dengan pisau telapak kaki (balnal).',
          'Teknik tendangan mencangkul Naeryo Chagi (Axe Kick) dari atas menjatuhkan tumit ke kepala lawan.',
          'Latihan peregangan paha split samping di matras dojang untuk mencapai ketinggian tendangan kepala.',
          'Simulasi kombinasi 2 tendangan di udara: Dollyo Chagi disusul Naeryo Chagi mengejutkan.'
        ]
      },
      {
        monthIndex: 4,
        monthName: 'Mei',
        fokusBulanan: 'Aturan Tanding Kyorugi & Simulasi Sparring Lengkap',
        materiMinggu: [
          'Sosialisasi aturan kompetisi WT (World Taekwondo): Poin tendangan badan (2), tendangan kepala (3/4).',
          'Pemasangan perlengkapan tanding: Hogu (pelindung dada), pelindung tulang kering, sarung tangan, dan gumshield.',
          'Drill taktik melangkah menghindar (step back) dan melancarkan serangan balik counter-attack kilat.',
          'Simulasi pertarungan 3 ronde x 1.5 menit menerapkan sportivitas dan penghormatan Charyeot-Kyongnye.'
        ]
      },
      {
        monthIndex: 5,
        monthName: 'Juni',
        fokusBulanan: 'Ujian Kenaikan Tingkat (UKT) Sabuk Geup & Evaluasi',
        materiMinggu: [
          'Ujian fisik jasmani: push-up buku jari (knuckle push-up), sit-up, dan kelenturan tubuh.',
          'Ujian peragaan Poomsae wajib sesuai tingkatan sabuk (Putih, Kuning, Hijau, Biru, Merah).',
          'Ujian pemecahan papan kayu (Kyukpa) menggunakan teknik tendangan Ap Chagi atau Yeop Chagi.',
          'Upacara pelepasan sabuk lama dan penyematan sabuk baru resmi Pengcab Taekwondo Indonesia.'
        ]
      },
      {
        monthIndex: 6,
        monthName: 'Juli',
        fokusBulanan: 'Perekrutan Taekwondoin Baru & Tradisi Dojang',
        materiMinggu: [
          'Atraksi pemecahan papan dan peragaan poomsae artistik menyambut siswa baru sekolah.',
          'Pendaftaran calon taekwondoin pemula dan pembagian seragam dobok putih bersih.',
          'Pengenalan etika Dojang: membungkuk hormat saat masuk arena, merapikan dobok, dan menghormati senior.',
          'Pengenalan Janji Taekwondo Indonesia dan pembiasaan teriakan semangat (Kihap) yang menggema.'
        ]
      },
      {
        monthIndex: 7,
        monthName: 'Agustus',
        fokusBulanan: 'Latihan Fisik Kelincahan Kaki & Semangat Kemerdekaan',
        materiMinggu: [
          'Latihan kelincahan langkah kaki (footwork stepping): Step switch, fast step, dan slide step.',
          'Latihan lompat tali skipping berkecepatan tinggi membangun daya tahan tungkai kaki.',
          'Lomba tendangan tercepat 30 detik pada target pad menyemarakkan peringatan HUT RI.',
          'Peregangan komprehensif, latihan pembentukan otot perut, dan evaluasi ketertiban dojang.'
        ]
      },
      {
        monthIndex: 8,
        monthName: 'September',
        fokusBulanan: 'Pendalaman Poomsae Taegeuk 3 (Sam Jang) & 4 (Sa Jang)',
        materiMinggu: [
          'Hafalan rangkaian gerak Taegeuk Sam Jang (melambangkan elemen Ri / Api) melatih ketangkasan ganda.',
          'Pendalaman Taegeuk Sa Jang (melambangkan elemen Jin / Petir) teknik Sonnal Makki (tangkisan pisau tangan).',
          'Latihan keseimbangan saat melakukan tendangan beruntun tanpa menurunkan kaki ke lantai.',
          'Uji coba peragaan poomsae berpasangan dengan keseragaman tempo dan kekuatan kihap.'
        ]
      },
      {
        monthIndex: 9,
        monthName: 'Oktober',
        fokusBulanan: 'Tendangan Putar Belakang Dwi Huryeo Chagi & Serangan Udara',
        materiMinggu: [
          'Teknik memutar badan 360 derajat untuk tendangan memutar belakang Dwi Huryeo Chagi (Spin Hook Kick).',
          'Teknik tendangan terbang lompat di udara Twimyo Ap Chagi melewati rintangan.',
          'Drill sasaran target bergerak melatih akurasi pandangan mata saat badan berputar di udara.',
          'Simulasi pertahanan saat lawan melancarkan serangan beruntun bertubi-tubi.'
        ]
      },
      {
        monthIndex: 10,
        monthName: 'November',
        fokusBulanan: 'Persiapan Kejuaraan Taekwondo Pelajar & Try Out Antar-Club',
        materiMinggu: [
          'Try out latihan bersama (sparring partner) menghadapi atlet dari dojang taekwondo mitra.',
          'Evaluasi video rekaman sparring: pembenahan kebiasaan menurunkan tangan pelindung wajah.',
          'Latihan strategi mencuri poin di detik-detik akhir ronde penentuan (Golden Point Round).',
          'Partisipasi dalam Kejuaraan Taekwondo Pelajar Daerah merebut medali kejuaraan.'
        ]
      },
      {
        monthIndex: 11,
        monthName: 'Desember',
        fokusBulanan: 'Rekapitulasi Prestasi Tahunan, Evaluasi & Tradisi Akhir Tahun',
        materiMinggu: [
          'Evaluasi rekapitulasi perolehan medali kejuaraan dan rekap absensi latihan taekwondoin.',
          'Pemberian piagam penghargaan Taekwondoin Terbaik dan Atlet Paling Berdisiplin tahun ajaran.',
          'Pembersihan matras dojang, penataan pelindung hogu, kicking pad, dan pembersihan ruangan.',
          'Latihan penutupan akhir tahun bersama seluruh sabuk dan doa syukur menyambut tahun baru.'
        ]
      }
    ]
  }
};

/**
 * Mencari profil PROTA yang paling cocok berdasarkan nama eskul atau kategori
 */
export function findEskulProtaProfile(eskulName: string, eskulKategori?: string): EskulProtaProfile | null {
  const cleanName = (eskulName || '').toLowerCase().trim();

  // 1. Cek langsung berdasarkan ID
  if (ALL_ESKUL_PROTA_PROFILES[cleanName]) {
    return ALL_ESKUL_PROTA_PROFILES[cleanName];
  }

  // 2. Cek berdasarkan aliases
  for (const key of Object.keys(ALL_ESKUL_PROTA_PROFILES)) {
    const profile = ALL_ESKUL_PROTA_PROFILES[key];
    if (profile.aliases.some((alias) => cleanName.includes(alias.toLowerCase()))) {
      return profile;
    }
  }

  // 3. Fallback berdasarkan Kategori
  const kat = (eskulKategori || '').toLowerCase();
  if (kat.includes('olahraga')) {
    if (cleanName.includes('bola') || cleanName.includes('futsal') || cleanName.includes('sepak')) return ALL_ESKUL_PROTA_PROFILES.futsal;
    if (cleanName.includes('tangkis') || cleanName.includes('badminton')) return ALL_ESKUL_PROTA_PROFILES.bulutangkis;
    if (cleanName.includes('silat') || cleanName.includes('bela diri') || cleanName.includes('martial')) return ALL_ESKUL_PROTA_PROFILES.pencak_silat;
    if (cleanName.includes('voli') || cleanName.includes('volley')) return ALL_ESKUL_PROTA_PROFILES.voli;
    if (cleanName.includes('catur') || cleanName.includes('chess')) return ALL_ESKUL_PROTA_PROFILES.catur;
    if (cleanName.includes('taekwondo') || cleanName.includes('karate')) return ALL_ESKUL_PROTA_PROFILES.taekwondo;
    return null;
  }

  if (kat.includes('seni')) {
    if (cleanName.includes('drum') || cleanName.includes('marching') || cleanName.includes('musik')) return ALL_ESKUL_PROTA_PROFILES.drumband;
    if (cleanName.includes('qasidah') || cleanName.includes('marawis') || cleanName.includes('rebana') || cleanName.includes('hadroh')) return ALL_ESKUL_PROTA_PROFILES.qasidah;
    return null;
  }

  if (kat.includes('agama') || kat.includes('keagamaan')) {
    if (cleanName.includes('tahfiz') || cleanName.includes('btq') || cleanName.includes('qur') || cleanName.includes('ngaji')) return ALL_ESKUL_PROTA_PROFILES.btq;
    return null;
  }

  if (kat.includes('pandu') || kat.includes('kepanduan')) {
    if (cleanName.includes('paskibra') || cleanName.includes('baris')) return ALL_ESKUL_PROTA_PROFILES.paskibra;
    if (cleanName.includes('pmr') || cleanName.includes('merah') || cleanName.includes('uks')) return ALL_ESKUL_PROTA_PROFILES.pmr;
    return null;
  }

  return null;
}
