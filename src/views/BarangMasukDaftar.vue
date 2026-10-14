<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import {
  PhArrowDown,
  PhArrowUp,
  PhCheckCircle,
  PhCircle,
  PhDownloadSimple,
  PhMagnifyingGlass,
  PhPencilSimple,
  PhPlus,
  PhPrinter,
  PhTrash,
} from '@phosphor-icons/vue';
import { api, apiBlob, ApiError, unduhBlob } from '../lib/api';
import { useAuth } from '../lib/auth';
import { daftarTahun, formatRupiah, formatTanggal } from '../lib/format';
import type { BarangMasuk, Halaman, Kategori, SubKategori } from '../lib/tipe';
import Modal from '../components/Modal.vue';
import Paginasi from '../components/Paginasi.vue';
import KeadaanKosong from '../components/KeadaanKosong.vue';

const router = useRouter();
const { adalahAdmin } = useAuth();

const daftar = ref<BarangMasuk[]>([]);
const total = ref(0);
const halaman = ref(1);
const memuat = ref(true);
const galat = ref('');
const pesan = ref('');

const kategoriSemua = ref<Kategori[]>([]);
const subSemua = ref<SubKategori[]>([]);

const sKategori = ref('');
const sSub = ref('');
const sTahun = ref('');
const cari = ref('');
const urutBerdasarkan = ref<'tanggal' | 'asalBarang' | 'total'>('tanggal');
const urutArah = ref<'ASC' | 'DESC'>('DESC');
const cariTunda = ref<ReturnType<typeof setTimeout> | null>(null);

const hapusTarget = ref<BarangMasuk | null>(null);
const cetakItem = ref<BarangMasuk | null>(null);

const adaFilter = computed(
  () => sKategori.value !== '' || sSub.value !== '' || sTahun.value !== '' || cari.value.trim() !== '',
);

function kuery(ekspor = false): string {
  const p = new URLSearchParams();
  if (sKategori.value) p.set('kategoriId', sKategori.value);
  if (sSub.value) p.set('subKategoriId', sSub.value);
  if (sTahun.value) p.set('tahun', sTahun.value);
  if (cari.value.trim()) p.set('search', cari.value.trim());
  p.set('sortBy', urutBerdasarkan.value);
  p.set('sortDir', urutArah.value);
  if (!ekspor) {
    p.set('page', String(halaman.value));
    p.set('limit', '10');
  }
  return p.toString();
}

async function muat(): Promise<void> {
  memuat.value = true;
  galat.value = '';
  try {
    const res = await api<Halaman<BarangMasuk>>(`/barang-masuk?${kuery()}`);
    daftar.value = res.data;
    total.value = res.total;
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Daftar gagal dimuat.';
  } finally {
    memuat.value = false;
  }
}

watch([sKategori, sSub, sTahun, urutBerdasarkan, urutArah], () => {
  halaman.value = 1;
  void muat();
});

function saatCari(): void {
  if (cariTunda.value) clearTimeout(cariTunda.value);
  cariTunda.value = setTimeout(() => {
    halaman.value = 1;
    void muat();
  }, 400);
}

function aturUrut(kolom: 'tanggal' | 'asalBarang' | 'total'): void {
  if (urutBerdasarkan.value === kolom) {
    urutArah.value = urutArah.value === 'ASC' ? 'DESC' : 'ASC';
  } else {
    urutBerdasarkan.value = kolom;
    urutArah.value = kolom === 'asalBarang' ? 'ASC' : 'DESC';
  }
}

function resetFilter(): void {
  sKategori.value = '';
  sSub.value = '';
  sTahun.value = '';
  cari.value = '';
  urutBerdasarkan.value = 'tanggal';
  urutArah.value = 'DESC';
  halaman.value = 1;
  void muat();
}

async function ekspor(): Promise<void> {
  pesan.value = '';
  try {
    const blob = await apiBlob(`/barang-masuk/ekspor?${kuery(true)}`);
    unduhBlob(blob, 'barang-masuk.xlsx');
    pesan.value = 'Berkas Excel diunduh sesuai filter aktif.';
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Ekspor gagal.';
  }
}

async function verifikasi(row: BarangMasuk): Promise<void> {
  galat.value = '';
  pesan.value = '';
  try {
    const hasil = await api<BarangMasuk>(`/barang-masuk/${row.id}/verifikasi`, {
      method: 'PATCH',
      body: JSON.stringify({ terverifikasi: !row.terverifikasi }),
    });
    const i = daftar.value.findIndex((d) => d.id === row.id);
    if (i >= 0) daftar.value[i] = { ...hasil, no: row.no };
    pesan.value = hasil.terverifikasi ? 'Data ditandai terverifikasi.' : 'Verifikasi dibatalkan.';
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Verifikasi gagal.';
  }
}

