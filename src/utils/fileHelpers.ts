import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { TransaksiBKU, RincianBarang } from '../types';

// Configure pdfjs worker if in browser
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.2.108'}/build/pdf.worker.min.mjs`;
    } catch (e2) {
      // Ignore
    }
  }
}

export interface FilePayload {
  name: string;
  mimeType: string;
  base64?: string;
  text?: string;
}

/**
 * Safely reads a file based on its type and extracts text + base64 representation
 */
export async function processUploadedFile(file: File): Promise<FilePayload> {
  const fileName = file.name;
  const mimeType = file.type || getMimeTypeFromExtension(fileName);

  // 1. If it's an Excel spreadsheet
  if (
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let combinedText = `[FILE EXCEL: ${fileName}]\n`;
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      combinedText += `--- SHEET: ${sheetName} ---\n${csv}\n\n`;
    });

    return {
      name: fileName,
      mimeType: 'text/plain',
      text: combinedText,
    };
  }

  // 2. If it's a plain text or CSV file
  if (
    fileName.endsWith('.txt') ||
    fileName.endsWith('.csv') ||
    mimeType === 'text/plain' ||
    mimeType === 'text/csv'
  ) {
    const text = await file.text();
    return {
      name: fileName,
      mimeType: 'text/plain',
      text,
    };
  }

  // 3. If it's a JSON file
  if (fileName.endsWith('.json') || mimeType === 'application/json') {
    const text = await file.text();
    return {
      name: fileName,
      mimeType: 'application/json',
      text,
    };
  }

  // 4. If it's a PDF file, extract both base64 and text
  if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
    const base64 = await fileToBase64(file);
    let extractedPdfText = '';
    try {
      extractedPdfText = await extractTextFromPDF(file);
    } catch (pdfErr) {
      console.warn('PDF text extraction notice:', pdfErr);
    }

    return {
      name: fileName,
      mimeType: 'application/pdf',
      base64,
      text: extractedPdfText || undefined,
    };
  }

  // 5. Image or other binary files
  const base64 = await fileToBase64(file);
  return {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream',
    base64,
  };
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    let fullText = `[DOKUMEN PDF: ${file.name} - Total ${pdf.numPages} Halaman]\n`;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      const rawItems = textContent.items
        .map((item: any) => {
          const tx = item.transform || [1, 0, 0, 1, 0, 0];
          const x = tx[4];
          const y = viewport.height - tx[5];
          const str = item.str || '';
          const width = item.width || (str.length * 5);
          return { str, x, y, width };
        })
        .filter((item: any) => item.str.trim().length > 0);

      const yTolerance = 4.5;
      const lineBuckets: { y: number; items: typeof rawItems }[] = [];

      rawItems.sort((a: any, b: any) => (Math.abs(a.y - b.y) <= yTolerance ? a.x - b.x : a.y - b.y));

      for (const item of rawItems) {
        let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= yTolerance);
        if (!bucket) {
          bucket = { y: item.y, items: [] };
          lineBuckets.push(bucket);
        }
        bucket.items.push(item);
      }

      lineBuckets.sort((a, b) => a.y - b.y);

      let pageReconstructed = `--- HALAMAN ${pageNum} ---\n`;
      for (const bucket of lineBuckets) {
        bucket.items.sort((a, b) => a.x - b.x);
        let lineStr = '';
        for (let i = 0; i < bucket.items.length; i++) {
          const curr = bucket.items[i];
          if (i > 0) {
            const prev = bucket.items[i - 1];
            const gap = curr.x - (prev.x + prev.width);
            if (gap > 12) lineStr += '\t';
            else if (gap > 2) lineStr += ' ';
          }
          lineStr += curr.str;
        }
        if (lineStr.trim()) {
          pageReconstructed += lineStr.trim() + '\n';
        }
      }

      fullText += pageReconstructed + '\n';
    }

    return fullText;
  } catch (err) {
    console.warn('Failed to parse PDF text with pdfjs:', err);
    return '';
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:application/pdf;base64," prefix
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export const COMMON_SATUAN_OPTIONS = [
  'box',
  'buah',
  'unit',
  'botol',
  'galon',
  'pack',
  'meter',
  'pcs',
  'per bungkus',
  'bulan',
  'per bulan',
  'orang',
  'orang / hari',
  'rim',
  'lembar',
  'dus',
  'set',
  'kegiatan',
  'paket',
  'batang',
  'roll',
  'lusin'
];
