-- 019_restrict_rab_rap_to_owner_with_manage_flags.sql
-- Kaswara — semua anggota bisa lihat RAB/RAP, kelola hanya creator yang punya can_manage_*.

-- 1) Permission baru untuk kelola RAP
alter table anggota_organisasi
  add column if not exists can_manage_rap boolean not null default false;

-- 2) Helper permission functions (checkbox based)
create or replace function can_create_rab(org_id uuid)
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
      and ao.can_manage_rab = true
  );
$$;

create or replace function can_manage_rap(org_id uuid)
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
      and ao.can_manage_rap = true
  );
$$;

-- 3) RAB policies: create/update/delete hanya pemilik sendiri + can_manage_rab
drop policy if exists "anggota_bisa_buat_rab" on rab;
drop policy if exists "kelola_update_rab" on rab;
drop policy if exists "bendahara_hapus_rab" on rab;
drop policy if exists "pemilik_bisa_hapus_rab" on rab;

create policy "anggota_bisa_buat_rab"
  on rab for insert
  with check (
    (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

create policy "pemilik_bisa_update_rab"
  on rab for update
  using (
    (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  )
  with check (
    (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

create policy "pemilik_bisa_hapus_rab"
  on rab for delete
  using (
    (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- 4) RAB item policies: ikut ownership RAB
drop policy if exists "kelola_rab_item" on rab_item;

create policy "kelola_rab_item"
  on rab_item for all
  using (
    exists (
      select 1
      from rab r
      where r.id = rab_item.rab_id
        and (
          (can_create_rab(r.organisasi_id) and r.diajukan_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from rab r
      where r.id = rab_item.rab_id
        and (
          (can_create_rab(r.organisasi_id) and r.diajukan_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );

-- 5) RAP policies: create/update/delete hanya pemilik sendiri + can_manage_rap
drop policy if exists "bendahara_kelola_rap" on rap;
drop policy if exists "anggota_bisa_buat_rap_sendiri" on rap;
drop policy if exists "pemilik_bisa_update_rap" on rap;
drop policy if exists "pemilik_bisa_hapus_rap" on rap;

create policy "anggota_bisa_buat_rap_sendiri"
  on rap for insert
  with check (
    (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

create policy "pemilik_bisa_update_rap"
  on rap for update
  using (
    (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  )
  with check (
    (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

create policy "pemilik_bisa_hapus_rap"
  on rap for delete
  using (
    (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- 6) RAP item realisasi: ikut ownership RAP
drop policy if exists "bendahara_kelola_rap_item_realisasi" on rap_item_realisasi;
drop policy if exists "pengelola_rap_kelola_rap_item_realisasi" on rap_item_realisasi;

create policy "pengelola_rap_kelola_rap_item_realisasi"
  on rap_item_realisasi for all
  using (
    exists (
      select 1
      from rap r
      where r.id = rap_item_realisasi.rap_id
        and (
          (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from rap r
      where r.id = rap_item_realisasi.rap_id
        and (
          (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );

-- 7) RAP foto: ikut ownership RAP
drop policy if exists "bendahara_kelola_rap_foto" on rap_foto;
drop policy if exists "pengelola_rap_kelola_rap_foto" on rap_foto;

create policy "pengelola_rap_kelola_rap_foto"
  on rap_foto for all
  using (
    exists (
      select 1
      from rap r
      where r.id = rap_foto.rap_id
        and (
          (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from rap r
      where r.id = rap_foto.rap_id
        and (
          (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );

-- 8) Tighten cancel_rab_cascade: hanya creator + can_manage_rab (atau owner personal)
create or replace function cancel_rab_cascade(p_rab_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
  v_creator uuid;
  v_now timestamptz := now();
  v_has_access boolean := false;
  v_is_personal_owner boolean := false;
  v_rap_count int := 0;
  v_tx_count int := 0;
begin
  select organisasi_id, status, diajukan_oleh
  into v_org_id, v_status, v_creator
  from rab
  where id = p_rab_id;

  if v_org_id is null then
    raise exception 'RAB tidak ditemukan';
  end if;

  select exists (
    select 1
    from anggota_organisasi ao
    where ao.organisasi_id = v_org_id
      and ao.user_id = auth.uid()
      and ao.aktif = true
      and ao.can_manage_rab = true
      and v_creator = auth.uid()
  ) into v_has_access;

  select exists (
    select 1
    from organisasi o
    where o.id = v_org_id
      and o.tipe = 'personal'
      and o.created_by = auth.uid()
  ) into v_is_personal_owner;

  if not (v_has_access or v_is_personal_owner) then
    raise exception 'Tidak memiliki akses untuk membatalkan RAB';
  end if;

  if v_status in ('cancelled', 'amended') then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'message', 'RAB sudah tidak aktif',
      'rab_id', p_rab_id
    );
  end if;

  update rab
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = v_now
  where id = p_rab_id
    and status not in ('cancelled', 'amended');

  with target_rap as (
    select id
    from rap
    where rab_id = p_rab_id
      and status not in ('cancelled', 'amended')
  ),
  updated_rap as (
    update rap r
    set status = 'cancelled',
        cancelled_by = auth.uid(),
        cancelled_at = v_now
    from target_rap t
    where r.id = t.id
    returning r.id
  ),
  updated_tx as (
    update transaksi t
    set status = 'cancelled',
        cancelled_by = auth.uid(),
        cancelled_at = v_now
    where t.rap_id in (select id from updated_rap)
      and t.status not in ('cancelled', 'amended')
    returning t.id
  )
  select
    coalesce((select count(*) from updated_rap), 0),
    coalesce((select count(*) from updated_tx), 0)
  into v_rap_count, v_tx_count;

  return jsonb_build_object(
    'ok', true,
    'rab_id', p_rab_id,
    'cancelled_rap_count', v_rap_count,
    'cancelled_transaksi_count', v_tx_count
  );
end;
$$;
