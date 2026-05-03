-- 012_rap_auto_transaksi.sql
-- Kaswara — sambungan RAP→Transaksi otomatis + nama anggota di RAP & RAB

-- ─────────────────────────────────────────
-- 1. RAP: kolom transaksi_id (link ke transaksi yang dibuat otomatis)
-- ─────────────────────────────────────────
alter table rap
  add column if not exists transaksi_id uuid references transaksi(id);

-- ─────────────────────────────────────────
-- 2. RAP: kolom dibuat_oleh_anggota_id (FK ke anggota_organisasi untuk nama)
-- ─────────────────────────────────────────
alter table rap
  add column if not exists dibuat_oleh_anggota_id uuid references anggota_organisasi(id);

-- ─────────────────────────────────────────
-- 3. RAB: kolom dibuat_oleh_anggota_id (FK ke anggota_organisasi untuk nama)
-- ─────────────────────────────────────────
alter table rab
  add column if not exists dibuat_oleh_anggota_id uuid references anggota_organisasi(id);
