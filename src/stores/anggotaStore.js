import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useAnggotaStore = create((set) => ({
  anggota: [],
  loading: false,
  error: null,

  fetchAnggota: async (organisasiId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('anggota_organisasi')
      .select('*')
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
    return { data: result.data, error: null }
  },

  updateAnggota: async (id, updates) => {
    const { data: result, error } = await supabase
      .from('anggota_organisasi')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { error }
    set((state) => ({
      anggota: state.anggota.map((a) => (a.id === id ? result : a)),
    }))
    return { data: result, error: null }
  },

  deleteAnggota: async (id) => {
    const { error } = await supabase
      .from('anggota_organisasi')
      .update({ aktif: false })
      .eq('id', id)
    if (error) return { error }
    set((state) => ({
      anggota: state.anggota.filter((a) => a.id !== id),
    }))
    return { error: null }
  },
}))

export default useAnggotaStore
