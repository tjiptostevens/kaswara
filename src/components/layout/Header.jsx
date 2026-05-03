import React, { useState } from 'react'
import { Menu, Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import useUIStore from '../../stores/uiStore'
import useNotifikasiStore from '../../stores/notifikasiStore'
import NotifikasiDropdown from './NotifikasiDropdown'
import { ROLE_LABELS } from '../../constants/roles'

export default function Header({ title }) {
  const { profile } = useAuth()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const notifikasi = useNotifikasiStore((s) => s.notifikasi)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const unreadCount = notifikasi.filter((n) => !n.dibacaAt).length

  const handleBellClick = () => {
    setDropdownOpen((v) => !v)
  }

  return (
    <header className="sticky top-0 z-20 glass-header px-4 md:px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="text-stone hover:text-charcoal transition-colors lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-base font-semibold text-[#0f3d32]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative text-stone hover:text-charcoal transition-colors"
            aria-label="Notifikasi"
          >
            <Bell size={20} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {dropdownOpen && (
            <NotifikasiDropdown onClose={() => setDropdownOpen(false)} />
          )}
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center">
              <span className="text-brand text-xs font-bold">
                {profile.nama_lengkap?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-charcoal leading-none">{profile.nama_lengkap}</p>
              <p className="text-[10px] text-stone mt-0.5">{ROLE_LABELS[profile.role] || profile.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
