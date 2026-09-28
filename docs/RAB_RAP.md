# RAB / RAP — Panduan Engineering

Rencana Anggaran Biaya (RAB) dan Realisasi Anggaran Pengeluaran (RAP): schema, workflow, RLS/matrix, RPC, codepath frontend, storage, dan pitfalls. Verified against migrations `001`–`022` + `src/pages/RABPage.jsx` / `RAPPage.jsx`.

## Intent

1. **RAB** — ajukan anggaran kegiatan (line items), review/approve, lalu realisasi.
2. **RAP** — catat realisasi terhadap RAB yang disetujui (+ foto bukti), ajukan, approve → **insert transaksi pengeluaran** (client-side), lalu tandai RAB `selesai` bila semua RAP aktif sudah `approved`.

## Model data

### Tables

| Table | Introduced | Role |
|-------|------------|------|
| `rab` | `001` | Header anggaran |
| `rab_item` | `001` | Line items (volume × harga → subtotal) |
| `rap` | `001` | Header realisasi (1 aktif per RAB di UI) |
| `rap_foto` | `001` | Metadata file di bucket `rap-foto` |
| `rap_item_realisasi` | `017` | Itemized realization vs RAB items |
| `transaksi` | `001` | FK `rap_id` → `rap`; RAP also stores `transaksi_id` (`012`) |

### Key columns (accumulated)

**`rab`:** `organisasi_id`, `nama_kegiatan`, `deskripsi`, `total_anggaran`, `status`, `catatan_ketua`, `kategori_id` (`017`), `diajukan_oleh`, `disetujui_oleh` / `disetujui_at`, `diajukan_at` (`011`), `tanggal_pengajuan`, `tanggal_kegiatan`, `dibuat_oleh_anggota_id` (`012`), `amended_from` / `amended_by` / `amended_at`, `cancelled_by` / `cancelled_at` (`011`).

**`rab_item`:** `rab_id`, `nama_item`, `volume`, `satuan`, `harga_satuan`, `subtotal`.

**`rap`:** `rab_id`, `organisasi_id`, `nama_item`, `jumlah_realisasi` (>0 at create; sync from items may set 0), `keterangan`, `tanggal_realisasi`, `dibuat_oleh`, `kategori_id` (`017`), `status` (`011`), `transaksi_id` (`012`), `dibuat_oleh_anggota_id` (`012`), submit/approve/cancel/amend audit columns (`011`).

**`rap_item_realisasi`:** `rap_id`, `rab_item_id`, anggaran fields, `jumlah_realisasi`, `selisih`, `disparitas` (`tepat` \| `lebih` \| `kurang`). Trigger `sync_rap_total_from_items` keeps `rap.jumlah_realisasi = sum(items)`.

**`rap_foto`:** `rap_id`, `storage_path`, `nama_file`, `uploaded_at`.

**Link ke transaksi (bidirectional):**

- `transaksi.rap_id` → `rap(id)` (`001`)
- `rap.transaksi_id` → `transaksi(id)` (`012`)

Tidak ada DB trigger yang insert transaksi saat RAP approve — otomatisasi ada di frontend (`RAPPage.handleApprove`).

## Status workflow

### RAB (`011` extends `001`)

Check constraint: `draft` \| `diajukan` \| `disetujui` \| `ditolak` \| `selesai` \| `cancelled` \| `amended`.

```
draft ──submit──► diajukan ──approve──► disetujui ──(all RAP approved)──► selesai
                    │              │
                    │              └── reject──► ditolak
                    └── cancel_rab_cascade──► cancelled
                          (juga cancel RAP + transaksi terkait)

cancelled ──amend (hook only)──► new draft (original → amended)
```

UI flow chip (`RABStatusFlow`): `draft → diajukan → disetujui → selesai`; terminal badges for `cancelled` / `amended` / `ditolak`.

**Who transitions (UI):**

| Transition | Gate |
|------------|------|
| create / edit draft / submit | `can('rab','create'|…)` + `canForRecord(..., 'diajukan_oleh')` |
| approve / reject | `can('rab','approve')` while `status === 'diajukan'` |
| cancel | `can('rab','approve')` **or** `canForRecord('rab','cancel', …, 'diajukan_oleh')` on `diajukan` \| `disetujui` |

Reject UI label in `ApprovalButtons` says “Batalkan” but writes status **`ditolak`** (not `cancelled`).

### RAP (`011`)

Check constraint: `draft` \| `submitted` \| `approved` \| `cancelled` \| `amended`.

**Naming quirk:** RAP uses English status tokens; RAB uses Indonesian (`diajukan` / `disetujui`). UI maps `submitted`→“Diajukan”, `approved`→“Disetujui”.

```
draft ──submit──► submitted ──approve──► approved  (+ insert transaksi pengeluaran)
                      │                      │
                      └──────── cancel ──────┴──► cancelled ──amend──► new draft
```

