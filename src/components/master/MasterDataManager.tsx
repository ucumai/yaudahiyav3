import React, { useState } from 'react';
import { MasterGuru, MasterSiswa, MasterEskul, SchoolMetadata, TransaksiBKU } from '../../types';
import { SchoolMasterTab } from './SchoolMasterTab';
import { TeacherMasterTab } from './TeacherMasterTab';
import { StudentMasterTab } from './StudentMasterTab';
import { EskulMasterTab } from './EskulMasterTab';
import { DriveSettingsTab } from './DriveSettingsTab';
import { ErrorBoundary } from '../ErrorBoundary';
import { User } from 'firebase/auth';
import { GoogleDriveFileInfo } from '../../lib/googleDriveSync';
import { MasterExcelImportExportModal } from './MasterExcelImportExportModal';
import { useSchool } from '../../context/SchoolContext';
import {
  Database,
  Building2,
  Users,
  GraduationCap,
  Trophy,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet
} from 'lucide-react';

export type MasterSubTab = 'school' | 'teachers' | 'students' | 'eskul' | 'drive';

interface MasterDataManagerProps {
  metadata: SchoolMetadata;
  teachers: MasterGuru[];
  students: MasterSiswa[];
  eskulList: MasterEskul[];
  bkuData: TransaksiBKU[];
  onUpdateMetadata: (newMetadata: SchoolMetadata) => void;
  onUpdateTeachers: (newTeachers: MasterGuru[]) => void;
  onUpdateStudents: (newStudents: MasterSiswa[]) => void;
  onUpdateEskul: (newList: MasterEskul[]) => void;
  onResetAllMaster: () => void;
  onNavigateToSpj?: (eskulId?: string) => void;
  currentUser?: User | null;
  accessToken?: string | null;
  isDriveSyncing?: boolean;
  lastDriveSync?: Date | null;
  driveFile?: GoogleDriveFileInfo | null;
  onDriveLogin?: () => Promise<void>;
  onDriveLogout?: () => Promise<void>;
  onDriveManualSync?: () => Promise<void>;
  onDrivePull?: () => Promise<void>;
}

export const MasterDataManager: React.FC<MasterDataManagerProps> = ({
  metadata,
  teachers,
  students,
  eskulList,
  bkuData,
  onUpdateMetadata,
  onUpdateTeachers,
  onUpdateStudents,
  onUpdateEskul,
  onResetAllMaster,
  onNavigateToSpj,
  currentUser = null,
  accessToken = null,
  isDriveSyncing = false,
  lastDriveSync = null,
  driveFile = null,
  onDriveLogin,
  onDriveLogout,
  onDriveManualSync,
  onDrivePull
}) => {
  const { readOnly } = useSchool();
  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>('school');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const tabs = [
    {
      id: 'school' as MasterSubTab,
      label: 'Data Sekolah',
      icon: Building2,
      count: 'Profil Resmi',
      desc: 'Identitas, TTD Pejabat & Rekening'
    },
    {
      id: 'teachers' as MasterSubTab,
      label: 'Data Guru & GTK',
      icon: Users,
      count: `${(teachers || []).length} GTK`,
      desc: 'PNS, PPPK, Honorer & Penandatangan'
    },
    {
      id: 'students' as MasterSubTab,
      label: 'Data Siswa & Rombel',
      icon: GraduationCap,
      count: `${(students || []).length} Siswa`,
      desc: 'Daftar Siswa & Rekap Rombel BOSP'
    },
    {
      id: 'eskul' as MasterSubTab,
      label: 'Data Ekstrakurikuler',
      icon: Trophy,
      count: `${(eskulList || []).length} Eskul`,
      desc: 'Pembina, Pelatih & Standar Honor SBM'
    },
    {
      id: 'drive' as MasterSubTab,
      label: 'Database Google Drive',
      icon: HardDrive,
      count: currentUser ? 'Terhubung' : 'Opsi 3',
      desc: 'Isolasi Data Pribadi per Sekolah'
    }
  ];

  // Export Complete Master JSON
  const handleExportFullMasterJson = () => {
    const fullMaster = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      school: metadata,
      teachers,
      students,
      eskul: eskulList
    };
    const jsonStr = JSON.stringify(fullMaster, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Master_Data_BOSP_${metadata.npsn || '20201363'}_${metadata.bulanTahun.replace(' ', '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Seluruh Master Data berhasil diekspor ke file JSON!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pusat Master Data Pendidikan & Keuangan BOSP
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ring-1 ring-emerald-400/30 hover:scale-[1.02]"
            title="Export & Import Master Data Guru, Siswa, Profil Sekolah, dan Eskul via Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Export & Import Excel</span>
          </button>

          <button
            onClick={onResetAllMaster}
            disabled={readOnly}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset seluruh master data ke pengaturan awal sekolah"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`p-4 rounded-2xl text-left transition-all border cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-slate-800 text-emerald-300 border border-slate-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold truncate leading-tight">{tab.label}</h3>
                <p
                  className={`text-[11px] truncate mt-0.5 ${
                    isActive ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {tab.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab View Content */}
      <div className="transition-all">
        {activeSubTab === 'school' && (
          <SchoolMasterTab
            metadata={metadata}
            onUpdateMetadata={onUpdateMetadata}
            onResetDefault={onResetAllMaster}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
          />
        )}

        {activeSubTab === 'teachers' && (
          <TeacherMasterTab
            teachers={teachers}
            metadata={metadata}
            onUpdateTeachers={onUpdateTeachers}
            onUpdateMetadata={onUpdateMetadata}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
          />
        )}

        {activeSubTab === 'students' && (
          <StudentMasterTab
            students={students}
            onUpdateStudents={onUpdateStudents}
            onOpenExcelModal={() => setIsExcelModalOpen(true)}
          />
        )}

        {activeSubTab === 'eskul' && (
          <ErrorBoundary fallbackTitle="Kendala Memuat Master Ekstrakurikuler" fallbackMessage="Terjadi kendala saat memuat data eskul atau menghubungkan ke BKU. Anda dapat mencoba memuat ulang tampilan tab ini.">
            <EskulMasterTab
              eskulList={eskulList || []}
              metadata={metadata}
              students={students || []}
              teachers={teachers || []}
              bkuData={bkuData || []}
              onUpdateEskul={onUpdateEskul}
              onNavigateToSpj={onNavigateToSpj}
            />
          </ErrorBoundary>
        )}

        {activeSubTab === 'drive' && (
          <DriveSettingsTab
            currentUser={currentUser}
            accessToken={accessToken}
            isSyncing={isDriveSyncing}
            lastDriveSync={lastDriveSync}
            driveFile={driveFile}
            metadata={metadata}
            onLogin={onDriveLogin || (async () => {})}
            onLogout={onDriveLogout || (async () => {})}
            onManualSync={onDriveManualSync || (async () => {})}
            onPullFromDrive={onDrivePull || (async () => {})}
          />
        )}
      </div>

      {/* Unified Master Data Excel Import & Export Modal */}
      <MasterExcelImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        metadata={metadata}
        teachers={teachers}
        students={students}
        eskulList={eskulList}
        onUpdateMetadata={onUpdateMetadata}
        onUpdateTeachers={onUpdateTeachers}
        onUpdateStudents={onUpdateStudents}
        onUpdateEskul={onUpdateEskul}
        onSuccessMessage={(msg) => showToast(msg)}
      />
    </div>
  );
};
