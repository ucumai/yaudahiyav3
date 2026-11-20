import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MasterEskul, MasterSiswa, MasterGuru, SchoolMetadata, TransaksiBKU, EskulAnggota, EskulPrestasi, EskulPelatihItem } from '../../types';
import { formatRupiah } from '../SummaryCards';
import {
  Trophy,
  Plus,
  Search,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Phone,
  Sparkles,
  FileText,
  UserPlus,
  Award,
  Link2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  UserCheck,
  X,
  FileCheck2,
  AlertTriangle,
  Save,
  CalendarCheck
} from 'lucide-react';
import { getThematicEskulProtaMatrix, generateDynamicProtaMatrix } from '../../utils/pramukaProtaIntegration';
import { findEskulProtaProfile } from '../../data/eskulProtaDataBank';
import { useSchool } from '../../context/SchoolContext';

export const STATIC_ESKUL_LIST: { name: string; kategori: MasterEskul['kategori'] }[] = [
  { name: 'Pramuka', kategori: 'Kepanduan' },
  { name: 'Paskibra', kategori: 'Kepanduan' },
  { name: 'PMR', kategori: 'Kepanduan' },
  { name: 'Futsal', kategori: 'Olahraga' },
  { name: 'Sepak Bola', kategori: 'Olahraga' },
  { name: 'Basket', kategori: 'Olahraga' },
  { name: 'Voli', kategori: 'Olahraga' },
  { name: 'Bulu Tangkis', kategori: 'Olahraga' },
  { name: 'Silat', kategori: 'Olahraga' },
  { name: 'Tari', kategori: 'Seni & Budaya' },
  { name: 'Seni Musik', kategori: 'Seni & Budaya' },
  { name: 'Paduan Suara', kategori: 'Seni & Budaya' },
  { name: 'Menggambar', kategori: 'Seni & Budaya' },
  { name: 'Melukis', kategori: 'Seni & Budaya' },
  { name: 'Bahasa Inggris', kategori: 'Akademik' },
  { name: 'Komputer', kategori: 'Akademik' },
  { name: 'Sains', kategori: 'Akademik' },
  { name: 'Tahfiz', kategori: 'Keagamaan' },
  { name: "Baca Tulis Al-Qur'an (BTQ)", kategori: 'Keagamaan' },
  { name: 'Marawis', kategori: 'Keagamaan' },
  { name: 'Hadroh', kategori: 'Keagamaan' },
  { name: 'KIR (Karya Ilmiah Remaja)', kategori: 'Akademik' },
  { name: 'Teater', kategori: 'Seni & Budaya' },
  { name: 'Jurnalistik', kategori: 'Akademik' },
  { name: 'Catur', kategori: 'Akademik' },
  { name: 'Renang', kategori: 'Olahraga' },
  { name: 'Karate', kategori: 'Olahraga' },
  { name: 'Kaligrafi', kategori: 'Keagamaan' }
];

interface SearchableEskulDropdownProps {
  value: string;
  onChange: (name: string, kategori?: MasterEskul['kategori']) => void;
  placeholder?: string;
}

