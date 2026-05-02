import useAuthStore from '../stores/authStore'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const organisasi = useAuthStore((s) => s.organisasi)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const initialize = useAuthStore((s) => s.initialize)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const clearError = useAuthStore((s) => s.clearError)

  const isAuthenticated = !!user
  const role = profile?.role || null
  const isBendahara = role === 'bendahara'
  const isKetua = role === 'ketua'
  const isAnggota = role === 'anggota'

  return {
    user,
    profile,
    organisasi,
    loading,
    error,
    initialize,
    login,
    logout,
    clearError,
    isAuthenticated,
    role,
    isBendahara,
    isKetua,
    isAnggota,
  }
}
