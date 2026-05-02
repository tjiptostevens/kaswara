import React from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import StatGrid from '../components/dashboard/StatGrid'
import TransaksiRecent from '../components/dashboard/TransaksiRecent'
import { useTransaksi } from '../hooks/useTransaksi'
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime'
import { useAuth } from '../hooks/useAuth'
import { formatPeriode } from '../lib/formatters'

export default function DashboardPage() {
  const { organisasi } = useAuth()
  const { transaksi, saldo, totalPemasukan, totalPengeluaran, loading } = useTransaksi()
  useSupabaseRealtime()

  const periode = formatPeriode(new Date())

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-[#0f3d32]">
            Selamat datang di Kaswara 👋
          </h2>
          {organisasi && (
            <p className="text-sm text-stone mt-1">{organisasi.nama}</p>
          )}
        </div>

        {/* Stats */}
        <StatGrid
          saldo={saldo}
          totalPemasukan={totalPemasukan}
          totalPengeluaran={totalPengeluaran}
          periode={periode}
        />

        {/* Recent Transactions */}
        <div>
          <h3 className="text-sm font-semibold text-[#0f3d32] mb-3">5 Transaksi Terakhir</h3>
          <TransaksiRecent transaksi={transaksi} />
        </div>
      </div>
    </PageWrapper>
  )
}
