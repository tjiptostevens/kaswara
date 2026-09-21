# Permintaan Surat — Panduan Engineering

Workflow pengajuan surat anggota (migration `018_permintaan_surat_workflow.sql`, RLS approve di-`022`, UI `SuratPage`).

## Intent

Anggota membuat draft permintaan surat → mengajukan → pengurus dengan izin `surat.approve` menandai selesai (`approve` / `reject`). Tidak ada generate file surat; status + catatan proses saja.

## Model data

Tabel `permintaan_surat`:

| Kolom | Keterangan |
|-------|------------|
| `judul`, `keperluan`, `detail` | Isi pengajuan (`detail` opsional) |
| `status` | `draft` \| `diajukan` \| `selesai` \| `cancelled` |
| `hasil_status` | `approve` \| `reject` (saat `selesai`) |
| `catatan_pemroses` | Opsional (kolom ada; UI proses saat ini tidak selalu mengisi) |
| `tanggal_pengajuan`, `diajukan_at` | Diisi saat submit |
| `selesai_at`, `selesai_by` | Saat proses |
| `cancelled_at`, `cancelled_by` | Saat batal |
| `dibuat_oleh`, `dibuat_oleh_anggota_id` | Pemohon |

## Status flow

```
draft ──submit──► diajukan ──proses──► selesai (hasil_status approve|reject)
  │                  │
  └── cancel ◄───────┘
  └── delete (hanya draft, RLS + UI)
```

Tidak ada status `amended` untuk surat (berbeda dari iuran/RAB/transaksi).

## Permissions (UI)

Resource `surat` di matrix (`docs/PERMISSIONS.md`):

| Action | Pemakaian di `SuratPage` |
|--------|---------------------------|
| `read` own/all | List: own → filter `dibuat_oleh = user.id` |
| `create` | Tombol “Buat Draft” |
| `update` / `submit` / `delete` / `cancel` | `canForRecord(..., 'dibuat_oleh')` |
| `approve` | Proses approve/reject saat `status === 'diajukan'` |

Default anggota: hampir semua `own`, `approve=none`. Bendahara/ketua: `all`.

Tanpa `read` → redirect dashboard.

## RLS

Dari `018` + rewrite approve di `022`:

| Policy | Operasi | Syarat |
|--------|---------|--------|
| `anggota_bisa_lihat_…` | SELECT | `is_member(org)` |
| `anggota_bisa_buat_…` | INSERT | member + `dibuat_oleh = auth.uid()` |
| `pemohon_bisa_update_draft_…` | UPDATE | pemilik + status `draft`/`diajukan` |
| `approver_bisa_proses_…` (`022`) | UPDATE | `has_permission(…,'surat','approve','any')` **atau** role ketua/bendahara **atau** pemilik draft/diajukan |
| `pemohon_bisa_hapus_draft_…` | DELETE | pemilik + `status = 'draft'` |

Catatan: SELECT RLS memberi semua member melihat semua baris; **pembatasan own/all dilakukan di frontend** (query filter). Jangan andalkan SELECT RLS untuk menyembunyikan surat anggota lain.

## Alur UI (`SuratPage`)

Tidak ada store/hook terpisah — langsung `supabase.from('permintaan_surat')`.

1. **Create** → insert `status: 'draft'`.
2. **Submit** → `status: 'diajukan'`, set `diajukan_at` + `tanggal_pengajuan` (date).
3. **Process** → `status: 'selesai'`, `hasil_status`, `selesai_at/by`.
4. **Cancel** → `cancelled` + timestamps (dari draft atau diajukan jika `can` cancel).
5. **Delete** → hanya draft.

## Pitfalls

1. **RLS SELECT lebar** — member dengan `read=own` masih *bisa* query semua baris lewat client mentah; UI memfilter. Uji dengan user biasa di Network tab.
2. **Approve via role fallback** — policy `022` masih mengizinkan ketua/bendahara meski matrix `approve=none`.
3. **Bukan generator dokumen** — tidak ada template PDF/DOCX; “selesai” hanya status workflow.
4. **Personal workspace** — menu Surat mengikuti matrix/bypass personal seperti resource lain; tabel tidak punya kebijakan `tipe = personal` khusus di `018`.

## File map

| Path | Peran |
|------|--------|
| `supabase/migrations/018_permintaan_surat_workflow.sql` | Tabel + RLS awal |
| `supabase/migrations/022_permission_matrix.sql` | Policy approve via `has_permission` |
| `src/pages/SuratPage.jsx` | CRUD + workflow |
| `src/constants/permissions.js` | Resource `surat` |
| `src/constants/routes.js` | `ROUTES.SURAT` |
| `src/components/layout/Sidebar.jsx` | Nav gated by matrix |
