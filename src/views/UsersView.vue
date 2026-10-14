<script setup lang="ts">
import { ref } from 'vue';
import { PhLockKey, PhLockOpen, PhMagnifyingGlass, PhPencilSimple, PhPlus, PhTrash } from '@phosphor-icons/vue';
import { api, ApiError } from '../lib/api';
import type { Halaman, Pengguna, Peran } from '../lib/tipe';
import Modal from '../components/Modal.vue';
import Paginasi from '../components/Paginasi.vue';
import KeadaanKosong from '../components/KeadaanKosong.vue';

const daftar = ref<Pengguna[]>([]);
const total = ref(0);
const halaman = ref(1);
const cari = ref('');
const sPeran = ref('');
const memuat = ref(true);
const galat = ref('');
const pesan = ref('');

const dialog = ref(false);
const ubahId = ref<string | null>(null);
const peran = ref<Peran>('operator');
const username = ref('');
const sandi = ref('');
const nama = ref('');
const email = ref('');
const menyimpan = ref(false);
const galatForm = ref('');
const hapusTarget = ref<Pengguna | null>(null);

let tunda: ReturnType<typeof setTimeout> | null = null;

async function muat(): Promise<void> {
  memuat.value = true;
  galat.value = '';
  try {
    const p = new URLSearchParams({ page: String(halaman.value), limit: '10' });
    if (sPeran.value) p.set('role', sPeran.value);
    if (cari.value.trim()) p.set('search', cari.value.trim());
    const res = await api<Halaman<Pengguna>>(`/users?${p.toString()}`);
    daftar.value = res.data;
    total.value = res.total;
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Daftar gagal dimuat.';
  } finally {
    memuat.value = false;
  }
}

function saatCari(): void {
  if (tunda) clearTimeout(tunda);
  tunda = setTimeout(() => {
    halaman.value = 1;
    void muat();
  }, 400);
}

function saatPeran(): void {
  halaman.value = 1;
  void muat();
}

function bukaTambah(): void {
  ubahId.value = null;
  peran.value = 'operator';
  username.value = '';
  sandi.value = '';
  nama.value = '';
  email.value = '';
  galatForm.value = '';
  dialog.value = true;
}

function bukaUbah(row: Pengguna): void {
  ubahId.value = row.id;
  peran.value = row.role;
  username.value = row.username;
  sandi.value = '';
  nama.value = row.nama;
  email.value = row.email;
  galatForm.value = '';
  dialog.value = true;
}

function cekSandi(wajib: boolean): string {
  if (!sandi.value && !wajib) return '';
  if (!sandi.value && wajib) return 'Password wajib diisi (min. 8 karakter, huruf besar + kecil + angka).';
  if (sandi.value.length < 8 || sandi.value.length > 100) return 'Password 8–100 karakter.';
  if (!/[a-z]/.test(sandi.value) || !/[A-Z]/.test(sandi.value) || !/[0-9]/.test(sandi.value)) {
    return 'Password harus mengandung huruf besar, huruf kecil, dan angka.';
  }
  return '';
}

async function simpan(): Promise<void> {
  if (username.value.trim().length < 8 || username.value.trim().length > 100) {
    galatForm.value = 'Username 8–100 karakter dan unik.';
    return;
  }
  const masalahSandi = cekSandi(!ubahId.value);
  if (masalahSandi) {
    galatForm.value = masalahSandi;
    return;
  }
  if (nama.value.trim().length < 8 || nama.value.trim().length > 100) {
    galatForm.value = 'Nama 8–100 karakter.';
    return;
  }
  if (email.value.trim().length < 8 || email.value.trim().length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    galatForm.value = 'Email 8–100 karakter dengan format valid.';
    return;
  }
  menyimpan.value = true;
  galatForm.value = '';
  try {
    const isi: Record<string, string> = {
      role: peran.value,
      username: username.value.trim(),
      nama: nama.value.trim(),
      email: email.value.trim(),
    };
    if (sandi.value) isi.password = sandi.value;
    const badan = JSON.stringify(isi);
    if (ubahId.value) {
      await api(`/users/${ubahId.value}`, { method: 'PATCH', body: badan });
      pesan.value = 'User diubah.';
    } else {
      await api('/users', { method: 'POST', body: badan });
      pesan.value = 'User ditambahkan.';
    }
    dialog.value = false;
    await muat();
  } catch (e) {
    galatForm.value = e instanceof ApiError ? e.message : 'Penyimpanan gagal.';
  } finally {
    menyimpan.value = false;
  }
}

async function hapus(): Promise<void> {
  if (!hapusTarget.value) return;
  galat.value = '';
  pesan.value = '';
  try {
    await api(`/users/${hapusTarget.value.id}`, { method: 'DELETE' });
    pesan.value = 'User dihapus.';
    hapusTarget.value = null;
    if (daftar.value.length === 1 && halaman.value > 1) halaman.value -= 1;
    await muat();
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Hapus gagal.';
    hapusTarget.value = null;
  }
}

async function kunci(row: Pengguna, terkunci: boolean): Promise<void> {
  galat.value = '';
  pesan.value = '';
  try {
    const hasil = await api<Pengguna>(`/users/${row.id}/${terkunci ? 'kunci' : 'buka'}`, {
      method: 'PATCH',
      body: JSON.stringify({ terkunci }),
    });
    const i = daftar.value.findIndex((d) => d.id === row.id);
    if (i >= 0) daftar.value[i] = hasil;
    pesan.value = terkunci ? `User ${row.username} dikunci.` : `User ${row.username} dibuka.`;
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Ubah status kunci gagal.';
  }
}