No RAP `rejected` status. Cancel from UI also cancels linked `transaksi` if `transaksi_id` set, and reverts parent RAB from `selesai` → `disetujui` if needed.

**Who transitions (UI):**

| Transition | Gate |
|------------|------|
| create | `can('rap','create')`; RAB must be `disetujui`\|`selesai` and have **no** active RAP |
| edit / submit | `canForRecord('rap', …, 'dibuat_oleh')` on `draft` |
| approve | `can('rap','approve')` on `submitted` |
| cancel | approver **or** owner cancel on `submitted`\|`approved` |
| amend | owner update on `cancelled` only |

## Permissions & RLS

### Matrix (`022`, see `docs/PERMISSIONS.md`)

Resources: `rab`, `rap`. Actions: create/read/update/delete/submit/approve/cancel. Scopes: none/own/all.

Default anggota: RAB/RAP `read=all`; write/submit/cancel=`own`; `approve=none` (RAB approve=`all` if legacy `can_approve_rab` backfilled). Bendahara/ketua: full `all`.

### Legacy boolean flags (still on `anggota_organisasi`)

| Flag | Migration | SQL helper |
|------|-----------|------------|
| `can_manage_rab` | `010` | `can_create_rab(org)` — **019** narrowed to flag-only (no bendahara/ketua role OR) |
| `can_approve_rab` | `011` | `can_approve_rab(org)` — ketua **or** flag (`021`) |
| `can_manage_rap` | `019` | `can_manage_rap(org)` |

`useAuth` still exports `canManageRAB` / `canManageRAP` / `canApproveRAB`, but **pages gate on matrix `can` / `canForRecord`**. RLS policies OR matrix + legacy helpers + personal-owner bypass.

### Owner-only manage (`019`) then approve fix (`021`)

`019` made RAB/RAP insert/update/delete **creator + manage flag** (broke approvers updating status).  
`021` restored RAB update for `can_approve_rab` / ketua.  
`022` rewired policies to `has_permission` while keeping legacy helpers as fallback.

### Personal workspace (`009`)

Separate `owner_personal_kelola_*` policies; frontend `can()` always true when `tipe === 'personal'`.

## RPCs & DB functions

| Function | File | Purpose |
|----------|------|---------|
| `cancel_rab_cascade(p_rab_id)` | `017` → tightened `019` → matrix `022` | Cancel RAB + child RAP + transaksi via `rap_id`; access: matrix cancel all/own+creator, or legacy `can_manage_rab`+creator, or personal owner |
| `cancel_transaksi_and_rap(p_transaksi_id)` | `017` (not rewired in `022`) | Cancel transaksi; if `rap_id` set, cancel that RAP; also cancel linked `iuran_rutin`. Access still role bendahara/ketua **or** `can_manage_rab` / `can_approve_rab` |
| `sync_rap_total_from_items()` | `017` | Trigger: sum `rap_item_realisasi` → `rap.jumlah_realisasi` |
| `can_create_rab` / `can_manage_rap` / `can_approve_rab` | `010`/`019`/`021` | RLS helpers |

**No** `approve_rap` RPC. Auto-transaksi + rollback are client-only.

Join-request objects (`organisasi_join_request`, `can_approve_join_request`) live in the same migration file `017` but are **not** part of the RAB/RAP domain — see anggota/onboarding flows.

## Frontend codepaths

| Path | Role |
|------|------|
| `src/pages/RABPage.jsx` | Create/edit/submit/approve/reject/cancel UI |
| `src/hooks/useRAB.js` | `addRAB`, `updateRAB`, `updateStatus`, `cancelRAB` (RPC), `amendRAB` |
| `src/components/rab/*` | `FormRAB`, `RABTable`, `RABStatusFlow`, `ApprovalButtons` |
| `src/schemas/rabSchema.js` | Zod + `rabApprovalSchema` |
| `src/pages/RAPPage.jsx` | Full RAP CRUD + status + photo upload + **approve→transaksi** |
| `src/components/rap/*` | `FormRAP`, `RAPTable`, `RAPStatusFlow`, `FotoBuktiViewer` |
| `src/schemas/rapSchema.js` | Zod itemized realization |
| `src/lib/amendmentService.js` | Generic amend helpers (`amendRAB` / `amendRAP`) — **pages mostly inline** |
| `src/stores/kasStore.js` | `updateTransaksiStatus('cancelled')` → `cancel_transaksi_and_rap` |
| `src/hooks/useSupabaseRealtime.js` | Toast copy for RAB/RAP status changes |
| Routes | `/rab`, `/rap` (`src/constants/routes.js`) |

### RAP approve → transaksi (`RAPPage.handleApprove`)

