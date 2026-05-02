import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rapSchema } from '../../schemas/rapSchema'
import { Input, Button } from '../ui'
import { getTodayString } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.rabList - list of approved RAB
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormRAP({ rabList = [], onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rapSchema),
    defaultValues: { tanggal_realisasi: getTodayString() },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          RAB Terkait
        </label>
        <select
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          {...register('rab_id')}
        >
          <option value="">Pilih RAB</option>
          {rabList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama_kegiatan}
            </option>
          ))}
        </select>
        {errors.rab_id && (
          <p className="text-xs text-danger">{errors.rab_id.message}</p>
        )}
      </div>
      <Input
        label="Nama Item"
        placeholder="Contoh: Konsumsi rapat"
        error={errors.nama_item?.message}
        {...register('nama_item')}
      />
      <Input
        label="Jumlah Realisasi (Rp)"
        type="number"
        min="0"
        placeholder="0"
        error={errors.jumlah_realisasi?.message}
        {...register('jumlah_realisasi', { valueAsNumber: true })}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Keterangan
        </label>
        <textarea
          rows={2}
          placeholder="Opsional"
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand resize-none"
          {...register('keterangan')}
        />
      </div>
      <Input
        label="Tanggal Realisasi"
        type="date"
        error={errors.tanggal_realisasi?.message}
        {...register('tanggal_realisasi')}
      />
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Simpan RAP
        </Button>
      </div>
    </form>
  )
}
