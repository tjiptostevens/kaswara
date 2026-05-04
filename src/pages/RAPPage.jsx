import React, { useState, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import RAPTable from '../components/rap/RAPTable'
import RAPStatusFlow from '../components/rap/RAPStatusFlow'
import FormRAP from '../components/rap/FormRAP'
import FotoBuktiViewer from '../components/rap/FotoBuktiViewer'
import { Modal, Button } from '../components/ui'
import { Plus, Printer, Send, XCircle, RefreshCw, CheckCircle2, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRAB } from '../hooks/useRAB'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import useKasStore from '../stores/kasStore'
import { formatRupiah, formatTanggalPendek } from '../lib/formatters'
import { generateRAPPDF } from '../lib/pdfExport'

const MAX_IMAGE_DIMENSION = 1600
const TARGET_IMAGE_SIZE_BYTES = 450 * 1024
const START_JPEG_QUALITY = 0.82
const MIN_JPEG_QUALITY = 0.55

const sanitizeFileName = (name = '') => name.replace(/[^a-zA-Z0-9._-]/g, '_')

const formatUploadTimestamp = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to read image'))
    }
    img.src = objectUrl
  })

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to convert canvas to blob'))
    }, mimeType, quality)
  })

const optimizeImageForUpload = async (file, uploaderName) => {
  const fallback = { file, displayName: file.name, uploadName: sanitizeFileName(file.name) }
  if (!file?.type?.startsWith('image/')) return fallback

  try {
    const image = await readImageFile(file)
    const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * ratio))
    const height = Math.max(1, Math.round(image.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return fallback
    ctx.drawImage(image, 0, 0, width, height)

    const safeUploaderName = (uploaderName || 'Unknown user').slice(0, 48)
    const timeCode = formatUploadTimestamp(new Date())
    const line1 = `Uploaded by: ${safeUploaderName}`
    const line2 = `Time: ${timeCode}`
    const fontSize = Math.max(13, Math.min(22, Math.round(width * 0.022)))
    const lineGap = Math.round(fontSize * 0.35)
    const horizontalPadding = Math.round(fontSize * 0.7)
    const verticalPadding = Math.round(fontSize * 0.55)

    ctx.font = `600 ${fontSize}px sans-serif`
    const textWidth = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width)
    const boxWidth = Math.ceil(textWidth + horizontalPadding * 2)
    const boxHeight = Math.ceil(fontSize * 2 + lineGap + verticalPadding * 2)
    const boxX = Math.max(8, width - boxWidth - 10)
    const boxY = Math.max(8, height - boxHeight - 10)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)'
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'top'
    ctx.fillText(line1, boxX + horizontalPadding, boxY + verticalPadding)
    ctx.fillText(line2, boxX + horizontalPadding, boxY + verticalPadding + fontSize + lineGap)

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    let quality = START_JPEG_QUALITY
    let blob = await canvasToBlob(canvas, outputType, quality)

    if (outputType === 'image/jpeg') {
      while (blob.size > TARGET_IMAGE_SIZE_BYTES && quality > MIN_JPEG_QUALITY) {
        quality = Math.max(MIN_JPEG_QUALITY, quality - 0.07)
        blob = await canvasToBlob(canvas, outputType, quality)
      }
    }

    const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))
    const extension = outputType === 'image/png' ? '.png' : '.jpg'
    const optimizedName = `${baseName}${extension}`
    const optimizedFile = new File([blob], optimizedName, {
      type: outputType,
      lastModified: Date.now(),
    })

    return {
      file: optimizedFile,
      displayName: file.name,
      uploadName: sanitizeFileName(optimizedName),
    }
  } catch {
    return fallback
  }
}

