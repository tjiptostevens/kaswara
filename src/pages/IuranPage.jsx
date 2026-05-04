import React, { useState, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import IuranTable, { KategoriTipeBadge, FREKUENSI_LABEL } from '../components/iuran/IuranTable'
import IuranStatusFlow from '../components/iuran/IuranStatusFlow'
import FormIuran from '../components/iuran/FormIuran'
import { Modal, Button, Badge } from '../components/ui'
import { Plus, Printer, Send, XCircle, RefreshCw, Pencil, CheckCircle2, Star, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useIuran } from '../hooks/useIuran'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatPeriode, formatTanggalPendek } from '../lib/formatters'
import { generateIuranPDF } from '../lib/pdfExport'

/**
 * Shows which members have/haven't paid a one-time (sekali) iuran.
 */
function SekaliIuranPanel({ kategori, iuranList, anggotaList }) {
  const rows = iuranList.filter((i) => i.kategori_iuran_id === kategori.id)
  const paidIds = new Set(rows.filter((i) => i.status === 'diajukan').map((i) => i.anggota_id))

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Star size={14} className="fill-[#e8a020] stroke-[#e8a020]" />
        <span className="font-semibold text-charcoal text-sm">{kategori.nama}</span>
        <span className="text-xs text-stone">
          — {paidIds.size}/{anggotaList.length} sudah bayar
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {anggotaList.map((a) => {
          const paid = paidIds.has(a.id)
          return (
            <div
              key={a.id}
              title={paid ? `${a.nama_lengkap} — Lunas` : `${a.nama_lengkap} — Belum bayar`}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
                paid
                  ? 'bg-[#E1F5EE] border-[#B2EAD3] text-[#0F6E56]'
                  : 'bg-[#FCEBEB] border-[#F7CACA] text-[#A32D2D]'
              }`}
            >
              {paid ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              {a.nama_lengkap}
            </div>
          )
        })}
        {anggotaList.length === 0 && (
          <p className="text-xs text-stone">Belum ada anggota</p>
        )}
      </div>
    </div>
  )
}

export default function IuranPage() {
  const { activeWorkspace, isBendahara } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const {
    iuran, loading, fetchIuran,
    addIuran, updateIuran, ajukanIuran, batalkanIuran, amendIuran,
  } = useIuran()

  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [anggotaList, setAnggotaList] = useState([])
  const [kategoriList, setKategoriList] = useState([])

  useEffect(() => {
    if (!activeWorkspace?.id) return
    supabase
      .from('anggota_organisasi')
      .select('id, nama_lengkap, nomor_anggota')
      .eq('organisasi_id', activeWorkspace.id)
      .eq('aktif', true)
      .order('nama_lengkap')
      .then(({ data }) => setAnggotaList(data || []))

    supabase
      .from('kategori_iuran')
      .select('*')
      .eq('organisasi_id', activeWorkspace.id)
      .order('nama')
      .then(({ data }) => setKategoriList(data || []))
  }, [activeWorkspace?.id])

  const handleAdd = async (data) => {
    const { error } = await addIuran(data)
    if (error) {
      showToast('Gagal menyimpan iuran: ' + error.message, 'error')
    } else {
      showToast('Iuran berhasil disimpan!')
      setAddOpen(false)
    }
  }

  const handleEdit = async (data) => {
    const { error } = await updateIuran(detail.id, data)
    if (error) {
      showToast('Gagal memperbarui iuran: ' + error.message, 'error')
    } else {
      showToast('Iuran berhasil diperbarui!')
      setEditOpen(false)
      fetchIuran()
    }
  }

  const handleAjukan = async () => {
    const { error } = await ajukanIuran(detail)
    if (error) {
      showToast('Gagal mengajukan iuran: ' + error.message, 'error')
    } else {
      showToast('Iuran berhasil diajukan! Transaksi pemasukan otomatis dibuat.')
      setDetail(null)
    }
  }

  const handleBatalkan = async () => {
    if (!window.confirm('Yakin ingin membatalkan iuran ini? Transaksi terkait akan dihapus.')) return
    const { error } = await batalkanIuran(detail.id, detail.transaksi_id)
    if (error) {
      showToast('Gagal membatalkan: ' + error.message, 'error')
    } else {
      showToast('Iuran dibatalkan. Transaksi terkait telah dihapus.')
      setDetail(null)
    }
  }

  const handleAmend = async () => {
    const { error } = await amendIuran(detail)
    if (error) {
      showToast('Gagal membuat revisi: ' + error.message, 'error')
    } else {
      showToast('Revisi iuran berhasil dibuat!')
      setDetail(null)
    }
  }

  const handlePrint = () => {
    generateIuranPDF(iuran, activeWorkspace?.nama || 'Kaswara')
  }

  const handlePrintDetail = (row) => {
    generateIuranPDF([row], activeWorkspace?.nama || 'Kaswara')
  }

  const sekaliKategori = kategoriList.filter((k) => k.tipe === 'sekali')

  return (
    <PageWrapper title="Iuran">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-[#0f3d32]">Iuran</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" icon={<Printer size={16} />} onClick={handlePrint}>
              Cetak
            </Button>
            {isBendahara && (
              <Button
                variant="primary"
                size="md"
                icon={<Plus size={16} />}
                onClick={() => setAddOpen(true)}
              >
                Tambah Iuran
              </Button>
            )}
          </div>
        </div>

        {/* One-time iuran summary panels */}
        {sekaliKategori.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-stone" />
              <p className="text-xs font-medium text-stone uppercase tracking-wide">
                Status Iuran Satu Kali
              </p>
            </div>
            {sekaliKategori.map((kat) => (
              <SekaliIuranPanel
                key={kat.id}
                kategori={kat}
                iuranList={iuran}
                anggotaList={anggotaList}
              />
            ))}
          </div>
        )}

        <IuranTable data={iuran} loading={loading} onView={(row) => setDetail(row)} />
      </div>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Iuran">
        <FormIuran
          anggotaList={anggotaList}
          kategoriIuranList={kategoriList}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Iuran">
        {detail && (
          <FormIuran
            anggotaList={anggotaList}
            kategoriIuranList={kategoriList}
            defaultValues={detail}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail && !editOpen}
        onClose={() => setDetail(null)}
        title="Detail Iuran"
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <IuranStatusFlow status={detail.status || 'draft'} />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone">Anggota</p>
                <p className="font-medium text-charcoal">
                  {detail.anggota_organisasi?.nama_lengkap || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone">Periode</p>
                <p className="font-medium text-charcoal">{formatPeriode(detail.periode)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Jumlah</p>
                <p className="font-bold font-mono text-success">{formatRupiah(detail.jumlah)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Kategori</p>
                {detail.kategori_iuran ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-charcoal">{detail.kategori_iuran.nama}</span>
                    <KategoriTipeBadge
                      tipe={detail.kategori_iuran.tipe}
                      frekuensi={detail.kategori_iuran.frekuensi}
                    />
                  </div>
                ) : (
                  <p className="font-medium text-stone">—</p>
                )}
              </div>
              {detail.keterangan && (
                <div className="col-span-2">
                  <p className="text-xs text-stone">Keterangan</p>
                  <p className="font-medium text-charcoal">{detail.keterangan}</p>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-brand-light/50 border border-brand/5 rounded-input px-4 py-3 space-y-1 text-xs text-stone">
              <p className="font-bold text-brand-dark uppercase tracking-widest text-[9px] mb-2 opacity-60">
                Riwayat
              </p>
              {detail.diajukan_at && (
                <p>
                  Diajukan pada:{' '}
                  <span className="text-charcoal">{formatTanggalPendek(detail.diajukan_at)}</span>
                </p>
              )}
              {detail.cancelled_at && (
                <p>
                  Dibatalkan pada:{' '}
                  <span className="text-charcoal">{formatTanggalPendek(detail.cancelled_at)}</span>
                </p>
              )}
              {detail.amended_at && (
                <p>
                  Direvisi pada:{' '}
                  <span className="text-charcoal">{formatTanggalPendek(detail.amended_at)}</span>
                </p>
              )}
              {detail.amended_from && (
                <p className="text-[#5B3FA8]">Revisi dari iuran sebelumnya</p>
              )}
              {detail.transaksi_id && (
                <p className="text-success">✓ Transaksi pemasukan otomatis dibuat</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                icon={<Printer size={15} />}
                onClick={() => handlePrintDetail(detail)}
              >
                Cetak
              </Button>
              {isBendahara && detail.status === 'draft' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={15} />}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
              )}
              {isBendahara && detail.status === 'draft' && (
                <Button
                  variant="accent"
                  size="sm"
                  icon={<Send size={15} />}
                  onClick={handleAjukan}
                >
                  Ajukan
                </Button>
              )}
              {isBendahara && detail.status === 'diajukan' && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={<XCircle size={15} />}
                  onClick={handleBatalkan}
                >
                  Batalkan
                </Button>
              )}
              {isBendahara && detail.status === 'cancelled' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RefreshCw size={15} />}
                  onClick={handleAmend}
                >
                  Revisi
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  )
}
