import React from 'react'
import { Trash2 } from 'lucide-react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { formatRupiah, formatTanggalPendek } from '../../lib/formatters'

/**
 * @param {object} props
 * @param {Array} props.data
 * @param {boolean} props.loading
 * @param {(row: object) => void} [props.onView]
 * @param {(id: string) => void} props.onDelete
 * @param {boolean} props.canDelete
 */
export default function TransaksiTable({ data = [], loading, onView, onDelete, canDelete }) {
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
      label: 'Kategori / Tempat',
      render: (row) => {
        if (row.tipe === 'transfer') {
          const asal = row.akun_keuangan?.nama || '—'
          const tujuan = row.akun_tujuan?.nama || '—'
          return <span className="text-xs">{asal} → {tujuan}</span>
        }
        const tempat = row.akun_keuangan?.nama
        const kat = row.kategori_transaksi?.nama || '—'
        return (
          <span className="text-xs">
            {kat}
            {tempat ? <span className="text-stone"> · {tempat}</span> : null}
          </span>
        )
      },
    },
    { key: 'keterangan', label: 'Keterangan', render: (row) => row.keterangan || '—' },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (row) => (
        <span
          className={`font-mono font-medium ${
            row.tipe === 'pemasukan'
              ? 'text-success'
              : row.tipe === 'transfer'
                ? 'text-brand'
                : 'text-danger'
          }`}
        >
          {row.tipe === 'pemasukan' ? '+' : row.tipe === 'transfer' ? '' : '-'}
          {formatRupiah(row.jumlah)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status || 'draft'} />,
    },
    {
      key: 'dibuat_oleh',
      label: 'Dibuat Oleh',
      render: (row) => (
        <span className="text-xs text-stone">{row.anggota_organisasi?.nama_lengkap || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-1 items-center">
          {onView && (
            <button
              onClick={() => onView(row)}
              className="text-xs text-brand hover:underline"
            >
              Detail
            </button>
          )}
          {canDelete && row.status === 'cancelled' && (
            <button
              onClick={() => onDelete(row.id)}
              className="text-stone hover:text-danger transition-colors p-1"
              aria-label="Hapus transaksi"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <Table
      caption="Daftar transaksi kas"
      columns={columns}
      data={data}
      loading={loading}
      loadingText="Memuat transaksi..."
      emptyText="Belum ada transaksi"
    />
  )
}
