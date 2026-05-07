import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { flattenPermissions } from '../constants/permissions'

const useAnggotaStore = create((set) => ({
  anggota: [],
  loading: false,
  error: null,

  fetchAnggota: async (organisasiId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('anggota_organisasi')
      .select('*, anggota_permission(resource, action, scope)')
      .eq('organisasi_id', organisasiId)
      .order('nama_lengkap')

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ anggota: data || [], loading: false })
  },

  addAnggota: async (data) => {
    const { data: result, error } = await supabase.functions.invoke('create-anggota-with-auth', {
      body: data,
    })
    if (error) return { error }
    if (result?.error) return { error: { message: result.error } }
    set((state) => ({ anggota: [...state.anggota, result.data] }))
    return { data: result.data, existingUser: result.existing_user === true, error: null }
  },

  updateAnggota: async (id, updates) => {
    const { permissions, ...anggotaUpdates } = updates

    // Update kolom anggota_organisasi
    const { data: result, error } = await supabase
      .from('anggota_organisasi')
      .update(anggotaUpdates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error }

    // Upsert permission matrix jika ada (via RPC agar bypass RLS self-restriction)
    if (permissions) {
      const permRows = flattenPermissions(permissions, id)
      const { error: permError } = await supabase.rpc('save_anggota_permissions', {
        p_ao_id: id,
        p_permissions: permRows.map(({ resource, action, scope }) => ({ resource, action, scope })),
      })
      if (permError) return { error: permError }
    }

    set((state) => ({
      anggota: state.anggota.map((a) => (a.id === id ? { ...result, anggota_permission: a.anggota_permission } : a)),
    }))
    return { data: result, error: null }
  },

  deleteAnggota: async (id) => {
    const { error } = await supabase
      .from('anggota_organisasi')
      .delete()
      .eq('id', id)
    if (error) return { error }
    set((state) => ({
      anggota: state.anggota.filter((a) => a.id !== id),
    }))
    return { error: null }
  },
}))

export default useAnggotaStore
