import React from 'react';
import { SchoolMetadata, PrintPreviewSettings } from '../../types';
import { formatNomorSuratKedinasan, parseTanggalBAST } from '../../utils/logistikUtils';
import { KopSuratResmi } from '../common/KopSuratResmi';

export interface DokumenBarangItem {
  no: number;
  namaBarang: string;
  spesifikasi: string;
  jumlah: number;
  satuan: string;
  keperluan: string;
}

export interface DokumenGuruData {
  personId: string;
  namaGuru: string;
  nip: string;
  jabatan: string;
  noPermintaan: number | string;
  noVerifikasi: number | string;
  noBast: number | string;
  items: DokumenBarangItem[];
}

export const DEFAULT_PRINT_SETTINGS: PrintPreviewSettings = {
  paperSize: 'A4',
  marginPreset: 'normal',
  marginTopMm: 15,
  marginBottomMm: 15,
  marginLeftMm: 20,
  marginRightMm: 20,
  tableSpacing: 'normal',
  signatureSpacing: 'wide',
  signatureHeightPx: 90, // Diperluas secara default (90px) untuk tanda tangan & stempel basah leluasa
  fontSize: 'normal',
  showKop: true,
  lebihanPermintaanPrint: true
};

/**
 * Menghitung estimasi kuantitas yang diajukan pemohon di Surat Permintaan Barang.
 * Kuantitas dilebihkan secara visual di output cetak dari rencana riil,
 * seolah-olah permohonan riil dari pemohon yang kemudian dirasionalisasi saat verifikasi.
 */
export function calculatePermintaanPrintQty(item: { namaBarang: string; jumlah: number }): number {
  const qty = Math.max(1, Number(item.jumlah) || 1);
  const lowerName = (item.namaBarang || '').toLowerCase();

  // Jika barang merupakan belanja modal / aset spesifik 1 unit (tidak dilebihkan)
  const isAsetUnit = /(laptop|notebook|komputer|pc|printer|scanner|proyektor|infocus|lemari|meja\s*guru|kursi\s*guru|ac\s*1|kulkas|televisi|tv|dispenser)/i.test(lowerName);
  if (isAsetUnit && qty === 1) {
    return 1;
  }

  // Jika jumlah 1 (barang habis pakai seperti kertas, spidol, stapler, gunting, dll.)
  if (qty === 1) {
    return 2;
  }

  // Jika jumlah 2 s/d 4: tambah 1 unit (contoh: 2 jadi 3, 3 jadi 4)
  if (qty >= 2 && qty <= 4) {
    return qty + 1;
  }

  // Jika jumlah 5 s/d 8: tambah 2 unit (contoh: 5 jadi 7, 8 jadi 10)
  if (qty >= 5 && qty <= 8) {
    return qty + 2;
  }

  // Jika jumlah >= 9: dilebihkan sekitar 20% (dibulatkan ke atas wajar)
  const addition = Math.max(2, Math.ceil(qty * 0.2));
  return qty + addition;
}

interface DokumenTripartitGuruProps {
  guruData: DokumenGuruData;
  metadata: SchoolMetadata;
  tglMinta: string;
  tglVerif: string;
  tglBA: string;
  namaVerifikator: string;
  nipVerifikator: string;
  namaPengurusBarang: string;
  nipPengurusBarang: string;
  kotaKecamatan?: string;
  hideHeaderOnScreen?: boolean;
  printSettings?: PrintPreviewSettings;
}

