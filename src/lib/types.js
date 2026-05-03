/**
 * Kaswara Type Definitions
 * JSDoc type annotations for improved IDE support and documentation
 * While the codebase is JavaScript, these definitions provide TypeScript-like benefits
 */

/**
 * @typedef {Object} User
 * @property {string} id - Supabase user UUID
 * @property {string} email - User email
 * @property {string} [phone] - User phone number
 * @property {Object} user_metadata - Custom metadata
 * @property {boolean} confirmed_at - Email confirmed
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} Organisasi
 * @property {string} id - UUID
 * @property {string} nama - Organization name
 * @property {'rt_rw' | 'keluarga'} tipe - Organization type
 * @property {string} [alamat] - Address
 * @property {string} [deskripsi] - Description
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} AnggotaOrganisasi
 * @property {string} id - UUID
 * @property {string} user_id - FK to auth.users
 * @property {string} organisasi_id - FK to organisasi
 * @property {'bendahara' | 'ketua' | 'anggota'} role - User role
 * @property {string} nama_lengkap - Full name
 * @property {string} [nomor_anggota] - Member number
 * @property {string} [email] - Email
 * @property {string} [no_hp] - Phone number
 * @property {boolean} [can_manage_rab] - Can create/edit RAB
 * @property {boolean} [can_approve_rab] - Can approve RAB
 * @property {boolean} aktif - Active status
 */

/**
 * @typedef {Object} KategoriTransaksi
 * @property {string} id - UUID
 * @property {string} organisasi_id - FK to organisasi
 * @property {string} nama - Category name
 * @property {'pemasukan' | 'pengeluaran' | 'keduanya'} tipe - Transaction type
 */

/**
 * @typedef {Object} Transaksi
 * @property {string} id - UUID
 * @property {string} organisasi_id - FK to organisasi
 * @property {string} [kategori_id] - FK to kategori_transaksi
 * @property {'pemasukan' | 'pengeluaran'} tipe - Income or expense
 * @property {number} jumlah - Amount in IDR
 * @property {string} [keterangan] - Description
 * @property {string} tanggal - Transaction date (YYYY-MM-DD)
 * @property {'draft' | 'submitted' | 'cancelled' | 'amended'} [status] - Transaction status
 * @property {string} [dibuat_oleh] - FK to auth.users
 * @property {string} [submitted_by] - FK to auth.users
 * @property {string} [submitted_at] - ISO timestamp
 * @property {string} [cancelled_by] - FK to auth.users
 * @property {string} [cancelled_at] - ISO timestamp
 * @property {string} [amended_by] - FK to auth.users
 * @property {string} [amended_at] - ISO timestamp
 * @property {string} [amended_from] - Original transaksi ID
 * @property {string} [rap_id] - FK to rap (if from RAP approval)
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} TransaksiFilters
 * @property {string} [tipe] - 'pemasukan' | 'pengeluaran'
 * @property {string} [kategoriId] - UUID of kategori
 * @property {string} [dari] - Start date (YYYY-MM-DD)
 * @property {string} [sampai] - End date (YYYY-MM-DD)
 * @property {'draft' | 'submitted' | 'cancelled' | 'amended'} [status] - Filter by status
 */

/**
 * @typedef {Object} RAB
 * @property {string} id - UUID
 * @property {string} organisasi_id - FK to organisasi
 * @property {string} nama_kegiatan - Activity name
 * @property {string} [deskripsi] - Description
 * @property {number} total_anggaran - Total budget amount (IDR)
 * @property {'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'selesai' | 'cancelled' | 'amended'} status - RAB status
 * @property {string} [catatan_ketua] - Chairman notes/feedback
 * @property {string} tanggal_pengajuan - Submission date (YYYY-MM-DD)
 * @property {string} tanggal_kegiatan - Activity date (YYYY-MM-DD)
 * @property {string} [diajukan_oleh] - FK to auth.users (submitter)
 * @property {string} [disetujui_oleh] - FK to auth.users (approver)
 * @property {string} [disetujui_at] - ISO timestamp
 * @property {string} [dibuat_oleh_anggota_id] - FK to anggota_organisasi
 * @property {string} [amended_by] - FK to auth.users
 * @property {string} [amended_at] - ISO timestamp
 * @property {string} [amended_from] - Original RAB ID
 * @property {Array<RABItem>} [rab_item] - Line items (if loaded)
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} RABItem
 * @property {string} id - UUID
 * @property {string} rab_id - FK to rab
 * @property {string} nama_item - Item name
 * @property {number} volume - Quantity
 * @property {string} satuan - Unit (e.g., 'unit', 'buah', 'box')
 * @property {number} harga_satuan - Price per unit (IDR)
 * @property {number} subtotal - volume × harga_satuan (IDR)
 */

