<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PhArrowLeft, PhPlus, PhX } from '@phosphor-icons/vue';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatAngka, formatRupiah, hariIni, parseRupiah } from '../lib/format';
import type { BarangMasuk, Kategori, Pengguna, SubKategori } from '../lib/tipe';

interface BarisItem {
  kunci: number;
  nama: string;
  hargaTeks: string;
  jumlah: number | null;
  satuan: string;
  tglExpired: string;
}

const route = useRoute();
const router = useRouter();
const { authState, adalahAdmin } = useAuth();

const idUbah = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const modeUbah = computed(() => idUbah.value !== '');

const kategoriSemua = ref<Kategori[]>([]);
const subSemua = ref<SubKategori[]>([]);
const operatorSemua = ref<Pengguna[]>([]);
const memuatAwal = ref(true);
const menyimpan = ref(false);
const galat = ref('');

const operatorId = ref('');
const kategoriId = ref('');
const subKategoriId = ref('');
const asalBarang = ref('');
const nomorSurat = ref('');
const tanggal = ref(hariIni());
const lampiran = ref<File | null>(null);

const baris = reactive<BarisItem[]>([{ kunci: 1, nama: '', hargaTeks: '', jumlah: null, satuan: '', tglExpired: '' }]);
let kunciBerikut = 2;

const subTerpilih = computed(() => subSemua.value.find((s) => s.id === subKategoriId.value) ?? null);
const subTersaring = computed(() => subSemua.value.filter((s) => !kategoriId.value || s.kategoriId === kategoriId.value));
const batasHarga = computed(() => subTerpilih.value?.batasHarga ?? 0);

function totalBaris(b: BarisItem): number {
  return parseRupiah(b.hargaTeks) * (b.jumlah ?? 0);
}

const totalSemua = computed(() => baris.reduce((t, b) => t + totalBaris(b), 0));
const melebihiBatas = computed(() => batasHarga.value > 0 && totalSemua.value > batasHarga.value);

watch(kategoriId, () => {
  if (subKategoriId.value) {
    const cocok = subSemua.value.find((s) => s.id === subKategoriId.value);
    if (cocok && cocok.kategoriId !== kategoriId.value) subKategoriId.value = '';
  }
});

watch(subKategoriId, (baru) => {
  const cocok = subSemua.value.find((s) => s.id === baru);
  if (cocok && cocok.kategoriId !== kategoriId.value) kategoriId.value = cocok.kategoriId;
});

function tambahBaris(): void {
  baris.push({ kunci: kunciBerikut++, nama: '', hargaTeks: '', jumlah: null, satuan: '', tglExpired: '' });
}

function hapusBaris(kunci: number): void {
  if (baris.length <= 1) return;
  const i = baris.findIndex((b) => b.kunci === kunci);
  if (i >= 0) baris.splice(i, 1);
}

function saatHarga(b: BarisItem, e: Event): void {
  const el = e.target as HTMLInputElement;
  b.hargaTeks = el.value === '' ? '' : formatAngka(parseRupiah(el.value));
}

function saatLampiran(e: Event): void {
  const el = e.target as HTMLInputElement;
  lampiran.value = el.files?.[0] ?? null;
}

function validasi(): string {
  if (adalahAdmin.value && !operatorId.value) return 'Operator wajib dipilih.';
  if (!kategoriId.value) return 'Kategori wajib dipilih.';
  if (!subKategoriId.value) return 'Sub kategori wajib dipilih.';
  if (!asalBarang.value.trim()) return 'Asal barang wajib diisi.';
  if (asalBarang.value.trim().length > 200) return 'Asal barang maksimal 200 karakter.';
  if (nomorSurat.value && nomorSurat.value.length > 100) return 'Nomor surat maksimal 100 karakter.';
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    const label = `Item ke-${i + 1}`;
    if (!b.nama.trim()) return `${label}: nama wajib diisi.`;
    if (b.nama.trim().length > 200) return `${label}: nama maksimal 200 karakter.`;
    if (parseRupiah(b.hargaTeks) < 1) return `${label}: harga wajib diisi.`;
    if (b.jumlah === null || !Number.isInteger(b.jumlah) || b.jumlah < 1) return `${label}: jumlah tidak valid.`;
    if (!b.satuan.trim()) return `${label}: satuan wajib diisi.`;
    if (b.satuan.trim().length > 40) return `${label}: satuan maksimal 40 karakter.`;
  }
  if (melebihiBatas.value) {
    return `Total ${formatRupiah(totalSemua.value)} melebihi batas harga ${formatRupiah(batasHarga.value)}.`;
  }
  if (lampiran.value) {
    const nama = lampiran.value.name.toLowerCase();
    const ok = nama.endsWith('.doc') || nama.endsWith('.docx') || nama.endsWith('.zip');
    if (!ok) return 'Lampiran hanya menerima doc, docx, atau zip.';
  }
  return '';
}

