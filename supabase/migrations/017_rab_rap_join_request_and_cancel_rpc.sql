-- 017_rab_rap_join_request_and_cancel_rpc.sql
-- Kaswara — RAB/RAP category linkage, RAP itemized realization, join request workflow, cancel RPCs

-- ─────────────────────────────────────────
-- 1) New permissions on anggota_organisasi
-- ─────────────────────────────────────────
alter table anggota_organisasi
  add column if not exists can_approve_join_request boolean not null default false;

-- ─────────────────────────────────────────
-- 2) Link kategori_transaksi into RAB + RAP
-- ─────────────────────────────────────────
alter table rab
  add column if not exists kategori_id uuid references kategori_transaksi(id);

alter table rap
  add column if not exists kategori_id uuid references kategori_transaksi(id);

-- Backfill RAP category from RAB if empty
update rap
set kategori_id = rab.kategori_id
from rab
where rap.rab_id = rab.id
  and rap.kategori_id is null
  and rab.kategori_id is not null;

-- ─────────────────────────────────────────
-- 3) RAP itemized realization table
-- ─────────────────────────────────────────
create table if not exists rap_item_realisasi (
  id                  uuid primary key default uuid_generate_v4(),
  rap_id              uuid not null references rap(id) on delete cascade,
  rab_item_id         uuid references rab_item(id) on delete set null,
  nama_item           text not null,
  volume              numeric(15,2) not null default 1,
  satuan              text not null default 'unit',
  harga_satuan_anggaran numeric(15,2) not null default 0,
  subtotal_anggaran   numeric(15,2) not null default 0,
  jumlah_realisasi    numeric(15,2) not null default 0 check (jumlah_realisasi >= 0),
  selisih             numeric(15,2) not null default 0,
  disparitas          text not null default 'tepat'
                      check (disparitas in ('tepat', 'lebih', 'kurang')),
  created_at          timestamptz default now()
);

create index if not exists idx_rap_item_realisasi_rap_id on rap_item_realisasi(rap_id);

-- Keep RAP total aligned with itemized rows
create or replace function sync_rap_total_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rap_id uuid;
begin
  v_rap_id := coalesce(new.rap_id, old.rap_id);

  update rap
  set jumlah_realisasi = coalesce((
    select sum(rir.jumlah_realisasi)
    from rap_item_realisasi rir
    where rir.rap_id = v_rap_id
  ), 0)
  where id = v_rap_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_rap_total_from_items on rap_item_realisasi;
create trigger trg_sync_rap_total_from_items
after insert or update or delete on rap_item_realisasi
for each row execute function sync_rap_total_from_items();

-- Backfill old single-item RAP into itemized table (idempotent)
insert into rap_item_realisasi (
  rap_id, rab_item_id, nama_item, volume, satuan,
  harga_satuan_anggaran, subtotal_anggaran, jumlah_realisasi, selisih, disparitas
)
select
  r.id as rap_id,
  ri.id as rab_item_id,
  coalesce(ri.nama_item, r.nama_item) as nama_item,
  coalesce(ri.volume, 1) as volume,
  coalesce(ri.satuan, 'item') as satuan,
  coalesce(ri.harga_satuan, 0) as harga_satuan_anggaran,
  coalesce(ri.subtotal, coalesce(r.jumlah_realisasi, 0)) as subtotal_anggaran,
  coalesce(r.jumlah_realisasi, 0) as jumlah_realisasi,
  coalesce(r.jumlah_realisasi, 0) - coalesce(ri.subtotal, coalesce(r.jumlah_realisasi, 0)) as selisih,
  case
    when (coalesce(r.jumlah_realisasi, 0) - coalesce(ri.subtotal, coalesce(r.jumlah_realisasi, 0))) > 0 then 'lebih'
    when (coalesce(r.jumlah_realisasi, 0) - coalesce(ri.subtotal, coalesce(r.jumlah_realisasi, 0))) < 0 then 'kurang'
    else 'tepat'
  end as disparitas
from rap r
left join lateral (
  select *
  from rab_item x
  where x.rab_id = r.rab_id
    and lower(trim(x.nama_item)) = lower(trim(r.nama_item))
  limit 1
) ri on true
where not exists (
  select 1 from rap_item_realisasi z where z.rap_id = r.id
);

