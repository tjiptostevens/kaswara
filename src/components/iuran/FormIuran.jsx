import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { iuranSchema } from '../../schemas/iuranSchema'
import { Input, Button } from '../ui'
import { FREKUENSI_LABEL } from './IuranTable'

/**
 * @param {object} props
 * @param {Array} props.anggotaList - list of org members
 * @param {Array} props.kategoriIuranList - list of kategori_iuran
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 * @param {object} [props.defaultValues] - pre-populated values for edit mode
 */
export default function FormIuran({
  anggotaList = [],
  kategoriIuranList = [],
  onSubmit,
  onCancel,
  defaultValues,
}) {
  // Convert stored date (YYYY-MM-DD) to month input value (YYYY-MM) for edit mode
  const editDefaults = defaultValues
    ? {
        ...defaultValues,
        periode: defaultValues.periode ? defaultValues.periode.substring(0, 7) : '',
        kategori_iuran_id: defaultValues.kategori_iuran_id || '',
        keterangan: defaultValues.keterangan || '',
      }
    : {}

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(iuranSchema),
    defaultValues: editDefaults,
  })

  const selectedKategoriId = watch('kategori_iuran_id')
  const selectedKategori = kategoriIuranList.find((k) => k.id === selectedKategoriId)

  // Auto-fill jumlah from kategori nominal_default when user picks a kategori (add mode only)
  useEffect(() => {
    if (!defaultValues && selectedKategori?.nominal_default) {
      setValue('jumlah', Number(selectedKategori.nominal_default), { shouldValidate: false })
    }
  }, [selectedKategoriId, selectedKategori, defaultValues, setValue])

  const handleFormSubmit = (data) => {
    // Convert YYYY-MM → YYYY-MM-01 for storage as date
    const periodeDate = data.periode + '-01'
    onSubmit({
      ...data,
      periode: periodeDate,
      jumlah: Number(data.jumlah),
      kategori_iuran_id: data.kategori_iuran_id || null,
    })
  }

  const selectClass =
    'w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Anggota */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Anggota
        </label>
        <select className={selectClass} {...register('anggota_id')}>
          <option value="">Pilih anggota</option>
          {anggotaList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama_lengkap}
              {a.nomor_anggota ? ` (${a.nomor_anggota})` : ''}
            </option>
          ))}
        </select>
        {errors.anggota_id && (
          <p className="text-xs text-danger">{errors.anggota_id.message}</p>
        )}
      </div>

      {/* Kategori Iuran */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Kategori Iuran
        </label>
        <select className={selectClass} {...register('kategori_iuran_id')}>
          <option value="">Tanpa kategori</option>
          {kategoriIuranList.map((k) => {
            const tipeSuffix =
              k.tipe === 'sekali'
                ? ' ★ Sekali'
                : k.tipe === 'wajib'
                ? ` ↻ ${k.frekuensi ? FREKUENSI_LABEL[k.frekuensi] || k.frekuensi : 'Wajib'}`
                : ' ◎ Sukarela'
            return (
              <option key={k.id} value={k.id}>
                {k.nama}{tipeSuffix}
              </option>
            )
          })}
        </select>
      </div>

      {/* Jumlah */}
      <Input
        label="Jumlah (Rp)"
        type="number"
        min="0"
        placeholder="0"
        error={errors.jumlah?.message}
        {...register('jumlah', { valueAsNumber: true })}
      />

      {/* Periode */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Periode
        </label>
        <input
          type="month"
          className={selectClass}
          {...register('periode')}
        />
        {errors.periode && (
          <p className="text-xs text-danger">{errors.periode.message}</p>
        )}
      </div>

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
          {defaultValues ? 'Simpan perubahan' : 'Simpan iuran'}
        </Button>
      </div>
    </form>
  )
}
