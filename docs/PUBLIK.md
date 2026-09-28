# Transparansi Publik — Panduan Engineering

Halaman read-only keuangan organisasi tanpa login (migration `013_publik_transparansi.sql` + `SettingsPage` / `PublikPage`).

## Intent

Bendahara/ketua bisa membagikan laporan kas ke warga lewat URL publik. Data yang tampil hanya transaksi **`submitted`**; draft/cancelled/amended tidak dipublikasikan.

## Model data

Kolom pada `organisasi` (migration `013`):

| Kolom | Tipe | Peran |
|-------|------|--------|
| `publik_aktif` | `boolean` default `false` | Gate akses publik |
| `publik_slug` | `text` nullable, unique partial index | Alias URL ramah (bukan UUID) |

## Routes

| Route | Komponen | Auth |
|-------|----------|------|
| `/publik` | `PublikLandingPage` | Publik (cari/scan kode) |
| `/publik/:handle` | `PublikPage` | Publik (laporan) |

Helper: `getPublikUrl(handle)` di `src/constants/routes.js` → `/publik/${handle}`.

`handle` boleh **UUID org** atau **slug** (dinormalisasi lowercase).

## Alur aktivasi (pengurus)

1. Buka **Pengaturan** (`SettingsPage`) — hanya workspace non-personal.
2. Toggle `publik_aktif` (butuh `canManage`: ketua/bendahara).
3. Opsional: set alias `publik_slug` lewat `normalizePublikSlug` (huruf kecil, `-`, tanpa UUID-like).
4. Bagikan:
   - URL UUID: `{origin}/publik/{organisasi.id}`
   - URL alias: `{origin}/publik/{slug}`
   - QR (canvas download) yang memuat URL yang sama

Error unik slug → Postgres `23505` → toast “Alias sudah digunakan…”.

## Resolusi handle (`PublikPage`)

```
handle dari URL
  │
  ├─ valid UUID? → SELECT organisasi WHERE id = handle AND publik_aktif
  └─ else / miss  → SELECT … WHERE publik_slug = lower(handle) AND publik_aktif
  │
  ▼
SELECT transaksi WHERE organisasi_id AND status = 'submitted'
  ORDER BY tanggal DESC LIMIT 100
  (+ join kategori_transaksi.nama)
```

UI menghitung saldo = Σ pemasukan − Σ pengeluaran dari hasil itu (bukan view jurnal), plus mini cashflow 6 bulan.

## RLS (anon boleh baca jika aktif)

Policies di `013`:

| Policy | Tabel | Syarat |
|--------|-------|--------|
| `publik_baca_organisasi` | `organisasi` | `publik_aktif = true` |
| `publik_baca_transaksi` | `transaksi` | org terkait `publik_aktif` |
| `publik_baca_kategori` | `kategori_transaksi` | org terkait `publik_aktif` |

Tidak ada policy publik untuk RAB/RAP/iuran/surat/jurnal — hanya org + transaksi + kategori.

## Pitfalls

1. **`PublikLandingPage` search broken** — file memakai `supabase` di `handleCari` **tanpa import** `../lib/supabase`. Tombol “Cari” juga dibungkus `<Link to={/publik/:kode}>`, sehingga navigasi langsung ke halaman laporan; preview org jarang berguna. Prefer uji alur lewat URL langsung `/publik/{uuid|slug}` atau QR dari Settings.
2. **Landing lookup tanpa `publik_aktif`** — jika search diperbaiki, query landing saat ini filter `id` saja; `PublikPage` tetap menolak org non-aktif.
3. **Slug vs UUID** — jangan simpan slug berbentuk UUID (UI menolak). Query UUID hanya dijalankan jika handle valid agar PostgREST tidak error cast.
4. **Saldo publik ≠ jurnal / ≠ dashboard** — halaman publik mengagregat transaksi `status = 'submitted'` saja. Legacy `kasStore.hitungSaldo` (Dashboard) mengecualikan `cancelled`/`amended` tetapi **masih menghitung `draft`**. Keduanya mengabaikan transfer/jurnal Tempat Uang.
5. **Personal workspace** — UI Settings tidak menampilkan blok publik; kolom tetap ada di DB tetapi tidak dipakai alur produk.
6. **Limit 100** — laporan publik memotong 100 transaksi terbaru; cashflow 6 bulan hanya dari subset itu.

## File map

| Path | Peran |
|------|--------|
| `supabase/migrations/013_publik_transparansi.sql` | Kolom + RLS anon |
| `src/pages/PublikPage.jsx` | Laporan publik |
| `src/pages/PublikLandingPage.jsx` | Landing cari/QR |
| `src/pages/SettingsPage.jsx` | Toggle, slug, QR, copy URL |
| `src/constants/routes.js` | `PUBLIK_*`, `getPublikUrl` |
| `src/App.jsx` | Route tanpa `ProtectedRoute` |
