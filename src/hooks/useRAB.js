import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useRAB() {
  const { activeWorkspace, user, profile } = useAuth()
  const [rab, setRab] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRAB = async () => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('rab')
      .select('*, kategori_transaksi(id, nama, tipe), rab_item(*), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
      .eq('organisasi_id', activeWorkspace.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) { setError(error.message); return }
    setRab(data || [])
  }

  const updateRAB = async (id, data) => {
    const { items, ...rabData } = data
    const total_anggaran = (items || []).reduce(
      (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0),
      0
    )
    const { error } = await supabase
      .from('rab')
      .update({ ...rabData, total_anggaran })
      .eq('id', id)
    if (error) return { error }

    // Replace items: delete old ones, insert updated ones
    await supabase.from('rab_item').delete().eq('rab_id', id)
    if (items?.length) {
      const itemsWithRabId = items.map((item) => ({
        ...item,
        rab_id: id,
        subtotal: Number(item.volume) * Number(item.harga_satuan),
      }))
      await supabase.from('rab_item').insert(itemsWithRabId)
    }
    await fetchRAB()
    return { error: null }
  }

  const addRAB = async (data) => {
    const { items, ...rabData } = data
    const total_anggaran = (items || []).reduce(
      (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0),
      0
    )
    const { data: result, error } = await supabase
      .from('rab')
      .insert({
        ...rabData,
        organisasi_id: activeWorkspace.id,
        status: 'draft',
        diajukan_oleh: user?.id,
        dibuat_oleh_anggota_id: profile?.id ?? null,
        total_anggaran,
      })
      .select()
      .single()
    if (error) return { error }

    if (items?.length) {
      const itemsWithRabId = items.map((item) => ({
        ...item,
        rab_id: result.id,
        subtotal: item.volume * item.harga_satuan,
      }))
      await supabase.from('rab_item').insert(itemsWithRabId)
    }
    await fetchRAB()
    return { data: result, error: null }
  }

  const updateStatus = async (id, status, catatanKetua = null) => {
    const now = new Date().toISOString()
    const updates = { status }
    if (catatanKetua) updates.catatan_ketua = catatanKetua
    if (status === 'diajukan') updates.diajukan_at = now
    if (status === 'disetujui') {
      updates.disetujui_at = now
      updates.disetujui_oleh = user?.id
    }
    const { error } = await supabase.from('rab').update(updates).eq('id', id)
    if (error) return { error }
    await fetchRAB()
    return { error: null }
  }

  const cancelRAB = async (id) => {
    const { error } = await supabase.rpc('cancel_rab_cascade', { p_rab_id: id })
    if (error) return { error }
    await fetchRAB()
    return { error: null }
  }

  const amendRAB = async (original) => {
    const now = new Date().toISOString()
    // Mark original as amended
    const { error: markErr } = await supabase
      .from('rab')
      .update({ status: 'amended', amended_by: user?.id, amended_at: now })
      .eq('id', original.id)
    if (markErr) return { error: markErr }

    // Create new draft RAB
    const { data: newRAB, error: insertErr } = await supabase
      .from('rab')
      .insert({
        organisasi_id: activeWorkspace.id,
        nama_kegiatan: original.nama_kegiatan,
        deskripsi: original.deskripsi,
        total_anggaran: original.total_anggaran,
        tanggal_kegiatan: original.tanggal_kegiatan,
        tanggal_pengajuan: new Date().toISOString().split('T')[0],
        status: 'draft',
        diajukan_oleh: user?.id,
        dibuat_oleh_anggota_id: profile?.id ?? null,
        amended_from: original.id,
      })
      .select()
      .single()
    if (insertErr) return { error: insertErr }

    // Copy items
    if (original.rab_item?.length) {
      const newItems = original.rab_item.map(({ id: _id, rab_id: _rid, ...item }) => ({
        ...item,
        rab_id: newRAB.id,
      }))
      await supabase.from('rab_item').insert(newItems)
    }

    await fetchRAB()
    return { data: newRAB, error: null }
  }

  useEffect(() => { fetchRAB() }, [activeWorkspace?.id])

  return { rab, loading, error, addRAB, updateRAB, updateStatus, cancelRAB, amendRAB, refetch: fetchRAB }
}
