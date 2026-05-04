import { z } from 'zod'

export const iuranSchema = z.object({
  anggota_id: z.string().uuid('Anggota wajib dipilih'),
  periode: z.string().min(1, 'Periode wajib diisi'),
  jumlah: z
    .number({
      required_error: 'Jumlah tidak boleh kosong',
      invalid_type_error: 'Jumlah harus berupa angka',
    })
    .positive('Jumlah harus lebih dari 0'),
  kategori_iuran_id: z.string().optional(),
  keterangan: z.string().optional(),
})