export const DokumenTripartitGuru: React.FC<DokumenTripartitGuruProps> = ({
  guruData,
  metadata,
  tglMinta,
  tglVerif,
  tglBA,
  namaVerifikator,
  nipVerifikator,
  namaPengurusBarang,
  nipPengurusBarang,
  kotaKecamatan = 'Bogor',
  printSettings = DEFAULT_PRINT_SETTINGS
}) => {
  const npsn = metadata.npsn || '20200235';
  const bastInfo = parseTanggalBAST(tglBA);

  const noSuratPermintaanFormatted = formatNomorSuratKedinasan(guruData.noPermintaan, npsn);
  const noSuratVerifikasiFormatted = formatNomorSuratKedinasan(guruData.noVerifikasi, npsn);
  const noSuratBastFormatted = formatNomorSuratKedinasan(guruData.noBast, npsn);

  // Opsi melebihkan permintaan secara visual pada output cetak
  const isLebihkan = printSettings.lebihanPermintaanPrint !== false;

  // Kalkulasi dimensi kertas
  let paperWidth = '210mm';
  let paperHeight = '297mm';
  let paperSizeRule = 'A4 portrait';

  if (printSettings.paperSize === 'F4') {
    paperWidth = '215mm';
    paperHeight = '330mm';
    paperSizeRule = '215mm 330mm';
  } else if (printSettings.paperSize === 'Letter') {
    paperWidth = '216mm';
    paperHeight = '279mm';
    paperSizeRule = 'letter portrait';
  }

  // Kalkulasi margin padding
  let padTopMm = 15;
  let padBottomMm = 15;
  let padLeftMm = 20;
  let padRightMm = 20;

  if (printSettings.marginPreset === 'compact') {
    padTopMm = 10;
    padBottomMm = 10;
    padLeftMm = 12;
    padRightMm = 12;
  } else if (printSettings.marginPreset === 'spacious') {
    padTopMm = 20;
    padBottomMm = 20;
    padLeftMm = 25;
    padRightMm = 25;
  } else if (printSettings.marginPreset === 'custom') {
    padTopMm = printSettings.marginTopMm || 15;
    padBottomMm = printSettings.marginBottomMm || 15;
    padLeftMm = printSettings.marginLeftMm || 20;
    padRightMm = printSettings.marginRightMm || 20;
  }

  const marginPaddingCss = `${padTopMm}mm ${padRightMm}mm ${padBottomMm}mm ${padLeftMm}mm`;

  // Spasi Tanda Tangan (Perluas TTD & Stempel)
  let actualSignatureHeight = 90; // Default luas
  if (printSettings.signatureSpacing === 'normal') {
    actualSignatureHeight = 65;
  } else if (printSettings.signatureSpacing === 'wide') {
    actualSignatureHeight = 90;
  } else if (printSettings.signatureSpacing === 'extra-wide') {
    actualSignatureHeight = 120;
  } else if (printSettings.signatureSpacing === 'custom' && printSettings.signatureHeightPx) {
    actualSignatureHeight = printSettings.signatureHeightPx;
  }

  // Kepadatan tabel
  const tablePaddingClass =
    printSettings.tableSpacing === 'compact'
      ? 'p-1 text-[10px] print:text-[8.5pt]'
      : printSettings.tableSpacing === 'spacious'
      ? 'p-2 sm:p-2.5 text-xs print:text-[10pt]'
      : 'p-1.5 text-[11px] print:text-[9.5pt]';

  const renderKopSekolah = () => {
    if (!printSettings.showKop) return null;

    return <KopSuratResmi metadata={metadata} showDoubleLine={true} className="mb-3" />;
  };

  const sheetStyle: React.CSSProperties = {
    maxWidth: paperWidth,
    width: '100%',
    padding: marginPaddingCss,
    boxSizing: 'border-box'
  };

  return (
    <div className="space-y-8 print:space-y-0 text-black font-sans text-xs print:text-[10pt] leading-relaxed print:w-full print:m-0 print:p-0">
      {/* Dynamic Print CSS Injection for Exact Paper and Margin Customization */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${paperSizeRule};
                margin: ${padTopMm}mm ${padRightMm}mm ${padBottomMm}mm ${padLeftMm}mm;
              }
              body, html {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .a4-print-sheet {
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: 0 !important;
                height: auto !important;
                max-height: none !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
              }
              .doc-section-break {
                page-break-before: always !important;
                break-before: page !important;
              }
              .header-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              table.doc-table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              table.doc-table thead {
                display: table-header-group !important;
              }
              table.doc-table tbody {
                display: table-row-group !important;
              }
              table.doc-table tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: auto !important;
              }
              table.doc-table td, table.doc-table th {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .signature-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-top: 1.5rem !important;
              }
              .signature-space {
                height: ${actualSignatureHeight}px !important;
              }
            }
          `
        }}
      />

      {/* ========================================================================= */}
      {/* 1. SURAT PERMINTAAN BARANG */}
      {/* ========================================================================= */}
      <div
        style={sheetStyle}
        className="a4-print-sheet mx-auto bg-white border border-slate-300 rounded-2xl shadow-sm print:shadow-none print:border-none print:rounded-none print:m-0 print:bg-white print:min-h-0 min-h-[850px] flex flex-col justify-between print:block mb-8 print:mb-0"
      >
        <div>
          <div className="header-block">
            {renderKopSekolah()}

            {/* Form Header */}
            <div className="space-y-1 my-3 text-[11px] print:text-[10pt] max-w-xl">
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">1. Nomor</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 font-mono font-bold text-black">{noSuratPermintaanFormatted}</div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">2. Tanggal</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 text-black">{tglMinta || 'Jumat, 10 April 2026'}</div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">3. Nama Pemohon</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 font-bold text-black">{guruData.namaGuru}</div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">4. Jabatan</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 text-black">{guruData.jabatan}</div>
              </div>
            </div>
          </div>

          {/* Table Barang */}
          <div className="mt-4">
            <table className="doc-table w-full border-collapse border border-black">
              <thead className="bg-slate-100 print:bg-gray-100 font-bold border-b border-black text-black">
                <tr>
                  <th className={`border border-black ${tablePaddingClass} text-center w-8`}>No</th>
                  <th className={`border border-black ${tablePaddingClass} text-left`}>Nama Barang</th>
                  <th className={`border border-black ${tablePaddingClass} text-left w-28`}>Spesifikasi</th>
                  <th className={`border border-black ${tablePaddingClass} text-center w-14`}>Jumlah</th>
                  <th className={`border border-black ${tablePaddingClass} text-center w-16`}>Satuan</th>
                  <th className={`border border-black ${tablePaddingClass} text-left w-36`}>Keperluan</th>
                </tr>
              </thead>
              <tbody>
                {guruData.items.length > 0 ? (
                  guruData.items.map((item, idx) => {
                    const qtyPermintaan = isLebihkan ? calculatePermintaanPrintQty(item) : item.jumlah;
                    return (
                      <tr key={idx}>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono`}>{idx + 1}</td>
                        <td className={`border border-black ${tablePaddingClass} font-medium`}>{item.namaBarang}</td>
                        <td className={`border border-black ${tablePaddingClass} text-slate-700 print:text-black`}>{item.spesifikasi || '-'}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono font-bold`}>{qtyPermintaan}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center`}>{item.satuan || 'buah'}</td>
                        <td className={`border border-black ${tablePaddingClass} text-slate-800 print:text-black`}>{item.keperluan || 'Kegiatan KBM & Operasional'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-black p-3 text-center text-slate-500 italic">
                      Tidak ada rincian barang permintaan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tanda Tangan Pemohon */}
        <div className="signature-block pt-6 print:pt-4 text-xs print:text-[10pt] font-sans">
          <div className="flex justify-end">
            <div className="w-72 text-left">
              <p className="text-black">
                {kotaKecamatan}, {tglMinta || 'Jumat, 10 April 2026'}
              </p>
              <p className="font-semibold text-black mt-0.5">Pemohon</p>
              <p className="text-black text-[11px] print:text-[9.5pt]">{guruData.jabatan}</p>
              {/* Ruang Tanda Tangan & Stempel yang Diperluas */}
              <div className="signature-space" style={{ height: `${actualSignatureHeight}px` }}></div>
              <p className="font-bold text-black underline">{guruData.namaGuru}</p>
              <p className="text-[10px] print:text-[9pt] text-black font-mono">
                NIP. {guruData.nip && guruData.nip !== '-' ? guruData.nip : '................................................'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LEMBAR VERIFIKASI PERMINTAAN BARANG */}
      {/* ========================================================================= */}
      <div
        style={sheetStyle}
        className="a4-print-sheet doc-section-break mx-auto bg-white border border-slate-300 rounded-2xl shadow-sm print:shadow-none print:border-none print:rounded-none print:m-0 print:bg-white print:min-h-0 min-h-[850px] flex flex-col justify-between print:block mb-8 print:mb-0"
      >
        <div>
          <div className="header-block">
            {renderKopSekolah()}

            {/* Title */}
            <div className="text-center my-3">
              <h3 className="text-xs sm:text-sm print:text-[11pt] font-bold uppercase tracking-wider text-black underline">
                LEMBAR VERIFIKASI PERMINTAAN BARANG
              </h3>
            </div>

            {/* Form Header */}
            <div className="space-y-1 my-3 text-[11px] print:text-[10pt] max-w-xl">
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">1. Nomor</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 font-mono font-bold text-black">{noSuratVerifikasiFormatted}</div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">2. Tanggal</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 text-black">{tglVerif || 'Sabtu, 11 April 2026'}</div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">3. Nama Pemohon</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 font-bold text-black">{guruData.namaGuru}</div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <div className="col-span-3 font-medium">4. Jabatan</div>
                <div className="col-span-1 text-center">:</div>
                <div className="col-span-8 text-black">{guruData.jabatan}</div>
              </div>
            </div>
          </div>

          {/* Table Barang */}
          <div className="mt-4">
            <table className="doc-table w-full border-collapse border border-black">
              <thead className="bg-slate-100 print:bg-gray-100 font-bold border-b border-black text-black">
                {isLebihkan ? (
                  <tr>
                    <th className={`border border-black ${tablePaddingClass} text-center w-8`}>No</th>
                    <th className={`border border-black ${tablePaddingClass} text-left`}>Nama Barang</th>
                    <th className={`border border-black ${tablePaddingClass} text-left w-24`}>Spesifikasi</th>
                    <th className={`border border-black ${tablePaddingClass} text-center w-14`}>Diajukan</th>
                    <th className={`border border-black ${tablePaddingClass} text-center w-14`}>Disetujui</th>
                    <th className={`border border-black ${tablePaddingClass} text-center w-14`}>Satuan</th>
                    <th className={`border border-black ${tablePaddingClass} text-left w-36`}>Catatan Verifikasi</th>
                  </tr>
                ) : (
                  <tr>
                    <th className={`border border-black ${tablePaddingClass} text-center w-8`}>No</th>
                    <th className={`border border-black ${tablePaddingClass} text-left`}>Nama Barang</th>
                    <th className={`border border-black ${tablePaddingClass} text-left w-28`}>Spesifikasi</th>
                    <th className={`border border-black ${tablePaddingClass} text-center w-14`}>Jumlah</th>
                    <th className={`border border-black ${tablePaddingClass} text-center w-16`}>Satuan</th>
                    <th className={`border border-black ${tablePaddingClass} text-left w-36`}>Keperluan</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {guruData.items.length > 0 ? (
                  guruData.items.map((item, idx) => {
                    const qtyDiajukan = calculatePermintaanPrintQty(item);
                    const isDisesuaikan = qtyDiajukan > item.jumlah;
                    return isLebihkan ? (
                      <tr key={idx}>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono`}>{idx + 1}</td>
                        <td className={`border border-black ${tablePaddingClass} font-medium`}>{item.namaBarang}</td>
                        <td className={`border border-black ${tablePaddingClass} text-slate-700 print:text-black`}>{item.spesifikasi || '-'}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono`}>{qtyDiajukan}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono font-bold bg-slate-50 print:bg-transparent`}>{item.jumlah}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center`}>{item.satuan || 'buah'}</td>
                        <td className={`border border-black ${tablePaddingClass} text-[10px] print:text-[8.5pt] text-slate-800 print:text-black leading-tight`}>
                          {isDisesuaikan
                            ? 'Disesuaikan ketersediaan pagu dana RKAS'
                            : 'Disetujui sesuai kebutuhan operasional'}
                        </td>
                      </tr>
                    ) : (
                      <tr key={idx}>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono`}>{idx + 1}</td>
                        <td className={`border border-black ${tablePaddingClass} font-medium`}>{item.namaBarang}</td>
                        <td className={`border border-black ${tablePaddingClass} text-slate-700 print:text-black`}>{item.spesifikasi || '-'}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center font-mono font-bold`}>{item.jumlah}</td>
                        <td className={`border border-black ${tablePaddingClass} text-center`}>{item.satuan || 'buah'}</td>
                        <td className={`border border-black ${tablePaddingClass} text-slate-800 print:text-black`}>{item.keperluan || 'Kegiatan KBM & Operasional'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isLebihkan ? 7 : 6} className="border border-black p-3 text-center text-slate-500 italic">
                      Tidak ada rincian barang.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2 Kolom Tanda Tangan: Kepala Sekolah & Verifikator PBJ */}
        <div className="signature-block pt-6 print:pt-4 text-xs print:text-[10pt] font-sans">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-left">
              <p className="font-semibold text-black">Mengetahui</p>
              <p className="text-black text-[11px] print:text-[9.5pt]">Kepala Sekolah</p>
              {/* Ruang Tanda Tangan & Stempel yang Diperluas */}
              <div className="signature-space" style={{ height: `${actualSignatureHeight}px` }}></div>
              <p className="font-bold text-black underline">{metadata.kepalaSekolah}</p>
              <p className="text-[10px] print:text-[9pt] text-black font-mono">NIP. {metadata.nipKepalaSekolah}</p>
            </div>

            <div className="text-left">
              <p className="text-black">
                {kotaKecamatan}, {tglVerif || 'Sabtu, 11 April 2026'}
              </p>
              <p className="font-semibold text-black">Verifikator / Tim PBJ</p>
              {/* Ruang Tanda Tangan & Stempel yang Diperluas */}
              <div className="signature-space" style={{ height: `${actualSignatureHeight}px` }}></div>
              <p className="font-bold text-black underline">{namaVerifikator || 'Nama Verifikator'}</p>
              <p className="text-[10px] print:text-[9pt] text-black font-mono">NIP. {nipVerifikator || '................................................'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BERITA ACARA SERAH TERIMA BARANG (BAST) */}
      {/* ========================================================================= */}
      <div
        style={sheetStyle}
        className="a4-print-sheet doc-section-break mx-auto bg-white border border-slate-300 rounded-2xl shadow-sm print:shadow-none print:border-none print:rounded-none print:m-0 print:bg-white print:min-h-0 min-h-[850px] flex flex-col justify-between print:block"
      >
        <div>
          <div className="header-block">
            {renderKopSekolah()}

            {/* Title BAST */}
            <div className="text-center my-3">
              <h3 className="text-xs sm:text-sm print:text-[11pt] font-bold uppercase tracking-wider text-black underline">
                BERITA ACARA SERAH TERIMA BARANG
              </h3>
              <p className="text-[11px] print:text-[10pt] font-mono font-bold text-black mt-0.5">
                Nomor : {noSuratBastFormatted}
              </p>
            </div>

            {/* Narasi Kedinasan BAST */}
            <div className="my-3 text-[11px] print:text-[9.5pt] text-black italic leading-relaxed">
              <p>{bastInfo.fullNarasi}</p>
            </div>
          </div>

          {/* Table Barang */}
          <div className="mt-4">
            <table className="doc-table w-full border-collapse border border-black">
              <thead className="bg-slate-100 print:bg-gray-100 font-bold border-b border-black text-black">
                <tr>
                  <th className={`border border-black ${tablePaddingClass} text-center w-8`}>No</th>
                  <th className={`border border-black ${tablePaddingClass} text-left`}>Nama Barang</th>
                  <th className={`border border-black ${tablePaddingClass} text-left w-28`}>Spesifikasi</th>
                  <th className={`border border-black ${tablePaddingClass} text-center w-14`}>Jumlah</th>
                  <th className={`border border-black ${tablePaddingClass} text-center w-16`}>Satuan</th>
                  <th className={`border border-black ${tablePaddingClass} text-left w-36`}>Keperluan</th>
                </tr>
              </thead>
              <tbody>
                {guruData.items.length > 0 ? (
                  guruData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className={`border border-black ${tablePaddingClass} text-center font-mono`}>{idx + 1}</td>
                      <td className={`border border-black ${tablePaddingClass} font-medium`}>{item.namaBarang}</td>
                      <td className={`border border-black ${tablePaddingClass} text-slate-700 print:text-black`}>{item.spesifikasi || '-'}</td>
                      <td className={`border border-black ${tablePaddingClass} text-center font-mono font-bold`}>{item.jumlah}</td>
                      <td className={`border border-black ${tablePaddingClass} text-center`}>{item.satuan || 'buah'}</td>
                      <td className={`border border-black ${tablePaddingClass} text-slate-800 print:text-black`}>{item.keperluan || 'Kegiatan KBM & Operasional'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-black p-3 text-center text-slate-500 italic">
                      Tidak ada rincian barang BAST.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2 Kolom Tanda Tangan BAST: Pihak Pertama & Pihak Kedua */}
        <div className="signature-block pt-6 print:pt-4 text-xs print:text-[10pt] font-sans">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-left">
              <p className="font-semibold text-black">Pihak Pertama</p>
              <p className="text-black text-[11px] print:text-[9.5pt]">Pengurus Barang / Petugas PPHP</p>
              {/* Ruang Tanda Tangan & Stempel yang Diperluas */}
              <div className="signature-space" style={{ height: `${actualSignatureHeight}px` }}></div>
              <p className="font-bold text-black underline">{namaPengurusBarang || 'Nurhayati, S.Pd.'}</p>
              <p className="text-[10px] print:text-[9pt] text-black font-mono">
                NIP. {nipPengurusBarang || '198804152014032002'}
              </p>
            </div>

            <div className="text-left">
              <p className="font-semibold text-black">Pihak Kedua</p>
              <p className="text-black text-[11px] print:text-[9.5pt]">Penerima Barang / {guruData.jabatan}</p>
              {/* Ruang Tanda Tangan & Stempel yang Diperluas */}
              <div className="signature-space" style={{ height: `${actualSignatureHeight}px` }}></div>
              <p className="font-bold text-black underline">{guruData.namaGuru}</p>
              <p className="text-[10px] print:text-[9pt] text-black font-mono">
                NIP. {guruData.nip && guruData.nip !== '-' ? guruData.nip : '................................................'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

