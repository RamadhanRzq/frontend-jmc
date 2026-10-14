<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { PhEye, PhEyeSlash, PhPackage } from '@phosphor-icons/vue';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const { masuk } = useAuth();
const router = useRouter();

const username = ref('');
const password = ref('');
const tampilSandi = ref(false);
const memuat = ref(false);
const galat = ref('');

async function kirim(): Promise<void> {
  if (!username.value.trim() || !password.value) {
    galat.value = 'Username dan password wajib diisi.';
    return;
  }
  memuat.value = true;
  galat.value = '';
  try {
    await masuk(username.value.trim(), password.value);
    await router.push('/barang-masuk');
  } catch (e) {
    galat.value = e instanceof ApiError ? e.message : 'Login gagal, coba lagi.';
  } finally {
    memuat.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
      <div class="mb-6 flex items-center gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-md bg-neutral-900 text-white">
          <PhPackage :size="24" aria-hidden="true" />
        </span>
        <div>
          <h1 class="text-lg font-bold leading-tight">Aplikasi Pengelolaan Barang</h1>
          <p class="text-sm text-neutral-500">PT JMC Indonesia</p>
        </div>
      </div>
      <p class="mb-5 text-sm text-neutral-600">Masuk untuk mencatat dan memantau barang masuk gudang.</p>
      <form class="flex flex-col gap-4" @submit.prevent="kirim" novalidate>
        <div>
          <label for="username" class="mb-1 block text-sm font-medium">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="username Anda"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div>
          <label for="password" class="mb-1 block text-sm font-medium">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="tampilSandi ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 pr-11 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-500 hover:text-neutral-900"
              :aria-label="tampilSandi ? 'Sembunyikan password' : 'Tampilkan password'"
              :aria-pressed="tampilSandi"
              @click="tampilSandi = !tampilSandi"
            >
              <component :is="tampilSandi ? PhEyeSlash : PhEye" :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p v-if="galat" role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ galat }}</p>
        <button
          type="submit"
          :disabled="memuat"
          class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ memuat ? 'Memeriksa…' : 'Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
