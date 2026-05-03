import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rapSchema } from '../../schemas/rapSchema'
import { Input, Button } from '../ui'
import { getTodayString } from '../../lib/formatters'
import { Camera, X } from 'lucide-react'

/**
 * @param {object} props
 * @param {Array} props.rabList - list of approved RAB
 * @param {(data: object, files: File[]) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormRAP({ rabList = [], onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(rapSchema),
    defaultValues: { tanggal_realisasi: getTodayString() },
  })

  // Each entry: { file: File, url: string }
  const [fileEntries, setFileEntries] = useState([])
  const fileEntriesRef = useRef(fileEntries)
  fileEntriesRef.current = fileEntries

  // Revoke all remaining object URLs on unmount
  useEffect(() => {
    return () => {
      fileEntriesRef.current.forEach(({ url }) => URL.revokeObjectURL(url))
    }
  }, [])

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith('image/')
    )
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
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          RAB Terkait
        </label>
        <select
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          {...register('rab_id')}
        >
          <option value="">Pilih RAB</option>
          {rabList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama_kegiatan}
            </option>
          ))}
        </select>
        {errors.rab_id && (
          <p className="text-xs text-danger">{errors.rab_id.message}</p>
        )}
      </div>
      <Input
        label="Nama Item"
        placeholder="Contoh: Konsumsi rapat"
        error={errors.nama_item?.message}
        {...register('nama_item')}
      />
      <Input
        label="Jumlah Realisasi (Rp)"
        type="number"
        min="0"
        placeholder="0"
        error={errors.jumlah_realisasi?.message}
        {...register('jumlah_realisasi', { valueAsNumber: true })}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Keterangan
        </label>
        <textarea
          rows={2}
          placeholder="Opsional"
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand resize-none"
          {...register('keterangan')}
        />
      </div>
      <Input
        label="Tanggal Realisasi"
        type="date"
        error={errors.tanggal_realisasi?.message}
        {...register('tanggal_realisasi')}
      />

      {/* Foto Bukti */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Foto Bukti (opsional)
        </label>
        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-input px-3 py-2 text-sm text-stone hover:border-brand hover:text-brand transition-colors w-fit">
          <Camera size={15} />
          Tambah foto
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {fileEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fileEntries.map(({ file, url }, idx) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={file.name}
                  className="w-16 h-16 object-cover rounded-input border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-white border border-border rounded-full p-0.5 text-stone hover:text-danger transition-colors"
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
