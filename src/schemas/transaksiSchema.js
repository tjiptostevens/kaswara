import { z } from 'zod'

export const transaksiSchema = z
  .object({
    tipe: z.enum(['pemasukan', 'pengeluaran', 'transfer'], {
      required_error: 'Tipe transaksi wajib dipilih',
    }),
    jumlah: z
      .number({ required_error: 'Nominal tidak boleh kosong', invalid_type_error: 'Nominal harus berupa angka' })
      .positive('Nominal harus lebih dari 0'),
    kategori_id: z.string().uuid('Kategori wajib dipilih').optional().or(z.literal('')),
    akun_keuangan_id: z.string().uuid('Tempat uang wajib dipilih').optional().or(z.literal('')),
    akun_tujuan_id: z.string().uuid().optional().or(z.literal('')),
    keterangan: z.string().optional(),
    tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  })
  .superRefine((data, ctx) => {
    if (data.tipe === 'transfer') {
      if (!data.akun_keuangan_id) {
        ctx.addIssue({ code: 'custom', message: 'Pilih tempat uang asal', path: ['akun_keuangan_id'] })
      }
      if (!data.akun_tujuan_id) {
        ctx.addIssue({ code: 'custom', message: 'Pilih tempat uang tujuan', path: ['akun_tujuan_id'] })
      }
      if (data.akun_keuangan_id && data.akun_tujuan_id && data.akun_keuangan_id === data.akun_tujuan_id) {
        ctx.addIssue({ code: 'custom', message: 'Asal dan tujuan tidak boleh sama', path: ['akun_tujuan_id'] })
      }
    } else {
      if (!data.kategori_id) {
        ctx.addIssue({ code: 'custom', message: 'Kategori wajib dipilih', path: ['kategori_id'] })
      }
      if (!data.akun_keuangan_id) {
        ctx.addIssue({ code: 'custom', message: 'Pilih tempat uang', path: ['akun_keuangan_id'] })
      }
    }
  })
