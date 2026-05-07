import React, { useEffect, useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { Button, Modal, Input } from '../components/ui'
import { Plus, Send, Pencil, Trash2, XCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatTanggalPendek } from '../lib/formatters'

export default function SuratPage() {
  const { activeWorkspace, user, profile, isAnggota, isBendahara, isKetua } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ judul: '', keperluan: '', detail: '' })

  const canProcess = isBendahara || isKetua

  const fetchRows = async () => {
    if (!activeWorkspace?.id) return
    setLoading(true)
    let query = supabase
      .from('permintaan_surat')
      .select('*, anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
      .eq('organisasi_id', activeWorkspace.id)
      .order('created_at', { ascending: false })
    if (isAnggota) query = query.eq('dibuat_oleh', user?.id)
    const { data } = await query
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRows() }, [activeWorkspace?.id, isAnggota, user?.id])

  const resetForm = () => setForm({ judul: '', keperluan: '', detail: '' })

  const handleCreate = async () => {
    const { error } = await supabase.from('permintaan_surat').insert({
      organisasi_id: activeWorkspace.id,
      judul: form.judul,
      keperluan: form.keperluan,
      detail: form.detail || null,
      status: 'draft',
      dibuat_oleh: user?.id,
      dibuat_oleh_anggota_id: profile?.id ?? null,
    })
    if (error) {
      showToast('Gagal membuat permintaan surat: ' + error.message, 'error')
      return
    }
    showToast('Permintaan surat draft berhasil dibuat')
    setOpenForm(false)
    resetForm()
    fetchRows()
  }

  const handleUpdateDraft = async () => {
    const { error } = await supabase
      .from('permintaan_surat')
      .update({
        judul: form.judul,
        keperluan: form.keperluan,
        detail: form.detail || null,
      })
      .eq('id', detail.id)
    if (error) {
      showToast('Gagal mengubah draft: ' + error.message, 'error')
      return
    }
    showToast('Draft berhasil diperbarui')
    setDetail(null)
    fetchRows()
  }

  const handleDeleteDraft = async (row) => {
    if (!window.confirm('Hapus draft permintaan surat ini?')) return
    const { error } = await supabase.from('permintaan_surat').delete().eq('id', row.id)
    if (error) {
      showToast('Gagal menghapus draft: ' + error.message, 'error')
      return
    }
    showToast('Draft berhasil dihapus')
    setDetail(null)
    fetchRows()
  }

  const handleSubmit = async (row) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('permintaan_surat')
      .update({
        status: 'diajukan',
        diajukan_at: now,
        tanggal_pengajuan: now.split('T')[0],
      })
      .eq('id', row.id)
    if (error) {
      showToast('Gagal mengajukan surat: ' + error.message, 'error')
      return
    }
    showToast('Permintaan surat diajukan')
    setDetail(null)
    fetchRows()
  }

  const handleCancel = async (row) => {
    if (!window.confirm('Batalkan permintaan surat ini?')) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('permintaan_surat')
      .update({ status: 'cancelled', cancelled_at: now, cancelled_by: user?.id })
      .eq('id', row.id)
    if (error) {
      showToast('Gagal membatalkan: ' + error.message, 'error')
      return
    }
    showToast('Permintaan surat dibatalkan')
    setDetail(null)
    fetchRows()
  }

  const handleProcess = async (row, hasil) => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('permintaan_surat')
      .update({
        status: 'selesai',
        hasil_status: hasil,
        selesai_at: now,
        selesai_by: user?.id,
      })
      .eq('id', row.id)
    if (error) {
      showToast('Gagal memproses surat: ' + error.message, 'error')
      return
    }
    showToast(hasil === 'approve' ? 'Permintaan surat disetujui' : 'Permintaan surat ditolak')
    setDetail(null)
    fetchRows()
  }

  const columns = [
    { key: 'judul', label: 'Judul Surat' },
    { key: 'keperluan', label: 'Keperluan' },
    {
      key: 'pemohon',
      label: 'Pemohon',
      render: (row) => row.anggota_organisasi?.nama_lengkap || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'hasil_status',
      label: 'Hasil',
      render: (row) =>
        row.hasil_status
          ? <Badge status={row.hasil_status === 'approve' ? 'approved' : 'ditolak'} label={row.hasil_status === 'approve' ? 'Approve' : 'Reject'} />
          : '—',
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => {
            setForm({ judul: row.judul || '', keperluan: row.keperluan || '', detail: row.detail || '' })
            setDetail(row)
          }}
          className="text-xs text-brand hover:underline"
        >
          Detail
        </button>
      ),
    },
  ]

  const isOwner = (row) => row?.dibuat_oleh === user?.id
  const editableDraft = detail && detail.status === 'draft' && isOwner(detail)
  const cancellableByMember = detail && ['draft', 'diajukan'].includes(detail.status) && isOwner(detail)
  const processable = detail && detail.status === 'diajukan' && canProcess

  return (
    <PageWrapper title="Permintaan Surat">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Permintaan Surat</h2>
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => { resetForm(); setOpenForm(true) }}>
            Buat Draft
          </Button>
        </div>
        <Table
          caption="Daftar permintaan surat"
          columns={columns}
          data={rows}
          loading={loading}
          loadingText="Memuat permintaan surat..."
          emptyText="Belum ada permintaan surat"
        />
      </div>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title="Buat Draft Permintaan Surat">
        <div className="space-y-4">
          <Input label="Judul Surat" value={form.judul} onChange={(e) => setForm((s) => ({ ...s, judul: e.target.value }))} />
          <Input label="Keperluan" value={form.keperluan} onChange={(e) => setForm((s) => ({ ...s, keperluan: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Detail</label>
            <textarea
              rows={3}
              className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm"
              value={form.detail}
              onChange={(e) => setForm((s) => ({ ...s, detail: e.target.value }))}
              placeholder="Opsional"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => setOpenForm(false)}>Batal</Button>
            <Button variant="primary" fullWidth onClick={handleCreate} disabled={!form.judul || !form.keperluan}>Simpan Draft</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.judul || 'Detail Permintaan Surat'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone">Status</p>
                <Badge status={detail.status} />
              </div>
              <div>
                <p className="text-xs text-stone">Hasil</p>
                {detail.hasil_status
                  ? <Badge status={detail.hasil_status === 'approve' ? 'approved' : 'ditolak'} label={detail.hasil_status === 'approve' ? 'Approve' : 'Reject'} />
                  : <p className="font-medium text-charcoal">—</p>}
              </div>
              <div className="col-span-2">
                <p className="text-xs text-stone">Keperluan</p>
                <p className="font-medium text-charcoal">{detail.keperluan}</p>
              </div>
              {detail.detail && (
                <div className="col-span-2">
                  <p className="text-xs text-stone">Detail</p>
                  <p className="font-medium text-charcoal">{detail.detail}</p>
                </div>
              )}
              {detail.diajukan_at && (
                <div>
                  <p className="text-xs text-stone">Diajukan</p>
                  <p className="font-medium text-charcoal">{formatTanggalPendek(detail.diajukan_at)}</p>
                </div>
              )}
              {detail.selesai_at && (
                <div>
                  <p className="text-xs text-stone">Selesai</p>
                  <p className="font-medium text-charcoal">{formatTanggalPendek(detail.selesai_at)}</p>
                </div>
              )}
            </div>

            {editableDraft && (
              <div className="space-y-3 rounded-input border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-stone font-medium">Edit Draft</p>
                <Input label="Judul Surat" value={form.judul} onChange={(e) => setForm((s) => ({ ...s, judul: e.target.value }))} />
                <Input label="Keperluan" value={form.keperluan} onChange={(e) => setForm((s) => ({ ...s, keperluan: e.target.value }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-charcoal uppercase tracking-wide">Detail</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm"
                    value={form.detail}
                    onChange={(e) => setForm((s) => ({ ...s, detail: e.target.value }))}
                    placeholder="Opsional"
                  />
                </div>
                <Button variant="primary" size="sm" icon={<Pencil size={14} />} onClick={handleUpdateDraft}>Simpan Perubahan Draft</Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {editableDraft && (
                <>
                  <Button variant="accent" size="sm" icon={<Send size={14} />} onClick={() => handleSubmit(detail)}>
                    Ajukan
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDeleteDraft(detail)}>
                    Hapus Draft
                  </Button>
                </>
              )}
              {cancellableByMember && (
                <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => handleCancel(detail)}>
                  Batalkan
                </Button>
              )}
              {processable && (
                <>
                  <Button variant="primary" size="sm" icon={<CheckCircle2 size={14} />} onClick={() => handleProcess(detail, 'approve')}>
                    Selesai (Approve)
                  </Button>
                  <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={() => handleProcess(detail, 'reject')}>
                    Selesai (Reject)
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
