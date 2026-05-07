-- 022_permission_matrix.sql
-- Kaswara — Matrix permission per anggota per resource
-- Scope: transaksi, iuran, rab, rap, surat
-- Action: create, read, update, delete, submit, approve, cancel
-- Level: none | own | all

-- ─────────────────────────────────────────
-- 1. Tabel matrix permission
-- ─────────────────────────────────────────
create table if not exists anggota_permission (
  id                    uuid primary key default uuid_generate_v4(),
  anggota_organisasi_id uuid not null references anggota_organisasi(id) on delete cascade,
  resource              text not null
                          check (resource in ('transaksi', 'iuran', 'rab', 'rap', 'surat')),
  action                text not null
                          check (action in ('create', 'read', 'update', 'delete', 'submit', 'approve', 'cancel')),
  scope                 text not null default 'none'
                          check (scope in ('none', 'own', 'all')),
  created_at            timestamptz default now(),
  unique (anggota_organisasi_id, resource, action)
);

create index if not exists idx_anggota_permission_ao_id
  on anggota_permission (anggota_organisasi_id);

alter table anggota_permission enable row level security;

-- RLS: anggota dapat melihat permission milik sendiri
drop policy if exists "anggota_lihat_permission_sendiri" on anggota_permission;
create policy "anggota_lihat_permission_sendiri"
  on anggota_permission for select
  using (
    exists (
      select 1 from anggota_organisasi ao
      where ao.id = anggota_permission.anggota_organisasi_id
        and ao.user_id = auth.uid()
        and ao.aktif = true
    )
  );

-- RLS: bendahara / ketua dapat mengelola semua permission dalam organisasinya
drop policy if exists "bendahara_ketua_kelola_permission" on anggota_permission;
create policy "bendahara_ketua_kelola_permission"
  on anggota_permission for all
  using (
    exists (
      select 1
      from anggota_organisasi ao_caller
      join anggota_organisasi ao_target on ao_target.id = anggota_permission.anggota_organisasi_id
      where ao_caller.user_id = auth.uid()
        and ao_caller.organisasi_id = ao_target.organisasi_id
        and ao_caller.aktif = true
        and ao_caller.role in ('bendahara', 'ketua')
        -- Proteksi: tidak boleh mengubah permission sendiri
        and ao_target.user_id <> auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 2. Helper functions
-- ─────────────────────────────────────────

-- Mengembalikan scope ('none'|'own'|'all') untuk auth.uid() di org tertentu
create or replace function get_permission_scope(p_org_id uuid, p_resource text, p_action text)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ap.scope
      from anggota_permission ap
      join anggota_organisasi ao on ao.id = ap.anggota_organisasi_id
      where ao.user_id      = auth.uid()
        and ao.organisasi_id = p_org_id
        and ao.aktif         = true
        and ap.resource      = p_resource
        and ap.action        = p_action
      limit 1
    ),
    'none'
  );
$$;

