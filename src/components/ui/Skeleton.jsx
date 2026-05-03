import React from 'react'

/**
 * @param {object} props
 * @param {number} props.lines
 * @param {string} props.className
 */
export default function Skeleton({ lines = 1, className = '' }) {
    const items = Array.from({ length: Math.max(lines, 1) })

    return (
        <div className={["space-y-2", className].filter(Boolean).join(' ')} aria-hidden="true">
            {items.map((_, idx) => (
                <div
                    key={idx}
                    className={[
                        'h-4 rounded bg-stone/20 animate-pulse',
                        idx === items.length - 1 && lines > 1 ? 'w-2/3' : 'w-full',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                />
            ))}
        </div>
    )
}
