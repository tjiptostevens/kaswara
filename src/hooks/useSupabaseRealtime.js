import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useKasStore from '../stores/kasStore'
import { useAuth } from './useAuth'

/**
 * Subscribe to Supabase Realtime changes on the transaksi table
 * and refresh the store whenever an INSERT/UPDATE/DELETE happens.
 */
export function useSupabaseRealtime() {
  const { activeWorkspace } = useAuth()
  const fetchTransaksi = useKasStore((s) => s.fetchTransaksi)

  useEffect(() => {
    if (!activeWorkspace?.id) return

    const channel = supabase
      .channel(`transaksi:${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaksi',
          filter: `organisasi_id=eq.${activeWorkspace.id}`,
        },
        () => {
          fetchTransaksi(activeWorkspace.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeWorkspace?.id])
}
