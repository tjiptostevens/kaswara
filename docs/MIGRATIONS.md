# SQL Migrations Catalog — Kaswara

Index of every file in `supabase/migrations/` (001–025). Use this when diagnosing schema drift, writing a new migration, or deciding whether `supabase db reset` is required after a pull.

Related runbook: [LOCAL_DEV.md](LOCAL_DEV.md). Subsystem deep-dives: [AKUNTING.md](AKUNTING.md), [PERMISSIONS.md](PERMISSIONS.md), [RAB_RAP.md](RAB_RAP.md), [ONBOARDING.md](ONBOARDING.md).

## Intent

Migrations are the **only** schema source of truth. There are no hand-applied GRANTs for PostgREST roles — local/dev relies on `supabase/config.toml` → `[api] auto_expose_new_tables = true` (deprecated; field removed **2026-10-30** — plan explicit `GRANT`s before then; as of this docs pass the deadline is imminent).

## How to apply

```bash
# Prefer full reset locally after pulling new migrations
sudo -E env "PATH=$PATH" npx supabase db reset
```

Partial `migration up` is possible but easy to desync from views/RPCs the frontend expects (`v_saldo_akun_keuangan`, `aktifkan_sistem_akunting`, `save_anggota_permissions`, `cancel_rab_cascade`, …).

## Catalog

| # | File | What it introduces |
|---|------|--------------------|
| 001 | `001_create_tables.sql` | Core tables: `organisasi`, `anggota_organisasi`, `kategori_transaksi`, `transaksi`, `rab`/`rab_item`, `rap`/`rap_foto`, `iuran_rutin`; view `saldo_organisasi` |
| 002 | `002_rls_policies.sql` | Enable RLS; helpers `is_member`, `get_role`; baseline member/bendahara policies |
| 003 | `003_seed_kategori.sql` | RPC `seed_default_kategori` (default pemasukan/pengeluaran categories) |
| 004 | `004_fix_organisasi_rls.sql` | `organisasi.created_by`; insert/select policies for creator window |
| 005 | `005_add_email_hp_to_anggota.sql` | `anggota_organisasi.email`, `no_hp` |
| 006 | `006_ketua_manage_anggota.sql` | Ketua may manage anggota (same as bendahara) |
| 007 | `007_create_anggota_keluarga.sql` | Table `anggota_keluarga` + RLS (personal “Data Keluarga”) |
| 008 | `008_personal_workspace.sql` | `organisasi.tipe` includes `personal`; `create_personal_workspace` + signup trigger |
| 009 | `009_personal_rls.sql` | Personal-owner SELECT/UPDATE on organisasi and related policies |
| 010 | `010_can_manage_rab_and_transaksi_creator.sql` | Flag `can_manage_rab`; `transaksi.dibuat_oleh_anggota_id`; `can_create_rab` |
| 011 | `011_workflow_cycles.sql` | Status cycles + amend audit columns on `transaksi` / `rab` / `rap`; `can_approve_rab` |
| 012 | `012_rap_auto_transaksi.sql` | `rap.transaksi_id` + `dibuat_oleh_anggota_id` on RAB/RAP (`transaksi.rap_id` already from `001`; auto insert is **client-side**, not a trigger) |
| 013 | `013_publik_transparansi.sql` | `publik_aktif` / `publik_slug`; anon SELECT policies for org/transaksi/kategori |
| 014 | `014_iuran_workflow.sql` | `kategori_iuran`; iuran statuses `draft\|diajukan\|cancelled\|amended`; backfill from `belum_bayar`/`lunas` |
| 015 | `015_fix_auth_trigger.sql` | `search_path = public` on personal-workspace auth trigger |
| 016 | `016_storage_bucket_rap_foto.sql` | Bucket `rap-foto` (public read, 10 MB, image MIME allow-list) + storage RLS |
| 017 | `017_rab_rap_join_request_and_cancel_rpc.sql` | `organisasi_join_request` + flag `can_approve_join_request`; RAP itemized realization; RPCs `cancel_rab_cascade`, `cancel_transaksi_and_rap`; kategori on RAB/RAP |
| 018 | `018_permintaan_surat_workflow.sql` | Table `permintaan_surat` + initial RLS |
| 019 | `019_restrict_rab_rap_to_owner_with_manage_flags.sql` | `can_manage_rap`; owner+flag manage policies; tighter `cancel_rab_cascade` |
| 020 | `020_prevent_duplicate_iuran_periode_kategori.sql` | Periode must be month-start; unique active iuran per anggota+kategori+periode |
| 021 | `021_fix_rab_approve_policy.sql` | Approvers (`can_approve_rab` / ketua) can update RAB status again after 019 |
| 022 | `022_permission_matrix.sql` | Table `anggota_permission`; `has_permission` / defaults; RLS rewrite; `cancel_rab_cascade` uses matrix |
| 023 | `023_save_permissions_rpc.sql` | RPC `save_anggota_permissions` (SECURITY DEFINER upsert) |
| 024 | `024_fix_transaksi_delete_policy.sql` | Restore transaksi DELETE policy aligned with matrix (gap left by 022) |
| 025 | `025_akunting_sederhana.sql` | COA, `akun_keuangan`, jurnal, utang/piutang, `pengaturan_user.mode_akunting`; seed trigger; RPC `aktifkan_sistem_akunting`; views `v_saldo_akun_keuangan`, `v_saldo_coa` |

