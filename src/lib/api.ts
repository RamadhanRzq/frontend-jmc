export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const DASAR = import.meta.env.URL_PROD ?? 'https://jmc.lattepos.web.id/api';


function pesanDari(data: unknown, cadangan: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const m: unknown = data.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.map(String).join('; ');
  }
  return cadangan;
}

function sesiKedaluarsa(): void {
  localStorage.removeItem('jmc_token');
  localStorage.removeItem('jmc_user');
  if (window.location.pathname !== '/login') window.location.href = '/login';
}

function kepalaUntuk(init: RequestInit, token: string | null): Headers {
  const kepala = new Headers(init.headers ?? {});
  if (token) kepala.set('Authorization', `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !kepala.has('Content-Type')) {
    kepala.set('Content-Type', 'application/json');
  }
  return kepala;
}

async function bacaJson(res: Response): Promise<unknown> {
  const teks = await res.text();
  if (!teks) return undefined;
  return JSON.parse(teks) as unknown;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('jmc_token');
  const res = await fetch(`${DASAR}${path}`, { ...init, headers: kepalaUntuk(init, token) });
  const badan = await bacaJson(res).catch(() => undefined);
  if (!res.ok) {
    if (res.status === 401 && token) sesiKedaluarsa();
    throw new ApiError(res.status, pesanDari(badan, `Permintaan gagal (${res.status})`));
  }
  // Batas API generik: bentuk T dijaga oleh tipe pemanggil per endpoint.
  return badan as T;
}

export async function apiTeks(path: string): Promise<string> {
  const token = localStorage.getItem('jmc_token');
  const kepala = new Headers();
  if (token) kepala.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${DASAR}${path}`, { headers: kepala });
  if (!res.ok) {
    if (res.status === 401 && token) sesiKedaluarsa();
    throw new ApiError(res.status, `Permintaan gagal (${res.status})`);
  }
  return res.text();
}

export async function apiBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('jmc_token');
  const kepala = new Headers();
  if (token) kepala.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${DASAR}${path}`, { headers: kepala });
  if (!res.ok) throw new ApiError(res.status, `Unduhan gagal (${res.status})`);
  return res.blob();
}

export function unduhBlob(blob: Blob, nama: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
