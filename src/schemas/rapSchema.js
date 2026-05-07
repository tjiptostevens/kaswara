import { z } from 'zod'

export const rapSchema = z.object({
  rab_id: z.string().uuid('RAB wajib dipilih'),
  kategori_id: z.string().uuid('Kategori transaksi wajib dipilih'),
  items: z.array(
    z.object({
      rab_item_id: z.string().uuid().optional().nullable(),
      nama_item: z.string().min(1, 'Nama item wajib diisi'),
      volume: z.number().nonnegative().default(0),
      satuan: z.string().optional(),
      harga_satuan: z.number().nonnegative().default(0),
      subtotal_anggaran: z.number().nonnegative().default(0),
      jumlah_realisasi: z.number({ required_error: 'Jumlah realisasi wajib diisi' }).nonnegative('Jumlah realisasi minimal 0'),
    })
  ).min(1, 'Minimal ada satu item realisasi')
    .refine((items) => items.some((item) => Number(item.jumlah_realisasi || 0) > 0), {
      message: 'Minimal satu item harus memiliki realisasi lebih dari 0',
    }),
  keterangan: z.string().optional(),
  tanggal_realisasi: z.string().min(1, 'Tanggal realisasi wajib diisi'),
})
