import React from 'react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { formatRupiah, formatTanggalPendek } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.data
 * @param {boolean} props.loading
 * @param {(row: object) => void} [props.onView]
 */
export default function RAPTable({ data = [], loading, onView }) {
  const getTotals = (row) => {
    const items = row.rap_item_realisasi || []
    const itemTotalAnggaran = items.reduce((sum, item) => sum + Number(item.subtotal_anggaran || 0), 0)
    const itemTotalRAP = items.reduce((sum, item) => sum + Number(item.jumlah_realisasi || 0), 0)
    const totalAnggaran = itemTotalAnggaran || Number(row.rab?.total_anggaran || 0)
    const totalRAP = itemTotalRAP || Number(row.jumlah_realisasi || 0)
    const selisih = totalRAP - totalAnggaran
    const disparitas = selisih === 0 ? 'tepat' : selisih > 0 ? 'lebih' : 'kurang'
    return { totalAnggaran, totalRAP, selisih, disparitas }
  }

  const columns = [
    { key: 'nama_item', label: 'Item Realisasi' },
    {
      key: 'anggaran',
      label: 'Total RAB',
      render: (row) => (
        <span className="font-mono font-medium text-charcoal">
          {formatRupiah(getTotals(row).totalAnggaran)}
        </span>
      ),
    },
    {
      key: 'jumlah_realisasi',
      label: 'Total RAP',
      render: (row) => (
        <span className="font-mono font-medium text-charcoal">
          {formatRupiah(getTotals(row).totalRAP)}
        </span>
      ),
    },
    {
      key: 'tanggal_realisasi',
      label: 'Tanggal',
      render: (row) => formatTanggalPendek(row.tanggal_realisasi),
    },
    { key: 'keterangan', label: 'Keterangan', render: (row) => row.keterangan || '—' },
    {
      key: 'disparitas',
      label: 'Disparitas',
      render: (row) => {
        const { disparitas, selisih } = getTotals(row)
        return (
          <span className={`text-xs font-medium ${disparitas === 'tepat' ? 'text-success' : disparitas === 'lebih' ? 'text-danger' : 'text-info'}`}>
            {disparitas.toUpperCase()} ({formatRupiah(Math.abs(selisih))})
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status || 'draft'} />,
    },
    {
      key: 'foto',
      label: 'Bukti',
      render: (row) =>
        row.rap_foto?.length ? (
          <span className="text-xs text-brand">{row.rap_foto.length} foto</span>
        ) : (
          <span className="text-xs text-stone">—</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => onView?.(row)}
          className="text-xs text-brand hover:underline"
        >
          Detail
        </button>
      ),
    },
  ]

  return (
    <Table
      caption="Daftar realisasi anggaran"
      columns={columns}
      data={data}
      loading={loading}
      loadingText="Memuat data RAP..."
      emptyText="Belum ada RAP"
    />
  )
}
