import React, { forwardRef } from 'react'

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.error
 * @param {string} props.hint
 * @param {React.ReactNode} props.leftIcon
 * @param {React.ReactNode} props.rightIcon
 */
const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightIcon, className = '', id, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-charcoal uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-stone pointer-events-none">{leftIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-charcoal',
            'placeholder:text-stone',
            'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
            'disabled:bg-warm disabled:cursor-not-allowed',
            error ? 'border-danger focus:ring-danger/40' : '',
            leftIcon ? 'pl-9' : '',
            rightIcon ? 'pr-9' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-stone pointer-events-none">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-stone">{hint}</p>}
    </div>
  )
})

export default Input
