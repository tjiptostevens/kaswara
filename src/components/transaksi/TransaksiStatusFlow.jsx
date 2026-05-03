import React from 'react'
import Badge from '../ui/Badge'
import { ArrowRight } from 'lucide-react'

const FLOW = ['draft', 'submitted', 'cancelled', 'amended']

/**
 * @param {object} props
 * @param {string} props.status
 */
export default function TransaksiStatusFlow({ status }) {
  const currentIdx = FLOW.indexOf(status)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {FLOW.map((step, idx) => (
        <React.Fragment key={step}>
          <Badge
            status={idx <= currentIdx ? step : 'draft'}
            label={step === 'draft' ? 'Draft' : step === 'submitted' ? 'Diajukan' : step === 'cancelled' ? 'Dibatalkan' : 'Diubah'}
          />
          {idx < FLOW.length - 1 && (
            <ArrowRight size={12} className="text-stone flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
