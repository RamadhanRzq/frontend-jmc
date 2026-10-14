<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { PhX } from '@phosphor-icons/vue';

defineProps<{ judul: string; lebar?: string }>();
const emit = defineEmits<{ tutup: [] }>();

function saatTombol(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('tutup');
}

onMounted(() => window.addEventListener('keydown', saatTombol));
onUnmounted(() => window.removeEventListener('keydown', saatTombol));
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/50" @click="emit('tutup')" aria-hidden="true" />
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="judul"
      class="relative max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      :class="lebar ?? 'max-w-lg'"
    >
      <div class="mb-4 flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold">{{ judul }}</h2>
        <button
          type="button"
          aria-label="Tutup dialog"
          class="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          @click="emit('tutup')"
        >
          <PhX :size="18" aria-hidden="true" />
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
