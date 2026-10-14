import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { authState, useAuth } from './lib/auth';
import AppLayout from './components/AppLayout.vue';
import LoginView from './views/LoginView.vue';
import BarangMasukDaftar from './views/BarangMasukDaftar.vue';
import BarangMasukForm from './views/BarangMasukForm.vue';
import KategoriView from './views/KategoriView.vue';
import SubKategoriView from './views/SubKategoriView.vue';
import UsersView from './views/UsersView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    judul: string;
    butuhAuth?: boolean;
    adminSaja?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/login', component: LoginView, meta: { judul: 'Masuk' } },
  {
    path: '/',
    component: AppLayout,
    meta: { judul: 'Barang Masuk', butuhAuth: true },
    children: [
      { path: '', redirect: '/barang-masuk' },
      { path: 'barang-masuk', component: BarangMasukDaftar, meta: { judul: 'Barang Masuk', butuhAuth: true } },
      {
        path: 'barang-masuk/tambah',
        component: BarangMasukForm,
        meta: { judul: 'Tambah Barang Masuk', butuhAuth: true },
      },
      {
        path: 'barang-masuk/:id/ubah',
        component: BarangMasukForm,
        meta: { judul: 'Ubah Barang Masuk', butuhAuth: true },
      },
      {
        path: 'kategori',
        component: KategoriView,
        meta: { judul: 'Master Data — Kategori', butuhAuth: true, adminSaja: true },
      },
      {
        path: 'sub-kategori',
        component: SubKategoriView,
        meta: { judul: 'Master Data — Sub Kategori', butuhAuth: true, adminSaja: true },
      },
      {
        path: 'users',
        component: UsersView,
        meta: { judul: 'Manajemen User', butuhAuth: true, adminSaja: true },
      },
    ],
  },
  { path: '/:sisa(.*)', redirect: '/barang-masuk' },
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (ke) => {
  const { muatProfil } = useAuth();
  if (!authState.siap) await muatProfil();
  const pengguna = authState.pengguna;
  if (ke.path === '/login') {
    if (pengguna) return '/barang-masuk';
    return true;
  }
  if (!pengguna) return '/login';
  if (ke.meta.adminSaja && pengguna.role !== 'admin') return '/barang-masuk';
  return true;
});
