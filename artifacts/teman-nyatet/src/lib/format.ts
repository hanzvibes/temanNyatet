/** Format angka menjadi Rupiah tanpa desimal, contoh: 249000 → "Rp 249.000". */
export function formatIDR(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}
