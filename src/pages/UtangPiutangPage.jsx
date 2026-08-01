import React, { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import { FormUtangPiutang, FormPembayaranUtang } from '../components/akunting/FormUtangPiutang'
import { Modal, Button, Badge } from '../components/ui'
import { Plus } from 'lucide-react'
import { useAkunting } from '../hooks/useAkunting'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatTanggalPendek } from '../lib/formatters'

export default function UtangPiutangPage() {
  const {
    utangPiutang,
    akunKeuangan,
    mataUang,
    simbolMataUang,
    orgId,
    userId,
    addUtangPiutang,
    bayarUtangPiutang,
    totalUtang,
    totalPiutang,
  } = useAkunting()
  const showToast = useUIStore((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [bayarOpen, setBayarOpen] = useState(null)
  const [tab, setTab] = useState('semua')

  const currencyOpts = { currency: mataUang, simbol: simbolMataUang }

  const filtered = utangPiutang.filter((u) => {
    if (tab === 'utang') return u.tipe === 'utang'
    if (tab === 'piutang') return u.tipe === 'piutang'
    return true
  })

  const handleAdd = async (data) => {
    const denganKas = !!data.dengan_kas
    const { dengan_kas, ...rest } = data
    const { error } = await addUtangPiutang(
      { ...rest, organisasi_id: orgId },
      userId,
      { denganKas }
    )
    if (error) {
      showToast('Gagal menyimpan: ' + error.message, 'error')
    } else {
      showToast('Berhasil disimpan!')
      setOpen(false)
    }
  }

  const handleBayar = async (data) => {
    const { error } = await bayarUtangPiutang(bayarOpen.id, data, userId)
    if (error) {
      showToast('Gagal: ' + error.message, 'error')
    } else {
      showToast(bayarOpen.tipe === 'utang' ? 'Pembayaran dicatat!' : 'Penerimaan dicatat!')
      setBayarOpen(null)
    }
  }

  return (
    <PageWrapper title="Hutang & Piutang">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f3d32]">Hutang & Piutang</h2>
            <p className="text-sm text-stone">Catat siapa yang berhutang dan kepada siapa Anda berhutang.</p>
          </div>
          <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
            Tambah
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-stone">Total Hutang</p>
            <p className="text-xl font-bold text-danger mt-1">{formatRupiah(totalUtang, currencyOpts)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-stone">Total Piutang</p>
            <p className="text-xl font-bold text-info mt-1">{formatRupiah(totalPiutang, currencyOpts)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'semua', label: 'Semua' },
            { id: 'utang', label: 'Hutang' },
            { id: 'piutang', label: 'Piutang' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-input text-sm border transition-colors ${
                tab === t.id
                  ? 'bg-brand text-white border-brand'
                  : 'border-border text-stone hover:bg-warm'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-stone">
              Belum ada data. Tekan Tambah untuk mencatat hutang atau piutang.
            </div>
          ) : (
            filtered.map((u) => {
              const sisa = Number(u.jumlah_awal) - Number(u.jumlah_terbayar)
              return (
                <div key={u.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={u.tipe === 'utang' ? 'danger' : 'info'}>
                        {u.tipe === 'utang' ? 'Hutang' : 'Piutang'}
                      </Badge>
                      <Badge tone={u.status === 'lunas' ? 'success' : 'default'}>
                        {u.status === 'lunas' ? 'Lunas' : 'Berjalan'}
                      </Badge>
                      <span className="text-xs text-stone">{formatTanggalPendek(u.tanggal)}</span>
                    </div>
                    <p className="font-semibold text-[#0f3d32] mt-1 truncate">{u.nama_pihak}</p>
                    {u.deskripsi && <p className="text-xs text-stone mt-0.5">{u.deskripsi}</p>}
                    <p className="text-sm mt-2">
                      Sisa{' '}
                      <span className="font-bold">{formatRupiah(sisa, currencyOpts)}</span>
                      <span className="text-stone text-xs ml-2">
                        dari {formatRupiah(Number(u.jumlah_awal), currencyOpts)}
                      </span>
                    </p>
                  </div>
                  {u.status === 'berjalan' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setBayarOpen(u)}
                    >
                      {u.tipe === 'utang' ? 'Bayar' : 'Terima'}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Catat Hutang / Piutang">
        <FormUtangPiutang
          akunKeuangan={akunKeuangan}
          onSubmit={handleAdd}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal
        open={!!bayarOpen}
        onClose={() => setBayarOpen(null)}
        title={bayarOpen?.tipe === 'utang' ? 'Bayar Hutang' : 'Terima Piutang'}
      >
        {bayarOpen && (
          <FormPembayaranUtang
            akunKeuangan={akunKeuangan}
            sisa={Number(bayarOpen.jumlah_awal) - Number(bayarOpen.jumlah_terbayar)}
            tipe={bayarOpen.tipe}
            onSubmit={handleBayar}
            onCancel={() => setBayarOpen(null)}
          />
        )}
      </Modal>
    </PageWrapper>
  )
}
