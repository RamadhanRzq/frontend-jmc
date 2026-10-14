<script setup lang="ts">
import { ref } from 'vue';
import { PhMagnifyingGlass, PhPencilSimple, PhPlus, PhTrash } from '@phosphor-icons/vue';
import { api, ApiError } from '../lib/api';
import { formatAngka, formatRupiah, parseRupiah } from '../lib/format';
import type { Halaman, Kategori, SubKategori } from '../lib/tipe';
import Modal from '../components/Modal.vue';
import Paginasi from '../components/Paginasi.vue';
import KeadaanKosong from '../components/KeadaanKosong.vue';

const daftar = ref<SubKategori[]>([]);
const total = ref(0);
const halaman = ref(1);
const cari = ref('');
const memuat = ref(true);
const galat = ref('');
const pesan = ref('');

const kategoriSemua = ref<Kategori[]>([]);

const dialog = ref(false);
const ubahId = ref<string | null>(null);
const kategoriId = ref('');
const nama = ref('');
const batasTeks = ref('');
const menyimpan = ref(false);
const galatForm = ref('');
const hapusTarget = ref<SubKategori | null>(null);

let tunda: ReturnType<typeof setTimeout> | null = null;

async function muat(): Promise<void> {
  memuat.value = true;
  galat.value = '';
  try {
    const p = new URLSearchParams({ page: String(halaman.value), limit: '10' });
    if (cari.value.trim()) p.set('search', cari.value.trim());
    const [res, kat] = await Promise.all([
      api<Halaman<SubKategori>>(`/sub-kategori?${p.toString()}`),
      kategoriSemua.value.length ? null : api<Kategori[]>('/kategori/semua'),
    ]);
    daftar.value = res.data;
    total.value = res.total;
    if (kat) kategoriSemua.value = kat;
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
  kategoriId.value = '';
  nama.value = '';
  batasTeks.value = '';
  galatForm.value = '';
  dialog.value = true;
}

function bukaUbah(row: SubKategori): void {
  ubahId.value = row.id;
  kategoriId.value = row.kategoriId;
  nama.value = row.nama;
  batasTeks.value = formatAngka(row.batasHarga);
  galatForm.value = '';
  dialog.value = true;
}

function saatBatas(e: Event): void {
  const el = e.target as HTMLInputElement;
  batasTeks.value = el.value === '' ? '' : formatAngka(parseRupiah(el.value));
}

async function simpan(): Promise<void> {
  if (!kategoriId.value) {
    galatForm.value = 'Kategori wajib dipilih.';
    return;
  }
  if (!nama.value.trim()) {
    galatForm.value = 'Nama sub kategori wajib diisi.';
    return;
  }
  if (nama.value.trim().length > 100) {
    galatForm.value = 'Nama sub kategori maksimal 100 karakter.';
    return;
  }
  if (parseRupiah(batasTeks.value) < 1) {
    galatForm.value = 'Batas harga wajib diisi dengan angka rupiah.';
    return;
  }
  menyimpan.value = true;
  galatForm.value = '';
  try {
    const badan = JSON.stringify({
      kategoriId: kategoriId.value,
      nama: nama.value.trim(),
      batasHarga: parseRupiah(batasTeks.value),
    });
    if (ubahId.value) {
      await api(`/sub-kategori/${ubahId.value}`, { method: 'PATCH', body: badan });
      pesan.value = 'Sub kategori diubah.';
    } else {
      await api('/sub-kategori', { method: 'POST', body: badan });
      pesan.value = 'Sub kategori ditambahkan.';
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
    await api(`/sub-kategori/${hapusTarget.value.id}`, { method: 'DELETE' });
    pesan.value = 'Sub kategori dihapus.';
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
          placeholder="Cari kategori atau sub kategori…"
          aria-label="Cari sub kategori"
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
        Tambah Sub Kategori
      </button>
    </div>

    <p v-if="galat" role="alert" class="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{{ galat }}</p>
    <p v-if="pesan" role="status" class="rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-800">{{ pesan }}</p>

    <div v-if="memuat" class="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500" role="status">
      Memuat sub kategori…
    </div>
    <KeadaanKosong
      v-else-if="daftar.length === 0"
      judul="Belum ada sub kategori"
      deskripsi="Tambahkan sub kategori beserta batas harga per transaksi."
      label-aksi="Tambah Sub Kategori"
      @aksi="bukaTambah"
    />
    <div v-else class="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table class="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" class="w-16 px-4 py-2.5 font-medium">No</th>
            <th scope="col" class="w-28 px-4 py-2.5 font-medium">Aksi</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Kategori Barang</th>
            <th scope="col" class="px-4 py-2.5 font-medium">Sub Kategori Barang</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Batas Harga (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in daftar" :key="s.id" class="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
            <td class="px-4 py-2.5 text-neutral-500">{{ (halaman - 1) * 10 + i + 1 }}</td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                  :aria-label="`Ubah ${s.nama}`"
                  title="Ubah"
                  @click="bukaUbah(s)"
                >
                  <PhPencilSimple :size="16" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="rounded p-1.5 text-neutral-500 hover:bg-red-100 hover:text-red-700"
                  :aria-label="`Hapus ${s.nama}`"
                  title="Hapus"
                  @click="hapusTarget = s"
                >
                  <PhTrash :size="16" aria-hidden="true" />
                </button>
              </div>
            </td>
            <td class="px-4 py-2.5">{{ s.kategori?.nama ?? '-' }}</td>
            <td class="px-4 py-2.5 font-medium">{{ s.nama }}</td>
            <td class="px-4 py-2.5 text-right tabular-nums">{{ formatRupiah(s.batasHarga) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Paginasi v-if="daftar.length > 0" :halaman="halaman" :total="total" :batas="10" @ganti="(h) => { halaman = h; void muat(); }" />

    <Modal :judul="ubahId ? 'Ubah sub kategori' : 'Tambah sub kategori'" v-if="dialog" @tutup="dialog = false">
      <form class="flex flex-col gap-4" @submit.prevent="simpan" novalidate>
        <div>
          <label for="s-kategori" class="mb-1 block text-sm font-medium">Kategori</label>
          <select
            id="s-kategori"
            v-model="kategoriId"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="">Pilih kategori</option>
            <option v-for="k in kategoriSemua" :key="k.id" :value="k.id">{{ k.nama }}</option>
          </select>
        </div>
        <div>
          <label for="s-nama" class="mb-1 block text-sm font-medium">Nama Sub Kategori</label>
          <input
            id="s-nama"
            v-model="nama"
            type="text"
            maxlength="100"
            placeholder="Contoh: Kertas HVS"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label for="s-batas" class="mb-1 block text-sm font-medium">Batas Harga (Rp)</label>
          <input
            id="s-batas"
            :value="batasTeks"
            type="text"
            inputmode="numeric"
            placeholder="7.500.000"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
            @input="saatBatas"
          />
          <p class="mt-1 text-xs text-neutral-500">Batas total satu form barang masuk.</p>
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

    <Modal v-if="hapusTarget" judul="Hapus sub kategori?" @tutup="hapusTarget = null">
      <p class="text-sm text-neutral-600">
        Sub kategori <strong>{{ hapusTarget.nama }}</strong> akan dihapus. Sub kategori yang sudah dipakai transaksi tidak dapat dihapus.
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