-- Mengembalikan boolean apakah user punya akses minimal p_min_scope
-- p_min_scope: 'any' = own atau all, 'own' = minimal own, 'all' = hanya all
create or replace function has_permission(
  p_org_id    uuid,
  p_resource  text,
  p_action    text,
  p_min_scope text default 'any'
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select case p_min_scope
    when 'all'  then get_permission_scope(p_org_id, p_resource, p_action) = 'all'
    when 'own'  then get_permission_scope(p_org_id, p_resource, p_action) in ('own', 'all')
    else             get_permission_scope(p_org_id, p_resource, p_action) != 'none'
  end;
$$;

-- ─────────────────────────────────────────
-- 3. Helper internal untuk backfill
-- ─────────────────────────────────────────

-- Isi full access (scope='all') untuk semua resource+action
create or replace function _set_full_permissions(p_ao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into anggota_permission (anggota_organisasi_id, resource, action, scope)
  select p_ao_id, r, a, 'all'
  from   unnest(array['transaksi','iuran','rab','rap','surat']) r
  cross  join unnest(array['create','read','update','delete','submit','approve','cancel']) a
  on conflict (anggota_organisasi_id, resource, action)
  do update set scope = excluded.scope;
end;
$$;

-- Isi default permission anggota
create or replace function _set_anggota_default_permissions(
  p_ao_id          uuid,
  p_can_approve_rab boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- transaksi: hanya read=all
  insert into anggota_permission (anggota_organisasi_id, resource, action, scope) values
    (p_ao_id, 'transaksi', 'create',  'none'),
    (p_ao_id, 'transaksi', 'read',    'all'),
    (p_ao_id, 'transaksi', 'update',  'none'),
    (p_ao_id, 'transaksi', 'delete',  'none'),
    (p_ao_id, 'transaksi', 'submit',  'none'),
    (p_ao_id, 'transaksi', 'approve', 'none'),
    (p_ao_id, 'transaksi', 'cancel',  'none')
  on conflict (anggota_organisasi_id, resource, action) do nothing;

  -- iuran: hanya read=own
  insert into anggota_permission (anggota_organisasi_id, resource, action, scope) values
    (p_ao_id, 'iuran', 'create',  'none'),
    (p_ao_id, 'iuran', 'read',    'own'),
    (p_ao_id, 'iuran', 'update',  'none'),
    (p_ao_id, 'iuran', 'delete',  'none'),
    (p_ao_id, 'iuran', 'submit',  'none'),
    (p_ao_id, 'iuran', 'approve', 'none'),
    (p_ao_id, 'iuran', 'cancel',  'none')
  on conflict (anggota_organisasi_id, resource, action) do nothing;

  -- rab: read=all; create/update/delete/submit/cancel=own; approve tergantung flag lama
  insert into anggota_permission (anggota_organisasi_id, resource, action, scope) values
    (p_ao_id, 'rab', 'create',  'own'),
    (p_ao_id, 'rab', 'read',    'all'),
    (p_ao_id, 'rab', 'update',  'own'),
    (p_ao_id, 'rab', 'delete',  'own'),
    (p_ao_id, 'rab', 'submit',  'own'),
    (p_ao_id, 'rab', 'approve', case when p_can_approve_rab then 'all' else 'none' end),
    (p_ao_id, 'rab', 'cancel',  'own')
  on conflict (anggota_organisasi_id, resource, action) do nothing;

  -- rap: read=all; create/update/delete/submit/cancel=own
  insert into anggota_permission (anggota_organisasi_id, resource, action, scope) values
    (p_ao_id, 'rap', 'create',  'own'),
    (p_ao_id, 'rap', 'read',    'all'),
    (p_ao_id, 'rap', 'update',  'own'),
    (p_ao_id, 'rap', 'delete',  'own'),
    (p_ao_id, 'rap', 'submit',  'own'),
    (p_ao_id, 'rap', 'approve', 'none'),
    (p_ao_id, 'rap', 'cancel',  'own')
  on conflict (anggota_organisasi_id, resource, action) do nothing;

  -- surat: semua=own kecuali approve=none
  insert into anggota_permission (anggota_organisasi_id, resource, action, scope) values
    (p_ao_id, 'surat', 'create',  'own'),
    (p_ao_id, 'surat', 'read',    'own'),
    (p_ao_id, 'surat', 'update',  'own'),
    (p_ao_id, 'surat', 'delete',  'own'),
    (p_ao_id, 'surat', 'submit',  'own'),
    (p_ao_id, 'surat', 'approve', 'none'),
    (p_ao_id, 'surat', 'cancel',  'own')
  on conflict (anggota_organisasi_id, resource, action) do nothing;
end;
$$;

-- ─────────────────────────────────────────
-- 4. Backfill data existing
-- ─────────────────────────────────────────

-- Backfill: bendahara + ketua → full access
do $$
declare r record;
begin
  for r in
    select id from anggota_organisasi where role in ('bendahara', 'ketua') and aktif = true
  loop
    perform _set_full_permissions(r.id);
  end loop;
end;
$$;

-- Backfill: anggota → default anggota (dengan flag can_approve_rab lama)
do $$
declare r record;
begin
  for r in
    select id, coalesce(can_approve_rab, false) as can_approve_rab
    from anggota_organisasi
    where role = 'anggota' and aktif = true
  loop
    perform _set_anggota_default_permissions(r.id, r.can_approve_rab);
  end loop;
end;
$$;

-- ─────────────────────────────────────────
-- 5. Update RLS: RAB — gunakan has_permission sebagai cek utama
-- ─────────────────────────────────────────

-- RAB insert: owner dengan akses create atau personal workspace
drop policy if exists "anggota_bisa_buat_rab" on rab;
create policy "anggota_bisa_buat_rab"
  on rab for insert
  with check (
    -- Matrix baru: punya izin create (own scope = harus sebagai creator)
    (has_permission(organisasi_id, 'rab', 'create', 'any') and diajukan_oleh = auth.uid())
    -- Fallback: flag lama
    or (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    -- Personal workspace
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- RAB update: owner bisa update draft milik sendiri; approver bisa update status
drop policy if exists "pemilik_atau_approver_bisa_update_rab" on rab;
create policy "pemilik_atau_approver_bisa_update_rab"
  on rab for update
  using (
    -- Matrix baru: update own
    (has_permission(organisasi_id, 'rab', 'update', 'own') and diajukan_oleh = auth.uid())
    -- Matrix baru: update all
    or has_permission(organisasi_id, 'rab', 'update', 'all')
    -- Matrix baru: approve any
    or has_permission(organisasi_id, 'rab', 'approve', 'any')
    -- Fallback lama
    or (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or can_approve_rab(organisasi_id)
    -- Personal workspace
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  )
  with check (
    (has_permission(organisasi_id, 'rab', 'update', 'own') and diajukan_oleh = auth.uid())
    or has_permission(organisasi_id, 'rab', 'update', 'all')
    or has_permission(organisasi_id, 'rab', 'approve', 'any')
    or (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    or can_approve_rab(organisasi_id)
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- RAB delete: owner atau semua (scope=all)
drop policy if exists "pemilik_bisa_hapus_rab" on rab;
create policy "pemilik_bisa_hapus_rab"
  on rab for delete
  using (
    -- Matrix baru
    (has_permission(organisasi_id, 'rab', 'delete', 'own') and diajukan_oleh = auth.uid())
    or has_permission(organisasi_id, 'rab', 'delete', 'all')
    -- Fallback lama
    or (can_create_rab(organisasi_id) and diajukan_oleh = auth.uid())
    -- Personal workspace
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- RAB item: ikut hak akses RAB-nya
drop policy if exists "kelola_rab_item" on rab_item;
create policy "kelola_rab_item"
  on rab_item for all
  using (
    exists (
      select 1 from rab r
      where r.id = rab_item.rab_id
        and (
          (has_permission(r.organisasi_id, 'rab', 'update', 'own') and r.diajukan_oleh = auth.uid())
          or has_permission(r.organisasi_id, 'rab', 'update', 'all')
          or (can_create_rab(r.organisasi_id) and r.diajukan_oleh = auth.uid())
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
      select 1 from rab r
      where r.id = rab_item.rab_id
        and (
          (has_permission(r.organisasi_id, 'rab', 'update', 'own') and r.diajukan_oleh = auth.uid())
          or has_permission(r.organisasi_id, 'rab', 'update', 'all')
          or (can_create_rab(r.organisasi_id) and r.diajukan_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────
-- 6. Update RLS: RAP — gunakan has_permission
-- ─────────────────────────────────────────

drop policy if exists "anggota_bisa_buat_rap_sendiri" on rap;
create policy "anggota_bisa_buat_rap_sendiri"
  on rap for insert
  with check (
    (has_permission(organisasi_id, 'rap', 'create', 'any') and dibuat_oleh = auth.uid())
    or (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

drop policy if exists "pemilik_bisa_update_rap" on rap;
create policy "pemilik_bisa_update_rap"
  on rap for update
  using (
    (has_permission(organisasi_id, 'rap', 'update', 'own') and dibuat_oleh = auth.uid())
    or has_permission(organisasi_id, 'rap', 'update', 'all')
    or has_permission(organisasi_id, 'rap', 'approve', 'any')
    or (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  )
  with check (
    (has_permission(organisasi_id, 'rap', 'update', 'own') and dibuat_oleh = auth.uid())
    or has_permission(organisasi_id, 'rap', 'update', 'all')
    or has_permission(organisasi_id, 'rap', 'approve', 'any')
    or (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

drop policy if exists "pemilik_bisa_hapus_rap" on rap;
create policy "pemilik_bisa_hapus_rap"
  on rap for delete
  using (
    (has_permission(organisasi_id, 'rap', 'delete', 'own') and dibuat_oleh = auth.uid())
    or has_permission(organisasi_id, 'rap', 'delete', 'all')
    or (can_manage_rap(organisasi_id) and dibuat_oleh = auth.uid())
    or exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- RAP item realisasi: ikut ownership RAP
drop policy if exists "pengelola_rap_kelola_rap_item_realisasi" on rap_item_realisasi;
create policy "pengelola_rap_kelola_rap_item_realisasi"
  on rap_item_realisasi for all
  using (
    exists (
      select 1 from rap r
      where r.id = rap_item_realisasi.rap_id
        and (
          (has_permission(r.organisasi_id, 'rap', 'update', 'own') and r.dibuat_oleh = auth.uid())
          or has_permission(r.organisasi_id, 'rap', 'update', 'all')
          or (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
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
      select 1 from rap r
      where r.id = rap_item_realisasi.rap_id
        and (
          (has_permission(r.organisasi_id, 'rap', 'update', 'own') and r.dibuat_oleh = auth.uid())
          or has_permission(r.organisasi_id, 'rap', 'update', 'all')
          or (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );

-- RAP foto: ikut ownership RAP
drop policy if exists "pengelola_rap_kelola_rap_foto" on rap_foto;
create policy "pengelola_rap_kelola_rap_foto"
  on rap_foto for all
  using (
    exists (
      select 1 from rap r
      where r.id = rap_foto.rap_id
        and (
          (has_permission(r.organisasi_id, 'rap', 'update', 'own') and r.dibuat_oleh = auth.uid())
          or has_permission(r.organisasi_id, 'rap', 'update', 'all')
          or (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
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
      select 1 from rap r
      where r.id = rap_foto.rap_id
        and (
          (has_permission(r.organisasi_id, 'rap', 'update', 'own') and r.dibuat_oleh = auth.uid())
          or has_permission(r.organisasi_id, 'rap', 'update', 'all')
          or (can_manage_rap(r.organisasi_id) and r.dibuat_oleh = auth.uid())
          or exists (
            select 1 from organisasi o
            where o.id = r.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );

-- ─────────────────────────────────────────
-- 7. Update RLS: Transaksi — tambah cek has_permission
-- ─────────────────────────────────────────

drop policy if exists "bendahara_kelola_transaksi" on transaksi;

-- Select: semua anggota bisa lihat (policy lama sudah ada)
-- Insert: bendahara/ketua (matrix all) atau siapapun yang diberi izin create
create policy "anggota_buat_transaksi"
  on transaksi for insert
  with check (
    has_permission(organisasi_id, 'transaksi', 'create', 'any')
    or get_role(organisasi_id) = 'bendahara'
    or exists (
      select 1 from organisasi o
      where o.id = transaksi.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- Update: harus punya izin update atau diberi izin approve
create policy "anggota_update_transaksi"
  on transaksi for update
  using (
    has_permission(organisasi_id, 'transaksi', 'update', 'any')
    or has_permission(organisasi_id, 'transaksi', 'approve', 'any')
    or has_permission(organisasi_id, 'transaksi', 'cancel', 'any')
    or has_permission(organisasi_id, 'transaksi', 'submit', 'any')
    or get_role(organisasi_id) = 'bendahara'
    or exists (
      select 1 from organisasi o
      where o.id = transaksi.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 8. Update RLS: Iuran — tambah cek has_permission
-- ─────────────────────────────────────────

drop policy if exists "bendahara_kelola_iuran" on iuran_rutin;

create policy "anggota_kelola_iuran"
  on iuran_rutin for all
  using (
    has_permission(organisasi_id, 'iuran', 'create', 'any')
    or has_permission(organisasi_id, 'iuran', 'update', 'any')
    or has_permission(organisasi_id, 'iuran', 'delete', 'any')
    or get_role(organisasi_id) = 'bendahara'
    or exists (
      select 1 from organisasi o
      where o.id = iuran_rutin.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 9. Update RLS: Permintaan Surat — proses oleh approver matrix
-- ─────────────────────────────────────────

drop policy if exists "ketua_bendahara_bisa_proses_permintaan_surat" on permintaan_surat;
create policy "approver_bisa_proses_permintaan_surat"
  on permintaan_surat for update
  using (
    has_permission(organisasi_id, 'surat', 'approve', 'any')
    or get_role(organisasi_id) in ('bendahara', 'ketua')
    -- Pemohon masih bisa update draft/diajukan miliknya sendiri
    or (dibuat_oleh = auth.uid() and status in ('draft', 'diajukan'))
  );

-- ─────────────────────────────────────────
-- 10. Update cancel_rab_cascade: pakai has_permission
-- ─────────────────────────────────────────
create or replace function cancel_rab_cascade(p_rab_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id   uuid;
  v_status   text;
  v_creator  uuid;
  v_now      timestamptz := now();
  v_has_access    boolean := false;
  v_is_personal   boolean := false;
  v_rap_count int := 0;
  v_tx_count  int := 0;
begin
  select organisasi_id, status, diajukan_oleh
  into   v_org_id, v_status, v_creator
  from   rab
  where  id = p_rab_id;

  if v_org_id is null then
    raise exception 'RAB tidak ditemukan';
  end if;

  -- Cek akses via matrix baru atau flag lama
  select (
    (has_permission(v_org_id, 'rab', 'cancel', 'all'))
    or (has_permission(v_org_id, 'rab', 'cancel', 'own') and v_creator = auth.uid())
    or exists (
      select 1 from anggota_organisasi ao
      where ao.organisasi_id = v_org_id
        and ao.user_id = auth.uid()
        and ao.aktif = true
        and ao.can_manage_rab = true
        and v_creator = auth.uid()
    )
  ) into v_has_access;

  select exists (
    select 1 from organisasi o
    where  o.id = v_org_id
      and  o.tipe = 'personal'
      and  o.created_by = auth.uid()
  ) into v_is_personal;

  if not (v_has_access or v_is_personal) then
    raise exception 'Tidak memiliki akses untuk membatalkan RAB';
  end if;

  if v_status in ('cancelled', 'amended') then
    return jsonb_build_object('ok', true, 'skipped', true,
      'message', 'RAB sudah tidak aktif', 'rab_id', p_rab_id);
  end if;

  update rab
  set    status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = v_now
  where  id = p_rab_id and status not in ('cancelled', 'amended');

  with target_rap as (
    select id from rap
    where  rab_id = p_rab_id and status not in ('cancelled', 'amended')
  ),
  updated_rap as (
    update rap r
    set    status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = v_now
    from   target_rap t where r.id = t.id
    returning r.id
  ),
  updated_tx as (
    update transaksi t
    set    status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = v_now
    where  t.rap_id in (select id from updated_rap) and t.status not in ('cancelled', 'amended')
    returning t.id
  )
  select
    coalesce((select count(*) from updated_rap), 0),
    coalesce((select count(*) from updated_tx), 0)
  into v_rap_count, v_tx_count;

  return jsonb_build_object(
    'ok', true,
    'rab_id', p_rab_id,
    'cancelled_rap_count',      v_rap_count,
    'cancelled_transaksi_count', v_tx_count
  );
end;
$$;
