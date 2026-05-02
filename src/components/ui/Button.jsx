import React from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-brand text-white hover:bg-brand-dark active:bg-brand-dark',
  secondary: 'bg-transparent text-brand border border-[1.5px] border-brand hover:bg-brand-light',
  accent: 'bg-accent text-[#0f3d32] font-semibold hover:bg-amber-500',
  ghost: 'bg-transparent text-charcoal border border-[0.5px] border-border hover:bg-warm',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1',
  md: 'text-sm px-4 py-2 gap-1.5',
  lg: 'text-base px-5 py-2.5 gap-2',
}

/**
 * @param {object} props
 * @param {'primary'|'secondary'|'accent'|'ghost'|'danger'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {boolean} props.loading
 * @param {boolean} props.fullWidth
 * @param {React.ReactNode} props.icon
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-input font-medium',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
    </button>
  )
}
