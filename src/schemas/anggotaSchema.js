import { z } from 'zod'
import { RESOURCE_ORDER, ACTION_ORDER } from '../constants/permissions'

// Schema untuk satu sel permission
const scopeSchema = z.enum(['none', 'own', 'all']).default('none')

// Schema untuk satu resource: { action: scope }
const resourcePermissionSchema = z.object(
  Object.fromEntries(ACTION_ORDER.map((action) => [action, scopeSchema]))
)

// Schema untuk seluruh matrix: { resource: { action: scope } }
const permissionsSchema = z.object(
  Object.fromEntries(RESOURCE_ORDER.map((resource) => [resource, resourcePermissionSchema.optional()]))
).optional()

export const anggotaSchema = z.object({
  nama_lengkap: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  nomor_anggota: z.string().optional(),
  email: z.string().email('Format email tidak valid'),
  no_hp: z.string().optional(),
  role: z.enum(['bendahara', 'ketua', 'anggota'], {
    required_error: 'Role wajib dipilih',
  }),
  aktif: z.boolean().default(true),
  // Flag lama (backward compat — masih digunakan oleh edge function)
  can_manage_rab: z.boolean().default(false),
  can_manage_rap: z.boolean().default(false),
  can_approve_rab: z.boolean().default(false),
  can_approve_join_request: z.boolean().default(false),
  // Matrix permission baru
  permissions: permissionsSchema,
})

// Schema untuk edit — email tidak bisa diubah setelah undangan dikirim
export const editAnggotaSchema = anggotaSchema.omit({ email: true })