async function simpan(): Promise<void> {
  const masalah = validasi();
  if (masalah) {
    galat.value = masalah;
    return;
  }
  menyimpan.value = true;
  galat.value = '';
  try {
    const form = new FormData();
    if (adalahAdmin.value) form.set('operatorId', operatorId.value);
    form.set('kategoriId', kategoriId.value);
    form.set('subKategoriId', subKategoriId.value);
    form.set('asalBarang', asalBarang.value.trim());
    form.set('nomorSurat', nomorSurat.value.trim());
    form.set('tanggal', tanggal.value || hariIni());
    form.set(
      'items',
      JSON.stringify(
        baris.map((b) => ({
          nama: b.nama.trim(),
          harga: parseRupiah(b.hargaTeks),
          jumlah: b.jumlah,
          satuan: b.satuan.trim(),
          tglExpired: b.tglExpired || null,
        })),
      ),
    );
    if (lampiran.value) form.set('lampiran', lampiran.value);
    if (modeUbah.value) {
      await api(`/barang-masuk/${idUbah.value}`, { method: 'PATCH', body: form });
    } else {
      await api('/barang-masuk', { method: 'POST', body: form });
    }
    await router.push('/barang-masuk');
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Penyimpanan gagal.';
  } finally {
    menyimpan.value = false;
  }
}

