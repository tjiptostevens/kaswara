import React, { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Table from '../components/ui/Table'
import { Button, Modal } from '../components/ui'
import FormKategoriIuran from '../components/kategori/FormKategoriIuran'
import { KategoriTipeBadge, FREKUENSI_LABEL } from '../components/iuran/IuranTable'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah } from '../lib/formatters'

export default function KategoriIuranPage() {
  const { activeWorkspace, isBendahara } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchKategori = useCallback(async () => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('kategori_iuran')
      .select('*')
      .eq('organisasi_id', activeWorkspace.id)
      .order('nama')
    setLoading(false)
    if (!error) setKategori(data || [])
  }, [activeWorkspace?.id])

  useEffect(() => { fetchKategori() }, [fetchKategori])

  const handleAdd = async (data) => {
    const { error } = await supabase.from('kategori_iuran').insert({
      ...data,
      organisasi_id: activeWorkspace.id,
    })
    if (error) {
      showToast('Gagal menambah kategori: ' + error.message, 'error')
    } else {
      showToast('Kategori iuran berhasil ditambahkan!')
      setAddOpen(false)
      fetchKategori()
    }
  }

  const handleEdit = async (data) => {
    const { error } = await supabase
      .from('kategori_iuran')
      .update(data)
      .eq('id', editing.id)
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error')
    } else {
      showToast('Kategori iuran berhasil diperbarui!')
      setEditing(null)
      fetchKategori()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kategori ini? Data iuran yang terkait tidak akan terhapus.')) return
    const { error } = await supabase.from('kategori_iuran').delete().eq('id', id)
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error')
    } else {
      showToast('Kategori iuran berhasil dihapus')
      fetchKategori()
    }
  }

  const columns = [
    {
      key: 'nama',
      label: 'Nama Kategori',
      render: (row) => <span className="font-medium text-charcoal">{row.nama}</span>,
    },
    {
      key: 'tipe',
      label: 'Tipe',
      render: (row) => (
        <KategoriTipeBadge tipe={row.tipe} frekuensi={row.frekuensi} />
      ),
    },
    {
      key: 'frekuensi',
      label: 'Frekuensi',
      render: (row) =>
        row.tipe === 'wajib' && row.frekuensi
          ? <span className="text-sm text-charcoal">{FREKUENSI_LABEL[row.frekuensi] || row.frekuensi}</span>
          : <span className="text-stone text-xs">—</span>,
    },
    {
      key: 'nominal_default',
      label: 'Nominal Default',
      render: (row) =>
        row.nominal_default
          ? <span className="font-mono text-sm text-charcoal">{formatRupiah(row.nominal_default)}</span>
          : <span className="text-stone text-xs">—</span>,
    },
    {
      key: 'keterangan',
      label: 'Keterangan',
      render: (row) => row.keterangan || <span className="text-stone text-xs">—</span>,
    },
    ...(isBendahara
      ? [
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-1 justify-end">
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
      : []),
  ]

  return (
    <PageWrapper title="Kategori Iuran">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f3d32]">Kategori Iuran</h2>
            <p className="text-sm text-stone">
              Kelola tipe dan kategori iuran — sukarela, satu kali, atau wajib rutin
            </p>
          </div>
          {isBendahara && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setAddOpen(true)}
            >
              Tambah Kategori
            </Button>
          )}
        </div>

        <Table
          columns={columns}
          data={kategori}
          loading={loading}
          emptyText="Belum ada kategori iuran"
        />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Kategori Iuran">
        <FormKategoriIuran onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Kategori Iuran">
        <FormKategoriIuran
          defaultValues={editing}
          onSubmit={handleEdit}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </PageWrapper>
  )
}
