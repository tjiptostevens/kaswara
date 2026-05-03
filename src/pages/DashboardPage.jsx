import React from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import StatGrid from '../components/dashboard/StatGrid'
import TransaksiRecent from '../components/dashboard/TransaksiRecent'
import CashflowChart from '../components/dashboard/CashflowChart'
import KategoriBreakdown from '../components/dashboard/KategoriBreakdown'
import Skeleton from '../components/ui/Skeleton'
import { useTransaksi } from '../hooks/useTransaksi'
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime'
import { useAuth } from '../hooks/useAuth'
import { formatPeriode } from '../lib/formatters'

export default function DashboardPage() {
  const { activeWorkspace } = useAuth()
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
          {activeWorkspace && (
            <p className="text-sm text-stone mt-1">{activeWorkspace.nama}</p>
          )}
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5"><Skeleton lines={3} /></div>
            <div className="glass-card p-5"><Skeleton lines={3} /></div>
            <div className="glass-card p-5"><Skeleton lines={3} /></div>
          </div>
        ) : (
          <StatGrid
            saldo={saldo}
            totalPemasukan={totalPemasukan}
            totalPengeluaran={totalPengeluaran}
            periode={periode}
          />
        )}

        {/* Cashflow chart */}
        {loading ? (
          <div className="glass-card p-5">
            <Skeleton lines={6} />
          </div>
        ) : (
          <CashflowChart transaksi={transaksi} />
        )}

        {/* Category breakdown + Recent transactions side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="glass-card p-5"><Skeleton lines={5} /></div>
          ) : (
            <KategoriBreakdown transaksi={transaksi} />
          )}
          <div>
            <h3 className="text-sm font-bold text-brand-dark mb-3 tracking-tight">5 Transaksi Terakhir</h3>
            {loading ? (
              <div className="glass-card p-5"><Skeleton lines={5} /></div>
            ) : (
              <TransaksiRecent transaksi={transaksi} />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
