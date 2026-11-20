import React, { useState, useMemo } from 'react';
import { MasterSiswa } from '../../types';
import { rombelStats } from '../../data/masterData';
import {
  GraduationCap,
  UserPlus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Users,
  Award,
  Layers,
  X,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';

interface StudentMasterTabProps {
  students: MasterSiswa[];
  onUpdateStudents: (newStudents: MasterSiswa[]) => void;
  onOpenExcelModal?: () => void;
}

export const StudentMasterTab: React.FC<StudentMasterTabProps> = ({
  students,
  onUpdateStudents,
  onOpenExcelModal
}) => {
  const { readOnly } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<MasterSiswa | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<MasterSiswa | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<MasterSiswa>>({
    nisn: '',
    nis: '',
    nama: '',
    kelas: 'Kelas 1A',
    jenisKelamin: 'L',
    tempatLahir: 'Bogor',
    tanggalLahir: '',
    namaWali: '',
    status: 'Aktif',
    penerimaPIP: false
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Grand Total Students & Stats from Directory
  const totalSiswa = students.length;
  const uniqueRombel = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas).filter(Boolean)));
  }, [students]);
  const totalPip = useMemo(() => {
    return students.filter((s) => s.penerimaPIP).length;
  }, [students]);
  const rasioSiswaPerRombel = uniqueRombel.length > 0 ? (totalSiswa / uniqueRombel.length).toFixed(1) : '0';

  // Grouped by Rombel
  const rombelGrouped = useMemo(() => {
    const map = new Map<string, { rombel: string; jumlahSiswa: number; lakiLaki: number; perempuan: number; penerimaPIP: number }>();
    students.forEach((s) => {
      const k = s.kelas || 'Belum Ditentukan';
      const existing = map.get(k) || { rombel: k, jumlahSiswa: 0, lakiLaki: 0, perempuan: 0, penerimaPIP: 0 };
      existing.jumlahSiswa += 1;
      if (s.jenisKelamin === 'L') existing.lakiLaki += 1;
      if (s.jenisKelamin === 'P') existing.perempuan += 1;
      if (s.penerimaPIP) existing.penerimaPIP += 1;
      map.set(k, existing);
    });
    return Array.from(map.values());
  }, [students]);

  // Filtered Students in Directory
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm) ||
        (s.nis && s.nis.includes(searchTerm)) ||
        (s.namaWali && s.namaWali.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchClass = selectedClass === 'all' || s.kelas.toLowerCase().includes(selectedClass.toLowerCase());
      return matchSearch && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  const handleOpenAddModal = () => {
    if (readOnly) return;
    setEditingStudent(null);
    setFormData({
      nisn: '',
      nis: '',
      nama: '',
      kelas: 'Kelas 1A',
      jenisKelamin: 'L',
      tempatLahir: 'Bogor',
      tanggalLahir: '',
      namaWali: '',
      status: 'Aktif',
      penerimaPIP: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: MasterSiswa) => {
    if (readOnly) return;
    setEditingStudent(s);
    setFormData({ ...s });
    setIsModalOpen(true);
  };

  const handleDeleteStudentClick = (s: MasterSiswa) => {
    if (readOnly) return;
    setStudentToDelete(s);
  };

  const handleConfirmDeleteStudent = () => {
    if (readOnly || !studentToDelete) return;
    const targetId = studentToDelete.id;
    const targetName = studentToDelete.nama;
    onUpdateStudents(students.filter((s) => s.id !== targetId));
    setStudentToDelete(null);
    showToast(`Siswa "${targetName}" berhasil dihapus.`);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !formData.nama || !formData.nisn) return;

    if (editingStudent) {
      const updated = students.map((s) =>
        s.id === editingStudent.id ? ({ ...s, ...formData } as MasterSiswa) : s
      );
      onUpdateStudents(updated);
      showToast(`Data siswa "${formData.nama}" berhasil diperbarui.`);
    } else {
      const newStudent: MasterSiswa = {
        id: `SIS-${String(students.length + 1).padStart(3, '0')}`,
        nisn: formData.nisn,
        nis: formData.nis || '-',
        nama: formData.nama.toUpperCase(),
        kelas: formData.kelas || 'Kelas 1A',
        jenisKelamin: (formData.jenisKelamin as any) || 'L',
        tempatLahir: formData.tempatLahir || 'Bogor',
        tanggalLahir: formData.tanggalLahir || '-',
        namaWali: formData.namaWali || '-',
        status: (formData.status as any) || 'Aktif',
        penerimaPIP: !!formData.penerimaPIP
      };
      onUpdateStudents([...students, newStudent]);
      showToast(`Siswa baru "${newStudent.nama}" berhasil didaftarkan.`);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = 'ID,NISN,NIS,Nama Siswa,Kelas,Jenis Kelamin,Tempat Lahir,Tanggal Lahir,Nama Wali,Status,Penerima PIP\n';
    const rows = students
      .map(
        (s) =>
          `"${s.id}","${s.nisn}","${s.nis || '-'}","${s.nama}","${s.kelas}","${s.jenisKelamin}","${s.tempatLahir || '-'}","${s.tanggalLahir || '-'}","${s.namaWali || '-'}","${s.status}","${s.penerimaPIP ? 'Ya' : 'Tidak'}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Master_Data_Siswa_SDN_Sukadamai_3.csv`;
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Siswa Terdaftar</span>
            <p className="text-xl font-bold text-slate-900">{totalSiswa} Siswa</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Rombongan Belajar</span>
            <p className="text-xl font-bold text-slate-900">{uniqueRombel.length} Rombel</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Penerima PIP</span>
            <p className="text-xl font-bold text-amber-900">{totalPip} Siswa</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Rata-rata per Rombel</span>
            <p className="text-xl font-bold text-slate-900">{rasioSiswaPerRombel} Siswa</p>
          </div>
        </div>
      </div>

      {/* Rombel Summary Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Rekapitulasi Siswa per Tingkat / Rombel
            </h4>
          </div>
        </div>

        {rombelGrouped.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {rombelGrouped.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 hover:border-emerald-300 transition-colors"
              >
                <span className="font-bold text-slate-900 block truncate">{item.rombel}</span>
                <p className="text-base font-bold text-emerald-700 font-mono">{item.jumlahSiswa} Siswa</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>L: {item.lakiLaki} | P: {item.perempuan}</span>
                  <span className="font-semibold text-amber-700">PIP: {item.penerimaPIP}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Belum ada data rombongan belajar. Data akan otomatis direkap saat siswa ditambahkan.
          </div>
        )}
      </div>

      {/* Student Directory Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari NISN, nama siswa, atau wali..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1"
            >
              <option value="all">Semua Kelas</option>
              <option value="Kelas 1">Tingkat 1</option>
              <option value="Kelas 2">Tingkat 2</option>
              <option value="Kelas 3">Tingkat 3</option>
              <option value="Kelas 4">Tingkat 4</option>
              <option value="Kelas 5">Tingkat 5</option>
              <option value="Kelas 6">Tingkat 6</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export & Import Siswa via Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel Siswa
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Siswa
          </button>

          <button
            onClick={handleOpenAddModal}
            disabled={readOnly}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa & NISN</th>
                <th className="py-3 px-4 text-center">Kelas</th>
                <th className="py-3 px-3 text-center">L/P</th>
                <th className="py-3 px-4">Wali & Tempat Lahir</th>
                <th className="py-3 px-3 text-center">Program PIP</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.nama}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        NISN: {s.nisn} &bull; NIS: {s.nis || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800 text-[11px]">
                        {s.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          s.jenisKelamin === 'L'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-pink-100 text-pink-800'
                        }`}
                      >
                        {s.jenisKelamin}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">Wali: {s.namaWali || '-'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Lahir: {s.tempatLahir || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.penerimaPIP ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full border border-amber-200">
                          Penerima PIP
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          disabled={readOnly}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudentClick(s)}
                          disabled={readOnly}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data siswa dengan filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Student */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: AISYAH AZ-ZAHRA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl uppercase focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NISN (10 Digit) *</label>
                  <input
                    type="text"
                    required
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="015893xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NIS Lokal</label>
                  <input
                    type="text"
                    value={formData.nis || ''}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="23240102"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Rombel / Kelas</label>
                  <select
                    value={formData.kelas || 'Kelas 1A'}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Kelas 1A">Kelas 1A</option>
                    <option value="Kelas 1B">Kelas 1B</option>
                    <option value="Kelas 2A">Kelas 2A</option>
                    <option value="Kelas 2B">Kelas 2B</option>
                    <option value="Kelas 3A">Kelas 3A</option>
                    <option value="Kelas 3B">Kelas 3B</option>
                    <option value="Kelas 4A">Kelas 4A</option>
                    <option value="Kelas 4B">Kelas 4B</option>
                    <option value="Kelas 5A">Kelas 5A</option>
                    <option value="Kelas 5B">Kelas 5B</option>
                    <option value="Kelas 6A">Kelas 6A</option>
                    <option value="Kelas 6B">Kelas 6B</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Jenis Kelamin</label>
                  <select
                    value={formData.jenisKelamin || 'L'}
                    onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Status</label>
                  <select
                    value={formData.status || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Mutasi">Mutasi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Nama Orang Tua / Wali</label>
                  <input
                    type="text"
                    value={formData.namaWali || ''}
                    onChange={(e) => setFormData({ ...formData, namaWali: e.target.value })}
                    placeholder="Nama Wali Siswa"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    placeholder="Bogor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="penerimaPIPCheckbox"
                  checked={!!formData.penerimaPIP}
                  onChange={(e) => setFormData({ ...formData, penerimaPIP: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="penerimaPIPCheckbox" className="font-semibold text-slate-800 cursor-pointer">
                  Terdaftar Sebagai Siswa Penerima Program Indonesia Pintar (PIP)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={readOnly}
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal Delete Siswa */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Hapus Data Siswa?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data siswa <strong className="text-slate-900">{studentToDelete.nama}</strong> (NISN: {studentToDelete.nisn})?
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-[11px] text-amber-900 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Data siswa akan dihapus dari sistem.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Ya, Hapus Data Siswa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
