import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import useUIStore from '../../stores/uiStore'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

function Toast({ toast }) {
  if (!toast) return null
  const icons = {
    success: <CheckCircle2 size={16} className="text-success flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-danger flex-shrink-0" />,
    info: <Info size={16} className="text-info flex-shrink-0" />,
  }
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 glass-card !bg-white/80 rounded-card shadow-lg px-4 py-3 text-sm text-charcoal max-w-sm animate-fade-in border border-white/60">
      {icons[toast.type] || icons.info}
      {toast.message}
    </div>
  )
}

/**
 * @param {object} props
 * @param {string} props.title - Page title shown in header
 * @param {React.ReactNode} props.children
 */
export default function PageWrapper({ title, children }) {
  const toast = useUIStore((s) => s.toast)

  return (
    <div className="flex h-screen bg-warm overflow-hidden relative">
      {/* Decorative background ornaments */}
      <div className="bg-ornament opacity-60">
        <div className="bg-blob w-[60vw] h-[60vw] bg-brand/15 -top-[20vw] -left-[10vw]" />
        <div className="bg-blob w-[50vw] h-[50vw] bg-accent/15 bottom-[10vw] -right-[10vw]" />
        <div className="bg-blob w-[40vw] h-[40vw] bg-success/10 top-1/2 left-1/3 -translate-y-1/2" />
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  )
}
