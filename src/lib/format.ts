export function formatRupiah(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined || !Number.isFinite(nilai)) return '-';
  return `Rp ${Math.trunc(nilai).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function formatAngka(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined || !Number.isFinite(nilai)) return '-';
  return Math.trunc(nilai).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseRupiah(teks: string): number {
  const angka = teks.replace(/[^0-9]/g, '');
  return angka === '' ? 0 : Number(angka);
}

export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function hariIni(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daftarTahun(): number[] {
  const kini = new Date().getFullYear();
  const awal = 2020;
  const daftar: number[] = [];
  for (let t = kini; t >= awal; t--) daftar.push(t);
  return daftar;
}
