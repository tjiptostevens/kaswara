import React, { useState, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import { Button } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import useUIStore from '../stores/uiStore'
import { formatRupiah, formatPeriode } from '../lib/formatters'
import { Mail, MessageCircle, Send } from 'lucide-react'

export default function IuranPage() {
  const { activeWorkspace, isBendahara } = useAuth()
  const organisasi = activeWorkspace
  const showToast = useUIStore((s) => s.showToast)
  const [iuran, setIuran] = useState([])
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingWA, setSendingWA] = useState({}) // { [iuranId]: boolean }

  const fetchIuran = async () => {
    if (!organisasi?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('iuran_rutin')
      .select('*, anggota_organisasi(nama_lengkap, nomor_anggota, email, no_hp)')
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

  const handleKirimEmailSemua = async () => {
    if (!organisasi?.id) return
    setSendingEmail(true)
    const { data, error } = await supabase.functions.invoke('send-reminder', {
      body: { organisasi_id: organisasi.id },
    })
    setSendingEmail(false)
    if (error) {
      showToast('Gagal kirim email: ' + error.message, 'error')
    } else if (data?.sent === 0) {
      showToast(data.message || 'Tidak ada anggota yang perlu diingatkan', 'info')
    } else {
      showToast(`Email pengingat terkirim ke ${data.sent} anggota!`)
    }
  }

  const handleKirimWA = async (row) => {
    const noHp = row.anggota_organisasi?.no_hp
    if (!noHp) { showToast('Nomor HP anggota tidak tersedia', 'error'); return }

    const namaAnggota = row.anggota_organisasi?.nama_lengkap || 'Anggota'
    const pesan =
      `Yth. ${namaAnggota},\n\nIni pengingat bahwa iuran bulan *${formatPeriode(row.periode)}* ` +
      `sebesar *Rp ${Number(row.jumlah).toLocaleString('id-ID')}* dari *${organisasi?.nama}* ` +
      `belum tercatat lunas.\n\nMohon segera melakukan pembayaran kepada bendahara.\n\nTerima kasih.`

    setSendingWA((prev) => ({ ...prev, [row.id]: true }))
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { no_hp: noHp, pesan, organisasi_id: organisasi.id },
    })
    setSendingWA((prev) => ({ ...prev, [row.id]: false }))

    if (error || data?.error) {
      showToast('Gagal kirim WA: ' + (data?.error || error?.message), 'error')
    } else {
      showToast(`WA terkirim ke ${namaAnggota}!`)
    }
  }

  const belumBayarCount = iuran.filter((i) => i.status === 'belum_bayar').length

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
            render: (row) => (
              <div className="flex items-center gap-1">
                {row.status === 'belum_bayar' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleBayar(row.id)}
                  >
                    Tandai lunas
                  </Button>
                )}
                {row.status === 'belum_bayar' && row.anggota_organisasi?.no_hp && (
                  <button
                    onClick={() => handleKirimWA(row)}
                    disabled={sendingWA[row.id]}
                    title="Kirim pengingat WhatsApp"
                    className="p-1.5 rounded-input text-stone hover:text-[#25d366] hover:bg-[#e7fbe7] transition-colors disabled:opacity-50"
                  >
                    <MessageCircle size={15} />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <PageWrapper title="Iuran">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-[#0f3d32]">Iuran Rutin</h2>
          {isBendahara && belumBayarCount > 0 && (
            <Button
              variant="secondary"
              size="md"
              icon={sendingEmail ? <Send size={15} className="animate-pulse" /> : <Mail size={15} />}
              onClick={handleKirimEmailSemua}
              loading={sendingEmail}
            >
              Kirim Pengingat Email ({belumBayarCount})
            </Button>
          )}
        </div>
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
