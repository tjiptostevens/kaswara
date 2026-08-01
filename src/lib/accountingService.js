/**
 * Layanan jurnal double-entry (tersembunyi dari UI Simple).
 * Semua mutasi keuangan yang mempengaruhi saldo harus lewat sini.
 */
import { supabase } from './supabase'

async function getCoaBySubTipe(organisasiId, subTipe) {
  const { data } = await supabase
    .from('akun_coa')
    .select('id, kode, nama, tipe, sub_tipe')
    .eq('organisasi_id', organisasiId)
    .eq('sub_tipe', subTipe)
    .eq('aktif', true)
    .limit(1)
    .maybeSingle()
  return data
}

async function getAkunKeuangan(akunId) {
  const { data } = await supabase
    .from('akun_keuangan')
    .select('id, nama, coa_id, tipe')
    .eq('id', akunId)
    .single()
  return data
}

/**
 * Buat jurnal seimbang (total debit = total kredit).
 * @param {object} params
 * @param {string} params.organisasiId
 * @param {string} params.tanggal
 * @param {string} params.keterangan
 * @param {string} params.sumber
 * @param {string} [params.sumberId]
 * @param {string} [params.userId]
 * @param {Array<{coa_id:string, akun_keuangan_id?:string, debit?:number, kredit?:number, keterangan?:string}>} params.lines
 */
export async function createJurnal({
  organisasiId,
  tanggal,
  keterangan,
  sumber,
  sumberId = null,
  userId = null,
  lines = [],
}) {
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalKredit = lines.reduce((s, l) => s + Number(l.kredit || 0), 0)
  if (Math.abs(totalDebit - totalKredit) > 0.01) {
    return { error: { message: `Jurnal tidak seimbang: debit ${totalDebit} ≠ kredit ${totalKredit}` } }
  }
  if (lines.length < 2) {
    return { error: { message: 'Jurnal minimal 2 baris' } }
  }

  const { data: jurnal, error } = await supabase
    .from('jurnal')
    .insert({
      organisasi_id: organisasiId,
      tanggal,
      keterangan,
      sumber,
      sumber_id: sumberId,
      status: 'posted',
      dibuat_oleh: userId,
    })
    .select()
    .single()

  if (error) return { error }

  const details = lines.map((l) => ({
    jurnal_id: jurnal.id,
    coa_id: l.coa_id,
    akun_keuangan_id: l.akun_keuangan_id || null,
    debit: Number(l.debit || 0),
    kredit: Number(l.kredit || 0),
    keterangan: l.keterangan || null,
  }))

  const { error: detailErr } = await supabase.from('jurnal_detail').insert(details)
  if (detailErr) {
    await supabase.from('jurnal').delete().eq('id', jurnal.id)
    return { error: detailErr }
  }

  return { data: jurnal, error: null }
}

/**
 * Jurnal dari transaksi pemasukan / pengeluaran / transfer.
 */
