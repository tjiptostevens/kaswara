import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { akunKeuanganSchema } from '../../schemas/akuntingSchema'
import { TIPE_AKUN_KEUANGAN } from '../../constants/akunting'
import { Input, Button } from '../ui'

export default function FormAkunKeuangan({ onSubmit, onCancel, defaultValues }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(akunKeuanganSchema),
    defaultValues: defaultValues || { tipe: 'cash', warna: '#1a6b5a' },
  })

  const tipe = watch('tipe')

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const meta = TIPE_AKUN_KEUANGAN.find((t) => t.value === data.tipe)
        await onSubmit({ ...data, warna: data.warna || meta?.warna })
      })}
      className="space-y-4"
    >
      <Input
        label="Nama tempat uang"
        placeholder="Contoh: Dompet, BCA, GoPay"
        error={errors.nama?.message}
        {...register('nama')}
      />

      <div>
        <p className="text-xs font-medium text-charcoal uppercase tracking-wide mb-1.5">Jenis</p>
        <div className="grid grid-cols-2 gap-2">
          {TIPE_AKUN_KEUANGAN.map((t) => (
            <label
              key={t.value}
              className={`flex items-center justify-center border rounded-input py-2 text-sm cursor-pointer ${
                tipe === t.value
                  ? 'bg-brand-light border-brand text-brand font-medium'
                  : 'border-border text-stone hover:bg-warm'
              }`}
            >
              <input type="radio" value={t.value} {...register('tipe')} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {(tipe === 'bank' || tipe === 'ewallet') && (
        <Input
          label="Nomor rekening / ID (opsional)"
          placeholder="xxxx-xxxx"
          {...register('nomor_rekening')}
        />
      )}

      <Input label="Catatan (opsional)" {...register('keterangan')} />

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Simpan
        </Button>
      </div>
    </form>
  )
}
