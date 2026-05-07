import React, { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Table from '../components/ui/Table'
import { Button, Modal, Input } from '../components/ui'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'

const HUBUNGAN_LABELS = {
  suami: 'Suami',
  istri: 'Istri',
  anak: 'Anak',
  orang_tua: 'Orang Tua',
  lainnya: 'Lainnya',
}

const keluargaSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  hubungan: z.enum(['suami', 'istri', 'anak', 'orang_tua', 'lainnya'], {
    required_error: 'Hubungan wajib dipilih',
  }),
  tanggal_lahir: z.string().optional(),
})

function FormKeluarga({ defaultValues, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(keluargaSchema),
    defaultValues: defaultValues || {},
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nama"
        placeholder="Nama anggota keluarga"
        error={errors.nama?.message}
        {...register('nama')}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Hubungan
        </label>
        <select
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          {...register('hubungan')}
        >
          <option value="">Pilih hubungan</option>
          {Object.entries(HUBUNGAN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.hubungan && <p className="text-xs text-danger">{errors.hubungan.message}</p>}
      </div>
      <Input
        label="Tanggal Lahir"
        type="date"
        hint="Opsional"
        max={new Date().toISOString().split('T')[0]}
        error={errors.tanggal_lahir?.message}
        {...register('tanggal_lahir')}
      />
      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          {defaultValues ? 'Simpan perubahan' : 'Tambah anggota keluarga'}
        </Button>
      </div>
    </form>
  )
}

export default function KeluargaPage() {
  const { activeWorkspace, profile, isBendahara, isKetua } = useAuth()
  const organisasi = activeWorkspace
  const showToast = useUIStore((s) => s.showToast)
  const canManageAll = isBendahara || isKetua

  const [keluarga, setKeluarga] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchKeluarga = useCallback(async () => {
    if (!organisasi?.id) return
    setLoading(true)
    const query = supabase
      .from('anggota_keluarga')
      .select('*, anggota_organisasi(nama_lengkap)')
      .eq('organisasi_id', organisasi.id)
      .order('nama')

    if (!canManageAll && profile?.id) {
      query.eq('anggota_id', profile.id)
    }

    const { data, error } = await query
    setLoading(false)
    if (!error) setKeluarga(data || [])
  }, [organisasi?.id, profile?.id, canManageAll])

  useEffect(() => {
    fetchKeluarga()
  }, [fetchKeluarga])

  const handleAdd = async (data) => {
    const { error } = await supabase.from('anggota_keluarga').insert({
      ...data,
      tanggal_lahir: data.tanggal_lahir || null,
      anggota_id: profile.id,
      organisasi_id: organisasi.id,
    })
    if (error) {
      showToast('Gagal menambah: ' + error.message, 'error')
    } else {
      showToast('Anggota keluarga berhasil ditambahkan!')
      setModalOpen(false)
      fetchKeluarga()
    }
  }

  const handleEdit = async (data) => {
    const { error } = await supabase
      .from('anggota_keluarga')
      .update({ ...data, tanggal_lahir: data.tanggal_lahir || null })
      .eq('id', editing.id)
    if (error) {
      showToast('Gagal memperbarui: ' + error.message, 'error')
    } else {
      showToast('Data berhasil disimpan!')
      setEditing(null)
      fetchKeluarga()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data anggota keluarga ini?')) return
    const { error } = await supabase.from('anggota_keluarga').delete().eq('id', id)
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error')
    } else {
      showToast('Data berhasil dihapus')
      fetchKeluarga()
    }
  }

  const columns = [
    { key: 'nama', label: 'Nama' },
    {
      key: 'hubungan',
      label: 'Hubungan',
      render: (row) => HUBUNGAN_LABELS[row.hubungan] || row.hubungan,
    },
    {
      key: 'tanggal_lahir',
      label: 'Tanggal Lahir',
      render: (row) =>
        row.tanggal_lahir
          ? new Date(row.tanggal_lahir).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : '—',
    },
    ...(canManageAll
      ? [
          {
            key: 'anggota',
            label: 'Anggota',
            render: (row) => row.anggota_organisasi?.nama_lengkap || '—',
          },
        ]
      : []),
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-1">
          <button
            onClick={() => setEditing(row)}
            className="text-stone hover:text-brand transition-colors p-1"
            aria-label="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-stone hover:text-danger transition-colors p-1"
            aria-label="Hapus"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageWrapper title="Keluarga">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f3d32]">Data Keluarga</h2>
            {!canManageAll && (
              <p className="text-sm text-stone">Anggota keluarga Anda dalam organisasi ini</p>
            )}
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            Tambah keluarga
          </Button>
        </div>

        <Table
          columns={columns}
          data={keluarga}
          loading={loading}
          emptyText="Belum ada data keluarga"
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Anggota Keluarga">
        <FormKeluarga onSubmit={handleAdd} onCancel={() => setModalOpen(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Anggota Keluarga">
        <FormKeluarga
          defaultValues={editing}
          onSubmit={handleEdit}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </PageWrapper>
  )
}
