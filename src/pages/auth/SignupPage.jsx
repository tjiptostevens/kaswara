import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function SignupPage() {
  const { signup, isAuthenticated, loading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setSubmitting(true)
    await signup(email, password)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background ornaments */}
      <div className="bg-ornament opacity-60">
        <div className="bg-blob w-[60vw] h-[60vw] bg-brand/15 -top-[20vw] -left-[10vw]" />
        <div className="bg-blob w-[50vw] h-[50vw] bg-accent/15 bottom-[10vw] -right-[10vw]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 bg-brand rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 28 28" fill="none" width="24" height="24">
              <rect x="4" y="4" width="8" height="8" rx="2" fill="#e8a020" />
              <rect x="16" y="4" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
              <rect x="4" y="16" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
              <rect x="16" y="16" width="8" height="8" rx="2" fill="rgba(255,255,255,0.25)" />
            </svg>
          </div>
          <div>
            <p className="text-[22px] font-bold text-brand leading-none">
              kas<span className="text-accent">wara</span>
            </p>
            <p className="text-[11px] text-stone mt-0.5">Kas Warga Negara</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0f3d32] mb-1">Daftar akun baru</h2>
          <p className="text-sm text-stone mb-6">
            Mulai kelola keuangan kas RT/RW dengan mudah.
          </p>

          {error && (
            <div className="bg-[#FCEBEB] border border-danger/20 rounded-input px-3 py-2 text-sm text-danger mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Kata Sandi"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="pointer-events-auto"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <Button type="submit" variant="primary" fullWidth loading={submitting}>
              Daftar
            </Button>
          </form>

          <p className="text-sm text-stone mt-6 text-center">
            Sudah punya akun? <Link to={ROUTES.LOGIN} className="text-brand font-medium hover:underline">Masuk di sini</Link>
          </p>
        </div>

        <p className="text-center text-xs text-stone mt-6">
          © {new Date().getFullYear()} Kaswara · Kas Warga Negara
        </p>
      </div>
    </div>
  )
}
