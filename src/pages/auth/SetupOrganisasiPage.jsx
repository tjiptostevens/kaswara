import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
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
    <div className="min-h-screen bg-warm flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background ornaments */}
      <div className="bg-ornament opacity-60">
        <div className="bg-blob w-[60vw] h-[60vw] bg-brand/15 -top-[20vw] -left-[10vw]" />
        <div className="bg-blob w-[50vw] h-[50vw] bg-accent/15 bottom-[10vw] -right-[10vw]" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="glass-card p-6 shadow-sm">
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
                className={`flex-1 py-2.5 font-medium transition-all ${tab === key
                    ? 'bg-brand/90 backdrop-blur text-white shadow-md'
                    : 'bg-white/40 text-stone hover:text-charcoal hover:bg-white/60'
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
                className={`flex-1 flex items-center justify-center gap-2 border rounded-input py-2 text-sm cursor-pointer transition-colors ${form.tipe === opt.value
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
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const scannerRef = useRef(null)
  const qrRegionId = 'setup-organisasi-qr-reader-region'

  const startScanner = () => {
    setScanError(null)
    setScanning(true)
  }

  const stopScanner = () => {
    const instance = scannerRef.current
    scannerRef.current = null
    setScanning(false)
    if (instance) {
      try {
        if (instance.isScanning) {
          instance.stop().catch(() => { })
        }
      } catch (_) { }
    }
  }

  useEffect(() => {
    if (!scanning) return
    let html5QrCode
    const init = async () => {
      try {
        html5QrCode = new Html5Qrcode(qrRegionId)
        scannerRef.current = html5QrCode
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            const uuidMatch = decodedText.match(
              /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
            )
            const uuid = uuidMatch ? uuidMatch[0] : decodedText
            setKode(uuid)
            setPreview(null)
            stopScanner()
          },
          () => { }
        )
      } catch (err) {
        setScanError('Kamera tidak dapat diakses. Pastikan izin kamera diberikan.')
        setScanning(false)
      }
    }

    init()
    return () => {
      try {
        if (html5QrCode && html5QrCode.isScanning) html5QrCode.stop().catch(() => { })
      } catch (_) { }
    }
  }, [scanning])

  useEffect(() => {
    return () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => { })
        }
      } catch (_) { }
    }
  }, [])

  const handleCari = async (e) => {
    e.preventDefault()
    setError(null)
    setPreview(null)
    const trimmed = kode.trim()
    if (!trimmed) { setError('Masukkan UUID kode organisasi terlebih dahulu.'); return }

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

    const { data: pending } = await supabase
      .from('organisasi_join_request')
      .select('id')
      .eq('organisasi_id', preview.id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (pending) {
      setLoading(false)
      setError('Permintaan bergabung sudah dikirim dan menunggu persetujuan.')
      return
    }

    const { error: joinErr } = await supabase.from('organisasi_join_request').insert({
      user_id: user.id,
      organisasi_id: preview.id,
      nama_lengkap: namaAnggota || user.email,
      email: user.email,
      status: 'pending',
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
        <p className="text-sm font-medium text-[#0f3d32]">Permintaan bergabung berhasil dikirim!</p>
        <p className="text-xs text-stone">Menunggu persetujuan bendahara/ketua/delegasi. Mengarahkan ke dashboard…</p>
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
          onChange={(e) => {
            setKode(e.target.value)
            setPreview(null)
            setScanError(null)
          }}
          hint="Minta kode dari bendahara atau ketua organisasi"
        />
        {/* scan qr code */}
        <div className="my-6">
          <p className="text-sm text-stone mb-2">Atau pindai kode QR organisasi:</p>
          {!scanning ? (
            <button
              type="button"
              onClick={startScanner}
              className="w-full border-2 border-dashed border-stone rounded-lg p-6 flex flex-col items-center gap-2 hover:border-brand/60 hover:bg-brand/5 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-stone" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
              <span className="text-sm text-stone">Klik untuk membuka kamera &amp; pindai QR</span>
            </button>
          ) : (
            <div className="rounded-lg overflow-hidden border-2 border-brand/40">
              <div id={qrRegionId} className="w-full" />
              <button
                type="button"
                onClick={stopScanner}
                className="w-full py-2 text-sm text-stone bg-white/10 hover:bg-white/20 transition-colors"
              >
                Batalkan Pemindaian
              </button>
            </div>
          )}
          {scanError && (
            <p className="text-xs text-danger mt-2">{scanError}</p>
          )}
        </div>

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
