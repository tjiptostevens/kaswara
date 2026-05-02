import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import AnggotaTable from '../components/anggota/AnggotaTable'
import FormAnggota from '../components/anggota/FormAnggota'
import { Modal, Button } from '../components/ui'
import { Plus } from 'lucide-react'
import { useAnggota } from '../hooks/useAnggota'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'

export default function AnggotaPage() {
  const { isBendahara, organisasi } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const { anggota, loading, addAnggota, updateAnggota, deleteAnggota } = useAnggota()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const handleAdd = async (data) => {
    const { error } = await addAnggota({ ...data, organisasi_id: organisasi.id })
    if (error) {
      showToast('Gagal menambah anggota: ' + error.message, 'error')
    } else {
      showToast('Anggota berhasil ditambahkan!')
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
    if (!window.confirm('Yakin ingin menonaktifkan anggota ini?')) return
    const { error } = await deleteAnggota(id)
    if (error) {
      showToast('Gagal: ' + error.message, 'error')
    } else {
      showToast('Anggota berhasil dinonaktifkan')
    }
  }

  return (
    <PageWrapper title="Anggota">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Manajemen Anggota</h2>
          {isBendahara && (
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
          canManage={isBendahara}
        />
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
