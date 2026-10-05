# Permission Matrix — Panduan Engineering

Dokumen ini menjelaskan matriks izin per anggota (migration `022`/`023`/`024` + frontend). Sumber kebenaran: `src/constants/permissions.js`, `src/hooks/useAuth.js`, `src/stores/authStore.js` / `anggotaStore.js`, dan `FormAnggota.jsx`.

## Intent

Mengganti akses berbasis role kasar dengan **scope per resource + action** (`none` | `own` | `all`), agar bendahara/ketua bisa mengatur siapa boleh buat/lihat/ajukan/setujui data tanpa mengubah role.

Workspace `personal` selalu full access di UI (`can()` / `canForRecord()` return `true`).

## Model data

Tabel `anggota_permission`:

| Kolom | Constraint |
|-------|------------|
| `anggota_organisasi_id` | FK → `anggota_organisasi` |
| `resource` | `transaksi` \| `iuran` \| `rab` \| `rap` \| `surat` |
| `action` | `create` \| `read` \| `update` \| `delete` \| `submit` \| `approve` \| `cancel` |
| `scope` | `none` \| `own` \| `all` |
| Unique | `(anggota_organisasi_id, resource, action)` |

### Semantik scope

| Scope | UI (`can` / `canForRecord`) | RLS (`has_permission`) |
|-------|-----------------------------|-------------------------|
| `none` | Ditolak | Ditolak |
| `own` | Hanya record milik sendiri (`ownerField`, default `dibuat_oleh`) | `p_min_scope` `own`/`any` lolos; `all` tidak |
| `all` | Semua record di org | Semua `p_min_scope` lolos |

Helper SQL (`022`):

- `get_permission_scope(org, resource, action)` → scope atau `'none'`
- `has_permission(org, resource, action, min_scope)` → boolean (`min_scope`: `any` \| `own` \| `all`)

## Default matrix

Selaras antara `_set_anggota_default_permissions` (SQL) dan `DEFAULT_ANGGOTA_PERMISSIONS` (JS):

| Resource | Default anggota |
|----------|-----------------|
| `transaksi` | `read=all`; sisanya `none` |
| `iuran` | `read=own`; sisanya `none` |
| `rab` / `rap` | `read=all`; create/update/delete/submit/cancel=`own`; approve=`none` (kecuali backfill `can_approve_rab` → rab approve=`all`) |
| `surat` | semua `own` kecuali approve=`none` |

Bendahara/ketua: semua resource+action = `all` (`DEFAULT_FULL_PERMISSIONS` / `_set_full_permissions`).

## Frontend API

```js
const { can, canForRecord } = useAuth()

can('transaksi', 'create')              // ada akses (own atau all)
can('rab', 'approve', 'all')            // wajib scope all
canForRecord('rap', 'update', row)      // own → cek row.dibuat_oleh === user.id
canForRecord('iuran', 'read', row, 'anggota_user_id') // ownerField kustom
```

Fallback jika matrix belum dimuat: `isBendahara || isKetua`.

Matrix dimuat di `authStore` saat init / `switchWorkspace` (join `anggota_permission` pada membership aktif).

Konsumen utama: `Sidebar`, `TransaksiPage`, `IuranPage`/`useIuran`, `RABPage`, `RAPPage`, `SuratPage`, notifikasi global.

## Alur tulis permission

```
FormAnggota (PermissionMatrix)
        │
        ├── create → anggotaStore.addAnggota
        │              └── edge fn create-anggota-with-auth
        │                    (opsional upsert anggota_permission dari body.permissions)
        │
        └── update → anggotaStore.updateAnggota
                       ├── update anggota_organisasi
                       └── rpc('save_anggota_permissions', { p_ao_id, p_permissions })
```

`flattenPermissions` / `buildPermissionMatrix` di `permissions.js` mengonversi nested ↔ flat rows.

Setelah approve join request, `AnggotaPage` men-seed `DEFAULT_ANGGOTA_PERMISSIONS` via RPC yang sama.

## Kenapa ada RPC `save_anggota_permissions`

RLS pada `anggota_permission`:

- SELECT: pemilik baris (anggota melihat izin sendiri)
- ALL (bendahara/ketua): **tidak boleh mengubah baris sendiri** (`ao_target.user_id <> auth.uid()`)

Direct client upsert sering gagal / terhalang RLS. RPC (`023`) adalah `SECURITY DEFINER` dengan cek: pemanggil harus ketua/bendahara aktif di org yang sama, lalu upsert JSON array.

Catatan: RPC **tidak** memblokir self-edit (hanya cek role). UI biasanya mengedit anggota lain.

## RLS yang memakai matrix

Migration `022` me-rewire kebijakan RAB/RAP/transaksi/iuran/surat (+ `cancel_rab_cascade`) agar memakai `has_permission`.  
`024` menambah DELETE transaksi via `has_permission(..., 'delete', 'any')` (gap setelah policy FOR ALL lama di-drop).

## Flag legacy

Kolom/flag lama masih ada selama transisi: `can_manage_rab`, `can_manage_rap`, `can_approve_rab`, `can_approve_join_request`.  
`useAuth` masih mengekspor nilai derived-nya; body invite edge function masih menerima flag tersebut. Prefer matrix untuk fitur baru.

## Pitfalls

1. **Matrix `null` vs loaded-empty** — `permissionMatrix === null` (belum load) → UI fallback role ketua/bendahara. Setelah `buildPermissionMatrix([])` (matrix kosong ter-load) semua scope = `none` **tanpa** fallback role — anggota terlihat “no access” sampai baris permission ada.
2. **Owner field salah** — `canForRecord` default `dibuat_oleh`; iuran/surat mungkin pakai field berbeda — sesuaikan argumen ke-4.
3. **RLS vs UI** — UI bisa menyembunyikan tombol, tetapi kebijakan SQL tetap wajib; uji dengan user `anggota` ber-scope `own`.
4. **Self-edit via RPC** — dimungkinkan oleh role check saja; jangan andalkan RLS tabel untuk menolak self-edit lewat RPC.
5. **Personal workspace** — bypass matrix di frontend; kebijakan SQL tetap mengacu tipe org `personal` di beberapa policy lama.

## File map

| Path | Peran |
|------|--------|
| `supabase/migrations/022_permission_matrix.sql` | Tabel, helper, backfill, RLS rewrite |
| `supabase/migrations/023_save_permissions_rpc.sql` | RPC upsert |
| `supabase/migrations/024_fix_transaksi_delete_policy.sql` | DELETE transaksi |
| `src/constants/permissions.js` | Konstanta + defaults + flatten/build |
| `src/hooks/useAuth.js` | `can` / `canForRecord` |
| `src/stores/authStore.js` | Load matrix ke session |
| `src/stores/anggotaStore.js` | Persist via edge/RPC |
| `src/components/anggota/FormAnggota.jsx` | UI matrix |
