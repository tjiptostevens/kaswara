import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useKasStore from '../stores/kasStore'
import useNotifikasiStore from '../stores/notifikasiStore'
import { useAuth } from './useAuth'

const RAB_STATUS_PESAN = {
  diajukan:  { pesan: 'RAB baru diajukan dan menunggu persetujuan.', tipe: 'info' },
  disetujui: { pesan: 'RAB disetujui! Silakan buat RAP.', tipe: 'success' },
  ditolak:   { pesan: 'RAB ditolak. Cek catatan dari ketua.', tipe: 'warning' },
  cancelled: { pesan: 'RAB dibatalkan.', tipe: 'warning' },
  selesai:   { pesan: 'RAB selesai — semua RAP telah direalisasikan.', tipe: 'success' },
}

/**
 * Subscribe to Supabase Realtime changes on transaksi and rab tables.
 * Refreshes the kas store on transaksi changes and fires in-app notifications
 * on RAB status changes.
 */
export function useSupabaseRealtime() {
  const { activeWorkspace, isKetua, isBendahara } = useAuth()
  const fetchTransaksi = useKasStore((s) => s.fetchTransaksi)
  const tambahNotif = useNotifikasiStore((s) => s.tambahNotif)

  useEffect(() => {
    if (!activeWorkspace?.id) return

    // --- Transaksi channel ---
    const transaksiChannel = supabase
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

    // --- RAB channel ---
    const rabChannel = supabase
      .channel(`rab:${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rab',
          filter: `organisasi_id=eq.${activeWorkspace.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.status
          const oldStatus = payload.old?.status
          if (!newStatus || newStatus === oldStatus) return

          // Ketua gets notified when a RAB is submitted
          // Bendahara gets notified on approval/rejection/completion
          const shouldNotify =
            (newStatus === 'diajukan' && isKetua) ||
            (['disetujui', 'ditolak', 'cancelled', 'selesai'].includes(newStatus) && isBendahara)

          if (shouldNotify) {
            const { pesan, tipe } = RAB_STATUS_PESAN[newStatus] || {}
            if (pesan) {
              const namaKegiatan = payload.new?.nama_kegiatan
              tambahNotif(namaKegiatan ? `${namaKegiatan}: ${pesan}` : pesan, tipe)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(transaksiChannel)
      supabase.removeChannel(rabChannel)
    }
  }, [activeWorkspace?.id, isKetua, isBendahara])
}
