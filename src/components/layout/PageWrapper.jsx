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
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-white border border-border rounded-card shadow-lg px-4 py-3 text-sm text-charcoal max-w-sm animate-fade-in">
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
    <div className="flex h-screen bg-warm overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin">
          {children}
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  )
}
