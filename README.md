# Frontend JMC — Aplikasi Pengelolaan Barang

Frontend Vue + Vite untuk PRD Aplikasi Pengelolaan Barang PT JMC Indonesia.
Mencakup Login (JWT), Barang Masuk, Kategori, Sub Kategori, dan Manajemen User.

## Link Deployment

- Live App: [URL Aplikasi]
- Video Demo: [URL Video]

## Tech Stack

- Frontend: Vue 3.5, TypeScript, Vite 8
- Router: `vue-router` (guard login + admin)
- Styling: Tailwind CSS 4 (`@tailwindcss/vite`), konfigurasi `shadcn-vue` (new-york, neutral)
- Ikon: `@phosphor-icons/vue`
- Utilitas kelas: `class-variance-authority` + `clsx` + `tailwind-merge`
- Type-check + build: `vue-tsc -b` + `vite build`
- Auth: token JWT di `localStorage` (`jmc_token`/`jmc_user`), header `Authorization: Bearer <access_token>`

## Petunjuk Instalasi Lokal

```bash
npm install
npm run dev
```

Pastikan backend sudah berjalan, lalu sesuaikan isi `.env` bila alamatnya berbeda
(default `VITE_API_BASE=http://localhost:3000/api`).

Server berjalan di `http://localhost:3001` (lihat `vite.config.ts`).
Belum login dibuka ke `/login`; sesi kedaluwarsa (401) kembali ke `/login` otomatis.
Variabel lingkungan:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `VITE_API_BASE` | `http://localhost:3000/api` | Alamat dasar API backend (termasuk prefix `/api`) |

## Akun Pengujian

Sama dengan akun bawaan backend (dibuat otomatis saat backend pertama dijalankan):

| Username | Password | Role |
| --- | --- | --- |
| `administrator` | `Admin123` | Admin |
| `operator01` | `Operator123` | Operator |

## Ringkasan Halaman

Sudah login membuka `/barang-masuk`. Menu Kategori, Sub Kategori, dan Manajemen User
hanya tampil untuk admin; non-admin yang membuka rute admin dikembalikan ke `/barang-masuk`.

| Rute | Akses | Keterangan |
| --- | --- | --- |
| `/login` | Publik | Form username + password; sudah login dialihkan ke `/barang-masuk` |
| `/barang-masuk` | Semua login | Daftar barang masuk; operator hanya miliknya |
| `/barang-masuk/tambah` | Semua login | Form tambah (admin memilih operator, operator terkunci ke dirinya) |
| `/barang-masuk/:id/ubah` | Semua login | Form ubah; data terverifikasi ditolak backend |
| `/kategori` | Admin | Master kategori: cari, paging 10, tambah/ubah/hapus via modal |
| `/sub-kategori` | Admin | Master sub kategori: cari, paging 10, tambah/ubah/hapus + batas harga |
| `/users` | Admin | Daftar user (filter role + cari, paging 10), tambah/ubah/hapus, kunci/buka |

Fitur halaman barang masuk: filter kategori, sub kategori (mengikuti kategori),
tahun, dan pencarian (asal barang / sub kategori, debounce 400 ms); sortir kolom
tanggal, asal barang, dan total; paging 10; unduh Excel sesuai filter aktif
(`Ekspor Excel`); toggle verifikasi khusus admin; pratinjau + cetak surat masuk;
konfirmasi hapus (data terverifikasi ditolak backend).

Aturan bisnis utama: jumlah seluruh total item (`harga × jumlah`) dalam satu form
tidak boleh melebihi batas harga sub kategori; form menolak sebelum dikirim dan
backend menolak dengan 400. Kode item (`ATK0001`) dan kolom Unit tampil dari data
backend. Lampiran hanya `.doc`, `.docx`, `.zip` (divalidasi di form dan backend).

## Pengujian

```bash
npm run build
```