export default function RAPPage() {
  const { activeWorkspace, isBendahara, canApproveRAB: canApprove, user, profile } = useAuth()
  const organisasi = activeWorkspace
  const uploaderDisplayName = profile?.nama_lengkap || user?.email || 'Unknown user'
  const showToast = useUIStore((s) => s.showToast)
  const fetchTransaksi = useKasStore((s) => s.fetchTransaksi)
  const { rab } = useRAB()
  const [rap, setRap] = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [fotosOpen, setFotosOpen] = useState(false)

  const approvedRAB = rab.filter((r) => r.status === 'disetujui' || r.status === 'selesai')

  const fetchRAP = async () => {
    if (!organisasi?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('rap')
      .select('*, rap_foto(*), rab(nama_kegiatan), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap)')
      .eq('organisasi_id', organisasi.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (!error) setRap(data || [])
  }

  useEffect(() => { fetchRAP() }, [organisasi?.id])

  const handleAdd = async (data, files = []) => {
    const { data: result, error } = await supabase
      .from('rap')
      .insert({
        ...data,
        organisasi_id: organisasi.id,
        dibuat_oleh: user?.id,
        dibuat_oleh_anggota_id: profile?.id ?? null,
        status: 'draft',
      })
      .select()
      .single()
    if (error) {
      showToast('Gagal menyimpan RAP: ' + error.message, 'error')
      return
    }

    if (files.length > 0) {
      const failedUploads = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const prepared = await optimizeImageForUpload(file, uploaderDisplayName)
        const path = `${result.id}/${crypto.randomUUID()}_${prepared.uploadName}`
        const { error: uploadError } = await supabase.storage
          .from('rap-foto')
          .upload(path, prepared.file, { contentType: prepared.file.type })
        if (uploadError) { failedUploads.push(prepared.displayName); continue }
        const { error: fotoError } = await supabase
          .from('rap_foto')
          .insert({ rap_id: result.id, storage_path: path, nama_file: prepared.displayName })
        if (fotoError) { failedUploads.push(prepared.displayName) }
      }
      if (failedUploads.length > 0) {
        showToast(`Beberapa foto gagal diunggah: ${failedUploads.join(', ')}`, 'error')
      }
    }

    showToast('RAP berhasil disimpan!')
    setAddOpen(false)
    fetchRAP()
  }

  const handleEdit = async (data, files = []) => {
    const { error } = await supabase
      .from('rap')
      .update(data)
      .eq('id', detail.id)
    if (error) {
      showToast('Gagal memperbarui RAP: ' + error.message, 'error')
      return
    }

    // Upload any new photos
    if (files.length > 0) {
      for (const file of files) {
        const prepared = await optimizeImageForUpload(file, uploaderDisplayName)
        const path = `${detail.id}/${crypto.randomUUID()}_${prepared.uploadName}`
        const { error: uploadError } = await supabase.storage
          .from('rap-foto')
          .upload(path, prepared.file, { contentType: prepared.file.type })
        if (!uploadError) {
          await supabase.from('rap_foto').insert({
            rap_id: detail.id,
            storage_path: path,
            nama_file: prepared.displayName,
          })
        }
      }
    }

    showToast('RAP berhasil diperbarui!')
    setEditOpen(false)
    setDetail(null)
    fetchRAP()
  }

  const updateRAPStatus = async (id, status, extraFields = {}) => {
    const now = new Date().toISOString()
    const updates = { status, ...extraFields }
    if (status === 'submitted') { updates.submitted_by = user?.id; updates.submitted_at = now }
    else if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = now }
    else if (status === 'cancelled') { updates.cancelled_by = user?.id; updates.cancelled_at = now }
    else if (status === 'amended') { updates.amended_by = user?.id; updates.amended_at = now }
    const { error } = await supabase.from('rap').update(updates).eq('id', id)
    if (error) return { error }
    await fetchRAP()
    return { error: null }
  }

  const handleSubmit = async (id) => {
    const { error } = await updateRAPStatus(id, 'submitted')
    if (error) showToast('Gagal mengajukan: ' + error.message, 'error')
    else { showToast('RAP berhasil diajukan!'); setDetail(null) }
  }

  const handleApprove = async (rapRow) => {
    const { error: approveErr } = await updateRAPStatus(rapRow.id, 'approved')
    if (approveErr) { showToast('Gagal menyetujui: ' + approveErr.message, 'error'); return }

    const keteranganTransaksi = rapRow.rab?.nama_kegiatan
      ? `${rapRow.nama_item} — RAP ${rapRow.rab.nama_kegiatan}`
      : rapRow.nama_item

    const { data: transaksiData, error: txErr } = await supabase
      .from('transaksi')
      .insert({
        organisasi_id: organisasi.id,
        tipe: 'pengeluaran',
        jumlah: rapRow.jumlah_realisasi,
        keterangan: keteranganTransaksi,
        tanggal: rapRow.tanggal_realisasi,
        rap_id: rapRow.id,
        dibuat_oleh: user?.id,
        status: 'submitted',
      })
      .select()
      .single()

    if (txErr) {
      showToast('RAP disetujui, tapi gagal buat transaksi: ' + txErr.message, 'error')
    } else {
      await supabase.from('rap').update({ transaksi_id: transaksiData.id }).eq('id', rapRow.id)

      if (rapRow.rab_id) {
        const { data: sibling } = await supabase
          .from('rap')
          .select('id, status')
          .eq('rab_id', rapRow.rab_id)
          .neq('id', rapRow.id)
        const activeRap = (sibling || []).filter((r) => r.status !== 'cancelled' && r.status !== 'amended')
        const allDone = activeRap.every((r) => r.status === 'approved')
        if (allDone) await supabase.from('rab').update({ status: 'selesai' }).eq('id', rapRow.rab_id)
      }

      fetchTransaksi(organisasi.id)
      showToast('RAP disetujui! Transaksi pengeluaran otomatis dibuat.')
    }

    setDetail(null)
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Yakin ingin membatalkan RAP ini?')) return
    const { error } = await updateRAPStatus(id, 'cancelled')
    if (error) showToast('Gagal membatalkan: ' + error.message, 'error')
    else { showToast('RAP dibatalkan'); setDetail(null) }
  }

  const handleAmend = async (original) => {
    const { error: markErr } = await updateRAPStatus(original.id, 'amended')
    if (markErr) { showToast('Gagal: ' + markErr.message, 'error'); return }

    const { error: insertErr } = await supabase
      .from('rap')
      .insert({
        organisasi_id: organisasi.id,
        rab_id: original.rab_id,
        nama_item: original.nama_item,
        jumlah_realisasi: original.jumlah_realisasi,
        keterangan: original.keterangan,
        tanggal_realisasi: original.tanggal_realisasi,
        dibuat_oleh: user?.id,
        dibuat_oleh_anggota_id: profile?.id ?? null,
        status: 'draft',
        amended_from: original.id,
      })
      .select()
      .single()
    if (insertErr) { showToast('Gagal membuat amandemen: ' + insertErr.message, 'error'); return }
    showToast('RAP amandemen berhasil dibuat!')
    setDetail(null)
    fetchRAP()
  }

  const handlePrint = () => generateRAPPDF(rap, activeWorkspace?.nama || 'Kaswara')
  const handlePrintDetail = (row) => generateRAPPDF([row], activeWorkspace?.nama || 'Kaswara')

  // Build defaultValues for the edit form
  const editDefaults = detail
    ? {
      rab_id: detail.rab_id || '',
      nama_item: detail.nama_item,
      jumlah_realisasi: Number(detail.jumlah_realisasi),
      keterangan: detail.keterangan || '',
      tanggal_realisasi: detail.tanggal_realisasi,
    }
    : undefined

  return (
    <PageWrapper title="RAP">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f3d32]">Realisasi Anggaran Pengeluaran</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" icon={<Printer size={16} />} onClick={handlePrint}>
              Cetak
            </Button>
            {isBendahara && (
              <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
                Tambah RAP
              </Button>
            )}
          </div>
        </div>
        <RAPTable data={rap} loading={loading} onView={(row) => setDetail(row)} />
      </div>

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Realisasi (RAP)">
        <FormRAP rabList={approvedRAB} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit RAP">
        {detail && (
          <FormRAP
            rabList={approvedRAB}
            defaultValues={editDefaults}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={!!detail && !editOpen && !fotosOpen}
        onClose={() => setDetail(null)}
        title={detail?.nama_item || 'Detail RAP'}
        size="lg"
      >
        {detail && (
          <div className="space-y-4">
            <RAPStatusFlow status={detail.status || 'draft'} />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-stone">Tanggal Realisasi</p>
                <p className="font-medium text-charcoal">{formatTanggalPendek(detail.tanggal_realisasi)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Jumlah Realisasi</p>
                <p className="font-bold font-mono text-brand">{formatRupiah(detail.jumlah_realisasi)}</p>
              </div>
              {detail.rab?.nama_kegiatan && (
                <div className="col-span-2">
                  <p className="text-xs text-stone">RAB Terkait</p>
                  <p className="font-medium text-charcoal">{detail.rab.nama_kegiatan}</p>
                </div>
              )}
              {detail.keterangan && (
                <div className="col-span-2">
                  <p className="text-xs text-stone">Keterangan</p>
                  <p className="font-medium text-charcoal">{detail.keterangan}</p>
                </div>
              )}
            </div>

            {detail.rap_foto?.length > 0 && (
              <button onClick={() => setFotosOpen(true)} className="text-xs text-brand hover:underline">
                Lihat {detail.rap_foto.length} foto bukti
              </button>
            )}

            {/* History */}
            <div className="bg-[#F8F7F3] rounded-input px-3 py-2 space-y-1 text-xs text-stone">
              <p className="font-medium text-charcoal uppercase tracking-wide text-xs mb-1">Riwayat</p>
              {(detail.anggota_organisasi?.nama_lengkap || detail.dibuat_oleh) && (
                <p>Dibuat oleh: <span className="text-charcoal">{detail.anggota_organisasi?.nama_lengkap || detail.dibuat_oleh}</span></p>
              )}
              {detail.submitted_at && (
                <p>Diajukan pada: <span className="text-charcoal">{formatTanggalPendek(detail.submitted_at)}</span></p>
              )}
              {detail.approved_at && (
                <p>Disetujui pada: <span className="text-charcoal">{formatTanggalPendek(detail.approved_at)}</span></p>
              )}
              {detail.cancelled_at && (
                <p>Dibatalkan pada: <span className="text-charcoal">{formatTanggalPendek(detail.cancelled_at)}</span></p>
              )}
              {detail.amended_at && (
                <p>Diamandemen pada: <span className="text-charcoal">{formatTanggalPendek(detail.amended_at)}</span></p>
              )}
              {detail.amended_from && <p className="text-[#5B3FA8]">Amandemen dari RAP sebelumnya</p>}
              {detail.transaksi_id && <p className="text-success">✓ Transaksi pengeluaran otomatis dibuat</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="ghost" size="sm" icon={<Printer size={15} />} onClick={() => handlePrintDetail(detail)}>
                Cetak
              </Button>
              {isBendahara && detail.status === 'draft' && (
                <Button variant="ghost" size="sm" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
              )}
              {isBendahara && detail.status === 'draft' && (
                <Button variant="accent" size="sm" icon={<Send size={15} />} onClick={() => handleSubmit(detail.id)}>
                  Ajukan
                </Button>
              )}
              {canApprove && detail.status === 'submitted' && (
                <Button variant="primary" size="sm" icon={<CheckCircle2 size={15} />} onClick={() => handleApprove(detail)}>
                  Setujui
                </Button>
              )}
              {(isBendahara || canApprove) && ['draft', 'submitted'].includes(detail.status) && (
                <Button variant="danger" size="sm" icon={<XCircle size={15} />} onClick={() => handleCancel(detail.id)}>
                  Batalkan
                </Button>
              )}
              {isBendahara && detail.status === 'cancelled' && (
                <Button variant="primary" size="sm" icon={<RefreshCw size={15} />} onClick={() => handleAmend(detail)}>
                  Amandemen
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Foto Modal */}
      <Modal open={fotosOpen} onClose={() => setFotosOpen(false)} title="Foto Bukti">
        {detail && <FotoBuktiViewer rapId={detail.id} fotos={detail.rap_foto || []} />}
      </Modal>
    </PageWrapper>
  )
}

