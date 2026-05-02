import { z } from 'zod'

export const anggotaSchema = z.object({
  nama_lengkap: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  nomor_anggota: z.string().optional(),
  email: z.string().email('Format email tidak valid'),
  no_hp: z.string().optional(),
  role: z.enum(['bendahara', 'ketua', 'anggota'], {
    required_error: 'Role wajib dipilih',
  }),
  aktif: z.boolean().default(true),
})
