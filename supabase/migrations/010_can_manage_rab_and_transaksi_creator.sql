-- 010_can_manage_rab_and_transaksi_creator.sql
-- Kaswara — tambah izin anggota untuk mengelola RAB & simpan pembuat transaksi

-- ─────────────────────────────────────────
-- 1. Tambah kolom can_manage_rab pada anggota_organisasi
-- ─────────────────────────────────────────
alter table anggota_organisasi
  add column if not exists can_manage_rab boolean not null default false;

-- ─────────────────────────────────────────
-- 2. Tambah kolom dibuat_oleh_anggota_id pada transaksi
--    FK ke anggota_organisasi agar bisa join langsung untuk nama pembuat
-- ─────────────────────────────────────────
alter table transaksi
  add column if not exists dibuat_oleh_anggota_id uuid references anggota_organisasi(id);

-- ─────────────────────────────────────────
-- 3. Helper function: cek apakah user bisa membuat/mengelola RAB di org
-- ─────────────────────────────────────────
create or replace function can_create_rab(org_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from anggota_organisasi
    where user_id      = auth.uid()
      and organisasi_id = org_id
      and aktif         = true
      and (role in ('bendahara', 'ketua') or can_manage_rab = true)
  );
$$;

-- ─────────────────────────────────────────
-- 4. Update RLS: RAB insert — bendahara, ketua, atau anggota with can_manage_rab
-- ─────────────────────────────────────────
drop policy if exists "bendahara_buat_rab" on rab;

create policy "anggota_bisa_buat_rab"
  on rab for insert
  with check (
    can_create_rab(organisasi_id)
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- RAB update: izinkan pembuat RAB (dengan can_manage_rab) untuk update draft miliknya
drop policy if exists "bendahara_update_rab" on rab;

create policy "kelola_update_rab"
  on rab for update
  using (
    get_role(organisasi_id) in ('bendahara', 'ketua')
    or (
      can_create_rab(organisasi_id)
      and diajukan_oleh = auth.uid()
    )
    or exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 5. Update RLS: rab_item — ikuti hak akses RAB pembuat
-- ─────────────────────────────────────────
drop policy if exists "bendahara_kelola_rab_item" on rab_item;

create policy "kelola_rab_item"
  on rab_item for all
  using (
    exists (
      select 1 from rab
      where rab.id = rab_item.rab_id
        and (
          get_role(rab.organisasi_id) = 'bendahara'
          or can_create_rab(rab.organisasi_id)
          or exists (
            select 1 from organisasi o
            where o.id = rab.organisasi_id
              and o.tipe = 'personal'
              and o.created_by = auth.uid()
          )
        )
    )
  );
