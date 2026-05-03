import React from 'react'
import { Toaster, toast, useToasterStore } from 'react-hot-toast'

export default function ToastProvider() {
  const { toasts } = useToasterStore()
  const activeToasts = toasts.filter((t) => t.visible).length

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-white)',
            color: 'var(--color-charcoal)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-accent)',
              secondary: 'var(--color-white)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'var(--color-white)',
            },
          },
        }}
      />
      {activeToasts > 2 && (
        <button
          onClick={() => toast.dismiss()}
          className="fixed top-[88px] right-4 z-[9999] bg-white border border-border shadow-md px-3 py-1.5 rounded-full text-xs font-medium text-charcoal hover:bg-warm transition-colors"
        >
          Tutup Semua Notifikasi
        </button>
      )}
    </>
  )
}