1. Set RAP `approved` (+ `approved_by` / `approved_at`).
2. Insert `transaksi`: `tipe: 'pengeluaran'`, `jumlah` from item totals, `kategori_id` from RAP/RAB, `tanggal` = `tanggal_realisasi`, `rap_id`, `status: 'submitted'`, `dibuat_oleh` = approver.
3. On tx failure: **rollback** RAP to previous status, clear approve fields.
4. On success: set `rap.transaksi_id`; if all sibling active RAPs are `approved` (empty sibling set counts as done), set RAB `status = 'selesai'`.

**Akunting gap:** insert omits `akun_keuangan_id` and does not call `createJurnalFromTransaksi` — same class of gap as iuran auto-tx (`docs/IURAN.md` / `docs/AKUNTING.md`).

### One active RAP per RAB (UI)

`approvedRAB` filter: RAB in `disetujui`\|`selesai` **and** no RAP with status other than `cancelled`/`amended`. Schema does not enforce uniqueness.

## Storage (`016`)

Bucket id/name: **`rap-foto`**.

| Setting | Migration value |
|---------|-----------------|
| `public` | **true** (so `getPublicUrl` works) |
| `file_size_limit` | 10 MB (`10485760`) |
| MIME | jpeg, png, webp, **gif, heic, heif** |

Policies: public SELECT; any authenticated INSERT/DELETE on the bucket.

Upload path pattern: `{rapId}/{uuid}_{sanitizedName}` from `RAPPage`. Viewer: `FotoBuktiViewer` via `getPublicUrl`. Client also watermark/compress images before upload.

## Constraints / pitfalls

1. **Status language split** — RAB Indonesian vs RAP English; do not assume shared enum.
2. **019 owner-only** — manage flags without being the creator cannot update; approvers need `021`/`022` approve path.
3. **`cancel_transaksi_and_rap` still legacy-gated** — not updated to `has_permission` in `022`.
4. **RAB amend unwired in UI** — `useRAB.amendRAB` + `amendmentService.amendRAB` exist; `RABPage` has no “Ubah” button. RAP amend is wired for `cancelled` only. Full amend matrix (transaksi/RAB/RAP/iuran + `amendmentService` child-copy pitfall): `docs/AMENDMENTS.md`.
5. **ApprovalButtons “Batalkan” = reject (`ditolak`)** — not the cancel cascade.
6. **Auto-transaksi is frontend, not RPC** — concurrent/offline failure relies on client rollback; not transactional with RAP approve.
7. **No jurnal / tempat uang** on RAP-created transaksi until akun is set and jurnal posted.
8. **`jumlah_realisasi > 0` on `rap`** vs item trigger allowing sum `0` — edge case if all item realizations are zero after sync.
9. **Legacy flags vs matrix** — inviting members may still send `can_manage_*` / `can_approve_rab` (edge function); prefer matrix for new work.
10. **Detail may show UUID** if `anggota_organisasi!dibuat_oleh_anggota_id` join missing — README roadmap still notes this for some views; list/detail now join when possible.

## README vs code (verified)

README (pasca sync docs) sudah benar untuk: auto transaksi saat RAP **approve** (client `handleApprove`, bukan trigger), FK `transaksi.rap_id` (`001`) + `rap.transaksi_id` (`012`), bucket `rap-foto` **public**. Diagram alur yang menempatkan auto-tx tepat setelah “buat RAP” (bukan setelah approve) masih menyesatkan — tahap yang benar adalah **approve**. Amend RAB ada di data/hook tetapi UI RAB masih lemah (tanpa tombol Ubah).

## File map

| Path | Peran |
|------|--------|
| `supabase/migrations/001_create_tables.sql` | Base RAB/RAP/transaksi |
| `supabase/migrations/002_rls_policies.sql` | Initial RLS |
| `supabase/migrations/010_can_manage_rab_and_transaksi_creator.sql` | `can_manage_rab` |
| `supabase/migrations/011_workflow_cycles.sql` | Status + audit + `can_approve_rab` |
| `supabase/migrations/012_rap_auto_transaksi.sql` | `rap.transaksi_id`, anggota FKs (columns only) |
| `supabase/migrations/016_storage_bucket_rap_foto.sql` | Bucket + storage RLS |
| `supabase/migrations/017_rab_rap_join_request_and_cancel_rpc.sql` | Items, cancel RPCs, kategori link |
| `supabase/migrations/019_restrict_rab_rap_to_owner_with_manage_flags.sql` | Owner+flag RLS, `can_manage_rap` |
| `supabase/migrations/021_fix_rab_approve_policy.sql` | Approver can update RAB |
| `supabase/migrations/022_permission_matrix.sql` | Matrix RLS rewrite |
| `src/pages/RABPage.jsx` / `RAPPage.jsx` | Primary UI |
| `src/hooks/useRAB.js` | RAB data layer |
| `src/constants/permissions.js` | Resource `rab` / `rap` |
| `docs/PERMISSIONS.md` | Matrix deep dive |
| `docs/AKUNTING.md` | Jurnal / cancel transaksi side effects |
