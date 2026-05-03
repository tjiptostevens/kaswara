import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const ACTIVE_WORKSPACE_KEY = 'kaswara_active_workspace_id'

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,           // anggota_organisasi row for active workspace
  organisasi: null,        // alias: active workspace's organisasi row (backward compat)
  workspaces: [],          // all { membership, organisasi } for this user
  activeWorkspace: null,   // organisasi row of currently active workspace
  loading: true,
  error: null,

  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchProfile(session.user)
    } else {
      set({ user: null, profile: null, organisasi: null, workspaces: [], activeWorkspace: null, loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().fetchProfile(session.user)
      } else {
        set({ user: null, profile: null, organisasi: null, workspaces: [], activeWorkspace: null, loading: false })
      }
    })
  },

  fetchProfile: async (user) => {
    set({ user, loading: true })

    // Fetch ALL memberships for this user
    const { data: memberships } = await supabase
      .from('anggota_organisasi')
      .select('*, organisasi(*)')
      .eq('user_id', user.id)
      .eq('aktif', true)

    if (!memberships || memberships.length === 0) {
      set({ profile: null, organisasi: null, workspaces: [], activeWorkspace: null, loading: false })
      return
    }

    const workspaces = memberships.map((m) => m.organisasi)

    // Determine which workspace to activate
    const savedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
    const saved = savedId ? workspaces.find((w) => w.id === savedId) : null
    // Prefer saved, then personal, then first
    const personal = workspaces.find((w) => w.tipe === 'personal')
    const activeWorkspace = saved || personal || workspaces[0]

    const profile = memberships.find((m) => m.organisasi_id === activeWorkspace.id)

    set({
      profile,
      organisasi: activeWorkspace,
      workspaces,
      activeWorkspace,
      loading: false,
    })
  },

  switchWorkspace: (orgId) => {
    const { workspaces, user } = get()
    const next = workspaces.find((w) => w.id === orgId)
    if (!next) return

    // Fetch fresh membership for this workspace from already-loaded data
    // (we re-use what's in workspaces; profile comes from anggota_organisasi)
    supabase
      .from('anggota_organisasi')
      .select('*, organisasi(*)')
      .eq('user_id', user.id)
      .eq('organisasi_id', orgId)
      .eq('aktif', true)
      .single()
      .then(({ data: membership }) => {
        if (membership) {
          localStorage.setItem(ACTIVE_WORKSPACE_KEY, orgId)
          set({
            profile: membership,
            organisasi: next,
            activeWorkspace: next,
          })
        }
      })
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
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
    await supabase.auth.signOut()
    set({ user: null, profile: null, organisasi: null, workspaces: [], activeWorkspace: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
