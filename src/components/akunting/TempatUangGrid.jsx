import React from 'react'
import { formatRupiah } from '../../lib/formatters'
import { Wallet, Building2, Smartphone, CircleDollarSign } from 'lucide-react'

const ICONS = {
  cash: Wallet,
  bank: Building2,
  ewallet: Smartphone,
  lainnya: CircleDollarSign,
}

/**
 * Kartu satu tempat uang — tampilan Simple
 */
export default function AkunCard({ akun, currency = 'IDR', simbol = 'Rp', onClick }) {
  const Icon = ICONS[akun.tipe] || Wallet
  const warna = akun.warna || '#1a6b5a'
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card p-4 text-left w-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${warna}18`, color: warna }}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0f3d32] truncate">{akun.nama}</p>
          <p className="text-[10px] uppercase tracking-wider text-stone mt-0.5">
            {akun.tipe === 'cash' ? 'Cash' : akun.tipe === 'bank' ? 'Bank' : akun.tipe === 'ewallet' ? 'E-Wallet' : 'Lainnya'}
          </p>
          <p className="text-lg font-bold font-display mt-2 tracking-tight text-[#0f3d32]">
            {formatRupiah(Number(akun.saldo || 0), { currency, simbol })}
          </p>
        </div>
      </div>
    </button>
  )
}

/**
 * Grid ringkasan "Uang Anda ada di mana"
 */
export function TempatUangGrid({
  saldoAkun = [],
  totalUang = 0,
  totalUtang = 0,
  totalPiutang = 0,
  currency = 'IDR',
  simbol = 'Rp',
  onAkunClick,
  onAdd,
}) {
  const aktif = saldoAkun.filter((a) => a.aktif !== false)

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 bg-gradient-to-br from-brand-light/80 to-white/60">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone/80">
          Total uang Anda
        </p>
        <p className="text-3xl font-bold font-display text-brand-dark mt-1 tracking-tight">
          {formatRupiah(totalUang, { currency, simbol })}
        </p>
        <p className="text-xs text-stone mt-2">
          Uang Anda tersebar di {aktif.length} tempat
        </p>
        {(totalUtang > 0 || totalPiutang > 0) && (
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border/60">
            {totalUtang > 0 && (
              <div>
                <p className="text-[10px] uppercase text-stone">Hutang</p>
                <p className="text-sm font-semibold text-danger">
                  {formatRupiah(totalUtang, { currency, simbol })}
                </p>
              </div>
            )}
            {totalPiutang > 0 && (
              <div>
                <p className="text-[10px] uppercase text-stone">Piutang</p>
                <p className="text-sm font-semibold text-info">
                  {formatRupiah(totalPiutang, { currency, simbol })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-brand-dark tracking-tight">
          Uang Anda ada di
        </h3>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="text-xs font-medium text-brand hover:underline"
          >
            + Tambah tempat
          </button>
        )}
      </div>

      {aktif.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm text-stone">
          Belum ada tempat uang. Tambahkan Cash atau Bank untuk mulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {aktif.map((a) => (
            <AkunCard
              key={a.akun_keuangan_id || a.id}
              akun={a}
              currency={currency}
              simbol={simbol}
              onClick={() => onAkunClick?.(a)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
