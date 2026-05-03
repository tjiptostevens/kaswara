import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import RABTable from '../components/rab/RABTable'
import FormRAB from '../components/rab/FormRAB'
import RABStatusFlow from '../components/rab/RABStatusFlow'
import ApprovalButtons from '../components/rab/ApprovalButtons'
import { Modal, Button, Badge } from '../components/ui'
import { Plus } from 'lucide-react'
import { useRAB } from '../hooks/useRAB'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatTanggalPendek } from '../lib/formatters'

export default function RABPage() {
  const { isBendahara, isKetua, canManageRAB } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const { rab, loading, addRAB, updateStatus } = useRAB()

  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  const handleAdd = async (data) => {
    const { error } = await addRAB(data)
    if (error) {
      showToast('Gagal menyimpan RAB: ' + error.message, 'error')
    } else {
      showToast('RAB berhasil disimpan!')
      setAddOpen(false)
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

  return (
    <PageWrapper title="RAB">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Rencana Anggaran Biaya</h2>
          {canManageRAB && (
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

        <RABTable
          data={rab}
          loading={loading}
          onView={(row) => setDetail(row)}
        />
      </div>

      {/* Add RAB Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Buat RAB Baru" size="lg">
        <FormRAB onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
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
                <p className="font-medium text-xs mb-0.5">Catatan Ketua</p>
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
            {/* Actions */}
            {canManageRAB && detail.status === 'draft' && (
              <Button variant="accent" fullWidth onClick={() => handleSubmitRAB(detail.id)}>
                Ajukan RAB
              </Button>
            )}
            {isKetua && detail.status === 'diajukan' && (
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
