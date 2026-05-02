import React from 'react'
import { Trash2 } from 'lucide-react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { formatRupiah, formatTanggalPendek } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.data
 * @param {boolean} props.loading
 * @param {(id: string) => void} props.onDelete
 * @param {boolean} props.canDelete
 */
export default function TransaksiTable({ data = [], loading, onDelete, canDelete }) {
  const columns = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (row) => formatTanggalPendek(row.tanggal),
    },
    {
      key: 'tipe',
      label: 'Tipe',
      render: (row) => <Badge status={row.tipe} />,
    },
    {
      key: 'kategori',
      label: 'Kategori',
      render: (row) => row.kategori_transaksi?.nama || '—',
    },
    { key: 'keterangan', label: 'Keterangan', render: (row) => row.keterangan || '—' },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (row) => (
        <span
          className={`font-mono font-medium ${
            row.tipe === 'pemasukan' ? 'text-success' : 'text-danger'
          }`}
        >
          {row.tipe === 'pemasukan' ? '+' : '-'}
          {formatRupiah(row.jumlah)}
        </span>
      ),
    },
    ...(canDelete
      ? [
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <button
                onClick={() => onDelete(row.id)}
                className="text-stone hover:text-danger transition-colors p-1"
                aria-label="Hapus transaksi"
              >
                <Trash2 size={15} />
              </button>
            ),
          },
        ]
      : []),
  ]

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      emptyText="Belum ada transaksi"
    />
  )
}
