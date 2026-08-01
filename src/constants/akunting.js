/** Konstanta akunting Kaswara */

export const MODE_AKUNTING = {
  SIMPLE: 'simple',
  ADVANCE: 'advance',
}

export const TIPE_AKUN_KEUANGAN = [
  { value: 'cash', label: 'Cash / Dompet', warna: '#1a6b5a' },
  { value: 'bank', label: 'Bank', warna: '#185FA5' },
  { value: 'ewallet', label: 'E-Wallet', warna: '#e8a020' },
  { value: 'lainnya', label: 'Lainnya', warna: '#9b9b95' },
]

export const TIPE_COA = {
  ASET: 'aset',
  KEWAJIBAN: 'kewajiban',
  EKUITAS: 'ekuitas',
  PENDAPATAN: 'pendapatan',
  BEBAN: 'beban',
}

export const MATA_UANG = [
  { kode: 'IDR', simbol: 'Rp', nama: 'Rupiah Indonesia' },
  { kode: 'USD', simbol: '$', nama: 'US Dollar' },
  { kode: 'SGD', simbol: 'S$', nama: 'Singapore Dollar' },
  { kode: 'MYR', simbol: 'RM', nama: 'Ringgit Malaysia' },
  { kode: 'EUR', simbol: '€', nama: 'Euro' },
]

export const LABEL_TIPE_TRANSAKSI = {
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  transfer: 'Pindah Uang',
}

/** Label ramah-pemula (tanpa istilah akuntansi) */
export const LABEL_SIMPLE = {
  akun: 'Tempat Uang',
  tambahAkun: 'Tambah Tempat Uang',
  transfer: 'Pindah Uang',
  utang: 'Hutang',
  piutang: 'Piutang',
  saldo: 'Uang Saya',
  dimana: 'Uang Anda ada di',
}
