/**
 * Format angka menjadi format mata uang Rupiah
 * @param {number} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format angka menjadi singkatan Rupiah (jt, rb)
 * @param {number} amount
 * @returns {string}
 */
export function formatRupiahShort(amount) {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)} jt`
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)} rb`
  return formatRupiah(amount)
}

/**
 * Format tanggal ke format Indonesia
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTanggal(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format tanggal ke format pendek (dd/mm/yyyy)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTanggalPendek(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format periode (bulan tahun) dalam Bahasa Indonesia
 * @param {string|Date} date
 * @returns {string}
 */
export function formatPeriode(date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * @returns {string}
 */
export function getTodayString() {
  return new Date().toISOString().split('T')[0]
}
