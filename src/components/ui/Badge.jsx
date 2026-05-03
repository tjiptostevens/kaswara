import React from 'react'

const variants = {
  lunas:      { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  belum_bayar:{ bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]' },
  diajukan:   { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  submitted:  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  disetujui:  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  approved:   { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  ditolak:    { bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]' },
  draft:      { bg: 'bg-[#F1EFE8]', text: 'text-[#5F5E5A]' },
  selesai:    { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  cancelled:  { bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]' },
  amended:    { bg: 'bg-[#EDE9F8]', text: 'text-[#5B3FA8]' },
  pemasukan:  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  pengeluaran:{ bg: 'bg-[#FCEBEB]', text: 'text-[#A32D2D]' },
  dispensasi: { bg: 'bg-[#F1EFE8]', text: 'text-[#5F5E5A]' },
}

const labels = {
  lunas: 'Lunas',
  belum_bayar: 'Belum bayar',
  diajukan: 'Diajukan',
  submitted: 'Diajukan',
  disetujui: 'Disetujui',
  approved: 'Disetujui',
  ditolak: 'Ditolak',
  draft: 'Draft',
  selesai: 'Selesai',
  cancelled: 'Dibatalkan',
  amended: 'Diubah',
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  dispensasi: 'Dispensasi',
}

/**
 * @param {object} props
 * @param {string} props.status - One of the variant keys
 * @param {string} [props.label] - Custom label (overrides default)
 */
export default function Badge({ status, label, className = '' }) {
  const style = variants[status] || variants.draft
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {label ?? labels[status] ?? status}
    </span>
  )
}