async function hapus(): Promise<void> {
  if (!hapusTarget.value) return;
  galat.value = '';
  pesan.value = '';
  try {
    await api(`/barang-masuk/${hapusTarget.value.id}`, { method: 'DELETE' });
    pesan.value = 'Data dihapus.';
    hapusTarget.value = null;
    if (daftar.value.length === 1 && halaman.value > 1) halaman.value -= 1;
    await muat();
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Hapus gagal.';
    hapusTarget.value = null;
  }
}

function cetak(): void {
  window.print();
}

function keTambah(): void {
  void router.push('/barang-masuk/tambah');
}

function judulUrut(label: string, aktif: boolean): string {
  if (!aktif) return `Urutkan berdasarkan ${label}`;
  return urutArah.value === 'ASC' ? `${label}, menaik — klik untuk menurun` : `${label}, menurun — klik untuk menaik`;
}

onMounted(async () => {
  try {
    const [kat, sub] = await Promise.all([
      api<Kategori[]>('/kategori/semua'),
      api<{ data: SubKategori[]; total: number }>('/sub-kategori?page=1&limit=100'),
    ]);
    kategoriSemua.value = kat;
    subSemua.value = sub.data;
  } catch {
    /* filter tetap bisa dipakai tanpa daftar combobox */
  }
  await muat();
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-neutral-600">Kelola penerimaan barang, verifikasi, ekspor Excel, dan cetak surat masuk.</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-100"
          @click="ekspor"
        >
          <PhDownloadSimple :size="16" aria-hidden="true" />
          Ekspor Excel
        </button>
        <RouterLink
          to="/barang-masuk/tambah"
          class="flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <PhPlus :size="16" aria-hidden="true" />
          Tambah
        </RouterLink>
      </div>
    </div>

    <section aria-label="Filter dan pencarian" class="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:grid-cols-5">
      <div>
        <label for="f-kategori" class="mb-1 block text-xs font-medium text-neutral-600">Kategori</label>
        <select
          id="f-kategori"
          v-model="sKategori"
          class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="">Semua kategori</option>
          <option v-for="k in kategoriSemua" :key="k.id" :value="k.id">{{ k.nama }}</option>
        </select>
      </div>
      <div>
        <label for="f-sub" class="mb-1 block text-xs font-medium text-neutral-600">Sub Kategori</label>
        <select
          id="f-sub"
          v-model="sSub"
          class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="">Semua sub kategori</option>
          <option
            v-for="s in subSemua.filter((x) => !sKategori || x.kategoriId === sKategori || x.kategori?.id === sKategori)"
            :key="s.id"
            :value="s.id"
          >
            {{ s.nama }}
          </option>
        </select>
      </div>
      <div>
        <label for="f-tahun" class="mb-1 block text-xs font-medium text-neutral-600">Tahun</label>
        <select
          id="f-tahun"
          v-model="sTahun"
          class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
        >
          <option value="">Semua tahun</option>
          <option v-for="t in daftarTahun()" :key="t" :value="String(t)">{{ t }}</option>
        </select>
      </div>
      <div class="md:col-span-2">
        <label for="f-cari" class="mb-1 block text-xs font-medium text-neutral-600">Pencarian (asal barang / sub kategori)</label>
        <div class="relative">
          <PhMagnifyingGlass :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            id="f-cari"
            v-model="cari"
            type="search"
            placeholder="Ketik kata kunci…"
            class="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
            @input="saatCari"
          />
        </div>
      </div>
      <div v-if="adaFilter" class="md:col-span-5">
        <button type="button" class="text-sm text-blue-700 underline-offset-2 hover:underline" @click="resetFilter">
          Atur ulang filter
        </button>
      </div>
    </section>

    <p v-if="galat" role="alert" class="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{{ galat }}</p>
    <p v-if="pesan" role="status" class="rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-800">{{ pesan }}</p>

    <div v-if="memuat" class="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500" role="status">
      Memuat daftar barang masuk…
    </div>

    <KeadaanKosong
      v-else-if="daftar.length === 0"
      judul="Belum ada data barang masuk"
      :deskripsi="
        adaFilter ? 'Tidak ada data yang cocok dengan filter. Ubah filter atau kata kunci.' : 'Catat penerimaan pertama lewat tombol Tambah.'
      "
      :label-aksi="adaFilter ? undefined : 'Tambah Barang Masuk'"
      @aksi="keTambah"
    />

    <div v-else class="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table class="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" class="px-3 py-2.5 font-medium">No</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Aksi</th>
            <th scope="col" class="px-3 py-2.5 font-medium">
              <button type="button" class="flex items-center gap-1 hover:text-neutral-900" :title="judulUrut('tanggal', urutBerdasarkan === 'tanggal')" @click="aturUrut('tanggal')">
                Tanggal
                <component :is="urutArah === 'ASC' ? PhArrowUp : PhArrowDown" v-if="urutBerdasarkan === 'tanggal'" :size="14" aria-hidden="true" />
              </button>
            </th>
            <th scope="col" class="px-3 py-2.5 font-medium">
              <button type="button" class="flex items-center gap-1 hover:text-neutral-900" :title="judulUrut('asal barang', urutBerdasarkan === 'asalBarang')" @click="aturUrut('asalBarang')">
                Asal Barang
                <component :is="urutArah === 'ASC' ? PhArrowUp : PhArrowDown" v-if="urutBerdasarkan === 'asalBarang'" :size="14" aria-hidden="true" />
              </button>
            </th>
            <th scope="col" class="px-3 py-2.5 font-medium">Penerima</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Unit</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Kode</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Nama</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Harga (Rp)</th>
            <th scope="col" class="px-3 py-2.5 font-medium">Jumlah</th>
            <th scope="col" class="px-3 py-2.5 font-medium">
              <button type="button" class="flex items-center gap-1 hover:text-neutral-900" :title="judulUrut('total harga', urutBerdasarkan === 'total')" @click="aturUrut('total')">
                Total (Rp)
                <component :is="urutArah === 'ASC' ? PhArrowUp : PhArrowDown" v-if="urutBerdasarkan === 'total'" :size="14" aria-hidden="true" />
              </button>
            </th>
            <th scope="col" class="px-3 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="b in daftar" :key="b.id">
            <tr
              v-for="(item, idx) in b.items"
              :key="`${b.id}-${item.id}`"
              class="border-b border-neutral-100 align-top last:border-0 hover:bg-neutral-50"
            >
              <td v-if="idx === 0" :rowspan="b.items.length" class="px-3 py-2.5 text-neutral-500">{{ b.no }}</td>
              <td v-if="idx === 0" :rowspan="b.items.length" class="px-3 py-2.5">
                <div class="flex items-center gap-1">
                  <RouterLink
                    :to="`/barang-masuk/${b.id}/ubah`"
                    class="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                    :aria-label="`Ubah data ${b.asalBarang}`"
                    title="Ubah"
                  >
                    <PhPencilSimple :size="16" aria-hidden="true" />
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded p-1.5 text-neutral-500 hover:bg-red-100 hover:text-red-700"
                    :aria-label="`Hapus data ${b.asalBarang}`"
                    title="Hapus"
                    @click="hapusTarget = b"
                  >
                    <PhTrash :size="16" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="rounded p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                    :aria-label="`Cetak surat ${b.asalBarang}`"
                    title="Cetak surat masuk"
                    @click="cetakItem = b"
                  >
                    <PhPrinter :size="16" aria-hidden="true" />
                  </button>
                </div>
              </td>
              <td v-if="idx === 0" :rowspan="b.items.length" class="whitespace-nowrap px-3 py-2.5">{{ formatTanggal(b.tanggal) }}</td>
              <td v-if="idx === 0" :rowspan="b.items.length" class="max-w-[180px] px-3 py-2.5">
                <p class="truncate font-medium">{{ b.asalBarang }}</p>
                <p class="truncate text-xs text-neutral-500">{{ b.subKategori?.nama ?? '-' }}</p>
              </td>
              <td v-if="idx === 0" :rowspan="b.items.length" class="whitespace-nowrap px-3 py-2.5">{{ b.operator?.nama ?? '-' }}</td>
              <td class="whitespace-nowrap px-3 py-2.5">{{ item.satuan }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 font-mono text-xs">{{ item.kode }}</td>
              <td class="max-w-[200px] px-3 py-2.5">{{ item.nama }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{{ formatRupiah(item.harga) }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{{ item.jumlah }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{{ formatRupiah(item.total) }}</td>
              <td v-if="idx === 0" :rowspan="b.items.length" class="px-3 py-2.5">
                <button
                  v-if="adalahAdmin"
                  type="button"
                  class="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium"
                  :class="b.terverifikasi ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100' : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'"
                  :aria-pressed="b.terverifikasi"
                  :title="b.terverifikasi ? 'Batalkan verifikasi' : 'Tandai terverifikasi'"
                  @click="verifikasi(b)"
                >
                  <component :is="b.terverifikasi ? PhCheckCircle : PhCircle" :size="15" aria-hidden="true" />
                  {{ b.terverifikasi ? 'Terverifikasi' : 'Belum' }}
                </button>
                <span
                  v-else
                  class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium"
                  :class="b.terverifikasi ? 'border-green-200 bg-green-50 text-green-800' : 'border-neutral-300 text-neutral-600'"
                >
                  <component :is="b.terverifikasi ? PhCheckCircle : PhCircle" :size="15" aria-hidden="true" />
                  {{ b.terverifikasi ? 'Terverifikasi' : 'Belum' }}
                </span>
              </td>
            </tr>
            <tr class="border-b border-neutral-200 bg-neutral-50/60 text-xs text-neutral-600">
              <td colspan="12" class="px-3 py-1.5">
                Total transaksi: <strong class="tabular-nums">{{ formatRupiah(b.total) }}</strong>
                <span class="text-neutral-400"> · {{ b.items.length }} item · {{ formatTanggal(b.tanggal) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <Paginasi v-if="daftar.length > 0" :halaman="halaman" :total="total" :batas="10" @ganti="(h) => { halaman = h; void muat(); }" />

    <Modal v-if="hapusTarget" judul="Hapus barang masuk?" @tutup="hapusTarget = null">
      <p class="text-sm text-neutral-600">
        Data dari <strong>{{ hapusTarget.asalBarang }}</strong> tanggal {{ formatTanggal(hapusTarget.tanggal) }} akan dihapus
        permanen. Data terverifikasi tidak dapat dihapus.
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

    <Modal v-if="cetakItem" judul="Surat barang masuk" lebar="max-w-3xl" @tutup="cetakItem = null">
      <div class="rounded-md border border-neutral-200 p-5 text-sm">
        <h3 class="text-base font-bold">PT JMC Indonesia — Surat Barang Masuk</h3>
        <dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div><dt class="text-neutral-500">Nomor Surat</dt><dd class="font-medium">{{ cetakItem.nomorSurat ?? '-' }}</dd></div>
          <div><dt class="text-neutral-500">Tanggal</dt><dd class="font-medium">{{ formatTanggal(cetakItem.tanggal) }}</dd></div>
          <div><dt class="text-neutral-500">Asal Barang</dt><dd class="font-medium">{{ cetakItem.asalBarang }}</dd></div>
          <div><dt class="text-neutral-500">Penerima</dt><dd class="font-medium">{{ cetakItem.operator?.nama ?? '-' }}</dd></div>
          <div><dt class="text-neutral-500">Sub Kategori</dt><dd class="font-medium">{{ cetakItem.subKategori?.nama ?? '-' }}</dd></div>
          <div><dt class="text-neutral-500">Status</dt><dd class="font-medium">{{ cetakItem.terverifikasi ? 'Terverifikasi' : 'Belum diverifikasi' }}</dd></div>
        </dl>
        <table class="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr class="bg-neutral-100 text-left">
              <th scope="col" class="border border-neutral-300 px-2 py-1.5">No</th>
              <th scope="col" class="border border-neutral-300 px-2 py-1.5">Kode</th>
              <th scope="col" class="border border-neutral-300 px-2 py-1.5">Nama</th>
              <th scope="col" class="border border-neutral-300 px-2 py-1.5">Harga</th>
              <th scope="col" class="border border-neutral-300 px-2 py-1.5">Jumlah</th>
              <th scope="col" class="border border-neutral-300 px-2 py-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, i) in cetakItem.items" :key="it.id">
              <td class="border border-neutral-300 px-2 py-1.5">{{ i + 1 }}</td>
              <td class="border border-neutral-300 px-2 py-1.5 font-mono text-xs">{{ it.kode }}</td>
              <td class="border border-neutral-300 px-2 py-1.5">{{ it.nama }}</td>
              <td class="border border-neutral-300 px-2 py-1.5 text-right tabular-nums">{{ formatRupiah(it.harga) }}</td>
              <td class="border border-neutral-300 px-2 py-1.5 text-right tabular-nums">{{ it.jumlah }} {{ it.satuan }}</td>
              <td class="border border-neutral-300 px-2 py-1.5 text-right tabular-nums">{{ formatRupiah(it.total) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-3 font-semibold">Total: {{ formatRupiah(cetakItem.total) }}</p>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100" @click="cetakItem = null">
          Tutup
        </button>
        <button type="button" class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800" @click="cetak">
          Cetak
        </button>
      </div>
    </Modal>
  </div>
</template>
