import React, { useState } from 'react'
import { Button } from '../ui'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

/**
 * @param {object} props
 * @param {string} props.rabId
 * @param {(id: string, status: string, catatan?: string) => Promise<void>} props.onApprove
 * @param {(id: string, status: string, catatan?: string) => Promise<void>} props.onReject
 */
export default function ApprovalButtons({ rabId, onApprove, onReject }) {
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(null)

  const handleApprove = async () => {
    setLoading('approve')
    try {
      await onApprove(rabId, 'disetujui', catatan)
      toast.success('RAB berhasil disetujui')
    } catch (error) {
      toast.error('Gagal menyetujui RAB')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      await onReject(rabId, 'ditolak', catatan)
      toast.success('RAB berhasil dibatalkan')
    } catch (error) {
      toast.error('Gagal membatalkan RAB')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Catatan Ketua (opsional)
        </label>
        <textarea
          rows={2}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Tambahkan catatan persetujuan atau pembatalan..."
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none transition-all"
        />
      </div>
      <div className="flex gap-3">
        <Button
          variant="danger"
          fullWidth
          loading={loading === 'reject'}
          icon={<XCircle size={16} />}
          onClick={handleReject}
        >
          Batalkan
        </Button>
        <Button
          variant="accent"
          fullWidth
          loading={loading === 'approve'}
          icon={<CheckCircle2 size={16} />}
          onClick={handleApprove}
        >
          Setujui
        </Button>
      </div>
    </div>
  )
}
