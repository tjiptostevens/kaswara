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
      .select('*, kategori_transaksi(nama, tipe), anggota_organisasi(nama_lengkap)')
      .eq('organisasi_id', organisasiId)
      .order('tanggal', { ascending: false })

    if (filters.tipe) query = query.eq('tipe', filters.tipe)
    if (filters.kategoriId) query = query.eq('kategori_id', filters.kategoriId)
    if (filters.dari) query = query.gte('tanggal', filters.dari)
    if (filters.sampai) query = query.lte('tanggal', filters.sampai)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ transaksi: data || [], loading: false })
    get().hitungSaldo(data || [])
  },

  hitungSaldo: (transaksi) => {
    const active = transaksi.filter((t) => t.status !== 'cancelled' && t.status !== 'amended')
    const totalPemasukan = active
      .filter((t) => t.tipe === 'pemasukan')
      .reduce((sum, t) => sum + Number(t.jumlah), 0)
    const totalPengeluaran = active
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
      .insert({ ...data, status: 'draft' })
      .select()
      .single()
    if (error) return { error }
    set((state) => ({ transaksi: [result, ...state.transaksi] }))
    return { data: result, error: null }
  },

  updateTransaksiStatus: async (id, status, userId, organisasiId) => {
    const now = new Date().toISOString()
    const updates = { status }
    if (status === 'submitted') {
      updates.submitted_by = userId
      updates.submitted_at = now
    } else if (status === 'cancelled') {
      updates.cancelled_by = userId
      updates.cancelled_at = now
    }
    const { error } = await supabase.from('transaksi').update(updates).eq('id', id)
    if (error) return { error }
    if (organisasiId) await get().fetchTransaksi(organisasiId)
    return { error: null }
  },

  amendTransaksi: async (original, userId, organisasiId) => {
    const now = new Date().toISOString()
    // Mark original as amended
    const { error: markErr } = await supabase
      .from('transaksi')
      .update({ status: 'amended', amended_by: userId, amended_at: now })
      .eq('id', original.id)
    if (markErr) return { error: markErr }

    // Create new draft with amended_from
    const { dibuat_oleh, dibuat_oleh_anggota_id, created_at, id, status,
            submitted_by, submitted_at, cancelled_by, cancelled_at,
            amended_by: _ab, amended_at: _aa, amended_from: _af,
            kategori_transaksi, anggota_organisasi, ...rest } = original
    const { data: result, error } = await supabase
      .from('transaksi')
      .insert({
        ...rest,
        status: 'draft',
        dibuat_oleh: userId,
        dibuat_oleh_anggota_id: dibuat_oleh_anggota_id ?? null,
        amended_from: original.id,
      })
      .select()
      .single()
    if (error) return { error }
    if (organisasiId) await get().fetchTransaksi(organisasiId)
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
