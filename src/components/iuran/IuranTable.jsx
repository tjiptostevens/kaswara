import React from 'react'
import { Star, RefreshCw, Gift } from 'lucide-react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { formatRupiah, formatPeriode } from '../../lib/formatters'

/** Human-readable labels for kategori tipe */
export const TIPE_IURAN_LABEL = {
  sukarela: 'Sukarela',
  sekali: 'Sekali',
  wajib: 'Wajib',
}

/** Human-readable labels for frekuensi */
export const FREKUENSI_LABEL = {
  mingguan: 'Mingguan',
  '2_mingguan': '2 Mingguan',
  bulanan: 'Bulanan',
  '2_bulanan': '2 Bulanan',
  '3_bulanan': '3 Bulanan',
  '4_bulanan': '4 Bulanan',
  '6_bulanan': '6 Bulanan',
  tahunan: 'Tahunan',
}

/**
 * Small badge showing the kategori tipe with an appropriate icon.
 */
export function KategoriTipeBadge({ tipe, frekuensi, size = 13 }) {
  if (tipe === 'sekali') {
    return (
      <span
        title="Iuran satu kali"
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF9EC] border border-[#F4DBB4] text-[#854F0B]"
      >
        <Star size={9} className="fill-[#e8a020] stroke-[#e8a020]" />
        Sekali
      </span>
    )
  }
  if (tipe === 'wajib') {
    return (
      <span
        title={frekuensi ? `Wajib — ${FREKUENSI_LABEL[frekuensi] || frekuensi}` : 'Wajib'}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F1FB] border border-[#CDE3F7] text-[#185FA5]"
      >
        <RefreshCw size={9} />
        {frekuensi ? FREKUENSI_LABEL[frekuensi] || frekuensi : 'Wajib'}
      </span>
    )
  }
  // sukarela
  return (
    <span
      title="Iuran sukarela"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1EFE8] border border-[#E5E4DE] text-[#5F5E5A]"
    >
      <Gift size={9} />
      Sukarela
    </span>
  )
}

/**
 * @param {object} props
 * @param {Array} props.data
 * @param {boolean} props.loading
 * @param {(row: object) => void} props.onView
 */
export default function IuranTable({ data = [], loading, onView }) {
  const columns = [
    {
      key: 'anggota',
      label: 'Anggota',
      render: (row) => (
        <span className="font-medium text-charcoal">
          {row.anggota_organisasi?.nama_lengkap || '—'}
        </span>
      ),
    },
    {
      key: 'periode',
      label: 'Periode',
      render: (row) => formatPeriode(row.periode),
    },
    {
      key: 'kategori',
      label: 'Kategori',
      render: (row) =>
        row.kategori_iuran ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-charcoal">{row.kategori_iuran.nama}</span>
            <KategoriTipeBadge
              tipe={row.kategori_iuran.tipe}
              frekuensi={row.kategori_iuran.frekuensi}
            />
          </div>
        ) : (
          <span className="text-stone text-xs">—</span>
        ),
    },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (row) => (
        <span className="font-mono font-medium text-charcoal">{formatRupiah(row.jumlah)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status || 'draft'} />,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <button onClick={() => onView(row)} className="text-xs text-brand hover:underline">
          Detail
        </button>
      ),
    },
  ]

  return (
    <Table
      caption="Daftar iuran"
      columns={columns}
      data={data}
      loading={loading}
      loadingText="Memuat data iuran..."
      emptyText="Belum ada data iuran"
    />
  )
}
