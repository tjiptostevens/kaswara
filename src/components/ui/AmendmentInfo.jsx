import React from 'react'
import { formatTanggalPendek } from '../../lib/formatters'

/**
 * Display amendment information for amended records
 * @param {object} props
 * @param {string} [props.amended_at] - Amendment date (ISO string)
 * @param {string} [props.amended_from] - ID of original record
 * @param {string} [props.amended_by_label] - Label/name of amender
 * @returns {React.ReactNode}
 */
export default function AmendmentInfo({ amended_at, amended_from, amended_by_label }) {
    if (!amended_at && !amended_from) return null

    return (
        <div className="border-l-2 border-stone/20 pl-3 py-2 text-sm space-y-1">
            {amended_at && (
                <p className="text-charcoal">
                    <span className="font-medium">Diamandemen pada:</span>{' '}
                    <span className="font-mono text-stone">{formatTanggalPendek(amended_at)}</span>
                </p>
            )}
            {amended_from && (
                <p className="text-xs text-stone">
                    Amandemen dari: <span className="font-mono">{amended_from.slice(0, 8)}</span>
                </p>
            )}
            {amended_by_label && (
                <p className="text-xs text-stone">
                    Oleh: <span className="font-medium">{amended_by_label}</span>
                </p>
            )}
        </div>
    )
}
