import React, { useEffect, useMemo, useState } from 'react'
import { formatRupiah } from '../../lib/formatters'
import { useAkunting } from '../../hooks/useAkunting'
import Button from '../ui/Button'
import { FileDown } from 'lucide-react'

function PeriodPicker({ dari, sampai, onChange, presets }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-stone font-medium">Dari</label>
        <input
          type="date"
          value={dari}
          onChange={(e) => onChange({ dari: e.target.value, sampai })}
          className="rounded-input border border-border bg-white/50 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase text-stone font-medium">Sampai</label>
        <input
          type="date"
          value={sampai}
          onChange={(e) => onChange({ dari, sampai: e.target.value })}
          className="rounded-input border border-border bg-white/50 px-3 py-2 text-sm"
        />
      </div>
      {presets?.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onChange(p.range)}
          className="text-xs px-2.5 py-2 rounded-input border border-border text-stone hover:bg-warm"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function ReportTable({ title, rows, currency, simbol, totalLabel, total }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60">
        <h4 className="text-sm font-bold text-brand-dark">{title}</h4>
      </div>
      <div className="divide-y divide-border/40">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-stone text-center">Tidak ada data pada periode ini</p>
        ) : (
          rows.map((r) => (
            <div key={r.id || r.kode} className="px-5 py-2.5 flex justify-between text-sm">
              <span className="text-charcoal">
                <span className="text-stone font-mono text-xs mr-2">{r.kode}</span>
                {r.nama}
              </span>
              <span className="font-medium tabular-nums">
                {formatRupiah(r.saldo, { currency, simbol })}
              </span>
            </div>
          ))
        )}
      </div>
      {totalLabel != null && (
        <div className="px-5 py-3 bg-warm/50 flex justify-between text-sm font-bold border-t border-border">
          <span>{totalLabel}</span>
          <span className="tabular-nums">{formatRupiah(total, { currency, simbol })}</span>
        </div>
      )}
    </div>
  )
}

function monthRange(offset = 0) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const dari = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const sampai = last.toISOString().split('T')[0]
  return { dari, sampai }
}

function yearRange(offset = 0) {
  const y = new Date().getFullYear() + offset
  return { dari: `${y}-01-01`, sampai: `${y}-12-31` }
}

/**
 * Laporan Advance: Cash Flow, P&L, Balance Sheet
 */
