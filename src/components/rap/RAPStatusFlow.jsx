import React from 'react'
import Badge from '../ui/Badge'
import { ArrowRight } from 'lucide-react'

const FLOW = ['draft', 'submitted', 'approved']
const TERMINAL_LABELS = {
  cancelled: 'Dibatalkan',
  amended: 'Diubah',
  ditolak: 'Ditolak',
  selesai: 'Selesai',
}

/**
 * @param {object} props
 * @param {string} props.status
 */
export default function RAPStatusFlow({ status }) {
  if (TERMINAL_LABELS[status]) {
    return (
      <div className="flex items-center gap-2">
        <Badge status={status} label={TERMINAL_LABELS[status]} />
      </div>
    )
  }

  const currentIdx = FLOW.indexOf(status)
  const safeIdx = currentIdx < 0 ? 0 : currentIdx

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {FLOW.map((step, idx) => (
        <React.Fragment key={step}>
          <Badge
            status={idx <= safeIdx ? step : 'draft'}
            label={step === 'draft' ? 'Draft' : step === 'submitted' ? 'Diajukan' : 'Disetujui'}
          />
          {idx < FLOW.length - 1 && (
            <ArrowRight size={12} className="text-stone shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
