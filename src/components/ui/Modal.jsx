import React, { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {'sm'|'md'|'lg'} props.size
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  description,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocusRef,
}) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = ''
      return undefined
    }

    document.body.style.overflow = 'hidden'
    previousFocusRef.current = document.activeElement

    const focusTarget = initialFocusRef?.current || panelRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    focusTarget?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation()
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open, closeOnEscape, onClose, initialFocusRef])

  if (!open) return null

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative w-full ${widths[size]} max-h-[90vh] overflow-hidden bg-white rounded-modal shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="text-base font-semibold text-[#0f3d32] truncate">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="text-xs text-stone mt-1">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-stone hover:text-charcoal transition-colors rounded-full p-1 hover:bg-warm"
              aria-label="Tutup modal"
              type="button"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(90vh-72px)]">{children}</div>
      </div>
    </div>
  )
}
