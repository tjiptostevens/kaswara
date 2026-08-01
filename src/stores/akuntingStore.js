import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MODE_AKUNTING } from '../constants/akunting'
import {
  createJurnalFromTransaksi,
  createJurnalUtangPiutang,
  createJurnalPembayaranUtangPiutang,
  voidJurnal,
  fetchSaldoCoa,
  closePeriode,
} from '../lib/accountingService'

const useAkuntingStore = create((set, get) => ({
  mode: MODE_AKUNTING.SIMPLE,
  pengaturan: null,
  akunKeuangan: [],
  saldoAkun: [],
  coa: [],
  utangPiutang: [],
  periodeClosing: [],
  loading: false,
  error: null,

  // ── Preferensi mode (per user) ──
  fetchMode: async (userId, organisasiId) => {
    if (!userId || !organisasiId) return
    const { data } = await supabase
      .from('pengaturan_user')
      .select('*')
      .eq('user_id', userId)
      .eq('organisasi_id', organisasiId)
      .maybeSingle()
    set({ mode: data?.mode_akunting || MODE_AKUNTING.SIMPLE })
  },

  setMode: async (userId, organisasiId, mode) => {
    const { data, error } = await supabase
      .from('pengaturan_user')
      .upsert(
        {
          user_id: userId,
          organisasi_id: organisasiId,
          mode_akunting: mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,organisasi_id' }
      )
      .select()
      .single()
    if (!error) set({ mode: data.mode_akunting })
    return { error }
  },

  // ── Pengaturan organisasi ──
  fetchPengaturan: async (organisasiId) => {
    if (!organisasiId) return
    const { data, error } = await supabase
      .from('pengaturan_akunting')
      .select('*')
      .eq('organisasi_id', organisasiId)
      .maybeSingle()
    if (!error) set({ pengaturan: data })
    return { data, error }
  },

  updatePengaturan: async (organisasiId, updates) => {
    const { data, error } = await supabase
      .from('pengaturan_akunting')
      .upsert(
        {
          organisasi_id: organisasiId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organisasi_id' }
      )
      .select()
      .single()
    if (!error) set({ pengaturan: data })
    return { data, error }
  },

  aktifkanSistem: async (organisasiId, tanggalMulai, saldoAwalList) => {
    const { data, error } = await supabase.rpc('aktifkan_sistem_akunting', {
      p_organisasi_id: organisasiId,
      p_tanggal_mulai: tanggalMulai,
      p_saldo_awal: saldoAwalList,
    })
    if (!error) {
      await get().fetchPengaturan(organisasiId)
      await get().fetchAkunKeuangan(organisasiId)
    }
    return { data, error }
  },

  // ── Tempat uang ──
  fetchAkunKeuangan: async (organisasiId) => {
    if (!organisasiId) return
    set({ loading: true, error: null })
    const [{ data: akun }, { data: saldo }] = await Promise.all([
      supabase
        .from('akun_keuangan')
        .select('*')
        .eq('organisasi_id', organisasiId)
        .order('urutan'),
      supabase
        .from('v_saldo_akun_keuangan')
        .select('*')
        .eq('organisasi_id', organisasiId)
        .order('urutan'),
    ])
    set({
      akunKeuangan: akun || [],
      saldoAkun: saldo || [],
      loading: false,
    })
  },

  addAkunKeuangan: async (payload) => {
    // Pastikan ada COA matching tipe
    let coaId = payload.coa_id
    if (!coaId) {
      const subMap = { cash: 'kas', bank: 'bank', ewallet: 'kas', lainnya: 'kas' }
      const { data: coa } = await supabase
        .from('akun_coa')
        .select('id')
        .eq('organisasi_id', payload.organisasi_id)
        .eq('sub_tipe', subMap[payload.tipe] || 'kas')
        .limit(1)
        .maybeSingle()
      coaId = coa?.id
    }
    const { data, error } = await supabase
      .from('akun_keuangan')
      .insert({ ...payload, coa_id: coaId })
      .select()
      .single()
    if (!error) {
      set((s) => ({ akunKeuangan: [...s.akunKeuangan, data] }))
      await get().fetchAkunKeuangan(payload.organisasi_id)
    }
    return { data, error }
  },

  updateAkunKeuangan: async (id, updates, organisasiId) => {
    const { data, error } = await supabase
      .from('akun_keuangan')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && organisasiId) await get().fetchAkunKeuangan(organisasiId)
    return { data, error }
  },

  deleteAkunKeuangan: async (id, organisasiId) => {
    const { error } = await supabase.from('akun_keuangan').delete().eq('id', id)
    if (!error && organisasiId) await get().fetchAkunKeuangan(organisasiId)
    return { error }
  },

  // ── COA ──
  fetchCoa: async (organisasiId) => {
    const { data, error } = await supabase
      .from('akun_coa')
      .select('*')
      .eq('organisasi_id', organisasiId)
      .order('kode')
    if (!error) set({ coa: data || [] })
    return { data, error }
  },

  // ── Posting jurnal dari transaksi ──
  postTransaksiJurnal: async (transaksi, userId) => {
    if (!transaksi?.akun_keuangan_id && transaksi?.tipe !== 'transfer') {
      return { error: null } // legacy transaksi tanpa akun — skip
    }
    if (transaksi.tipe === 'transfer' && (!transaksi.akun_keuangan_id || !transaksi.akun_tujuan_id)) {
      return { error: { message: 'Transfer membutuhkan akun asal dan tujuan' } }
    }
    const { data: jurnal, error } = await createJurnalFromTransaksi(transaksi, userId)
    if (error) return { error }
    if (jurnal?.id && transaksi.id) {
      await supabase.from('transaksi').update({ jurnal_id: jurnal.id }).eq('id', transaksi.id)
    }
    return { data: jurnal, error: null }
  },

  voidTransaksiJurnal: async (jurnalId) => voidJurnal(jurnalId),

  // ── Hutang & Piutang ──
  fetchUtangPiutang: async (organisasiId) => {
    const { data, error } = await supabase
      .from('utang_piutang')
      .select('*, akun_keuangan(nama, tipe)')
      .eq('organisasi_id', organisasiId)
      .order('tanggal', { ascending: false })
    if (!error) set({ utangPiutang: data || [] })
    return { data, error }
  },

  addUtangPiutang: async (payload, userId, opts = {}) => {
    const { data, error } = await supabase
      .from('utang_piutang')
      .insert({ ...payload, dibuat_oleh: userId })
      .select()
      .single()
    if (error) return { error }

    const { data: jurnal, error: jurnalErr } = await createJurnalUtangPiutang(
      data,
      userId,
      opts
    )
    if (jurnalErr) {
      // rollback soft — keep record but warn
      return { data, error: jurnalErr }
    }
    if (jurnal?.id) {
      await supabase.from('utang_piutang').update({ jurnal_id: jurnal.id }).eq('id', data.id)
    }
    await get().fetchUtangPiutang(payload.organisasi_id)
    await get().fetchAkunKeuangan(payload.organisasi_id)
    return { data, error: null }
  },

  bayarUtangPiutang: async (utangId, pembayaran, userId) => {
    const utang = get().utangPiutang.find((u) => u.id === utangId)
    if (!utang) return { error: { message: 'Data tidak ditemukan' } }

    const sisa = Number(utang.jumlah_awal) - Number(utang.jumlah_terbayar)
    if (Number(pembayaran.jumlah) > sisa + 0.01) {
      return { error: { message: `Jumlah melebihi sisa (${sisa})` } }
    }

    const { data: bayar, error } = await supabase
      .from('utang_piutang_pembayaran')
      .insert({
        utang_piutang_id: utangId,
        ...pembayaran,
        dibuat_oleh: userId,
      })
      .select()
      .single()
    if (error) return { error }

    const { data: jurnal, error: jurnalErr } = await createJurnalPembayaranUtangPiutang(
      utang,
      bayar,
      userId
    )
    if (jurnal?.id) {
      await supabase
        .from('utang_piutang_pembayaran')
        .update({ jurnal_id: jurnal.id })
        .eq('id', bayar.id)
    }

    const terbayarBaru = Number(utang.jumlah_terbayar) + Number(pembayaran.jumlah)
    const status = terbayarBaru >= Number(utang.jumlah_awal) ? 'lunas' : 'berjalan'
    await supabase
      .from('utang_piutang')
      .update({ jumlah_terbayar: terbayarBaru, status })
      .eq('id', utangId)

    await get().fetchUtangPiutang(utang.organisasi_id)
    await get().fetchAkunKeuangan(utang.organisasi_id)
    return { data: bayar, error: jurnalErr }
  },

  // ── Laporan ──
  fetchLaporanCoa: async (organisasiId, range) => fetchSaldoCoa(organisasiId, range),

  // ── Closing ──
  fetchPeriodeClosing: async (organisasiId) => {
    const { data, error } = await supabase
      .from('periode_closing')
      .select('*')
      .eq('organisasi_id', organisasiId)
      .order('periode_sampai', { ascending: false })
    if (!error) set({ periodeClosing: data || [] })
    return { data, error }
  },

  tutupPeriode: async (params) => {
    const result = await closePeriode(params)
    if (!result.error) {
      await get().fetchPeriodeClosing(params.organisasiId)
      await get().fetchAkunKeuangan(params.organisasiId)
    }
    return result
  },

  /** Total uang di semua akun aktif */
  getTotalUang: () => {
    return get()
      .saldoAkun.filter((a) => a.aktif !== false)
      .reduce((s, a) => s + Number(a.saldo || 0), 0)
  },

  getTotalUtang: () => {
    return get()
      .utangPiutang.filter((u) => u.tipe === 'utang' && u.status === 'berjalan')
      .reduce((s, u) => s + (Number(u.jumlah_awal) - Number(u.jumlah_terbayar)), 0)
  },

  getTotalPiutang: () => {
    return get()
      .utangPiutang.filter((u) => u.tipe === 'piutang' && u.status === 'berjalan')
      .reduce((s, u) => s + (Number(u.jumlah_awal) - Number(u.jumlah_terbayar)), 0)
  },
}))

export default useAkuntingStore
