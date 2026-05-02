import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function SetupOrganisasiPage() {
  const { user, initialize } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    nama: '',
    tipe: 'rt_rw',
    alamat: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Create organisasi
    const { data: org, error: orgError } = await supabase
      .from('organisasi')
      .insert({ nama: form.nama, tipe: form.tipe, alamat: form.alamat, created_by: user.id })
      .select()
      .single()

    if (orgError) {
      setError(orgError.message)
      setLoading(false)
      return
    }

    // Create anggota_organisasi (as bendahara)
    const { error: memberError } = await supabase.from('anggota_organisasi').insert({
      user_id: user.id,
      organisasi_id: org.id,
      role: 'bendahara',
      nama_lengkap: user.user_metadata?.full_name || user.email,
      aktif: true,
    })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    await initialize()
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0f3d32] mb-1">Setup Organisasi</h2>
          <p className="text-sm text-stone mb-6">
            Lengkapi informasi organisasi kas Anda untuk memulai.
          </p>

          {error && (
            <div className="bg-[#FCEBEB] border border-danger/20 rounded-input px-3 py-2 text-sm text-danger mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Organisasi"
              placeholder="Contoh: RT 05 RW 02 Srondol"
              value={form.nama}
              onChange={(e) => handleChange('nama', e.target.value)}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
                Tipe Organisasi
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'rt_rw', label: 'RT/RW' },
                  { value: 'keluarga', label: 'Keluarga' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex-1 flex items-center justify-center gap-2 border rounded-input py-2 text-sm cursor-pointer transition-colors ${
                      form.tipe === opt.value
                        ? 'bg-brand-light border-brand text-brand font-medium'
                        : 'border-border text-stone hover:bg-warm'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipe"
                      value={opt.value}
                      checked={form.tipe === opt.value}
                      onChange={() => handleChange('tipe', opt.value)}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <Input
              label="Alamat"
              placeholder="Alamat lengkap (opsional)"
              value={form.alamat}
              onChange={(e) => handleChange('alamat', e.target.value)}
            />
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Mulai gunakan Kaswara
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
