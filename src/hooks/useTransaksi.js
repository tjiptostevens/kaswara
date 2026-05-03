import { useEffect } from 'react'
import useKasStore from '../stores/kasStore'
import { useAuth } from './useAuth'

export function useTransaksi(filters = {}) {
  const { activeWorkspace } = useAuth()
  const transaksi = useKasStore((s) => s.transaksi)
  const saldo = useKasStore((s) => s.saldo)
  const totalPemasukan = useKasStore((s) => s.totalPemasukan)
  const totalPengeluaran = useKasStore((s) => s.totalPengeluaran)
  const kategori = useKasStore((s) => s.kategori)
  const loading = useKasStore((s) => s.loading)
  const fetchTransaksi = useKasStore((s) => s.fetchTransaksi)
  const fetchKategori = useKasStore((s) => s.fetchKategori)
  const addTransaksi = useKasStore((s) => s.addTransaksi)
  const deleteTransaksi = useKasStore((s) => s.deleteTransaksi)
  const updateTransaksiStatus = useKasStore((s) => s.updateTransaksiStatus)
  const amendTransaksi = useKasStore((s) => s.amendTransaksi)

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchTransaksi(activeWorkspace.id, filters)
      fetchKategori(activeWorkspace.id)
    }
  }, [activeWorkspace?.id])

  return {
    transaksi,
    saldo,
    totalPemasukan,
    totalPengeluaran,
    kategori,
    loading,
    addTransaksi,
    deleteTransaksi,
    updateTransaksiStatus,
    amendTransaksi,
    refetch: () => fetchTransaksi(activeWorkspace?.id, filters),
  }
}
