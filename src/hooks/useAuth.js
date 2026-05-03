import useAuthStore from '../stores/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const organisasi = useAuthStore((s) => s.organisasi)
  const workspaces = useAuthStore((s) => s.workspaces)
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const initialize = useAuthStore((s) => s.initialize)
  const login = useAuthStore((s) => s.login)
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
  const canManageRAB = isBendahara || isKetua || isPersonalWorkspace || profile?.can_manage_rab === true

  return {
    user,
    profile,
    organisasi,
    workspaces,
    activeWorkspace,
    loading,
    error,
    initialize,
    login,
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
    canManageRAB,
  }
}
