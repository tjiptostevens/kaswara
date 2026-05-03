-- 008_personal_workspace.sql
-- Kaswara — Add personal workspace support
-- Every user automatically gets a personal workspace on sign-up.

-- ─────────────────────────────────────────
-- 1. Add 'personal' to tipe constraint and add created_by column
-- ─────────────────────────────────────────
alter table organisasi
  drop constraint if exists organisasi_tipe_check;

alter table organisasi
  add constraint organisasi_tipe_check
    check (tipe in ('rt_rw', 'keluarga', 'personal'));

alter table organisasi
  add column if not exists created_by uuid references auth.users(id);

-- ─────────────────────────────────────────
-- 2. Function to create personal workspace for a user
-- ─────────────────────────────────────────
create or replace function create_personal_workspace(uid uuid, display_name text)
returns void
language plpgsql security definer
as $$
declare
  org_id uuid;
begin
  -- Only create if not already exists
  if exists (
    select 1 from organisasi
    where tipe = 'personal' and created_by = uid
  ) then
    return;
  end if;

  insert into organisasi (nama, tipe, created_by)
  values (coalesce(nullif(trim(display_name), ''), 'Pribadi'), 'personal', uid)
  returning id into org_id;

  insert into anggota_organisasi (user_id, organisasi_id, role, nama_lengkap, aktif)
  values (uid, org_id, 'bendahara', coalesce(nullif(trim(display_name), ''), 'Pribadi'), true);
end;
$$;

-- ─────────────────────────────────────────
-- 3. Trigger: auto-create personal workspace on new user sign-up
-- ─────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  perform create_personal_workspace(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────
-- 4. Backfill: create personal workspace for existing users
--    who do not yet have one.
-- ─────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in
    select u.id, u.raw_user_meta_data->>'full_name' as full_name, u.email
    from auth.users u
    where not exists (
      select 1 from organisasi o
      where o.tipe = 'personal' and o.created_by = u.id
    )
  loop
    perform create_personal_workspace(r.id, coalesce(r.full_name, r.email));
  end loop;
end;
$$;
