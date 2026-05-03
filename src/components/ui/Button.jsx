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
