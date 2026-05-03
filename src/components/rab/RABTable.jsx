import React from 'react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { formatRupiah, formatTanggalPendek } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.data
 * @param {boolean} props.loading
 * @param {(row: object) => void} props.onView
 */
export default function RABTable({ data = [], loading, onView }) {
  const columns = [
    { key: 'nama_kegiatan', label: 'Nama Kegiatan' },
    {
      key: 'tanggal_kegiatan',
      label: 'Tgl. Kegiatan',
      render: (row) => formatTanggalPendek(row.tanggal_kegiatan),
    },
    {
      key: 'total_anggaran',
      label: 'Total Anggaran',
      render: (row) => (
        <span className="font-mono font-medium text-charcoal">
          {formatRupiah(row.total_anggaran)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button
          onClick={() => onView(row)}
          className="text-xs text-brand hover:underline"
        >
          Detail
        </button>
      ),
    },
  ]

  return (
    <Table
      caption="Daftar rencana anggaran biaya"
      columns={columns}
      data={data}
      loading={loading}
      loadingText="Memuat data RAB..."
      emptyText="Belum ada RAB"
    />
  )
}
