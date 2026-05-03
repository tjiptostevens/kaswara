import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBrowserNotification } from '../../hooks/useBrowserNotification'
import { supabase } from '../../lib/supabase'
import { ROUTES } from '../../constants/routes'

export default function GlobalNotificationListener() {
  const { user, canApproveRAB, activeWorkspace } = useAuth()
  const { permission, requestPermission, sendNotification } = useBrowserNotification()
  const navigate = useNavigate()

  // Minta izin notifikasi saat komponen dimuat pertama kali
  useEffect(() => {
    if (permission === 'default') {
      requestPermission()
    }
  }, [permission, requestPermission])

  useEffect(() => {
    if (!user || !activeWorkspace || permission !== 'granted') return

    // Mendengarkan perubahan pada tabel RAB khusus untuk organisasi aktif
    const channel = supabase
      .channel('rab_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rab',
          filter: `organisasi_id=eq.${activeWorkspace.id}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          // 1. RAB Baru (INSERT) -> Notifikasi ke anggota yang memiliki permission 'can approve'
          if (eventType === 'INSERT') {
            // Jangan kirim notifikasi ke diri sendiri
            if (newRecord.user_id !== user.id && canApproveRAB) {
              sendNotification('Pengajuan RAB Baru', {
                body: `Terdapat pengajuan RAB baru: ${newRecord.nama_kegiatan}. Silakan tinjau.`,
                onClick: () => navigate(ROUTES.RAB)
              })
            }
          }

          // 2. RAB Diperbarui (UPDATE) -> Notifikasi ke pembuat RAB jika disetujui/ditolak
          if (eventType === 'UPDATE') {
            // Jika yang di-update adalah RAB milik user ini
            if (newRecord.user_id === user.id) {
              // Cek jika status berubah menjadi disetujui atau ditolak
              const statusChanged = newRecord.status !== oldRecord.status
              if (statusChanged && (newRecord.status === 'disetujui' || newRecord.status === 'ditolak')) {
                const isApproved = newRecord.status === 'disetujui'
                sendNotification(`RAB ${isApproved ? 'Disetujui' : 'Ditolak'}`, {
                  body: `Pengajuan RAB Anda "${newRecord.nama_kegiatan}" telah ${newRecord.status}.`,
                  icon: isApproved ? '/success-icon.png' : '/error-icon.png', // Fallback to default if not exists
                  onClick: () => navigate(ROUTES.RAB)
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, activeWorkspace, permission, canApproveRAB, sendNotification, navigate])

  return null // Komponen ini tidak me-render UI apapun
}
