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
  const columns = [
    { key: 'nama_item', label: 'Item Realisasi' },
    {
      key: 'jumlah_realisasi',
      label: 'Jumlah',
      render: (row) => (
        <span className="font-mono font-medium text-charcoal">
          {formatRupiah(row.jumlah_realisasi)}
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
      columns={columns}
      data={data}
      loading={loading}
      emptyText="Belum ada RAP"
    />
  )
}
