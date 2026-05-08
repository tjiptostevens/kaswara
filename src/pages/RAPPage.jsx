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
  const { activeWorkspace, can, canForRecord, user, profile } = useAuth()
  const organisasi = activeWorkspace
  const uploaderDisplayName = profile?.nama_lengkap || user?.email || 'Unknown user'
  const showToast = useUIStore((s) => s.showToast)
  const fetchTransaksi = useKasStore((s) => s.fetchTransaksi)
  const kategori = useKasStore((s) => s.kategori)
  const fetchKategori = useKasStore((s) => s.fetchKategori)
  const { rab } = useRAB()
  const [rap, setRap] = useState([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [fotosOpen, setFotosOpen] = useState(false)

  const approvedRAB = rab.filter((r) => {
    if (r.status !== 'disetujui' && r.status !== 'selesai') return false
    const activeRap = rap.find(
      (p) => p.rab_id === r.id && p.status !== 'cancelled' && p.status !== 'amended'
    )
    return !activeRap
  })
  const isOwnedByCurrentUser = (row) =>
    row?.dibuat_oleh === user?.id ||
    (row?.dibuat_oleh_anggota_id && row?.dibuat_oleh_anggota_id === profile?.id)

  const computeRapTotals = (rapRow) => {
    const items = rapRow.rap_item_realisasi || []
    const itemTotalAnggaran = items.reduce((sum, item) => sum + Number(item.subtotal_anggaran || 0), 0)
    const itemTotalRAP = items.reduce((sum, item) => sum + Number(item.jumlah_realisasi || 0), 0)
    const totalAnggaran = itemTotalAnggaran || Number(rapRow.rab?.total_anggaran || 0)
    const totalRAP = itemTotalRAP || Number(rapRow.jumlah_realisasi || 0)
    const selisih = totalRAP - totalAnggaran
    const disparitas = selisih === 0 ? 'tepat' : selisih > 0 ? 'lebih' : 'kurang'
    return { totalAnggaran, totalRAP, selisih, disparitas }
  }

  const fetchRAP = async () => {
    if (!organisasi?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('rap')
      .select('*, rap_item_realisasi(*), rap_foto(*), rab(nama_kegiatan, total_anggaran, kategori_id, kategori_transaksi(nama)), anggota_organisasi!dibuat_oleh_anggota_id(nama_lengkap), kategori_transaksi(nama)')
      .eq('organisasi_id', organisasi.id)
      .order('created_at', { ascending: false })
    setLoading(false)
    if (!error) setRap(data || [])
  }

  useEffect(() => { fetchRAP() }, [organisasi?.id])
  useEffect(() => {
    if (organisasi?.id) fetchKategori(organisasi.id)
  }, [organisasi?.id])

  const handleAdd = async (data, files = []) => {
    const totalRealisasi = (data.items || []).reduce((sum, item) => sum + Number(item.jumlah_realisasi || 0), 0)
    const selectedRab = approvedRAB.find((row) => row.id === data.rab_id)
    const rapName = selectedRab ? `Realisasi ${selectedRab.nama_kegiatan}` : 'Realisasi RAP'
    const { data: result, error } = await supabase
      .from('rap')
      .insert({
        rab_id: data.rab_id,
        kategori_id: data.kategori_id || selectedRab?.kategori_id || null,
        nama_item: rapName,
        jumlah_realisasi: totalRealisasi,
        keterangan: data.keterangan,
        tanggal_realisasi: data.tanggal_realisasi,
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

    if (data.items?.length) {
      const itemPayload = data.items.map((item) => {
        const subtotal = Number(item.subtotal_anggaran || 0)
        const realisasi = Number(item.jumlah_realisasi || 0)
        const selisih = realisasi - subtotal
        return {
          rap_id: result.id,
          rab_item_id: item.rab_item_id || null,
          nama_item: item.nama_item,
          volume: Number(item.volume || 0),
          satuan: item.satuan || 'unit',
          harga_satuan_anggaran: Number(item.harga_satuan || 0),
          subtotal_anggaran: subtotal,
          jumlah_realisasi: realisasi,
          selisih,
          disparitas: selisih === 0 ? 'tepat' : selisih > 0 ? 'lebih' : 'kurang',
        }
      })
      const { error: itemErr } = await supabase.from('rap_item_realisasi').insert(itemPayload)
      if (itemErr) {
        showToast('RAP tersimpan, tetapi detail item gagal: ' + itemErr.message, 'error')
      }
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
    const totalRealisasi = (data.items || []).reduce((sum, item) => sum + Number(item.jumlah_realisasi || 0), 0)
    const { error } = await supabase
      .from('rap')
      .update({
        rab_id: data.rab_id,
        kategori_id: data.kategori_id,
        jumlah_realisasi: totalRealisasi,
        keterangan: data.keterangan,
        tanggal_realisasi: data.tanggal_realisasi,
      })
      .eq('id', detail.id)
    if (error) {
      showToast('Gagal memperbarui RAP: ' + error.message, 'error')
      return
    }

    const { error: deleteErr } = await supabase.from('rap_item_realisasi').delete().eq('rap_id', detail.id)
    if (deleteErr) {
      showToast('Gagal menghapus item lama: ' + deleteErr.message, 'error')
      return
    }
    if (data.items?.length) {
      const itemPayload = data.items.map((item) => {
        const subtotal = Number(item.subtotal_anggaran || 0)
        const realisasi = Number(item.jumlah_realisasi || 0)
        const selisih = realisasi - subtotal
        return {
          rap_id: detail.id,
          rab_item_id: item.rab_item_id || null,
          nama_item: item.nama_item,
          volume: Number(item.volume || 0),
          satuan: item.satuan || 'unit',
          harga_satuan_anggaran: Number(item.harga_satuan || 0),
          subtotal_anggaran: subtotal,
          jumlah_realisasi: realisasi,
          selisih,
          disparitas: selisih === 0 ? 'tepat' : selisih > 0 ? 'lebih' : 'kurang',
        }
      })
      const { error: itemErr } = await supabase.from('rap_item_realisasi').insert(itemPayload)
      if (itemErr) {
        showToast('RAP diperbarui, tetapi detail item gagal: ' + itemErr.message, 'error')
      }
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
    const previousStatus = rapRow.status
    const { error: approveErr } = await updateRAPStatus(rapRow.id, 'approved')
    if (approveErr) { showToast('Gagal menyetujui: ' + approveErr.message, 'error'); return }
    const totals = computeRapTotals(rapRow)

    const keteranganTransaksi = rapRow.rab?.nama_kegiatan
      ? `${rapRow.nama_item} — RAP ${rapRow.rab.nama_kegiatan}`
      : rapRow.nama_item

    const { data: transaksiData, error: txErr } = await supabase
      .from('transaksi')
      .insert({
        organisasi_id: organisasi.id,
        tipe: 'pengeluaran',
        jumlah: totals.totalRAP || rapRow.jumlah_realisasi,
        kategori_id: rapRow.kategori_id || rapRow.rab?.kategori_id || null,
        keterangan: keteranganTransaksi,
        tanggal: rapRow.tanggal_realisasi,
        rap_id: rapRow.id,
        dibuat_oleh: user?.id,
        status: 'submitted',
      })
      .select()
      .single()

    if (txErr) {
      // Rollback RAP status back to previous state
      await supabase.from('rap').update({
        status: previousStatus,
        approved_by: null,
        approved_at: null,
      }).eq('id', rapRow.id)
      await fetchRAP()
      showToast('Gagal membuat transaksi, status RAP dikembalikan: ' + txErr.message, 'error')
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

  const handleCancel = async (row) => {
    const id = row?.id
    if (!id) return
    if (!window.confirm('Yakin ingin membatalkan RAP ini?')) return
    const { error } = await updateRAPStatus(id, 'cancelled')
    if (error) {
      showToast('Gagal membatalkan: ' + error.message, 'error')
      return
    }

    const now = new Date().toISOString()
    if (row.transaksi_id) {
      await supabase
        .from('transaksi')
        .update({
          status: 'cancelled',
          cancelled_by: user?.id,
          cancelled_at: now,
        })
        .eq('id', row.transaksi_id)
    }

    if (row.rab_id) {
      const { data: rabRow } = await supabase
        .from('rab')
        .select('status')
        .eq('id', row.rab_id)
        .single()
      if (rabRow?.status === 'selesai') {
        await supabase.from('rab').update({ status: 'disetujui' }).eq('id', row.rab_id)
      }
    }

    showToast('RAP dibatalkan')
    setDetail(null)
    fetchTransaksi(organisasi.id)
    fetchRAP()
  }

  const handleAmend = async (original) => {
    const { error: markErr } = await updateRAPStatus(original.id, 'amended')
    if (markErr) { showToast('Gagal: ' + markErr.message, 'error'); return }

    const { data: newRap, error: insertErr } = await supabase
      .from('rap')
      .insert({
        organisasi_id: organisasi.id,
        rab_id: original.rab_id,
        nama_item: original.nama_item,
        kategori_id: original.kategori_id || null,
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
    if (insertErr) { showToast('Gagal membuat perubahan: ' + insertErr.message, 'error'); return }
    if (original.rap_item_realisasi?.length) {
      const clonedItems = original.rap_item_realisasi.map(({ id: _id, rap_id: _rid, created_at: _ca, ...item }) => ({
        ...item,
        rap_id: newRap.id,
      }))
      const { error: cloneErr } = await supabase.from('rap_item_realisasi').insert(clonedItems)
      if (cloneErr) {
        showToast('RAP perubahan dibuat, tetapi clone item gagal: ' + cloneErr.message, 'error')
      }
    }
    showToast('RAP perubahan berhasil dibuat!')
    setDetail(null)
    fetchRAP()
  }

  const handlePrint = () => generateRAPPDF(rap, activeWorkspace?.nama || 'Kaswara')
  const handlePrintDetail = (row) => generateRAPPDF([row], activeWorkspace?.nama || 'Kaswara')

  // Build defaultValues for the edit form
  const editDefaults = detail
    ? {
      rab_id: detail.rab_id || '',
      kategori_id: detail.kategori_id || detail.rab?.kategori_id || '',
      items: (detail.rap_item_realisasi || []).map((item) => ({
        rab_item_id: item.rab_item_id || null,
        nama_item: item.nama_item,
        volume: Number(item.volume || 0),
        satuan: item.satuan || 'unit',
        harga_satuan: Number(item.harga_satuan_anggaran || 0),
        subtotal_anggaran: Number(item.subtotal_anggaran || 0),
        jumlah_realisasi: Number(item.jumlah_realisasi || 0),
      })),
      keterangan: detail.keterangan || '',
      tanggal_realisasi: detail.tanggal_realisasi,
    }
    : undefined
  const detailTotals = detail ? computeRapTotals(detail) : null

  return (
    <PageWrapper title="RAP">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-brand-dark">Realisasi Anggaran Pengeluaran</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" icon={<Printer size={16} />} onClick={handlePrint}>
              Cetak
            </Button>
            {can('rap', 'create') && (
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
        <FormRAP kategori={kategori} rabList={approvedRAB} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit RAP">
        {detail && (
          <FormRAP
            kategori={kategori}
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
                <p className="text-xs text-stone">Total RAP</p>
                <p className="font-bold font-mono text-brand">{formatRupiah(detailTotals.totalRAP)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Total RAB</p>
                <p className="font-bold font-mono text-charcoal">{formatRupiah(detailTotals.totalAnggaran)}</p>
              </div>
              <div>
                <p className="text-xs text-stone">Disparitas</p>
                <p className={`font-bold ${detailTotals.disparitas === 'tepat' ? 'text-success' : detailTotals.disparitas === 'lebih' ? 'text-danger' : 'text-info'}`}>
                  {detailTotals.disparitas.toUpperCase()} ({formatRupiah(Math.abs(detailTotals.selisih))})
                </p>
              </div>
              <div>
                <p className="text-xs text-stone">Kategori</p>
                <p className="font-medium text-charcoal">{detail.kategori_transaksi?.nama || detail.rab?.kategori_transaksi?.nama || '—'}</p>
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

            {detail.rap_item_realisasi?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-stone uppercase tracking-wide font-medium">Detail Item RAP</p>
                {detail.rap_item_realisasi.map((item) => (
                  <div key={item.id} className="rounded-input border border-border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-charcoal">{item.nama_item}</p>
                      <p className="text-stone">{item.volume} {item.satuan}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <p>RAB: <span className="font-mono">{formatRupiah(item.subtotal_anggaran)}</span></p>
                      <p>RAP: <span className="font-mono">{formatRupiah(item.jumlah_realisasi)}</span></p>
                      <p className={item.disparitas === 'tepat' ? 'text-success' : item.disparitas === 'lebih' ? 'text-danger' : 'text-info'}>
                        {item.disparitas.toUpperCase()} ({formatRupiah(Math.abs(item.selisih || 0))})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                <p>Diubah pada: <span className="text-charcoal">{formatTanggalPendek(detail.amended_at)}</span></p>
              )}
              {detail.amended_from && <p className="text-[#5B3FA8]">Diubah dari RAP sebelumnya</p>}
              {detail.transaksi_id && <p className="text-success">✓ Transaksi pengeluaran otomatis dibuat</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="ghost" size="sm" icon={<Printer size={15} />} onClick={() => handlePrintDetail(detail)}>
                Cetak
              </Button>
              {canForRecord('rap', 'update', detail, 'dibuat_oleh') && detail.status === 'draft' && (
                <Button variant="ghost" size="sm" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
              )}
              {canForRecord('rap', 'submit', detail, 'dibuat_oleh') && detail.status === 'draft' && (
                <Button variant="accent" size="sm" icon={<Send size={15} />} onClick={() => handleSubmit(detail.id)}>
                  Ajukan
                </Button>
              )}
              {can('rap', 'approve') && detail.status === 'submitted' && (
                <Button variant="primary" size="sm" icon={<CheckCircle2 size={15} />} onClick={() => handleApprove(detail)}>
                  Setujui
                </Button>
              )}
              {(can('rap', 'approve') || canForRecord('rap', 'cancel', detail, 'dibuat_oleh')) && ['submitted', 'approved'].includes(detail.status) && (
                <Button variant="danger" size="sm" icon={<XCircle size={15} />} onClick={() => handleCancel(detail)}>
                  Batalkan
                </Button>
              )}
              {canForRecord('rap', 'update', detail, 'dibuat_oleh') && detail.status === 'cancelled' && (
                <Button variant="primary" size="sm" icon={<RefreshCw size={15} />} onClick={() => handleAmend(detail)}>
                  Ubah
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
