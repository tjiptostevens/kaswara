import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { anggotaSchema, editAnggotaSchema } from '../../schemas/anggotaSchema'
import { Input, Button } from '../ui'
import { ROLE_LABELS } from '../../constants/roles'
import { Mail } from 'lucide-react'

/**
 * @param {object} props
 * @param {object} [props.defaultValues]
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormAnggota({ defaultValues, onSubmit, onCancel }) {
  const isEdit = !!defaultValues
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEdit ? editAnggotaSchema : anggotaSchema),
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
      {isEdit ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-charcoal uppercase tracking-wide">Email</p>
          <p className="text-sm text-stone px-3 py-2 bg-warm rounded-input border border-border">
            {defaultValues.email || '—'}
          </p>
          <p className="text-xs text-stone">Email tidak dapat diubah setelah undangan dikirim</p>
        </div>
      ) : (
        <>
          <Input
            label="Email"
            type="email"
            placeholder="contoh@email.com"
            error={errors.email?.message}
            leftIcon={<Mail size={14} />}
            {...register('email')}
          />
          <div className="flex items-start gap-2 bg-[#E1F5EE] text-[#0F6E56] rounded-input px-3 py-2 text-xs">
            <Mail size={13} className="mt-0.5 flex-shrink-0" />
            <span>Undangan akan dikirim ke email ini. Anggota menetapkan passwordnya sendiri saat menerima link undangan.</span>
          </div>
        </>
      )}
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
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border text-brand focus:ring-brand/40 focus:ring-2"
            {...register('can_manage_rab')}
          />
          <span className="text-sm text-charcoal">Izinkan kelola RAB</span>
        </label>
        <p className="text-xs text-stone ml-6">Anggota dapat membuat dan mengajukan Rencana Anggaran Biaya</p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border text-brand focus:ring-brand/40 focus:ring-2"
            {...register('can_approve_rab')}
          />
          <span className="text-sm text-charcoal">Izinkan menyetujui RAB</span>
        </label>
        <p className="text-xs text-stone ml-6">Anggota dapat menyetujui atau menolak Rencana Anggaran Biaya</p>
      </div>
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          {isEdit ? 'Simpan perubahan' : 'Kirim undangan'}
        </Button>
      </div>
    </form>
  )
}
