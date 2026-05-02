import React, { useRef } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import StatGrid from '../components/dashboard/StatGrid'
import TransaksiTable from '../components/transaksi/TransaksiTable'
import { Button } from '../components/ui'
import { FileDown } from 'lucide-react'
import { useTransaksi } from '../hooks/useTransaksi'
import { useAuth } from '../hooks/useAuth'
import { generateLaporanPDF } from '../lib/pdfExport'
import { formatPeriode } from '../lib/formatters'

export default function LaporanPage() {
  const { organisasi, isBendahara } = useAuth()
  const { transaksi, saldo, totalPemasukan, totalPengeluaran, loading } = useTransaksi()
  const reportRef = useRef(null)

  const periode = formatPeriode(new Date())

  const handleExport = () => {
    generateLaporanPDF(
      {
        saldoAkhir: saldo,
        totalPemasukan,
        totalPengeluaran,
        transaksi: transaksi.map((t) => ({
          tanggal: t.tanggal,
          keterangan: t.keterangan || t.kategori_transaksi?.nama,
          tipe: t.tipe,
          jumlah: t.jumlah,
        })),
      },
      periode,
      organisasi?.nama || 'Kaswara'
    )
  }

  return (
    <PageWrapper title="Laporan">
      <div className="space-y-6" ref={reportRef}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0f3d32]">Laporan Keuangan</h2>
            <p className="text-sm text-stone">{periode}</p>
          </div>
          {isBendahara && (
            <Button
              variant="secondary"
              size="md"
              icon={<FileDown size={16} />}
              onClick={handleExport}
            >
              Export PDF
            </Button>
          )}
        </div>

        <StatGrid
          saldo={saldo}
          totalPemasukan={totalPemasukan}
          totalPengeluaran={totalPengeluaran}
          periode={periode}
        />

        <div>
          <h3 className="text-sm font-semibold text-[#0f3d32] mb-3">Semua Transaksi</h3>
          <TransaksiTable
            data={transaksi}
            loading={loading}
            canDelete={false}
          />
        </div>
      </div>
    </PageWrapper>
  )
}
