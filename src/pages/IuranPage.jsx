import React, { useState, useEffect, useMemo, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import IuranTable, { KategoriTipeBadge, FREKUENSI_LABEL } from '../components/iuran/IuranTable'
import IuranStatusFlow from '../components/iuran/IuranStatusFlow'
import FormIuran from '../components/iuran/FormIuran'
import { Modal, Button, Badge } from '../components/ui'
import { Plus, Printer, Send, XCircle, RefreshCw, Pencil, CheckCircle2, Star, Users, RefreshCcw, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useIuran } from '../hooks/useIuran'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatPeriode, formatTanggalPendek } from '../lib/formatters'
import { generateIuranPDF } from '../lib/pdfExport'

const WAJIB_FALLBACK_NAME = 'Iuran wajib'

/**
 * Shows which members have/haven't paid a one-time (sekali) iuran.
 */
function SekaliIuranPanel({ kategori, iuranList, anggotaList }) {
  const rows = useMemo(
    () => iuranList.filter((i) => i.kategori_iuran_id === kategori.id),
    [iuranList, kategori.id]
  )
  const paidIds = useMemo(
    () => new Set(rows.filter((i) => i.status === 'diajukan').map((i) => i.anggota_id)),
    [rows]
  )

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
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${paid
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

/**
 * Shows per-period payment status for a recurring (wajib) iuran category.
 */
function WajibIuranPanel({ kategori, iuranList, anggotaList }) {
  const rows = useMemo(
    () => iuranList.filter((i) => i.kategori_iuran_id === kategori.id),
    [iuranList, kategori.id]
  )

  // Distinct sorted periods (newest first)
  const periods = useMemo(() => {
    const set = new Set(rows.map((i) => i.periode))
    return Array.from(set).sort((a, b) => new Date(b) - new Date(a))
  }, [rows])

  // Map: periode -> Set of paid (diajukan) anggota_id
  const paidByPeriod = useMemo(() => {
    const map = {}
    for (const p of periods) {
      map[p] = new Set(
        rows.filter((i) => i.periode === p && i.status === 'diajukan').map((i) => i.anggota_id)
      )
    }
    return map
  }, [rows, periods])

  const totalAnggota = anggotaList.length

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCcw size={13} className="text-info" />
        <span className="font-semibold text-charcoal text-sm">{kategori.nama}</span>
        <KategoriTipeBadge tipe={kategori.tipe} frekuensi={kategori.frekuensi} />
      </div>

      {periods.length === 0 && (
        <p className="text-xs text-stone">Belum ada data iuran untuk kategori ini.</p>
      )}

      <div className="space-y-3">
        {periods.map((periode) => {
          const paid = paidByPeriod[periode]
          return (
            <div key={periode} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-info">
                  {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(periode))}
                </span>
                <span className="text-[10px] text-stone">
                  {paid.size}/{totalAnggota} lunas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {anggotaList.map((a) => {
                  const isPaid = paid.has(a.id)
                  return (
                    <div
                      key={a.id}
                      title={isPaid ? `${a.nama_lengkap} — Lunas` : `${a.nama_lengkap} — Belum bayar`}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${isPaid
                        ? 'bg-[#E1F5EE] border-[#B2EAD3] text-[#0F6E56]'
                        : 'bg-[#FCEBEB] border-[#F7CACA] text-[#A32D2D]'
                        }`}
                    >
                      {isPaid ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {a.nama_lengkap}
                    </div>
                  )
                })}
                {totalAnggota === 0 && (
                  <p className="text-xs text-stone">Belum ada anggota</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Anggota view: status iuran satu kali for the current member.
 */
function AnggotaSekaliPanel({ kategori, iuranList }) {
  const myRows = useMemo(
    () => iuranList.filter((i) => i.kategori_iuran_id === kategori.id),
    [iuranList, kategori.id]
  )
  const paid = myRows.some((i) => i.status === 'diajukan')
  const hasDraft = !paid && myRows.some((i) => i.status === 'draft')

  const statusClass = paid
    ? 'bg-[#E1F5EE] border-[#B2EAD3] text-[#0F6E56]'
    : hasDraft
      ? 'bg-[#FEF9EC] border-[#F4DBB4] text-[#854F0B]'
      : 'bg-[#FCEBEB] border-[#F7CACA] text-[#A32D2D]'

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star size={14} className="fill-[#e8a020] stroke-[#e8a020]" />
          <span className="font-semibold text-charcoal text-sm">{kategori.nama}</span>
          <KategoriTipeBadge tipe="sekali" />
        </div>
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${statusClass}`}
        >
          {paid ? (
            <><CheckCircle2 size={11} /> Lunas</>
          ) : hasDraft ? (
            <><Clock size={11} /> Draft</>
          ) : (
            <><XCircle size={11} /> Belum Bayar</>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Anggota view: per-period payment status for a recurring (wajib) iuran category.
 */
function AnggotaWajibPanel({ kategori, iuranList, pendingWajib }) {
  const myRows = useMemo(
    () => iuranList.filter((i) => i.kategori_iuran_id === kategori.id),
    [iuranList, kategori.id]
  )

  const pendingPeriods = useMemo(
    () =>
      pendingWajib
        .filter((p) => p.kategoriId === kategori.id)
        .map((p) => p.periode),
    [pendingWajib, kategori.id]
  )

  const allPeriods = useMemo(() => {
    const set = new Set([...myRows.map((r) => r.periode), ...pendingPeriods])
    return Array.from(set).sort((a, b) => new Date(b) - new Date(a))
  }, [myRows, pendingPeriods])

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <RefreshCcw size={13} className="text-info" />
        <span className="font-semibold text-charcoal text-sm">{kategori.nama}</span>
        <KategoriTipeBadge tipe={kategori.tipe} frekuensi={kategori.frekuensi} />
      </div>

      {allPeriods.length === 0 && (
        <p className="text-xs text-stone">Belum ada data iuran untuk kategori ini.</p>
      )}

      <div className="space-y-1.5">
        {allPeriods.map((periode) => {
          const row = myRows.find((r) => r.periode === periode)
          const isPaid = row?.status === 'diajukan'
          const isDraft = !isPaid && row?.status === 'draft'
          const isPending = !row && pendingPeriods.includes(periode)

          const statusClass = isPaid
            ? 'bg-[#E1F5EE] border-[#B2EAD3] text-[#0F6E56]'
            : isDraft
              ? 'bg-[#FEF9EC] border-[#F4DBB4] text-[#854F0B]'
              : 'bg-[#FCEBEB] border-[#F7CACA] text-[#A32D2D]'

          return (
            <div
              key={periode}
              className="flex items-center justify-between px-3 py-2 rounded-input border border-border bg-white/70"
            >
              <span className="text-sm font-medium text-charcoal">
                {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
                  new Date(periode)
                )}
              </span>
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusClass}`}
              >
                {isPaid ? (
                  <><CheckCircle2 size={10} /> Lunas</>
                ) : isDraft ? (
                  <><Clock size={10} /> Draft</>
                ) : (
                  <><XCircle size={10} /> Belum Bayar</>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function IuranPage() {
  const { activeWorkspace, isBendahara, isAnggota, profile, user } = useAuth()
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
  const [anggotaInsights, setAnggotaInsights] = useState({ pendingWajib: [], sukarelaRows: [] })

  const fetchAnggotaInsights = useCallback(async () => {
    if (!activeWorkspace?.id || !isAnggota || !user?.id) {
      setAnggotaInsights({ pendingWajib: [], sukarelaRows: [] })
      return
    }

    const [wajibPaidRes, myWajibPaidRes, sukarelaRes] = await Promise.all([
      supabase
        .from('iuran_rutin')
        .select('anggota_id, periode, kategori_iuran_id, kategori_iuran!inner(nama, tipe)')
        .eq('organisasi_id', activeWorkspace.id)
        .in('status', ['diajukan', 'lunas'])
        .eq('kategori_iuran.tipe', 'wajib')
        .order('periode', { ascending: false }),
      supabase
        .from('iuran_rutin')
        .select('periode, kategori_iuran_id, kategori_iuran!inner(tipe), anggota_organisasi!inner(user_id)')
        .eq('organisasi_id', activeWorkspace.id)
        .in('status', ['diajukan', 'lunas'])
        .eq('kategori_iuran.tipe', 'wajib')
        .eq('anggota_organisasi.user_id', user.id),
      supabase
        .from('iuran_rutin')
        .select('id, anggota_id, periode, jumlah, status, kategori_iuran!inner(nama, tipe), anggota_organisasi!inner(user_id)')
        .eq('organisasi_id', activeWorkspace.id)
        .eq('anggota_organisasi.user_id', user.id)
        .eq('kategori_iuran.tipe', 'sukarela')
        .order('periode', { ascending: false }),
    ])

    if (wajibPaidRes.error || myWajibPaidRes.error || sukarelaRes.error) {
      showToast('Gagal memuat ringkasan iuran anggota.', 'error')
      return
    }

    const wajibDiajukanRows = wajibPaidRes.data || []

    const wajibByKategoriPeriode = new Map()
    for (const row of wajibDiajukanRows) {
      if (!row.kategori_iuran_id || !row.periode) continue
      const key = `${row.kategori_iuran_id}::${row.periode}`
      if (!wajibByKategoriPeriode.has(key)) {
        wajibByKategoriPeriode.set(key, {
          kategoriId: row.kategori_iuran_id,
          kategoriNama: row.kategori_iuran?.nama || WAJIB_FALLBACK_NAME,
          periode: row.periode,
          paidMemberIds: new Set(),
        })
      }
      wajibByKategoriPeriode.get(key).paidMemberIds.add(row.anggota_id)
    }

    const myPaidKeySet = new Set(
      (myWajibPaidRes.data || [])
        .filter((row) => row.kategori_iuran_id && row.periode)
        .map((row) => `${row.kategori_iuran_id}::${row.periode}`)
    )

    const pendingWajib = Array.from(wajibByKategoriPeriode.values())
      .filter((item) => !myPaidKeySet.has(`${item.kategoriId}::${item.periode}`))
      .map((item) => ({
        kategoriId: item.kategoriId,
        kategoriNama: item.kategoriNama,
        periode: item.periode,
        paidCount: item.paidMemberIds.size,
      }))

    const sukarelaRows = sukarelaRes.data || []

    setAnggotaInsights({ pendingWajib, sukarelaRows })
  }, [activeWorkspace?.id, isAnggota, showToast, user?.id])

  useEffect(() => {
    if (!activeWorkspace?.id) return
    // Always fetch kategori for all roles
    supabase
      .from('kategori_iuran')
      .select('*')
      .eq('organisasi_id', activeWorkspace.id)
      .order('nama')
      .then(({ data }) => setKategoriList(data || []))

    if (isAnggota) {
      setAnggotaList(profile ? [profile] : [])
      return
    }
    supabase
      .from('anggota_organisasi')
      .select('id, nama_lengkap, nomor_anggota, email, no_hp')
      .eq('organisasi_id', activeWorkspace.id)
      .eq('aktif', true)
      .order('nama_lengkap')
      .then(({ data }) => setAnggotaList(data || []))
  }, [activeWorkspace?.id, isAnggota, profile?.id])

  useEffect(() => {
    if (!activeWorkspace?.id) return

    const iuranChannel = supabase
      .channel(`iuran_rutin:${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'iuran_rutin',
          filter: `organisasi_id=eq.${activeWorkspace.id}`,
        },
        () => {
          fetchIuran()
          fetchAnggotaInsights()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(iuranChannel)
    }
  }, [activeWorkspace?.id, fetchIuran, fetchAnggotaInsights])

  useEffect(() => {
    fetchAnggotaInsights()
  }, [fetchAnggotaInsights])

  useEffect(() => {
    if (!detail?.id) return
    const latest = iuran.find((row) => row.id === detail.id)
    if (!latest) {
      setDetail(null)
      return
    }
    setDetail(latest)
  }, [iuran])

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
  const wajibKategori = kategoriList.filter((k) => k.tipe === 'wajib')

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
            {sekaliKategori.map((kat) =>
              isAnggota ? (
                <AnggotaSekaliPanel
                  key={kat.id}
                  kategori={kat}
                  iuranList={iuran}
                />
              ) : (
                <SekaliIuranPanel
                  key={kat.id}
                  kategori={kat}
                  iuranList={iuran}
                  anggotaList={anggotaList}
                />
              )
            )}
          </div>
        )}

        {/* Recurring (wajib) iuran summary panels */}
        {wajibKategori.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-stone" />
              <p className="text-xs font-medium text-stone uppercase tracking-wide">
                Status Iuran Wajib
              </p>
            </div>
            {wajibKategori.map((kat) =>
              isAnggota ? (
                <AnggotaWajibPanel
                  key={kat.id}
                  kategori={kat}
                  iuranList={iuran}
                  pendingWajib={anggotaInsights.pendingWajib}
                />
              ) : (
                <WajibIuranPanel
                  key={kat.id}
                  kategori={kat}
                  iuranList={iuran}
                  anggotaList={anggotaList}
                />
              )
            )}
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
