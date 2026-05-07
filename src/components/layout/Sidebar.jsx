import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Users, Wallet,
  FileText, Receipt, BarChart2, Settings2, LogOut, X, Home,
  Tag, ChevronDown, Check, Building2, User, ListChecks,
  FileCheck2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import useUIStore from '../../stores/uiStore'
import { ROUTES } from '../../constants/routes'

// Nav groups shown in ORGANISASI workspace
const orgNavGroups = [
  {
    items: [
      { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Master',
    items: [
      { to: ROUTES.KATEGORI, icon: Tag, label: 'Kategori' },
      { to: ROUTES.KATEGORI_IURAN, icon: ListChecks, label: 'Kategori Iuran' },
      { to: ROUTES.ANGGOTA, icon: Users, label: 'Anggota' },
      // { to: ROUTES.KELUARGA, icon: Home, label: 'Keluarga' },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { to: ROUTES.TRANSAKSI, icon: ArrowLeftRight, label: 'Transaksi' },
      { to: ROUTES.IURAN, icon: Wallet, label: 'Iuran' },
      { to: ROUTES.RAB, icon: FileText, label: 'RAB' },
      { to: ROUTES.RAP, icon: Receipt, label: 'RAP' },
      { to: ROUTES.SURAT, icon: FileCheck2, label: 'Surat' },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { to: ROUTES.LAPORAN, icon: BarChart2, label: 'Laporan' },
    ],
  },
]

// Nav groups shown in PERSONAL workspace
const personalNavGroups = [
  {
    items: [
      { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Master',
    items: [
      { to: ROUTES.KATEGORI, icon: Tag, label: 'Kategori' },
      { to: ROUTES.KELUARGA, icon: Home, label: 'Data Keluarga' },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { to: ROUTES.TRANSAKSI, icon: ArrowLeftRight, label: 'Transaksi' },
      { to: ROUTES.RAB, icon: FileText, label: 'RAB' },
      { to: ROUTES.RAP, icon: Receipt, label: 'RAP' },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { to: ROUTES.LAPORAN, icon: BarChart2, label: 'Laporan' },
    ],
  },
]

function WorkspaceSwitcher({ activeWorkspace, workspaces, onSwitch }) {
  const [open, setOpen] = useState(false)

  const isPersonal = activeWorkspace?.tipe === 'personal'

  return (
    <div className="relative px-5 py-3 border-b border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 group"
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isPersonal ? 'bg-accent/20' : 'bg-brand/30'}`}>
          {isPersonal
            ? <User size={13} className="text-accent" />
            : <Building2 size={13} className="text-white/70" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-white/40 text-[9px] uppercase tracking-widest">
            {isPersonal ? 'Personal' : 'Organisasi'}
          </p>
          <p className="text-white text-sm font-medium truncate mt-0.5">
            {activeWorkspace?.nama || '—'}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-white/40 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-[#0d3329]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden animate-fade-in">
          {workspaces.map((ws) => {
            const active = ws.id === activeWorkspace?.id
            const personal = ws.tipe === 'personal'
            return (
              <button
                key={ws.id}
                onClick={() => { onSwitch(ws.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${personal ? 'bg-accent/20' : 'bg-brand/30'}`}>
                  {personal
                    ? <User size={11} className="text-accent" />
                    : <Building2 size={11} className="text-white/60" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white/40 text-[9px] uppercase tracking-widest">
                    {personal ? 'Personal' : 'Organisasi'}
                  </p>
                  <p className="text-white text-xs font-medium truncate">{ws.nama}</p>
                </div>
                {active && <Check size={13} className="text-accent flex-shrink-0" />}
              </button>
            )
          })}
          <div className="border-t border-white/10">
            <NavLink
              to={ROUTES.SETUP}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white text-xs hover:bg-white/5 transition-colors"
            >
              + Tambah / Bergabung Organisasi
            </NavLink>
          </div>
        </div>
      )}

      {/* Click-outside overlay */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

export default function Sidebar() {
  const { activeWorkspace, workspaces, switchWorkspace, logout, isPersonalWorkspace, isBendahara, isKetua, canApproveJoinRequest, can } = useAuth()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  const canManageAnggota = isBendahara || isKetua || canApproveJoinRequest
  const canAccessSettings = isBendahara || isKetua
  const routeToResource = {
    [ROUTES.TRANSAKSI]: 'transaksi',
    [ROUTES.IURAN]: 'iuran',
    [ROUTES.RAB]: 'rab',
    [ROUTES.RAP]: 'rap',
    [ROUTES.SURAT]: 'surat',
  }

  const navGroups = (isPersonalWorkspace ? personalNavGroups : orgNavGroups).map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.to === ROUTES.ANGGOTA) return canManageAnggota
      const resource = routeToResource[item.to]
      if (!resource) return true
      return can(resource, 'read')
    }),
  })).filter((group) => group.items.length > 0)

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
          'fixed top-0 left-0 z-30 h-screen w-60 glass-sidebar flex flex-col',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kaswara logo" className="w-9 h-9 rounded-lg shrink-0" />
            <div>
              <p className="text-white font-bold text-[15px] leading-none">
                kas<span className="text-accent">wara</span>
              </p>
              <p className="text-white/40 text-[10px] mt-0.5">Kas Warga Negara</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          onSwitch={switchWorkspace}
        />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {group.label && (
                <p className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                  {group.label}
                </p>
              )}
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === ROUTES.DASHBOARD}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-200 rounded-lg mx-2 my-0.5',
                      isActive
                        ? 'bg-white/10 text-white font-semibold shadow-sm ring-1 ring-white/20'
                        : 'text-white/60 hover:text-white hover:bg-white/5',
                    ].join(' ')
                  }
                >
                  <Icon size={18} strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-white/10 px-5 py-3 space-y-1">
          {canAccessSettings && (
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
          )}
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
