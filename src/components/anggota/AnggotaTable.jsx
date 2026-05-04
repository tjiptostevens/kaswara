import React from 'react'
import { Pencil, UserMinus } from 'lucide-react'
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
      key: 'email',
      label: 'Email',
      render: (row) => (
        <span className="text-xs text-stone">{row.email || '—'}</span>
      ),
    },
    {
      key: 'no_hp',
      label: 'No. HP',
      render: (row) => (
        <span className="text-xs text-stone">{row.no_hp || '—'}</span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <span className="text-xs font-medium text-stone">{ROLE_LABELS[row.role] || row.role}</span>
      ),
    },
    {
      key: 'can_manage_rab',
      label: 'Kelola RAB',
      render: (row) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-pill ${row.can_manage_rab ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#F1EFE8] text-[#5F5E5A]'
            }`}
        >
          {row.can_manage_rab ? 'Ya' : 'Tidak'}
        </span>
      ),
    },
    {
      key: 'can_approve_rab',
      label: 'Setujui RAB',
      render: (row) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-pill ${row.can_approve_rab ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-[#F1EFE8] text-[#5F5E5A]'
            }`}
        >
          {row.can_approve_rab ? 'Ya' : 'Tidak'}
        </span>
      ),
    },
    {
      key: 'aktif',
      label: 'Status',
      render: (row) => (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-pill ${row.aktif ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#F1EFE8] text-[#5F5E5A]'
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
                aria-label="Keluarkan dari organisasi"
              >
                <UserMinus size={15} />
              </button>
            </div>
          ),
        },
      ]
      : []),
  ]

  return (
    <Table
      caption="Daftar anggota organisasi"
      columns={columns}
      data={data}
      loading={loading}
      loadingText="Memuat data anggota..."
      emptyText="Belum ada anggota"
    />
  )
}
