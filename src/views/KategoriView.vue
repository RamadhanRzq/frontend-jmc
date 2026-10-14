<script setup lang="ts">
import { ref } from 'vue';
import { PhMagnifyingGlass, PhPencilSimple, PhPlus, PhTrash } from '@phosphor-icons/vue';
import { api, ApiError } from '../lib/api';
import type { Halaman, Kategori } from '../lib/tipe';
import Modal from '../components/Modal.vue';
import Paginasi from '../components/Paginasi.vue';
import KeadaanKosong from '../components/KeadaanKosong.vue';

const daftar = ref<Kategori[]>([]);
const total = ref(0);
const halaman = ref(1);
const cari = ref('');
const memuat = ref(true);
const galat = ref('');
const pesan = ref('');

const dialog = ref(false);
const ubahId = ref<string | null>(null);
const kode = ref('');
const nama = ref('');
const menyimpan = ref(false);
const galatForm = ref('');
const hapusTarget = ref<Kategori | null>(null);

let tunda: ReturnType<typeof setTimeout> | null = null;

async function muat(): Promise<void> {
  memuat.value = true;
  galat.value = '';
  try {
    const p = new URLSearchParams({ page: String(halaman.value), limit: '10' });
    if (cari.value.trim()) p.set('search', cari.value.trim());
    const res = await api<Halaman<Kategori>>(`/kategori?${p.toString()}`);
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

function bukaTambah(): void {
  ubahId.value = null;
  kode.value = '';
  nama.value = '';
  galatForm.value = '';
  dialog.value = true;
}

function bukaUbah(row: Kategori): void {
  ubahId.value = row.id;
  kode.value = row.kode;
  nama.value = row.nama;
  galatForm.value = '';
  dialog.value = true;
}

async function simpan(): Promise<void> {
  if (!kode.value.trim() || !nama.value.trim()) {
    galatForm.value = 'Kode dan nama kategori wajib diisi.';
    return;
  }
  if (kode.value.trim().length > 10) {
    galatForm.value = 'Kode kategori maksimal 10 karakter.';
    return;
  }
  if (nama.value.trim().length > 100) {
    galatForm.value = 'Nama kategori maksimal 100 karakter.';
    return;
  }
  menyimpan.value = true;
  galatForm.value = '';
  try {
    const badan = JSON.stringify({ kode: kode.value.trim(), nama: nama.value.trim() });
    if (ubahId.value) {
      await api(`/kategori/${ubahId.value}`, { method: 'PATCH', body: badan });
      pesan.value = 'Kategori diubah.';
    } else {
      await api('/kategori', { method: 'POST', body: badan });
      pesan.value = 'Kategori ditambahkan.';
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
    await api(`/kategori/${hapusTarget.value.id}`, { method: 'DELETE' });
    pesan.value = 'Kategori dihapus.';
    hapusTarget.value = null;
    if (daftar.value.length === 1 && halaman.value > 1) halaman.value -= 1;
    await muat();
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Hapus gagal.';
    hapusTarget.value = null;
  }
}

void muat();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="relative w-full max-w-sm">
        <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <input
          v-model="cari"
          type="search"
          placeholder="Cari kode atau nama…"
          aria-label="Cari kategori"
          class="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
          @input="saatCari"
        />
      </div>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        @click="bukaTambah"
      >
        <PhPlus :size="16" aria-hidden="true" />
        Tambah Kategori
      </button>
    </div>

    <p v-if="galat" role="alert" class="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{{ galat }}</p>
    <p v-if="pesan" role="status" class="rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-800">{{ pesan }}</p>

    <div v-if="memuat" class="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500" role="status">
      Memuat kategori…
    </div>
    <KeadaanKosong
      v-else-if="daftar.length === 0"
      judul="Belum ada kategori"
      deskripsi="Tambahkan kategori pertama, misalnya ATK untuk Alat Tulis Kantor."
      label-aksi="Tambah Kategori"
      @aksi="bukaTambah"
    />
    <div v-else class="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table class="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" class="w-16 px-4 py-2.5 font-medium">No</th>
            <th scope="col" class="w-28 px-4 py-2.5 font-medium">Aksi</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Kode</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Nama Kategori</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(k, i) in daftar" :key="k.id" class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-2.5 text-neutral-500">{{ (halaman - 1) * 10 + i + 1 }}</td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                  :aria-label="`Ubah ${k.nama}`"
                  title="Ubah"
                  @click="bukaUbah(k)"
                >
                  <PhPencilSimple :size="16" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="rounded p-1.5 text-neutral-500 hover:bg-red-100 hover:text-red-700"
                  :aria-label="`Hapus ${k.nama}`"
                  title="Hapus"
                  @click="hapusTarget = k"
                >
                  <PhTrash :size="16" aria-hidden="true" />
                </button>
              </div>
            </td>
            <td class="px-4 py-2.5 font-mono text-xs font-medium">{{ k.kode }}</td>
            <td class="px-4 py-2.5">{{ k.nama }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Paginasi v-if="daftar.length > 0" :halaman="halaman" :total="total" :batas="10" @ganti="(h) => { halaman = h; void muat(); }" />

    <Modal :judul="ubahId ? 'Ubah kategori' : 'Tambah kategori'" v-if="dialog" @tutup="dialog = false">
      <form class="flex flex-col gap-4" @submit.prevent="simpan" novalidate>
        <div>
          <label for="k-kode" class="mb-1 block text-sm font-medium">Kode Kategori</label>
          <input
            id="k-kode"
            v-model="kode"
            type="text"
            maxlength="10"
            placeholder="Contoh: ATK"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
          <p class="mt-1 text-xs text-neutral-500">Unik, maksimal 10 karakter.</p>
        </div>
        <div>
          <label for="k-nama" class="mb-1 block text-sm font-medium">Nama Kategori</label>
          <input
            id="k-nama"
            v-model="nama"
            type="text"
            maxlength="100"
            placeholder="Contoh: Alat Tulis Kantor"
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

    <Modal v-if="hapusTarget" judul="Hapus kategori?" @tutup="hapusTarget = null">
      <p class="text-sm text-neutral-600">
        Kategori <strong>{{ hapusTarget.nama }}</strong> akan dihapus. Kategori yang sudah punya sub kategori tidak dapat dihapus.
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
