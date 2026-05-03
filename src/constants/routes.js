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
  PUBLIK: '/publik/:orgId',
}

/** Helper: buat URL halaman publik dari orgId atau slug */
export function getPublikUrl(orgId) {
  return `/publik/${orgId}`
}
