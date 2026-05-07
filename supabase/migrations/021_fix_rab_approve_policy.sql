-- 021_fix_rab_approve_policy.sql
-- Kaswara — allow users with can_approve_rab (or ketua role) to update RAB status (disetujui/ditolak)
-- Migration 019 restricted RAB updates to owner-only, which broke the approval workflow.

-- Helper: check if user can approve RAB in the given org
create or replace function can_approve_rab(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from anggota_organisasi ao
    where ao.user_id = auth.uid()
      and ao.organisasi_id = org_id
      and ao.aktif = true
      and (ao.can_approve_rab = true or ao.role = 'ketua')
  );
$$;

-- Drop the owner-only update policy and replace with one that also allows approvers
drop policy if exists "pemilik_bisa_update_rab" on rab;

create policy "pemilik_atau_approver_bisa_update_rab"
  on rab for update
  using (
    -- Owner can update their own RAB
    (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    -- Approvers can update any RAB in the org (to change status)
    or can_approve_rab(organisasi_id)
    -- Personal workspace owner
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  )
  with check (
    (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or can_approve_rab(organisasi_id)
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );
