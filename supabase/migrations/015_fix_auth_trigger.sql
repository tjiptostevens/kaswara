-- 015_fix_auth_trigger.sql
-- Kaswara — Fix search_path for auth trigger

create or replace function public.create_personal_workspace(uid uuid, display_name text)
returns void
language plpgsql security definer set search_path = public
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform create_personal_workspace(
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;
