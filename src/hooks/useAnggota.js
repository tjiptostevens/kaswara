import { useEffect } from 'react'
import useAnggotaStore from '../stores/anggotaStore'
import { useAuth } from './useAuth'

export function useAnggota() {
  const { activeWorkspace } = useAuth()
  const anggota = useAnggotaStore((s) => s.anggota)
  const loading = useAnggotaStore((s) => s.loading)
  const fetchAnggota = useAnggotaStore((s) => s.fetchAnggota)
  const addAnggota = useAnggotaStore((s) => s.addAnggota)
  const updateAnggota = useAnggotaStore((s) => s.updateAnggota)
  const deleteAnggota = useAnggotaStore((s) => s.deleteAnggota)

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchAnggota(activeWorkspace.id)
    }
  }, [activeWorkspace?.id])

  return {
    anggota,
    loading,
    addAnggota,
    updateAnggota,
    deleteAnggota,
    refetch: () => fetchAnggota(activeWorkspace?.id),
  }
}
