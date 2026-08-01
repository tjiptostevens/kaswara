/**
 * Format angka menjadi format mata uang
 * @param {number} amount
 * @param {{ currency?: string, simbol?: string }} [opts]
 * @returns {string}
 */
export function formatRupiah(amount, opts = {}) {
  const currency = opts.currency || 'IDR'
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
      maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(amount || 0)
  } catch {
    const simbol = opts.simbol || 'Rp'
    return `${simbol} ${new Intl.NumberFormat('id-ID').format(amount || 0)}`
  }
}

/**
 * Format angka menjadi singkatan (jt, rb) — terutama untuk IDR
 * @param {number} amount
 * @param {{ currency?: string, simbol?: string }} [opts]
 * @returns {string}
 */
export function formatRupiahShort(amount, opts = {}) {
  const currency = opts.currency || 'IDR'
  const simbol = opts.simbol || (currency === 'IDR' ? 'Rp' : currency)
  if (currency === 'IDR') {
    if (amount >= 1_000_000_000) return `${simbol} ${(amount / 1_000_000_000).toFixed(1)} M`
    if (amount >= 1_000_000) return `${simbol} ${(amount / 1_000_000).toFixed(1)} jt`
    if (amount >= 1_000) return `${simbol} ${(amount / 1_000).toFixed(0)} rb`
  }
  return formatRupiah(amount, opts)
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
