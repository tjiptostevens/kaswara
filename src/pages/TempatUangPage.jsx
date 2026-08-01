import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import { TempatUangGrid } from '../components/akunting/TempatUangGrid'
import FormAkunKeuangan from '../components/akunting/FormAkunKeuangan'
import { Modal, Button } from '../components/ui'
import { Plus } from 'lucide-react'
import { useAkunting } from '../hooks/useAkunting'
import useUIStore from '../stores/uiStore'

export default function TempatUangPage() {
  const {
    saldoAkun,
    akunKeuangan,
    totalUang,
    totalUtang,
    totalPiutang,
    mataUang,
    simbolMataUang,
    orgId,
    addAkunKeuangan,
    loading,
  } = useAkunting()
  const showToast = useUIStore((s) => s.showToast)
  const [open, setOpen] = useState(false)

  const handleAdd = async (data) => {
    const { error } = await addAkunKeuangan({
      ...data,
      organisasi_id: orgId,
      urutan: akunKeuangan.length + 1,
    })
    if (error) {
      showToast('Gagal menambah: ' + error.message, 'error')
    } else {
      showToast('Tempat uang ditambahkan!')
      setOpen(false)
    }
  }

  return (
    <PageWrapper title="Tempat Uang">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f3d32]">Tempat Uang</h2>
            <p className="text-sm text-stone">
              Lihat di mana uang Anda berada — Cash, Bank, E-Wallet, dan lainnya.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => setOpen(true)}
          >
            Tambah
          </Button>
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center text-stone text-sm">Memuat...</div>
        ) : (
          <TempatUangGrid
            saldoAkun={saldoAkun}
            totalUang={totalUang}
            totalUtang={totalUtang}
            totalPiutang={totalPiutang}
            currency={mataUang}
            simbol={simbolMataUang}
            onAdd={() => setOpen(true)}
          />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Tempat Uang">
        <FormAkunKeuangan onSubmit={handleAdd} onCancel={() => setOpen(false)} />
      </Modal>
    </PageWrapper>
  )
}
