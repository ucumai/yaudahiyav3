import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

import fs from 'fs';
import { execSync } from 'child_process';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini API client (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Extract substantive text/material from PDF (including scanned/image/presentation slides)
app.post('/api/gemini/extract-pdf-material', async (req, res) => {
  const { fileBase64, fileName } = req.body || {};
  if (!fileBase64) {
    return res.status(400).json({ error: 'Data berkas PDF (base64) diperlukan.' });
  }

  const uid = `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpPdf = `/tmp/${uid}.pdf`;
  const pagePattern = `/tmp/${uid}_page_%d.jpg`;
  const generatedFiles: string[] = [tmpPdf];

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    fs.writeFileSync(tmpPdf, buffer);

    // Render PDF pages to lightweight JPEGs using Ghostscript (fast & reliable)
    try {
      execSync(`gs -dNOPAUSE -dBATCH -sDEVICE=jpeg -r100 -sOutputFile=${pagePattern} "${tmpPdf}"`, {
        timeout: 10000,
        stdio: 'pipe',
      });
    } catch (gsErr: any) {
      console.warn('Ghostscript page rasterization error:', gsErr?.message);
    }

    // Find all rendered page images
    const pageImages: string[] = [];
    for (let p = 1; p <= 15; p++) {
      const pPath = `/tmp/${uid}_page_${p}.jpg`;
      if (fs.existsSync(pPath)) {
        pageImages.push(pPath);
        generatedFiles.push(pPath);
      } else {
        break;
      }
    }

    const parts: any[] = [
      {
        text: 'Anda adalah asisten cerdas dinas pendidikan. Ekstrak seluruh teks dan substansi materi dari setiap slide/halaman dokumen ini secara lengkap, terstruktur, dan akurat dalam bahasa Indonesia. Tuliskan judul, agenda, poin bahasan, dan ringkasan isi per slide secara berurutan:',
      },
    ];

    if (pageImages.length > 0) {
      for (const imgPath of pageImages) {
        const imgBuf = fs.readFileSync(imgPath);
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imgBuf.toString('base64'),
          },
        });
      }
    } else {
      // Direct PDF inlineData fallback
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: fileBase64,
        },
      });
    }

    // Call Gemini (prefer fast gemini-3.1-flash-lite, fallback to gemini-3.8-flash)
    let extractedText = '';
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: parts,
      });
      extractedText = resp.text || '';
    } catch (apiErr: any) {
      console.warn('gemini-3.1-flash-lite failed, falling back to gemini-3.8-flash:', apiErr?.message);
      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
      });
      extractedText = resp.text || '';
    }

    return res.json({
      success: true,
      text: extractedText.trim(),
      pageCount: pageImages.length || 1,
    });
  } catch (err: any) {
    console.error('Error in extract-pdf-material:', err);
    return res.status(500).json({
      error: `Gagal membaca materi berkas: ${err?.message || 'Kesalahan pemrosesan berkas.'}`,
    });
  } finally {
    // Clean up temporary files
    for (const f of generatedFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // ignore cleanup error
      }
    }
  }
});

// Helper: Intelligent Kedinasan Notula Synthesizer (Reliable Fallback)
function synthesizeNotulaFromMaterial(
  cleanMaterial: string,
  cleanKegiatan: string,
  cleanMateri: string,
  cleanAgenda: string,
  cleanSekolah: string
) {
  const pembukaan = `Kegiatan ${cleanKegiatan} di lingkungan ${cleanSekolah} dibuka secara resmi dengan pembacaan doa bersama dan pengantar pembinaan dari moderator. Kepala Sekolah dan tim penggerak Komunitas Belajar (Kombel) menegaskan pentingnya refleksi berkala, kolaborasi antarpendidik, dan penyelarasan kurikulum dalam rangka meningkatkan mutu pembelajaran peserta didik secara berkelanjutan.`;

  // Extract meaningful lines from uploaded material
  const meaningfulLines = cleanMaterial
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 5 && !/halaman\s+\d+/i.test(l) && !/^(bku|rkas|sdn|nomor)/i.test(l));

  const keyPoints = meaningfulLines.slice(0, 5);
  const keySubstanceText = keyPoints.length > 0
    ? keyPoints.map((p) => p.replace(/^[0-9]+[.)\-]\s*/, '').trim()).filter(Boolean).join(', ')
    : 'penguatan kompetensi pedagogis, analisis kebutuhan belajar murid, dan penyusunan instrumen evaluasi kontekstual';

  // ATURAN USER: isi penyampaian materi buatkan 1 paragraf saja, JANGAN ADA NUMBERING
  const isiMateri = `Dalam sesi pemaparan materi mengenai ${cleanMateri}, narasumber menguraikan secara mendalam materi pokok yang mencakup ${keySubstanceText}, yang dilanjutkan dengan diskusi reflektif aktif antarguru untuk memetakan kendala faktual pembelajaran di kelas dan menyepakati penerapan metode ajar yang adaptif, berpusat pada peserta didik, serta berorientasi pada peningkatan capaian belajar di lingkungan ${cleanSekolah}.`;

  const penutup = `Pertemuan Komunitas Belajar (Kombel) diakhiri dengan perumusan Rencana Tindak Lanjut (RTL) yang wajib dipraktikkan langsung di kelas oleh seluruh pendidik. Seluruh peserta berkomitmen membawa bukti karya dan refleksi siswa pada agenda pembinaan berikutnya. Kegiatan resmi ditutup dengan doa bersama.`;

  return { pembukaan, isiMateri, penutup };
}

// Helper: Ensure text is strictly one cohesive paragraph without any numbering
function ensureSingleParagraphNoNumbering(text: string): string {
  if (!text) return '';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^([0-9]+[.)\-]|[a-zA-Z][.)\-]|[\u2022\u2023\u25E6\u2043\u2219\-\*•])\s*/g, '').trim())
    .filter(Boolean);

  const joined = lines.join(' ');
  return joined
    .replace(/(^|\s)[0-9]+[.)\-]\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Helper: Synthesize complete Kombel Training Material and Official Notula (Fallback & Reliable Generator)
function synthesizeKombelMaterialAndNotula(
  judulInput: string,
  fokus: string,
  sasaran: string,
  namaSekolah: string,
  namaKepsek: string,
  narasumber: string,
  tanggal: string
) {
  const cleanJudul = judulInput?.trim() || 'Peningkatan Kompetensi Pendidik & Penguatan Komunitas Belajar';
  const cleanSekolah = namaSekolah?.trim() || 'Satuan Pendidikan';
  const cleanKepsek = namaKepsek?.trim() || 'Kepala Sekolah';
  const cleanNarasumber = narasumber?.trim() || 'Tim Penggerak Kombel';
  const cleanSasaran = sasaran?.trim() || 'Dewan Guru dan Tenaga Kependidikan';
  const cleanFokus = fokus?.trim() || 'Implementasi Kurikulum Merdeka & Praktik Baik';

  const judulResmi = cleanJudul.length > 10 ? cleanJudul : `Pekan Pembinaan: ${cleanJudul}`;
  const deskripsi = `Modul panduan dan materi penguatan kompetensi dalam Komunitas Belajar (Kombel) ${cleanSekolah} berfokus pada ${cleanJudul} guna meningkatkan mutu layanan pembelajaran secara berkelanjutan.`;

  const tujuan = [
    `Memperdalam pemahaman konseptual dan implementatif pendidik mengenai ${cleanJudul}.`,
    `Mengidentifikasi tantangan faktual di kelas dan merumuskan strategi pembelajaran yang adaptif bagi peserta didik.`,
    `Membangun budaya kolaborasi antarguru melalui berbagi praktik baik (best practices) di lingkungan ${cleanSekolah}.`,
    `Menyusun rencana aksi nyata dan tindak lanjut berbasis asesmen diagnostik dan refleksi kelas.`
  ];

  const materiLengkap = `
# PANDUAN & MATERI KOMUNITAS BELAJAR (KOMBEL)
## ${judulResmi.toUpperCase()}
**Satuan Pendidikan:** ${cleanSekolah}  
**Narasumber / Fasilitator:** ${cleanNarasumber}  
**Sasaran Peserta:** ${cleanSasaran}  
**Fokus Utama:** ${cleanFokus}  

---

### BAB I. PENDAHULUAN & URGENSI KEGIATAN
Komunitas Belajar (Kombel) merupakan wadah strategis bagi para pendidik untuk saling belajar, berefleksi, dan berkolaborasi dalam menyelesaikan permasalahan pembelajaran nyata di kelas. Pembahasan mengenai "${judulResmi}" diselenggarakan atas dasar kebutuhan peningkatan kapasitas guru dalam mengadaptasi kurikulum yang berpusat pada peserta didik. Di tengah dinamika transformasi pendidikan saat ini, guru dituntut tidak hanya menguasai konten keilmuan, tetapi juga memiliki kepekaan pedagogis dalam memfasilitasi keragaman gaya belajar, minat, dan kesiapan murid secara inklusif.

### BAB II. LANDASAN REGULASI & PRINSIP PEDAGOGIS
1. **Regulasi Kurikulum:** Permendikbudristek tentang Standar Proses dan Kurikulum Merdeka yang menekankan kemerdekaan berpikir, pembelajaran bermakna, dan iklim sekolah yang aman, inklusif, dan membahagiakan.
2. **Prinsip Pembelajaran Berdiferensiasi:** Guru memetakan profil belajar siswa berdasarkan kesiapan belajar (readiness), minat (interest), dan profil belajar (learning profile) melalui asesmen awal/diagnostik yang objektif.
3. **Pemanfaatan Ekosistem Digital:** Mengintegrasikan platform edukasi nasional (PMM, akun Belajar.id) dan teknologi cerdas guna mendukung diversifikasi sumber dan media ajar interaktif.

### BAB III. POKOK SUBSTANSI & PEMBAHASAN MATERI INTI
1. **Pemetaan Kebutuhan Belajar:** Melakukan identifikasi kendala siswa secara berkala menggunakan instrumen asesmen formatif sederhana yang langsung dapat ditindaklanjuti.
2. **Diferensiasi Konten, Proses, dan Produk:**
   - *Diferensiasi Konten:* Menyediakan bahan belajar berjenjang (visual, audio, kinestetik) agar seluruh siswa dapat mengakses materi sesuai tingkat kemampuannya.
   - *Diferensiasi Proses:* Menerapkan variasi scaffolding, kerja kelompok berjenjang, dan pendampingan individu untuk kelompok yang membutuhkan bimbingan intensif.
   - *Diferensiasi Produk:* Memberikan keleluasaan bagi murid untuk mendemonstrasikan pemahaman materi lewat berbagai karya otentik (infografis, presentasi lisan, model fisik, atau video singkat).
3. **Pengelolaan Budaya Positif di Kelas:** Menumbuhkan kesepakatan kelas bersama, komunikasi asertif, dan disiplin positif yang memotivasi motivasi intrinsik anak.

### BAB IV. STRATEGI IMPLEMENTASI & AKSI NYATA DI SEKOLAH
Untuk merealisasikan materi pembinaan ini di kelas, setiap pendidik di ${cleanSekolah} diarahkan menerapkan tahapan:
- **Perencanaan (Plan):** Merevisi modul ajar mingguan dengan menyisipkan rubrik asesmen formatif dan rencana diferensiasi yang terukur.
- **Pelaksanaan (Do):** Mempraktikkan skenario pembelajaran aktif berbasis inquiry, project-based learning (PjBL), atau problem solving kontekstual.
- **Pengamatan & Refleksi (Check/Reflect):** Mengobservasi keterlibatan murid dan mencatat umpan balik sebagai bahan perbaikan siklus berikutnya.

### BAB V. LEMBAR REFLEKSI & RENCANA TINDAK LANJUT (RTL)
- *Refleksi Pribadi Guru:* Hal baru apa yang paling mendesak untuk segera diterapkan di kelas saya setelah pembinaan ini?
- *Rencana Aksi Kolaboratif:* Penjadwalan rekan sejawat (peer observation) untuk saling memberikan umpan balik konstruktif terhadap praktik ajar di kelas.
- *Komitmen Diseminasi:* Menghasilkan minimal 1 bukti karya aksi nyata yang dipublikasikan pada Platform Merdeka Mengajar (PMM) atau didokumentasikan dalam portofolio sekolah.
`.trim();

  // ATURAN KEDINASAN: 1 paragraf utuh narasi, DILARANG KERAS ADA NUMBERING
  const isiNotula = `Dalam pemaparan materi pembinaan Komunitas Belajar bertema ${judulResmi}, ${cleanNarasumber} menguraikan secara mendalam urgensi penguatan kompetensi pendidik dalam mengimplementasikan pembelajaran berdiferensiasi dan asesmen diagnostik yang adaptif, dilanjutkan dengan diskusi reflektif antarguru ${cleanSekolah} untuk membedah kendala faktual peserta didik di setiap jenjang kelas serta menyepakati strategi penyusunan modul ajar bermakna, diversifikasi sumber belajar interaktif, dan kolaborasi observasi rekan sejawat guna menjamin peningkatan capaian belajar murid yang berkarakter Profil Pelajar Pancasila secara berkesinambungan.`;

  const pembukaanNotula = `Kegiatan Pekan Pembinaan Rutin dan Komunitas Belajar (Kombel) di lingkungan ${cleanSekolah} dibuka secara khidmat dengan pembacaan doa bersama yang dipimpin oleh pembawa acara. Kepala Sekolah ${cleanSekolah}, ${cleanKepsek}, dalam sambutan pembukaannya menegaskan komitmen seluruh dewan guru untuk senantiasa meningkatkan profesionalisme pendidik dan menyelaraskan iklim pembelajaran kelas dengan tuntutan kurikulum terkini demi mewujudkan ekosistem sekolah yang unggul dan berpihak pada murid.`;

  const penutupNotula = `Pertemuan Komunitas Belajar (Kombel) ditutup dengan penegasan komitmen bersama seluruh tenaga pendidik dalam mengimplementasikan Rencana Tindak Lanjut (RTL) di kelas masing-masing, pengumpulan laporan evaluasi pekanan, dan doa syukur atas kelancaran rangkaian diseminasi pembinaan hari ini.`;

  return {
    judulResmi,
    deskripsi,
    tujuan,
    materiLengkap,
    ringkasanMateri: `Materi pembinaan "${judulResmi}" memuat pedoman implementatif diferensiasi pembelajaran, asesmen kontekstual, pemanfaatan ekosistem digital, serta Rencana Tindak Lanjut (RTL) kolaboratif di ${cleanSekolah}.`,
    notula: {
      pembukaan: pembukaanNotula,
      isiMateri: isiNotula,
      penutup: penutupNotula,
    },
  };
}

// Endpoint: AI-Powered Complete Material & Aligned Notula Generator from Title/Topic
app.post('/api/gemini/generate-kombel-materi', async (req, res) => {
  const { judul, fokus, sasaran, namaSekolah, namaKepsek, narasumber, tanggal, waktu, tempat } = req.body || {};

  const cleanJudul = typeof judul === 'string' && judul.trim() ? judul.trim() : '';
  if (!cleanJudul || cleanJudul.length < 3) {
    return res.status(400).json({
      error: 'Silakan masukkan judul atau topik pembinaan Komunitas Belajar (Kombel) yang diinginkan.',
    });
  }

  const cleanSekolah = typeof namaSekolah === 'string' && namaSekolah.trim() ? namaSekolah.trim() : 'Satuan Pendidikan';
  const cleanKepsek = typeof namaKepsek === 'string' && namaKepsek.trim() ? namaKepsek.trim() : 'Kepala Sekolah';
  const cleanNarasumber = typeof narasumber === 'string' && narasumber.trim() ? narasumber.trim() : 'Narasumber / Fasilitator Kombel';
  const cleanSasaran = typeof sasaran === 'string' && sasaran.trim() ? sasaran.trim() : 'Dewan Guru dan Tenaga Kependidikan';
  const cleanFokus = typeof fokus === 'string' && fokus.trim() ? fokus.trim() : 'Kurikulum Merdeka & Pedagogik Terapan';

  // If Gemini API is not configured, return high-quality synthesized response
  if (!process.env.GEMINI_API_KEY) {
    const syn = synthesizeKombelMaterialAndNotula(cleanJudul, cleanFokus, cleanSasaran, cleanSekolah, cleanKepsek, cleanNarasumber, tanggal || '');
    return res.json({
      success: true,
      isFallback: true,
      ...syn,
    });
  }

  const prompt = `Anda adalah instruktur utama dinas pendidikan nasional, pengembang kurikulum, dan fasilitator Komunitas Belajar (Kombel) Guru bersertifikat.
Tugas Anda adalah menciptakan MODUL MATERI PEMBINAAN KOMBEL LENGKAP beserta DOKUMEN NOTULA RAPAT KEDINASAN RESMI berdasarkan judul/topik yang diinputkan pengguna.

Informasi Konteks Satuan Pendidikan:
- Topik / Judul Input Guru: "${cleanJudul}"
- Fokus Bidang: "${cleanFokus}"
- Satuan Pendidikan: "${cleanSekolah}"
- Kepala Sekolah: "${cleanKepsek}"
- Narasumber / Pemateri: "${cleanNarasumber}"
- Sasaran Peserta: "${cleanSasaran}"

Instruksi Output (WAJIB DIPENUHI):
1. "judulResmi": Judul resmi materi kedinasan yang baku, berbobot, dan menarik (mis. "Peningkatan Kompetensi Guru dalam ...").
2. "deskripsi": Ringkasan eksekutif 2-3 kalimat mengenai materi ini.
3. "tujuan": Array berisi 3-4 butir tujuan terukur pembinaan guru.
4. "materiLengkap": Materi pembelajaran Komunitas Belajar (Kombel) LENGKAP dan MENDALAM dalam format teks berstruktur (menggunakan judul bab BAB I s/d BAB V yang memuat: Pendahuluan & Urgensi, Landasan Teori & Kurikulum Merdeka, Pokok Pembahasan Inti Praktis, Panduan Implementasi Aksi Nyata Guru di Kelas, serta Lembar Diskusi Refleksi & RTL). Tuliskan secara berbobot dan panjang agar dapat diunduh sebagai modul pelatihan resmi guru sekolah.
5. "ringkasanMateri": Ringkasan 1 paragraf substansi materi.
6. "notula":
   - "pembukaan": Paragraf pembukaan rapat resmi kedinasan (pembacaan doa, pengantar moderator/kepala sekolah, urgensi kegiatan).
   - "isiMateri": Uraian pokok penyampaian materi narasumber dan dinamika pembahasan guru dalam TEPAT SATU PARAGRAF UTUH (single paragraph), mengalir naratif, formal. DILARANG KERAS MENGGUNAKAN NUMBERING ATAU BULLET POINTS SAMA SEKALI (JANGAN ADA 1., 2., a., b., dsb.).
   - "penutup": Kesimpulan akhir, kesepakatan bersama, dan Rencana Tindak Lanjut (RTL) peserta yang wajib dipraktikkan di kelas.`;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), 15000)
    );

    const generatePromise = (async () => {
      // Use gemini-3.8-flash for high quality generation
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah instruktur ahli dinas pendidikan dan fasilitator Komunitas Belajar (Kombel). Hasilkan materi pembinaan guru yang lengkap, kaya substansi akademis dan praktis, serta susun notula kedinasan yang formal dan berbobot. Pada notula.isiMateri, WAJIB tepat 1 paragraf narasi mengalir tanpa penomoran/numbering atau bullet points sama sekali.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              judulResmi: {
                type: Type.STRING,
                description: 'Judul resmi materi kedinasan yang baku dan lengkap.',
              },
              deskripsi: {
                type: Type.STRING,
                description: 'Deskripsi singkat dan urgensi materi pembinaan.',
              },
              tujuan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Daftar butir tujuan pembinaan guru.',
              },
              materiLengkap: {
                type: Type.STRING,
                description: 'Naskah materi pembinaan lengkap terbagi dalam 5 bab terstruktur.',
              },
              ringkasanMateri: {
                type: Type.STRING,
                description: 'Ringkasan singkat substansi materi.',
              },
              notula: {
                type: Type.OBJECT,
                properties: {
                  pembukaan: {
                    type: Type.STRING,
                    description: 'Teks pembukaan resmi notula rapat kedinasan.',
                  },
                  isiMateri: {
                    type: Type.STRING,
                    description: 'Uraian pokok materi dalam tepat 1 paragraf narasi tanpa numbering atau bullet points.',
                  },
                  penutup: {
                    type: Type.STRING,
                    description: 'Kesimpulan dan rencana tindak lanjut (RTL) penutup notula.',
                  },
                },
                required: ['pembukaan', 'isiMateri', 'penutup'],
              },
            },
            required: ['judulResmi', 'deskripsi', 'tujuan', 'materiLengkap', 'ringkasanMateri', 'notula'],
          },
        },
      });
    })();

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const jsonStr = (response.text ?? '{}').trim();
    const result = JSON.parse(jsonStr);

    const safeIsiMateri = ensureSingleParagraphNoNumbering(result.notula?.isiMateri || '');

    return res.json({
      success: true,
      judulResmi: result.judulResmi || cleanJudul,
      deskripsi: result.deskripsi || '',
      tujuan: Array.isArray(result.tujuan) ? result.tujuan : [],
      materiLengkap: result.materiLengkap || '',
      ringkasanMateri: result.ringkasanMateri || '',
      notula: {
        pembukaan: result.notula?.pembukaan || '',
        isiMateri: safeIsiMateri,
        penutup: result.notula?.penutup || '',
      },
    });
  } catch (error: any) {
    console.warn('Gemini generate-kombel-materi fallback to synthesizer:', error?.message);
    const syn = synthesizeKombelMaterialAndNotula(cleanJudul, cleanFokus, cleanSasaran, cleanSekolah, cleanKepsek, cleanNarasumber, tanggal || '');
    return res.json({
      success: true,
      isFallback: true,
      ...syn,
    });
  }
});

// Endpoint: AI-Powered Notula Generator for Komunitas Belajar (Kombel) / Pekan Pembinaan
app.post('/api/gemini/generate-notula', async (req, res) => {
  const { materialText, kegiatan, materi, agenda, namaSekolah } = req.body || {};

  const rawMaterial = typeof materialText === 'string' ? materialText.trim() : '';
  // Check substantive text: strip page headers and whitespace
  const substantive = rawMaterial
    .replace(/---\s*HALAMAN\s+\d+\s*---/gi, '')
    .trim();

  // ATURAN USER: Jika tidak ada materi yang terbaca, KOSONGKAN!
  if (!substantive || substantive.length < 15) {
    return res.json({
      success: true,
      pembukaan: '',
      isiMateri: '',
      penutup: '',
      isEmpty: true,
      message: 'Tidak ada materi yang terbaca dari berkas. Kolom Pembukaan, Isi Materi, dan Penutup dikosongkan.',
    });
  }

  const cleanKegiatan = typeof kegiatan === 'string' && kegiatan.trim()
    ? kegiatan.trim()
    : 'Pekan Pembinaan Rutin Pendidik dan Tenaga Kependidikan';
  const cleanMateri = typeof materi === 'string' && materi.trim()
    ? materi.trim()
    : 'Implementasi Kurikulum Merdeka & Penguatan Komunitas Belajar';
  const cleanAgenda = typeof agenda === 'string' && agenda.trim()
    ? agenda.trim()
    : 'Pekan Pembinaan & Koordinasi Komunitas Belajar (Kombel)';
  const cleanSekolah = typeof namaSekolah === 'string' && namaSekolah.trim()
    ? namaSekolah.trim()
    : 'Satuan Pendidikan';

  // If no Gemini API key configured, use synthesizer directly
  if (!process.env.GEMINI_API_KEY) {
    const syn = synthesizeNotulaFromMaterial(substantive, cleanKegiatan, cleanMateri, cleanAgenda, cleanSekolah);
    return res.json({
      success: true,
      isFallback: true,
      ...syn,
    });
  }

  const prompt = `Anda bertugas menyusun Notula Rapat Kedinasan Resmi untuk kegiatan Komunitas Belajar (Kombel) / Pekan Pembinaan Guru berdasarkan substansi materi yang telah diekstrak.

Informasi Konteks Pertemuan:
- Satuan Pendidikan: ${cleanSekolah}
- Nama Kegiatan: ${cleanKegiatan}
- Agenda Rapat: ${cleanAgenda}
- Tema / Topik Materi: ${cleanMateri}

Bahan Materi / Slide yang Dipaparkan (Substansi hasil ekstrak berkas rapat):
"""
${substantive.slice(0, 25000)}
"""

Instruksi Khusus Format Notula Kedinasan (WAJIB DIIKUTI):
1. "pembukaan": Tuliskan paragraf pembukaan resmi (pembacaan doa, pengantar moderator/kepala sekolah, latar belakang urgensi pembinaan, dan kesiapan peserta).
2. "isiMateri": Tuliskan pembahasan inti materi yang dipaparkan narasumber dan dinamika pembahasan dalam TEPAT SATU PARAGRAF UTUH (single paragraph), mengalir secara naratif dan komprehensif. DILARANG KERAS menggunakan penomoran apa pun (JANGAN ADA NUMBERING: tidak boleh ada 1., 2., 3., a., b., c., poin angka, atau bullet points). Rangkum substansi dari bahan presentasi yang dipaparkan secara berbobot dalam 1 paragraf saja.
3. "penutup": Tuliskan kesimpulan akhir, Rencana Tindak Lanjut (RTL) yang wajib dilakukan para guru di kelas, tenggat waktu pengumpulan administrasi, dan penutupan rapat secara khidmat.
Gunakan bahasa Indonesia baku, formal, berbobot, dan mencerminkan administrasi SPJ dinas pendidikan yang profesional.`;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), 10000)
    );

    const generatePromise = (async () => {
      // Try gemini-3.1-flash-lite first for lightning speed & low latency
      try {
        const resp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            systemInstruction:
              'Anda adalah sekretaris dinas pendidikan dan fasilitator Komunitas Belajar (Kombel) bersertifikat. Hasilkan dokumen notula rapat kedinasan Indonesia yang formal, berbobot, dan sesuai tata naskah dinas pendidikan. Khusus pada isiMateri, WAJIB tepat 1 paragraf narasi mengalir tanpa penomoran/numbering atau bullet points sama sekali.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                pembukaan: {
                  type: Type.STRING,
                  description: 'Teks pembukaan resmi notula rapat kedinasan.',
                },
                isiMateri: {
                  type: Type.STRING,
                  description: 'Uraian pokok materi dan dinamika rapat dalam tepat 1 paragraf narasi tanpa numbering atau bullet points.',
                },
                penutup: {
                  type: Type.STRING,
                  description: 'Kesimpulan dan rencana tindak lanjut (RTL) penutup notula.',
                },
              },
              required: ['pembukaan', 'isiMateri', 'penutup'],
            },
          },
        });
        return resp;
      } catch (e) {
        // Fallback to gemini-3.8-flash
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'Anda adalah sekretaris dinas pendidikan dan fasilitator Komunitas Belajar (Kombel) bersertifikat. Hasilkan dokumen notula rapat kedinasan Indonesia yang formal, berbobot, dan sesuai tata naskah dinas pendidikan. Khusus pada isiMateri, WAJIB tepat 1 paragraf narasi mengalir tanpa penomoran/numbering atau bullet points sama sekali.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                pembukaan: {
                  type: Type.STRING,
                  description: 'Teks pembukaan resmi notula rapat kedinasan.',
                },
                isiMateri: {
                  type: Type.STRING,
                  description: 'Uraian pokok materi dan dinamika rapat dalam tepat 1 paragraf narasi tanpa numbering atau bullet points.',
                },
                penutup: {
                  type: Type.STRING,
                  description: 'Kesimpulan dan rencana tindak lanjut (RTL) penutup notula.',
                },
              },
              required: ['pembukaan', 'isiMateri', 'penutup'],
            },
          },
        });
      }
    })();

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const jsonStr = (response.text ?? '{}').trim();
    const result = JSON.parse(jsonStr);

    const safeIsiMateri = ensureSingleParagraphNoNumbering(result.isiMateri || '');

    return res.json({
      success: true,
      pembukaan: result.pembukaan || '',
      isiMateri: safeIsiMateri,
      penutup: result.penutup || '',
    });
  } catch (error: any) {
    console.warn('Gemini API call warning, utilizing intelligent synthesizer:', error?.message);
    const syn = synthesizeNotulaFromMaterial(substantive, cleanKegiatan, cleanMateri, cleanAgenda, cleanSekolah);
    return res.json({
      success: true,
      isFallback: true,
      ...syn,
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
