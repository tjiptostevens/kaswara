import React from 'react'
import { formatRupiah, formatTanggalPendek } from '../../lib/formatters'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import EmptyState from '../ui/EmptyState'

/**
 * @param {object} props
 * @param {Array} props.transaksi
 */
export default function TransaksiRecent({ transaksi = [] }) {
  const recent = transaksi.slice(0, 5)

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-[#0f3d32]">Transaksi Terbaru</h3>
      </div>
      {recent.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="Belum ada transaksi"
            description="Belum ada transaksi bulan ini"
          />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {recent.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.tipe === 'pemasukan' ? 'bg-[#E1F5EE]' : 'bg-[#FCEBEB]'
                  }`}
              >
                {t.tipe === 'pemasukan' ? (
                  <ArrowUpRight size={16} className="text-success" />
                ) : (
                  <ArrowDownRight size={16} className="text-danger" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-charcoal truncate">
                  {t.keterangan || t.kategori_transaksi?.nama || '—'}
                </p>
                <p className="text-xs text-stone">{formatTanggalPendek(t.tanggal)}</p>
              </div>
              <p
                className={`text-sm font-mono font-medium flex-shrink-0 ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'
                  }`}
              >
                {t.tipe === 'pemasukan' ? '+' : '-'}
                {formatRupiah(t.jumlah)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