export default function LaporanAdvance({ onExport }) {
  const {
    orgId,
    fetchLaporanCoa,
    mataUang,
    simbolMataUang,
    pengaturan,
    sistemAktif,
  } = useAkunting()

  const initial = useMemo(() => {
    if (pengaturan?.custom_range_dari && pengaturan?.custom_range_sampai) {
      return { dari: pengaturan.custom_range_dari, sampai: pengaturan.custom_range_sampai }
    }
    return monthRange(0)
  }, [pengaturan?.custom_range_dari, pengaturan?.custom_range_sampai])

  const [range, setRange] = useState(initial)
  const [tab, setTab] = useState('cashflow')
  const [coa, setCoa] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!orgId || !sistemAktif) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await fetchLaporanCoa(orgId, range)
      if (!cancelled) {
        setCoa(data || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId, range.dari, range.sampai, sistemAktif])

  const currency = mataUang
  const simbol = simbolMataUang

  const pendapatan = coa.filter((c) => c.tipe === 'pendapatan' && c.saldo !== 0)
  const beban = coa.filter((c) => c.tipe === 'beban' && c.saldo !== 0)
  const aset = coa.filter((c) => c.tipe === 'aset')
  const kewajiban = coa.filter((c) => c.tipe === 'kewajiban')
  const ekuitas = coa.filter((c) => c.tipe === 'ekuitas')

  const totalPendapatan = pendapatan.reduce((s, c) => s + c.saldo, 0)
  const totalBeban = beban.reduce((s, c) => s + c.saldo, 0)
  const labaRugi = totalPendapatan - totalBeban
  const totalAset = aset.reduce((s, c) => s + c.saldo, 0)
  const totalKewajiban = kewajiban.reduce((s, c) => s + c.saldo, 0)
  const totalEkuitas = ekuitas.reduce((s, c) => s + c.saldo, 0) + labaRugi

  // Cash flow sederhana: kas/bank mutasi = debit-kredit pada sub_tipe kas/bank
  const kasBank = coa.filter((c) => c.sub_tipe === 'kas' || c.sub_tipe === 'bank')
  const operatingIn = totalPendapatan
  const operatingOut = totalBeban
  const netCash = kasBank.reduce((s, c) => s + c.saldo, 0)

  if (!sistemAktif) {
    return (
      <div className="glass-card p-8 text-center space-y-2">
        <p className="font-semibold text-[#0f3d32]">Sistem akunting belum diaktifkan</p>
        <p className="text-sm text-stone">
          Buka Pengaturan → Aktifkan Sistem Akunting untuk mulai membuat laporan Advance.
        </p>
      </div>
    )
  }

  const presets = [
    { label: 'Bulan ini', range: monthRange(0) },
    { label: 'Bulan lalu', range: monthRange(-1) },
    { label: 'Tahun ini', range: yearRange(0) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker dari={range.dari} sampai={range.sampai} onChange={setRange} presets={presets} />
        {onExport && (
          <Button variant="secondary" size="sm" icon={<FileDown size={14} />} onClick={() => onExport(tab, { coa, range, labaRugi })}>
            Export
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'cashflow', label: 'Arus Kas' },
          { id: 'pl', label: 'Laba Rugi' },
          { id: 'bs', label: 'Neraca' },
          { id: 'pajak', label: 'Dasar Pajak' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-input text-sm border ${
              tab === t.id ? 'bg-brand text-white border-brand' : 'border-border text-stone hover:bg-warm'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center text-stone text-sm">Menyiapkan laporan...</div>
      ) : tab === 'cashflow' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase text-stone">Masuk (operasi)</p>
              <p className="text-lg font-bold text-success mt-1">{formatRupiah(operatingIn, { currency, simbol })}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase text-stone">Keluar (operasi)</p>
              <p className="text-lg font-bold text-danger mt-1">{formatRupiah(operatingOut, { currency, simbol })}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase text-stone">Posisi kas & bank</p>
              <p className="text-lg font-bold text-brand-dark mt-1">{formatRupiah(netCash, { currency, simbol })}</p>
            </div>
          </div>
          <ReportTable
            title="Rincian Kas & Bank"
            rows={kasBank}
            currency={currency}
            simbol={simbol}
            totalLabel="Total Kas & Bank"
            total={netCash}
          />
        </div>
      ) : tab === 'pl' ? (
        <div className="space-y-4">
          <ReportTable title="Pendapatan" rows={pendapatan} currency={currency} simbol={simbol} totalLabel="Total Pendapatan" total={totalPendapatan} />
          <ReportTable title="Beban" rows={beban} currency={currency} simbol={simbol} totalLabel="Total Beban" total={totalBeban} />
          <div className={`glass-card p-5 flex justify-between items-center ${labaRugi >= 0 ? 'bg-[#E1F5EE]/40' : 'bg-[#FCEBEB]/40'}`}>
            <span className="font-bold text-[#0f3d32]">{labaRugi >= 0 ? 'Laba bersih' : 'Rugi bersih'}</span>
            <span className={`text-xl font-bold tabular-nums ${labaRugi >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatRupiah(Math.abs(labaRugi), { currency, simbol })}
            </span>
          </div>
        </div>
      ) : tab === 'bs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReportTable title="Aset" rows={aset.filter((a) => a.saldo !== 0)} currency={currency} simbol={simbol} totalLabel="Total Aset" total={totalAset} />
          <div className="space-y-4">
            <ReportTable title="Kewajiban" rows={kewajiban.filter((a) => a.saldo !== 0)} currency={currency} simbol={simbol} totalLabel="Total Kewajiban" total={totalKewajiban} />
            <ReportTable
              title="Ekuitas"
              rows={[
                ...ekuitas.filter((a) => a.saldo !== 0),
                { id: 'laba-berjalan', kode: '', nama: labaRugi >= 0 ? 'Laba periode berjalan' : 'Rugi periode berjalan', saldo: labaRugi },
              ]}
              currency={currency}
              simbol={simbol}
              totalLabel="Total Ekuitas"
              total={totalEkuitas}
            />
            <div className="glass-card p-4 text-sm flex justify-between font-bold">
              <span>Kewajiban + Ekuitas</span>
              <span className="tabular-nums">{formatRupiah(totalKewajiban + totalEkuitas, { currency, simbol })}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-3">
            <h4 className="text-sm font-bold text-brand-dark">Dasar Laporan Pajak</h4>
            <p className="text-xs text-stone leading-relaxed">
              Ringkasan ini membantu menyiapkan data untuk SPT perorangan (1770/1770S) atau laporan organisasi.
              Bukan pengganti konsultan pajak — verifikasi sebelum dilaporkan.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-warm/60 rounded-input p-3">
                <p className="text-[10px] uppercase text-stone">Penghasilan bruto (pendapatan)</p>
                <p className="font-bold text-lg mt-1">{formatRupiah(totalPendapatan, { currency, simbol })}</p>
              </div>
              <div className="bg-warm/60 rounded-input p-3">
                <p className="text-[10px] uppercase text-stone">Biaya / beban</p>
                <p className="font-bold text-lg mt-1">{formatRupiah(totalBeban, { currency, simbol })}</p>
              </div>
              <div className="bg-warm/60 rounded-input p-3">
                <p className="text-[10px] uppercase text-stone">Penghasilan neto</p>
                <p className={`font-bold text-lg mt-1 ${labaRugi >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatRupiah(labaRugi, { currency, simbol })}
                </p>
              </div>
              <div className="bg-warm/60 rounded-input p-3">
                <p className="text-[10px] uppercase text-stone">Periode</p>
                <p className="font-medium text-sm mt-1">{range.dari} s/d {range.sampai}</p>
              </div>
            </div>
          </div>
          <ReportTable title="Rincian pendapatan (dasar pajak)" rows={pendapatan} currency={currency} simbol={simbol} />
          <ReportTable title="Rincian beban (dasar pajak)" rows={beban} currency={currency} simbol={simbol} />
        </div>
      )}
    </div>
  )
}
