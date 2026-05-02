import React from 'react'
import { formatRupiahShort } from '../../lib/formatters'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const configs = {
  saldo: {
    label: 'Saldo Kas',
    icon: Wallet,
    iconBg: 'bg-brand-light',
    iconColor: 'text-brand',
    valueColor: 'text-[#0f3d32]',
  },
  pemasukan: {
    label: 'Total Pemasukan',
    icon: TrendingUp,
    iconBg: 'bg-[#E1F5EE]',
    iconColor: 'text-success',
    valueColor: 'text-success',
  },
  pengeluaran: {
    label: 'Total Pengeluaran',
    icon: TrendingDown,
    iconBg: 'bg-[#FCEBEB]',
    iconColor: 'text-danger',
    valueColor: 'text-danger',
  },
}

/**
 * @param {object} props
 * @param {'saldo'|'pemasukan'|'pengeluaran'} props.type
 * @param {number} props.amount
 * @param {string} props.periode
 */
export default function SaldoCard({ type, amount, periode }) {
  const cfg = configs[type] || configs.saldo
  const Icon = cfg.icon
  return (
    <div className="bg-white border border-border rounded-card p-4 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-input flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
        <Icon size={20} className={cfg.iconColor} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-stone">{cfg.label}</p>
        <p className={`text-xl font-bold font-mono mt-0.5 ${cfg.valueColor}`}>
          {formatRupiahShort(amount)}
        </p>
        {periode && <p className="text-xs text-stone mt-1">{periode}</p>}
      </div>
    </div>
  )
}
