import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import TransaksiTable from '../components/transaksi/TransaksiTable'
import FormTransaksi from '../components/transaksi/FormTransaksi'
import FilterTransaksi from '../components/transaksi/FilterTransaksi'
import { Modal, Button } from '../components/ui'
import { Plus } from 'lucide-react'
import { useTransaksi } from '../hooks/useTransaksi'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'

export default function TransaksiPage() {
  const { isBendahara, organisasi, profile } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [filters, setFilters] = useState({})

  const { transaksi, kategori, loading, addTransaksi, deleteTransaksi, refetch } =
    useTransaksi(filters)

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
  }

  const handleAdd = async (data) => {
    const { error } = await addTransaksi({
      ...data,
      organisasi_id: organisasi.id,
      dibuat_oleh_anggota_id: profile?.id,
    })
    if (error) {
      showToast('Gagal menyimpan transaksi: ' + error.message, 'error')
    } else {
      showToast('Transaksi berhasil disimpan!')
      setModalOpen(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return
    const { error } = await deleteTransaksi(id)
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error')
    } else {
      showToast('Transaksi berhasil dihapus!')
    }
  }

  return (
    <PageWrapper title="Transaksi">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Daftar Transaksi</h2>
          {isBendahara && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setModalOpen(true)}
            >
              Tambah transaksi
            </Button>
          )}
        </div>

        <FilterTransaksi
          filters={filters}
          onChange={handleFilterChange}
          kategori={kategori}
        />

        <TransaksiTable
          data={transaksi}
          loading={loading}
          onDelete={handleDelete}
          canDelete={isBendahara}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Transaksi"
      >
        <FormTransaksi
          kategori={kategori}
          onSubmit={handleAdd}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </PageWrapper>
  )
}
