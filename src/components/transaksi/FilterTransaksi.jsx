import React from 'react'
import Input from '../ui/Input'
import { Search } from 'lucide-react'

/**
 * @param {object} props
 * @param {object} props.filters
 * @param {(key: string, value: string) => void} props.onChange
 * @param {Array} props.kategori
 */
export default function FilterTransaksi({ filters, onChange, kategori = [] }) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[160px]">
        <Input
          label="Dari Tanggal"
          type="date"
          value={filters.dari || ''}
          onChange={(e) => onChange('dari', e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[160px]">
        <Input
          label="Sampai Tanggal"
          type="date"
          value={filters.sampai || ''}
          onChange={(e) => onChange('sampai', e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[140px] flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Tipe
        </label>
        <select
          value={filters.tipe || ''}
          onChange={(e) => onChange('tipe', e.target.value)}
          className="rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        >
          <option value="">Semua tipe</option>
          <option value="pemasukan">Pemasukan</option>
          <option value="pengeluaran">Pengeluaran</option>
        </select>
      </div>
      <div className="flex-1 min-w-[140px] flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Kategori
        </label>
        <select
          value={filters.kategoriId || ''}
          onChange={(e) => onChange('kategoriId', e.target.value)}
          className="rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        >
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
