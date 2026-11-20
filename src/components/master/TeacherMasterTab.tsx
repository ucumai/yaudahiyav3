import React, { useState, useMemo, useEffect } from 'react';
import { MasterGuru, SchoolMetadata } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Award,
  Mail,
  Download,
  ShieldCheck,
  Building,
  UserCheck,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import {
  saveTeachersToFirestore,
  fetchTeachersFromFirestore,
  subscribeToTeachersData,
  CloudSyncStatus
} from '../../lib/firebaseSync';
import { useSchool } from '../../context/SchoolContext';

interface TeacherMasterTabProps {
  teachers: MasterGuru[];
  metadata: SchoolMetadata;
  onUpdateTeachers: (newTeachers: MasterGuru[]) => void;
  onUpdateMetadata: (newMetadata: SchoolMetadata) => void;
  onOpenExcelModal?: () => void;
}

export const TeacherMasterTab: React.FC<TeacherMasterTabProps> = ({
  teachers,
  metadata,
  onUpdateTeachers,
  onUpdateMetadata,
  onOpenExcelModal
}) => {
  const { schoolId, readOnly } = useSchool();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<MasterGuru | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<MasterGuru | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('synced');
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Real-time synchronization from Firebase Firestore
  useEffect(() => {
    setIsCloudSyncing(true);

    const unsubscribe = subscribeToTeachersData(
      schoolId,
      (cloudTeachers) => {
        if (Array.isArray(cloudTeachers)) {
          onUpdateTeachers(cloudTeachers);
        }
        setIsCloudSyncing(false);
      },
      (st) => setCloudStatus(st)
    );

    // Initial load from Firebase Firestore
    fetchTeachersFromFirestore(schoolId)
      .then((cloudTeachers) => {
        if (Array.isArray(cloudTeachers)) {
          onUpdateTeachers(cloudTeachers);
        }
      })
      .catch((err) => {
        console.warn('Initial fetch teachers from Firestore error:', err);
      })
      .finally(() => {
        setIsCloudSyncing(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schoolId]);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<MasterGuru>>({
    nama: '',
    nip: '',
    nuptk: '',
    jabatan: '',
    statusKepegawaian: 'PNS',
    jenisKelamin: 'L',
    pendidikanTerakhir: 'S1',
    email: ''
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = teachers.length;
    const pns = teachers.filter((t) => t.statusKepegawaian === 'PNS').length;
    const pppk = teachers.filter((t) => t.statusKepegawaian === 'PPPK').length;
    const honorer = teachers.filter((t) => t.statusKepegawaian === 'Honorer' || t.statusKepegawaian === 'GTT').length;
    const laki = teachers.filter((t) => t.jenisKelamin === 'L').length;
    const perempuan = teachers.filter((t) => t.jenisKelamin === 'P').length;
    return { total, pns, pppk, honorer, laki, perempuan };
  }, [teachers]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        t.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nip.includes(searchTerm) ||
        (t.jabatan && t.jabatan.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || t.statusKepegawaian === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [teachers, searchTerm, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      nama: '',
      nip: '',
      nuptk: '',
      jabatan: '',
      statusKepegawaian: 'PNS',
      jenisKelamin: 'L',
      pendidikanTerakhir: 'S1',
      email: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: MasterGuru) => {
    setEditingTeacher(t);
    const { ...cleanTeacher } = t;
    setFormData({ ...cleanTeacher });
    setIsModalOpen(true);
  };

  const handleDeleteTeacherClick = (t: MasterGuru) => {
    setTeacherToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (readOnly || !teacherToDelete) return;
    const targetId = teacherToDelete.id;
    const targetName = teacherToDelete.nama;
    const updated = teachers.filter((t) => t.id !== targetId);

    // Update state immediately
    onUpdateTeachers(updated);
    setTeacherToDelete(null);

    // Save directly to Firebase Firestore
    setIsCloudSyncing(true);
    try {
      await saveTeachersToFirestore(schoolId, updated, setCloudStatus);
      showToast(`Guru "${targetName}" berhasil dihapus dari database Firebase.`);
    } catch {
      showToast(`Guru "${targetName}" berhasil dihapus.`);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleSetAsKepalaSekolah = (t: MasterGuru) => {
    if (readOnly) return;
    onUpdateMetadata({
      ...metadata,
      kepalaSekolah: t.nama,
      nipKepalaSekolah: t.nip !== '-' ? t.nip : ''
    });
    showToast(`${t.nama} ditetapkan sebagai Kepala Sekolah (KPA/PPK) di Profil & Kwitansi.`);
  };

  const handleSetAsBendahara = (t: MasterGuru) => {
    if (readOnly) return;
    onUpdateMetadata({
      ...metadata,
      bendahara: t.nama,
      nipBendahara: t.nip !== '-' ? t.nip : ''
    });
    showToast(`${t.nama} ditetapkan sebagai Bendahara BOSP di Profil & Kwitansi.`);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !formData.nama) return;

    let updated: MasterGuru[] = [];
    if (editingTeacher) {
      // Update existing
      updated = teachers.map((t) => {
        if (t.id === editingTeacher.id) {
          const merged: MasterGuru = {
            id: t.id,
            nama: formData.nama || t.nama,
            nip: formData.nip || t.nip || '-',
            nuptk: formData.nuptk || t.nuptk || '-',
            jabatan: formData.jabatan || t.jabatan || 'Guru Kelas',
            statusKepegawaian: (formData.statusKepegawaian as any) || t.statusKepegawaian || 'PNS',
            jenisKelamin: (formData.jenisKelamin as any) || t.jenisKelamin || 'L',
            pendidikanTerakhir: formData.pendidikanTerakhir || t.pendidikanTerakhir || 'S1',
            email: formData.email || t.email || '',
            tags: t.tags
          };
          return merged;
        }
        return t;
      });
      onUpdateTeachers(updated);
      showToast(`Data "${formData.nama}" berhasil diperbarui.`);
    } else {
      // Create new
      const newTeacher: MasterGuru = {
        id: `GR-${String(Date.now()).slice(-4)}`,
        nama: formData.nama || '',
        nip: formData.nip || '-',
        nuptk: formData.nuptk || '-',
        jabatan: formData.jabatan || 'Guru Kelas',
        statusKepegawaian: (formData.statusKepegawaian as any) || 'PNS',
        jenisKelamin: (formData.jenisKelamin as any) || 'L',
        pendidikanTerakhir: formData.pendidikanTerakhir || 'S1',
        email: formData.email || ''
      };
      updated = [...teachers, newTeacher];
      onUpdateTeachers(updated);
      showToast(`Guru baru "${formData.nama}" berhasil ditambahkan.`);
    }

    setIsModalOpen(false);

    // Persist directly to Firebase Firestore
    setIsCloudSyncing(true);
    try {
      await saveTeachersToFirestore(schoolId, updated, setCloudStatus);
    } catch {
      // Handled inside saveTeachersToFirestore
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = 'ID,Nama Lengkap,NIP,NUPTK,Jabatan,Status Kepegawaian,JK,Pendidikan,Email\n';
    const rows = teachers
      .map(
        (t) =>
          `"${t.id}","${t.nama}","${t.nip}","${t.nuptk || '-'}","${t.jabatan}","${t.statusKepegawaian}","${t.jenisKelamin}","${t.pendidikanTerakhir || '-'}","${t.email || '-'}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Master_Data_Guru_GTK_${metadata.npsn || '20201363'}.csv`;
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total GTK</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{stats.total} Orang</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600">PNS / ASN</span>
          <p className="text-xl font-bold text-indigo-900 mt-1">{stats.pns} Orang</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-cyan-600">PPPK</span>
          <p className="text-xl font-bold text-cyan-900 mt-1">{stats.pppk} Orang</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600">Honorer / GTT</span>
          <p className="text-xl font-bold text-amber-900 mt-1">{stats.honorer} Orang</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Laki-Laki</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.laki}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-pink-500">Perempuan</span>
          <p className="text-xl font-bold text-pink-700 mt-1">{stats.perempuan}</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1"
            >
              <option value="all">Semua Status</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="Honorer">Honorer / GTT</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          {/* Cloud Sync Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
            <span className={`w-2 h-2 rounded-full ${isCloudSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isCloudSyncing ? 'Sinkron Firebase...' : 'Firebase Cloud Live'}</span>
          </div>

          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export & Import Guru via Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel Guru
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={handleOpenAddModal}
            disabled={readOnly}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Guru / GTK
          </button>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Lengkap & NIP</th>
                <th className="py-3 px-4">Jabatan Pokok</th>
                <th className="py-3 px-3 text-center">Status Kepegawaian</th>
                <th className="py-3 px-4 text-center w-48">Peran Penandatangan</th>
                <th className="py-3 px-3 text-right w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((t, idx) => {
                  const isCurrentKepsek = metadata.kepalaSekolah.toLowerCase().includes(t.nama.toLowerCase().split(',')[0]);
                  const isCurrentBendahara = metadata.bendahara.toLowerCase().includes(t.nama.toLowerCase().split(',')[0]);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {t.nama}
                          {t.jenisKelamin === 'P' ? (
                            <span className="text-[10px] px-1 bg-pink-50 text-pink-600 rounded">P</span>
                          ) : (
                            <span className="text-[10px] px-1 bg-blue-50 text-blue-600 rounded">L</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NIP: {t.nip} &bull; NUPTK: {t.nuptk || '-'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{t.jabatan}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.statusKepegawaian === 'PNS'
                              ? 'bg-indigo-100 text-indigo-800'
                              : t.statusKepegawaian === 'PPPK'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.statusKepegawaian}
                        </span>
                      </td>

                      {/* Quick Assign Buttons for Kwitansi */}
                      <td className="py-3 px-4 text-center space-y-1">
                        {isCurrentKepsek ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Kepala Sekolah Aktif
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetAsKepalaSekolah(t)}
                            disabled={readOnly}
                            className="block w-full text-center px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[10px] font-semibold rounded border border-slate-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Tetapkan sebagai penandatangan Kepala Sekolah di Kwitansi & Laporan"
                          >
                            Set Kepala Sekolah
                          </button>
                        )}

                        {isCurrentBendahara ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            <UserCheck className="w-3 h-3 text-indigo-600" />
                            Bendahara BOSP Aktif
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetAsBendahara(t)}
                            disabled={readOnly}
                            className="block w-full text-center px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-semibold rounded border border-slate-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Tetapkan sebagai penandatangan Bendahara di Kwitansi & Laporan"
                          >
                            Set Bendahara BOSP
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            disabled={readOnly}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Edit Data Guru"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacherClick(t)}
                            disabled={readOnly}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Hapus Data Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data guru / GTK dengan filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Teacher */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingTeacher ? 'Edit Data Guru / Tenaga Kependidikan' : 'Tambah Guru / GTK Baru'}
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
                <label className="font-semibold text-slate-700">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Hj. ERI IRIANA RIFAI, S.Pd., M.M."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="19xxxxxxxxxxxxxx atau -"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">NUPTK</label>
                  <input
                    type="text"
                    value={formData.nuptk || ''}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    placeholder="16 digit NUPTK"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Jabatan Pokok</label>
                <input
                  type="text"
                  value={formData.jabatan || ''}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                  placeholder="Guru Kelas 1A / Guru PJOK / Kepala Sekolah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Status Kepegawaian</label>
                  <select
                    value={formData.statusKepegawaian || 'PNS'}
                    onChange={(e) => setFormData({ ...formData, statusKepegawaian: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Honorer">Honorer / GTT</option>
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
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-colors"
                >
                  {editingTeacher ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal Delete Guru (100% IFrame & Sandbox Compatible) */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">Hapus Data Guru / GTK?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data <strong className="text-slate-900">{teacherToDelete.nama}</strong> ({teacherToDelete.jabatan || 'Guru'})?
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-[11px] text-amber-900 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Data akan langsung dihapus dari Firebase Firestore secara permanen.</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isCloudSyncing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isCloudSyncing ? 'Menghapus...' : 'Ya, Hapus Data Guru'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
