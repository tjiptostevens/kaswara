import { z } from 'zod'

export const akunKeuanganSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(80),
  tipe: z.enum(['cash', 'bank', 'ewallet', 'lainnya']),
  nomor_rekening: z.string().optional(),
  keterangan: z.string().optional(),
  warna: z.string().optional(),
})

export const utangPiutangSchema = z.object({
  tipe: z.enum(['utang', 'piutang']),
  nama_pihak: z.string().min(1, 'Nama pihak wajib diisi'),
  deskripsi: z.string().optional(),
  jumlah_awal: z
    .number({ required_error: 'Nominal wajib diisi', invalid_type_error: 'Harus angka' })
    .positive('Harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib'),
  jatuh_tempo: z.string().optional().or(z.literal('')),
  akun_keuangan_id: z.string().uuid().optional().or(z.literal('')),
  dengan_kas: z.boolean().optional(),
})

export const pembayaranUtangSchema = z.object({
  jumlah: z
    .number({ required_error: 'Nominal wajib', invalid_type_error: 'Harus angka' })
    .positive('Harus lebih dari 0'),
  tanggal: z.string().min(1, 'Tanggal wajib'),
  akun_keuangan_id: z.string().uuid('Pilih tempat uang'),
  keterangan: z.string().optional(),
})
