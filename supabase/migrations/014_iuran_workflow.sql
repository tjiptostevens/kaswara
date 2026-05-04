-- 014_iuran_workflow.sql
-- Kaswara — Iuran workflow redesign + kategori_iuran master table

-- ─────────────────────────────────────────
-- 1. NEW TABLE: kategori_iuran
-- ─────────────────────────────────────────
create table if not exists kategori_iuran (
  id               uuid primary key default uuid_generate_v4(),
  organisasi_id    uuid references organisasi(id) on delete cascade,
  nama             text not null,
  tipe             text not null default 'sukarela'
                     check (tipe in ('sukarela', 'sekali', 'wajib')),
  frekuensi        text
                     check (frekuensi in (
                       'mingguan', '2_mingguan', 'bulanan',
                       '2_bulanan', '3_bulanan', '4_bulanan', '6_bulanan', 'tahunan'
                     )),
  nominal_default  numeric(15,2),
  keterangan       text,
  created_at       timestamptz default now()
);

alter table kategori_iuran enable row level security;

create policy "anggota_bisa_lihat_kategori_iuran"
  on kategori_iuran for select
  using (is_member(organisasi_id));

create policy "bendahara_kelola_kategori_iuran"
  on kategori_iuran for all
  using (get_role(organisasi_id) = 'bendahara');

-- ─────────────────────────────────────────
-- 2. ALTER iuran_rutin: add new columns
-- ─────────────────────────────────────────
alter table iuran_rutin
  add column if not exists kategori_iuran_id uuid references kategori_iuran(id);

alter table iuran_rutin
  add column if not exists keterangan text;

alter table iuran_rutin
  add column if not exists amended_from uuid references iuran_rutin(id);

alter table iuran_rutin
  add column if not exists diajukan_by uuid references auth.users(id);

alter table iuran_rutin
  add column if not exists diajukan_at timestamptz;

alter table iuran_rutin
  add column if not exists cancelled_by uuid references auth.users(id);

alter table iuran_rutin
  add column if not exists cancelled_at timestamptz;

alter table iuran_rutin
  add column if not exists amended_by uuid references auth.users(id);

alter table iuran_rutin
  add column if not exists amended_at timestamptz;

-- ─────────────────────────────────────────
-- 3. BACKFILL then UPDATE status constraint
-- ─────────────────────────────────────────
-- Backfill: lunas → diajukan (already settled = submitted)
--           belum_bayar / dispensasi → draft (not yet submitted)
update iuran_rutin set status = 'diajukan' where status = 'lunas';
update iuran_rutin set status = 'draft'    where status in ('belum_bayar', 'dispensasi');

-- Drop the old status check constraint
alter table iuran_rutin drop constraint if exists iuran_rutin_status_check;

-- Add new workflow status constraint
alter table iuran_rutin add constraint iuran_rutin_status_check
  check (status in ('draft', 'diajukan', 'cancelled', 'amended'));
