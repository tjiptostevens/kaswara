# Onboarding, Personal Workspace & Join Request — Panduan Engineering

Alur signup → workspace personal → buat/bergabung organisasi (migrations `008`, `009`, `015`, `017` + frontend auth/setup/anggota).

## Intent

Setiap user punya **workspace personal** otomatis (keuangan pribadi). Organisasi `rt_rw` / `keluarga` ditambahkan opsional lewat buat baru atau **permintaan bergabung** (approve oleh pengurus). Satu akun dapat banyak workspace; UI menyimpan pilihan aktif di `localStorage`.

## Model data

### `organisasi.tipe` (`008`)

| Nilai | Arti |
|-------|------|
| `personal` | Workspace pribadi; 1 per user (`created_by`); role membership `bendahara` |
| `rt_rw` | Organisasi komunitas |
| `keluarga` | Organisasi keluarga |

Kolom `created_by` (juga dari `004`) menandai pembuat/owner.

### Auto-create personal (`008`, diperbaiki `015`)

Trigger `on_auth_user_created` → `handle_new_user()` → `create_personal_workspace(uid, display_name)`:

1. Skip jika sudah ada `organisasi` dengan `tipe = 'personal'` dan `created_by = uid`.
2. Insert org `nama` dari `full_name` metadata / email / fallback `'Pribadi'`.
3. Insert `anggota_organisasi` (role `bendahara`, `aktif = true`).

`015` menambahkan `SET search_path = public` agar trigger aman di bawah role Auth.

### `organisasi_join_request` (`017`)

| Kolom | Catatan |
|-------|---------|
| `status` | `pending` \| `approved` \| `rejected` |
| `nama_lengkap`, `email`, `no_hp` | Diisi pemohon |
| `rejection_reason` | Opsional saat tolak |
| `processed_by` / `processed_at` | Diisi saat approve/reject |

Unique partial: satu `pending` per `(organisasi_id, user_id)`.

Flag legacy di `anggota_organisasi`: `can_approve_join_request` (bukan resource di matrix `022`).

Helper SQL: `can_approve_join_request(org_id)` → bendahara/ketua **atau** flag tersebut.

## Alur pengguna

```
Signup (auth.users insert)
        │
        ▼
Trigger create_personal_workspace
        │
        ▼
Login → Dashboard (workspace personal aktif)
        │
        ├── Sidebar → "+ Tambah / Bergabung Organisasi" → /setup
        │       ├── Buat Baru (rt_rw | keluarga) → creator = bendahara
        │       ├── Bergabung dengan Kode/QR → join_request pending
        │       └── "Lewati, gunakan mode personal saja" → Dashboard
        │
        └── (opsional) Switch workspace (localStorage: kaswara_active_workspace_id)
```

**Catatan:** `ProtectedRoute` **tidak** memaksa `/setup`. Personal sudah cukup untuk masuk app. `SignupPage` setelah sukses mengarah ke **Login** (bukan setup).

### Preferensi workspace (`authStore`)

Urutan aktivasi: ID tersimpan di `localStorage` → else personal → else membership pertama. `switchWorkspace` memuat ulang `anggota_organisasi` + matrix `anggota_permission`.

### Nav personal vs organisasi (`Sidebar`)

| | Personal | Organisasi |
|--|----------|------------|
| Master | Kategori, Tempat Uang, **Data Keluarga** | Kategori, Kategori Iuran, Tempat Uang, Anggota |
| Transaksi | Transaksi, Hutang/Piutang, RAB, RAP | + Iuran, Surat |
| Anggota / Iuran / Surat | Disembunyikan | Ditampilkan (izin berlaku) |

`useAuth().can()` / `canForRecord()`: di personal **selalu `true`** (bypass matrix).

Settings: kode undangan UUID + QR dan toggle publik **hanya** untuk workspace non-personal.

## Bergabung dengan kode / QR