/**
 * @typedef {Object} RAP
 * @property {string} id - UUID
 * @property {string} [rab_id] - FK to rab
 * @property {string} organisasi_id - FK to organisasi
 * @property {string} nama_item - Item realization name
 * @property {number} jumlah_realisasi - Amount realized (IDR)
 * @property {string} [keterangan] - Description/notes
 * @property {string} tanggal_realisasi - Realization date (YYYY-MM-DD)
 * @property {'draft' | 'submitted' | 'approved' | 'cancelled'} [status] - RAP status
 * @property {string} [dibuat_oleh] - FK to auth.users
 * @property {string} [submitted_by] - FK to auth.users
 * @property {string} [submitted_at] - ISO timestamp
 * @property {string} [approved_by] - FK to auth.users
 * @property {string} [approved_at] - ISO timestamp
 * @property {string} [transaksi_id] - FK to transaksi (if auto-created)
 * @property {string} [dibuat_oleh_anggota_id] - FK to anggota_organisasi
 * @property {Array<RAPFoto>} [rap_foto] - Photos (if loaded)
 * @property {Object} [rab] - RAB data (if joined)
 * @property {string} created_at - ISO timestamp
 */

/**
 * @typedef {Object} RAPFoto
 * @property {string} id - UUID
 * @property {string} rap_id - FK to rap
 * @property {string} storage_path - Path in Supabase storage
 * @property {string} [nama_file] - Original filename
 * @property {string} uploaded_at - ISO timestamp
 */

/**
 * @typedef {Object} IuranRutin
 * @property {string} id - UUID
 * @property {string} organisasi_id - FK to organisasi
 * @property {string} anggota_id - FK to anggota_organisasi
 * @property {string} periode - Month (YYYY-MM)
 * @property {number} jumlah - Fee amount (IDR)
 * @property {'belum_bayar' | 'lunas' | 'dispensasi'} status - Payment status
 * @property {string} [tanggal_bayar] - Payment date (YYYY-MM-DD)
 * @property {string} [transaksi_id] - FK to transaksi (if recorded)
 */

/**
 * @typedef {Object} AppError
 * @property {string} message - Error message
 * @property {string} [code] - Error code
 * @property {Object} [details] - Additional error details
 */

/**
 * @typedef {Object} ApiResponse
 * @template T
 * @property {T} [data] - Response data
 * @property {AppError} [error] - Error if occurred
 */

/**
 * @typedef {Object} WorkspaceInfo
 * @property {Organisasi} activeWorkspace - Currently active workspace
 * @property {Array<Organisasi>} workspaces - All user workspaces
 * @property {AnggotaOrganisasi} [profile] - Current user's membership in active workspace
 * @property {boolean} isPersonalWorkspace - True if active workspace is personal
 */

/**
 * @typedef {Object} AuthState
 * @property {User} [user] - Authenticated user
 * @property {WorkspaceInfo} workspace - Current workspace info
 * @property {boolean} isAuthenticated - True if user logged in
 * @property {'bendahara' | 'ketua' | 'anggota'} [role] - User's role in active workspace
 * @property {boolean} canManageRAB - True if user can create/edit RAB
 * @property {boolean} canApproveRAB - True if user can approve RAB
 */

// Export empty object to make this a valid JS module
export const types = {}
