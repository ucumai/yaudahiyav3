import React from 'react';
import { SchoolMetadata, SchoolRole, SchoolSummary } from '../types';
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Menu,
  AlertTriangle,
  Receipt,
  LayoutDashboard,
  Database,
  FileCheck2,
  LogOut
} from 'lucide-react';
import { ActiveTab } from './Sidebar';
import { CloudSyncBadge } from './CloudSyncBadge';
import { GoogleDriveSyncBadge } from './GoogleDriveSyncBadge';
import { CloudSyncStatus } from '../lib/firebaseSync';
import { User } from 'firebase/auth';
import { GoogleDriveFileInfo, DriveRealtimeStatus } from '../lib/googleDriveSync';
import { SchoolSwitcher } from './school/SchoolSwitcher';

interface HeaderProps {
  metadata: SchoolMetadata;
  activeTab: ActiveTab;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  isCopied: boolean;
  onToggleExpandAll: () => void;
  allExpanded: boolean;
  onOpenJsonModal: () => void;
  onOpenUploadModal?: () => void;
  onToggleMobileSidebar: () => void;
  syncStatus?: CloudSyncStatus;
  lastSyncedTime?: Date | null;
  onForceSync?: () => void;
  currentUser?: User | null;
  accessToken?: string | null;
  isDriveSyncing?: boolean;
  driveRealtimeStatus?: DriveRealtimeStatus;
  lastDriveSync?: Date | null;
  driveFile?: GoogleDriveFileInfo | null;
  isExistingUser?: boolean;
  isDriveReconnecting?: boolean;
  onDriveLogin?: () => Promise<void>;
  onDriveLogout?: () => Promise<void>;
  onDriveManualSync?: () => Promise<void>;
  onDrivePull?: () => Promise<void>;
  schools: SchoolSummary[];
  activeSchoolId: string;
  activeRole: SchoolRole;
  onSelectSchool: (schoolId: string) => void;
  onAddSchool: () => void;
  onManageSchools: () => void;
  onRequestLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  activeTab,
  onToggleMobileSidebar,
  syncStatus = 'synced',
  lastSyncedTime,
  onForceSync,
  currentUser = null,
  accessToken = null,
  isDriveSyncing = false,
  driveRealtimeStatus = 'idle',
  lastDriveSync = null,
  driveFile = null,
  isExistingUser = false,
  isDriveReconnecting = false,
  onDriveLogin,
  onDriveLogout,
  onDriveManualSync,
  onDrivePull,
  schools,
  activeSchoolId,
  activeRole,
  onSelectSchool,
  onAddSchool,
  onManageSchools,
  onRequestLogout
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard Keuangan BOSP',
          subtitle: 'Statistik & Ringkasan Alokasi Anggaran Belanja',
          icon: LayoutDashboard
        };
      case 'kwitansi':
        return {
          title: 'Generator Kwitansi Pengeluaran BNU',
          subtitle: 'Cetak Kwitansi Lengkap dengan TTD Kepala Sekolah & Bendahara',
          icon: Receipt
        };
      case 'spj':
        return {
          title: 'Modul Laporan & SPJ / LPJ BOSP',
          subtitle: 'LPJ Ekstrakurikuler, SPTJB Permendikbudristek, Tanda Terima Honor & Rekap SPJ',
          icon: FileCheck2
        };
      case 'master':
        return {
          title: 'Master Data Terpadu Sekolah',
          subtitle: 'Basis Data Terpusat: Profil Sekolah, Guru & GTK, Siswa, serta Ekstrakurikuler',
          icon: Database
        };
      default:
        return {
          title: 'Pengolah Data BKU & RKAS',
          subtitle: 'Data Pipeline & Rekonsiliasi Parent-Child Transaksi Keuangan Sekolah',
          icon: FileSpreadsheet
        };
    }
  };

  const currentTabInfo = getTabTitle();
  const Icon = currentTabInfo.icon;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shrink-0 mt-0.5 cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    {currentTabInfo.title}
                  </h1>
                  <p className="text-xs text-slate-400">
                    {currentTabInfo.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                <SchoolSwitcher
                  schools={schools}
                  activeSchoolId={activeSchoolId}
                  activeRole={activeRole}
                  activeSchoolName={metadata.namaSekolah}
                  activeNpsn={metadata.npsn}
                  onSelectSchool={onSelectSchool}
                  onAddSchool={onAddSchool}
                  onManageSchools={onManageSchools}
                  variant="header"
                />

                <span className="flex items-center gap-1 font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-700/80 px-2.5 py-1 rounded-lg">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[220px] sm:max-w-[280px]">
                    {metadata.namaSekolah || 'Satuan Pendidikan'}
                  </span>
                </span>
                <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg text-slate-300 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  {metadata.bulanTahun || 'Periode Berjalan'}
                </span>
                <span className="bg-amber-950/50 text-amber-300 border border-amber-800/80 px-2 py-1 rounded-lg font-mono text-[11px]">
                  {metadata.sumberDana}
                </span>
              </div>
            </div>
          </div>

          {/* Cloud Database Synchronization Status & Safe Logout */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <GoogleDriveSyncBadge
              currentUser={currentUser}
              accessToken={accessToken}
              isSyncing={isDriveSyncing}
              realtimeStatus={driveRealtimeStatus}
              lastDriveSync={lastDriveSync}
              driveFile={driveFile}
              isExistingUser={isExistingUser}
              isReconnecting={isDriveReconnecting}
              onLogin={onDriveLogin || (async () => {})}
              onLogout={onDriveLogout || (async () => {})}
              onManualSync={onDriveManualSync || (async () => {})}
              onPullFromDrive={onDrivePull || (async () => {})}
            />

            <CloudSyncBadge
              status={syncStatus}
              lastSyncedTime={lastSyncedTime}
              onForceSync={onForceSync}
            />

            <button
              type="button"
              onClick={onRequestLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-700/70 text-slate-200 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Keluar akun & bersihkan cache lokal (aman untuk komputer bersama)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {syncStatus === 'quota_exceeded' && (
          <div className="mt-3 p-3 bg-amber-950/90 border border-amber-600/80 rounded-xl text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="leading-relaxed">
                <strong>Quota Firestore Harian Terlampaui:</strong> Batas unit penulisan harian database proyek ini telah tercapai. Aplikasi otomatis beroperasi dalam mode penyimpanan lokal &amp; Google Drive. Quota akan ter-reset otomatis besok.
              </span>
            </div>
            <a
              href="https://console.firebase.google.com/project/ai-studio-remixremixekstra-41b64632-477f-4c51-ad28-420169747d01/firestore/databases/ai-studio-remixremixekstra-41b64632-477f-4c51-ad28-420169747d01/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-sm"
            >
              Atur Quota / Upgrade
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
