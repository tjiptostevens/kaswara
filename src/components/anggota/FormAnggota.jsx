import React, { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { anggotaSchema, editAnggotaSchema } from '../../schemas/anggotaSchema'
import { Input, Button } from '../ui'
import { ROLE_LABELS } from '../../constants/roles'
import {
  RESOURCE_ORDER,
  ACTION_ORDER,
  RESOURCE_LABELS,
  ACTION_LABELS,
  SCOPE_LABELS,
  DEFAULT_ANGGOTA_PERMISSIONS,
  DEFAULT_FULL_PERMISSIONS,
  buildPermissionMatrix,
} from '../../constants/permissions'
import { Mail } from 'lucide-react'

/** Tombol pilih scope per sel */
function ScopeToggle({ value, onChange }) {
  const options = ['none', 'own', 'all']
  return (
    <div className="flex gap-0.5 justify-center">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={[
            'text-[10px] font-medium px-1.5 py-0.5 rounded transition-all',
            value === opt
              ? opt === 'none'
                ? 'bg-gray-300 text-gray-700'
                : opt === 'own'
                  ? 'bg-amber-400 text-white'
                  : 'bg-emerald-500 text-white'
              : 'bg-white/60 text-gray-400 hover:bg-gray-100',
          ].join(' ')}
          title={SCOPE_LABELS[opt]}
        >
          {opt === 'none' ? '—' : opt === 'own' ? 'S' : 'A'}
        </button>
      ))}
    </div>
  )
}

/**
 * Komponen matrix permission: baris = resource, kolom = action.
 */
