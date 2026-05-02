import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { formatRupiah, formatPeriode } from './formatters'

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

/**
 * Generate laporan keuangan sebagai PDF
 * @param {object} data - Data laporan
 * @param {string} periode - Periode laporan
 * @param {string} namaOrganisasi - Nama organisasi
 */
export function generateLaporanPDF(data, periode, namaOrganisasi) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = 20

  // Header
  pdf.setFontSize(18)
  pdf.setTextColor(26, 107, 90)
  pdf.setFont('helvetica', 'bold')
  pdf.text('LAPORAN KEUANGAN KAS', pageWidth / 2, y, { align: 'center' })

  y += 8
  pdf.setFontSize(13)
  pdf.setTextColor(60, 60, 58)
  pdf.text(namaOrganisasi || 'Kaswara', pageWidth / 2, y, { align: 'center' })

  y += 6
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(120, 120, 115)
  pdf.text(`Periode: ${periode}`, pageWidth / 2, y, { align: 'center' })

  y += 8
  pdf.setDrawColor(229, 228, 222)
  pdf.line(14, y, pageWidth - 14, y)
  y += 8

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
      if (y > 270) {
        pdf.addPage()
        y = 20
      }
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

  // Footer
  const pageCount = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(155, 155, 149)
    pdf.text(
      `Dicetak oleh Kaswara — Kas Warga Indonesia • Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  pdf.save(`laporan-${periode.replace(/\s/g, '-').toLowerCase()}.pdf`)
}
