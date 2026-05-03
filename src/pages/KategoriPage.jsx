import React, { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Table from '../components/ui/Table'
import { Button, Modal } from '../components/ui'
import Badge from '../components/ui/Badge'
import FormKategori from '../components/kategori/FormKategori'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { DEFAULT_KATEGORI, DEFAULT_KATEGORI_PERSONAL } from '../constants/kategori'

const TIPE_LABELS = {
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  keduanya: 'Keduanya',
}

const TIPE_BADGE_CLASS = {
  pemasukan: 'bg-[#E1F5EE] text-success',
  pengeluaran: 'bg-[#FCEBEB] text-danger',
  keduanya: 'bg-warm text-stone',
}

export default function KategoriPage() {
  const { activeWorkspace, isBendahara, isPersonalWorkspace } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [kategori, setKategori] = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const fetchKategori = useCallback(async () => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('kategori_transaksi')
      .select('*')
      .eq('organisasi_id', activeWorkspace.id)
      .order('nama')
    setLoading(false)
    if (!error) setKategori(data || [])
  }, [activeWorkspace?.id])

  useEffect(() => {
    fetchKategori()
  }, [fetchKategori])

  // Seed default kategori if workspace has none
  const handleSeedDefaults = async () => {
    const defaults = isPersonalWorkspace ? DEFAULT_KATEGORI_PERSONAL : DEFAULT_KATEGORI
    const rows = defaults.map((k) => ({
      ...k,
      organisasi_id: activeWorkspace.id,
    }))
    const { error } = await supabase.from('kategori_transaksi').insert(rows)
    if (error) {
      showToast('Gagal memuat kategori default: ' + error.message, 'error')
    } else {
      showToast('Kategori default berhasil ditambahkan!')
      fetchKategori()
    }
  }

  const handleAdd = async (data) => {
    const { error } = await supabase.from('kategori_transaksi').insert({
      ...data,
      organisasi_id: activeWorkspace.id,
    })
    if (error) {
      showToast('Gagal menambah kategori: ' + error.message, 'error')
    } else {
      showToast('Kategori berhasil ditambahkan!')
      setAddOpen(false)
      fetchKategori()
    }
  }

  const handleEdit = async (data) => {
    const { error } = await supabase
      .from('kategori_transaksi')
      .update(data)
      .eq('id', editing.id)
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error')
    } else {
      showToast('Kategori berhasil diperbarui!')
      setEditing(null)
      fetchKategori()
    }
  }

  const handleDelete = async (id) => {
    const confirmMsg =
      'Yakin ingin menghapus kategori ini? ' +
      'Transaksi yang menggunakan kategori ini tidak akan terhapus.'
    if (!window.confirm(confirmMsg)) return
    const { error } = await supabase.from('kategori_transaksi').delete().eq('id', id)
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error')
    } else {
      showToast('Kategori berhasil dihapus')
      fetchKategori()
    }
  }

  const columns = [
    { key: 'nama', label: 'Nama Kategori' },
    {
      key: 'tipe',
      label: 'Tipe',
      render: (row) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TIPE_BADGE_CLASS[row.tipe]}`}>
          {TIPE_LABELS[row.tipe] || row.tipe}
        </span>
      ),
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
    <PageWrapper title="Kategori">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f3d32]">Kategori Transaksi</h2>
            <p className="text-sm text-stone">
              Kelola kategori untuk pemasukan dan pengeluaran di workspace ini
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

        {/* Empty state with seed option */}
        {!loading && kategori.length === 0 && isBendahara && (
          <div className="bg-white border border-border rounded-card p-6 text-center space-y-3">
            <p className="text-sm text-stone">Belum ada kategori. Mulai dengan kategori default?</p>
            <Button variant="ghost" size="sm" onClick={handleSeedDefaults}>
              Muat Kategori Default
            </Button>
          </div>
        )}

        <Table
          columns={columns}
          data={kategori}
          loading={loading}
          emptyText="Belum ada kategori"
        />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Kategori">
        <FormKategori onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Kategori">
        <FormKategori
          defaultValues={editing}
          onSubmit={handleEdit}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </PageWrapper>
  )
}
