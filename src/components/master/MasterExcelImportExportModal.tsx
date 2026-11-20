import React, { useState, useRef } from 'react';
import {
  SchoolMetadata,
  MasterGuru,
  MasterSiswa,
  MasterEskul
} from '../../types';
import {
  exportMasterToExcel,
  downloadMasterTemplateExcel,
  parseMasterExcelFile,
  validateMasterDataForFirebase,
  ParsedMasterExcelResult,
  MasterValidationReport
} from '../../utils/masterExcelHelper';
import {
  saveAllMasterDataToFirestore,
  CloudSyncStatus
} from '../../lib/firebaseSync';
import { useSchool } from '../../context/SchoolContext';
import { writeLS } from '../../lib/schoolStorage';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Database,
  ShieldCheck,
  RefreshCw,
  Building2,
  Users,
  GraduationCap,
  Trophy,
  ArrowRight,
  Sparkles,
  FileText
} from 'lucide-react';

interface MasterExcelImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: SchoolMetadata;
  teachers: MasterGuru[];
  students: MasterSiswa[];
  eskulList: MasterEskul[];
  onUpdateMetadata: (newMetadata: SchoolMetadata) => void;
  onUpdateTeachers: (newTeachers: MasterGuru[]) => void;
  onUpdateStudents: (newStudents: MasterSiswa[]) => void;
  onUpdateEskul: (newList: MasterEskul[]) => void;
  onSuccessMessage: (msg: string) => void;
}

