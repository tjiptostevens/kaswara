import { z } from 'zod'

export const rapSchema = z.object({
  rab_id: z.string().uuid('RAB wajib dipilih'),
  nama_item: z.string().min(1, 'Nama item wajib diisi'),
  jumlah_realisasi: z
    .number({ required_error: 'Jumlah realisasi tidak boleh kosong' })
    .positive('Jumlah realisasi harus lebih dari 0'),
  keterangan: z.string().optional(),
  tanggal_realisasi: z.string().min(1, 'Tanggal realisasi wajib diisi'),
})
