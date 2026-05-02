import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transaksiSchema } from '../../schemas/transaksiSchema'
import { Input, Button } from '../ui'
import { getTodayString } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.kategori
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormTransaksi({ kategori = [], onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(transaksiSchema),
    defaultValues: { tanggal: getTodayString(), tipe: 'pemasukan' },
  })

  const tipe = watch('tipe')

  const handleFormSubmit = async (data) => {
    await onSubmit({ ...data, jumlah: Number(data.jumlah) })
  }

  const filteredKategori = kategori.filter(
    (k) => k.tipe === tipe || k.tipe === 'keduanya'
  )

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Tipe */}
      <div>
        <p className="text-xs font-medium text-charcoal uppercase tracking-wide mb-1.5">
          Tipe Transaksi
        </p>
        <div className="flex gap-3">
          {['pemasukan', 'pengeluaran'].map((t) => (
            <label
              key={t}
              className={`flex-1 flex items-center justify-center gap-2 border rounded-input py-2 text-sm cursor-pointer transition-colors ${
                tipe === t
                  ? t === 'pemasukan'
                    ? 'bg-[#E1F5EE] border-success text-success font-medium'
                    : 'bg-[#FCEBEB] border-danger text-danger font-medium'
                  : 'border-border text-stone hover:bg-warm'
              }`}
            >
              <input type="radio" value={t} {...register('tipe')} className="sr-only" />
              {t === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
            </label>
          ))}
        </div>
        {errors.tipe && <p className="text-xs text-danger mt-1">{errors.tipe.message}</p>}
      </div>

      {/* Jumlah */}
      <Input
        label="Nominal (Rp)"
        type="number"
        min="0"
        placeholder="0"
        error={errors.jumlah?.message}
        {...register('jumlah', { valueAsNumber: true })}
      />

      {/* Kategori */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Kategori
        </label>
        <select
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          {...register('kategori_id')}
        >
          <option value="">Pilih kategori</option>
          {filteredKategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
        {errors.kategori_id && (
          <p className="text-xs text-danger">{errors.kategori_id.message}</p>
        )}
      </div>

      {/* Keterangan */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Keterangan
        </label>
        <textarea
          rows={2}
          placeholder="Keterangan opsional"
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand resize-none"
          {...register('keterangan')}
        />
      </div>

      {/* Tanggal */}
      <Input
        label="Tanggal"
        type="date"
        error={errors.tanggal?.message}
        {...register('tanggal')}
      />

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Simpan transaksi
        </Button>
      </div>
    </form>
  )
}
