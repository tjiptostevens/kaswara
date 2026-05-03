import React, { useMemo, useState } from 'react'
import { formatRupiahShort } from '../../lib/formatters'

const CHART_H = 160
const CHART_PAD_LEFT = 56
const CHART_PAD_RIGHT = 12
const CHART_PAD_TOP = 12
const CHART_PAD_BOTTOM = 36

const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2]

/**
 * SVG bar chart showing monthly pemasukan vs pengeluaran
 * with a polyline for cumulative saldo.
 * Supports two modes: '6bulan' (last 6 months) and 'tahunan' (full year).
 *
 * @param {object} props
 * @param {Array} props.transaksi  - raw transaksi array from useTransaksi
 */
export default function CashflowChart({ transaksi = [] }) {
  const [mode, setMode] = useState('6bulan')
  const [tahun, setTahun] = useState(THIS_YEAR)

  const months = useMemo(() => {
    const map = {}
    transaksi.forEach((t) => {
      const key = t.tanggal?.substring(0, 7) // YYYY-MM
      if (!key) return
      if (!map[key]) map[key] = { pemasukan: 0, pengeluaran: 0 }
      if (t.tipe === 'pemasukan') map[key].pemasukan += Number(t.jumlah)
      else map[key].pengeluaran += Number(t.jumlah)
    })

    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))

    if (mode === 'tahunan') {
      // Build months for selected year, capped at current month for current year
      const nowMonth = new Date().getMonth() // 0-based
      const maxMonth = tahun === THIS_YEAR ? nowMonth : 11
      return Array.from({ length: maxMonth + 1 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0')
        const key = `${tahun}-${m}`
        const data = map[key] || { pemasukan: 0, pengeluaran: 0 }
        const label = new Date(tahun, i, 1).toLocaleDateString('id-ID', { month: 'short' })
        return { key, label, ...data }
      })
    }

    // 6-bulan mode: last 6 months with data
    return sorted.slice(-6).map(([key, data]) => {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('id-ID', {
        month: 'short',
      })
      return { key, label, ...data }
    })
  }, [transaksi, mode, tahun])

  // Cumulative saldo per month
  const withSaldo = useMemo(() => {
    let running = 0
    return months.map((m) => {
      running += m.pemasukan - m.pengeluaran
      return { ...m, saldo: running }
    })
  }, [months])

  const hasAnyData = months.some((m) => m.pemasukan > 0 || m.pengeluaran > 0)

  if (!hasAnyData) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#0f3d32]">Cashflow</p>
          <ModeControls mode={mode} setMode={setMode} tahun={tahun} setTahun={setTahun} />
        </div>
        <p className="text-sm text-stone text-center py-8">Belum ada data transaksi</p>
      </div>
    )
  }

  const maxBar = Math.max(...months.flatMap((m) => [m.pemasukan, m.pengeluaran]), 1)
  const maxSaldo = Math.max(Math.abs(Math.min(...withSaldo.map((m) => m.saldo))),
    Math.max(...withSaldo.map((m) => m.saldo)), 1)

  const n = months.length
  const svgW = 500 // intrinsic; will scale via viewBox
  const innerW = svgW - CHART_PAD_LEFT - CHART_PAD_RIGHT
  const innerH = CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM
  const groupW = innerW / n
  const barW = Math.max(8, Math.min(18, groupW * 0.28))

  const barY = (val) => CHART_PAD_TOP + innerH - (val / maxBar) * innerH
  const barH = (val) => (val / maxBar) * innerH

  // Saldo line: map saldo to Y (0 saldo → bottom, positive → up)
  const saldoY = (val) => {
    const mid = CHART_PAD_TOP + innerH / 2
    return mid - (val / (maxSaldo * 2)) * innerH
  }

  const points = withSaldo.map((m, i) => {
    const cx = CHART_PAD_LEFT + groupW * i + groupW / 2
    return `${cx},${saldoY(m.saldo)}`
  })

  // Y-axis labels (0 and max)
  const yLabels = [0, Math.round(maxBar / 2), maxBar]

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#0f3d32]">Cashflow</p>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-4 text-xs text-stone">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1a6b5a] inline-block" />
              Pemasukan
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] inline-block" />
              Pengeluaran
            </span>
            <span className="flex items-center gap-1">
              <span className="w-6 h-0.5 bg-[#e8a020] inline-block" />
              Saldo
            </span>
          </div>
          <ModeControls mode={mode} setMode={setMode} tahun={tahun} setTahun={setTahun} />
        </div>
      </div>

      <svg
        viewBox={`0 0 ${svgW} ${CHART_H}`}
        className="w-full"
        aria-label="Cashflow chart"
      >
        {/* Y-axis labels */}
        {yLabels.map((v, i) => {
          const y = CHART_PAD_TOP + innerH - (v / maxBar) * innerH
          return (
            <text
              key={i}
              x={CHART_PAD_LEFT - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill="#8a8a8a"
            >
              {formatRupiahShort(v)}
            </text>
          )
        })}

        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = CHART_PAD_TOP + innerH - (v / maxBar) * innerH
          return (
            <line
              key={i}
              x1={CHART_PAD_LEFT}
              x2={svgW - CHART_PAD_RIGHT}
              y1={y}
              y2={y}
              stroke="#e5e5e5"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Bars */}
        {months.map((m, i) => {
          const cx = CHART_PAD_LEFT + groupW * i + groupW / 2
          const gap = 2
          return (
            <g key={m.key}>
              {/* Pemasukan bar */}
              <rect
                x={cx - barW - gap / 2}
                y={barY(m.pemasukan)}
                width={barW}
                height={barH(m.pemasukan)}
                fill="#1a6b5a"
                rx={2}
                opacity={0.85}
              />
              {/* Pengeluaran bar */}
              <rect
                x={cx + gap / 2}
                y={barY(m.pengeluaran)}
                width={barW}
                height={barH(m.pengeluaran)}
                fill="#ef4444"
                rx={2}
                opacity={0.75}
              />
              {/* X-axis label */}
              <text
                x={cx}
                y={CHART_PAD_TOP + innerH + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#8a8a8a"
              >
                {m.label}
              </text>
            </g>
          )
        })}

        {/* Saldo polyline */}
        {withSaldo.length > 1 && (
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="#e8a020"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Saldo dots */}
        {withSaldo.map((m, i) => {
          const cx = CHART_PAD_LEFT + groupW * i + groupW / 2
          return (
            <circle
              key={m.key}
              cx={cx}
              cy={saldoY(m.saldo)}
              r={3}
              fill="#e8a020"
            />
          )
        })}
      </svg>
    </div>
  )
}

function ModeControls({ mode, setMode, tahun, setTahun }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-input border border-border overflow-hidden text-xs">
        {['6bulan', 'tahunan'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2.5 py-1 transition-colors ${
              mode === m
                ? 'bg-brand text-white'
                : 'bg-white text-stone hover:text-charcoal'
            }`}
          >
            {m === '6bulan' ? '6 Bulan' : 'Tahunan'}
          </button>
        ))}
      </div>
      {mode === 'tahunan' && (
        <select
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="rounded-input border border-border bg-white px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-brand/40"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}
    </div>
  )
}
