import React, { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rapSchema } from '../../schemas/rapSchema'
import { Input, Button } from '../ui'
import { getTodayString, formatRupiah } from '../../lib/formatters'
import { Camera, X } from 'lucide-react'

export default function FormRAP({ rabList = [], kategori = [], onSubmit, onCancel, defaultValues }) {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rapSchema),
    defaultValues: defaultValues || {
      rab_id: '',
      kategori_id: '',
      tanggal_realisasi: getTodayString(),
      items: [],
    },
  })

  const { fields, replace } = useFieldArray({ control, name: 'items' })
  const rabId = watch('rab_id')
  const watchedItems = watch('items') || []

  const selectedRAB = rabList.find((r) => r.id === rabId)

  useEffect(() => {
    if (!selectedRAB || defaultValues) return
    setValue('kategori_id', selectedRAB.kategori_id || '')
    replace(
      (selectedRAB.rab_item || []).map((item) => ({
        rab_item_id: item.id,
        nama_item: item.nama_item,
        volume: Number(item.volume || 0),
        satuan: item.satuan || 'unit',
        harga_satuan: Number(item.harga_satuan || 0),
        subtotal_anggaran: Number(item.subtotal || 0),
        jumlah_realisasi: 0,
      }))
    )
  }, [selectedRAB, defaultValues, setValue, replace])

  const totalAnggaran = watchedItems.reduce((sum, item) => sum + Number(item.subtotal_anggaran || 0), 0)
  const totalRealisasi = watchedItems.reduce((sum, item) => sum + Number(item.jumlah_realisasi || 0), 0)
  const totalSelisih = totalRealisasi - totalAnggaran

  const [fileEntries, setFileEntries] = useState([])
  const fileEntriesRef = useRef(fileEntries)
  fileEntriesRef.current = fileEntries

  useEffect(() => {
    return () => {
      fileEntriesRef.current.forEach(({ url }) => URL.revokeObjectURL(url))
    }
  }, [])

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'))
    const newEntries = selected.map((file) => ({ file, url: URL.createObjectURL(file) }))
    setFileEntries((prev) => [...prev, ...newEntries])
    e.target.value = ''
  }

  const removeFile = (idx) => {
    setFileEntries((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const submit = handleSubmit((data) => onSubmit(data, fileEntries.map((e) => e.file)))

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">RAB Terkait</label>
        <select
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          {...register('rab_id')}
        >
          <option value="">Pilih RAB</option>
          {rabList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama_kegiatan}
            </option>
          ))}
        </select>
        {errors.rab_id && <p className="text-xs text-danger">{errors.rab_id.message}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Kategori Transaksi</label>
        <select
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          {...register('kategori_id')}
        >
          <option value="">Pilih kategori</option>
          {kategori
            .filter((k) => k.tipe === 'pengeluaran' || k.tipe === 'keduanya')
            .map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
        </select>
        {errors.kategori_id && <p className="text-xs text-danger">{errors.kategori_id.message}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-charcoal uppercase tracking-wide">Item Realisasi</p>
        {fields.length === 0 && (
          <p className="text-xs text-stone">Pilih RAB untuk memunculkan item anggaran.</p>
        )}
        {fields.map((field, idx) => {
          const subtotal = Number(watchedItems[idx]?.subtotal_anggaran || 0)
          const realisasi = Number(watchedItems[idx]?.jumlah_realisasi || 0)
          const selisih = realisasi - subtotal
          const status = selisih === 0 ? 'tepat' : selisih > 0 ? 'lebih' : 'kurang'
          return (
            <div key={field.id} className="rounded-input border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-charcoal">{field.nama_item}</p>
                <span className="text-xs text-stone">{field.volume} {field.satuan}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] text-stone uppercase tracking-wide">Anggaran</p>
                  <p className="text-sm font-mono font-medium text-charcoal">{formatRupiah(subtotal)}</p>
                </div>
                <div className="sm:col-span-1">
                  <Input
                    label="Realisasi (Rp)"
                    type="number"
                    min="0"
                    {...register(`items.${idx}.jumlah_realisasi`, { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <p className="text-[11px] text-stone uppercase tracking-wide">Disparitas</p>
                  <p className={`text-sm font-medium ${status === 'tepat' ? 'text-success' : status === 'lebih' ? 'text-danger' : 'text-info'}`}>
                    {status.toUpperCase()} ({formatRupiah(Math.abs(selisih))})
                  </p>
                </div>
              </div>
              <input type="hidden" {...register(`items.${idx}.rab_item_id`)} />
              <input type="hidden" {...register(`items.${idx}.nama_item`)} />
              <input type="hidden" {...register(`items.${idx}.volume`, { valueAsNumber: true })} />
              <input type="hidden" {...register(`items.${idx}.satuan`)} />
              <input type="hidden" {...register(`items.${idx}.harga_satuan`, { valueAsNumber: true })} />
              <input type="hidden" {...register(`items.${idx}.subtotal_anggaran`, { valueAsNumber: true })} />
            </div>
          )
        })}
        {errors.items && <p className="text-xs text-danger">{errors.items.message || errors.items.root?.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-brand-light rounded-input px-4 py-3">
        <div>
          <p className="text-[11px] text-stone uppercase tracking-wide">Total Anggaran</p>
          <p className="text-sm font-bold font-mono text-brand-dark">{formatRupiah(totalAnggaran)}</p>
        </div>
        <div>
          <p className="text-[11px] text-stone uppercase tracking-wide">Total RAP</p>
          <p className="text-sm font-bold font-mono text-brand-dark">{formatRupiah(totalRealisasi)}</p>
        </div>
        <div>
          <p className="text-[11px] text-stone uppercase tracking-wide">Disparitas</p>
          <p className={`text-sm font-bold ${totalSelisih === 0 ? 'text-success' : totalSelisih > 0 ? 'text-danger' : 'text-info'}`}>
            {totalSelisih === 0 ? 'TEPAT' : totalSelisih > 0 ? 'LEBIH' : 'KURANG'} ({formatRupiah(Math.abs(totalSelisih))})
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Keterangan</label>
        <textarea
          rows={2}
          placeholder="Opsional"
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none transition-all"
          {...register('keterangan')}
        />
      </div>

      <Input
        label="Tanggal Realisasi"
        type="date"
        error={errors.tanggal_realisasi?.message}
        {...register('tanggal_realisasi')}
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Foto Bukti (opsional)</label>
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-input px-3 py-2 text-sm text-stone hover:border-brand hover:text-brand transition-colors w-fit">
          <Camera size={15} />
          Tambah foto
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {fileEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fileEntries.map(({ file, url }, idx) => (
              <div key={url} className="relative group">
                <img src={url} alt={file.name} className="w-16 h-16 object-cover rounded-input border border-border" />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-white/80 backdrop-blur-sm border border-border rounded-full p-0.5 text-stone hover:text-danger transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
