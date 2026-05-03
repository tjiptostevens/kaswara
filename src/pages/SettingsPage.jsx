import React, { useState } from 'react'
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
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedPublik, setCopiedPublik] = useState(false)
  const [publikAktif, setPublikAktif] = useState(organisasi?.publik_aktif ?? false)
  const [savingPublik, setSavingPublik] = useState(false)

  const canManage = isBendahara || isKetua
  const publikUrl = organisasi?.id ? `${window.location.origin}${getPublikUrl(organisasi.id)}` : ''

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

  const handleCopyPublikUrl = () => {
    navigator.clipboard.writeText(publikUrl)
    setCopiedPublik(true)
    setTimeout(() => setCopiedPublik(false), 2000)
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
                className={`flex-shrink-0 p-2 rounded-input border transition-colors ${
                  copied
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
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 ${
                  publikAktif ? 'bg-brand' : 'bg-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    publikAktif ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-charcoal">
                {publikAktif ? 'Aktif — halaman publik dapat diakses' : 'Nonaktif'}
              </span>
            </label>

            {/* Link publik (hanya tampil jika aktif) */}
            {publikAktif && (
              <div className="space-y-2">
                <p className="text-xs text-stone font-medium">Link halaman publik:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#F8F7F3] border border-border rounded-input px-3 py-2 text-xs font-mono text-charcoal break-all">
                    {publikUrl}
                  </code>
                  <button
                    onClick={handleCopyPublikUrl}
                    className={`flex-shrink-0 p-2 rounded-input border transition-colors ${
                      copiedPublik
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-border text-stone hover:text-brand hover:border-brand'
                    }`}
                    title="Salin link"
                  >
                    {copiedPublik ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                  <a
                    href={publikUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-2 rounded-input border border-border text-stone hover:text-brand hover:border-brand transition-colors"
                    title="Buka halaman publik"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
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