function PermissionMatrix({ control, setValue, role }) {
  const permissions = useWatch({ control, name: 'permissions' })
  const previousRole = useRef(role)

  // Saat role benar-benar berubah, reset matrix ke default role baru
  useEffect(() => {
    if (!role) return
    if (previousRole.current !== role) {
      const defaults =
        role === 'anggota' ? DEFAULT_ANGGOTA_PERMISSIONS : DEFAULT_FULL_PERMISSIONS
      setValue('permissions', defaults, { shouldDirty: true })
    }
    previousRole.current = role
  }, [role, setValue])

  const setScope = (resource, action, scope) => {
    setValue(`permissions.${resource}.${action}`, scope, { shouldDirty: true })
  }

  const getScope = (resource, action) =>
    permissions?.[resource]?.[action] ?? 'none'

  const setAllActionsForResource = (resource, scope) => {
    ACTION_ORDER.forEach((action) => setScope(resource, action, scope))
  }

  const setAllResourcesForAction = (action, scope) => {
    RESOURCE_ORDER.forEach((resource) => setScope(resource, action, scope))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-charcoal uppercase tracking-wide">
          Matriks Izin Akses
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => RESOURCE_ORDER.forEach((r) => ACTION_ORDER.forEach((a) => setScope(r, a, 'all')))}
            className="text-[10px] text-brand hover:underline"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={() => RESOURCE_ORDER.forEach((r) => ACTION_ORDER.forEach((a) => setScope(r, a, 'none')))}
            className="text-[10px] text-danger hover:underline"
          >
            Hapus Semua
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-input border border-border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#f0f4f1]">
              <th className="text-left px-2 py-1.5 text-charcoal font-semibold border-b border-border w-20">
                Resource
              </th>
              {ACTION_ORDER.map((action) => (
                <th
                  key={action}
                  className="text-center px-1 py-1 text-charcoal font-semibold border-b border-border min-w-[72px]"
                >
                  <div className="text-[10px]">{ACTION_LABELS[action]}</div>
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {['none', 'own', 'all'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAllResourcesForAction(action, s)}
                        title={`Set kolom: ${SCOPE_LABELS[s]}`}
                        className="text-[9px] text-stone hover:text-brand leading-tight"
                      >
                        {s === 'none' ? '—' : s === 'own' ? 'S' : 'A'}
                      </button>
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCE_ORDER.map((resource, ri) => (
              <tr key={resource} className={ri % 2 === 0 ? 'bg-white' : 'bg-[#fafaf8]'}>
                <td className="px-2 py-1.5 border-b border-border">
                  <div className="font-semibold text-charcoal text-[11px]">
                    {RESOURCE_LABELS[resource]}
                  </div>
                  <div className="flex gap-0.5 mt-0.5">
                    {['none', 'own', 'all'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAllActionsForResource(resource, s)}
                        title={`Set baris: ${SCOPE_LABELS[s]}`}
                        className="text-[9px] text-stone hover:text-brand leading-tight"
                      >
                        {s === 'none' ? '—' : s === 'own' ? 'S' : 'A'}
                      </button>
                    ))}
                  </div>
                </td>
                {ACTION_ORDER.map((action) => (
                  <td key={action} className="text-center px-1 py-1.5 border-b border-border">
                    <ScopeToggle
                      value={getScope(resource, action)}
                      onChange={(s) => setScope(resource, action, s)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-[10px] text-stone flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-gray-300" /> (—) Tidak Ada
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-400" /> (S) Milik Sendiri
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500" /> (A) Semua Data
        </span>
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} [props.defaultValues]
 * @param {(data: object) => Promise<void>} props.onSubmit
 * @param {() => void} props.onCancel
 */
export default function FormAnggota({ defaultValues, onSubmit, onCancel }) {
  const isEdit = !!defaultValues

  // Bangun permission matrix dari defaultValues.anggota_permission jika ada
  const initialPermissions = defaultValues?.anggota_permission?.length
    ? buildPermissionMatrix(defaultValues.anggota_permission)
    : (defaultValues?.role === 'anggota' ? DEFAULT_ANGGOTA_PERMISSIONS : DEFAULT_FULL_PERMISSIONS)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEdit ? editAnggotaSchema : anggotaSchema),
    defaultValues: {
      ...(defaultValues || { aktif: true, role: 'anggota' }),
      permissions: initialPermissions,
    },
  })

  const role = watch('role')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap"
        error={errors.nama_lengkap?.message}
        {...register('nama_lengkap')}
      />
      <Input
        label="Nomor Anggota"
        placeholder="Contoh: 001"
        hint="Opsional"
        {...register('nomor_anggota')}
      />
      {isEdit ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-charcoal uppercase tracking-wide">Email</p>
          <p className="text-sm text-stone px-3 py-2 bg-warm rounded-input border border-border">
            {defaultValues.email || '—'}
          </p>
          <p className="text-xs text-stone">Email tidak dapat diubah setelah undangan dikirim</p>
        </div>
      ) : (
        <>
          <Input
            label="Email"
            type="email"
            placeholder="contoh@email.com"
            error={errors.email?.message}
            leftIcon={<Mail size={14} />}
            {...register('email')}
          />
          <div className="flex items-start gap-2 bg-[#E1F5EE] text-[#0F6E56] rounded-input px-3 py-2 text-xs">
            <Mail size={13} className="mt-0.5 shrink-0" />
            <span>Jika email sudah terdaftar di Kaswara, anggota akan langsung ditambahkan tanpa undangan. Jika belum, undangan akan dikirim ke email ini untuk menetapkan password.</span>
          </div>
        </>
      )}
      <Input
        label="Nomor HP"
        type="tel"
        placeholder="Contoh: 08123456789"
        hint="Opsional"
        error={errors.no_hp?.message}
        {...register('no_hp')}
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-charcoal uppercase tracking-wide">
          Role
        </label>
        <select
          className="w-full rounded-input border border-border bg-white/50 backdrop-blur-sm px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          {...register('role')}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.role && <p className="text-xs text-danger">{errors.role.message}</p>}
      </div>

      {/* Matriks izin akses */}
      <PermissionMatrix control={control} setValue={setValue} role={role} />

      {/* Izin approval gabung organisasi (terpisah dari resource matrix) */}
      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border text-brand focus:ring-brand/40 focus:ring-2"
            {...register('can_approve_join_request')}
          />
          <span className="text-sm text-charcoal">Izinkan menyetujui permintaan bergabung</span>
        </label>
        <p className="text-xs text-stone ml-6">Dapat menyetujui/menolak pendaftaran anggota via kode organisasi</p>
      </div>

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          {isEdit ? 'Simpan perubahan' : 'Kirim undangan'}
        </Button>
      </div>
    </form>
  )
}