## Dependency sketch

```
001–003  foundation + seed
004–007  org ownership, anggota contact, ketua, keluarga
008–009  personal workspace
010–012  RAB/RAP permissions + workflow + RAP↔transaksi FKs
013      publik
014–015  iuran workflow + auth trigger fix
016–017  storage + join request + cancel RPCs
018–021  surat + RAB/RAP ownership/approve fixes + iuran unique
022–024  permission matrix + save RPC + transaksi delete
025      akunting (journals expect transaksi.akun_keuangan_id)
```

## RPCs & views operators touch most

| Object | Migration | Called from |
|--------|-----------|-------------|
| `create_personal_workspace` / signup trigger | 008, 015 | Auth |
| `save_anggota_permissions` | 023 | `anggotaStore`, `AnggotaPage`, edge invite |
| `cancel_rab_cascade` | 017 → 019 → 022 | `useRAB.cancelRAB` |
| `cancel_transaksi_and_rap` | 017 (legacy gates; not matrix-rewired in 022) | `kasStore` cancel path |
| `aktifkan_sistem_akunting` | 025 | Settings / `akuntingStore` |
| `seed_akunting_default` (trigger on org insert) | 025 | Automatic |
| `v_saldo_akun_keuangan` / `v_saldo_coa` | 025 | Tempat Uang / laporan Advance |

## Constraints when adding migration 026+

1. **Do not assume auto-expose forever** — before **2026-10-30**, new tables/views need explicit `GRANT` to `anon`/`authenticated`/`service_role` (or an equivalent policy), matching whatever replaces `auto_expose_new_tables`.
2. Prefer additive, idempotent SQL (`if not exists`, `drop policy if exists`) like existing files.
3. If you add a PostgREST-facing view or RPC, update [LOCAL_DEV.md](LOCAL_DEV.md) smoke/troubleshooting and the subsystem doc.
4. Frontend path gaps already documented (iuran/RAP auto-tx without `akun_keuangan_id`) — do not “fix” only in docs; change code or call the gap out in the migration comment.

## File map

| Path | Role |
|------|------|
| `supabase/migrations/*.sql` | Ordered schema history |
| `supabase/config.toml` | CLI config including `auto_expose_new_tables` |
| `docs/LOCAL_DEV.md` | Boot + reset + symptom table |
| `docs/*.md` | Per-subsystem behavior on top of these migrations |
