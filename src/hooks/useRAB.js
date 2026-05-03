import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useRAB() {
  const { activeWorkspace, user } = useAuth()
  const [rab, setRab] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchRAB = async () => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('rab')
      .select('*, rab_item(*)')
      .eq('organisasi_id', activeWorkspace.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) { setError(error.message); return }
    setRab(data || [])
  }

  const addRAB = async (data) => {
    const { items, ...rabData } = data
    const total_anggaran = (items || []).reduce(
      (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0),
      0
    )
    const { data: result, error } = await supabase
      .from('rab')
      .insert({ ...rabData, organisasi_id: activeWorkspace.id, status: 'draft', diajukan_oleh: user?.id, total_anggaran })
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
    const updates = { status }
    if (catatanKetua) updates.catatan_ketua = catatanKetua
    const { error } = await supabase.from('rab').update(updates).eq('id', id)
    if (error) return { error }
    await fetchRAB()
    return { error: null }
  }

  useEffect(() => { fetchRAB() }, [activeWorkspace?.id])

  return { rab, loading, error, addRAB, updateStatus, refetch: fetchRAB }
}
