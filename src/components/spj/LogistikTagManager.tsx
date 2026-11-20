import React from 'react';
import { MasterGuru, STANDARD_LOGISTIK_TAGS } from '../../types';
import {
  Users,
  Tag,
  Check,
  RefreshCw,
  Database,
  ArrowRight
} from 'lucide-react';

interface LogistikTagManagerProps {
  personnelList: MasterGuru[];
  onUpdatePersonnel: (updated: MasterGuru[]) => void;
  onResetToDefaults: () => void;
  onNavigateToMaster?: () => void;
}

export const LogistikTagManager: React.FC<LogistikTagManagerProps> = ({
  personnelList,
  onUpdatePersonnel,
  onResetToDefaults,
  onNavigateToMaster
}) => {
  const handleToggleTag = (personId: string, tagId: string) => {
    const updated = personnelList.map((p) => {
      if (p.id === personId) {
        const currentTags = p.tags || [];
        const exists = currentTags.includes(tagId);
        const newTags = exists
          ? currentTags.filter((t) => t !== tagId)
          : [...currentTags, tagId];
        return { ...p, tags: newTags };
      }
      return p;
    });
    onUpdatePersonnel(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Actions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                Manajemen Peran &amp; Target Distribusi
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">{personnelList.length} Personel Terdaftar</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Kelola Tag Personel &amp; Guru Penerima
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Tentukan peran &amp; tag pada setiap guru/staf. Saat <strong>Auto-Distribusi Cerdas</strong> dijalankan, sistem akan otomatis mencocokkan barang ATK/ALKEB dengan guru atau staf yang memiliki tag sesuai (misal: <em>Spidol</em> ke Guru Kelas &amp; Guru Mapel, <em>Alat Kebersihan</em> ke Petugas Kebersihan).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onResetToDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
              title="Reset seluruh tag berdasarkan analisis jabatan otomatis"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Deteksi Ulang dari Jabatan
            </button>

            {onNavigateToMaster && (
              <button
                type="button"
                onClick={onNavigateToMaster}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Input atau kelola guru di Data Master Terpadu"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Input Guru di Data Master</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Informational Callout regarding Data Master */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Sumber Data Tunggal:</strong> Seluruh nama guru, NIP, dan jabatan terhubung langsung dengan <strong>Data Master Terpadu</strong>. Untuk menambah atau menghapus guru, silakan buka menu Data Master.
            </span>
          </div>
          {onNavigateToMaster && (
            <button
              type="button"
              onClick={onNavigateToMaster}
              className="shrink-0 text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer text-xs flex items-center gap-1"
            >
              Kelola Data Master &rarr;
            </button>
          )}
        </div>

        {/* Legend of Available Tags */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Daftar Tag Standar Distribusi Logistik:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {STANDARD_LOGISTIK_TAGS.map((t) => (
              <div
                key={t.id}
                className={`p-2.5 rounded-2xl border ${t.colorBg} flex flex-col justify-between`}
              >
                <div>
                  <div className="text-xs font-bold">{t.shortLabel}</div>
                  <div className="text-[10px] opacity-80 mt-0.5 leading-tight">{t.description}</div>
                </div>
                <div className="text-[9.5px] font-mono mt-1.5 pt-1 border-t border-current/20 opacity-70">
                  ID: {t.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personnel Table with Interactive Tag Pills */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Daftar Guru, Staf &amp; Tag Penerima Barang
            </h4>
            <p className="text-xs text-slate-500">
              Klik tag untuk mengaktifkan atau menonaktifkan peran logistik bagi masing-masing personel.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {personnelList.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h5 className="text-sm font-bold text-slate-700">Data Master Guru Masih Kosong</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Pengelolaan tag personel dan pendistribusian ATK/ALKEB mengambil data guru langsung dari Data Master. Belum ada guru atau staf yang terdaftar di Data Master Terpadu.
              </p>
              {onNavigateToMaster && (
                <button
                  type="button"
                  onClick={onNavigateToMaster}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Input Data Guru di Data Master</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            personnelList.map((person, idx) => {
              const currentTags = person.tags || [];
              const isKepsek = (person.jabatan || '').toLowerCase().includes('kepala sekolah');

              return (
                <div
                  key={person.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  {/* Person Info */}
                  <div className="flex items-start gap-3 min-w-[260px]">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{person.nama}</span>
                        {isKepsek && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9.5px] font-bold rounded-md uppercase">
                            Kepala Sekolah
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {person.jabatan}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        NIP: {person.nip || '-'} &bull; Status: {person.statusKepegawaian}
                      </div>
                    </div>
                  </div>

                  {/* Tag Pills Selector */}
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Tag Peran Logistik Terpasang ({currentTags.length}):
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {STANDARD_LOGISTIK_TAGS.map((tagDef) => {
                        const isActive = currentTags.includes(tagDef.id);
                        return (
                          <button
                            key={tagDef.id}
                            onClick={() => handleToggleTag(person.id, tagDef.id as string)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? `${tagDef.colorBadge} ring-1 ring-inset ${tagDef.colorBorder} shadow-2xs font-bold`
                                : 'bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                            }`}
                            title={`${isActive ? 'Aktif' : 'Nonaktif'}: ${tagDef.description}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-current' : 'bg-slate-300'
                              }`}
                            />
                            {tagDef.shortLabel}
                            {isActive && <Check className="w-3 h-3 text-current ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
