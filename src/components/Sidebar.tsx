import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  Upload,
  Building2,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  FileText,
  Database,
  FileCheck2,
  Trophy,
  Package,
  Brush,
  UtensilsCrossed,
  CreditCard,
  CheckCircle2,
  Hammer,
  LogOut
} from 'lucide-react';
import { SchoolMetadata, SchoolSummary } from '../types';
import { SpjSubTab } from './spj/SpjManager';
import { useSchool } from '../context/SchoolContext';
import { SchoolSwitcher } from './school/SchoolSwitcher';

export type ActiveTab = 'master' | 'dashboard' | 'processor' | 'kwitansi' | 'spj';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeSpjSubTab?: SpjSubTab;
  onSelectSpjSubTab?: (subTab: SpjSubTab) => void;
  metadata: SchoolMetadata;
  kwitansiCount: number;
  onOpenUploadModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  schools: SchoolSummary[];
  onSelectSchool: (schoolId: string) => void;
  onAddSchool: () => void;
  onManageSchools: () => void;
  onRequestLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeSpjSubTab = 'lpj-alkeb-atk',
  onSelectSpjSubTab,
  metadata,
  kwitansiCount,
  onOpenUploadModal,
  isOpenMobile,
  onCloseMobile,
  schools,
  onSelectSchool,
  onAddSchool,
  onManageSchools,
  onRequestLogout
}) => {
  const { schoolId, role, readOnly } = useSchool();
  const [isSpjDropdownOpen, setIsSpjDropdownOpen] = useState<boolean>(true);

  // Auto expand dropdown when SPJ is active
  useEffect(() => {
    if (activeTab === 'spj') {
      setIsSpjDropdownOpen(true);
    }
  }, [activeTab]);

  const lpjSubItems = [
    {
      id: 'lpj-alkeb-atk' as SpjSubTab,
      label: 'LPJ ALKEB & ATK',
      shortLabel: 'LPJ ALKEB & ATK',
      icon: Package,
      badge: 'Fokus Utama',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      disabled: false
    },
    {
      id: 'lpj-perbaikan' as SpjSubTab,
      label: 'Perbaikan Sapras',
      shortLabel: 'Perbaikan Sapras',
      icon: Hammer,
      badge: 'Aktif',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      disabled: false
    },
    {
      id: 'kwitansi' as SpjSubTab,
      label: 'Generator Kwitansi BNU',
      shortLabel: 'Kwitansi BNU',
      icon: Receipt,
      badge: 'Nonaktif',
      badgeColor: 'bg-slate-800 text-slate-500 border border-slate-700/40',
      disabled: true
    },
    {
      id: 'lpj-eskul' as SpjSubTab,
      label: 'LPJ Ekstrakurikuler',
      shortLabel: 'LPJ Eskul',
      icon: Trophy,
      badge: 'Nonaktif',
      badgeColor: 'bg-slate-800 text-slate-500 border border-slate-700/40',
      disabled: true
    },
    {
      id: 'lpj-konsumsi' as SpjSubTab,
      label: 'LPJ Kombel (Pekan Pembinaan)',
      shortLabel: 'LPJ Kombel',
      icon: UtensilsCrossed,
      badge: 'Aktif',
      badgeColor: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      disabled: false
    },
    {
      id: 'honor' as SpjSubTab,
      label: 'Tanda Terima Honor & Gaji',
      shortLabel: 'Honor & Gaji',
      icon: CreditCard,
      badge: 'Nonaktif',
      badgeColor: 'bg-slate-800 text-slate-500 border border-slate-700/40',
      disabled: true
    },
    {
      id: 'sptjb' as SpjSubTab,
      label: 'SPTJB Permendikbudristek',
      shortLabel: 'SPTJB Mutlak',
      icon: ShieldCheck,
      badge: 'Nonaktif',
      badgeColor: 'bg-slate-800 text-slate-500 border border-slate-700/40',
      disabled: true
    },
    {
      id: 'rekap' as SpjSubTab,
      label: 'Rekapitulasi Bukti SPJ',
      shortLabel: 'Rekap SPJ',
      icon: FileSpreadsheet,
      badge: 'Nonaktif',
      badgeColor: 'bg-slate-800 text-slate-500 border border-slate-700/40',
      disabled: true
    }
  ];

  // Menu Utama: Only Pengolah BKU & RKAS is active, others disabled as requested
  const regularMenuItems = [
    {
      id: 'processor' as ActiveTab,
      label: 'Pengolah BKU & RKAS',
      icon: FileSpreadsheet,
      badge: 'Fokus Utama',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      desc: '12 Bulan BKU, Upload & Tabel Data',
      disabled: false
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard Ringkasan',
      icon: LayoutDashboard,
      badge: 'Nonaktif',
      badgeColor: 'bg-slate-800 text-slate-500 border border-slate-700/40',
      desc: 'Statistik & alokasi kas BOSP',
      disabled: true
    },
    {
      id: 'master' as ActiveTab,
      label: 'Data Master Terpadu',
      icon: Database,
      badge: 'Aktif',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      desc: 'Sekolah, Guru, Siswa & Eskul',
      disabled: false
    }
  ];

  const handleSubItemClick = (subId: SpjSubTab) => {
    if (activeTab !== 'spj') {
      onTabChange('spj');
    }
    if (onSelectSpjSubTab) {
      onSelectSpjSubTab(subId);
    }
    onCloseMobile();
  };

  const isSpjActive = activeTab === 'spj' || activeTab === 'kwitansi';

  return (
    <>
      {/* Backdrop on mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-2xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out no-print ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0 border border-emerald-400/20 select-none">
            <span className="font-extrabold text-xl leading-none text-white tracking-tight">
              Y
            </span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">
              BOSP SPJ System
            </h2>
            <p className="text-[11px] text-emerald-400 font-mono font-medium">
              Master &bull; BKU &bull; SPJ / LPJ
            </p>
          </div>
        </div>

        {/* Mobile School Switcher (di bagian atas Sidebar versi mobile) */}
        <div className="p-3 border-b border-slate-800 lg:hidden">
          <SchoolSwitcher
            schools={schools}
            activeSchoolId={schoolId}
            activeRole={role}
            activeSchoolName={metadata.namaSekolah}
            activeNpsn={metadata.npsn}
            onSelectSchool={(id) => {
              onCloseMobile();
              onSelectSchool(id);
            }}
            onAddSchool={() => {
              onCloseMobile();
              onAddSchool();
            }}
            onManageSchools={() => {
              onCloseMobile();
              onManageSchools();
            }}
            variant="sidebar"
          />
        </div>

        {/* Quick Action: Upload */}
        <div className="p-4 border-b border-slate-800">
          <button
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              onOpenUploadModal();
              onCloseMobile();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Upload Dokumen
          </button>
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Menu Utama
          </div>

          {/* 1. Regular items starting with Pengolah BKU */}
          {regularMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDisabled = item.disabled;
            return (
              <button
                key={item.id}
                disabled={isDisabled}
                title={isDisabled ? 'Fitur dinonaktifkan sementara untuk fokus pada Pengolahan BKU & RKAS dan LPJ ALKEB & ATK' : undefined}
                onClick={() => {
                  if (isDisabled) return;
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                  isDisabled
                    ? 'opacity-35 cursor-not-allowed text-slate-500'
                    : isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700 ring-1 ring-slate-700/50 cursor-pointer'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}

          {/* Divider */}
          <div className="pt-2 pb-1 px-3">
            <div className="border-t border-slate-800" />
          </div>

          {/* 2. Laporan & SPJ / LPJ (Focus on LPJ ALKEB & ATK) */}
          <div className="space-y-1">
            <div
              className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer ${
                isSpjActive
                  ? 'bg-slate-800 text-white border border-slate-700 ring-1 ring-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              onClick={() => {
                if (!isSpjActive) {
                  onTabChange('spj');
                  if (onSelectSpjSubTab) onSelectSpjSubTab('lpj-alkeb-atk');
                  setIsSpjDropdownOpen(true);
                } else {
                  setIsSpjDropdownOpen(!isSpjDropdownOpen);
                }
              }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    isSpjActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">Laporan &amp; LPJ</span>
                    <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      LPJ ALKEB &amp; ATK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    LPJ ATK &amp; Kebersihan (BAST &amp; Opname)
                  </p>
                </div>
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSpjDropdownOpen(!isSpjDropdownOpen);
                }}
                className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 ml-1.5"
                title="Toggle Sub-menu LPJ"
              >
                {isSpjDropdownOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* Dropdown / Submenu list */}
            {isSpjDropdownOpen && (
              <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-slate-800 ml-5 my-1">
                {lpjSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isCurrentSub = isSpjActive && activeSpjSubTab === sub.id;
                  const isDisabled = sub.disabled;
                  return (
                    <button
                      key={sub.id}
                      disabled={isDisabled}
                      title={isDisabled ? 'Fitur dinonaktifkan sementara untuk fokus pada LPJ ALKEB & ATK' : undefined}
                      onClick={() => {
                        if (isDisabled) return;
                        handleSubItemClick(sub.id);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all text-xs ${
                        isDisabled
                          ? 'opacity-35 cursor-not-allowed text-slate-500'
                          : isCurrentSub
                          ? 'bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30 cursor-pointer'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isCurrentSub ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        />
                        <span className="truncate text-[11.5px]">{sub.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded shrink-0 ${
                          isDisabled
                            ? 'bg-slate-800/80 text-slate-500'
                            : isCurrentSub
                            ? 'bg-emerald-500/30 text-emerald-200'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sub.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* School Metadata Footer Badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs space-y-2.5">
          <div>
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{metadata.namaSekolah}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              NPSN: {metadata.npsn}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              Periode: {metadata.bulanTahun}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onRequestLogout();
            }}
            className="w-full lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-rose-950/70 hover:border-rose-700/70 text-slate-200 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>
    </>
  );
};
