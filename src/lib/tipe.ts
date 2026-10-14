export type Peran = 'admin' | 'operator';

export interface Pengguna {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: Peran;
  terkunci: boolean;
}

export interface Kategori {
  id: string;
  kode: string;
  nama: string;
}

export interface SubKategori {
  id: string;
  kategoriId: string;
  nama: string;
  batasHarga: number;
  kategori?: Kategori | null;
}

export interface ItemMasuk {
  id: string;
  kode: string;
  nama: string;
  harga: number;
  jumlah: number;
  satuan: string;
  total: number;
  tglExpired: string | null;
}

export interface BarangMasuk {
  no: number;
  id: string;
  tanggal: string;
  asalBarang: string;
  nomorSurat: string | null;
  lampiran: string | null;
  total: number;
  terverifikasi: boolean;
  unit: string;
  batasHarga: number;
  operator: { id: string; nama: string; username: string } | null;
  subKategori: {
    id: string;
    nama: string;
    batasHarga: number;
    kategori: { id: string; kode: string; nama: string } | null;
  } | null;
  items: ItemMasuk[];
}

export interface Halaman<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