export async function createJurnalFromTransaksi(transaksi, userId) {
  const jumlah = Number(transaksi.jumlah)
  const organisasiId = transaksi.organisasi_id

  if (transaksi.tipe === 'transfer') {
    const asal = await getAkunKeuangan(transaksi.akun_keuangan_id)
    const tujuan = await getAkunKeuangan(transaksi.akun_tujuan_id)
    if (!asal?.coa_id || !tujuan?.coa_id) {
      return { error: { message: 'Akun asal/tujuan belum terhubung ke COA' } }
    }
    return createJurnal({
      organisasiId,
      tanggal: transaksi.tanggal,
      keterangan: transaksi.keterangan || `Pindah uang ${asal.nama} → ${tujuan.nama}`,
      sumber: 'transfer',
      sumberId: transaksi.id,
      userId,
      lines: [
        { coa_id: tujuan.coa_id, akun_keuangan_id: tujuan.id, debit: jumlah },
        { coa_id: asal.coa_id, akun_keuangan_id: asal.id, kredit: jumlah },
      ],
    })
  }

  const akun = await getAkunKeuangan(transaksi.akun_keuangan_id)
  if (!akun?.coa_id) {
    return { error: { message: 'Pilih tempat uang (Cash/Bank) untuk transaksi ini' } }
  }

  let coaLawan = null
  if (transaksi.tipe === 'pemasukan') {
    // Prefer kategori COA, fallback pendapatan
    if (transaksi.kategori_id) {
      const { data: kat } = await supabase
        .from('kategori_transaksi')
        .select('coa_id')
        .eq('id', transaksi.kategori_id)
        .maybeSingle()
      if (kat?.coa_id) coaLawan = { id: kat.coa_id }
    }
    if (!coaLawan) coaLawan = await getCoaBySubTipe(organisasiId, 'pendapatan')
  } else {
    if (transaksi.kategori_id) {
      const { data: kat } = await supabase
        .from('kategori_transaksi')
        .select('coa_id')
        .eq('id', transaksi.kategori_id)
        .maybeSingle()
      if (kat?.coa_id) coaLawan = { id: kat.coa_id }
    }
    if (!coaLawan) coaLawan = await getCoaBySubTipe(organisasiId, 'beban')
  }

  if (!coaLawan?.id) {
    return { error: { message: 'Chart of accounts belum siap. Aktifkan sistem akunting di Pengaturan.' } }
  }

  if (transaksi.tipe === 'pemasukan') {
    return createJurnal({
      organisasiId,
      tanggal: transaksi.tanggal,
      keterangan: transaksi.keterangan || 'Pemasukan',
      sumber: 'transaksi',
      sumberId: transaksi.id,
      userId,
      lines: [
        { coa_id: akun.coa_id, akun_keuangan_id: akun.id, debit: jumlah },
        { coa_id: coaLawan.id, kredit: jumlah },
      ],
    })
  }

  // pengeluaran
  return createJurnal({
    organisasiId,
    tanggal: transaksi.tanggal,
    keterangan: transaksi.keterangan || 'Pengeluaran',
    sumber: 'transaksi',
    sumberId: transaksi.id,
    userId,
    lines: [
      { coa_id: coaLawan.id, debit: jumlah },
      { coa_id: akun.coa_id, akun_keuangan_id: akun.id, kredit: jumlah },
    ],
  })
}

/** Void jurnal (untuk cancel transaksi) */
export async function voidJurnal(jurnalId) {
  if (!jurnalId) return { error: null }
  const { error } = await supabase
    .from('jurnal')
    .update({ status: 'void' })
    .eq('id', jurnalId)
  return { error }
}

/**
 * Jurnal saat buat hutang/piutang.
 * utang + terima uang: Debit kas, Credit hutang
 * utang tanpa kas (hutang belanja): Debit beban, Credit hutang
 * piutang + kasih uang: Debit piutang, Credit kas
 * piutang tanpa kas: Debit piutang, Credit pendapatan
 */
