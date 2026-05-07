import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ROUTES } from './constants/routes'
import { ROLES } from './constants/roles'
import useAuthStore from './stores/authStore'
import { ErrorBoundary } from './components/layout/ErrorBoundary'

// Auth pages (no layout)
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import SetupOrganisasiPage from './pages/auth/SetupOrganisasiPage'
import ToastProvider from './components/ui/ToastProvider'

// Public page (no auth required)
import PublikLandingPage from './pages/PublikLandingPage'
import PublikPage from './pages/PublikPage'

// Protected pages
import ProtectedRoute from './components/layout/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import TransaksiPage from './pages/TransaksiPage'
import AnggotaPage from './pages/AnggotaPage'
import IuranPage from './pages/IuranPage'
import RABPage from './pages/RABPage'
import RAPPage from './pages/RAPPage'
import SuratPage from './pages/SuratPage'
import LaporanPage from './pages/LaporanPage'
import KelargaPage from './pages/KelargaPage'
import SettingsPage from './pages/SettingsPage'
import KategoriPage from './pages/KategoriPage'
import KategoriIuranPage from './pages/KategoriIuranPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [])

  return (
    <ErrorBoundary>
      <ToastProvider />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
          <Route path={ROUTES.SETUP} element={<SetupOrganisasiPage />} />
          <Route path={ROUTES.PUBLIK_LANDING} element={<PublikLandingPage />} />
          <Route path={ROUTES.PUBLIK} element={<PublikPage />} />

          {/* Protected routes */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TRANSAKSI}
            element={
              <ProtectedRoute>
                <TransaksiPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ANGGOTA}
            element={
              <ProtectedRoute>
                <AnggotaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.KELUARGA}
            element={
              <ProtectedRoute>
                <KelargaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.IURAN}
            element={
              <ProtectedRoute>
                <IuranPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.RAB}
            element={
              <ProtectedRoute>
                <RABPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.RAP}
            element={
              <ProtectedRoute>
                <RAPPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SURAT}
            element={
              <ProtectedRoute>
                <SuratPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.LAPORAN}
            element={
              <ProtectedRoute>
                <LaporanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <ProtectedRoute requiredRoles={[ROLES.KETUA, ROLES.BENDAHARA]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.KATEGORI}
            element={
              <ProtectedRoute>
                <KategoriPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.KATEGORI_IURAN}
            element={
              <ProtectedRoute>
                <KategoriIuranPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
