import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import TransaksiTable from '../components/transaksi/TransaksiTable'
import TransaksiStatusFlow from '../components/transaksi/TransaksiStatusFlow'
import FormTransaksi from '../components/transaksi/FormTransaksi'
import FilterTransaksi from '../components/transaksi/FilterTransaksi'
import { Modal, Button, Badge } from '../components/ui'
import { Plus, Printer, Send, XCircle, RefreshCw, Pencil } from 'lucide-react'
import { useTransaksi } from '../hooks/useTransaksi'
import useKasStore from '../stores/kasStore'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatTanggalPendek } from '../lib/formatters'
import { generateTransaksiPDF } from '../lib/pdfExport'

export default function TransaksiPage() {
  const { organisasi, profile, user, activeWorkspace, can, canForRecord } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const updateTransaksi = useKasStore((s) => s.updateTransaksi)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [filters, setFilters] = useState({})

  const { transaksi, kategori, loading, addTransaksi, deleteTransaksi,
          updateTransaksiStatus, amendTransaksi, refetch } = useTransaksi(filters)

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
  }

  const handleAdd = async (data) => {
    const { error } = await addTransaksi({
      ...data,
      organisasi_id: organisasi.id,
      dibuat_oleh: user?.id,
      dibuat_oleh_anggota_id: profile?.id ?? null,
    })
    if (error) {
      showToast('Gagal menyimpan transaksi: ' + error.message, 'error')
    } else {
      showToast('Transaksi berhasil disimpan!')
      setModalOpen(false)
    }
  }

  const handleEdit = async (data) => {
    const { error, data: updated } = await updateTransaksi(detail.id, data)
    if (error) {
      showToast('Gagal memperbarui transaksi: ' + error.message, 'error')
    } else {
      showToast('Transaksi berhasil diperbarui!')
      setEditOpen(false)
      setDetail(updated)
    }
  }

  const handleSubmit = async (id) => {
    const { error } = await updateTransaksiStatus(id, 'submitted', user?.id, organisasi?.id)
    if (error) {
      showToast('Gagal mengajukan transaksi: ' + error.message, 'error')
    } else {
      showToast('Transaksi berhasil diajukan!')
      setDetail(null)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan transaksi ini?')) return
    const { error } = await updateTransaksiStatus(id, 'cancelled', user?.id, organisasi?.id)
    if (error) {
      showToast('Gagal membatalkan: ' + error.message, 'error')
    } else {
      showToast('Transaksi dibatalkan')
      setDetail(null)
    }
  }

  const handleAmend = async (row) => {
    const { error } = await amendTransaksi(row, user?.id, organisasi?.id)
    if (error) {
      showToast('Gagal mengubah: ' + error.message, 'error')
    } else {
      showToast('Transaksi baru (amandemen) berhasil dibuat!')
      setDetail(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus transaksi yang dibatalkan ini?')) return
    const { error } = await deleteTransaksi(id)
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error')
    } else {
      showToast('Transaksi berhasil dihapus!')
    }
  }

  const handlePrint = () => {
    generateTransaksiPDF(transaksi, activeWorkspace?.nama || 'Kaswara')
  }

  const handlePrintDetail = (row) => {
    generateTransaksiPDF([row], activeWorkspace?.nama || 'Kaswara')
  }

  // Build defaultValues for edit form from the selected detail row
  const editDefaults = detail
    ? {
        tipe: detail.tipe,
        jumlah: Number(detail.jumlah),
        kategori_id: detail.kategori_id || '',
        keterangan: detail.keterangan || '',
        tanggal: detail.tanggal,
      }
    : undefined

  return (
    <PageWrapper title="Transaksi">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Daftar Transaksi</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              icon={<Printer size={16} />}
              onClick={handlePrint}
            >
              Cetak
            </Button>
            {can('transaksi', 'create') && (
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
        </div>

        <FilterTransaksi
          filters={filters}
          onChange={handleFilterChange}
          kategori={kategori}
        />

        <TransaksiTable
          data={transaksi}
          loading={loading}
          onView={(row) => setDetail(row)}
          onDelete={handleDelete}
          canDelete={can('transaksi', 'delete')}
        />
      </div>

      {/* Add Modal */}
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

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Transaksi"
      >
        {detail && (
          <FormTransaksi
            kategori={kategori}
            defaultValues={editDefaults}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail && !editOpen}
        onClose={() => setDetail(null)}
        title="Detail Transaksi"
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <TransaksiStatusFlow status={detail.status || 'draft'} />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone">Tanggal</p>
                <p className="font-medium text-charcoal">{formatTanggalPendek(detail.tanggal)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Tipe</p>
                <Badge status={detail.tipe} />
              </div>
              <div>
                <p className="text-xs text-stone">Kategori</p>
                <p className="font-medium text-charcoal">{detail.kategori_transaksi?.nama || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Jumlah</p>
                <p className={`font-bold font-mono ${detail.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                  {detail.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(detail.jumlah)}
                </p>
              </div>
              {detail.keterangan && (
                <div className="col-span-2">
                  <p className="text-xs text-stone">Keterangan</p>
                  <p className="font-medium text-charcoal">{detail.keterangan}</p>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-brand-light/50 border border-brand/5 rounded-input px-4 py-3 space-y-1 text-xs text-stone">
              <p className="font-bold text-brand-dark uppercase tracking-widest text-[9px] mb-2 opacity-60">Riwayat Transaksi</p>
              {detail.dibuat_oleh && (
                <p>Dibuat oleh: <span className="text-charcoal">{detail.anggota_organisasi?.nama_lengkap || detail.dibuat_oleh}</span></p>
              )}
              {detail.submitted_at && (
                <p>Diajukan pada: <span className="text-charcoal">{formatTanggalPendek(detail.submitted_at)}</span></p>
              )}
              {detail.cancelled_at && (
                <p>Dibatalkan pada: <span className="text-charcoal">{formatTanggalPendek(detail.cancelled_at)}</span></p>
              )}
              {detail.amended_at && (
                <p>Diamandemen pada: <span className="text-charcoal">{formatTanggalPendek(detail.amended_at)}</span></p>
              )}
              {detail.amended_from && (
                <p className="text-[#5B3FA8]">Amandemen dari transaksi sebelumnya</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                icon={<Printer size={15} />}
                onClick={() => handlePrintDetail(detail)}
              >
                Cetak
              </Button>
              {canForRecord('transaksi', 'update', detail, 'dibuat_oleh') && detail.status === 'draft' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={15} />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              )}
              {canForRecord('transaksi', 'submit', detail, 'dibuat_oleh') && detail.status === 'draft' && (
                <Button
                  variant="accent"
                  size="sm"
                  icon={<Send size={15} />}
                  onClick={() => handleSubmit(detail.id)}
                >
                  Ajukan
                </Button>
              )}
              {canForRecord('transaksi', 'cancel', detail, 'dibuat_oleh') && detail.status === 'submitted' && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<XCircle size={15} />}
                  onClick={() => handleCancel(detail.id)}
                >
                  Batalkan
                </Button>
              )}
              {canForRecord('transaksi', 'cancel', detail, 'dibuat_oleh') && detail.status === 'cancelled' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<RefreshCw size={15} />}
                    onClick={() => handleAmend(detail)}
                  >
                    Amandemen
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { setDetail(null); handleDelete(detail.id) }}
                  >
                    Hapus
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}

