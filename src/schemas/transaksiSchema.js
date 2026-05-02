import { z } from 'zod'

export const transaksiSchema = z.object({
  tipe: z.enum(['pemasukan', 'pengeluaran'], {
    required_error: 'Tipe transaksi wajib dipilih',
  }),
  jumlah: z
    .number({ required_error: 'Nominal tidak boleh kosong', invalid_type_error: 'Nominal harus berupa angka' })
    .positive('Nominal harus lebih dari 0'),
  kategori_id: z.string().uuid('Kategori wajib dipilih'),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
})
