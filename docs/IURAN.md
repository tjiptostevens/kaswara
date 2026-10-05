# Iuran Rutin — Panduan Engineering

Workflow iuran + master kategori (migrations `014`, `020`, RLS matrix `022`, hook `useIuran`).

## Intent

Mencatat tagihan/pembayaran iuran per anggota per periode, dengan kategori (wajib/sukarela/sekali), status workflow modern, dan **otomatis membuat transaksi pemasukan** saat iuran diajukan.

## Model data

### `kategori_iuran` (`014`)

| Kolom | Nilai |
|-------|--------|
| `tipe` | `sukarela` \| `sekali` \| `wajib` |
| `frekuensi` | `mingguan`, `2_mingguan`, `bulanan`, … `tahunan` (nullable) |
| `nominal_default` | Saran nominal di form |

RLS: member SELECT; bendahara `FOR ALL` (belum di-rewire ke matrix di `022`).

### `iuran_rutin` (workflow `014`)

Status: **`draft` | `diajukan` | `cancelled` | `amended`**.

Backfill dari status lama: `lunas` → `diajukan`; `belum_bayar`/`dispensasi` → `draft`.

Kolom penting: `kategori_iuran_id`, `keterangan`, `amended_from`, `diajukan_by/at`, `cancelled_by/at`, `amended_by/at`, `transaksi_id`.

### Duplikat aktif (`020`)

- Constraint: `periode` harus tanggal awal bulan (`extract(day) = 1`).
- Unique partial index pada `(organisasi_id, anggota_id, kategori_iuran_id, periode)` untuk status aktif `draft|diajukan|lunas` ( `lunas` dipertahankan di index untuk kompatibilitas data lama; constraint status baru tidak lagi mengizinkan insert `lunas`).

## Status flow

```
draft ──ajukanIuran──► diajukan ──batalkan──► cancelled
  ▲                       │
  └── amendIuran ◄────────┘  (original → amended, buat draft baru)
```

UI: `IuranStatusFlow` menampilkan jalur utama `draft → diajukan`; terminal `cancelled` / `amended`.

**Makna produk:** `diajukan` = sudah dicatat/dibayar (menggantikan “lunas”). Tidak ada status `lunas` baru di check constraint.

## Frontend API (`useIuran`)

| Fungsi | Perilaku |
|--------|----------|
| `fetchIuran` | `read=all` → semua baris org; `read=own` → join `anggota_organisasi.user_id = user.id` |
| `addIuran` | Insert `draft`; pre-check duplikat + tangani `23505` |
| `updateIuran` | Update field + kategori |
| `ajukanIuran` | Insert `transaksi` pemasukan `status: 'submitted'`, lalu set iuran `diajukan` + `transaksi_id` |
| `batalkanIuran` | Cancel transaksi terkait (jika ada), iuran → `cancelled`, `transaksi_id = null` |
| `amendIuran` | Original → `amended`; insert draft baru dengan `amended_from` |

Halaman: `IuranPage` (insights wajib/sukarela, realtime channel), `KategoriIuranPage`, form/table di `src/components/iuran/`.

Permissions: resource `iuran` — default anggota `read=own`; aksi tulis biasanya bendahara/`all`.

## Integrasi transaksi & akunting

`ajukanIuran` membuat transaksi **tanpa** `akun_keuangan_id` / `kategori_id`. Akibatnya:

- Transaksi muncul di kas / laporan legacy.
- `createJurnalFromTransaksi` (saat submit lewat `kasStore`) **tidak** dipanggil di path ini — insert langsung `submitted`.
- Jika jurnal di-trigger nanti, `createJurnalFromTransaksi` mengembalikan error “Pilih tempat uang…” (bukan silent skip); `kasStore` mengabaikan error itu.

Saldo “uang di mana” / jurnal Advance **tidak** otomatis bertambah dari iuran sampai transaksi dilengkapi akun keuangan (atau alur diubah).

## Edge / reminder drift

`send-reminder` masih memfilter `status = 'belum_bayar'` — status itu sudah dihapus di `014`. Lihat `docs/EDGE_FUNCTIONS.md`.

## Pitfalls

1. **“Sudah ada” / `23505`** — satu kombinasi anggota+kategori+periode aktif; amend/cancel dulu sebelum buat ulang.
2. **Periode harus `YYYY-MM-01`** — form harus menormalisasi ke awal bulan.
3. **Kategori tanpa matrix RLS** — kelola `kategori_iuran` masih role bendahara di SQL, bukan `has_permission`.
4. **Iuran → jurnal gap** — lihat bagian akunting di atas; jangan asumsikan Tempat Uang ikut ter-update.
5. **`batalkanIuran` tidak void jurnal** — membatalkan transaksi terkait lewat update `status = cancelled` langsung (bukan `voidJurnal` / `cancel_transaksi_and_rap`). Aman selama auto-tx iuran belum punya jurnal; trap jika path itu nanti memposting jurnal.
6. **`lunas` di query insights** — beberapa query di `IuranPage` masih `.in('status', ['diajukan', 'lunas'])` untuk data legacy; status baru hanya `diajukan`.
7. **Own-read owner field** — filter lewat `anggota_organisasi.user_id`, bukan `dibuat_oleh` pada baris iuran.

## File map

| Path | Peran |
|------|--------|
| `supabase/migrations/014_iuran_workflow.sql` | Kategori + status workflow |
| `supabase/migrations/020_prevent_duplicate_iuran_periode_kategori.sql` | Unique aktif + periode |
| `supabase/migrations/022_permission_matrix.sql` | RLS `anggota_kelola_iuran` |
| `src/hooks/useIuran.js` | CRUD + ajukan/batal/amend |
| `src/pages/IuranPage.jsx` | UI + insights + realtime |
| `src/pages/KategoriIuranPage.jsx` | Master kategori |
| `src/components/iuran/*` | Form, table, status flow |
| `src/schemas/iuranSchema.js` | Validasi form |
