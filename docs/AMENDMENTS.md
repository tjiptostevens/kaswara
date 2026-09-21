# Amendment Workflows — Engineering Guide

How Kaswara creates a **new draft** from a cancelled/terminal record while marking the original `amended`. Verified against migration `011_workflow_cycles.sql` / `014_iuran_workflow.sql` and the frontend paths below.

## Intent

Operators need to correct a submitted RAB, RAP, transaksi, or iuran without deleting audit history. Pattern:

1. Original row → `status = 'amended'` (+ `amended_by` / `amended_at`)
2. Insert new row → `status = 'draft'`, `amended_from = <original id>`
3. Copy children when applicable (RAB items, RAP photos / item realisasi)

```
draft → … → cancelled ──amend──► new draft
                │
                └── original becomes amended (terminal)
```

Surat (`permintaan_surat`) has **no** amend status — only draft / diajukan / selesai / cancelled.

## Schema (shared columns)

Introduced mainly in `011` (transaksi, rab, rap) and `014` (iuran):

| Column | Role |
|--------|------|
| `status` | includes `amended` as terminal |
| `amended_from` | FK to the prior version |
| `amended_by` | `auth.users` id |
| `amended_at` | timestamptz |

UI helper: `src/components/ui/AmendmentInfo.jsx` (shows amended_at / amended_from / actor label).

## Where amend is implemented

| Entity | Primary path | Uses `amendmentService`? | Children copied? | UI wired? |
|--------|--------------|--------------------------|------------------|-----------|
| Transaksi | `kasStore.amendTransaksi` via `useTransaksi` / `TransaksiPage` | **No** (store is inline) | N/A (no child table) | **Yes** — “Ubah” on cancelled |
| RAB | `useRAB.amendRAB` (inline) | **No** | **Yes** — re-inserts `rab_item` when `original.rab_item` present | **No** — `RABPage` never calls `amendRAB` |
| RAP | Inline handler on `RAPPage` | **No** | **Yes** — copies `rap_item_realisasi` / photos in page logic | **Yes** — “Ubah” when `cancelled` |
| Iuran | `useIuran.amendIuran` (inline) | **No** | N/A | **Yes** on `IuranPage` |

### `src/lib/amendmentService.js` (shared helper — mostly unused by UI)

Exports `createAmendmentRecord`, `amendTransaksi`, `amendRAB`, `amendRAP`.

**Pitfall:** child copy reads `original[childTableName]` after `select('*')` **without** an embedded resource. Nested arrays are never present, so `amendRAB` / `amendRAP` in this module would create a draft **without** items/photos unless the caller passes a pre-joined `original`. Prefer the hook/page implementations that insert children explicitly.

## Status vocabulary (do not mix)

| Entity | Non-amend statuses (abbrev.) | Amend terminal |
|--------|------------------------------|----------------|
| Transaksi | `draft`, `submitted`, `cancelled` | `amended` |
| RAB | `draft`, `diajukan`, `disetujui`, `ditolak`, `selesai`, `cancelled` | `amended` |
| RAP | `draft`, `submitted`, `approved`, `cancelled` | `amended` |
| Iuran | `draft`, `diajukan`, `cancelled` | `amended` |

RAB uses Indonesian labels; RAP/transaksi use English for several states — see [RAB_RAP.md](RAB_RAP.md).

## Permissions & RLS

Amend is typically an **update** (mark original) + **insert** (new draft). UI gates via the permission matrix (`update` / `create` on the resource, often `own`). Personal workspace bypasses `can()` in the frontend.

Cancel RPCs are separate from amend:

- `cancel_rab_cascade` — used by `useRAB.cancelRAB` (matrix-aware as of `022`)
- `cancel_transaksi_and_rap` — used by `kasStore` cancel; **still legacy role/flag gated** (not rewritten to `has_permission` in `022`)

## Operational notes

1. **Amended rows are inactive** for balances / “active RAP” filters — dashboards and RAP uniqueness checks exclude `cancelled` and `amended`.
2. **Amending does not reverse journals.** If the original transaksi was `submitted` and posted a jurnal, void/cancel paths handle jurnal separately; a new draft must be submitted again (with `akun_keuangan_id`) to post.
3. **Iuran unique index** (`020`) treats `draft|diajukan|lunas` as active — amend moves the old row to `amended` so a new draft for the same periode/kategori can insert.
4. **Do not call `amendmentService.amendRAB` from new UI** until child fetch is fixed; extend `useRAB.amendRAB` or fix the service to `select('*, rab_item(*)')` / query children separately.

## File map

| Path | Role |
|------|------|
| `supabase/migrations/011_workflow_cycles.sql` | Status + amend columns (transaksi/RAB/RAP) |
| `supabase/migrations/014_iuran_workflow.sql` | Iuran amend columns + status rewrite |
| `src/lib/amendmentService.js` | Generic helper (UI mostly bypasses) |
| `src/stores/kasStore.js` | `amendTransaksi` |
| `src/hooks/useRAB.js` | `amendRAB` (unwired in page) |
| `src/hooks/useIuran.js` | `amendIuran` |
| `src/pages/RAPPage.jsx` | Inline RAP amend |
| `src/pages/TransaksiPage.jsx` / `IuranPage.jsx` | Wired amend actions |
| `src/components/ui/AmendmentInfo.jsx` | Display fragment |
| `docs/RAB_RAP.md` / `docs/IURAN.md` | Subsystem status diagrams |
