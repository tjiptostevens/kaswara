import useAuthStore from '../stores/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const organisasi = useAuthStore((s) => s.organisasi)
  const workspaces = useAuthStore((s) => s.workspaces)
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const permissionMatrix = useAuthStore((s) => s.permissionMatrix)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const initialize = useAuthStore((s) => s.initialize)
  const login = useAuthStore((s) => s.login)
  const signup = useAuthStore((s) => s.signup)
  const logout = useAuthStore((s) => s.logout)
  const clearError = useAuthStore((s) => s.clearError)
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace)

  const isAuthenticated = !!user
  const role = profile?.role || null
  const isBendahara = role === 'bendahara'
  const isKetua = role === 'ketua'
  const isAnggota = role === 'anggota'
  const isPersonalWorkspace = activeWorkspace?.tipe === 'personal'
  const isAdmin = isBendahara

  // Flag lama — tetap tersedia untuk backward compat selama transisi
  const canManageRAB = isPersonalWorkspace || profile?.can_manage_rab === true
  const canManageRAP = isPersonalWorkspace || profile?.can_manage_rap === true
  const canApproveRAB = isPersonalWorkspace || isKetua || profile?.can_approve_rab === true
  const canApproveJoinRequest = isBendahara || isKetua || profile?.can_approve_join_request === true

  /**
   * Cek apakah user memiliki akses untuk melakukan aksi pada resource.
   *
   * @param {string} resource  - 'transaksi' | 'iuran' | 'rab' | 'rap' | 'surat'
   * @param {string} action    - 'create' | 'read' | 'update' | 'delete' | 'submit' | 'approve' | 'cancel'
   * @param {string} [requiredScope] - 'any' (default) | 'own' | 'all'
   * @returns {boolean}
   */
  const can = (resource, action, requiredScope = 'any') => {
    // Personal workspace: akses penuh selalu
    if (isPersonalWorkspace) return true

    // Jika matrix belum dimuat, fallback ke role-based (backward compat)
    if (!permissionMatrix) {
      return isBendahara || isKetua
    }

    const scope = permissionMatrix?.[resource]?.[action] ?? 'none'
    if (requiredScope === 'all') return scope === 'all'
    if (requiredScope === 'own') return scope === 'own' || scope === 'all'
    return scope !== 'none'
  }

  /**
   * Cek apakah user memiliki akses untuk aksi pada record tertentu,
   * dengan mempertimbangkan scope own vs all.
   *
   * @param {string} resource
   * @param {string} action
   * @param {object} record        - baris data yang ingin diakses
   * @param {string} [ownerField]  - field yang berisi user_id pemilik (default: 'dibuat_oleh')
   * @returns {boolean}
   */
  const canForRecord = (resource, action, record, ownerField = 'dibuat_oleh') => {
    if (isPersonalWorkspace) return true
    if (!permissionMatrix) return isBendahara || isKetua

    const scope = permissionMatrix?.[resource]?.[action] ?? 'none'
    if (scope === 'none') return false
    if (scope === 'all') return true
    if (scope === 'own') return record?.[ownerField] === user?.id
    return false
  }

  return {
    user,
    profile,
    organisasi,
    workspaces,
    activeWorkspace,
    permissionMatrix,
    loading,
    error,
    initialize,
    login,
    signup,
    logout,
    clearError,
    switchWorkspace,
    isAuthenticated,
    role,
    isBendahara,
    isKetua,
    isAnggota,
    isPersonalWorkspace,
    isAdmin,
    // Flag lama (backward compat)
    canManageRAB,
    canManageRAP,
    canApproveRAB,
    canApproveJoinRequest,
    // API capability baru
    can,
    canForRecord,
  }
}
