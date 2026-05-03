import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatRupiah, formatRupiahShort, formatTanggalPendek } from '../lib/formatters'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Loader2 } from 'lucide-react'

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, amount, color }) {
  return (
    <div className="glass-card p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-1">
      <div className={`w-9 h-9 rounded-input flex items-center justify-center flex-shrink-0 ${color.bg}`}>
        <Icon size={18} className={color.text} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-xs text-stone">{label}</p>
        <p className={`text-lg font-bold font-mono mt-0.5 ${color.text}`}>
          {formatRupiahShort(amount)}
        </p>
      </div>
    </div>
  )
}

// ─── Mini cashflow chart (SVG) ────────────────────────────────────────────────

function MiniChart({ transaksi }) {
  const months = useMemo(() => {
    const map = {}
    transaksi.forEach((t) => {
      const key = t.tanggal?.substring(0, 7)
      if (!key) return
      if (!map[key]) map[key] = { pemasukan: 0, pengeluaran: 0 }
      if (t.tipe === 'pemasukan') map[key].pemasukan += Number(t.jumlah)
      else map[key].pengeluaran += Number(t.jumlah)
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => {
        const [year, month] = key.split('-')
        const label = new Date(Number(year), Number(month) - 1, 1)
          .toLocaleDateString('id-ID', { month: 'short' })
        return { key, label, ...data }
      })
  }, [transaksi])

  if (months.length === 0) return null

  const maxVal = Math.max(...months.flatMap((m) => [m.pemasukan, m.pengeluaran]), 1)
  const W = 360
  const H = 100
  const PAD_L = 4
  const PAD_B = 20
  const chartH = H - PAD_B
  const groupW = (W - PAD_L) / months.length
  const barW = (groupW * 0.35)
  const barY = (v) => PAD_L + chartH * (1 - v / maxVal)
  const barH = (v) => chartH * (v / maxVal)

  return (
    <div className="glass-card p-5">
      <p className="text-xs font-semibold text-[#0f3d32] mb-3">Cashflow 6 Bulan Terakhir</p>
      <div className="flex items-center gap-4 text-xs text-stone mb-2">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#1a6b5a] inline-block" />Pemasukan
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] inline-block" />Pengeluaran
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
        {months.map((m, i) => {
          const cx = PAD_L + groupW * i
          return (
            <g key={m.key}>
              <rect
                x={cx + groupW * 0.1}
                y={barY(m.pemasukan)}
                width={barW}
                height={barH(m.pemasukan)}
                fill="#1a6b5a"
                rx={2}
              />
              <rect
                x={cx + groupW * 0.1 + barW + 2}
                y={barY(m.pengeluaran)}
                width={barW}
                height={barH(m.pengeluaran)}
                fill="#ef4444"
                rx={2}
              />
              <text
                x={cx + groupW / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize={9}
                fill="#8a8a84"
              >
                {m.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Main PublikPage ──────────────────────────────────────────────────────────

export default function PublikPage() {
  const { handle } = useParams()
  const [org, setOrg] = useState(null)
  const [transaksi, setTransaksi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!handle) return
    loadData()
  }, [handle])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    const normalizedHandle = (handle || '').trim()
    const slugHandle = normalizedHandle.toLowerCase()
    const isUuidHandle = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedHandle)

    let orgData = null
    let orgErr = null

    // Query by UUID hanya jika handle valid UUID, untuk menghindari error cast uuid.
    if (isUuidHandle) {
      const byIdResult = await supabase
        .from('organisasi')
        .select('id, nama, alamat, tipe')
        .eq('id', normalizedHandle)
        .eq('publik_aktif', true)
        .maybeSingle()

      orgData = byIdResult.data
      orgErr = byIdResult.error
    }

    if (!orgData && !orgErr) {
      const bySlugResult = await supabase
        .from('organisasi')
        .select('id, nama, alamat, tipe')
        .eq('publik_slug', slugHandle)
        .eq('publik_aktif', true)
        .maybeSingle()

      orgData = bySlugResult.data
      orgErr = bySlugResult.error
    }

    if (orgErr || !orgData) {
      setError('Halaman publik tidak ditemukan atau belum diaktifkan oleh pengurus organisasi.')
      setLoading(false)
      return
    }

    setOrg(orgData)

    // Fetch transaksi (only submitted — exclude draft/cancelled/amended)
    const { data: txData, error: txErr } = await supabase
      .from('transaksi')
      .select('id, tanggal, tipe, jumlah, keterangan, kategori_transaksi(nama)')
      .eq('organisasi_id', orgData.id)
      .eq('status', 'submitted')
      .order('tanggal', { ascending: false })
      .limit(100)

    if (txErr) {
      setError('Gagal memuat data transaksi.')
      setLoading(false)
      return
    }

    setTransaksi(txData || [])
    setLoading(false)
  }

  const { saldo, totalPemasukan, totalPengeluaran } = useMemo(() => {
    const totalPemasukan = transaksi
      .filter((t) => t.tipe === 'pemasukan')
      .reduce((s, t) => s + Number(t.jumlah), 0)
    const totalPengeluaran = transaksi
      .filter((t) => t.tipe === 'pengeluaran')
      .reduce((s, t) => s + Number(t.jumlah), 0)
    return { saldo: totalPemasukan - totalPengeluaran, totalPemasukan, totalPengeluaran }
  }, [transaksi])

  return (
    <div className="min-h-screen bg-warm relative overflow-hidden">
      {/* Decorative background ornaments */}
      <div className="bg-ornament opacity-60">
        <div className="bg-blob w-[60vw] h-[60vw] bg-brand/15 -top-[20vw] -left-[10vw]" />
        <div className="bg-blob w-[50vw] h-[50vw] bg-accent/15 bottom-[10vw] -right-[10vw]" />
        <div className="bg-blob w-[40vw] h-[40vw] bg-success/10 top-1/2 left-1/3 -translate-y-1/2" />
      </div>

      {/* Navbar publik */}
      <header className="glass-sidebar px-4 md:px-8 py-4 flex items-center justify-between border-b border-white/10 z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a6b5a] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 28 28" fill="none" width="16" height="16">
              <rect x="4" y="4" width="8" height="8" rx="2" fill="#e8a020" />
              <rect x="16" y="4" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
              <rect x="4" y="16" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
              <rect x="16" y="16" width="8" height="8" rx="2" fill="rgba(255,255,255,0.25)" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">
              kas<span className="text-[#e8a020]">wara</span>
            </p>
            {org && <p className="text-white/50 text-[10px] mt-0.5">{org.nama}</p>}
          </div>
        </div>
        <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
          Transparansi Publik
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 relative z-10 animate-fade-in">
        {loading && (
          <div className="flex items-center justify-center py-20 text-stone gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Memuat data…</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={40} className="text-danger" strokeWidth={1.5} />
            <p className="text-sm font-medium text-charcoal">{error}</p>
            <p className="text-xs text-stone max-w-xs">
              Jika Anda pengurus organisasi, aktifkan halaman publik melalui menu Pengaturan.
            </p>
          </div>
        )}

        {!loading && !error && org && (
          <>
            {/* Org info */}
            <div>
              <h1 className="text-xl font-bold text-[#0f3d32]">{org.nama}</h1>
              {org.alamat && <p className="text-sm text-stone mt-0.5">{org.alamat}</p>}
              <p className="text-xs text-stone mt-1">
                Data keuangan ini dipublikasikan secara terbuka oleh pengurus organisasi.
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                icon={Wallet}
                label="Saldo Kas"
                amount={saldo}
                color={{ bg: 'bg-brand-light', text: 'text-[#0f3d32]' }}
              />
              <StatCard
                icon={TrendingUp}
                label="Total Pemasukan"
                amount={totalPemasukan}
                color={{ bg: 'bg-[#E1F5EE]', text: 'text-success' }}
              />
              <StatCard
                icon={TrendingDown}
                label="Total Pengeluaran"
                amount={totalPengeluaran}
                color={{ bg: 'bg-[#FCEBEB]', text: 'text-danger' }}
              />
            </div>

            {/* Chart */}
            <MiniChart transaksi={transaksi} />

            {/* Transaksi table */}
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-[#0f3d32]">Riwayat Transaksi</p>
                <p className="text-xs text-stone mt-0.5">100 transaksi terbaru</p>
              </div>
              {transaksi.length === 0 ? (
                <p className="text-sm text-stone text-center py-10">Belum ada transaksi</p>
              ) : (
                <div className="divide-y divide-border">
                  {transaksi.map((t) => {
                    const isMasuk = t.tipe === 'pemasukan'
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isMasuk ? 'bg-[#E1F5EE]' : 'bg-[#FCEBEB]'
                            }`}
                        >
                          {isMasuk
                            ? <TrendingUp size={13} className="text-success" />
                            : <TrendingDown size={13} className="text-danger" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-charcoal truncate">
                            {t.keterangan || t.kategori_transaksi?.nama || '—'}
                          </p>
                          <p className="text-xs text-stone">
                            {t.tanggal ? formatTanggalPendek(t.tanggal) : '—'}
                            {t.kategori_transaksi?.nama && (
                              <span className="ml-2 text-stone/70">· {t.kategori_transaksi.nama}</span>
                            )}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-mono font-semibold flex-shrink-0 ${isMasuk ? 'text-success' : 'text-danger'
                            }`}
                        >
                          {isMasuk ? '+' : '-'}{formatRupiah(t.jumlah)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-stone pb-4">
              Ditenagai oleh{' '}
              <a
                href="/"
                className="text-brand hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kaswara
              </a>{' '}
              — Kas Warga Negara
            </p>
          </>
        )}
      </main>
    </div>
  )
}
