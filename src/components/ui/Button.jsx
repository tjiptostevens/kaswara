import React from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-brand text-white shadow-md shadow-brand/20 hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0',
  secondary: 'bg-white text-brand border border-brand/20 shadow-sm hover:bg-brand-light hover:border-brand/40 hover:-translate-y-0.5 active:translate-y-0',
  accent: 'bg-accent text-[#0f3d32] font-semibold shadow-md shadow-accent/20 hover:bg-amber-500 hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'bg-white/40 backdrop-blur-sm text-charcoal border border-border/50 hover:bg-white/60 hover:border-border hover:-translate-y-0.5 active:translate-y-0',
  danger: 'bg-danger text-white shadow-md shadow-danger/20 hover:bg-red-600 hover:shadow-lg hover:shadow-danger/30 hover:-translate-y-0.5 active:translate-y-0',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1',
  md: 'text-[13px] px-4 py-2 gap-2',
  lg: 'text-sm px-6 py-2.5 gap-2.5',
}

/**
 * @param {object} props
 * @param {'primary'|'secondary'|'accent'|'ghost'|'danger'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {boolean} props.loading
 * @param {string} props.loadingText
 * @param {boolean} props.fullWidth
 * @param {React.ReactNode} props.icon
 * @param {React.ReactNode} props.leftIcon
 * @param {React.ReactNode} props.rightIcon
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  icon,
  leftIcon,
  rightIcon,
  iconOnly = false,
  children,
  className = '',
  disabled,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}) {
  const resolvedLeftIcon = leftIcon ?? icon
  const isDisabled = disabled || loading

  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-input font-medium',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        iconOnly ? 'aspect-square px-0' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={iconOnly ? ariaLabel : undefined}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden="true" />}
      {!loading && resolvedLeftIcon && (
        <span className="flex-shrink-0" aria-hidden="true">{resolvedLeftIcon}</span>
      )}
      {children && <span>{loading && loadingText ? loadingText : children}</span>}
      {!loading && rightIcon && (
        <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  )
}
