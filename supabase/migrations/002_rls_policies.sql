-- 002_rls_policies.sql
-- Kaswara — Row Level Security policies

-- Enable RLS
alter table organisasi          enable row level security;
alter table anggota_organisasi  enable row level security;
alter table kategori_transaksi  enable row level security;
alter table transaksi           enable row level security;
alter table iuran_rutin         enable row level security;
alter table rab                 enable row level security;
alter table rab_item            enable row level security;
alter table rap                 enable row level security;
alter table rap_foto            enable row level security;

-- ─────────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────────
create or replace function is_member(org_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from anggota_organisasi
    where user_id = auth.uid()
      and organisasi_id = org_id
      and aktif = true
  );
$$;

create or replace function get_role(org_id uuid)
returns text
language sql security definer
as $$
  select role from anggota_organisasi
  where user_id = auth.uid()
    and organisasi_id = org_id
    and aktif = true
  limit 1;
$$;

-- ─────────────────────────────────────────
-- organisasi policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_organisasi"
  on organisasi for select
  using (is_member(id));

create policy "anggota_bisa_update_organisasi"
  on organisasi for update
  using (get_role(id) in ('bendahara', 'ketua'));

create policy "siapa_saja_bisa_buat_organisasi"
  on organisasi for insert
  with check (true);

-- ─────────────────────────────────────────
-- anggota_organisasi policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_sesama_anggota"
  on anggota_organisasi for select
  using (is_member(organisasi_id));

create policy "bendahara_bisa_kelola_anggota"
  on anggota_organisasi for all
  using (get_role(organisasi_id) = 'bendahara');

create policy "siapa_saja_bisa_daftar_anggota"
  on anggota_organisasi for insert
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────
-- kategori_transaksi policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_kategori"
  on kategori_transaksi for select
  using (is_member(organisasi_id));

create policy "bendahara_kelola_kategori"
  on kategori_transaksi for all
  using (get_role(organisasi_id) = 'bendahara');

-- ─────────────────────────────────────────
-- transaksi policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_transaksi"
  on transaksi for select
  using (is_member(organisasi_id));

create policy "bendahara_kelola_transaksi"
  on transaksi for all
  using (get_role(organisasi_id) = 'bendahara');

-- ─────────────────────────────────────────
-- iuran_rutin policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_iuran"
  on iuran_rutin for select
  using (is_member(organisasi_id));

create policy "bendahara_kelola_iuran"
  on iuran_rutin for all
  using (get_role(organisasi_id) = 'bendahara');

-- ─────────────────────────────────────────
-- rab policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_rab"
  on rab for select
  using (is_member(organisasi_id));

create policy "bendahara_buat_rab"
  on rab for insert
  with check (get_role(organisasi_id) = 'bendahara');

create policy "bendahara_update_rab"
  on rab for update
  using (get_role(organisasi_id) in ('bendahara', 'ketua'));

create policy "bendahara_hapus_rab"
  on rab for delete
  using (get_role(organisasi_id) = 'bendahara');

-- ─────────────────────────────────────────
-- rab_item policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_rab_item"
  on rab_item for select
  using (
    exists (
      select 1 from rab
      where rab.id = rab_item.rab_id
        and is_member(rab.organisasi_id)
    )
  );

create policy "bendahara_kelola_rab_item"
  on rab_item for all
  using (
    exists (
      select 1 from rab
      where rab.id = rab_item.rab_id
        and get_role(rab.organisasi_id) = 'bendahara'
    )
  );

-- ─────────────────────────────────────────
-- rap policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_rap"
  on rap for select
  using (is_member(organisasi_id));

create policy "bendahara_kelola_rap"
  on rap for all
  using (get_role(organisasi_id) = 'bendahara');

-- ─────────────────────────────────────────
-- rap_foto policies
-- ─────────────────────────────────────────
create policy "anggota_bisa_lihat_rap_foto"
  on rap_foto for select
  using (
    exists (
      select 1 from rap
      where rap.id = rap_foto.rap_id
        and is_member(rap.organisasi_id)
    )
  );

create policy "bendahara_kelola_rap_foto"
  on rap_foto for all
  using (
    exists (
      select 1 from rap
      where rap.id = rap_foto.rap_id
        and get_role(rap.organisasi_id) = 'bendahara'
    )
  );
