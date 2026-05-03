-- 013_publik_transparansi.sql
-- Kaswara — Halaman transparansi publik (read-only tanpa login)

-- ─────────────────────────────────────────
-- 1. Tambah kolom pada tabel organisasi
-- ─────────────────────────────────────────
alter table organisasi
  add column if not exists publik_aktif boolean not null default false,
  add column if not exists publik_slug  text;

-- slug harus unik jika diisi
create unique index if not exists organisasi_publik_slug_unique
  on organisasi (publik_slug)
  where publik_slug is not null;

-- ─────────────────────────────────────────
-- 2. RLS — baca data publik tanpa autentikasi
--    Hanya berlaku jika organisasi.publik_aktif = true
-- ─────────────────────────────────────────

-- transaksi: warga publik boleh SELECT jika organisasi publik
drop policy if exists "publik_baca_transaksi" on transaksi;
create policy "publik_baca_transaksi"
  on transaksi for select
  using (
    exists (
      select 1 from organisasi o
      where o.id = transaksi.organisasi_id
        and o.publik_aktif = true
    )
  );

-- organisasi: warga publik boleh SELECT baris yang publik_aktif
drop policy if exists "publik_baca_organisasi" on organisasi;
create policy "publik_baca_organisasi"
  on organisasi for select
  using (publik_aktif = true);

-- kategori_transaksi: publik boleh baca kategori untuk organisasi publik
drop policy if exists "publik_baca_kategori" on kategori_transaksi;
create policy "publik_baca_kategori"
  on kategori_transaksi for select
  using (
    exists (
      select 1 from organisasi o
      where o.id = kategori_transaksi.organisasi_id
        and o.publik_aktif = true
    )
  );
