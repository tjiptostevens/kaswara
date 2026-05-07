import { z } from 'zod'

export const rabSchema = z.object({
  nama_kegiatan: z.string().min(3, 'Nama kegiatan minimal 3 karakter'),
  kategori_id: z.string().uuid('Kategori transaksi wajib dipilih'),
  deskripsi: z.string().optional(),
  tanggal_kegiatan: z.string().min(1, 'Tanggal kegiatan wajib diisi'),
  tanggal_pengajuan: z.string().min(1, 'Tanggal pengajuan wajib diisi'),
  items: z
    .array(
      z.object({
        nama_item: z.string().min(1, 'Nama item wajib diisi'),
        volume: z.number().positive('Volume harus lebih dari 0'),
        satuan: z.string().min(1, 'Satuan wajib diisi'),
        harga_satuan: z.number().positive('Harga satuan harus lebih dari 0'),
      })
    )
    .min(1, 'Minimal satu item RAB'),
})

export const rabApprovalSchema = z.object({
  status: z.enum(['disetujui', 'ditolak']),
  catatan_ketua: z.string().optional(),
})
