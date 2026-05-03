import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { formatRupiah, formatPeriode, formatTanggalPendek } from './formatters'

/**
 * Export elemen DOM ke PDF menggunakan html2canvas
 * @param {HTMLElement} element
 * @param {string} filename
 */
export async function exportElementToPDF(element, filename = 'laporan-kaswara.pdf') {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(filename)
}

function addPDFHeader(pdf, title, subtitle, namaOrganisasi) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = 20

  pdf.setFontSize(16)
  pdf.setTextColor(26, 107, 90)
  pdf.setFont('helvetica', 'bold')
  pdf.text(title, pageWidth / 2, y, { align: 'center' })

  y += 7
  pdf.setFontSize(12)
  pdf.setTextColor(60, 60, 58)
  pdf.text(namaOrganisasi || 'Kaswara', pageWidth / 2, y, { align: 'center' })

  if (subtitle) {
    y += 5
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(120, 120, 115)
    pdf.text(subtitle, pageWidth / 2, y, { align: 'center' })
  }

  y += 6
  pdf.setDrawColor(229, 228, 222)
  pdf.line(14, y, pageWidth - 14, y)
  return y + 8
}

function addPDFFooter(pdf) {
  const pageCount = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(155, 155, 149)
    pdf.text(
      `Dicetak oleh Kaswara — Kas Warga Indonesia • Halaman ${i} dari ${pageCount}`,
      pdf.internal.pageSize.getWidth() / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
}

/**
 * Generate laporan keuangan sebagai PDF
 */
export function generateLaporanPDF(data, periode, namaOrganisasi) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = addPDFHeader(pdf, 'LAPORAN KEUANGAN KAS', `Periode: ${periode}`, namaOrganisasi)

  // Ringkasan
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(15, 61, 50)
  pdf.text('Ringkasan', 14, y)
  y += 7

  const ringkasan = [
    ['Saldo Awal', formatRupiah(data.saldoAwal || 0)],
    ['Total Pemasukan', formatRupiah(data.totalPemasukan || 0)],
    ['Total Pengeluaran', formatRupiah(data.totalPengeluaran || 0)],
    ['Saldo Akhir', formatRupiah(data.saldoAkhir || 0)],
  ]

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  ringkasan.forEach(([label, value]) => {
    pdf.setTextColor(60, 60, 58)
    pdf.text(label, 14, y)
    pdf.text(value, pageWidth - 14, y, { align: 'right' })
    y += 6
  })

  y += 4
  pdf.setDrawColor(229, 228, 222)
  pdf.line(14, y, pageWidth - 14, y)
  y += 8

  // Detail Transaksi
  if (data.transaksi && data.transaksi.length > 0) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 61, 50)
    pdf.text('Detail Transaksi', 14, y)
    y += 7

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(120, 120, 115)
    pdf.text('Tanggal', 14, y)
    pdf.text('Keterangan', 45, y)
    pdf.text('Tipe', 130, y)
    pdf.text('Jumlah', pageWidth - 14, y, { align: 'right' })
    y += 2
    pdf.line(14, y, pageWidth - 14, y)
    y += 5

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    data.transaksi.forEach((t) => {
      if (y > 270) { pdf.addPage(); y = 20 }
      pdf.setTextColor(60, 60, 58)
      pdf.text(t.tanggal || '', 14, y)
      const keterangan = (t.keterangan || '').substring(0, 40)
      pdf.text(keterangan, 45, y)
      const isMasuk = t.tipe === 'pemasukan'
      pdf.setTextColor(isMasuk ? 29 : 226, isMasuk ? 158 : 75, isMasuk ? 117 : 74)
      pdf.text(isMasuk ? 'Masuk' : 'Keluar', 130, y)
      pdf.text(formatRupiah(t.jumlah || 0), pageWidth - 14, y, { align: 'right' })
      pdf.setTextColor(60, 60, 58)
      y += 6
    })
  }

  addPDFFooter(pdf)
  pdf.save(`laporan-${periode.replace(/\s/g, '-').toLowerCase()}.pdf`)
}

/**
 * Generate daftar transaksi sebagai PDF
 * @param {Array} transaksi
 * @param {string} namaOrganisasi
 */
export function generateTransaksiPDF(transaksi, namaOrganisasi) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  let y = addPDFHeader(pdf, 'DAFTAR TRANSAKSI', `Dicetak: ${now}`, namaOrganisasi)

  // Header row
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(120, 120, 115)
  pdf.text('Tanggal', 14, y)
  pdf.text('Keterangan', 42, y)
  pdf.text('Tipe', 110, y)
  pdf.text('Status', 128, y)
  pdf.text('Jumlah', pageWidth - 14, y, { align: 'right' })
  y += 2
  pdf.setDrawColor(229, 228, 222)
  pdf.line(14, y, pageWidth - 14, y)
  y += 5

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)

  transaksi.forEach((t) => {
    if (y > 270) { pdf.addPage(); y = 20 }
    pdf.setTextColor(60, 60, 58)
    pdf.text(t.tanggal ? formatTanggalPendek(t.tanggal) : '—', 14, y)
    const ket = (t.keterangan || '—').substring(0, 32)
    pdf.text(ket, 42, y)
    const isMasuk = t.tipe === 'pemasukan'
    pdf.setTextColor(isMasuk ? 29 : 226, isMasuk ? 158 : 75, isMasuk ? 117 : 74)
    pdf.text(isMasuk ? 'Masuk' : 'Keluar', 110, y)
    pdf.setTextColor(90, 90, 85)
    pdf.text(t.status || 'draft', 128, y)
    pdf.setTextColor(isMasuk ? 29 : 226, isMasuk ? 158 : 75, isMasuk ? 117 : 74)
    pdf.text(formatRupiah(t.jumlah || 0), pageWidth - 14, y, { align: 'right' })
    pdf.setTextColor(60, 60, 58)
    y += 6
  })

  addPDFFooter(pdf)
  pdf.save(`transaksi-${Date.now()}.pdf`)
}

