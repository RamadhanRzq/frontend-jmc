<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { PhPackage, PhSignOut, PhTag, PhTagSimple, PhUsersThree } from '@phosphor-icons/vue';
import { useAuth } from '../lib/auth';

const { authState, adalahAdmin } = useAuth();
const router = useRouter();

const TAUTAN = 'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white';
const TAUTAN_AKTIF = 'bg-neutral-800 text-white';

function peranLabel(): string {
  return authState.pengguna?.role === 'admin' ? 'Admin' : 'Operator';
}

function keluar(): void {
  localStorage.removeItem('jmc_token');
  localStorage.removeItem('jmc_user');
  authState.pengguna = null;
  authState.siap = true;
  void router.push('/login');
}
</script>

<template>
  <div class="flex min-h-screen bg-neutral-100 text-neutral-900">
    <aside class="flex w-60 shrink-0 flex-col bg-neutral-900 text-neutral-100">
      <div class="px-5 pb-6 pt-6">
        <p class="text-sm font-bold leading-snug">Aplikasi Pengelolaan Barang</p>
        <p class="mt-1 text-xs text-neutral-400">PT JMC Indonesia</p>
      </div>
      <nav class="flex flex-col gap-1 px-3" aria-label="Menu utama">
        <RouterLink to="/barang-masuk" :class="TAUTAN" :active-class="TAUTAN_AKTIF">
          <PhPackage :size="18" aria-hidden="true" />
          Barang Masuk
        </RouterLink>
        <template v-if="adalahAdmin">
          <RouterLink to="/kategori" :class="TAUTAN" :active-class="TAUTAN_AKTIF">
            <PhTag :size="18" aria-hidden="true" />
            Kategori
          </RouterLink>
          <RouterLink to="/sub-kategori" :class="TAUTAN" :active-class="TAUTAN_AKTIF">
            <PhTagSimple :size="18" aria-hidden="true" />
            Sub Kategori
          </RouterLink>
          <RouterLink to="/users" :class="TAUTAN" :active-class="TAUTAN_AKTIF">
            <PhUsersThree :size="18" aria-hidden="true" />
            Manajemen User
          </RouterLink>
        </template>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-3">
        <h1 class="truncate text-base font-semibold">{{ $route.meta.judul }}</h1>
        <div class="flex shrink-0 items-center gap-3">
          <div class="text-right">
            <p class="text-sm font-medium leading-tight">{{ authState.pengguna?.nama }}</p>
            <p class="text-xs text-neutral-500">{{ peranLabel() }}</p>
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
            @click="keluar"
          >
            <PhSignOut :size="16" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </header>
      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