const SearchableEskulDropdown: React.FC<SearchableEskulDropdownProps> = ({
  value,
  onChange,
  placeholder = 'Pilih / Cari Ekstrakurikuler...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return STATIC_ESKUL_LIST;
    return STATIC_ESKUL_LIST.filter(
      (item) => item.name.toLowerCase().includes(term) || item.kategori.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleSelect = (item: { name: string; kategori: MasterEskul['kategori'] }) => {
    onChange(item.name, item.kategori);
    setSearchTerm(item.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const getKategoriBadgeColor = (kat: string) => {
    switch (kat) {
      case 'Kepanduan':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Olahraga':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Seni & Budaya':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Keagamaan':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Akademik':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          required
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-3 pr-16 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:font-normal placeholder:text-slate-400"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                onChange('');
                setIsOpen(true);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              title="Bersihkan input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-500 hover:text-indigo-600 rounded-md transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          <div className="p-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between text-[11px]">
            <span className="font-bold text-indigo-950 flex items-center gap-1">
              <Search className="w-3 h-3 text-indigo-600" />
              Pilih dari 28 Ekstrakurikuler
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">
              {filteredOptions.length} cocok
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((item) => {
                const isSelected = (value || '').trim().toLowerCase() === item.name.toLowerCase();
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    <span
                      className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getKategoriBadgeColor(
                        item.kategori
                      )}`}
                    >
                      {item.kategori}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Tidak ada eskul statis yang cocok.</p>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  Anda tetap dapat menggunakan nama manual: "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const getCoachesFromEskul = (eskul?: Partial<MasterEskul> | null): EskulPelatihItem[] => {
  if (!eskul) return [];
  if (Array.isArray(eskul.daftarPelatih) && eskul.daftarPelatih.length > 0) {
    return eskul.daftarPelatih;
  }
  const rawName = (eskul.namaPelatih || '').trim();
  if (!rawName) {
    return [
      {
        id: `coach-1`,
        nama: '',
        peran: 'Pelatih Utama',
        noHp: eskul.noHpPelatih || '',
        noRekening: eskul.noRekeningPelatih || '',
        bank: eskul.bankPelatih || 'Bank BJB',
        honorPerKegiatan: eskul.honorPerKegiatan || 75000
      }
    ];
  }
  const splitNames = rawName.split(/[,&]|\bdan\b/i).map((s) => s.trim()).filter(Boolean);
  if (splitNames.length > 1) {
    return splitNames.map((n, idx) => ({
      id: `coach-${idx + 1}`,
      nama: n,
      peran: idx === 0 ? 'Pelatih Utama' : `Pelatih ${idx + 1}`,
      noHp: idx === 0 ? eskul.noHpPelatih || '' : '',
      noRekening: idx === 0 ? eskul.noRekeningPelatih || '' : '',
      bank: idx === 0 ? eskul.bankPelatih || 'Bank BJB' : 'Bank BJB',
      honorPerKegiatan: eskul.honorPerKegiatan || 75000
    }));
  }
  return [
    {
      id: `coach-1`,
      nama: rawName,
      peran: 'Pelatih Utama',
      noHp: eskul.noHpPelatih || '',
      noRekening: eskul.noRekeningPelatih || '',
      bank: eskul.bankPelatih || 'Bank BJB',
      honorPerKegiatan: eskul.honorPerKegiatan || 75000
    }
  ];
};

interface EskulProtaMatrixModalProps {
  eskul: MasterEskul;
  onClose: () => void;
  onSave: (customMatrix: { text: string; months: number[]; keterangan?: string }[]) => void;
}

const EskulProtaMatrixModal: React.FC<EskulProtaMatrixModalProps> = ({ eskul, onClose, onSave }) => {
  const [variationCount, setVariationCount] = useState(0);
  const [matrixRows, setMatrixRows] = useState<{ id: string; text: string; months: number[]; keterangan?: string }[]>(() => {
    if (eskul.matriksProtaCustom && eskul.matriksProtaCustom.length > 0) {
      return eskul.matriksProtaCustom.map((m, idx) => ({
        id: `row-${idx + 1}-${Date.now()}`,
        text: m.text,
        months: m.months,
        keterangan: m.keterangan || ''
      }));
    }
    const defaultThematic = getThematicEskulProtaMatrix(eskul);
    return defaultThematic.map((m, idx) => ({
      id: `row-${idx + 1}-${Date.now()}`,
      text: m.text,
      months: m.months,
      keterangan: m.keterangan || ''
    }));
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleToggleMonth = (rowIdx: number, monthNum: number) => {
    setMatrixRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIdx) return r;
        const exists = r.months.includes(monthNum);
        const newMonths = exists
          ? r.months.filter((m) => m !== monthNum)
          : [...r.months, monthNum].sort((a, b) => a - b);
        return { ...r, months: newMonths };
      })
    );
  };

  const handleTextChange = (rowIdx: number, val: string) => {
    setMatrixRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, text: val } : r))
    );
  };

  const handleAddRow = () => {
    const newId = `row-${matrixRows.length + 1}-${Date.now()}`;
    setMatrixRows((prev) => [
      ...prev,
      {
        id: newId,
        text: '',
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        keterangan: 'Terjadwal'
      }
    ]);
  };

  const handleDeleteRow = (rowIdx: number) => {
    setMatrixRows((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const handleAiGenerate = () => {
    setIsAiLoading(true);
    const targetCount = matrixRows.length > 0 ? matrixRows.length : 9;
    const nextSeed = variationCount + 1;
    setVariationCount(nextSeed);

    setTimeout(() => {
      // Generate dinamis berbasis nama eskul (basic prompt) dan kategori
      // Menjaga jumlah baris yang ada (termasuk field baru yang baru ditambahkan user)
      const generated = generateDynamicProtaMatrix(
        eskul.namaEskul,
        eskul.kategori,
        targetCount,
        nextSeed
      );

      setMatrixRows((prev) =>
        generated.map((g, idx) => ({
          id: prev[idx]?.id || `row-${idx + 1}-${Date.now()}-${nextSeed}`,
          text: g.text,
          months: g.months,
          keterangan: g.keterangan
        }))
      );

      setIsAiLoading(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }, 250);
  };

  const handleSaveAndClose = () => {
    const clean = matrixRows
      .filter((r) => r.text.trim().length > 0)
      .map((r) => ({
        text: r.text.trim(),
        months: r.months,
        keterangan: r.keterangan || (r.months.length === 12 ? 'Rutin' : 'Terjadwal')
      }));
    onSave(clean);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Susun Program Tahunan (PROTA) &amp; Matriks 12 Bulan
              </h3>
              <p className="text-xs text-indigo-700 font-semibold">
                {eskul.namaEskul} &bull; Kategori: {eskul.kategori}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs">
          <div className="text-slate-700">
            <p className="font-bold text-indigo-950">📋 Form Rencana Program Kerja Tahunan ({matrixRows.length} Kegiatan)</p>
            <p className="text-[11px] text-slate-500">
              Ketik nama kegiatan pada input teks dan beri centang pada bulan pelaksanaannya (Bulan I s.d. XII).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isAiLoading}
              onClick={handleAiGenerate}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {isAiLoading ? 'Menyusun...' : '✨ Generate Program Tahunan (AI)'}
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" /> + Tambah Baris
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-xs max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-indigo-950 text-white font-bold sticky top-0 z-10 text-center">
              <tr>
                <th className="p-2.5 w-10 border-r border-indigo-800">No</th>
                <th className="p-2.5 min-w-[280px] text-left border-r border-indigo-800">Nama Kegiatan / Program Kerja</th>
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((m, idx) => (
                  <th key={m} className="p-2 w-10 border-r border-indigo-800 text-[11px]" title={`Bulan ${idx + 1}`}>
                    {m}
                  </th>
                ))}
                <th className="p-2 w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {matrixRows.map((row, rIdx) => (
                <tr key={row.id || rIdx} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-2 text-center font-mono text-xs text-slate-500 font-bold">
                    {rIdx + 1}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={row.text}
                      onChange={(e) => handleTextChange(rIdx, e.target.value)}
                      placeholder={`Contoh kegiatan ${rIdx + 1}: Latihan Rutin / Pembinaan Fisik...`}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                    const isChecked = row.months.includes(m);
                    return (
                      <td key={m} className="p-1 text-center">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMonth(rIdx, m)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(rIdx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Matriks PROTA berhasil disimpan!
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Total {matrixRows.filter((r) => r.text.trim().length > 0).length} butir program terdaftar
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Matriks PROTA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EskulProtaMatrixCardSectionProps {
  eskul: MasterEskul;
  onOpenModal: () => void;
  onSave: (updatedMatrix: { text: string; months: number[]; keterangan?: string }[]) => void;
}

const EskulProtaMatrixCardSection: React.FC<EskulProtaMatrixCardSectionProps> = ({ eskul, onOpenModal, onSave }) => {
  const { readOnly } = useSchool();
  const [isOpen, setIsOpen] = useState(false);
  const [variationCount, setVariationCount] = useState(0);
  const [matrixRows, setMatrixRows] = useState<{ id: string; text: string; months: number[]; keterangan?: string }[]>(() => {
    if (eskul.matriksProtaCustom && eskul.matriksProtaCustom.length > 0) {
      return eskul.matriksProtaCustom.map((m, idx) => ({
        id: `row-${idx + 1}-${Date.now()}`,
        text: m.text,
        months: m.months,
        keterangan: m.keterangan || ''
      }));
    }
    const defaultThematic = getThematicEskulProtaMatrix(eskul);
    return defaultThematic.map((m, idx) => ({
      id: `row-${idx + 1}-${Date.now()}`,
      text: m.text,
      months: m.months,
      keterangan: m.keterangan || ''
    }));
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleToggleMonth = (rowIdx: number, monthNum: number) => {
    if (readOnly) return;
    setMatrixRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIdx) return r;
        const exists = r.months.includes(monthNum);
        const newMonths = exists
          ? r.months.filter((m) => m !== monthNum)
          : [...r.months, monthNum].sort((a, b) => a - b);
        return { ...r, months: newMonths };
      })
    );
  };

  const handleTextChange = (rowIdx: number, val: string) => {
    if (readOnly) return;
    setMatrixRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, text: val } : r))
    );
  };

  const handleAddRow = () => {
    if (readOnly) return;
    const newId = `row-${matrixRows.length + 1}-${Date.now()}`;
    setMatrixRows((prev) => [
      ...prev,
      {
        id: newId,
        text: '',
        months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        keterangan: 'Terjadwal'
      }
    ]);
  };

  const handleDeleteRow = (rowIdx: number) => {
    if (readOnly) return;
    setMatrixRows((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const handleAiGenerate = () => {
    if (readOnly) return;
    setIsAiLoading(true);
    const targetCount = matrixRows.length > 0 ? matrixRows.length : 9;
    const nextSeed = variationCount + 1;
    setVariationCount(nextSeed);

    setTimeout(() => {
      const generated = generateDynamicProtaMatrix(
        eskul.namaEskul,
        eskul.kategori,
        targetCount,
        nextSeed
      );

      setMatrixRows((prev) =>
        generated.map((g, idx) => ({
          id: prev[idx]?.id || `row-${idx + 1}-${Date.now()}-${nextSeed}`,
          text: g.text,
          months: g.months,
          keterangan: g.keterangan
        }))
      );

      setIsAiLoading(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }, 250);
  };

  const handleSave = () => {
    if (readOnly) return;
    const clean = matrixRows
      .filter((r) => r.text.trim().length > 0)
      .map((r) => ({
        text: r.text.trim(),
        months: r.months,
        keterangan: r.keterangan || (r.months.length === 12 ? 'Rutin' : 'Terjadwal')
      }));
    onSave(clean);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/90 rounded-xl text-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="font-bold text-indigo-950 text-[11px] truncate">
            Matriks Program Tahunan (PROTA)
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-200/80 text-indigo-900 text-[10px] font-mono font-bold shrink-0">
            {matrixRows.length} Kegiatan
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenModal}
            className="text-[10.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
            title="Buka form input teks kegiatan dan centang bulan di modal layar penuh"
          >
            <CalendarCheck className="w-3 h-3 text-amber-300" />
            <span>Buka Form Modal</span>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-[10.5px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            {isOpen ? 'Tutup' : 'Expand'}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="space-y-2.5 pt-1.5 border-t border-indigo-100/90 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[10px] text-slate-600 leading-tight">
            <span>Rincian kegiatan &amp; centang bulan pelaksanaan (I - XII):</span>
            <span className="font-mono text-indigo-900 font-bold">{matrixRows.length} item terdaftar</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-indigo-200 bg-white shadow-2xs max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[10.5px]">
              <thead className="bg-indigo-900 text-white font-bold sticky top-0 z-10 text-center">
                <tr>
                  <th className="p-1 w-5 border-r border-indigo-800">#</th>
                  <th className="p-1.5 min-w-[160px] text-left border-r border-indigo-800">Nama Kegiatan / Program Kerja</th>
                  {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((m, idx) => (
                    <th key={m} className="p-1 w-5 border-r border-indigo-800 text-[9.5px]" title={`Bulan ${idx + 1}`}>
                      {m}
                    </th>
                  ))}
                  <th className="p-1 w-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrixRows.map((row, rIdx) => (
                  <tr key={row.id || rIdx} className="hover:bg-slate-50/90 transition-colors">
                    <td className="p-1 text-center font-mono text-[10px] text-slate-500 font-bold">
                      {rIdx + 1}
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={row.text}
                        disabled={readOnly}
                        onChange={(e) => handleTextChange(rIdx, e.target.value)}
                        placeholder={`Kegiatan program ${rIdx + 1}...`}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
                      />
                    </td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const isChecked = row.months.includes(m);
                      return (
                        <td key={m} className="p-0.5 text-center">
                          <label className="inline-flex items-center justify-center p-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={readOnly}
                              onChange={() => handleToggleMonth(rIdx, m)}
                              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                            />
                          </label>
                        </td>
                      );
                    })}
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleDeleteRow(rIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Hapus baris kegiatan ini"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={readOnly}
                onClick={handleAddRow}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3 text-indigo-600" /> + Tambah Kegiatan
              </button>

              <button
                type="button"
                disabled={readOnly || isAiLoading}
                onClick={handleAiGenerate}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sintesis otomatis daftar kegiatan dan centang bulan dengan AI"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                {isAiLoading ? 'Menyusun...' : '✨ Generate Program (AI)'}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {savedSuccess && (
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 animate-in fade-in">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Tersimpan!
                </span>
              )}
              <button
                type="button"
                disabled={readOnly}
                onClick={handleSave}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" /> 💾 Simpan
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 pt-0.5">
          <div className="flex flex-wrap gap-1">
            {matrixRows.slice(0, 3).map((r, i) => (
              <span
                key={r.id || i}
                className="text-[10px] bg-white/90 text-slate-700 px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-[200px]"
                title={r.text}
              >
                {i + 1}. {r.text || 'Belum diisi'}
              </span>
            ))}
            {matrixRows.length > 3 && (
              <span className="text-[9.5px] text-indigo-700 font-semibold self-center px-1">
                +{matrixRows.length - 3} kegiatan lainnya...
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface EskulMasterTabProps {
  eskulList: MasterEskul[];
  metadata: SchoolMetadata;
  students: MasterSiswa[];
  teachers: MasterGuru[];
  bkuData: TransaksiBKU[];
  onUpdateEskul: (newList: MasterEskul[]) => void;
  onNavigateToSpj?: (eskulId?: string) => void;
}

export const EskulMasterTab: React.FC<EskulMasterTabProps> = ({
  eskulList,
  metadata,
  students,
  teachers,
  bkuData,
  onUpdateEskul,
  onNavigateToSpj
}) => {
  const { readOnly } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEskul, setEditingEskul] = useState<MasterEskul | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals for Members, Achievements
  const [managingMembersEskul, setManagingMembersEskul] = useState<MasterEskul | null>(null);
  const [managingPrestasiEskul, setManagingPrestasiEskul] = useState<MasterEskul | null>(null);
  const [editingProtaMatrixEskul, setEditingProtaMatrixEskul] = useState<MasterEskul | null>(null);

  // Member Form Inside Managing Member Modal
  const [selectedStudentNisn, setSelectedStudentNisn] = useState('');
  const [selectedPeran, setSelectedPeran] = useState<EskulAnggota['peran']>('Anggota');

  // Prestasi Form Inside Managing Prestasi Modal
  const [newPrestasi, setNewPrestasi] = useState<{
    namaKegiatan: string;
    tanggalPelaksanaan: string;
    tingkat: EskulPrestasi['tingkat'];
    capaian: string;
  }>({
    namaKegiatan: '',
    tanggalPelaksanaan: '2026-02-15',
    tingkat: 'Kecamatan',
    capaian: ''
  });

  // Eskul Create / Edit Form State
  const [formData, setFormData] = useState<Partial<MasterEskul>>({
    namaEskul: '',
    kategori: 'Olahraga',
    namaPembina: '',
    nipPembina: '',
    namaPelatih: '',
    noHpPelatih: '',
    noRekeningPelatih: '',
    bankPelatih: 'Bank BJB',
    honorPerKegiatan: 75000,
    jadwalLatihan: 'Setiap Hari Jumat, 14.00 WIB',
    lokasi: 'Lapangan Utama Sekolah',
    deskripsiProgram: '',
    targetCapaian: '',
    evaluasiTahunan: '',
    sumberHonor: 'otomatis_bku',
    kataKunciBKU: '',
    noBkuTerkait: '',
    namaPembinaGudep: '',
    nipPembinaGudep: '',
    tujuanTahunanKeywords: '',
    fokusProgramTahunan: [],
    variasiUrutanKurikulum: 1
  });

  // Multiple coaches state in the form
  const [coachList, setCoachList] = useState<EskulPelatihItem[]>([
    {
      id: 'coach-1',
      nama: '',
      peran: 'Pelatih Utama',
      noHp: '',
      noRekening: '',
      bank: 'Bank BJB',
      honorPerKegiatan: 75000
    }
  ]);

  // Modal confirmation for deleting eskul (replaces window.confirm)
  const [eskulToDelete, setEskulToDelete] = useState<{ id: string; name: string } | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Helper to find matching BKU transaction for honor
  const getBkuHonorForEskul = (eskul: MasterEskul) => {
    if (!eskul) {
      return {
        isBkuLinked: false,
        noBku: '-',
        totalReal: 0,
        uraian: 'Honor Pelatih',
        volume: 4,
        satuan: 'orang / hari',
        hargaSatuan: 75000,
        tanggal: '25-02-2026'
      };
    }

    const safeBku = bkuData || [];
    const eskulLower = (eskul.namaEskul || '').toLowerCase().trim();
    const eskulKw = (eskul.kataKunciBKU || '').toLowerCase().trim();

    const foundTx = safeBku.find((tx) => {
      if (!tx) return false;
      if (eskul.noBkuTerkait && tx.no_bku === eskul.noBkuTerkait) return true;
      const txKet = (tx.keterangan || '').toLowerCase();
      if (eskulKw && txKet.includes(eskulKw)) {
        return true;
      }
      if (eskulLower && txKet.includes(eskulLower)) return true;
      return (tx.rincian_barang || []).some((r) => {
        const u = (r?.uraian_barang || '').toLowerCase();
        return eskulLower && u.includes(eskulLower);
      });
    });

    if (foundTx) {
      const item = (foundTx.rincian_barang || [])[0];
      return {
        isBkuLinked: true,
        noBku: foundTx.no_bku || '-',
        totalReal: Number(foundTx.total_pengeluaran_bku) || 0,
        uraian: item?.uraian_barang || foundTx.keterangan || `Honor Pelatih ${eskul.namaEskul || ''}`,
        volume: item?.volume || 4,
        satuan: item?.satuan || 'orang / hari',
        hargaSatuan: item?.harga_satuan || eskul.honorPerKegiatan || 75000,
        tanggal: foundTx.tanggal || ''
      };
    }

    return {
      isBkuLinked: false,
      noBku: eskul.noBkuTerkait || '-',
      totalReal: (Number(eskul.honorPerKegiatan) || 75000) * 4,
      uraian: `Honor Pelatih ${eskul.namaEskul || ''}`,
      volume: 4,
      satuan: 'orang / hari',
      hargaSatuan: Number(eskul.honorPerKegiatan) || 75000,
      tanggal: '25-02-2026'
    };
  };

  // Available BKU Transactions that are honor/service related
  const bkuHonorTransactions = useMemo(() => {
    const safeBku = bkuData || [];
    return safeBku.filter((d) => {
      if (!d) return false;
      const ket = (d.keterangan || '').toLowerCase();
      const isHonorText =
        ket.includes('jasa') ||
        ket.includes('pelatih') ||
        ket.includes('honor') ||
        ket.includes('ekstrakulikuler') ||
        ket.includes('ekstrakurikuler');
      const hasHonorAccount = (d.rincian_barang || []).some((r) =>
        (r?.kode_rekening || '').includes('5.1.02.02.01.0029') ||
        (r?.kode_rekening || '').includes('5.1.02.02.01.0013') ||
        (r?.kode_rekening || '').includes('0029') ||
        (r?.kode_rekening || '').includes('0013')
      );
      return (
        (d.tipe_transaksi === 'Pengeluaran' || !d.tipe_transaksi) &&
        (isHonorText || hasHonorAccount || d.klasifikasi === 'Ekstrakurikuler' || d.klasifikasi === 'Honorarium')
      );
    });
  }, [bkuData]);

  const totalAnggotaSemuaEskul = useMemo(() => {
    return (eskulList || []).reduce((acc, curr) => acc + ((curr?.anggotaSiswa || []).length), 0);
  }, [eskulList]);

  const totalHonorPelatihReal = useMemo(() => {
    return (eskulList || []).reduce((acc, curr) => {
      const bku = getBkuHonorForEskul(curr);
      return acc + (bku?.totalReal || 0);
    }, 0);
  }, [eskulList, bkuData]);

  const filteredEskul = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    return (eskulList || []).filter((item) => {
      if (!item) return false;
      const matchSearch =
        !term ||
        (item.namaEskul || '').toLowerCase().includes(term) ||
        (item.namaPembina || '').toLowerCase().includes(term) ||
        (item.namaPelatih || '').toLowerCase().includes(term) ||
        (item.anggotaSiswa || []).some((s) => (s?.nama || '').toLowerCase().includes(term));
      const matchKategori = kategoriFilter === 'all' || item.kategori === kategoriFilter;
      return matchSearch && matchKategori;
    });
  }, [eskulList, searchTerm, kategoriFilter]);

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    if (readOnly) return;
    setEditingEskul(null);
    setFormData({
      namaEskul: '',
      kategori: 'Olahraga',
      namaPembina: teachers[0]?.nama || '',
      nipPembina: teachers[0]?.nip || '',
      namaPelatih: '',
      noHpPelatih: '',
      noRekeningPelatih: '',
      bankPelatih: 'Bank BJB',
      honorPerKegiatan: 75000,
      jadwalLatihan: 'Setiap Hari Jumat, 14.00 - 16.00 WIB',
      lokasi: 'Lapangan Utama Sekolah',
      deskripsiProgram: 'Pembinaan potensi minat bakat peserta didik secara terprogram dan berkala.',
      targetCapaian: 'Mengikuti lomba/kompetisi tingkat kecamatan dan meraih prestasi terbaik.',
      evaluasiTahunan: 'Kegiatan berjalan tertib dan lancar sesuai jadwal program kerja.',
      sumberHonor: 'otomatis_bku',
      kataKunciBKU: '',
      noBkuTerkait: '',
      namaPembinaGudep: '',
      nipPembinaGudep: '',
      tujuanTahunanKeywords: '',
      fokusProgramTahunan: [],
      variasiUrutanKurikulum: 1
    });
    setCoachList([
      {
        id: `coach-${Date.now()}-1`,
        nama: '',
        peran: 'Pelatih Utama',
        noHp: '',
        noRekening: '',
        bank: 'Bank BJB',
        honorPerKegiatan: 75000
      }
    ]);
    setIsModalOpen(true);
  };

  const handleAddPramukaPreset = (tipe: 'siaga' | 'penggalang') => {
    if (readOnly) return;
    const isSiaga = tipe === 'siaga';
    const eskulName = isSiaga ? 'Pramuka Siaga' : 'Pramuka Penggalang';
    setEditingEskul(null);
    setFormData({
      namaEskul: eskulName,
      kategori: 'Kepanduan',
      namaPembina: teachers[0]?.nama || metadata.bendahara || (isSiaga ? 'Bunda Pembina Siaga' : 'Kakak Pembina Penggalang'),
      nipPembina: teachers[0]?.nip || '198203152010011012',
      namaPelatih: isSiaga ? 'Yanda / Bunda Pelatih Siaga' : 'Kakak Pelatih Penggalang',
      noHpPelatih: '081234567890',
      noRekeningPelatih: '',
      bankPelatih: 'Bank BJB',
      honorPerKegiatan: 75000,
      jadwalLatihan: isSiaga ? 'Setiap Hari Jumat, 13.30 - 15.00 WIB' : 'Setiap Hari Sabtu, 08.00 - 10.30 WIB',
      lokasi: isSiaga ? 'Halaman & Selasar Kelas Rendah' : 'Lapangan Utama & Sanggar Pramuka',
      deskripsiProgram: isSiaga
        ? 'Pendidikan kepramukaan Perindukan Siaga (Kelas 1 - 3 SD) untuk pembentukan budi pekerti, keceriaan, kasih sayang keluarga, dan pengamalan Dwi Satya & Dwi Darma.'
        : 'Latihan rutin kepramukaan Pasukan Penggalang (Kelas 4 - 6 SD) untuk menanamkan kedisiplinan, kemandirian, teknik kepramukaan, dan pengamalan Tri Satya & Dasa Darma.',
      targetCapaian: isSiaga
        ? 'Pencapaian butir SKU Siaga Mula, Bantu, Tata, serta partisipasi aktif dalam ajang Pesta Siaga.'
        : 'Pencapaian butir SKU Penggalang Ramu, Rakit, Terap, pencapaian 5 bidang SKK, serta persiapan Lomba Tingkat (LT) dan Jambore.',
      evaluasiTahunan: 'Kegiatan berjalan tertib, disiplin, dan lancar sesuai matriks program kerja tahunan.',
      sumberHonor: 'otomatis_bku',
      kataKunciBKU: isSiaga ? 'siaga' : 'penggalang',
      noBkuTerkait: '',
      namaPembinaGudep: teachers[0]?.nama || (isSiaga ? 'Bunda Pembina Siaga' : 'Kakak Pembina Gudep Penggalang'),
      nipPembinaGudep: teachers[0]?.nip || '198203152010011012',
      tujuanTahunanKeywords: isSiaga
        ? 'Pesta Siaga Kwarran, Pelantikan SKU Siaga Mula & Bantu, Karnaval Ceria, Ujian TKK Menabung & Juru Kebun'
        : 'Pelantikan Penggalang Ramu & Rakit, Lomba Tingkat LT-2 Kwarran, Perkemahan PERSAMI, Bakti Lingkungan, Ujian 10 TKK Wajib',
      fokusProgramTahunan: isSiaga
        ? ['Pesta Siaga', 'Pelantikan SKU Siaga', 'TKK Menabung', 'Bakti Ceria']
        : ['Pelantikan SKU Ramu & Rakit', 'Lomba Tingkat LT-2', 'Perkemahan PERSAMI', '10 TKK Wajib'],
      variasiUrutanKurikulum: 1
    });
    setCoachList([
      {
        id: `coach-${Date.now()}-1`,
        nama: isSiaga ? 'Yanda / Bunda Pelatih Siaga' : 'Kakak Pelatih Penggalang',
        peran: 'Pelatih Utama',
        noHp: '081234567890',
        noRekening: '',
        bank: 'Bank BJB',
        honorPerKegiatan: 75000
      }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MasterEskul) => {
    if (readOnly) return;
    setEditingEskul(item);
    setFormData({ ...item });
    setCoachList(getCoachesFromEskul(item));
    setIsModalOpen(true);
  };

  const handleDeleteEskul = (id: string, name: string) => {
    if (readOnly) return;
    setEskulToDelete({ id, name });
  };

  const handleConfirmDeleteEskul = () => {
    if (readOnly || !eskulToDelete) return;
    const { id, name } = eskulToDelete;
    const updated = eskulList.filter((e) => e.id !== id);
    onUpdateEskul(updated);
    setEskulToDelete(null);
    showToast(`Eskul "${name}" berhasil dihapus.`);
  };

  const handleSaveEskulForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !formData.namaEskul) return;

    // Process and sanitize coach list
    const cleanCoaches = coachList
      .map((c, idx) => ({
        ...c,
        id: c.id || `coach-${idx + 1}-${Date.now()}`,
        nama: (c.nama || '').trim(),
        peran: (c.peran || '').trim() || (idx === 0 ? 'Pelatih Utama' : `Pelatih ${idx + 1}`),
        honorPerKegiatan: Number(c.honorPerKegiatan) > 0 ? Number(c.honorPerKegiatan) : Number(formData.honorPerKegiatan) || 75000
      }))
      .filter((c) => c.nama.length > 0);

    if (cleanCoaches.length === 0) {
      alert('Harap masukkan minimal 1 nama pelatih ekstrakurikuler.');
      return;
    }

    const primaryCoach = cleanCoaches[0];
    const combinedCoachNames = cleanCoaches.map((c) => c.nama).join(' & ');
    const isPramukaEskul = (formData.namaEskul || '').toLowerCase().includes('pramuka') || formData.kategori === 'Kepanduan';

    const payloadData: Partial<MasterEskul> = {
      ...formData,
      namaPembinaGudep: isPramukaEskul ? formData.namaPembinaGudep || '' : '',
      nipPembinaGudep: isPramukaEskul ? formData.nipPembinaGudep || '' : '',
      namaPelatih: combinedCoachNames,
      daftarPelatih: cleanCoaches,
      noHpPelatih: primaryCoach.noHp || formData.noHpPelatih || '',
      noRekeningPelatih: primaryCoach.noRekening || formData.noRekeningPelatih || '',
      bankPelatih: primaryCoach.bank || formData.bankPelatih || 'Bank BJB',
      honorPerKegiatan: primaryCoach.honorPerKegiatan || Number(formData.honorPerKegiatan) || 75000
    };

    if (editingEskul) {
      const updated = eskulList.map((e) =>
        e.id === editingEskul.id
          ? ({
              ...e,
              ...payloadData,
              anggotaSiswa: e.anggotaSiswa || [],
              prestasiDanKegiatan: e.prestasiDanKegiatan || []
            } as MasterEskul)
          : e
      );
      onUpdateEskul(updated);
      showToast(`Data eskul "${formData.namaEskul}" berhasil diperbarui.`);
    } else {
      const newEskul: MasterEskul = {
        id: `ESK-${String(eskulList.length + 1).padStart(2, '0')}`,
        namaEskul: formData.namaEskul || 'Ekstrakurikuler Baru',
        kategori: (formData.kategori as any) || 'Olahraga',
        namaPembina: formData.namaPembina || 'Pembina Sekolah',
        nipPembina: formData.nipPembina || '',
        namaPelatih: combinedCoachNames,
        noHpPelatih: primaryCoach.noHp || '',
        noRekeningPelatih: primaryCoach.noRekening || '',
        bankPelatih: primaryCoach.bank || 'Bank BJB',
        honorPerKegiatan: primaryCoach.honorPerKegiatan || 75000,
        daftarPelatih: cleanCoaches,
        jadwalLatihan: formData.jadwalLatihan || 'Setiap Hari Jumat',
        lokasi: formData.lokasi || 'Sekolah',
        jumlahAnggota: 0,
        deskripsiProgram: formData.deskripsiProgram || '',
        targetCapaian: formData.targetCapaian || '',
        evaluasiTahunan: formData.evaluasiTahunan || '',
        sumberHonor: formData.sumberHonor || 'otomatis_bku',
        kataKunciBKU: formData.kataKunciBKU || formData.namaEskul,
        noBkuTerkait: formData.noBkuTerkait || '',
        namaPembinaGudep: formData.namaPembinaGudep || formData.namaPembina || '',
        nipPembinaGudep: formData.nipPembinaGudep || formData.nipPembina || '',
        tujuanTahunanKeywords: formData.tujuanTahunanKeywords || '',
        fokusProgramTahunan: formData.fokusProgramTahunan || [],
        variasiUrutanKurikulum: formData.variasiUrutanKurikulum || 1,
        anggotaSiswa: [],
        prestasiDanKegiatan: []
      };
      onUpdateEskul([...eskulList, newEskul]);
      showToast(`Eskul baru "${newEskul.namaEskul}" berhasil ditambahkan.`);
    }
    setIsModalOpen(false);
  };

  // Member Management Handlers
  const handleAddMemberToEskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !managingMembersEskul || !selectedStudentNisn) return;

    const studentObj = students.find((s) => s.nisn === selectedStudentNisn);
    if (!studentObj) return;

    // Check duplicate
    if (managingMembersEskul.anggotaSiswa.some((m) => m.nisn === selectedStudentNisn)) {
      alert('Siswa ini sudah terdaftar dalam anggota eskul ini.');
      return;
    }

    const newMember: EskulAnggota = {
      id: `MEM-${Date.now()}`,
      nisn: studentObj.nisn,
      nama: studentObj.nama,
      kelas: studentObj.kelas,
      jenisKelamin: studentObj.jenisKelamin,
      peran: selectedPeran,
      keaktifan: 'Aktif'
    };

    const updatedEskul = {
      ...managingMembersEskul,
      anggotaSiswa: [...(managingMembersEskul.anggotaSiswa || []), newMember]
    };

    const updatedList = eskulList.map((item) =>
      item.id === managingMembersEskul.id ? updatedEskul : item
    );

    onUpdateEskul(updatedList);
    setManagingMembersEskul(updatedEskul);
    setSelectedStudentNisn('');
    showToast(`Siswa "${studentObj.nama}" ditambahkan ke ${managingMembersEskul.namaEskul}.`);
  };

  const handleRemoveMemberFromEskul = (nisn: string, namaSiswa: string) => {
    if (readOnly || !managingMembersEskul) return;
    const updatedMembers = (managingMembersEskul.anggotaSiswa || []).filter((m) => m.nisn !== nisn);
    const updatedEskul = {
      ...managingMembersEskul,
      anggotaSiswa: updatedMembers
    };
    const updatedList = eskulList.map((item) =>
      item.id === managingMembersEskul.id ? updatedEskul : item
    );
    onUpdateEskul(updatedList);
    setManagingMembersEskul(updatedEskul);
    showToast(`Siswa "${namaSiswa}" dikeluarkan dari anggota eskul.`);
  };

  const handleChangeMemberRole = (nisn: string, newRole: EskulAnggota['peran']) => {
    if (readOnly || !managingMembersEskul) return;
    const updatedMembers = (managingMembersEskul.anggotaSiswa || []).map((m) =>
      m.nisn === nisn ? { ...m, peran: newRole } : m
    );
    const updatedEskul = {
      ...managingMembersEskul,
      anggotaSiswa: updatedMembers
    };
    const updatedList = eskulList.map((item) =>
      item.id === managingMembersEskul.id ? updatedEskul : item
    );
    onUpdateEskul(updatedList);
    setManagingMembersEskul(updatedEskul);
  };

  // Prestasi Management Handlers
  const handleAddPrestasiToEskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !managingPrestasiEskul || !newPrestasi.namaKegiatan || !newPrestasi.capaian) return;

    const item: EskulPrestasi = {
      id: `PRS-${Date.now()}`,
      namaKegiatan: newPrestasi.namaKegiatan,
      tanggalPelaksanaan: newPrestasi.tanggalPelaksanaan,
      tingkat: newPrestasi.tingkat,
      capaian: newPrestasi.capaian
    };

    const updatedEskul = {
      ...managingPrestasiEskul,
      prestasiDanKegiatan: [...(managingPrestasiEskul.prestasiDanKegiatan || []), item]
    };

    const updatedList = eskulList.map((e) =>
      e.id === managingPrestasiEskul.id ? updatedEskul : e
    );

    onUpdateEskul(updatedList);
    setManagingPrestasiEskul(updatedEskul);
    setNewPrestasi({
      namaKegiatan: '',
      tanggalPelaksanaan: '2026-02-15',
      tingkat: 'Kecamatan',
      capaian: ''
    });
    showToast(`Prestasi kegiatan baru berhasil ditambahkan ke ${managingPrestasiEskul.namaEskul}.`);
  };

  const handleDeletePrestasi = (id: string) => {
    if (readOnly || !managingPrestasiEskul) return;
    const filtered = (managingPrestasiEskul.prestasiDanKegiatan || []).filter((p) => p.id !== id);
    const updatedEskul = {
      ...managingPrestasiEskul,
      prestasiDanKegiatan: filtered
    };
    const updatedList = eskulList.map((e) =>
      e.id === managingPrestasiEskul.id ? updatedEskul : e
    );
    onUpdateEskul(updatedList);
    setManagingPrestasiEskul(updatedEskul);
  };

  const handleSaveMatrixForEskul = (eskulId: string, customMatrix: { text: string; months: number[]; keterangan?: string }[]) => {
    if (readOnly) return;
    const updated = eskulList.map((e) =>
      e.id === eskulId ? { ...e, matriksProtaCustom: customMatrix } : e
    );
    onUpdateEskul(updated);
    showToast('Matriks Program Tahunan (PROTA) berhasil disimpan.');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'ID,Nama Eskul,Kategori,Guru Pembina,NIP Pembina,Nama Pelatih,No HP Pelatih,No BKU Honor,Honor Realisasi BKU (Rp),Jadwal,Lokasi,Jumlah Anggota Siswa\n';
    const rows = (eskulList || [])
      .map((e) => {
        const bku = getBkuHonorForEskul(e);
        return `"${e.id}","${e.namaEskul}","${e.kategori}","${e.namaPembina}","${e.nipPembina || '-'}","${e.namaPelatih}","${e.noHpPelatih || '-'}","${bku.noBku}","${bku.totalReal}","${e.jadwalLatihan}","${e.lokasi}","${(e.anggotaSiswa || []).length}"`;
      })
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Master_Data_Eskul_BOSP_${metadata.npsn || '20201363'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Card: Dedicated SPJ Notice & Master Data Focus */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Master Data Ekstrakurikuler
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Pusat Basis Data
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Kelola daftar cabang eskul, data guru pembina, pelatih, jadwal latihan, serta daftar siswa anggota. Pembuatan dan pencetakan dokumen <strong>Laporan Pertanggungjawaban (LPJ/SPJ)</strong> kini terpusat di menu <strong>Laporan &amp; SPJ / LPJ</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {onNavigateToSpj && (
            <button
              onClick={() => onNavigateToSpj()}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 rounded-xl border border-emerald-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Menu SPJ / LPJ
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>

          <button
            onClick={() => handleAddPramukaPreset('siaga')}
            disabled={readOnly}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900 rounded-xl border border-amber-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Tambah preset otomatis Pramuka Siaga (Kelas 1-3 SD)"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            + Pramuka Siaga
          </button>

          <button
            onClick={() => handleAddPramukaPreset('penggalang')}
            disabled={readOnly}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-200 bg-amber-950/70 hover:bg-amber-900 rounded-xl border border-amber-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Tambah preset otomatis Pramuka Penggalang (Kelas 4-6 SD)"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            + Pramuka Penggalang
          </button>

          <button
            onClick={handleOpenAddModal}
            disabled={readOnly}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Tambah Eskul
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Ekstrakurikuler</span>
            <p className="text-xl font-bold text-slate-900">{eskulList.length} Cabang</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Siswa Anggota Eskul</span>
            <p className="text-xl font-bold text-slate-900">{totalAnggotaSemuaEskul} Siswa Terdaftar</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Honor Pelatih (BKU BOSP)</span>
            <p className="text-sm sm:text-base font-bold text-amber-900">{formatRupiah(totalHonorPelatihReal)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Generator Dokumen</span>
            <p className="text-xs font-bold text-cyan-900 mt-1">LPJ Tahunan Siap Cetak</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari eskul, pelatih, pembina, atau nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1"
            >
              <option value="all">Semua Kategori</option>
              <option value="Kepanduan">Kepanduan</option>
              <option value="Olahraga">Olahraga</option>
              <option value="Seni & Budaya">Seni & Budaya</option>
              <option value="Keagamaan">Keagamaan</option>
              <option value="Akademik">Akademik</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end md:self-center">
          Menampilkan <span className="font-bold text-slate-900">{filteredEskul.length}</span> dari {eskulList.length} Ekstrakurikuler
        </div>
      </div>

      {/* Eskul Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEskul.map((item) => {
          const categoryColors: Record<string, string> = {
            Kepanduan: 'bg-amber-50 border-amber-200 text-amber-800',
            Olahraga: 'bg-blue-50 border-blue-200 text-blue-800',
            'Seni & Budaya': 'bg-pink-50 border-pink-200 text-pink-800',
            Keagamaan: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            Akademik: 'bg-indigo-50 border-indigo-200 text-indigo-800'
          };
          const badgeClass = categoryColors[item.kategori] || 'bg-slate-50 border-slate-200 text-slate-800';
          const bkuInfo = getBkuHonorForEskul(item);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
            >
              {/* Header Box */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                    {item.kategori}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      disabled={readOnly}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Edit Data Eskul"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEskul(item.id, item.namaEskul)}
                      disabled={readOnly}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Hapus Eskul"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.namaEskul}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {item.jadwalLatihan}
                  </p>
                </div>

                {/* 3 Core Entities Box: Pelatih, Pembina, Siswa Anggota */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs space-y-2">
                  {/* 1. Pelatih (Mendukung 1 atau Lebih Pelatih) */}
                  {(() => {
                    const coaches = getCoachesFromEskul(item);
                    if (coaches.length > 1) {
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium text-[11px]">
                              Pelatih / Instruktur ({coaches.length} Orang):
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {coaches.length} Pelatih
                            </span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            {coaches.map((c, cIdx) => (
                              <div
                                key={c.id || cIdx}
                                className="flex items-center justify-between text-[11px] bg-white/80 px-2 py-1 rounded-lg border border-slate-200/80"
                              >
                                <span className="font-bold text-slate-900 truncate">
                                  {cIdx + 1}. {c.nama}
                                  <span className="font-normal text-slate-500 text-[10px] ml-1">
                                    ({c.peran || 'Pelatih'})
                                  </span>
                                </span>
                                {c.noHp && (
                                  <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1">
                                    {c.noHp}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-slate-500 font-medium text-[11px]">
                          Pelatih / Instruktur:
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block truncate max-w-[160px]">
                            {item.namaPelatih || '-'}
                          </span>
                          {item.noHpPelatih && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {item.noHpPelatih}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Guru Pembina */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium text-[11px]">Guru Pembina:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                      {item.namaPembina}
                    </span>
                  </div>

                  {/* 2.B. Pembina Gugus Depan (Khusus Dokumen Resmi Pramuka) */}
                  {((item.namaEskul || '').toLowerCase().includes('pramuka') || item.kategori === 'Kepanduan') && item.namaPembinaGudep && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                      <span className="text-amber-800 font-semibold text-[11px] flex items-center gap-1">
                        ⚜️ Pembina Gudep:
                      </span>
                      <span className="font-bold text-amber-900 truncate max-w-[160px] text-xs">
                        {item.namaPembinaGudep}
                      </span>
                    </div>
                  )}

                  {/* 2.C. Target Dinamis Tahunan */}
                  {item.tujuanTahunanKeywords && (
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <div className="text-[10px] font-bold text-indigo-900 flex items-center justify-between mb-0.5">
                        <span>🎯 Target Dinamis Tahunan:</span>
                        <span className="text-[9px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                          Mod.{item.variasiUrutanKurikulum || 1}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-700 bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100 line-clamp-2 leading-relaxed">
                        {item.tujuanTahunanKeywords}
                      </div>
                    </div>
                  )}

                  {/* 3. Siswa Anggota */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium text-[11px]">Siswa Terdaftar:</span>
                    <span className="font-bold text-indigo-900 font-mono text-[11px] flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-600" />
                      {(item.anggotaSiswa || []).length} Siswa
                    </span>
                  </div>
                </div>

                {/* Honor BKU Auto-Linked Badge Card */}
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-amber-900 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-amber-700" />
                      Honor Pelatih (BKU BOSP)
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">
                      {bkuInfo.noBku !== '-' ? `BKU ${bkuInfo.noBku}` : 'RKAS'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-amber-800">
                      {bkuInfo.volume}x @ {formatRupiah(bkuInfo.hargaSatuan)}
                    </span>
                    <span className="font-mono font-bold text-xs text-amber-950">
                      {formatRupiah(bkuInfo.totalReal)}
                    </span>
                  </div>
                </div>

                {/* FORM PROGRAM KERJA & MATRIKS PROTA 12 BULAN */}
                <EskulProtaMatrixCardSection
                  eskul={item}
                  onOpenModal={() => setEditingProtaMatrixEskul(item)}
                  onSave={(customMatrix) => handleSaveMatrixForEskul(item.id, customMatrix)}
                />
              </div>

              {/* Action Buttons: Navigasi LPJ di SPJ, PROTA, Anggota, Prestasi */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => setEditingProtaMatrixEskul(item)}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>📋 Susun Program Tahunan (PROTA) 12 Bulan</span>
                </button>

                {onNavigateToSpj ? (
                  <button
                    onClick={() => onNavigateToSpj(item.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Buat LPJ di Menu SPJ / LPJ
                  </button>
                ) : (
                  <div className="w-full py-1.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg text-center">
                    LPJ tersedia di menu SPJ / LPJ
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setManagingMembersEskul(item)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer truncate"
                  >
                    <UserPlus className="w-3 h-3 text-slate-600 shrink-0" />
                    <span>Siswa ({(item.anggotaSiswa || []).length})</span>
                  </button>

                  <button
                    onClick={() => setManagingPrestasiEskul(item)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer truncate"
                  >
                    <Award className="w-3 h-3 text-slate-600 shrink-0" />
                    <span>Prestasi ({(item.prestasiDanKegiatan || []).length})</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: MANAGE SISWA ANGGOTA ESKUL                                       */}
      {/* ========================================================================= */}
      {managingMembersEskul && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Kelola Siswa Anggota Ekstrakurikuler
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {managingMembersEskul.namaEskul} ({(managingMembersEskul.anggotaSiswa || []).length} Siswa)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingMembersEskul(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Student From Master Siswa */}
            <form
              onSubmit={handleAddMemberToEskul}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs"
            >
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                Tambah Peserta Didik dari Master Siswa
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <select
                    value={selectedStudentNisn}
                    onChange={(e) => setSelectedStudentNisn(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Siswa dari Master Data --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.nisn}>
                        [{s.nisn}] {s.nama} - {s.kelas} ({s.jenisKelamin})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedPeran}
                    onChange={(e) => setSelectedPeran(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Anggota">Anggota</option>
                    <option value="Ketua">Ketua</option>
                    <option value="Wakil Ketua">Wakil Ketua</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Anggota Utama">Anggota Utama</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={readOnly || !selectedStudentNisn}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Daftarkan Siswa ke Eskul
                </button>
              </div>
            </form>

            {/* List of Members */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Daftar Siswa Terdaftar ({(managingMembersEskul.anggotaSiswa || []).length} Siswa):
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {(managingMembersEskul.anggotaSiswa || []).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Belum ada anggota siswa terdaftar. Silakan tambahkan melalui form di atas.
                  </div>
                ) : (
                  (managingMembersEskul.anggotaSiswa || []).map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 font-mono text-[11px] text-slate-400">{idx + 1}.</span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{m.nama}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NISN: {m.nisn} &bull; {m.kelas} &bull; JK: {m.jenisKelamin}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={m.peran}
                          disabled={readOnly}
                          onChange={(e) => handleChangeMemberRole(m.nisn, e.target.value as any)}
                          className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="Ketua">Ketua</option>
                          <option value="Wakil Ketua">Wakil Ketua</option>
                          <option value="Sekretaris">Sekretaris</option>
                          <option value="Bendahara">Bendahara</option>
                          <option value="Anggota Utama">Anggota Utama</option>
                          <option value="Anggota">Anggota</option>
                        </select>

                        <button
                          onClick={() => handleRemoveMemberFromEskul(m.nisn, m.nama)}
                          disabled={readOnly}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Hapus dari eskul"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingMembersEskul(null)}
                className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors text-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE PRESTASI & AGENDA TAHUNAN ESKUL                           */}
      {/* ========================================================================= */}
      {managingPrestasiEskul && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Prestasi &amp; Agenda Kegiatan Tahunan
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {managingPrestasiEskul.namaEskul}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingPrestasiEskul(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Add Prestasi */}
            <form
              onSubmit={handleAddPrestasiToEskul}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs"
            >
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                Tambah Catatan Prestasi / Agenda Kegiatan Laporan
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nama Kegiatan / Agenda / Lomba *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: O2SN Tingkat Kecamatan"
                    value={newPrestasi.namaKegiatan}
                    onChange={(e) => setNewPrestasi({ ...newPrestasi, namaKegiatan: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    value={newPrestasi.tanggalPelaksanaan}
                    onChange={(e) => setNewPrestasi({ ...newPrestasi, tanggalPelaksanaan: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tingkat Wilayah</label>
                  <select
                    value={newPrestasi.tingkat}
                    onChange={(e) => setNewPrestasi({ ...newPrestasi, tingkat: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Sekolah">Sekolah / Internal</option>
                    <option value="Kecamatan">Kecamatan</option>
                    <option value="Kabupaten/Kota">Kabupaten / Kota</option>
                    <option value="Provinsi">Provinsi</option>
                    <option value="Nasional">Nasional</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Capaian / Hasil / Keterangan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Juara 1 Tanding Putra & Medali Emas"
                    value={newPrestasi.capaian}
                    onChange={(e) => setNewPrestasi({ ...newPrestasi, capaian: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={readOnly}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Simpan Prestasi
                </button>
              </div>
            </form>

            {/* List of Achievements */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Daftar Capaian &amp; Prestasi ({(managingPrestasiEskul.prestasiDanKegiatan || []).length}):
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {(managingPrestasiEskul.prestasiDanKegiatan || []).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    Belum ada catatan capaian prestasi khusus.
                  </div>
                ) : (
                  (managingPrestasiEskul.prestasiDanKegiatan || []).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.namaKegiatan}</span>
                          <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-semibold">
                            {p.tingkat}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-800">
                          {p.capaian}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Tanggal: {p.tanggalPelaksanaan}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeletePrestasi(p.id)}
                        disabled={readOnly}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingPrestasiEskul(null)}
                className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors text-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT ESKUL FULL DATA                                       */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingEskul ? 'Edit Profil Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEskulForm} className="space-y-4 text-xs">
              {/* 1. Nama & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-slate-700">Nama Ekstrakurikuler *</label>
                  <SearchableEskulDropdown
                    value={formData.namaEskul || ''}
                    onChange={(name, kategori) =>
                      setFormData({
                        ...formData,
                        namaEskul: name,
                        ...(kategori ? { kategori } : {})
                      })
                    }
                    placeholder="Pilih / Cari 28 Eskul Standar..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Kategori</label>
                  <select
                    value={formData.kategori || 'Olahraga'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Kepanduan">Kepanduan</option>
                    <option value="Olahraga">Olahraga</option>
                    <option value="Seni & Budaya">Seni & Budaya</option>
                    <option value="Keagamaan">Keagamaan</option>
                    <option value="Akademik">Akademik</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* 2. DAFTAR PELATIH / INSTRUKTUR (Bisa Lebih Dari Satu) */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      Daftar Pelatih / Instruktur ({coachList.length} Orang)
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Anda dapat mendaftarkan 1 atau lebih pelatih untuk kegiatan eskul ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newCoachId = `coach-${Date.now()}-${coachList.length + 1}`;
                      setCoachList([
                        ...coachList,
                        {
                          id: newCoachId,
                          nama: '',
                          peran: `Pelatih ${coachList.length + 1}`,
                          noHp: '',
                          noRekening: '',
                          bank: 'Bank BJB',
                          honorPerKegiatan: Number(formData.honorPerKegiatan) || 75000
                        }
                      ]);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3 h-3" /> Tambah Pelatih
                  </button>
                </div>

                <div className="space-y-2.5">
                  {coachList.map((coach, cIdx) => (
                    <div
                      key={coach.id || cIdx}
                      className="p-2.5 bg-white border border-indigo-200/70 rounded-xl space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] inline-flex items-center justify-center font-bold">
                            {cIdx + 1}
                          </span>
                          Pelatih #{cIdx + 1}
                          <span className="text-[10px] font-normal text-slate-500">
                            ({coach.peran || 'Pelatih'})
                          </span>
                        </span>

                        {coachList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCoachList(coachList.filter((_, idx) => idx !== cIdx));
                            }}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Hapus Pelatih ini"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-semibold text-slate-700">
                            Nama Pelatih *
                          </label>
                          <input
                            type="text"
                            required
                            value={coach.nama}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCoachList(coachList.map((c, i) => (i === cIdx ? { ...c, nama: val } : c)));
                            }}
                            placeholder="Nama Lengkap Pelatih / Instruktur"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-700">
                            Peran / Jabatan
                          </label>
                          <input
                            type="text"
                            value={coach.peran || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCoachList(coachList.map((c, i) => (i === cIdx ? { ...c, peran: val } : c)));
                            }}
                            placeholder="Pelatih Utama / Asisten"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-700">
                            No. WhatsApp / HP
                          </label>
                          <input
                            type="text"
                            value={coach.noHp || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCoachList(coachList.map((c, i) => (i === cIdx ? { ...c, noHp: val } : c)));
                            }}
                            placeholder="0812-xxxx-xxxx"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-700">
                            Rekening &amp; Bank
                          </label>
                          <input
                            type="text"
                            value={coach.noRekening || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCoachList(coachList.map((c, i) => (i === cIdx ? { ...c, noRekening: val } : c)));
                            }}
                            placeholder="Bank BJB - 0123456789"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Guru Pembina & Jadwal Latihan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">Guru Pembina (Sekolah)</label>
                    <span className="text-[10px] text-slate-400 font-normal">Pilih dari Data Guru</span>
                  </div>
                  <select
                    value={formData.namaPembina || ''}
                    onChange={(e) => {
                      const selTeacher = teachers.find((t) => t.nama === e.target.value);
                      setFormData({
                        ...formData,
                        namaPembina: e.target.value,
                        nipPembina: selTeacher?.nip || ''
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Tanpa Guru Pembina (Hanya Pelatih) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.nama}>
                        {t.nama} {t.nip && t.nip !== '-' ? `(NIP. ${t.nip})` : `(${t.statusKepegawaian || t.jabatan || 'Guru'})`}
                      </option>
                    ))}
                    {formData.namaPembina && !teachers.some((t) => t.nama === formData.namaPembina) && (
                      <option value={formData.namaPembina}>
                        {formData.namaPembina} (Tersimpan)
                      </option>
                    )}
                  </select>
                  {formData.namaPembina && (
                    <div className="flex items-center justify-between px-1 text-[10.5px] text-slate-500 font-mono">
                      <span>NIP: {formData.nipPembina || '-'}</span>
                      <span className="text-emerald-700 font-sans font-medium text-[10px]">✓ Data Master Guru</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Jadwal Latihan</label>
                  <input
                    type="text"
                    value={formData.jadwalLatihan || ''}
                    onChange={(e) => setFormData({ ...formData, jadwalLatihan: e.target.value })}
                    placeholder="Setiap Hari Jumat, 14.00 WIB"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3.B. PEMBINA GUGUS DEPAN & TARGET PROGRAM TAHUNAN DINAMIS (OUTPUT PDF RESMI) - HANYA PRAMUKA */}
              {((formData.namaEskul || '').toLowerCase().includes('pramuka') || formData.kategori === 'Kepanduan') && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs sm:text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Pembina Gugus Depan &amp; Target Dinamis Program Tahunan
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded">
                      Output Dokumen &amp; Matriks
                    </span>
                  </div>

                  {/* Input Nama & NIP Pembina Gudep */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>Nama Pembina Gugus Depan (Gudep):</span>
                        <span className="text-[10px] text-slate-500 font-normal">Pilih dari Data Guru</span>
                      </label>
                      <select
                        value={formData.namaPembinaGudep || ''}
                        onChange={(e) => {
                          const selTeacher = teachers.find((t) => t.nama === e.target.value);
                          setFormData({
                            ...formData,
                            namaPembinaGudep: e.target.value,
                            nipPembinaGudep: selTeacher?.nip || (e.target.value ? '-' : '')
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Pilih Pembina Gudep dari Data Guru --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.nama}>
                            {t.nama} {t.nip && t.nip !== '-' ? `(NIP. ${t.nip})` : `(${t.statusKepegawaian || t.jabatan || 'Guru'})`}
                          </option>
                        ))}
                        {formData.namaPembinaGudep && !teachers.some((t) => t.nama === formData.namaPembinaGudep) && (
                          <option value={formData.namaPembinaGudep}>{formData.namaPembinaGudep} (Tersimpan)</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                        <span>NIP Pembina Gudep:</span>
                        <span className="text-[10px] text-slate-500 font-normal">(Otomatis Data Master)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nipPembinaGudep || ''}
                        onChange={(e) => setFormData({ ...formData, nipPembinaGudep: e.target.value })}
                        placeholder="198203152010011012 atau -"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Kata Kunci Target Tahunan Dinamis */}
                  <div className="space-y-1.5 pt-1 border-t border-indigo-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-800">
                        Kata Kunci / Target Fokus Program Tahunan (Dinamis):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = ((formData.variasiUrutanKurikulum || 1) % 3) + 1;
                          setFormData({ ...formData, variasiUrutanKurikulum: next });
                        }}
                        className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Klik untuk mengacak / mengubah variasi alur distribusi materi matriks 12 bulan"
                      >
                        🎲 Model Alur {formData.variasiUrutanKurikulum || 1} (Klik untuk Ganti/Scramble)
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={formData.tujuanTahunanKeywords || ''}
                      onChange={(e) => setFormData({ ...formData, tujuanTahunanKeywords: e.target.value })}
                      placeholder="Contoh: Pelantikan SKU Ramu & Rakit, Lomba Tingkat (LT-2), Persami, Bakti Lingkungan, Ujian 10 TKK Wajib, Penjelajahan Rimba"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                    />

                    {/* Preset Chips Cepat */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-medium">Preset Cepat:</span>
                      {[
                        'Pelantikan SKU Ramu & Rakit',
                        'Lomba Tingkat II (LT-2)',
                        'Perkemahan PERSAMI',
                        'Penjelajahan / Survival Rimba',
                        'Bakti Lingkungan & Adiwiyata',
                        'Uji 10 TKK Wajib',
                        'Pesta Siaga Kwarran'
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const curr = formData.tujuanTahunanKeywords || '';
                            if (!curr.toLowerCase().includes(chip.toLowerCase())) {
                              setFormData({
                                ...formData,
                                tujuanTahunanKeywords: curr.trim() ? `${curr.trim()}, ${chip}` : chip
                              });
                            }
                          }}
                          className="text-[10px] bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 px-2 py-0.5 rounded-full transition-all cursor-pointer shadow-2xs font-medium"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-tight italic">
                      * Kata kunci di atas otomatis disintesis ke dalam Dokumen Program Tahunan (BAB I Target Capaian, Matriks 12 Bulan, serta silabus teori &amp; praktik di PDF).
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={readOnly}
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingEskul ? 'Simpan Perubahan' : 'Tambah Eskul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUSUN PROGRAM KERJA TAHUNAN & MATRIKS 12 BULAN (PROTA) */}
      {editingProtaMatrixEskul && (
        <EskulProtaMatrixModal
          eskul={editingProtaMatrixEskul}
          onClose={() => setEditingProtaMatrixEskul(null)}
          onSave={(customMatrix) => handleSaveMatrixForEskul(editingProtaMatrixEskul.id, customMatrix)}
        />
      )}

      {/* MODAL KONFIRMASI HAPUS ESKUL (Tidak Menggunakan window.confirm) */}
      {eskulToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Hapus Ekstrakurikuler?
                </h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan data master</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data ekstrakurikuler{' '}
              <strong className="text-slate-900 font-bold">"{eskulToDelete.name}"</strong>?
              Data ekstrakurikuler ini akan dihapus dari data master dan daftar kartu eskul.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEskulToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={readOnly}
                onClick={handleConfirmDeleteEskul}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
