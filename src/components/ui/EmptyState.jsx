import React from 'react'

/**
 * @param {object} props
 * @param {React.ReactNode} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {React.ReactNode} props.action
 */
export default function EmptyState({
    icon,
    title = 'Belum ada data',
    description,
    action,
    className = '',
}) {
    return (
        <div
            className={[
                'glass-card !bg-white/40 px-4 py-8 text-center',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            role="status"
            aria-live="polite"
        >
            {icon && <div className="mx-auto mb-3 flex w-fit items-center justify-center text-stone">{icon}</div>}
            <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
            {description && <p className="mt-1 text-sm text-stone">{description}</p>}
            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    )
}
