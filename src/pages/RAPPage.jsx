import React, { useState, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import RAPTable from '../components/rap/RAPTable'
import FormRAP from '../components/rap/FormRAP'
import FotoBuktiViewer from '../components/rap/FotoBuktiViewer'
import { Modal, Button } from '../components/ui'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRAB } from '../hooks/useRAB'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'

export default function RAPPage() {
  const { organisasi, isBendahara } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const { rab } = useRAB()
  const [rap, setRap] = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  const approvedRAB = rab.filter((r) => r.status === 'disetujui' || r.status === 'selesai')

  const fetchRAP = async () => {
    if (!organisasi?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('rap')
      .select('*, rap_foto(*), rab(nama_kegiatan)')
      .eq('organisasi_id', organisasi.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (!error) setRap(data || [])
  }

  useEffect(() => { fetchRAP() }, [organisasi?.id])

  const handleAdd = async (data) => {
    const { data: result, error } = await supabase
      .from('rap')
      .insert({ ...data, organisasi_id: organisasi.id })
      .select()
      .single()
    if (error) {
      showToast('Gagal menyimpan RAP: ' + error.message, 'error')
    } else {
      showToast('RAP berhasil disimpan!')
      setAddOpen(false)
      fetchRAP()
    }
  }

  return (
    <PageWrapper title="RAP">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Realisasi Anggaran Pengeluaran</h2>
          {isBendahara && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setAddOpen(true)}
            >
              Tambah RAP
            </Button>
          )}
        </div>
        <RAPTable data={rap} loading={loading} />
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Realisasi (RAP)">
        <FormRAP
          rabList={approvedRAB}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Foto Bukti"
      >
        {detail && <FotoBuktiViewer rapId={detail.id} fotos={detail.rap_foto || []} />}
      </Modal>
    </PageWrapper>
  )
}
