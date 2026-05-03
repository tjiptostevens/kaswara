import React, { useEffect, useRef } from 'react'
import { CheckCheck, Trash2, BellOff } from 'lucide-react'
import useNotifikasiStore from '../../stores/notifikasiStore'
import EmptyState from '../ui/EmptyState'

const TIPE_STYLE = {
  success: 'bg-[#e6f4f1] border-l-2 border-brand',
  warning: 'bg-[#FAEEDA] border-l-2 border-accent',
  info: 'bg-[#F8F7F3] border-l-2 border-border',
}

function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  return `${Math.floor(hrs / 24)} hari lalu`
}

export default function NotifikasiDropdown({ onClose }) {
  const notifikasi = useNotifikasiStore((s) => s.notifikasi)
  const tandaiSemuaDibaca = useNotifikasiStore((s) => s.tandaiSemuaDibaca)
  const hapusSemua = useNotifikasiStore((s) => s.hapusSemua)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-card shadow-lg z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-[#0f3d32]">Notifikasi</p>
        <div className="flex items-center gap-2">
          {notifikasi.length > 0 && (
            <>
              <button
                onClick={tandaiSemuaDibaca}
                title="Tandai semua dibaca"
                className="text-stone hover:text-brand transition-colors"
              >
                <CheckCheck size={15} />
              </button>
              <button
                onClick={hapusSemua}
                title="Hapus semua"
                className="text-stone hover:text-danger transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifikasi.length === 0 ? (
          <div className="p-3">
            <EmptyState
              icon={<BellOff size={24} strokeWidth={1.5} />}
              title="Tidak ada notifikasi"
              className="border-0 bg-transparent py-8"
            />
          </div>
        ) : (
          notifikasi.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 text-sm border-b border-border last:border-0 ${TIPE_STYLE[n.tipe] || TIPE_STYLE.info} ${n.dibacaAt ? 'opacity-60' : ''}`}
            >
              <p className="text-charcoal leading-snug">{n.pesan}</p>
              <p className="text-xs text-stone mt-1">{formatRelative(n.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
