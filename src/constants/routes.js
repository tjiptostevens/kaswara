export const ROUTES = {
  LOGIN: '/login',
  SETUP: '/setup',
  DASHBOARD: '/',
  TRANSAKSI: '/transaksi',
  ANGGOTA: '/anggota',
  KELUARGA: '/keluarga',
  IURAN: '/iuran',
  RAB: '/rab',
  RAP: '/rap',
  LAPORAN: '/laporan',
  SETTINGS: '/settings',
  KATEGORI: '/kategori',
  PUBLIK: '/publik/:handle',
}

/** Helper: buat URL halaman publik dari orgId atau slug */
export function getPublikUrl(handle) {
  return `/publik/${handle}`
}
