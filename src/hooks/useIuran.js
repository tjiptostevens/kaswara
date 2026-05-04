import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { formatPeriode } from '../lib/formatters'

export function useIuran() {
  const { activeWorkspace, user } = useAuth()
  const [iuran, setIuran] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchIuran = async () => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('iuran_rutin')
      .select('*, anggota_organisasi(nama_lengkap, nomor_anggota), kategori_iuran(nama, nominal_default, tipe, frekuensi)')
      .eq('organisasi_id', activeWorkspace.id)
      .order('periode', { ascending: false })
    setLoading(false)
    if (!error) setIuran(data || [])
  }

  const addIuran = async (data) => {
    const { kategori_iuran_id, ...rest } = data
    const { data: result, error } = await supabase
      .from('iuran_rutin')
      .insert({
        ...rest,
        kategori_iuran_id: kategori_iuran_id || null,
        organisasi_id: activeWorkspace.id,
        status: 'draft',
      })
      .select()
      .single()
    if (error) return { error }
    await fetchIuran()
    return { data: result, error: null }
  }

  const updateIuran = async (id, data) => {
    const { kategori_iuran_id, ...rest } = data
    const { error } = await supabase
      .from('iuran_rutin')
      .update({ ...rest, kategori_iuran_id: kategori_iuran_id || null })
      .eq('id', id)
    if (error) return { error }
    await fetchIuran()
    return { error: null }
  }

  const ajukanIuran = async (iuranRow) => {
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    const namaAnggota = iuranRow.anggota_organisasi?.nama_lengkap || 'Anggota'
    const keteranganTx = `Iuran ${formatPeriode(iuranRow.periode)} — ${namaAnggota}`

    // 1. Create transaksi pemasukan
    const { data: tx, error: txErr } = await supabase
      .from('transaksi')
      .insert({
        organisasi_id: activeWorkspace.id,
        tipe: 'pemasukan',
        jumlah: iuranRow.jumlah,
        keterangan: keteranganTx,
        tanggal: today,
        dibuat_oleh: user?.id,
        status: 'submitted',
      })
      .select()
      .single()
    if (txErr) return { error: txErr }

    // 2. Update iuran status to diajukan, store transaksi_id
    const { error } = await supabase
      .from('iuran_rutin')
      .update({
        status: 'diajukan',
        diajukan_by: user?.id,
        diajukan_at: now,
        transaksi_id: tx.id,
      })
      .eq('id', iuranRow.id)
    if (error) return { error }

    await fetchIuran()
    return { error: null }
  }

  const batalkanIuran = async (id, transaksiId) => {
    const now = new Date().toISOString()

    // Delete linked transaksi: must first set to 'cancelled' to satisfy RLS delete policy
    if (transaksiId) {
      await supabase.from('transaksi').update({ status: 'cancelled' }).eq('id', transaksiId)
      await supabase.from('transaksi').delete().eq('id', transaksiId)
    }

    const { error } = await supabase
      .from('iuran_rutin')
      .update({
        status: 'cancelled',
        cancelled_by: user?.id,
        cancelled_at: now,
        transaksi_id: null,
      })
      .eq('id', id)
    if (error) return { error }

    await fetchIuran()
    return { error: null }
  }

  const amendIuran = async (original) => {
    const now = new Date().toISOString()

    // 1. Mark original as amended
    const { error: markErr } = await supabase
      .from('iuran_rutin')
      .update({ status: 'amended', amended_by: user?.id, amended_at: now })
      .eq('id', original.id)
    if (markErr) return { error: markErr }

    // 2. Create new draft iuran with amended_from reference
    const { data: newIuran, error: insertErr } = await supabase
      .from('iuran_rutin')
      .insert({
        organisasi_id: activeWorkspace.id,
        anggota_id: original.anggota_id,
        periode: original.periode,
        jumlah: original.jumlah,
        kategori_iuran_id: original.kategori_iuran_id ?? null,
        keterangan: original.keterangan ?? null,
        status: 'draft',
        amended_from: original.id,
      })
      .select()
      .single()
    if (insertErr) return { error: insertErr }

    await fetchIuran()
    return { data: newIuran, error: null }
  }

  useEffect(() => { fetchIuran() }, [activeWorkspace?.id])

  return {
    iuran,
    loading,
    fetchIuran,
    addIuran,
    updateIuran,
    ajukanIuran,
    batalkanIuran,
    amendIuran,
  }
}
