import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Users, Wallet,
  FileText, Receipt, BarChart2, Settings2, LogOut, X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import useUIStore from '../../stores/uiStore'
import { ROUTES } from '../../constants/routes'

const navItems = [
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { to: ROUTES.TRANSAKSI, icon: ArrowLeftRight, label: 'Transaksi' },
  { to: ROUTES.ANGGOTA, icon: Users, label: 'Anggota' },
  { to: ROUTES.IURAN, icon: Wallet, label: 'Iuran' },
  { to: ROUTES.RAB, icon: FileText, label: 'RAB' },
  { to: ROUTES.RAP, icon: Receipt, label: 'RAP' },
  { to: ROUTES.LAPORAN, icon: BarChart2, label: 'Laporan' },
]

export default function Sidebar() {
  const { organisasi, logout } = useAuth()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 z-30 h-screen w-60 bg-[#0f3d32] flex flex-col',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 28 28" fill="none" width="20" height="20">
                <rect x="4" y="4" width="8" height="8" rx="2" fill="#e8a020" />
                <rect x="16" y="4" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
                <rect x="4" y="16" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
                <rect x="16" y="16" width="8" height="8" rx="2" fill="rgba(255,255,255,0.25)" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-[15px] leading-none">
                kas<span className="text-accent">wara</span>
              </p>
              <p className="text-white/40 text-[10px] mt-0.5">Kas Warga Indonesia</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Org name */}
        {organisasi && (
          <div className="px-5 py-3 border-b border-white/10">
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Organisasi</p>
            <p className="text-white text-sm font-medium truncate mt-0.5">{organisasi.nama}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.DASHBOARD}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-brand/30 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                ].join(' ')
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/10 px-5 py-3 space-y-1">
          <NavLink
            to={ROUTES.SETTINGS}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-0 py-2 text-sm transition-colors',
                isActive ? 'text-white font-medium' : 'text-white/60 hover:text-white',
              ].join(' ')
            }
          >
            <Settings2 size={18} strokeWidth={1.5} />
            Pengaturan
          </NavLink>
          <button
            onClick={logout}
            className="flex items-center gap-3 py-2 text-sm text-white/60 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
