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
    <div className="glass-card p-5 flex items-start gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${cfg.iconBg} border border-white/50`}>
        <Icon size={24} className={cfg.iconColor} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone/80">{cfg.label}</p>
        <p className={`text-2xl font-bold font-display mt-0.5 tracking-tight ${cfg.valueColor}`}>
          {formatRupiahShort(amount)}
        </p>
        {periode && <p className="text-[10px] text-stone mt-1.5 font-medium flex items-center gap-1 opacity-70">
          <span className="w-1 h-1 rounded-full bg-stone/40" />
          {periode}
        </p>}
      </div>
    </div>
  )
}
