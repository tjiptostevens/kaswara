-- 009_personal_rls.sql
-- Kaswara — RLS policies for personal workspace
-- Personal workspaces are only accessible by their owner (created_by).

-- ─────────────────────────────────────────
-- Drop old organisasi select policy and replace with one that also
-- allows the owner of a personal workspace to see it even before
-- is_member() resolves (edge case during creation).
-- ─────────────────────────────────────────
drop policy if exists "anggota_bisa_lihat_organisasi" on organisasi;

create policy "anggota_bisa_lihat_organisasi"
  on organisasi for select
  using (
    is_member(id)
    or (tipe = 'personal' and created_by = auth.uid())
  );

-- Owner of a personal workspace can update it
drop policy if exists "owner_personal_bisa_update" on organisasi;

create policy "owner_personal_bisa_update"
  on organisasi for update
  using (
    get_role(id) in ('bendahara', 'ketua')
    or (tipe = 'personal' and created_by = auth.uid())
  );

-- ─────────────────────────────────────────
-- kategori_transaksi: allow owner of personal workspace to manage
-- ─────────────────────────────────────────
drop policy if exists "owner_personal_kelola_kategori" on kategori_transaksi;

create policy "owner_personal_kelola_kategori"
  on kategori_transaksi for all
  using (
    exists (
      select 1 from organisasi o
      where o.id = kategori_transaksi.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- RAB: owner of personal workspace can manage
-- ─────────────────────────────────────────
drop policy if exists "owner_personal_kelola_rab" on rab;

create policy "owner_personal_kelola_rab"
  on rab for all
  using (
    exists (
      select 1 from organisasi o
      where o.id = rab.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

drop policy if exists "owner_personal_kelola_rab_item" on rab_item;

create policy "owner_personal_kelola_rab_item"
  on rab_item for all
  using (
    exists (
      select 1 from rab r
      join organisasi o on o.id = r.organisasi_id
      where r.id = rab_item.rab_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- RAP: owner of personal workspace can manage
-- ─────────────────────────────────────────
drop policy if exists "owner_personal_kelola_rap" on rap;

create policy "owner_personal_kelola_rap"
  on rap for all
  using (
    exists (
      select 1 from organisasi o
      where o.id = rap.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

drop policy if exists "owner_personal_kelola_rap_foto" on rap_foto;

create policy "owner_personal_kelola_rap_foto"
  on rap_foto for all
  using (
    exists (
      select 1 from rap r
      join organisasi o on o.id = r.organisasi_id
      where r.id = rap_foto.rap_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- Transaksi: owner of personal workspace can manage
-- ─────────────────────────────────────────
drop policy if exists "owner_personal_kelola_transaksi" on transaksi;

create policy "owner_personal_kelola_transaksi"
  on transaksi for all
  using (
    exists (
      select 1 from organisasi o
      where o.id = transaksi.organisasi_id
        and o.tipe = 'personal'
        and o.created_by = auth.uid()
    )
  );
