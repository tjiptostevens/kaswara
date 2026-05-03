-- 011_workflow_cycles.sql
-- Kaswara — Add workflow cycles (draft→submitted→cancelled→amended) to transaksi, rab, rap
-- Plus can_approve_rab permission on anggota_organisasi

-- ─────────────────────────────────────────
-- 1. TRANSAKSI: status workflow + history
-- ─────────────────────────────────────────
alter table transaksi
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'submitted', 'cancelled', 'amended'));

alter table transaksi
  add column if not exists amended_from uuid references transaksi(id);

alter table transaksi
  add column if not exists submitted_by uuid references auth.users(id);
alter table transaksi
  add column if not exists submitted_at timestamptz;

alter table transaksi
  add column if not exists cancelled_by uuid references auth.users(id);
alter table transaksi
  add column if not exists cancelled_at timestamptz;

alter table transaksi
  add column if not exists amended_by uuid references auth.users(id);
alter table transaksi
  add column if not exists amended_at timestamptz;

-- Back-fill existing records as 'submitted' so they stay visible/usable
update transaksi set status = 'submitted' where status = 'draft';

-- ─────────────────────────────────────────
-- 2. RAB: extend status + history
-- ─────────────────────────────────────────
alter table rab
  drop constraint if exists rab_status_check;

alter table rab
  add constraint rab_status_check
    check (status in ('draft', 'diajukan', 'disetujui', 'ditolak', 'selesai', 'cancelled', 'amended'));

alter table rab
  add column if not exists amended_from uuid references rab(id);

alter table rab
  add column if not exists diajukan_at timestamptz;
alter table rab
  add column if not exists disetujui_at timestamptz;
alter table rab
  add column if not exists disetujui_oleh uuid references auth.users(id);

alter table rab
  add column if not exists cancelled_by uuid references auth.users(id);
alter table rab
  add column if not exists cancelled_at timestamptz;

alter table rab
  add column if not exists amended_by uuid references auth.users(id);
alter table rab
  add column if not exists amended_at timestamptz;

-- ─────────────────────────────────────────
-- 3. RAP: status workflow + history
-- ─────────────────────────────────────────
alter table rap
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'cancelled', 'amended'));

alter table rap
  add column if not exists amended_from uuid references rap(id);

alter table rap
  add column if not exists submitted_by uuid references auth.users(id);
alter table rap
  add column if not exists submitted_at timestamptz;

alter table rap
  add column if not exists approved_by uuid references auth.users(id);
alter table rap
  add column if not exists approved_at timestamptz;

alter table rap
  add column if not exists cancelled_by uuid references auth.users(id);
alter table rap
  add column if not exists cancelled_at timestamptz;

alter table rap
  add column if not exists amended_by uuid references auth.users(id);
alter table rap
  add column if not exists amended_at timestamptz;

-- ─────────────────────────────────────────
-- 4. ANGGOTA: can_approve_rab permission
-- ─────────────────────────────────────────
alter table anggota_organisasi
  add column if not exists can_approve_rab boolean not null default false;

-- ─────────────────────────────────────────
-- 5. RLS: only allow delete on cancelled transaksi
-- ─────────────────────────────────────────
drop policy if exists "bendahara_hapus_transaksi" on transaksi;
drop policy if exists "delete_cancelled_transaksi" on transaksi;

create policy "delete_cancelled_transaksi"
  on transaksi for delete
  using (
    status = 'cancelled'
    and (
      get_role(organisasi_id) in ('bendahara', 'ketua')
      or exists (
        select 1 from organisasi o
        where o.id = transaksi.organisasi_id
          and o.tipe = 'personal'
          and o.created_by = auth.uid()
      )
    )
  );
