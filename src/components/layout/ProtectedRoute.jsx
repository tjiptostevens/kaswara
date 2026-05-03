import React from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'

/**
 * Wraps routes that require authentication.
 * Redirects to /login if not authenticated.
 * Personal workspace is created automatically on sign-up, so users
 * should always have at least one workspace after logging in.
 */
export default function ProtectedRoute({ children, requiredRoles }) {
  const { isAuthenticated, loading, role, activeWorkspace } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-warm">
        <div className="flex flex-col items-center gap-3 text-stone">
          <Loader2 size={32} className="animate-spin text-brand" />
          <p className="text-sm">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (requiredRoles && !requiredRoles.includes(role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}
