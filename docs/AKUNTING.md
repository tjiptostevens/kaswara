# Akunting Sederhana — Panduan Engineering

Dokumen ini menjelaskan fondasi akunting Kaswara (migration `025_akunting_sederhana.sql` + layer frontend). Verifikasi terhadap kode sumber di `src/lib/accountingService.js`, `src/stores/akuntingStore.js`, dan `src/hooks/useAkunting.js`.

## Intent

Satu sumber kebenaran keuangan berbasis **double-entry journal**, dengan dua tampilan UI di atas data yang sama:

| Mode | Preferensi | Yang dilihat user |
|------|------------|-------------------|
| **Simple** (default) | `pengaturan_user.mode_akunting = 'simple'` | Tempat uang (Cash/Bank/E-Wallet), hutang/piutang, label non-akuntansi |
| **Advance** | `'advance'` | Arus kas, laba rugi, neraca (dari saldo COA) |

Mode disimpan **per user per organisasi** — tidak mengubah data, hanya presentasi.

## Arsitektur

```
UI (Dashboard / Transaksi / Tempat Uang / Utang-Piutang / Laporan / Settings)
        │
        ▼
useAkunting()  ──►  akuntingStore (Zustand)
        │
        ├── pengaturan_user / pengaturan_akunting
        ├── akun_keuangan + v_saldo_akun_keuangan
        └── utang_piutang (+ pembayaran)
        │
        ▼
accountingService.js  ◄── juga dipanggil kasStore saat submit/cancel transaksi
        │
        ▼
jurnal + jurnal_detail  (posted | void)
        │
        ├── akun_coa (Chart of Accounts, tersembunyi di Simple)
        └── akun_keuangan.coa_id (setiap tempat uang terhubung ke COA)
```

### Tabel & view utama

| Objek | Peran |
|-------|--------|
| `pengaturan_user` | Preferensi mode Simple/Advance |
| `pengaturan_akunting` | Mata uang, fiskal, `sistem_aktif`, tanggal mulai, custom range laporan |
| `akun_coa` | Chart of Accounts (`aset` / `kewajiban` / `ekuitas` / `pendapatan` / `beban`) |
| `akun_keuangan` | Tempat uang: `cash` \| `bank` \| `ewallet` \| `lainnya` |
| `jurnal` / `jurnal_detail` | Double-entry; sumber: `transaksi`, `transfer`, `utang_piutang`, `saldo_awal`, `closing`, … |
| `utang_piutang` / `utang_piutang_pembayaran` | Hutang & piutang + cicilan |
| `periode_closing` | Riwayat tutup buku |
| `v_saldo_akun_keuangan` | `saldo_awal + Σ(debit−kredit)` per tempat uang (jurnal `posted`) |
| `v_saldo_coa` | Saldo agregat per COA |

`transaksi` diperluas: `tipe` boleh `transfer`; kolom `akun_keuangan_id`, `akun_tujuan_id`, `jurnal_id`.

### Seed COA & tempat uang

Trigger `organisasi_seed_akunting` memanggil `seed_akunting_default(org_id)` saat organisasi baru dibuat. Seed mencakup COA sistem (1100 Kas, 1110 Bank, 1200 Piutang, 2100 Hutang, 3100 Modal, 3200 Laba Ditahan, 4100/4200 Pendapatan, 5100/5200 Beban) plus tempat uang default **Cash / Dompet** dan **Bank**.

## Alur operasional

### 1. Aktifkan sistem (migrasi / saldo awal)

UI: **Pengaturan → SettingsAkunting** → RPC `aktifkan_sistem_akunting(org, tanggal_mulai, saldo_awal[])`.

Efek:

1. Pastikan COA + akun default sudah ada.
2. Set `akun_keuangan.saldo_awal` dari payload.
3. Buat jurnal `sumber = 'saldo_awal'` (Debit tempat uang / Credit Modal, atau kebalikannya jika negatif).
4. Set `pengaturan_akunting.sistem_aktif = true` dan `tanggal_mulai_sistem`.

Tanpa aktivasi, COA tetap ter-seed, tetapi laporan Advance mengandalkan jurnal yang baru mulai tercatat setelah transaksi punya `akun_keuangan_id`.

### 2. Transaksi → jurnal

`kasStore.updateTransaksiStatus`:

- Status **`submitted`**: jika belum ada `jurnal_id`, panggil `createJurnalFromTransaksi` lalu tulis `transaksi.jurnal_id`.
- Status **`cancelled`**: `voidJurnal(jurnal_id)` lalu RPC `cancel_transaksi_and_rap` (fallback update status lokal).

Aturan jurnal (`accountingService`):

| Tipe | Debit | Kredit |
|------|-------|--------|
| `pemasukan` | COA tempat uang | COA kategori (atau sub_tipe `pendapatan`) |
| `pengeluaran` | COA kategori (atau sub_tipe `beban`) | COA tempat uang |
| `transfer` | COA akun tujuan | COA akun asal |