/**
 * Generate daftar RAB sebagai PDF
 * @param {Array} rabList
 * @param {string} namaOrganisasi
 */
export function generateRABPDF(rabList, namaOrganisasi) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  let y = addPDFHeader(pdf, 'RENCANA ANGGARAN BIAYA (RAB)', `Dicetak: ${now}`, namaOrganisasi)

  rabList.forEach((rab) => {
    if (y > 240) { pdf.addPage(); y = 20 }

    // RAB Header
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(15, 61, 50)
    pdf.text(rab.nama_kegiatan || '—', 14, y)
    y += 5

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(90, 90, 85)
    const tglKegiatan = rab.tanggal_kegiatan ? formatTanggalPendek(rab.tanggal_kegiatan) : '—'
    pdf.text(`Tanggal: ${tglKegiatan}  |  Status: ${rab.status || 'draft'}`, 14, y)
    y += 5

    // Items
    if (rab.rab_item?.length) {
      pdf.setFontSize(8)
      pdf.setTextColor(120, 120, 115)
      pdf.text('Item', 18, y)
      pdf.text('Volume', 85, y)
      pdf.text('Harga Satuan', 105, y)
      pdf.text('Subtotal', pageWidth - 14, y, { align: 'right' })
      y += 2
      pdf.setDrawColor(229, 228, 222)
      pdf.line(18, y, pageWidth - 14, y)
      y += 4

      pdf.setTextColor(60, 60, 58)
      rab.rab_item.forEach((item) => {
        if (y > 270) { pdf.addPage(); y = 20 }
        pdf.text((item.nama_item || '').substring(0, 35), 18, y)
        pdf.text(`${item.volume} ${item.satuan}`, 85, y)
        pdf.text(formatRupiah(item.harga_satuan), 105, y)
        pdf.text(formatRupiah(item.subtotal), pageWidth - 14, y, { align: 'right' })
        y += 5
      })
    }

    // Total
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(26, 107, 90)
    pdf.text('Total Anggaran', 14, y)
    pdf.text(formatRupiah(rab.total_anggaran || 0), pageWidth - 14, y, { align: 'right' })
    y += 3
    pdf.setDrawColor(229, 228, 222)
    pdf.line(14, y, pageWidth - 14, y)
    y += 8
  })

  addPDFFooter(pdf)
  pdf.save(`rab-${Date.now()}.pdf`)
}

/**
 * Generate daftar RAP sebagai PDF
 * @param {Array} rapList
 * @param {string} namaOrganisasi
 */
export function generateRAPPDF(rapList, namaOrganisasi) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  let y = addPDFHeader(pdf, 'REALISASI ANGGARAN PENGELUARAN (RAP)', `Dicetak: ${now}`, namaOrganisasi)

  // Header row
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(120, 120, 115)
  pdf.text('Item Realisasi', 14, y)
  pdf.text('Tanggal', 80, y)
  pdf.text('Status', 108, y)
  pdf.text('Jumlah', pageWidth - 14, y, { align: 'right' })
  y += 2
  pdf.setDrawColor(229, 228, 222)
  pdf.line(14, y, pageWidth - 14, y)
  y += 5

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)

  rapList.forEach((rap) => {
    if (y > 270) { pdf.addPage(); y = 20 }
    pdf.setTextColor(60, 60, 58)
    pdf.text((rap.nama_item || '—').substring(0, 35), 14, y)
    pdf.text(rap.tanggal_realisasi ? formatTanggalPendek(rap.tanggal_realisasi) : '—', 80, y)
    pdf.setTextColor(90, 90, 85)
    pdf.text(rap.status || 'draft', 108, y)
    pdf.setTextColor(26, 107, 90)
    pdf.text(formatRupiah(rap.jumlah_realisasi || 0), pageWidth - 14, y, { align: 'right' })
    if (rap.keterangan) {
      y += 4
      pdf.setTextColor(120, 120, 115)
      pdf.setFontSize(8)
      pdf.text(`  ${rap.keterangan.substring(0, 60)}`, 14, y)
      pdf.setFontSize(9)
    }
    pdf.setTextColor(60, 60, 58)
    y += 6
  })

  addPDFFooter(pdf)
  pdf.save(`rap-${Date.now()}.pdf`)
}
