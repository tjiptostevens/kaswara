/**
 * Kaswara — Definisi matrix permission
 * Single source of truth untuk resource, aksi, dan label.
 */

export const RESOURCES = {
  TRANSAKSI: 'transaksi',
  IURAN: 'iuran',
  RAB: 'rab',
  RAP: 'rap',
  SURAT: 'surat',
}

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  SUBMIT: 'submit',
  APPROVE: 'approve',
  CANCEL: 'cancel',
}

export const SCOPES = {
  NONE: 'none',
  OWN: 'own',
  ALL: 'all',
}

/** Label tampilan untuk resource */
export const RESOURCE_LABELS = {
  transaksi: 'Transaksi',
  iuran: 'Iuran',
  rab: 'RAB',
  rap: 'RAP',
  surat: 'Surat',
}

/** Label tampilan untuk aksi */
export const ACTION_LABELS = {
  create: 'Buat',
  read: 'Lihat',
  update: 'Edit',
  delete: 'Hapus',
  submit: 'Ajukan',
  approve: 'Setujui/Tolak',
  cancel: 'Batalkan',
}

/** Label tampilan untuk scope */
export const SCOPE_LABELS = {
  none: 'Tidak Ada',
  own: 'Milik Sendiri',
  all: 'Semua Data',
}

/** Deskripsi singkat tiap aksi */
export const ACTION_DESCRIPTIONS = {
  create: 'Membuat data baru',
  read: 'Menampilkan data',
  update: 'Mengedit data saat status draft',
  delete: 'Menghapus data saat status draft atau dibatalkan',
  submit: 'Mengajukan (draft → diajukan)',
  approve: 'Menyetujui atau menolak (diajukan → disetujui/ditolak)',
  cancel: 'Membatalkan (dari status diajukan atau disetujui)',
}

/** Urutan resource untuk ditampilkan di UI */
export const RESOURCE_ORDER = ['transaksi', 'iuran', 'rab', 'rap', 'surat']

/** Urutan aksi untuk ditampilkan di UI */
export const ACTION_ORDER = ['create', 'read', 'update', 'delete', 'submit', 'approve', 'cancel']

/**
 * Default permission matrix untuk role 'anggota'.
 * Format: { resource: { action: scope } }
 */
export const DEFAULT_ANGGOTA_PERMISSIONS = {
  transaksi: {
    create: 'none',
    read: 'all',
    update: 'none',
    delete: 'none',
    submit: 'none',
    approve: 'none',
    cancel: 'none',
  },
  iuran: {
    create: 'none',
    read: 'own',
    update: 'none',
    delete: 'none',
    submit: 'none',
    approve: 'none',
    cancel: 'none',
  },
  rab: {
    create: 'own',
    read: 'all',
    update: 'own',
    delete: 'own',
    submit: 'own',
    approve: 'none',
    cancel: 'own',
  },
  rap: {
    create: 'own',
    read: 'all',
    update: 'own',
    delete: 'own',
    submit: 'own',
    approve: 'none',
    cancel: 'own',
  },
  surat: {
    create: 'own',
    read: 'own',
    update: 'own',
    delete: 'own',
    submit: 'own',
    approve: 'none',
    cancel: 'own',
  },
}

/**
 * Default permission matrix untuk role 'bendahara' / 'ketua' — full access.
 * Format: { resource: { action: scope } }
 */
export const DEFAULT_FULL_PERMISSIONS = Object.fromEntries(
  RESOURCE_ORDER.map((resource) => [
    resource,
    Object.fromEntries(ACTION_ORDER.map((action) => [action, 'all'])),
  ])
)

/**
 * Buat objek permission matrix kosong (semua 'none').
 */
export function createEmptyPermissions() {
  return Object.fromEntries(
    RESOURCE_ORDER.map((resource) => [
      resource,
      Object.fromEntries(ACTION_ORDER.map((action) => [action, 'none'])),
    ])
  )
}

/**
 * Konversi flat array dari DB ke nested object.
 * Input: [{ resource, action, scope }]
 * Output: { resource: { action: scope } }
 */
export function buildPermissionMatrix(rows) {
  const matrix = createEmptyPermissions()
  for (const row of rows || []) {
    if (matrix[row.resource] !== undefined) {
      matrix[row.resource][row.action] = row.scope
    }
  }
  return matrix
}

/**
 * Konversi nested object ke flat array untuk disimpan ke DB.
 * Input: { resource: { action: scope } }, anggotaOrganisasiId
 * Output: [{ anggota_organisasi_id, resource, action, scope }]
 */
export function flattenPermissions(matrix, anggotaOrganisasiId) {
  const rows = []
  for (const resource of RESOURCE_ORDER) {
    for (const action of ACTION_ORDER) {
      rows.push({
        anggota_organisasi_id: anggotaOrganisasiId,
        resource,
        action,
        scope: matrix?.[resource]?.[action] ?? 'none',
      })
    }
  }
  return rows
}
