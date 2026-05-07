import React, { useEffect, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import RABTable from '../components/rab/RABTable'
import FormRAB from '../components/rab/FormRAB'
import RABStatusFlow from '../components/rab/RABStatusFlow'
import ApprovalButtons from '../components/rab/ApprovalButtons'
import { Modal, Button } from '../components/ui'
import { Plus, Printer, XCircle, RefreshCw, Pencil } from 'lucide-react'
import { useRAB } from '../hooks/useRAB'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import useKasStore from '../stores/kasStore'
import { formatRupiah, formatTanggalPendek, getTodayString } from '../lib/formatters'
import { generateRABPDF } from '../lib/pdfExport'

export default function RABPage() {
  const { activeWorkspace, user, profile, can, canForRecord } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const kategori = useKasStore((s) => s.kategori)
  const fetchKategori = useKasStore((s) => s.fetchKategori)
  const { rab, loading, addRAB, updateRAB, updateStatus, cancelRAB, amendRAB } = useRAB()

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (activeWorkspace?.id) fetchKategori(activeWorkspace.id)
  }, [activeWorkspace?.id])

  const handleAdd = async (data) => {
    const { error } = await addRAB(data)
    if (error) {
      showToast('Gagal menyimpan RAB: ' + error.message, 'error')
    } else {
      showToast('RAB berhasil disimpan!')
      setAddOpen(false)
    }
  }

  const handleEdit = async (data) => {
    const { error } = await updateRAB(detail.id, data)
    if (error) {
      showToast('Gagal memperbarui RAB: ' + error.message, 'error')
    } else {
      showToast('RAB berhasil diperbarui!')
      setEditOpen(false)
      setDetail(null)
    }
  }

  const handleSubmitRAB = async (id) => {
    const { error } = await updateStatus(id, 'diajukan')
    if (error) {
      showToast('Gagal mengajukan RAB: ' + error.message, 'error')
    } else {
      showToast('RAB berhasil diajukan!')
      setDetail(null)
    }
  }

  const handleApproval = async (id, status, catatan) => {
    const { error } = await updateStatus(id, status, catatan)
    if (error) {
      showToast('Gagal: ' + error.message, 'error')
    } else {
      showToast(status === 'disetujui' ? 'RAB disetujui!' : 'RAB ditolak')
      setDetail(null)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan RAB ini?')) return
    const { error } = await cancelRAB(id)
    if (error) {
      showToast('Gagal membatalkan: ' + error.message, 'error')
    } else {
      showToast('RAB dibatalkan')
      setDetail(null)
    }
  }

  const handleAmend = async (row) => {
    const { error } = await amendRAB(row)
    if (error) {
      showToast('Gagal membuat amandemen: ' + error.message, 'error')
    } else {
      showToast('RAB amandemen berhasil dibuat!')
      setDetail(null)
    }
  }

  const handlePrint = () => {
    generateRABPDF(rab, activeWorkspace?.nama || 'Kaswara')
  }

  const handlePrintDetail = (row) => {
    generateRABPDF([row], activeWorkspace?.nama || 'Kaswara')
  }

  const canApprove = can('rab', 'approve')
  const isOwnedByCurrentUser = (row) =>
    row?.diajukan_oleh === user?.id ||
    (row?.dibuat_oleh_anggota_id && row?.dibuat_oleh_anggota_id === profile?.id)

  // Build defaultValues for RAB edit form
  const editDefaults = detail
    ? {
        nama_kegiatan: detail.nama_kegiatan,
        kategori_id: detail.kategori_id || '',
        deskripsi: detail.deskripsi || '',
        tanggal_kegiatan: detail.tanggal_kegiatan,
        tanggal_pengajuan: detail.tanggal_pengajuan || getTodayString(),
        items: detail.rab_item?.map(({ nama_item, volume, satuan, harga_satuan }) => ({
          nama_item,
          volume: Number(volume),
          satuan,
          harga_satuan: Number(harga_satuan),
        })) || [{ nama_item: '', volume: 1, satuan: 'unit', harga_satuan: 0 }],
      }
    : undefined
  const canManageOwnDetail = detail ? canForRecord('rab', 'update', detail, 'diajukan_oleh') : false

  return (
    <PageWrapper title="RAB">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Rencana Anggaran Biaya</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              icon={<Printer size={16} />}
              onClick={handlePrint}
            >
              Cetak
            </Button>
            {can('rab', 'create') && (
              <Button
                variant="primary"
                size="md"
                icon={<Plus size={16} />}
                onClick={() => setAddOpen(true)}
              >
                Buat RAB
              </Button>
            )}
          </div>
        </div>

        <RABTable
          data={rab}
          loading={loading}
          onView={(row) => setDetail(row)}
        />
      </div>

      {/* Add RAB Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Buat RAB Baru" size="lg">
        <FormRAB kategori={kategori} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Edit RAB Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit RAB" size="lg">
        {detail && (
          <FormRAB
            defaultValues={editDefaults}
            kategori={kategori}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail && !editOpen}
        onClose={() => setDetail(null)}
        title={detail?.nama_kegiatan || 'Detail RAB'}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <RABStatusFlow status={detail.status} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone">Tanggal Kegiatan</p>
                <p className="font-medium text-charcoal">{formatTanggalPendek(detail.tanggal_kegiatan)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Kategori</p>
                <p className="font-medium text-charcoal">{detail.kategori_transaksi?.nama || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Total Anggaran</p>
                <p className="font-bold font-mono text-brand">{formatRupiah(detail.total_anggaran)}</p>
              </div>
            </div>
            {detail.deskripsi && (
              <div>
                <p className="text-xs text-stone mb-1">Deskripsi</p>
                <p className="text-sm text-charcoal">{detail.deskripsi}</p>
              </div>
            )}
            {detail.catatan_ketua && (
              <div className="bg-[#FAEEDA] rounded-input px-3 py-2 text-sm text-[#854F0B]">
                <p className="font-medium text-xs mb-0.5">Catatan</p>
                {detail.catatan_ketua}
              </div>
            )}

            {/* Items */}
            {detail.rab_item?.length > 0 && (
              <div>
                <p className="text-xs text-stone mb-2 uppercase tracking-wide font-medium">Item Anggaran</p>
                <div className="space-y-1">
                  {detail.rab_item.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-charcoal border-b border-border pb-1">
                      <span>{item.nama_item} ({item.volume} {item.satuan})</span>
                      <span className="font-mono">{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="bg-[#F8F7F3] rounded-input px-3 py-2 space-y-1 text-xs text-stone">
              <p className="font-medium text-charcoal uppercase tracking-wide text-xs mb-1">Riwayat</p>
              {(detail.anggota_organisasi?.nama_lengkap || detail.diajukan_oleh) && (
                <p>Dibuat/Diajukan oleh: <span className="text-charcoal">
                  {detail.anggota_organisasi?.nama_lengkap || detail.diajukan_oleh}
                </span></p>
              )}
              {detail.diajukan_at && (
                <p>Diajukan pada: <span className="text-charcoal">{formatTanggalPendek(detail.diajukan_at)}</span></p>
              )}
              {detail.disetujui_at && (
                <p>Disetujui pada: <span className="text-charcoal">{formatTanggalPendek(detail.disetujui_at)}</span></p>
              )}
              {detail.cancelled_at && (
                <p>Dibatalkan pada: <span className="text-charcoal">{formatTanggalPendek(detail.cancelled_at)}</span></p>
              )}
              {detail.amended_at && (
                <p>Diamandemen pada: <span className="text-charcoal">{formatTanggalPendek(detail.amended_at)}</span></p>
              )}
              {detail.amended_from && (
                <p className="text-[#5B3FA8]">Amandemen dari RAB sebelumnya</p>
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
              {canManageOwnDetail && detail.status === 'draft' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={15} />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              )}
              {canManageOwnDetail && detail.status === 'draft' && (
                <Button variant="accent" size="sm" onClick={() => handleSubmitRAB(detail.id)}>
                  Ajukan RAB
                </Button>
              )}
              {canManageOwnDetail && ['draft', 'diajukan'].includes(detail.status) && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<XCircle size={15} />}
                  onClick={() => handleCancel(detail.id)}
                >
                  Batalkan
                </Button>
              )}
              {canManageOwnDetail && detail.status === 'cancelled' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RefreshCw size={15} />}
                  onClick={() => handleAmend(detail)}
                >
                  Amandemen
                </Button>
              )}
            </div>

            {/* Approval */}
            {canApprove && detail.status === 'diajukan' && (
              <ApprovalButtons
                rabId={detail.id}
                onApprove={handleApproval}
                onReject={handleApproval}
              />
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
