import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '../ui/Input'
import { Button } from '../ui'
import { Star, RefreshCw, Gift } from 'lucide-react'
import { FREKUENSI_LABEL } from '../iuran/IuranTable'

const FREKUENSI_OPTIONS = Object.entries(FREKUENSI_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const TIPE_OPTIONS = [
  {
    value: 'sukarela',
    label: 'Sukarela',
    desc: 'Bersifat sukarela, tidak diwajibkan',
    icon: Gift,
    color: 'text-stone',
    activeBg: 'bg-[#F1EFE8] border-[#C5C4BE] text-charcoal',
  },
  {
    value: 'sekali',
    label: 'Satu Kali',
    desc: 'Dibayar satu kali saja (mis. biaya registrasi)',
    icon: Star,
    color: 'text-[#854F0B]',
    activeBg: 'bg-[#FEF9EC] border-[#F4DBB4] text-[#854F0B]',
  },
  {
    value: 'wajib',
    label: 'Wajib',
    desc: 'Iuran rutin yang wajib dibayar',
    icon: RefreshCw,
    color: 'text-[#185FA5]',
    activeBg: 'bg-[#E6F1FB] border-[#CDE3F7] text-[#185FA5]',
  },
]

const kategoriIuranSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  tipe: z.enum(['sukarela', 'sekali', 'wajib'], { required_error: 'Tipe wajib dipilih' }),
  frekuensi: z.string().optional(),
  nominal_default: z
    .number({ invalid_type_error: 'Harus berupa angka' })
    .positive('Harus lebih dari 0')
    .optional()
    .or(z.literal('')),
  keterangan: z.string().optional(),
})

/**
 * @param {object} props
 * @param {object} [props.defaultValues] - pre-populated for edit mode
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormKategoriIuran({ defaultValues, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(kategoriIuranSchema),
    defaultValues: defaultValues || { tipe: 'sukarela' },
  })

  const tipe = watch('tipe')

  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      frekuensi: data.tipe === 'wajib' ? data.frekuensi || null : null,
      nominal_default: data.nominal_default ? Number(data.nominal_default) : null,
    })
  }

  const selectClass =
    'w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Nama Kategori"
        placeholder="Contoh: Iuran Bulanan, Biaya Pendaftaran"
        error={errors.nama?.message}
        {...register('nama')}
      />

      {/* Tipe */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Tipe Iuran
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIPE_OPTIONS.map(({ value, label, desc, icon: Icon, activeBg }) => (
            <label
              key={value}
              className={`flex flex-col items-center gap-1 border rounded-input p-2.5 text-center cursor-pointer transition-colors ${
                tipe === value
                  ? `${activeBg} font-medium`
                  : 'border-border text-stone hover:bg-warm'
              }`}
            >
              <input type="radio" value={value} className="sr-only" {...register('tipe')} />
              <Icon size={16} />
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] leading-tight opacity-70">{desc}</span>
            </label>
          ))}
        </div>
        {errors.tipe && <p className="text-xs text-danger">{errors.tipe.message}</p>}
      </div>

      {/* Frekuensi — only for wajib */}
      {tipe === 'wajib' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
            Frekuensi
          </label>
          <select className={selectClass} {...register('frekuensi')}>
            <option value="">Pilih frekuensi</option>
            {FREKUENSI_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.frekuensi && (
            <p className="text-xs text-danger">{errors.frekuensi.message}</p>
          )}
        </div>
      )}

      {/* Nominal Default */}
      <Input
        label="Nominal Default (Rp, opsional)"
        type="number"
        min="0"
        placeholder="Dikosongkan jika tidak ada nominal baku"
        error={errors.nominal_default?.message}
        {...register('nominal_default', { valueAsNumber: true })}
      />

      {/* Keterangan */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Keterangan
        </label>
        <textarea
          rows={2}
          placeholder="Opsional"
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none transition-all"
          {...register('keterangan')}
        />
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
