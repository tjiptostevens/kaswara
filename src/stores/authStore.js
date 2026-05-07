import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { buildPermissionMatrix } from '../constants/permissions'

const ACTIVE_WORKSPACE_KEY = 'kaswara_active_workspace_id'
const PROFILE_REFRESH_EVENTS = new Set(['SIGNED_IN', 'USER_UPDATED'])

const resetAuthState = {
  user: null,
  profile: null,
  organisasi: null,
  workspaces: [],
  activeWorkspace: null,
  permissionMatrix: null,
  loading: false,
}

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,           // anggota_organisasi row for active workspace
  organisasi: null,        // alias: active workspace's organisasi row (backward compat)
  workspaces: [],          // all { membership, organisasi } for this user
  activeWorkspace: null,   // organisasi row of currently active workspace
  permissionMatrix: null,  // { resource: { action: scope } } untuk workspace aktif
  initialized: false,
  authSubscription: null,
  loading: true,
  error: null,

  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    if (get().initialized) return
    set({ initialized: true, loading: true })

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().fetchProfile(session.user)
    } else {
      set(resetAuthState)
    }

    const previousSubscription = get().authSubscription
    if (previousSubscription) {
      previousSubscription.unsubscribe()
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        set(resetAuthState)
        return
      }

      if (!PROFILE_REFRESH_EVENTS.has(event)) {
        return
      }

      if (
        event === 'SIGNED_IN' &&
        get().user?.id === session.user.id &&
        get().profile &&
        !get().loading
      ) {
        return
      }

      if (session?.user) {
        await get().fetchProfile(session.user, { setLoading: false })
      }
    })

    set({ authSubscription: subscription })
  },

  fetchProfile: async (user, options = {}) => {
    const { setLoading = true } = options
    set(setLoading ? { user, loading: true } : { user })

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

    // Fetch permission matrix untuk workspace aktif
    let permissionMatrix = null
    if (profile?.id) {
      const { data: permRows } = await supabase
        .from('anggota_permission')
        .select('resource, action, scope')
        .eq('anggota_organisasi_id', profile.id)
      permissionMatrix = buildPermissionMatrix(permRows)
    }

    set({
      profile,
      organisasi: activeWorkspace,
      workspaces,
      activeWorkspace,
      permissionMatrix,
      loading: false,
    })
  },

  switchWorkspace: (orgId) => {
    const { workspaces, user } = get()
    const next = workspaces.find((w) => w.id === orgId)
    if (!next) return

    supabase
      .from('anggota_organisasi')
      .select('*, organisasi(*)')
      .eq('user_id', user.id)
      .eq('organisasi_id', orgId)
      .eq('aktif', true)
      .single()
      .then(async ({ data: membership, error }) => {
        if (error || !membership) return

        // Fetch permission matrix untuk workspace baru
        let permissionMatrix = null
        const { data: permRows } = await supabase
          .from('anggota_permission')
          .select('resource, action, scope')
          .eq('anggota_organisasi_id', membership.id)
        permissionMatrix = buildPermissionMatrix(permRows)

        localStorage.setItem(ACTIVE_WORKSPACE_KEY, orgId)
        set({
          profile: membership,
          organisasi: next,
          activeWorkspace: next,
          permissionMatrix,
        })
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

  signup: async (email, password) => {
    set({ error: null, loading: true })
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: email.split('@')[0]
        }
      }
    })
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
