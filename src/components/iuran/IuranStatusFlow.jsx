import React from 'react'
import Badge from '../ui/Badge'
import { ArrowRight } from 'lucide-react'

const MAIN_FLOW = ['draft', 'diajukan']
const TERMINAL_STATES = ['cancelled', 'amended']

const FLOW_LABELS = {
  draft: 'Draft',
  diajukan: 'Diajukan',
  cancelled: 'Dibatalkan',
  amended: 'Diubah',
}

/**
 * @param {object} props
 * @param {string} props.status
 */
export default function IuranStatusFlow({ status }) {
  if (TERMINAL_STATES.includes(status)) {
    return (
      <div className="flex items-center gap-2">
        <Badge status={status} label={FLOW_LABELS[status]} />
      </div>
    )
  }

  const currentIdx = MAIN_FLOW.indexOf(status)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {MAIN_FLOW.map((step, idx) => (
        <React.Fragment key={step}>
          <Badge
            status={idx <= currentIdx ? step : 'draft'}
            label={FLOW_LABELS[step] || step}
          />
          {idx < MAIN_FLOW.length - 1 && (
            <ArrowRight size={12} className="text-stone flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
