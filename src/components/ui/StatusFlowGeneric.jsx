import React from 'react'
import Badge from './Badge'
import { ArrowRight } from 'lucide-react'

/**
 * Generic status flow component for any entity with multi-step workflow
 * @param {object} props
 * @param {string} props.status - Current status
 * @param {Array<string>} props.mainFlow - Linear workflow steps (draft → submitted → approved → completed)
 * @param {Array<string>} [props.terminalStates] - Terminal states (cancelled, amended, ditolak)
 * @param {Object<string, string>} props.labels - Status → label mapping
 * @returns {React.ReactNode}
 */
export default function StatusFlow({ status, mainFlow, terminalStates = [], labels = {} }) {
    // If current status is terminal, show only that badge
    if (terminalStates.includes(status)) {
        return (
            <div className="flex items-center gap-2">
                <Badge status={status} label={labels[status] || status} />
            </div>
        )
    }

    const currentIdx = mainFlow.indexOf(status)

    return (
        <div className="flex items-center gap-1 flex-wrap">
            {mainFlow.map((step, idx) => (
                <React.Fragment key={step}>
                    <Badge
                        status={idx <= currentIdx ? step : 'draft'}
                        label={labels[step] || step.charAt(0).toUpperCase() + step.slice(1)}
                    />
                    {idx < mainFlow.length - 1 && (
                        <ArrowRight size={12} className="text-stone flex-shrink-0" />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}
