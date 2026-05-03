import React, { useEffect, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { getPublikUrl } from '../constants/routes'

export default function SettingsPage() {
  const { organisasi, profile, isPersonalWorkspace, isBendahara, isKetua } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const [orgName, setOrgName] = useState(organisasi?.nama || '')
  const [orgAlamat, setOrgAlamat] = useState(organisasi?.alamat || '')
  const [publikSlugInput, setPublikSlugInput] = useState(organisasi?.publik_slug || '')
  const [publikSlugSaved, setPublikSlugSaved] = useState(organisasi?.publik_slug || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedPublikOriginal, setCopiedPublikOriginal] = useState(false)
  const [copiedPublikUnik, setCopiedPublikUnik] = useState(false)
  const [publikAktif, setPublikAktif] = useState(organisasi?.publik_aktif ?? false)
  const [savingPublik, setSavingPublik] = useState(false)
  const [savingPublikSlug, setSavingPublikSlug] = useState(false)

  useEffect(() => {
    setOrgName(organisasi?.nama || '')
    setOrgAlamat(organisasi?.alamat || '')
    setPublikSlugInput(organisasi?.publik_slug || '')
    setPublikSlugSaved(organisasi?.publik_slug || '')
    setPublikAktif(organisasi?.publik_aktif ?? false)
  }, [organisasi])

  const canManage = isBendahara || isKetua
  const publikUrlOriginal = organisasi?.id ? `${window.location.origin}${getPublikUrl(organisasi.id)}` : ''
  const publikUrlUnik = publikSlugSaved ? `${window.location.origin}${getPublikUrl(publikSlugSaved)}` : ''

  const normalizePublikSlug = (value) => {
    return (value || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSaveOrg = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('organisasi')
      .update({ nama: orgName, alamat: orgAlamat })
      .eq('id', organisasi?.id)
    setSaving(false)
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error')
    } else {
      showToast('Pengaturan berhasil disimpan!')
    }
  }

  const handleCopyKode = () => {
    if (!organisasi?.id) return
    navigator.clipboard.writeText(organisasi.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast('Kode organisasi disalin!')
  }

  const handleTogglePublik = async (aktif) => {
    if (!organisasi?.id || !canManage) return
    setSavingPublik(true)
    const { error } = await supabase
      .from('organisasi')
      .update({ publik_aktif: aktif })
      .eq('id', organisasi?.id)
    setSavingPublik(false)
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error')
    } else {
      setPublikAktif(aktif)
      showToast(aktif ? 'Halaman publik diaktifkan!' : 'Halaman publik dinonaktifkan.')
    }
  }

  const handleSavePublikSlug = async () => {
    if (!organisasi?.id || !canManage) return

    const slug = normalizePublikSlug(publikSlugInput)
    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)
    if (slug && isUuidLike) {
      showToast('Alias tidak boleh berformat UUID.', 'error')
      return
    }

    setSavingPublikSlug(true)

    const { error } = await supabase
      .from('organisasi')
      .update({ publik_slug: slug || null })
      .eq('id', organisasi.id)

    setSavingPublikSlug(false)

    if (error) {
      if (error.code === '23505') {
        showToast('Alias sudah digunakan organisasi lain. Coba alias lain.', 'error')
      } else {
        showToast('Gagal menyimpan alias: ' + error.message, 'error')
      }
      return
    }

    setPublikSlugInput(slug)
    setPublikSlugSaved(slug)
    showToast(slug ? 'Alias link publik berhasil disimpan!' : 'Alias link publik dihapus.')
  }

  const handleCopyPublikUrl = (url, setCopiedState) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedState(true)
    setTimeout(() => setCopiedState(false), 2000)
    showToast('Link publik disalin!')
  }

  return (
    <PageWrapper title="Pengaturan">
      <div className="max-w-lg space-y-6">
        <h2 className="text-lg font-bold text-[#0f3d32]">Pengaturan</h2>

        {/* Org settings */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[#0f3d32] mb-4">Informasi Organisasi</h3>
          <form onSubmit={handleSaveOrg} className="space-y-4">
            <Input
              label="Nama Organisasi"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <Input
              label="Alamat"
              value={orgAlamat}
              onChange={(e) => setOrgAlamat(e.target.value)}
            />
            <div>
              <p className="text-xs text-stone mb-1">Tipe Organisasi</p>
              <p className="text-sm font-medium text-charcoal">
                {organisasi?.tipe === 'rt_rw' ? 'RT/RW' : organisasi?.tipe === 'personal' ? 'Personal' : 'Keluarga'}
              </p>
            </div>
            <Button type="submit" variant="primary" loading={saving}>
              Simpan perubahan
            </Button>
          </form>
        </div>

        {/* Kode organisasi — hanya untuk workspace non-personal */}
        {!isPersonalWorkspace && organisasi?.id && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-[#0f3d32] mb-1">Kode Undangan Organisasi</h3>
            <p className="text-xs text-stone mb-3">
              Bagikan kode ini ke calon anggota agar mereka bisa bergabung melalui menu "Tambah Organisasi → Bergabung dengan Kode".
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#F8F7F3] border border-border rounded-input px-3 py-2 text-xs font-mono text-charcoal break-all select-all">
                {organisasi.id}
              </code>
              <button
                onClick={handleCopyKode}
                className={`flex-shrink-0 p-2 rounded-input border transition-colors ${copied
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-border text-stone hover:text-brand hover:border-brand'
                  }`}
                title="Salin kode"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Halaman publik transparansi — hanya untuk workspace non-personal */}
        {!isPersonalWorkspace && organisasi?.id && (
          <div className="glass-card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0f3d32] mb-1">Halaman Transparansi Publik</h3>
              <p className="text-xs text-stone">
                Aktifkan agar warga dapat melihat saldo dan riwayat transaksi tanpa perlu login.
              </p>
            </div>

            {/* Toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button
                type="button"
                disabled={savingPublik || !canManage}
                onClick={() => handleTogglePublik(!publikAktif)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 ${publikAktif ? 'bg-brand' : 'bg-border'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${publikAktif ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </button>
              <span className="text-sm text-charcoal">
                {publikAktif ? 'Aktif — halaman publik dapat diakses' : 'Nonaktif'}
              </span>
            </label>

            {/* Link publik (hanya tampil jika aktif) */}
            {publikAktif && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-stone font-medium mb-2">Link original (UUID):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#F8F7F3] border border-border rounded-input px-3 py-2 text-xs font-mono text-charcoal break-all">
                      {publikUrlOriginal}
                    </code>
                    <button
                      onClick={() => handleCopyPublikUrl(publikUrlOriginal, setCopiedPublikOriginal)}
                      className={`flex-shrink-0 p-2 rounded-input border transition-colors ${copiedPublikOriginal
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-border text-stone hover:text-brand hover:border-brand'
                        }`}
                      title="Salin link original"
                    >
                      {copiedPublikOriginal ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                    <a
                      href={publikUrlOriginal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 rounded-input border border-border text-stone hover:text-brand hover:border-brand transition-colors"
                      title="Buka link original"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    label="Alias Link Unik"
                    value={publikSlugInput}
                    onChange={(e) => setPublikSlugInput(e.target.value)}
                    placeholder="contoh: rt-05-mekarsari"
                    disabled={!canManage || savingPublikSlug}
                    hint="Gunakan huruf kecil, angka, dan tanda minus (-). Kosongkan untuk menonaktifkan link unik."
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSavePublikSlug}
                      loading={savingPublikSlug}
                      disabled={!canManage}
                    >
                      Simpan alias
                    </Button>
                  </div>
                </div>

                {publikUrlUnik ? (
                  <div>
                    <p className="text-xs text-stone font-medium mb-2">Link unik (alias):</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[#F8F7F3] border border-border rounded-input px-3 py-2 text-xs font-mono text-charcoal break-all">
                        {publikUrlUnik}
                      </code>
                      <button
                        onClick={() => handleCopyPublikUrl(publikUrlUnik, setCopiedPublikUnik)}
                        className={`flex-shrink-0 p-2 rounded-input border transition-colors ${copiedPublikUnik
                          ? 'border-brand bg-brand-light text-brand'
                          : 'border-border text-stone hover:text-brand hover:border-brand'
                          }`}
                        title="Salin link unik"
                      >
                        {copiedPublikUnik ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                      <a
                        href={publikUrlUnik}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-2 rounded-input border border-border text-stone hover:text-brand hover:border-brand transition-colors"
                        title="Buka link unik"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone">
                    Link unik belum diatur. Isi alias lalu klik "Simpan alias" untuk membuat link publik tambahan.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile info */}
        {profile && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-[#0f3d32] mb-4">Profil Anda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone">Nama</span>
                <span className="font-medium text-charcoal">{profile.nama_lengkap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone">Role</span>
                <span className="font-medium text-charcoal capitalize">{profile.role}</span>
              </div>
              {profile.nomor_anggota && (
                <div className="flex justify-between">
                  <span className="text-stone">No. Anggota</span>
                  <span className="font-medium font-mono text-charcoal">{profile.nomor_anggota}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
