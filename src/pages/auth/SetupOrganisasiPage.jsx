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
  const [tab, setTab] = useState('baru') // 'baru' | 'bergabung'

  return (
    <div className="min-h-screen bg-warm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#0f3d32] mb-1">Tambah Organisasi</h2>
          <p className="text-sm text-stone mb-5">
            Buat organisasi baru atau bergabung ke organisasi yang sudah ada.
          </p>

          {/* Tab switcher */}
          <div className="flex rounded-input border border-border overflow-hidden mb-6 text-sm">
            {[
              { key: 'baru', label: 'Buat Baru' },
              { key: 'bergabung', label: 'Bergabung dengan Kode' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 py-2 font-medium transition-colors ${
                  tab === key
                    ? 'bg-brand text-white'
                    : 'bg-white text-stone hover:text-charcoal'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'baru' ? (
            <BuatBaruForm user={user} initialize={initialize} navigate={navigate} />
          ) : (
            <BergabungForm user={user} initialize={initialize} navigate={navigate} />
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="text-sm text-stone hover:text-charcoal underline"
            >
              Lewati, gunakan mode personal saja
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Buat Organisasi Baru ───────────────────────────────────────────────

function BuatBaruForm({ user, initialize, navigate }) {
  const [form, setForm] = useState({ nama: '', tipe: 'rt_rw', alamat: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: org, error: orgError } = await supabase
      .from('organisasi')
      .insert({ nama: form.nama, tipe: form.tipe, alamat: form.alamat, created_by: user.id })
      .select()
      .single()

    if (orgError) { setError(orgError.message); setLoading(false); return }

    const { error: memberError } = await supabase.from('anggota_organisasi').insert({
      user_id: user.id,
      organisasi_id: org.id,
      role: 'bendahara',
      nama_lengkap: user.user_metadata?.full_name || user.email,
      aktif: true,
    })

    if (memberError) { setError(memberError.message); setLoading(false); return }

    await initialize()
    navigate(ROUTES.DASHBOARD)
  }

  return (
    <>
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
          Buat Organisasi
        </Button>
      </form>
    </>
  )
}

// ─── Tab: Bergabung dengan Kode Organisasi ────────────────────────────────────

function BergabungForm({ user, initialize, navigate }) {
  const [kode, setKode] = useState('')
  const [namaAnggota, setNamaAnggota] = useState(user?.user_metadata?.full_name || '')
  const [preview, setPreview] = useState(null) // organisasi preview setelah cari
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleCari = async (e) => {
    e.preventDefault()
    setError(null)
    setPreview(null)
    const trimmed = kode.trim()
    if (!trimmed) { setError('Masukkan kode organisasi terlebih dahulu.'); return }

    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('organisasi')
      .select('id, nama, tipe, alamat')
      .eq('id', trimmed)
      .single()
    setLoading(false)

    if (fetchErr || !data) {
      setError('Organisasi tidak ditemukan. Pastikan kode yang dimasukkan benar.')
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('anggota_organisasi')
      .select('id, aktif')
      .eq('user_id', user.id)
      .eq('organisasi_id', data.id)
      .maybeSingle()

    if (existing) {
      setError(
        existing.aktif
          ? 'Kamu sudah menjadi anggota organisasi ini.'
          : 'Kamu pernah terdaftar di organisasi ini namun dinonaktifkan. Hubungi bendahara/ketua.'
      )
      return
    }

    setPreview(data)
  }

  const handleGabung = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)

    const { error: joinErr } = await supabase.from('anggota_organisasi').insert({
      user_id: user.id,
      organisasi_id: preview.id,
      role: 'anggota',
      nama_lengkap: namaAnggota || user.email,
      aktif: true,
    })

    setLoading(false)
    if (joinErr) { setError(joinErr.message); return }

    setSuccess(true)
    await initialize()
    setTimeout(() => navigate(ROUTES.DASHBOARD), 1200)
  }

  const TIPE_LABEL = { rt_rw: 'RT/RW', keluarga: 'Keluarga', personal: 'Personal' }

  if (success) {
    return (
      <div className="text-center py-6 space-y-2">
        <div className="w-12 h-12 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto">
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-sm font-medium text-[#0f3d32]">Berhasil bergabung!</p>
        <p className="text-xs text-stone">Mengarahkan ke dashboard…</p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="bg-[#FCEBEB] border border-danger/20 rounded-input px-3 py-2 text-sm text-danger mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleCari} className="space-y-4">
        <Input
          label="Kode Organisasi"
          placeholder="Tempel UUID organisasi di sini"
          value={kode}
          onChange={(e) => { setKode(e.target.value); setPreview(null) }}
          hint="Minta kode dari bendahara atau ketua organisasi"
        />
        <Button type="submit" variant="secondary" fullWidth loading={loading && !preview}>
          Cari Organisasi
        </Button>
      </form>

      {/* Preview organisasi yang ditemukan */}
      {preview && (
        <div className="mt-5 space-y-4">
          <div className="border border-brand/30 rounded-card px-4 py-3 bg-[#E1F5EE] space-y-1">
            <p className="text-xs text-stone uppercase tracking-wide">Organisasi ditemukan</p>
            <p className="font-semibold text-[#0f3d32]">{preview.nama}</p>
            <p className="text-xs text-stone">{TIPE_LABEL[preview.tipe] || preview.tipe}{preview.alamat ? ` · ${preview.alamat}` : ''}</p>
          </div>

          <Input
            label="Nama Lengkap Kamu"
            placeholder="Nama yang akan ditampilkan ke anggota lain"
            value={namaAnggota}
            onChange={(e) => setNamaAnggota(e.target.value)}
            required
          />
          <p className="text-xs text-stone -mt-2">
            Kamu akan bergabung sebagai <strong>Anggota</strong>. Bendahara atau ketua dapat mengubah role-mu setelah bergabung.
          </p>

          <Button variant="primary" fullWidth loading={loading} onClick={handleGabung}>
            Bergabung ke Organisasi
          </Button>
        </div>
      )}
    </>
  )
}
