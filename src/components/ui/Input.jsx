import React, { forwardRef, useId } from 'react'

/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} props.error
 * @param {string} props.hint
 * @param {React.ReactNode} props.leftIcon
 * @param {React.ReactNode} props.rightIcon
 * @param {'input'|'textarea'} props.as
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    className = '',
    id,
    as = 'input',
    rows = 4,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const inputId = id || (label ? `${label.toLowerCase().replace(/\s+/g, '-')}-${generatedId}` : generatedId)
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  const sharedClassName = [
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
    .join(' ')

  const ControlTag = as === 'textarea' ? 'textarea' : 'input'

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
          <span className="absolute left-3 text-stone" aria-hidden="true">{leftIcon}</span>
        )}
        <ControlTag
          ref={ref}
          id={inputId}
          className={sharedClassName}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          rows={as === 'textarea' ? rows : undefined}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-stone">{rightIcon}</span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-stone">
          {hint}
        </p>
      )}
    </div>
  )
})

export default Input
