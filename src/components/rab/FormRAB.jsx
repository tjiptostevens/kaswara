import React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rabSchema } from '../../schemas/rabSchema'
import { Input, Button } from '../ui'
import { Plus, Trash2 } from 'lucide-react'
import { getTodayString, formatRupiah } from '../../lib/formatters'

export default function FormRAB({ onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rabSchema),
    defaultValues: {
      tanggal_pengajuan: getTodayString(),
      items: [{ nama_item: '', volume: 1, satuan: 'unit', harga_satuan: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items') || []

  const total = items.reduce(
    (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.harga_satuan) || 0),
    0
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nama Kegiatan"
        placeholder="Contoh: Rapat Warga Bulanan"
        error={errors.nama_kegiatan?.message}
        {...register('nama_kegiatan')}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Deskripsi
        </label>
        <textarea
          rows={2}
          placeholder="Opsional"
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand resize-none"
          {...register('deskripsi')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Tanggal Pengajuan"
          type="date"
          error={errors.tanggal_pengajuan?.message}
          {...register('tanggal_pengajuan')}
        />
        <Input
          label="Tanggal Kegiatan"
          type="date"
          error={errors.tanggal_kegiatan?.message}
          {...register('tanggal_kegiatan')}
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-charcoal uppercase tracking-wide">Item Anggaran</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => append({ nama_item: '', volume: 1, satuan: 'unit', harga_satuan: 0 })}
          >
            Tambah item
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-end">
              <div className="flex-1">
                <input
                  placeholder="Nama item"
                  className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  {...register(`items.${idx}.nama_item`)}
                />
              </div>
              <div className="w-16">
                <input
                  type="number"
                  placeholder="Vol."
                  min="0"
                  className="w-full rounded-input border border-border bg-white px-2 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  {...register(`items.${idx}.volume`, { valueAsNumber: true })}
                />
              </div>
              <div className="w-20">
                <input
                  placeholder="Satuan"
                  className="w-full rounded-input border border-border bg-white px-2 py-2 text-sm text-charcoal placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  {...register(`items.${idx}.satuan`)}
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  placeholder="Harga/satuan"
                  min="0"
                  className="w-full rounded-input border border-border bg-white px-2 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  {...register(`items.${idx}.harga_satuan`, { valueAsNumber: true })}
                />
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-stone hover:text-danger transition-colors p-1 flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.items && (
          <p className="text-xs text-danger mt-1">{errors.items.message || errors.items.root?.message}</p>
        )}
      </div>

      {/* Total */}
      <div className="flex justify-between items-center bg-brand-light rounded-input px-4 py-2">
        <span className="text-sm font-medium text-[#0f3d32]">Total Anggaran</span>
        <span className="text-base font-bold font-mono text-brand">{formatRupiah(total)}</span>
      </div>

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Simpan RAB
        </Button>
      </div>
    </form>
  )
}