export async function createJurnalUtangPiutang(record, userId, { denganKas = true } = {}) {
  const organisasiId = record.organisasi_id
  const jumlah = Number(record.jumlah_awal)
  const coaUtang = await getCoaBySubTipe(organisasiId, 'utang')
  const coaPiutang = await getCoaBySubTipe(organisasiId, 'piutang')
  const coaBeban = await getCoaBySubTipe(organisasiId, 'beban')
  const coaPendapatan = await getCoaBySubTipe(organisasiId, 'pendapatan')

  if (record.tipe === 'utang') {
    if (!coaUtang) return { error: { message: 'Akun Hutang belum ada di COA' } }
    if (denganKas && record.akun_keuangan_id) {
      const akun = await getAkunKeuangan(record.akun_keuangan_id)
      if (!akun?.coa_id) return { error: { message: 'Tempat uang tidak valid' } }
      return createJurnal({
        organisasiId,
        tanggal: record.tanggal,
        keterangan: `Hutang dari ${record.nama_pihak}`,
        sumber: 'utang_piutang',
        sumberId: record.id,
        userId,
        lines: [
          { coa_id: akun.coa_id, akun_keuangan_id: akun.id, debit: jumlah },
          { coa_id: coaUtang.id, kredit: jumlah },
        ],
      })
    }
    return createJurnal({
      organisasiId,
      tanggal: record.tanggal,
      keterangan: `Hutang dari ${record.nama_pihak}`,
      sumber: 'utang_piutang',
      sumberId: record.id,
      userId,
      lines: [
        { coa_id: coaBeban.id, debit: jumlah },
        { coa_id: coaUtang.id, kredit: jumlah },
      ],
    })
  }

  // piutang
  if (!coaPiutang) return { error: { message: 'Akun Piutang belum ada di COA' } }
  if (denganKas && record.akun_keuangan_id) {
    const akun = await getAkunKeuangan(record.akun_keuangan_id)
    if (!akun?.coa_id) return { error: { message: 'Tempat uang tidak valid' } }
    return createJurnal({
      organisasiId,
      tanggal: record.tanggal,
      keterangan: `Piutang ke ${record.nama_pihak}`,
      sumber: 'utang_piutang',
      sumberId: record.id,
      userId,
      lines: [
        { coa_id: coaPiutang.id, debit: jumlah },
        { coa_id: akun.coa_id, akun_keuangan_id: akun.id, kredit: jumlah },
      ],
    })
  }
  return createJurnal({
    organisasiId,
    tanggal: record.tanggal,
    keterangan: `Piutang ke ${record.nama_pihak}`,
    sumber: 'utang_piutang',
    sumberId: record.id,
    userId,
    lines: [
      { coa_id: coaPiutang.id, debit: jumlah },
      { coa_id: coaPendapatan.id, kredit: jumlah },
    ],
  })
}

/** Jurnal pelunasan hutang/piutang */
export async function createJurnalPembayaranUtangPiutang(utang, pembayaran, userId) {
  const organisasiId = utang.organisasi_id
  const jumlah = Number(pembayaran.jumlah)
  const coaUtang = await getCoaBySubTipe(organisasiId, 'utang')
  const coaPiutang = await getCoaBySubTipe(organisasiId, 'piutang')
  const akun = await getAkunKeuangan(pembayaran.akun_keuangan_id)
  if (!akun?.coa_id) return { error: { message: 'Pilih tempat uang untuk pembayaran' } }

  if (utang.tipe === 'utang') {
    if (!coaUtang) return { error: { message: 'Akun Hutang belum ada' } }
    return createJurnal({
      organisasiId,
      tanggal: pembayaran.tanggal,
      keterangan: `Bayar hutang ke ${utang.nama_pihak}`,
      sumber: 'utang_piutang',
      sumberId: pembayaran.id,
      userId,
      lines: [
        { coa_id: coaUtang.id, debit: jumlah },
        { coa_id: akun.coa_id, akun_keuangan_id: akun.id, kredit: jumlah },
      ],
    })
  }

  if (!coaPiutang) return { error: { message: 'Akun Piutang belum ada' } }
  return createJurnal({
    organisasiId,
    tanggal: pembayaran.tanggal,
    keterangan: `Terima pelunasan dari ${utang.nama_pihak}`,
    sumber: 'utang_piutang',
    sumberId: pembayaran.id,
    userId,
    lines: [
      { coa_id: akun.coa_id, akun_keuangan_id: akun.id, debit: jumlah },
      { coa_id: coaPiutang.id, kredit: jumlah },
    ],
  })
}

/**
 * Laporan: ambil saldo COA dalam rentang tanggal.
 */
