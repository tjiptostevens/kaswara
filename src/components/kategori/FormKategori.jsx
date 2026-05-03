import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '../ui/Input'
import { Button } from '../ui'

const kategoriSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  tipe: z.enum(['pemasukan', 'pengeluaran', 'keduanya'], {
    required_error: 'Tipe wajib dipilih',
  }),
})

const TIPE_OPTIONS = [
  { value: 'pemasukan', label: 'Pemasukan' },
  { value: 'pengeluaran', label: 'Pengeluaran' },
  { value: 'keduanya', label: 'Keduanya' },
]

export default function FormKategori({ defaultValues, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(kategoriSchema),
    defaultValues: defaultValues || { tipe: 'pengeluaran' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nama Kategori"
        placeholder="Contoh: Listrik, Air, Sosial"
        error={errors.nama?.message}
        {...register('nama')}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Tipe
        </label>
        <div className="flex gap-2">
          {TIPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex-1 flex items-center justify-center gap-1.5 border rounded-input py-2 text-sm cursor-pointer transition-colors has-[:checked]:bg-brand-light has-[:checked]:border-brand has-[:checked]:text-brand has-[:checked]:font-medium border-border text-stone hover:bg-warm"
            >
              <input
                type="radio"
                value={opt.value}
                className="sr-only"
                {...register('tipe')}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {errors.tipe && <p className="text-xs text-danger">{errors.tipe.message}</p>}
      </div>
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          {defaultValues ? 'Simpan perubahan' : 'Tambah kategori'}
        </Button>
      </div>
    </form>
  )
}