-- ─────────────────────────────────────────
-- 4) Organization join request workflow
-- ─────────────────────────────────────────
create table if not exists organisasi_join_request (
  id               uuid primary key default uuid_generate_v4(),
  organisasi_id    uuid not null references organisasi(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  nama_lengkap     text not null,
  email            text,
  no_hp            text,
  status           text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  requested_at     timestamptz not null default now(),
  processed_by     uuid references auth.users(id),
  processed_at     timestamptz
);

create unique index if not exists uq_join_request_pending
  on organisasi_join_request (organisasi_id, user_id)
  where status = 'pending';

alter table organisasi_join_request enable row level security;

create or replace function can_approve_join_request(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from anggota_organisasi ao
    where ao.organisasi_id = org_id
      and ao.user_id = auth.uid()
      and ao.aktif = true
      and (
        ao.role in ('bendahara', 'ketua')
        or ao.can_approve_join_request = true
      )
  );
$$;

drop policy if exists "requester_or_approver_can_select_join_request" on organisasi_join_request;
create policy "requester_or_approver_can_select_join_request"
  on organisasi_join_request for select
  using (
    user_id = auth.uid()
    or can_approve_join_request(organisasi_id)
  );

drop policy if exists "authenticated_can_create_join_request" on organisasi_join_request;
create policy "authenticated_can_create_join_request"
  on organisasi_join_request for insert
  with check (auth.uid() = user_id);

drop policy if exists "approver_can_update_join_request" on organisasi_join_request;
create policy "approver_can_update_join_request"
  on organisasi_join_request for update
  using (can_approve_join_request(organisasi_id));

-- ─────────────────────────────────────────
-- 5) RLS for rap_item_realisasi
-- ─────────────────────────────────────────
alter table rap_item_realisasi enable row level security;

drop policy if exists "anggota_bisa_lihat_rap_item_realisasi" on rap_item_realisasi;
create policy "anggota_bisa_lihat_rap_item_realisasi"
  on rap_item_realisasi for select
  using (
    exists (
      select 1
      from rap r
      where r.id = rap_item_realisasi.rap_id
        and is_member(r.organisasi_id)
    )
  );

drop policy if exists "bendahara_kelola_rap_item_realisasi" on rap_item_realisasi;
create policy "bendahara_kelola_rap_item_realisasi"
  on rap_item_realisasi for all
  using (
    exists (
      select 1
      from rap r
      join organisasi o on o.id = r.organisasi_id
      where r.id = rap_item_realisasi.rap_id
        and (
          get_role(r.organisasi_id) = 'bendahara'
          or (o.tipe = 'personal' and o.created_by = auth.uid())
        )
    )
  );

-- ─────────────────────────────────────────
-- 6) Atomic cancel RPCs
-- ─────────────────────────────────────────
create or replace function cancel_rab_cascade(p_rab_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
  v_now timestamptz := now();
  v_has_access boolean := false;
  v_rap_count int := 0;
  v_tx_count int := 0;
begin
  select organisasi_id, status into v_org_id, v_status
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
      and (
        ao.role in ('bendahara', 'ketua')
        or ao.can_manage_rab = true
        or ao.can_approve_rab = true
      )
  ) into v_has_access;

  if not v_has_access then
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

create or replace function cancel_transaksi_and_rap(p_transaksi_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_status text;
  v_rap_id uuid;
  v_now timestamptz := now();
  v_has_access boolean := false;
  v_cancelled_rap int := 0;
begin
  select organisasi_id, status, rap_id
  into v_org_id, v_status, v_rap_id
  from transaksi
  where id = p_transaksi_id;

  if v_org_id is null then
    raise exception 'Transaksi tidak ditemukan';
  end if;

  select exists (
    select 1
    from anggota_organisasi ao
    where ao.organisasi_id = v_org_id
      and ao.user_id = auth.uid()
      and ao.aktif = true
      and (
        ao.role in ('bendahara', 'ketua')
        or ao.can_manage_rab = true
        or ao.can_approve_rab = true
      )
  ) into v_has_access;

  if not v_has_access then
    raise exception 'Tidak memiliki akses untuk membatalkan transaksi';
  end if;

  if v_status in ('cancelled', 'amended') then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'message', 'Transaksi sudah tidak aktif',
      'transaksi_id', p_transaksi_id
    );
  end if;

  update transaksi
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = v_now
  where id = p_transaksi_id
    and status not in ('cancelled', 'amended');

  if v_rap_id is not null then
    update rap
    set status = 'cancelled',
        cancelled_by = auth.uid(),
        cancelled_at = v_now
    where id = v_rap_id
      and status not in ('cancelled', 'amended');

    get diagnostics v_cancelled_rap = row_count;
  end if;

  update iuran_rutin
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = v_now
  where transaksi_id = p_transaksi_id
    and status not in ('cancelled', 'amended');

  return jsonb_build_object(
    'ok', true,
    'transaksi_id', p_transaksi_id,
    'rap_cancelled', coalesce(v_cancelled_rap, 0) > 0
  );
end;
$$;
