<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ halaman: number; total: number; batas: number }>();
const emit = defineEmits<{ ganti: [halaman: number] }>();

const totalHalaman = computed(() => Math.max(1, Math.ceil(props.total / props.batas)));
const dari = computed(() => (props.total === 0 ? 0 : (props.halaman - 1) * props.batas + 1));
const sampai = computed(() => Math.min(props.total, props.halaman * props.batas));
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 pt-4">
    <p class="text-sm text-neutral-500">Menampilkan {{ dari }}–{{ sampai }} dari {{ total }} data</p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-neutral-100"
        :disabled="halaman <= 1"
        @click="emit('ganti', halaman - 1)"
      >
        Sebelumnya
      </button>
      <p class="text-sm text-neutral-600" aria-live="polite">Halaman {{ halaman }} dari {{ totalHalaman }}</p>
      <button
        type="button"
        class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-neutral-100"
        :disabled="halaman >= totalHalaman"
        @click="emit('ganti', halaman + 1)"
      >
        Berikutnya
      </button>
    </div>
  </div>
</template>