export const MasterExcelImportExportModal: React.FC<MasterExcelImportExportModalProps> = ({
  isOpen,
  onClose,
  metadata,
  teachers,
  students,
  eskulList,
  onUpdateMetadata,
  onUpdateTeachers,
  onUpdateStudents,
  onUpdateEskul,
  onSuccessMessage
}) => {
  const { schoolId, readOnly } = useSchool();
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'template'>(() => (readOnly ? 'export' : 'import'));

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedMasterExcelResult | null>(null);
  const [validationReport, setValidationReport] = useState<MasterValidationReport | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [previewSubTab, setPreviewSubTab] = useState<'teachers' | 'students' | 'school' | 'eskul'>('teachers');
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset modal state
  const handleResetImport = () => {
    setSelectedFile(null);
    setParsedResult(null);
    setValidationReport(null);
    setIsValidated(false);
    setIsSubmitting(false);
    setSubmitSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle File Select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setIsValidated(false);
    setValidationReport(null);
    setSubmitSuccess(false);

    try {
      const parsed = await parseMasterExcelFile(file);
      setParsedResult(parsed);

      // Auto select active preview subtab based on detected data
      if (parsed.teachers && parsed.teachers.length > 0) setPreviewSubTab('teachers');
      else if (parsed.students && parsed.students.length > 0) setPreviewSubTab('students');
      else if (parsed.eskulList && parsed.eskulList.length > 0) setPreviewSubTab('eskul');
      else if (parsed.metadata) setPreviewSubTab('school');
    } catch (err: any) {
      console.error('Error membaca file Excel:', err);
      alert('Gagal membaca file Excel. Pastikan file berformat .xlsx atau .xls yang valid.');
      handleResetImport();
    } finally {
      setIsParsing(false);
    }
  };

  // The 1 Morphing Button Action
  const handlePrimaryActionButton = async () => {
    if (!parsedResult) return;

    // STEP 1: VALIDASI DATA JIKA BELUM VALID
    if (!isValidated) {
      const report = validateMasterDataForFirebase(parsedResult, {
        metadata,
        teachers,
        students,
        eskulList
      });
      setValidationReport(report);

      if (report.isValid) {
        setIsValidated(true);
      } else {
        // If there are fatal errors, user sees error report and cannot submit until resolved
        setIsValidated(false);
      }
      return;
    }

    // STEP 2: SUBMIT KE DATABASE FIREBASE (TOMBOL SUDAH BERUBAH)
    if (isValidated && validationReport && validationReport.isValid) {
      if (readOnly) return;
      setIsSubmitting(true);

      const cleanData = validationReport.sanitizedData;

      try {
        // 1. Update React Local States & per-school LocalStorage
        if (cleanData.metadata) {
          onUpdateMetadata(cleanData.metadata);
          writeLS(schoolId, 'school_metadata', cleanData.metadata);
        }
        if (cleanData.teachers && cleanData.teachers.length > 0) {
          onUpdateTeachers(cleanData.teachers);
          writeLS(schoolId, 'master_teachers', cleanData.teachers);
        }
        if (cleanData.students && cleanData.students.length > 0) {
          onUpdateStudents(cleanData.students);
          writeLS(schoolId, 'master_students', cleanData.students);
        }
        if (cleanData.eskulList && cleanData.eskulList.length > 0) {
          onUpdateEskul(cleanData.eskulList);
          writeLS(schoolId, 'master_eskul', cleanData.eskulList);
        }

        // 2. Direct Save to Firebase Firestore Database
        await saveAllMasterDataToFirestore(
          schoolId,
          {
            metadata: cleanData.metadata,
            teachers: cleanData.teachers,
            students: cleanData.students,
            eskulList: cleanData.eskulList
          },
          (status) => setCloudStatus(status)
        );

        setSubmitSuccess(true);
        const countText = [
          cleanData.teachers ? `${cleanData.teachers.length} Guru` : null,
          cleanData.students ? `${cleanData.students.length} Siswa` : null,
          cleanData.metadata ? 'Profil Sekolah' : null,
          cleanData.eskulList ? `${cleanData.eskulList.length} Eskul` : null
        ]
          .filter(Boolean)
          .join(', ');

        onSuccessMessage(`🎉 Master Data (${countText}) berhasil divalidasi dan tersimpan di database Firebase!`);

        // Close after short delay
        setTimeout(() => {
          onClose();
          handleResetImport();
        }, 1600);
      } catch (err: any) {
        console.error('Gagal submit master data ke Firebase:', err);
        alert('Gagal menyimpan ke database Firebase. Periksa koneksi internet Anda.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Export handlers
  const handleExportFull = () => {
    exportMasterToExcel({ metadata, teachers, students, eskulList });
    onSuccessMessage('Seluruh Master Data BOSP berhasil diekspor ke Excel (.xlsx)!');
  };

  const handleExportTeachersOnly = () => {
    exportMasterToExcel(
      { metadata, teachers, students: [], eskulList: [] },
      `Master_Guru_GTK_${metadata.npsn || '20201363'}.xlsx`
    );
    onSuccessMessage('Data Guru & GTK berhasil diekspor ke Excel!');
  };

  const handleExportStudentsOnly = () => {
    exportMasterToExcel(
      { metadata, teachers: [], students, eskulList: [] },
      `Master_Siswa_${metadata.npsn || '20201363'}.xlsx`
    );
    onSuccessMessage('Data Siswa berhasil diekspor ke Excel!');
  };

  const handleExportEskulOnly = () => {
    exportMasterToExcel(
      { metadata, teachers: [], students: [], eskulList },
      `Master_Ekstrakurikuler_${metadata.npsn || '20201363'}.xlsx`
    );
    onSuccessMessage('Data Ekstrakurikuler berhasil diekspor ke Excel!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Export & Import Master Data Excel
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Firebase Cloud Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kelola data Guru, Siswa, Profil Sekolah, & Eskul secara otomatis via file Excel (.xlsx)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeTab === 'import'
                ? 'bg-white text-emerald-700 border-slate-200 -mb-[1px] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import Excel ke Database
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeTab === 'export'
                ? 'bg-white text-emerald-700 border-slate-200 -mb-[1px] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            Ekspor Master ke Excel
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center gap-2 border-t border-x ${
              activeTab === 'template'
                ? 'bg-white text-emerald-700 border-slate-200 -mb-[1px] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Download Template Kosong
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: IMPORT DENGAN SINGLE MORPHING BUTTON */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* File Upload Dropzone */}
              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/70 hover:bg-emerald-50/40 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-emerald-300 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs group-hover:scale-105 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">
                    Klik untuk memilih file Excel (.xlsx / .xls)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Mendukung file workbook all-in-one (4 sheet) atau file Excel satu sheet (Dapodik / EMIS / Rekap).
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <span className="text-[11px] font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">
                      🏢 Profil Sekolah
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">
                      👥 Guru & GTK
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">
                      🎓 Siswa & Rombel
                    </span>
                    <span className="text-[11px] font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">
                      🏆 Ekstrakurikuler
                    </span>
                  </div>
                </div>
              ) : (
                /* File Selected Preview & Summary Card */
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {parsedResult?.detectedSheets.length || 0} Sheet terdeteksi
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleResetImport}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Ganti File
                    </button>
                  </div>

                  {/* Summary Badges of Extracted Data */}
                  {parsedResult && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className={`p-3 rounded-xl border ${parsedResult.teachers && parsedResult.teachers.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider">Guru & GTK</div>
                        <div className="text-lg font-bold mt-0.5">
                          {parsedResult.teachers ? parsedResult.teachers.length : 0} <span className="text-xs font-normal">data</span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${parsedResult.students && parsedResult.students.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider">Data Siswa</div>
                        <div className="text-lg font-bold mt-0.5">
                          {parsedResult.students ? parsedResult.students.length : 0} <span className="text-xs font-normal">siswa</span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${parsedResult.metadata && Object.keys(parsedResult.metadata).length > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider">Profil Sekolah</div>
                        <div className="text-lg font-bold mt-0.5">
                          {parsedResult.metadata ? Object.keys(parsedResult.metadata).length : 0} <span className="text-xs font-normal">field</span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${parsedResult.eskulList && parsedResult.eskulList.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider">Ekstrakurikuler</div>
                        <div className="text-lg font-bold mt-0.5">
                          {parsedResult.eskulList ? parsedResult.eskulList.length : 0} <span className="text-xs font-normal">eskul</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Report Area */}
                  {validationReport && (
                    <div
                      className={`p-4 rounded-2xl border ${
                        validationReport.isValid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {validationReport.isValid ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h5 className="text-xs font-bold">
                            {validationReport.isValid
                              ? 'Validasi Berhasil: Data Memenuhi Kriteria Database Firebase'
                              : `Terdapat ${validationReport.totalErrors} Kesalahan Format pada File Excel`}
                          </h5>
                          <p className="text-[11px] mt-0.5 opacity-90">
                            {validationReport.isValid
                              ? 'Seluruh struktur baris valid dan siap disubmit langsung ke database Cloud Firestore tanpa resiko data korup.'
                              : 'Mohon perbaiki data di bawah pada file Excel Anda atau lengkapi kolom yang wajib diisi.'}
                          </p>

                          {validationReport.totalWarnings > 0 && (
                            <div className="mt-2 text-[11px] text-amber-700 bg-amber-100/60 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{validationReport.totalWarnings} peringatan format (sistem otomatis menyesuaikan nilai default yang aman).</span>
                            </div>
                          )}

                          {/* List of fatal errors if any */}
                          {validationReport.items.filter((i) => i.severity === 'error').length > 0 && (
                            <div className="mt-3 bg-white/80 rounded-xl border border-rose-200 p-2.5 max-h-36 overflow-y-auto space-y-1">
                              {validationReport.items
                                .filter((i) => i.severity === 'error')
                                .map((err, idx) => (
                                  <div key={idx} className="text-[11px] text-rose-700 flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-rose-800">[{err.sheet}]</span>
                                    <span>{err.message}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Preview Tabs */}
                  {parsedResult && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1.5 overflow-x-auto">
                        {parsedResult.teachers && parsedResult.teachers.length > 0 && (
                          <button
                            onClick={() => setPreviewSubTab('teachers')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer ${
                              previewSubTab === 'teachers'
                                ? 'bg-white text-indigo-700 border-t border-x border-slate-200 -mb-[1px]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Guru & GTK ({parsedResult.teachers.length})
                          </button>
                        )}
                        {parsedResult.students && parsedResult.students.length > 0 && (
                          <button
                            onClick={() => setPreviewSubTab('students')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer ${
                              previewSubTab === 'students'
                                ? 'bg-white text-blue-700 border-t border-x border-slate-200 -mb-[1px]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Siswa ({parsedResult.students.length})
                          </button>
                        )}
                        {parsedResult.metadata && Object.keys(parsedResult.metadata).length > 0 && (
                          <button
                            onClick={() => setPreviewSubTab('school')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer ${
                              previewSubTab === 'school'
                                ? 'bg-white text-amber-700 border-t border-x border-slate-200 -mb-[1px]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Profil Sekolah
                          </button>
                        )}
                        {parsedResult.eskulList && parsedResult.eskulList.length > 0 && (
                          <button
                            onClick={() => setPreviewSubTab('eskul')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors cursor-pointer ${
                              previewSubTab === 'eskul'
                                ? 'bg-white text-emerald-700 border-t border-x border-slate-200 -mb-[1px]'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Eskul ({parsedResult.eskulList.length})
                          </button>
                        )}
                      </div>

                      {/* Preview Table */}
                      <div className="max-h-56 overflow-y-auto p-3 text-xs">
                        {previewSubTab === 'teachers' && parsedResult.teachers && (
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                <th className="p-1.5">No</th>
                                <th className="p-1.5">Nama Guru</th>
                                <th className="p-1.5">NIP</th>
                                <th className="p-1.5">Jabatan</th>
                                <th className="p-1.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsedResult.teachers.slice(0, 15).map((t, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-1.5 text-slate-400 font-mono">{i + 1}</td>
                                  <td className="p-1.5 font-bold text-slate-800">{t.nama}</td>
                                  <td className="p-1.5 font-mono text-slate-600">{t.nip || '-'}</td>
                                  <td className="p-1.5 text-slate-600">{t.jabatan}</td>
                                  <td className="p-1.5">
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold">
                                      {t.statusKepegawaian}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {previewSubTab === 'students' && parsedResult.students && (
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                <th className="p-1.5">No</th>
                                <th className="p-1.5">NISN</th>
                                <th className="p-1.5">Nama Siswa</th>
                                <th className="p-1.5">Kelas</th>
                                <th className="p-1.5">PIP</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsedResult.students.slice(0, 15).map((s, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-1.5 text-slate-400 font-mono">{i + 1}</td>
                                  <td className="p-1.5 font-mono text-slate-600">{s.nisn}</td>
                                  <td className="p-1.5 font-bold text-slate-800">{s.nama}</td>
                                  <td className="p-1.5 text-slate-600">{s.kelas}</td>
                                  <td className="p-1.5">
                                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${s.penerimaPIP ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                      {s.penerimaPIP ? 'PIP' : 'Reguler'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {previewSubTab === 'school' && parsedResult.metadata && (
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            {Object.entries(parsedResult.metadata).map(([k, v]) => (
                              <div key={k} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="font-semibold text-slate-500 capitalize">{k}:</span>{' '}
                                <span className="font-bold text-slate-800">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {previewSubTab === 'eskul' && parsedResult.eskulList && (
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                <th className="p-1.5">No</th>
                                <th className="p-1.5">Nama Eskul</th>
                                <th className="p-1.5">Kategori</th>
                                <th className="p-1.5">Pembina</th>
                                <th className="p-1.5">Pelatih</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsedResult.eskulList.slice(0, 15).map((e, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-1.5 text-slate-400 font-mono">{i + 1}</td>
                                  <td className="p-1.5 font-bold text-slate-800">{e.namaEskul}</td>
                                  <td className="p-1.5">{e.kategori}</td>
                                  <td className="p-1.5 text-slate-600">{e.namaPembina}</td>
                                  <td className="p-1.5 text-slate-600">{e.namaPelatih}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* THE EXACT REQUESTED SINGLE MORPHING ACTION BUTTON */}
                  {/* "setelah import, adakan tombol validasi, jika sudah valid, tombol berubah menjadi submmit ke database. so 1 tombol saja cukup." */}
                  {/* ============================================================== */}
                  <div className="p-4 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">Alur Pengisian Otomatis:</span>
                        {isValidated ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            Validasi Lolos
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            Menunggu Validasi
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isValidated
                          ? 'Klik tombol di samping untuk langsung menyimpan data ke Cloud Firestore & sistem BOSP.'
                          : 'Klik tombol di samping untuk memvalidasi kelengkapan data sesuai kriteria database.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={readOnly || isParsing || isSubmitting || submitSuccess}
                      onClick={handlePrimaryActionButton}
                      className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 w-full sm:w-auto ${
                        submitSuccess
                          ? 'bg-emerald-600 text-white cursor-default'
                          : isSubmitting
                          ? 'bg-slate-700 text-slate-300 cursor-wait'
                          : isValidated
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-900/50 ring-2 ring-emerald-400/60 animate-pulse hover:animate-none scale-105'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                      }`}
                    >
                      {submitSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Berhasil Disimpan!</span>
                        </>
                      ) : isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan ke Database Firebase...</span>
                        </>
                      ) : isValidated ? (
                        <>
                          <Database className="w-4 h-4 text-emerald-200" />
                          <span>Submit ke Database</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Validasi Data Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EKSPOR MASTER KE EXCEL */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">
                    Ekspor Seluruh Master Data (All-in-One Workbook)
                  </h4>
                  <p className="text-xs text-indigo-700 mt-1 max-w-xl">
                    Menghasilkan satu file Excel (.xlsx) dengan 4 Sheet terpisah (Profil Sekolah, Data Guru, Data Siswa, dan Data Ekstrakurikuler) yang diformat presisi.
                  </p>
                </div>
                <button
                  onClick={handleExportFull}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Ekspor Semua Sheet
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2">
                      <Users className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Data Guru & GTK</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {teachers.length} personil GTK terdaftar beserta status kepegawaian & NIP.
                    </p>
                  </div>
                  <button
                    onClick={handleExportTeachersOnly}
                    className="mt-4 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ekspor Guru Saja
                  </button>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Data Siswa</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {students.length} peserta didik terdata lengkap dengan NISN & rombel.
                    </p>
                  </div>
                  <button
                    onClick={handleExportStudentsOnly}
                    className="mt-4 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ekspor Siswa Saja
                  </button>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">Ekstrakurikuler</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {eskulList.length} cabang ekstrakurikuler beserta data pembina & pelatih.
                    </p>
                  </div>
                  <button
                    onClick={handleExportEskulOnly}
                    className="mt-4 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ekspor Eskul Saja
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOAD TEMPLATE KOSONG */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Template Resmi Excel Master Data BOSP
                  </h4>
                  <p className="text-xs text-emerald-800 mt-1 max-w-xl">
                    Gunakan template ini untuk dibagikan kepada staf TU, guru, atau operator sekolah. Dilengkapi contoh baris isian yang sudah 100% kompatibel dengan database Firebase kami.
                  </p>
                </div>
                <button
                  onClick={() => {
                    downloadMasterTemplateExcel();
                    onSuccessMessage('Template Excel resmi berhasil diunduh!');
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download File Template (.xlsx)
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Kriteria Kolom Database Firebase:
                </h5>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong>Profil Sekolah:</strong> Berisi NPSN, Nama Sekolah, Alamat, TTD Kepala Sekolah, Bendahara, dan Rekening Penampung BOSP.
                  </li>
                  <li>
                    <strong>Data Guru & GTK:</strong> Kolom NIP boleh dikosongkan untuk guru honorer (otomatis terisi tanda strip). Status kepegawaian: PNS, PPPK, Honorer, atau GTT.
                  </li>
                  <li>
                    <strong>Data Siswa:</strong> Kolom NISN wajib berupa angka. Kolom PIP diisi 'Ya' atau 'Tidak'.
                  </li>
                  <li>
                    <strong>Data Ekstrakurikuler:</strong> Kategori (Kepanduan, Olahraga, Seni & Budaya, dsb.), Pembina, Pelatih, Rekening Pelatih, dan Honor Per Kegiatan.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Sistem otomatis menormalkan data ke standar Firebase Firestore.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
