import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,        // anggota_organisasi row
  organisasi: null,     // organisasi row
  loading: true,
  error: null,

  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchProfile(session.user)
    } else {
      set({ user: null, profile: null, organisasi: null, loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().fetchProfile(session.user)
      } else {
        set({ user: null, profile: null, organisasi: null, loading: false })
      }
    })
  },

  fetchProfile: async (user) => {
    set({ user, loading: true })
    const { data: profile } = await supabase
      .from('anggota_organisasi')
      .select('*, organisasi(*)')
      .eq('user_id', user.id)
      .eq('aktif', true)
      .single()

    if (profile) {
      set({
        profile,
        organisasi: profile.organisasi,
        loading: false,
      })
    } else {
      set({ profile: null, organisasi: null, loading: false })
    }
  },

  login: async (email, password) => {
    set({ error: null, loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message, loading: false })
      return { error }
    }
    return { error: null }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, organisasi: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
