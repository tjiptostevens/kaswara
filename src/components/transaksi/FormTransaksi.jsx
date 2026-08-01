import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transaksiSchema } from '../../schemas/transaksiSchema'
import { Input, Button } from '../ui'
import { getTodayString } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.kategori
 * @param {Array} props.akunKeuangan - daftar tempat uang
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 * @param {object} [props.defaultValues]
 */
export default function FormTransaksi({
  kategori = [],
  akunKeuangan = [],
  onSubmit,
  onCancel,
  defaultValues,
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(transaksiSchema),
    defaultValues: defaultValues || {
      tanggal: getTodayString(),
      tipe: 'pemasukan',
      akun_keuangan_id: akunKeuangan.find((a) => a.is_default)?.id || akunKeuangan[0]?.id || '',
    },
  })

  const tipe = watch('tipe')
  const akunAsal = watch('akun_keuangan_id')
  const aktifAkun = akunKeuangan.filter((a) => a.aktif !== false)

  const handleFormSubmit = async (data) => {
    const payload = {
      ...data,
      jumlah: Number(data.jumlah),
      kategori_id: data.tipe === 'transfer' ? null : data.kategori_id || null,
      akun_tujuan_id: data.tipe === 'transfer' ? data.akun_tujuan_id : null,
    }
    await onSubmit(payload)
  }

  const filteredKategori = kategori.filter(
    (k) => k.tipe === tipe || k.tipe === 'keduanya'
  )

  const selectClass =
    'w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Tipe */}
      <div>
        <p className="text-xs font-medium text-charcoal uppercase tracking-wide mb-1.5">
          Apa yang terjadi?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'pemasukan', label: 'Masuk' },
            { value: 'pengeluaran', label: 'Keluar' },
            { value: 'transfer', label: 'Pindah' },
          ].map((t) => (
            <label
              key={t.value}
              className={`flex items-center justify-center border rounded-input py-2 text-sm cursor-pointer transition-colors ${
                tipe === t.value
                  ? t.value === 'pemasukan'
                    ? 'bg-[#E1F5EE] border-success text-success font-medium'
                    : t.value === 'pengeluaran'
                      ? 'bg-[#FCEBEB] border-danger text-danger font-medium'
                      : 'bg-brand-light border-brand text-brand font-medium'
                  : 'border-border text-stone hover:bg-warm'
              }`}
            >
              <input type="radio" value={t.value} {...register('tipe')} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
        {errors.tipe && <p className="text-xs text-danger mt-1">{errors.tipe.message}</p>}
      </div>

      <Input
        label="Nominal"
        type="number"
        min="0"
        placeholder="0"
        error={errors.jumlah?.message}
        {...register('jumlah', { valueAsNumber: true })}
      />

      {/* Tempat uang */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          {tipe === 'transfer' ? 'Dari tempat uang' : 'Tempat uang'}
        </label>
        <select className={selectClass} {...register('akun_keuangan_id')}>
          <option value="">Pilih tempat uang</option>
          {aktifAkun.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </select>
        {errors.akun_keuangan_id && (
          <p className="text-xs text-danger">{errors.akun_keuangan_id.message}</p>
        )}
      </div>

      {tipe === 'transfer' ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
            Ke tempat uang
          </label>
          <select className={selectClass} {...register('akun_tujuan_id')}>
            <option value="">Pilih tujuan</option>
            {aktifAkun
              .filter((a) => a.id !== akunAsal)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
          </select>
          {errors.akun_tujuan_id && (
            <p className="text-xs text-danger">{errors.akun_tujuan_id.message}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
            Kategori
          </label>
          <select className={selectClass} {...register('kategori_id')}>
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
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Keterangan
        </label>
        <textarea
          rows={2}
          placeholder={tipe === 'transfer' ? 'Contoh: tarik tunai dari bank' : 'Keterangan opsional'}
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none transition-all"
          {...register('keterangan')}
        />
      </div>

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
          {defaultValues ? 'Simpan perubahan' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