1. Pengurus salin `organisasi.id` atau unduh QR di **Pengaturan** (`SettingsPage`).
2. Calon anggota di `/setup` tab **Bergabung**: tempel UUID atau scan QR (regex UUID dari payload).
3. Preview org → isi nama → insert `organisasi_join_request` (`status = pending`).
4. Pengurus di **Anggota** (`AnggotaPage`) melihat antrian pending jika `canApproveJoinRequest`.

### Approve / reject (`AnggotaPage`)

**Approve:**

1. Insert `anggota_organisasi` role `anggota` (skip jika sudah ada baris).
2. Seed `DEFAULT_ANGGOTA_PERMISSIONS` via RPC `save_anggota_permissions`.
3. Update request → `approved` + `processed_*`.

**Reject:** prompt alasan opsional → `rejected`.

Gate UI: `isBendahara || isKetua || profile.can_approve_join_request` (`useAuth.canApproveJoinRequest`). Bukan bagian matrix resource.

### Invite alternatif

Edge `create-anggota-with-auth` (lihat `docs/EDGE_FUNCTIONS.md`) membuat user + membership langsung dari form Anggota — tanpa join request.

## RLS ringkas

**`organisasi` SELECT** (kebijakan aditif):

| Policy | Syarat |
|--------|--------|
| `anggota_atau_pembuat_bisa_lihat_organisasi` (`004`) | `is_member` **atau** `created_by = auth.uid()` |
| `anggota_bisa_lihat_organisasi` (`009`) | `is_member` **atau** personal owner |
| `publik_baca_organisasi` (`013`) | `publik_aktif = true` |

**Join request (`017`):**

- SELECT: pemohon sendiri **atau** `can_approve_join_request(org)`
- INSERT: `auth.uid() = user_id`
- UPDATE: hanya approver

Personal RLS tambahan (`009`): owner personal boleh kelola kategori/RAB/RAP/transaksi org miliknya.

## Data keluarga (`007` + `KeluargaPage`)

Tabel `anggota_keluarga` (hubungan: suami/istri/anak/orang_tua/lainnya) terikat `organisasi_id` + `anggota_id`. Nav **Data Keluarga** hanya di personal sidebar; RLS: member SELECT; kelola milik sendiri atau bendahara/ketua.

## Codepath utama

| Area | Lokasi |
|------|--------|
| Trigger personal | `008_personal_workspace.sql`, `015_fix_auth_trigger.sql` |
| Join table + RLS | `017_rab_rap_join_request_and_cancel_rpc.sql` (§4) |
| Auth / workspace | `src/stores/authStore.js`, `src/hooks/useAuth.js` |
| Setup UI | `src/pages/auth/SetupOrganisasiPage.jsx` |
| Approve UI | `src/pages/AnggotaPage.jsx` |
| Kode/QR undangan | `src/pages/SettingsPage.jsx` |
| Nav | `src/components/layout/Sidebar.jsx` |

## Pitfalls

1. **Cari organisasi by UUID sering gagal tanpa `publik_aktif`.** Preview di setup melakukan `SELECT` pada `organisasi`. Non-member non-creator hanya lolos jika org `publik_aktif = true`. Org privat → UI menampilkan “Organisasi tidak ditemukan” meskipun UUID benar. Insert join request sendiri tidak butuh SELECT org, tetapi UI memblokir sebelum insert.
2. **`can_approve_join_request` adalah flag kolom**, bukan resource matrix — tidak muncul di `permissions.js`.
3. **Approve join tidak memanggil edge invite**; hanya insert membership + RPC permissions. User sudah punya akun (karena signup dulu).
4. **Signup tidak membuka `/setup` otomatis** — AGENTS “create/join” bersifat opsional setelah personal tersedia.
5. **Duplicate file legacy:** `src/pages/KelargaPage.jsx` (typo) masih ada; route memakai `KeluargaPage.jsx`.
6. Setelah approve, pemohon perlu **refresh / `initialize` / switch workspace** agar org baru muncul di daftar (approve tidak push realtime ke client pemohon).
