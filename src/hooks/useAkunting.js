import { useEffect } from 'react'
import useAkuntingStore from '../stores/akuntingStore'
import { useAuth } from './useAuth'
import { MODE_AKUNTING } from '../constants/akunting'

export function useAkunting() {
  const { user, activeWorkspace } = useAuth()
  const store = useAkuntingStore()

  const orgId = activeWorkspace?.id
  const userId = user?.id

  useEffect(() => {
    if (!orgId || !userId) return
    store.fetchMode(userId, orgId)
    store.fetchPengaturan(orgId)
    store.fetchAkunKeuangan(orgId)
    store.fetchUtangPiutang(orgId)
  }, [orgId, userId])

  const isSimple = store.mode === MODE_AKUNTING.SIMPLE
  const isAdvance = store.mode === MODE_AKUNTING.ADVANCE
  const sistemAktif = !!store.pengaturan?.sistem_aktif
  const mataUang = store.pengaturan?.mata_uang || 'IDR'
  const simbolMataUang = store.pengaturan?.simbol_mata_uang || 'Rp'

  return {
    ...store,
    isSimple,
    isAdvance,
    sistemAktif,
    mataUang,
    simbolMataUang,
    totalUang: store.getTotalUang(),
    totalUtang: store.getTotalUtang(),
    totalPiutang: store.getTotalPiutang(),
    orgId,
    userId,
  }
}
