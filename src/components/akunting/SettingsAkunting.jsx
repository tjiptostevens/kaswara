import React, { useEffect, useState } from 'react'
import { useAkunting } from '../../hooks/useAkunting'
import { MODE_AKUNTING, MATA_UANG } from '../../constants/akunting'
import { Input, Button } from '../ui'
import useUIStore from '../../stores/uiStore'
import { getTodayString, formatRupiah } from '../../lib/formatters'

/**
 * Panel pengaturan akunting: mode, mata uang, migrasi, closing, custom range
 */
export default function SettingsAkunting() {
  const {
    mode,
    setMode,
    pengaturan,
    updatePengaturan,
    aktifkanSistem,
    akunKeuangan,
    saldoAkun,
    sistemAktif,
    orgId,
    userId,
    fetchPeriodeClosing,
    periodeClosing,
    tutupPeriode,
    mataUang,
  } = useAkunting()
  const showToast = useUIStore((s) => s.showToast)

  const [currency, setCurrency] = useState(mataUang || 'IDR')
  const [tanggalMulai, setTanggalMulai] = useState(getTodayString())
  const [saldoAwalMap, setSaldoAwalMap] = useState({})
  const [activating, setActivating] = useState(false)
  const [closingDari, setClosingDari] = useState('')
  const [closingSampai, setClosingSampai] = useState('')
  const [closingLoading, setClosingLoading] = useState(false)
  const [rangeDari, setRangeDari] = useState(pengaturan?.custom_range_dari || '')
  const [rangeSampai, setRangeSampai] = useState(pengaturan?.custom_range_sampai || '')

  useEffect(() => {
    setCurrency(pengaturan?.mata_uang || 'IDR')
    setRangeDari(pengaturan?.custom_range_dari || '')
    setRangeSampai(pengaturan?.custom_range_sampai || '')
  }, [pengaturan])

  useEffect(() => {
    if (orgId) fetchPeriodeClosing(orgId)
  }, [orgId])

  useEffect(() => {
    const map = {}
    for (const a of akunKeuangan) {
      map[a.id] = Number(a.saldo_awal || 0)
    }
    setSaldoAwalMap(map)
  }, [akunKeuangan])

  const handleMode = async (next) => {
    const { error } = await setMode(userId, orgId, next)
    if (error) showToast('Gagal mengubah mode: ' + error.message, 'error')
    else showToast(next === 'simple' ? 'Mode Simple aktif' : 'Mode Advance aktif')
  }

  const handleCurrency = async () => {
    const meta = MATA_UANG.find((m) => m.kode === currency)
    const { error } = await updatePengaturan(orgId, {
      mata_uang: currency,
      simbol_mata_uang: meta?.simbol || currency,
    })
    if (error) showToast('Gagal menyimpan: ' + error.message, 'error')
    else showToast('Mata uang disimpan')
  }

  const handleCustomRange = async () => {
    const { error } = await updatePengaturan(orgId, {
      custom_range_dari: rangeDari || null,
      custom_range_sampai: rangeSampai || null,
    })
    if (error) showToast('Gagal menyimpan: ' + error.message, 'error')
    else showToast('Rentang laporan default disimpan')
  }

  const handleAktifkan = async () => {
    if (!window.confirm(
      'Aktifkan sistem akunting baru mulai tanggal yang dipilih?\n\n' +
      'Saldo awal yang Anda isi akan menjadi titik mulai. ' +
      'Transaksi lama sebelum tanggal ini tetap ada di riwayat, tetapi laporan Advance dihitung dari sistem baru.'
    )) return

    setActivating(true)
    const list = Object.entries(saldoAwalMap).map(([akun_keuangan_id, saldo_awal]) => ({
      akun_keuangan_id,
      saldo_awal: Number(saldo_awal) || 0,
    }))
    const { error } = await aktifkanSistem(orgId, tanggalMulai, list)
    setActivating(false)
    if (error) showToast('Gagal mengaktifkan: ' + error.message, 'error')
    else showToast('Sistem akunting aktif! Anda bisa mulai mencatat di tempat uang.')
  }

  const handleClosing = async () => {
    if (!closingDari || !closingSampai) {
      showToast('Isi periode closing', 'error')
      return
    }
    if (!window.confirm(`Tutup buku ${closingDari} s/d ${closingSampai}? Periode yang ditutup tidak bisa diubah lagi dengan mudah.`)) return
    setClosingLoading(true)
    const { data, error } = await tutupPeriode({
      organisasiId: orgId,
      periodeDari: closingDari,
      periodeSampai: closingSampai,
      tipe: 'custom',
      userId,
    })
    setClosingLoading(false)
    if (error) showToast('Gagal closing: ' + error.message, 'error')
    else showToast(`Closing berhasil. Laba/Rugi: ${formatRupiah(data?.labaRugi || 0)}`)
  }

  return (
    <div className="space-y-6">
      {/* Mode tampilan */}
      <div className="glass-card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0f3d32]">Mode Tampilan Keuangan</h3>
          <p className="text-xs text-stone mt-1">
            Data sama — yang berubah hanya tampilan. Default: Simple (mudah untuk semua orang).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              id: MODE_AKUNTING.SIMPLE,
              title: 'Simple',
              desc: 'Lihat uang di Cash, Bank, hutang & piutang — tanpa istilah akuntansi.',
            },
            {
              id: MODE_AKUNTING.ADVANCE,
              title: 'Advance',
              desc: 'Laporan Arus Kas, Laba Rugi, Neraca, dan dasar pajak.',
            },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleMode(m.id)}
              className={`text-left p-3 rounded-input border transition-colors ${
                mode === m.id
                  ? 'border-brand bg-brand-light'
                  : 'border-border hover:bg-warm'
              }`}
            >
              <p className={`text-sm font-semibold ${mode === m.id ? 'text-brand' : 'text-charcoal'}`}>
                {m.title}
              </p>
              <p className="text-[11px] text-stone mt-1 leading-snug">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Mata uang */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#0f3d32]">Mata Uang</h3>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-input border border-border bg-white/50 px-3 py-2.5 text-sm"
        >
          {MATA_UANG.map((m) => (
            <option key={m.kode} value={m.kode}>
              {m.kode} — {m.nama} ({m.simbol})
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={handleCurrency}>
          Simpan mata uang
        </Button>
      </div>

      {/* Custom range default */}
      <div className="glass-card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-[#0f3d32]">Rentang Laporan Default</h3>
          <p className="text-xs text-stone mt-1">
            Digunakan sebagai periode awal di laporan Advance. Bisa diganti bulanan/tahunan di halaman laporan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dari" type="date" value={rangeDari} onChange={(e) => setRangeDari(e.target.value)} />
          <Input label="Sampai" type="date" value={rangeSampai} onChange={(e) => setRangeSampai(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={handleCustomRange}>
          Simpan rentang
        </Button>
      </div>

      {/* Migrasi / aktifkan sistem */}
      <div className="glass-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0f3d32]">Mulai Sistem Akunting Baru</h3>
          <p className="text-xs text-stone mt-1 leading-relaxed">
            Anda menentukan kapan mulai. Isi saldo awal tiap tempat uang pada tanggal mulai.
            {sistemAktif && pengaturan?.tanggal_mulai_sistem && (
              <span className="block mt-2 text-success font-medium">
                Sistem aktif sejak {pengaturan.tanggal_mulai_sistem}
              </span>
            )}
          </p>
        </div>

        <Input
          label="Tanggal mulai sistem"
          type="date"
          value={tanggalMulai}
          onChange={(e) => setTanggalMulai(e.target.value)}
        />

        <div className="space-y-2">
          <p className="text-xs font-medium text-charcoal uppercase tracking-wide">Saldo awal per tempat uang</p>
          {akunKeuangan.length === 0 ? (
            <p className="text-xs text-stone">Belum ada tempat uang. Tambahkan di menu Tempat Uang dulu.</p>
          ) : (
            akunKeuangan.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{a.nama}</span>
                <input
                  type="number"
                  className="w-36 rounded-input border border-border px-3 py-2 text-sm"
                  value={saldoAwalMap[a.id] ?? 0}
                  onChange={(e) =>
                    setSaldoAwalMap((m) => ({ ...m, [a.id]: e.target.value }))
                  }
                />
              </div>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          loading={activating}
          onClick={handleAktifkan}
          disabled={akunKeuangan.length === 0}
        >
          {sistemAktif ? 'Aktifkan ulang / perbarui saldo awal' : 'Aktifkan sistem sekarang'}
        </Button>
      </div>

      {/* Closing periode */}
      {sistemAktif && (
        <div className="glass-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0f3d32]">Tutup Buku (Closing Periode)</h3>
            <p className="text-xs text-stone mt-1">
              Memindahkan laba/rugi periode ke Laba Ditahan. Lakukan di akhir bulan atau tahun.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dari" type="date" value={closingDari} onChange={(e) => setClosingDari(e.target.value)} />
            <Input label="Sampai" type="date" value={closingSampai} onChange={(e) => setClosingSampai(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" loading={closingLoading} onClick={handleClosing}>
            Tutup buku periode ini
          </Button>

          {periodeClosing?.length > 0 && (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <p className="text-xs font-medium text-stone uppercase">Riwayat closing</p>
              {periodeClosing.slice(0, 5).map((p) => (
                <div key={p.id} className="text-xs text-charcoal flex justify-between">
                  <span>{p.periode_dari} → {p.periode_sampai}</span>
                  <span className="text-stone">{p.tipe}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ringkas posisi saat ini */}
      {saldoAkun.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[#0f3d32] mb-3">Posisi tempat uang saat ini</h3>
          <div className="space-y-2">
            {saldoAkun.filter((a) => a.aktif !== false).map((a) => (
              <div key={a.akun_keuangan_id} className="flex justify-between text-sm">
                <span>{a.nama}</span>
                <span className="font-medium tabular-nums">{formatRupiah(Number(a.saldo || 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