onMounted(async () => {
  try {
    const [kat, sub] = await Promise.all([
      api<Kategori[]>('/kategori/semua'),
      api<{ data: SubKategori[]; total: number }>('/sub-kategori?page=1&limit=100'),
    ]);
    kategoriSemua.value = kat;
    subSemua.value = sub.data;
    if (adalahAdmin.value) {
      operatorSemua.value = await api<Pengguna[]>('/users/operator/daftar');
    } else if (authState.pengguna) {
      operatorId.value = authState.pengguna.id;
    }
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Data pendukung gagal dimuat.';
  }
  if (modeUbah.value) {
    try {
      const d = await api<BarangMasuk>(`/barang-masuk/${idUbah.value}`);
      kategoriId.value = d.subKategori?.kategori?.id ?? '';
      subKategoriId.value = d.subKategori?.id ?? '';
      if (d.operator) operatorId.value = d.operator.id;
      asalBarang.value = d.asalBarang;
      nomorSurat.value = d.nomorSurat ?? '';
      tanggal.value = d.tanggal.slice(0, 10);
      baris.splice(0, baris.length);
      for (const it of d.items) {
        baris.push({
          kunci: kunciBerikut++,
          nama: it.nama,
          hargaTeks: formatAngka(it.harga),
          jumlah: it.jumlah,
          satuan: it.satuan,
          tglExpired: it.tglExpired?.slice(0, 10) ?? '',
        });
      }
    } catch (e) {
      galat.value = e instanceof ApiError ? e.message : 'Data tidak dapat dimuat.';
    }
  }
  memuatAwal.value = false;
});
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-4">
    <div>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-100"
        @click="$router.back()"
      >
        <PhArrowLeft :size="16" aria-hidden="true" />
        Kembali
      </button>
    </div>

    <p v-if="galat" role="alert" class="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{{ galat }}</p>

    <div v-if="memuatAwal" class="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500" role="status">
      Memuat form…
    </div>

    <form v-else class="flex flex-col gap-5" @submit.prevent="simpan" novalidate>
      <section aria-labelledby="judul-umum" class="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 id="judul-umum" class="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Informasi Umum</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div v-if="adalahAdmin">
            <label for="f-operator" class="mb-1 block text-sm font-medium">Operator</label>
            <select
              id="f-operator"
              v-model="operatorId"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="">Pilih operator</option>
              <option v-for="o in operatorSemua" :key="o.id" :value="o.id">{{ o.nama }} ({{ o.username }})</option>
            </select>
          </div>
          <div v-else>
            <span class="mb-1 block text-sm font-medium">Operator</span>
            <p class="rounded-md bg-neutral-100 px-3 py-2 text-sm">{{ authState.pengguna?.nama }}</p>
          </div>
          <div>
            <label for="f-tanggal" class="mb-1 block text-sm font-medium">Tanggal</label>
            <input
              id="f-tanggal"
              v-model="tanggal"
              type="date"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label for="f-kategori" class="mb-1 block text-sm font-medium">Kategori</label>
            <select
              id="f-kategori"
              v-model="kategoriId"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="">Pilih kategori</option>
              <option v-for="k in kategoriSemua" :key="k.id" :value="k.id">{{ k.nama }}</option>
            </select>
          </div>
          <div>
            <label for="f-sub" class="mb-1 block text-sm font-medium">Sub Kategori</label>
            <select
              id="f-sub"
              v-model="subKategoriId"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="">Pilih sub kategori</option>
              <option v-for="s in subTersaring" :key="s.id" :value="s.id">{{ s.nama }}</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <span class="mb-1 block text-sm font-medium">Batas Harga</span>
            <p class="rounded-md bg-neutral-100 px-3 py-2 text-sm tabular-nums" aria-live="polite">
              {{ subTerpilih ? formatRupiah(subTerpilih.batasHarga) : 'Pilih sub kategori dahulu' }}
            </p>
          </div>
          <div>
            <label for="f-asal" class="mb-1 block text-sm font-medium">Asal Barang</label>
            <input
              id="f-asal"
              v-model="asalBarang"
              type="text"
              maxlength="200"
              placeholder="Contoh: PT Maju Jaya"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label for="f-surat" class="mb-1 block text-sm font-medium">Nomor Surat <span class="font-normal text-neutral-500">(tidak wajib)</span></label>
            <input
              id="f-surat"
              v-model="nomorSurat"
              type="text"
              maxlength="100"
              placeholder="Contoh: SM/2026/001"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div class="md:col-span-2">
            <label for="f-lampiran" class="mb-1 block text-sm font-medium">Lampiran <span class="font-normal text-neutral-500">(doc, docx, zip — tidak wajib)</span></label>
            <input
              id="f-lampiran"
              type="file"
              accept=".doc,.docx,.zip"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-200 file:px-3 file:py-1.5 file:text-sm"
              @change="saatLampiran"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="judul-item" class="rounded-lg border border-neutral-200 bg-white p-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 id="judul-item" class="text-sm font-semibold uppercase tracking-wide text-neutral-500">Informasi Barang</h2>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            @click="tambahBaris"
          >
            <PhPlus :size="15" aria-hidden="true" />
            Tambah baris
          </button>
        </div>
        <div class="flex flex-col gap-4">
          <fieldset v-for="(b, i) in baris" :key="b.kunci" class="rounded-md border border-neutral-200 p-4">
            <div class="mb-3 flex items-center justify-between">
              <legend class="text-sm font-medium">Item {{ i + 1 }}</legend>
              <button
                v-if="baris.length > 1"
                type="button"
                class="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                :aria-label="`Hapus item ${i + 1}`"
                @click="hapusBaris(b.kunci)"
              >
                <PhX :size="14" aria-hidden="true" />
                Hapus
              </button>
            </div>
            <div class="grid gap-3 md:grid-cols-6">
              <div class="md:col-span-2">
                <label :for="`nama-${b.kunci}`" class="mb-1 block text-xs font-medium text-neutral-600">Nama Barang</label>
                <input
                  :id="`nama-${b.kunci}`"
                  v-model="b.nama"
                  type="text"
                  maxlength="200"
                  placeholder="Contoh: Kertas HVS A4"
                  class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label :for="`harga-${b.kunci}`" class="mb-1 block text-xs font-medium text-neutral-600">Harga (Rp)</label>
                <input
                  :id="`harga-${b.kunci}`"
                  :value="b.hargaTeks"
                  type="text"
                  inputmode="numeric"
                  placeholder="50.000"
                  class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                  @input="saatHarga(b, $event)"
                />
              </div>
              <div>
                <label :for="`jumlah-${b.kunci}`" class="mb-1 block text-xs font-medium text-neutral-600">Jumlah</label>
                <input
                  :id="`jumlah-${b.kunci}`"
                  v-model.number="b.jumlah"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="10"
                  class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm tabular-nums focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label :for="`satuan-${b.kunci}`" class="mb-1 block text-xs font-medium text-neutral-600">Satuan</label>
                <input
                  :id="`satuan-${b.kunci}`"
                  v-model="b.satuan"
                  type="text"
                  maxlength="40"
                  placeholder="rim"
                  class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label :for="`exp-${b.kunci}`" class="mb-1 block text-xs font-medium text-neutral-600">Tgl Expired</label>
                <input
                  :id="`exp-${b.kunci}`"
                  v-model="b.tglExpired"
                  type="date"
                  class="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div class="md:col-span-6">
                <span class="block text-xs font-medium text-neutral-600">Total</span>
                <p class="mt-1 rounded-md bg-neutral-100 px-2.5 py-2 text-sm tabular-nums" aria-live="polite">
                  {{ formatRupiah(totalBaris(b)) }}
                </p>
              </div>
            </div>
          </fieldset>
        </div>
        <div
          class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md px-4 py-3 text-sm font-medium"
          :class="melebihiBatas ? 'bg-red-50 text-red-800' : 'bg-neutral-100 text-neutral-800'"
          aria-live="polite"
        >
          <span>Total transaksi: {{ formatRupiah(totalSemua) }}</span>
          <span>Batas: {{ subTerpilih ? formatRupiah(batasHarga) : '—' }}</span>
        </div>
        <p v-if="melebihiBatas" role="alert" class="mt-2 text-sm text-red-700">
          Total melebihi batas harga sub kategori — kurangi harga atau jumlah sebelum menyimpan.
        </p>
      </section>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-white px-5 py-2 text-sm hover:bg-neutral-100"
          @click="$router.push('/barang-masuk')"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="menyimpan"
          class="rounded-md bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ menyimpan ? 'Menyimpan…' : 'Simpan' }}
        </button>
      </div>
    </form>
  </div>
</template>