Constraint: total debit = total kredit (±0.01); minimal 2 baris. Tanpa `akun_keuangan_id`, `createJurnalFromTransaksi` **mengembalikan error** (`Pilih tempat uang…`); `kasStore.updateTransaksiStatus` mengabaikan error itu (transaksi tetap `submitted`, tanpa jurnal).

### 3. Hutang / piutang

`akuntingStore.addUtangPiutang` → insert row → `createJurnalUtangPiutang`:

- **Utang + kas**: Debit tempat uang, Credit Hutang.
- **Utang tanpa kas**: Debit Beban, Credit Hutang.
- **Piutang + kas**: Debit Piutang, Credit tempat uang.
- **Piutang tanpa kas**: Debit Piutang, Credit Pendapatan.

Pelunasan via `bayarUtangPiutang` → `utang_piutang_pembayaran` + jurnal; update `jumlah_terbayar` / `status` (`berjalan` \| `lunas` \| `dibatalkan`).

### 4. Closing periode

`closePeriode` menjumlahkan saldo pendapatan/beban pada rentang tanggal, membuat jurnal `sumber = 'closing'` ke **Laba Ditahan**, lalu insert `periode_closing`.

## Routes & file map

| Route | Page | Catatan |
|-------|------|---------|
| `/` | `DashboardPage` | Simple: `TempatUangGrid`; Advance: `StatGrid` (saldo / pemasukan / pengeluaran) |
| `/tempat-uang` | `TempatUangPage` | CRUD tempat uang |
| `/utang-piutang` | `UtangPiutangPage` | Hutang/piutang + bayar |
| `/transaksi` | `TransaksiPage` | Form mendukung transfer + pilih akun |
| `/laporan` | `LaporanPage` | Simple: laporan lama; Advance: `LaporanAdvance` |
| `/settings` | `SettingsPage` → `SettingsAkunting` | Mode, mata uang, aktivasi, closing |

Constants: `src/constants/akunting.js` · Schema Zod: `src/schemas/akuntingSchema.js` · Types JSDoc: `src/lib/types.js`.

## RLS (ringkas)

- `pengaturan_user`: hanya owner (`user_id = auth.uid()`) + harus member org.
- `pengaturan_akunting`, `akun_coa`, `akun_keuangan`, `periode_closing`: select untuk member; write untuk `bendahara`/`ketua` (atau org `personal`).
- `jurnal` / `jurnal_detail`: member bisa select + insert; update jurnal untuk admin.
- `utang_piutang` (+ pembayaran): member full access dalam org.

## Pitfalls umum

1. **"Chart of accounts belum siap"** — COA belum ter-seed atau kategori tanpa fallback. Pastikan organisasi punya baris di `akun_coa` (`seed_akunting_default`) dan aktifkan sistem di Pengaturan bila perlu.
2. **"Pilih tempat uang"** — submit transaksi membutuhkan `akun_keuangan_id` (dan `akun_tujuan_id` untuk transfer) yang punya `coa_id`.
3. **Saldo dashboard vs jurnal** — `kasStore.hitungSaldo` menjumlahkan pemasukan−pengeluaran dari baris `transaksi` yang bukan `cancelled`/`amended` (**termasuk `draft`**; mengabaikan transfer/jurnal). Saldo "uang di mana" memakai `v_saldo_akun_keuangan` (hanya jurnal `posted`).
4. **Mode vs data** — mengganti Simple↔Advance tidak memigrasikan ulang; hanya mengubah UI.
5. **Void ≠ hapus** — cancel men-set `jurnal.status = 'void'`; view saldo mengabaikan jurnal void.
6. **Rollback hutang lunak** — jika insert `utang_piutang` sukses tapi jurnal gagal, record tetap ada dan error dikembalikan ke UI (`addUtangPiutang`).
7. **Migration lokal** — setelah pull fitur ini, jalankan `npx supabase db reset` (atau apply migration 025) agar tabel/view/RPC tersedia. Lihat juga `AGENTS.md` untuk `auto_expose_new_tables`.

## Contoh: posting jurnal seimbang

```js
import { createJurnal } from '../lib/accountingService'

await createJurnal({
  organisasiId,
  tanggal: '2026-08-01',
  keterangan: 'Contoh pemasukan',
  sumber: 'manual',
  userId,
  lines: [
    { coa_id: coaKasId, akun_keuangan_id: akunCashId, debit: 100000 },
    { coa_id: coaPendapatanId, kredit: 100000 },
  ],
})
```

## Batasan saat ini

- Pajak di Advance bersifat dasar (laporan dari COA), belum modul Core Tax penuh.
- Edge function / cron tidak terlibat di alur akunting; semua mutasi dari client + RPC SQL.
- Tidak ada automated tests untuk balancing journal atau closing.
