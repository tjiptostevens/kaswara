import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-warm flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background ornaments */}
      <div className="bg-ornament opacity-60 pointer-events-none">
        <div className="bg-blob w-[60vw] h-[60vw] bg-brand/15 -top-[20vw] -left-[10vw]" />
        <div className="bg-blob w-[50vw] h-[50vw] bg-accent/15 bottom-[10vw] -right-[10vw]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in flex flex-col items-center text-center">
        <h1 className="text-9xl font-bold text-brand mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-[#0f3d32] mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-stone mb-8 max-w-sm">
          Maaf, halaman yang Anda tuju tidak ada atau telah dipindahkan.
        </p>
        <Link to={ROUTES.DASHBOARD}>
          <Button variant="primary">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  )
}
