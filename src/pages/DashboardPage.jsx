import React, { useEffect, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import StatGrid from '../components/dashboard/StatGrid'
import TransaksiRecent from '../components/dashboard/TransaksiRecent'
import CashflowChart from '../components/dashboard/CashflowChart'
import KategoriBreakdown from '../components/dashboard/KategoriBreakdown'
import Skeleton from '../components/ui/Skeleton'
import { useTransaksi } from '../hooks/useTransaksi'
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime'
import { useAuth } from '../hooks/useAuth'
import { formatPeriode, formatRupiah, formatTanggalPendek } from '../lib/formatters'
import { supabase } from '../lib/supabase'
import Badge from '../components/ui/Badge'

export default function DashboardPage() {
  const { activeWorkspace } = useAuth()
  const { transaksi, saldo, totalPemasukan, totalPengeluaran, loading } = useTransaksi()
  const [recentRAB, setRecentRAB] = useState([])
  useSupabaseRealtime()

  const periode = formatPeriode(new Date())

  useEffect(() => {
    const fetchRecentRAB = async () => {
      if (!activeWorkspace?.id) return
      const { data } = await supabase
        .from('rab')
        .select('id, nama_kegiatan, total_anggaran, status, tanggal_kegiatan, rap(id, status, jumlah_realisasi, rap_item_realisasi(jumlah_realisasi))')
        .eq('organisasi_id', activeWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentRAB(data || [])
    }
    fetchRecentRAB()
  }, [activeWorkspace?.id])

  const getRABDisparitas = (rab) => {
    const activeRap = (rab.rap || []).filter((r) => !['cancelled', 'amended'].includes(r.status))
    if (activeRap.length === 0) return { label: 'Belum ada realisasi', tone: 'text-stone', value: 0 }
    const totalRap = activeRap.reduce((sum, rap) => {
      const itemTotal = (rap.rap_item_realisasi || []).reduce((s, i) => s + Number(i.jumlah_realisasi || 0), 0)
      return sum + Number(itemTotal || rap.jumlah_realisasi || 0)
    }, 0)
    const selisih = totalRap - Number(rab.total_anggaran || 0)
    if (selisih === 0) return { label: 'Tepat', tone: 'text-success', value: selisih }
    if (selisih > 0) return { label: 'Lebih', tone: 'text-danger', value: selisih }
    return { label: 'Kurang', tone: 'text-info', value: selisih }
  }

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

        <div className="glass-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-brand-dark tracking-tight">5 RAB Terbaru</h3>
          {recentRAB.length === 0 && (
            <p className="text-xs text-stone">Belum ada data RAB.</p>
          )}
          {recentRAB.map((row) => {
            const disparity = getRABDisparitas(row)
            return (
              <div key={row.id} className="rounded-input border border-border px-3 py-2 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-charcoal">{row.nama_kegiatan}</p>
                  <p className="text-xs text-stone">Kegiatan: {formatTanggalPendek(row.tanggal_kegiatan)}</p>
                  <p className="text-xs font-mono text-charcoal">Anggaran: {formatRupiah(row.total_anggaran)}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge status={row.status} />
                  <p className={`text-xs font-medium ${disparity.tone}`}>
                    {disparity.label}
                    {disparity.label !== 'Belum ada realisasi' ? ` (${formatRupiah(Math.abs(disparity.value))})` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageWrapper>
  )
}
