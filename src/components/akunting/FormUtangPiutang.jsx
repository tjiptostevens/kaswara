import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { utangPiutangSchema, pembayaranUtangSchema } from '../../schemas/akuntingSchema'
import { Input, Button } from '../ui'
import { getTodayString } from '../../lib/formatters'

const selectClass =
  'w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all'

export function FormUtangPiutang({ akunKeuangan = [], onSubmit, onCancel, defaultTipe = 'utang' }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(utangPiutangSchema),
    defaultValues: {
      tipe: defaultTipe,
      tanggal: getTodayString(),
      dengan_kas: true,
      akun_keuangan_id: akunKeuangan.find((a) => a.is_default)?.id || akunKeuangan[0]?.id || '',
    },
  })

  const tipe = watch('tipe')
  const denganKas = watch('dengan_kas')

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({
          ...data,
          jumlah_awal: Number(data.jumlah_awal),
          akun_keuangan_id: data.dengan_kas ? data.akun_keuangan_id : null,
          jatuh_tempo: data.jatuh_tempo || null,
        })
      })}
      className="space-y-4"
    >
      <div>
        <p className="text-xs font-medium text-charcoal uppercase tracking-wide mb-1.5">Jenis</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'utang', label: 'Hutang (saya berhutang)' },
            { value: 'piutang', label: 'Piutang (orang berhutang ke saya)' },
          ].map((t) => (
            <label
              key={t.value}
              className={`flex items-center justify-center text-center border rounded-input py-2 px-2 text-xs sm:text-sm cursor-pointer ${
                tipe === t.value
                  ? t.value === 'utang'
                    ? 'bg-[#FCEBEB] border-danger text-danger font-medium'
                    : 'bg-[#E8F1FB] border-info text-info font-medium'
                  : 'border-border text-stone hover:bg-warm'
              }`}
            >
              <input type="radio" value={t.value} {...register('tipe')} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <Input
        label={tipe === 'utang' ? 'Nama pemberi pinjaman' : 'Nama yang berhutang'}
        placeholder="Nama orang / toko / bank"
        error={errors.nama_pihak?.message}
        {...register('nama_pihak')}
      />

      <Input
        label="Nominal"
        type="number"
        min="0"
        error={errors.jumlah_awal?.message}
        {...register('jumlah_awal', { valueAsNumber: true })}
      />

      <Input label="Tanggal" type="date" {...register('tanggal')} />
      <Input label="Jatuh tempo (opsional)" type="date" {...register('jatuh_tempo')} />

      <label className="flex items-start gap-2 text-sm text-charcoal cursor-pointer">
        <input type="checkbox" className="mt-1" {...register('dengan_kas')} />
        <span>
          {tipe === 'utang'
            ? 'Uang sudah saya terima di Cash/Bank'
            : 'Saya sudah memberikan uang dari Cash/Bank'}
        </span>
      </label>

      {denganKas && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
            Tempat uang
          </label>
          <select className={selectClass} {...register('akun_keuangan_id')}>
            <option value="">Pilih</option>
            {akunKeuangan.filter((a) => a.aktif !== false).map((a) => (
              <option key={a.id} value={a.id}>{a.nama}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Catatan</label>
        <textarea
          rows={2}
          className="w-full rounded-input border border-border bg-white/50 px-3 py-2.5 text-sm resize-none"
          {...register('deskripsi')}
        />
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>Batal</Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>Simpan</Button>
      </div>
    </form>
  )
}

export function FormPembayaranUtang({ akunKeuangan = [], sisa = 0, onSubmit, onCancel, tipe = 'utang' }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pembayaranUtangSchema),
    defaultValues: {
      tanggal: getTodayString(),
      jumlah: sisa,
      akun_keuangan_id: akunKeuangan.find((a) => a.is_default)?.id || akunKeuangan[0]?.id || '',
    },
  })

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({ ...data, jumlah: Number(data.jumlah) })
      })}
      className="space-y-4"
    >
      <p className="text-sm text-stone">
        Sisa: <span className="font-semibold text-charcoal">{sisa.toLocaleString('id-ID')}</span>
      </p>
      <Input
        label={tipe === 'utang' ? 'Jumlah bayar' : 'Jumlah diterima'}
        type="number"
        error={errors.jumlah?.message}
        {...register('jumlah', { valueAsNumber: true })}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Tempat uang</label>
        <select className={selectClass} {...register('akun_keuangan_id')}>
          {akunKeuangan.filter((a) => a.aktif !== false).map((a) => (
            <option key={a.id} value={a.id}>{a.nama}</option>
          ))}
        </select>
        {errors.akun_keuangan_id && (
          <p className="text-xs text-danger">{errors.akun_keuangan_id.message}</p>
        )}
      </div>
      <Input label="Tanggal" type="date" {...register('tanggal')} />
      <Input label="Catatan" {...register('keterangan')} />
      <div className="flex gap-3">
        {onCancel && <Button type="button" variant="ghost" fullWidth onClick={onCancel}>Batal</Button>}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          {tipe === 'utang' ? 'Bayar' : 'Terima'}
        </Button>
      </div>
    </form>
  )
}
