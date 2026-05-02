import React from 'react'
import SaldoCard from './SaldoCard'

/**
 * @param {object} props
 * @param {number} props.saldo
 * @param {number} props.totalPemasukan
 * @param {number} props.totalPengeluaran
 * @param {string} props.periode
 */
export default function StatGrid({ saldo, totalPemasukan, totalPengeluaran, periode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SaldoCard type="saldo" amount={saldo} periode={periode} />
      <SaldoCard type="pemasukan" amount={totalPemasukan} periode={periode} />
      <SaldoCard type="pengeluaran" amount={totalPengeluaran} periode={periode} />
    </div>
  )
}
