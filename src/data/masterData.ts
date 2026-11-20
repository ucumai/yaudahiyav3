import { MasterGuru, MasterSiswa, MasterEskul, SchoolMetadata } from '../types';
import { DEFAULT_KABUPATEN_BOGOR_LOGO_DATA_URL } from '../assets/defaultLogo';

export const initialSchoolMaster: SchoolMetadata = {
  namaSekolah: '',
  npsn: '',
  bulanTahun: '',
  sumberDana: 'BOSP Reguler',
  desaKecamatan: '',
  kabupatenKota: 'Kabupaten Bogor',
  provinsi: 'Jawa Barat',
  kepalaSekolah: '',
  nipKepalaSekolah: '',
  bendahara: '',
  nipBendahara: '',
  komiteSekolah: '',
  alamatLengkap: '',
  emailSekolah: '',
  teleponSekolah: '',
  bankNama: '',
  bankNoRek: '',
  bankAtasNama: '',
  logoUrl: DEFAULT_KABUPATEN_BOGOR_LOGO_DATA_URL
};

export const initialGuruMaster: MasterGuru[] = [];

export const initialEskulMaster: MasterEskul[] = [];

export const initialSiswaMaster: MasterSiswa[] = [];

export const rombelStats: Array<{
  rombel: string;
  jumlahSiswa: number;
  lakiLaki: number;
  perempuan: number;
  penerimaPIP: number;
}> = [];
