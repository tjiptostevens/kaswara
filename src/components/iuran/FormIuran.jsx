import React, { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { iuranSchema } from '../../schemas/iuranSchema'
import { Input, Button } from '../ui'
import { FREKUENSI_LABEL } from './IuranTable'

function SearchableAnggotaSelect({ anggotaList, value, onChange, selectClass }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = anggotaList.find((a) => a.id === value)

  const filtered = search
    ? anggotaList.filter((a) => {
      const q = search.toLowerCase()
      return (
        a.nama_lengkap?.toLowerCase().includes(q) ||
        a.nomor_anggota?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.no_hp?.toLowerCase().includes(q)
      )
    })
    : anggotaList

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={selectClass + ' flex items-center justify-between text-left'}
        onClick={() => setOpen((prev) => !prev)}
      >
        {selected ? (
          <span>
            {selected.nama_lengkap}
            {selected.nomor_anggota ? ` (${selected.nomor_anggota})` : ''}
          </span>
        ) : (
          <span className="text-stone/60">Pilih anggota</span>
        )}
        <svg
          className="ml-2 shrink-0 w-4 h-4 text-stone/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-input shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              className="w-full rounded-input border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Cari nama, nomor, email, HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            <li
              className="px-3 py-2 text-sm cursor-pointer hover:bg-brand/10 text-stone/60 italic"
              onMouseDown={() => { onChange(''); setOpen(false); setSearch('') }}
            >
              — Pilih anggota
            </li>
            {filtered.map((a) => (
              <li
                key={a.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-brand/10 ${value === a.id ? 'bg-brand/5 font-medium' : ''}`}
                onMouseDown={() => { onChange(a.id); setOpen(false); setSearch('') }}
              >
                <div>
                  {a.nama_lengkap}
                  {a.nomor_anggota ? ` (${a.nomor_anggota})` : ''}
                </div>
                {(a.email || a.no_hp) && (
                  <div className="text-xs text-stone/50 mt-0.5">
                    {[a.email, a.no_hp].filter(Boolean).join(' · ')}
                  </div>
                )}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-stone/60 italic">Tidak ada hasil</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

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
        <SearchableAnggotaSelect
          anggotaList={anggotaList}
          value={watch('anggota_id')}
          onChange={(val) => setValue('anggota_id', val, { shouldValidate: true })}
          selectClass={selectClass}
        />
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
