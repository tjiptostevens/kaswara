import React, { useState, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { Button } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatPeriode } from '../lib/formatters'

export default function IuranPage() {
  const { activeWorkspace, isBendahara } = useAuth()
  const organisasi = activeWorkspace
  const showToast = useUIStore((s) => s.showToast)
  const [iuran, setIuran] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchIuran = async () => {
    if (!organisasi?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('iuran_rutin')
      .select('*, anggota_organisasi(nama_lengkap, nomor_anggota)')
      .eq('organisasi_id', organisasi.id)
      .order('periode', { ascending: false })
    setLoading(false)
    if (!error) setIuran(data || [])
  }

  useEffect(() => { fetchIuran() }, [organisasi?.id])

  const handleBayar = async (id) => {
    const { error } = await supabase
      .from('iuran_rutin')
      .update({ status: 'lunas', tanggal_bayar: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    if (error) {
      showToast('Gagal memperbarui: ' + error.message, 'error')
    } else {
      showToast('Iuran berhasil ditandai lunas!')
      fetchIuran()
    }
  }

  const columns = [
    {
      key: 'anggota',
      label: 'Anggota',
      render: (row) => row.anggota_organisasi?.nama_lengkap || '—',
    },
    {
      key: 'periode',
      label: 'Periode',
      render: (row) => formatPeriode(row.periode),
    },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (row) => (
        <span className="font-mono font-medium">{formatRupiah(row.jumlah)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
    ...(isBendahara
      ? [
          {
            key: 'actions',
            label: '',
            render: (row) =>
              row.status === 'belum_bayar' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleBayar(row.id)}
                >
                  Tandai lunas
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <PageWrapper title="Iuran">
      <div className="space-y-5">
        <h2 className="text-lg font-bold text-[#0f3d32]">Iuran Rutin</h2>
        <Table
          columns={columns}
          data={iuran}
          loading={loading}
          emptyText="Belum ada data iuran"
        />
      </div>
    </PageWrapper>
  )
}
