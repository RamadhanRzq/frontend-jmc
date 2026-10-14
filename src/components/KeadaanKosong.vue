<script setup lang="ts">
import { PhTray } from '@phosphor-icons/vue';

defineProps<{ judul: string; deskripsi: string; labelAksi?: string }>();
const emit = defineEmits<{ aksi: [] }>();
</script>

<template>
  <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
    <PhTray :size="36" class="text-neutral-300" aria-hidden="true" />
    <p class="font-medium">{{ judul }}</p>
    <p class="max-w-md text-sm text-neutral-500">{{ deskripsi }}</p>
    <button
      v-if="labelAksi"
      type="button"
      class="mt-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      @click="emit('aksi')"
    >
      {{ labelAksi }}
    </button>
  </div>
</template>
