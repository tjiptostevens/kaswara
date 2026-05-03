import React, { useMemo, useState } from 'react'
import { formatRupiah } from '../../lib/formatters'

const TIPE_OPTIONS = [
  { value: 'pemasukan', label: 'Pemasukan', color: '#1a6b5a', bg: '#E1F5EE', text: 'text-success' },
  { value: 'pengeluaran', label: 'Pengeluaran', color: '#ef4444', bg: '#FCEBEB', text: 'text-danger' },
]

/**
 * Shows transaction total grouped by category, with a horizontal progress bar.
 *
 * @param {object} props
 * @param {Array} props.transaksi  - raw transaksi array from useTransaksi
 */
export default function KategoriBreakdown({ transaksi = [] }) {
  const [activeTipe, setActiveTipe] = useState('pengeluaran')
  const cfg = TIPE_OPTIONS.find((o) => o.value === activeTipe)

  const breakdown = useMemo(() => {
    const map = {}
    transaksi
      .filter((t) => t.tipe === activeTipe)
      .forEach((t) => {
        const nama = t.kategori_transaksi?.nama || 'Lain-lain'
        map[nama] = (map[nama] || 0) + Number(t.jumlah)
      })
    const entries = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([nama, total]) => ({ nama, total }))
    const grandTotal = entries.reduce((s, e) => s + e.total, 0)
    return { entries, grandTotal }
  }, [transaksi, activeTipe])

  return (
    <div className="bg-white border border-border rounded-card p-4">
      {/* Header + toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#0f3d32]">Breakdown per Kategori</p>
        <div className="flex rounded-input border border-border overflow-hidden text-xs">
          {TIPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveTipe(opt.value)}
              className={`px-3 py-1.5 transition-colors ${
                activeTipe === opt.value
                  ? 'bg-[#0f3d32] text-white font-medium'
                  : 'text-stone hover:bg-warm'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {breakdown.entries.length === 0 ? (
        <p className="text-sm text-stone text-center py-6">
          Belum ada data {cfg.label.toLowerCase()}
        </p>
      ) : (
        <div className="space-y-3">
          {breakdown.entries.map(({ nama, total }) => {
            const pct = breakdown.grandTotal > 0
              ? Math.round((total / breakdown.grandTotal) * 100)
              : 0
            return (
              <div key={nama}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-charcoal font-medium truncate max-w-[60%]">{nama}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-stone">{pct}%</span>
                    <span className={`font-mono font-semibold ${cfg.text}`}>
                      {formatRupiah(total)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-warm rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                  />
                </div>
              </div>
            )
          })}

          {/* Total row */}
          <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
            <span className="text-stone font-medium">Total {cfg.label}</span>
            <span className={`font-mono font-bold text-sm ${cfg.text}`}>
              {formatRupiah(breakdown.grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
