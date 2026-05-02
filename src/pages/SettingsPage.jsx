import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'

export default function SettingsPage() {
  const { organisasi, profile } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const [orgName, setOrgName] = useState(organisasi?.nama || '')
  const [orgAlamat, setOrgAlamat] = useState(organisasi?.alamat || '')
  const [saving, setSaving] = useState(false)

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

  return (
    <PageWrapper title="Pengaturan">
      <div className="max-w-lg space-y-6">
        <h2 className="text-lg font-bold text-[#0f3d32]">Pengaturan</h2>

        {/* Org settings */}
        <div className="bg-white border border-border rounded-card p-5">
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
                {organisasi?.tipe === 'rt_rw' ? 'RT/RW' : 'Keluarga'}
              </p>
            </div>
            <Button type="submit" variant="primary" loading={saving}>
              Simpan perubahan
            </Button>
          </form>
        </div>

        {/* Profile info */}
        {profile && (
          <div className="bg-white border border-border rounded-card p-5">
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
