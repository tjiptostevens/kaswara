import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { anggotaSchema } from '../../schemas/anggotaSchema'
import { Input, Button } from '../ui'
import { ROLE_LABELS } from '../../constants/roles'

/**
 * @param {object} props
 * @param {object} [props.defaultValues]
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormAnggota({ defaultValues, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(anggotaSchema),
    defaultValues: defaultValues || { aktif: true, role: 'anggota' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap"
        error={errors.nama_lengkap?.message}
        {...register('nama_lengkap')}
      />
      <Input
        label="Nomor Anggota"
        placeholder="Contoh: 001"
        hint="Opsional"
        {...register('nomor_anggota')}
      />
      <Input
        label="Email"
        type="email"
        placeholder="contoh@email.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Nomor HP"
        type="tel"
        placeholder="Contoh: 08123456789"
        hint="Opsional"
        error={errors.no_hp?.message}
        {...register('no_hp')}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Role
        </label>
        <select
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          {...register('role')}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.role && <p className="text-xs text-danger">{errors.role.message}</p>}
      </div>
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          {defaultValues ? 'Simpan perubahan' : 'Tambah anggota'}
        </Button>
      </div>
    </form>
  )
}
