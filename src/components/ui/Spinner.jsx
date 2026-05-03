import React from 'react'
import { Loader2 } from 'lucide-react'

const sizeMap = {
    sm: 14,
    md: 18,
    lg: 24,
}

/**
 * @param {object} props
 * @param {'sm'|'md'|'lg'} props.size
 * @param {string} props.label
 */
export default function Spinner({ size = 'md', label = 'Memuat...', className = '' }) {
    return (
        <span className={["inline-flex items-center gap-2 text-stone", className].filter(Boolean).join(' ')} role="status" aria-live="polite">
            <Loader2 size={sizeMap[size] || sizeMap.md} className="animate-spin" aria-hidden="true" />
            <span className="text-sm">{label}</span>
        </span>
    )
}
