import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import AnggotaTable from '../components/anggota/AnggotaTable'
import FormAnggota from '../components/anggota/FormAnggota'
import { Modal, Button } from '../components/ui'
import { CheckCircle2, Plus, XCircle } from 'lucide-react'
import { useAnggota } from '../hooks/useAnggota'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { supabase } from '../lib/supabase'
import { formatTanggalPendek } from '../lib/formatters'
import { ROUTES } from '../constants/routes'

export default function AnggotaPage() {
  const { isBendahara, isKetua, canApproveJoinRequest, user, organisasi } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const { anggota, loading, addAnggota, updateAnggota, deleteAnggota } = useAnggota()

  const canManage = isBendahara || isKetua
  const canApproveRequest = canManage || canApproveJoinRequest
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [joinRequests, setJoinRequests] = useState([])
  const [requestLoading, setRequestLoading] = useState(false)

  const fetchJoinRequests = async () => {
    if (!organisasi?.id || !canApproveRequest) return
    setRequestLoading(true)
    const { data } = await supabase
      .from('organisasi_join_request')
      .select('*')
      .eq('organisasi_id', organisasi.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
    setJoinRequests(data || [])
    setRequestLoading(false)
  }

  useEffect(() => { fetchJoinRequests() }, [organisasi?.id, canApproveRequest])

  const handleAdd = async (data) => {
    const { error, existingUser } = await addAnggota({ ...data, organisasi_id: organisasi.id })
    if (error) {
      showToast('Gagal menambah anggota: ' + error.message, 'error')
    } else {
      showToast(existingUser ? 'Anggota berhasil ditambahkan ke organisasi' : 'Undangan berhasil dikirim ke email anggota!')
      setModalOpen(false)
    }
  }

  const handleEdit = async (data) => {
    const { error } = await updateAnggota(editing.id, data)
    if (error) {
      showToast('Gagal memperbarui: ' + error.message, 'error')
    } else {
      showToast('Data berhasil disimpan!')
      setEditing(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin mengeluarkan anggota ini dari organisasi? Tindakan ini tidak dapat dibatalkan.')) return
    const { error } = await deleteAnggota(id)
    if (error) {
      showToast('Gagal: ' + error.message, 'error')
    } else {
      showToast('Anggota berhasil dikeluarkan dari organisasi')
    }
  }

  const handleApproveRequest = async (request) => {
    const { data: existing } = await supabase
      .from('anggota_organisasi')
      .select('id')
      .eq('user_id', request.user_id)
      .eq('organisasi_id', request.organisasi_id)
      .maybeSingle()

    if (!existing) {
      const { error: addErr } = await supabase.from('anggota_organisasi').insert({
        user_id: request.user_id,
        organisasi_id: request.organisasi_id,
        role: 'anggota',
        nama_lengkap: request.nama_lengkap || request.email || 'Anggota',
        email: request.email || null,
        no_hp: request.no_hp || null,
        aktif: true,
      })
      if (addErr) {
        showToast('Gagal approve request: ' + addErr.message, 'error')
        return
      }
    }

    const { error } = await supabase
      .from('organisasi_join_request')
      .update({
        status: 'approved',
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', request.id)
    if (error) {
      showToast('Gagal update status request: ' + error.message, 'error')
      return
    }
    showToast('Permintaan bergabung disetujui')
    fetchJoinRequests()
  }

  const handleRejectRequest = async (request) => {
    const reason = window.prompt('Alasan penolakan (opsional):', '') || null
    const { error } = await supabase
      .from('organisasi_join_request')
      .update({
        status: 'rejected',
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', request.id)
    if (error) {
      showToast('Gagal menolak request: ' + error.message, 'error')
      return
    }
    showToast('Permintaan bergabung ditolak')
    fetchJoinRequests()
  }

  if (!canManage && !canApproveRequest) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return (
    <PageWrapper title="Anggota">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Manajemen Anggota</h2>
          {canManage && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setModalOpen(true)}
            >
              Tambah anggota
            </Button>
          )}
        </div>

        <AnggotaTable
          data={anggota}
          loading={loading}
          onEdit={(row) => setEditing(row)}
          onDelete={handleDelete}
          canManage={canManage}
        />

        {canApproveRequest && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-charcoal">Permintaan Bergabung Organisasi</h3>
            {requestLoading && <p className="text-xs text-stone">Memuat permintaan...</p>}
            {!requestLoading && joinRequests.length === 0 && (
              <p className="text-xs text-stone">Belum ada permintaan bergabung.</p>
            )}
            {joinRequests.map((req) => (
              <div key={req.id} className="rounded-input border border-border px-3 py-2 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-charcoal">{req.nama_lengkap || req.email}</p>
                  <p className="text-xs text-stone">{req.email || '—'}</p>
                  <p className="text-xs text-stone">Diajukan: {formatTanggalPendek(req.requested_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 size={14} />}
                    onClick={() => handleApproveRequest(req)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<XCircle size={14} />}
                    onClick={() => handleRejectRequest(req)}
                  >
                    Tolak
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Anggota">
        <FormAnggota onSubmit={handleAdd} onCancel={() => setModalOpen(false)} />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Anggota"
      >
        <FormAnggota
          defaultValues={editing}
          onSubmit={handleEdit}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </PageWrapper>
  )
}
