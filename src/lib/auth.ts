import { computed, reactive } from 'vue';
import { api } from './api';
import type { Pengguna } from './tipe';

interface AuthState {
  pengguna: Pengguna | null;
  siap: boolean;
}
function isPengguna(value: unknown): value is Pengguna {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'username' in value &&
    'nama' in value &&
    'email' in value &&
    'role' in value &&
    typeof value.id === 'string' &&
    typeof value.username === 'string' &&
    typeof value.nama === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'admin' || value.role === 'operator')
  );
}
function bacaPengguna(): Pengguna | null {
  try {
    const mentah = localStorage.getItem('jmc_user');
    if (!mentah) return null;
    const parsed: unknown = JSON.parse(mentah);
    return isPengguna(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const authState = reactive<AuthState>({ pengguna: bacaPengguna(), siap: false });

export function useAuth() {
  const adalahAdmin = computed(() => authState.pengguna?.role === 'admin');
  const sudahMasuk = computed(() => authState.pengguna !== null && localStorage.getItem('jmc_token') !== null);

  async function masuk(username: string, password: string): Promise<void> {
    const res = await api<{ access_token: string; user: Pengguna }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('jmc_token', res.access_token);
    localStorage.setItem('jmc_user', JSON.stringify(res.user));
    authState.pengguna = res.user;
    authState.siap = true;
  }

  function keluar(): void {
    localStorage.removeItem('jmc_token');
    localStorage.removeItem('jmc_user');
    authState.pengguna = null;
    authState.siap = true;
  }

  async function muatProfil(): Promise<void> {
    if (!localStorage.getItem('jmc_token')) {
      authState.pengguna = null;
      authState.siap = true;
      return;
    }
    try {
      const profil = await api<Pengguna>('/auth/profil');
      authState.pengguna = profil;
      localStorage.setItem('jmc_user', JSON.stringify(profil));
    } catch {
      keluar();
    } finally {
      authState.siap = true;
    }
  }

  return { authState, adalahAdmin, sudahMasuk, masuk, keluar, muatProfil };
}
