import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Table from '../ui/Table'
import { ROLE_LABELS } from '../../constants/roles'

/**
 * @param {object} props
 * @param {Array} props.data
 * @param {boolean} props.loading
 * @param {(row: object) => void} props.onEdit
 * @param {(id: string) => void} props.onDelete
 * @param {boolean} props.canManage
 */
export default function AnggotaTable({ data = [], loading, onEdit, onDelete, canManage }) {
  const columns = [
    {
      key: 'nomor_anggota',
      label: 'No.',
      render: (row) => row.nomor_anggota || '—',
    },
    { key: 'nama_lengkap', label: 'Nama Lengkap' },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <span className="text-xs font-medium text-stone">{ROLE_LABELS[row.role] || row.role}</span>
      ),
    },
    {
      key: 'aktif',
      label: 'Status',
      render: (row) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-pill ${
            row.aktif ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#F1EFE8] text-[#5F5E5A]'
          }`}
        >
          {row.aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(row)}
                  className="text-stone hover:text-brand transition-colors p-1"
                  aria-label="Edit anggota"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(row.id)}
                  className="text-stone hover:text-danger transition-colors p-1"
                  aria-label="Hapus anggota"
                >
                  <Trash2 size={15} />
                </button>
              </div>
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
      emptyText="Belum ada anggota"
    />
  )
}
