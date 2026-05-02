import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useKasStore = create((set, get) => ({
  transaksi: [],
  saldo: 0,
  totalPemasukan: 0,
  totalPengeluaran: 0,
  kategori: [],
  loading: false,
  error: null,

  fetchTransaksi: async (organisasiId, filters = {}) => {
    set({ loading: true, error: null })
    let query = supabase
      .from('transaksi')
      .select('*, kategori_transaksi(nama, tipe)')
      .eq('organisasi_id', organisasiId)
      .order('tanggal', { ascending: false })

    if (filters.tipe) query = query.eq('tipe', filters.tipe)
    if (filters.kategoriId) query = query.eq('kategori_id', filters.kategoriId)
    if (filters.dari) query = query.gte('tanggal', filters.dari)
    if (filters.sampai) query = query.lte('tanggal', filters.sampai)

    const { data, error } = await query
    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ transaksi: data || [], loading: false })
    get().hitungSaldo(data || [])
  },

  hitungSaldo: (transaksi) => {
    const totalPemasukan = transaksi
      .filter((t) => t.tipe === 'pemasukan')
      .reduce((sum, t) => sum + Number(t.jumlah), 0)
    const totalPengeluaran = transaksi
      .filter((t) => t.tipe === 'pengeluaran')
      .reduce((sum, t) => sum + Number(t.jumlah), 0)
    set({
      totalPemasukan,
      totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran,
    })
  },

  addTransaksi: async (data) => {
    const { data: result, error } = await supabase
      .from('transaksi')
      .insert(data)
      .select()
      .single()
    if (error) return { error }
    set((state) => ({ transaksi: [result, ...state.transaksi] }))
    return { data: result, error: null }
  },

  deleteTransaksi: async (id) => {
    const { error } = await supabase.from('transaksi').delete().eq('id', id)
    if (error) return { error }
    set((state) => ({
      transaksi: state.transaksi.filter((t) => t.id !== id),
    }))
    return { error: null }
  },

  fetchKategori: async (organisasiId) => {
    const { data, error } = await supabase
      .from('kategori_transaksi')
      .select('*')
      .eq('organisasi_id', organisasiId)
      .order('nama')
    if (!error) set({ kategori: data || [] })
  },
}))

export default useKasStore