void muat();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            v-model="cari"
            type="search"
            placeholder="Cari username atau nama…"
            aria-label="Cari user"
            class="w-64 rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
            @input="saatCari"
          />
        </div>
        <select
          v-model="sPeran"
          aria-label="Filter peran"
          class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          @change="saatPeran"
        >
          <option value="">Semua peran</option>
          <option value="admin">Admin</option>
          <option value="operator">Operator</option>
        </select>
      </div>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        @click="bukaTambah"
      >
        <PhPlus :size="16" aria-hidden="true" />
        Tambah User
      </button>
    </div>

    <p v-if="galat" role="alert" class="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{{ galat }}</p>
    <p v-if="pesan" role="status" class="rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-800">{{ pesan }}</p>

    <div v-if="memuat" class="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500" role="status">
      Memuat user…
    </div>
    <KeadaanKosong
      v-else-if="daftar.length === 0"
      judul="Belum ada user"
      deskripsi="Tambahkan akun admin atau operator untuk tim gudang."
      label-aksi="Tambah User"
      @aksi="bukaTambah"
    />
    <div v-else class="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table class="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" class="w-14 px-4 py-2.5 font-medium">No</th>
            <th scope="col" class="w-40 px-4 py-2.5 font-medium">Aksi</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Username</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Nama</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Email</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Role</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(u, i) in daftar" :key="u.id" class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-2.5 text-neutral-500">{{ (halaman - 1) * 10 + i + 1 }}</td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                  :aria-label="`Ubah ${u.username}`"
                  title="Ubah"
                  @click="bukaUbah(u)"
                >
                  <PhPencilSimple :size="16" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="rounded p-1.5"
                  :class="u.terkunci ? 'text-green-700 hover:bg-green-100' : 'text-amber-700 hover:bg-amber-100'"
                  :aria-label="u.terkunci ? `Buka kunci ${u.username}` : `Kunci ${u.username}`"
                  :title="u.terkunci ? 'Buka kunci' : 'Kunci'"
                  @click="kunci(u, !u.terkunci)"
                >
                  <component :is="u.terkunci ? PhLockOpen : PhLockKey" :size="16" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="rounded p-1.5 text-neutral-500 hover:bg-red-100 hover:text-red-700"
                  :aria-label="`Hapus ${u.username}`"
                  title="Hapus"
                  @click="hapusTarget = u"
                >
                  <PhTrash :size="16" aria-hidden="true" />
                </button>
              </div>
            </td>
            <td class="px-4 py-2.5 font-medium">{{ u.username }}</td>
            <td class="px-4 py-2.5">{{ u.nama }}</td>
            <td class="max-w-[220px] truncate px-4 py-2.5">{{ u.email }}</td>
            <td class="px-4 py-2.5">
              <span
                class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="u.role === 'admin' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-800'"
              >
                {{ u.role === 'admin' ? 'Admin' : 'Operator' }}
              </span>
            </td>
            <td class="px-4 py-2.5">
              <span
                class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="u.terkunci ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
              >
                {{ u.terkunci ? 'Terkunci' : 'Aktif' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Paginasi v-if="daftar.length > 0" :halaman="halaman" :total="total" :batas="10" @ganti="(h) => { halaman = h; void muat(); }" />

    <Modal :judul="ubahId ? 'Ubah user' : 'Tambah user'" v-if="dialog" @tutup="dialog = false">
      <form class="flex flex-col gap-4" @submit.prevent="simpan" novalidate>
        <div>
          <label for="u-peran" class="mb-1 block text-sm font-medium">Role</label>
          <select
            id="u-peran"
            v-model="peran"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
          </select>
        </div>
        <div>
          <label for="u-username" class="mb-1 block text-sm font-medium">Username</label>
          <input
            id="u-username"
            v-model="username"
            type="text"
            placeholder="Minimal 8 karakter, unik"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label for="u-sandi" class="mb-1 block text-sm font-medium">
            Password {{ ubahId ? '(kosongkan bila tidak diubah)' : '' }}
          </label>
          <input
            id="u-sandi"
            v-model="sandi"
            type="password"
            autocomplete="new-password"
            placeholder="Huruf besar + kecil + angka"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label for="u-nama" class="mb-1 block text-sm font-medium">Nama</label>
          <input
            id="u-nama"
            v-model="nama"
            type="text"
            placeholder="Nama lengkap"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label for="u-email" class="mb-1 block text-sm font-medium">Email</label>
          <input
            id="u-email"
            v-model="email"
            type="email"
            placeholder="nama@jmc.co.id"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <p v-if="galatForm" role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ galatForm }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100" @click="dialog = false">
            Batal
          </button>
          <button
            type="submit"
            :disabled="menyimpan"
            class="rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal v-if="hapusTarget" judul="Hapus user?" @tutup="hapusTarget = null">
      <p class="text-sm text-neutral-600">
        User <strong>{{ hapusTarget.username }}</strong> akan dihapus. User yang sudah dipakai transaksi tidak dapat dihapus.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100" @click="hapusTarget = null">
          Batal
        </button>
        <button type="button" class="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800" @click="hapus">
          Hapus
        </button>
      </div>
    </Modal>
  </div>
</template>
