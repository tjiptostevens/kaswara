import { useEffect } from 'react'
import useKasStore from '../stores/kasStore'
import { useAuth } from './useAuth'

export function useTransaksi(filters = {}) {
  const { organisasi } = useAuth()
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

  useEffect(() => {
    if (organisasi?.id) {
      fetchTransaksi(organisasi.id, filters)
      fetchKategori(organisasi.id)
    }
  }, [organisasi?.id])

  return {
    transaksi,
    saldo,
    totalPemasukan,
    totalPengeluaran,
    kategori,
    loading,
    addTransaksi,
    deleteTransaksi,
    refetch: () => fetchTransaksi(organisasi?.id, filters),
  }
}