export async function fetchSaldoCoa(organisasiId, { dari, sampai } = {}) {
  let query = supabase
    .from('jurnal_detail')
    .select('coa_id, debit, kredit, jurnal!inner(organisasi_id, tanggal, status)')
    .eq('jurnal.organisasi_id', organisasiId)
    .eq('jurnal.status', 'posted')

  if (dari) query = query.gte('jurnal.tanggal', dari)
  if (sampai) query = query.lte('jurnal.tanggal', sampai)

  const { data, error } = await query
  if (error) return { data: null, error }

  const { data: coaList } = await supabase
    .from('akun_coa')
    .select('*')
    .eq('organisasi_id', organisasiId)
    .eq('aktif', true)
    .order('kode')

  const map = {}
  for (const c of coaList || []) {
    map[c.id] = {
      ...c,
      total_debit: 0,
      total_kredit: 0,
      saldo: 0,
    }
  }
  for (const row of data || []) {
    if (!map[row.coa_id]) continue
    map[row.coa_id].total_debit += Number(row.debit)
    map[row.coa_id].total_kredit += Number(row.kredit)
  }
  for (const c of Object.values(map)) {
    if (c.tipe === 'aset' || c.tipe === 'beban') {
      c.saldo = c.total_debit - c.total_kredit
    } else {
      c.saldo = c.total_kredit - c.total_debit
    }
  }
  return { data: Object.values(map), error: null }
}

/**
 * Closing periode: pindahkan laba/rugi ke laba ditahan.
 */
export async function closePeriode({
  organisasiId,
  periodeDari,
  periodeSampai,
  tipe = 'bulanan',
  userId,
  catatan,
}) {
  const { data: saldos, error } = await fetchSaldoCoa(organisasiId, {
    dari: periodeDari,
    sampai: periodeSampai,
  })
  if (error) return { error }

  const pendapatan = saldos.filter((c) => c.tipe === 'pendapatan')
  const beban = saldos.filter((c) => c.tipe === 'beban')
  const totalPendapatan = pendapatan.reduce((s, c) => s + c.saldo, 0)
  const totalBeban = beban.reduce((s, c) => s + c.saldo, 0)
  const labaRugi = totalPendapatan - totalBeban

  const coaLaba = saldos.find((c) => c.sub_tipe === 'laba_ditahan')
    || (await getCoaBySubTipe(organisasiId, 'laba_ditahan'))

  if (!coaLaba?.id) return { error: { message: 'Akun Laba Ditahan belum ada' } }

  const lines = []
  for (const p of pendapatan) {
    if (p.saldo === 0) continue
    // close pendapatan: Debit pendapatan, Credit laba
    lines.push({ coa_id: p.id, debit: p.saldo, kredit: 0 })
  }
  for (const b of beban) {
    if (b.saldo === 0) continue
    // close beban: Debit laba, Credit beban
    lines.push({ coa_id: b.id, debit: 0, kredit: b.saldo })
  }
  if (labaRugi > 0) {
    lines.push({ coa_id: coaLaba.id, debit: 0, kredit: labaRugi })
  } else if (labaRugi < 0) {
    lines.push({ coa_id: coaLaba.id, debit: Math.abs(labaRugi), kredit: 0 })
  }

  if (lines.length < 2) {
    return { error: { message: 'Tidak ada mutasi untuk ditutup pada periode ini' } }
  }

  const { data: jurnal, error: jurnalErr } = await createJurnal({
    organisasiId,
    tanggal: periodeSampai,
    keterangan: `Closing periode ${periodeDari} s/d ${periodeSampai}`,
    sumber: 'closing',
    userId,
    lines,
  })
  if (jurnalErr) return { error: jurnalErr }

  const { data: closing, error: closeErr } = await supabase
    .from('periode_closing')
    .insert({
      organisasi_id: organisasiId,
      periode_dari: periodeDari,
      periode_sampai: periodeSampai,
      tipe,
      catatan,
      jurnal_id: jurnal.id,
      ditutup_oleh: userId,
    })
    .select()
    .single()

  if (closeErr) return { error: closeErr }
  return { data: { closing, labaRugi, jurnal }, error: null }
}
