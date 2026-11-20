import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  Eye,
  KeyRound,
  Plus,
  Search,
  Settings2
} from 'lucide-react';
import { SchoolRole, SchoolSummary } from '../../types';

interface SchoolSwitcherProps {
  schools: SchoolSummary[];
  activeSchoolId: string;
  activeRole: SchoolRole;
  activeSchoolName?: string;
  activeNpsn?: string;
  onSelectSchool: (schoolId: string) => void;
  onAddSchool: () => void;
  onJoinByCode: () => void;
  onManageSchools: () => void;
  variant?: 'header' | 'sidebar';
}

const AVATAR_COLORS = [
  'bg-emerald-600 text-white',
  'bg-indigo-600 text-white',
  'bg-amber-600 text-white',
  'bg-cyan-600 text-white',
  'bg-rose-600 text-white',
  'bg-violet-600 text-white',
  'bg-teal-600 text-white',
  'bg-blue-600 text-white'
];

export function getSchoolAvatarColor(schoolId: string): string {
  let hash = 0;
  for (let i = 0; i < schoolId.length; i++) {
    hash = (hash * 31 + schoolId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getSchoolInitials(namaSekolah: string): string {
  const clean = (namaSekolah || '').trim();
  if (!clean) return 'SK';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

export function getRoleLabel(role: SchoolRole): string {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Viewer';
    default:
      return role;
  }
}

export function getRoleBadgeClasses(role: SchoolRole): string {
  switch (role) {
    case 'owner':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'editor':
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    case 'viewer':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    default:
      return 'bg-slate-700 text-slate-300 border-slate-600';
  }
}

export const SchoolSwitcher: React.FC<SchoolSwitcherProps> = ({
  schools,
  activeSchoolId,
  activeRole,
  activeSchoolName,
  activeNpsn,
  onSelectSchool,
  onAddSchool,
  onJoinByCode,
  onManageSchools,
  variant = 'header'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSummary = useMemo(
    () => schools.find((s) => s.schoolId === activeSchoolId) || schools[0],
    [schools, activeSchoolId]
  );

  const displayName = (activeSchoolName || activeSummary?.namaSekolah || 'Sekolah Aktif').trim();
  const displayNpsn = (activeNpsn || activeSummary?.npsn || '-').trim();
  const showSearch = schools.length > 6;

  const filteredSchools = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return schools;
    const q = searchQuery.trim().toLowerCase();
    return schools.filter(
      (s) =>
        (s.namaSekolah || '').toLowerCase().includes(q) ||
        (s.npsn || '').toLowerCase().includes(q)
    );
  }, [schools, searchQuery, showSearch]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const avatarColor = getSchoolAvatarColor(activeSchoolId);
  const initials = getSchoolInitials(displayName);

  return (
    <div ref={containerRef} className={`relative ${variant === 'sidebar' ? 'w-full' : 'inline-flex items-center gap-1.5'}`}>
      <div className={`flex items-center gap-1.5 ${variant === 'sidebar' ? 'w-full' : ''}`}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={`group flex items-center gap-2 rounded-lg border transition-colors text-left cursor-pointer ${
            variant === 'sidebar'
              ? 'w-full justify-between px-2.5 py-2 bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-white'
              : 'px-2 py-1 bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100 max-w-[260px] sm:max-w-[300px]'
          }`}
          title="Pindah atau kelola sekolah"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs ${avatarColor}`}
            >
              {initials}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-xs font-semibold text-white truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                NPSN: {displayNpsn || '-'}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 shrink-0 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {activeRole === 'viewer' && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold shrink-0"
            title="Akun Anda hanya memiliki akses membaca untuk sekolah ini"
          >
            <Eye className="w-3 h-3" />
            Lihat saja
          </span>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden ${
            variant === 'sidebar' ? 'left-0 right-0 w-full' : 'left-0 w-72 sm:w-80'
          }`}
        >
          <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Daftar Sekolah ({schools.length})
            </span>
          </div>

          {showSearch && (
            <div className="p-2 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama sekolah atau NPSN..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div role="listbox" className="max-h-60 overflow-y-auto py-1 divide-y divide-slate-800/60">
            {filteredSchools.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                Tidak ada sekolah yang cocok dengan pencarian.
              </div>
            ) : (
              filteredSchools.map((s) => {
                const isActive = s.schoolId === activeSchoolId;
                const itemName = isActive && activeSchoolName ? activeSchoolName : s.namaSekolah;
                const itemNpsn = isActive && activeNpsn ? activeNpsn : s.npsn;
                return (
                  <button
                    key={s.schoolId}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      setIsOpen(false);
                      if (!isActive) {
                        onSelectSchool(s.schoolId);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-950/50 text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getSchoolAvatarColor(
                          s.schoolId
                        )}`}
                      >
                        {getSchoolInitials(itemName)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{itemName || 'Tanpa Nama'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            NPSN: {itemNpsn || '-'}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeClasses(
                              s.role
                            )}`}
                          >
                            {getRoleLabel(s.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-1.5 border-t border-slate-800 bg-slate-950/70 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddSchool();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah sekolah</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onJoinByCode();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Gabung dengan kode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onManageSchools();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Kelola sekolah</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
